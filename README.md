# 🥇 Callie & Tripp — Wedding Pickleball Bracket

A mobile-first, real-time **double-elimination** tournament bracket for the wedding
party. Guests scan a QR code, everyone sees the same live bracket, and anyone can
tap a match winner + enter the score. Winners auto-advance and losers drop into the
losers bracket automatically. Supports **7, 8, 9, or 10 teams**, chosen day-of.

Built to match the [callieandtripp](https://callieandtripp.com) wedding site
(Next.js 16, Tailwind v4, Playfair Display + Lato, cream/blue/rose palette).

## How it works day-of

1. **/setup** — pick 7/8/9/10 teams, edit names, order them by seed (arrows or Shuffle),
   then **Start tournament**.
2. **/** — the live bracket. The **Up Next** tab shows every match that's ready;
   tap the winner, set the score (defaults 11–x), Confirm. Everyone's screen updates
   within ~1.5s. Tabs for Winners / Losers / Finals show the full bracket.
3. **/qr** — a QR code + link to share. Show it on a phone or print it.
4. Champion (incl. the grand-final **reset** if the losers-bracket team wins) triggers
   a confetti moment.

Undo any result with **Edit result** on a decided match — downstream games recompute.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Redis env vars, state persists to a local file at `.data/tournament.json`
(handy for testing; git-ignored).

## Deploy to Vercel (throwaway, ~5 min)

The bracket is one shared document. In production it lives in **Upstash Redis**
(one key per game result, so two phones scoring different matches never clobber
each other). Set it up via the Vercel Marketplace:

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new)
   (framework auto-detects as Next.js).
2. In the project → **Storage** → add **Upstash Redis** (Marketplace, free tier).
   Vercel injects the connection env vars automatically.
3. This app reads either naming convention:
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`.

   If the Marketplace integration gives you differently-named vars, add these two
   (URL + token) in **Settings → Environment Variables** pointing at the same values.
4. Deploy. The production URL (e.g. `wedding-pickleball.vercel.app`) is your QR
   target — open `/qr` on the deployed site and it encodes that URL automatically.

> No Redis configured in production = each serverless instance falls back to its own
> ephemeral file and state won't be shared. **Add Upstash before the event.**

### Alternative store
Tripp's wedding site already uses **Neon Postgres**. If you'd rather reuse that, the
same single-document model fits a one-row `jsonb` table — but Upstash is less code
for a pure key-value blob and is the recommended path here.

## Architecture notes

- `src/lib/bracket.ts` — the double-elim templates for 7/8/9/10 and the pure
  advancement/champion/reset resolver. The 9-team layout is ported verbatim from
  `9-team-double-elimination-blank-bracket_1.html`. **Verified**: for each size,
  playing every match through yields exactly one champion in `2N−2` games
  (`2N−1` with a bracket reset).
- `src/lib/store.ts` — storage abstraction (Upstash Redis in prod, file in dev),
  granular per-game writes, and a prune pass that cascade-clears downstream results
  on undo.
- `src/app/api/*` — GET tournament, reset, per-game result, per-game clear.
- `src/hooks/useTournament.ts` — ~1.5s polling (robust on venue wifi), refetch on
  tab focus, version-guarded so a slow poll never overwrites a newer state.

Default teams are generic placeholders in `src/lib/roster.ts`. Real team names are
entered on the day in `/setup` and stored in the datastore — never committed to the repo.
