import '../core/enums/enums.dart';

class Order {
  final String id;
  final String orderNumber;
  final String buyerName;
  final String buyerPhone;
  final String shippingAddress;
  final String shippingCity;
  final String shippingProvince;
  final OrderStatus orderStatus;
  final PaymentMethod paymentMethod;
  final PaymentStatus paymentStatus;
  final double subtotalPkr;
  final double shippingFeePkr;
  final double codFeePkr;
  final double discountPkr;
  final double totalAmountPkr;
  final String? notes;
  final List<OrderItem> items;
  final List<Shipment> shipments;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.buyerName,
    required this.buyerPhone,
    required this.shippingAddress,
    required this.shippingCity,
    required this.shippingProvince,
    required this.orderStatus,
    required this.paymentMethod,
    required this.paymentStatus,
    this.subtotalPkr = 0,
    this.shippingFeePkr = 0,
    this.codFeePkr = 0,
    this.discountPkr = 0,
    required this.totalAmountPkr,
    this.notes,
    this.items = const [],
    this.shipments = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      orderNumber: json['order_number'] ?? json['id'] ?? '',
      buyerName: json['buyer_name'] ?? '',
      buyerPhone: json['buyer_phone'] ?? '',
      shippingAddress: json['shipping_address'] ?? '',
      shippingCity: json['shipping_city'] ?? '',
      shippingProvince: json['shipping_province'] ?? '',
      orderStatus: parseOrderStatus(json['order_status'] ?? json['global_status']),
      paymentMethod: parsePaymentMethod(json['payment_method']),
      paymentStatus: _parsePaymentStatus(json['payment_status']),
      subtotalPkr: _toDouble(json['subtotal_pkr']),
      shippingFeePkr: _toDouble(json['shipping_fee_pkr']),
      codFeePkr: _toDouble(json['cod_fee_pkr']),
      discountPkr: _toDouble(json['discount_pkr']),
      totalAmountPkr: _toDouble(json['total_amount_pkr']),
      notes: json['notes'],
      // API shapes: GET /api/orders returns `order_items` (flat) plus nested
      // store_orders(each with order_items) and shipments per store_order;
      // GET /api/orders/:id nests items under store_orders as well. Accept
      // every legacy alias so history renders with real data.
      items: _itemsFromJson(json),
      shipments: _shipmentsFromJson(json),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
    );
  }

  /// Collects order items from every shape the API emits:
  ///  - flat `order_items` / `items` (list endpoints)
  ///  - nested `store_orders[*].order_items` (order detail)
  static List<OrderItem> _itemsFromJson(Map<String, dynamic> json) {
    final flat = (json['order_items'] ?? json['items']) as List<dynamic>?;
    final fromStoreOrders = <OrderItem>[];
    final storeOrders = json['store_orders'] as List<dynamic>?;
    if (storeOrders is List) {
      for (final so in storeOrders) {
        if (so is Map<String, dynamic>) {
          final soItems = (so['order_items'] ?? so['items']) as List<dynamic>?;
          if (soItems is List) {
            for (final it in soItems) {
              if (it is Map<String, dynamic>) {
                fromStoreOrders.add(OrderItem.fromJson(it));
              }
            }
          }
        }
      }
    }
    final items = <OrderItem>[
      ...(flat ?? []).whereType<Map<String, dynamic>>().map(OrderItem.fromJson),
      ...fromStoreOrders,
    ];
    // Dedup by id (flat + nested can overlap on the detail endpoint).
    final seen = <String>{};
    return items.where((i) => seen.add(i.id)).toList();
  }

  /// Collects shipments from the top level and from nested store_orders.
  static List<Shipment> _shipmentsFromJson(Map<String, dynamic> json) {
    final flat = json['shipments'] as List<dynamic>?;
    final fromStoreOrders = <Shipment>[];
    final storeOrders = json['store_orders'] as List<dynamic>?;
    if (storeOrders is List) {
      for (final so in storeOrders) {
        if (so is Map<String, dynamic>) {
          final soShipments = so['shipments'] as List<dynamic>?;
          if (soShipments is List) {
            for (final s in soShipments) {
              if (s is Map<String, dynamic>) {
                fromStoreOrders.add(Shipment.fromJson(s));
              }
            }
          }
        }
      }
    }
    final all = [
      ...(flat ?? []).whereType<Map<String, dynamic>>().map(Shipment.fromJson),
      ...fromStoreOrders,
    ];
    final seen = <String>{};
    return all.where((s) => seen.add(s.id)).toList();
  }

  static double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  static PaymentStatus _parsePaymentStatus(String? value) {
    switch (value) {
      case 'PAID':
        return PaymentStatus.paid;
      case 'ESCROW_HELD':
        return PaymentStatus.escrowHeld;
      case 'COD_PENDING':
        return PaymentStatus.codPending;
      case 'COD_COLLECTED':
        return PaymentStatus.codCollected;
      case 'FAILED':
        return PaymentStatus.failed;
      case 'REFUNDED':
        return PaymentStatus.refunded;
      default:
        return PaymentStatus.pending;
    }
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String productTitle;
  final String? productImage;
  final String? variantTitle;
  final int quantity;
  final double unitPricePkr;
  final double totalPricePkr;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productTitle,
    this.productImage,
    this.variantTitle,
    this.quantity = 1,
    this.unitPricePkr = 0,
    this.totalPricePkr = 0,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? '',
      productId: json['product_id'] ?? '',
      productTitle: json['product_title'] ?? 'Product',
      productImage: json['product_image'],
      variantTitle: json['variant_title'],
      quantity: json['quantity'] ?? 1,
      unitPricePkr: _toDouble(json['unit_price_pkr']),
      totalPricePkr: _toDouble(json['total_price_pkr']),
    );
  }

  static double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }
}

class Shipment {
  final String id;
  final String? courier;
  final String? trackingNumber;
  final String? status;
  final bool isCod;
  final double? codAmountPkr;
  final DateTime? createdAt;

  Shipment({
    required this.id,
    this.courier,
    this.trackingNumber,
    this.status,
    this.isCod = false,
    this.codAmountPkr,
    this.createdAt,
  });

  factory Shipment.fromJson(Map<String, dynamic> json) {
    return Shipment(
      id: json['id'] ?? '',
      courier: json['courier'],
      trackingNumber: json['tracking_number'],
      status: json['status'],
      isCod: json['is_cod'] ?? false,
      codAmountPkr: json['cod_amount_pkr'] != null
          ? Order._toDouble(json['cod_amount_pkr'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }
}
