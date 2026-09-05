import http from "http";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app.js";
import { ENV } from "./config/env.js";
import { logger } from "./config/logger.js";
import { supabaseAdmin } from "./config/supabase.js";
import { initTypesenseCollections } from "./config/typesense.js";
import { startReconciliationCron } from "./jobs/reconciliation.cron.js";
import { startInventoryCleanupCron } from "./jobs/inventory-cleanup.cron.js";
import { initSentry, captureException } from "./config/sentry.js";
import { EmailService } from "./modules/email/email.service.js";
import { UploadService } from "./modules/uploads/upload.service.js";

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token as string, ENV.JWT_SECRET) as any;
    (socket as any).userId = decoded.sub;
    (socket as any).userRole = decoded.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  logger.info(`⚡ WebSocket client connected: ${socket.id}`);

  socket.on("join_order", async (orderId: string) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;
    if (userRole !== "ADMIN") {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("buyer_id")
        .eq("id", orderId)
        .single();
      if (!order || order.buyer_id !== userId) return;
    }
    socket.join(`order:${orderId}`);
    logger.info(`Client ${socket.id} joined room: order:${orderId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

process.on("unhandledRejection", (reason: any) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled promise rejection", { scope: "Process", message: error.message });
  captureException(error, { source: "unhandledRejection" });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — shutting down", { scope: "Process", message: err.message });
  captureException(err, { source: "uncaughtException" });
  process.exit(1);
});

async function bootstrap() {
  // Initialize Sentry error tracking
  initSentry();

  // Start HTTP server first so Railway health checks pass immediately
  server.listen(ENV.PORT, () => {
    logger.info(`
====================================================
  🚀 Waw (واو) API Backend is running!
  📡 Port: http://localhost:${ENV.PORT}
  🇵🇰 Region: Pakistan (PKR)
  🚚 Free Delivery Policy: Orders >= PKR ${ENV.FREE_DELIVERY_THRESHOLD_PKR}
  💵 COD Handling Surcharge: +PKR ${ENV.DEFAULT_COD_FEE_PKR}
====================================================
    `);
  });

  // Initialize optional services in the background (non-blocking)
  initTypesenseCollections().catch((err) => {
    logger.warn("⚠️ Typesense unavailable — search will fall back to database:", err?.message || err);
  });

  startReconciliationCron();
  startInventoryCleanupCron();

  // Initialize email service
  EmailService.init();

  // Ensure storage buckets exist
  UploadService.ensureBuckets().catch((err) => {
    logger.warn("Storage bucket init failed:", err?.message || err);
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — starting graceful shutdown`);

    // Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
    });

    // Close Socket.IO
    io.close(() => {
      logger.info("WebSocket server closed");
    });

    // Give in-flight requests up to 10s to complete
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Fatal Server Error:", err);
  process.exit(1);
});
