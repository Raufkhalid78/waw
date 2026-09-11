import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/settings_cubit.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: BlocBuilder<SettingsCubit, SettingsState>(
        builder: (context, state) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Theme Section
              _buildSectionHeader(context, 'Appearance'),
              _buildSettingTile(
                context,
                icon: Icons.dark_mode_outlined,
                title: 'Theme',
                subtitle: _getThemeLabel(state.themeMode),
                onTap: () => _showThemeDialog(context, state.themeMode),
              ),
              const Divider(height: 1),

              // Language Section
              _buildSectionHeader(context, 'Language'),
              _buildSettingTile(
                context,
                icon: Icons.language,
                title: 'Language',
                subtitle: state.locale.languageCode == 'en' ? 'English' : 'اردو',
                onTap: () => _showLanguageDialog(context, state.locale.languageCode),
              ),
              const Divider(height: 1),

              // About Section
              _buildSectionHeader(context, 'About'),
              _buildSettingTile(
                context,
                icon: Icons.info_outline,
                title: 'App Version',
                subtitle: '1.0.0',
                onTap: null,
              ),
              _buildSettingTile(
                context,
                icon: Icons.help_outline,
                title: 'Help & Support',
                subtitle: 'Contact us on WhatsApp',
                onTap: () {
                  // TODO: Open WhatsApp support
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 24, bottom: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildSettingTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
      onTap: onTap,
    );
  }

  String _getThemeLabel(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }

  void _showThemeDialog(BuildContext context, ThemeMode current) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Theme'),
        content: RadioGroup<ThemeMode>(
          groupValue: current,
          onChanged: (v) {
            context.read<SettingsCubit>().setThemeMode(v!);
            Navigator.pop(ctx);
          },
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              RadioListTile<ThemeMode>(
                title: Text('Light'),
                value: ThemeMode.light,
              ),
              RadioListTile<ThemeMode>(
                title: Text('Dark'),
                value: ThemeMode.dark,
              ),
              RadioListTile<ThemeMode>(
                title: Text('System'),
                value: ThemeMode.system,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context, String current) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Language'),
        content: RadioGroup<String>(
          groupValue: current,
          onChanged: (v) {
            context.read<SettingsCubit>().setLanguage(v!);
            Navigator.pop(ctx);
          },
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              RadioListTile<String>(
                title: Text('English'),
                value: 'en',
              ),
              RadioListTile<String>(
                title: Text('اردو'),
                value: 'ur',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
