import { KICKTIPP_TO_WM_MATCHDAY } from "../data/schedule";
import type { LeaderboardRow, Player } from "../types";

export const KICKTIPP_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const KNOCKOUT_ROUNDS = [
  { key: 11, label: "AF", name: "Achtel" },
  { key: 12, label: "VF", name: "Viertel" },
  { key: 13, label: "HF", name: "Halb" },
  { key: 14, label: "F", name: "Finale" },
] as const;

export const POINT_ROUNDS = [
  ...KICKTIPP_DAYS.map((day) => ({ key: day, label: `KT ${day}`, name: `Kicktipp ${day}` })),
  ...KNOCKOUT_ROUNDS,
];

export function emptyPoints(): Record<string, number> {
  return Object.fromEntries(POINT_ROUNDS.map((round) => [round.key, 0])) as Record<string, number>;
}

export function calculateLeaderboard(players: Player[]): LeaderboardRow[] {
  const rows = players.map((player) => {
    const wmPoints = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    const knockoutPoints = { AF: 0, VF: 0, HF: 0, F: 0 } as LeaderboardRow["knockoutPoints"];
    let total = 0;

    KICKTIPP_DAYS.forEach((day) => {
      const points = Number(player.points[day] ?? 0);
      total += points;
      wmPoints[KICKTIPP_TO_WM_MATCHDAY[day]] += points;
    });

    KNOCKOUT_ROUNDS.forEach((round) => {
      const points = Number(player.points[round.key] ?? 0);
      total += points;
      knockoutPoints[round.label] = points;
    });

    return { ...player, total, wmPoints, knockoutPoints, rank: 0 };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "de"));

  return rows.map((row, index, sorted) => ({
    ...row,
    rank: index > 0 && sorted[index - 1].total === row.total ? sorted[index - 1].rank : index + 1,
  }));
}

export function resizePlayers(players: Player[], count: number): Player[] {
  const next = [...players].slice(0, count);
  while (next.length < count) {
    next.push({
      id: crypto.randomUUID(),
      name: `Spieler ${next.length + 1}`,
      points: emptyPoints(),
    });
  }
  return next;
}
