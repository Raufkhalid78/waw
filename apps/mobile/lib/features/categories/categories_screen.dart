import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/category_cubit.dart';
import '../../models/category.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Categories',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: BlocBuilder<CategoryCubit, CategoryState>(
        builder: (context, state) {
          if (state is CategoryLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            );
          }

          if (state is CategoryLoaded) {
            final categories = state.categories;
            if (categories.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.category_outlined, size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    Text(
                      'No categories available',
                      style: TextStyle(fontSize: 16, color: Colors.grey.shade500),
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
                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    state.message,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => context.read<CategoryCubit>().loadCategories(),
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
}

class _CategoryCard extends StatelessWidget {
  final Category category;
  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade100),
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
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(16),
              ),
              child: category.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        category.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.category,
                          color: Color(0xFFF59E0B),
                        ),
                      ),
                    )
                  : const Icon(Icons.category, color: Color(0xFFF59E0B)),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                category.name,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
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
                    color: Colors.grey.shade500,
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
