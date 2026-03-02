import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    (ws as any).isAlive = true;
    console.log(`🔌 新連線，目前共 ${clients.size} 個設備`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`❌ 斷線，目前共 ${clients.size} 個設備`);
    });

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
  });

  setInterval(() => {
    clients.forEach(ws => {
      if ((ws as any).isAlive === false) {
        clients.delete(ws);
        ws.terminate();
        return;
      }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('✅ WebSocket 服務啟動');
}

export function broadcast(event: string, data: any) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  console.log(`📡 廣播 [${event}] 給 ${clients.size} 個設備`);
}
