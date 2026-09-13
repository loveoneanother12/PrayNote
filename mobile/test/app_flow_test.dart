import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:praynote_mobile/app.dart';
import 'package:praynote_mobile/features/session/session_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('온보딩에서 로그인 화면까지 이동한다', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const PrayNoteApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('마음을 기록해요'), findsOneWidget);
    await tester.tap(find.text('다음'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('다음'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('PrayNote 시작하기'));
    await tester.pumpAndSettle();

    expect(find.text('다시 만나 반가워요'), findsOneWidget);
  });

  testWidgets('체험 모드에서 홈과 핵심 작성 흐름이 동작한다', (tester) async {
    SharedPreferences.setMockInitialValues({
      'has_seen_native_onboarding': true,
      'native_demo_session': true,
    });
    final preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const PrayNoteApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('평안한 하루예요'), findsOneWidget);
    expect(find.text('함께 기도 중'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('기도제목 작성'));
    await tester.pumpAndSettle();
    expect(find.text('기도제목 나누기'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '테스트 기도제목입니다.');
    await tester.tap(find.text('기록하기'));
    await tester.pumpAndSettle();

    expect(find.text('테스트 기도제목입니다.'), findsOneWidget);
  });

  testWidgets('마이 탭에서 기도 리듬과 달력을 확인할 수 있다', (tester) async {
    SharedPreferences.setMockInitialValues({
      'has_seen_native_onboarding': true,
      'native_demo_session': true,
    });
    final preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const PrayNoteApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('마이'));
    await tester.pumpAndSettle();

    expect(find.text('기도 달력'), findsOneWidget);
    expect(find.textContaining('일째 기도 중이에요'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('내 기도제목'),
      280,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('내 기도제목'), findsOneWidget);
  });

  testWidgets('그룹 상세에서 해당 그룹 작성 흐름을 시작한다', (tester) async {
    SharedPreferences.setMockInitialValues({
      'has_seen_native_onboarding': true,
      'native_demo_session': true,
    });
    final preferences = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
        child: const PrayNoteApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('그룹'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('우리 교회 청년부'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('우리 교회 청년부에 기도제목 나누기'));
    await tester.pumpAndSettle();

    expect(find.text('기도제목 나누기'), findsOneWidget);
    expect(find.text('1개 그룹 선택됨'), findsOneWidget);
  });
}
