import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/models.dart';

class ProductRepository {
  final ApiClient _api;

  ProductRepository(this._api);

  Future<List<Product>> getProducts({
    String? categoryId,
    String? search,
    String? sort,
    int page = 1,
    int limit = 20,
    double? minPrice,
    double? maxPrice,
    double? minRating,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (categoryId != null) queryParams['category_id'] = categoryId;
      if (search != null) queryParams['search'] = search;
      if (sort != null) queryParams['sort'] = sort;
      if (minPrice != null) queryParams['min_price'] = minPrice;
      if (maxPrice != null) queryParams['max_price'] = maxPrice;
      if (minRating != null) queryParams['min_rating'] = minRating;

      final response = await _api.dio.get(
        ApiConstants.products,
        queryParameters: queryParams,
      );

      final data = response.data;
      final items = data is Map
          ? (data['items'] as List<dynamic>?) ?? []
          : data is List
              ? data
              : [];

      return items.map((p) => Product.fromJson(p)).toList();
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<Product?> getProductBySlug(String slug) async {
    try {
      final response = await _api.dio.get(ApiConstants.productBySlug(slug));
      if (response.data != null) {
        return Product.fromJson(response.data);
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw ApiError.fromDioError(e);
    }
  }

  Future<List<Product>> searchProducts(String query, {int limit = 20}) async {
    try {
      final response = await _api.dio.get(
        ApiConstants.search,
        queryParameters: {'q': query, 'limit': limit},
      );

      final data = response.data;
      final items = data is Map
          ? (data['hits'] as List<dynamic>?) ?? (data['items'] as List<dynamic>?) ?? []
          : data is List
              ? data
              : [];

      return items.map((p) {
        final hit = p is Map ? p : {};
        return Product.fromJson({
          'id': hit['id'] ?? hit['document']?['id'] ?? '',
          'title': hit['title'] ?? hit['document']?['title'] ?? '',
          'slug': hit['slug'] ?? hit['document']?['slug'] ?? '',
          'price_pkr': hit['price_pkr'] ?? hit['document']?['price_pkr'] ?? 0,
          'images': hit['images'] ?? hit['document']?['images'] ?? [],
          'thumbnail': hit['thumbnail'] ?? hit['document']?['thumbnail'],
          'category_name': hit['category_name'] ?? hit['document']?['category_name'],
          'store': hit['store'] ?? hit['document']?['store'],
        });
      }).toList();
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }
}
