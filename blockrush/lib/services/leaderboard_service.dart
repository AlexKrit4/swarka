import 'dart:convert';
import 'dart:io';

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.playerId,
    required this.playerName,
    required this.score,
  });

  final String playerId;
  final String playerName;
  final int score;
}

class LeaderboardService {
  static final Uri _endpoint = Uri.parse(
    'https://api.swarka-i-voditel.ru/api/blockrush/leaderboard',
  );

  Future<List<LeaderboardEntry>> fetch() async {
    final response = await _request('GET');
    if (response.statusCode != HttpStatus.ok) {
      throw const HttpException('Leaderboard is unavailable');
    }
    final source = await response.transform(utf8.decoder).join();
    return parseEntries(source);
  }

  Future<void> submit({
    required String playerId,
    required String playerName,
    required int score,
  }) async {
    final response = await _request(
      'POST',
      body: jsonEncode({
        'playerId': playerId,
        'playerName': playerName,
        'score': score,
      }),
    );
    await response.drain<void>();
    if (response.statusCode != HttpStatus.ok) {
      throw const HttpException('Score was not saved');
    }
  }

  Future<HttpClientResponse> _request(String method, {String? body}) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 5);
    try {
      final request = await client
          .openUrl(method, _endpoint)
          .timeout(const Duration(seconds: 6));
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (body != null) {
        request.headers.contentType = ContentType.json;
        request.write(body);
      }
      return await request.close().timeout(const Duration(seconds: 7));
    } finally {
      client.close();
    }
  }

  static List<LeaderboardEntry> parseEntries(String source) {
    final json = jsonDecode(source) as Map<String, dynamic>;
    final scores = json['scores'] as List<dynamic>;
    return scores
        .map((item) {
          final score = item as Map<String, dynamic>;
          return LeaderboardEntry(
            playerId: score['playerId'] as String,
            playerName: score['playerName'] as String,
            score: score['score'] as int,
          );
        })
        .toList(growable: false);
  }
}
