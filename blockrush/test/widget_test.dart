import 'package:blockrush/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows the branded splash screen', (tester) async {
    SharedPreferences.setMockInitialValues({'tutorialComplete': true});
    await tester.pumpWidget(const BlockRushApp());

    expect(find.text('BLOCKRUSH'), findsOneWidget);
    expect(find.text('BUILD  •  CLEAR  •  COMBO'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();
    expect(find.text('DRAG A PIECE ONTO THE BOARD'), findsOneWidget);
  });
}
