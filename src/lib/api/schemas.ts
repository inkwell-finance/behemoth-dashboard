import { z } from 'zod';

// ---------------------------------------------------------------------------
// /swarm/leaderboard
// ---------------------------------------------------------------------------

export const LeaderboardStrategySchema = z.object({
  name: z.string(),
  hash: z.string(),
  code: z.string(),
  sharpe: z.number(),
  maxDrawdown: z.number(),
  trades: z.number(),
  parentHash: z.string().nullable(),
  mutationType: z.string(),
  mutationDesc: z.string(),
  generation: z.number(),
  bestSymbol: z.string().nullable(),
  bestTimeframe: z.string().nullable(),
  totalPnl: z.number(),
  returnPct: z.number(),
  winRate: z.number(),
});

export const LeaderboardResponseSchema = z.object({
  strategies: z.array(LeaderboardStrategySchema),
});

export type LeaderboardStrategy = z.infer<typeof LeaderboardStrategySchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm/activity
// ---------------------------------------------------------------------------

export const ActivityCandidateSchema = z.object({
  name: z.string(),
  skillHash: z.string().optional(),
  parentHash: z.string().nullable().optional(),
  mutationType: z.string().optional(),
  mutationDescription: z.string().optional(),
  decision: z.string().optional(),
  reason: z.string().optional(),
  objectives: z
    .object({
      sharpe: z.number().optional(),
      maxDrawdown: z.number().optional(),
      consistency: z.number().optional(),
      tradeCount: z.number().optional(),
      totalPnl: z.number().optional(),
      returnPct: z.number().optional(),
      bestSymbol: z.string().optional(),
      bestTimeframe: z.string().optional(),
    })
    .optional(),
  rlGradient: z.string().optional(),
  mutationClass: z.string().optional(),
  classificationReason: z.string().optional(),
});

export const RecentCycleSchema = z.object({
  cycleId: z.string().or(z.number()),
  ts: z.number(),
  generated: z.number(),
  accepted: z.number(),
  rejected: z.number(),
  promoted: z.array(z.string()).or(z.number()).optional(),
  duration: z.number(),
  candidates: z.array(ActivityCandidateSchema),
});

export const ActivityResponseSchema = z.object({
  totalCycles: z.number(),
  totalEvaluated: z.number(),
  totalPromoted: z.number(),
  totalRejected: z.number(),
  avgCycleDurationMs: z.number(),
  activeSkills: z.number(),
  recentCycles: z.array(RecentCycleSchema),
  symbols: z.array(z.string()),
});

export type ActivityCandidate = z.infer<typeof ActivityCandidateSchema>;
export type RecentCycle = z.infer<typeof RecentCycleSchema>;
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm/lineage
// ---------------------------------------------------------------------------

export const LineageNodeSchema = z.object({
  hash: z.string(),
  parentHash: z.string().nullable(),
  name: z.string(),
  decision: z.string(),
  mutationType: z.string(),
  sharpe: z.number().nullable(),
  maxDrawdown: z.number().nullable(),
  ts: z.number(),
});

export const LineageResponseSchema = z.object({
  nodes: z.array(LineageNodeSchema),
  total: z.number(),
});

export type LineageNode = z.infer<typeof LineageNodeSchema>;
export type LineageResponse = z.infer<typeof LineageResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm/sharpe-history
// ---------------------------------------------------------------------------

export const SharpeHistoryStrategySchema = z.object({
  name: z.string(),
  sharpe: z.number(),
  decision: z.string(),
});

export const SharpeHistoryEntrySchema = z.object({
  ts: z.number(),
  bestSharpe: z.number().nullable(),
  avgSharpe: z.number().nullable(),
  promoted: z.number(),
  rejected: z.number(),
  strategies: z.array(SharpeHistoryStrategySchema),
});

export const SharpeHistoryResponseSchema = z.object({
  history: z.array(SharpeHistoryEntrySchema),
});

export type SharpeHistoryStrategy = z.infer<typeof SharpeHistoryStrategySchema>;
export type SharpeHistoryEntry = z.infer<typeof SharpeHistoryEntrySchema>;
export type SharpeHistoryResponse = z.infer<typeof SharpeHistoryResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm/backtest-detail?name=...
// ---------------------------------------------------------------------------

