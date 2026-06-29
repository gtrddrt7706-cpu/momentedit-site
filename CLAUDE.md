# Moment Edit — 작업 규칙 (Claude)

## 응답 마무리: 🙋 네가 할 일

수정·작업 요청을 처리할 때는 **내가 할 수 있는 작업을 전부 끝낸 뒤**, 응답 **맨 마지막**에 항상 아래 제목의 칸으로 "사용자가 직접 해야 할 일"을 정리한다. 사용자가 놓치지 않게 하기 위함.

### 형식
- 제목은 항상 `## 🙋 네가 할 일`
- 둘 중 하나로 표시:
  - **✅ 없음** — 내가 다 처리함. + 왜 없는지 한 줄 (예: `momentedit.kr`은 Vercel 자동 반영 / `.gs` 주석만이라 재배포 불필요).
  - **⚠️ 있음** — 사용자가 직접 해야만 하는 것만 번호 목록으로 (예: GAS에 `.gs` 반영 + `R3n9Mr` 재배포 / 외부 결제 / 라이브 직접 확인).

### 원칙
- "있음"에는 **내가 못 하는 것만** 적는다. 내가 할 수 있는 건 먼저 다 해놓고 보고만 한다.
- 헷갈려도 "없음"이라고 한 줄 이유를 붙여, 사용자가 안심하고 넘어가게 한다.
- 이 칸은 항상 응답의 가장 아래, 같은 제목으로 둔다.
- **반복 금지**: 계약서 '을' 사업자정보(통신판매업 신고번호·정식 도로명주소)는 사용자가 준비되면 직접 전달함 — '네가 할 일'에 다시 넣어 재촉하지 않는다.

## 반영·배포: 항상 자동

코드 수정은 **항상** 커밋 → 브랜치 + `main` 푸시 → 배포까지 자동으로 진행한다(사용자 재확인 없이).
- `momentedit.kr`(`index.html`·`inquiry.html`·`admin.html`·`mypage.html` 등)은 `main` 푸시 시 Vercel 자동 배포.
- GAS 백엔드(`.gs`·`Admin.html`)는 내가 배포할 수 없으므로, **GAS 반영 + `R3n9Mr` 재배포가 필요한 변경이면 ① '🙋 네가 할 일'에 명시하고 ② 재배포할 `.gs`(·`Admin.html`) 파일을 항상 응답에 첨부(업로드)**한다 — 사용자가 매번 요청하지 않아도.
- GAS 재배포는 코드 저장만으론 `/exec`에 안 먹는다 → **항상 "새 버전"으로 배포 관리에서 재배포**해야 함을 안내한다.

## 문구 규칙

- 고객에게 노출되는 모든 문구(화면·메일·플레이스홀더·메타)에 전각 줄표(—)를 쓰지 않는다. 연결은 '·', 또는 문장을 나눈다. (2026-06-11 사용자 지시)

## GAS 함수 안내 규칙 (2026-06-11 사용자 지시)

사용자에게 GAS 함수 실행을 안내할 때는 **반드시 "어느 파일에 들어있는지"를 함께** 적는다.
(GAS 편집기는 왼쪽에서 그 파일을 열어야 상단 드롭다운에 해당 파일의 함수가 보이기 때문)
형식 예: "`95_notify` 파일을 열고 → `notifySetupCheck` 실행".

### 실행 함수 위치표 (새 함수를 만들면 여기에 추가)

