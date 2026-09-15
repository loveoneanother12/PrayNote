import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class AppConfig {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const firebaseProjectId = String.fromEnvironment(
    'FIREBASE_PROJECT_ID',
  );
  static const firebaseMessagingSenderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
  );
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
  static const firebaseAndroidAppId = String.fromEnvironment(
    'FIREBASE_ANDROID_APP_ID',
  );
  static const enableAppleSignIn = bool.fromEnvironment(
    'ENABLE_APPLE_SIGN_IN',
    defaultValue: true,
  );

  static const authCallbackUrl = 'com.praynote.app://login-callback/';

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static bool get hasFirebaseOverrides {
    final appId = defaultTargetPlatform == TargetPlatform.iOS
        ? firebaseIosAppId
        : firebaseAndroidAppId;
    return firebaseApiKey.isNotEmpty &&
        firebaseProjectId.isNotEmpty &&
        firebaseMessagingSenderId.isNotEmpty &&
        appId.isNotEmpty;
  }

  static bool get hasFirebase =>
      hasFirebaseOverrides ||
      defaultTargetPlatform == TargetPlatform.iOS ||
      defaultTargetPlatform == TargetPlatform.android;

  static FirebaseOptions get firebaseOptions => FirebaseOptions(
    apiKey: firebaseApiKey,
    appId: defaultTargetPlatform == TargetPlatform.iOS
        ? firebaseIosAppId
        : firebaseAndroidAppId,
    messagingSenderId: firebaseMessagingSenderId,
    projectId: firebaseProjectId,
  );
}
