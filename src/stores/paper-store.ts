import { create } from 'zustand';
import { vizWs } from '../lib/ws/viz-ws';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  strategyId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: number;
}

export interface PnLSnapshot {
  realizedPnl: number;
  unrealizedPnl: number;
  totalEquity: number;
  totalFees: number;
  netPnl: number;
  activeStrategies: number;
  peakEquity: number;
  timestamp: number;
}

export interface Fill {
  id: string;
  orderId: string;
  strategyId: string;
  symbol: string;
  side: string;
  size: number;
  price: number;
  fee: number;
  timestamp: number;
  pnl?: number;
}

export interface StrategyStats {
  strategyId: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastUpdated: number;
}

interface PaperState {
  // Snapshot data (replaced on each event)
  positions: Position[];
  equity: PnLSnapshot | null;
  stats: StrategyStats[];
  prices: Record<string, number>;
  candles: Record<string, Candle[]>;

  // Accumulated data (ring buffers)
  equityHistory: Array<{ timestamp: number; equity: number; realizedPnl: number; fees: number }>;
  fills: Fill[];

  // Connection state
  wsConnected: boolean;
  lastUpdate: number | null;
  mode: 'live' | 'polling' | 'offline';
  hydrationError: string | null;
  hydrating: boolean;
  bufferedFills: Fill[];

  // Filters
  filteredSymbol: string | null;
  filteredStrategy: string | null;

  // Actions
  setPositions(positions: Position[]): void;
  setEquity(snapshot: PnLSnapshot): void;
  addFill(fill: Fill): void;
  setStats(stats: StrategyStats[]): void;
  setPrices(prices: Record<string, number>): void;
  setWsConnected(connected: boolean): void;
  setMode(mode: 'live' | 'polling' | 'offline'): void;
  setHydrationError(error: string | null): void;
  setCandles(symbol: string, candles: Candle[]): void;
  addCandle(symbol: string, candle: Candle): void;
  setSymbolFilter(s: string | null): void;
  setStrategyFilter(s: string | null): void;
  setHydrating(hydrating: boolean): void;
  bufferFill(fill: Fill): void;
  flushBufferedFills(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_EQUITY_HISTORY = 500;
const MAX_FILLS = 500;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePaperStore = create<PaperState>((set) => ({
  positions: [],
  equity: null,
  stats: [],
  prices: {},
  candles: {},
  equityHistory: [],
  fills: [],
  wsConnected: false,
  lastUpdate: null,
  mode: 'offline',
  hydrationError: null,
  hydrating: false,
  bufferedFills: [],
  filteredSymbol: null,
  filteredStrategy: null,

  setPositions: (positions) => set({ positions, lastUpdate: Date.now() }),

  setEquity: (snapshot) =>
    set((state) => ({
      equity: snapshot,
      lastUpdate: Date.now(),
      equityHistory: [
        ...state.equityHistory.slice(-(MAX_EQUITY_HISTORY - 1)),
        {
          timestamp: snapshot.timestamp,
          equity: snapshot.totalEquity,
          realizedPnl: snapshot.realizedPnl ?? 0,
          fees: snapshot.totalFees ?? 0,
        },
      ],
    })),

  addFill: (fill) =>
    set((state) => {
      // Deduplicate by id
      if (state.fills.some((f) => f.id === fill.id)) return state;
      return {
        fills: [fill, ...state.fills].slice(0, MAX_FILLS),
        lastUpdate: Date.now(),
      };
    }),

  setStats: (stats) => set({ stats, lastUpdate: Date.now() }),
  setPrices: (prices) => set({ prices }),

  setCandles: (symbol, candles) =>
    set((state) => ({
      candles: { ...state.candles, [symbol]: candles.slice(-500) },
    })),

  addCandle: (symbol, candle) =>
    set((state) => {
      const existing = state.candles[symbol] ?? [];
      const last = existing[existing.length - 1];
      const updated =
        last && last.timestamp === candle.timestamp
          ? [...existing.slice(0, -1), candle]
          : [...existing, candle].slice(-500);
      return { candles: { ...state.candles, [symbol]: updated } };
    }),

  setWsConnected: (connected) => set({ wsConnected: connected }),
  setMode: (mode) => set({ mode }),
  setHydrationError: (error) => set({ hydrationError: error }),
  setHydrating: (hydrating) => set({ hydrating }),
  bufferFill: (fill) =>
    set((state) => ({
      bufferedFills: [...state.bufferedFills, fill],
    })),
  flushBufferedFills: () =>
    set((state) => {
      // Merge buffered fills, deduplicating by fill ID
      const fillIds = new Set(state.fills.map((f) => f.id));
      const toAdd = state.bufferedFills.filter((f) => !fillIds.has(f.id));
      return {
        fills: [
          ...toAdd,
          ...state.fills,
        ].slice(0, MAX_FILLS),
        bufferedFills: [],
        lastUpdate: Date.now(),
      };
    }),
  setSymbolFilter: (s) => set({ filteredSymbol: s }),
  setStrategyFilter: (s) => set({ filteredStrategy: s }),
}));

// ---------------------------------------------------------------------------
// HTTP hydration
// ---------------------------------------------------------------------------

async function hydrate() {
  try {
    const [posRes, equityRes, fillsRes, statsRes] = await Promise.allSettled([
      fetch('/api/trader/paper/positions').then((r) => r.json()),
      fetch('/api/trader/paper/equity').then((r) => r.json()),
      fetch('/api/trader/paper/fills?limit=100').then((r) => r.json()),
      fetch('/api/trader/paper/stats').then((r) => r.json()),
    ]);

    const s = usePaperStore.getState();

    if (posRes.status === 'fulfilled' && posRes.value?.positions) {
      s.setPositions(posRes.value.positions);
    }
    if (equityRes.status === 'fulfilled' && equityRes.value?.timestamp != null) {
      s.setEquity(equityRes.value);
    }
    if (fillsRes.status === 'fulfilled' && fillsRes.value?.fills) {
      for (const f of (fillsRes.value.fills as Fill[]).reverse()) {
        s.addFill(f);
      }
    }
    if (statsRes.status === 'fulfilled' && statsRes.value?.strategies) {
      s.setStats(statsRes.value.strategies);
    }

    // Hydrate candles for each symbol
    for (const sym of ['BTC', 'ETH', 'SOL', 'HYPE']) {
      fetch(`/api/trader/paper/candles?symbol=${sym}&tf=1m&limit=500`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.candles)
            usePaperStore.getState().setCandles(sym, d.candles);
        })
        .catch(() => {});
    }
  } catch (err) {
    // hydration failed, set error and continue
    const msg = err instanceof Error ? err.message : 'Failed to load paper trading data';
    usePaperStore.getState().setHydrationError(msg);
  }
}

