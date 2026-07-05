import { createClient } from "@supabase/supabase-js";
import { demoState } from "../data/demo";
import { emptyPoints } from "./points";
import type { TournamentState } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

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

export async function loadPublicState(): Promise<TournamentState> {
  if (!supabase) return demoState;

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("slug,name,player_count,updated_at")
    .eq("slug", "wm-2026")
    .maybeSingle<DbTournament>();

  if (tournamentError || !tournament) return demoState;

  const [{ data: players }, { data: pointEntries }] = await Promise.all([
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

  if (!players) return demoState;

  return {
    tournament: {
      slug: tournament.slug,
      name: tournament.name,
      playerCount: tournament.player_count,
      updatedAt: tournament.updated_at,
    },
    players: players.map((player) => {
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
