import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/praynote_repository.dart';
import '../../domain/models.dart';

final dashboardProvider =
    AsyncNotifierProvider<DashboardController, DashboardData>(
      DashboardController.new,
    );

class DashboardController extends AsyncNotifier<DashboardData> {
  PrayNoteRepository get _repository => ref.read(repositoryProvider);

  @override
  Future<DashboardData> build() => _repository.loadDashboard();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repository.loadDashboard);
  }

  Future<bool> addPrayer({
    required String content,
    required List<PrayNoteGroup> groups,
    required bool isPersonal,
  }) async {
    final current = state.value;
    if (current == null || content.trim().isEmpty) return false;
    try {
      final prayer = await _repository.createPrayer(
        content: content,
        groups: groups,
        isPersonal: isPersonal,
      );
      state = AsyncData(
        current.copyWith(prayers: [prayer, ...current.prayers]),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> togglePrayed(PrayerItem prayer) async {
    final nextValue = !prayer.hasPrayed;
    _replacePrayer(
      prayer.copyWith(
        hasPrayed: nextValue,
        responseCount: (prayer.responseCount + (nextValue ? 1 : -1)).clamp(
          0,
          9999,
        ),
      ),
    );
    try {
      final confirmed = await _repository.togglePrayed(prayer.id);
      if (confirmed != nextValue) {
        _replacePrayer(prayer.copyWith(hasPrayed: confirmed));
      }
    } catch (_) {
      _replacePrayer(prayer);
    }
  }

  Future<void> toggleCompleted(PrayerItem prayer) async {
    final nextValue = !prayer.isCompleted;
    _replacePrayer(prayer.copyWith(isCompleted: nextValue));
    try {
      await _repository.setPrayerCompleted(prayer.id, nextValue);
    } catch (_) {
      _replacePrayer(prayer);
    }
  }

  Future<bool> reportPrayer(
    PrayerItem prayer,
    String reason,
    String? details,
  ) async {
    final current = state.value;
    if (current == null) return false;
    try {
      await _repository.reportPrayer(prayer.id, reason, details);
      state = AsyncData(
        current.copyWith(
          prayers: current.prayers
              .where((item) => item.id != prayer.id)
              .toList(),
        ),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> blockUser(PrayerItem prayer) async {
    final current = state.value;
    if (current == null || prayer.authorId == null) return false;
    try {
      await _repository.blockUser(prayer.authorId!);
      state = AsyncData(
        current.copyWith(
          prayers: current.prayers
              .where((item) => item.authorId != prayer.authorId)
              .toList(),
        ),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  void _replacePrayer(PrayerItem replacement) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        prayers: [
          for (final prayer in current.prayers)
            if (prayer.id == replacement.id) replacement else prayer,
        ],
      ),
    );
  }
}
