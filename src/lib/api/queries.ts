import { useQuery } from '@tanstack/react-query';
import { fetchTrader } from './client.ts';
import { z } from 'zod';
import {
  LeaderboardResponseSchema,
  ActivityResponseSchema,
  LineageResponseSchema,
  SharpeHistoryResponseSchema,
  BacktestDetailSchema,
  LlmStatsSchema,
  ResearchResponseSchema,
  StrategyHistoryResponseSchema,
  type LeaderboardResponse,
  type ActivityResponse,
  type LineageResponse,
  type SharpeHistoryResponse,
  type BacktestDetail,
  type LlmStats,
  type ResearchResponse,
  type StrategyHistoryResponse,
  SwarmStatusSchema,
  RegimeSchema,
  type SwarmStatus,
  type Regime,
} from './schemas.ts';

export function useLeaderboard() {
  return useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard'],
    queryFn: () => fetchTrader('/swarm/leaderboard', LeaderboardResponseSchema),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useActivity() {
  return useQuery<ActivityResponse>({
    queryKey: ['activity'],
    queryFn: () => fetchTrader('/swarm/activity', ActivityResponseSchema),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

export function useLineage() {
  return useQuery<LineageResponse>({
    queryKey: ['lineage'],
    queryFn: () => fetchTrader('/swarm/lineage', LineageResponseSchema),
    staleTime: 30_000,
  });
}

export function useSharpeHistory() {
  return useQuery<SharpeHistoryResponse>({
    queryKey: ['sharpe-history'],
    queryFn: () =>
      fetchTrader('/swarm/sharpe-history', SharpeHistoryResponseSchema),
    staleTime: 30_000,
  });
}

export function useBacktestDetail(hash: string) {
  return useQuery<BacktestDetail>({
    queryKey: ['backtest-detail', hash],
    queryFn: () =>
      fetchTrader(`/swarm/backtest-detail?hash=${encodeURIComponent(hash)}`, BacktestDetailSchema),
    enabled: !!hash,
  });
}

export function useLlmStats() {
  return useQuery<LlmStats>({
    queryKey: ['llm-stats'],
    queryFn: () => fetchTrader('/swarm/llm-stats', LlmStatsSchema),
    staleTime: 10_000,
  });
}

export function useResearch() {
  return useQuery<ResearchResponse>({
    queryKey: ['research'],
    queryFn: () => fetchTrader('/swarm/research', ResearchResponseSchema),
    staleTime: 30_000,
  });
}

export function useStrategyHistory(name: string) {
  return useQuery<StrategyHistoryResponse>({
    queryKey: ['strategy-history', name],
    queryFn: () => fetchTrader(`/swarm/strategy-history?name=${encodeURIComponent(name)}`, StrategyHistoryResponseSchema),
    enabled: !!name,
    staleTime: 30_000,
  });
}

export function useSwarmStatus() {
  return useQuery<SwarmStatus>({
    queryKey: ['swarm-status'],
    queryFn: () => fetchTrader('/swarm', SwarmStatusSchema),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useRegime() {
  return useQuery<Regime>({
    queryKey: ['regime'],
    queryFn: () => fetchTrader('/regime', RegimeSchema),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Probe inspector hooks
// ---------------------------------------------------------------------------

const ProbeTracesResponseSchema = z.object({
  traces: z.array(z.record(z.unknown())),
  total: z.number(),
});

const ProbeLatestSchema = z.record(z.unknown());

export type ProbeTracesResponse = z.infer<typeof ProbeTracesResponseSchema>;

export function useProbeTraces(limit = 20) {
  return useQuery<ProbeTracesResponse>({
    queryKey: ['probe-traces', limit],
    queryFn: () => fetchTrader(`/probe/traces?limit=${limit}`, ProbeTracesResponseSchema),
    refetchInterval: 5_000,
    staleTime: 5_000,
  });
}

export function useProbeLatest() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['probe-latest'],
    queryFn: () => fetchTrader('/probe/traces/latest', ProbeLatestSchema),
    refetchInterval: 5_000,
    staleTime: 5_000,
  });
}
