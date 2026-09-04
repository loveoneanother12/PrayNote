# Supabase 설정

## 적용 순서

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor 또는 Supabase CLI로 migrations 폴더의 SQL을 파일명 순서대로 적용합니다.
3. Project URL과 Publishable key를 .env.local에 입력합니다.
4. Authentication URL Configuration에서 로컬, Vercel Preview, 운영 주소를 등록합니다.

## 중요한 보안 원칙

- service_role 키는 브라우저에서 사용하지 않습니다.
- 모든 사용자 데이터는 RLS 정책을 거칩니다.
- Leader와 Admin 작업은 권한을 다시 검사하는 데이터베이스 함수로 처리합니다.
- 기도제목 전문을 알림이나 감사 로그에 저장하지 않습니다.

## 날짜 기록 원칙

- 원본 시각은 `timestamptz`로 저장합니다.
- 화면의 날짜와 일일 기도 완료 여부는 `Asia/Seoul` 기준으로 계산합니다.
- `prayer_responses.prayed_on`에는 사용자·기도제목별 하루 한 건만 저장해 향후 타임라인 통계의 원본 기록으로 사용합니다.
