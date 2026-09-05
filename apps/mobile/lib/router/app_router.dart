import 'package:flutter/material.dart';
import '../features/auth/login_screen.dart';
import '../features/home/home_screen.dart';
import '../features/categories/categories_screen.dart';
import '../features/products/product_list_screen.dart';
import '../features/products/product_detail_screen.dart';
import '../features/cart/cart_screen.dart';
import '../features/checkout/checkout_screen.dart';
import '../features/orders/order_history_screen.dart';
import '../features/orders/order_detail_screen.dart';
import '../features/search/search_screen.dart';
import '../features/account/account_screen.dart';

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());

      case '/':
        return MaterialPageRoute(builder: (_) => const MainShell());

      case '/products':
        final args = settings.arguments as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => ProductListScreen(
            categoryId: args?['categoryId'],
            categoryName: args?['categoryName'],
            searchQuery: args?['searchQuery'],
          ),
        );

      case '/product-detail':
        final slug = settings.arguments as String;
        return MaterialPageRoute(
          builder: (_) => ProductDetailScreen(slug: slug),
        );

      case '/cart':
        return MaterialPageRoute(builder: (_) => const CartScreen());

      case '/checkout':
        return MaterialPageRoute(builder: (_) => const CheckoutScreen());

      case '/orders':
        return MaterialPageRoute(builder: (_) => const OrderHistoryScreen());

      case '/order-detail':
        final orderId = settings.arguments as String;
        return MaterialPageRoute(
          builder: (_) => OrderDetailScreen(orderId: orderId),
        );

      case '/search':
        return MaterialPageRoute(builder: (_) => const SearchScreen());

      case '/account':
        return MaterialPageRoute(builder: (_) => const AccountScreen());

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('No route defined for ${settings.name}'),
            ),
          ),
        );
    }
  }
}

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  final _screens = const [
    HomeScreen(),
    CategoriesScreen(),
    CartScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFFEF3C7),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: Color(0xFFF59E0B)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.category_outlined),
            selectedIcon: Icon(Icons.category, color: Color(0xFFF59E0B)),
            label: 'Categories',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(Icons.shopping_bag, color: Color(0xFFF59E0B)),
            label: 'Cart',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: Color(0xFFF59E0B)),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
