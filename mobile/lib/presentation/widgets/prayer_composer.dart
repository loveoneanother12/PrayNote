import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models.dart';
import '../../core/theme.dart';
import '../../features/dashboard/dashboard_controller.dart';

Future<void> showPrayerComposer(
  BuildContext context, {
  PrayNoteGroup? initialGroup,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.92,
      child: PrayerComposerSheet(initialGroup: initialGroup),
    ),
  );
}

class PrayerComposerSheet extends ConsumerStatefulWidget {
  const PrayerComposerSheet({super.key, this.initialGroup});
  final PrayNoteGroup? initialGroup;

  @override
  ConsumerState<PrayerComposerSheet> createState() =>
      _PrayerComposerSheetState();
}

class _PrayerComposerSheetState extends ConsumerState<PrayerComposerSheet> {
  final _content = TextEditingController();
  final _selectedIds = <String>{};
  late bool _personal;
  bool _showGroups = false;
  bool _saving = false;
  int _characterCount = 0;

  @override
  void initState() {
    super.initState();
    _personal = widget.initialGroup == null;
    if (widget.initialGroup != null) {
      _selectedIds.add(widget.initialGroup!.id);
    }
  }

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _close() async {
    if (_content.text.trim().isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    final discard = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('작성을 그만둘까요?'),
        content: const Text('아직 기록하지 않은 내용이 있어요.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('계속 작성'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('그만두기'),
          ),
        ],
      ),
    );
    if (discard == true && mounted) Navigator.of(context).pop();
  }

  Future<void> _save(List<PrayNoteGroup> groups) async {
    if (_content.text.trim().isEmpty || (!_personal && _selectedIds.isEmpty)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('기도제목과 공유할 곳을 확인해주세요.')));
      return;
    }
    setState(() => _saving = true);
    final selected = groups
        .where((group) => _selectedIds.contains(group.id))
        .toList();
    final saved = await ref
        .read(dashboardProvider.notifier)
        .addPrayer(
          content: _content.text,
          groups: selected,
          isPersonal: _personal,
        );
    if (!mounted) return;
    setState(() => _saving = false);
    if (saved) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('기도제목을 기록했어요.')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('저장하지 못했어요. 잠시 후 다시 시도해주세요.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final groups =
        ref.watch(dashboardProvider).value?.groups ?? const <PrayNoteGroup>[];
    return Material(
      color: canvasColor,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 10, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('기도제목 나누기', style: PrayNoteType.pageTitle),
                  ),
                  IconButton(
                    onPressed: _saving ? null : _close,
                    icon: const Icon(Icons.close_rounded),
                    tooltip: '닫기',
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _content,
                      minLines: 6,
                      maxLines: 12,
                      autofocus: true,
                      keyboardType: TextInputType.multiline,
                      textCapitalization: TextCapitalization.sentences,
                      maxLength: 2000,
                      buildCounter: (
                        _, {
                        required currentLength,
                        required isFocused,
                        maxLength,
                      }) => null,
                      onChanged: (value) =>
                          setState(() => _characterCount = value.length),
                      decoration: const InputDecoration(
                        hintText: '기도하고 싶은 마음을 자유롭게 적어주세요.',
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _personal
                                ? '나만 볼 수 있는 기도로 저장돼요.'
                                : _selectedIds.isEmpty
                                ? '공유할 그룹을 선택해주세요.'
                                : '선택한 ${_selectedIds.length}개 그룹의 멤버에게 공유돼요.',
                            style: PrayNoteType.caption,
                          ),
                        ),
                        Text(
                          '$_characterCount / 2,000',
                          style: PrayNoteType.caption,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('공개 범위', style: PrayNoteType.sectionTitle),
                    const SizedBox(height: 8),
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(
                          value: true,
                          icon: Icon(Icons.lock_outline_rounded),
                          label: Text('개인기도'),
                        ),
                        ButtonSegment(
                          value: false,
                          icon: Icon(Icons.groups_outlined),
                          label: Text('그룹 공유'),
                        ),
                      ],
                      selected: {_personal},
                      onSelectionChanged: _saving
                          ? null
                          : (values) => setState(() {
                              _personal = values.first;
                              _showGroups = !_personal;
                            }),
                    ),
                    if (!_personal) ...[
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _saving
                            ? null
                            : () => setState(() => _showGroups = !_showGroups),
                        child: Row(
                          children: [
                            const Icon(Icons.groups_outlined, size: 19),
                            const SizedBox(width: 9),
                            Expanded(
                              child: Text(
                                _selectedIds.isEmpty
                                    ? '공유할 그룹 선택하기'
                                    : '${_selectedIds.length}개 그룹 선택됨',
                                textAlign: TextAlign.left,
                              ),
                            ),
                            Icon(
                              _showGroups
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                            ),
                          ],
                        ),
                      ),
                      if (_showGroups)
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: lineColor),
                          ),
                          child: groups.isEmpty
                              ? const Padding(
                                  padding: EdgeInsets.all(18),
                                  child: Text('가입한 그룹이 없어요.'),
                                )
                              : Column(
                                  children: [
                                    for (
                                      var index = 0;
                                      index < groups.length;
                                      index++
                                    ) ...[
                                      CheckboxListTile(
                                        title: Text(groups[index].name),
                                        subtitle: Text(
                                          '${groups[index].memberCount}명',
                                          style: PrayNoteType.caption,
                                        ),
                                        value: _selectedIds.contains(
                                          groups[index].id,
                                        ),
                                        onChanged: _saving
                                            ? null
                                            : (selected) => setState(
                                                () => selected == true
                                                    ? _selectedIds.add(
                                                        groups[index].id,
                                                      )
                                                    : _selectedIds.remove(
                                                        groups[index].id,
                                                      ),
                                              ),
                                      ),
                                      if (index != groups.length - 1)
                                        const Divider(height: 1),
                                    ],
                                  ],
                                ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: lineColor)),
              ),
              child: FilledButton(
                onPressed: _saving ? null : () => _save(groups),
                child: _saving
                    ? const SizedBox.square(
                        dimension: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('기록하기'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
