# BlockRush

BlockRush is a portrait-only, native Android block puzzle built with Flutter.
Place shapes on an 8×8 board, complete rows or columns, and chain clears to
build a score multiplier. This project intentionally has no web/PWA target.

## Gameplay

1. Press and drag one of the three pieces onto an open board cell.
2. Fill an entire row or column to clear it.
3. Use all three pieces to receive a fresh set.
4. Keep playing until none of the available pieces fits.

Every placed cell awards 10 points. Each cleared line awards
`100 × current combo`; multi-line clears also receive a 75-point bonus for
each additional line. A clear increases the combo, while a placement that
does not clear a line resets it.

The game includes:

- five warm block colors and fourteen shape variants (1–5 cells)
- placement previews, clear animation, score animation, and combo feedback
- locally persisted best score
- first-run, three-step tutorial that can be replayed in Settings
- generated original placement, clear, combo, and game-over WAV effects
- built-in Android haptic feedback
- sound and haptic preferences
- game-over and restart flows
- branded native and Flutter splash screens
- Android adaptive and legacy launcher icons

## Architecture

```text
lib/
├── game/game_engine.dart      Pure Dart board rules and models
├── screens/game_screen.dart   Game UI, drag/drop, tutorial, and dialogs
├── services/game_audio.dart   Sound-effect playback
└── main.dart                  App theme, orientation, and splash
test/
├── game_engine_test.dart      Placement, clear, combo, and game-over rules
└── widget_test.dart           Splash-to-game smoke test
assets/audio/                  Original generated WAV effects
assets/fonts/                  Bundled Outfit variable typeface
android/                       Native Android host and branded resources
```

`GameEngine` has no Flutter dependency. A seeded `Random`, custom board, and
custom piece set can be injected for deterministic tests. The engine owns
placement validation, line detection, scoring, piece dealing, and game-over
detection; widgets only render state and relay player actions.

## Requirements

- Flutter 3.44.7 / Dart 3.12.2
- Android SDK with Platform 36, Build Tools 36.0.0, NDK 28.2, and CMake 3.22
- Java 17 or newer

This workspace uses:

```text
/home/ubuntu/flutter
/home/ubuntu/android-sdk
```

Set the environment for a shell:

```bash
export PATH="/home/ubuntu/flutter/bin:/home/ubuntu/android-sdk/platform-tools:$PATH"
export ANDROID_HOME="/home/ubuntu/android-sdk"
export ANDROID_SDK_ROOT="/home/ubuntu/android-sdk"
```

## Development

Install packages and run on a connected Android device or emulator:

```bash
flutter pub get
flutter devices
flutter run
```

The app is locked to portrait in both Flutter and `AndroidManifest.xml`.
Preferences are stored using `shared_preferences`; audio uses `audioplayers`.
Haptics use Flutter's built-in `HapticFeedback`, avoiding an additional native
vibration dependency.

## Quality checks

```bash
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --release
```

The release APK is produced at:

```text
build/app/outputs/flutter-apk/app-release.apk
```

The release build currently uses the generated debug signing configuration so
it can be installed for testing. Configure a private upload keystore before
publishing through Google Play.
