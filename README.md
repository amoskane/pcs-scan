# PCS Morning Scan

Daily pre-market scan for put credit spread candidates. Looks at the top ~50 stocks by options volume, flags names where:

```
RSI(14) > 70  ∧  close > EMA(8)  ∧  close > EMA(17)
```

GitHub Actions runs the scan once each weekday morning, commits `public/data.json`, Vercel auto-redeploys, dashboard loads instantly.

## Architecture

- `scripts/fetch.ts` — Node script. Hits Alpaca for all 50 tickers in one batched request, computes EMAs (3/8/17/50) and Wilder RSI(14), writes `public/data.json`. Runs in ~3 seconds.
- `scripts/indicators.ts` — Pure functions for EMA and RSI. Shared module.
- `scripts/types.ts` — Universe constant and shared TypeScript types.
- `.github/workflows/scan.yml` — Cron: `30 13 * * 1-5` (5:30 AM PT, weekdays).
- `src/Dashboard.tsx` — React reader. Renders charts; no fetcher logic.

## Setup

```bash
npm install
```

Get free Alpaca API credentials at [alpaca.markets](https://alpaca.markets) (sign up, paper account is fine, generate API keys from dashboard). Free tier = 200 req/min, multi-symbol support, IEX feed for daily bars.

```bash
# Local
export ALPACA_KEY_ID=your_key_id
export ALPACA_SECRET_KEY=your_secret_key
npm run fetch   # writes public/data.json
npm run dev     # http://localhost:5173
```

```bash
# GitHub (repo Settings → Secrets and variables → Actions)
# Add both:
#   ALPACA_KEY_ID
#   ALPACA_SECRET_KEY
```

## Vercel deploy

1. Connect the repo at vercel.com/new.
2. Framework preset: Vite. No env vars needed (Alpaca creds only run in CI).
3. Push. Vercel deploys. Future commits from GH Actions auto-redeploy.

## Tuning

- **Universe**: edit `UNIVERSE` in `scripts/types.ts`.
- **Signal**: edit `evaluate()` in `scripts/fetch.ts`.
- **Cron**: edit the schedule in `.github/workflows/scan.yml`. GitHub cron is UTC; DST does not shift it.
- **Lookback / display window**: `LOOKBACK_DAYS` and `DISPLAY_BARS` in `scripts/fetch.ts`.

## Cost

- Alpaca free tier: 200 req/min, IEX feed. We use 1-2 requests per scan, so we're not even close to the cap.
- GitHub Actions: free for public repos; 2000 min/mo for private. Daily 30-second runs = ~10 min/mo.
- Vercel hobby: free.
