import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { COORDINATOR_ENDPOINTS } from "@/lib/api/endpoints";

interface SwarmStatusResponse {
  paused: boolean;
}

async function fetchSwarmStatus(): Promise<SwarmStatusResponse> {
  const res = await fetch(COORDINATOR_ENDPOINTS.SWARM_STATUS);
  if (!res.ok) throw new Error(`swarm status ${res.status}`);
  return res.json() as Promise<SwarmStatusResponse>;
}

export function SwarmPauseButton() {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'pausing' | 'resuming' | false>(false);

  const { data, isError } = useQuery({
    queryKey: ["swarm-status"],
    queryFn: fetchSwarmStatus,
    staleTime: 5_000,
    refetchInterval: 5_000,
    retry: false,
  });

  const paused = data?.paused ?? false;

  async function handleClick() {
    const endpoint = paused
      ? COORDINATOR_ENDPOINTS.SWARM_RESUME
      : COORDINATOR_ENDPOINTS.SWARM_PAUSE;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      // Optimistically update cached state
      queryClient.setQueryData<SwarmStatusResponse>(["swarm-status"], {
        paused: !paused,
      });

      // Show brief confirmation flash with correct direction
      setConfirming(paused ? 'resuming' : 'pausing');
      setTimeout(() => setConfirming(false), 1500);

      // Re-fetch to sync with actual coordinator state
      void queryClient.invalidateQueries({ queryKey: ["swarm-status"] });
    } catch {
      // Silently fail — the next poll will correct state
    }
  }

  // Don't render if coordinator is unreachable
  if (isError && !data) return null;

  const label = confirming
    ? confirming === 'pausing'
      ? "Pausing…"
      : "Resuming…"
    : paused
      ? "Resume Research"
      : "Pause Research";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-xs",
        paused && "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300",
      )}
      title={paused ? "Researcher agents are paused" : "Researcher agents are running"}
    >
      <span className="text-[10px] leading-none" aria-hidden>
        {paused ? "▶" : "⏸"}
      </span>
      {label}
    </Button>
  );
}
