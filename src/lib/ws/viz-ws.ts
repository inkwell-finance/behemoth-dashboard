type ChannelHandler = (data: unknown) => void;

class VizWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<ChannelHandler>>();
  private reconnectMs = 1000;
  private readonly maxReconnectMs = 30000;
  private _connected = false;
  private _listeners = new Set<() => void>();
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use relative path to avoid DNS rebinding; browser will resolve against current origin
    this.ws = new WebSocket(`${protocol}${location.host}/api/viz/ws`);

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectMs = 1000;
      this._notifyListeners();
      console.log('[viz-ws] Connected');
    };

    this.ws.onclose = () => {
      this._connected = false;
      this._notifyListeners();
      console.log(`[viz-ws] Disconnected, reconnecting in ${this.reconnectMs}ms`);
      this._reconnectTimer = setTimeout(() => this.connect(), this.reconnectMs);
      this.reconnectMs = Math.min(this.reconnectMs * 2, this.maxReconnectMs);
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const channel = msg.channel as string;
        const data = msg.data;
        if (!channel) return;
        const handlers = this.handlers.get(channel);
        if (handlers) {
          for (const h of handlers) {
            try { h(data); } catch (err) {
              console.warn('[viz-ws] Handler error:', err instanceof Error ? err.message : String(err));
            }
          }
        }
      } catch (err) {
        console.warn('[viz-ws] Message parse error:', ev.data.substring ? ev.data.substring(0, 100) : 'unknown');
      }
    };
  }

  disconnect(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this._notifyListeners();
  }

  subscribe(channel: string, handler: ChannelHandler): () => void {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(handler);
    return () => {
      this.handlers.get(channel)?.delete(handler);
      if (this.handlers.get(channel)?.size === 0) this.handlers.delete(channel);
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  onConnectionChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notifyListeners(): void {
    for (const l of this._listeners) {
      try { l(); } catch { /* listener error */ }
    }
  }
}

export const vizWs = new VizWebSocket();
