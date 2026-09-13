import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../core/theme.dart';

class PaywallScreen extends StatefulWidget {
  const PaywallScreen({super.key});

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  bool _requested = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PrayNote Plus')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 16, 22, 28),
          children: [
            Container(
                  height: 150,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF5C73D9), Color(0xFF8495EB)],
                    ),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 64,
                  ),
                )
                .animate()
                .fadeIn(duration: 280.ms)
                .scale(begin: const Offset(0.98, 0.98)),
            const SizedBox(height: 26),
            const Text(
              '기도의 기록을\n더 오래, 더 깊게',
              style: TextStyle(
                fontSize: 28,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'PrayNote의 기본 기도 기능은 계속 무료로 사용할 수 있어요. Plus에서는 기록과 공동체를 위한 확장 기능을 준비하고 있습니다.',
              style: TextStyle(height: 1.6, color: Color(0xFF6F7A91)),
            ),
            const SizedBox(height: 24),
            const _Benefit(
              icon: Icons.insights_rounded,
              title: '더 자세한 기도 리포트',
              description: '나의 기도 흐름과 공동체의 참여를 한눈에 확인해요.',
            ),
            const _Benefit(
              icon: Icons.photo_library_outlined,
              title: '확장된 기록 보관',
              description: '사진과 풍성한 회고 기능으로 기도의 시간을 기억해요.',
            ),
            const _Benefit(
              icon: Icons.groups_2_outlined,
              title: '그룹 운영 도구',
              description: '더 다양한 챌린지와 그룹 인사이트를 활용해요.',
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: _requested
                  ? null
                  : () {
                      setState(() => _requested = true);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Plus 출시 소식을 앱에서 알려드릴게요.'),
                        ),
                      );
                    },
              child: Text(_requested ? '출시 알림 신청 완료' : 'Plus 출시 알림 받기'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('무료로 계속 사용하기'),
            ),
            const Center(
              child: Text(
                '실제 결제는 아직 발생하지 않습니다.',
                style: TextStyle(fontSize: 12, color: Color(0xFF929BAD)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Benefit extends StatelessWidget {
  const _Benefit({
    required this.icon,
    required this.title,
    required this.description,
  });
  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: brandColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: brandColor),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: const TextStyle(height: 1.45, color: Color(0xFF727E93)),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
