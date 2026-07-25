"use client";

import { useEffect, useMemo, useState } from "react";
import type { Format, ResolvedGame } from "@/lib/types";
import { GameCard } from "./GameCard";

type Tab = "next" | "W" | "L" | "C" | "finals";

const TABS: Record<Format, { key: Tab; label: string }[]> = {
  double: [
    { key: "next", label: "Up Next" },
    { key: "W", label: "Winners" },
    { key: "L", label: "Losers" },
    { key: "finals", label: "Finals" },
  ],
  single: [
    { key: "next", label: "Up Next" },
    { key: "W", label: "Bracket" },
    { key: "C", label: "Consolation" },
  ],
};

/**
 * Heading for a group of games in the same round. A round whose games all carry
 * the same label uses it ("Quarterfinal"); otherwise fall back to the number.
 */
function roundName(round: number, games: ResolvedGame[]): string {
  const label = games[0]?.label;
  if (label && games.every((g) => g.label === label)) return label;
  return `Round ${round}`;
}

export function BracketView({
  format,
  games,
  onSubmit,
  onClear,
}: {
  format: Format;
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
  const tabs = TABS[format];

  // Switching format mid-session (a rebuild) can leave a tab selected that no
  // longer exists — fall back to Up Next.
  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab("next");
  }, [tabs, tab]);

  const playable = useMemo(() => games.filter((g) => g.playable), [games]);

  // In single elim only the main bracket decides the title, so Up Next splits
  // into title games first and consolation second — play down the list and the
  // championship finishes as early as possible.
  const upNext = useMemo(() => {
    if (format !== "single") return [{ heading: null, list: playable }];
    const title = playable.filter((g) => g.bracket !== "C");
    const cons = playable.filter((g) => g.bracket === "C");
    return [
      { heading: "For the title", list: title },
      { heading: "Consolation — play these on a spare court", list: cons },
    ].filter((s) => s.list.length > 0);
  }, [playable, format]);

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
      C: byRound(pick("C")),
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
          {tabs.map((t) => {
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
                {upNext.map((section) => (
                  <section
                    key={section.heading ?? "all"}
                    className="space-y-3 pt-1"
                  >
                    {section.heading && (
                      <h3 className="text-center text-[11px] tracking-widest uppercase text-charcoal-500">
                        {section.heading}
                      </h3>
                    )}
                    {section.list.map(card)}
                  </section>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "C" && (
          <p className="text-center text-[11px] text-charcoal-400 leading-relaxed">
            Second chance for teams knocked out before the semifinals — play
            these on the open court.
          </p>
        )}

        {(tab === "W" || tab === "L" || tab === "C") &&
          grouped[tab].map(([round, list]) => (
            <section key={round} className="space-y-3">
              <h3 className="text-center text-sm tracking-widest uppercase text-charcoal-500">
                {roundName(round, list)}
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
