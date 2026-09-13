import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/settings/settings_controller.dart';
import '../../core/theme.dart';

const profileColors = <String, Color>{
  'indigo': Color(0xFF6679DA),
  'sky': Color(0xFF69AEE8),
  'teal': Color(0xFF4FAFA5),
  'green': Color(0xFF71AC72),
  'amber': Color(0xFFE6AD52),
  'rose': Color(0xFFD9829D),
  'violet': Color(0xFF9277D7),
  'slate': Color(0xFF7D899C),
  'coral': Color(0xFFE98778),
  'orange': Color(0xFFE99B5F),
  'lime': Color(0xFF9DBB62),
  'mint': Color(0xFF76C4AA),
  'cyan': Color(0xFF65B7C7),
  'blue': Color(0xFF678FDF),
  'navy': Color(0xFF55698E),
  'grape': Color(0xFF8C6EAD),
  'magenta': Color(0xFFC678AD),
  'red': Color(0xFFD66E6E),
  'brown': Color(0xFF9A796A),
  'charcoal': Color(0xFF606873),
  'lavender': Color(0xFFA99BE3),
  'lilac': Color(0xFFC3A3D7),
  'blush': Color(0xFFE6A8B6),
  'peach': Color(0xFFF0B795),
  'butter': Color(0xFFE5CA78),
  'sage': Color(0xFFA1B79B),
  'aqua': Color(0xFF8AC8C6),
  'periwinkle': Color(0xFF929FDC),
};

Future<void> showProfileEditor(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const ProfileEditorSheet(),
    );

class ProfileEditorSheet extends ConsumerStatefulWidget {
  const ProfileEditorSheet({super.key});
  @override
  ConsumerState<ProfileEditorSheet> createState() => _ProfileEditorSheetState();
}

class _ProfileEditorSheetState extends ConsumerState<ProfileEditorSheet> {
  TextEditingController? _name;
  String? _color;
  bool _saving = false;

  @override
  void dispose() {
    _name?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    return settings.when(
      loading: () => const SizedBox(
        height: 300,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => const SizedBox(
        height: 300,
        child: Center(child: Text('프로필을 불러오지 못했어요.')),
      ),
      data: (state) {
        _name ??= TextEditingController(text: state.account.displayName);
        _color ??= state.account.profileColor;
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            12,
            20,
            20 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD3D8E3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('프로필 수정', style: PrayNoteType.pageTitle),
                const SizedBox(height: 18),
                TextField(
                  controller: _name,
                  maxLength: 30,
                  decoration: const InputDecoration(labelText: '이름'),
                ),
                const SizedBox(height: 12),
                const Text(
                  '나를 나타내는 색',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: profileColors.entries.map((entry) {
                    final selected = entry.key == _color;
                    return Semantics(
                      button: true,
                      selected: selected,
                      label: entry.key,
                      child: InkWell(
                        onTap: _saving
                            ? null
                            : () => setState(() => _color = entry.key),
                        customBorder: const CircleBorder(),
                        child: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: entry.value,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: selected
                                  ? Colors.black87
                                  : Colors.transparent,
                              width: 2.5,
                            ),
                          ),
                          child: selected
                              ? const Icon(
                                  Icons.check_rounded,
                                  size: 18,
                                  color: Colors.white,
                                )
                              : null,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving
                      ? null
                      : () async {
                          final name = _name!.text.trim();
                          if (name.length < 2) return;
                          setState(() => _saving = true);
                          final saved = await ref
                              .read(settingsProvider.notifier)
                              .updateProfile(name, _color!);
                          if (!context.mounted) return;
                          setState(() => _saving = false);
                          if (saved) Navigator.of(context).pop();
                        },
                  child: _saving
                      ? const SizedBox.square(
                          dimension: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('저장하기'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
