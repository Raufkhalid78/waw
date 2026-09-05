import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/product_cubit.dart';
import '../../cubits/category_cubit.dart';
import '../../cubits/cart_cubit.dart';
import '../../widgets/product_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<CategoryCubit>().loadCategories();
    context.read<ProductCubit>().loadProducts();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            floating: true,
            backgroundColor: Colors.white,
            elevation: 0,
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text(
                      'W',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'waw',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.search, color: Color(0xFF0F172A)),
                onPressed: () => Navigator.of(context).pushNamed('/search'),
              ),
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_bag_outlined, color: Color(0xFF0F172A)),
                    onPressed: () => Navigator.of(context).pushNamed('/cart'),
                  ),
                  BlocBuilder<CartCubit, CartState>(
                    builder: (context, state) {
                      final count = state is CartLoaded ? state.cart.itemCount : 0;
                      if (count == 0) return const SizedBox.shrink();
                      return Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '$count',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),

          // Free Delivery Banner
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.local_shipping, color: Colors.white, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Free Delivery!',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'On orders above PKR 5,000',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Categories
          BlocBuilder<CategoryCubit, CategoryState>(
            builder: (context, state) {
              if (state is CategoryLoaded && state.categories.isNotEmpty) {
                return SliverToBoxAdapter(
                  child: SizedBox(
                    height: 90,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      scrollDirection: Axis.horizontal,
                      itemCount: state.categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final cat = state.categories[index];
                        return GestureDetector(
                          onTap: () {
                            Navigator.of(context).pushNamed(
                              '/products',
                              arguments: {'categoryId': cat.id, 'categoryName': cat.name},
                            );
                          },
                          child: Column(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: cat.imageUrl != null
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(16),
                                        child: Image.network(
                                          cat.imageUrl!,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => const Icon(
                                            Icons.category,
                                            color: Color(0xFFF59E0B),
                                          ),
                                        ),
                                      )
                                    : const Icon(Icons.category, color: Color(0xFFF59E0B)),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                cat.name,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                );
              }
              return const SliverToBoxAdapter(child: SizedBox.shrink());
            },
          ),

          // Section Header
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Text(
                'Featured Products',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
            ),
          ),

          // Products Grid
          BlocBuilder<ProductCubit, ProductState>(
            builder: (context, state) {
              if (state is ProductLoading) {
                return const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                  ),
                );
              }

              if (state is ProductLoaded) {
                final products = state.products;
                if (products.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text(
                        'No products found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.55,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final product = products[index];
                        return ProductCard(
                          title: product.title,
                          titleUrdu: product.titleUrdu,
                          imageUrl: product.displayImage,
                          price: product.pricePkr,
                          comparePrice: product.compareAtPricePkr,
                          ratingAverage: product.ratingAverage,
                          ratingCount: product.ratingCount,
                          storeName: product.store?.name,
                          onTap: () {
                            Navigator.of(context).pushNamed(
                              '/product-detail',
                              arguments: product.slug,
                            );
                          },
                          onAddToCart: () {
                            context.read<CartCubit>().addItem(
                                  productId: product.id,
                                  storeId: product.store?.id,
                                );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${product.title} added to cart'),
                                duration: const Duration(seconds: 1),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                          },
                        );
                      },
                      childCount: products.length,
                    ),
                  ),
                );
              }

              if (state is ProductError) {
                return SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: const TextStyle(color: Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => context.read<ProductCubit>().loadProducts(),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF59E0B),
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return const SliverToBoxAdapter(child: SizedBox.shrink());
            },
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}
