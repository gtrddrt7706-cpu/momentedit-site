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

## 응답 마무리: 📮 코워크 전달 메시지 (2026-07-30 사용자 지시)

코워크(같은 프로젝트를 함께 작업하는 다른 세션·협업자)에게 **그대로 복붙해 넘길 수 있는 메시지**를, 응답마다 **항상** 한 칸으로 만든다. 사용자가 내용을 요약·재작성하지 않고 바로 전달할 수 있게 하기 위함. (병렬 세션이 서로 뭘 건드리는지 모른 채 같은 파일을 고쳐 조용히 역전되던 사고 방지 — 아래 '병렬 세션 무충돌 워크플로'와 한 몸)

### 형식
- 제목은 항상 `## 📮 코워크 전달 메시지`
- 본문은 **코드블록 안에** 넣는다(복붙 시 마크다운이 깨지지 않게).
- 코드블록 안 항목(해당 없으면 그 줄은 뺀다):
  - `[한 줄]` 이번 턴에 무슨 일이 있었는지 한 문장
  - `[브랜치]` 저장소 · 브랜치명 · main 대비 ahead/behind
  - `[건드린 파일]` 경로 목록 — **코워크가 이 파일을 동시에 열지 말라는 신호**
  - `[다음에 할 것]` 내가 이어서 할 작업 — 코워크가 겹치지 않게
  - `[봐줬으면 하는 것]` 리뷰·확인이 필요한 지점(되돌리기 비싼 변경이면 반드시)
  - `[주의]` 함정·전제·역전 위험 (예: tokens.css 미연결, 헤더 리터럴 등)

### 원칙
- **항상 만든다.** 조사·질문 응답이라 넘길 게 없어도 칸은 두고 `[한 줄]`만 적는다(빈 칸으로 두거나 생략하지 않는다).
- 코워크는 이 프로젝트 맥락을 이미 아는 상대다 — 배경 재설명 말고 **이번 턴의 델타**만 적는다.
- 사실만 적는다. 아직 안 한 일을 한 것처럼, 검증 안 한 걸 검증한 것처럼 쓰지 않는다.
- 이모지·전각 줄표 규칙은 고객 문구용이므로 이 칸엔 적용하지 않는다(내부 소통용).
- 위치는 `## 🙋 네가 할 일` **바로 위**. 마지막 칸은 종전대로 '네가 할 일'이 지킨다.

## 반영·배포: 항상 자동

코드 수정은 **항상** 커밋 → 브랜치 + `main` 푸시 → 배포까지 자동으로 진행한다(사용자 재확인 없이).
- `momentedit.kr`(`index.html`·`inquiry.html`·`admin.html`·`mypage.html` 등)은 `main` 푸시 시 Vercel 자동 배포.
- GAS 백엔드(`.gs`·`Admin.html`)는 내가 배포할 수 없으므로, **GAS 반영 + `R3n9Mr` 재배포가 필요한 변경이면 ① '🙋 네가 할 일'에 명시하고 ② 재배포할 `.gs`(·`Admin.html`) 파일을 항상 응답에 첨부(업로드)**한다 — 사용자가 매번 요청하지 않아도.
- GAS 재배포는 코드 저장만으론 `/exec`에 안 먹는다 → **항상 "새 버전"으로 배포 관리에서 재배포**해야 함을 안내한다.

## 문구 규칙

