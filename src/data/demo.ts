import type { TournamentState } from "../types";
import { POINT_ROUNDS } from "../lib/points";

const names = ["Yanni", "Mats", "Lena", "Noah", "Sofia", "Timo"];

export const demoState: TournamentState = {
  tournament: {
    slug: "wm-2026",
    name: "WM 2026",
    playerCount: names.length,
    updatedAt: new Date().toISOString(),
  },
  players: names.map((name, index) => ({
    id: `demo-${index + 1}`,
    name,
    points: Object.fromEntries(
      POINT_ROUNDS.map((round) => {
        const base = round.key <= 10 ? Math.max(0, 9 - index + ((round.key + index) % 4)) : Math.max(0, 4 - index);
        return [round.key, base];
      }),
    ) as Record<string, number>,
  })),
};
