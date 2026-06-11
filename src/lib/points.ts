import { KICKTIPP_TO_WM_MATCHDAY } from "../data/schedule";
import type { LeaderboardRow, Player } from "../types";

const matchdays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function emptyPoints(): Record<number, number> {
  return Object.fromEntries(matchdays.map((day) => [day, 0])) as Record<number, number>;
}

export function calculateLeaderboard(players: Player[]): LeaderboardRow[] {
  const rows = players.map((player) => {
    const wmPoints = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    let total = 0;

    matchdays.forEach((day) => {
      const points = Number(player.points[day] ?? 0);
      total += points;
      wmPoints[KICKTIPP_TO_WM_MATCHDAY[day]] += points;
    });

    return { ...player, total, wmPoints, rank: 0 };
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
