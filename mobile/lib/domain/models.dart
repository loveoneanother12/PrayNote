class PrayNoteGroup {
  const PrayNoteGroup({
    required this.id,
    required this.name,
    required this.memberCount,
    required this.prayerCount,
    this.description,
  });
  final String id;
  final String name;
  final String? description;
  final int memberCount;
  final int prayerCount;
}

class PrayerItem {
  const PrayerItem({
    required this.id,
    required this.content,
    required this.authorName,
    required this.authorId,
    required this.createdAt,
    required this.groupIds,
    required this.groupNames,
    required this.isPersonal,
    required this.isMine,
    this.isCompleted = false,
    this.hasPrayed = false,
    this.responseCount = 0,
  });
  final String id;
  final String content;
  final String authorName;
  final String? authorId;
  final DateTime createdAt;
  final List<String> groupIds;
  final List<String> groupNames;
  final bool isPersonal;
  final bool isMine;
  final bool isCompleted;
  final bool hasPrayed;
  final int responseCount;

  PrayerItem copyWith({
    bool? isCompleted,
    bool? hasPrayed,
    int? responseCount,
  }) {
    return PrayerItem(
      id: id,
      content: content,
      authorName: authorName,
      authorId: authorId,
      createdAt: createdAt,
      groupIds: groupIds,
      groupNames: groupNames,
      isPersonal: isPersonal,
      isMine: isMine,
      isCompleted: isCompleted ?? this.isCompleted,
      hasPrayed: hasPrayed ?? this.hasPrayed,
      responseCount: responseCount ?? this.responseCount,
    );
  }
}

class DashboardData {
  const DashboardData({
    required this.userId,
    required this.displayName,
    required this.groups,
    required this.prayers,
    required this.currentStreak,
    required this.longestStreak,
  });
  final String userId;
  final String displayName;
  final List<PrayNoteGroup> groups;
  final List<PrayerItem> prayers;
  final int currentStreak;
  final int longestStreak;

  DashboardData copyWith({List<PrayerItem>? prayers}) => DashboardData(
    userId: userId,
    displayName: displayName,
    groups: groups,
    prayers: prayers ?? this.prayers,
    currentStreak: currentStreak,
    longestStreak: longestStreak,
  );
}
