import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/settings_repository.dart';
import '../../domain/settings_models.dart';
import '../dashboard/dashboard_controller.dart';
import '../session/session_controller.dart';
import '../../services/native_push_service.dart';

final settingsProvider =
    AsyncNotifierProvider<SettingsController, SettingsState>(
      SettingsController.new,
    );

class SettingsController extends AsyncNotifier<SettingsState> {
  static const _devicePushKey = 'device_push_enabled';
  static const _staleAfter = Duration(minutes: 3);
  SettingsRepository get _repository => ref.read(settingsRepositoryProvider);

  @override
  Future<SettingsState> build() async {
    final account = await _repository.load();
    final preferences = ref.read(sharedPreferencesProvider);
    return SettingsState(
      account: account,
      devicePushEnabled: preferences.getBool(_devicePushKey) ?? false,
      lastSyncedAt: DateTime.now(),
    );
  }

  Future<void> refreshIfStale() async {
    final current = state.value;
    if (current == null ||
        DateTime.now().difference(current.lastSyncedAt) >= _staleAfter) {
      await refresh();
    }
  }

  Future<void> refresh() async {
    final previous = state.value;
    try {
      final account = await _repository.load();
      state = AsyncData(
        SettingsState(
          account: account,
          devicePushEnabled: previous?.devicePushEnabled ?? false,
          lastSyncedAt: DateTime.now(),
        ),
      );
    } catch (_) {
      if (previous == null) rethrow;
      state = AsyncData(previous.copyWith(message: '설정을 새로 불러오지 못했어요.'));
    }
  }

  Future<bool> updateProfile(String name, String color) async {
    final current = state.value;
    if (current == null) return false;
    final nextAccount = current.account.copyWith(
      displayName: name,
      profileColor: color,
    );
    _optimistic(current.copyWith(account: nextAccount), 'profile');
    try {
      await _repository.updateProfile(name, color);
      _finish('profile');
      ref.invalidate(dashboardProvider);
      return true;
    } catch (_) {
      state = AsyncData(current.copyWith(message: '프로필을 저장하지 못했어요.'));
      return false;
    }
  }

  Future<void> updateNotification(
    String column,
    bool value,
    NotificationSettings next,
  ) async {
    final current = state.value;
    if (current == null) return;
    _optimistic(
      current.copyWith(account: current.account.copyWith(notifications: next)),
      column,
    );
    try {
      await _repository.updateNotifications({column: value});
      _finish(column);
    } catch (_) {
      state = AsyncData(current.copyWith(message: '설정을 저장하지 못했어요.'));
    }
  }

  Future<void> updateQuietHours({
    required bool enabled,
    required String start,
    required String end,
  }) async {
    final current = state.value;
    if (current == null) return;
    final next = current.account.notifications.copyWith(
      quietHoursEnabled: enabled,
      quietStart: start,
      quietEnd: end,
    );
    _optimistic(
      current.copyWith(account: current.account.copyWith(notifications: next)),
      'quiet_hours',
    );
    try {
      await _repository.updateNotifications({
        'quiet_hours_enabled': enabled,
        'quiet_start': '$start:00',
        'quiet_end': '$end:00',
      });
      _finish('quiet_hours');
    } catch (_) {
      state = AsyncData(current.copyWith(message: '방해금지 시간을 저장하지 못했어요.'));
    }
  }

  Future<void> setDevicePush(bool enabled) async {
    final current = state.value;
    if (current == null) return;
    final pending = {...current.pendingKeys, _devicePushKey};
    state = AsyncData(
      current.copyWith(
        devicePushEnabled: enabled,
        pendingKeys: pending,
        clearMessage: true,
      ),
    );
    await ref.read(sharedPreferencesProvider).setBool(_devicePushKey, enabled);
    final service = ref.read(nativePushServiceProvider);
    if (!enabled) {
      await service.disable();
      _finish(_devicePushKey);
      return;
    }
    final result = await service.enable();
    if (result == NativePushStatus.denied ||
        result == NativePushStatus.failed) {
      await ref.read(sharedPreferencesProvider).setBool(_devicePushKey, false);
      state = AsyncData(
        current.copyWith(
          devicePushEnabled: false,
          message: result == NativePushStatus.denied
              ? '휴대폰 설정에서 PrayNote 알림 권한을 허용해주세요.'
              : '푸시 알림 연결을 완료하지 못했어요.',
        ),
      );
      return;
    }
    final latest = state.value;
    if (result == NativePushStatus.notConfigured && latest != null) {
      state = AsyncData(
        latest.copyWith(
          pendingKeys: {...latest.pendingKeys}..remove(_devicePushKey),
          message: '알림 사용 의사를 저장했어요. Firebase 연결 후 자동으로 활성화됩니다.',
        ),
      );
      return;
    }
    _finish(_devicePushKey);
  }

  Future<bool> addReminder(String time) async {
    final current = state.value;
    if (current == null || current.account.reminders.length >= 5) return false;
    try {
      final reminder = await _repository.addReminder(time);
      state = AsyncData(
        current.copyWith(
          account: current.account.copyWith(
            reminders: [...current.account.reminders, reminder],
          ),
        ),
      );
      return true;
    } catch (_) {
      state = AsyncData(current.copyWith(message: '기도 알림 시간을 추가하지 못했어요.'));
      return false;
    }
  }

  Future<void> removeReminder(ReminderTime reminder) async {
    final current = state.value;
    if (current == null) return;
    final next = current.account.reminders
        .where((item) => item.id != reminder.id)
        .toList();
    state = AsyncData(
      current.copyWith(account: current.account.copyWith(reminders: next)),
    );
    try {
      await _repository.removeReminder(reminder.id);
    } catch (_) {
      state = AsyncData(current.copyWith(message: '알림 시간을 삭제하지 못했어요.'));
    }
  }

  Future<void> unblockUser(BlockedUser user) async {
    final current = state.value;
    if (current == null) return;
    final nextUsers = current.account.blockedUsers
        .where((item) => item.id != user.id)
        .toList();
    state = AsyncData(
      current.copyWith(
        account: current.account.copyWith(blockedUsers: nextUsers),
      ),
    );
    try {
      await _repository.unblockUser(user.id);
    } catch (_) {
      state = AsyncData(current.copyWith(message: '차단을 해제하지 못했어요.'));
    }
  }

  void _optimistic(SettingsState next, String key) {
    state = AsyncData(
      next.copyWith(
        pendingKeys: {...next.pendingKeys, key},
        clearMessage: true,
      ),
    );
  }

  void _finish(String key) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        pendingKeys: {...current.pendingKeys}..remove(key),
        lastSyncedAt: DateTime.now(),
      ),
    );
  }
}
