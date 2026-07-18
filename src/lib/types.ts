// ---- Core tournament domain types ----

export type TeamCount = 7 | 8 | 9;

export type Team = {
  id: string;
  name: string;
  seed: number | null; // 1..N once seeded; null while unseeded
};

// Where a game slot's participant comes from.
export type Source =
  | { t: "seed"; seed: number } // the team assigned this seed
  | { t: "w"; g: string } // winner of game `g`
  | { t: "l"; g: string }; // loser of game `g`

export type BracketKind = "W" | "L" | "GF" | "RESET";

// Static definition of a game (the wiring — never mutated during play).
export type GameDef = {
  id: string;
  bracket: BracketKind;
  round: number; // grouping within a bracket, for display
  label?: string;
  a: Source;
  b: Source;
};

// A recorded result for a game.
export type GameResult = {
  winner: "a" | "b";
  scoreA: number;
  scoreB: number;
};

export type Phase = "setup" | "live" | "done";

// The single shared document persisted in the store.
export type Tournament = {
  version: number;
  teamCount: TeamCount;
  phase: Phase;
  teams: Team[]; // length === teamCount
  results: Record<string, GameResult>; // gameId -> result
  updatedAt: number;
};

// ---- Resolved (computed) view types, sent to the client ----

export type SlotState =
  | { state: "team"; teamId: string; name: string; seed: number | null }
  | { state: "tbd" }; // participant not yet determined

export type ResolvedGame = {
  id: string;
  bracket: BracketKind;
  round: number;
  label?: string;
  a: SlotState;
  b: SlotState;
  result: GameResult | null;
  // true when both participants are known and there's no result yet
  playable: boolean;
  // RESET only: whether this game is actually in play (LB team won the GF)
  active: boolean;
};

export type TournamentView = {
  version: number;
  teamCount: TeamCount;
  phase: Phase;
  teams: Team[];
  games: ResolvedGame[];
  champion: { teamId: string; name: string } | null;
  updatedAt: number;
};
