import type { Table } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FilterField } from "./types";

interface DataTableFilterControlsProps<TData> {
  table: Table<TData>;
  filterFields: FilterField<TData>[];
  className?: string;
}

export function DataTableFilterControls<TData>({
  table,
  filterFields,
  className,
}: DataTableFilterControlsProps<TData>) {
  const enumFields = filterFields.filter(
    (f) => f.type === "enum" && f.options && f.options.length > 0,
  );

  if (enumFields.length === 0) return null;

  function toggleFilter(fieldId: string, value: string) {
    const column = table.getColumn(fieldId);
    if (!column) return;
    const current = (column.getFilterValue() as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    column.setFilterValue(next.length > 0 ? next : undefined);
  }

  function isSelected(fieldId: string, value: string): boolean {
    const column = table.getColumn(fieldId);
    if (!column) return false;
    const current = (column.getFilterValue() as string[] | undefined) ?? [];
    return current.includes(value);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {enumFields.map((field, index) => (
        <div key={field.id}>
          {index > 0 && <Separator className="mb-4" />}
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            {field.label}
          </h4>
          <div className="flex flex-col gap-1.5">
            {field.options!.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={isSelected(field.id, option.value)}
                  onCheckedChange={() => toggleFilter(field.id, option.value)}
                />
                <span className="flex-1">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {option.count}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
