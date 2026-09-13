import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/settings_repository.dart';

class GroupMuteButton extends ConsumerStatefulWidget {
  const GroupMuteButton({super.key, required this.groupId});
  final String groupId;

  @override
  ConsumerState<GroupMuteButton> createState() => _GroupMuteButtonState();
}

class _GroupMuteButtonState extends ConsumerState<GroupMuteButton> {
  bool _muted = false;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    Future<void>(() async {
      try {
        final muted = await ref
            .read(settingsRepositoryProvider)
            .loadGroupMuted(widget.groupId);
        if (mounted) setState(() => _muted = muted);
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  Future<void> _toggle() async {
    if (_saving) return;
    final previous = _muted;
    setState(() {
      _muted = !previous;
      _saving = true;
    });
    try {
      await ref
          .read(settingsRepositoryProvider)
          .setGroupMuted(widget.groupId, _muted);
    } catch (_) {
      if (mounted) {
        setState(() => _muted = previous);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('그룹 알림 설정을 저장하지 못했어요.')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox.square(
        dimension: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    return IconButton(
      onPressed: _saving ? null : _toggle,
      icon: Icon(
        _muted
            ? Icons.notifications_off_outlined
            : Icons.notifications_active_outlined,
      ),
      tooltip: _muted ? '이 그룹 알림 켜기' : '이 그룹 알림 끄기',
    );
  }
}
