"use client";

import { useState } from "react";
import type { ResolvedGame, SlotState } from "@/lib/types";

function slotName(s: SlotState): string {
  return s.state === "team" ? s.name : "TBD";
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] tracking-widest uppercase text-charcoal-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-sm border border-cream-300 text-charcoal-600 text-lg leading-none hover:bg-cream-100"
          aria-label={`${label} minus`}
        >
          −
        </button>
        <span className="w-8 text-center text-xl font-serif text-charcoal-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-sm border border-cream-300 text-charcoal-600 text-lg leading-none hover:bg-cream-100"
          aria-label={`${label} plus`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function GameCard({
  game,
  onSubmit,
  onClear,
}: {
  game: ResolvedGame;
  onSubmit: (winner: "a" | "b", scoreA: number, scoreB: number) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [pending, setPending] = useState<"a" | "b" | null>(null);
  const [winScore, setWinScore] = useState(11);
  const [loseScore, setLoseScore] = useState(0);
  const [busy, setBusy] = useState(false);

  const decided = !!game.result;
  const label = game.label ?? `Game ${game.id}`;

  function pick(side: "a" | "b") {
    if (busy) return;
    setPending(side);
    setWinScore(11);
    setLoseScore(0);
  }

  async function confirm() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const scoreA = pending === "a" ? winScore : loseScore;
      const scoreB = pending === "b" ? winScore : loseScore;
      await onSubmit(pending, scoreA, scoreB);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (busy) return;
    setBusy(true);
    try {
      await onClear();
    } finally {
      setBusy(false);
    }
  }

  // ----- Row rendering -----
  function TeamRow({ side }: { side: "a" | "b" }) {
    const slot = side === "a" ? game.a : game.b;
    const name = slotName(slot);
    const isWinner = decided && game.result!.winner === side;
    const isLoser = decided && game.result!.winner !== side;
    const score = decided
      ? side === "a"
        ? game.result!.scoreA
        : game.result!.scoreB
      : null;
    const canTap = game.playable && slot.state === "team" && pending === null;

    const base =
      "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors min-h-[52px]";
    const tone = isWinner
      ? "bg-blue-50 text-charcoal-900"
      : isLoser
        ? "text-charcoal-400 line-through decoration-charcoal-300"
        : "text-charcoal-800";

    const inner = (
      <>
        <span className="flex items-center gap-2 min-w-0">
          {slot.state === "team" && slot.seed != null && (
            <span className="shrink-0 text-[10px] tracking-widest text-charcoal-400 w-5">
              #{slot.seed}
            </span>
          )}
          <span className="truncate text-[15px]">{name}</span>
          {isWinner && <span className="text-blue-600 text-sm">✓</span>}
        </span>
        {score != null && (
          <span className="shrink-0 font-serif text-lg text-charcoal-900">
            {score}
          </span>
        )}
      </>
    );

    if (canTap) {
      return (
        <button
          type="button"
          onClick={() => pick(side)}
          className={`${base} ${tone} hover:bg-blue-50 active:bg-blue-100 cursor-pointer`}
        >
          {inner}
        </button>
      );
    }
    return <div className={`${base} ${tone}`}>{inner}</div>;
  }

  return (
    <div
      className={`bg-white border rounded-sm shadow-sm overflow-hidden ${
        game.playable ? "border-blue-300" : "border-cream-300"
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <span className="text-[10px] tracking-widest uppercase text-charcoal-400">
          {label}
        </span>
        <span className="text-[10px] tracking-widest uppercase text-cream-500">
          {game.id}
        </span>
      </div>

      <div className="divide-y divide-cream-200">
        <TeamRow side="a" />
        <TeamRow side="b" />
      </div>

      {/* Scoring panel */}
      {pending && (
        <div className="border-t border-cream-200 bg-cream-50 px-4 py-3">
          <p className="text-center text-xs text-charcoal-500 mb-2">
            Winner:{" "}
            <span className="text-charcoal-900 font-medium">
              {slotName(pending === "a" ? game.a : game.b)}
            </span>
          </p>
          <div className="flex items-center justify-center gap-6">
            <Stepper label="Winner" value={winScore} onChange={setWinScore} />
            <Stepper label="Loser" value={loseScore} onChange={setLoseScore} />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={busy}
              className="flex-1 min-h-[44px] rounded-sm border border-cream-300 text-charcoal-500 text-xs tracking-widest uppercase hover:bg-cream-100 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy || winScore <= loseScore}
              className="flex-1 min-h-[44px] rounded-sm bg-blue-600 text-white text-xs tracking-widest uppercase hover:bg-blue-700 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Confirm"}
            </button>
          </div>
          {winScore <= loseScore && (
            <p className="text-center text-[11px] text-rose-600 mt-1.5">
              Winner&apos;s score must be higher.
            </p>
          )}
        </div>
      )}

      {/* Decided footer: edit/undo */}
      {decided && !pending && (
        <div className="border-t border-cream-200 px-4 py-2 flex justify-end">
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="text-[11px] tracking-widest uppercase text-charcoal-400 hover:text-rose-600 disabled:opacity-40"
          >
            {busy ? "…" : "Edit result"}
          </button>
        </div>
      )}
    </div>
  );
}
