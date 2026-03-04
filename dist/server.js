"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const websocket_1 = require("./services/websocket");
const sync_1 = __importDefault(require("./routes/sync"));
const properties_1 = __importDefault(require("./routes/properties"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const payments_1 = __importDefault(require("./routes/payments"));
const tenants_1 = __importDefault(require("./routes/tenants"));
const checkin_1 = __importDefault(require("./routes/checkin"));
const init_1 = require("./db/init");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
const API_PREFIX = '/api';
app.use(`${API_PREFIX}/sync`, sync_1.default);
app.use(`${API_PREFIX}/properties`, properties_1.default);
app.use(`${API_PREFIX}/rooms`, rooms_1.default);
app.use(`${API_PREFIX}/payments`, payments_1.default);
app.use(`${API_PREFIX}/tenants`, tenants_1.default);
app.use(`${API_PREFIX}/checkin`, checkin_1.default);
app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));
async function startServer() {
    const PORT = parseInt(process.env.PORT || '3001', 10);
    await (0, init_1.initDatabase)();
    (0, websocket_1.initWebSocket)(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server v2.0.0 running on port ${PORT}`);
        console.log(`🔌 WebSocket ready`);
    });
}
startServer();
process.on('SIGTERM', async () => {
    console.log('🛑 正在關閉服務器...');
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 正在關閉服務器...');
    process.exit(0);
});
