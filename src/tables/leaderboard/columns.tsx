import { type ColumnDef } from "@tanstack/react-table";
import type { LeaderboardStrategy } from "@/lib/api/schemas.ts";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pnlColor(value: number) {
  return value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-muted-foreground";
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

// ---------------------------------------------------------------------------
// Custom array filter for faceted enum columns
// ---------------------------------------------------------------------------

function arrIncludesFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: string[],
): boolean {
  if (!filterValue || filterValue.length === 0) return true;
  const value = row.getValue(columnId) as string;
  return filterValue.includes(value);
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const leaderboardColumns: ColumnDef<LeaderboardStrategy, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.original.name;
      const hash = row.original.hash;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="truncate font-medium">{name}</span>
              <Badge variant="outline" className="shrink-0 font-mono text-[10px] px-1.5 py-0">
                {hash.slice(0, 7)}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
            <p className="font-mono text-xs text-muted-foreground">{hash}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "sharpe",
    header: "Sharpe",
    cell: ({ row }) => {
      const value = row.original.sharpe;
      return (
        <span className={cn("tabular-nums", sharpeColor(value))}>
          {value.toFixed(2)}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "maxDrawdown",
    header: "Max DD",
    cell: ({ row }) => {
      const value = row.original.maxDrawdown;
      return (
        <span className="tabular-nums text-red-400">
          {(value * 100).toFixed(1)}%
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "trades",
    header: "Trades",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.trades}</span>
    ),
    enableSorting: true,
  },
  {
    id: "winRate",
    header: "Win Rate",
    accessorKey: "winRate",
    cell: ({ row }) => {
      const val = row.getValue("winRate") as number;
      if (!val) return <span className="tabular-nums text-muted-foreground">--</span>;
      return <span className="tabular-nums">{(val * 100).toFixed(1)}%</span>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "totalPnl",
    header: "Total PnL",
    cell: ({ row }) => {
      const value = row.original.totalPnl;
      return (
        <span className={cn("tabular-nums", pnlColor(value))}>
          {value >= 0 ? "+" : ""}
          ${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "returnPct",
    header: "Return %",
    cell: ({ row }) => {
      const value = row.original.returnPct;
      return (
        <span className={cn("tabular-nums", pnlColor(value))}>
          {value >= 0 ? "+" : ""}
          {(value * 100).toFixed(2)}%
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "generation",
    header: "Gen",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.generation}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "mutationType",
    header: "Mutation",
    cell: ({ row }) => {
      const mt = row.original.mutationType;
      const colorClass = mutationColors[mt] ?? "bg-muted text-muted-foreground";
      return (
        <Badge variant="outline" className={cn("capitalize text-xs", colorClass)}>
          {mt}
        </Badge>
      );
    },
    filterFn: arrIncludesFilter,
    enableSorting: true,
  },
  {
    accessorKey: "bestSymbol",
    header: "Symbol",
    cell: ({ row }) => {
      const symbol = row.original.bestSymbol;
      if (!symbol) return <span className="text-muted-foreground">--</span>;
      return (
        <Badge variant="outline" className="font-mono text-xs">
          {symbol}
        </Badge>
      );
    },
    filterFn: arrIncludesFilter,
    enableSorting: true,
  },
  {
    accessorKey: "bestTimeframe",
    header: "Timeframe",
    cell: ({ row }) => {
      const tf = row.original.bestTimeframe;
      if (!tf) return <span className="text-muted-foreground">--</span>;
      return <span className="font-mono text-xs">{tf}</span>;
    },
    enableSorting: true,
  },
];
