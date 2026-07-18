import { NextResponse } from "next/server";
import { readTournament, resolveTournament } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const t = await readTournament();
  const view = resolveTournament(t);
  return NextResponse.json(view, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
