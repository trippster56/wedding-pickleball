"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Player, TeamCount } from "@/lib/types";
import { teamLabel } from "@/lib/roster";
import { fetchTournament, postReset, postTeamPlayers } from "@/lib/client";
import { Button, Kicker } from "@/components/ui";

type Row = { id: string; players: Player[] };

// The bracket templates only exist for these sizes.
const MIN_TEAMS = 8;
const MAX_TEAMS = 10;
// Doubles — two people per team.
const MAX_PLAYERS = 2;

function newId(prefix: string): string {
  try {
    return prefix + "-" + crypto.randomUUID();
  } catch {
    return prefix + "-" + Math.random().toString(36).slice(2);
  }
}

function blankPlayer(): Player {
  return { id: newId("p"), name: "" };
}

function blankTeam(): Row {
  return { id: newId("t"), players: [blankPlayer()] };
}

// Always give a team at least one editable player slot.
function withSlot(players: Player[]): Player[] {
  return players.length ? players : [blankPlayer()];
}

// A signature of the bracket-affecting shape: how many teams and in what seed
// order. Unchanged => edits are roster-only and scores can be kept.
function structureSig(rows: Row[]): string {
  return rows.map((r) => r.id).join("|");
}

export default function SetupPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [initialSig, setInitialSig] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [wasLive, setWasLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournament()
      .then((v) => {
        setWasLive(v.phase !== "setup");
        const ordered = [...v.teams]
          .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
          .map((t) => ({ id: t.id, players: withSlot(t.players ?? []) }));
        setRows(ordered);
        setInitialSig(structureSig(ordered));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoaded(true));
  }, []);

  const teamCount = rows.length;
  const structureChanged = structureSig(rows) !== initialSig;
  // A live bracket can have its roster edited without a rebuild; anything
  // structural (adding/removing/reordering teams) has to rebuild, which clears
  // scores. Editing the players on a team keeps its seed and slot.
  const keepsScores = wasLive && !structureChanged;

  function setPlayerName(ri: number, pi: number, name: string) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === ri
          ? {
              ...r,
              players: r.players.map((p, j) => (j === pi ? { ...p, name } : p)),
            }
          : r,
      ),
    );
  }

  function addPartner(ri: number) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === ri && r.players.length < MAX_PLAYERS
          ? { ...r, players: [...r.players, blankPlayer()] }
          : r,
      ),
    );
  }

  function removePartner(ri: number, pi: number) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === ri
          ? { ...r, players: withSlot(r.players.filter((_, j) => j !== pi)) }
          : r,
      ),
    );
  }

  function addTeam() {
    setRows((prev) => (prev.length >= MAX_TEAMS ? prev : [...prev, blankTeam()]));
  }

  function removeTeam(i: number) {
    setRows((prev) =>
      prev.length <= MIN_TEAMS ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function shuffle() {
    setRows((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }

  // Named players only, ids preserved for stable identity.
  function namedPlayers(r: Row): Player[] {
    return r.players
      .map((p) => ({ id: p.id, name: p.name.trim() }))
      .filter((p) => p.name);
  }

  async function save() {
    setError(null);
    if (teamCount < MIN_TEAMS || teamCount > MAX_TEAMS) {
      setError(`The bracket needs between ${MIN_TEAMS} and ${MAX_TEAMS} teams.`);
      return;
    }
    const emptyIdx = rows.findIndex((r) => namedPlayers(r).length === 0);
    if (emptyIdx >= 0) {
      setError(`Seed ${emptyIdx + 1} needs at least one player.`);
      return;
    }

    if (keepsScores) {
      // Live bracket, roster-only edit — no rebuild, scores stay put.
      setSaving(true);
      try {
        await postTeamPlayers(
          rows.map((r) => ({ id: r.id, players: namedPlayers(r) })),
        );
        router.push("/");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (wasLive) {
      const ok = window.confirm(
        "This changes the number of teams or their seeding, which rebuilds the bracket and clears any scores already entered. Continue?",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const teams = rows.map((r, i) => {
        const players = namedPlayers(r);
        return { id: r.id, name: teamLabel(players), seed: i + 1, players };
      });
      await postReset(teamCount as TeamCount, teams);
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = saving
    ? "Saving…"
    : keepsScores
      ? "Save roster"
      : wasLive
        ? "Rebuild bracket"
        : "Start tournament";

  return (
    <main className="w-full max-w-xl mx-auto px-5 pb-24 min-h-screen">
      <header className="text-center pt-10 pb-4">
        <Kicker>Tournament Setup</Kicker>
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900 mt-2">
          Teams &amp; Players
        </h1>
        <div className="mx-auto w-16 h-px bg-blue-400 my-4" />
        <p className="text-charcoal-500 text-sm">
          Doubles — two players per team. Add a partner for solos, swap people in
          as they show up, and reorder seeds (seed 1 is the top seed).
        </p>
      </header>

      {!loaded ? (
        <p className="text-center text-charcoal-400 text-sm py-10">Loading…</p>
      ) : (
        <>
          {/* Team list */}
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="flex items-start gap-2 bg-white border border-cream-300 rounded-sm shadow-sm px-3 py-3"
              >
                <span className="shrink-0 w-8 h-8 mt-0.5 rounded-sm bg-cream-100 text-charcoal-500 font-serif flex items-center justify-center text-sm">
                  {i + 1}
                </span>

                {/* Players for this team */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {r.players.map((p, pi) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        value={p.name}
                        onChange={(e) => setPlayerName(i, pi, e.target.value)}
                        className="flex-1 min-w-0 bg-cream-50 border border-cream-200 rounded-sm outline-none focus:border-blue-400 text-[15px] text-charcoal-800 px-2.5 py-2"
                        placeholder={pi === 0 ? "Player 1" : "Partner"}
                      />
                      {r.players.length > 1 && (
                        <button
                          onClick={() => removePartner(i, pi)}
                          aria-label={`Remove ${p.name || "player"}`}
                          title="Remove player"
                          className="shrink-0 w-8 h-8 text-charcoal-300 hover:text-rose-600 leading-none"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {r.players.length < MAX_PLAYERS && (
                    <button
                      onClick={() => addPartner(i)}
                      className="text-xs text-blue-700 hover:text-blue-800"
                    >
                      ＋ Add partner
                    </button>
                  )}
                </div>

                {/* Reorder + remove team */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="w-9 h-6 text-charcoal-500 hover:text-charcoal-900 disabled:opacity-25 leading-none"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                    className="w-9 h-6 text-charcoal-500 hover:text-charcoal-900 disabled:opacity-25 leading-none"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeTeam(i)}
                    disabled={teamCount <= MIN_TEAMS}
                    aria-label="Remove team"
                    title={
                      teamCount <= MIN_TEAMS
                        ? `Minimum ${MIN_TEAMS} teams`
                        : "Remove team"
                    }
                    className="w-9 h-7 mt-1 text-charcoal-400 hover:text-rose-600 disabled:opacity-25 disabled:hover:text-charcoal-400 leading-none text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add team / shuffle */}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={addTeam}
              disabled={teamCount >= MAX_TEAMS}
              className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 disabled:opacity-30"
            >
              <span className="text-lg leading-none">＋</span> Add team
            </button>
            <button
              onClick={shuffle}
              className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-blue-700"
            >
              ⤮ Shuffle seeds
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-charcoal-400">
            {teamCount} team{teamCount === 1 ? "" : "s"} · bracket supports{" "}
            {MIN_TEAMS}–{MAX_TEAMS}
          </p>

          {error && (
            <p className="mt-4 text-center text-rose-600 text-sm">{error}</p>
          )}

          {wasLive && (
            <p className="mt-4 text-center text-[11px] text-charcoal-500">
              {keepsScores
                ? "Editing players only — seeds and scores will be kept."
                : "Changing the team count or seeding rebuilds the bracket and clears existing scores."}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button href="/" variant="outline" className="flex-1">
              Back
            </Button>
            <Button onClick={save} disabled={saving} className="flex-1">
              {saveLabel}
            </Button>
          </div>

          <p className="mt-8 text-center text-[11px] text-charcoal-400">
            <Link href="/qr" className="hover:text-blue-700">
              Show the QR code to share →
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
