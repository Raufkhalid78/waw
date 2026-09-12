class ApiConstants {
  // Production API by default — a release APK/AAB built without an explicit
  // --dart-define still talks to the live API instead of a dead localhost.
  // Override locally with:
  //   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.waw.com.pk',
  );

  /// True when this binary was compiled in release mode.
  static const bool _isRelease = bool.fromEnvironment('dart.vm.product');

  /// Release builds must target an HTTPS API URL. The production default
  /// (https://api.waw.com.pk) already satisfies this; the guard catches
  /// explicit localhost/HTTP overrides leaking into shipped binaries.
  static void assertConfiguredForRelease() {
    if (!_isRelease) return;
    final isLocalhost = RegExp(
      r'//(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0|::1)',
    ).hasMatch(baseUrl);
    if (isLocalhost || baseUrl.isEmpty) {
      throw StateError(
        'API_BASE_URL is not configured for this release build. '
        'Rebuild with --dart-define=API_BASE_URL=https://<your-api-domain>',
      );
    }
    if (!baseUrl.startsWith('https://')) {
      throw StateError(
        'API_BASE_URL must use HTTPS in release builds. Got: $baseUrl',
      );
    }
  }

  // Auth
  static const String sendOtp = '/api/auth/whatsapp-otp/send';
  static const String verifyOtp = '/api/auth/whatsapp-otp/verify';
  static const String createSession = '/api/auth/session/create';
  static const String refreshToken = '/api/auth/session/refresh';
  static const String revokeSession = '/api/auth/session/revoke';
  static const String currentProfile = '/api/auth/session/me';

  // Products
  static const String products = '/api/products';
  static String productBySlug(String slug) => '/api/products/$slug';

  // Categories
  static const String categories = '/api/categories';

  // Search
  static const String search = '/api/search';

  // Cart
  static const String cart = '/api/cart';
  static const String cartItems = '/api/cart/items';

  // Orders
  static const String orders = '/api/orders';
  static String orderById(String id) => '/api/orders/$id';
  static String orderCancel(String id) => '/api/orders/$id/cancel';
  static String orderReturn(String id) => '/api/orders/$id/return';

  // Stores
  static const String stores = '/api/stores';

  // Uploads
  static String upload(String bucket) => '/api/uploads/$bucket';

  // Config
  static const String storefrontConfig = '/api/config/storefront';
}
