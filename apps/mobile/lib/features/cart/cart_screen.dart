import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../cubits/cart_cubit.dart';
import '../../models/models.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: scheme.surface,
        elevation: 0,
        title: Text(
          'My Cart',
          style: TextStyle(color: scheme.onSurface, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: scheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocBuilder<CartCubit, CartState>(
        builder: (context, state) {
          if (state is CartLoading) {
            return Center(
              child: CircularProgressIndicator(color: scheme.primary),
            );
          }

          if (state is CartLoaded) {
            final cart = state.cart;
            if (cart.items.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shopping_bag_outlined, size: 80, color: scheme.outline),
                    const SizedBox(height: 16),
                    const Text(
                      'Your cart is empty',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Add items to get started',
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
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
                    separatorBuilder: (_, __) => Divider(color: scheme.outlineVariant),
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
                    color: scheme.surface,
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
                            style: TextStyle(color: scheme.onSurfaceVariant),
                          ),
                          Text(
                            'PKR ${cart.subtotalPkr.round()}',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: scheme.onSurface,
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
                              : scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).pushNamed('/checkout');
                          },
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
    final scheme = Theme.of(context).colorScheme;
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
                        color: scheme.surfaceContainerHighest,
                        child: Icon(Icons.image, color: scheme.outline),
                      ),
                    )
                  : Container(
                      color: scheme.surfaceContainerHighest,
                      child: Icon(Icons.image, color: scheme.outline),
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
                    style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
                  ),
                const SizedBox(height: 4),
                Text(
                  'PKR ${item.unitPricePkr.round()}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: scheme.onSurface,
                  ),
                ),
              ],
            ),
          ),

          // Quantity Controls
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _quantityButton(
                  context: context,
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
                  context: context,
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

  Widget _quantityButton({required BuildContext context, required IconData icon, VoidCallback? onTap}) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(
          icon,
          size: 16,
          color: onTap != null ? scheme.onSurface : scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
