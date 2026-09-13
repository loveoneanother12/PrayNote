import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../features/session/session_controller.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;
  static const _pages = [
    (
      Icons.menu_book_rounded,
      '마음을 기록해요',
      '개인 기도와 함께 나눌 기도제목을 날짜와 함께 차분히 남겨보세요.',
    ),
    (
      Icons.groups_rounded,
      '서로를 기억해요',
      '신뢰하는 그룹 안에서 기도제목을 나누고 오늘 함께 기도했음을 전해요.',
    ),
    (
      Icons.local_fire_department_rounded,
      '작은 기도를 이어가요',
      '연속 기도 기록과 그룹 챌린지로 부담 없이 꾸준한 기도 생활을 만들어요.',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (_page < _pages.length - 1) {
      await _controller.nextPage(duration: 280.ms, curve: Curves.easeOutCubic);
      return;
    }
    await ref.read(sessionProvider.notifier).completeOnboarding();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
          child: Column(
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'PrayNote',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: brandColor,
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  onPageChanged: (value) => setState(() => _page = value),
                  itemCount: _pages.length,
                  itemBuilder: (context, index) {
                    final item = _pages[index];
                    return Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 136,
                              height: 136,
                              decoration: BoxDecoration(
                                color: brandColor.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(item.$1, size: 62, color: brandColor),
                            ),
                            const SizedBox(height: 38),
                            Text(
                              item.$2,
                              textAlign: TextAlign.center,
                              style: PrayNoteType.hero,
                            ),
                            const SizedBox(height: 14),
                            Text(
                              item.$3,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 16,
                                height: 1.6,
                                color: Color(0xFF6F7A91),
                              ),
                            ),
                          ],
                        )
                        .animate(key: ValueKey(index))
                        .fadeIn(duration: 350.ms)
                        .slideY(begin: 0.04, end: 0);
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (index) => AnimatedContainer(
                    duration: 200.ms,
                    width: index == _page ? 22 : 7,
                    height: 7,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: index == _page
                          ? brandColor
                          : const Color(0xFFD7DCE8),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _next,
                child: Text(
                  _page == _pages.length - 1 ? 'PrayNote 시작하기' : '다음',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
