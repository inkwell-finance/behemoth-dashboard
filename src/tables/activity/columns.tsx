import type { ColumnDef } from "@tanstack/react-table";

export interface ActivityCandidate {
  name: string;
  skillHash?: string;
  parentHash?: string | null;
  mutationType?: string;
  mutationDescription?: string;
  decision?: string;
  reason?: string;
  objectives?: {
    sharpe?: number;
    maxDrawdown?: number;
    consistency?: number;
    tradeCount?: number;
    totalPnl?: number;
    returnPct?: number;
    bestSymbol?: string;
    bestTimeframe?: string;
  };
  rlGradient?: string;
  mutationClass?: string;
  classificationReason?: string;
}

export interface ActivityRow {
  cycleId: number;
  candidates: number;
  promoted: number;
  rejected: number;
  bestSharpe: number | null;
  mutationTypes: string;
  duration: string;
  ts: number;
  rawCandidates: ActivityCandidate[];
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  const secs = ms / 1_000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const rem = Math.round(secs % 60);
  return `${mins}m ${rem}s`;
}

export function buildActivityRows(
  cycles: {
    cycleId: number;
    ts: number;
    generated: number;
    accepted: number;
    rejected: number;
    promoted?: string[] | number;
    duration: number;
    candidates: {
      name: string;
      skillHash?: string;
      parentHash?: string | null;
      mutationType?: string;
      mutationDescription?: string;
      decision?: string;
      reason?: string;
      objectives?: {
        sharpe?: number;
        maxDrawdown?: number;
        consistency?: number;
        tradeCount?: number;
        totalPnl?: number;
        returnPct?: number;
        bestSymbol?: string;
        bestTimeframe?: string;
      };
      rlGradient?: string;
      mutationClass?: string;
      classificationReason?: string;
    }[];
  }[],
): ActivityRow[] {
  return cycles.map((c) => {
    const promotedCount =
      typeof c.promoted === "number"
        ? c.promoted
        : Array.isArray(c.promoted)
          ? c.promoted.length
          : c.accepted;

    const sharpes = c.candidates
      .map((cand) => cand.objectives?.sharpe)
      .filter((s): s is number => s != null);

    const bestSharpe = sharpes.length > 0 ? Math.max(...sharpes) : null;

    const mutationSet = new Set(
      c.candidates
        .map((cand) => cand.mutationType)
        .filter((m): m is string => !!m),
    );

    return {
      cycleId: c.cycleId,
      candidates: c.generated,
      promoted: promotedCount,
      rejected: c.rejected,
      bestSharpe,
      mutationTypes: [...mutationSet].join(", ") || "\u2014",
      duration: formatDuration(c.duration),
      ts: c.ts,
      rawCandidates: c.candidates as ActivityCandidate[],
    };
  });
}

export function getActivityColumns(
  expandedCycleId: number | null,
): ColumnDef<ActivityRow, unknown>[] {
  return [
    {
      accessorKey: "cycleId",
      header: "Cycle",
      cell: ({ getValue }) => {
        const id = getValue<number>();
        const isExpanded = expandedCycleId === id;
        return (
          <span className="font-mono text-muted-foreground">
            <span
              className="mr-1.5 inline-block transition-transform duration-150"
              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              {"\u25B6"}
            </span>
            #{id}
          </span>
        );
      },
    },
    {
      accessorKey: "candidates",
      header: "Candidates",
      cell: ({ getValue }) => getValue<number>(),
    },
    {
      accessorKey: "promoted",
      header: "Promoted",
      cell: ({ getValue }) => (
        <span className="text-success font-semibold">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: "rejected",
      header: "Rejected",
      cell: ({ getValue }) => (
        <span className="text-destructive font-semibold">
          {getValue<number>()}
        </span>
      ),
    },
    {
      accessorKey: "bestSharpe",
      header: "Best Sharpe",
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return v != null ? v.toFixed(3) : "\u2014";
      },
    },
    {
      accessorKey: "mutationTypes",
      header: "Mutation Types",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
  ];
}
