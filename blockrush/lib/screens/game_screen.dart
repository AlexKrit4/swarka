import 'dart:async';
import 'dart:math' as math;

import 'package:blockrush/game/game_engine.dart';
import 'package:blockrush/services/game_audio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _pieceColors = <Color>[
  Color(0xFFC96B4B),
  Color(0xFF719379),
  Color(0xFFD5A33E),
  Color(0xFFB96862),
  Color(0xFF6F8FA8),
];

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  GameEngine _engine = GameEngine();
  final GameAudio _audio = GameAudio();
  final Set<GridPoint> _clearing = {};
  SharedPreferences? _preferences;
  int _bestScore = 0;
  int? _hoverRow;
  int? _hoverCol;
  int? _draggedPiece;
  int _tutorialStep = -1;
  bool _soundEnabled = true;
  bool _hapticsEnabled = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final preferences = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _preferences = preferences;
      _bestScore = preferences.getInt('bestScore') ?? 0;
      _soundEnabled = preferences.getBool('soundEnabled') ?? true;
      _hapticsEnabled = preferences.getBool('hapticsEnabled') ?? true;
      if (!(preferences.getBool('tutorialComplete') ?? false)) {
        _tutorialStep = 0;
      }
    });
  }

  Future<void> _place(int pieceIndex, int row, int col) async {
    final result = _engine.place(pieceIndex, row, col);
    if (!result.placed) {
      if (_hapticsEnabled) {
        unawaited(HapticFeedback.lightImpact());
      }
      setState(() {
        _hoverRow = null;
        _hoverCol = null;
        _draggedPiece = null;
      });
      return;
    }

    if (_hapticsEnabled) {
      unawaited(
        result.linesCleared > 0
            ? HapticFeedback.heavyImpact()
            : HapticFeedback.mediumImpact(),
      );
    }
    if (_soundEnabled) {
      unawaited(
        result.combo > 1
            ? _audio.playCombo()
            : result.linesCleared > 0
            ? _audio.playClear()
            : _audio.playPlace(),
      );
    }
    if (result.cellsCleared.isNotEmpty) {
      _clearing.addAll(result.cellsCleared);
      Future<void>.delayed(const Duration(milliseconds: 320), () {
        if (mounted) setState(_clearing.clear);
      });
    }
    if (_engine.score > _bestScore) {
      _bestScore = _engine.score;
      unawaited(_preferences?.setInt('bestScore', _bestScore));
    }
    setState(() {
      _hoverRow = null;
      _hoverCol = null;
      _draggedPiece = null;
    });
    if (result.gameOver) {
      if (_soundEnabled) unawaited(_audio.playGameOver());
      Future<void>.delayed(const Duration(milliseconds: 450), () {
        if (mounted) _showGameOver();
      });
    }
  }

  void _restart() {
    Navigator.of(context).popUntil((route) => route.isFirst);
    setState(() {
      _engine = GameEngine();
      _clearing.clear();
      _draggedPiece = null;
      _hoverRow = null;
      _hoverCol = null;
    });
  }

  Future<void> _confirmRestart() async {
    final restart = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFFFFFAF4),
        title: const Text('Start fresh?'),
        content: const Text('Your current board and score will be cleared.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('RESTART'),
          ),
        ],
      ),
    );
    if (restart ?? false) _restart();
  }

  Future<void> _showGameOver() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.fromLTRB(26, 28, 26, 24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFFFBF6), Color(0xFFF1E7DA)],
              ),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: const Color(0x55C96B4B)),
              boxShadow: const [
                BoxShadow(color: Color(0x33A95A3E), blurRadius: 38),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.grid_view_rounded,
                  color: Color(0xFFC96B4B),
                  size: 48,
                ),
                const SizedBox(height: 15),
                const Text(
                  'NO MORE MOVES',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 22),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ResultStat(label: 'SCORE', value: '${_engine.score}'),
                    Container(width: 1, height: 43, color: Colors.white12),
                    _ResultStat(label: 'BEST', value: '$_bestScore'),
                  ],
                ),
                const SizedBox(height: 25),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      backgroundColor: const Color(0xFFC96B4B),
                    ),
                    onPressed: _restart,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text(
                      'PLAY AGAIN',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _advanceTutorial() {
    if (_tutorialStep < 2) {
      setState(() => _tutorialStep++);
    } else {
      setState(() => _tutorialStep = -1);
      unawaited(_preferences?.setBool('tutorialComplete', true));
    }
  }

  Future<void> _showSettings() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFFFFFAF4),
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 4, 22, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SETTINGS',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  secondary: const Icon(Icons.volume_up_rounded),
                  title: const Text('Sound effects'),
                  value: _soundEnabled,
                  onChanged: (value) {
                    setState(() => _soundEnabled = value);
                    setSheetState(() {});
                    unawaited(_preferences?.setBool('soundEnabled', value));
                  },
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  secondary: const Icon(Icons.vibration_rounded),
                  title: const Text('Haptics'),
                  value: _hapticsEnabled,
                  onChanged: (value) {
                    setState(() => _hapticsEnabled = value);
                    setSheetState(() {});
                    unawaited(_preferences?.setBool('hapticsEnabled', value));
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.school_rounded),
                  title: const Text('Replay tutorial'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {
                    Navigator.pop(context);
                    setState(() => _tutorialStep = 0);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    unawaited(_audio.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const Positioned.fill(child: _Backdrop()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
              child: LayoutBuilder(
                builder: (context, constraints) => Column(
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 17),
                    _buildScoreRow(),
                    const Spacer(),
                    SizedBox(
                      width: constraints.maxHeight < 650
                          ? constraints.maxHeight * 0.48
                          : 430,
                      child: _GameBoard(
                        engine: _engine,
                        clearing: _clearing,
                        draggedPiece: _draggedPiece,
                        hoverRow: _hoverRow,
                        hoverCol: _hoverCol,
                        onHover: (row, col) => setState(() {
                          _hoverRow = row;
                          _hoverCol = col;
                        }),
                        onPlace: _place,
                      ),
                    ),
                    const Spacer(),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 250),
                      child: _engine.combo > 1
                          ? Text(
                              'COMBO ×${_engine.combo}',
                              key: ValueKey(_engine.combo),
                              style: const TextStyle(
                                color: Color(0xFFB87916),
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.5,
                              ),
                            )
                          : const SizedBox(height: 19),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: constraints.maxHeight < 650 ? 108 : 128,
                      child: Row(
                        children: List.generate(
                          3,
                          (index) => Expanded(
                            child: _PieceDock(
                              piece: _engine.pieces[index],
                              index: index,
                              enabled: !_engine.gameOver,
                              onDragStarted: () =>
                                  setState(() => _draggedPiece = index),
                              onDragEnded: () => setState(() {
                                _draggedPiece = null;
                                _hoverRow = null;
                                _hoverCol = null;
                              }),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'DRAG A PIECE ONTO THE BOARD',
                      style: TextStyle(
                        color: Color(0xFF766D64),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_tutorialStep >= 0)
            _TutorialOverlay(step: _tutorialStep, onNext: _advanceTutorial),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Container(
          width: 37,
          height: 37,
          decoration: BoxDecoration(
            color: const Color(0xFFC96B4B),
            borderRadius: BorderRadius.circular(11),
          ),
          child: const Icon(Icons.grid_view_rounded, size: 21),
        ),
        const SizedBox(width: 10),
        const Text(
          'BLOCKRUSH',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.8,
          ),
        ),
        const Spacer(),
        _RoundButton(
          icon: Icons.refresh_rounded,
          tooltip: 'Restart',
          onTap: _confirmRestart,
        ),
        const SizedBox(width: 8),
        _RoundButton(
          icon: Icons.tune_rounded,
          tooltip: 'Settings',
          onTap: _showSettings,
        ),
      ],
    );
  }

  Widget _buildScoreRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xE6FFFBF6),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x1F5F554B)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _Score(
              label: 'SCORE',
              value: _engine.score,
              key: ValueKey('score-${_engine.score}'),
            ),
          ),
          Container(width: 1, height: 34, color: Colors.white10),
          Expanded(
            child: _Score(
              label: 'BEST',
              value: _bestScore,
              key: ValueKey('best-$_bestScore'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Backdrop extends StatelessWidget {
  const _Backdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-0.7, -0.65),
          radius: 1.35,
          colors: [Color(0xFFFFFBF6), Color(0xFFF0E7DB)],
        ),
      ),
      child: CustomPaint(painter: _DotPainter()),
    );
  }
}

