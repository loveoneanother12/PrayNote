import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../domain/settings_models.dart';
import '../features/dashboard/dashboard_controller.dart';
import '../features/session/session_controller.dart';
import '../features/settings/settings_controller.dart';
import '../core/config.dart';
import '../core/theme.dart';
import '../services/native_push_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(settingsProvider.notifier).refreshIfStale();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(settingsProvider.notifier).refreshIfStale();
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final settings = ref.watch(settingsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('설정'),
        actions: [
          IconButton(
            onPressed: () => ref.read(settingsProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded),
            tooltip: '설정 새로고침',
          ),
        ],
      ),
      body: settings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) =>
            _SettingsError(onRetry: () => ref.invalidate(settingsProvider)),
        data: (state) => ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            _SyncStatus(isDemo: session.isDemo, state: state),
            if (state.message != null) ...[
              const SizedBox(height: 10),
              _MessageCard(message: state.message!),
            ],
            const SizedBox(height: 14),
            _AccountNotifications(state: state),
            const SizedBox(height: 14),
            _QuietHours(state: state),
            const SizedBox(height: 14),
            _DeviceNotifications(state: state),
            const SizedBox(height: 14),
            _PrayerReminders(state: state),
            const SizedBox(height: 14),
            _BlockedUsers(state: state),
            const SizedBox(height: 14),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.lock_outline_rounded),
                    title: const Text('개인정보 및 보안'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.help_outline_rounded),
                    title: const Text('사용 가이드'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: ListTile(
                leading: const Icon(Icons.auto_awesome_rounded),
                title: const Text('PrayNote Plus'),
                subtitle: const Text('더 깊은 기록 기능 살펴보기'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.push('/plus'),
              ),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () async {
                await ref
                    .read(nativePushServiceProvider)
                    .unregisterBeforeSignOut();
                await ref.read(sessionProvider.notifier).signOut();
                ref.invalidate(dashboardProvider);
                ref.invalidate(settingsProvider);
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('로그아웃'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BlockedUsers extends ConsumerWidget {
  const _BlockedUsers({required this.state});
  final SettingsState state;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Card(
    child: ExpansionTile(
      leading: const Icon(Icons.person_off_outlined),
      title: const Text('차단한 사용자'),
      subtitle: Text('${state.account.blockedUsers.length}명'),
      children: state.account.blockedUsers.isEmpty
          ? const [
              Padding(
                padding: EdgeInsets.all(18),
                child: Text('차단한 사용자가 없습니다.'),
              ),
            ]
          : state.account.blockedUsers
                .map(
                  (user) => ListTile(
                    title: Text(user.displayName),
                    trailing: TextButton(
                      onPressed: () =>
                          ref.read(settingsProvider.notifier).unblockUser(user),
                      child: const Text('차단 해제'),
                    ),
                  ),
                )
                .toList(),
    ),
  );
}

class _SyncStatus extends StatelessWidget {
  const _SyncStatus({required this.isDemo, required this.state});
  final bool isDemo;
  final SettingsState state;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDemo ? const Color(0xFFFFF7E6) : const Color(0xFFEEF7F1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isDemo ? Icons.science_outlined : Icons.cloud_done_outlined,
              color: isDemo ? const Color(0xFFA06C10) : const Color(0xFF43815B),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isDemo ? '로컬 체험 설정' : '계정 설정 동기화됨',
                    style: PrayNoteType.label.copyWith(color: inkColor),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isDemo ? '실제 계정 데이터는 변경되지 않아요.' : '웹과 앱에서 같은 계정 설정을 사용해요.',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6F7A8D),
                    ),
                  ),
                ],
              ),
            ),
            if (state.pendingKeys.isNotEmpty)
              const SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
          ],
        ),
      ),
    );
  }
}

