import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ScanData, TickerRow, SeriesPoint } from '../scripts/types';

type Filter = 'strict' | 'loose' | 'all';

const C = {
  bg: '#0a0a0a',
  panel: '#141414',
  panelHi: '#1a1a1a',
  grid: '#262626',
  text: '#e8e6e0',
  textDim: '#8a8680',
  textFaint: '#4a4642',
  amber: '#ffb627',
  cyan: '#4ec9b0',
  red: '#ff5c5c',
  green: '#7dd87d',
  blue: '#4a9eff',
  e3: '#7dd87d',   // green  — fastest, freshest signal
  e8: '#ffd34e',   // yellow — short-term
  e17: '#ff9933',  // orange — medium-term
  e50: '#ff5c5c',  // red    — slow baseline
};

const MONO = 'JetBrains Mono, monospace';

type SignalLevel = 'strict' | 'loose' | 'none';

function Spark({ data, level }: { data: SeriesPoint[]; level: SignalLevel }) {
  const closes = data.map((d) => d.close).filter((v) => v != null) as number[];
  const e50vals = data.map((d) => d.e50).filter((v) => v != null) as number[];
  const allPrices = [...closes, ...e50vals];
  const min = Math.min(...allPrices) * 0.98;
  const max = Math.max(...allPrices) * 1.02;

  // RSI line is always blue — neutral oscillator color, free of signal-tier
  // semantics (those are already conveyed by border, ticker color, sort order).
  // The 30-line tints amber/green when a signal hits, so the threshold breach
  // is still visible without overloading the RSI line itself.
  const rsiStroke = C.blue;
  const refLine30Stroke =
    level === 'strict' ? C.green : level === 'loose' ? C.amber : C.textFaint;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 200 }}>
      <ResponsiveContainer width="100%" height="72%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis
            domain={[min, max]}
            tick={{ fill: C.textDim, fontSize: 9, fontFamily: MONO }}
            width={42}
            tickFormatter={(v: number) => v.toFixed(v >= 100 ? 0 : 1)}
            axisLine={{ stroke: C.grid }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: C.panelHi,
              border: `1px solid ${C.grid}`,
              fontSize: 10,
              fontFamily: MONO,
              color: C.text,
            }}
            labelStyle={{ color: C.amber }}
            formatter={(v) => (v == null ? '—' : typeof v === 'number' ? v.toFixed(2) : String(v))}
          />
          <Line type="monotone" dataKey="e50" stroke={C.e50} dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="e17" stroke={C.e17} dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="e8" stroke={C.e8} dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="e3" stroke={C.e3} dot={false} strokeWidth={0.8} isAnimationActive={false} />
          <Line type="monotone" dataKey="close" stroke={C.text} dot={false} strokeWidth={1.6} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height="28%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <XAxis dataKey="date" hide />
          <YAxis
            domain={[0, 100]}
            ticks={[30, 50, 70]}
            tick={{ fill: C.textDim, fontSize: 9, fontFamily: MONO }}
            width={42}
            axisLine={{ stroke: C.grid }}
            tickLine={false}
          />
          <ReferenceLine y={70} stroke={C.textFaint} strokeDasharray="2 3" />
          <ReferenceLine y={30} stroke={refLine30Stroke} strokeDasharray="2 3" />
          <Line
            type="monotone"
            dataKey="rsi"
            stroke={rsiStroke}
            dot={false}
            strokeWidth={1.2}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ row, looseWindow }: { row: TickerRow; looseWindow: 3 | 5 }) {
  const { symbol, signal, series, error } = row;
  if (error || !series || series.length === 0) {
    return (
      <div style={{ background: C.panel, border: `1px solid ${C.grid}`, padding: 12, height: 256 }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>{symbol}</div>
        <div style={{ fontSize: 10, color: C.red, marginTop: 8, fontFamily: MONO }}>
          {error ?? 'no data'}
        </div>
      </div>
    );
  }
  // Three-tier visual treatment, with loose checked against the current window:
  //   strict hit → amber accent (best signal: reversal confirmed)
  //   loose hit  → cyan accent  (oversold + sideways base forming, no turn yet)
  //   no hit     → default gray
  const looseHit = looseWindow === 3 ? signal.loose3 : signal.loose5;
  const level: SignalLevel = signal.strict ? 'strict' : looseHit ? 'loose' : 'none';
  const accent = level === 'strict' ? C.amber : level === 'loose' ? C.cyan : null;
  const hasSignal = accent !== null;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${accent ?? C.grid}`,
        borderLeftWidth: hasSignal ? 3 : 1,
        padding: '10px 12px 12px',
        height: 256,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 14,
            fontWeight: 600,
            color: accent ?? C.text,
            letterSpacing: '0.04em',
          }}
        >
          {symbol}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textDim }}>
          ${signal.close?.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          fontFamily: MONO,
          fontSize: 10,
          color: C.textDim,
          marginBottom: 6,
        }}
      >
        <span>
          RSI{' '}
          <span style={{ color: level === 'strict' ? C.green : level === 'loose' ? C.amber : C.text }}>
            {signal.rsi?.toFixed(1)}
          </span>
        </span>
        <span>
          EXT{' '}
          <span style={{ color: (signal.extPct ?? 0) < -5 ? C.amber : C.text }}>
            {(signal.extPct ?? 0) >= 0 ? '+' : ''}
            {signal.extPct?.toFixed(1)}%
          </span>
        </span>
      </div>
      <Spark data={series} level={level} />
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        fontFamily: MONO,
        fontSize: 10,
        color: C.textDim,
        letterSpacing: '0.04em',
        flexWrap: 'wrap',
      }}
    >
      {(
        [
          ['CLOSE', C.text],
          ['EMA 3', C.e3],
          ['EMA 8', C.e8],
          ['EMA 17', C.e17],
          ['EMA 50', C.e50],
        ] as const
      ).map(([label, color]) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 2, background: color, display: 'inline-block' }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<ScanData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('strict');
  const [looseWindow, setLooseWindow] = useState<3 | 5>(3);

  useEffect(() => {
    // Cache-bust so refreshes always get the latest checked-in scan.
    fetch(`/data.json?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ScanData) => setData(d))
      .catch((e) => setLoadError(e.message));
  }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.rows].sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      // Tier by current loose window: strict > loose-in-window > none.
      // Within tier, lowest RSI first (most oversold).
      const looseA = looseWindow === 3 ? a.signal.loose3 : a.signal.loose5;
      const looseB = looseWindow === 3 ? b.signal.loose3 : b.signal.loose5;
      const aTier = a.signal.strict ? 2 : looseA ? 1 : 0;
      const bTier = b.signal.strict ? 2 : looseB ? 1 : 0;
      if (aTier !== bTier) return bTier - aTier;
      return (a.signal.rsi ?? 100) - (b.signal.rsi ?? 100);
    });
  }, [data, looseWindow]);

  if (loadError) {
    return (
      <div style={{ background: C.bg, color: C.red, minHeight: '100vh', padding: 40, fontFamily: MONO }}>
        Failed to load /data.json — {loadError}
        <div style={{ color: C.textDim, marginTop: 12, fontSize: 12 }}>
          Has the GitHub Actions workflow run yet? Trigger it manually from the Actions tab if needed.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: C.bg, color: C.textDim, minHeight: '100vh', padding: 40, fontFamily: MONO, fontSize: 12 }}>
        Loading scan...
      </div>
    );
  }

  const strictCount = data.rows.filter((r) => r.signal.strict).length;
  const looseCount = data.rows.filter((r) =>
    looseWindow === 3 ? r.signal.loose3 : r.signal.loose5,
  ).length;
  const errCount = data.rows.filter((r) => r.error).length;
  const looseHit = (r: TickerRow) => (looseWindow === 3 ? r.signal.loose3 : r.signal.loose5);
  const visible =
    filter === 'strict'
      ? sorted.filter((r) => r.signal.strict)
      : filter === 'loose'
      ? sorted.filter(looseHit)
      : sorted;

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        padding: '24px 28px 40px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
        color: C.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${C.grid}`,
          paddingBottom: 14,
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.amber,
              letterSpacing: '0.18em',
              marginBottom: 4,
            }}
          >
            MORNING SCAN · PUT CREDIT SPREADS
          </div>
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Oversold reversal
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.textDim,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: C.amber }}>STRICT</span> RSI &lt; 35 ∧ EMA(3) &gt; EMA(8)
            <span style={{ color: C.textFaint, margin: '0 8px' }}>·</span>
            <span style={{ color: C.cyan }}>LOOSE</span> RSI &lt; 35 ∧ sideways {looseWindow}d after decline
          </div>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: C.textDim,
            textAlign: 'right',
            lineHeight: 1.6,
          }}
        >
          <div>
            UNIVERSE <span style={{ color: C.text }}>{data.rows.length}</span> · STRICT{' '}
            <span style={{ color: C.amber }}>{strictCount}</span> · LOOSE{' '}
            <span style={{ color: C.cyan }}>{looseCount}</span> · ERR{' '}
            <span style={{ color: errCount ? C.red : C.text }}>{errCount}</span>
          </div>
          <div>
            AS OF <span style={{ color: C.text }}>{data.asOfDate}</span> · GEN{' '}
            {new Date(data.generatedAt).toLocaleString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {(
            [
              ['strict', `STRICT (${strictCount})`, C.amber],
              ['loose', `LOOSE (${looseCount})`, C.cyan],
              ['all', `ALL (${data.rows.length})`, C.text],
            ] as const
          ).map(([key, label, color]) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  background: active ? color : 'transparent',
                  color: active ? C.bg : C.textDim,
                  border: `1px solid ${active ? color : C.grid}`,
                  padding: '6px 14px',
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
          {/* LOOSE window toggle: 3d vs 5d */}
          <div
            style={{
              marginLeft: 8,
              display: 'flex',
              gap: 0,
              border: `1px solid ${C.grid}`,
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.08em',
            }}
            title="Sideways window for LOOSE signal"
          >
            <span
              style={{
                padding: '6px 8px',
                color: C.textFaint,
                borderRight: `1px solid ${C.grid}`,
              }}
            >
              SIDEWAYS
            </span>
            {([3, 5] as const).map((d) => {
              const active = looseWindow === d;
              return (
                <button
                  key={d}
                  onClick={() => setLooseWindow(d)}
                  style={{
                    background: active ? C.cyan : 'transparent',
                    color: active ? C.bg : C.textDim,
                    border: 'none',
                    borderRight: d === 3 ? `1px solid ${C.grid}` : 'none',
                    padding: '6px 10px',
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {d}D
                </button>
              );
            })}
          </div>
        </div>
        <Legend />
      </div>

      {visible.length === 0 && (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: C.textDim,
            fontFamily: MONO,
            border: `1px dashed ${C.grid}`,
          }}
        >
          {filter === 'strict' ? (
            <>
              No confirmed reversals today.{' '}
              {looseCount > 0 ? (
                <>
                  Try{' '}
                  <span
                    onClick={() => setFilter('loose')}
                    style={{ color: C.cyan, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    LOOSE
                  </span>{' '}
                  — {looseCount} {looseCount === 1 ? 'name has' : 'names have'} sideways {looseWindow}d bases.
                </>
              ) : (
                'Nothing forming bases either — patience.'
              )}
            </>
          ) : filter === 'loose' ? (
            <>
              No {looseWindow}-day sideways bases today.{' '}
              {(() => {
                const other = looseWindow === 3 ? 5 : 3;
                const otherCount = data.rows.filter((r) =>
                  other === 3 ? r.signal.loose3 : r.signal.loose5,
                ).length;
                if (otherCount > 0) {
                  return (
                    <>
                      Try{' '}
                      <span
                        onClick={() => setLooseWindow(other)}
                        style={{ color: C.cyan, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {other}D
                      </span>{' '}
                      — {otherCount} {otherCount === 1 ? 'name' : 'names'} qualify with the longer window.
                    </>
                  );
                }
                return 'Patience.';
              })()}
            </>
          ) : (
            <>No data yet.</>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}
      >
        {visible.map((row) => (
          <Card key={row.symbol} row={row} looseWindow={looseWindow} />
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          paddingTop: 14,
          borderTop: `1px solid ${C.grid}`,
          fontFamily: MONO,
          fontSize: 10,
          color: C.textFaint,
          lineHeight: 1.7,
        }}
      >
        DATA polygon.io · daily adjusted bars · 400-day lookback, last 63 sessions shown<br />
        EMA seed = SMA(period) · RSI = Wilder's smoothed, 14 period<br />
        SIGNAL strict ≡ RSI &lt; 35 ∧ EMA(3) &gt; EMA(8) · loose ≡ RSI &lt; 35 ∧ |close − close[Nd ago]| &lt; 3% ∧ close[Nd ago] &lt; close[N+7d ago] · EXT = (close − EMA17) / EMA17<br />
        FETCH GitHub Actions cron, 13:30 UTC weekdays
      </div>
    </div>
  );
}
