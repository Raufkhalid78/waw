import { io } from "../server.js";
import { OrderStatus } from "../types/index.js";

export class RealtimeLogisticsService {
  /**
   * Broadcasts live order status transitions to connected buyer & seller sockets.
   */
  static broadcastOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingInfo?: any,
  ) {
    if (!io) return;
    io.to(`order:${orderId}`).emit("ORDER_STATUS_UPDATED", {
      orderId,
      status,
      trackingInfo,
      timestamp: new Date().toISOString(),
    });
    console.log(
      `📡 Broadcasted ORDER_STATUS_UPDATED for Order ${orderId} -> ${status}`,
    );
  }

  /**
   * Broadcasts courier delivery rider GPS location updates.
   */
  static broadcastRiderLocation(
    orderId: string,
    latitude: number,
    longitude: number,
    etaMinutes: number,
  ) {
    if (!io) return;
    io.to(`order:${orderId}`).emit("RIDER_LOCATION_UPDATED", {
      orderId,
      latitude,
      longitude,
      etaMinutes,
      timestamp: new Date().toISOString(),
    });
  }
}
