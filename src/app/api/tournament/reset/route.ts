import { NextRequest, NextResponse } from "next/server";
import { resetTournament, resolveTournament } from "@/lib/store";
import { makeTeamId } from "@/lib/roster";
import type { Team, TeamCount } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_COUNTS: TeamCount[] = [7, 8, 9, 10];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamCount, teams } = (body ?? {}) as {
    teamCount?: number;
    teams?: Array<{ id?: string; name?: string; seed?: number | null }>;
  };

  if (!teamCount || !VALID_COUNTS.includes(teamCount as TeamCount)) {
    return NextResponse.json(
      { error: "teamCount must be 8, 9, or 10" },
      { status: 400 },
    );
  }
  if (!Array.isArray(teams) || teams.length !== teamCount) {
    return NextResponse.json(
      { error: `Expected exactly ${teamCount} teams` },
      { status: 400 },
    );
  }

  // Validate seeds: each of 1..teamCount present exactly once.
  const seedsSeen = new Set<number>();
  const clean: Team[] = [];
  for (const t of teams) {
    const seed = Number(t.seed);
    if (!Number.isInteger(seed) || seed < 1 || seed > teamCount) {
      return NextResponse.json(
        { error: "Each team needs a seed between 1 and " + teamCount },
        { status: 400 },
      );
    }
    if (seedsSeen.has(seed)) {
      return NextResponse.json(
        { error: "Duplicate seed: " + seed },
        { status: 400 },
      );
    }
    seedsSeen.add(seed);
    clean.push({
      id: t.id || makeTeamId(),
      name: (t.name || "").trim() || `Seed ${seed}`,
      seed,
    });
  }

  clean.sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  const t = await resetTournament(teamCount as TeamCount, clean);
  return NextResponse.json(resolveTournament(t));
}
