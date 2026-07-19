const RESTORE_POINTS = [
  { name: "Gero", points: [9, 4, 14, 14, 10, 15, 13, 4, 8, 8, 30, 11, 9, 2, 2] },
  { name: "Quy", points: [10, 6, 15, 7, 10, 16, 11, 5, 8, 10, 29, 14, 11, 2, 2] },
  { name: "Robin", points: [6, 4, 11, 8, 11, 13, 10, 4, 8, 11, 22, 13, 7, 2, 4] },
  { name: "Denis", points: [7, 8, 15, 12, 8, 13, 11, 7, 9, 8, 27, 12, 11, 2, 0] },
  { name: "Yannic", points: [8, 4, 16, 11, 10, 14, 10, 4, 10, 9, 28, 12, 5, 3, 2] },
  { name: "Anka", points: [5, 7, 13, 14, 10, 13, 12, 4, 10, 8, 30, 12, 9, 4, 2] },
  { name: "Yannick", points: [7, 7, 14, 12, 10, 15, 12, 5, 8, 8, 31, 15, 6, 3, 2] },
  { name: "Marius", points: [9, 4, 12, 13, 10, 13, 8, 6, 11, 10, 33, 12, 10, 0, 2] },
  { name: "Moritz", points: [6, 6, 15, 12, 11, 15, 11, 4, 8, 10, 31, 10, 9, 0, 0] },
] as const;

const EXPECTED_RESTORE_ROWS = RESTORE_POINTS.reduce((sum, player) => sum + player.points.length, 0);
const EXPECTED_RESTORE_TOTAL = RESTORE_POINTS.reduce(
  (total, player) => total + player.points.reduce<number>((sum, points) => sum + points, 0),
  0,
);

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
    .lte("kicktipp_matchday", 15)
    .returns<DbPointEntry[]>();

  if (existingRowsError) throw existingRowsError;

  const actualPoints = new Map(
    (existingRows ?? []).map((row) => [`${row.player_id}:${row.kicktipp_matchday}`, row.points]),
  );
  const isComplete = expectedRows.every(
    (row) => actualPoints.get(`${row.player_id}:${row.kicktipp_matchday}`) === row.points,
  );
  const hasExistingPoints = (existingRows ?? []).some((row) => row.points !== 0);
  const expectedPoints = new Map(
    expectedRows.map((row) => [`${row.player_id}:${row.kicktipp_matchday}`, row.points]),
  );
  const hasMismatchedPoints = (existingRows ?? []).some(
    (row) => row.points !== 0 && expectedPoints.get(`${row.player_id}:${row.kicktipp_matchday}`) !== row.points,
  );
  const status: RestoreStatus = isComplete
    ? "complete"
    : !hasExistingPoints || !hasMismatchedPoints
      ? "ready"
      : "blocked";

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
    if (restoreError?.code === "23514") {
      throw new Error(
        "Die Datenbank erlaubt den Final-Spieltag noch nicht. Bitte zuerst die Supabase-Tabellenregel auf Spieltag 15 erweitern.",
      );
    }
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
