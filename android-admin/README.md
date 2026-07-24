# SWARKA Admin — Android приложение

Мобильная обёртка над веб-админкой `admin.swarka-i-voditel.ru`.

## Возможности

- WebView с админ-панелью SWARKA
- Автовход под подадмином
- PIN-код при каждом запуске (4 цифры)
- Вход по отпечатку пальца (опционально)
- Шифрованное хранение PIN и JWT-токена

## Установка APK

1. Скачайте `SWARKA-Admin.apk` из папки `releases/`
2. На телефоне разрешите установку из неизвестных источников
3. Установите приложение
4. При первом запуске создайте PIN
5. При желании включите отпечаток пальца

## Сборка из исходников

Требуется Android SDK 35 и JDK 17.

```bash
cd android-admin
keytool -genkey -v -keystore release.keystore -alias swarka -keyalg RSA -keysize 2048 -validity 10000 -storepass swarkaadmin -keypass swarkaadmin -dname "CN=SWARKA Admin"
./gradlew assembleRelease
```

APK: `app/build/outputs/apk/release/app-release.apk`

## Важно

Учётные данные подадмина встроены в приложение для автоматического входа. Не публикуйте APK в открытый доступ без необходимости.
