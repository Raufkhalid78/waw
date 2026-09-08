import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mocktail/mocktail.dart';
import 'package:waw_mobile/core/storage/secure_token_storage.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockFlutterSecureStorage mockStorage;
  late SecureTokenStorage tokenStorage;
  final written = <String, String>{};

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    written.clear();

    when(() => mockStorage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        )).thenAnswer((inv) async {
      written[inv.namedArguments[#key] as String] =
          inv.namedArguments[#value] as String;
    });
    when(() => mockStorage.read(key: any(named: 'key')))
        .thenAnswer((inv) async => written[inv.namedArguments[#key] as String]);
    when(() => mockStorage.deleteAll()).thenAnswer((_) async {
      written.clear();
    });

    tokenStorage = SecureTokenStorage(storage: mockStorage);
  });

  group('SecureTokenStorage', () {
    test('saveTokens persists access token and optional fields', () async {
      await tokenStorage.saveTokens(
        accessToken: 'at_123',
        refreshToken: 'rt_456',
        userId: 'usr_789',
      );

      expect(await tokenStorage.getAccessToken(), 'at_123');
      expect(await tokenStorage.getRefreshToken(), 'rt_456');
      expect(await tokenStorage.getUserId(), 'usr_789');
      expect(await tokenStorage.hasToken(), isTrue);
    });

    test('saveTokens without refresh/user leaves those fields absent', () async {
      await tokenStorage.saveTokens(accessToken: 'only_at');

      expect(await tokenStorage.getAccessToken(), 'only_at');
      expect(await tokenStorage.getRefreshToken(), isNull);
      expect(await tokenStorage.getUserId(), isNull);
    });

    test('hasToken is false when nothing stored', () async {
      expect(await tokenStorage.hasToken(), isFalse);
    });

    test('hasToken is false for an empty-string token', () async {
      await tokenStorage.saveTokens(accessToken: '');
      expect(await tokenStorage.hasToken(), isFalse);
    });

    test('clearAll removes every stored token', () async {
      await tokenStorage.saveTokens(
        accessToken: 'at',
        refreshToken: 'rt',
        userId: 'u',
      );
      await tokenStorage.clearAll();

      expect(await tokenStorage.getAccessToken(), isNull);
      expect(await tokenStorage.getRefreshToken(), isNull);
      expect(await tokenStorage.getUserId(), isNull);
      expect(await tokenStorage.hasToken(), isFalse);
    });
  });
}
