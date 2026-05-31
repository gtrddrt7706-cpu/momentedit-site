# Moment Edit 통합 플랫폼 · Phase 1 설치·배포 가이드

신청 → 개인코드 발급 → 로그인 → 마이페이지, 이 **한 바퀴**를 돌리기 위한 설치 안내입니다.
기존 상담 예약 시스템(`consultation-booking.gs`)과 **같은 스프레드시트 + 같은 GAS 프로젝트**에 통합합니다.

---

## 0. 이번에 추가/변경된 것

| 파일 | 위치 | 내용 |
|---|---|---|
| `platform/00_platform-config.gs` | GAS | 플랫폼 상수(`P`)·Customers 23컬럼 헤더·드롭다운 값·진행바 단계 |
| `platform/10_customers-setup.gs` | GAS | `setupCustomers()` / `formatCustomersSheet()` (멱등) |
| `platform/20_customers-data.gs` | GAS | `makePersonalCode()`·행 조회·`touchCustomer()` |
| `platform/30_auth-core.gs` | GAS | 비번 해시·세션 토큰·KST 만료·재설정 서명 |
| `platform/40_signup.gs` | GAS | `handleSignup` + 접수 메일 |
| `platform/50_auth-handlers.gs` | GAS | login·autologin·verify·findCode·resetPw·doResetPw |
| `platform/60_mypage.gs` | GAS | `handleGetMyState` |
| `platform/90_test-utils.gs` | GAS | 셀프테스트·테스트 신청 |
| `consultation-booking.gs` | GAS | **`doPost`를 action 라우터로 확장**(기존 상담 흐름은 그대로) |
| `inquiry.html` | Vercel | 비밀번호 2칸 추가 + `action:'signup'`·비번 전송 + 성공화면 개인코드 표시 |
| `mypage.html` | Vercel | **신규** — 로그인·자동로그인·마이페이지·코드찾기·비번재설정 |

> 건드리지 않음: `invitation-gallery.html` · 청첩장 16종 · `live.html` · `form-to-couple.gs` · `guest-letter-*.gs`

---

## 1. GAS에 코드 올리기

1. 상담 예약이 들어 있는 **기존 스프레드시트**를 연다 → 확장 프로그램 > Apps Script.
2. `automation/platform/` 안의 `.gs` 8개를 각각 **새 스크립트 파일**로 추가하고 내용을 붙여넣는다.
   (파일명은 자유지만 `00_…`처럼 번호를 붙이면 정렬이 편합니다.)
3. `consultation-booking.gs` 는 이 저장소의 최신본으로 **덮어쓴다** (doPost가 라우터로 바뀐 버전).
4. 저장.

> 같은 프로젝트라 `P`(플랫폼)와 `CONFIG`/`SYS`(상담)는 공존합니다. 함수명 충돌이 없도록 새 함수는 전부 다른 이름을 씁니다.

---

## 2. Customers 탭 만들기

GAS 편집기에서 함수 선택 → **`setupCustomers`** ▶ 실행 (최초 1회 권한 승인).

- `Customers` 탭이 첫 번째 탭으로 생기고, 23컬럼 헤더 + 드롭다운 6종 + 서식이 적용됩니다.
- 여러 번 실행해도 깨지지 않습니다(멱등). 서식만 다시 정리하려면 `formatCustomersSheet`.

이어서 **`platformSelfTest`** ▶ 실행 → 로그(보기 > 실행 로그)에 `✅ 전부 통과`가 보이면 로직 정상.

---

## 3. 설정값 확인 (`P` · `CONFIG`)

`00_platform-config.gs` 의 `P`:

- `MYPAGE_URL` — 마이페이지 주소. 기본 `https://momentedit.kr/mypage.html`. 도메인이 다르면 수정.
- `TOKEN_VALID_DAYS`(기본 30) · `PW_MIN_LEN`(6) · `PW_HASH_ROUNDS`(150) — 필요 시 조정.

`consultation-booking.gs` 의 `CONFIG` (상담과 공용):

- `ADMIN_EMAIL` / `ADMIN_CC` — 신규 신청 알림·테스트 메일 수신.
- `KAKAO_URL` — 마이페이지 카카오톡 문의 버튼. `[...]` 상태면 버튼이 숨겨집니다.

---

## 4. 웹앱 재배포 → EXEC_URL 반영 ★중요

1. 배포 > **배포 관리** > 기존 웹앱 배포의 ✎(편집) > 버전 **새 버전** > 배포.
   (같은 배포를 새 버전으로 올리면 **EXEC_URL이 유지**됩니다. 새로 만들면 URL이 바뀝니다.)
2. 웹앱 URL(`…/exec`)을 확인.
3. 이 URL을 **두 파일의 `EXEC_URL` 상수**에 동일하게 넣는다:
   - `inquiry.html` (상단 `const EXEC_URL = …`)
   - `mypage.html` (상단 `const EXEC_URL = …`)
4. Vercel에 `inquiry.html`·`mypage.html` 배포.

> 실행: 나 / 액세스: **모든 사용자** 로 배포해야 외부 fetch가 됩니다.

---

## 5. 한 바퀴 테스트 (Phase 1 DoD)

### A. 편집기에서 빠른 검증
- `testSignupSignature` ▶ → 로그에 개인코드 출력 + 관리자 메일로 접수 메일 도착.
- `testSignupSnap` ▶ → 웨딩스냅 테스트 고객 생성(진행바 6단계 확인용).
- `testLoginRoundTrip` ▶ → login→verify→getMyState 로그 + `✅ 응답에 민감정보 없음`.

### B. 실제 흐름
1. `inquiry.html` 에서 신청(비밀번호 2칸 포함) → Customers에 행 + 개인코드 + 접수 메일.
2. 메일의 **[마이페이지 열기]** → 자동 로그인 → 마이페이지 진입.
3. 로그아웃 후 **개인코드 + 비밀번호**로 직접 로그인(백업 경로).
4. 마이페이지에 진행바·"지금 할 일"·개인코드(복사)·카카오톡 버튼 표시.
5. 시그니처는 9단계, 웨딩스냅은 6단계 진행바.
6. 잘못된/만료 토큰 → 로그인 화면으로.

### 웨딩스냅 신청은?
현재 `inquiry.html`은 **시그니처(마이크로웨딩) 전용**입니다. 웨딩스냅 신청은 `testSignupSnap()`(또는
`signup` payload에 `product:'웨딩스냅'`)로 검증합니다. 웨딩스냅 전용 신청 폼은 후속 Phase에서 추가합니다.

---

## 6. 보안 메모

- 비밀번호 **원문은 시트·응답·로그 어디에도 저장하지 않습니다.** 솔트 + SHA-256 스트레칭 해시만 저장.
- 세션은 토큰(32자) + 만료(기본 30일). 코드+비번 로그인 시 토큰이 갱신(이전 토큰 무효화).
- 메일 자동로그인 링크는 만료까지 재사용 가능. 비번 재설정 링크는 1시간·서명 검증.
- HTTPS 전제(Vercel·GAS 모두 https).

---

## 7. 후속 Phase (이번 범위 밖)

본계약·서명 / 제작정보·청첩장 폼 / 관리자 페이지 / 상담 시트와 개인코드 조인 / 결과물 갤러리.
