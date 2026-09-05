import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_token_storage.dart';
import '../../models/models.dart';
import '../../repositories/auth_repository.dart';

// States
abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthOtpSent extends AuthState {
  final String phone;
  AuthOtpSent(this.phone);
  @override
  List<Object?> get props => [phone];
}

class AuthAuthenticated extends AuthState {
  final User user;
  AuthAuthenticated(this.user);
  @override
  List<Object?> get props => [user];
}

class AuthUnauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
  @override
  List<Object?> get props => [message];
}

// Cubit
class AuthCubit extends Cubit<AuthState> {
  final AuthRepository _authRepo;
  final ApiClient _apiClient;
  final SecureTokenStorage _tokenStorage;

  AuthCubit({
    required AuthRepository authRepo,
    required ApiClient apiClient,
    SecureTokenStorage? tokenStorage,
  })  : _authRepo = authRepo,
        _apiClient = apiClient,
        _tokenStorage = tokenStorage ?? SecureTokenStorage(),
        super(AuthInitial());

  String? _pendingPhone;

  Future<void> checkAuthStatus() async {
    emit(AuthLoading());
    try {
      final hasToken = await _tokenStorage.hasToken();
      if (!hasToken) {
        emit(AuthUnauthenticated());
        return;
      }

      final user = await _authRepo.getCurrentProfile();
      if (user != null) {
        emit(AuthAuthenticated(user));
      } else {
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> sendOtp(String phone) async {
    emit(AuthLoading());
    try {
      await _authRepo.sendOtp(phone);
      _pendingPhone = phone;
      emit(AuthOtpSent(phone));
    } on ApiError catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('Failed to send OTP. Please try again.'));
    }
  }

  Future<void> verifyOtp(String otp) async {
    if (_pendingPhone == null) {
      emit(AuthError('No pending phone number'));
      return;
    }

    emit(AuthLoading());
    try {
      final result = await _authRepo.verifyOtp(_pendingPhone!, otp);

      final accessToken = result['accessToken'] ?? result['access_token'];
      final refreshToken = result['refreshToken'] ?? result['refresh_token'];
      final userId = result['userId'] ?? result['user_id'] ?? result['user']?['id'];

      if (accessToken != null) {
        await _tokenStorage.saveTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
          userId: userId,
        );
        _apiClient.setAuthHeader(accessToken);
      }

      final user = await _authRepo.getCurrentProfile();
      if (user != null) {
        emit(AuthAuthenticated(user));
      } else {
        emit(AuthError('Failed to load profile'));
      }
    } on ApiError catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('Verification failed. Please try again.'));
    }
  }

  Future<void> logout() async {
    await _authRepo.logout();
    await _tokenStorage.clearAll();
    _apiClient.clearAuthHeader();
    emit(AuthUnauthenticated());
  }
}