export const BacktestTradeSchema = z.object({
  symbol: z.string(),
  side: z.string(),
  entryPrice: z.number(),
  exitPrice: z.number(),
  pnl: z.number(),
  entryTs: z.number(),
  exitTs: z.number(),
});

export const EquityCurvePointSchema = z.object({
  ts: z.number(),
  equity: z.number(),
});

export const PerSymbolSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  sharpe: z.number(),
  maxDrawdown: z.number(),
  tradeCount: z.number(),
  consistency: z.number(),
});

export const BacktestDetailSchema = z.object({
  skillHash: z.string().optional(),
  name: z.string().optional(),
  trades: z.array(BacktestTradeSchema).optional(),
  equityCurve: z.array(EquityCurvePointSchema).optional(),
  sharpe: z.number().optional(),
  maxDrawdown: z.number().optional(),
  totalPnl: z.number().optional(),
  returnPct: z.number().optional(),
  perSymbol: z.array(PerSymbolSchema).optional(),
  bestSymbol: z.string().optional(),
  bestTimeframe: z.string().optional(),
  perRegime: z.unknown().nullable().optional(),
  walkForward: z.unknown().nullable().optional(),
}).passthrough();

export type BacktestTrade = z.infer<typeof BacktestTradeSchema>;
export type EquityCurvePoint = z.infer<typeof EquityCurvePointSchema>;
export type PerSymbol = z.infer<typeof PerSymbolSchema>;
export type BacktestDetail = z.infer<typeof BacktestDetailSchema>;

// ---------------------------------------------------------------------------
// /swarm/llm-stats
// ---------------------------------------------------------------------------

export const LlmStatsSchema = z.object({
  requests: z.number(),
  successes: z.number(),
  failures: z.number(),
  successRate: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  totalInputTokens: z.number().optional(),
  totalOutputTokens: z.number().optional(),
  totalCostUSD: z.number().optional(),
  researchContext: z.array(z.unknown()),
});

export type LlmStats = z.infer<typeof LlmStatsSchema>;

// ---------------------------------------------------------------------------
// /swarm/research
// ---------------------------------------------------------------------------

export const ResearchResponseSchema = z.object({
  findings: z.array(z.unknown()),
  total: z.number(),
});

export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm/strategy-history?name=...
// ---------------------------------------------------------------------------

export const StrategyHistoryPointSchema = z.object({
  cycle: z.string().or(z.number()),
  ts: z.number(),
  sharpe: z.number(),
  maxDrawdown: z.number(),
  consistency: z.number().optional(),
  tradeCount: z.number(),
  totalPnl: z.number().optional(),
  returnPct: z.number().optional(),
  decision: z.string().optional(),
  bestSymbol: z.string().optional(),
  bestTimeframe: z.string().optional(),
});

export const StrategyHistoryResponseSchema = z.object({
  name: z.string(),
  history: z.array(StrategyHistoryPointSchema),
});

export type StrategyHistoryPoint = z.infer<typeof StrategyHistoryPointSchema>;
export type StrategyHistoryResponse = z.infer<typeof StrategyHistoryResponseSchema>;

// ---------------------------------------------------------------------------
// /swarm
// ---------------------------------------------------------------------------

export const SwarmStatusSchema = z.object({
  enabled: z.boolean(),
  workerPool: z.object({
    activeWorkers: z.number(),
    queuedJobs: z.number(),
    maxWorkers: z.number(),
  }).passthrough(),
  strategies: z.object({
    total: z.number(),
    byStage: z.object({
      research: z.number(),
      paper: z.number(),
      live: z.number(),
      deprecated: z.number(),
    }).passthrough(),
  }).passthrough(),
  config: z.object({
    paperMode: z.boolean(),
  }).passthrough(),
}).passthrough();

export type SwarmStatus = z.infer<typeof SwarmStatusSchema>;

// ---------------------------------------------------------------------------
// /regime
// ---------------------------------------------------------------------------

export const RegimeSchema = z.object({
  regime: z.object({
    regime: z.string(),
    confidence: z.number(),
    timestamp: z.number(),
  }).nullable(),
  confidence: z.number().nullable(),
  macro: z.object({
    quad: z.string(),
    confidence: z.number(),
  }).nullable(),
  updatedAt: z.number().nullable(),
}).passthrough();

export type Regime = z.infer<typeof RegimeSchema>;
