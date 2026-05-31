# Moment Edit 통합 플랫폼 · Phase 1 작업 결과

> 신청 → 개인코드 발급 → 로그인 → 마이페이지에서 내 상태 확인 — 이 **한 바퀴**를 구현했습니다.
> 기조: "시간 걸려도 견고하게." 임시방편 없이 통합 구조에 맞게.

- 브랜치: `claude/serene-lamport-OxESV` (레포 `momentedit-site`)
- 커밋: `Phase 1: 통합 플랫폼 — 신청→개인코드→로그인→마이페이지`
- 검증: GAS 8파일 문법 OK · 함수/변수 충돌 0 · 핵심 로직 단위테스트 **27/27 통과**

---

## 1. 작업 단위별 결과 (phase1-spec T1~T6)

| 단위 | 내용 | 상태 |
|---|---|---|
| **T1** | 통합 스프레드시트 세팅 · Customers 23컬럼 + 데이터검증 6종 · `setupCustomers()`(멱등) | ✅ |
| **T2** | `makePersonalCode()` — 혼동문자 제외 6자 + 1열 충돌검사 | ✅ |
| **T3** | inquiry.html 비밀번호 2칸 + `action:'signup'` → 코드 발급·행 생성 | ✅ |
| **T4** | 신청 접수 메일 (개인코드 + 마이페이지 링크), 기존 emailShell 재사용 | ✅ |
| **T5** | login / autologin / verify / findCode / resetPw + 토큰·비번해시 | ✅ |
| **T6** | 마이페이지 뼈대 (진행바 · "지금 할 일" · 코드복사 · 카톡) | ✅ |

---

## 2. 파일별 변경

### 신규 — `automation/platform/` (기존 상담 GAS 프로젝트에 공존)

| 파일 | 내용 |
|---|---|
| `00_platform-config.gs` | 플랫폼 상수 `P` · Customers 23컬럼 헤더 · 드롭다운 값 목록 · 진행바 단계(상품별) · "지금 할 일" 매핑 |
| `10_customers-setup.gs` | `setupCustomers()` / `formatCustomersSheet()` — 헤더·검증·서식·상태색상, 멱등 재실행 |
| `20_customers-data.gs` | `makePersonalCode()` · 코드/토큰/이메일 행 조회 · `touchCustomer()`(최종수정 자동 갱신) |
| `30_auth-core.gs` | 비번 해시(솔트+SHA-256 스트레칭·상수시간 비교) · 세션 토큰 발급/검증 · KST 만료 · 재설정 서명 |
| `40_signup.gs` | `handleSignup`(허니팟·필수값·비번·Lock·dedup) + 접수 메일 |
| `50_auth-handlers.gs` | `login`·`autologin`·`verify`·`findCode`·`resetPw`·`doResetPw` (정보 최소 노출) |
| `60_mypage.gs` | `handleGetMyState` — 진행바·지금 할 일·코드·카톡 (민감정보 미포함) |
| `90_test-utils.gs` | `platformSelfTest` · 시그니처/웨딩스냅 테스트 신청 · 로그인 라운드트립 |
| `SETUP_플랫폼_가이드.md` | 설치·배포·테스트 절차 |

### 변경

| 파일 | 변경 |
|---|---|
| `consultation-booking.gs` | `doPost`를 **action 라우터로 확장**(8개 action 분기). 기존 상담 신청(action 없음)은 하위호환 유지 |
| `inquiry.html` | 비밀번호 2칸(검증 포함) + payload `action:'signup'`·비번 전송 + 성공화면 개인코드 카드·복사. 안내 문구 "상담 일정 선택 링크" → "개인코드와 마이페이지 링크" |
| `mypage.html` *(신규)* | 로그인 · 메일 자동로그인 · 마이페이지 · 코드찾기 · 비번재설정 (모바일 우선, 브랜드 톤) |

### 건드리지 않음
`invitation-gallery.html` · 청첩장 16종 · `live.html` · `form-to-couple.gs` · `guest-letter-*.gs`

---

## 3. API 엔드포인트 (doPost · action)