async function hydrateWithBuffering() {
  // Mark hydration start
  usePaperStore.getState().setHydrating(true);

  // Run hydration
  await hydrate();

  // Flush buffered fills and mark hydration end
  usePaperStore.getState().flushBufferedFills();
  usePaperStore.getState().setHydrating(false);
}

// ---------------------------------------------------------------------------
// connectPaperStore — wires WS + HTTP fallback, returns cleanup fn
// ---------------------------------------------------------------------------

export function connectPaperStore(): () => void {
  // 1. Hydrate from HTTP (initial load) with buffering
  hydrateWithBuffering();

  // 2. Connect WebSocket
  vizWs.connect();

  // 3. Subscribe to channels
  const unsubs = [
    vizWs.subscribe('paper:positions', (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      if (d?.positions) {
        usePaperStore.getState().setPositions(d.positions as Position[]);
      }
    }),
    vizWs.subscribe('paper:equity', (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      if (d?.timestamp != null) {
        usePaperStore.getState().setEquity(d as unknown as PnLSnapshot);
      }
    }),
    vizWs.subscribe('paper:fills', (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      if (d?.id) {
        const fill = d as unknown as Fill;
        const state = usePaperStore.getState();
        // Buffer fills during hydration, otherwise add directly
        if (state.hydrating) {
          state.bufferFill(fill);
        } else {
          state.addFill(fill);
        }
      }
    }),
    vizWs.subscribe('paper:stats', (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      if (d?.strategies) {
        usePaperStore.getState().setStats(d.strategies as StrategyStats[]);
      }
    }),
    vizWs.subscribe('paper:candles', (data: unknown) => {
      const d = data as Record<string, unknown> | null;
      if (d?.symbol && d?.candle) {
        // Normalize BTCUSDT → BTC to match store keys
        const sym = (d.symbol as string).replace(/USDT$/, '');
        usePaperStore
          .getState()
          .addCandle(sym, d.candle as Candle);
      }
    }),
    vizWs.subscribe('market:mids:rt', (data: unknown) => {
      if (data && typeof data === 'object') {
        // HyPaper sends short names (BTC, ETH) with string values
        // Map to XXXUSDT format with numeric values
        const raw = data as Record<string, string | number>;
        const mapped: Record<string, number> = {};
        for (const [key, val] of Object.entries(raw)) {
          const price = typeof val === 'string' ? parseFloat(val) : val;
          if (isNaN(price)) continue;
          mapped[key] = price;
          // Also store as XXXUSDT format for position table / chart matching
          if (!key.endsWith('USDT') && !key.startsWith('@')) {
            mapped[`${key}USDT`] = price;
          }
        }
        usePaperStore.getState().setPrices(mapped);
      }
    }),
  ];

  // 4. HTTP polling fallback
  let pollingActive = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (pollingActive) return;
    pollingActive = true;
    usePaperStore.getState().setMode('polling');
    pollTimer = setInterval(hydrate, 10_000);
  };

  const stopPolling = () => {
    pollingActive = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  // 5. Track connection state
  const unsubConn = vizWs.onConnectionChange(() => {
    const connected = vizWs.connected;
    usePaperStore.getState().setWsConnected(connected);

    if (connected) {
      stopPolling();
      usePaperStore.getState().setMode('live');
    } else {
      startPolling();
    }
  });

  // If WS doesn't connect within 5s, start polling
  const fallbackTimer = setTimeout(() => {
    if (!vizWs.connected) startPolling();
  }, 5000);

  // Cleanup
  return () => {
    clearTimeout(fallbackTimer);
    stopPolling();
    for (const unsub of unsubs) unsub();
    unsubConn();
    vizWs.disconnect();
  };
}
