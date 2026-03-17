import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePaperStore } from '@/stores/paper-store';

const ROW_HEIGHT = 28;

export function FillLog() {
  const fills = usePaperStore(s => s.fills);
  const filteredSymbol = usePaperStore(s => s.filteredSymbol);
  const filteredStrategy = usePaperStore(s => s.filteredStrategy);
  const parentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    fills.filter(f =>
      (!filteredSymbol || f.symbol === filteredSymbol) &&
      (!filteredStrategy || f.strategyId === filteredStrategy)
    ), [fills, filteredSymbol, filteredStrategy]);

  const wins = filtered.filter(f => (f.pnl ?? 0) > 0).length;
  const total = filtered.length;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div className="rounded-md border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>Fill Log</span>
        {total > 0 && (
          <span>
            Win rate: <span className="text-foreground">{(total > 0 ? (wins / total * 100) : 0).toFixed(0)}%</span>
            {' '}({wins}W / {total - wins}L) &middot; {total} fills
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No fills recorded yet. Fills appear as strategies trade.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex border-b border-border px-3 text-[10px] font-medium text-muted-foreground" style={{ height: ROW_HEIGHT }}>
            <div className="w-[100px] flex items-center">Time</div>
            <div className="w-[100px] flex items-center">Strategy</div>
            <div className="w-[80px] flex items-center">Symbol</div>
            <div className="w-[50px] flex items-center">Side</div>
            <div className="w-[60px] flex items-center justify-end">Size</div>
            <div className="w-[90px] flex items-center justify-end">Price</div>
            <div className="w-[60px] flex items-center justify-end">Fee</div>
            <div className="flex-1 flex items-center justify-end">PnL</div>
          </div>

          {/* Virtual rows */}
          <div ref={parentRef} className="overflow-auto" style={{ maxHeight: 280 }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vRow => {
                const fill = filtered[vRow.index]!;
                const pnlColor = (fill.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
                return (
                  <div
                    key={vRow.key}
                    className="absolute left-0 flex w-full items-center border-b border-border/30 px-3 text-xs hover:bg-muted/30"
                    style={{ height: ROW_HEIGHT, transform: `translateY(${vRow.start}px)` }}
                  >
                    <div className="w-[100px] text-muted-foreground font-mono">
                      {new Date(fill.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="w-[100px] truncate text-muted-foreground">{fill.strategyId}</div>
                    <div className="w-[80px] font-mono">{fill.symbol}</div>
                    <div className="w-[50px]">
                      <span className={fill.side === 'long' || fill.side === 'B' ? 'text-green-400' : 'text-red-400'}>
                        {(fill.side === 'B' ? 'BUY' : fill.side === 'A' ? 'SELL' : fill.side).toUpperCase()}
                      </span>
                    </div>
                    <div className="w-[60px] text-right font-mono">{fill.size.toFixed(4)}</div>
                    <div className="w-[90px] text-right font-mono">${fill.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="w-[60px] text-right font-mono text-muted-foreground">${fill.fee.toFixed(2)}</div>
                    <div className={`flex-1 text-right font-mono ${pnlColor}`}>
                      {fill.pnl != null ? `${fill.pnl >= 0 ? '+' : ''}$${fill.pnl.toFixed(2)}` : '\u2014'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
