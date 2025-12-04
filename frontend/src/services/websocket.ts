const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const eventType = message.event;
        
        if (this.listeners.has(eventType)) {
          this.listeners.get(eventType)?.forEach(callback => {
            callback(message.data);
          });
        }

        if (this.listeners.has('*')) {
          this.listeners.get('*')?.forEach(callback => {
            callback(message);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.scheduleReconnect(token);
    };
  }

  private scheduleReconnect(token: string) {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect(token);
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export default new WebSocketService();
