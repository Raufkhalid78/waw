import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/models.dart';
import '../../repositories/product_repository.dart';

// States
abstract class ProductState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProductInitial extends ProductState {}

class ProductLoading extends ProductState {}

class ProductLoaded extends ProductState {
  final List<Product> products;
  final bool hasMore;
  final int page;
  ProductLoaded({
    required this.products,
    this.hasMore = true,
    this.page = 1,
  });
  @override
  List<Object?> get props => [products, hasMore, page];
}

class ProductError extends ProductState {
  final String message;
  ProductError(this.message);
  @override
  List<Object?> get props => [message];
}

class ProductDetailLoaded extends ProductState {
  final Product product;
  ProductDetailLoaded(this.product);
  @override
  List<Object?> get props => [product];
}

// Events
abstract class ProductEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadProducts extends ProductEvent {
  final String? categoryId;
  final String? search;
  final String? sort;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  LoadProducts({
    this.categoryId,
    this.search,
    this.sort,
    this.minPrice,
    this.maxPrice,
    this.minRating,
  });
  @override
  List<Object?> get props => [categoryId, search, sort, minPrice, maxPrice, minRating];
}

class LoadMoreProducts extends ProductEvent {}

// Cubit
class ProductCubit extends Cubit<ProductState> {
  final ProductRepository _repo;
  String? _categoryId;
  String? _search;
  String? _sort;
  double? _minPrice;
  double? _maxPrice;
  double? _minRating;

  ProductCubit(this._repo) : super(ProductInitial());

  Future<void> loadProducts({
    String? categoryId,
    String? search,
    String? sort,
    double? minPrice,
    double? maxPrice,
    double? minRating,
  }) async {
    _categoryId = categoryId;
    _search = search;
    _sort = sort;
    _minPrice = minPrice;
    _maxPrice = maxPrice;
    _minRating = minRating;

    emit(ProductLoading());
    try {
      final products = await _repo.getProducts(
        categoryId: categoryId,
        search: search,
        sort: sort,
        minPrice: minPrice,
        maxPrice: maxPrice,
        minRating: minRating,
      );
      emit(ProductLoaded(
        products: products,
        hasMore: products.length >= 20,
        page: 1,
      ));
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! ProductLoaded || !current.hasMore) return;

    try {
      final products = await _repo.getProducts(
        categoryId: _categoryId,
        search: _search,
        sort: _sort,
        minPrice: _minPrice,
        maxPrice: _maxPrice,
        minRating: _minRating,
        page: current.page + 1,
      );
      emit(ProductLoaded(
        products: [...current.products, ...products],
        hasMore: products.length >= 20,
        page: current.page + 1,
      ));
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }

  Future<void> loadProductBySlug(String slug) async {
    emit(ProductLoading());
    try {
      final product = await _repo.getProductBySlug(slug);
      if (product != null) {
        emit(ProductDetailLoaded(product));
      } else {
        emit(ProductError('Product not found'));
      }
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }
}
