import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { SwarmPauseButton } from "./swarm-pause-button";

function useTraderHealth() {
  return useQuery({
    queryKey: ["trader-health"],
    queryFn: async () => {
      const res = await fetch("/api/trader/health");
      if (!res.ok) throw new Error("unhealthy");
      return true;
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: false,
  });
}

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const health = useTraderHealth();

  return (
    <header className="flex h-14 items-center border-b border-border bg-card px-6">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <SwarmPauseButton />

        <Link
          to="/diagnostics"
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
        >
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              health.isError
                ? "bg-destructive"
                : health.isSuccess
                  ? "bg-success"
                  : "bg-warning",
            )}
          />
          <span className="text-xs text-muted-foreground">
            {health.isError
              ? "Disconnected"
              : health.isSuccess
                ? "Connected"
                : "Connecting..."}
          </span>
        </Link>
      </div>
    </header>
  );
}
