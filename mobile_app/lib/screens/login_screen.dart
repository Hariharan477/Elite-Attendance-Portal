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
  static const _lightGreen = Color(0xFFDDF5E8);
  static const _paleGreen = Color(0xFFEEF9F2);
  static const _textPrimary = Color(0xFF10231A);
  static const _textSecondary = Color(0xFF66756D);
  static const _borderSubtle = Color(0xFFE2EFE7);
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
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── OFFICIAL BRAND LOGO ──
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: _paleGreen,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: _lightGreen,
                      width: 1.5,
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x0A0B8F55),
                        blurRadius: 16,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // ── TITLE & SUBTITLE ──
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'Elite ',
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      TextSpan(
                        text: 'Class Portal',
                        style: GoogleFonts.inter(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: _primaryGreen,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Smart Attendance Management System',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: _textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 36),

                // ── LOGIN CARD ──
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: _cardColor,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: _borderSubtle, width: 1),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x0C0B8F55),
                        blurRadius: 24,
                        offset: Offset(0, 8),
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
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Error message banner
                      if (_errorMessage != null) ...[
                        _buildErrorCard(_errorMessage!),
                        const SizedBox(height: 20),
                      ],

                      // Clean White Google Sign-In CTA Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton(
                          onPressed: _isLoading ? null : _handleGoogleSignIn,
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: _textPrimary,
                            side: const BorderSide(color: _borderSubtle, width: 1.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                            shadowColor: Colors.black.withValues(alpha: 0.05),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    color: _primaryGreen,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const GoogleLogoWidget(size: 22),
                                    const SizedBox(width: 12),
                                    Text(
                                      'Continue with Google',
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: _textPrimary,
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

                // ── SECURITY FOOTER NOTE ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.shield_outlined,
                      size: 16,
                      color: _primaryGreen,
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Secure attendance with account, device & campus Wi-Fi verification.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
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

/// Authentic multi-colored Google vector 'G' logo widget.
class GoogleLogoWidget extends StatelessWidget {
  final double size;
  const GoogleLogoWidget({super.key, this.size = 22.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 24.0;
    canvas.scale(scale, scale);

    // Blue Path (#4285F4)
    final paintBlue = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    final pathBlue = Path()
      ..moveTo(23.49, 12.28)
      ..cubicTo(23.49, 11.49, 23.42, 10.74, 23.3, 10.0)
      ..lineTo(12.0, 10.0)
      ..lineTo(12.0, 14.51)
      ..lineTo(18.47, 14.51)
      ..cubicTo(18.18, 15.99, 17.33, 17.24, 16.07, 18.09)
      ..lineTo(16.07, 21.09)
      ..lineTo(19.93, 21.09)
      ..cubicTo(22.19, 19.0, 23.49, 15.92, 23.49, 12.28)
      ..close();
    canvas.drawPath(pathBlue, paintBlue);

    // Green Path (#34A853)
    final paintGreen = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.fill;
    final pathGreen = Path()
      ..moveTo(12.0, 24.0)
      ..cubicTo(15.24, 24.0, 17.95, 22.92, 19.93, 21.09)
      ..lineTo(16.07, 18.09)
      ..cubicTo(14.99, 18.81, 13.62, 19.25, 12.0, 19.25)
      ..cubicTo(8.87, 19.25, 6.22, 17.14, 5.27, 14.29)
      ..lineTo(1.29, 14.29)
      ..lineTo(1.29, 17.38)
      ..cubicTo(3.26, 21.3, 7.31, 24.0, 12.0, 24.0)
      ..close();
    canvas.drawPath(pathGreen, paintGreen);

    // Yellow Path (#FBBC05)
    final paintYellow = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.fill;
    final pathYellow = Path()
      ..moveTo(5.27, 14.29)
      ..cubicTo(5.02, 13.57, 4.89, 12.8, 4.89, 12.0)
      ..cubicTo(4.89, 11.2, 5.02, 10.43, 5.27, 9.71)
      ..lineTo(5.27, 6.62)
      ..lineTo(1.29, 6.62)
      ..cubicTo(0.47, 8.24, 0.0, 10.06, 0.0, 12.0)
      ..cubicTo(0.0, 13.94, 0.47, 15.76, 1.29, 17.38)
      ..lineTo(5.27, 14.29)
      ..close();
    canvas.drawPath(pathYellow, paintYellow);

    // Red Path (#EA4335)
    final paintRed = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.fill;
    final pathRed = Path()
      ..moveTo(12.0, 4.75)
      ..cubicTo(13.77, 4.75, 15.35, 5.36, 16.6, 6.55)
      ..lineTo(20.02, 3.13)
      ..cubicTo(17.95, 1.19, 15.24, 0.0, 12.0, 0.0)
      ..cubicTo(7.31, 0.0, 3.26, 2.7, 1.29, 6.62)
      ..lineTo(5.27, 9.71)
      ..cubicTo(6.22, 6.86, 8.87, 4.75, 12.0, 4.75)
      ..close();
    canvas.drawPath(pathRed, paintRed);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

