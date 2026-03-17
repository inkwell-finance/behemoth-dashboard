import { useEffect, useState } from "react";
import type { Table } from "@tanstack/react-table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { FilterField } from "./types";

interface DataTableFilterCommandProps<TData> {
  table: Table<TData>;
  filterFields: FilterField<TData>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataTableFilterCommand<TData>({
  table,
  filterFields,
  open,
  onOpenChange,
}: DataTableFilterCommandProps<TData>) {
  const [search, setSearch] = useState("");

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const enumFields = filterFields.filter(
    (f) => f.type === "enum" && f.options && f.options.length > 0,
  );

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Command palette */}
      <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-popover shadow-lg">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Filter by..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No filters found.</CommandEmpty>
            {enumFields.map((field, index) => (
              <div key={field.id}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={field.label}>
                  {field.options!.map((option) => (
                    <CommandItem
                      key={`${field.id}-${option.value}`}
                      value={`${field.label} ${option.label}`}
                      onSelect={() => toggleFilter(field.id, option.value)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded border border-primary ${
                            isSelected(field.id, option.value)
                              ? "bg-primary"
                              : "bg-transparent"
                          }`}
                        />
                        <span>{option.label}</span>
                        {option.count !== undefined && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {option.count}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}

            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  table.resetColumnFilters();
                  onOpenChange(false);
                }}
              >
                Clear all filters
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
