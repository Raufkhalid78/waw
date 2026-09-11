import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/product_cubit.dart';
import '../../widgets/product_card.dart';

class ProductListScreen extends StatefulWidget {
  final String? categoryId;
  final String? categoryName;
  final String? searchQuery;

  const ProductListScreen({
    super.key,
    this.categoryId,
    this.categoryName,
    this.searchQuery,
  });

  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  String _sortBy = 'newest';
  String? _selectedCategory;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.categoryId;
    context.read<ProductCubit>().loadProducts(
          categoryId: widget.categoryId,
          search: widget.searchQuery,
          sort: _sortBy,
        );
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      context.read<ProductCubit>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: scheme.surface,
        elevation: 0,
        title: Text(
          widget.categoryName ?? widget.searchQuery ?? 'Products',
          style: TextStyle(
            color: scheme.onSurface,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: scheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Sort Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: scheme.surface,
            child: Row(
              children: [
                Icon(Icons.sort, size: 18, color: scheme.onSurfaceVariant),
                const SizedBox(width: 4),
                Text('Sort:', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildSortChip('newest', 'Newest'),
                        _buildSortChip('price_asc', 'Price: Low to High'),
                        _buildSortChip('price_desc', 'Price: High to Low'),
                        _buildSortChip('rating', 'Top Rated'),
                        _buildSortChip('bestselling', 'Best Selling'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: scheme.outlineVariant),

          // Products
          Expanded(
            child: BlocBuilder<ProductCubit, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return Center(
                    child: CircularProgressIndicator(color: scheme.primary),
                  );
                }

                if (state is ProductLoaded) {
                  final products = state.products;
                  if (products.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.shopping_bag_outlined, size: 64, color: scheme.outline),
                          const SizedBox(height: 16),
                          const Text(
                            'No products found',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Try adjusting your filters',
                            style: TextStyle(color: scheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    );
                  }

                  return Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Row(
                          children: [
                            Text(
                              '${products.length} products',
                              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                            ),
                            if (state.hasMore) ...[
                              const SizedBox(width: 8),
                              Text(
                                'Scroll for more',
                                style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
                              ),
                            ],
                          ],
                        ),
                      ),
                      Expanded(
                        child: GridView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.55,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: products.length + (state.hasMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == products.length) {
                              return Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: CircularProgressIndicator(
                                    color: scheme.primary,
                                    strokeWidth: 2,
                                  ),
                                ),
                              );
                            }
                            final product = products[index];
                            return ProductCard(
                              title: product.title,
                              imageUrl: product.displayImage,
                              price: product.pricePkr,
                              comparePrice: product.compareAtPricePkr,
                              onAddToCart: () {},
                              onTap: () {
                                Navigator.of(context).pushNamed(
                                  '/product-detail',
                                  arguments: product.slug,
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ],
                  );
                }

                if (state is ProductError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 48, color: scheme.error),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: TextStyle(color: scheme.onSurfaceVariant),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () {
                            context.read<ProductCubit>().loadProducts(
                                  categoryId: widget.categoryId,
                                  search: widget.searchQuery,
                                  sort: _sortBy,
                                );
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: scheme.primary,
                            foregroundColor: scheme.onPrimary,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortChip(String value, String label) {
    final scheme = Theme.of(context).colorScheme;
    final isSelected = _sortBy == value;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: () {
          setState(() => _sortBy = value);
          context.read<ProductCubit>().loadProducts(
                categoryId: _selectedCategory,
                sort: value,
                search: widget.searchQuery,
              );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? scheme.primary : scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isSelected ? scheme.onPrimary : scheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}
