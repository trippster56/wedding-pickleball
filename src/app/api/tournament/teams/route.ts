import { NextRequest, NextResponse } from "next/server";
import { readTournament, resolveTournament, updateTeamPlayers } from "@/lib/store";
import { makePlayerId, teamLabel } from "@/lib/roster";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Update the players on existing teams without rebuilding the bracket — safe to
 * call mid-tournament. Team count, seeds, and every recorded score are kept;
 * only the roster (and each team's derived label) changes. To add/remove whole
 * teams or reseed, use POST /api/tournament/reset.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teams } = (body ?? {}) as {
    teams?: Array<{
      id?: string;
      players?: Array<{ id?: string; name?: string }>;
    }>;
  };

  if (!Array.isArray(teams) || teams.length === 0) {
    return NextResponse.json({ error: "No teams provided" }, { status: 400 });
  }

  const current = await readTournament();
  const knownIds = new Set(current.teams.map((t) => t.id));
  const updates: Array<{ id: string; players: Player[] }> = [];

  for (const t of teams) {
    if (!t.id || !knownIds.has(t.id)) {
      return NextResponse.json(
        { error: "Unknown team id — reseed to add or remove teams" },
        { status: 400 },
      );
    }
    const players: Player[] = (t.players ?? [])
      .map((p) => ({ id: p.id || makePlayerId(), name: (p.name || "").trim() }))
      .filter((p) => p.name);
    if (!teamLabel(players)) {
      return NextResponse.json(
        { error: "Every team needs at least one player" },
        { status: 400 },
      );
    }
    updates.push({ id: t.id, players });
  }

  const t = await updateTeamPlayers(updates);
  return NextResponse.json(resolveTournament(t));
}
