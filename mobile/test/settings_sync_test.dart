import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:praynote_mobile/features/session/session_controller.dart';
import 'package:praynote_mobile/features/settings/settings_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('계정 설정은 즉시 반영되고 기기 설정은 로컬에 저장된다', () async {
    SharedPreferences.setMockInitialValues({
      'has_seen_native_onboarding': true,
      'native_demo_session': true,
    });
    final preferences = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
    );
    addTearDown(container.dispose);

    final initial = await container.read(settingsProvider.future);
    final notifications = initial.account.notifications;

    await container
        .read(settingsProvider.notifier)
        .updateNotification(
          'new_prayer_enabled',
          false,
          notifications.copyWith(newPrayerEnabled: false),
        );
    expect(
      container
          .read(settingsProvider)
          .value!
          .account
          .notifications
          .newPrayerEnabled,
      isFalse,
    );

    await container.read(settingsProvider.notifier).setDevicePush(true);
    expect(container.read(settingsProvider).value!.devicePushEnabled, isTrue);
    expect(preferences.getBool('device_push_enabled'), isTrue);
  });
}
