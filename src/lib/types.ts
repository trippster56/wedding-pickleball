// ---- Core tournament domain types ----

export type TeamCount = 8 | 9 | 10;

/**
 * Tournament shape.
 *
 * - "double" — full double elimination (~18–19 games). Every team plays at
 *   least twice; losers get a second life all the way to a grand-final reset.
 * - "single" — single-elimination main bracket plus a consolation bracket for
 *   the teams knocked out before the semifinals (~10–14 games). Still gives
 *   everyone two games, but roughly a third fewer matches and a much shorter
 *   dependency chain — the format to use on limited courts.
 */
export type Format = "double" | "single";

// One person on a team. Doubles => up to 2 players per team; a team with a
// single player is a "solo" still looking for a partner day-of.
export type Player = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string; // display label, kept in sync with `players` (e.g. "Tripp & Callie")
  seed: number | null; // 1..N once seeded; null while unseeded
  players: Player[]; // 0–2 people; source of truth for the label
};

// Where a game slot's participant comes from.
export type Source =
  | { t: "seed"; seed: number } // the team assigned this seed
  | { t: "w"; g: string } // winner of game `g`
  | { t: "l"; g: string }; // loser of game `g`

/**
 * Which sub-bracket a game belongs to.
 *   W     — main/winners bracket (both formats)
 *   L     — losers bracket ("double" only)
 *   GF    — grand final ("double" only)
 *   RESET — grand-final reset ("double" only)
 *   C     — consolation bracket ("single" only)
 */
export type BracketKind = "W" | "L" | "GF" | "RESET" | "C";

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
  format: Format;
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
  format: Format;
  phase: Phase;
  teams: Team[];
  games: ResolvedGame[];
  champion: { teamId: string; name: string } | null;
  updatedAt: number;
};
