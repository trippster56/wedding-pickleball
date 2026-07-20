import type { Player, Team, TeamCount, Tournament } from "./types";

/**
 * Known day-of roster. Confirmed partnered teams are hard-coded so a fresh
 * setup starts pre-filled; solos (single-player entries) still need a partner
 * assigned day-of on the /setup page. Anything past this list seeds as blank.
 */
export const DEFAULT_ROSTER: string[][] = [
  ["Tripp", "Callie"],
  ["Dean", "Terri"],
  ["Stephen", "Amber"],
  ["Ben", "Riley"],
  ["Hannah", "Chris"],
  ["Janie", "Thompson"],
  ["Landon", "Olivia"],
  ["Tyson"], // solo — needs a partner
  ["Thomas"], // solo — Hadleigh not playing
  ["Zach"], // solo — Greer not playing
];

let idCounter = 0;
export function makeTeamId(): string {
  idCounter += 1;
  return `t${Date.now().toString(36)}${idCounter}`;
}

export function makePlayerId(): string {
  idCounter += 1;
  return `p${Date.now().toString(36)}${idCounter}`;
}

/** Derive a team's display label from its players (e.g. "Tripp & Callie"). */
export function teamLabel(players: Player[], fallback = ""): string {
  const names = players.map((p) => p.name.trim()).filter(Boolean);
  return names.length ? names.join(" & ") : fallback;
}

/**
 * Backfill `players` for teams persisted before player-level data existed.
 * Only runs when `players` is absent (legacy) — an intentionally empty array is
 * left alone. Splits the old free-text name on common partner separators.
 */
export function withPlayers(team: Team): Team {
  if (Array.isArray(team.players)) return team;
  const parts = (team.name || "")
    .split(/\s*(?:&|\+|\/|,| and )\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...team, players: parts.map((name) => ({ id: makePlayerId(), name })) };
}

/** Build a default team list for a given count, seeded 1..N in listed order. */
export function defaultTeams(count: TeamCount): Team[] {
  return Array.from({ length: count }, (_, i) => {
    const players = (DEFAULT_ROSTER[i] ?? []).map((name) => ({
      id: `seed-${i + 1}-${makePlayerId()}`,
      name,
    }));
    return {
      id: `seed-${i + 1}`,
      name: teamLabel(players, `Team ${i + 1}`),
      seed: i + 1,
      players,
    };
  });
}

export function defaultTournament(): Tournament {
  // 7 confirmed pairs + 3 known solos; solos get partners assigned day-of.
  const count: TeamCount = 10;
  return {
    version: 1,
    teamCount: count,
    phase: "setup",
    teams: defaultTeams(count),
    results: {},
    updatedAt: Date.now(),
  };
}
