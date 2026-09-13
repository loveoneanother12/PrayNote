import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../domain/notification_item.dart';
import '../features/session/session_controller.dart';

abstract class NotificationRepository {
  Future<List<NotificationItem>> load();
  Future<void> markRead(String id);
  Future<void> markAllRead();
}

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final session = ref.watch(sessionProvider);
  if (AppConfig.hasSupabase && !session.isDemo) {
    return SupabaseNotificationRepository(Supabase.instance.client);
  }
  return const DemoNotificationRepository();
});

class DemoNotificationRepository implements NotificationRepository {
  const DemoNotificationRepository();

  @override
  Future<List<NotificationItem>> load() async => [
    NotificationItem(
      id: 'demo-notification',
      type: 'prayer_response',
      message: '서진님이 오늘 내 기도제목을 위해 기도했어요.',
      createdAt: DateTime.now().subtract(const Duration(minutes: 12)),
    ),
  ];

  @override
  Future<void> markAllRead() async {}

  @override
  Future<void> markRead(String id) async {}
}

class SupabaseNotificationRepository implements NotificationRepository {
  const SupabaseNotificationRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<List<NotificationItem>> load() async {
    final raw = await _client.rpc(
      'get_notifications_page_bundle_fast',
      params: {'result_limit': 100},
    );
    final bundle = Map<String, dynamic>.from(raw as Map);
    return ((bundle['notifications'] as List?) ?? const []).map((rawItem) {
      final item = Map<String, dynamic>.from(rawItem as Map);
      return NotificationItem(
        id: item['id'] as String,
        type: item['type'] as String? ?? 'new_prayer',
        message: _message(item),
        groupId: item['group_id'] as String?,
        prayerId: item['prayer_id'] as String?,
        createdAt:
            DateTime.tryParse(item['created_at'] as String? ?? '') ??
            DateTime.now(),
        readAt: DateTime.tryParse(item['read_at'] as String? ?? ''),
      );
    }).toList();
  }

  @override
  Future<void> markRead(String id) async {
    await _client
        .from('notifications')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', id);
  }

  @override
  Future<void> markAllRead() async {
    await _client
        .from('notifications')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .isFilter('read_at', null)
        .eq('recipient_id', _client.auth.currentUser!.id);
  }

  static String _message(Map<String, dynamic> item) {
    final actorName = item['actor_name'] as String?;
    final groupName = item['group_name'] as String?;
    final actor = actorName == null ? '누군가가' : '$actorName님이';
    final group = groupName == null ? '그룹' : '‘$groupName’';
    return switch (item['type']) {
      'new_prayer' => '$actor $group에 새 기도제목을 나눴어요.',
      'prayer_response' => '$actor 오늘 내 기도제목을 위해 기도했어요.',
      'membership_requested' => '$actor $group 가입을 신청했어요.',
      'membership_approved' => '$group 가입 신청이 승인됐어요.',
      'membership_rejected' => '$group 가입 신청이 승인되지 않았어요.',
      'role_changed' => '$group의 역할이 변경됐어요.',
      'group_updated' => '$group 정보가 변경됐어요.',
      'notice_published' => '새 공지사항이 등록됐어요.',
      'challenge_update' => '$group 기도 챌린지에 새로운 소식이 있어요.',
      _ => 'PrayNote에 새로운 소식이 있어요.',
    };
  }
}
