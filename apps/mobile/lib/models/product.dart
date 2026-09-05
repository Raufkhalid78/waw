class Product {
  final String id;
  final String title;
  final String? titleUrdu;
  final String slug;
  final String? description;
  final String? categoryId;
  final String? categoryName;
  final List<String> images;
  final String? thumbnail;
  final double pricePkr;
  final double? compareAtPricePkr;
  final int stockQuantity;
  final String? sku;
  final double? weightKg;
  final bool isActive;
  final double? ratingAverage;
  final int? ratingCount;
  final StoreInfo? store;
  final List<ProductVariant>? variants;
  final Map<String, dynamic>? attributes;
  final DateTime? createdAt;

  Product({
    required this.id,
    required this.title,
    this.titleUrdu,
    required this.slug,
    this.description,
    this.categoryId,
    this.categoryName,
    this.images = const [],
    this.thumbnail,
    required this.pricePkr,
    this.compareAtPricePkr,
    this.stockQuantity = 0,
    this.sku,
    this.weightKg,
    this.isActive = true,
    this.ratingAverage,
    this.ratingCount,
    this.store,
    this.variants,
    this.attributes,
    this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final images = <String>[];
    if (json['images'] is List) {
      for (final img in json['images']) {
        if (img is String) images.add(img);
      }
    }

    return Product(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      titleUrdu: json['title_urdu'],
      slug: json['slug'] ?? '',
      description: json['description'],
      categoryId: json['category_id'],
      categoryName: json['category'] is Map
          ? json['category']['name']
          : json['category_name'],
      images: images,
      thumbnail: json['thumbnail'] ?? (images.isNotEmpty ? images.first : null),
      pricePkr: _toDouble(json['price_pkr'] ?? json['pricePkr'] ?? 0),
      compareAtPricePkr: json['compare_at_price_pkr'] != null
          ? _toDouble(json['compare_at_price_pkr'])
          : null,
      stockQuantity: json['stock_quantity'] ?? 0,
      sku: json['sku'],
      weightKg: json['weight_kg'] != null
          ? _toDouble(json['weight_kg'])
          : null,
      isActive: json['is_active'] ?? true,
      ratingAverage: json['rating_average'] != null
          ? _toDouble(json['rating_average'])
          : null,
      ratingCount: json['rating_count'],
      store: json['store'] != null ? StoreInfo.fromJson(json['store']) : null,
      variants: json['variants'] is List
          ? (json['variants'] as List)
              .map((v) => ProductVariant.fromJson(v))
              .toList()
          : null,
      attributes: json['attributes'] is Map
          ? Map<String, dynamic>.from(json['attributes'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }

  static double _toDouble(dynamic value) {
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  double get discountPercent {
    if (compareAtPricePkr == null || compareAtPricePkr! <= 0) return 0;
    return ((compareAtPricePkr! - pricePkr) / compareAtPricePkr! * 100);
  }

  bool get inStock => stockQuantity > 0;

  String get displayImage =>
      thumbnail ?? (images.isNotEmpty ? images.first : '');
}

class StoreInfo {
  final String id;
  final String name;
  final String? slug;
  final String? city;
  final bool isVerified;
  final double? ratingAverage;

  StoreInfo({
    required this.id,
    required this.name,
    this.slug,
    this.city,
    this.isVerified = false,
    this.ratingAverage,
  });

  factory StoreInfo.fromJson(Map<String, dynamic> json) {
    return StoreInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'],
      city: json['city'],
      isVerified: json['is_verified'] ?? false,
      ratingAverage: json['rating_average'] != null
          ? Product._toDouble(json['rating_average'])
          : null,
    );
  }
}

class ProductVariant {
  final String id;
  final String name;
  final double? priceAdjustment;
  final int stockQuantity;
  final String? sku;

  ProductVariant({
    required this.id,
    required this.name,
    this.priceAdjustment,
    this.stockQuantity = 0,
    this.sku,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] ?? '',
      name: json['variant_name'] ?? json['name'] ?? '',
      priceAdjustment: json['price_adjustment_pkr'] != null
          ? Product._toDouble(json['price_adjustment_pkr'])
          : null,
      stockQuantity: json['stock_quantity'] ?? 0,
      sku: json['sku'],
    );
  }
}
