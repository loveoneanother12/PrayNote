import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import '../features/dashboard/dashboard_controller.dart';
import 'widgets/prayer_card.dart';
import 'widgets/prayer_composer.dart';
import 'widgets/ui_components.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'PrayNote',
          style: PrayNoteType.pageTitle.copyWith(color: brandColor),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.search_rounded),
            tooltip: '검색',
          ),
          IconButton(
            onPressed: () => context.push('/notifications'),
            icon: const Icon(Icons.notifications_none_rounded),
            tooltip: '알림',
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _LoadError(
          onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
        ),
        data: (data) {
          final active = data.prayers
              .where((prayer) => !prayer.isCompleted)
              .take(3)
              .toList();
          final now = DateTime.now();
          const weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
          return RefreshIndicator(
            onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 32),
              children: [
                Text(
                  '${now.month}월 ${now.day}일 ${weekdays[now.weekday - 1]}',
                  style: PrayNoteType.label.copyWith(color: brandColor),
                ),
                const SizedBox(height: 5),
                Wrap(
                  spacing: 7,
                  runSpacing: 0,
                  children: [
                    const Text('평안한 하루예요,', style: PrayNoteType.hero),
                    Text('${data.displayName}님.', style: PrayNoteType.hero),
                  ],
                ),
                const SizedBox(height: 18),
                _TodayPrayerHero(
                  streak: data.currentStreak,
                  onTap: () => showPrayerComposer(context),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: '함께 기도 중',
                  description: '오늘 마음을 보탤 기도제목이에요.',
                  action: TextButton(
                    onPressed: () => context.go('/groups'),
                    child: const Text('그룹 보기'),
                  ),
                ),
                if (active.isEmpty)
                  const SoftPanel(
                    child: EmptyState(
                      icon: Icons.menu_book_outlined,
                      title: '아직 기도제목이 없어요',
                      description: '첫 기도제목을 기록하면 여기에 표시됩니다.',
                    ),
                  )
                else
                  ...active.map(
                    (prayer) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: PrayerCard(prayer: prayer),
                    ),
                  ),
                const SizedBox(height: 14),
                SectionHeader(
                  title: '나의 공동체',
                  description: '${data.groups.length}개 그룹에서 함께하고 있어요.',
                ),
                if (data.groups.isEmpty)
                  const SoftPanel(
                    child: Text('가입한 그룹이 없어요.', style: PrayNoteType.body),
                  )
                else
                  SizedBox(
                    height: 92,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: data.groups.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final group = data.groups[index];
                        return SizedBox(
                          width: 188,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => context.go('/groups/${group.id}'),
                            child: SoftPanel(
                              padding: const EdgeInsets.all(14),
                              radius: 18,
                              child: Row(
                                children: [
                                  const CircleAvatar(
                                    radius: 18,
                                    backgroundColor: Color(0xFFEEF1FF),
                                    foregroundColor: brandColor,
                                    child: Icon(Icons.groups_rounded, size: 19),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          group.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: PrayNoteType.sectionTitle,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${group.memberCount}명 · 기도 ${group.prayerCount}',
                                          style: PrayNoteType.caption,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 20),
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                  leading: const Icon(
                    Icons.auto_awesome_rounded,
                    color: brandColor,
                  ),
                  title: const Text('PrayNote Plus'),
                  subtitle: const Text('더 깊은 기록 기능 살펴보기'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/plus'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TodayPrayerHero extends StatelessWidget {
  const _TodayPrayerHero({required this.streak, required this.onTap});
  final int streak;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFF566FD7), Color(0xFF7588E2)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                streak > 0 ? '$streak일째 기도를 이어가고 있어요' : '오늘의 기도를 시작해요',
                style: PrayNoteType.label.copyWith(
                  color: const Color(0xFFDDE3FF),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '오늘 기도하기',
                style: PrayNoteType.pageTitle.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 5),
              Text(
                '한 문장부터 가볍게 기록해보세요.',
                style: PrayNoteType.caption.copyWith(
                  color: const Color(0xFFE9ECFF),
                ),
              ),
            ],
          ),
        ),
        FilledButton(
          onPressed: onTap,
          style: FilledButton.styleFrom(
            minimumSize: const Size(50, 50),
            backgroundColor: Colors.white,
            foregroundColor: brandColor,
            padding: EdgeInsets.zero,
            shape: const CircleBorder(),
          ),
          child: const Icon(Icons.edit_rounded),
        ),
      ],
    ),
  );
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 42),
          const SizedBox(height: 12),
          const Text('네트워크 연결이 원활하지 않습니다.'),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('다시 시도')),
        ],
      ),
    ),
  );
}
