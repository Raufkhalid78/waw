import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/constants/api_constants.dart';
import '../models/models.dart';

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<void> sendOtp(String phone) async {
    try {
      await _api.dio.post(
        ApiConstants.sendOtp,
        data: {'phone': phone},
      );
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp) async {
    try {
      final response = await _api.dio.post(
        ApiConstants.verifyOtp,
        data: {'phone': phone, 'otp': otp},
      );
      return response.data;
    } on DioException catch (e) {
      throw ApiError.fromDioError(e);
    }
  }

  Future<User?> getCurrentProfile() async {
    try {
      final response = await _api.dio.get(ApiConstants.currentProfile);
      if (response.data != null && response.data is Map) {
        return User.fromJson(response.data);
      }
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) return null;
      throw ApiError.fromDioError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post(ApiConstants.revokeSession);
    } catch (_) {}
  }
}
