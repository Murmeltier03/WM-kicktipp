export const RESTORE_POINTS = [
  { name: "Gero", points: [9, 4, 14, 14, 10, 15, 13, 4, 8, 8, 30, 11, 9, 2] },
  { name: "Quy", points: [10, 6, 15, 7, 10, 16, 11, 5, 8, 10, 29, 14, 11, 2] },
  { name: "Robin", points: [6, 4, 11, 8, 11, 13, 10, 4, 8, 11, 22, 13, 7, 2] },
  { name: "Denis", points: [7, 8, 15, 12, 8, 13, 11, 7, 9, 8, 27, 12, 11, 2] },
  { name: "Yannic", points: [8, 4, 16, 11, 10, 14, 10, 4, 10, 9, 28, 12, 5, 3] },
  { name: "Anka", points: [5, 7, 13, 14, 10, 13, 12, 4, 10, 8, 30, 12, 9, 4] },
  { name: "Yannick", points: [7, 7, 14, 12, 10, 15, 12, 5, 8, 8, 31, 15, 6, 3] },
  { name: "Marius", points: [9, 4, 12, 13, 10, 13, 8, 6, 11, 10, 33, 12, 10, 0] },
  { name: "Moritz", points: [6, 6, 15, 12, 11, 15, 11, 4, 8, 10, 31, 10, 9, 0] },
] as const;

export const EXPECTED_RESTORE_ROWS = RESTORE_POINTS.reduce((sum, player) => sum + player.points.length, 0);
export const EXPECTED_RESTORE_TOTAL = RESTORE_POINTS.reduce(
  (total, player) => total + player.points.reduce<number>((sum, points) => sum + points, 0),
  0,
);
