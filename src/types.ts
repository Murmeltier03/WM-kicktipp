export type Match = {
  id: string;
  date: string;
  time: string;
  group: string;
  home: string;
  away: string;
  kicktippMatchday: number;
  wmMatchday: 1 | 2 | 3;
};

export type Player = {
  id: string;
  name: string;
  points: Record<number, number>;
};

export type TournamentState = {
  tournament: {
    slug: string;
    name: string;
    playerCount: number;
  };
  players: Player[];
};

export type LeaderboardRow = Player & {
  total: number;
  wmPoints: Record<1 | 2 | 3, number>;
  rank: number;
};
