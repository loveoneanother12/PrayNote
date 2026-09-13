import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/session/session_controller.dart';
import '../presentation/auth_screen.dart';
import '../presentation/groups_screen.dart';
import '../presentation/home_screen.dart';
import '../presentation/my_screen.dart';
import '../presentation/notifications_screen.dart';
import '../presentation/onboarding_screen.dart';
import '../presentation/paywall_screen.dart';
import '../presentation/settings_screen.dart';
import '../presentation/shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionProvider);
  final initialLocation = !session.hasSeenOnboarding
      ? '/onboarding'
      : session.isAuthenticated
      ? '/home'
      : '/login';
  return GoRouter(
    initialLocation: initialLocation,
    redirect: (context, state) {
      final isPublic =
          state.matchedLocation == '/onboarding' ||
          state.matchedLocation == '/login';
      if (!session.hasSeenOnboarding &&
          state.matchedLocation != '/onboarding') {
        return '/onboarding';
      }
      if (session.hasSeenOnboarding && !session.isAuthenticated && !isPublic) {
        return '/login';
      }
      if (session.isAuthenticated && isPublic) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const AuthScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
              GoRoute(
                path: '/notifications',
                builder: (context, state) => const NotificationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/groups',
                builder: (context, state) => const GroupsScreen(),
                routes: [
                  GoRoute(
                    path: ':groupId',
                    builder: (context, state) => GroupDetailScreen(
                      groupId: state.pathParameters['groupId']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/my',
                builder: (context, state) => const MyScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/plus',
        builder: (context, state) => const PaywallScreen(),
      ),
    ],
  );
});
