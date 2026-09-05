import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../cubits/cart_cubit.dart';
import '../../models/models.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'My Cart',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocBuilder<CartCubit, CartState>(
        builder: (context, state) {
          if (state is CartLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            );
          }

          if (state is CartLoaded) {
            final cart = state.cart;
            if (cart.items.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shopping_bag_outlined, size: 80, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    const Text(
                      'Your cart is empty',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Add items to get started',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Continue Shopping'),
                    ),
                  ],
                ),
              );
            }

            return Column(
              children: [
                // Items
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return _CartItemTile(item: item);
                    },
                  ),
                ),

                // Summary
                Container(
                  padding: const EdgeInsets.all(16),
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
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${cart.itemCount} items',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                          Text(
                            'PKR ${cart.subtotalPkr.round()}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        cart.subtotalPkr >= 5000
                            ? 'You qualify for free delivery!'
                            : 'Add PKR ${(5000 - cart.subtotalPkr).round()} more for free delivery',
                        style: TextStyle(
                          fontSize: 12,
                          color: cart.subtotalPkr >= 5000
                              ? const Color(0xFF10B981)
                              : Colors.grey.shade500,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).pushNamed('/checkout');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF59E0B),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Proceed to Checkout',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }

          return const Center(child: Text('Something went wrong'));
        },
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem item;
  const _CartItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          // Image
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 72,
              height: 72,
              child: item.productImage != null
                  ? CachedNetworkImage(
                      imageUrl: item.productImage!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(
                        color: Colors.grey.shade100,
                        child: const Icon(Icons.image, color: Colors.grey),
                      ),
                    )
                  : Container(
                      color: Colors.grey.shade100,
                      child: const Icon(Icons.image, color: Colors.grey),
                    ),
            ),
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productTitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                if (item.variantTitle != null)
                  Text(
                    item.variantTitle!,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                const SizedBox(height: 4),
                Text(
                  'PKR ${item.unitPricePkr.round()}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),

          // Quantity Controls
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _quantityButton(
                  icon: Icons.remove,
                  onTap: item.quantity > 1
                      ? () => context.read<CartCubit>().updateItemQuantity(
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity - 1,
                          )
                      : null,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    '${item.quantity}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                _quantityButton(
                  icon: Icons.add,
                  onTap: () => context.read<CartCubit>().updateItemQuantity(
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity + 1,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _quantityButton({required IconData icon, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 16, color: onTap != null ? Colors.black : Colors.grey),
      ),
    );
  }
}
