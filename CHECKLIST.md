# ✅ Pre-Event Checklist — Wedding Pickleball Bracket

Target: **Saturday, July 25**. Do steps 1–4 the night before; steps 5–7 on the day.

---

## The night before (deploy + wire up sync)

- [ ] **1. Push to GitHub.** From the project folder:
  ```bash
  git init && git add -A && git commit -m "Wedding pickleball bracket"
  gh repo create wedding-pickleball --private --source=. --push
  ```
- [ ] **2. Import to Vercel.** [vercel.com/new](https://vercel.com/new) → pick the repo → Deploy
  (framework auto-detects as Next.js, no config needed).
- [ ] **3. Add Upstash Redis** (this is the part that makes phones sync — don't skip).
  Vercel project → **Storage** → **Upstash Redis** (Marketplace, free tier) → connect.
  It auto-injects the connection env vars.
  - [ ] Confirm the app sees them. It reads `UPSTASH_REDIS_REST_URL`/`_TOKEN` **or**
    `KV_REST_API_URL`/`_TOKEN`. If the integration named them something else, copy the
    URL + token into **Settings → Env Variables** under those names, then **Redeploy**.
- [ ] **4. Smoke-test sync.** Open the live URL on your **phone** and a **laptop** at once:
  - [ ] `/setup` → Start a throwaway tournament.
  - [ ] Tap a winner on the phone → it appears on the laptop within ~2s.
  - [ ] **Refresh both** → the result is still there (proves it's in Redis, not local).
  - [ ] When happy, go to `/setup` and **Restart** to clear the test scores.

## On the day (before you start playing)

- [ ] **5. Lock the roster.** Count who's actually there, resolve the solo players
  (see the pairing rule below), then `/setup`:
  - [ ] Set team count (**7 / 8 / 9**).
  - [ ] Type/fix every team name — a merged pair like **"Player A + Player B"** is fine.
  - [ ] Order by seed (top seed = Seed 1), or hit **Shuffle**. **Start tournament.**
- [ ] **6. Freeze & share the QR.** Open **`/qr`** on the deployed site.
  - [ ] Screenshot it and/or **Print** it. Put it where people gather.
  - [ ] Scan it with a phone that's never opened the link → confirm it lands in the
    live bracket and can score.
- [ ] **7. Brief the crew (10 seconds):** "Scan the code. Tap the winner of your match,
  enter the score, hit Confirm. It updates everyone's screen."

---

## Solo-player rule (day-of)
The bracket needs an **even number of unpaired people.**
- **3 solos** → pair two into one team ("Player A + Player B"), find one spare body for
  the third → **9**, or run the third as a sub → **8**.
- **1 solo** → they can't be a team alone; grab any willing +1 or make them a sub → **8**.
- **0 / 2 solos** → pair up → **9**.

## If something's weird mid-tournament
- Wrong result entered → tap **Edit result** on that match; downstream games recompute.
- Someone's stuck on an old view → just refresh (it re-polls every ~1.5s anyway).
- Grand final: if the **losers-bracket** team wins, a **Reset** match appears
  automatically (they have to be beaten twice). Winner triggers the confetti. 🏆

## Gotchas
- ⚠️ **No Upstash = no sync.** Without it, each phone can end up on its own copy.
  Step 3 is the one that matters.
- The QR encodes whatever URL it's opened on — always generate it from the **deployed**
  site, not `localhost`.
- It's a throwaway app: after the wedding, delete the Vercel project + Upstash store.
