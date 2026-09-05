import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/models.dart';

class CategoryRepository {
  final ApiClient _api;

  CategoryRepository(this._api);

  Future<List<Category>> getCategories() async {
    try {
      final response = await _api.dio.get(ApiConstants.categories);
      final data = response.data;
      final items = data is List ? data : (data is Map ? (data['categories'] ?? data['items'] ?? []) as List : []);

      return items.map((c) => Category.fromJson(c)).toList();
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }
}
