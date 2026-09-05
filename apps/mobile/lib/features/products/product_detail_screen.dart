import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../cubits/product_cubit.dart';
import '../../cubits/cart_cubit.dart';

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  const ProductDetailScreen({super.key, required this.slug});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _selectedImageIndex = 0;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    context.read<ProductCubit>().loadProductBySlug(widget.slug);
  }

  String _getDeliveryEstimate(String? sellerCity) {
    final city = sellerCity?.toLowerCase() ?? '';
    if (city.contains('lahore')) {
      return '1-2 business days (Lahore)';
    } else if (city.contains('karachi')) {
      return '2-3 business days (Karachi)';
    } else if (city.contains('islamabad') || city.contains('rawalpindi')) {
      return '2-3 business days (Islamabad)';
    } else if (city.contains('sialkot')) {
      return '2-4 business days (Sialkot)';
    }
    return '3-5 business days (Nationwide)';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocBuilder<ProductCubit, ProductState>(
        builder: (context, state) {
          if (state is ProductLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            );
          }

          if (state is ProductDetailLoaded) {
            final product = state.product;
            return CustomScrollView(
              slivers: [
                // Image Gallery
                SliverAppBar(
                  expandedHeight: 350,
                  pinned: true,
                  backgroundColor: Colors.white,
                  leading: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      margin: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      children: [
                        PageView.builder(
                          itemCount: product.images.length,
                          onPageChanged: (i) => setState(() => _selectedImageIndex = i),
                          itemBuilder: (_, i) => CachedNetworkImage(
                            imageUrl: product.images[i],
                            fit: BoxFit.cover,
                            width: double.infinity,
                            errorWidget: (_, __, ___) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.image, size: 64, color: Colors.grey),
                            ),
                          ),
                        ),
                        if (product.images.length > 1)
                          Positioned(
                            bottom: 12,
                            left: 0,
                            right: 0,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                product.images.length,
                                (i) => Container(
                                  width: i == _selectedImageIndex ? 20 : 6,
                                  height: 6,
                                  margin: const EdgeInsets.symmetric(horizontal: 2),
                                  decoration: BoxDecoration(
                                    color: i == _selectedImageIndex
                                        ? const Color(0xFFF59E0B)
                                        : Colors.grey.shade300,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (product.discountPercent > 0)
                          Positioned(
                            top: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.red.shade500,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '${product.discountPercent.round()}% OFF',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Product Info
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title
                        Text(
                          product.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            height: 1.3,
                          ),
                        ),
                        if (product.titleUrdu != null && product.titleUrdu!.isNotEmpty)
                          Text(
                            product.titleUrdu!,
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        const SizedBox(height: 8),

                        // Rating
                        if (product.ratingCount != null && product.ratingCount! > 0)
                          Row(
                            children: [
                              ...List.generate(
                                5,
                                (i) => Icon(
                                  i < (product.ratingAverage ?? 0).round()
                                      ? Icons.star
                                      : Icons.star_border,
                                  size: 18,
                                  color: const Color(0xFFF59E0B),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${product.ratingAverage?.toStringAsFixed(1)} (${product.ratingCount} reviews)',
                                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        const SizedBox(height: 12),

                        // Price
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'PKR ${product.pricePkr.round()}',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            if (product.compareAtPricePkr != null &&
                                product.compareAtPricePkr! > product.pricePkr) ...[
                              const SizedBox(width: 8),
                              Text(
                                'PKR ${product.compareAtPricePkr!.round()}',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey.shade400,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Stock
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: product.inStock
                                ? const Color(0xFFECFDF5)
                                : const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            product.inStock ? 'In Stock (${product.stockQuantity})' : 'Out of Stock',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: product.inStock
                                  ? const Color(0xFF10B981)
                                  : Colors.red.shade600,
                            ),
                          ),
                        ),

                        // Delivery
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.local_shipping, size: 20, color: Color(0xFF10B981)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Delivery Estimate',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      _getDeliveryEstimate(product.store?.city),
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                    ),
                                    if (product.pricePkr >= 5000)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Free delivery on orders above PKR 5,000',
                                          style: TextStyle(fontSize: 11, color: Colors.green.shade600, fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Store Info
                        if (product.store != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: const Color(0xFFFEF3C7),
                                  child: Text(
                                    product.store!.name[0].toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFF59E0B),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            product.store!.name,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          if (product.store!.isVerified)
                                            const Icon(
                                              Icons.verified,
                                              size: 16,
                                              color: Color(0xFF3B82F6),
                                            ),
                                        ],
                                      ),
                                      if (product.store!.city != null)
                                        Text(
                                          product.store!.city!,
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Description
                        if (product.description != null &&
                            product.description!.isNotEmpty) ...[
                          const SizedBox(height: 20),
                          const Text(
                            'Description',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            product.description!,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.6,
                              color: Colors.grey.shade700,
                            ),
                          ),
                        ],
                        const SizedBox(height: 100),
                      ],
                    ),
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
                  Text(state.message, style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => context.read<ProductCubit>().loadProductBySlug(widget.slug),
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
      bottomSheet: BlocBuilder<ProductCubit, ProductState>(
        builder: (context, state) {
          if (state is! ProductDetailLoaded) return const SizedBox.shrink();
          final product = state.product;

          return Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                // Quantity
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove, size: 18),
                        onPressed: _quantity > 1
                            ? () => setState(() => _quantity--)
                            : null,
                        padding: const EdgeInsets.all(4),
                      ),
                      Text(
                        '$_quantity',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 18),
                        onPressed: () => setState(() => _quantity++),
                        padding: const EdgeInsets.all(4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Add to Cart
                Expanded(
                  child: ElevatedButton(
                    onPressed: product.inStock
                        ? () {
                            context.read<CartCubit>().addItem(
                                  productId: product.id,
                                  quantity: _quantity,
                                  storeId: product.store?.id,
                                );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Added ${product.title} to cart'),
                                duration: const Duration(seconds: 1),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      product.inStock
                          ? 'Add to Cart - PKR ${(product.pricePkr * _quantity).round()}'
                          : 'Out of Stock',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
