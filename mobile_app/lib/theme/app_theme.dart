import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Color Palette
  static const Color primary = Color(0xFF4F46E5);      // Indigo 600
  static const Color primaryLight = Color(0xFF6366F1); // Indigo 500
  static const Color primaryDark = Color(0xFF3730A3);  // Indigo 800

  static const Color success = Color(0xFF10B981);      // Emerald 500
  static const Color warning = Color(0xFFF59E0B);      // Amber 500
  static const Color danger = Color(0xFFEF4444);       // Rose 500
  static const Color info = Color(0xFF3B82F6);         // Blue 500

  static const Color background = Color(0xFF0F172A);   // Slate 900
  static const Color cardBg = Color(0xFF1E293B);       // Slate 800
  static const Color surfaceBorder = Color(0xFF334155); // Slate 700

  static const Color textPrimary = Color(0xFFF8FAFC);  // Slate 50
  static const Color textSecondary = Color(0xFF94A3B8);// Slate 400
  static const Color textMuted = Color(0xFF64748B);    // Slate 500

  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: success,
        surface: cardBg,
        error: danger,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: textPrimary),
        headlineMedium: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: textPrimary),
        titleLarge: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: GoogleFonts.inter(fontSize: 15, color: textPrimary),
        bodyMedium: GoogleFonts.inter(fontSize: 13, color: textSecondary),
      ),
    );
  }
}
