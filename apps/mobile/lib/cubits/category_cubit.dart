import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/models.dart';
import '../../repositories/category_repository.dart';

// States
abstract class CategoryState extends Equatable {
  @override
  List<Object?> get props => [];
}

class CategoryInitial extends CategoryState {}

class CategoryLoading extends CategoryState {}

class CategoryLoaded extends CategoryState {
  final List<Category> categories;
  CategoryLoaded(this.categories);
  @override
  List<Object?> get props => [categories];
}

class CategoryError extends CategoryState {
  final String message;
  CategoryError(this.message);
  @override
  List<Object?> get props => [message];
}

// Cubit
class CategoryCubit extends Cubit<CategoryState> {
  final CategoryRepository _repo;

  CategoryCubit(this._repo) : super(CategoryInitial());

  Future<void> loadCategories() async {
    emit(CategoryLoading());
    try {
      final categories = await _repo.getCategories();
      emit(CategoryLoaded(categories));
    } catch (e) {
      emit(CategoryError(e.toString()));
    }
  }
}