class _DotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0x125B5148);
    for (double x = 14; x < size.width; x += 28) {
      for (double y = 12; y < size.height; y += 28) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GameBoard extends StatelessWidget {
  const _GameBoard({
    required this.engine,
    required this.clearing,
    required this.draggedPiece,
    required this.hoverRow,
    required this.hoverCol,
    required this.onHover,
    required this.onPlace,
  });

  final GameEngine engine;
  final Set<GridPoint> clearing;
  final int? draggedPiece;
  final int? hoverRow;
  final int? hoverCol;
  final void Function(int row, int col) onHover;
  final Future<void> Function(int piece, int row, int col) onPlace;

  bool _isPreviewCell(int row, int col) {
    if (draggedPiece == null || hoverRow == null || hoverCol == null) {
      return false;
    }
    final piece = engine.pieces[draggedPiece!];
    if (piece == null || !engine.canPlace(piece, hoverRow!, hoverCol!)) {
      return false;
    }
    return piece.cells.any(
      (cell) => hoverRow! + cell.row == row && hoverCol! + cell.col == col,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color: const Color(0xFFD9CEBF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFCEC0AE), width: 1.2),
          boxShadow: const [
            BoxShadow(
              color: Color(0x26000000),
              blurRadius: 25,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: boardSize,
          ),
          itemCount: boardSize * boardSize,
          itemBuilder: (context, index) {
            final row = index ~/ boardSize;
            final col = index % boardSize;
            final colorIndex = engine.board[row][col];
            final isClearing = clearing.contains(GridPoint(row, col));
            final isPreview = _isPreviewCell(row, col);
            return DragTarget<int>(
              onWillAcceptWithDetails: (details) {
                final piece = engine.pieces[details.data];
                if (piece == null) return false;
                final origin = engine.relaxedPlacement(
                  piece,
                  row,
                  col,
                  previous: hoverRow == null || hoverCol == null
                      ? null
                      : GridPoint(hoverRow!, hoverCol!),
                );
                if (origin == null) return false;
                onHover(origin.row, origin.col);
                return true;
              },
              onAcceptWithDetails: (details) {
                final piece = engine.pieces[details.data];
                if (piece == null) return;
                final origin = engine.relaxedPlacement(
                  piece,
                  row,
                  col,
                  previous: hoverRow == null || hoverCol == null
                      ? null
                      : GridPoint(hoverRow!, hoverCol!),
                );
                if (origin == null) return;
                onPlace(details.data, origin.row, origin.col);
              },
              builder: (context, candidates, rejects) => AnimatedContainer(
                duration: const Duration(milliseconds: 190),
                curve: Curves.easeOutCubic,
                margin: const EdgeInsets.all(1.5),
                decoration: BoxDecoration(
                  color: isClearing
                      ? Colors.white
                      : colorIndex != null
                      ? _pieceColors[colorIndex]
                      : isPreview
                      ? _pieceColors[engine.pieces[draggedPiece!]!.colorIndex]
                            .withValues(alpha: 0.52)
                      : const Color(0xFFE8E0D4),
                  borderRadius: BorderRadius.circular(5),
                  boxShadow: colorIndex != null || isClearing
                      ? [
                          BoxShadow(
                            color:
                                (isClearing
                                        ? Colors.white
                                        : _pieceColors[colorIndex!])
                                    .withValues(alpha: 0.28),
                            blurRadius: 5,
                          ),
                        ]
                      : null,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _PieceDock extends StatelessWidget {
  const _PieceDock({
    required this.piece,
    required this.index,
    required this.enabled,
    required this.onDragStarted,
    required this.onDragEnded,
  });

  final GamePiece? piece;
  final int index;
  final bool enabled;
  final VoidCallback onDragStarted;
  final VoidCallback onDragEnded;

  @override
  Widget build(BuildContext context) {
    if (piece == null) return const SizedBox.expand();
    return LayoutBuilder(
      builder: (context, constraints) {
        const feedbackCellSize = 41.0;
        const lift = 64.0;
        final dockCellSize = math.min(
          36.0,
          math.min(
            (constraints.maxWidth - 10) / piece!.width,
            (constraints.maxHeight - 10) / piece!.height,
          ),
        );
        final preview = _PieceView(piece: piece!, cellSize: dockCellSize);
        final dock = DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0x66FFFAF4),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0x125F554B)),
          ),
          child: preview,
        );
        if (!enabled) return Opacity(opacity: 0.4, child: dock);
        return Draggable<int>(
          data: index,
          dragAnchorStrategy: pointerDragAnchorStrategy,
          feedbackOffset: const Offset(0, -lift),
          onDragStarted: onDragStarted,
          onDragEnd: (_) => onDragEnded(),
          feedback: Material(
            color: Colors.transparent,
            child: Transform.translate(
              offset: Offset(
                -piece!.width * feedbackCellSize / 2,
                -piece!.height * feedbackCellSize / 2 - lift,
              ),
              child: _PieceView(
                piece: piece!,
                cellSize: feedbackCellSize,
                elevated: true,
              ),
            ),
          ),
          childWhenDragging: Opacity(opacity: 0.16, child: dock),
          child: dock,
        );
      },
    );
  }
}

class _PieceView extends StatelessWidget {
  const _PieceView({
    required this.piece,
    required this.cellSize,
    this.elevated = false,
  });

  final GamePiece piece;
  final double cellSize;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: piece.width * cellSize,
        height: piece.height * cellSize,
        child: Stack(
          children: [
            for (final cell in piece.cells)
              Positioned(
                left: cell.col * cellSize,
                top: cell.row * cellSize,
                width: cellSize,
                height: cellSize,
                child: Container(
                  margin: const EdgeInsets.all(1.5),
                  decoration: BoxDecoration(
                    color: _pieceColors[piece.colorIndex],
                    borderRadius: BorderRadius.circular(5),
                    boxShadow: elevated
                        ? [
                            BoxShadow(
                              color: _pieceColors[piece.colorIndex].withValues(
                                alpha: 0.55,
                              ),
                              blurRadius: 12,
                            ),
                          ]
                        : null,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Score extends StatelessWidget {
  const _Score({super.key, required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF82786E),
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 2),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: Text(
            '$value',
            key: ValueKey(value),
            style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    );
  }
}

class _ResultStat extends StatelessWidget {
  const _ResultStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF82786E),
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
        ),
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFFFFAF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF625950)),
        ),
      ),
    );
  }
}