| action | 입력 | 출력 | 비고 |
|---|---|---|---|
| `signup` | 폼값+비번 | `{ok, code}` | 코드 발급·행 생성·접수 메일 |
| `login` | code, pw | `{ok, token}` | 해시 대조·토큰 갱신 |
| `autologin` | token | `{ok, token}` | 메일 링크 진입(만료까지 재사용) |
| `verify` | token | `{ok}` | 모든 조회의 전제 |
| `getMyState` | token | `{ok, name, product, stage, stageList, stageIndex, nextAction, code, kakao}` | 마이페이지 표시용 |
| `findCode` | email | `{ok}` | 코드 재발송(존재 여부 노출 최소화) |
| `resetPw` | email | `{ok}` | 재설정 링크(1시간·서명) |
| `doResetPw` | code,exp,sig,pw | `{ok, token}` | 새 비번 해시 저장 + 토큰 회전 |

---

## 4. 확정한 결정 (전부 권장안)

1. **산출물 위치** — `momentedit-site` 레포 `claude/serene-lamport-OxESV` 브랜치 커밋·푸시
2. **GAS 구조** — 기존 프로젝트에 파일 추가. `consultation-booking.gs`는 doGet/doPost만 라우터화, 나머지 로직은 `platform/*.gs`로 분리 (동명함수 충돌 0)
3. **웨딩스냅** — inquiry.html은 시그니처 고정. 스냅은 테스트 경로(`testSignupSnap()` / payload `product:'웨딩스냅'`)로 6단계 진행바 검증

---

## 5. 검증 결과

- **문법**: GAS 8파일 + 변경된 consultation-booking.gs + inquiry/mypage 인라인 JS 모두 OK
- **충돌**: platform 함수/변수 ↔ consultation 충돌 없음, platform 내부 중복 정의 없음
- **단위테스트 27/27**:
  - 개인코드 1000회 — 전부 6자 · 혼동문자 미포함 · 알파벳만
  - 비번 해시 — 형식·원문 미포함·맞는비번 통과·틀린비번 거부·솔트로 매번 상이
  - 비번 정책 — 5자 거부 / 6자 통과
  - KST 만료 — 과거 만료 / 미래 미만료 / 빈값 안전 만료
  - 재설정 서명 — 통과 / 변조 거부 / 만료 거부
  - 진행바 — 시그니처 9단계 / 웨딩스냅 6단계 / 미지 상품 기본값 / index 계산

---

## 6. 완료 기준(DoD) 대비

| DoD 항목 | 구현 | 최종 확인 |
|---|---|---|
| 신청 → 행 생성 + 코드 발급 + 접수 메일 | ✅ | 배포 후 실측 |
| 메일 링크 → 자동 로그인 → 마이페이지 | ✅ | 배포 후 실측 |
| 코드+비번 직접 로그인(백업) | ✅ | 배포 후 실측 |
| 진행바·"지금 할 일"·코드복사·카톡 표시 | ✅ | 배포 후 실측 |
| 상품타입별 진행바 라벨(9/6단계) | ✅ | 배포 후 실측 |
| 잘못된/만료 토큰 차단 | ✅ | 배포 후 실측 |
| 비번 원문이 시트·응답·로그에 없음 | ✅ | 단위테스트로 확인 |
| 모바일 전 흐름 정상 | ✅ | 배포 후 실측 |

> "배포 후 실측"은 실제 구글 스프레드시트·GAS·Vercel 배포가 필요해 운영자 확인이 남은 항목입니다(아래 7).

---

## 7. 운영자(희준) 액션 — 5단계

상세는 `SETUP_플랫폼_가이드.md`.

1. `platform/*.gs` 8개를 기존 상담 GAS 프로젝트에 추가 + `consultation-booking.gs` 최신본 덮어쓰기
2. 편집기에서 `setupCustomers` ▶ 실행 → 이어서 `platformSelfTest` ▶ (로그 `✅ 전부 통과`)
3. 웹앱 **새 버전으로 재배포** → `…/exec` URL 확인
4. 그 URL을 `inquiry.html`·`mypage.html`의 `EXEC_URL`에 동일하게 반영 + Vercel 배포
5. 테스트: `testSignupSignature`/`testSignupSnap` ▶ → 메일 자동로그인 → 마이페이지 확인

⚠️ `EXEC_URL`은 현재 기존 상담 배포 URL을 넣어둠. 같은 배포를 새 버전으로 올리면 유지되지만, 새 배포를 만들면 바뀌니 4번에서 꼭 맞출 것.

---

## 8. 후속 Phase (이번 범위 밖)

본계약·서명(P2) · 제작정보·청첩장 폼(P3·P5) · 관리자 페이지(P6) · 상담/Couples 시트와 개인코드 조인 · 결과물 업로드·갤러리.
