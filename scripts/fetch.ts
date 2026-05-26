import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ema, rsi } from './indicators.ts';
import { UNIVERSE, type ScanData, type SeriesPoint, type TickerRow } from './types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'public', 'data.json');

// Alpaca free tier: 200 req/min, multi-symbol via comma list. We fetch all
// 50 tickers in a single paginated call. Need ~110 calendar days to cover
// the 63-session display window plus 50-EMA seeding cushion.
const LOOKBACK_DAYS = 110;
const DISPLAY_BARS = 63;

const KEY_ID = process.env.ALPACA_KEY_ID;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;
if (!KEY_ID || !SECRET_KEY) {
  console.error('ALPACA_KEY_ID and ALPACA_SECRET_KEY env vars are required');
  process.exit(1);
}

type AlpacaBar = { t: string; o: number; h: number; l: number; c: number; v: number };
type AlpacaResponse = {
  bars: Record<string, AlpacaBar[]>;
  next_page_token: string | null;
};

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

async function fetchAllBars(): Promise<Record<string, AlpacaBar[]>> {
  const to = new Date();
  // Alpaca free tier (IEX feed) only allows data up to ~15 minutes ago. For
  // daily bars, ending "yesterday" is the safe play — always settled.
  to.setUTCDate(to.getUTCDate() - 1);
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86_400_000);

  const symbols = UNIVERSE.join(',');
  const bars: Record<string, AlpacaBar[]> = {};
  let pageToken: string | null = null;
  let pageCount = 0;

  // Loop until Alpaca stops giving us next_page_token. With 50 symbols × ~75
  // bars = 3,750 points, well under the 10,000 limit per page — usually 1 call.
  do {
    const params = new URLSearchParams({
      symbols,
      timeframe: '1Day',
      start: formatDate(from),
      end: formatDate(to),
      limit: '10000',
      adjustment: 'all',
      feed: 'iex',
      sort: 'asc',
    });
    if (pageToken) params.set('page_token', pageToken);

    const url = `https://data.alpaca.markets/v2/stocks/bars?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'APCA-API-KEY-ID': KEY_ID!,
        'APCA-API-SECRET-KEY': SECRET_KEY!,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Alpaca ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as AlpacaResponse;
    pageCount++;

    // Merge results — same symbol can appear across pages
    for (const [sym, symBars] of Object.entries(json.bars ?? {})) {
      if (!bars[sym]) bars[sym] = [];
      bars[sym].push(...symBars);
    }

    pageToken = json.next_page_token;
  } while (pageToken);

  console.log(`Fetched ${Object.keys(bars).length} symbols in ${pageCount} page(s)`);
  return bars;
}

function buildSeries(bars: AlpacaBar[]): SeriesPoint[] {
  const closes = bars.map((b) => b.c);
  const e3 = ema(closes, 3);
  const e8 = ema(closes, 8);
  const e17 = ema(closes, 17);
  const e50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);
  return bars.map((b, i) => ({
    date: b.t.slice(0, 10),
    close: b.c,
    e3: e3[i],
    e8: e8[i],
    e17: e17[i],
    e50: e50[i],
    rsi: rsi14[i],
  }));
}

function evaluate(series: SeriesPoint[]): TickerRow['signal'] {
  const latest = series[series.length - 1];
  if (!latest || latest.rsi == null || latest.e8 == null || latest.e17 == null) {
    return { overbought: false, rsi: null, extPct: null, close: null };
  }
  const overbought = latest.rsi > 70 && latest.close > latest.e8 && latest.close > latest.e17;
  const extPct = ((latest.close - latest.e17) / latest.e17) * 100;
  return { overbought, rsi: latest.rsi, extPct, close: latest.close };
}

async function main() {
  console.log(`Scanning ${UNIVERSE.length} tickers via Alpaca (batched)...`);
  const start = Date.now();

  const allBars = await fetchAllBars();
  const rows: TickerRow[] = [];
  let mostRecentDate = '';

  for (const symbol of UNIVERSE) {
    const bars = allBars[symbol] ?? [];
    if (bars.length < 50) {
      console.log(`  ${symbol.padEnd(6)} SKIP (${bars.length} bars)`);
      rows.push({
        symbol,
        series: [],
        signal: { overbought: false, rsi: null, extPct: null, close: null },
        error: `insufficient bars (${bars.length})`,
      });
      continue;
    }

    const full = buildSeries(bars);
    const signal = evaluate(full);
    const displaySeries = full.slice(-DISPLAY_BARS);
    const lastDate = full[full.length - 1].date;
    if (lastDate > mostRecentDate) mostRecentDate = lastDate;

    rows.push({ symbol, series: displaySeries, signal, error: null });
    const flag = signal.overbought ? '🔥 OB' : '  --';
    console.log(
      `  ${symbol.padEnd(6)} ${flag}  RSI ${signal.rsi!.toFixed(1).padStart(5)} ` +
        `EXT ${signal.extPct! >= 0 ? '+' : ''}${signal.extPct!.toFixed(1)}%`,
    );
  }

  const data: ScanData = {
    generatedAt: new Date().toISOString(),
    asOfDate: mostRecentDate,
    rows,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(data, null, 2));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const obCount = rows.filter((r) => r.signal.overbought).length;
  const errCount = rows.filter((r) => r.error).length;
  console.log(
    `\nDone in ${elapsed}s — ${obCount} overbought, ${errCount} errors, as of ${mostRecentDate}`,
  );
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
