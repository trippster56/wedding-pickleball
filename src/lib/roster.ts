import type { Team, TeamCount, Tournament } from "./types";

/**
 * Generic placeholder teams. Real names are entered on the /setup page on the
 * day and stored in the runtime datastore — they are never committed to the repo.
 */
export const DEFAULT_TEAM_NAMES: string[] = [
  "Team 1",
  "Team 2",
  "Team 3",
  "Team 4",
  "Team 5",
  "Team 6",
  "Team 7",
  "Team 8",
  "Team 9",
  "Team 10",
];

let idCounter = 0;
export function makeTeamId(): string {
  idCounter += 1;
  return `t${Date.now().toString(36)}${idCounter}`;
}

/** Build a default team list for a given count, seeded 1..N in listed order. */
export function defaultTeams(count: TeamCount): Team[] {
  return DEFAULT_TEAM_NAMES.slice(0, count).map((name, i) => ({
    id: `seed-${i + 1}`,
    name,
    seed: i + 1,
  }));
}

export function defaultTournament(): Tournament {
  const count: TeamCount = 9;
  return {
    version: 1,
    teamCount: count,
    phase: "setup",
    teams: defaultTeams(count),
    results: {},
    updatedAt: Date.now(),
  };
}
