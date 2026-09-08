import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'package:waw_mobile/cubits/settings_cubit.dart';

void main() {
  group('SettingsCubit — persisted theme + language', () {
    test('loads stored theme and language on construction', () async {
      SharedPreferences.setMockInitialValues({
        'theme_mode': ThemeMode.dark.index,
        'language': 'ur',
      });
      final prefs = await SharedPreferences.getInstance();

      final cubit = SettingsCubit(prefs);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.themeMode, ThemeMode.dark);
      expect(cubit.state.locale.languageCode, 'ur');
      await cubit.close();
    });

    test('defaults to system theme and English', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final cubit = SettingsCubit(prefs);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.state.themeMode, ThemeMode.system);
      expect(cubit.state.locale.languageCode, 'en');
      await cubit.close();
    });

    test('setThemeMode persists and emits new state', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final cubit = SettingsCubit(prefs);
      await Future<void>.delayed(Duration.zero);

      await cubit.setThemeMode(ThemeMode.dark);

      expect(cubit.state.themeMode, ThemeMode.dark);
      expect(prefs.getInt('theme_mode'), ThemeMode.dark.index);
      await cubit.close();
    });

    test('setLanguage toggles between en and ur', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final cubit = SettingsCubit(prefs);
      await Future<void>.delayed(Duration.zero);

      await cubit.setLanguage('ur');
      expect(cubit.state.locale.languageCode, 'ur');
      expect(prefs.getString('language'), 'ur');

      await cubit.setLanguage('en');
      expect(cubit.state.locale.languageCode, 'en');
      await cubit.close();
    });
  });
}
