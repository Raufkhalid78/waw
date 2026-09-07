import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsState {
  final ThemeMode themeMode;
  final Locale locale;

  const SettingsState({
    this.themeMode = ThemeMode.system,
    this.locale = const Locale('en'),
  });

  SettingsState copyWith({
    ThemeMode? themeMode,
    Locale? locale,
  }) {
    return SettingsState(
      themeMode: themeMode ?? this.themeMode,
      locale: locale ?? this.locale,
    );
  }
}

class SettingsCubit extends Cubit<SettingsState> {
  final SharedPreferences _prefs;

  SettingsCubit(this._prefs) : super(const SettingsState()) {
    _loadSettings();
  }

  void _loadSettings() {
    final themeIndex = _prefs.getInt('theme_mode') ?? 0;
    final languageCode = _prefs.getString('language') ?? 'en';

    emit(SettingsState(
      themeMode: ThemeMode.values[themeIndex],
      locale: Locale(languageCode),
    ));
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    await _prefs.setInt('theme_mode', mode.index);
    emit(state.copyWith(themeMode: mode));
  }

  Future<void> setLanguage(String code) async {
    await _prefs.setString('language', code);
    emit(state.copyWith(locale: Locale(code)));
  }

  Future<void> toggleTheme() async {
    final next = state.themeMode == ThemeMode.dark
        ? ThemeMode.light
        : state.themeMode == ThemeMode.light
            ? ThemeMode.system
            : ThemeMode.dark;
    await setThemeMode(next);
  }

  Future<void> toggleLanguage() async {
    final next = state.locale.languageCode == 'en' ? 'ur' : 'en';
    await setLanguage(next);
  }
}
