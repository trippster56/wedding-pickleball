"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TeamCount } from "@/lib/types";
import { DEFAULT_TEAM_NAMES } from "@/lib/roster";
import { fetchTournament, postReset } from "@/lib/client";
import { Button, Kicker } from "@/components/ui";

type Row = { id: string; name: string };

const COUNTS: TeamCount[] = [8, 9, 10];

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "t" + Math.random().toString(36).slice(2);
  }
}

function fillTo(rows: Row[], count: number): Row[] {
  const next = rows.slice(0, count);
  for (let i = next.length; i < count; i++) {
    next.push({ id: newId(), name: DEFAULT_TEAM_NAMES[i] ?? `Team ${i + 1}` });
  }
  return next;
}

export default function SetupPage() {
  const router = useRouter();
  const [teamCount, setTeamCount] = useState<TeamCount>(9);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [wasLive, setWasLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournament()
      .then((v) => {
        setTeamCount(v.teamCount);
        setWasLive(v.phase !== "setup");
        const ordered = [...v.teams]
          .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
          .map((t) => ({ id: t.id, name: t.name }));
        setRows(fillTo(ordered, v.teamCount));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoaded(true));
  }, []);

  function changeCount(n: TeamCount) {
    setTeamCount(n);
    setRows((prev) => fillTo(prev, n));
  }

  function setName(i: number, name: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name } : r)));
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

  async function save() {
    setError(null);
    if (rows.some((r) => !r.name.trim())) {
      setError("Give every team a name.");
      return;
    }
    if (wasLive) {
      const ok = window.confirm(
        "This will clear any scores already entered and restart the bracket. Continue?",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const teams = rows.map((r, i) => ({
        id: r.id,
        name: r.name.trim(),
        seed: i + 1,
      }));
      await postReset(teamCount, teams);
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="w-full max-w-xl mx-auto px-5 pb-24 min-h-screen">
      <header className="text-center pt-10 pb-4">
        <Kicker>Tournament Setup</Kicker>
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900 mt-2">
          Teams &amp; Seeding
        </h1>
        <div className="mx-auto w-16 h-px bg-blue-400 my-4" />
        <p className="text-charcoal-500 text-sm">
          Seed 1 is the top seed. Reorder with the arrows; edit any name.
        </p>
      </header>

      {!loaded ? (
        <p className="text-center text-charcoal-400 text-sm py-10">Loading…</p>
      ) : (
        <>
          {/* Team count */}
          <div className="text-center">
            <p className="text-xs tracking-widest uppercase text-charcoal-400 mb-2">
              How many teams?
            </p>
            <div className="inline-flex rounded-sm border border-cream-300 overflow-hidden">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => changeCount(c)}
                  className={`px-6 py-3 min-h-[44px] text-sm tracking-widest transition-colors ${
                    teamCount === c
                      ? "bg-blue-600 text-white"
                      : "bg-white text-charcoal-600 hover:bg-cream-100"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Seed list */}
          <div className="mt-6 space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-2 bg-white border border-cream-300 rounded-sm shadow-sm px-3 py-2"
              >
                <span className="shrink-0 w-8 h-8 rounded-sm bg-cream-100 text-charcoal-500 font-serif flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <input
                  value={r.name}
                  onChange={(e) => setName(i, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-charcoal-800 py-2"
                  placeholder={`Seed ${i + 1} team`}
                />
                <div className="flex flex-col shrink-0">
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
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={shuffle}
              className="text-xs tracking-widest uppercase text-blue-700 hover:text-blue-800"
            >
              ⤮ Shuffle seeds
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-rose-600 text-sm">{error}</p>
          )}

          {wasLive && (
            <p className="mt-4 text-center text-[11px] text-rose-600">
              Saving restarts the bracket and clears existing scores.
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button href="/" variant="outline" className="flex-1">
              Back
            </Button>
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : wasLive ? "Restart bracket" : "Start tournament"}
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
