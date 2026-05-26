// Top ~50 single-name stocks by options volume. Mix of mega-caps and
// retail-favorite high-IV names where PCS premium is meaningful.
// Excludes ETFs (SPY/QQQ/IWM) — add manually if you want them.
export const UNIVERSE = [
  'TSLA', 'NVDA', 'AAPL', 'AMZN', 'META', 'MSFT', 'GOOGL', 'AMD', 'NFLX', 'PLTR',
  'AVGO', 'COIN', 'MSTR', 'SOFI', 'BAC', 'F', 'INTC', 'CRM', 'ORCL', 'JPM',
  'WMT', 'COST', 'V', 'MA', 'XOM', 'CVX', 'UBER', 'SHOP', 'SNOW', 'MU',
  'DIS', 'BA', 'GE', 'GS', 'MS', 'WFC', 'C', 'T', 'VZ', 'PFE',
  'JNJ', 'UNH', 'LLY', 'ABBV', 'PYPL', 'SQ', 'DKNG', 'RIVN', 'LCID', 'NIO',
] as const;

export type Symbol = (typeof UNIVERSE)[number];

export type SeriesPoint = {
  date: string;
  close: number;
  e3: number | null;
  e8: number | null;
  e17: number | null;
  e50: number | null;
  rsi: number | null;
};

export type TickerRow = {
  symbol: string;
  series: SeriesPoint[]; // last 63 trading days
  signal: {
    strict: boolean;  // RSI < 35 ∧ EMA(3) > EMA(8) — confirmed reversal
    loose3: boolean;  // RSI < 35 ∧ sideways 3d after prior decline
    loose5: boolean;  // RSI < 35 ∧ sideways 5d after prior decline
    rsi: number | null;
    extPct: number | null;
    close: number | null;
  };
  error: string | null;
};

export type ScanData = {
  generatedAt: string; // ISO
  asOfDate: string; // most recent bar date across results
  rows: TickerRow[];
};
