import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Filter field types
// ---------------------------------------------------------------------------

export type FilterType = "enum" | "number" | "date";

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterField<TData> {
  /** Column id (must match a column in the table) */
  id: keyof TData & string;
  /** Human-readable label */
  label: string;
  /** Filter type determines the UI control */
  type: FilterType;
  /** Available options for enum filters */
  options?: FilterOption[];
  /** Min/max for number filters */
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------
// Table config — everything a table page needs to declare
// ---------------------------------------------------------------------------

export interface TableConfig<TData> {
  columns: ColumnDef<TData, unknown>[];
  filterFields: FilterField<TData>[];
  defaultSort?: { id: string; desc: boolean };
  /** Render function for the detail sheet when a row is clicked */
  renderDetail?: (row: TData) => ReactNode;
}
