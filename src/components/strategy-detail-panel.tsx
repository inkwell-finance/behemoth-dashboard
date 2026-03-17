import { useState, useEffect, useRef, useMemo } from "react";
import { codeToHtml } from "shiki";
import DOMPurify from "dompurify";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { LeaderboardStrategy } from "@/lib/api/schemas.ts";
import { useBacktestDetail } from "@/lib/api/queries.ts";
import { StrategyHistoryPanel } from "./strategy-history-panel";
import { WidgetErrorBoundary } from "./widget-error-boundary";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "history" | "backtest" | "code";

interface StrategyDetailPanelProps {
  strategy: LeaderboardStrategy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pnlColor(value: number) {
  return value > 0
    ? "text-green-400"
    : value < 0
      ? "text-red-400"
      : "text-muted-foreground";
}

function sharpeColor(value: number) {
  if (value > 2) return "text-green-400 font-bold";
  if (value > 1) return "text-green-400";
  if (value > 0) return "text-yellow-400";
  return "text-red-400";
}

const mutationColors: Record<string, string> = {
  genesis: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  crossover: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  mutation: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  refinement: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "backtest", label: "Backtest" },
  { key: "code", label: "Code" },
];

const TRADE_ROW_HEIGHT = 28;

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StrategyDetailPanel({ strategy }: StrategyDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="border-t border-border bg-muted/20">
      {/* Tab bar */}
      <div className="border-b border-border px-6">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-4">
        {activeTab === "overview" && (
          <WidgetErrorBoundary>
            <OverviewTab strategy={strategy} />
          </WidgetErrorBoundary>
        )}
        {activeTab === "history" && (
          <WidgetErrorBoundary>
            <StrategyHistoryPanel name={strategy.name} />
          </WidgetErrorBoundary>
        )}
        {activeTab === "backtest" && (
          <WidgetErrorBoundary>
            <BacktestTab strategy={strategy} />
          </WidgetErrorBoundary>
        )}
        {activeTab === "code" && (
          <WidgetErrorBoundary>
            <CodeTab code={strategy.code} />
          </WidgetErrorBoundary>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ strategy }: { strategy: LeaderboardStrategy }) {
  const mutColor =
    mutationColors[strategy.mutationType] ??
    "bg-muted text-muted-foreground";

  return (
    <div>
      {/* Stats grid - row 1 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Sharpe Ratio">
          <span className={cn("tabular-nums", sharpeColor(strategy.sharpe))}>
            {strategy.sharpe.toFixed(3)}
          </span>
        </Stat>
        <Stat label="Max Drawdown">
          <span className="tabular-nums text-red-400">
            {(strategy.maxDrawdown * 100).toFixed(2)}%
          </span>
        </Stat>
        <Stat label="Win Rate">
          <span className="tabular-nums">
            {(strategy.winRate * 100).toFixed(1)}%
          </span>
        </Stat>
        <Stat label="Total PnL">
          <span className={cn("tabular-nums", pnlColor(strategy.totalPnl))}>
            {strategy.totalPnl >= 0 ? "+" : "-"}$
            {Math.abs(strategy.totalPnl).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </Stat>
        <Stat label="Return %">
          <span className={cn("tabular-nums", pnlColor(strategy.returnPct))}>
            {strategy.returnPct >= 0 ? "+" : ""}
            {(strategy.returnPct * 100).toFixed(2)}%
          </span>
        </Stat>
        <Stat label="Trades">
          <span className="tabular-nums">{strategy.trades}</span>
        </Stat>
      </div>

      {/* Row 2: Symbol/TF, Generation, Mutation */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Best Symbol / TF">
          <span className="font-mono">
            {strategy.bestSymbol ?? "--"}{" "}
            <span className="text-muted-foreground">
              {strategy.bestTimeframe ?? ""}
            </span>
          </span>
        </Stat>
        <Stat label="Generation">
          <span className="tabular-nums">{strategy.generation}</span>
        </Stat>
        <Stat label="Mutation Type">
          <Badge
            variant="outline"
            className={cn("capitalize text-xs", mutColor)}
          >
            {strategy.mutationType}
          </Badge>
          {strategy.mutationDesc && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {strategy.mutationDesc}
            </p>
          )}
        </Stat>
      </div>

      {/* Parent hash */}
      {strategy.parentHash && (
        <div className="text-xs text-muted-foreground">
          Parent:{" "}
          <span className="font-mono">{strategy.parentHash.slice(0, 12)}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Backtest
// ---------------------------------------------------------------------------

type SymbolSortKey = 'symbol' | 'timeframe' | 'sharpe' | 'maxDrawdown' | 'tradeCount' | 'consistency';

function BacktestTab({ strategy }: { strategy: LeaderboardStrategy }) {
  const { data: detail, isLoading } = useBacktestDetail(strategy.hash);
  const [symbolSort, setSymbolSort] = useState<{ key: SymbolSortKey; desc: boolean }>({ key: 'sharpe', desc: true });

  const chartData = useMemo(() => {
    if (!detail?.equityCurve) return [];
    return detail.equityCurve.map((pt) => ({
      date: new Date(pt.ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      equity: pt.equity,
    }));
  }, [detail?.equityCurve]);

  const reversedTrades = useMemo(() => {
    if (!detail?.trades) return [];
    return [...detail.trades].reverse();
  }, [detail?.trades]);

  const winCount = useMemo(
    () => reversedTrades.filter((t) => t.pnl > 0).length,
    [reversedTrades],
  );
  const lossCount = reversedTrades.length - winCount;
  const winRate =
    reversedTrades.length > 0
      ? ((winCount / reversedTrades.length) * 100).toFixed(0)
      : "0";

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading backtest data...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No backtest data available. Data appears after the next evolution cycle.
      </div>
    );
  }

  const currentEquity = chartData.length > 0 ? chartData[chartData.length - 1]!.equity : null;

  return (
    <div>
      {/* Per-symbol breakdown */}
      {detail.perSymbol && detail.perSymbol.length > 0 && (() => {
        const sortedSymbols = [...detail.perSymbol].sort((a, b) => {
          const k = symbolSort.key;
          const av = k === 'symbol' || k === 'timeframe' ? String(a[k]) : Number(a[k]);
          const bv = k === 'symbol' || k === 'timeframe' ? String(b[k]) : Number(b[k]);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return symbolSort.desc ? -cmp : cmp;
        });
        const toggleSort = (key: SymbolSortKey) =>
          setSymbolSort(prev => ({ key, desc: prev.key === key ? !prev.desc : key !== 'symbol' && key !== 'timeframe' }));
        const sortIcon = (key: SymbolSortKey) =>
          symbolSort.key === key ? (symbolSort.desc ? ' \u2193' : ' \u2191') : '';
        return (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Per-Symbol Breakdown</h4>
          <div className="rounded border border-border overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border bg-card text-muted-foreground">
                  <th className="px-3 py-1.5 text-left font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('symbol')}>Symbol{sortIcon('symbol')}</th>
                  <th className="px-3 py-1.5 text-left font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('timeframe')}>TF{sortIcon('timeframe')}</th>
                  <th className="px-3 py-1.5 text-right font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('sharpe')}>Sharpe{sortIcon('sharpe')}</th>
                  <th className="px-3 py-1.5 text-right font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('maxDrawdown')}>Max DD{sortIcon('maxDrawdown')}</th>
                  <th className="px-3 py-1.5 text-right font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('tradeCount')}>Trades{sortIcon('tradeCount')}</th>
                  <th className="px-3 py-1.5 text-right font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('consistency')}>Consistency{sortIcon('consistency')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedSymbols.map((ps) => (
                  <tr
                    key={`${ps.symbol}-${ps.timeframe}`}
                    className="border-b border-border/50 hover:bg-muted/40"
                  >
                    <td className="px-3 py-1.5 font-mono">{ps.symbol}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {ps.timeframe}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right font-mono",
                        sharpeColor(ps.sharpe),
                      )}
                    >
                      {ps.sharpe.toFixed(3)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-red-400">
                      {(ps.maxDrawdown * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {ps.tradeCount}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {ps.consistency.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* Signal diagnostics for zero-trade pairs */}
      {detail.perSymbol?.some((ps: any) => ps.tradeCount === 0 && ps.signalStats) && (
        <div className="mb-4 rounded border border-amber-500/30 bg-amber-500/5 p-3">
          <h4 className="text-sm font-medium text-amber-400 mb-2">Signal Diagnostics (0-trade pairs)</h4>
          <div className="space-y-1.5 text-xs font-mono">
            {detail.perSymbol.filter((ps: any) => ps.tradeCount === 0 && ps.signalStats).map((ps: any) => {
              const s = ps.signalStats;
              const pctZero = s.total > 0 ? ((s.zero / s.total) * 100).toFixed(1) : '0';
              const reason = s.strategyNotReady > 0
                ? 'Strategy never became ready (isReady() = false)'
                : s.nullSignal === s.total
                ? 'generate() always returned null'
                : s.zero === s.total
                ? 'All signals were exactly 0 — strategy logic may not be firing'
                : s.strongPositive === 0 && s.strongNegative === 0
                ? `Signals too weak (max: ${s.maxSignal.toFixed(3)}, min: ${s.minSignal.toFixed(3)}) — need |signal| > 0.3 to trade`
                : 'Unknown — signals look normal but no trades opened';
              return (
                <div key={`${ps.symbol}-${ps.timeframe}`} className="flex gap-3 text-muted-foreground">
                  <span className="w-20 text-foreground">{ps.symbol}</span>
                  <span className="w-8">{ps.timeframe}</span>
                  <span className="flex-1 text-amber-300/80">{reason}</span>
                  <span className="text-right w-24">{pctZero}% zero</span>
                  <span className="text-right w-16">{s.total} bars</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Equity curve */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Equity Curve</h4>
          {currentEquity != null && (
            <span className="text-sm font-mono text-foreground">
              Current: ${currentEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3fb950" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#8b949e" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8b949e" }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#161b22",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#c9d1d9",
                }}
                labelStyle={{ color: "#8b949e" }}
                formatter={(value: number) => [
                  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                  "Equity",
                ]}
              />
              <ReferenceLine
                y={10000}
                stroke="#8b949e"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#3fb950"
                strokeWidth={2}
                fill="url(#equityGradient)"
                fillOpacity={1}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No equity curve data available.
          </div>
        )}
      </div>

      {/* Trades table */}
      {reversedTrades.length > 0 && (
        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            Win rate: {winRate}% ({winCount}W / {lossCount}L)
          </div>
          <TradesTable trades={reversedTrades} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtual trades table
// ---------------------------------------------------------------------------

function TradesTable({
  trades,
}: {
  trades: { symbol: string; side: string; entryPrice: number; exitPrice: number; pnl: number; entryTs: number; exitTs: number }[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TRADE_ROW_HEIGHT,
    overscan: 15,
  });

  return (
    <div className="rounded border border-border">
      {/* Header */}
      <div
        className="flex border-b border-border bg-card text-xs font-medium text-muted-foreground"
        style={{ height: TRADE_ROW_HEIGHT }}
      >
        <div className="flex shrink-0 items-center px-2" style={{ width: 100 }}>
          Date
        </div>
        <div className="flex shrink-0 items-center px-2" style={{ width: 56 }}>
          Side
        </div>
        <div className="flex shrink-0 items-center px-2" style={{ width: 90 }}>
          Symbol
        </div>
        <div className="flex shrink-0 items-center justify-end px-2" style={{ width: 90 }}>
          Entry
        </div>
        <div className="flex shrink-0 items-center justify-end px-2" style={{ width: 90 }}>
          Exit
        </div>
        <div className="flex shrink-0 items-center justify-end px-2" style={{ width: 90 }}>
          PnL ($)
        </div>
        <div className="flex shrink-0 items-center justify-end px-2" style={{ width: 72 }}>
          PnL (%)
        </div>
      </div>

      {/* Virtual rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 300 }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {virtualizer.getVirtualItems().map((vRow) => {
            const trade = trades[vRow.index]!;
            const pnlPct =
              trade.entryPrice !== 0
                ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) *
                  100 *
                  (trade.side.toLowerCase() === "short" ? -1 : 1)
                : 0;
            const pnlCls = trade.pnl > 0 ? "text-green-400" : trade.pnl < 0 ? "text-red-400" : "";

            return (
              <div
                key={vRow.key}
                className="absolute left-0 flex w-full border-b border-border/50 text-xs hover:bg-muted/40"
                style={{
                  height: TRADE_ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <div
                  className="flex shrink-0 items-center px-2 text-muted-foreground"
                  style={{ width: 100 }}
                >
                  {new Date(trade.exitTs).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex shrink-0 items-center px-2" style={{ width: 56 }}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      trade.side.toLowerCase() === "long"
                        ? "text-green-400 border-green-500/30"
                        : "text-red-400 border-red-500/30",
                    )}
                  >
                    {trade.side.toUpperCase()}
                  </Badge>
                </div>
                <div
                  className="flex shrink-0 items-center px-2 font-mono"
                  style={{ width: 90 }}
                >
                  {trade.symbol}
                </div>
                <div
                  className="flex shrink-0 items-center justify-end px-2 font-mono"
                  style={{ width: 90 }}
                >
                  ${trade.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className="flex shrink-0 items-center justify-end px-2 font-mono"
                  style={{ width: 90 }}
                >
                  ${trade.exitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-end px-2 font-mono",
                    pnlCls,
                  )}
                  style={{ width: 90 }}
                >
                  {trade.pnl >= 0 ? "+" : "-"}$
                  {Math.abs(trade.pnl).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-end px-2 font-mono",
                    pnlCls,
                  )}
                  style={{ width: 72 }}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Code (with highlight caching)
// ---------------------------------------------------------------------------

function CodeTab({ code }: { code: string }) {
  const [html, setHtml] = useState<string>("");
  const cacheRef = useRef<{ code: string; html: string } | null>(null);

  useEffect(() => {
    if (cacheRef.current?.code === code) {
      setHtml(cacheRef.current.html);
      return;
    }
    let cancelled = false;
    codeToHtml(code, {
      lang: "javascript",
      theme: "github-dark",
    }).then((result) => {
      if (!cancelled) {
        cacheRef.current = { code, html: result };
        setHtml(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code) {
    return (
      <pre className="max-h-[400px] overflow-auto rounded-md border border-border bg-muted/50 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words">
        No source code available.
      </pre>
    );
  }

  if (!html) {
    return (
      <pre className="max-h-[400px] overflow-auto rounded-md border border-border bg-muted/50 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words">
        {code}
      </pre>
    );
  }

  return (
    <div
      className="max-h-[400px] overflow-auto rounded-md border border-border text-xs leading-relaxed [&_pre]:!p-4 [&_pre]:!bg-transparent [&_code]:!text-xs"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
