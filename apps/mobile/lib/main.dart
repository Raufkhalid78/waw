import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
import 'router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

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
        RepositoryProvider.value(value: authRepo),
        RepositoryProvider.value(value: productRepo),
        RepositoryProvider.value(value: cartRepo),
        RepositoryProvider.value(value: orderRepo),
        RepositoryProvider.value(value: categoryRepo),
      ],
      child: MultiBlocProvider(
        providers: [
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

class WawApp extends StatelessWidget {
  const WawApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Waw — Premium Marketplace Pakistan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFF59E0B),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        navigationBarTheme: NavigationBarThemeData(
          indicatorColor: const Color(0xFFFEF3C7),
          surfaceTintColor: Colors.transparent,
        ),
      ),
      onGenerateRoute: AppRouter.generateRoute,
      initialRoute: '/',
    );
  }
}