class _TutorialOverlay extends StatelessWidget {
  const _TutorialOverlay({required this.step, required this.onNext});

  final int step;
  final VoidCallback onNext;

  static const _titles = ['PICK A PIECE', 'FILL THE LINES', 'CHAIN COMBOS'];
  static const _bodies = [
    'Press and drag any of the three shapes onto an open spot.',
    'Complete a full row or column to clear it and make more room.',
    'Clear lines on consecutive moves to multiply your score.',
  ];
  static const _icons = [
    Icons.pan_tool_alt_rounded,
    Icons.grid_on_rounded,
    Icons.bolt_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: const Color(0xB30E0C0A),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Container(
                padding: const EdgeInsets.fromLTRB(26, 28, 26, 24),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFAF4),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0x55C96B4B)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x44502D20), blurRadius: 45),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: Color(0x26C96B4B),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _icons[step],
                        size: 38,
                        color: const Color(0xFFC96B4B),
                      ),
                    ),
                    const SizedBox(height: 22),
                    Text(
                      _titles[step],
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _bodies[step],
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF766D64),
                        height: 1.5,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        3,
                        (index) => AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: index == step ? 22 : 7,
                          height: 7,
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          decoration: BoxDecoration(
                            color: index == step
                                ? const Color(0xFFC96B4B)
                                : const Color(0xFFD8CCBD),
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: onNext,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFC96B4B),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: Text(
                          step == 2 ? 'LET’S PLAY' : 'NEXT',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
