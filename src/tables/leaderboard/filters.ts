import type { FilterField } from "@/components/data-table/types";
import type { LeaderboardStrategy } from "@/lib/api/schemas.ts";

// ---------------------------------------------------------------------------
// Build dynamic filter fields from the actual data set
// ---------------------------------------------------------------------------

export function buildLeaderboardFilters(
  data: LeaderboardStrategy[],
): FilterField<LeaderboardStrategy>[] {
  // Count occurrences for faceted filters
  const mutationCounts = new Map<string, number>();
  const symbolCounts = new Map<string, number>();

  for (const row of data) {
    mutationCounts.set(row.mutationType, (mutationCounts.get(row.mutationType) ?? 0) + 1);
    if (row.bestSymbol) {
      symbolCounts.set(row.bestSymbol, (symbolCounts.get(row.bestSymbol) ?? 0) + 1);
    }
  }

  return [
    {
      id: "mutationType",
      label: "Mutation Type",
      type: "enum",
      options: Array.from(mutationCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([value, count]) => ({
          label: value.charAt(0).toUpperCase() + value.slice(1),
          value,
          count,
        })),
    },
    {
      id: "bestSymbol",
      label: "Symbol",
      type: "enum",
      options: Array.from(symbolCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([value, count]) => ({
          label: value,
          value,
          count,
        })),
    },
  ];
}