- 고객에게 노출되는 모든 문구(화면·메일·플레이스홀더·메타)에 전각 줄표(—)를 쓰지 않는다. 연결은 '·', 또는 문장을 나눈다. (2026-06-11 사용자 지시)
- **나레이션 포지셔닝** (2026-07-16 사용자 지시): 나레이션은 사회자를 두기 어려운 소규모 예식의 **진행 수단(차선)**이지 상품의 핵심·시그니처가 아니다. 핵심은 '본질에 집중한 마이크로웨딩 + 촬영·예식을 하나로 엮는 기록(140분 시그니처 시퀀스)'. 문구에서 나레이션을 "이끈다·핵심·시그니처"로 띄우지 말고, "진행 안내는 저희가 준비해요 · 사회자 없이도 매끄러워요" 수준의 서포트 프레임으로만 쓴다.
- **이모지 남발 금지 · 최소 사용** (2026-07-25 사용자 지시): 고객 화면 텍스트 문구에 장식 이모지를 쓰지 않는다. 허용 범위는 ①감정 정점 1곳 수준(현재: 예식 당일 D-day '오늘이에요 🤍' 1곳) ②기능적 아이콘(카드 아이콘 🍽🍃 · 대본 라벨 🔊🎵)뿐. 새 문구에 장식 이모지 추가 금지 · 후기 영역은 전면 무이모지(SURVEY_DONE_TONE). 관리자 메일은 종전대로 전면 금지(_noEmoji). **관리자 페이지(admin.html)도 동일 원칙(2026-07-25)**: 상태 신호(🔴막힘·🟡애매)·경고(⚠)·관례 마커(★)만 허용, 섹션 아이콘·버튼 라벨 등 장식 이모지 금지.
- **보이스 가이드(호칭·어미·용어) 단일 원천** (2026-07-25 · H6): 고객 문구의 호칭("두 분"·"하객분들")·시그니처 어휘 화면당 1회·어미 리듬·표준 용어(예식 영상·보정본·디렉터/사진작가)는 `docs/plans/PLAN_마이페이지_디자인_개선.md`의 **§6-B 보이스 가이드**를 따른다.
- **책임질 수 없는 안심 금지** (2026-07-15 사용자 지시): "통째로 빼셔도 돼요", "저희가 다 채워 드려요"처럼 근거 없이 포괄 보증하는 문구는 역효과. 안심 문구는 반드시 **근거(누가·무엇으로)**를 붙인다 (예: "당일 순서 진행은 나레이션과 디렉터가 맡아요"). 소요시간 자랑("3분이면 완성") 같은 가벼운 수치 약속도 쓰지 않는다.

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
| `aiMorningReport` | 96_ai_cost | ★아침 운영 보고 통합 — **오늘 상담·처리할 일**(admin `morningBriefData`)+안전점검·미처리인계·밤사이인계·24h요약·잔액·어제실패를 모아 **관리자에게 메일 1통(섹션 상세 · 제목에 핵심요약)**으로. aiDaily가 호출. (구 `sendMorningBrief` 별도 메일 폐지·통합) 솔라피 잔액 '긴급' 경고(0 전)는 _nfMaybeBalanceCheck가 별도 즉시 처리 |
| `adminUndoConfirmPayment('코드','마일스톤','사유')` | admin | 입금 확인 취소(오처리 복구) — 마일스톤은 계약금·중도금·잔금·중도금잔금. 사유 필수·멱등·처리이력. 카드결제분·현금영수증 발행분·다음 단계 전진(계약금 한정)·종료 고객·확인 후 24시간 경과(`UNDO_WINDOW_HOURS`)·환불 정산 완료 건은 각각 다른 메시지로 차단. 관리자 상세 화면 버튼이 호출(adminCall) |
| `adminUndoConfirmPreview('코드','마일스톤')` | admin | 위 취소의 미리보기(dry-run) — 아무것도 쓰지 않고 무엇이 어떻게 되돌아가는지만 반환. 모달이 실행 전에 보여줌 |
| `adminUndoRefunded('코드','사유')` | admin | 환불 '완료 표시' 취소 — 송금 자체가 아니라 표시를 되돌려 환불 송금 큐에 다시 띄움. 사유 필수·멱등·처리이력(adminCall) |
| `adminForceStagePreview('코드','단계')` | admin | 강제 단계 변경 미리보기 — 비워질 컬럼·동의기록 키·상담 예약 초기화 여부와 ROLLBACK_KEEP_PAID로 '유지됨'인 항목을 반환(실행과 같은 `_clearForwardData`) |
| `monthBusinessData` | admin | (읽기 전용) 이번 달 계약 건수·실입금 매출·전달 건수. aiMorningReport가 읽어 아침 메일 한 줄로 실음. 매출=‘확인’된 입금의 합(계약총액 합계 아님·상담 예약금 제외) |
| `morningBriefData` | admin | (읽기 전용) 오늘 상담 일정+처리할 일 큐 데이터. aiMorningReport가 읽어 합쳐 발송. (구 `sendMorningBrief`는 통합 후 no-op) |
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
| `purgeStaleCustomers` | 20_customers-data | 미계약·6개월 경과 고객 개인정보 자동 익명화(처리방침 파기 약속 이행). 계약(서명완료)·입금(중도금/잔금 확인)·계약총액 이력 있으면 법정보관으로 제외 · 행 삭제 없이 PII 컬럼만 비움. purgeAdvisorLog(주간)가 함께 호출. ScriptProperty `CUSTOMER_PURGE_OFF='Y'`로 정지·`CUSTOMER_PURGE_DAYS`로 일수 조정 |
| `previewStaleCustomers` | 20_customers-data | 실제 삭제 없이 '이번에 파기될 대상'만 로그로 확인(도입 첫 실행 전 점검용). purgeStaleCustomers(true)와 동일 |
| `setupConsultation` | consultation-booking | 최초 설치용(운영 중 실행 금지) |
| `setupCustomers` | 10_customers-setup | Customers 헤더·드롭다운·서식 재생성. **운영 중엔 원칙적으로 실행 금지** — 헤더 1행을 코드 리터럴 순서로 덮어쓰므로, 시트에 append로 늘어난 열 순서와 어긋나면 데이터는 그대로 둔 채 라벨만 밀려 열이 오정렬된다. `HEADER_ORDER_GUARD`가 실행 전에 대조해 다르면 헤더·데이터를 건드리지 않고 중단하지만(그리드 열 수 맞추는 빈 열 추가는 그 전에 이미 수행됨 · 빈 열이라 무해), 애초에 드롭다운 값만 바꾸려고 실행할 이유는 없다(GAS `setValue`는 데이터 검증을 통과하므로 서버 기록은 목록과 무관하게 성공 · 드롭다운은 시트에서 사람이 직접 고를 때만 영향). 가드에 막혔다면 `checkCustomerHeaderOrder`로 실측부터 할 것 |
| `checkCustomerHeaderOrder` | 10_customers-setup | (읽기 전용·진단) 시트 1행 실측 — `열번호: 시트라벨 \| 코드라벨`을 전부 찍고 불일치 열·양쪽에만 있는 라벨을 요약. 시트가 코드보다 길면 그 뒤 열도 표시. 아무것도 쓰지 않음(재실행 무한 안전). **`CUSTOMER_HEADERS` 리터럴을 고치기 전에 반드시 이걸로 실측할 것** — 열이 늘어나는 경로가 `setupCustomers` 말고도 `addProdTrackColumns`·`addGuideTokenColumn`·`addResultSelectionColumns`·`adminSetResultLinks`(원본폴더ID 자가 추가 · `adminMarkDelivered`가 아니다)로 여러 개이고 서로 순서가 달라, 코드만 읽어서는 실제 순서를 확정할 수 없다. **결론 줄은 가드와 같은 기준(`GUARD_MIRROR`)으로 계산** — 가드가 통과인데 "막힌다"고 단정해 멀쩡한 라벨을 지우게 만드는 오지시를 막는다(`scripts/audit/header-order.mjs`가 진짜 가드와 대조해 고정) |
| `formatCustomersSheet` | 10_customers-setup | 열폭·정렬·민감열 흐리게 + `현재단계` 조건부 색상만 재적용(헤더·데이터 무변경 · 운영 중 실행 안전). 단계 라벨을 추가했을 때 색을 입히는 용도 |
| `backfillProduceStage` | 80_production | 제작을 이미 시작했는데 '입금완료'에 고착된 고객의 현재단계를 '제작중'으로 정정. **기본 드라이런(로그만)** · 실제 반영은 `backfillProduceStage(false)`. 스냅 제외 · 제작 흔적 있는 건만(관리자가 롤백한 건은 제작임시저장이 비어 자동 제외) · 처리이력 기록. 2026-07-25 전이 복구 이전 고객 1회 정리용. **★구셀(`제작임시저장`) 기준 · Wave 4 PR-B 이전 세대 전용 1회성 — PR-B 배포 전에 실행할 것**(이후 신규 고객은 구셀이 백지라 대상이 아니며, 시간이 갈수록 읽는 데이터가 낡는다) |
| `backfillProduceStageApply` | 80_production | 위 백필을 **실제 반영**(= `backfillProduceStage(false)`). GAS 편집기는 인자를 넘겨 실행할 수 없어 드롭다운에서 바로 고르는 실행용 래퍼. 드라이런으로 목록 확인 후 이걸 실행 |
| `checkProdCapOverflow` | 80_production | (읽기 전용·진단) 배포 전 점검 — 구셀 세대 행 중 신 컬럼 캡을 넘는 트랙을 가진 고객 목록. 이전 자체는 캡을 안 보므로 막히지 않지만, 그 고객이 그 트랙을 '더 수정'하려 하면 거부되니 미리 알고 들어가려는 용도. 아무것도 쓰지 않음 |
| `addProdTrackColumns` | 80_production | Customers에 제작 트랙 컬럼 8개(`제작_ritual`·`제작_dining`·`제작_seat`·`제작_guideinfo`·`제작_snap`·`제작_final`·`제작_invitation`·`제작_meta`) 1회 추가(멱등·끝에 append · meta를 마지막에 추가해 '전부 있거나 전부 없거나'를 보장). **★반드시 '새 버전' 배포 _전에_ 실행**(GAS 편집기는 저장된 코드로 도니 배포 전에 실행 가능). 컬럼이 없는 상태로 PR-B 코드가 배포되면 `writeCell`이 헤더 없는 컬럼을 조용히 건너뛰어 **저장이 통째로 사라진다**(구셀에도 안 남음 · 화면엔 '저장됐어요'). 코드 가드(`_prodColsMissing`)가 그 상태를 감지해 저장을 거부하지만, 순서를 지키면 그 창 자체가 없다 |
| `addGuideTokenColumn` | 80_production | Customers에 `안내공유토큰` 열 1회 추가(멱등). 하객 안내 허브(guide.html) 링크 발급 전 1회 실행 — 안 하면 토큰 발급이 조용히 생략됨 |
| `ZZ_tossPing` | 98_pay_card | 토스 샌드박스 연결·키 확인(더미 confirm 호출·실결제 아님). PAY_CARD_ENABLED 켜기 전 TOSS_SECRET_KEY 점검 · 결과는 Logger |
| `sendHoldExpiryNotices` | 70_journey | 임시고정 만료 D-3 안내 + 가예약 캘린더 백필·만료 정리(일1회 트리거 자동·수동 1회 실행 가능) |
| `auditDineDb` | 88_place_audit | 사이트 다이닝 리스트 전체를 카카오 지도와 전수 대조 → AW_장소검증 시트(폐업·상호변경 탐지) |
| `setupAwAudit` | 88_place_audit | 월간 자동 검증 트리거 등록(1회 — 매월 1일 09시 awMonthlyAudit 실행, 미발견 발생 시 관리자 SMS) |
| `awMonthlyAudit` | 88_place_audit | 월간 검증 본체(트리거 자동·수동 1회 실행 가능). 폐업·상호변경 의심 발견 시 ADMIN_PHONE으로 알림 |
| `collectDinePool` | 88_place_audit | 스튜디오 반경 7km 업종 스윕으로 후보 식당·카페 대량 수집 → AW_장소후보 시트(검토 O → 사이트 승격) |
| `collectDinePoolDeep` | 88_place_audit | 후보 최대 수집(3×3 격자 셀별 스윕 — 기본 수집의 2~3배). 3~5분·6분 한도 전 자동 종료 |
| `vimeoGuardDaily` | form-to-couple(부부폼 GAS·별도 프로젝트) | 3일 안 디지털 참석 예식 중 vimeoId 미등록 건 경고 메일(하루 1통·수동 점검 가능). D-3 영상 사전등록 SOP 누락 방지 |
| `setupVimeoGuard` | form-to-couple(부부폼 GAS·별도 프로젝트) | vimeoGuardDaily 매일 07시 트리거 등록(1회·중복 자동 정리) |

