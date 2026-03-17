/**
 * API Endpoint Constants
 * Centralized location for all API paths to enable easy configuration
 */

// Trader (main backend)
export const ENDPOINTS = {
  // Swarm/Strategy endpoints
  SWARM_LEADERBOARD: '/swarm/leaderboard',
  SWARM_ACTIVITY: '/swarm/activity',
  SWARM_LINEAGE: '/swarm/lineage',
  SWARM_SHARPE_HISTORY: '/swarm/sharpe-history',
  SWARM_BACKTEST_DETAIL: '/swarm/backtest-detail',
  SWARM_LLM_STATS: '/swarm/llm-stats',
  SWARM_RESEARCH: '/swarm/research',
  SWARM_STATUS: '/swarm',
  STRATEGY_HISTORY: '/swarm/strategy-history',

  // Paper Trading
  PAPER_POSITIONS: '/trader/paper/positions',
  PAPER_EQUITY: '/trader/paper/equity',
  PAPER_FILLS: '/trader/paper/fills',
  PAPER_STATS: '/trader/paper/stats',
  PAPER_CANDLES: '/trader/paper/candles',

  // Market Data
  REGIME: '/regime',

  // Probe Inspector
  PROBE_TRACES: '/probe/traces',
  PROBE_LATEST: '/probe/traces/latest',

  // Error Reporting
  ERRORS: '/errors',

  // WebSocket
  VIZ_WS: '/api/viz/ws',
};

// Helper to construct trader API URLs
export function traderUrl(path: string): string {
  return `/api/trader${path}`;
}

// Coordinator (swarm control) endpoints
export const COORDINATOR_ENDPOINTS = {
  SWARM_PAUSE: '/api/swarm/pause',
  SWARM_RESUME: '/api/swarm/resume',
  SWARM_STATUS: '/api/swarm/status',
};

// Helper to construct paper trading endpoints with query params
export function paperCandlesUrl(symbol: string, tf = '1m', limit = 500): string {
  return `${traderUrl(ENDPOINTS.PAPER_CANDLES)}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=${limit}`;
}

export function paperFillsUrl(limit = 100): string {
  return `${traderUrl(ENDPOINTS.PAPER_FILLS)}?limit=${limit}`;
}

export function backtestDetailUrl(hash: string): string {
  return `${traderUrl(ENDPOINTS.SWARM_BACKTEST_DETAIL)}?hash=${encodeURIComponent(hash)}`;
}

export function strategyHistoryUrl(name: string): string {
  return `${traderUrl(ENDPOINTS.STRATEGY_HISTORY)}?name=${encodeURIComponent(name)}`;
}

export function probeTracesUrl(limit = 20): string {
  return `${traderUrl(ENDPOINTS.PROBE_TRACES)}?limit=${limit}`;
}
