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
  points: Record<string, number>;
};

export type TournamentState = {
  tournament: {
    slug: string;
    name: string;
    playerCount: number;
    updatedAt: string;
  };
  players: Player[];
};

export type LeaderboardRow = Player & {
  total: number;
  wmPoints: Record<1 | 2 | 3, number>;
  knockoutPoints: Record<"16F" | "AF" | "VF" | "HF" | "F", number>;
  cash: {
    matchdays: Record<1 | 2 | 3, number>;
    placement: number;
    total: number;
  };
  rank: number;
};
