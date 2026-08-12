import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../services/wifi_service.dart';
import '../services/device_id_service.dart';
import '../widgets/error_banner.dart';
import 'login_screen.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  final ApiService _apiService = ApiService();
  final WifiService _wifiService = WifiService();
  final _storage = const FlutterSecureStorage();

  Map<String, dynamic>? _user;
  Map<String, dynamic>? _settings;
  bool _marked = false;
  int _secondsRemaining = 0;
  Timer? _timer;

  bool _isLoadingStatus = true;
  bool _isMarking = false;
  String? _statusMessage;
  bool _isSuccessMessage = false;

  String _currentPhoneSsid = 'Scanning...';
  int _currentNavIndex = 0;


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
        _isLoadingStatus = false;
      });

      if (_settings != null && _settings!['status'] == 'ACTIVE') {
        final endTimeStr = _settings!['endTime'];
        if (endTimeStr != null) {
          final endTime = DateTime.parse(endTimeStr).toLocal();
          final now = DateTime.now();
          final diff = endTime.difference(now).inSeconds;
          setState(() {
            _secondsRemaining = diff > 0 ? diff : 0;
          });
          _startTimer();
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
    final m = (seconds / 60).floor().toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _logout() async {
    await _apiService.clearToken();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  @override
  Widget build(BuildContext context) {
    final String studentName = _user?['name'] ?? 'Student';
    final String rollNo = _user?['registerNo'] ?? _user?['rollNo'] ?? '421125102038';
    final String department = _user?['department'] ?? 'CSE';

    return Scaffold(
      backgroundColor: const Color(0xFF090D16), // Very dark navy matching reference image
      appBar: AppBar(
        backgroundColor: const Color(0xFF090D16),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu, color: Colors.white),
          onPressed: () {},
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0xFF5B46F6),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF5B46F6).withValues(alpha: 0.4),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: const Icon(Icons.shield_rounded, size: 20, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Text(
              'Elite Attendance',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w800,
                fontSize: 19,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 24),
                onPressed: () {},
              ),
              Positioned(
                top: 14,
                right: 14,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFF94A3B8), size: 20),
            onPressed: _logout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: _isLoadingStatus
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF5B46F6)))
          : RefreshIndicator(
              onRefresh: () async {
                await _fetchTodayStatus();
                await _scanWifi();
              },
              color: const Color(0xFF5B46F6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. STUDENT PROFILE CARD (Reference Image Inspired)
                    _buildStudentProfileCard(studentName, rollNo, department),
                    const SizedBox(height: 16),

                    // Error/Notification Banner
                    if (_statusMessage != null) ...[
                      if (_isSuccessMessage)
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _statusMessage!,
                                  style: GoogleFonts.inter(color: const Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ErrorBanner(
                          title: 'Verification Notice',
                          message: _statusMessage!,
                        ),
                      const SizedBox(height: 16),
                    ],

                    // 2. ATTENDANCE SESSION CARD (Reference Image Inspired)
                    _buildAttendanceSessionCard(),
                    const SizedBox(height: 16),

                    // 3. CAMPUS NETWORK CARD (Reference Image Inspired)
                    _buildCampusNetworkCard(),
                    const SizedBox(height: 16),

                    // 4. SECURITY CHECK CARD (Reference Image Inspired)
                    _buildSecurityCheckCard(),
                    const SizedBox(height: 16),

                    // 5. STAY READY BANNER (Reference Image Inspired)
                    _buildStayReadyBanner(),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

      // 6. BOTTOM NAVIGATION BAR (Reference Image Inspired)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0F1523),
          border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
        ),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, Icons.home_filled, 'Home'),
            _buildNavItem(1, Icons.pie_chart_outline_rounded, 'Attendance'),
            _buildNavItem(2, Icons.description_outlined, 'History'),
            _buildNavItem(3, Icons.person_outline_rounded, 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentNavIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentNavIndex = index;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: isSelected
            ? BoxDecoration(
                color: const Color(0xFF5B46F6).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
              )
            : null,
        child: Row(
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? const Color(0xFF7C66FF) : const Color(0xFF64748B),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF7C66FF),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // 1. STUDENT PROFILE CARD (Deep Gradient Navy with Mortarboard/Avatar)
  Widget _buildStudentProfileCard(String name, String rollNo, String dept) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1743), Color(0xFF151D33)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF5B46F6).withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: const Color(0xFF5B46F6),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'S',
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getGreeting(),
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                ),
                Text(
                  name,
                  style: GoogleFonts.inter(fontSize: 19, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF5B46F6).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$rollNo  •  $dept',
                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFA5B4FC)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Icon(
            Icons.school_rounded,
            size: 42,
            color: Color(0xFF5B46F6),
          ),
        ],
      ),
    );
  }

  // 2. ATTENDANCE SESSION CARD (Main Focus)
  Widget _buildAttendanceSessionCard() {
    final String? startTimeStr = _settings?['startTime'];
    final String? endTimeStr = _settings?['endTime'];
    final DateTime? startTime = startTimeStr != null ? DateTime.parse(startTimeStr).toLocal() : null;
    final DateTime? endTime = endTimeStr != null ? DateTime.parse(endTimeStr).toLocal() : null;
    final DateTime now = DateTime.now();

    final bool isSessionActive = _settings != null && _settings!['status'] == 'ACTIVE' && _secondsRemaining > 0;
    final bool isBeforeStart = startTime != null && now.isBefore(startTime);
    final bool isEnded = endTime != null && now.isAfter(endTime);

    // ACTIVE SESSION
    if (isSessionActive) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF111726),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withValues(alpha: 0.1),
              blurRadius: 20,
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wifi_tethering_rounded, size: 36, color: Color(0xFF10B981)),
            ),
            const SizedBox(height: 12),
            Text(
              'Attendance is Open',
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              'Remaining: ${_formatTimer(_secondsRemaining)}',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF10B981)),
            ),
            const SizedBox(height: 18),

            if (_marked) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 24),
                    const SizedBox(width: 10),
                    Text(
                      'Attendance Recorded (PRESENT)',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF10B981)),
                    ),
                  ],
                ),
              ),
            ] else ...[
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isMarking ? null : _handleMarkAttendance,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 6,
                  ),
                  icon: _isMarking
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Icon(Icons.touch_app_rounded, size: 22),
                  label: Text(
                    _isMarking ? 'Verifying...' : 'Mark Attendance',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ],
        ),
      );
    }

    // BEFORE START
    if (isBeforeStart) {
      final formattedStart = '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}';
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF111726),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.schedule_rounded, size: 36, color: Color(0xFFF59E0B)),
            ),
            const SizedBox(height: 12),
            Text(
              'Attendance starts at $formattedStart',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 6),
            Text(
              'The session will open at the scheduled start time.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
            ),
          ],
        ),
      );
    }

    // AFTER END
    if (isEnded) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF111726),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.timer_off_rounded, size: 36, color: Color(0xFFEF4444)),
            ),
            const SizedBox(height: 12),
            Text(
              'Attendance Closed',
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 6),
            Text(
              'Today\'s attendance session has ended.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
            ),
          ],
        ),
      );
    }

    // NO ACTIVE SESSION (Exactly matching uploaded reference image layout)
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF111726),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.calendar_today_rounded, size: 32, color: Color(0xFF10B981)),
          ),
          const SizedBox(height: 14),
          Text(
            'No Active Session',
            style: GoogleFonts.inter(fontSize: 19, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'There is currently no daily attendance window open.\nCheck back when your professor opens the session.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF94A3B8), height: 1.4),
          ),
          const SizedBox(height: 14),
          const Icon(
            Icons.date_range_rounded,
            size: 54,
            color: Color(0xFF5B46F6),
          ),
        ],
      ),
    );
  }

  // 3. CAMPUS NETWORK CARD (Matching Reference Image)
  Widget _buildCampusNetworkCard() {
    final bool isWifiConnected = _currentPhoneSsid != 'Disconnected' && _currentPhoneSsid != 'Scanning...';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF111726),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF06B6D4).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.wifi_rounded, size: 18, color: Color(0xFF06B6D4)),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Campus Network',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isWifiConnected
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Icon(
                      isWifiConnected ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      size: 14,
                      color: isWifiConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isWifiConnected ? 'Connected' : 'Disconnected',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isWifiConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0B0F19),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Network', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B))),
                      const SizedBox(height: 2),
                      Text(
                        _currentPhoneSsid,
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 28, color: Colors.white10),
                const SizedBox(width: 14),
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, size: 18, color: Color(0xFF10B981)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Security', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text(
                              isWifiConnected ? 'Secure Connection' : 'Unverified',
                              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 4. SECURITY CHECK CARD (Matching Reference 4/4 Passed Chips)
  Widget _buildSecurityCheckCard() {
    final bool isSessionActive = _settings != null && _settings!['status'] == 'ACTIVE' && _secondsRemaining > 0;
    final bool isWifiConnected = _currentPhoneSsid != 'Disconnected' && _currentPhoneSsid != 'Scanning...';
    
    int passedCount = 2; // Account & Device always verified upon login
    if (isWifiConnected) passedCount++;
    if (isSessionActive) passedCount++;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF111726),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF5B46F6).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.shield_outlined, size: 18, color: Color(0xFF5B46F6)),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Security Check',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$passedCount/4 Passed',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF10B981)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(child: _buildSecurityChip('Account\nVerified', Icons.person_rounded, true)),
              const SizedBox(width: 8),
              Expanded(child: _buildSecurityChip('Device\nVerified', Icons.smartphone_rounded, true)),
              const SizedBox(width: 8),
              Expanded(child: _buildSecurityChip('Wi-Fi\nVerified', Icons.wifi_rounded, isWifiConnected)),
              const SizedBox(width: 8),
              Expanded(child: _buildSecurityChip('Session\nWindow', Icons.access_time_filled_rounded, isSessionActive)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityChip(String label, IconData icon, bool verified) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0B0F19),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: verified ? const Color(0xFF10B981).withValues(alpha: 0.2) : Colors.white10,
        ),
      ),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: verified
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : const Color(0xFFEF4444).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: verified ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: verified ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    verified ? Icons.check : Icons.close,
                    size: 8,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.white, height: 1.2),
          ),
        ],
      ),
    );
  }

  // 5. STAY READY BANNER (Matching Reference Image Illustration Card)
  Widget _buildStayReadyBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF151D33), Color(0xFF1E1743)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF5B46F6).withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Stay ready for attendance',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'Make sure you are connected to authorized college Wi-Fi and keep your app updated.',
                  style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF94A3B8), height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          const Icon(
            Icons.school_outlined,
            size: 48,
            color: Color(0xFF7C66FF),
          ),
        ],
      ),
    );
  }
}