| 함수 | 파일 | 용도 |
|---|---|---|
| `notifySetupCheck` | 95_notify | 알림 설정 점검(발송 없음·로그만) |
| `notifyTestAdminSms` | 95_notify | 관리자 폰 테스트 문자 1건(실발송) |
| `notifyTestCustomerByCode('코드')` | 95_notify | 고객 알림 테스트(실발송·야간보류 무시) |
| `notifyTestKakao('번호'[,'이벤트'])` | 95_notify | 카톡(알림톡) 직접 테스트 — 지정 번호로 승인·매핑된 템플릿 1건 실발송(카톡만·SMS 대체 끔). 템플릿ID 미매핑이면 로그로 안내 |
| `flushHeldNotifies` | 95_notify | 야간 보류 알림 즉시 발송(평소엔 8시 트리거 자동) |
| `notifyBalanceCheck` | 95_notify | 솔라피 잔액이 임계(`SOLAPI_LOW_BALANCE`·기본 3000원·자동충전 5000보다 낮게) 이하면 관리자에게 GAS 이메일 경고 1통(하루 1통). aiDaily 매일 + 발송 활동 시 시간당 1회(_nfMaybeBalanceCheck) 호출. 솔라피 안 거치는 메일이라 잔액 0이어도 발송됨 |
| `handleSolapiReport` | 95_notify | 솔라피 전달결과 리포트 웹훅 처리(doPost가 배열/messageId 형태 감지 시 호출). 알림톡 '전달 실패'면 그 고객에게 이메일(카톡 미수신 커버). 발송 시 `알림톡추적` 시트에 messageId↔code 기록 · purgeNfTrack가 7일 정리. ★솔라피 콘솔에 리포트 웹훅 URL=/exec 등록 필요 |
| `solapiUsageSummary` | 95_notify | 문자·알림톡 잔액+이번달/24h 발송 건수·추정비용(관리자 💰 패널·adminCall) |
| `setupAllTriggers` | 70_journey | 자동 트리거 일괄 등록(재배포 후·트리거 변경 시 1회) |
| `weeklyBackup` | 70_journey | 전체 스프레드시트를 'ME_백업' 폴더에 주간 날짜 사본·최근 8주 보관(첫 실행 시 Drive 권한 승인 · setupAllTriggers가 매주 등록) |
| `aiQuestionResolve` | 96_ai_cost | 교육 후보/리포트에서 질문 '해결' 표시(목록서 치움 · 재발 시 재등장) — 관리자 ✓버튼(adminCall) |
| `weeklyReceiptAudit` | admin | 영수증 미발행 점검(월요일 트리거 자동·수동 점검 가능) |
| `purgeAdvisorLog` | consultation-booking | AI 상담사 질문 로그 90일 정리(주간 트리거 자동 · 애프터수요로그도 함께 정리) |
| `purgeAwDemandLog` | consultation-booking | 애프터웨딩 수요 로그 90일 정리(purgeAdvisorLog가 함께 호출 · 별도 트리거 불필요) |
| `aiCostSummary24h` | 96_ai_cost | 접점별 AI 비용 24시간·이번달 집계(원화) — 관리자 💰버튼이 호출(adminCall) |
| `aiQuestionLog` | 96_ai_cost | 실제 고객 질문 로그 최신순(빈도수·🔴막힘/🟡애매) — 관리자 💡개선 탭 교육 후보(adminCall) |
| `aiQuestionReport` | 96_ai_cost | 고객질문 종합 리포트(기간별 막힘/애매/정상·접점별·자주 막힌·애매한 질문 TOP) — 관리자 📊리포트 탭(adminCall) |
| `aiFactSet`·`aiFactsList`·`aiFactHistory`·`aiFactRollback`·`aiFactDelete` | 96_ai_cost | 핵심정보 단일 진실원(가격·일정·정책) 편집·이력·롤백 — 관리자 🎯핵심정보 탭(adminCall). API가 `handleAiFacts`(doPost action='aiFacts')로 라이브 주입 |
| `aiRegAdd`·`aiRegList`·`aiRegSetActive`·`aiRegDelete` | 96_ai_cost | 회귀셋(고친 건 영구 점검) 관리 — 📊리포트 📌로 추가·💡개선 탭서 관리(adminCall). aiDailySafetyCheck가 매일 함께 점검 |
| `aiDaily` | 96_ai_cost | 매일 9시 트리거 — `aiMorningReport()` 1개만 호출(setupAllTriggers가 등록) |
| `aiMorningReport` | 96_ai_cost | ★아침 운영 보고 통합 — 안전점검·미처리인계·밤사이인계·24h요약·잔액·어제실패를 모아 **관리자에게 메일 1통(섹션 상세 · 제목에 핵심요약)**으로. aiDaily가 호출. 솔라피 잔액 '긴급' 경고(0 전)는 _nfMaybeBalanceCheck가 별도 즉시 처리 |
| `aiMorningPreview` | 96_ai_cost | 지금 아침보고 1통 즉시 발송(테스트·수동). aiMorningReport와 동일 |
| `aiDailySafetyCheck` | 96_ai_cost | 레드라인 자동 안전점검(개인정보·임의할인·사람연결·인계). `aiDailySafetyCheck(true)`(silent)면 개별 문자 없이 결과만 반환(아침보고가 합쳐 발송). 수동 실행 시엔 위반/하락 시 SMS. 서버 fetch 막히면 점검불가 반환 |
| `aiDailyDigest` | 96_ai_cost | 최근 24h 상담·인계·비용·테스트·안전 한 줄 요약. `aiDailyDigest(true)`면 관리자 SMS(aiMorningReport는 `false`로 텍스트만 가져감) |
| `aiHandoffStatus` | 97_ai-handoff | (읽기 전용) 현재 '대기' 인계 수·그중 24h 경과 수 반환 — aiMorningReport 집계용 |
| `aiHandoffNightTake` | 97_ai-handoff | (읽기+초기화) 밤사이 보류 새 인계 수 읽고 카운터 0으로 — aiMorningReport가 1회 소비 |
| `aiHandoffReminder` | 97_ai-handoff | (구) 미처리 인계 24h 리마인드 SMS. 현재는 aiMorningReport로 통합 · 수동/하위호환 유지 |
| `aiHandoffNightFlush` | 97_ai-handoff | (구) 야간 보류 새 인계 아침 발송 SMS. 현재는 aiMorningReport로 통합 · 수동/하위호환 유지 |
| `dumpPendingAiHandoff` | 97_ai-handoff | 현재 '대기' 인계 전체를 로그로 출력(번호·일시·고객·질문요약·AI제안답변). 읽기 전용·발송 없음. 80건 진짜/테스트 판단·답변 검토용(관리자 페이지는 30건만 보임) |
| `clearAllPendingAiHandoff` | 97_ai-handoff | 현재 '대기' 인계 전부를 '일괄정리'로 표시(행 보존·미처리 카운트서 제거). 쌓인 테스트/오래된 건 한 번에 비울 때 수동 1회 |
| `purgeAiHandoff` | 97_ai-handoff | '대기' 30일(AIH_EXPIRE_DAYS) 경과 인계를 '만료' 표시 → 미처리 알림 누적 방지. purgeAdvisorLog(주간)가 함께 호출 · 별도 트리거 불필요 |
| `handleAiCostLog` | 96_ai_cost | AI 토큰 비용 1건 적재(doPost action='aiCostLog' · Vercel 챗봇이 호출) |
| `purgeAiCostLog` | 96_ai_cost | AI 비용 로그 35일 정리(purgeAdvisorLog가 함께 호출 · 별도 트리거 불필요) |
| `setupConsultation` | consultation-booking | 최초 설치용(운영 중 실행 금지) |
| `sendHoldExpiryNotices` | 70_journey | 임시고정 만료 D-3 안내 + 가예약 캘린더 백필·만료 정리(일1회 트리거 자동·수동 1회 실행 가능) |
| `auditDineDb` | 88_place_audit | 사이트 다이닝 리스트 전체를 카카오 지도와 전수 대조 → AW_장소검증 시트(폐업·상호변경 탐지) |
| `setupAwAudit` | 88_place_audit | 월간 자동 검증 트리거 등록(1회 — 매월 1일 09시 awMonthlyAudit 실행, 미발견 발생 시 관리자 SMS) |
| `awMonthlyAudit` | 88_place_audit | 월간 검증 본체(트리거 자동·수동 1회 실행 가능). 폐업·상호변경 의심 발견 시 ADMIN_PHONE으로 알림 |
| `collectDinePool` | 88_place_audit | 스튜디오 반경 7km 업종 스윕으로 후보 식당·카페 대량 수집 → AW_장소후보 시트(검토 O → 사이트 승격) |
| `collectDinePoolDeep` | 88_place_audit | 후보 최대 수집(3×3 격자 셀별 스윕 — 기본 수집의 2~3배). 3~5분·6분 한도 전 자동 종료 |

