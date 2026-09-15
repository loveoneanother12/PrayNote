import 'dart:async';
import 'dart:math';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../features/session/session_controller.dart';

enum NativePushStatus { notConfigured, disabled, denied, enabled, failed }

abstract class NativePushService {
  NativePushStatus get status;
  void setNavigationHandler(ValueChanged<String> handler);
  Future<NativePushStatus> enable();
  Future<void> disable();
  Future<void> syncForCurrentSession();
  Future<void> unregisterBeforeSignOut();
}

final nativePushServiceProvider = Provider<NativePushService>((ref) {
  if (!AppConfig.hasFirebase || !AppConfig.hasSupabase) {
    return const UnconfiguredNativePushService();
  }
  final service = FirebaseNativePushService(
    ref.read(sharedPreferencesProvider),
    Supabase.instance.client,
  );
  ref.onDispose(service.dispose);
  return service;
});

class UnconfiguredNativePushService implements NativePushService {
  const UnconfiguredNativePushService();

  @override
  NativePushStatus get status => NativePushStatus.notConfigured;

  @override
  Future<NativePushStatus> enable() async => status;

  @override
  Future<void> disable() async {}

  @override
  void setNavigationHandler(ValueChanged<String> handler) {}

  @override
  Future<void> syncForCurrentSession() async {}

  @override
  Future<void> unregisterBeforeSignOut() async {}
}

class FirebaseNativePushService implements NativePushService {
  FirebaseNativePushService(this._preferences, this._supabase);

  static const _devicePushKey = 'device_push_enabled';
  static const _installationIdKey = 'native_installation_id';
  static const _lastTokenKey = 'native_push_last_token';
  static const _lastTokenUserKey = 'native_push_last_user';
  final SharedPreferences _preferences;
  final SupabaseClient _supabase;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  Future<void>? _initialization;
  StreamSubscription<String>? _tokenSubscription;
  StreamSubscription<RemoteMessage>? _openSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  ValueChanged<String>? _navigationHandler;
  String? _pendingRoute;
  NativePushStatus _status = NativePushStatus.disabled;

  @override
  NativePushStatus get status => _status;

  Future<void> _initialize() => _initialization ??= _initializeOnce();

