"use client";

import { useMemo, useState } from "react";
import type { ResolvedGame } from "@/lib/types";
import { GameCard } from "./GameCard";

type Tab = "next" | "W" | "L" | "finals";

const TABS: { key: Tab; label: string }[] = [
  { key: "next", label: "Up Next" },
  { key: "W", label: "Winners" },
  { key: "L", label: "Losers" },
  { key: "finals", label: "Finals" },
];

function roundName(bracket: string, round: number, games: ResolvedGame[]): string {
  const inRound = games.filter((g) => g.round === round);
  const withLabel = inRound.find((g) => g.label);
  if (withLabel?.label && inRound.length === 1) return withLabel.label;
  return `Round ${round}`;
}

export function BracketView({
  games,
  onSubmit,
  onClear,
}: {
  games: ResolvedGame[];
  onSubmit: (
    gameId: string,
    winner: "a" | "b",
    scoreA: number,
    scoreB: number,
  ) => Promise<void>;
  onClear: (gameId: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("next");

  const playable = useMemo(
    () => games.filter((g) => g.playable),
    [games],
  );

  const grouped = useMemo(() => {
    const pick = (bracket: string) =>
      games.filter((g) => g.bracket === bracket && g.active);
    const byRound = (list: ResolvedGame[]) => {
      const map = new Map<number, ResolvedGame[]>();
      for (const g of list) {
        if (!map.has(g.round)) map.set(g.round, []);
        map.get(g.round)!.push(g);
      }
      return [...map.entries()].sort((a, b) => a[0] - b[0]);
    };
    return {
      W: byRound(pick("W")),
      L: byRound(pick("L")),
      finals: games.filter(
        (g) => (g.bracket === "GF" || g.bracket === "RESET") && g.active,
      ),
    };
  }, [games]);

  const card = (g: ResolvedGame) => (
    <GameCard
      key={g.id}
      game={g}
      onSubmit={(w, sa, sb) => onSubmit(g.id, w, sa, sb)}
      onClear={() => onClear(g.id)}
    />
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-0 z-20 -mx-5 px-5 py-3 bg-cream-100/90 backdrop-blur-sm border-b border-cream-300">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const count = t.key === "next" ? playable.length : null;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3.5 py-2 rounded-sm text-xs tracking-widest uppercase transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-cream-300 text-charcoal-500 hover:text-charcoal-800"
                }`}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span
                    className={`ml-1.5 ${active ? "text-blue-100" : "text-rose-600"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-5 space-y-6">
        {tab === "next" && (
          <div className="space-y-3">
            {playable.length === 0 ? (
              <p className="text-center text-charcoal-400 text-sm py-10">
                No games ready to play right now.
              </p>
            ) : (
              <>
                <p className="text-center text-xs tracking-widest uppercase text-charcoal-400">
                  Ready to play — tap the winner
                </p>
                {playable.map(card)}
              </>
            )}
          </div>
        )}

        {(tab === "W" || tab === "L") &&
          grouped[tab].map(([round, list]) => (
            <section key={round} className="space-y-3">
              <h3 className="text-center text-sm tracking-widest uppercase text-charcoal-500">
                {roundName(tab, round, list)}
              </h3>
              {list.map(card)}
            </section>
          ))}

        {tab === "finals" && (
          <section className="space-y-3">
            {grouped.finals.map(card)}
          </section>
        )}
      </div>
    </div>
  );
}
