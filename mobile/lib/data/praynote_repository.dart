import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../domain/models.dart';
import '../features/session/session_controller.dart';

abstract class PrayNoteRepository {
  Future<DashboardData> loadDashboard();
  Future<PrayerItem> createPrayer({
    required String content,
    required List<PrayNoteGroup> groups,
    required bool isPersonal,
  });
  Future<bool> togglePrayed(String prayerId);
  Future<void> setPrayerCompleted(String prayerId, bool completed);
  Future<void> reportPrayer(String prayerId, String reason, String? details);
  Future<void> blockUser(String userId);
}

final repositoryProvider = Provider<PrayNoteRepository>((ref) {
  final session = ref.watch(sessionProvider);
  if (AppConfig.hasSupabase && !session.isDemo) {
    return SupabasePrayNoteRepository(Supabase.instance.client);
  }
  return DemoPrayNoteRepository();
});

class DemoPrayNoteRepository implements PrayNoteRepository {
  final _groups = const [
    PrayNoteGroup(
      id: 'group-1',
      name: '우리 교회 청년부',
      description: '서로의 한 주를 기억하며 함께 기도해요.',
      memberCount: 12,
      prayerCount: 3,
    ),
    PrayNoteGroup(
      id: 'group-2',
      name: '가족 기도방',
      description: '가족의 기도제목을 나누는 공간',
      memberCount: 5,
      prayerCount: 2,
    ),
  ];

  late final List<PrayerItem> _prayers = [
    PrayerItem(
      id: 'prayer-1',
      content: '이번 주 중요한 선택 앞에서 지혜롭게 결정할 수 있도록 기도해주세요.',
      authorName: '이현재',
      authorId: 'demo-user',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      groupIds: const ['group-1'],
      groupNames: const ['우리 교회 청년부'],
      isPersonal: false,
      isMine: true,
      responseCount: 3,
    ),
    PrayerItem(
      id: 'prayer-2',
      content: '가족 모두 건강하고 서로를 더 따뜻하게 이해할 수 있기를 기도해요.',
      authorName: '서진',
      authorId: 'demo-other',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      groupIds: const ['group-2'],
      groupNames: const ['가족 기도방'],
      isPersonal: false,
      isMine: false,
      responseCount: 5,
      hasPrayed: true,
    ),
    PrayerItem(
      id: 'prayer-3',
      content: '오늘 하루 조급해하지 않고 감사하는 마음을 지킬 수 있도록.',
      authorName: '이현재',
      authorId: 'demo-user',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      groupIds: const [],
      groupNames: const [],
      isPersonal: true,
      isMine: true,
    ),
  ];

  @override
  Future<DashboardData> loadDashboard() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return DashboardData(
      userId: 'demo-user',
      displayName: '이현재',
      groups: _groups,
      prayers: List.unmodifiable(_prayers),
      currentStreak: 3,
      longestStreak: 12,
    );
  }

  @override
  Future<PrayerItem> createPrayer({
    required String content,
    required List<PrayNoteGroup> groups,
    required bool isPersonal,
  }) async {
    final prayer = PrayerItem(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      content: content.trim(),
      authorName: '이현재',
      authorId: 'demo-user',
      createdAt: DateTime.now(),
      groupIds: groups.map((group) => group.id).toList(),
      groupNames: groups.map((group) => group.name).toList(),
      isPersonal: isPersonal,
      isMine: true,
    );
    _prayers.insert(0, prayer);
    return prayer;
  }

  @override
  Future<void> setPrayerCompleted(String prayerId, bool completed) async {
    final index = _prayers.indexWhere((prayer) => prayer.id == prayerId);
    if (index >= 0) {
      _prayers[index] = _prayers[index].copyWith(isCompleted: completed);
    }
  }

  @override
  Future<bool> togglePrayed(String prayerId) async {
    final index = _prayers.indexWhere((prayer) => prayer.id == prayerId);
    if (index < 0) return false;
    final next = !_prayers[index].hasPrayed;
    _prayers[index] = _prayers[index].copyWith(
      hasPrayed: next,
      responseCount: (_prayers[index].responseCount + (next ? 1 : -1)).clamp(
        0,
        9999,
      ),
    );
    return next;
  }

  @override
  Future<void> reportPrayer(
    String prayerId,
    String reason,
    String? details,
  ) async {
    _prayers.removeWhere((prayer) => prayer.id == prayerId);
  }

  @override
  Future<void> blockUser(String userId) async {
    _prayers.removeWhere((prayer) => prayer.authorId == userId);
  }
}

