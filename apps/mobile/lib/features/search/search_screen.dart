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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: TextField(
          controller: _searchController,
          focusNode: _focusNode,
          onSubmitted: _performSearch,
          decoration: InputDecoration(
            hintText: 'Search products...',
            hintStyle: TextStyle(color: Colors.grey.shade400),
            border: InputBorder.none,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFFF59E0B)),
            onPressed: () => _performSearch(_searchController.text),
          ),
        ],
      ),
      body: BlocBuilder<ProductCubit, ProductState>(
        builder: (context, state) {
          if (state is ProductLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            );
          }

          if (state is ProductLoaded) {
            if (state.products.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    const Text(
                      'No results found',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Try different keywords',
                      style: TextStyle(color: Colors.grey.shade500),
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
                Icon(Icons.search, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                Text(
                  'Search for products',
                  style: TextStyle(fontSize: 16, color: Colors.grey.shade500),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
