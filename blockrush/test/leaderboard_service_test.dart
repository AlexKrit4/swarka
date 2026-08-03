import 'package:blockrush/services/leaderboard_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses leaderboard entries from the server', () {
    final entries = LeaderboardService.parseEntries('''
      {
        "scores": [
          {"playerId": "player-a", "playerName": "MILA", "score": 4200},
          {"playerId": "player-b", "playerName": "LEO", "score": 3100}
        ]
      }
    ''');

    expect(entries, hasLength(2));
    expect(entries.first.playerName, 'MILA');
    expect(entries.first.score, 4200);
  });
}