class SupabasePrayNoteRepository implements PrayNoteRepository {
  SupabasePrayNoteRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<DashboardData> loadDashboard() async {
    final raw = await _client.rpc('get_dashboard_bundle_fast');
    final bundle = Map<String, dynamic>.from(raw as Map);
    final overview = Map<String, dynamic>.from(
      bundle['overview'] as Map? ?? {},
    );
    final groups = ((overview['groups'] as List?) ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .map(
          (item) => PrayNoteGroup(
            id: item['id'] as String,
            name: item['name'] as String? ?? '그룹',
            description: item['description'] as String?,
            memberCount: _asInt(item['member_count']),
            prayerCount: _asInt(item['active_prayer_count']),
          ),
        )
        .toList();
    final userId = bundle['user_id'] as String? ?? _client.auth.currentUser!.id;
    final prayerMap = <String, PrayerItem>{};
    for (final rawItem in [
      ...((bundle['group_prayers'] as List?) ?? const []),
      ...((bundle['personal_prayers'] as List?) ?? const []),
    ]) {
      final item = Map<String, dynamic>.from(rawItem as Map);
      prayerMap[item['id'] as String] = _mapPrayer(item, userId);
    }
    var currentStreak = 0;
    var longestStreak = 0;
    try {
      final rhythmRaw = await _client.rpc('get_my_prayers_bundle_fast');
      final rhythmBundle = Map<String, dynamic>.from(rhythmRaw as Map);
      final rhythm = Map<String, dynamic>.from(
        rhythmBundle['prayer_rhythm'] as Map? ?? {},
      );
      currentStreak = _asInt(rhythm['current_streak']);
      longestStreak = _asInt(rhythm['longest_streak']);
    } catch (_) {
      // Optional rhythm data must not block the main dashboard.
    }
    return DashboardData(
      userId: userId,
      displayName: overview['display_name'] as String? ?? '기도하는 사람',
      groups: groups,
      prayers: prayerMap.values.toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
      currentStreak: currentStreak,
      longestStreak: longestStreak,
    );
  }

  @override
  Future<PrayerItem> createPrayer({
    required String content,
    required List<PrayNoteGroup> groups,
    required bool isPersonal,
  }) async {
    final id = await _client.rpc(
      'create_prayer_with_groups',
      params: {
        'prayer_content': content.trim(),
        'target_group_ids': groups.map((group) => group.id).toList(),
        'is_personal': isPersonal,
      },
    ) as String;
    final user = _client.auth.currentUser!;
    return PrayerItem(
      id: id,
      content: content.trim(),
      authorName: user.userMetadata?['display_name'] as String? ?? '나',
      authorId: user.id,
      createdAt: DateTime.now(),
      groupIds: groups.map((group) => group.id).toList(),
      groupNames: groups.map((group) => group.name).toList(),
      isPersonal: isPersonal,
      isMine: true,
    );
  }

  @override
  Future<void> setPrayerCompleted(String prayerId, bool completed) async {
    await _client
        .from('prayer_requests')
        .update({
          'status': completed ? 'completed' : 'active',
          'completed_at': completed
              ? DateTime.now().toUtc().toIso8601String()
              : null,
        })
        .eq('id', prayerId);
  }

  @override
  Future<bool> togglePrayed(String prayerId) async {
    final result = await _client.rpc(
      'toggle_prayer_response',
      params: {'target_prayer_id': prayerId},
    );
    return result == true;
  }

  @override
  Future<void> reportPrayer(
    String prayerId,
    String reason,
    String? details,
  ) async {
    await _client.rpc(
      'report_prayer',
      params: {
        'target_prayer_id': prayerId,
        'report_reason': reason,
        'report_details': details?.trim().isEmpty == true
            ? null
            : details?.trim(),
      },
    );
  }

  @override
  Future<void> blockUser(String userId) async {
    await _client.rpc('block_user', params: {'target_user_id': userId});
  }

  static PrayerItem _mapPrayer(Map<String, dynamic> item, String userId) {
    return PrayerItem(
      id: item['id'] as String,
      content: item['content'] as String? ?? '',
      authorName: item['author_name'] as String? ?? '탈퇴한 사용자',
      authorId: item['author_id'] as String?,
      createdAt:
          DateTime.tryParse(item['created_at'] as String? ?? '') ??
          DateTime.now(),
      groupIds: ((item['group_ids'] as List?) ?? const []).cast<String>(),
      groupNames: ((item['group_names'] as List?) ?? const []).cast<String>(),
      isPersonal: item['is_personal'] == true,
      isMine: item['author_id'] == userId,
      isCompleted: item['status'] == 'completed',
      hasPrayed: item['has_prayed'] == true,
      responseCount: _asInt(item['response_count']),
    );
  }

  static int _asInt(dynamic value) => switch (value) {
    int number => number,
    num number => number.toInt(),
    String text => int.tryParse(text) ?? 0,
    _ => 0,
  };
}
