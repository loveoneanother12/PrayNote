import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'features/notifications/notifications_controller.dart';
import 'features/session/session_controller.dart';
import 'services/native_push_service.dart';

class PrayNoteApp extends ConsumerStatefulWidget {
  const PrayNoteApp({super.key});

  @override
  ConsumerState<PrayNoteApp> createState() => _PrayNoteAppState();
}

class _PrayNoteAppState extends ConsumerState<PrayNoteApp> {
  @override
  void initState() {
    super.initState();
    ref.listenManual(
      sessionProvider.select((session) => session.isAuthenticated),
      (previous, authenticated) {
        if (authenticated && previous != true) _syncPushAfterFrame();
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final push = ref.read(nativePushServiceProvider);
      push.setNavigationHandler(_openPushRoute);
      if (ref.read(sessionProvider).isAuthenticated) _syncPushAfterFrame();
    });
  }

  void _syncPushAfterFrame() {
    unawaited(ref.read(nativePushServiceProvider).syncForCurrentSession());
  }

  void _openPushRoute(String route) {
    if (route == '/notifications') ref.invalidate(notificationsProvider);
    ref.read(routerProvider).go(route);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PrayNote',
      debugShowCheckedModeBanner: false,
      theme: buildPrayNoteTheme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
