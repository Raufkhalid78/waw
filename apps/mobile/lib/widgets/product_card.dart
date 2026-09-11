import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ProductCard extends StatelessWidget {
  final String title;
  final String? titleUrdu;
  final String? imageUrl;
  final double price;
  final double? comparePrice;
  final int? ratingCount;
  final double? ratingAverage;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;
  final bool showStoreName;
  final String? storeName;

  const ProductCard({
    super.key,
    required this.title,
    this.titleUrdu,
    this.imageUrl,
    required this.price,
    this.comparePrice,
    this.ratingCount,
    this.ratingAverage,
    this.onTap,
    this.onAddToCart,
    this.showStoreName = false,
    this.storeName,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final discount = comparePrice != null && comparePrice! > 0
        ? ((comparePrice! - price) / comparePrice! * 100).round()
        : 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: scheme.outlineVariant),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(12),
                    ),
                    child: imageUrl != null && imageUrl!.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(
                              color: scheme.surfaceContainerHighest,
                              child: Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: scheme.primary,
                                ),
                              ),
                            ),
                            errorWidget: (_, __, ___) => Container(
                              color: scheme.surfaceContainerHighest,
                              child: Icon(Icons.image_outlined, color: scheme.outline),
                            ),
                          )
                        : Container(
                            color: scheme.surfaceContainerHighest,
                            child: Icon(Icons.image_outlined, color: scheme.outline),
                          ),
                  ),
                ),
                if (discount > 0)
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red.shade500,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '-$discount%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                      color: scheme.onSurface,
                    ),
                  ),
                  if (titleUrdu != null && titleUrdu!.isNotEmpty)
                    Text(
                      titleUrdu!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'PKR ${price.round()}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: scheme.onSurface,
                        ),
                      ),
                      if (comparePrice != null && comparePrice! > price) ...[
                        const SizedBox(width: 4),
                        Text(
                          'PKR ${comparePrice!.round()}',
                          style: TextStyle(
                            fontSize: 10,
                            color: scheme.onSurfaceVariant,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (ratingCount != null && ratingCount! > 0)
                    Row(
                      children: [
                        const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 2),
                        Text(
                          '${ratingAverage?.toStringAsFixed(1) ?? "-"} ($ratingCount)',
                          style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  if (showStoreName && storeName != null)
                    Text(
                      storeName!,
                      style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),

            // Add to cart
            if (onAddToCart != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                child: SizedBox(
                  width: double.infinity,
                  height: 32,
                  child: ElevatedButton(
                    onPressed: onAddToCart,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: scheme.primary,
                      foregroundColor: scheme.onPrimary,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Add to Cart',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
