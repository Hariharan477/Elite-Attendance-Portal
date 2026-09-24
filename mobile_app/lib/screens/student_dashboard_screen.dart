import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../services/wifi_service.dart';
import '../services/device_id_service.dart';
import 'login_screen.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  final ApiService _apiService = ApiService();
  final WifiService _wifiService = WifiService();
  static const _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
    resetOnError: true,
  );
  final _storage = const FlutterSecureStorage(aOptions: _androidOptions);

  Map<String, dynamic>? _user;
  Map<String, dynamic>? _settings;
  Map<String, dynamic>? _record;
  Map<String, dynamic>? _stats;
  bool _marked = false;
  int _secondsRemaining = 0;
  Timer? _timer;

  bool _isLoadingStatus = true;
  bool _isMarking = false;
  String? _statusMessage;
  bool _isSuccessMessage = false;

  String _currentPhoneSsid = 'Scanning...';

  // Colors
  static const _bgColor = Color(0xFFF7FBF8);
  static const _cardColor = Color(0xFFFFFFFF);
  static const _primaryGreen = Color(0xFF0B8F55);
  static const _lightGreen = Color(0xFFDDF5E8);
  static const _paleGreen = Color(0xFFEEF9F2);
  static const _textPrimary = Color(0xFF10231A);
  static const _textSecondary = Color(0xFF66756D);
  static const _successColor = Color(0xFF16A765);
  static const _warningColor = Color(0xFFE9A516);
  static const _errorColor = Color(0xFFE05252);

  @override
  void initState() {
    super.initState();
    _loadUserAndFetchStatus();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadUserAndFetchStatus() async {
    final userDataStr = await _storage.read(key: 'user_data');
    if (userDataStr != null) {
      setState(() {
        _user = jsonDecode(userDataStr);
      });
    }

    await _fetchTodayStatus();
    _scanWifi();
  }

  Future<void> _scanWifi() async {
    final wifiResult = await _wifiService.getConnectedWifiInfo();
    if (mounted) {
      setState(() {
        _currentPhoneSsid = wifiResult.ssid ?? 'Disconnected';
      });
    }
  }

  Future<void> _fetchTodayStatus() async {
    setState(() {
      _isLoadingStatus = true;
      _statusMessage = null;
    });

    try {
      final data = await _apiService.getStudentTodayStatus();
      if (!mounted) return;

      setState(() {
        _settings = data['settings'];
        _marked = data['marked'] ?? false;
        _record = data['record'];
        _stats = data['stats'];
        _isLoadingStatus = false;
      });

      if (_settings != null && _settings!['status'] == 'ACTIVE') {
        final startTimeStr = _settings!['startTime'];
        final endTimeStr = _settings!['endTime'];
        final now = DateTime.now();

        DateTime? startTime;
        DateTime? endTime;
        if (startTimeStr != null) {
          try {
            startTime = DateTime.parse(startTimeStr).toLocal();
          } catch (_) {}
        }
        if (endTimeStr != null) {
          try {
            endTime = DateTime.parse(endTimeStr).toLocal();
          } catch (_) {}
        }

        if (startTime != null && now.isBefore(startTime)) {
          // Session has not started yet
          setState(() {
            _secondsRemaining = 0;
          });
          _startTimerForStart(startTime);
        } else if (endTime != null && now.isBefore(endTime)) {
          // Session is active
          final diff = endTime.difference(now).inSeconds;
          setState(() {
            _secondsRemaining = diff > 0 ? diff : 0;
          });
          _startTimer();
        } else {
          setState(() {
            _secondsRemaining = 0;
          });
        }
      } else {
        setState(() {
          _secondsRemaining = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingStatus = false;
        });
      }
    }
  }

  void _startTimerForStart(DateTime startTime) {
    _timer?.cancel();
    final diff = startTime.difference(DateTime.now()).inSeconds;
    if (diff <= 0) {
      _fetchTodayStatus();
      return;
    }
    _timer = Timer(Duration(seconds: diff + 1), () {
      if (mounted) {
        _fetchTodayStatus();
      }
    });
  }

  void _startTimer() {
    _timer?.cancel();
    if (_secondsRemaining <= 0) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        timer.cancel();
        _fetchTodayStatus();
      }
    });
  }

  Future<void> _handleMarkAttendance() async {
    setState(() {
      _isMarking = true;
      _statusMessage = null;
    });

    try {
      final wifiResult = await _wifiService.getConnectedWifiInfo();

      setState(() {
        _currentPhoneSsid = wifiResult.ssid ?? 'Disconnected';
      });

      if (!wifiResult.isLocationEnabled || !wifiResult.isWifiEnabled) {
        setState(() {
          _isMarking = false;
          _isSuccessMessage = false;
          _statusMessage = wifiResult.errorMessage ?? "Please turn ON Location (GPS) and Wi-Fi.";
        });
        return;
      }

      if (wifiResult.ssid == null || wifiResult.ssid!.trim().isEmpty ||
          wifiResult.bssid == null || wifiResult.bssid!.trim().isEmpty ||
          wifiResult.bssid == '02:00:00:00:00:00') {
        setState(() {
          _isMarking = false;
          _isSuccessMessage = false;
          _statusMessage = "Unable to verify Wi-Fi connection.";
        });
        return;
      }

      final String deviceId = await DeviceIdService.getDeviceId();
      final String studentId = _user?['id'] ?? '';
      final String attendanceDate = _settings?['attendanceDate'] ?? DateTime.now().toString().split(' ')[0];

      final res = await _apiService.markAttendance(
        studentId: studentId,
        attendanceDate: attendanceDate,
        ssid: wifiResult.ssid,
        bssid: wifiResult.bssid,
        deviceId: deviceId,
      );

      if (res['success'] == true) {
        setState(() {
          _isMarking = false;
          _isSuccessMessage = true;
          _statusMessage = res['message'] ?? "Attendance marked successfully";
        });
        _fetchTodayStatus();
      } else {
        setState(() {
          _isMarking = false;
          _isSuccessMessage = false;
          _statusMessage = res['message'] ?? "Please connect to authorized college Wi-Fi.";
        });
      }
    } catch (e) {
      setState(() {
        _isMarking = false;
        _isSuccessMessage = false;
        _statusMessage = "Unable to verify Wi-Fi. Please enable Wi-Fi & Location.";
      });
    }
  }

  String _formatTimer(int seconds) {
    if (seconds <= 0) return '00 : 00';
    final hours = (seconds / 3600).floor();
    final minutes = ((seconds % 3600) / 60).floor();
    final secs = seconds % 60;

    final mStr = minutes.toString().padLeft(2, '0');
    final sStr = secs.toString().padLeft(2, '0');

    if (hours > 0) {
      final hStr = hours.toString().padLeft(2, '0');
      return '$hStr : $mStr : $sStr';
    }
    return '$mStr : $sStr';
  }

  Future<void> _logout() async {
    print('[Logout] Clearing JWT and user data...');
    await _apiService.clearToken();

    try {
      await GoogleSignIn().signOut();
      print('[Logout] Google Sign-In session cleared.');
    } catch (e) {
      print('[Logout] GoogleSignIn.signOut() error (non-fatal): $e');
    }

    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  Future<void> _onRefresh() async {
    await _fetchTodayStatus();
    await _scanWifi();
  }

  @override
  Widget build(BuildContext context) {
    final String studentName = _user?['name'] ?? 'Student';
    final String regNo = _user?['registerNo'] ?? _user?['rollNo'] ?? '';
    final String department = _user?['department'] ?? 'CSE';
    final String year = _user?['year'] ?? '';
    final String section = _user?['section'] ?? '';
    final String initial = studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S';

    final int totalDays = _stats?['totalDays'] ?? 0;
    final int attendedDays = _stats?['attendedDays'] ?? 0;
    final double percentage = double.tryParse(_stats?['percentage']?.toString() ?? '0') ?? 0;

    return Scaffold(
      backgroundColor: _bgColor,
      body: SafeArea(
        child: RefreshIndicator(
          color: _primaryGreen,
          onRefresh: _onRefresh,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── HEADER ──
                _buildHeader(),
                const SizedBox(height: 16),

                // ── PROFILE CARD ──
                _buildProfileCard(studentName, regNo, department, year, section, initial),
                const SizedBox(height: 14),

                // ── ATTENDANCE PERCENTAGE CARD ──
                _buildAttendancePercentageCard(totalDays, attendedDays, percentage),
                const SizedBox(height: 14),

                // ── TODAY'S ATTENDANCE CARD ──
                _buildTodayAttendanceCard(),
                const SizedBox(height: 14),

                // ── STATUS MESSAGE ──
                if (_statusMessage != null) _buildStatusMessage(),
                const SizedBox(height: 14),

                // ── INFO HINT ──
                _buildInfoHint(),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEADER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _primaryGreen,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.shield_outlined, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: 'Elite ',
                    style: GoogleFonts.inter(
                      fontSize: 21,
                      fontWeight: FontWeight.w600,
                      color: _textPrimary,
                    ),
                  ),
                  TextSpan(
                    text: 'Attendance',
                    style: GoogleFonts.inter(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      color: _primaryGreen,
                    ),
                  ),
                ],
              ),
            ),
          ),
          InkWell(
            onTap: _logout,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _paleGreen,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.logout_rounded, color: _primaryGreen, size: 22),
            ),
          ),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROFILE CARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildProfileCard(String name, String regNo, String dept, String year, String section, String initial) {
    final yearLabel = year.isNotEmpty ? '${_ordinal(year)} Year' : '';
    final sectionLabel = section.isNotEmpty ? 'Section $section' : '';
    final detailLine = [dept, yearLabel, sectionLabel].where((s) => s.isNotEmpty).join('  |  ');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: _lightGreen,
              shape: BoxShape.circle,
              border: Border.all(color: _primaryGreen.withValues(alpha: 0.3), width: 2),
            ),
            child: Center(
              child: Text(
                initial,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: _primaryGreen,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: _textPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  regNo,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: _textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  detailLine,
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: _textSecondary),
                ),
              ],
            ),
          ),
          Icon(Icons.school_rounded, color: _primaryGreen.withValues(alpha: 0.5), size: 28),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ATTENDANCE PERCENTAGE CARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildAttendancePercentageCard(int totalDays, int attendedDays, double percentage) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.bar_chart_rounded, color: _primaryGreen, size: 20),
              const SizedBox(width: 8),
              Text(
                'Attendance Percentage',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: _textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Circular Progress Ring
              SizedBox(
                width: 100,
                height: 100,
                child: CustomPaint(
                  painter: _CircularProgressPainter(
                    progress: percentage / 100,
                    strokeWidth: 10,
                    progressColor: _primaryGreen,
                    backgroundColor: _lightGreen,
                  ),
                  child: Center(
                    child: Text(
                      '${percentage.toStringAsFixed(1)}%',
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: _primaryGreen,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: '$attendedDays / $totalDays\n',
                            style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: _primaryGreen),
                          ),
                          TextSpan(
                            text: 'Days Attended',
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: _textSecondary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _statRow('Total Classes', '$totalDays'),
                    const SizedBox(height: 4),
                    _statRow('Attended', '$attendedDays'),
                    const SizedBox(height: 4),
                    _statRow('Percentage', '${percentage.toStringAsFixed(1)}%'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value) {
    return Row(
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, color: _textSecondary)),
        const SizedBox(width: 8),
        Text(':  ', style: GoogleFonts.inter(fontSize: 12, color: _textSecondary)),
        Text(value, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: _textPrimary)),
      ],
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TODAY'S ATTENDANCE CARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildTodayAttendanceCard() {
    final now = DateTime.now();
    final todayStr = '${_monthName(now.month)} ${now.day}, ${now.year}';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Icon(Icons.calendar_today_rounded, color: _primaryGreen, size: 18),
              const SizedBox(width: 8),
              Text(
                "Today's Attendance",
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: _textPrimary),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _paleGreen,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  todayStr,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: _primaryGreen),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Dynamic state content
          if (_isLoadingStatus)
            _buildLoadingState()
          else
            _buildAttendanceState(),

          const SizedBox(height: 14),

          // Wi-Fi Status Row
          _buildWifiStatusRow(),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(
            strokeWidth: 2.5,
            color: _primaryGreen,
          ),
        ),
      ),
    );
  }

  Widget _buildAttendanceState() {
    final settings = _settings;

    // STATE A — No session at all
    if (settings == null) {
      return _stateContainer(
        bgColor: const Color(0xFFFDEEEE),
        borderColor: _errorColor.withValues(alpha: 0.2),
        icon: Icons.event_busy_rounded,
        iconColor: _errorColor,
        iconBgColor: const Color(0xFFFCDCDC),
        title: 'No Attendance Session',
        titleColor: _errorColor,
        subtitle: 'Your professor has not opened today\'s attendance yet.',
      );
    }

    // STATE D — Already marked
    if (_marked) {
      String checkInTimeStr = '';
      if (_record != null && _record!['checkInTime'] != null) {
        try {
          final checkIn = DateTime.parse(_record!['checkInTime']).toLocal();
          checkInTimeStr = 'Check-in Time: ${_formatTimeOfDay(checkIn)}';
        } catch (_) {}
      }
      return _stateContainer(
        bgColor: _lightGreen,
        borderColor: _successColor.withValues(alpha: 0.2),
        icon: Icons.check_circle_rounded,
        iconColor: _successColor,
        iconBgColor: _paleGreen,
        title: 'Attendance Marked',
        titleColor: _successColor,
        subtitle: checkInTimeStr.isNotEmpty ? checkInTimeStr : 'You are marked present today.',
        badge: 'Present',
        badgeColor: _successColor,
      );
    }

    final status = settings['status'] ?? '';
    DateTime? startTime;
    DateTime? endTime;

    if (settings['startTime'] != null) {
      try {
        startTime = DateTime.parse(settings['startTime']).toLocal();
      } catch (_) {}
    }
    if (settings['endTime'] != null) {
      try {
        endTime = DateTime.parse(settings['endTime']).toLocal();
      } catch (_) {}
    }

    final now = DateTime.now();

    // STATE B — Before session starts (now < startTime)
    if (status == 'ACTIVE' && startTime != null && now.isBefore(startTime)) {
      return _stateContainer(
        bgColor: const Color(0xFFFFF9E6),
        borderColor: _warningColor.withValues(alpha: 0.2),
        icon: Icons.schedule_rounded,
        iconColor: _warningColor,
        iconBgColor: const Color(0xFFFFF3CD),
        title: 'Attendance Starts At',
        titleColor: _warningColor,
        subtitle: _formatTimeOfDay(startTime),
        subtitleStyle: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: _textPrimary),
        extraSubtitle: 'Please wait until the session starts.',
      );
    }

    // STATE C — Active session, not yet marked (startTime <= now < endTime AND status == 'ACTIVE')
    if (status == 'ACTIVE' && _secondsRemaining > 0 && (endTime == null || now.isBefore(endTime))) {
      return _buildActiveSessionState();
    }

    // STATE E — Ended / Expired
    return _stateContainer(
      bgColor: const Color(0xFFF3F4F6),
      borderColor: Colors.grey.withValues(alpha: 0.2),
      icon: Icons.lock_clock_rounded,
      iconColor: const Color(0xFF6B7280),
      iconBgColor: const Color(0xFFE5E7EB),
      title: 'Attendance Closed',
      titleColor: const Color(0xFF374151),
      subtitle: 'Today\'s attendance window has ended.',
    );
  }

  Widget _buildActiveSessionState() {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
          decoration: BoxDecoration(
            color: _lightGreen,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _primaryGreen.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _primaryGreen,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: _primaryGreen.withValues(alpha: 0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.lock_open_rounded, color: Colors.white, size: 28),
              ),
              const SizedBox(height: 12),
              Text(
                'Attendance is Open',
                style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: _primaryGreen),
              ),
              const SizedBox(height: 4),
              Text(
                'Time remaining',
                style: GoogleFonts.inter(fontSize: 13, color: _textSecondary),
              ),
              const SizedBox(height: 6),
              Text(
                _formatTimer(_secondsRemaining),
                style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w800, color: _textPrimary, letterSpacing: 2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Mark Attendance Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: _isMarking ? null : _handleMarkAttendance,
            icon: _isMarking
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.wifi_rounded, color: Colors.white, size: 22),
            label: Text(
              _isMarking ? 'Verifying...' : 'Mark Attendance',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: _primaryGreen,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 2,
              shadowColor: _primaryGreen.withValues(alpha: 0.4),
            ),
          ),
        ),
      ],
    );
  }

  Widget _stateContainer({
    required Color bgColor,
    required Color borderColor,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required Color titleColor,
    required String subtitle,
    TextStyle? subtitleStyle,
    String? extraSubtitle,
    String? badge,
    Color? badgeColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: titleColor)),
                if (badge != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: badgeColor?.withValues(alpha: 0.15) ?? _successColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badge,
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: badgeColor ?? _successColor),
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: subtitleStyle ?? GoogleFonts.inter(fontSize: 13, color: _textSecondary),
                ),
                if (extraSubtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    extraSubtitle,
                    style: GoogleFonts.inter(fontSize: 12, color: _textSecondary),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WI-FI STATUS ROW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildWifiStatusRow() {
    final bool isConnected = _currentPhoneSsid != 'Scanning...' &&
        _currentPhoneSsid != 'Disconnected' &&
        _currentPhoneSsid != '<unknown ssid>' &&
        _currentPhoneSsid.trim().isNotEmpty;

    final String displaySsid = isConnected ? _currentPhoneSsid : 'Not Connected';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _paleGreen,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isConnected ? _primaryGreen.withValues(alpha: 0.2) : _errorColor.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isConnected ? _lightGreen : const Color(0xFFFDEEEE),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.wifi_rounded,
              color: isConnected ? _primaryGreen : _errorColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Campus Wi-Fi',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  displaySsid,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isConnected ? _textPrimary : _errorColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: isConnected ? _lightGreen : const Color(0xFFFDEEEE),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isConnected ? Icons.check_circle_rounded : Icons.cancel_rounded,
                  color: isConnected ? _successColor : _errorColor,
                  size: 14,
                ),
                const SizedBox(width: 4),
                Text(
                  isConnected ? 'Connected' : 'Not Connected',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isConnected ? _successColor : _errorColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATUS MESSAGE (after mark attempt)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildStatusMessage() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _isSuccessMessage ? _lightGreen : const Color(0xFFFDEEEE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isSuccessMessage
              ? _successColor.withValues(alpha: 0.3)
              : _errorColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _isSuccessMessage ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
            color: _isSuccessMessage ? _successColor : _errorColor,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _statusMessage ?? '',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: _isSuccessMessage ? _primaryGreen : _errorColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INFO HINT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Widget _buildInfoHint() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _paleGreen,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: _primaryGreen.withValues(alpha: 0.7), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Make sure you are connected to the college Wi-Fi to mark attendance.',
              style: GoogleFonts.inter(fontSize: 12, color: _textSecondary),
            ),
          ),
        ],
      ),
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  String _ordinal(String year) {
    switch (year) {
      case '1': return '1st';
      case '2': return '2nd';
      case '3': return '3rd';
      case '4': return '4th';
      default: return year;
    }
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  String _formatTimeOfDay(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    return '${hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} $amPm';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CIRCULAR PROGRESS PAINTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class _CircularProgressPainter extends CustomPainter {
  final double progress;
  final double strokeWidth;
  final Color progressColor;
  final Color backgroundColor;

  _CircularProgressPainter({
    required this.progress,
    required this.strokeWidth,
    required this.progressColor,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Background circle
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final progressPaint = Paint()
      ..color = progressColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * pi * progress.clamp(0.0, 1.0);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CircularProgressPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
