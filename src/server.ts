import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initWebSocket } from './services/websocket';
import syncRouter from './routes/sync';
import propertiesRouter from './routes/properties';
import roomsRouter from './routes/rooms';
import paymentsRouter from './routes/payments';
import tenantsRouter from './routes/tenants';
import { initDatabase } from './db/init';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

const API_PREFIX = '/api';

app.use(`${API_PREFIX}/sync`, syncRouter);
app.use(`${API_PREFIX}/properties`, propertiesRouter);
app.use(`${API_PREFIX}/rooms`, roomsRouter);
app.use(`${API_PREFIX}/payments`, paymentsRouter);
app.use(`${API_PREFIX}/tenants`, tenantsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  await initDatabase();
  initWebSocket(httpServer);
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
