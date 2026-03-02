"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.broadcast = broadcast;
const ws_1 = require("ws");
let wss;
const clients = new Set();
function initWebSocket(server) {
    wss = new ws_1.WebSocketServer({ server });
    wss.on('connection', (ws) => {
        clients.add(ws);
        ws.isAlive = true;
        console.log(`🔌 新連線，目前共 ${clients.size} 個設備`);
        ws.on('close', () => {
            clients.delete(ws);
            console.log(`❌ 斷線，目前共 ${clients.size} 個設備`);
        });
        ws.on('pong', () => {
            ws.isAlive = true;
        });
    });
    setInterval(() => {
        clients.forEach(ws => {
            if (ws.isAlive === false) {
                clients.delete(ws);
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    console.log('✅ WebSocket 服務啟動');
}
function broadcast(event, data) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    clients.forEach(ws => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(message);
        }
    });
    console.log(`📡 廣播 [${event}] 給 ${clients.size} 個設備`);
}
