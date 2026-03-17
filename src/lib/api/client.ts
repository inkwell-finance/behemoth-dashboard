import type { ZodType } from 'zod';
import { traderUrl } from './endpoints.ts';

// ---------------------------------------------------------------------------
// Authentication Model
// ---------------------------------------------------------------------------
// The dashboard uses HTTP GET requests to a backend that does NOT use
// Cookie-based authentication. All requests are unauthenticated (fetching
// public trading data from the trader service). This means CSRF protection
// is NOT needed — CSRF only applies when cookies are auto-included with
// cross-origin requests to mutating endpoints. Since we are not using
// cookies and all trader endpoints are server-to-server, there is no CSRF
// vector.
//
// If in the future Bearer token authentication is added (via Authorization
// header), CSRF still would not apply (Bearer tokens must be explicitly
// sent by JavaScript and are not auto-included by the browser).
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

export async function fetchTrader<T>(path: string, schema: ZodType<T>): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 10s timeout per request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(traderUrl(path), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const status = res.status;
        // Don't retry 4xx errors (client errors)
        if (status < 500) {
          throw new Error(`${status}: ${await res.text()}`);
        }
        // For 5xx, will retry
        lastError = new Error(`${status}: ${await res.text()}`);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        throw lastError;
      }
      return schema.parse(await res.json());
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        // Check if this is a network error or 5xx that warrants retry
        const isNetworkError = lastError.message.includes('fetch');
        const is5xx = lastError.message.match(/^5\d{2}:/);
        if (isNetworkError || is5xx) {
          await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Unknown error in fetchTrader');
}
