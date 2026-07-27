import 'package:audioplayers/audioplayers.dart';

class GameAudio {
  final AudioPlayer _player = AudioPlayer();

  Future<void> playPlace() => _play('audio/place.wav', 0.35);

  Future<void> playClear() => _play('audio/clear.wav', 0.55);

  Future<void> playCombo() => _play('audio/combo.wav', 0.55);

  Future<void> playGameOver() => _play('audio/game_over.wav', 0.45);

  Future<void> _play(String asset, double volume) async {
    await _player.stop();
    await _player.setVolume(volume);
    await _player.play(AssetSource(asset));
  }

  Future<void> dispose() => _player.dispose();
}
