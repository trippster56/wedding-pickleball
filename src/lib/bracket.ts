import type {
  GameDef,
  ResolvedGame,
  SlotState,
  Source,
  TeamCount,
  Tournament,
  TournamentView,
} from "./types";

// Helpers for building game definitions concisely.
const seed = (n: number): Source => ({ t: "seed", seed: n });
const win = (g: string): Source => ({ t: "w", g });
const lose = (g: string): Source => ({ t: "l", g });

/**
 * Double-elimination templates for 7, 8, and 9 teams.
 *
 * Every template ends with:
 *   GF    — Grand Final: winner(WB final) [side a] vs winner(LB final) [side b]
 *   RESET — bracket reset, only "active" when the LB team (side b) wins the GF
 *
 * The 9-team layout is ported verbatim from
 * `9-team-double-elimination-blank-bracket_1.html` (games G1–G17).
 */
function template(count: TeamCount): GameDef[] {
  if (count === 9) {
    return [
      // Winners bracket
      { id: "W1", bracket: "W", round: 1, label: "Play-in", a: seed(8), b: seed(9) },
      { id: "W2", bracket: "W", round: 2, label: "Quarterfinal", a: seed(1), b: win("W1") },
      { id: "W3", bracket: "W", round: 2, label: "Quarterfinal", a: seed(4), b: seed(5) },
      { id: "W4", bracket: "W", round: 2, label: "Quarterfinal", a: seed(2), b: seed(7) },
      { id: "W5", bracket: "W", round: 2, label: "Quarterfinal", a: seed(3), b: seed(6) },
      { id: "W6", bracket: "W", round: 3, label: "Semifinal", a: win("W2"), b: win("W3") },
      { id: "W7", bracket: "W", round: 3, label: "Semifinal", a: win("W4"), b: win("W5") },
      { id: "W8", bracket: "W", round: 4, label: "Winners Final", a: win("W6"), b: win("W7") },
      // Losers bracket
      { id: "L1", bracket: "L", round: 1, a: lose("W1"), b: lose("W2") },
      { id: "L2", bracket: "L", round: 2, a: win("L1"), b: lose("W3") },
      { id: "L3", bracket: "L", round: 2, a: lose("W4"), b: lose("W5") },
      { id: "L4", bracket: "L", round: 3, a: win("L2"), b: lose("W6") },
      { id: "L5", bracket: "L", round: 3, a: win("L3"), b: lose("W7") },
      { id: "L6", bracket: "L", round: 4, a: win("L4"), b: win("L5") },
      { id: "L7", bracket: "L", round: 5, label: "Losers Final", a: win("L6"), b: lose("W8") },
      // Finals
      { id: "GF", bracket: "GF", round: 1, label: "Grand Final", a: win("W8"), b: win("L7") },
      { id: "RESET", bracket: "RESET", round: 1, label: "Reset", a: win("GF"), b: lose("GF") },
    ];
  }

  if (count === 8) {
    return [
      // Winners bracket
      { id: "W1", bracket: "W", round: 1, label: "Quarterfinal", a: seed(1), b: seed(8) },
      { id: "W2", bracket: "W", round: 1, label: "Quarterfinal", a: seed(4), b: seed(5) },
      { id: "W3", bracket: "W", round: 1, label: "Quarterfinal", a: seed(2), b: seed(7) },
      { id: "W4", bracket: "W", round: 1, label: "Quarterfinal", a: seed(3), b: seed(6) },
      { id: "W5", bracket: "W", round: 2, label: "Semifinal", a: win("W1"), b: win("W2") },
      { id: "W6", bracket: "W", round: 2, label: "Semifinal", a: win("W3"), b: win("W4") },
      { id: "W7", bracket: "W", round: 3, label: "Winners Final", a: win("W5"), b: win("W6") },
      // Losers bracket (drops crossed to avoid immediate rematches)
      { id: "L1", bracket: "L", round: 1, a: lose("W1"), b: lose("W2") },
      { id: "L2", bracket: "L", round: 1, a: lose("W3"), b: lose("W4") },
      { id: "L3", bracket: "L", round: 2, a: win("L1"), b: lose("W6") },
      { id: "L4", bracket: "L", round: 2, a: win("L2"), b: lose("W5") },
      { id: "L5", bracket: "L", round: 3, a: win("L3"), b: win("L4") },
      { id: "L6", bracket: "L", round: 4, label: "Losers Final", a: win("L5"), b: lose("W7") },
      // Finals
      { id: "GF", bracket: "GF", round: 1, label: "Grand Final", a: win("W7"), b: win("L6") },
      { id: "RESET", bracket: "RESET", round: 1, label: "Reset", a: win("GF"), b: lose("GF") },
    ];
  }

  // count === 7 — seed 1 receives a bye; seeds 2–7 play round 1.
  return [
    // Winners bracket
    { id: "W1", bracket: "W", round: 1, label: "Quarterfinal", a: seed(4), b: seed(5) },
    { id: "W2", bracket: "W", round: 1, label: "Quarterfinal", a: seed(2), b: seed(7) },
    { id: "W3", bracket: "W", round: 1, label: "Quarterfinal", a: seed(3), b: seed(6) },
    { id: "W4", bracket: "W", round: 2, label: "Semifinal", a: seed(1), b: win("W1") },
    { id: "W5", bracket: "W", round: 2, label: "Semifinal", a: win("W2"), b: win("W3") },
    { id: "W6", bracket: "W", round: 3, label: "Winners Final", a: win("W4"), b: win("W5") },
    // Losers bracket
    { id: "L1", bracket: "L", round: 1, a: lose("W2"), b: lose("W3") },
    { id: "L2", bracket: "L", round: 2, a: lose("W1"), b: lose("W5") },
    { id: "L3", bracket: "L", round: 2, a: win("L1"), b: lose("W4") },
    { id: "L4", bracket: "L", round: 3, a: win("L2"), b: win("L3") },
    { id: "L5", bracket: "L", round: 4, label: "Losers Final", a: win("L4"), b: lose("W6") },
    // Finals
    { id: "GF", bracket: "GF", round: 1, label: "Grand Final", a: win("W6"), b: win("L5") },
    { id: "RESET", bracket: "RESET", round: 1, label: "Reset", a: win("GF"), b: lose("GF") },
  ];
}

