import { useState } from "react";
import { useProbeTraces, useSwarmStatus, useRegime } from "@/lib/api/queries.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { WidgetErrorBoundary } from "@/components/widget-error-boundary";

// ---------------------------------------------------------------------------
// Types (mirroring probe-types.ts on the trader side)
// ---------------------------------------------------------------------------

interface AgentReasoningTrace {
  agentId: string;
  status: "success" | "timeout" | "rejected" | "failed";
  latencyMs: number;
  reasoning: Record<string, unknown>;
}

interface ProbeTrace {
  epoch: number;
  timestamp: number;
  agentTraces: AgentReasoningTrace[];
  inputSnapshot: {
    featureSymbols: string[];
    portfolioEquity: number;
    strategyCount: number;
  };
  epochLatencyMs: number;
  degraded?: boolean;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: AgentReasoningTrace["status"] }) {
  const map: Record<AgentReasoningTrace["status"], string> = {
    success: "bg-green-500/20 text-green-400 border-green-500/30",
    timeout: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    failed: "bg-destructive/20 text-destructive border-destructive/30",
  };
  return (
    <Badge className={map[status] ?? ""} variant="outline">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Trace list item
// ---------------------------------------------------------------------------

function TraceListItem({
  trace,
  selected,
  onClick,
}: {
  trace: ProbeTrace;
  selected: boolean;
  onClick: () => void;
}) {
  const ts = new Date(trace.timestamp).toLocaleTimeString();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent ${
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold">#{trace.epoch}</span>
        <span className="text-xs text-muted-foreground">{ts}</span>
        {trace.degraded && (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30" variant="outline">
            degraded
          </Badge>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        {trace.agentTraces.map((at) => (
          <StatusBadge key={at.agentId} status={at.status} />
        ))}
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {trace.epochLatencyMs}ms
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Trace detail panel
// ---------------------------------------------------------------------------

function TraceDetail({ trace }: { trace: ProbeTrace }) {
  const ts = new Date(trace.timestamp).toLocaleString();

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono font-bold text-lg">Epoch #{trace.epoch}</span>
          {trace.degraded && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30" variant="outline">
              DEGRADED
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">{ts}</span>
          <span className="ml-auto font-mono text-sm text-muted-foreground">
            {trace.epochLatencyMs}ms total
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Equity: </span>
            <span className="font-mono">
              ${trace.inputSnapshot.portfolioEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Strategies: </span>
            <span className="font-mono">{trace.inputSnapshot.strategyCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Symbols: </span>
            <span className="font-mono">{trace.inputSnapshot.featureSymbols.length}</span>
          </div>
        </div>
      </div>

      {/* Per-agent traces */}
      {trace.agentTraces.map((at) => (
        <AgentTraceCard key={at.agentId} agentTrace={at} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent trace card with expandable reasoning JSON
// ---------------------------------------------------------------------------

function AgentTraceCard({ agentTrace }: { agentTrace: AgentReasoningTrace }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasoning =
    agentTrace.reasoning && Object.keys(agentTrace.reasoning).length > 0;

  return (
    <div className="rounded-md border border-border bg-card/50">
      <button
        type="button"
        onClick={() => hasReasoning && setExpanded((e) => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
          hasReasoning ? "cursor-pointer hover:bg-accent/50" : "cursor-default"
        }`}
      >
        <span className="font-mono font-semibold w-20 text-left">{agentTrace.agentId}</span>
        <StatusBadge status={agentTrace.status} />
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          {agentTrace.latencyMs}ms
        </span>
        {hasReasoning && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {expanded && hasReasoning && (
        <div className="border-t border-border px-4 py-3">
          <pre className="text-xs text-muted-foreground overflow-auto max-h-96 font-mono leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(agentTrace.reasoning, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// System status banner
// ---------------------------------------------------------------------------

function StatusCard({ label, value, detail, ok }: { label: string; value: string; detail: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function SystemStatusBanner() {
  const { data: swarm } = useSwarmStatus();
  const { data: regime } = useRegime();

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <StatusCard
        label="Swarm"
        value={swarm?.enabled ? 'Active' : 'Disabled'}
        detail={swarm ? `${swarm.workerPool?.activeWorkers ?? 0}/${swarm.workerPool?.maxWorkers ?? 0} workers` : '\u2014'}
        ok={swarm?.enabled ?? false}
      />
      <StatusCard
        label="Strategies"
        value={String(swarm?.strategies?.total ?? '\u2014')}
        detail={swarm?.strategies?.byStage ? `${swarm.strategies.byStage.research}R ${swarm.strategies.byStage.paper}P ${swarm.strategies.byStage.live}L` : ''}
        ok={true}
      />
      <StatusCard
        label="Market Regime"
        value={regime?.macro?.quad ?? regime?.regime?.regime ?? 'Unknown'}
        detail={regime?.confidence != null ? `${(regime.confidence * 100).toFixed(0)}% confidence` : '\u2014'}
        ok={true}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InspectorPage() {
  const { data, isLoading, isError } = useProbeTraces(40);
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);

  if (isLoading || isError || !data) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <h1 className="text-lg font-semibold mb-4">Diagnostics</h1>
        <WidgetErrorBoundary>
          <SystemStatusBanner />
        </WidgetErrorBoundary>
        <div className="flex items-center justify-center py-12">
          <p className={`text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {isError ? 'Failed to load probe traces. Is the probe channel enabled?' : 'Loading probe traces...'}
          </p>
        </div>
      </div>
    );
  }

  const traces = data.traces as unknown as ProbeTrace[];

  if (traces.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No probe traces recorded yet.</p>
      </div>
    );
  }

  // Most recent first
  const sorted = [...traces].sort((a, b) => b.epoch - a.epoch);
  const selected = sorted.find((t) => t.epoch === selectedEpoch) ?? sorted[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h1 className="text-lg font-semibold mb-4">Diagnostics</h1>
      <WidgetErrorBoundary>
        <SystemStatusBanner />
      </WidgetErrorBoundary>
      <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Left: trace list */}
      <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
        <p className="px-1 pb-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {traces.length} traces
        </p>
        {sorted.map((trace) => (
          <TraceListItem
            key={trace.epoch}
            trace={trace}
            selected={trace.epoch === (selectedEpoch ?? sorted[0]?.epoch)}
            onClick={() => setSelectedEpoch(trace.epoch)}
          />
        ))}
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <TraceDetail trace={selected} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a trace to inspect.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
