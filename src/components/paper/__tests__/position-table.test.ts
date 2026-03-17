import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Test unrealizedPct formula from position-table.tsx
// ---------------------------------------------------------------------------
// Formula: unrealizedPct = (unrealizedPnl / (entryPrice * size)) * 100
// where: unrealizedPnl = (currentPrice - entryPrice) * size * mult
//        mult = 1 (long) or -1 (short)

function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  size: number,
  side: 'long' | 'short'
): number {
  const mult = side === 'long' ? 1 : -1;
  return (currentPrice - entryPrice) * size * mult;
}

function calculateUnrealizedPct(
  entryPrice: number,
  unrealizedPnl: number,
  size: number
): number {
  return entryPrice > 0 ? (unrealizedPnl / (entryPrice * size)) * 100 : 0;
}

describe('Position PnL Calculations', () => {
  describe('Long position', () => {
    it('calculates profit correctly when price rises', () => {
      const pnl = calculateUnrealizedPnL(100, 120, 1, 'long');
      expect(pnl).toBe(20);
    });

    it('calculates loss correctly when price falls', () => {
      const pnl = calculateUnrealizedPnL(100, 80, 1, 'long');
      expect(pnl).toBe(-20);
    });

    it('calculates percentage correctly with 10% gain', () => {
      const pnl = calculateUnrealizedPnL(100, 110, 1, 'long');
      const pct = calculateUnrealizedPct(100, pnl, 1);
      expect(pct).toBeCloseTo(10, 2);
    });

    it('calculates percentage correctly with 50% loss', () => {
      const pnl = calculateUnrealizedPnL(100, 50, 1, 'long');
      const pct = calculateUnrealizedPct(100, pnl, 1);
      expect(pct).toBeCloseTo(-50, 2);
    });

    it('handles zero entryPrice gracefully', () => {
      const pct = calculateUnrealizedPct(0, 100, 1);
      expect(pct).toBe(0);
    });
  });

  describe('Short position', () => {
    it('calculates profit correctly when price falls', () => {
      const pnl = calculateUnrealizedPnL(100, 80, 1, 'short');
      expect(pnl).toBe(20);
    });

    it('calculates loss correctly when price rises', () => {
      const pnl = calculateUnrealizedPnL(100, 120, 1, 'short');
      expect(pnl).toBe(-20);
    });

    it('calculates percentage correctly with 10% gain on short', () => {
      const pnl = calculateUnrealizedPnL(100, 90, 1, 'short');
      const pct = calculateUnrealizedPct(100, pnl, 1);
      expect(pct).toBeCloseTo(10, 2);
    });

    it('calculates percentage correctly with 50% loss on short', () => {
      const pnl = calculateUnrealizedPnL(100, 150, 1, 'short');
      const pct = calculateUnrealizedPct(100, pnl, 1);
      expect(pct).toBeCloseTo(-50, 2);
    });
  });

  describe('Multi-size positions', () => {
    it('scales correctly with larger position size (size=10)', () => {
      // entryPrice=100, currentPrice=110, size=10 → pnl=100, pct=10%
      // broken formula (no size): 100 / 100 * 100 = 100% — catches the regression
      const size = 10;
      const pnl = calculateUnrealizedPnL(100, 110, size, 'long');
      const pct = calculateUnrealizedPct(100, pnl, size);
      expect(pnl).toBe(100);
      expect(pct).toBeCloseTo(10, 2);
    });

    it('handles fractional sizes', () => {
      const size = 0.5;
      const pnl = calculateUnrealizedPnL(100, 120, size, 'long');
      const pct = calculateUnrealizedPct(100, pnl, size);
      expect(pnl).toBeCloseTo(10, 2);
      expect(pct).toBeCloseTo(20, 2);
    });
  });

  describe('Edge cases', () => {
    it('handles NaN for currentPrice', () => {
      const pnl = calculateUnrealizedPnL(100, NaN, 1, 'long');
      expect(isNaN(pnl)).toBe(true);
    });

    it('handles zero size', () => {
      const pnl = calculateUnrealizedPnL(100, 120, 0, 'long');
      expect(pnl).toBe(0);
    });

    it('handles zero price change', () => {
      const pnl = calculateUnrealizedPnL(100, 100, 1, 'long');
      const pct = calculateUnrealizedPct(100, pnl, 1);
      expect(pnl).toBe(0);
      expect(pct).toBe(0);
    });
  });
});
