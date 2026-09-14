class NotificationSettings {
  const NotificationSettings({
    this.inAppEnabled = true,
    this.newPrayerEnabled = true,
    this.prayerResponseEnabled = true,
    this.membershipEnabled = true,
    this.noticeEnabled = true,
    this.challengeEnabled = true,
    this.pushEnabled = false,
    this.quietHoursEnabled = false,
    this.quietStart = '22:00',
    this.quietEnd = '07:00',
  });

  final bool inAppEnabled;
  final bool newPrayerEnabled;
  final bool prayerResponseEnabled;
  final bool membershipEnabled;
  final bool noticeEnabled;
  final bool challengeEnabled;
  final bool pushEnabled;
  final bool quietHoursEnabled;
  final String quietStart;
  final String quietEnd;

  NotificationSettings copyWith({
    bool? inAppEnabled,
    bool? newPrayerEnabled,
    bool? prayerResponseEnabled,
    bool? membershipEnabled,
    bool? noticeEnabled,
    bool? challengeEnabled,
    bool? pushEnabled,
    bool? quietHoursEnabled,
    String? quietStart,
    String? quietEnd,
  }) {
    return NotificationSettings(
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
      newPrayerEnabled: newPrayerEnabled ?? this.newPrayerEnabled,
      prayerResponseEnabled:
          prayerResponseEnabled ?? this.prayerResponseEnabled,
      membershipEnabled: membershipEnabled ?? this.membershipEnabled,
      noticeEnabled: noticeEnabled ?? this.noticeEnabled,
      challengeEnabled: challengeEnabled ?? this.challengeEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietStart: quietStart ?? this.quietStart,
      quietEnd: quietEnd ?? this.quietEnd,
    );
  }
}

class ReminderTime {
  const ReminderTime({required this.id, required this.time});
  final String id;
  final String time;
}

class BlockedUser {
  const BlockedUser({
    required this.id,
    required this.displayName,
    required this.profileColor,
  });
  final String id;
  final String displayName;
  final String profileColor;
}

class AccountSettings {
  const AccountSettings({
    required this.userId,
    required this.email,
    required this.displayName,
    required this.profileColor,
    required this.notifications,
    required this.reminders,
    this.blockedUsers = const [],
  });

  final String userId;
  final String email;
  final String displayName;
  final String profileColor;
  final NotificationSettings notifications;
  final List<ReminderTime> reminders;
  final List<BlockedUser> blockedUsers;

  AccountSettings copyWith({
    String? displayName,
    String? profileColor,
    NotificationSettings? notifications,
    List<ReminderTime>? reminders,
    List<BlockedUser>? blockedUsers,
  }) {
    return AccountSettings(
      userId: userId,
      email: email,
      displayName: displayName ?? this.displayName,
      profileColor: profileColor ?? this.profileColor,
      notifications: notifications ?? this.notifications,
      reminders: reminders ?? this.reminders,
      blockedUsers: blockedUsers ?? this.blockedUsers,
    );
  }
}

class SettingsState {
  const SettingsState({
    required this.account,
    required this.devicePushEnabled,
    required this.lastSyncedAt,
    this.pendingKeys = const {},
    this.message,
  });

  final AccountSettings account;
  final bool devicePushEnabled;
  final DateTime lastSyncedAt;
  final Set<String> pendingKeys;
  final String? message;

  SettingsState copyWith({
    AccountSettings? account,
    bool? devicePushEnabled,
    DateTime? lastSyncedAt,
    Set<String>? pendingKeys,
    String? message,
    bool clearMessage = false,
  }) {
    return SettingsState(
      account: account ?? this.account,
      devicePushEnabled: devicePushEnabled ?? this.devicePushEnabled,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      pendingKeys: pendingKeys ?? this.pendingKeys,
      message: clearMessage ? null : message ?? this.message,
    );
  }
}
