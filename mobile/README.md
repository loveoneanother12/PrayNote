# PrayNote Mobile

기존 PrayNote 웹앱과 같은 Supabase 백엔드를 사용하는 Flutter 모바일 앱입니다. 웹앱 소스와 배포에는 영향을 주지 않도록 저장소의 `mobile` 폴더에 독립되어 있습니다.

## 화면 흐름

1. 온보딩: 기록, 그룹 기도, 연속 기도의 가치 안내
2. 인증: 이메일 로그인·회원가입 또는 로컬 체험 모드
3. 홈: 오늘 기도하기, 진행 중 기도제목 3개, 공동체 요약, Plus 진입점
4. 핵심 기능: 그룹 목록·상세, 개인/다중 그룹 기도 작성, 오늘 기도, 기도제목 해결
5. 마이: 내 프로필, 기도 리듬, 월간 기도 달력, 진행·해결 기도제목
6. 설정: 계정/기기 알림, 방해금지, 매일 기도 알림, 보안·가이드와 로그아웃
7. Plus: 확장 기능 소개와 출시 알림 신청. 실제 결제는 연결하지 않음

네이티브 결제와 아직 마이그레이션되지 않은 웹 전용 기능은 후속 단계에서 연결합니다.

## 기술 구성

- Riverpod: 세션과 대시보드 상태
- go_router: 온보딩·인증 가드와 탭별 라우팅
- flutter_animate: 짧은 전환 피드백
- supabase_flutter: 기존 인증·RPC·RLS 재사용
- firebase_messaging: APNs·FCM 기기 토큰과 알림 이동 경로

## 설정 동기화와 성능

- 이름·프로필 색, 알림 종류, 외부 푸시 의사, 방해금지 시간, 기도 알림 시간과 그룹별 알림은 Supabase 계정 설정으로 웹과 공유합니다.
- 운영체제 푸시 권한, 기기 토큰, 온보딩과 설치 안내 상태는 기기별로 분리합니다.
- 상시 Realtime 구독을 사용하지 않습니다. 설정 화면 최초 진입과 3분 이상 지난 앱 복귀 시에만 단일 번들 RPC로 갱신합니다.
- 토글과 프로필 수정은 낙관적 업데이트로 즉시 표시하고 서버 저장 실패 시에만 원래 값으로 되돌립니다.
- Firebase는 앱 시작 시 네트워크 초기화하지 않습니다. 해당 기기에서 푸시를 켰을 때만 지연 초기화하며, 토큰이 바뀐 경우에만 서버에 저장합니다.
- 알림 목록도 상시 구독하지 않고 화면 진입 또는 사용자의 새로고침 때만 단일 RPC로 불러옵니다.

## 네이티브 로그인과 푸시 준비

- 앱 식별자: iOS·Android 모두 `com.praynote.app`
- OAuth 복귀 주소: `com.praynote.app://login-callback/`
- Google 로그인은 Supabase Provider와 위 Redirect URL을 등록하면 동작합니다.
- iOS Apple 로그인은 네이티브 인증과 nonce 검증을 사용하며 기본 활성화됩니다. 긴급 비활성화가 필요한 빌드에만 `ENABLE_APPLE_SIGN_IN=false`를 지정합니다.
- 공식 서비스 URL은 `https://praynote.app`, 개인정보처리방침은 `https://praynote.app/privacy`, 고객지원은 `https://praynote.app/support`입니다.
- 기기 토큰 테이블은 `supabase/migrations/202609130001_native_mobile_foundation.sql`에 있습니다.
- 실제 알림 전송은 Firebase 프로젝트 생성, Android/iOS 앱 등록, APNs 키 연결 후 활성화됩니다.

## 로컬 체험 실행

서버 키 없이 실행하면 로그인 화면에서 `체험 모드로 시작`을 선택할 수 있습니다.

```sh
flutter run
```

## 실제 Supabase 연결

키를 앱 소스에 저장하지 않고 빌드 시 전달합니다.

```sh
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY \
  --dart-define=FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY \
  --dart-define=FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID \
  --dart-define=FIREBASE_IOS_APP_ID=YOUR_IOS_APP_ID \
  --dart-define=FIREBASE_ANDROID_APP_ID=YOUR_ANDROID_APP_ID
```

Apple 로그인 설정이 완료된 배포 빌드에는
Apple 로그인은 별도 플래그 없이 활성화됩니다.

## 검사

```sh
flutter analyze
flutter test
flutter build ios --simulator --debug
flutter build apk --debug
```
