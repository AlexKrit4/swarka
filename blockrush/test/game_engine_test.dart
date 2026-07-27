import 'dart:math';

import 'package:blockrush/game/game_engine.dart';
import 'package:flutter_test/flutter_test.dart';

GamePiece piece(List<GridPoint> cells, {int id = 1}) =>
    GamePiece(id: id, colorIndex: 0, cells: cells);

List<List<int?>> emptyBoard() =>
    List.generate(boardSize, (_) => List<int?>.filled(boardSize, null));

void main() {
  group('placement', () {
    test('places a piece and rejects overlap and out-of-bounds moves', () {
      final single = piece(const [GridPoint(0, 0)]);
      final engine = GameEngine(
        random: Random(1),
        initialPieces: [single, single, single],
      );

      expect(engine.place(0, 4, 4).placed, isTrue);
      expect(engine.board[4][4], 0);
      expect(engine.place(1, 4, 4).placed, isFalse);
      expect(engine.place(1, boardSize, 0).placed, isFalse);
      expect(engine.score, 10);
    });
  });

  group('line clear', () {
    test('clears a completed row', () {
      final board = emptyBoard();
      for (var col = 0; col < boardSize - 1; col++) {
        board[2][col] = 1;
      }
      final single = piece(const [GridPoint(0, 0)]);
      final engine = GameEngine(
        random: Random(2),
        initialBoard: board,
        initialPieces: [single, single, single],
      );

      final result = engine.place(0, 2, boardSize - 1);

      expect(result.linesCleared, 1);
      expect(engine.board[2].every((cell) => cell == null), isTrue);
      expect(result.scoreGained, 110);
    });

    test('clears intersecting row and column without double-clearing cell', () {
      final board = emptyBoard();
      for (var col = 0; col < boardSize - 1; col++) {
        board[5][col] = 1;
      }
      for (var row = 0; row < boardSize; row++) {
        if (row != 5) board[row][boardSize - 1] = 1;
      }
      final single = piece(const [GridPoint(0, 0)]);
      final engine = GameEngine(
        initialBoard: board,
        initialPieces: [single, single, single],
      );

      final result = engine.place(0, 5, boardSize - 1);

      expect(result.linesCleared, 2);
      expect(result.cellsCleared, hasLength(boardSize * 2 - 1));
      expect(engine.board[5].every((cell) => cell == null), isTrue);
      expect(engine.board.every((row) => row[boardSize - 1] == null), isTrue);
    });
  });

  group('combo', () {
    test('increases on consecutive clears and resets after a normal move', () {
      final board = emptyBoard();
      for (var col = 1; col < boardSize; col++) {
        board[0][col] = 1;
        board[1][col] = 1;
      }
      final single = piece(const [GridPoint(0, 0)]);
      final engine = GameEngine(
        initialBoard: board,
        initialPieces: [single, single, single],
      );

      expect(engine.place(0, 0, 0).combo, 1);
      expect(engine.place(1, 1, 0).combo, 2);
      expect(engine.place(2, 4, 4).combo, 0);
    });
  });

  group('game over', () {
    test('detects when no remaining piece can fit', () {
      final board = List.generate(
        boardSize,
        (_) => List<int?>.filled(boardSize, 1),
      );
      board[0][0] = null;
      final domino = piece(const [GridPoint(0, 0), GridPoint(0, 1)]);
      final engine = GameEngine(
        initialBoard: board,
        initialPieces: [domino, domino, domino],
      );

      expect(engine.hasAnyMove, isFalse);
      // Invalid placements do not mutate or independently end the game.
      expect(engine.place(0, 0, 0).placed, isFalse);
    });

    test('sets game over after a valid move leaves no legal move', () {
      final board = List.generate(
        boardSize,
        (row) => List<int?>.generate(
          boardSize,
          (col) => (row + col).isEven ? 1 : null,
        ),
      );
      final single = piece(const [GridPoint(0, 0)]);
      final domino = piece(const [GridPoint(0, 0), GridPoint(0, 1)]);
      final engine = GameEngine(
        initialBoard: board,
        initialPieces: [single, domino, domino],
      );

      final result = engine.place(0, 0, 1);

      expect(result.placed, isTrue);
      expect(result.gameOver, isTrue);
      expect(engine.gameOver, isTrue);
    });
  });
}
