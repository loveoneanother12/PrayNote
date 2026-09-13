import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../features/session/session_controller.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_email.text.trim().isEmpty ||
        _password.text.length < 6 ||
        (_signUp && _name.text.trim().length < 2)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('입력한 내용을 다시 확인해주세요.')));
      return;
    }
    final controller = ref.read(sessionProvider.notifier);
    if (_signUp) {
      await controller.signUp(_name.text, _email.text, _password.text);
    } else {
      await controller.signIn(_email.text, _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.auto_stories_rounded,
                    size: 54,
                    color: brandColor,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _signUp ? 'PrayNote 시작하기' : '다시 만나 반가워요',
                    textAlign: TextAlign.center,
                    style: PrayNoteType.hero,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _signUp
                        ? '나의 기도와 공동체를 위한 계정을 만들어요.'
                        : '이메일과 비밀번호로 로그인해주세요.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xFF798398)),
                  ),
                  const SizedBox(height: 32),
                  if (_signUp) ...[
                    TextField(
                      controller: _name,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: '이름'),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: '이메일'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(
                      labelText: '비밀번호',
                      helperText: '6자 이상 입력해주세요.',
                    ),
                  ),
                  if (session.error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      session.error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: session.isBusy ? null : _submit,
                    child: session.isBusy
                        ? const SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_signUp ? '회원가입' : '로그인'),
                  ),
                  TextButton(
                    onPressed: session.isBusy
                        ? null
                        : () => setState(() => _signUp = !_signUp),
                    child: Text(_signUp ? '이미 계정이 있어요' : '처음이신가요? 이메일로 가입'),
                  ),
                  if (AppConfig.hasSupabase) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        children: [
                          Expanded(child: Divider()),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              '간편 로그인',
                              style: TextStyle(color: Color(0xFF8A94A7)),
                            ),
                          ),
                          Expanded(child: Divider()),
                        ],
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: session.isBusy
                          ? null
                          : () => ref
                                .read(sessionProvider.notifier)
                                .signInWithGoogle(),
                      icon: const Text(
                        'G',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      label: const Text('Google로 계속하기'),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: session.isBusy || !AppConfig.enableAppleSignIn
                          ? null
                          : () => ref
                                .read(sessionProvider.notifier)
                                .signInWithApple(),
                      icon: const Icon(Icons.apple_rounded),
                      label: Text(
                        AppConfig.enableAppleSignIn
                            ? 'Apple로 계속하기'
                            : 'Apple 로그인 · 등록 후 활성화',
                      ),
                    ),
                    if (!AppConfig.enableAppleSignIn)
                      const Padding(
                        padding: EdgeInsets.only(top: 7),
                        child: Text(
                          'Apple Developer Program 등록 후 설정값만 연결하면 활성화됩니다.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF8A94A7),
                          ),
                        ),
                      ),
                  ],
                  if (!AppConfig.hasSupabase) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Expanded(child: Divider()),
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12),
                            child: Text('로컬 UX 확인'),
                          ),
                          Expanded(child: Divider()),
                        ],
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: session.isBusy
                          ? null
                          : () =>
                                ref.read(sessionProvider.notifier).enterDemo(),
                      icon: const Icon(Icons.visibility_outlined),
                      label: const Text('체험 모드로 시작'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
