import {
  EXPECTED_RESTORE_ROWS,
  EXPECTED_RESTORE_TOTAL,
  RESTORE_POINTS,
} from "../src/data/restorePoints";

type DbPlayer = {
  id: string;
  display_name: string;
};

type DbPointEntry = {
  player_id: string;
  kicktipp_matchday: number;
  points: number;
};

type RestoreStatus = "ready" | "complete" | "blocked";

function readHeaderValue(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === "string" ? firstValue.trim() : "";
}

function assertAdmin(req: any, res: any) {
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim();
  const providedPassword = readHeaderValue(req.headers["x-admin-password"]);

  if (!configuredPassword) {
    res.status(500).json({ error: "ADMIN_PASSWORD is not configured" });
    return false;
  }

  if (providedPassword !== configuredPassword) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

async function adminClient() {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment is not configured");
  }

  if (serviceRoleKey.startsWith("sb_publishable_") || serviceRoleKey.startsWith("anon")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be a secret/service-role key");
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceRoleKey);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unexpected error";
}

async function loadRestoreContext(supabase: Awaited<ReturnType<typeof adminClient>>) {
  const expectedNames = RESTORE_POINTS.map((player) => player.name);
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id,display_name")
    .eq("tournament_slug", "wm-2026")
    .in("display_name", expectedNames)
    .returns<DbPlayer[]>();

  if (playersError) throw playersError;

  const playerIdByName = new Map((players ?? []).map((player) => [player.display_name, player.id]));
  if ((players ?? []).length !== RESTORE_POINTS.length || playerIdByName.size !== RESTORE_POINTS.length) {
    throw new Error(`Expected 9 unique matching WM players, found ${players?.length ?? 0}`);
  }

  const expectedRows = RESTORE_POINTS.flatMap((player) =>
    player.points.map((points, index) => ({
      tournament_slug: "wm-2026",
      player_id: playerIdByName.get(player.name)!,
      kicktipp_matchday: index + 1,
      points,
    })),
  );

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("point_entries")
    .select("player_id,kicktipp_matchday,points")
    .eq("tournament_slug", "wm-2026")
    .in("player_id", [...playerIdByName.values()])
    .gte("kicktipp_matchday", 1)
    .lte("kicktipp_matchday", 14)
    .returns<DbPointEntry[]>();

  if (existingRowsError) throw existingRowsError;

  const actualPoints = new Map(
    (existingRows ?? []).map((row) => [`${row.player_id}:${row.kicktipp_matchday}`, row.points]),
  );
  const isComplete = expectedRows.every(
    (row) => actualPoints.get(`${row.player_id}:${row.kicktipp_matchday}`) === row.points,
  );
  const hasExistingPoints = (existingRows ?? []).some((row) => row.points !== 0);
  const status: RestoreStatus = isComplete ? "complete" : hasExistingPoints ? "blocked" : "ready";

  return {
    expectedRows,
    status,
    rowCount: existingRows?.length ?? 0,
    totalPoints: (existingRows ?? []).reduce((sum, row) => sum + row.points, 0),
  };
}

export default async function handler(req: any, res: any) {
  if (!assertAdmin(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = await adminClient();
    const before = await loadRestoreContext(supabase);

    if (req.method === "GET" || before.status === "complete") {
      return res.status(200).json({
        status: before.status,
        rowCount: before.rowCount,
        totalPoints: before.totalPoints,
        expectedRows: EXPECTED_RESTORE_ROWS,
        expectedPoints: EXPECTED_RESTORE_TOTAL,
      });
    }

    if (before.status === "blocked") {
      return res.status(409).json({
        error: "Es sind bereits abweichende Punkte vorhanden. Die Wiederherstellung wurde sicherheitshalber abgebrochen.",
        status: before.status,
      });
    }

    const updatedAt = new Date().toISOString();
    const { error: restoreError } = await supabase.from("point_entries").upsert(
      before.expectedRows.map((row) => ({ ...row, updated_at: updatedAt })),
      { onConflict: "player_id,kicktipp_matchday" },
    );
    if (restoreError) throw restoreError;

    const { error: tournamentError } = await supabase
      .from("tournaments")
      .update({ player_count: RESTORE_POINTS.length, updated_at: updatedAt })
      .eq("slug", "wm-2026");
    if (tournamentError) throw tournamentError;

    const after = await loadRestoreContext(supabase);
    if (
      after.status !== "complete" ||
      after.rowCount !== EXPECTED_RESTORE_ROWS ||
      after.totalPoints !== EXPECTED_RESTORE_TOTAL
    ) {
      throw new Error(
        `Verification failed: expected ${EXPECTED_RESTORE_ROWS} rows and ${EXPECTED_RESTORE_TOTAL} points`,
      );
    }

    return res.status(200).json({
      status: after.status,
      rowCount: after.rowCount,
      totalPoints: after.totalPoints,
      expectedRows: EXPECTED_RESTORE_ROWS,
      expectedPoints: EXPECTED_RESTORE_TOTAL,
    });
  } catch (error) {
    return res.status(500).json({ error: errorMessage(error) });
  }
}
