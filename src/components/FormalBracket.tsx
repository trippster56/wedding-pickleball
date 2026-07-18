"use client";

import { useMemo, useState } from "react";
import type { GameDef, ResolvedGame, SlotState, Source, TeamCount } from "@/lib/types";
import { buildBracket } from "@/lib/bracket";

type Br = "W" | "L" | "finals";

const TABS: { key: Br; label: string }[] = [
  { key: "W", label: "Winners" },
  { key: "L", label: "Losers" },
  { key: "finals", label: "Finals" },
];

// Layout constants (mobile-tuned).
const BOX_W = 170;
const BOX_H = 64;
const COL_GAP = 38;
const ROW_PITCH = 80;
const PAD = 14;

type Pos = { id: string; x: number; y: number };

function slotLabel(slot: SlotState, src: Source | undefined): string {
  if (slot.state === "team") return slot.name;
  if (!src) return "TBD";
  if (src.t === "seed") return `Seed ${src.seed}`;
  if (src.t === "w") return `Winner ${src.g}`;
  return `Loser ${src.g}`;
}

/**
 * Position games into a bracket tree. `feeders(id)` returns the ids of the games
 * (within this view) that flow into `id`. Leaf games (no feeders) are stacked
 * top-to-bottom; each parent centers on the average Y of its feeders — the
 * classic bracket layout, same idea as the source HTML.
 */
function layout(
  list: GameDef[],
  defsById: Record<string, GameDef>,
  feeders: (id: string) => string[],
) {
  if (list.length === 0) return { positions: [] as Pos[], connectors: [] as string[], width: 0, height: 0 };

  const rounds = list.map((d) => d.round);
  const maxRound = Math.max(...rounds);
  // Root = the (single) game in the last round.
  let rootId = list[0].id;
  for (const d of list) if (d.round > defsById[rootId].round) rootId = d.id;

  let leaf = 0;
  const yMemo = new Map<string, number>();
  const inList = new Set(list.map((d) => d.id));
  function Y(id: string): number {
    if (yMemo.has(id)) return yMemo.get(id)!;
    yMemo.set(id, 0); // cycle guard
    const fs = feeders(id).filter((f) => inList.has(f));
    let y: number;
    if (fs.length === 0) y = leaf++ * ROW_PITCH;
    else y = fs.map(Y).reduce((a, b) => a + b, 0) / fs.length;
    yMemo.set(id, y);
    return y;
  }
  Y(rootId);
  for (const d of list) if (!yMemo.has(d.id)) Y(d.id);

  const x = (round: number) => PAD + (round - 1) * (BOX_W + COL_GAP);
  const positions: Pos[] = list.map((d) => ({
    id: d.id,
    x: x(d.round),
    y: PAD + (yMemo.get(d.id) ?? 0),
  }));
  const posById = new Map(positions.map((p) => [p.id, p]));

  const connectors: string[] = [];
  for (const d of list) {
    const to = posById.get(d.id)!;
    for (const f of feeders(d.id)) {
      const from = posById.get(f);
      if (!from) continue;
      const fx = from.x + BOX_W;
      const fcy = from.y + BOX_H / 2;
      const tx = to.x;
      const tcy = to.y + BOX_H / 2;
      const midX = (fx + tx) / 2;
      connectors.push(`M${fx},${fcy} H${midX} V${tcy} H${tx}`);
    }
  }

  const width = x(maxRound) + BOX_W + PAD;
  const height = PAD * 2 + (leaf > 0 ? (leaf - 1) * ROW_PITCH : 0) + BOX_H;
  return { positions, connectors, width, height };
}

