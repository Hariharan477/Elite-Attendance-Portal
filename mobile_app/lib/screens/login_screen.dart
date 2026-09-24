import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../services/api_service.dart';
import '../services/device_id_service.dart';
import 'student_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: '1070262530859-pht01lmkpruduf57hsv3tnhla2p9tao0.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  );

  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  String? _errorMessage;

  // Colors matching Student Dashboard white + light-green theme
  static const _bgColor = Color(0xFFF7FBF8);
  static const _cardColor = Color(0xFFFFFFFF);
  static const _primaryGreen = Color(0xFF0B8F55);
  static const _paleGreen = Color(0xFFEEF9F2);
  static const _textPrimary = Color(0xFF10231A);
  static const _textSecondary = Color(0xFF66756D);
  static const _errorColor = Color(0xFFE05252);

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled sign in
        setState(() => _isLoading = false);
        return;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception("Failed to retrieve Google authentication token.");
      }

      // Obtain secure, persistent device identifier
      final String deviceId = await DeviceIdService.getDeviceId();

      // Send token and deviceId to backend API for verification and device binding
      await _apiService.loginWithGoogleToken(idToken, deviceId: deviceId);

      if (mounted) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const StudentDashboardScreen(),
            transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 350),
          ),
        );
      }
    } catch (e) {
      String rawMsg = e.toString().replaceAll("Exception: ", "").trim();
      String formattedMsg = rawMsg;

      if (rawMsg.contains('another student') || rawMsg.contains('already registered')) {
        formattedMsg = "This device is already registered to another student. Please contact your administrator to reset the device.";
      } else if (rawMsg.contains('not registered')) {
        formattedMsg = "Your account is not registered by the administrator.";
      }

      setState(() {
        _isLoading = false;
        _errorMessage = formattedMsg;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── LOGO ──
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: _paleGreen,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _primaryGreen.withValues(alpha: 0.2), width: 1.5),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.shield_rounded,
                      size: 38,
                      color: _primaryGreen,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // ── TITLE ──
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'Elite ',
                        style: GoogleFonts.inter(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          color: _textPrimary,
                        ),
                      ),
                      TextSpan(
                        text: 'Attendance',
                        style: GoogleFonts.inter(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: _primaryGreen,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Student Attendance Portal',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: _textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 32),

                // ── LOGIN CARD ──
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: _cardColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Welcome Back',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Sign in with your registered college Google account',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: _textSecondary,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Error message banner
                      if (_errorMessage != null) ...[
                        _buildErrorCard(_errorMessage!),
                        const SizedBox(height: 20),
                      ],

                      // Google Sign In CTA Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleGoogleSignIn,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _primaryGreen,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 2,
                            shadowColor: _primaryGreen.withValues(alpha: 0.3),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      width: 26,
                                      height: 26,
                                      decoration: const BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          'G',
                                          style: GoogleFonts.inter(
                                            color: _primaryGreen,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 15,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      'Continue with Google',
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // ── SECURITY NOTE ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shield_outlined, size: 14, color: _textSecondary.withValues(alpha: 0.8)),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'Secure attendance with account, device & campus Wi-Fi verification.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: _textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorCard(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFDEEEE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _errorColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: _errorColor,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: _errorColor,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
