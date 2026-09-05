import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/models.dart';

class OrderRepository {
  final ApiClient _api;

  OrderRepository(this._api);

  Future<List<Order>> getOrders({int page = 1, int limit = 20}) async {
    try {
      final response = await _api.dio.get(
        ApiConstants.orders,
        queryParameters: {'page': page, 'limit': limit},
      );

      final data = response.data;
      final items = data is Map
          ? (data['items'] as List<dynamic>?) ?? (data['orders'] as List<dynamic>?) ?? []
          : data is List
              ? data
              : [];

      return items.map((o) => Order.fromJson(o)).toList();
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<Order?> getOrder(String id) async {
    try {
      final response = await _api.dio.get(ApiConstants.orderById(id));
      if (response.data != null) {
        return Order.fromJson(response.data);
      }
      return null;
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<Order> createOrder({
    required String buyerName,
    required String buyerPhone,
    required String shippingAddress,
    required String shippingCity,
    required String shippingProvince,
    required String paymentMethod,
    String? couponCode,
    String? notes,
    List<Map<String, dynamic>>? items,
  }) async {
    try {
      final response = await _api.dio.post(ApiConstants.orders, data: {
        'buyer_name': buyerName,
        'buyer_phone': buyerPhone,
        'shipping_address': shippingAddress,
        'shipping_city': shippingCity,
        'shipping_province': shippingProvince,
        'payment_method': paymentMethod,
        if (couponCode != null) 'coupon_code': couponCode,
        if (notes != null) 'notes': notes,
        if (items != null) 'items': items,
      });
      return Order.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<void> cancelOrder(String id) async {
    try {
      await _api.dio.post(ApiConstants.orderCancel(id));
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<void> requestReturn(String id, String reason) async {
    try {
      await _api.dio.post(
        ApiConstants.orderReturn(id),
        data: {'reason': reason},
      );
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }
}
