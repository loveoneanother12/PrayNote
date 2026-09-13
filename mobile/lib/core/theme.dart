import 'package:flutter/material.dart';

const brandColor = Color(0xFF5C73D9);
const canvasColor = Color(0xFFF6F7FB);
const inkColor = Color(0xFF26324B);
const mutedColor = Color(0xFF748097);
const lineColor = Color(0xFFE7EAF2);

abstract final class PrayNoteType {
  static const hero = TextStyle(
    fontSize: 28,
    height: 1.28,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.6,
    color: inkColor,
  );
  static const pageTitle = TextStyle(
    fontSize: 22,
    height: 1.3,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.35,
    color: inkColor,
  );
  static const sectionTitle = TextStyle(
    fontSize: 17,
    height: 1.35,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: inkColor,
  );
  static const body = TextStyle(
    fontSize: 15,
    height: 1.55,
    fontWeight: FontWeight.w400,
    color: inkColor,
  );
  static const label = TextStyle(
    fontSize: 13,
    height: 1.4,
    fontWeight: FontWeight.w500,
    color: mutedColor,
  );
  static const caption = TextStyle(
    fontSize: 12,
    height: 1.4,
    fontWeight: FontWeight.w400,
    color: mutedColor,
  );
}

ThemeData buildPrayNoteTheme() {
  final colors = ColorScheme.fromSeed(
    seedColor: brandColor,
    brightness: Brightness.light,
    surface: Colors.white,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: colors,
    scaffoldBackgroundColor: canvasColor,
    fontFamily: 'Apple SD Gothic Neo',
    textTheme: const TextTheme(
      displaySmall: PrayNoteType.hero,
      headlineSmall: PrayNoteType.pageTitle,
      titleLarge: PrayNoteType.pageTitle,
      titleMedium: PrayNoteType.sectionTitle,
      bodyLarge: PrayNoteType.body,
      bodyMedium: PrayNoteType.body,
      labelLarge: TextStyle(
        fontSize: 15,
        height: 1.25,
        fontWeight: FontWeight.w600,
      ),
      labelMedium: PrayNoteType.label,
      bodySmall: PrayNoteType.caption,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: canvasColor,
      foregroundColor: inkColor,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: PrayNoteType.pageTitle,
      scrolledUnderElevation: 0,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: lineColor),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E6EF)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E6EF)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        side: const BorderSide(color: Color(0xFFDDE2EC)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    dividerTheme: const DividerThemeData(color: lineColor, thickness: 1),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 2),
      iconColor: Color(0xFF68758D),
      textColor: inkColor,
    ),
  );
}
