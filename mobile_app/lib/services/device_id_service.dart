import 'dart:math';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DeviceIdService {
  static const String _deviceIdKey = 'elite_app_installation_device_id';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static String? _cachedDeviceId;

  /// Retrieves or generates a secure, persistent installation/device identifier
  /// stored inside Android Keystore-backed storage.
  static Future<String> getDeviceId() async {
    if (_cachedDeviceId != null) {
      return _cachedDeviceId!;
    }

    try {
      String? existingId = await _storage.read(key: _deviceIdKey);

      if (existingId == null || existingId.trim().isEmpty) {
        // Generate a new secure installation identifier
        final random = Random.secure();
        final values = List<int>.generate(16, (i) => random.nextInt(256));
        final hexString = values.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
        final newId = 'ELITE-DEV-$hexString-${DateTime.now().millisecondsSinceEpoch}';
        
        await _storage.write(key: _deviceIdKey, value: newId);
        _cachedDeviceId = newId;
        print('[DEVICE ID SERVICE] Generated and stored new device ID: $newId');
        return newId;
      }

      _cachedDeviceId = existingId;
      print('[DEVICE ID SERVICE] Retrieved existing device ID: $existingId');
      return existingId;
    } catch (e) {
      print('[DEVICE ID SERVICE] Fallback generated device ID error: $e');
      final fallbackId = 'ELITE-DEV-FALLBACK-${DateTime.now().millisecondsSinceEpoch}';
      _cachedDeviceId = fallbackId;
      return fallbackId;
    }
  }
}

