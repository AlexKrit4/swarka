import 'package:blockrush/services/update_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses the website update manifest', () {
    final update = UpdateService.parseManifest('''
      {
        "versionCode": 3,
        "versionName": "1.2.0",
        "apkUrl": "https://swarka-i-voditel.ru/downloads/blockrush.apk",
        "notes": "Smoother controls"
      }
    ''');

    expect(update.versionCode, 3);
    expect(update.versionName, '1.2.0');
    expect(update.apkUrl.host, 'swarka-i-voditel.ru');
    expect(update.notes, 'Smoother controls');
  });
}
