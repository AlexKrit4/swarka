import 'dart:math';

const int boardSize = 8;

class GridPoint {
  const GridPoint(this.row, this.col);

  final int row;
  final int col;

  @override
  bool operator ==(Object other) =>
      other is GridPoint && row == other.row && col == other.col;

  @override
  int get hashCode => Object.hash(row, col);
}

class GamePiece {
  const GamePiece({
    required this.id,
    required this.colorIndex,
    required this.cells,
  });

  final int id;
  final int colorIndex;
  final List<GridPoint> cells;

  int get width => cells.map((cell) => cell.col).reduce(max) + 1;
  int get height => cells.map((cell) => cell.row).reduce(max) + 1;
}

class PlacementResult {
  const PlacementResult({
    required this.placed,
    this.linesCleared = 0,
    this.cellsCleared = const <GridPoint>[],
    this.scoreGained = 0,
    this.combo = 0,
    this.gameOver = false,
  });

  final bool placed;
  final int linesCleared;
  final List<GridPoint> cellsCleared;
  final int scoreGained;
  final int combo;
  final bool gameOver;
}

/// Pure, deterministic game rules. This class has no Flutter dependencies.
class GameEngine {
  GameEngine({
    Random? random,
    List<List<int?>>? initialBoard,
    List<GamePiece?>? initialPieces,
  }) : _random = random ?? Random(),
       board = initialBoard != null
           ? initialBoard.map((row) => List<int?>.from(row)).toList()
           : List.generate(
               boardSize,
               (_) => List<int?>.filled(boardSize, null),
             ),
       pieces = initialPieces != null
           ? List<GamePiece?>.from(initialPieces)
           : <GamePiece?>[] {
    if (board.length != boardSize ||
        board.any((row) => row.length != boardSize)) {
      throw ArgumentError('Board must be $boardSize x $boardSize.');
    }
    if (pieces.isEmpty) {
      _dealPieces();
    }
    if (pieces.length != 3) {
      throw ArgumentError('Exactly three piece slots are required.');
    }
  }

  final Random _random;
  final List<List<int?>> board;
  final List<GamePiece?> pieces;

  int score = 0;
  int combo = 0;
  bool gameOver = false;
  int _nextPieceId = 0;

