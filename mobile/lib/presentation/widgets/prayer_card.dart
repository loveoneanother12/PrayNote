import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../domain/models.dart';
import '../../core/theme.dart';
import '../../features/dashboard/dashboard_controller.dart';

class PrayerCard extends ConsumerWidget {
  const PrayerCard({super.key, required this.prayer});
  final PrayerItem prayer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final date = DateFormat('M월 d일').format(prayer.createdAt.toLocal());
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 15, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: Color(0xFF8393E8),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          prayer.isMine ? '나' : prayer.authorName,
                          overflow: TextOverflow.ellipsis,
                          style: PrayNoteType.label.copyWith(color: inkColor),
                        ),
                      ),
                      const SizedBox(width: 7),
                      Flexible(
                        child: Text(
                          prayer.isPersonal
                              ? '개인기도'
                              : prayer.groupNames.join(' · '),
                          overflow: TextOverflow.ellipsis,
                          style: PrayNoteType.caption,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(date, style: PrayNoteType.caption),
                if (prayer.isMine)
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.more_horiz_rounded, size: 20),
                    tooltip: '기도제목 관리',
                    onSelected: (value) {
                      if (value == 'complete') {
                        ref
                            .read(dashboardProvider.notifier)
                            .toggleCompleted(prayer);
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'complete',
                        child: Row(
                          children: [
                            Icon(
                              prayer.isCompleted
                                  ? Icons.check_box_rounded
                                  : Icons.check_box_outline_blank_rounded,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Text(prayer.isCompleted ? '해결 취소' : '기도제목 해결'),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              prayer.content,
              style: PrayNoteType.body.copyWith(
                fontSize: 16,
                decoration: prayer.isCompleted
                    ? TextDecoration.lineThrough
                    : null,
                color: prayer.isCompleted
                    ? const Color(0xFF8B94A6)
                    : const Color(0xFF27324A),
              ),
            ),
            const SizedBox(height: 13),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.tonalIcon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 42),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  backgroundColor: prayer.hasPrayed
                      ? const Color(0xFFFFE9EF)
                      : const Color(0xFFF1F3FA),
                  foregroundColor: prayer.hasPrayed
                      ? const Color(0xFFC45D7B)
                      : const Color(0xFF56647C),
                ),
                onPressed: prayer.isCompleted
                    ? null
                    : () => ref
                          .read(dashboardProvider.notifier)
                          .togglePrayed(prayer),
                icon: Icon(
                  prayer.hasPrayed
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  size: 18,
                ),
                label: Text('기도했어요 ${prayer.responseCount}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
