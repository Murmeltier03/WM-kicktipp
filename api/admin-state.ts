import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { demoState } from "../src/data/demo";
import { POINT_ROUNDS, emptyPoints } from "../src/lib/points";
import type { Player, TournamentState } from "../src/types";

type DbTournament = {
  slug: string;
  name: string;
  player_count: number;
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

function assertAdmin(req: any, res: any) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers["x-admin-password"];

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

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment is not configured");
  }

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

function normalizePlayers(players: Player[]) {
  return players.map((player) => ({
    ...player,
    id: isUuid(player.id) ? player.id : randomUUID(),
    name: player.name.trim() || "Unbenannt",
  }));
}

async function loadState(): Promise<TournamentState> {
  const supabase = adminClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("slug,name,player_count")
    .eq("slug", "wm-2026")
    .maybeSingle<DbTournament>();

  if (tournamentError) throw tournamentError;
  if (!tournament) return demoState;

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
  const supabase = adminClient();
  const players = normalizePlayers(body.players);
  const tournament = {
    slug: "wm-2026",
    name: body.tournament.name.trim() || "WM 2026",
    player_count: players.length,
  };

  const { error: tournamentError } = await supabase.from("tournaments").upsert(tournament, { onConflict: "slug" });
  if (tournamentError) throw tournamentError;

  const { error: pointDeleteError } = await supabase
    .from("point_entries")
    .delete()
    .eq("tournament_slug", tournament.slug);
  if (pointDeleteError) throw pointDeleteError;

  const { error: playerDeleteError } = await supabase.from("players").delete().eq("tournament_slug", tournament.slug);
  if (playerDeleteError) throw playerDeleteError;

  if (players.length > 0) {
    const { error: playerInsertError } = await supabase.from("players").insert(
      players.map((player, index) => ({
        id: player.id,
        tournament_slug: tournament.slug,
        display_name: player.name,
        sort_order: index,
      })),
    );
    if (playerInsertError) throw playerInsertError;

    const pointRows = players.flatMap((player) =>
      POINT_ROUNDS.map((round) => ({
        tournament_slug: tournament.slug,
        player_id: player.id,
        kicktipp_matchday: round.key,
        points: Math.max(0, Number(player.points[round.key] ?? 0)),
      })),
    );

    const { error: pointInsertError } = await supabase.from("point_entries").insert(pointRows);
    if (pointInsertError) throw pointInsertError;
  }

  return {
    tournament: {
      slug: tournament.slug,
      name: tournament.name,
      playerCount: players.length,
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
