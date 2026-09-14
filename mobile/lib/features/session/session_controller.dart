import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('SharedPreferences must be initialized'),
);

class SessionState {
  const SessionState({
    required this.hasSeenOnboarding,
    required this.isAuthenticated,
    this.isDemo = false,
    this.isBusy = false,
    this.error,
  });
  final bool hasSeenOnboarding;
  final bool isAuthenticated;
  final bool isDemo;
  final bool isBusy;
  final String? error;

  SessionState copyWith({
    bool? hasSeenOnboarding,
    bool? isAuthenticated,
    bool? isDemo,
    bool? isBusy,
    String? error,
    bool clearError = false,
  }) {
    return SessionState(
      hasSeenOnboarding: hasSeenOnboarding ?? this.hasSeenOnboarding,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isDemo: isDemo ?? this.isDemo,
      isBusy: isBusy ?? this.isBusy,
      error: clearError ? null : error ?? this.error,
    );
  }
}

final sessionProvider = NotifierProvider<SessionController, SessionState>(
  SessionController.new,
);

class SessionController extends Notifier<SessionState> {
  static const _onboardingKey = 'has_seen_native_onboarding';
  static const _demoKey = 'native_demo_session';
  SharedPreferences get _preferences => ref.read(sharedPreferencesProvider);

  @override
  SessionState build() {
    final isDemo = _preferences.getBool(_demoKey) ?? false;
    final hasSession = AppConfig.hasSupabase
        ? Supabase.instance.client.auth.currentSession != null
        : isDemo;
    if (AppConfig.hasSupabase) {
      final subscription = Supabase.instance.client.auth.onAuthStateChange
          .listen((event) {
            final authenticated = event.session != null;
            if (authenticated) unawaited(_preferences.remove(_demoKey));
            state = state.copyWith(
              isAuthenticated: authenticated,
              isDemo: authenticated ? false : state.isDemo,
              isBusy: false,
              clearError: authenticated,
            );
          });
      ref.onDispose(subscription.cancel);
    }
    return SessionState(
      hasSeenOnboarding: _preferences.getBool(_onboardingKey) ?? false,
      isAuthenticated: hasSession,
      isDemo: isDemo,
    );
  }

  Future<void> completeOnboarding() async {
    await _preferences.setBool(_onboardingKey, true);
    state = state.copyWith(hasSeenOnboarding: true);
  }

  Future<bool> signIn(String email, String password) async {
    if (!AppConfig.hasSupabase) {
      state = state.copyWith(error: '현재 빌드는 서버 설정 없이 실행 중이에요. 체험 모드를 이용해주세요.');
      return false;
    }
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      state = state.copyWith(
        isBusy: false,
        isAuthenticated: true,
        isDemo: false,
      );
      return true;
    } on AuthException catch (error) {
      state = state.copyWith(isBusy: false, error: _authMessage(error));
      return false;
    } catch (_) {
      state = state.copyWith(isBusy: false, error: '네트워크 연결이 원활하지 않습니다.');
      return false;
    }
  }

  Future<bool> signUp(String name, String email, String password) async {
    if (!AppConfig.hasSupabase) {
      state = state.copyWith(error: '현재 빌드는 서버 설정 없이 실행 중이에요. 체험 모드를 이용해주세요.');
      return false;
    }
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final response = await Supabase.instance.client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'display_name': name.trim()},
      );
      final active = response.session != null;
      state = state.copyWith(
        isBusy: false,
        isAuthenticated: active,
        error: active ? null : '가입 확인 메일을 확인해주세요.',
      );
      return active;
    } on AuthException catch (error) {
      state = state.copyWith(isBusy: false, error: _authMessage(error));
      return false;
    } catch (_) {
      state = state.copyWith(isBusy: false, error: '네트워크 연결이 원활하지 않습니다.');
      return false;
    }
  }

  Future<bool> signInWithGoogle() => _signInWithOAuth(OAuthProvider.google);

  Future<bool> signInWithApple() async {
    if (defaultTargetPlatform != TargetPlatform.iOS &&
        defaultTargetPlatform != TargetPlatform.macOS) {
      return _signInWithOAuth(OAuthProvider.apple);
    }
    if (!AppConfig.hasSupabase) {
      state = state.copyWith(error: '서버가 연결된 빌드에서 사용할 수 있어요.');
      return false;
    }

    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final supabase = Supabase.instance.client;
      final rawNonce = supabase.auth.generateRawNonce();
      final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );
      final idToken = credential.identityToken;
      if (idToken == null) {
        throw const AuthException('Apple identity token is missing.');
      }

      final response = await supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      final displayName = [credential.givenName, credential.familyName]
          .whereType<String>()
          .map((part) => part.trim())
          .where((part) => part.isNotEmpty)
          .join(' ');
      final existingName = response.user?.userMetadata?['display_name']
          ?.toString()
          .trim();
      if (displayName.isNotEmpty &&
          response.user != null &&
          (existingName == null || existingName.isEmpty)) {
        await supabase.auth.updateUser(
          UserAttributes(data: {'display_name': displayName}),
        );
        await supabase
            .from('profiles')
            .update({'display_name': displayName})
            .eq('id', response.user!.id);
      }
      state = state.copyWith(
        isBusy: false,
        isAuthenticated: response.session != null,
        isDemo: false,
        clearError: true,
      );
      return response.session != null;
    } on SignInWithAppleAuthorizationException catch (error) {
      state = state.copyWith(
        isBusy: false,
        error: error.code == AuthorizationErrorCode.canceled
            ? null
            : 'Apple 로그인을 완료하지 못했어요. 잠시 후 다시 시도해주세요.',
        clearError: error.code == AuthorizationErrorCode.canceled,
      );
      return false;
    } on AuthException catch (error) {
      state = state.copyWith(isBusy: false, error: _authMessage(error));
      return false;
    } catch (_) {
      state = state.copyWith(isBusy: false, error: '네트워크 연결이 원활하지 않습니다.');
      return false;
    }
  }

  Future<bool> _signInWithOAuth(OAuthProvider provider) async {
    if (!AppConfig.hasSupabase) {
      state = state.copyWith(error: '서버가 연결된 빌드에서 사용할 수 있어요.');
      return false;
    }
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final opened = await Supabase.instance.client.auth.signInWithOAuth(
        provider,
        redirectTo: AppConfig.authCallbackUrl,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      state = state.copyWith(
        isBusy: false,
        error: opened ? null : '로그인 화면을 열지 못했어요.',
      );
      return opened;
    } on AuthException catch (error) {
      state = state.copyWith(isBusy: false, error: _authMessage(error));
      return false;
    } catch (_) {
      state = state.copyWith(isBusy: false, error: '네트워크 연결이 원활하지 않습니다.');
      return false;
    }
  }

  Future<void> enterDemo() async {
    await _preferences.setBool(_demoKey, true);
    state = state.copyWith(
      isAuthenticated: true,
      isDemo: true,
      clearError: true,
    );
  }

  Future<void> signOut() async {
    if (AppConfig.hasSupabase && !state.isDemo) {
      await Supabase.instance.client.auth.signOut();
    }
    await _preferences.remove(_demoKey);
    state = state.copyWith(isAuthenticated: false, isDemo: false);
  }

  String _authMessage(AuthException error) {
    final message = error.message.toLowerCase();
    if (message.contains('invalid login')) return '이메일 또는 비밀번호를 확인해주세요.';
    if (message.contains('already registered')) return '이미 가입된 이메일이에요.';
    return '로그인을 완료하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
}
