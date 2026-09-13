import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import '../domain/notification_item.dart';
import '../features/notifications/notifications_controller.dart';
import 'widgets/ui_components.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final unread = notifications.value?.where((item) => item.isUnread).length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('알림'),
        actions: [
          TextButton(
            onPressed: unread == null || unread == 0
                ? null
                : () => ref.read(notificationsProvider.notifier).markAllRead(),
            child: const Text('모두 읽음'),
          ),
        ],
      ),
      body: notifications.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: OutlinedButton(
            onPressed: () => ref.invalidate(notificationsProvider),
            child: const Text('알림 다시 불러오기'),
          ),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
          child: items.isEmpty
              ? const _EmptyNotifications()
              : _NotificationGroups(items: items),
        ),
      ),
    );
  }
}

class _NotificationGroups extends ConsumerWidget {
  const _NotificationGroups({required this.items});
  final List<NotificationItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = items
        .where(
          (item) =>
              DateUtils.isSameDay(item.createdAt.toLocal(), DateTime.now()),
        )
        .toList();
    final earlier = items
        .where(
          (item) =>
              !DateUtils.isSameDay(item.createdAt.toLocal(), DateTime.now()),
        )
        .toList();

    Widget group(String title, List<NotificationItem> values) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: title, description: '${values.length}개의 소식'),
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: ColoredBox(
            color: Colors.white,
            child: Column(
              children: [
                for (var index = 0; index < values.length; index++) ...[
                  _NotificationTile(
                    item: values[index],
                    onTap: () async {
                      final item = values[index];
                      await ref
                          .read(notificationsProvider.notifier)
                          .markRead(item);
                      if (!context.mounted) return;
                      if (item.groupId != null) {
                        context.go('/groups/${item.groupId}');
                      }
                    },
                  ),
                  if (index != values.length - 1)
                    const Divider(height: 1, indent: 66),
                ],
              ],
            ),
          ),
        ),
      ],
    );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
      children: [
        if (today.isNotEmpty) group('오늘', today),
        if (today.isNotEmpty && earlier.isNotEmpty) const SizedBox(height: 24),
        if (earlier.isNotEmpty) group('이전 알림', earlier),
      ],
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});
  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: item.isUnread ? const Color(0xFFF5F6FF) : Colors.white,
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 13),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: item.type == 'prayer_response'
                    ? const Color(0xFFFFEDF2)
                    : const Color(0xFFEEF1FF),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(
                item.type == 'prayer_response'
                    ? Icons.favorite_outline_rounded
                    : Icons.notifications_none_rounded,
                size: 20,
                color: item.type == 'prayer_response'
                    ? const Color(0xFFC96682)
                    : brandColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.message,
                    style: PrayNoteType.body.copyWith(
                      fontWeight: item.isUnread
                          ? FontWeight.w500
                          : FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('M월 d일 HH:mm').format(item.createdAt.toLocal()),
                    style: PrayNoteType.caption,
                  ),
                ],
              ),
            ),
            if (item.isUnread)
              const Padding(
                padding: EdgeInsets.only(top: 6, left: 8),
                child: Icon(Icons.circle, size: 8, color: brandColor),
              ),
          ],
        ),
      ),
    ),
  );
}

class _EmptyNotifications extends StatelessWidget {
  const _EmptyNotifications();

  @override
  Widget build(BuildContext context) => ListView(
    physics: const AlwaysScrollableScrollPhysics(),
    padding: const EdgeInsets.all(18),
    children: const [
      SizedBox(height: 120),
      EmptyState(
        icon: Icons.notifications_none_rounded,
        title: '아직 도착한 알림이 없어요',
        description: '새로운 기도와 그룹 소식이 생기면 알려드릴게요.',
      ),
    ],
  );
}
