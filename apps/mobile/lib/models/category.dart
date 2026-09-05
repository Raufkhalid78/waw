class Category {
  final String id;
  final String name;
  final String? nameUrdu;
  final String slug;
  final String? description;
  final String? parentId;
  final String? imageUrl;
  final bool isActive;
  final List<Category> children;

  Category({
    required this.id,
    required this.name,
    this.nameUrdu,
    required this.slug,
    this.description,
    this.parentId,
    this.imageUrl,
    this.isActive = true,
    this.children = const [],
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      nameUrdu: json['name_urdu'],
      slug: json['slug'] ?? '',
      description: json['description'],
      parentId: json['parent_id'],
      imageUrl: json['image_url'],
      isActive: json['is_active'] ?? true,
      children: (json['children'] as List<dynamic>?)
              ?.map((c) => Category.fromJson(c))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'name_urdu': nameUrdu,
      'slug': slug,
      'description': description,
      'parent_id': parentId,
      'image_url': imageUrl,
      'is_active': isActive,
    };
  }
}