  static const List<List<GridPoint>> _shapes = <List<GridPoint>>[
    [GridPoint(0, 0)],
    [GridPoint(0, 0), GridPoint(0, 1)],
    [GridPoint(0, 0), GridPoint(1, 0)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(0, 2)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(2, 0)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 0)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 1)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(1, 1)],
    [GridPoint(0, 1), GridPoint(1, 0), GridPoint(1, 1)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 0), GridPoint(1, 1)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(0, 2), GridPoint(0, 3)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(2, 0), GridPoint(3, 0)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(2, 0), GridPoint(2, 1)],
    [GridPoint(0, 1), GridPoint(1, 1), GridPoint(2, 0), GridPoint(2, 1)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 0), GridPoint(2, 0)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 1), GridPoint(2, 1)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(0, 2), GridPoint(1, 2)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(0, 2), GridPoint(1, 0)],
    [GridPoint(0, 2), GridPoint(1, 0), GridPoint(1, 1), GridPoint(1, 2)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(1, 1), GridPoint(1, 2)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(0, 2), GridPoint(1, 1)],
    [GridPoint(0, 1), GridPoint(1, 0), GridPoint(1, 1), GridPoint(1, 2)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(1, 1), GridPoint(2, 0)],
    [GridPoint(0, 1), GridPoint(1, 0), GridPoint(1, 1), GridPoint(2, 1)],
    [GridPoint(0, 1), GridPoint(0, 2), GridPoint(1, 0), GridPoint(1, 1)],
    [GridPoint(0, 0), GridPoint(0, 1), GridPoint(1, 1), GridPoint(1, 2)],
    [GridPoint(0, 0), GridPoint(1, 0), GridPoint(1, 1), GridPoint(2, 1)],
    [GridPoint(0, 1), GridPoint(1, 0), GridPoint(1, 1), GridPoint(2, 0)],
    [
      GridPoint(0, 0),
      GridPoint(0, 1),
      GridPoint(1, 0),
      GridPoint(1, 1),
      GridPoint(2, 0),
    ],
    [
      GridPoint(0, 0),
      GridPoint(0, 2),
      GridPoint(1, 0),
      GridPoint(1, 1),
      GridPoint(1, 2),
    ],
  ];

  static int get shapeCount => _shapes.length;

  bool canPlace(GamePiece piece, int row, int col) {
    for (final cell in piece.cells) {
      final targetRow = row + cell.row;
      final targetCol = col + cell.col;
      if (targetRow < 0 ||
          targetRow >= boardSize ||
          targetCol < 0 ||
          targetCol >= boardSize ||
          board[targetRow][targetCol] != null) {
        return false;
      }
    }
    return true;
  }

  /// Finds a forgiving snap point near the player's intended board cell.
  ///
  /// A valid previous snap is retained for one cell of movement to prevent
  /// jitter while the finger crosses cell boundaries.
  GridPoint? nearestPlacement(
    GamePiece piece,
    int idealRow,
    int idealCol, {
    int radius = 2,
    GridPoint? previous,
  }) {
    if (previous != null && canPlace(piece, previous.row, previous.col)) {
      final rowDelta = previous.row - idealRow;
      final colDelta = previous.col - idealCol;
      if (rowDelta * rowDelta + colDelta * colDelta <= 1) {
        return previous;
      }
    }

    GridPoint? best;
    var bestDistance = radius * radius + 1;
    for (var row = idealRow - radius; row <= idealRow + radius; row++) {
      for (var col = idealCol - radius; col <= idealCol + radius; col++) {
        final rowDelta = row - idealRow;
        final colDelta = col - idealCol;
        final distance = rowDelta * rowDelta + colDelta * colDelta;
        if (distance > radius * radius ||
            distance >= bestDistance ||
            !canPlace(piece, row, col)) {
          continue;
        }
        best = GridPoint(row, col);
        bestDistance = distance;
      }
    }
    return best;
  }

  PlacementResult place(int pieceIndex, int row, int col) {
    if (gameOver || pieceIndex < 0 || pieceIndex >= pieces.length) {
      return PlacementResult(placed: false, gameOver: gameOver, combo: combo);
    }
    final piece = pieces[pieceIndex];
    if (piece == null || !canPlace(piece, row, col)) {
      return PlacementResult(placed: false, gameOver: gameOver, combo: combo);
    }

    for (final cell in piece.cells) {
      board[row + cell.row][col + cell.col] = piece.colorIndex;
    }
    pieces[pieceIndex] = null;

    final completedRows = <int>[
      for (var r = 0; r < boardSize; r++)
        if (board[r].every((cell) => cell != null)) r,
    ];
    final completedCols = <int>[
      for (var c = 0; c < boardSize; c++)
        if (board.every((rowCells) => rowCells[c] != null)) c,
    ];
    final cleared = <GridPoint>{};
    for (final r in completedRows) {
      for (var c = 0; c < boardSize; c++) {
        cleared.add(GridPoint(r, c));
      }
    }
    for (final c in completedCols) {
      for (var r = 0; r < boardSize; r++) {
        cleared.add(GridPoint(r, c));
      }
    }
    for (final cell in cleared) {
      board[cell.row][cell.col] = null;
    }

    final lineCount = completedRows.length + completedCols.length;
    combo = lineCount > 0 ? combo + 1 : 0;
    final gained =
        piece.cells.length * 10 +
        (lineCount * 100 * (combo == 0 ? 1 : combo)) +
        (lineCount > 1 ? (lineCount - 1) * 75 : 0);
    score += gained;

    if (pieces.every((piece) => piece == null)) {
      _dealPieces();
    }
    gameOver = !hasAnyMove;

    return PlacementResult(
      placed: true,
      linesCleared: lineCount,
      cellsCleared: cleared.toList(),
      scoreGained: gained,
      combo: combo,
      gameOver: gameOver,
    );
  }

  bool get hasAnyMove {
    for (final piece in pieces.whereType<GamePiece>()) {
      for (var row = 0; row < boardSize; row++) {
        for (var col = 0; col < boardSize; col++) {
          if (canPlace(piece, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  void _dealPieces() {
    pieces
      ..clear()
      ..addAll(
        List<GamePiece?>.generate(3, (_) {
          final shape = _shapes[_random.nextInt(_shapes.length)];
          return GamePiece(
            id: _nextPieceId++,
            colorIndex: _random.nextInt(5),
            cells: shape,
          );
        }),
      );
  }
}
