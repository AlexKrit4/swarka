import 'package:blockrush/screens/game_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Color(0xFFF6F1EA),
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const BlockRushApp());
}

class BlockRushApp extends StatelessWidget {
  const BlockRushApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BlockRush',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFC96B4B),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F1EA),
        fontFamily: 'Outfit',
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..forward();
    Future<void>.delayed(const Duration(milliseconds: 1450), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder<void>(
          pageBuilder: (_, animation, secondaryAnimation) => const GameScreen(),
          transitionDuration: const Duration(milliseconds: 450),
          transitionsBuilder: (_, animation, secondaryAnimation, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.15),
            radius: 0.9,
            colors: [Color(0xFFFFFAF4), Color(0xFFF0E7DB)],
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _controller,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.75, end: 1).animate(curve),
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppMark(size: 94),
                  SizedBox(height: 22),
                  Text(
                    'BLOCKRUSH',
                    style: TextStyle(
                      fontSize: 29,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 4,
                    ),
                  ),
                  SizedBox(height: 7),
                  Text(
                    'BUILD  •  CLEAR  •  COMBO',
                    style: TextStyle(
                      color: Color(0xFF766D64),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppMark extends StatelessWidget {
  const AppMark({super.key, required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFD98361), Color(0xFFB75538)],
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x55B75538), blurRadius: 30, spreadRadius: 1),
        ],
      ),
      child: GridView.count(
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        crossAxisCount: 3,
        mainAxisSpacing: size * 0.045,
        crossAxisSpacing: size * 0.045,
        children: List.generate(
          9,
          (index) => DecoratedBox(
            decoration: BoxDecoration(
              color: index == 2 || index == 3
                  ? Colors.white.withValues(alpha: 0.3)
                  : Colors.white,
              borderRadius: BorderRadius.circular(size * 0.035),
            ),
          ),
        ),
      ),
    );
  }
}
