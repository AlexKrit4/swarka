import 'dart:convert';
import 'dart:io';

import 'package:url_launcher/url_launcher.dart';

class AppUpdate {
  const AppUpdate({
    required this.versionCode,
    required this.versionName,
    required this.apkUrl,
    required this.notes,
  });

  final int versionCode;
  final String versionName;
  final Uri apkUrl;
  final String notes;
}

class UpdateService {
  static const int currentVersionCode = 3;
  static final Uri _manifestUrl = Uri.parse(
    'https://swarka-i-voditel.ru/downloads/blockrush-version.json',
  );

  Future<AppUpdate?> check() async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
    try {
      final request = await client.getUrl(
        _manifestUrl.replace(
          queryParameters: {
            't': DateTime.now().millisecondsSinceEpoch.toString(),
          },
        ),
      );
      request.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');
      final response = await request.close().timeout(
        const Duration(seconds: 6),
      );
      if (response.statusCode != HttpStatus.ok) return null;
      final body = await response.transform(utf8.decoder).join();
      final update = parseManifest(body);
      return update.versionCode > currentVersionCode ? update : null;
    } on Object {
      return null;
    } finally {
      client.close(force: true);
    }
  }

  static AppUpdate parseManifest(String source) {
    final json = jsonDecode(source) as Map<String, dynamic>;
    return AppUpdate(
      versionCode: json['versionCode'] as int,
      versionName: json['versionName'] as String,
      apkUrl: Uri.parse(json['apkUrl'] as String),
      notes: json['notes'] as String? ?? '',
    );
  }

  Future<bool> install(AppUpdate update) {
    return launchUrl(update.apkUrl, mode: LaunchMode.externalApplication);
  }
}
