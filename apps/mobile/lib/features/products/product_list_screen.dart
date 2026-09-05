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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          widget.categoryName ?? widget.searchQuery ?? 'Products',
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Sort Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: Row(
              children: [
                const Icon(Icons.sort, size: 18, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                const Text('Sort:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
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
          const Divider(height: 1),

          // Products
          Expanded(
            child: BlocBuilder<ProductCubit, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                  );
                }

                if (state is ProductLoaded) {
                  final products = state.products;
                  if (products.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          const Text(
                            'No products found',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Try adjusting your filters',
                            style: TextStyle(color: Colors.grey.shade500),
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
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                            ),
                            if (state.hasMore) ...[
                              const SizedBox(width: 8),
                              Text(
                                'Scroll for more',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
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
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(16),
                                  child: CircularProgressIndicator(
                                    color: Color(0xFFF59E0B),
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
                        const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: const TextStyle(color: Colors.grey),
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
                            backgroundColor: const Color(0xFFF59E0B),
                            foregroundColor: Colors.white,
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
            color: isSelected ? const Color(0xFFF59E0B) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : Colors.grey.shade700,
            ),
          ),
        ),
      ),
    );
  }
}
