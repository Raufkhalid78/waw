class ApiConstants {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000',
  );

  // Auth
  static const String sendOtp = '/api/auth/whatsapp-otp/send';
  static const String verifyOtp = '/api/auth/whatsapp-otp/verify';
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
