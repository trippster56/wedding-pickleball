import { NextRequest, NextResponse } from "next/server";
import { readTournament, recordResult, resolveTournament } from "@/lib/store";
import { validateResult } from "@/lib/bracket";
import type { GameResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { winner, scoreA, scoreB } = (body ?? {}) as {
    winner?: string;
    scoreA?: number;
    scoreB?: number;
  };

  if (winner !== "a" && winner !== "b") {
    return NextResponse.json(
      { error: "winner must be 'a' or 'b'" },
      { status: 400 },
    );
  }

  const a = Number(scoreA);
  const b = Number(scoreB);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }
  // The winner should have the higher score (guard against a mismatch).
  if ((winner === "a" && a < b) || (winner === "b" && b < a)) {
    return NextResponse.json(
      { error: "Winner's score can't be lower than the loser's" },
      { status: 400 },
    );
  }

  // Validate against current resolved state (both teams known & game active).
  const current = resolveTournament(await readTournament());
  const err = validateResult(current, id);
  if (err) return NextResponse.json({ error: err }, { status: 409 });

  const result: GameResult = { winner, scoreA: a, scoreB: b };
  const t = await recordResult(id, result);
  return NextResponse.json(resolveTournament(t));
}
