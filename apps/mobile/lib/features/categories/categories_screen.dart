import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/category_cubit.dart';
import '../../models/category.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: scheme.surface,
        elevation: 0,
        title: Text(
          'Categories',
          style: TextStyle(
            color: scheme.onSurface,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: BlocBuilder<CategoryCubit, CategoryState>(
        builder: (context, state) {
          if (state is CategoryLoading) {
            return Center(
              child: CircularProgressIndicator(color: scheme.primary),
            );
          }

          if (state is CategoryLoaded) {
            final categories = state.categories;
            if (categories.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.category_outlined, size: 64, color: scheme.outline),
                    const SizedBox(height: 16),
                    Text(
                      'No categories available',
                      style: TextStyle(fontSize: 16, color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              );
            }

            return GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 0.85,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: categories.length,
              itemBuilder: (context, index) {
                final cat = categories[index];
                return _CategoryCard(category: cat);
              },
            );
          }

          if (state is CategoryError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: scheme.error),
                  const SizedBox(height: 16),
                  Text(
                    state.message,
                    style: TextStyle(color: scheme.onSurfaceVariant),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => context.read<CategoryCubit>().loadCategories(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: scheme.primary,
                      foregroundColor: scheme.onPrimary,
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
}

class _CategoryCard extends StatelessWidget {
  final Category category;
  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: () {
        Navigator.of(context).pushNamed(
          '/products',
          arguments: {
            'categoryId': category.id,
            'categoryName': category.name,
          },
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: scheme.outlineVariant),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: scheme.secondaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: category.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        category.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Icon(
                          Icons.category,
                          color: scheme.primary,
                        ),
                      ),
                    )
                  : Icon(Icons.category, color: scheme.primary),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                category.name,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurface,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (category.nameUrdu != null && category.nameUrdu!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  category.nameUrdu!,
                  style: TextStyle(
                    fontSize: 10,
                    color: scheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
