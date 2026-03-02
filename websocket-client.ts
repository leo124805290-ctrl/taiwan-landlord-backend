// 複製這個檔案到前端專案的 lib/websocket.ts

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(onMessage: (event: string, data: any) => void) {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://taiwan-landlord-test.zeabur.app';
  
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('🔌 WebSocket 已連線');
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    try {
      const { event: evtName, data } = JSON.parse(event.data);
      onMessage(evtName, data);
    } catch (e) {
      console.error('WebSocket 訊息解析失敗', e);
    }
  };

  ws.onclose = () => {
    console.log('❌ WebSocket 斷線，5秒後重連...');
    reconnectTimer = setTimeout(() => connectWebSocket(onMessage), 5000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket 錯誤', err);
  };
}

export function disconnectWebSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}
