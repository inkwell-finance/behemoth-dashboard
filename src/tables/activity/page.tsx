import { useMemo, useState } from "react";
import { useActivity } from "@/lib/api/queries.ts";
import { DataTable } from "@/components/data-table/data-table.tsx";
import { getActivityColumns, buildActivityRows } from "./columns.tsx";
import type { ActivityRow, ActivityCandidate } from "./columns.tsx";
import type { TableConfig } from "@/components/data-table/types.ts";
import { Badge } from "@/components/ui/badge.tsx";

export default function ActivityPage() {
  const { data, isLoading, isError } = useActivity();
  const [expandedCycleId, setExpandedCycleId] = useState<number | null>(null);

  const columns = useMemo(
    () => getActivityColumns(expandedCycleId),
    [expandedCycleId],
  );

  const tableConfig: TableConfig<ActivityRow> = useMemo(
    () => ({
      columns,
      filterFields: [],
      defaultSort: { id: "cycleId", desc: true },
    }),
    [columns],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-destructive">Failed to load activity data.</p>
      </div>
    );
  }

  const rows = buildActivityRows(data.recentCycles);
  const avgDurationSec = (data.avgCycleDurationMs / 1_000).toFixed(1);

  const handleRowClick = (row: ActivityRow) => {
    setExpandedCycleId((prev) => (prev === row.cycleId ? null : row.cycleId));
  };

  const renderExpandedRow = (row: ActivityRow) => {
    if (row.cycleId !== expandedCycleId) return null;
    return <CycleDetail cycle={row} />;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Cycles" value={data.totalCycles} />
        <StatCard
          label="Total Promoted"
          value={data.totalPromoted}
          className="text-success"
        />
        <StatCard
          label="Total Rejected"
          value={data.totalRejected}
          className="text-destructive"
        />
        <StatCard label="Avg Duration" value={`${avgDurationSec}s`} />
      </div>

      {/* Data table */}
      <DataTable
        config={tableConfig}
        data={rows}
        onRowClick={handleRowClick}
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CycleDetail — expanded row content
// ---------------------------------------------------------------------------

function CycleDetail({ cycle }: { cycle: ActivityRow }) {
  const ts = cycle.ts
    ? new Date(cycle.ts).toLocaleString()
    : "Unknown";

  return (
    <div className="border-t border-border bg-muted/30 px-6 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">
          Cycle #{cycle.cycleId}
        </span>
        <span>{ts}</span>
        <span>{cycle.duration}</span>
        <span>
          {cycle.rawCandidates.length} candidate{cycle.rawCandidates.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Candidate cards */}
      {cycle.rawCandidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No candidate data available.</p>
      ) : (
        <div className="grid gap-3">
          {cycle.rawCandidates.map((cand, idx) => (
            <CandidateCard key={cand.skillHash ?? idx} candidate={cand} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CandidateCard
// ---------------------------------------------------------------------------

function CandidateCard({ candidate }: { candidate: ActivityCandidate }) {
  const cand = candidate;
  const isPromoted = cand.decision?.toUpperCase() === "PROMOTE";
  const obj = cand.objectives;

  return (
    <div className="rounded-md border border-border bg-card/50 p-4">
      {/* Row 1: name + hash + decision badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="truncate font-semibold">{cand.name}</span>
          {cand.skillHash && (
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {cand.skillHash}
            </span>
          )}
          {cand.parentHash && (
            <span className="shrink-0 text-xs text-muted-foreground">
              from {cand.parentHash}
            </span>
          )}
        </div>
        <DecisionBadge decision={cand.decision} />
      </div>

      {/* Row 2: mutation info */}
      {(cand.mutationType || cand.mutationDescription) && (
        <div className="mt-2 text-sm">
          {cand.mutationType && (
            <span className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {cand.mutationType}
            </span>
          )}
          {cand.mutationDescription && (
            <span className="text-muted-foreground">{cand.mutationDescription}</span>
          )}
        </div>
      )}

      {/* Row 3: metrics grid */}
      {obj && (
        <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-1 text-sm sm:grid-cols-4 md:grid-cols-6">
          <Metric label="Sharpe" value={obj.sharpe != null ? obj.sharpe.toFixed(3) : null} />
          <Metric
            label="Max DD"
            value={obj.maxDrawdown != null ? `${(obj.maxDrawdown * 100).toFixed(2)}%` : null}
          />
          <Metric label="Trades" value={obj.tradeCount != null ? obj.tradeCount.toLocaleString() : null} />
          <Metric
            label="PnL"
            value={obj.totalPnl != null ? `$${obj.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null}
          />
          <Metric
            label="Return"
            value={obj.returnPct != null ? `${obj.returnPct.toFixed(2)}%` : null}
          />
          <Metric
            label="Consistency"
            value={obj.consistency != null ? obj.consistency.toFixed(3) : null}
          />
          {obj.bestSymbol && <Metric label="Best Symbol" value={obj.bestSymbol} />}
          {obj.bestTimeframe && <Metric label="Timeframe" value={obj.bestTimeframe} />}
        </div>
      )}

      {/* Row 4: rejection reason */}
      {!isPromoted && cand.reason && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-destructive/80">Reason:</span> {cand.reason}
        </p>
      )}

      {/* Row 5: RL gradient + mutation class (subtle) */}
      {(cand.rlGradient || cand.mutationClass || cand.classificationReason) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {cand.rlGradient && <span>RL: {cand.rlGradient}</span>}
          {cand.mutationClass && <span>Class: {cand.mutationClass}</span>}
          {cand.classificationReason && <span>({cand.classificationReason})</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function DecisionBadge({ decision }: { decision?: string }) {
  if (!decision) return null;
  const upper = decision.toUpperCase();
  const isPromoted = upper === "PROMOTE";
  return (
    <Badge
      variant={isPromoted ? "default" : "destructive"}
      className={
        isPromoted
          ? "bg-success/20 text-success border-success/30"
          : "bg-destructive/20 text-destructive border-destructive/30"
      }
    >
      {upper}
    </Badge>
  );
}

function Metric({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

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