class _AccountNotifications extends ConsumerWidget {
  const _AccountNotifications({required this.state});
  final SettingsState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = state.account.notifications;
    final controller = ref.read(settingsProvider.notifier);
    return _SectionCard(
      title: '계정 알림',
      description: '웹과 앱에 동일하게 적용됩니다.',
      children: [
        _SettingSwitch(
          title: '인앱 알림 받기',
          value: notifications.inAppEnabled,
          pending: state.pendingKeys.contains('in_app_enabled'),
          onChanged: (value) => controller.updateNotification(
            'in_app_enabled',
            value,
            notifications.copyWith(inAppEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '새 기도제목',
          value: notifications.newPrayerEnabled,
          pending: state.pendingKeys.contains('new_prayer_enabled'),
          onChanged: (value) => controller.updateNotification(
            'new_prayer_enabled',
            value,
            notifications.copyWith(newPrayerEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '오늘의 기도완료',
          value: notifications.prayerResponseEnabled,
          pending: state.pendingKeys.contains('prayer_response_enabled'),
          onChanged: (value) => controller.updateNotification(
            'prayer_response_enabled',
            value,
            notifications.copyWith(prayerResponseEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '그룹과 멤버',
          value: notifications.membershipEnabled,
          pending: state.pendingKeys.contains('membership_enabled'),
          onChanged: (value) => controller.updateNotification(
            'membership_enabled',
            value,
            notifications.copyWith(membershipEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '공지사항',
          value: notifications.noticeEnabled,
          pending: state.pendingKeys.contains('notice_enabled'),
          onChanged: (value) => controller.updateNotification(
            'notice_enabled',
            value,
            notifications.copyWith(noticeEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '기도 챌린지',
          value: notifications.challengeEnabled,
          pending: state.pendingKeys.contains('challenge_enabled'),
          onChanged: (value) => controller.updateNotification(
            'challenge_enabled',
            value,
            notifications.copyWith(challengeEnabled: value),
          ),
        ),
        _SettingSwitch(
          title: '외부 푸시 전체 허용',
          subtitle: '계정 전체에 적용되는 알림 의사 설정',
          value: notifications.pushEnabled,
          pending: state.pendingKeys.contains('push_enabled'),
          onChanged: (value) => controller.updateNotification(
            'push_enabled',
            value,
            notifications.copyWith(pushEnabled: value),
          ),
        ),
      ],
    );
  }
}

class _QuietHours extends ConsumerWidget {
  const _QuietHours({required this.state});
  final SettingsState state;

  Future<String?> _pick(BuildContext context, String value) async {
    final parts = value.split(':');
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: int.parse(parts[0]),
        minute: int.parse(parts[1]),
      ),
    );
    if (selected == null) return null;
    return '${selected.hour.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = state.account.notifications;
    final controller = ref.read(settingsProvider.notifier);
    return _SectionCard(
      title: '방해금지 시간',
      description: '계정에 저장되어 모든 기기에 적용됩니다.',
      children: [
        _SettingSwitch(
          title: '방해금지 사용',
          value: value.quietHoursEnabled,
          pending: state.pendingKeys.contains('quiet_hours'),
          onChanged: (enabled) => controller.updateQuietHours(
            enabled: enabled,
            start: value.quietStart,
            end: value.quietEnd,
          ),
        ),
        if (value.quietHoursEnabled)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
            child: Row(
              children: [
                Expanded(
                  child: _TimeButton(
                    label: '시작',
                    value: value.quietStart,
                    onTap: () async {
                      final time = await _pick(context, value.quietStart);
                      if (time != null) {
                        await controller.updateQuietHours(
                          enabled: true,
                          start: time,
                          end: value.quietEnd,
                        );
                      }
                    },
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('~'),
                ),
                Expanded(
                  child: _TimeButton(
                    label: '종료',
                    value: value.quietEnd,
                    onTap: () async {
                      final time = await _pick(context, value.quietEnd);
                      if (time != null) {
                        await controller.updateQuietHours(
                          enabled: true,
                          start: value.quietStart,
                          end: time,
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _DeviceNotifications extends ConsumerWidget {
  const _DeviceNotifications({required this.state});
  final SettingsState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _SectionCard(
      title: '이 기기 설정',
      description: '이 휴대폰에만 저장되며 웹이나 다른 기기를 바꾸지 않습니다.',
      children: [
        _SettingSwitch(
          title: '이 기기에서 푸시 사용',
          subtitle: AppConfig.hasFirebase
              ? '이 휴대폰의 시스템 알림 권한과 연결됩니다.'
              : '지금 켜두면 Firebase 연결 후 자동으로 활성화됩니다.',
          value: state.devicePushEnabled,
          pending: state.pendingKeys.contains('device_push_enabled'),
          onChanged: (value) =>
              ref.read(settingsProvider.notifier).setDevicePush(value),
        ),
      ],
    );
  }
}

class _PrayerReminders extends ConsumerWidget {
  const _PrayerReminders({required this.state});
  final SettingsState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(settingsProvider.notifier);
    return _SectionCard(
      title: '매일 기도 알림',
      description: '최대 5개까지 계정에 저장됩니다.',
      children: [
        for (final reminder in state.account.reminders)
          ListTile(
            leading: const Icon(Icons.schedule_rounded),
            title: Text(
              reminder.time,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            trailing: IconButton(
              onPressed: () => controller.removeReminder(reminder),
              icon: const Icon(Icons.close_rounded),
              tooltip: '삭제',
            ),
          ),
        if (state.account.reminders.length < 5)
          ListTile(
            leading: const Icon(Icons.add_alarm_rounded),
            title: const Text('시간 추가'),
            onTap: () async {
              final time = await showTimePicker(
                context: context,
                initialTime: const TimeOfDay(hour: 21, minute: 0),
              );
              if (time == null) return;
              final value =
                  '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
              await controller.addReminder(value);
            },
          ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.description,
    required this.children,
  });
  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(4, 4, 4, 9),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: PrayNoteType.sectionTitle),
            const SizedBox(height: 3),
            Text(description, style: PrayNoteType.caption),
          ],
        ),
      ),
      Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: lineColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(children: children),
      ),
    ],
  );
}

class _SettingSwitch extends StatelessWidget {
  const _SettingSwitch({
    required this.title,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.pending = false,
  });
  final String title;
  final String? subtitle;
  final bool value;
  final bool pending;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => SwitchListTile.adaptive(
    title: Text(title),
    subtitle: subtitle == null
        ? null
        : Text(subtitle!, style: const TextStyle(fontSize: 12)),
    value: value,
    onChanged: pending ? null : onChanged,
    secondary: pending
        ? const SizedBox.square(
            dimension: 17,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : null,
  );
}

class _TimeButton extends StatelessWidget {
  const _TimeButton({
    required this.label,
    required this.value,
    required this.onTap,
  });
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => OutlinedButton(
    onPressed: onTap,
    child: Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11)),
        Text(value, style: PrayNoteType.sectionTitle),
      ],
    ),
  );
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Card(
    color: const Color(0xFFFFEEEE),
    child: Padding(padding: const EdgeInsets.all(14), child: Text(message)),
  );
}

class _SettingsError extends StatelessWidget {
  const _SettingsError({required this.onRetry});
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('설정을 불러오지 못했어요.'),
        const SizedBox(height: 10),
        OutlinedButton(onPressed: onRetry, child: const Text('다시 시도')),
      ],
    ),
  );
}
