import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/notification_repository.dart';
import '../../domain/notification_item.dart';

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<NotificationItem>>(
      NotificationsController.new,
    );

class NotificationsController extends AsyncNotifier<List<NotificationItem>> {
  NotificationRepository get _repository =>
      ref.read(notificationRepositoryProvider);

  @override
  Future<List<NotificationItem>> build() => _repository.load();

  Future<void> refresh() async {
    final previous = state.value;
    try {
      state = AsyncData(await _repository.load());
    } catch (error, stack) {
      if (previous == null) {
        state = AsyncError(error, stack);
      }
    }
  }

  Future<void> markRead(NotificationItem item) async {
    if (!item.isUnread) return;
    final previous = state.value;
    if (previous == null) return;
    final readAt = DateTime.now();
    state = AsyncData([
      for (final current in previous)
        current.id == item.id ? current.copyWith(readAt: readAt) : current,
    ]);
    try {
      await _repository.markRead(item.id);
    } catch (_) {
      state = AsyncData(previous);
    }
  }

  Future<void> markAllRead() async {
    final previous = state.value;
    if (previous == null) return;
    final readAt = DateTime.now();
    state = AsyncData([
      for (final item in previous) item.copyWith(readAt: readAt),
    ]);
    try {
      await _repository.markAllRead();
    } catch (_) {
      state = AsyncData(previous);
    }
  }
}
