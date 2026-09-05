import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/models.dart';
import '../../repositories/order_repository.dart';

// States
abstract class OrderState extends Equatable {
  @override
  List<Object?> get props => [];
}

class OrderInitial extends OrderState {}

class OrderLoading extends OrderState {}

class OrdersLoaded extends OrderState {
  final List<Order> orders;
  OrdersLoaded(this.orders);
  @override
  List<Object?> get props => [orders];
}

class OrderDetailLoaded extends OrderState {
  final Order order;
  OrderDetailLoaded(this.order);
  @override
  List<Object?> get props => [order];
}

class OrderCreated extends OrderState {
  final Order order;
  OrderCreated(this.order);
  @override
  List<Object?> get props => [order];
}

class OrderError extends OrderState {
  final String message;
  OrderError(this.message);
  @override
  List<Object?> get props => [message];
}

// Cubit
class OrderCubit extends Cubit<OrderState> {
  final OrderRepository _repo;

  OrderCubit(this._repo) : super(OrderInitial());

  Future<void> loadOrders() async {
    emit(OrderLoading());
    try {
      final orders = await _repo.getOrders();
      emit(OrdersLoaded(orders));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> loadOrder(String id) async {
    emit(OrderLoading());
    try {
      final order = await _repo.getOrder(id);
      if (order != null) {
        emit(OrderDetailLoaded(order));
      } else {
        emit(OrderError('Order not found'));
      }
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> createOrder({
    required String buyerName,
    required String buyerPhone,
    required String shippingAddress,
    required String shippingCity,
    required String shippingProvince,
    required String paymentMethod,
    String? couponCode,
    String? notes,
    List<Map<String, dynamic>>? items,
  }) async {
    emit(OrderLoading());
    try {
      final order = await _repo.createOrder(
        buyerName: buyerName,
        buyerPhone: buyerPhone,
        shippingAddress: shippingAddress,
        shippingCity: shippingCity,
        shippingProvince: shippingProvince,
        paymentMethod: paymentMethod,
        couponCode: couponCode,
        notes: notes,
        items: items,
      );
      emit(OrderCreated(order));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> cancelOrder(String id) async {
    try {
      await _repo.cancelOrder(id);
      await loadOrder(id);
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> requestReturn(String id, String reason) async {
    try {
      await _repo.requestReturn(id, reason);
      await loadOrder(id);
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }
}
