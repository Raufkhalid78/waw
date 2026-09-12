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
  alfaWallet,
  alfalahAccount,
  alfaCard,
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
      case PaymentMethod.alfaWallet:
        return 'Alfa Wallet';
      case PaymentMethod.alfalahAccount:
        return 'Alfalah Bank Account';
      case PaymentMethod.alfaCard:
        return 'Credit/Debit Card';
      case PaymentMethod.raastQr:
        return 'RAAST QR';
    }
  }

  String get icon {
    switch (this) {
      case PaymentMethod.cod:
        return '💵';
      case PaymentMethod.alfaWallet:
        return '📱';
      case PaymentMethod.alfalahAccount:
        return '🏦';
      case PaymentMethod.alfaCard:
        return '💳';
      case PaymentMethod.raastQr:
        return '📱';
    }
  }
}

PaymentMethod parsePaymentMethod(String? value) {
  switch (value) {
    case 'COD':
      return PaymentMethod.cod;
    case 'ALFA_WALLET':
      return PaymentMethod.alfaWallet;
    case 'ALFALAH_ACCOUNT':
      return PaymentMethod.alfalahAccount;
    case 'ALFA_CARD':
      return PaymentMethod.alfaCard;
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
