import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:waw_mobile/core/network/api_client.dart';
import 'package:waw_mobile/core/constants/api_constants.dart';
import 'package:waw_mobile/core/enums/enums.dart';
import 'package:waw_mobile/repositories/auth_repository.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late AuthRepository repo;

  setUp(() {
    mockDio = MockDio();
    repo = AuthRepository(ApiClient.forTest(mockDio));
  });

  group('AuthRepository.verifyOtp — mobile/API token contract', () {
    test('exchanges WAW identity JWT for a session via /session/create', () async {
      // /whatsapp-otp/verify returns { token, user } (WAW JWT)
      when(() => mockDio.post(ApiConstants.verifyOtp, data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                requestOptions: RequestOptions(path: ApiConstants.verifyOtp),
                statusCode: 200,
                data: {
                  'token': 'waw_jwt',
                  'user': {'id': 'usr_1'},
                },
              ));

      // /session/create returns the access/refresh pair for non-cookie clients
      when(() => mockDio.post(ApiConstants.createSession,
              data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                requestOptions: RequestOptions(path: ApiConstants.createSession),
                statusCode: 200,
                data: {
                  'success': true,
                  'accessToken': 'sess_at',
                  'refreshToken': 'sess_rt',
                  'user': {'id': 'usr_1'},
                },
              ));

      final identity = await repo.verifyOtp('+923001234567', '1234');
      expect(identity['token'], 'waw_jwt');

      final session = await repo.createSession(
        userId: 'usr_1',
        authToken: identity['token'] as String,
      );
      expect(session['accessToken'], 'sess_at');
      expect(session['refreshToken'], 'sess_rt');
    });

    test('session/create sends userId + authToken body fields', () async {
      when(() => mockDio.post(ApiConstants.createSession,
              data: any(named: 'data')))
          .thenAnswer((_) async => Response(
                requestOptions: RequestOptions(path: ApiConstants.createSession),
                statusCode: 200,
                data: {'success': true},
              ));

      await repo.createSession(userId: 'usr_9', authToken: 'tok');

      final captured = verify(() => mockDio.post(ApiConstants.createSession,
              data: captureAny(named: 'data')))
          .captured
          .first as Map<String, dynamic>;
      expect(captured['userId'], 'usr_9');
      expect(captured['authToken'], 'tok');
    });

    test('Dio errors are converted to ApiError', () async {
      when(() => mockDio.post(ApiConstants.createSession,
              data: any(named: 'data')))
          .thenThrow(DioException(
        requestOptions: RequestOptions(path: ApiConstants.createSession),
        response: Response(
          requestOptions: RequestOptions(path: ApiConstants.createSession),
          statusCode: 401,
          data: {'error': 'Invalid authentication token'},
        ),
      ));

      expect(
        () => repo.createSession(userId: 'u', authToken: 'bad'),
        throwsA(isA<ApiError>().having((e) => e.message, 'message',
            'Invalid authentication token')),
      );
    });
  });

  group('AuthRepository.getCurrentProfile — response shape', () {
    test('unwraps the { user: {...} } envelope from /session/me', () async {
      when(() => mockDio.get(ApiConstants.currentProfile))
          .thenAnswer((_) async => Response(
                requestOptions: RequestOptions(path: ApiConstants.currentProfile),
                statusCode: 200,
                data: {
                  'user': {
                    'id': 'usr_1',
                    'phone': '+923001234567',
                    'role': 'SELLER',
                  }
                },
              ));

      final user = await repo.getCurrentProfile();
      expect(user, isNotNull);
      expect(user!.id, 'usr_1');
      expect(user.phone, '+923001234567');
      expect(user.role, UserRole.seller);
    });

    test('returns null on 401 (expired session)', () async {
      when(() => mockDio.get(ApiConstants.currentProfile)).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: ApiConstants.currentProfile),
          response: Response(
            requestOptions: RequestOptions(path: ApiConstants.currentProfile),
            statusCode: 401,
          ),
        ),
      );
      expect(await repo.getCurrentProfile(), isNull);
    });
  });
}
