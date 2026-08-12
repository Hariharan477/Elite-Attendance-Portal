import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Live Production Server URL on Render
  static const String baseUrl = 'https://elite-attendance-api.onrender.com/api'; 



  final _storage = const FlutterSecureStorage();

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_data');
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Google Authentication API with Device Identifier
  Future<Map<String, dynamic>> loginWithGoogleToken(String idToken, {String? deviceId}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/google'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'credential': idToken,
        if (deviceId != null) 'deviceId': deviceId,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200) {
      if (data['token'] != null) {
        await saveToken(data['token']);
        await _storage.write(key: 'user_data', value: jsonEncode(data['user']));
      }
      return data;
    } else {
      throw Exception(data['message'] ?? 'Authentication failed');
    }
  }

  // Get Today's Student Attendance Status
  Future<Map<String, dynamic>> getStudentTodayStatus() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$baseUrl/attendance/student-today'),
      headers: headers,
    );

    return jsonDecode(response.body);
  }

  // Mark Student Attendance with Real Wi-Fi BSSID, SSID, and Device ID
  Future<Map<String, dynamic>> markAttendance({
    required String studentId,
    required String attendanceDate,
    required String? ssid,
    required String? bssid,
    required String? deviceId,
  }) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/attendance/mark'),
      headers: headers,
      body: jsonEncode({
        'studentId': studentId,
        'attendanceDate': attendanceDate,
        'ssid': ssid,
        'bssid': bssid,
        'deviceId': deviceId,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 || response.statusCode == 201) {
      return data;
    } else {
      return {
        'success': false,
        'message': data['message'] ?? 'Failed to mark attendance'
      };
    }
  }

}
