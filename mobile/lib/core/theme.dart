import 'package:flutter/material.dart';

const brandColor = Color(0xFF5C73D9);
const canvasColor = Color(0xFFF6F7FA);
const inkColor = Color(0xFF293449);
const mutedColor = Color(0xFF68758A);
const lineColor = Color(0xFFE4E8EF);

abstract final class PrayNoteType {
  static const hero = TextStyle(
    fontSize: 27,
    height: 1.35,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.6,
    color: inkColor,
  );
  static const pageTitle = TextStyle(
    fontSize: 23,
    height: 1.3,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.35,
    color: inkColor,
  );
  static const sectionTitle = TextStyle(
    fontSize: 18,
    height: 1.35,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: inkColor,
  );
  static const body = TextStyle(
    fontSize: 15,
    height: 1.65,
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
      toolbarHeight: 56,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: lineColor),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Color(0xFFFAFBFE),
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
        minimumSize: const Size.fromHeight(48),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        side: const BorderSide(color: Color(0xFFDDE2EC)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
      ),
    ),
    dividerTheme: const DividerThemeData(color: lineColor, thickness: 1),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 2),
      iconColor: Color(0xFF68758D),
      textColor: inkColor,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: const Color(0xFFE9EDF4),
      selectedColor: Colors.white,
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
      secondaryLabelStyle: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: inkColor,
      ),
    ),
  );
}
