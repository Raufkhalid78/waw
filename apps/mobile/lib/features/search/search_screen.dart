import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/product_cubit.dart';
import '../../widgets/product_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _performSearch(String query) {
    if (query.trim().isEmpty) return;
    context.read<ProductCubit>().loadProducts(search: query.trim());
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: scheme.surface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: scheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: TextField(
          controller: _searchController,
          focusNode: _focusNode,
          onSubmitted: _performSearch,
          style: TextStyle(color: scheme.onSurface),
          decoration: InputDecoration(
            hintText: 'Search products...',
            hintStyle: TextStyle(color: scheme.onSurfaceVariant),
            border: InputBorder.none,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.search, color: scheme.primary),
            onPressed: () => _performSearch(_searchController.text),
          ),
        ],
      ),
      body: BlocBuilder<ProductCubit, ProductState>(
        builder: (context, state) {
          if (state is ProductLoading) {
            return Center(
              child: CircularProgressIndicator(color: scheme.primary),
            );
          }

          if (state is ProductLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search_off, size: 64, color: scheme.outline),
                    const SizedBox(height: 16),
                    const Text(
                      'No results found',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Try different keywords',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              );
            }

            return GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.55,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: state.products.length,
              itemBuilder: (context, index) {
                final product = state.products[index];
                return ProductCard(
                  title: product.title,
                  imageUrl: product.displayImage,
                  price: product.pricePkr,
                  comparePrice: product.compareAtPricePkr,
                  onTap: () {
                    Navigator.of(context).pushNamed(
                      '/product-detail',
                      arguments: product.slug,
                    );
                  },
                );
              },
            );
          }

          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.search, size: 64, color: scheme.outline),
                const SizedBox(height: 16),
                Text(
                  'Search for products',
                  style: TextStyle(fontSize: 16, color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