## 관리자 알림 = 메일 전용 (2026-06-29 사용자 지시)

관리자(운영자)에게 가는 모든 알림은 **문자 대신 메일**로 보낸다(문자비 0). 실시간 업무신호·AI 인계·아침보고·잔액경고·월간검증 전부 메일.
- 발송 경로: `95_notify`의 `_nfAdminLineEmail(text)`(짧은 1건) · `_nfAdminEmail(subject, html, opts)`(상세). 둘 다 `ADMIN_EMAIL`(contact@momentedit.kr) 수신 + `ADMIN_CC`(미쿠·희준 개인메일) cc.
- `aiAlertAdmin`·`_kakaoSend`의 admin 분기·`_awNotifyAdmin_` 전부 위 메일 함수로 라우팅. SMS(`_solapiSend`+ADMIN_PHONE)는 고객 알림톡·`notifyTestAdminSms`(수동 테스트)만 사용.
- 사용자는 이 메일에 폰 푸시 알람을 걸어 즉시 확인(문자 대체). 고객 알림톡은 종전대로 솔라피 사용.

## 나중에 할 일 메모 규칙 (2026-06-12 사용자 지시)

사용자가 "메모해놔 / 체크리스트에 남겨줘 / 나중에 하자"고 하면 루트 **`나중에할일_체크리스트.md`** 에 추가한다 — 흩어두지 말고 항상 이 한 파일(단일 보관처). 완료 항목은 `[x]` 체크. (SEO 상세는 `PLAN_SEO_체크리스트.md`가 별도 관리되며 통합 파일에서 링크)
