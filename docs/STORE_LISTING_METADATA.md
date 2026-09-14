# PrayNote 스토어 등록 기준 정보

최종 업데이트: 2026년 9월 14일

## 공통 서비스 정보

- 서비스명: PrayNote
- 공식 웹사이트·마케팅 URL: https://praynote.app
- 고객지원 URL: https://praynote.app/support
- 개인정보처리방침 URL: https://praynote.app/privacy
- 이용약관 URL: https://praynote.app/terms
- 고객지원 이메일: hyunjae.lee.edu@gmail.com
- iOS·Android 앱 식별자: `com.praynote.app`
- 모바일 인증 복귀 주소: `com.praynote.app://login-callback/`

기존 `ourpraynote.vercel.app` 주소는 이미 설치된 웹앱 사용자의 호환성만을 위해 유지한다. 스토어 등록, 마케팅, 고객지원과 신규 외부 링크에는 `praynote.app`만 사용한다.

## App Store Connect 입력값

- Marketing URL: https://praynote.app
- Support URL: https://praynote.app/support
- Privacy Policy URL: https://praynote.app/privacy
- User Privacy Choices URL(선택): https://praynote.app/privacy
- Bundle ID: `com.praynote.app`
- 기본 언어: 한국어
- 앱 이름: PrayNote

### App Privacy 검토 기준

- 연락처 정보: 이메일 주소, 이름
- 사용자 콘텐츠: 기도제목과 그룹 공유 내용
- 식별자: 사용자 ID, Apple·Google 로그인 제공자 식별자
- 사용 데이터: 기도완료 반응, 알림·그룹·챌린지 이용 기록
- 진단: 접속 및 오류 로그
- 수집 목적: 앱 기능, 계정 인증, 보안·장애 대응, 서비스 개선
- 추적 목적 사용: 없음

실제 App Store Connect 답변은 제출 빌드와 당시 활성화된 SDK를 기준으로 다시 대조한다.

## Google Play Console 입력값

- 웹사이트: https://praynote.app
- 개인정보처리방침: https://praynote.app/privacy
- 고객지원 웹사이트: https://praynote.app/support
- 고객지원 이메일: hyunjae.lee.edu@gmail.com
- 패키지 이름: `com.praynote.app`

## Sign in with Apple 등록값

- Primary App ID / Bundle ID: `com.praynote.app`
- Services ID 권장값: `com.praynote.app.web`
- Apple Developer Team ID: `6RKKJW52GK`
- Sign in with Apple Key ID: `PMH95P44WX`
- Apple Services ID 등록 Domain: `yldbthzepaenrmrccnem.supabase.co`
- Apple Return URL: `https://yldbthzepaenrmrccnem.supabase.co/auth/v1/callback`
- Supabase Redirect Allow List:
  - `https://praynote.app/auth/callback`
  - `com.praynote.app://login-callback/`

Supabase Apple Client IDs에는 웹 OAuth용 Services ID를 첫 번째로, 네이티브 앱 Bundle ID를 두 번째로 등록한다.

Apple 웹 OAuth 클라이언트 보안 토큰은 2026년 9월 14일에 180일 유효기간으로 발급했다. 로그인 중단을 방지하기 위해 2027년 3월 10일까지 같은 키로 새 토큰을 생성해 Supabase에 교체한다. `.p8` 원본은 저장소나 배포 환경에 업로드하지 않는다.

## 출시 전 URL 확인

- 모든 URL이 로그인 없이 HTTPS로 열리는지 확인
- 개인정보처리방침과 고객지원 이메일이 실제로 접근 가능한지 확인
- 앱 내부 외부 링크가 `praynote.app`을 사용하는지 확인
- Apple·Google 로그인 완료 후 웹과 앱이 동일한 Supabase 사용자 계정으로 연결되는지 확인
