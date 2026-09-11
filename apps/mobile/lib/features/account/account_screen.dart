import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/auth_cubit.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

@override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surfaceContainerLow,
      appBar: AppBar(
        backgroundColor: scheme.surface,
        elevation: 0,
        title: Text(
          'Account',
          style: TextStyle(color: scheme.onSurface, fontWeight: FontWeight.bold),
        ),
      ),
      body: BlocBuilder<AuthCubit, AuthState>(
        builder: (context, state) {
          final user = state is AuthAuthenticated ? state.user : null;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Profile Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 40,
                        backgroundColor: scheme.surfaceContainerHighest,
                        child: Text(
                          (user?.fullName ?? 'U')[0].toUpperCase(),
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: scheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        user?.fullName ?? 'Guest User',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      if (user?.phone != null)
                        Text(
                          user!.phone!,
                          style: TextStyle(fontSize: 14, color: scheme.onSurfaceVariant),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Menu Items
                _buildMenuItem(
                  context: context, icon: Icons.receipt_long,
                  title: 'My Orders',
                  onTap: () => Navigator.of(context).pushNamed('/orders'),
                ),
                _buildMenuItem(
                  context: context, icon: Icons.favorite_outline,
                  title: 'Wishlist',
                  onTap: () {},
                ),
                _buildMenuItem(
                  context: context, icon: Icons.location_on_outlined,
                  title: 'Saved Addresses',
                  onTap: () {},
                ),
                _buildMenuItem(
                  context: context, icon: Icons.help_outline,
                  title: 'Help & Support',
                  onTap: () {},
                ),
                _buildMenuItem(
                  context: context, icon: Icons.settings_outlined,
                  title: 'Settings',
                  onTap: () => Navigator.of(context).pushNamed('/settings'),
                ),
                _buildMenuItem(
                  context: context, icon: Icons.info_outline,
                  title: 'About Waw',
                  onTap: () {},
                ),
                const SizedBox(height: 16),

                // Logout
                if (state is AuthAuthenticated)
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Sign Out'),
                            content: const Text('Are you sure you want to sign out?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(ctx).pop(),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () {
                                  Navigator.of(ctx).pop();
                                  context.read<AuthCubit>().logout();
                                  Navigator.of(context).pushReplacementNamed('/login');
                                },
                                child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
                              ),
                            ],
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Sign Out'),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pushNamed('/login'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Sign In'),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMenuItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    VoidCallback? onTap,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: ListTile(
        leading: Icon(icon, color: scheme.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
