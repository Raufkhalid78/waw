import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { initTypesenseCollections } from './config/typesense.js';

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`⚡ WebSocket client connected: ${socket.id}`);

  socket.on('join_order_room', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`Client ${socket.id} joined room: order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

async function bootstrap() {
  await initTypesenseCollections();

  server.listen(ENV.PORT, () => {
    console.log(`
====================================================
  🚀 Waw (واو) API Backend is running!
  📡 Port: http://localhost:${ENV.PORT}
  🇵🇰 Region: Pakistan (PKR)
  🚚 Free Delivery Policy: Orders >= PKR ${ENV.FREE_DELIVERY_THRESHOLD_PKR}
  💵 COD Handling Surcharge: +PKR ${ENV.DEFAULT_COD_FEE_PKR}
====================================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
