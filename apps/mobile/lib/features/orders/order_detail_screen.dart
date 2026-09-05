import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/order_cubit.dart';
import '../../models/models.dart';
import '../../core/enums/enums.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  @override
  void initState() {
    super.initState();
    context.read<OrderCubit>().loadOrder(widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Order Details',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocBuilder<OrderCubit, OrderState>(
        builder: (context, state) {
          if (state is OrderLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            );
          }

          if (state is OrderDetailLoaded) {
            final order = state.order;
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: _statusGradient(order.orderStatus),
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Icon(_statusIcon(order.orderStatus), color: Colors.white, size: 40),
                        const SizedBox(height: 8),
                        Text(
                          order.orderStatus.label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          order.orderNumber,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Timeline
                  _buildSection('Order Timeline', Column(
                    children: _buildTimeline(order.orderStatus),
                  )),
                  const SizedBox(height: 16),

                  // Items
                  _buildSection('Items', Column(
                    children: order.items.map((item) => _buildOrderItem(item)).toList(),
                  )),
                  const SizedBox(height: 16),

                  // Payment Summary
                  _buildSection('Payment Summary', Column(
                    children: [
                      _summaryRow('Subtotal', 'PKR ${order.subtotalPkr.round()}'),
                      _summaryRow('Delivery', order.shippingFeePkr == 0 ? 'Free' : 'PKR ${order.shippingFeePkr.round()}'),
                      if (order.codFeePkr > 0)
                        _summaryRow('COD Fee', 'PKR ${order.codFeePkr.round()}'),
                      if (order.discountPkr > 0)
                        _summaryRow('Discount', '-PKR ${order.discountPkr.round()}'),
                      const Divider(),
                      _summaryRow('Total', 'PKR ${order.totalAmountPkr.round()}', isBold: true),
                    ],
                  )),
                  const SizedBox(height: 16),

                  // Delivery Address
                  _buildSection('Delivery Address', Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(order.buyerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(order.shippingAddress),
                      Text('${order.shippingCity}, ${order.shippingProvince}'),
                      Text(order.buyerPhone),
                    ],
                  )),

                  // Cancel button (only for pending/confirmed)
                  if (order.orderStatus == OrderStatus.pending ||
                      order.orderStatus == OrderStatus.confirmed) ...[
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () {
                          _showCancelDialog(context, order.id);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Cancel Order'),
                      ),
                    ),
                  ],

                  // Return button (only for delivered)
                  if (order.orderStatus == OrderStatus.delivered) ...[
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () {
                          _showReturnDialog(context, order.id);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.orange,
                          side: const BorderSide(color: Colors.orange),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Request Return'),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }

          if (state is OrderError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => context.read<OrderCubit>().loadOrder(widget.orderId),
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
    );
  }

  Widget _buildSection(String title, Widget child) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _buildOrderItem(OrderItem item) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                Text(
                  '${item.quantity} x PKR ${item.unitPricePkr.round()}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
          Text(
            'PKR ${item.totalPricePkr.round()}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: isBold ? 16 : 13, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontSize: isBold ? 16 : 13, fontWeight: isBold ? FontWeight.bold : FontWeight.w600)),
        ],
      ),
    );
  }

  List<Widget> _buildTimeline(OrderStatus status) {
    final steps = [
      ('Order Placed', Icons.check_circle, true),
      ('Confirmed', Icons.check_circle, status.index >= OrderStatus.confirmed.index),
      ('Processing', Icons.check_circle, status.index >= OrderStatus.processing.index),
      ('Shipped', Icons.local_shipping, status.index >= OrderStatus.shipped.index),
      ('Delivered', Icons.home, status.index >= OrderStatus.delivered.index),
    ];

    return steps.map((step) {
      return Row(
        children: [
          Icon(
            step.$2,
            size: 20,
            color: step.$3 ? const Color(0xFF10B981) : Colors.grey.shade300,
          ),
          const SizedBox(width: 12),
          Text(
            step.$1,
            style: TextStyle(
              fontSize: 14,
              fontWeight: step.$3 ? FontWeight.w600 : FontWeight.normal,
              color: step.$3 ? const Color(0xFF0F172A) : Colors.grey.shade400,
            ),
          ),
        ],
      );
    }).toList();
  }

  List<Color> _statusGradient(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return [const Color(0xFF10B981), const Color(0xFF059669)];
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return [const Color(0xFF3B82F6), const Color(0xFF2563EB)];
      case OrderStatus.cancelled:
        return [Colors.red.shade400, Colors.red.shade600];
      default:
        return [const Color(0xFFF59E0B), const Color(0xFFD97706)];
    }
  }

  IconData _statusIcon(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return Icons.check_circle;
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return Icons.local_shipping;
      case OrderStatus.cancelled:
        return Icons.cancel;
      default:
        return Icons.access_time;
    }
  }

  void _showCancelDialog(BuildContext context, String orderId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () {
              context.read<OrderCubit>().cancelOrder(orderId);
              Navigator.of(context).pop();
            },
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showReturnDialog(BuildContext context, String orderId) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request Return'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Please provide a reason for your return:'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                hintText: 'e.g., Wrong size, Defective item...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (reasonController.text.trim().isNotEmpty) {
                context.read<OrderCubit>().requestReturn(orderId, reasonController.text.trim());
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Return request submitted'),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Submit', style: TextStyle(color: Colors.orange)),
          ),
        ],
      ),
    );
  }
}