## 관리자 알림 = 메일 전용 (2026-06-29 사용자 지시)

관리자(운영자)에게 가는 모든 알림은 **문자 대신 메일**로 보낸다(문자비 0). 실시간 업무신호·AI 인계·아침보고·잔액경고·월간검증 전부 메일.
- 발송 경로: `95_notify`의 `_nfAdminLineEmail(text)`(짧은 1건) · `_nfAdminEmail(subject, html, opts)`(상세). 둘 다 `ADMIN_EMAIL`(contact@momentedit.kr) 수신 + `ADMIN_CC`(미쿠·희준 개인메일) cc.
- `aiAlertAdmin`·`_kakaoSend`의 admin 분기·`_awNotifyAdmin_` 전부 위 메일 함수로 라우팅. SMS(`_solapiSend`+ADMIN_PHONE)는 고객 알림톡·`notifyTestAdminSms`(수동 테스트)만 사용.
- 사용자는 이 메일에 폰 푸시 알람을 걸어 즉시 확인(문자 대체). 고객 알림톡은 종전대로 솔라피 사용.
- **이모지 없이**: 관리자 메일 제목·문구엔 이모지를 쓰지 않는다. `95_notify`의 `_noEmoji()`가 `_nfAdminEmail`·`_nfAdminLineEmail`·`notifyStudio` 진입점에서 그림문자·변형선택자를 자동 제거(→ · 화살표·중점·한글은 보존). 새 문구에 이모지가 섞여도 자동으로 걸러짐.

