import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import '../domain/models.dart';
import '../features/dashboard/dashboard_controller.dart';
import '../features/settings/settings_controller.dart';
import 'widgets/prayer_card.dart';
import 'widgets/profile_editor.dart';
import 'widgets/ui_components.dart';

enum _PrayerFilter { all, active, completed }

class MyScreen extends ConsumerStatefulWidget {
  const MyScreen({super.key});

  @override
  ConsumerState<MyScreen> createState() => _MyScreenState();
}

class _MyScreenState extends ConsumerState<MyScreen> {
  late DateTime _visibleMonth;
  late DateTime _selectedDate;
  _PrayerFilter _filter = _PrayerFilter.all;

  @override
  void initState() {
    super.initState();
    final today = DateUtils.dateOnly(DateTime.now());
    _visibleMonth = DateTime(today.year, today.month);
    _selectedDate = today;
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = ref.watch(dashboardProvider);
    final settings = ref.watch(settingsProvider).value;
    return Scaffold(
      appBar: AppBar(title: const Text('마이')),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: OutlinedButton(
            onPressed: () => ref.read(dashboardProvider.notifier).refresh(),
            child: const Text('내 기록 다시 불러오기'),
          ),
        ),
        data: (data) {
          final mine = data.prayers.where((prayer) => prayer.isMine).toList();
          final selected = mine.where((prayer) {
            final date = DateUtils.dateOnly(prayer.createdAt.toLocal());
            return DateUtils.isSameDay(date, _selectedDate);
          }).toList();
          final filtered = mine
              .where(
                (prayer) => switch (_filter) {
                  _PrayerFilter.all => true,
                  _PrayerFilter.active => !prayer.isCompleted,
                  _PrayerFilter.completed => prayer.isCompleted,
                },
              )
              .toList();
          final color =
              profileColors[settings?.account.profileColor] ?? brandColor;

          return RefreshIndicator(
            onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 8, 18, 30),
              children: [
                _ProfileRhythm(
                  name: settings?.account.displayName ?? data.displayName,
                  profileColor: color,
                  prayerCount: mine.length,
                  currentStreak: data.currentStreak,
                  longestStreak: data.longestStreak,
                  onEdit: () => showProfileEditor(context),
                ),
                const SizedBox(height: 20),
                SectionHeader(
                  title: '기도 달력',
                  description: '기록한 날을 누르면 그날의 기도제목을 볼 수 있어요.',
                ),
                SoftPanel(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
                  child: _PrayerCalendar(
                    visibleMonth: _visibleMonth,
                    selectedDate: _selectedDate,
                    prayers: mine,
                    onPrevious: () => setState(() {
                      _visibleMonth = DateTime(
                        _visibleMonth.year,
                        _visibleMonth.month - 1,
                      );
                    }),
                    onNext: () => setState(() {
                      _visibleMonth = DateTime(
                        _visibleMonth.year,
                        _visibleMonth.month + 1,
                      );
                    }),
                    onSelected: (date) => setState(() => _selectedDate = date),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  DateFormat('M월 d일의 기도').format(_selectedDate),
                  style: PrayNoteType.sectionTitle,
                ),
                const SizedBox(height: 9),
                if (selected.isEmpty)
                  const SoftPanel(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      '이날 기록한 기도제목이 없어요.',
                      style: PrayNoteType.caption,
                    ),
                  )
                else
                  ...selected.map(
                    (prayer) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: PrayerCard(prayer: prayer),
                    ),
                  ),
                const SizedBox(height: 20),
                SectionHeader(
                  title: '내 기도제목',
                  description: '진행 중인 기도와 응답받은 기록을 함께 돌아보세요.',
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: Text('전체 ${mine.length}'),
                      selected: _filter == _PrayerFilter.all,
                      onSelected: (_) =>
                          setState(() => _filter = _PrayerFilter.all),
                    ),
                    ChoiceChip(
                      label: Text(
                        '기도 중 ${mine.where((item) => !item.isCompleted).length}',
                      ),
                      selected: _filter == _PrayerFilter.active,
                      onSelected: (_) =>
                          setState(() => _filter = _PrayerFilter.active),
                    ),
                    ChoiceChip(
                      label: Text(
                        '해결됨 ${mine.where((item) => item.isCompleted).length}',
                      ),
                      selected: _filter == _PrayerFilter.completed,
                      onSelected: (_) =>
                          setState(() => _filter = _PrayerFilter.completed),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (filtered.isEmpty)
                  const SoftPanel(
                    child: EmptyState(
                      icon: Icons.menu_book_outlined,
                      title: '표시할 기도제목이 없어요',
                      description: '새 기도제목을 기록하면 이곳에서 관리할 수 있어요.',
                    ),
                  )
                else
                  ...filtered.map(
                    (prayer) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: PrayerCard(prayer: prayer),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProfileRhythm extends StatelessWidget {
  const _ProfileRhythm({
    required this.name,
    required this.profileColor,
    required this.prayerCount,
    required this.currentStreak,
    required this.longestStreak,
    required this.onEdit,
  });

  final String name;
  final Color profileColor;
  final int prayerCount;
  final int currentStreak;
  final int longestStreak;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    const goals = [7, 14, 30, 50, 100];
    final nextGoal = goals.firstWhere(
      (goal) => goal > currentStreak,
      orElse: () => ((currentStreak ~/ 100) + 1) * 100,
    );
    return SoftPanel(
      padding: const EdgeInsets.all(17),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 25, backgroundColor: profileColor),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: PrayNoteType.pageTitle),
                    const SizedBox(height: 2),
                    Text('기도제목 $prayerCount개', style: PrayNoteType.caption),
                  ],
                ),
              ),
              OutlinedButton(
                onPressed: onEdit,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: const Text('프로필 수정'),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF6EE),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(
                  Icons.local_fire_department_rounded,
                  color: Color(0xFF4B9463),
                  size: 21,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$currentStreak일째 기도 중이에요',
                      style: PrayNoteType.sectionTitle,
                    ),
                    Text('역대 최장 $longestStreak일', style: PrayNoteType.caption),
                  ],
                ),
              ),
              Text('다음 $nextGoal일', style: PrayNoteType.label),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: (currentStreak / nextGoal).clamp(0, 1),
            minHeight: 7,
            borderRadius: BorderRadius.circular(10),
            backgroundColor: const Color(0xFFECEFEA),
            color: const Color(0xFF65A77B),
          ),
          const SizedBox(height: 8),
          Text(
            currentStreak == 0
                ? '오늘 한 번의 기도부터 다시 시작해요.'
                : '작은 기도를 꾸준히 이어가고 있어요.',
            style: PrayNoteType.caption,
          ),
        ],
      ),
    );
  }
}