const templateCache: Partial<Record<TeamCount, GameDef[]>> = {};

export function buildBracket(count: TeamCount): GameDef[] {
  if (!templateCache[count]) templateCache[count] = template(count);
  return templateCache[count]!;
}

// ---- Resolution: turn (defs + results + teams) into a client-facing view ----

const TBD: SlotState = { state: "tbd" };

/**
 * Resolve a Source into a concrete participant.
 * Uses memoization + a visiting set as a safety net against malformed graphs.
 */
function makeResolver(
  defsById: Record<string, GameDef>,
  results: Record<string, Tournament["results"][string]>,
  teamBySeed: Record<number, { id: string; name: string; seed: number | null }>,
) {
  const slotMemo = new Map<string, SlotState>();

  function team(id: string, name: string, seedNo: number | null): SlotState {
    return { state: "team", teamId: id, name, seed: seedNo };
  }

  // The participant that WON game g (or TBD if not decided).
  function winnerOf(g: string, visiting: Set<string>): SlotState {
    const r = results[g];
    if (!r) return TBD;
    const def = defsById[g];
    return resolve(r.winner === "a" ? def.a : def.b, visiting);
  }

  // The participant that LOST game g (or TBD if not decided).
  function loserOf(g: string, visiting: Set<string>): SlotState {
    const r = results[g];
    if (!r) return TBD;
    const def = defsById[g];
    return resolve(r.winner === "a" ? def.b : def.a, visiting);
  }

  function resolve(src: Source, visiting: Set<string>): SlotState {
    if (src.t === "seed") {
      const t = teamBySeed[src.seed];
      return t ? team(t.id, t.name, t.seed) : TBD;
    }
    const key = `${src.t}:${src.g}`;
    if (slotMemo.has(key)) return slotMemo.get(key)!;
    if (visiting.has(key)) return TBD; // cycle guard
    visiting.add(key);
    const out = src.t === "w" ? winnerOf(src.g, visiting) : loserOf(src.g, visiting);
    visiting.delete(key);
    slotMemo.set(key, out);
    return out;
  }

  return { resolve };
}

export function resolveTournament(t: Tournament): TournamentView {
  const defs = buildBracket(t.teamCount);
  const defsById: Record<string, GameDef> = {};
  for (const d of defs) defsById[d.id] = d;

  const teamBySeed: Record<number, Team> = {};
  for (const tm of t.teams) if (tm.seed != null) teamBySeed[tm.seed] = tm;

  const { resolve } = makeResolver(defsById, t.results, teamBySeed);

  // Does the grand final need a reset? Only when the LB team (GF side b) wins.
  const gfResult = t.results["GF"];
  const resetActive = !!gfResult && gfResult.winner === "b";

  const games: ResolvedGame[] = defs.map((d) => {
    const a = resolve(d.a, new Set());
    const b = resolve(d.b, new Set());
    const result = t.results[d.id] ?? null;
    const isReset = d.bracket === "RESET";
    const active = isReset ? resetActive : true;
    const bothKnown = a.state === "team" && b.state === "team";
    const playable = active && bothKnown && !result;
    return {
      id: d.id,
      bracket: d.bracket,
      round: d.round,
      label: d.label,
      a,
      b,
      result,
      playable,
      active,
    };
  });

  const champion = computeChampion(t, defsById, resetActive, resolve);
  const phase: TournamentView["phase"] = champion ? "done" : t.phase;

  return {
    version: t.version,
    teamCount: t.teamCount,
    phase,
    teams: t.teams,
    games,
    champion,
    updatedAt: t.updatedAt,
  };
}

type Team = { id: string; name: string; seed: number | null };

function computeChampion(
  t: Tournament,
  defsById: Record<string, GameDef>,
  resetActive: boolean,
  resolve: (src: Source, visiting: Set<string>) => SlotState,
): { teamId: string; name: string } | null {
  const gf = t.results["GF"];
  if (!gf) return null;

  // WB team won the grand final outright -> champion, no reset.
  if (!resetActive) {
    const s = resolve(defsById["GF"][gf.winner === "a" ? "a" : "b"], new Set());
    return s.state === "team" ? { teamId: s.teamId, name: s.name } : null;
  }

  // Reset required -> champion is whoever wins the reset game.
  const reset = t.results["RESET"];
  if (!reset) return null;
  const s = resolve(defsById["RESET"][reset.winner === "a" ? "a" : "b"], new Set());
  return s.state === "team" ? { teamId: s.teamId, name: s.name } : null;
}

// ---- Validation used by the result API ----

/**
 * Whether a result may be recorded for `gameId` given current state.
 * Returns an error string if not allowed, otherwise null.
 */
export function validateResult(view: TournamentView, gameId: string): string | null {
  const g = view.games.find((x) => x.id === gameId);
  if (!g) return "Unknown game";
  if (!g.active) return "This game is not in play";
  if (g.a.state !== "team" || g.b.state !== "team")
    return "Both teams must be decided first";
  return null;
}
