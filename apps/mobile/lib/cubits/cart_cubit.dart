import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/models.dart';
import '../../repositories/cart_repository.dart';

// States
abstract class CartState extends Equatable {
  @override
  List<Object?> get props => [];
}

class CartInitial extends CartState {}

class CartLoading extends CartState {}

class CartLoaded extends CartState {
  final Cart cart;
  CartLoaded(this.cart);
  @override
  List<Object?> get props => [cart];
}

class CartError extends CartState {
  final String message;
  CartError(this.message);
  @override
  List<Object?> get props => [message];
}

// Cubit
class CartCubit extends Cubit<CartState> {
  final CartRepository _repo;

  CartCubit(this._repo) : super(CartInitial());

  Cart get _currentCart =>
      state is CartLoaded ? (state as CartLoaded).cart : Cart();

  Future<void> loadCart() async {
    emit(CartLoading());
    try {
      final cart = await _repo.getCart();
      emit(CartLoaded(cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> addItem({
    required String productId,
    String? variantId,
    int quantity = 1,
    String? storeId,
  }) async {
    try {
      final cart = await _repo.addItem(
        productId: productId,
        variantId: variantId,
        quantity: quantity,
        storeId: storeId,
      );
      emit(CartLoaded(cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> updateItemQuantity({
    required String productId,
    String? variantId,
    required int quantity,
  }) async {
    try {
      final cart = await _repo.updateItem(
        productId: productId,
        variantId: variantId,
        quantity: quantity,
      );
      emit(CartLoaded(cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> removeItem(String productId, {String? variantId}) async {
    try {
      await _repo.removeItem(productId, variantId: variantId);
      final cart = _currentCart;
      final newItems = cart.items
          .where((i) => i.productId != productId || i.variantId != variantId)
          .toList();
      emit(CartLoaded(cart.copyWith(items: newItems)));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> clearCart() async {
    try {
      await _repo.clearCart();
      emit(CartLoaded(Cart()));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }
}
