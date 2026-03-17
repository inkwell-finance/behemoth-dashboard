import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useSharpeHistory, useLlmStats } from "@/lib/api/queries.ts";

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function LlmStatsCard() {
  const { data, isLoading } = useLlmStats();

  if (isLoading || !data) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        LLM Mutation Engine
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Requests" value={data.requests} />
        <StatCard
          label="Success Rate"
          value={data.successRate ? `${data.successRate}%` : "—"}
          className="text-success"
        />
        <StatCard
          label="Successes"
          value={data.successes}
          className="text-success"
        />
        <StatCard
          label="Failures"
          value={data.failures}
          className="text-destructive"
        />
      </div>
      {(data.provider || data.model || data.totalCostUSD != null) && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.provider && (
            <StatCard label="Provider" value={data.provider} />
          )}
          {data.model && <StatCard label="Model" value={data.model} />}
          {data.totalCostUSD != null && (
            <StatCard
              label="Total Cost"
              value={`$${data.totalCostUSD.toFixed(2)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

const STRATEGY_COLORS = [
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#6366f1",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: Record<string, unknown>; name: string; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">Cycle {label}</p>
      <p className="text-muted-foreground">{d.label as string}</p>
      <div className="mt-2 flex flex-col gap-1">
        <p>
          <span className="text-success">Best Sharpe:</span>{" "}
          {d.bestSharpe != null
            ? (d.bestSharpe as number).toFixed(3)
            : "—"}
        </p>
        <p>
          <span className="text-primary">Avg Sharpe:</span>{" "}
          {d.avgSharpe != null
            ? (d.avgSharpe as number).toFixed(3)
            : "—"}
        </p>
        <p>
          <span className="text-success">Promoted:</span>{" "}
          {d.promoted as number}
        </p>
        <p>
          <span className="text-destructive">Rejected:</span>{" "}
          {d.rejected as number}
        </p>
        {payload
          .filter(
            (p) => p.name !== "Best Sharpe" && p.name !== "Avg Sharpe",
          )
          .map((p) => (
            <p key={p.name}>
              <span style={{ color: p.color }}>{p.name}:</span>{" "}
              {(d[p.name] as number | undefined)?.toFixed(3) ?? "—"}
            </p>
          ))}
      </div>
    </div>
  );
}

export default function SharpePage() {
  const { data, isLoading, isError } = useSharpeHistory();
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(
    new Set(),
  );

  const allStrategies = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    data.history.forEach((e) =>
      e.strategies.forEach((s) => names.add(s.name)),
    );
    return Array.from(names).sort();
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.history.map((entry, i) => {
      const point: Record<string, unknown> = {
        index: i + 1,
        label: new Date(entry.ts).toLocaleString(),
        bestSharpe: entry.bestSharpe,
        avgSharpe: entry.avgSharpe,
        promoted: entry.promoted,
        rejected: entry.rejected,
      };
      for (const s of entry.strategies) {
        if (selectedStrategies.has(s.name)) {
          point[s.name] = s.sharpe;
        }
      }
      return point;
    });
  }, [data, selectedStrategies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">
          Loading Sharpe history...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-destructive">
          Failed to load Sharpe history.
        </p>
      </div>
    );
  }

  function toggleStrategy(name: string) {
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedStrategies(new Set(allStrategies));
  }

  function selectNone() {
    setSelectedStrategies(new Set());
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Evolution
        </h2>
        <p className="text-sm text-muted-foreground">
          Strategy evolution metrics and Sharpe ratio trends
        </p>
      </div>

      <LlmStatsCard />

      {allStrategies.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              Per-strategy lines
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              All
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              None
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allStrategies.map((name, idx) => {
              const color =
                STRATEGY_COLORS[idx % STRATEGY_COLORS.length]!;
              const active = selectedStrategies.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleStrategy(name)}
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
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#30363d"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              tick={{ fill: "#8b949e", fontSize: 12 }}
              axisLine={{ stroke: "#30363d" }}
              tickLine={{ stroke: "#30363d" }}
              label={{
                value: "Cycle",
                position: "insideBottomRight",
                offset: -4,
                fill: "#8b949e",
                fontSize: 12,
              }}
            />
            <YAxis
              tick={{ fill: "#8b949e", fontSize: 12 }}
              axisLine={{ stroke: "#30363d" }}
              tickLine={{ stroke: "#30363d" }}
              label={{
                value: "Sharpe",
                angle: -90,
                position: "insideLeft",
                fill: "#8b949e",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: "#8b949e", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="bestSharpe"
              name="Best Sharpe"
              stroke="#3fb950"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="avgSharpe"
              name="Avg Sharpe"
              stroke="#58a6ff"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {allStrategies
              .filter((name) => selectedStrategies.has(name))
              .map((name, idx) => {
                const globalIdx = allStrategies.indexOf(name);
                const color =
                  STRATEGY_COLORS[globalIdx % STRATEGY_COLORS.length]!;
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={name}
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    strokeDasharray="4 2"
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
