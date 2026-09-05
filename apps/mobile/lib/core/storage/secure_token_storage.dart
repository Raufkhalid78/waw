import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureTokenStorage {
  static const _accessTokenKey = 'waw_access_token';
  static const _refreshTokenKey = 'waw_refresh_token';
  static const _userIdKey = 'waw_user_id';

  final FlutterSecureStorage _storage;

  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
    String? userId,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
    }
    if (userId != null) {
      await _storage.write(key: _userIdKey, value: userId);
    }
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  Future<String?> getUserId() async {
    return _storage.read(key: _userIdKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
