import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/auth_cubit.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: BlocListener<AuthCubit, AuthState>(
          listener: (context, state) {
            if (state is AuthOtpSent) {
              setState(() => _otpSent = true);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('OTP sent! Check your WhatsApp.'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            } else if (state is AuthAuthenticated) {
              Navigator.of(context).pushReplacementNamed('/');
            } else if (state is AuthError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                // Logo
                Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Center(
                      child: Text(
                        'W',
                        style: TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'waw',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const Text(
                  'Pakistan\'s Marketplace',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 48),

                if (!_otpSent) ...[
                  const Text(
                    'Enter your phone number',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'We\'ll send a verification code via WhatsApp',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          '+92',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(fontSize: 16),
                          decoration: InputDecoration(
                            hintText: '3XXXXXXXXX',
                            hintStyle: TextStyle(color: Colors.grey.shade400),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  BlocBuilder<AuthCubit, AuthState>(
                    builder: (context, state) {
                      return ElevatedButton(
                        onPressed: state is AuthLoading
                            ? null
                            : () {
                                final phone = _phoneController.text.trim();
                                if (phone.length >= 10) {
                                  context.read<AuthCubit>().sendOtp('+92$phone');
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: state is AuthLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Send OTP',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      );
                    },
                  ),
                ] else ...[
                  const Text(
                    'Enter verification code',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Code sent to +92${_phoneController.text}',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLength: 6,
                    decoration: InputDecoration(
                      hintText: '------',
                      hintStyle: TextStyle(
                        color: Colors.grey.shade300,
                        letterSpacing: 8,
                      ),
                      counterText: '',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  BlocBuilder<AuthCubit, AuthState>(
                    builder: (context, state) {
                      return ElevatedButton(
                        onPressed: state is AuthLoading
                            ? null
                            : () {
                                final otp = _otpController.text.trim();
                                if (otp.length >= 4) {
                                  context.read<AuthCubit>().verifyOtp(otp);
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: state is AuthLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Verify',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => setState(() => _otpSent = false),
                    child: const Text('Change phone number'),
                  ),
                ],
                const Spacer(),
                Text(
                  'By continuing, you agree to our Terms of Service',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