  Future<void> _initializeOnce() async {
    if (Firebase.apps.isEmpty) {
      if (AppConfig.hasFirebaseOverrides) {
        await Firebase.initializeApp(options: AppConfig.firebaseOptions);
      } else {
        await Firebase.initializeApp();
      }
    }
    await FirebaseMessaging.instance
        .setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );
    if (defaultTargetPlatform == TargetPlatform.android) {
      await _localNotifications.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        ),
        onDidReceiveNotificationResponse: (response) {
          final route = response.payload;
          if (route != null && route.isNotEmpty) _openRoute(route);
        },
      );
      _foregroundSubscription ??= FirebaseMessaging.onMessage.listen(
        (message) => unawaited(_showAndroidForegroundNotification(message)),
      );
    }
    _openSubscription ??= FirebaseMessaging.onMessageOpenedApp.listen(
      _openMessage,
    );
    _tokenSubscription ??= FirebaseMessaging.instance.onTokenRefresh.listen(
      (token) => unawaited(_registerTokenSafely(token)),
    );
    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) _openMessage(initialMessage);
  }

  @override
  void setNavigationHandler(ValueChanged<String> handler) {
    _navigationHandler = handler;
    final route = _pendingRoute;
    if (route != null) {
      _pendingRoute = null;
      handler(route);
    }
  }

  @override
  Future<NativePushStatus> enable() async {
    try {
      await _initialize();
      final permission = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      final allowed =
          permission.authorizationStatus == AuthorizationStatus.authorized ||
          permission.authorizationStatus == AuthorizationStatus.provisional;
      if (!allowed) {
        _status = NativePushStatus.denied;
        return _status;
      }
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) {
        _status = NativePushStatus.failed;
        return _status;
      }
      await _registerToken(token);
      _status = NativePushStatus.enabled;
      return _status;
    } catch (_) {
      _status = NativePushStatus.failed;
      return _status;
    }
  }

  @override
  Future<void> syncForCurrentSession() async {
    if ((_preferences.getBool(_devicePushKey) ?? false) == false ||
        _supabase.auth.currentUser == null) {
      return;
    }
    try {
      await _initialize();
      final permission = await FirebaseMessaging.instance
          .getNotificationSettings();
      final allowed =
          permission.authorizationStatus == AuthorizationStatus.authorized ||
          permission.authorizationStatus == AuthorizationStatus.provisional;
      if (!allowed) {
        _status = NativePushStatus.denied;
        return;
      }
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await _registerToken(token);
        _status = NativePushStatus.enabled;
      }
    } catch (_) {
      _status = NativePushStatus.failed;
    }
  }

  Future<void> _registerToken(String token, {bool force = false}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;
    final previous = _preferences.getString(_lastTokenKey);
    final previousUser = _preferences.getString(_lastTokenUserKey);
    if (!force && previous == token && previousUser == user.id) return;
    await _supabase.rpc(
      'register_native_push_token',
      params: {
        'target_token': token,
        'target_platform': defaultTargetPlatform == TargetPlatform.iOS
            ? 'ios'
            : 'android',
        'target_installation_id': _installationId(),
      },
    );
    await _preferences.setString(_lastTokenKey, token);
    await _preferences.setString(_lastTokenUserKey, user.id);
  }

  Future<void> _registerTokenSafely(String token) async {
    try {
      await _registerToken(token, force: true);
    } catch (_) {
      _status = NativePushStatus.failed;
    }
  }

  String _installationId() {
    final existing = _preferences.getString(_installationIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final random = Random.secure();
    final value =
        '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}-'
        '${random.nextInt(1 << 32).toRadixString(36)}';
    unawaited(_preferences.setString(_installationIdKey, value));
    return value;
  }

  @override
  Future<void> disable() async {
    await _deleteRegisteredToken();
    try {
      if (Firebase.apps.isNotEmpty) {
        await FirebaseMessaging.instance.deleteToken();
      }
    } catch (_) {
      // The local preference remains authoritative even if token deletion fails.
    }
    _status = NativePushStatus.disabled;
  }

  @override
  Future<void> unregisterBeforeSignOut() => _deleteRegisteredToken();

  Future<void> _deleteRegisteredToken() async {
    final token = _preferences.getString(_lastTokenKey);
    if (token != null && _supabase.auth.currentUser != null) {
      try {
        await _supabase.rpc(
          'unregister_native_push_token',
          params: {'target_token': token},
        );
      } catch (_) {
        // A stale token is harmless and can be pruned by the delivery service.
      }
    }
    await _preferences.remove(_lastTokenKey);
    await _preferences.remove(_lastTokenUserKey);
  }

  void _openMessage(RemoteMessage message) {
    _openRoute(_routeFor(message.data));
  }

  void _openRoute(String route) {
    final handler = _navigationHandler;
    if (handler == null) {
      _pendingRoute = route;
    } else {
      handler(route);
    }
  }

  Future<void> _showAndroidForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;
    await _localNotifications.show(
      id:
          (message.messageId ?? message.hashCode.toString()).hashCode &
          0x7fffffff,
      title: notification.title,
      body: notification.body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'praynote_activity',
          '기도와 그룹 소식',
          channelDescription: '기도제목, 그룹, 공지사항과 기도 챌린지 알림',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      payload: _routeFor(message.data),
    );
  }

  String _routeFor(Map<String, dynamic> data) {
    final groupId = data['group_id']?.toString();
    if (groupId != null && RegExp(r'^[a-zA-Z0-9-]+$').hasMatch(groupId)) {
      return '/groups/$groupId';
    }
    final type = data['type']?.toString();
    if (type == 'prayer_reminder') return '/home';
    return '/notifications';
  }

  void dispose() {
    unawaited(_tokenSubscription?.cancel());
    unawaited(_openSubscription?.cancel());
    unawaited(_foregroundSubscription?.cancel());
  }
}
