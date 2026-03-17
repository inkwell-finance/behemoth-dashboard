import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStrategyHistory } from "@/lib/api/queries.ts";
import type { StrategyHistoryPoint } from "@/lib/api/schemas.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewMode = "table" | "chart";

const METRIC_COLORS: Record<string, string> = {
  sharpe: "#3fb950",
  maxDrawdown: "#f85149",
  consistency: "#58a6ff",
  tradeCount: "#d2a8ff",
  totalPnl: "#f0883e",
  returnPct: "#56d364",
};

const METRIC_LABELS: Record<string, string> = {
  sharpe: "Sharpe",
  maxDrawdown: "Max DD",
  consistency: "Consistency",
  tradeCount: "Trades",
  totalPnl: "PnL",
  returnPct: "Return %",
};

const ALL_METRICS = Object.keys(METRIC_COLORS);
const DEFAULT_METRICS = new Set(["sharpe", "maxDrawdown"]);

const COL_WIDTHS = {
  cycle: 64,
  time: 140,
  sharpe: 72,
  maxDD: 72,
  trades: 64,
  pnl: 88,
  returnPct: 72,
  consistency: 84,
  decision: 80,
} as const;

const ROW_HEIGHT = 28;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StrategyHistoryPanel({ name }: { name: string }) {
  const { data, isLoading } = useStrategyHistory(name);
  const [view, setView] = useState<ViewMode>("table");

  if (isLoading) {
    return (
      <div className="border-t border-border bg-muted/30 px-6 py-4">
        <p className="text-sm text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  const history = data?.history ?? [];

  if (history.length === 0) {
    return (
      <div className="border-t border-border bg-muted/30 px-6 py-4">
        <p className="text-sm text-muted-foreground">
          No historical data available.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/30 px-6 py-4">
      {/* Toggle */}
      <div className="mb-3 flex items-center gap-2">
        <span className="mr-1 text-sm font-medium text-foreground">
          History
        </span>
        <ToggleButton
          active={view === "table"}
          onClick={() => setView("table")}
        >
          Table
        </ToggleButton>
        <ToggleButton
          active={view === "chart"}
          onClick={() => setView("chart")}
        >
          Chart
        </ToggleButton>
        <span className="ml-auto text-xs text-muted-foreground">
          {history.length} cycle{history.length !== 1 ? "s" : ""}
        </span>
      </div>

      {view === "table" ? (
        <HistoryTable history={history} />
      ) : (
        <HistoryChart history={history} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle button
// ---------------------------------------------------------------------------

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-0.5 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/20 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Virtual Table
// ---------------------------------------------------------------------------

function HistoryTable({ history }: { history: StrategyHistoryPoint[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  // Show newest first
  const reversed = useMemo(() => [...history].reverse(), [history]);

  const virtualizer = useVirtualizer({
    count: reversed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div className="rounded border border-border">
      {/* Fixed header */}
      <div
        className="flex border-b border-border bg-card text-xs font-medium text-muted-foreground"
        style={{ height: ROW_HEIGHT }}
      >
        <HeaderCell width={COL_WIDTHS.cycle}>Cycle</HeaderCell>
        <HeaderCell width={COL_WIDTHS.time}>Time</HeaderCell>
        <HeaderCell width={COL_WIDTHS.sharpe}>Sharpe</HeaderCell>
        <HeaderCell width={COL_WIDTHS.maxDD}>Max DD</HeaderCell>
        <HeaderCell width={COL_WIDTHS.trades}>Trades</HeaderCell>
        <HeaderCell width={COL_WIDTHS.pnl}>PnL</HeaderCell>
        <HeaderCell width={COL_WIDTHS.returnPct}>Return%</HeaderCell>
        <HeaderCell width={COL_WIDTHS.consistency}>Consistency</HeaderCell>
        <HeaderCell width={COL_WIDTHS.decision}>Decision</HeaderCell>
      </div>

      {/* Scrollable body */}
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
            const point = reversed[vRow.index]!;
            return (
              <div
                key={vRow.key}
                className="absolute left-0 flex w-full border-b border-border/50 text-xs hover:bg-muted/40"
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
              >
                <DataCell width={COL_WIDTHS.cycle} mono>
                  {String(point.cycle)}
                </DataCell>
                <DataCell width={COL_WIDTHS.time} className="text-muted-foreground">
                  {new Date(point.ts).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </DataCell>
                <DataCell
                  width={COL_WIDTHS.sharpe}
                  mono
                  className={point.sharpe >= 1 ? "text-[#3fb950]" : point.sharpe < 0 ? "text-[#f85149]" : ""}
                >
                  {point.sharpe.toFixed(3)}
                </DataCell>
                <DataCell
                  width={COL_WIDTHS.maxDD}
                  mono
                  className={point.maxDrawdown > 0.1 ? "text-[#f85149]" : ""}
                >
                  {(point.maxDrawdown * 100).toFixed(2)}%
                </DataCell>
                <DataCell width={COL_WIDTHS.trades} mono>
                  {point.tradeCount}
                </DataCell>
                <DataCell width={COL_WIDTHS.pnl} mono>
                  {point.totalPnl != null
                    ? `$${point.totalPnl.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"}
                </DataCell>
                <DataCell width={COL_WIDTHS.returnPct} mono>
                  {point.returnPct != null
                    ? `${point.returnPct.toFixed(2)}%`
                    : "—"}
                </DataCell>
                <DataCell width={COL_WIDTHS.consistency} mono>
                  {point.consistency != null
                    ? point.consistency.toFixed(3)
                    : "—"}
                </DataCell>
                <DataCell width={COL_WIDTHS.decision}>
                  {point.decision ? (
                    <span
                      className={
                        point.decision.toUpperCase() === "PROMOTE"
                          ? "text-[#3fb950]"
                          : point.decision.toUpperCase() === "REJECT"
                            ? "text-[#f85149]"
                            : ""
                      }
                    >
                      {point.decision.toUpperCase()}
                    </span>
                  ) : (
                    "—"
                  )}
                </DataCell>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeaderCell({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 items-center px-2"
      style={{ width, minWidth: width }}
    >
      {children}
    </div>
  );
}

function DataCell({
  width,
  mono,
  className,
  children,
}: {
  width: number;
  mono?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center overflow-hidden text-ellipsis whitespace-nowrap px-2 ${mono ? "font-mono" : ""} ${className ?? ""}`}
      style={{ width, minWidth: width, height: ROW_HEIGHT }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Monitoring Wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps chart rendering to measure performance and warn if render exceeds 100ms.
 * Uses React ref callback to measure actual DOM render time.
 */
function ChartRenderMonitor({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Use ResizeObserver + performance API to detect when chart finishes rendering
    const observer = new ResizeObserver(() => {
      const measurement = performance
        .getEntriesByType("measure")
        .filter((m) => m.name === "chart-render")
        .at(-1);

      if (measurement && measurement.duration > 100) {
        console.warn(
          `Chart render took ${measurement.duration.toFixed(2)}ms (exceeds 100ms threshold)`
        );
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        performance.mark("chart-render-start");
      }}
      onMouseLeave={() => {
        performance.mark("chart-render-end");
        try {
          performance.measure("chart-render", "chart-render-start", "chart-render-end");
        } catch {
          // Marks may not exist, ignore
        }
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart View
// ---------------------------------------------------------------------------

/** Compute min/max for each metric across history */
function computeRanges(history: StrategyHistoryPoint[]) {
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const key of ALL_METRICS) {
    let min = Infinity, max = -Infinity;
    for (const p of history) {
      const raw = getRawValue(p, key);
      if (raw == null) continue;
      if (raw < min) min = raw;
      if (raw > max) max = raw;
    }
    ranges[key] = { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
  }
  return ranges;
}

function getRawValue(p: StrategyHistoryPoint, key: string): number | null {
  switch (key) {
    case "sharpe": return p.sharpe;
    case "maxDrawdown": return Math.abs(p.maxDrawdown) * 100;
    case "consistency": return p.consistency ?? null;
    case "tradeCount": return p.tradeCount;
    case "totalPnl": return p.totalPnl ?? null;
    case "returnPct": return (p.returnPct ?? 0) * 100;
    default: return null;
  }
}

const METRIC_FORMATS: Record<string, (v: number) => string> = {
  sharpe: (v) => v.toFixed(3),
  maxDrawdown: (v) => `${v.toFixed(2)}%`,
  consistency: (v) => v.toFixed(3),
  tradeCount: (v) => v.toLocaleString(),
  totalPnl: (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  returnPct: (v) => `${v.toFixed(2)}%`,
};

function HistoryChart({ history }: { history: StrategyHistoryPoint[] }) {
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    () => new Set(DEFAULT_METRICS),
  );

  const ranges = useMemo(() => computeRanges(history), [history]);

  // Build chart data with normalized values (0-100) and raw values for tooltip
  const chartData = useMemo(() => {
    // Performance mark: start of chart data computation
    performance.mark("chart-data-compute-start");

    const result = history.map((p, i) => {
      const point: Record<string, unknown> = {
        index: i + 1,
        label: new Date(p.ts).toLocaleString(),
      };
      for (const key of ALL_METRICS) {
        const raw = getRawValue(p, key);
        const { min, max } = ranges[key]!;
        const span = max - min;
        // Normalize to 0-100 range for chart display
        point[key] = raw != null && span > 0 ? ((raw - min) / span) * 100 : raw != null ? 50 : null;
        // Store raw value for tooltip
        point[`_raw_${key}`] = raw;
      }
      return point;
    });

    // Performance mark: end of chart data computation
    performance.mark("chart-data-compute-end");
    performance.measure(
      "chart-data-compute",
      "chart-data-compute-start",
      "chart-data-compute-end"
    );

    const measure = performance.getEntriesByName("chart-data-compute").at(-1);
    if (measure && measure.duration > 100) {
      console.warn(
        `Chart data computation took ${measure.duration.toFixed(2)}ms (exceeds 100ms threshold)`
      );
    }

    return result;
  }, [history, ranges]);

  function toggleMetric(key: string) {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      {/* Metric pill toggles */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ALL_METRICS.map((key) => {
          const active = activeMetrics.has(key);
          const color = METRIC_COLORS[key]!;
          const { min, max } = ranges[key]!;
          const fmt = METRIC_FORMATS[key]!;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleMetric(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "border-transparent text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={
                active
                  ? { backgroundColor: color + "30", borderColor: color }
                  : undefined
              }
              title={`Range: ${fmt(min)} — ${fmt(max)}`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {METRIC_LABELS[key]}
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-[11px] text-muted-foreground">
        Normalized view — each metric scaled to its own min/max range. Hover for real values.
      </p>

      {/* Chart */}
      <div className="rounded border border-border bg-card p-3">
        <ChartRenderMonitor>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#30363d"
                vertical={false}
              />
              <XAxis
                dataKey="index"
                tick={{ fill: "#8b949e", fontSize: 11 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={{ stroke: "#30363d" }}
                label={{
                  value: "Cycle",
                  position: "insideBottomRight",
                  offset: -4,
                  fill: "#8b949e",
                  fontSize: 11,
                }}
              />
              <YAxis
                tick={{ fill: "#8b949e", fontSize: 11 }}
                axisLine={{ stroke: "#30363d" }}
                tickLine={{ stroke: "#30363d" }}
                domain={[0, 100]}
                tickFormatter={() => ""}
              />
              <Tooltip
                content={<ChartTooltip activeMetrics={activeMetrics} ranges={ranges} />}
              />
              {ALL_METRICS.filter((k) => activeMetrics.has(k)).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={METRIC_LABELS[key]}
                  stroke={METRIC_COLORS[key]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartRenderMonitor>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
  activeMetrics,
  ranges,
}: {
  active?: boolean;
  payload?: {
    payload: Record<string, unknown>;
    dataKey: string;
    name: string;
    color: string;
    value: number;
  }[];
  label?: number;
  activeMetrics: Set<string>;
  ranges: Record<string, { min: number; max: number }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">Cycle {label}</p>
      <p className="mb-2 text-muted-foreground">{d.label as string}</p>
      {payload.map((p) => {
        const rawKey = `_raw_${p.dataKey}`;
        const raw = d[rawKey] as number | null;
        const fmt = METRIC_FORMATS[p.dataKey];
        return (
          <p key={p.name}>
            <span style={{ color: p.color }}>{p.name}:</span>{" "}
            <span className="font-mono">
              {raw != null && fmt ? fmt(raw) : "—"}
            </span>
          </p>
        );
      })}
    </div>
  );
}
