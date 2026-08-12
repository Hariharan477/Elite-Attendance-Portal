import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class WifiServiceResult {
  final bool isWifiEnabled;
  final bool isLocationEnabled;
  final String? ssid;
  final String? bssid;
  final String? errorMessage;

  WifiServiceResult({
    required this.isWifiEnabled,
    required this.isLocationEnabled,
    this.ssid,
    this.bssid,
    this.errorMessage,
  });
}

class WifiService {
  final NetworkInfo _networkInfo = NetworkInfo();

  Future<WifiServiceResult> getConnectedWifiInfo() async {
    try {
      // 1. Request Android Location & Nearby Wi-Fi permissions (Android 10+ & Android 13+)
      PermissionStatus locationStatus = await Permission.locationWhenInUse.status;
      if (!locationStatus.isGranted) {
        locationStatus = await Permission.locationWhenInUse.request();
      }

      if (await Permission.nearbyWifiDevices.isDenied) {
        await Permission.nearbyWifiDevices.request();
      }


      // Check if Location Service (GPS) is turned ON on Android phone
      bool isLocationServiceEnabled = await Permission.location.serviceStatus.isEnabled;
      if (!isLocationServiceEnabled) {
        return WifiServiceResult(
          isWifiEnabled: true,
          isLocationEnabled: false,
          errorMessage: "Please turn ON your phone's Location (GPS) service to detect Wi-Fi.",
        );
      }

      if (!locationStatus.isGranted) {
        return WifiServiceResult(
          isWifiEnabled: true,
          isLocationEnabled: false,
          errorMessage: "Please grant Location permission to verify your Wi-Fi connection.",
        );
      }

      // 2. Read real Wi-Fi SSID & BSSID
      String? ssid = await _networkInfo.getWifiName();
      String? bssid = await _networkInfo.getWifiBSSID();

      // Clean SSID quotes if returned like "IFET_WIFI"
      if (ssid != null && ssid.startsWith('"') && ssid.endsWith('"')) {
        ssid = ssid.substring(1, ssid.length - 1);
      }


      if (bssid == null || bssid.isEmpty || bssid == '02:00:00:00:00:00') {
        return WifiServiceResult(
          isWifiEnabled: false,
          isLocationEnabled: true,
          errorMessage: "Unable to verify Wi-Fi. Please enable Wi-Fi and Location and try again.",
        );
      }

      return WifiServiceResult(
        isWifiEnabled: true,
        isLocationEnabled: true,
        ssid: ssid ?? 'Campus Network',
        bssid: bssid,
      );
    } catch (e) {
      return WifiServiceResult(
        isWifiEnabled: false,
        isLocationEnabled: false,
        errorMessage: "Unable to verify Wi-Fi. Please enable Wi-Fi and Location and try again.",
      );
    }
  }
}
