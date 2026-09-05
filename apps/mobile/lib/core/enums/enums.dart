enum UserRole { buyer, seller, admin }

enum OrderStatus {
  pending,
  confirmed,
  processing,
  shipped,
  outForDelivery,
  delivered,
  cancelled,
  returnRequested,
  returned,
}

enum PaymentMethod {
  cod,
  xpayCard,
  xpayJazzcash,
  xpayEasypaisa,
  raastQr,
}

enum PaymentStatus {
  pending,
  authorized,
  paid,
  escrowHeld,
  codPending,
  codCollected,
  failed,
  refunded,
}

enum StoreStatus {
  pendingKyc,
  active,
  suspended,
  rejected,
}

enum SellerType {
  firstParty,
  thirdParty,
}

enum PayoutStatus {
  pending,
  processing,
  completed,
  failed,
}

extension OrderStatusExtension on OrderStatus {
  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.processing:
        return 'Processing';
      case OrderStatus.shipped:
        return 'Shipped';
      case OrderStatus.outForDelivery:
        return 'Out for Delivery';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.returnRequested:
        return 'Return Requested';
      case OrderStatus.returned:
        return 'Returned';
    }
  }
}

extension PaymentMethodExtension on PaymentMethod {
  String get label {
    switch (this) {
      case PaymentMethod.cod:
        return 'Cash on Delivery';
      case PaymentMethod.xpayCard:
        return 'Credit/Debit Card';
      case PaymentMethod.xpayJazzcash:
        return 'JazzCash';
      case PaymentMethod.xpayEasypaisa:
        return 'Easypaisa';
      case PaymentMethod.raastQr:
        return 'RAAST QR';
    }
  }

  String get icon {
    switch (this) {
      case PaymentMethod.cod:
        return '💵';
      case PaymentMethod.xpayCard:
        return '💳';
      case PaymentMethod.xpayJazzcash:
        return '📱';
      case PaymentMethod.xpayEasypaisa:
        return '📱';
      case PaymentMethod.raastQr:
        return '📱';
    }
  }
}

PaymentMethod parsePaymentMethod(String? value) {
  switch (value) {
    case 'COD':
      return PaymentMethod.cod;
    case 'XPAY_CARD':
      return PaymentMethod.xpayCard;
    case 'XPAY_WALLET_JAZZCASH':
      return PaymentMethod.xpayJazzcash;
    case 'XPAY_WALLET_EASYPAISA':
      return PaymentMethod.xpayEasypaisa;
    case 'RAAST_P2M_QR':
      return PaymentMethod.raastQr;
    default:
      return PaymentMethod.cod;
  }
}

OrderStatus parseOrderStatus(String? value) {
  switch (value) {
    case 'PENDING':
      return OrderStatus.pending;
    case 'CONFIRMED':
      return OrderStatus.confirmed;
    case 'PROCESSING':
      return OrderStatus.processing;
    case 'SHIPPED':
      return OrderStatus.shipped;
    case 'OUT_FOR_DELIVERY':
      return OrderStatus.outForDelivery;
    case 'DELIVERED':
      return OrderStatus.delivered;
    case 'CANCELLED':
      return OrderStatus.cancelled;
    case 'RETURN_REQUESTED':
      return OrderStatus.returnRequested;
    case 'RETURNED':
      return OrderStatus.returned;
    default:
      return OrderStatus.pending;
  }
}
