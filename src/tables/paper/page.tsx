import { useEffect } from 'react';
import { connectPaperStore, usePaperStore } from '@/stores/paper-store';
import { EquityChart } from '@/components/paper/equity-chart';
import { PriceChart } from '@/components/paper/price-chart';
import { PositionTable } from '@/components/paper/position-table';
import { FillLog } from '@/components/paper/fill-log';

// ---------------------------------------------------------------------------
// Statistics Panel (concern 12)
// ---------------------------------------------------------------------------

function StatTile({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  const colorClass = color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : '';
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold font-mono ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatisticsPanel() {
  const equity = usePaperStore(s => s.equity);
  const stats = usePaperStore(s => s.stats);

  const totalWins = stats.reduce((s, st) => s + st.wins, 0);
  const totalLosses = stats.reduce((s, st) => s + st.losses, 0);
  const totalTrades = stats.reduce((s, st) => s + st.totalTrades, 0);
  const totalPnl = stats.reduce((s, st) => s + st.totalPnl, 0);
  const winRate = totalTrades > 0 ? (totalWins / totalTrades * 100).toFixed(1) : '0.0';
  const maxDD = stats.length > 0 ? Math.max(...stats.map(s => s.maxDrawdown)) : 0;

  // Use PnLTracker equity when available, fall back to strategy stats aggregate
  const hasEquity = equity && equity.totalEquity > 0;
  const displayEquity = hasEquity ? equity.totalEquity : 10000 + totalPnl;
  const displayRealized = hasEquity ? equity.realizedPnl : totalPnl;
  const displayUnrealized = hasEquity ? equity.unrealizedPnl : 0;
  const displayFees = hasEquity ? equity.totalFees : 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Total Equity" value={`$${displayEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
      <StatTile label="Realized PnL" value={`${displayRealized >= 0 ? '+' : ''}$${displayRealized.toFixed(2)}`} color={displayRealized >= 0 ? 'green' : 'red'} />
      <StatTile label="Unrealized PnL" value={`${displayUnrealized >= 0 ? '+' : ''}$${displayUnrealized.toFixed(2)}`} color={displayUnrealized >= 0 ? 'green' : 'red'} />
      <StatTile label="Total Fees" value={`$${displayFees.toFixed(2)}`} />
      <StatTile label="Win Rate" value={`${winRate}%`} color={parseFloat(winRate) >= 50 ? 'green' : 'red'} />
      <StatTile
        label="Trades"
        value={`${totalTrades} (${totalWins}W / ${totalLosses}L)`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy Breakdown (concern 16)
// ---------------------------------------------------------------------------

function StrategyBreakdown() {
  const stats = usePaperStore(s => s.stats);
  const filteredStrategy = usePaperStore(s => s.filteredStrategy);

  const filtered = filteredStrategy ? stats.filter(s => s.strategyId === filteredStrategy) : stats;

  if (filtered.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        No strategy data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Per-Strategy Breakdown</h3>
      {filtered.map(s => (
        <details key={s.strategyId} className="rounded-md border border-border bg-card">
          <summary className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/40 text-sm">
            <span className="font-semibold truncate">{s.strategyId}</span>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {s.totalTrades} trades &middot; {((s.winRate ?? 0) * 100).toFixed(1)}% WR &middot; Sharpe {(s.sharpeRatio ?? 0).toFixed(2)}
            </span>
          </summary>
          <div className="border-t border-border px-4 py-3 grid grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted-foreground">Trades:</span> <span className="font-mono">{s.totalTrades}</span></div>
            <div><span className="text-muted-foreground">Wins:</span> <span className="font-mono text-green-400">{s.wins}</span></div>
            <div><span className="text-muted-foreground">Losses:</span> <span className="font-mono text-red-400">{s.losses}</span></div>
            <div><span className="text-muted-foreground">Win Rate:</span> <span className="font-mono">{((s.winRate ?? 0) * 100).toFixed(1)}%</span></div>
            <div><span className="text-muted-foreground">Total PnL:</span> <span className={`font-mono ${(s.totalPnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${(s.totalPnl ?? 0).toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Avg PnL:</span> <span className="font-mono">${(s.avgPnl ?? 0).toFixed(2)}</span></div>
            <div><span className="text-muted-foreground">Max DD:</span> <span className="font-mono text-red-400">{((s.maxDrawdown ?? 0) * 100).toFixed(2)}%</span></div>
            <div><span className="text-muted-foreground">Sharpe:</span> <span className={`font-mono ${(s.sharpeRatio ?? 0) >= 1 ? 'text-green-400' : ''}`}>{(s.sharpeRatio ?? 0).toFixed(3)}</span></div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PaperTradingPage() {
  useEffect(() => {
    const cleanup = connectPaperStore();
    return cleanup;
  }, []);

  const mode = usePaperStore(s => s.mode);
  const fills = usePaperStore(s => s.fills);
  const lastFill = fills[0];
  const lastTradeAge = lastFill ? Math.floor((Date.now() - lastFill.timestamp) / 60000) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Paper Trading</h1>
          <p className="text-sm text-muted-foreground">Live paper trading positions and performance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Last trade indicator */}
          <span className="text-xs text-muted-foreground">
            {lastTradeAge != null
              ? `Last trade: ${lastTradeAge < 1 ? '<1' : lastTradeAge} min ago`
              : 'No trades yet'}
          </span>
          {/* Connection badge */}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
            mode === 'live' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
            mode === 'polling' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
            'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            <span className={`inline-block h-2 w-2 rounded-full ${
              mode === 'live' ? 'bg-green-500 animate-pulse' :
              mode === 'polling' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            {mode === 'live' ? 'Live' : mode === 'polling' ? 'Polling' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Row 1: Stats + Equity + Positions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <StatisticsPanel />
        </div>
        <div className="lg:col-span-4">
          <EquityChart />
        </div>
        <div className="lg:col-span-5">
          <PositionTable />
        </div>
      </div>

      {/* Row 2: Price chart */}
      <PriceChart />

      {/* Row 3: Fill log */}
      <FillLog />

      {/* Row 4: Strategy breakdown */}
      <StrategyBreakdown />
    </div>
  );
}
