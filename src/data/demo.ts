import type { TournamentState } from "../types";

const names = ["Yanni", "Mats", "Lena", "Noah", "Sofia", "Timo"];

export const demoState: TournamentState = {
  tournament: {
    slug: "wm-2026",
    name: "WM 2026",
    playerCount: names.length,
  },
  players: names.map((name, index) => ({
    id: `demo-${index + 1}`,
    name,
    points: Object.fromEntries(
      Array.from({ length: 10 }, (_, day) => [day + 1, Math.max(0, 9 - index + ((day + index) % 4))]),
    ) as Record<number, number>,
  })),
};