## 제거 지시 보존 규칙 (2026-07-16 사용자 지시)

사용자가 "없애 달라"고 한 UI·기능은 **이후 코드리뷰·복구·리팩터링이 '유실된 기능 복원' 후보로 다루더라도 절대 되살리지 않는다.**
- 제거할 때 그 코드 자리에 `★…금지 — YYYY-MM-DD 사용자 지시로 삭제` 주석을 남겨 미래의 리뷰가 복원하지 않게 한다.
- 실제 사고: 좌석 배치도 좌우 이동(→/←) 버튼 — 7/12 사용자 지시로 삭제 → 7/14 리뷰가 '복원' → 7/16 재삭제. 이런 역전 금지.
- 기능상 꼭 필요해 보이면 복원하지 말고 '결정 대기함'에 근거와 함께 올린다.

## 병렬 세션 병합 검증 규칙 (2026-07-18)

`main` 병합(pull 포함) 직후에는 **`sh automation/tests/merge-guard.sh`** 를 실행해 최근 수정 마커가 살아있는지 확인한다.
- 이유: 병렬 세션이 낡은 파일 버퍼로 통째 커밋하면 커밋 메시지에 아무 언급 없이 다른 세션의 수정이 역전된다. 실사고 3건 — .done-fold CSS 오삭제 · guideFold 조립 줄 소실 · d42540f(위저드 함정 수정 7건 무언급 역전).
- 마커 0이면: 되돌려진 수정 커밋을 찾아 `git show <sha> -- 파일 | git apply -3`로 재적용 → 복원 커밋. 기능을 정당히 폐지해 마커가 사라지면 가드 목록도 같은 커밋에서 갱신.
- 새 세션에서 중요한 수정을 하면 마커(고유 문자열 주석)를 남기고 merge-guard.sh 목록에 추가한다.

