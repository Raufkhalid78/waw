import '../core/enums/enums.dart';

class User {
  final String id;
  final String? phone;
  final String? fullName;
  final String? email;
  final UserRole role;
  final String? avatarUrl;
  final DateTime? createdAt;

  User({
    required this.id,
    this.phone,
    this.fullName,
    this.email,
    this.role = UserRole.buyer,
    this.avatarUrl,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      phone: json['phone'],
      fullName: json['full_name'] ?? json['fullName'],
      email: json['email'],
      role: _parseRole(json['role']),
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
    );
  }

  static UserRole _parseRole(String? role) {
    switch (role) {
      case 'SELLER':
        return UserRole.seller;
      case 'ADMIN':
        return UserRole.admin;
      default:
        return UserRole.buyer;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'full_name': fullName,
      'email': email,
      'role': role.name.toUpperCase(),
      'avatar_url': avatarUrl,
    };
  }

  User copyWith({
    String? fullName,
    String? email,
    String? avatarUrl,
  }) {
    return User(
      id: id,
      phone: phone,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      role: role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt,
    );
  }
}
