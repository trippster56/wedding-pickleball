"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { BracketView } from "@/components/BracketView";
import { ChampionBanner } from "@/components/Champion";
import { postClear, postResult } from "@/lib/client";
import { Kicker } from "@/components/ui";

export default function Home() {
  const { view, error, loading, apply } = useTournament();

  async function onSubmit(
    gameId: string,
    winner: "a" | "b",
    scoreA: number,
    scoreB: number,
  ) {
    const next = await postResult(gameId, winner, scoreA, scoreB);
    apply(next);
  }

  async function onClear(gameId: string) {
    const next = await postClear(gameId);
    apply(next);
  }

  return (
    <main
      id="main-content"
      className="w-full max-w-xl mx-auto px-5 pb-24 min-h-screen"
    >
      {/* Header */}
      <header className="text-center pt-10 pb-2">
        <Kicker>Callie &amp; Tripp</Kicker>
        <h1 className="font-serif text-3xl sm:text-5xl text-charcoal-900 mt-2 leading-tight">
          Pickleball Tournament
        </h1>
        <div className="mx-auto w-16 h-px bg-blue-400 my-4" />
        <p className="text-charcoal-500 text-sm tracking-wide">
          Saturday, July 25 · Double Elimination
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 text-xs tracking-widest uppercase">
          <Link href="/setup" className="text-blue-700 hover:text-blue-800">
            Setup / Seeds
          </Link>
          <span className="text-cream-400">·</span>
          <Link href="/qr" className="text-blue-700 hover:text-blue-800">
            Share QR
          </Link>
        </div>
      </header>

      {error && (
        <p className="mt-4 text-center text-rose-600 text-sm">{error}</p>
      )}

      {loading && !view && (
        <p className="mt-12 text-center text-charcoal-400 text-sm">
          Loading bracket…
        </p>
      )}

      {view && (
        <div className="mt-6 space-y-6">
          {view.champion && <ChampionBanner name={view.champion.name} />}

          {view.phase === "setup" && !view.champion && (
            <div className="bg-white border border-cream-300 rounded-sm shadow-sm px-5 py-6 text-center">
              <p className="text-charcoal-600 text-sm">
                The bracket hasn&apos;t started yet.
              </p>
              <Link
                href="/setup"
                className="inline-flex mt-4 items-center justify-center px-6 py-3 min-h-[44px] rounded-sm bg-blue-600 text-white text-sm tracking-widest uppercase hover:bg-blue-700"
              >
                Set teams &amp; seeds
              </Link>
            </div>
          )}

          {view.phase !== "setup" && (
            <BracketView
              games={view.games}
              onSubmit={onSubmit}
              onClear={onClear}
            />
          )}
        </div>
      )}

      <footer className="mt-16 text-center text-[11px] text-charcoal-400 leading-relaxed">
        Tap the winner of any ready match to advance them. Everyone&apos;s screen
        updates live.
        <br />
        Double elimination — every team plays at least twice.
      </footer>
    </main>
  );
}