function Box({
  def,
  game,
}: {
  def: GameDef;
  game: ResolvedGame | undefined;
}) {
  const result = game?.result ?? null;
  const rows: ("a" | "b")[] = ["a", "b"];
  return (
    <div
      className={`absolute rounded-sm border bg-white overflow-hidden ${
        game?.playable ? "border-blue-300" : "border-cream-300"
      }`}
      style={{ left: 0, top: 0, width: BOX_W, height: BOX_H }}
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[9px] tracking-widest uppercase text-charcoal-400 truncate">
          {def.label ?? ""}
        </span>
        <span className="text-[9px] tracking-widest uppercase text-cream-500">
          {def.id}
        </span>
      </div>
      <div className="divide-y divide-cream-200">
        {rows.map((side) => {
          const slot = side === "a" ? game?.a : game?.b;
          const src = side === "a" ? def.a : def.b;
          const name = slot ? slotLabel(slot, src) : slotLabel({ state: "tbd" }, src);
          const isWinner = result?.winner === side;
          const isLoser = result != null && result.winner !== side;
          const score = result ? (side === "a" ? result.scoreA : result.scoreB) : null;
          const seed = slot?.state === "team" ? slot.seed : null;
          return (
            <div
              key={side}
              className={`flex items-center justify-between gap-1 px-2 py-1 ${
                isWinner
                  ? "bg-blue-50 text-charcoal-900"
                  : isLoser
                    ? "text-charcoal-400 line-through decoration-charcoal-300"
                    : "text-charcoal-700"
              }`}
            >
              <span className="flex items-center gap-1 min-w-0">
                {seed != null && (
                  <span className="shrink-0 text-[9px] text-charcoal-400">#{seed}</span>
                )}
                <span className="truncate text-[12px] leading-tight">{name}</span>
              </span>
              {score != null && (
                <span className="shrink-0 text-[12px] font-serif text-charcoal-900">
                  {score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FormalBracket({
  teamCount,
  games,
}: {
  teamCount: TeamCount;
  games: ResolvedGame[];
}) {
  const [br, setBr] = useState<Br>("W");

  const defs = useMemo(() => buildBracket(teamCount), [teamCount]);
  const defsById = useMemo(() => {
    const m: Record<string, GameDef> = {};
    for (const d of defs) m[d.id] = d;
    return m;
  }, [defs]);
  const gameById = useMemo(() => {
    const m = new Map<string, ResolvedGame>();
    for (const g of games) m.set(g.id, g);
    return m;
  }, [games]);

  const { list, feeders } = useMemo(() => {
    if (br === "finals") {
      const fl = defs.filter(
        (d) => d.bracket === "GF" || (d.bracket === "RESET" && gameById.get(d.id)?.active),
      );
      // Lay GF then RESET in successive columns.
      const withRounds = fl.map((d) => ({
        ...d,
        round: d.bracket === "RESET" ? 2 : 1,
      }));
      const feed = (id: string) =>
        defsById[id]?.bracket === "RESET" && withRounds.some((d) => d.bracket === "GF")
          ? ["GF"]
          : [];
      return { list: withRounds, feeders: feed };
    }
    const fl = defs.filter((d) => d.bracket === br);
    const feed = (id: string) => {
      const d = defsById[id];
      if (!d) return [];
      return [d.a, d.b]
        .filter((s): s is Extract<Source, { g: string }> => s.t !== "seed")
        .map((s) => s.g)
        .filter((g) => defsById[g] && defsById[g].bracket === d.bracket);
    };
    return { list: fl, feeders: feed };
  }, [br, defs, defsById, gameById]);

  const { positions, connectors, width, height } = useMemo(
    () => layout(list, defsById, feeders),
    [list, defsById, feeders],
  );
  const posById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  return (
    <div>
      {/* W / L / Finals switch */}
      <div className="flex justify-center gap-1.5 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setBr(t.key)}
            className={`px-4 py-2 rounded-sm text-xs tracking-widest uppercase transition-colors ${
              br === t.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-cream-300 text-charcoal-500 hover:text-charcoal-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-charcoal-400 mb-2">
        Swipe sideways to see the whole bracket →
      </p>

      <div className="-mx-5 overflow-x-auto pb-4">
        <div className="relative mx-5" style={{ width, height, minWidth: width }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
          >
            {connectors.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#d9cdb9"
                strokeWidth={1.5}
              />
            ))}
          </svg>
          {list.map((def) => {
            const pos = posById.get(def.id);
            if (!pos) return null;
            return (
              <div
                key={def.id}
                className="absolute"
                style={{ left: pos.x, top: pos.y, width: BOX_W }}
              >
                <Box def={def} game={gameById.get(def.id)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
