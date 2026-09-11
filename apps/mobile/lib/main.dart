import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/network/api_client.dart';
import 'core/storage/secure_token_storage.dart';
import 'repositories/auth_repository.dart';
import 'repositories/product_repository.dart';
import 'repositories/cart_repository.dart';
import 'repositories/order_repository.dart';
import 'repositories/category_repository.dart';
import 'cubits/auth_cubit.dart';
import 'cubits/product_cubit.dart';
import 'cubits/cart_cubit.dart';
import 'cubits/order_cubit.dart';
import 'cubits/category_cubit.dart';
import 'cubits/settings_cubit.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  final apiClient = ApiClient();
  final tokenStorage = SecureTokenStorage();

  final authRepo = AuthRepository(apiClient);
  final productRepo = ProductRepository(apiClient);
  final cartRepo = CartRepository(apiClient);
  final orderRepo = OrderRepository(apiClient);
  final categoryRepo = CategoryRepository(apiClient);

  runApp(
    MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: apiClient),
        RepositoryProvider.value(value: tokenStorage),
        RepositoryProvider.value(value: prefs),
        RepositoryProvider.value(value: authRepo),
        RepositoryProvider.value(value: productRepo),
        RepositoryProvider.value(value: cartRepo),
        RepositoryProvider.value(value: orderRepo),
        RepositoryProvider.value(value: categoryRepo),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (_) => SettingsCubit(prefs),
          ),
          BlocProvider(
            create: (_) => AuthCubit(
              authRepo: authRepo,
              apiClient: apiClient,
              tokenStorage: tokenStorage,
            )..checkAuthStatus(),
          ),
          BlocProvider(
            create: (_) => ProductCubit(productRepo),
          ),
          BlocProvider(
            create: (_) => CartCubit(cartRepo)..loadCart(),
          ),
          BlocProvider(
            create: (_) => OrderCubit(orderRepo),
          ),
          BlocProvider(
            create: (_) => CategoryCubit(categoryRepo),
          ),
        ],
        child: const WawApp(),
      ),
    ),
  );
}

const _brandAmber = Color(0xFFF59E0B);
const _lightPrimary = Color(0xFFD97706); // amber-600
const _darkPrimary = Color(0xFFFBBF24); // amber-400
const _darkOnPrimary = Color(0xFF402D00);

ColorScheme _lightScheme() => ColorScheme.fromSeed(
      seedColor: _brandAmber,
      brightness: Brightness.light,
    ).copyWith(
      primary: _lightPrimary,
      onPrimary: Colors.white,
      surface: Colors.white,
      surfaceContainerLowest: const Color(0xFFFAFAFA),
      surfaceContainerLow: const Color(0xFFF8FAFC),
      surfaceContainer: const Color(0xFFF1F5F9),
      surfaceContainerHigh: const Color(0xFFE2E8F0),
      surfaceContainerHighest: const Color(0xFFCBD5E1),
      onSurface: const Color(0xFF0F172A),
      onSurfaceVariant: const Color(0xFF475569),
      outline: const Color(0xFF94A3B8),
      outlineVariant: const Color(0xFFE2E8F0),
    );

ColorScheme _darkScheme() => ColorScheme.fromSeed(
      seedColor: _brandAmber,
      brightness: Brightness.dark,
    ).copyWith(
      primary: _darkPrimary,
      onPrimary: _darkOnPrimary,
      surface: const Color(0xFF1E293B),
      surfaceContainerLowest: const Color(0xFF0B1120),
      surfaceContainerLow: const Color(0xFF0F172A),
      surfaceContainer: const Color(0xFF1E293B),
      surfaceContainerHigh: const Color(0xFF273449),
      surfaceContainerHighest: const Color(0xFF334155),
      onSurface: const Color(0xFFF1F5F9),
      onSurfaceVariant: const Color(0xFF94A3B8),
      outline: const Color(0xFF64748B),
      outlineVariant: const Color(0xFF334155),
    );

ThemeData _buildTheme(ColorScheme scheme, {required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    brightness: brightness,
    scaffoldBackgroundColor: scheme.surfaceContainerLow,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    navigationBarTheme: NavigationBarThemeData(
      indicatorColor: isDark
          ? scheme.secondaryContainer
          : const Color(0xFFFEF3C7),
      surfaceTintColor: Colors.transparent,
      backgroundColor: isDark ? scheme.surface : Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    dividerColor: isDark ? scheme.outlineVariant : Colors.transparent,
    radioTheme: RadioThemeData(
      fillColor: WidgetStatePropertyAll(scheme.primary),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStatePropertyAll(scheme.primary),
      side: BorderSide(color: scheme.outline),
      checkColor: WidgetStatePropertyAll(scheme.onPrimary),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStatePropertyAll(scheme.onPrimary),
      trackColor: WidgetStatePropertyAll(scheme.primary.withValues(alpha: 0.5)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surfaceContainerLow,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: scheme.error),
      ),
      labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      hintStyle: TextStyle(color: scheme.onSurfaceVariant.withValues(alpha: 0.7)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: scheme.primary,
        side: BorderSide(color: scheme.primary),
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: scheme.primary,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: scheme.inverseSurface,
      contentTextStyle: TextStyle(color: scheme.onInverseSurface),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

class WawApp extends StatelessWidget {
  const WawApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsCubit, SettingsState>(
      builder: (context, settings) {
        final light = _buildTheme(_lightScheme(), brightness: Brightness.light);
        final dark = _buildTheme(_darkScheme(), brightness: Brightness.dark);
        return MaterialApp(
          title: 'Waw â€” Premium Marketplace Pakistan',
          debugShowCheckedModeBanner: false,
          themeMode: settings.themeMode,
          theme: light,
          darkTheme: dark,
          locale: settings.locale,
          supportedLocales: const [
            Locale('en'),
            Locale('ur'),
          ],
          onGenerateRoute: AppRouter.generateRoute,
          initialRoute: '/',
        );
      },
    );
  }
}
