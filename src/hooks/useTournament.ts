"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TournamentView } from "@/lib/types";
import { fetchTournament } from "@/lib/client";

/**
 * Live tournament state via short-interval polling (~1.5s). Robust on flaky
 * venue wifi/cell, and indistinguishable from realtime for this use. Also
 * refreshes whenever the tab regains focus. Call `apply` after a mutation to
 * push the server's returned view immediately (no wait for the next poll).
 */
export function useTournament(pollMs = 1500) {
  const [view, setView] = useState<TournamentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the freshest version we've seen to avoid a slow poll overwriting a
  // newer view returned by our own mutation.
  const latestVersion = useRef(0);

  const apply = useCallback((v: TournamentView) => {
    if (v.version >= latestVersion.current) {
      latestVersion.current = v.version;
      setView(v);
    }
  }, []);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await fetchTournament(signal);
        apply(data);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [apply],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    refresh(ctrl.signal);
    const id = setInterval(() => refresh(), pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      ctrl.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh, pollMs]);

  return { view, error, loading, apply, refresh };
}