class _PrayerCalendar extends StatelessWidget {
  const _PrayerCalendar({
    required this.visibleMonth,
    required this.selectedDate,
    required this.prayers,
    required this.onPrevious,
    required this.onNext,
    required this.onSelected,
  });

  final DateTime visibleMonth;
  final DateTime selectedDate;
  final List<PrayerItem> prayers;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<DateTime> onSelected;

  @override
  Widget build(BuildContext context) {
    const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    final days = DateUtils.getDaysInMonth(
      visibleMonth.year,
      visibleMonth.month,
    );
    final leading =
        DateTime(visibleMonth.year, visibleMonth.month, 1).weekday - 1;
    return Column(
      children: [
        Row(
          children: [
            IconButton(
              onPressed: onPrevious,
              icon: const Icon(Icons.chevron_left_rounded),
            ),
            Expanded(
              child: Text(
                DateFormat('yyyy년 M월').format(visibleMonth),
                textAlign: TextAlign.center,
                style: PrayNoteType.sectionTitle,
              ),
            ),
            IconButton(
              onPressed: onNext,
              icon: const Icon(Icons.chevron_right_rounded),
            ),
          ],
        ),
        Row(
          children: [
            for (final weekday in weekdays)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    weekday,
                    textAlign: TextAlign.center,
                    style: PrayNoteType.caption,
                  ),
                ),
              ),
          ],
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            childAspectRatio: 0.9,
          ),
          itemCount: leading + days,
          itemBuilder: (context, index) {
            if (index < leading) return const SizedBox.shrink();
            final day = index - leading + 1;
            final date = DateTime(visibleMonth.year, visibleMonth.month, day);
            final count = prayers.where((prayer) {
              return DateUtils.isSameDay(prayer.createdAt.toLocal(), date);
            }).length;
            final selected = DateUtils.isSameDay(date, selectedDate);
            final today = DateUtils.isSameDay(date, DateTime.now());
            return InkWell(
              customBorder: const CircleBorder(),
              onTap: () => onSelected(date),
              child: Container(
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: selected ? brandColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(13),
                  border: today && !selected
                      ? Border.all(color: brandColor)
                      : null,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$day',
                      style: PrayNoteType.label.copyWith(
                        color: selected ? Colors.white : inkColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        count.clamp(0, 3),
                        (_) => Container(
                          width: 4,
                          height: 4,
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          decoration: BoxDecoration(
                            color: selected ? Colors.white : brandColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
