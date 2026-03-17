import { useMemo } from 'react';
import { usePaperStore } from '@/stores/paper-store';

export function PositionTable() {
  const positions = usePaperStore(s => s.positions);
  const prices = usePaperStore(s => s.prices);
  const filteredSymbol = usePaperStore(s => s.filteredSymbol);
  const filteredStrategy = usePaperStore(s => s.filteredStrategy);

  const rows = useMemo(() => {
    return positions
      .filter(p => (!filteredSymbol || p.symbol === filteredSymbol) && (!filteredStrategy || p.strategyId === filteredStrategy))
      .map(p => {
        const currentPrice = prices[p.symbol] ?? p.currentPrice;
        const mult = p.side === 'long' ? 1 : -1;
        const unrealizedPnl = (currentPrice - p.entryPrice) * p.size * mult;
        const unrealizedPct = p.entryPrice > 0 ? (unrealizedPnl / (p.entryPrice * p.size)) * 100 : 0;
        return { ...p, currentPrice, unrealizedPnl, unrealizedPct };
      });
  }, [positions, prices, filteredSymbol, filteredStrategy]);

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
        No open positions
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Symbol</th>
            <th className="px-3 py-2 text-left font-medium">Strategy</th>
            <th className="px-3 py-2 text-left font-medium">Side</th>
            <th className="px-3 py-2 text-right font-medium">Size</th>
            <th className="px-3 py-2 text-right font-medium">Entry</th>
            <th className="px-3 py-2 text-right font-medium">Current</th>
            <th className="px-3 py-2 text-right font-medium">PnL</th>
            <th className="px-3 py-2 text-right font-medium">PnL %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={`${r.strategyId}:${r.symbol}`} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-3 py-2 font-mono">{r.symbol}</td>
              <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{r.strategyId}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {r.side.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-mono">{r.size.toFixed(4)}</td>
              <td className="px-3 py-2 text-right font-mono">${r.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-right font-mono">${r.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className={`px-3 py-2 text-right font-mono ${r.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {r.unrealizedPnl >= 0 ? '+' : ''}${r.unrealizedPnl.toFixed(2)}
              </td>
              <td className={`px-3 py-2 text-right font-mono ${r.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {r.unrealizedPct >= 0 ? '+' : ''}{r.unrealizedPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
