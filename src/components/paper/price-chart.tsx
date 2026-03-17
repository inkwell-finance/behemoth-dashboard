import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { usePaperStore } from '@/stores/paper-store';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'HYPE'];
const TIMEFRAMES = ['1m', '5m', '1h'] as const;
const EMPTY_CANDLES: import('@/stores/paper-store').Candle[] = [];
type Timeframe = (typeof TIMEFRAMES)[number];

function drawCandlesticks(u: uPlot) {
  const ctx = u.ctx;
  const [ts, opens, highs, lows, closes] = u.data;
  if (!ts || ts.length === 0) return;

  const barW = Math.max(3, Math.min(12, (u.bbox.width / ts.length) * 0.7));

  for (let i = 0; i < ts.length; i++) {
    const x = u.valToPos(ts[i], 'x', true);
    const o = u.valToPos(opens[i], 'y', true);
    const h = u.valToPos(highs[i], 'y', true);
    const l = u.valToPos(lows[i], 'y', true);
    const c = u.valToPos(closes[i], 'y', true);

    const bull = closes[i] >= opens[i];
    ctx.strokeStyle = bull ? '#3fb950' : '#f85149';
    ctx.fillStyle = bull ? '#3fb95060' : '#f8514960';
    ctx.lineWidth = 1;

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x, l);
    ctx.stroke();

    // Body
    const top = Math.min(o, c);
    const bodyH = Math.max(1, Math.abs(o - c));
    ctx.fillRect(x - barW / 2, top, barW, bodyH);
    ctx.strokeRect(x - barW / 2, top, barW, bodyH);
  }
}

export function PriceChart() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const containerRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);

  const candles = usePaperStore((s) => s.candles[selectedSymbol]) ?? EMPTY_CANDLES;

  const chartData = useMemo<uPlot.AlignedData | null>(() => {
    if (candles.length === 0) return null;
    return [
      new Float64Array(candles.map((c) => c.timestamp / 1000)),
      new Float64Array(candles.map((c) => c.open)),
      new Float64Array(candles.map((c) => c.high)),
      new Float64Array(candles.map((c) => c.low)),
      new Float64Array(candles.map((c) => c.close)),
    ];
  }, [candles]);

  // Trade marker draw hook
  const drawTradeMarkers = useCallback(
    (u: uPlot) => {
      const ctx = u.ctx;
      const fills = usePaperStore.getState().fills;

      for (const fill of fills) {
        if (fill.symbol !== selectedSymbol) continue;
        const x = u.valToPos(fill.timestamp / 1000, 'x', true);
        const y = u.valToPos(fill.price, 'y', true);
        if (x < 0 || y < 0) continue;

        ctx.save();
        const isLong = fill.side === 'long' || fill.side === 'B';
        const color = (fill.pnl ?? 0) >= 0 ? '#3fb950' : '#f85149';

        // Triangle marker
        ctx.beginPath();
        const size = 6;
        if (isLong) {
          ctx.moveTo(x, y - size);
          ctx.lineTo(x - size, y + size);
          ctx.lineTo(x + size, y + size);
        } else {
          ctx.moveTo(x, y + size);
          ctx.lineTo(x - size, y - size);
          ctx.lineTo(x + size, y - size);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.restore();
      }
    },
    [selectedSymbol],
  );

  // Refetch candles when timeframe changes
  useEffect(() => {
    fetch(
      `/api/trader/paper/candles?symbol=${selectedSymbol}&tf=${timeframe}&limit=500`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.candles)
          usePaperStore.getState().setCandles(selectedSymbol, d.candles);
      })
      .catch(() => {});
  }, [selectedSymbol, timeframe]);

  // Update chart data imperatively when candles change
  useEffect(() => {
    if (uplotRef.current && chartData) {
      uplotRef.current.setData(chartData);
    }
  }, [chartData]);

  // Create/destroy uPlot instance
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 300,
      series: [
        {}, // timestamps
        { show: false, label: 'Open' },
        { show: false, label: 'High' },
        { show: false, label: 'Low' },
        { show: false, label: 'Close' },
      ],
      axes: [
        {
          stroke: '#30363d',
          grid: { stroke: '#30363d', dash: [3, 3] },
          ticks: { stroke: '#30363d' },
          font: '11px monospace',
          values: (_u: uPlot, vals: number[]) =>
            vals.map((v) => {
              const d = new Date(v * 1000);
              return d.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });
            }),
        },
        {
          stroke: '#30363d',
          grid: { stroke: '#30363d', dash: [3, 3] },
          ticks: { stroke: '#30363d' },
          font: '11px monospace',
          values: (_u: uPlot, vals: number[]) =>
            vals.map((v) => '$' + v.toLocaleString()),
        },
      ],
      scales: { x: { time: false } },
      hooks: {
        drawSeries: [
          (u: uPlot, si: number) => {
            if (si === 4) drawCandlesticks(u);
          },
        ],
        draw: [drawTradeMarkers],
      },
    };

    const empty: uPlot.AlignedData = [
      new Float64Array(0),
      new Float64Array(0),
      new Float64Array(0),
      new Float64Array(0),
      new Float64Array(0),
    ];

    uplotRef.current = new uPlot(opts, chartData ?? empty, el);

    // Resize observer for responsive width
    const ro = new ResizeObserver(() => {
      if (uplotRef.current && el.clientWidth > 0) {
        uplotRef.current.setSize({ width: el.clientWidth, height: 300 });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, [selectedSymbol, drawTradeMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-md border border-border bg-card p-3">
      {/* Symbol tabs + timeframe selector */}
      <div className="mb-3 flex items-center gap-1 border-b border-border pb-2">
        {SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`rounded px-3 py-1 text-xs font-mono ${
              selectedSymbol === sym
                ? 'bg-primary/20 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {sym}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded px-2 py-1 text-xs font-mono ${
                timeframe === tf
                  ? 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="w-full [&_.u-wrap]:bg-transparent"
        style={{ minHeight: 300 }}
      />

      {/* Empty state overlay */}
      {candles.length === 0 && (
        <div className="-mt-[300px] flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Waiting for candle data...
        </div>
      )}
    </div>
  );
}
