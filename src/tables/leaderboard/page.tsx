import { useMemo, useState } from "react";
import { useLeaderboard } from "@/lib/api/queries.ts";
import type { LeaderboardStrategy } from "@/lib/api/schemas.ts";
import type { TableConfig } from "@/components/data-table/types";
import { DataTable } from "@/components/data-table/data-table";
import { StrategyDetailPanel } from "@/components/strategy-detail-panel";
import { leaderboardColumns } from "./columns";
import { buildLeaderboardFilters } from "./filters";

export default function LeaderboardPage() {
  const { data, isLoading, isError, error } = useLeaderboard();
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const strategies = data?.strategies ?? [];

  const filterFields = useMemo(
    () => buildLeaderboardFilters(strategies),
    [strategies],
  );

  const config: TableConfig<LeaderboardStrategy> = useMemo(
    () => ({
      columns: leaderboardColumns,
      filterFields,
      defaultSort: { id: "sharpe", desc: true },
    }),
    [filterFields],
  );

  function strategyKey(row: LeaderboardStrategy) {
    return `${row.name}:${row.hash}`;
  }

  function handleRowClick(row: LeaderboardStrategy) {
    setExpandedStrategy((prev) => (prev === strategyKey(row) ? null : strategyKey(row)));
  }

  function renderExpandedRow(row: LeaderboardStrategy) {
    if (strategyKey(row) !== expandedStrategy) return null;
    return <StrategyDetailPanel strategy={row} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Strategy Leaderboard
        </h1>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading leaderboard data...
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Strategy Leaderboard
        </h1>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-destructive">
              Failed to load leaderboard data.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Strategy Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {strategies.length} strategies ranked by performance
          </p>
        </div>
      </div>

      <DataTable
        config={config}
        data={strategies}
        onRowClick={handleRowClick}
        renderExpandedRow={renderExpandedRow}
      />

    </div>
  );
}
