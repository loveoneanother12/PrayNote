import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../domain/settings_models.dart';
import '../features/session/session_controller.dart';

abstract class SettingsRepository {
  Future<AccountSettings> load();
  Future<void> updateProfile(String name, String color);
  Future<void> updateNotifications(Map<String, dynamic> values);
  Future<ReminderTime> addReminder(String time);
  Future<void> removeReminder(String id);
  Future<bool> loadGroupMuted(String groupId);
  Future<void> setGroupMuted(String groupId, bool muted);
  Future<void> unblockUser(String userId);
}

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final session = ref.watch(sessionProvider);
  if (AppConfig.hasSupabase && !session.isDemo) {
    return SupabaseSettingsRepository(Supabase.instance.client);
  }
  return DemoSettingsRepository();
});

class DemoSettingsRepository implements SettingsRepository {
  final _mutedGroups = <String>{};
  var _settings = const AccountSettings(
    userId: 'demo-user',
    email: 'demo@praynote.app',
    displayName: '이현재',
    profileColor: 'indigo',
    notifications: NotificationSettings(),
    reminders: [],
  );

  @override
  Future<AccountSettings> load() async => _settings;

  @override
  Future<void> updateProfile(String name, String color) async {
    _settings = _settings.copyWith(displayName: name, profileColor: color);
  }

  @override
  Future<void> updateNotifications(Map<String, dynamic> values) async {
    final current = _settings.notifications;
    _settings = _settings.copyWith(
      notifications: current.copyWith(
        inAppEnabled: values['in_app_enabled'] as bool?,
        newPrayerEnabled: values['new_prayer_enabled'] as bool?,
        prayerResponseEnabled: values['prayer_response_enabled'] as bool?,
        membershipEnabled: values['membership_enabled'] as bool?,
        noticeEnabled: values['notice_enabled'] as bool?,
        challengeEnabled: values['challenge_enabled'] as bool?,
        quietHoursEnabled: values['quiet_hours_enabled'] as bool?,
        quietStart: _trimTime(values['quiet_start'] as String?),
        quietEnd: _trimTime(values['quiet_end'] as String?),
      ),
    );
  }

  @override
  Future<ReminderTime> addReminder(String time) async {
    final reminder = ReminderTime(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      time: time,
    );
    _settings = _settings.copyWith(
      reminders: [..._settings.reminders, reminder],
    );
    return reminder;
  }

  @override
  Future<void> removeReminder(String id) async {
    _settings = _settings.copyWith(
      reminders: _settings.reminders.where((item) => item.id != id).toList(),
    );
  }

  @override
  Future<bool> loadGroupMuted(String groupId) async =>
      _mutedGroups.contains(groupId);

  @override
  Future<void> setGroupMuted(String groupId, bool muted) async {
    if (muted) {
      _mutedGroups.add(groupId);
    } else {
      _mutedGroups.remove(groupId);
    }
  }

  @override
  Future<void> unblockUser(String userId) async {
    _settings = _settings.copyWith(
      blockedUsers: _settings.blockedUsers
          .where((user) => user.id != userId)
          .toList(),
    );
  }
}

class SupabaseSettingsRepository implements SettingsRepository {
  SupabaseSettingsRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<AccountSettings> load() async {
    final raw = await _client.rpc('get_settings_bundle_fast');
    final bundle = Map<String, dynamic>.from(raw as Map);
    final preferences = Map<String, dynamic>.from(
      bundle['preferences'] as Map? ?? {},
    );
    final reminders = ((bundle['reminder_times'] as List?) ?? const []).map((
      rawItem,
    ) {
      final item = Map<String, dynamic>.from(rawItem as Map);
      return ReminderTime(
        id: item['id'] as String,
        time: _trimTime(item['time_local'] as String?),
      );
    }).toList();
    final blockedUsers = ((bundle['blocked_users'] as List?) ?? const []).map((
      rawItem,
    ) {
      final item = Map<String, dynamic>.from(rawItem as Map);
      return BlockedUser(
        id: item['user_id'] as String,
        displayName: item['display_name'] as String? ?? '사용자',
        profileColor: item['profile_color'] as String? ?? 'indigo',
      );
    }).toList();
    return AccountSettings(
      userId: bundle['user_id'] as String,
      email: bundle['email'] as String? ?? '',
      displayName: bundle['display_name'] as String? ?? '기도하는 사람',
      profileColor: bundle['profile_color'] as String? ?? 'indigo',
      notifications: NotificationSettings(
        inAppEnabled: preferences['in_app_enabled'] as bool? ?? true,
        newPrayerEnabled: preferences['new_prayer_enabled'] as bool? ?? true,
        prayerResponseEnabled:
            preferences['prayer_response_enabled'] as bool? ?? true,
        membershipEnabled: preferences['membership_enabled'] as bool? ?? true,
        noticeEnabled: preferences['notice_enabled'] as bool? ?? true,
        challengeEnabled: preferences['challenge_enabled'] as bool? ?? true,
        pushEnabled: preferences['push_enabled'] as bool? ?? false,
        quietHoursEnabled: preferences['quiet_hours_enabled'] as bool? ?? false,
        quietStart: _trimTime(preferences['quiet_start'] as String?),
        quietEnd: _trimTime(preferences['quiet_end'] as String?),
      ),
      reminders: reminders,
      blockedUsers: blockedUsers,
    );
  }

  @override
  Future<void> updateProfile(String name, String color) async {
    await _client
        .from('profiles')
        .update({'display_name': name, 'profile_color': color})
        .eq('id', _client.auth.currentUser!.id);
  }

  @override
  Future<void> updateNotifications(Map<String, dynamic> values) async {
    await _client
        .from('notification_preferences')
        .update(values)
        .eq('user_id', _client.auth.currentUser!.id);
  }

  @override
  Future<ReminderTime> addReminder(String time) async {
    final row = await _client
        .from('prayer_reminder_times')
        .insert({
          'user_id': _client.auth.currentUser!.id,
          'time_local': '$time:00',
          'enabled': true,
        })
        .select('id, time_local')
        .single();
    return ReminderTime(
      id: row['id'] as String,
      time: _trimTime(row['time_local'] as String?),
    );
  }

  @override
  Future<void> removeReminder(String id) async {
    await _client.from('prayer_reminder_times').delete().eq('id', id);
  }

  @override
  Future<bool> loadGroupMuted(String groupId) async {
    final row = await _client
        .from('group_push_preferences')
        .select('push_muted')
        .eq('user_id', _client.auth.currentUser!.id)
        .eq('group_id', groupId)
        .maybeSingle();
    return row?['push_muted'] as bool? ?? false;
  }

  @override
  Future<void> setGroupMuted(String groupId, bool muted) async {
    await _client.from('group_push_preferences').upsert({
      'user_id': _client.auth.currentUser!.id,
      'group_id': groupId,
      'push_muted': muted,
    });
  }

  @override
  Future<void> unblockUser(String userId) async {
    await _client.rpc('unblock_user', params: {'target_user_id': userId});
  }
}

String _trimTime(String? value) {
  if (value == null || value.length < 5) return '00:00';
  return value.substring(0, 5);
}
