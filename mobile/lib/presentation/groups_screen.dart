import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import '../features/dashboard/dashboard_controller.dart';
import 'widgets/group_mute_button.dart';
import 'widgets/prayer_card.dart';
import 'widgets/prayer_composer.dart';
import 'widgets/ui_components.dart';

class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('내 그룹')),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _GroupError(
          onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
          child: data.groups.isEmpty
              ? ListView(
                  padding: const EdgeInsets.all(18),
                  children: const [
                    SoftPanel(
                      child: EmptyState(
                        icon: Icons.groups_outlined,
                        title: '아직 참여 중인 그룹이 없어요',
                        description: '초대 링크로 참여하거나 새로운 그룹을 만들어보세요.',
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
                  itemCount: data.groups.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SectionHeader(
                          title: '함께하는 공동체',
                          description:
                              '${data.groups.length}개 그룹의 기도와 소식을 확인하세요.',
                        ),
                      );
                    }
                    final group = data.groups[index - 1];
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () => context.go('/groups/${group.id}'),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEEF1FF),
                                  borderRadius: BorderRadius.circular(15),
                                ),
                                child: const Icon(
                                  Icons.groups_rounded,
                                  color: brandColor,
                                ),
                              ),
                              const SizedBox(width: 13),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      group.name,
                                      style: PrayNoteType.sectionTitle,
                                    ),
                                    if (group.description != null) ...[
                                      const SizedBox(height: 3),
                                      Text(
                                        group.description!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: PrayNoteType.caption,
                                      ),
                                    ],
                                    const SizedBox(height: 7),
                                    Text(
                                      '멤버 ${group.memberCount}명 · 기도 ${group.prayerCount}개',
                                      style: PrayNoteType.label,
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: Color(0xFF8A94A7),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class GroupDetailScreen extends ConsumerWidget {
  const GroupDetailScreen({super.key, required this.groupId});
  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('그룹 상세'),
        actions: [
          GroupMuteButton(groupId: groupId),
          const SizedBox(width: 6),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _GroupError(
          onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
        ),
        data: (data) {
          final matches = data.groups.where((group) => group.id == groupId);
          if (matches.isEmpty) {
            return const Center(child: Text('그룹을 찾을 수 없어요.'));
          }
          final group = matches.first;
          final prayers = data.prayers
              .where((prayer) => prayer.groupIds.contains(groupId))
              .toList();
          final active = prayers
              .where((prayer) => !prayer.isCompleted)
              .toList();
          final completed = prayers
              .where((prayer) => prayer.isCompleted)
              .toList();
          return RefreshIndicator(
            onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 30),
              children: [
                SoftPanel(
                  color: const Color(0xFFF0F3FF),
                  borderColor: const Color(0xFFDDE3FA),
                  padding: const EdgeInsets.all(17),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        radius: 22,
                        backgroundColor: Colors.white,
                        foregroundColor: brandColor,
                        child: Icon(Icons.groups_rounded),
                      ),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(group.name, style: PrayNoteType.pageTitle),
                            const SizedBox(height: 3),
                            Text(
                              group.description ?? '함께 기도하는 공동체',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: PrayNoteType.caption,
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                CountPill(label: '멤버 ${group.memberCount}'),
                                const SizedBox(width: 7),
                                CountPill(label: '기도 ${prayers.length}'),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () =>
                      showPrayerComposer(context, initialGroup: group),
                  icon: const Icon(Icons.edit_rounded, size: 19),
                  label: Text('${group.name}에 기도제목 나누기'),
                ),
                const SizedBox(height: 24),
                SectionHeader(
                  title: '함께 기도 중',
                  description: '${active.length}개의 기도제목이 기다리고 있어요.',
                ),
                if (active.isEmpty)
                  const SoftPanel(
                    child: EmptyState(
                      icon: Icons.favorite_border_rounded,
                      title: '진행 중인 기도제목이 없어요',
                      description: '이 공동체의 첫 기도제목을 나눠보세요.',
                    ),
                  )
                else
                  ...active.map(
                    (prayer) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: PrayerCard(prayer: prayer),
                    ),
                  ),
                if (completed.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SectionHeader(
                    title: '해결된 기도제목',
                    description: '${completed.length}개의 응답을 함께 기억해요.',
                  ),
                  ...completed.map(
                    (prayer) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: PrayerCard(prayer: prayer),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _GroupError extends StatelessWidget {
  const _GroupError({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('그룹을 불러오지 못했어요.'),
        const SizedBox(height: 10),
        OutlinedButton(onPressed: onRetry, child: const Text('다시 시도')),
      ],
    ),
  );
}
