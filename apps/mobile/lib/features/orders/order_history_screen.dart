import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/order_cubit.dart';
import '../../models/models.dart';
import '../../core/enums/enums.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    context.read<OrderCubit>().loadOrders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'My Orders',
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

          if (state is OrdersLoaded) {
            if (state.orders.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long, size: 80, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    const Text(
                      'No orders yet',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your orders will appear here',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  ],
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = state.orders[index];
                return _OrderCard(order: order);
              },
            );
          }

          return const Center(child: Text('Something went wrong'));
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(order.orderStatus);

    return GestureDetector(
      onTap: () {
        Navigator.of(context).pushNamed('/order-detail', arguments: order.id);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  order.orderNumber,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: Color(0xFFF59E0B),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    order.orderStatus.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${order.items.length} item(s) - PKR ${order.totalAmountPkr.round()}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              order.shippingCity,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
            if (order.createdAt != null)
              Text(
                _formatDate(order.createdAt!),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
              ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return const Color(0xFF10B981);
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return const Color(0xFF3B82F6);
      case OrderStatus.cancelled:
      case OrderStatus.returned:
        return Colors.red;
      case OrderStatus.returnRequested:
        return const Color(0xFFF59E0B);
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
