import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { usePaperStore } from '@/stores/paper-store';

const TIME_WINDOWS = [
  { label: '1H', ms: 60 * 60 * 1000 },
  { label: '6H', ms: 6 * 60 * 60 * 1000 },
  { label: '24H', ms: 24 * 60 * 60 * 1000 },
  { label: 'All', ms: Infinity },
] as const;

export function EquityChart() {
  const equityHistory = usePaperStore(s => s.equityHistory);
  const [window, setWindow] = useState<number>(Infinity); // ms

  const data = useMemo(() => {
    const cutoff = window === Infinity ? 0 : Date.now() - window;
    return equityHistory
      .filter(p => p.timestamp >= cutoff)
      .map(p => ({
        time: new Date(p.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        equity: p.equity,
        realizedPnl: p.realizedPnl ?? 0,
        timestamp: p.timestamp,
      }));
  }, [equityHistory, window]);

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
        Equity data will appear as trades execute
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-3">
      {/* Time window selector */}
      <div className="mb-2 flex items-center gap-1">
        {TIME_WINDOWS.map(tw => (
          <button
            key={tw.label}
            onClick={() => setWindow(tw.ms)}
            className={`rounded px-2 py-0.5 text-xs ${
              window === tw.ms
                ? 'bg-primary/20 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tw.label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-[#3fb950]" /> Equity
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4" style={{borderTop: '2px dashed #58a6ff', height: 0}} /> Realized PnL
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3fb950" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: '#8b949e', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={65}
            tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '6px', fontSize: '12px', color: '#c9d1d9' }}
            labelStyle={{ color: '#8b949e' }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              name === 'realizedPnl' ? 'Realized PnL' : 'Equity',
            ]}
          />
          <ReferenceLine y={10000} stroke="#30363d" strokeDasharray="4 4" label={{ value: '$10,000', fill: '#484f58', fontSize: 9, position: 'left' }} />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#3fb950"
            strokeWidth={2}
            fill="url(#equityGrad)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="realizedPnl"
            stroke="#58a6ff"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill="none"
            isAnimationActive={false}
            name="Realized PnL"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
