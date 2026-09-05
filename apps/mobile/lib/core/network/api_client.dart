import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_constants.dart';
import '../storage/secure_token_storage.dart';

class ApiClient {
  final Dio dio;
  final SecureTokenStorage _tokenStorage;
  bool _isRefreshing = false;

  ApiClient({SecureTokenStorage? tokenStorage})
      : _tokenStorage = tokenStorage ?? SecureTokenStorage(),
        dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        )) {
    dio.interceptors.add(_AuthInterceptor(_tokenStorage, this));
    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => print('[API] $obj'),
      ));
    }
  }

  Future<void> setAuthHeader(String token) async {
    dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuthHeader() {
    dio.options.headers.remove('Authorization');
  }

  Future<bool> refreshAccessToken() async {
    if (_isRefreshing) return false;
    _isRefreshing = true;

    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await Dio().post(
        '${ApiConstants.baseUrl}${ApiConstants.refreshToken}',
        options: Options(
          headers: {'Content-Type': 'application/json'},
        ),
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final newAccessToken = data['accessToken'] ?? data['access_token'];
        final newRefreshToken = data['refreshToken'] ?? data['refresh_token'];

        if (newAccessToken != null) {
          await _tokenStorage.saveTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          );
          setAuthHeader(newAccessToken);
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isRefreshing = false;
    }
  }
}

class _AuthInterceptor extends Interceptor {
  final SecureTokenStorage _tokenStorage;
  final ApiClient _client;

  _AuthInterceptor(this._tokenStorage, this._client);

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_client._isRefreshing) {
      final refreshed = await _client.refreshAccessToken();
      if (refreshed) {
        try {
          final response = await _client.dio.fetch(err.requestOptions);
          handler.resolve(response);
          return;
        } catch (_) {}
      }
    }
    handler.next(err);
  }
}

class ApiError implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiError({required this.message, this.statusCode, this.data});

  factory ApiError.fromDioError(DioException e) {
    if (e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map<String, dynamic>) {
        return ApiError(
          message: data['error'] ?? data['message'] ?? 'Unknown error',
          statusCode: e.response?.statusCode,
          data: data,
        );
      }
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return ApiError(message: 'Connection timed out');
      case DioExceptionType.sendTimeout:
        return ApiError(message: 'Send timed out');
      case DioExceptionType.receiveTimeout:
        return ApiError(message: 'Receive timed out');
      case DioExceptionType.connectionError:
        return ApiError(message: 'No internet connection');
      default:
        return ApiError(message: 'Network error occurred');
    }
  }

  @override
  String toString() => message;
}