## 병렬 세션 무충돌 워크플로 (2026-07-19 사용자 지시: "여러 클로드를 동시에 돌려도 자동으로 깔끔히 병합·오류 없이 반영")

여러 Claude 세션을 동시에 돌려도 서로 덮어쓰지 않고 자연스럽게 자동 병합되게 하려면 **모든 세션이 아래를 반드시 지킨다**. (과거 반복 사고 원인 = 낡은 스냅샷으로 main에 직접 통째 커밋 → 다른 세션 작업 무언급 역전)
1. **main 직접 push 금지.** main은 브랜치 보호(Ruleset `protect-main` · Require a pull request)로 직접 push가 막혀 있다. 반드시 자기 브랜치 + PR로만 반영한다.
2. **항상 최신 main에서 시작·유지.** 작업 시작·재개 전 `git fetch origin main` → 자기 브랜치를 `origin/main`에 rebase(또는 새 분기). 낡은 버퍼로 통째 커밋하면 다른 세션 작업이 조용히 역전된다.
3. **작게·자주 PR.** 오래 사는 브랜치일수록 충돌·역전↑. 기능 단위로 쪼개 빨리 병합해 브랜치 수명을 짧게.
4. **PR엔 auto-merge 켜기.** `Merge Guard` 체크가 초록이면 자동 병합, 마커 역전이면 자동 차단(RED). 사람이 매번 누를 필요 없음.
5. **push 전 `sh automation/tests/merge-guard.sh`** 로 마커 생존 자가진단. 중요한 수정은 마커를 남기고 가드 목록에 추가(위 규칙과 동일).
6. **되돌리기 비싼 변경은 병합 전에 리뷰를 받는다** (2026-07-26 코워크 합의). 헤더 리터럴(`CUSTOMER_HEADERS`)·시트 스키마·개인정보 파기 목록처럼 **틀렸을 때 복구가 어려운** 변경은, 감사 전부 초록이어도 병합 전에 코워크에 한 번 보낸다. 화면 문구·CSS·테스트처럼 되돌리기 싼 변경은 종전대로 auto-merge.
7. **같은 파일 동시 편집 최소화.** 가능하면 세션별로 다른 파일·영역을 맡는다. 같은 줄을 두 세션이 고치면 충돌은 불가피(도구로 100% 자동해소 불가) — 단, 위 1·4·5로 '조용한 역전'은 0이 되고, 진짜 충돌만 PR에서 눈에 보이게 남는다.

## 나중에 할 일 메모 규칙 (2026-06-12 사용자 지시)

사용자가 "메모해놔 / 체크리스트에 남겨줘 / 나중에 하자"고 하면 루트 **`나중에할일_체크리스트.md`** 에 추가한다 — 흩어두지 말고 항상 이 한 파일(단일 보관처). 완료 항목은 `[x]` 체크. (SEO 상세는 `docs/plans/PLAN_SEO_체크리스트.md`가 별도 관리되며 통합 파일에서 링크)

## 사용자 결정 대기함 규칙 (2026-07-14 사용자 지시)

작업 중 **사용자 선택·결정이 필요한 항목은 그때그때 묻지 않는다.** 내 추천값으로 계속 진행하고, 항목은 루트 **`나중에할일_체크리스트.md`의 "결정 대기함" 섹션**에 모아 둔다. 그러다 ①사용자가 물어보거나 ②결정 없이는 더 못 가는 시점이 오면 **한 번에 몰아서** 질문한다(각 항목에 내 추천 + 한 줄 이유를 붙여서). 결정되면 `[x]` 체크 + 결정 내용 기록.
