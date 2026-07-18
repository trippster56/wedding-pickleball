import { NextResponse } from "next/server";
import { clearResult, resolveTournament } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const t = await clearResult(id);
  return NextResponse.json(resolveTournament(t));
}
