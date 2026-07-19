type DbTournament = {
  slug: string;
  name: string;
  player_count: number;
  updated_at: string;
};

type DbPlayer = {
  id: string;
  display_name: string;
  sort_order: number;
};

type DbPointEntry = {
  player_id: string;
  kicktipp_matchday: number;
  points: number;
};

type Player = {
  id: string;
  name: string;
  points: Record<string, number>;
};

type TournamentState = {
  tournament: {
    slug: string;
    name: string;
    playerCount: number;
    updatedAt: string;
  };
  players: Player[];
};

const POINT_ROUNDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
].map((key) => ({ key }));

function readHeaderValue(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === "string" ? firstValue.trim() : "";
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16) >> (Number(character) / 4)).toString(16),
  );
}

function emptyPoints(): Record<string, number> {
  return Object.fromEntries(POINT_ROUNDS.map((round) => [round.key, 0])) as Record<string, number>;
}

function safePoints(value: unknown) {
  const points = Number(value ?? 0);
  return Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
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
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be the secret/service-role key, not the publishable anon key");
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceRoleKey);
}

function parseBody(req: any) {
  if (typeof req.body === "string") {
    if (!req.body) return {};
    return JSON.parse(req.body);
  }
  return req.body ?? {};
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePlayers(players: Player[] = []) {
  return players.map((player) => ({
    ...player,
    id: isUuid(player.id) ? player.id : randomId(),
    name: (player.name ?? "").trim() || "Unbenannt",
  }));
}

async function loadState(): Promise<TournamentState> {
  const supabase = await adminClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("slug,name,player_count,updated_at")
    .eq("slug", "wm-2026")
    .maybeSingle<DbTournament>();

  if (tournamentError) throw tournamentError;
  if (!tournament) {
    return {
      tournament: {
        slug: "wm-2026",
        name: "WM 2026",
        playerCount: 0,
        updatedAt: new Date().toISOString(),
      },
      players: [],
    };
  }

  const [{ data: players, error: playersError }, { data: pointEntries, error: pointsError }] = await Promise.all([
    supabase
      .from("players")
      .select("id,display_name,sort_order")
      .eq("tournament_slug", tournament.slug)
      .order("sort_order")
      .returns<DbPlayer[]>(),
    supabase
      .from("point_entries")
      .select("player_id,kicktipp_matchday,points")
      .eq("tournament_slug", tournament.slug)
      .returns<DbPointEntry[]>(),
  ]);

  if (playersError) throw playersError;
  if (pointsError) throw pointsError;

  return {
    tournament: {
      slug: tournament.slug,
      name: tournament.name,
      playerCount: tournament.player_count,
      updatedAt: tournament.updated_at,
    },
    players: (players ?? []).map((player) => {
      const points = emptyPoints();
      pointEntries
        ?.filter((entry) => entry.player_id === player.id)
        .forEach((entry) => {
          points[entry.kicktipp_matchday] = entry.points;
        });

      return {
        id: player.id,
        name: player.display_name,
        points,
      };
    }),
  };
}

async function saveState(body: TournamentState): Promise<TournamentState> {
  const supabase = await adminClient();
  if (!Array.isArray(body.players) || body.players.length === 0) {
    throw new Error("At least one player is required");
  }

  if (body.players.length > 50) {
    throw new Error("A maximum of 50 players is allowed");
  }

  const players = normalizePlayers(body.players);
  const playerIds = players.map((player) => player.id);
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("Player IDs must be unique");
  }

  const updatedAt = new Date().toISOString();
  const tournament = {
    slug: "wm-2026",
    name: body.tournament?.name?.trim() || "WM 2026",
    player_count: players.length,
    updated_at: updatedAt,
  };

  const { error: tournamentError } = await supabase.from("tournaments").upsert(tournament, { onConflict: "slug" });
  if (tournamentError) throw tournamentError;

  const { data: existingPlayers, error: existingPlayersError } = await supabase
    .from("players")
    .select("id")
    .eq("tournament_slug", tournament.slug);
  if (existingPlayersError) throw existingPlayersError;

  const { error: playerUpsertError } = await supabase.from("players").upsert(
    players.map((player, index) => ({
      id: player.id,
      tournament_slug: tournament.slug,
      display_name: player.name,
      sort_order: index,
    })),
    { onConflict: "id" },
  );
  if (playerUpsertError) throw playerUpsertError;

  const pointRows = players.flatMap((player) =>
    POINT_ROUNDS.map((round) => ({
      tournament_slug: tournament.slug,
      player_id: player.id,
      kicktipp_matchday: round.key,
      points: safePoints(player.points?.[round.key]),
      updated_at: updatedAt,
    })),
  );

  const { error: pointUpsertError } = await supabase
    .from("point_entries")
    .upsert(pointRows, { onConflict: "player_id,kicktipp_matchday" });
  if (pointUpsertError) throw pointUpsertError;

  const stalePlayerIds = (existingPlayers ?? [])
    .map((player) => player.id as string)
    .filter((playerId) => !playerIds.includes(playerId));

  if (stalePlayerIds.length > 0) {
    const { error: stalePlayerDeleteError } = await supabase
      .from("players")
      .delete()
      .eq("tournament_slug", tournament.slug)
      .in("id", stalePlayerIds);
    if (stalePlayerDeleteError) throw stalePlayerDeleteError;
  }

  return {
    tournament: {
      slug: tournament.slug,
      name: tournament.name,
      playerCount: players.length,
      updatedAt,
    },
    players,
  };
}

export default async function handler(req: any, res: any) {
  if (!assertAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      return res.status(200).json(await loadState());
    }

    if (req.method === "POST") {
      return res.status(200).json(await saveState(parseBody(req)));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}
