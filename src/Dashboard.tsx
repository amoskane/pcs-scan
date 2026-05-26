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

type Filter = 'overbought' | 'all';

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
  e3: '#ff5c5c',
  e8: '#ffb627',
  e17: '#e8e6e0',
  e50: '#4ec9b0',
};

const MONO = 'JetBrains Mono, monospace';

function Spark({ data, overbought }: { data: SeriesPoint[]; overbought: boolean }) {
  const closes = data.map((d) => d.close).filter((v) => v != null) as number[];
  const e50vals = data.map((d) => d.e50).filter((v) => v != null) as number[];
  const allPrices = [...closes, ...e50vals];
  const min = Math.min(...allPrices) * 0.98;
  const max = Math.max(...allPrices) * 1.02;

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
          <ReferenceLine y={70} stroke={overbought ? C.red : C.textFaint} strokeDasharray="2 3" />
          <ReferenceLine y={30} stroke={C.textFaint} strokeDasharray="2 3" />
          <Line
            type="monotone"
            dataKey="rsi"
            stroke={overbought ? C.red : C.cyan}
            dot={false}
            strokeWidth={1.2}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ row }: { row: TickerRow }) {
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
  const ob = signal.overbought;
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${ob ? C.amber : C.grid}`,
        borderLeftWidth: ob ? 3 : 1,
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
            color: ob ? C.amber : C.text,
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
          <span style={{ color: ob ? C.red : (signal.rsi ?? 0) > 70 ? C.amber : C.text }}>
            {signal.rsi?.toFixed(1)}
          </span>
        </span>
        <span>
          EXT{' '}
          <span style={{ color: (signal.extPct ?? 0) > 5 ? C.amber : C.text }}>
            {(signal.extPct ?? 0) >= 0 ? '+' : ''}
            {signal.extPct?.toFixed(1)}%
          </span>
        </span>
      </div>
      <Spark data={series} overbought={ob} />
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
  const [filter, setFilter] = useState<Filter>('overbought');

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
      const aOb = a.signal.overbought ? 1 : 0;
      const bOb = b.signal.overbought ? 1 : 0;
      if (aOb !== bOb) return bOb - aOb;
      return (b.signal.rsi ?? 0) - (a.signal.rsi ?? 0);
    });
  }, [data]);

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

  const obCount = data.rows.filter((r) => r.signal.overbought).length;
  const errCount = data.rows.filter((r) => r.error).length;
  const visible = filter === 'overbought' ? sorted.filter((r) => r.signal.overbought) : sorted;

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
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.01em' }}>
            Overbought<span style={{ color: C.textFaint }}> / </span>
            <span style={{ color: C.textDim }}>RSI &gt; 70 ∧ close &gt; EMA(8) ∧ close &gt; EMA(17)</span>
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
            UNIVERSE <span style={{ color: C.text }}>{data.rows.length}</span> · OB{' '}
            <span style={{ color: C.amber }}>{obCount}</span> · ERR{' '}
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
        <div style={{ display: 'flex', gap: 4 }}>
          {(
            [
              ['overbought', `OVERBOUGHT ONLY (${obCount})`],
              ['all', `ALL (${data.rows.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                background: filter === key ? C.amber : 'transparent',
                color: filter === key ? C.bg : C.textDim,
                border: `1px solid ${filter === key ? C.amber : C.grid}`,
                padding: '6px 14px',
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
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
          No overbought candidates today. The market isn't extended — patience.
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
          <Card key={row.symbol} row={row} />
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
        SIGNAL overbought ≡ RSI &gt; 70 ∧ close &gt; EMA(8) ∧ close &gt; EMA(17) · EXT = (close − EMA17) / EMA17<br />
        FETCH GitHub Actions cron, 13:30 UTC weekdays
      </div>
    </div>
  );
}
