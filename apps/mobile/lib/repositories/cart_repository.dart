import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/models.dart';

class CartRepository {
  final ApiClient _api;

  CartRepository(this._api);

  Future<Cart> getCart() async {
    try {
      final response = await _api.dio.get(ApiConstants.cart);
      if (response.data != null) {
        return Cart.fromJson(response.data);
      }
      return Cart();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return Cart();
      throw ApiError.fromDioError(e);
    }
  }

  Future<Cart> addItem({
    required String productId,
    String? variantId,
    required int quantity,
    String? storeId,
  }) async {
    try {
      final response = await _api.dio.post(ApiConstants.cartItems, data: {
        'product_id': productId,
        'variant_id': variantId,
        'quantity': quantity,
        'store_id': storeId,
      });
      return Cart.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<Cart> updateItem({
    required String productId,
    String? variantId,
    required int quantity,
  }) async {
    try {
      final response = await _api.dio.put(
        ApiConstants.cart,
        data: {
          'items': [
            {
              'product_id': productId,
              'variant_id': variantId,
              'quantity': quantity,
            }
          ],
        },
      );
      return Cart.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<void> removeItem(String productId, {String? variantId}) async {
    try {
      await _api.dio.delete(
        '${ApiConstants.cartItems}/$productId',
        data: variantId != null ? {'variant_id': variantId} : null,
      );
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<void> clearCart() async {
    try {
      await _api.dio.put(ApiConstants.cart, data: {'items': []});
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }
}
