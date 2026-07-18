import type { TeamCount, TournamentView } from "./types";

async function parse(res: Response): Promise<TournamentView> {
  if (!res.ok) {
    let msg = "Something went wrong";
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as TournamentView;
}

export async function fetchTournament(signal?: AbortSignal): Promise<TournamentView> {
  const res = await fetch("/api/tournament", { cache: "no-store", signal });
  return parse(res);
}

export async function postResult(
  gameId: string,
  winner: "a" | "b",
  scoreA: number,
  scoreB: number,
): Promise<TournamentView> {
  const res = await fetch(`/api/game/${gameId}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winner, scoreA, scoreB }),
  });
  return parse(res);
}

export async function postClear(gameId: string): Promise<TournamentView> {
  const res = await fetch(`/api/game/${gameId}/clear`, { method: "POST" });
  return parse(res);
}

export async function postReset(
  teamCount: TeamCount,
  teams: Array<{ id: string; name: string; seed: number }>,
): Promise<TournamentView> {
  const res = await fetch(`/api/tournament/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamCount, teams }),
  });
  return parse(res);
}
