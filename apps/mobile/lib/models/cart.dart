class CartItem {
  final String productId;
  final String? variantId;
  final String productTitle;
  final String? productImage;
  final String? variantTitle;
  final double unitPricePkr;
  final int quantity;
  final String? storeId;
  final String? storeName;

  CartItem({
    required this.productId,
    this.variantId,
    required this.productTitle,
    this.productImage,
    this.variantTitle,
    required this.unitPricePkr,
    this.quantity = 1,
    this.storeId,
    this.storeName,
  });

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      productId: json['product_id'] ?? json['productId'] ?? '',
      variantId: json['variant_id'] ?? json['variantId'],
      productTitle: json['product_title'] ?? json['productTitle'] ?? 'Product',
      productImage: json['product_image'] ?? json['productImage'],
      variantTitle: json['variant_title'] ?? json['variantTitle'],
      unitPricePkr: _toDouble(json['unit_price_pkr'] ?? json['unitPricePkr'] ?? 0),
      quantity: json['quantity'] ?? 1,
      storeId: json['store_id'] ?? json['storeId'],
      storeName: json['store_name'] ?? json['storeName'],
    );
  }

  static double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'variant_id': variantId,
      'quantity': quantity,
    };
  }

  double get totalPrice => unitPricePkr * quantity;

  CartItem copyWith({int? quantity}) {
    return CartItem(
      productId: productId,
      variantId: variantId,
      productTitle: productTitle,
      productImage: productImage,
      variantTitle: variantTitle,
      unitPricePkr: unitPricePkr,
      quantity: quantity ?? this.quantity,
      storeId: storeId,
      storeName: storeName,
    );
  }
}

class Cart {
  final List<CartItem> items;
  final double subtotalPkr;
  final int itemCount;

  Cart({
    this.items = const [],
    this.subtotalPkr = 0,
    this.itemCount = 0,
  });

  factory Cart.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>?)
            ?.map((i) => CartItem.fromJson(i))
            .toList() ??
        [];

    final subtotal = items.fold<double>(
      0,
      (sum, item) => sum + item.totalPrice,
    );

    return Cart(
      items: items,
      subtotalPkr: json['subtotal_pkr'] != null
          ? CartItem._toDouble(json['subtotal_pkr'])
          : subtotal,
      itemCount: json['item_count'] ?? items.fold(0, (sum, i) => sum + i.quantity),
    );
  }

  Cart copyWith({List<CartItem>? items}) {
    final newItems = items ?? this.items;
    final subtotal = newItems.fold<double>(
      0,
      (sum, item) => sum + item.totalPrice,
    );
    return Cart(
      items: newItems,
      subtotalPkr: subtotal,
      itemCount: newItems.fold(0, (sum, i) => sum + i.quantity),
    );
  }
}
