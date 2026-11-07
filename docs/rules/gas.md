# GAS 함수 · 공개 입구 잠금 · 관리자 알림 · 표식 — 규칙 원문 · 경위

> 2026-11-07 [RULES_SLIM_1107] CLAUDE.md 에서 옮긴 원문이다(뜻은 그대로 · 자리만 옮김). 요약 규칙은 CLAUDE.md 가 정본이고, 여기는 **GAS 파일 · 함수** 을 고칠 때 여는 상세 · 사고 경위다.
> 요약과 여기가 어긋나면 날짜가 늦은 결정이 이긴다. 새 결정은 요약 한 줄 + 여기 상세를 같은 PR 에서 함께 고친다.

## GAS 함수 안내 규칙 (2026-06-11 사용자 지시)

사용자에게 GAS 함수 실행을 안내할 때는 **반드시 "어느 파일에 들어있는지"를 함께** 적는다.
(GAS 편집기는 왼쪽에서 그 파일을 열어야 상단 드롭다운에 해당 파일의 함수가 보이기 때문)
형식 예: "`95_notify` 파일을 열고 → `notifySetupCheck` 실행".

### ★2026-09-19 대표 재지적 — 「deployCheck 이런 거 얘기할 때는 어디 쪽에 있는지도 같이 항상 얘기해」

규칙은 2026-06-11 부터 있었는데 또 어겼다. 원인을 찾아보니 **`deployCheck`·`contractCheck` 가
아래 위치표에 없었다.** 표에 없으니 파일명을 모른 채로 함수 이름만 적었다.

- **새 실행 함수를 만들면 그 커밋에서 아래 표에 같이 넣는다.** 표가 곧 내가 파일명을 적는 근거다.
- **함수 이름을 처음 꺼낼 때마다** 파일명을 붙인다 — 「아까 말했으니 생략」이 없다.
  대표는 그때그때 GAS 편집기를 여는 사람이지, 앞 대화를 되짚는 사람이 아니다.
- 점검·진단 함수도 예외가 아니다. 오히려 **급할 때 찾는 것**이라 더 중요하다.

### 실행 함수 위치표 (새 함수를 만들면 여기에 추가)

| 함수 | 파일 | 용도 |
|---|---|---|
| `deployCheck` | **99_deployCheck** | ★붙여넣기·배포 누락 점검 — 파일이 다 있는가(안쪽까지)·최근 변경이 올라갔는가·배포가 «먹었는가»(저장만으론 /exec 에 안 먹는다)·시트 컬럼·예약 실행·스크립트 속성. 목록은 사이트(momentedit.kr/deploy-marks.json)에서 가져온다 — **main 에 병합돼야 목록이 갱신된다** |
| `deployStampCheck` | **99_deployCheck** | ★배포가 «먹었는가»만 찍는다(서너 줄) · ★[TRIG_IN 2026-10-09] 끝에 «예약 실행 확인» 한 줄(진짜 트리거를 알아봤는가 · 아직이면 모양 기록). deployCheck 로그가 GAS 한도로 ③ 에서 잘려 ④ 를 몇 번을 돌려도 못 보던 자리 — 2026-09-20 대표 실행 두 번 모두 그랬다. **재배포할 때마다 이것만 돌리면 된다.** deployCheck 는 «붙여넣기» 점검이고 이건 «배포» 점검이다. ★기록이 없으면 «아직 모름»이다 — 재배포 뒤 관리자 페이지(momentedit.kr/admin.html)를 한 번 열어야 지문이 찍힌다(홈은 GAS 를 안 불러 안 찍힌다 · [STAMP_HIT_ADMIN]). ★★[STAMP_FN_ONLY] **이 판정은 «함수»만 본다** — `_dsGlobalSig` 가 `typeof === 'function'` 인 것만 모은다. 화면 파일(`ScreenA`·`ScreenB`·`ScreenC` `.html` · `Admin.html` 은 2026-10-08 은퇴)은 지문에 **안 들어가서**, 붙여넣었든 안 넣었든 똑같이 OK 가 나온다. **`.html` 을 붙여넣었으면 `deployCheck`(같은 `99_deployCheck` 파일)를 돌려 ①-C 본문 길이를 봐야 한다.** 2026-09-20 에 내가 `ScreenB_schedule.html` 을 고쳐 드리고 이걸로 확인하라고 안내했는데, 확인될 수가 없는 조합이었다 |
| `contractCheck` | **99_contractCheck** | ★값 계약 점검 — deployCheck 와 **짝**이다. 그쪽은 «표식이 있는가», 이쪽은 «값이 맞는가». GAS 상수(FINAL_CONFIRM 등)를 실제로 평가하고, 배포된 사이트 문장까지 대조한다. 목록이 없으면 파일 안 폴백으로 GAS 값만 본다 |
| `contractCheckHelp` | **99_contractCheck** | 위 점검의 사용법 출력(발송·변경 없음). 파일 끝을 지키는 함수이기도 하다 — 이 이름이 사라지면 붙여넣다 뒤가 잘린 것이다 |
| `notifySetupCheck` | 95_notify | 알림 설정 점검(발송 없음·로그만) · ★켜진 고객 알림 중 **알림톡 템플릿이 빠진 것을 이름으로 나열**(TPL_COVER) — 「알림톡이 안 나간다」면 여기부터. 템플릿이 없으면 알림톡은 안 나가고 이메일로만 대체되며, 그 사실은 고객 상세 처리이력·관리자 메일(하루 한 통)로 드러난다(TPL_SILENT) |
| `notifyTestAdminSms` | 95_notify | 관리자 폰 테스트 문자 1건(실발송) |
| `notifyTestCustomerByCode('코드')` | 95_notify | 고객 알림 테스트(실발송·야간보류 무시) |
| `notifyTestKakao('번호'[,'이벤트'])` | 95_notify | 카톡(알림톡) 직접 테스트 — 지정 번호로 승인·매핑된 템플릿 1건 실발송(카톡만·SMS 대체 끔). 템플릿ID 미매핑이면 로그로 안내 |
| `importKakaoTemplates` | 95_notify | ★알림톡 템플릿 승인 뒤 **이것 하나**로 잇는다 — 솔라피에서 **승인된** 템플릿을 불러와 이름의 T 번호(T01~T22)로 알림에 매핑. 기존 매핑은 지우지 않고 **더한다**(TPL_KEEP · 2026-09-25 전에는 통째로 덮어써 이름이 T## 가 아닌 매핑이 빠졌다). 검수 중인 것은 건너뛰니 승인날 때마다 다시 돌려도 된다. 저장 뒤 아직 빠진 알림을 이름으로 로그. ★템플릿 이름이 `T20 원본 도착`처럼 번호로 시작해야 찾는다. 같은 파일 `setKakaoTemplates` 는 칸이 비면 아무것도 안 바꾼다 |
| `flushHeldNotifies` | 95_notify | 야간 보류 알림 즉시 발송(평소엔 8시 트리거 자동) |
| `notifyBalanceCheck` | 95_notify | 솔라피 잔액이 임계(`SOLAPI_LOW_BALANCE`·기본 3000원·자동충전 5000보다 낮게) 이하면 관리자에게 GAS 이메일 경고 1통(하루 1통). aiDaily 매일 + 발송 활동 시 시간당 1회(_nfMaybeBalanceCheck) 호출. 솔라피 안 거치는 메일이라 잔액 0이어도 발송됨 |
| `handleSolapiReport` | 95_notify | 솔라피 전달결과 리포트 웹훅 처리(doPost가 배열/messageId 형태 감지 시 호출). 알림톡 '전달 실패'면 그 고객에게 이메일(카톡 미수신 커버 · ★상담 확정은 확정 메일이 이미 가서 대체 메일을 안 보낸다 · 같은 결과가 두 번 와도 메일 1통 [MAIL_ONCE]). 발송 시 `알림톡추적` 시트에 messageId↔code 기록 · purgeNfTrack가 7일 정리. ★웹훅 등록 완료 2026-09-25 [SOLAPI_WEBHOOK_ON] — 솔라피 «개발 → Webhooks → 새로운 웹훅 생성» · EVENT «메시지 리포트» · 수신 URL=`https://www.momentedit.kr/api/solapi-report`(★www 필수 [RELAY_WWW] — www 없는 주소는 베르셀이 307 로 넘기고 솔라피는 안 따라가 실패로 센다 · 베르셀 중계 · SOLAPI_RELAY — GAS /exec 에 바로 걸면 GAS 가 302 로 답해 솔라피가 실패로 세고 8회면 웹훅을 끈다 · 2026-09-25 «웹훅 실패 알림» 메일로 드러남) · Secret HTTP Header 는 비움. 확인법: 같은 파일 `testKakaoT17` 실행 → 1~2분 뒤 시트 «알림톡추적» F열이 «완료». 다시 등록하라고 하지 말 것 — 솔라피 Webhooks 에 «현재 1개»로 떠 있다 |
| `solapiUsageSummary` | 95_notify | 문자·알림톡 잔액+이번달/24h 발송 건수·추정비용(관리자 인건비 패널·adminCall) |
| `setupAllTriggers` | 70_journey | 자동 트리거 일괄 등록(재배포 후·트리거 변경 시 1회) |
| `weeklyBackup` | 70_journey | 전체 스프레드시트를 'ME_백업' 폴더에 주간 날짜 사본·최근 8주 보관(첫 실행 시 Drive 권한 승인 · setupAllTriggers가 매주 등록) |
| `aiQuestionResolve` | 96_ai_cost | 교육 후보/리포트에서 질문 '해결' 표시(목록서 치움 · 재발 시 재등장) — 관리자 ✓버튼(adminCall) |
| `weeklyReceiptAudit` | admin | 영수증 미발행 점검(월요일 트리거 자동·수동 점검 가능) |
| `purgeAdvisorLog` | consultation-booking | AI 상담사 질문 로그 90일 정리(주간 트리거 자동 · 애프터수요로그도 함께 정리) |
| `purgeAwDemandLog` | consultation-booking | 애프터웨딩 수요 로그 90일 정리(purgeAdvisorLog가 함께 호출 · 별도 트리거 불필요) |
| `aiCostSummary24h` | 96_ai_cost | 접점별 AI 비용 24시간·이번달 집계(원화) — 관리자 인건비 탭이 호출(adminCall) |
| `aiQuestionLog` | 96_ai_cost | 실제 고객 질문 로그 최신순(빈도수·🔴막힘/🟡애매) — 관리자 개선 탭 교육 후보(adminCall) |
| `aiQuestionReport` | 96_ai_cost | 고객질문 종합 리포트(기간별 막힘/애매/정상·접점별·자주 막힌·애매한 질문 TOP) — 관리자 리포트 탭(adminCall) |
| `aiFactSet`·`aiFactsList`·`aiFactHistory`·`aiFactRollback`·`aiFactDelete` | 96_ai_cost | 핵심정보 단일 진실원(가격·일정·정책) 편집·이력·롤백 — 관리자 핵심정보 탭(adminCall). API가 `handleAiFacts`(doPost action='aiFacts')로 라이브 주입 |
| `aiRegAdd`·`aiRegList`·`aiRegSetActive`·`aiRegDelete` | 96_ai_cost | 회귀셋(고친 건 영구 점검) 관리 — 리포트 탭 고정 버튼으로 추가·개선 탭서 관리(adminCall). aiDailySafetyCheck가 매일 함께 점검 |
| `aiDaily` | 96_ai_cost | 매일 9시 트리거 — `aiMorningReport()` 1개만 호출(setupAllTriggers가 등록) |
| `aiMorningReport` | 96_ai_cost | ★아침 운영 보고 통합 — **오늘 상담·처리할 일**(admin `morningBriefData_`)+안전점검·미처리인계·밤사이인계·24h요약·잔액·어제실패를 모아 **관리자에게 메일 1통(섹션 상세 · 제목에 핵심요약)**으로. aiDaily가 호출. (구 `sendMorningBrief` 별도 메일 폐지·통합) 솔라피 잔액 '긴급' 경고(0 전)는 _nfMaybeBalanceCheck가 별도 즉시 처리 |
| `adminUndoConfirmPayment('코드','마일스톤','사유')` | admin | 입금 확인 취소(오처리 복구) — 마일스톤은 계약금·중도금·잔금·중도금잔금. 사유 필수·멱등·처리이력. 카드결제분·현금영수증 발행분·다음 단계 전진(계약금 한정)·종료 고객·확인 후 24시간 경과(`UNDO_WINDOW_HOURS`)·환불 정산 완료 건은 각각 다른 메시지로 차단. 관리자 상세 화면 버튼이 호출(adminCall) |
| `adminUndoConfirmPreview('코드','마일스톤')` | admin | 위 취소의 미리보기(dry-run) — 아무것도 쓰지 않고 무엇이 어떻게 되돌아가는지만 반환. 모달이 실행 전에 보여줌 |
| `adminUndoRefunded('코드','사유')` | admin | 환불 '완료 표시' 취소 — 송금 자체가 아니라 표시를 되돌려 환불 송금 큐에 다시 띄움. 사유 필수·멱등·처리이력(adminCall) |
| `adminForceStagePreview('코드','단계')` | admin | 강제 단계 변경 미리보기 — 비워질 컬럼·동의기록 키·상담 예약 초기화 여부와 ROLLBACK_KEEP_PAID로 '유지됨'인 항목을 반환(실행과 같은 `_clearForwardData`) |
| `monthBusinessData_` | admin | ★[B19_LOCK] 밑줄 이름 — 편집기 목록에 안 보인다(아침 보고만 부른다) · (읽기 전용) 이번 달 계약 건수·실입금 매출·전달 건수. aiMorningReport가 읽어 아침 메일 한 줄로 실음. 매출=‘확인’된 입금의 합(계약총액 합계 아님·상담 예약금 제외) |
| `morningBriefData_` | admin | ★[B19_LOCK] 밑줄 이름 — 편집기 목록에 안 보인다(아침 보고만 부른다 · 안에서 관리자 권한을 켜는 함수는 반드시 밑줄 이름) · (읽기 전용) 오늘 상담 일정+처리할 일 큐 데이터. aiMorningReport가 읽어 합쳐 발송. (구 `sendMorningBrief`는 통합 후 no-op). ★2026-09-06부터 오늘 상담은 **`adminHome`이 만든 `todayConsults`를 그대로 쓴다**(TODAY_CONSULT) — 예약 시트를 다시 훑지 않는다. 관리자 홈 화면과 아침 메일이 한 원천을 본다 |
| `aiMorningPreview` | 96_ai_cost | 지금 아침보고 1통 즉시 발송(테스트·수동). aiMorningReport와 동일 |
| `aiDailySafetyCheck` | 96_ai_cost | 레드라인 자동 안전점검(개인정보·임의할인·사람연결·인계). `aiDailySafetyCheck(true)`(silent)면 개별 문자 없이 결과만 반환(아침보고가 합쳐 발송). 수동 실행 시엔 위반/하락 시 SMS. 서버 fetch 막히면 점검불가 반환 |
| `aiDailyDigest` | 96_ai_cost | 최근 24h 상담·인계·비용·테스트·안전 한 줄 요약. `aiDailyDigest(true)`면 관리자 SMS(aiMorningReport는 `false`로 텍스트만 가져감) |
| `aiHandoffStatus` | 97_ai-handoff | (읽기 전용) 현재 '대기' 인계 수·그중 24h 경과 수 반환 — aiMorningReport 집계용 |
| `aiHandoffNightTake` | 97_ai-handoff | (읽기+초기화) 밤사이 보류 새 인계 수 읽고 카운터 0으로 — ★[MAIL_SENT_TRUE 2026-10-09] 아침 보고는 이제 이 함수를 부르지 않는다(메일이 나간 뒤 센 만큼만 뺀다) · 손으로 돌리면 그날 보고의 «밤사이 새 인계» 수가 0 이 된다 |
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
| `purgeRitualFiles` | **80_production** | ★[PURGE_POLICY_1106 2026-11-06] 식전 영상 · 두 분 목소리 파일 정리 — 본문은 `70_journey` `_pgPrevideo_` · `_pgVoiceFiles_`(예식 뒤 30일 · 영구 삭제 · 다 지웠을 때만 `RFGONE_<코드>`). 매일 07시 `vimeoGuardDaily`(87_letter)가 `_purgeDaily_` 로 부른다(주간 정리에서 뺐다) · 실제 삭제는 `PURGE_LIVE` 가 켜졌을 때만 |
| `previewRitualFiles` | **80_production** | 위 지우기의 미리보기 — 아무것도 안 지우고 대상만 로그 |
| `purgeTestRun` | **70_journey** | ★[PURGE_POLICY_1106] 자료 정리를 지금 **시험으로** 한 번 — 아무것도 안 지우고 종류별(하객 사진 · 목소리 파일 · 식전 영상 · 결과물 · 스냅 참고 · 백업 사본) «대상 · 지울 수 있음 · 실패» 건수를 «자료정리기록» 시트에 · 실패는 관리자 메일 |
| `purgeLiveOn` · `purgeLiveOff` | **70_journey** | ★[PURGE_POLICY_1106] 자료 정리 **실제 삭제 켜기 · 끄기**(스크립트 속성 `PURGE_LIVE`). 켜기 전에는 매일 07시 정리도 시험 모드(목록 · 건수만). 켜면 처리방침 기간대로 **영구 삭제**(드라이브 API · 되돌릴 수 없음) — 시험 건수를 확인한 뒤에만 |
| `adminRitualFiles`·`adminRitualFileGet`·`adminRitualFileOk` | **80_production** | [REC_ADMIN] 관리 화면 «두 분 목소리» 목록 · 들어 보기 · 확인 ✓ / 당일 콘솔 미리 받기(adminCall) |
| `vcSelfTest` | **80_production** | ★[VC_SELFTEST] 타입캐스트 시험 — 키 · 요금제 · 목소리 칸 → 드라이브 «ME_목소리시험» 폴더의 가장 최근 **우리** 녹음으로 인스턴트 복제 → 한 문장 읽어 같은 폴더에 mp3 → 만든 목소리 바로 지우기. 스위치(`VOICE_CLONE`)를 안 켜도 돈다 · 고객 폴더(`ME_예식준비파일`) 파일은 받지 않는다([VC_OURS_ONLY]) · 402/403 · 칸 0 이면 «이 요금제로는 복제 불가» 결론 한 줄. 필요한 것은 스크립트 속성 `TYPECAST_API_KEY` 하나 |
| `vcLastErrors` | **80_production** | ★[VC_WHY] 예식마다 AI 목소리 **마지막 실패 한 건**(언제 · 무엇 · HTTP · 타입캐스트가 돌려준 오류 글)을 로그로 — «지금은 AI 목소리를 만들 수 없어요»가 뜨면 여기부터. 발송 · 변경 없음. 같은 내용이 관리 화면 «이 예식 AI 목소리» 줄과 관리자 메일(예식 · 코드별 하루 한 통)에도 간다 |
| `adminErrLog` | **95_notify** | ★[ERR_CODES] 고객 화면 오류 기록(시트 «오류기록») 최근 n줄 — 관리자 화면 고객 상세 «최근 실패» · 검색창 사고번호 찾기가 부른다(adminCall · 발송 · 변경 없음). 고객이 «(코드 S9 · 7KQ2)»를 알려 주면 검색창에 그대로 치면 된다 |
| `purgeVoiceClones` | **80_production** | ★[VOICE_CLONE_0928 8-6] 예식 **다음 날** 업체 쪽 AI 목소리 · 읽은 녹음 · 연습 소리 지우기(취소 · 노쇼 · 미계약은 바로) · 업체 지우기 실패분 다시 · 칸 45 넘으면 관리자 메일. `aiDaily`(96_ai_cost · 매일 9시)가 부른다 · 별도 트리거 불필요. 안내 소리 파일은 종전대로 30일(`purgeRitualFiles`). ★[VC_DEC_1030_7] 예식 **7일 전**부터 두 분 목소리 줄 소리가 다 저장됐으면 업체 쪽 목소리 모델만 먼저 지운다(소리 파일 · 읽은 녹음은 그대로) · ★[VC_DEC_1030_4] 예식일이 없으면 마지막 활동 + 90일 · 고객 행이 정말 없으면 바로(행 읽기가 실패하면 아무것도 안 함 · 시험 예식은 90일 규칙만) |
| `vcStudioCheckDue_` | **80_production** | ★[VC_DEC_1030_5] 밑줄 이름 — 편집기 목록에 안 보인다(아침 보고만 부른다) · (읽기 전용) 예식 3일 전부터 스튜디오 «확인 ✓»(`adminRitualFileOk`) 없는 두 분 AI 목소리 줄 목록 → `aiMorningReport`(96_ai_cost)가 빨간 줄로 싣는다 |
| `previewVoiceClones` | **80_production** | 위 지우기의 미리보기 — 아무것도 안 지우고 대상만 로그(7일 전 모델 지우기 · 예식일 없음 90일 · 고객 행 없음까지) |
| `adminVoiceUsage`·`adminVoiceRead`·`adminRitualFileUp` | **80_production** | 관리 화면 «두 분 목소리» — «AI 목소리 칸 n / 50» · «이번 달 AI 글자 n / 200,000» · 읽은 녹음 듣기(확인 문장과 함께) · [RF_STUDIO_UP] 스튜디오 대신 올리기(adminCall) |
| `letterMigrate` | **87_letter** | ★1회 실행 — 옛 「Moment Edit Letter System」 스프레드시트의 탭 4개(Couples·Messages·Moderation·Banned)를 본 스프레드시트로 복사 → 화면 값이 원본과 한 칸도 다르지 않은지 대조(어긋나면 사본 지우고 멈춤) → `LETTER_MIGRATED=Y` → `setupAllTriggers` 로 매일 07시 점검까지 건다. 다시 돌려도 안전(이미 옮긴 탭은 건너뜀). 옛 스프레드시트는 백업으로 남는다 [LETTER_MERGED 2026-09-25] |
| `vimeoGuardDaily` | **87_letter** | 3일 안 디지털 참석 예식 중 vimeoId 미등록 건 관리자 메일(하루 1통·수동 점검 가능) + 첫 줄에서 `purgeCoupleData`. ★관리자 페이지에서 미계약·취소·노쇼로 닫은 예식은 건너뛴다(Customers 조회 실패면 «모르면 보낸다») [VIMEO_GUARD_XPROJ]. 트리거는 `setupAllTriggers`(70_journey)가 매일 07시로 건다 — 옛 `setupVimeoGuard`(부부폼 프로젝트)는 가져오지 않았다 |
| `letterSendCheck` | **87_letter** | ★[LT_SEND_WATCH 2026-11-06] 하객 편지 점검을 지금 바로 — 접수 뒤 1시간이 지나도 «보냄»이 아닌 편지를 한 번 더 보내고(편지마다 1회 · 보류(금지어)는 안 보냄) 관리자에게 한 통(번호 · 예식 · 상태 · 건수만 · 하루 한 통) + 예식별 건수를 «편지현황» 시트에. 매일 07시 `vimeoGuardDaily`(같은 파일)가 같은 일을 한다 · 별도 트리거 불필요 |
| `purgeCoupleData`·`previewCoupleData` | **87_letter** | 예식 + 6개월(기본 183일 · `COUPLE_PURGE_DAYS`) 지난 예식의 청첩장·편지 개인정보 비우기(행 보존) · `COUPLE_PURGE_OFF='Y'` 면 정지. preview 는 아무것도 안 바꾸고 대상만 로그 |

## ★★공개 입구 잠금 — GAS 새 함수를 만들 때 [B19_LOCK] (2026-10-09 사장님 «바로 막기»)

**이름이 `_` 로 끝나지 않는 GAS 함수는 HTML 서비스 화면의 `google.script.run` 으로도 부를 수 있다(구글 규칙).**
adminCall 의 FNS 에 넣는 것만으로는 잠기지 않는다. 그래서 새 함수를 만들 때 넷 중 하나로 정한다.

1. **관리 화면 함수**(FNS) · **편집기 도구**(사장님이 GAS 편집기에서 돌리는 것) → 첫 줄 `_requireAdmin();` — 관리 화면(토큰) · 편집기(서버 길 밖에서 자기 계정으로 직접 돌린 실행)만 지난다.
   편집기에서 막히면 오류 글에 «지금 계정(h…@momentedit.kr)을 소유자로 확인하지 못했어요»가 붙는다(admin.gs `_isOwnerRun_`).
2. **비밀값 · 열쇠를 돌려주거나 서명을 만드는 함수 · 받는 사람(주소 · 번호)과 글을 인자로 받아 보내는 함수** → 이름 끝 `_`(예: `sign_` · `_payCfg_` · `_kakaoSend_`). 밑줄 함수도 다른 서버 코드에서는 그대로 부른다.
3. **두 쓰임**(관리 화면에서도 · 예약 실행에서도) → 잠긴 껍데기 + 밑줄 안쪽(`aiQuestionLog` → `aiQuestionLog_` · `[GSR_SPLIT]`).
4. **`_AUTHED = true`** 는 네 곳뿐 — adminCall(토큰 확인 뒤) · `morningBriefData_`(예약 실행) · 메일 단추 `_payConfirmRun_`(확인 화면의 단추를 누른 뒤 · 서명 · 기한 다시 확인 · `[PAYCONFIRM_AUTHED]`) · 카드 `handleCardConfirm`(토스 승인 뒤 · `[CARD_AUTHED]`) · 늘 finally 로 되돌린다.
5. ★[GSR_GATE] **모든 공개 함수의 첫 줄은 넷 중 하나다** — 입구 `_SRV = true;`(doGet · doPost · submitApplication · submitSchedule · submitProposal · mailButtonGo 여섯뿐) · 예약 실행 `_trigIn_(arguments[0]);`(setupAllTriggers 의 plan + awMonthlyAudit · onConsultEdit) · 관리 `_requireAdmin();` · 그 밖 `_gsr_();`.
   `_gsr_` 는 서버 길(`_SRV`) · 예약 실행(`_TRUST`) · 관리자(`_AUTHED`) · 소유자(편집기) 안에서만 지난다. 진단 몇 개(deployCheck 등 · gsr-guard 의 `OPEN`)만 예외다.
   - `_SRV` 는 «정해진 서버 길 안»일 뿐 **관리자 권한이 아니다** — `_requireAdmin` 은 `_SRV` · `_TRUST` 로 지나지 않는다.
   - adminCall 은 첫 줄에서 토큰을 스스로 본다(`_adminTokenCheck_` · `[ADMINCALL_TOKEN]`) — `_AUTHED` 지름길을 타지 않는다.
   - ★[TRIG_IN] 예약 실행 확인은 «배우는» 문이다 — 넘어온 `triggerUid` 가 실제 트리거면 `TRIG_UID_OK` 를 적고, 그 뒤부터는 진짜 트리거 · 편집기(소유자) · 서버 길이 아니면 막는다. 아직 한 번도 못 알아봤으면 막지 않고 `TRIG_PROBE` 에 모양만 적는다(확인 전에 막으면 아침 보고 · 알림이 멈춘다). `99_deployCheck` 파일 → `deployStampCheck` 가 «예약 실행 확인» 한 줄로 보여 준다.
   - 점검: `loadGas()` 는 기본으로 서버 길 안(`_SRV = true`)을 흉내 낸다 · 익명을 흉내 낼 점검은 `loadGas(sb, { srv: false })`. 함수를 떼어 시험하는 점검은 `_gsr_` · `_trigIn_` · `_requireAdmin` 받침을 함께 둔다.

- 검사: `node scripts/audit/gsr-guard.mjs`(옛 이름 · 빠진 잠금 · 모든 공개 함수의 첫 줄 · FNS · 새 `_AUTHED` · `_SRV` · `_TRUST` · 메일 단추 행동 · 예약 실행 확인 · 토큰 없는 adminCall · 돌연변이) — merge-guard 가 돌린다. 잠글 함수를 늘리면 그 파일의 `LOCKED` 도 같은 커밋에서.
- ★[MAIL_BTN_CONFIRM] **메일 단추(입금 확인 · 승인 · 수락)는 열기만 해서는 아무것도 바꾸지 않는다** — 주소를 열면 확인 화면만 보이고, 화면의 단추(`mailButtonGo` · 입구)를 눌러야 처리된다. 메일 보안 검사기 · 링크 미리보기가 주소를 먼저 열어 보기 때문이다(B11). 단추 쪽이 서명 · 기한을 다시 본다.
- FNS 의 `aiAlertAdmin` 은 두 쓰임이라 `_requireAdmin` 대신 `_gsr_`(`FNS_LATER`).
- ★[DIAG_OWNER_ONLY 2026-10-09] 편집기 진단 6개(deployCheck · deployStampCheck · contractCheck · contractCheckHelp · notifySetupCheck · checkCustomerHeaderOrder)는 첫 줄에서 «소유자가 아니면 돌려보내기» — `typeof _effectiveEmail_` 로 걸어 admin.gs 가 없거나 옛 판이어도 진단은 돈다(그래야 admin 누락을 짚는다). 이런 진단을 새로 만들면 같은 첫 줄 + gsr-guard 의 `DIAG`.
- `_AUTHED` 창은 넷 다 «이전 값»으로 닫는다(`var _authPrev = _AUTHED` · finally · `[AUTHED_RESTORE]`). 편집기 소유자 확인은 한 실행에 한 번(`_activeEmail_` · `[OWNER_MEMO]`).
- ★[OWNER_SELF 2026-10-09 사장님 deployCheck 로그] **편집기 소유자 = 서버 길 밖 · 실행한 사람 = 권한 주인**(`_isOwnerRun_` 한 곳 · `_requireAdmin` · `_gsr_` · `_trigIn_` · 진단이 같은 자를 쓴다).
  편집기에서는 둘이 늘 같아 **어느 계정으로 편집기를 열든 목록에 적지 않는다**(`_ADMIN_OWNER_EMAILS` 는 덧붙임일 뿐). 서버 길(doGet · doPost · 공개 화면 입구) 안에서는 소유자 신원이어도 토큰 · 서명 없이 못 지난다.
  ★교훈 — 1-s 는 목록에 실제 편집기 계정이 없는 채로 나가 사장님 편집기 도구 · 진단이 막혔다(사장님이 붙인 deployCheck 로그 ④ ⑤ 로 드러남). **잠금을 걸 때는 «누가 막히나»를 실제 실행 계정으로 확인한다.**
  점검의 편집기 흉내는 `asOwner(sb)`(gas-lint · 서버 길 밖 · 목록에 없는 계정).
  - [OWNER_FIRST_ASK] 소유자인가는 한 실행에서 **처음 물을 때** 정한다(`_OWNER_RUN`) — 편집기 도구가 안에서 입구 함수를 불러 `_SRV` 가 켜져도 끝까지 소유자 실행이다.
  - ★[HTML_ESC_NAMES] GAS 화면(메일 단추 확인 · 결과 · 취소 · 화면 A/B/C)에 고객 글(이름 · 시간 · 메모)을 넣을 때는 **늘 `esc()`**, 확인 화면은 서버 글을 허락한 꼴(줄바꿈 · 굵게)만 그린다([MAIL_SHOW_SAFE]). `scripts/audit/mail-page.mjs` 가 행동 · 정적으로 잰다.
- [TRIG_LIST_KNOWN] 예약 실행 아이디는 목록을 못 읽으면 **마지막으로 알던 목록**(속성 `TRIG_UIDS_KNOWN`)으로 판정한다 · «목록에 없음» 기록은 배우기 전에만([TRIG_MISS_QUIET]).
- [APPROVE_PARTIAL · ACCEPT_RESULT 2026-10-09 라운드 3] 승인 · 수락은 상태를 쓴 뒤의 뒷일(캘린더 · 확정 메일 · 단계 · 카톡)을 하나가 실패해도 끝까지 하고, 빠진 것은 «일부 안 됨»(코드 B4)으로 알린다 — **다시 누르게 하지 않는다**(다시 누르면 «이미 확정»이 빠진 일을 덮는다 · 관리 화면은 목록을 새로 그리고 «빠진 것이 있어요» 창 하나). 부르는 곳(마이페이지 수락 · 관리 화면)은 결과 글이 실패면 성공 · 처리이력으로 돌려주지 않는다.
- [BTN_AFTER_FAIL · BTN_FAIL_KIND] 메일 단추가 예상 못 한 오류(9)로 끝났으면 다음 «이미 처리» 결과에만 «확인해 주세요» 한 줄(한 번만 · 새로 끝까지 했으면 말하지 않는다) · 붙여넣기 · 배포 누락(전역 이름이 없다 · 3)은 다시 누르게 하지 않고, 고객 단추(수락)에는 «관리자 페이지»를 말하지 않는다. [POST_SAFE_JSON] 밖에서 온 JSON 은 `toString` · `valueOf` 칸을 지우고 받는다.
- [ENTRY_ARGS_SRV 2026-10-09 라운드 4] 공개 입구(submitApplication · submitSchedule · submitProposal)는 **그 화면이 보내는 인자만** 받는다 — 서버 쪽 인자(개인코드 · 가예약 · 로그인 길 표)는 doPost 길(`_IN_POST` · doPost 첫 줄)에서만 받고, 칸은 글자만(`_entryForm_` · `_btnStr_`). 새 입구 인자를 만들면 같은 규칙으로.
- [CAL_RESULT 2026-10-09 라운드 5] 캘린더 맞추기(`syncCalendarEvent`)는 true 됨 · false 안 됨 · null 안 씀(설정 없음)을 돌려준다 — 승인 · 수락은 false 를 «안 된 것»으로 세고, 결과 글은 된 것만 말한다. [ERR_LOG_CAP] 사고번호가 있는 오류기록 줄도 같은 동작은 한 시간에 30줄까지. [AICOST_SECRET] 서버끼리만 부르는 doPost 동작(AI 비용 기록 · 문의 리드 · 인계)은 공유키(`AI_HANDOFF_SECRET` ↔ 베르셀 `HANDOFF_SECRET`)가 맞을 때만 받는다.
- [MAIL_VIEWPORT 2026-10-09 라운드 4] GAS 화면(HtmlService)은 viewport 를 `addMetaTag` 로 단다 — HTML 안의 `<meta name=viewport>` 는 무시되어 폰에서 데스크톱 폭으로 줄어 보인다. [MAIL_SAME_WORDS] 메일 단추 · 결과 · 관리 화면은 같은 상태를 같은 말로(몰림 «다른 처리가 진행 중이에요» · 일부 «빠진 것이 있어요» · 코드 앞 마침표 없음).
- [NOTICE_PER_WHO] notifyStudio 의 «오류 · 실패» 관리자 메일은 같은 제목 · 같은 첫 줄(누구 · 어떤 오류)만 6시간에 한 통 — 제목만으로 묶으면 같은 날 두 번째 고객의 실패가 묻힌다. [BTN_STATE_FIRST] 이미 끝났거나 취소된 예약의 승인 · 수락 링크는 단추 대신 지금 상태를 보여 준다.
- [AICOST_POST_ONLY 2026-10-09 라운드 6] 공유키 검사는 doPost 로 **밖에서 온** 동작에만 건다 — 같은 함수를 GAS 안에서 부르는 길(목소리 비용 `_vcCharLog`)은 키 없이 지난다. 서버 쪽 키 검사를 새로 걸 때는 GAS 안의 부르는 곳을 먼저 grep 한다.
- [NOTICE_OVERFLOW] 실패 알림 상한(제목마다 시간당 다섯 통)은 넘친 것을 버리지 않는다 — 여섯째는 «멈춰요» 한 통, 그 뒤는 속성 `NS_OVERFLOW`(20줄)에 모아 아침 보고가 싣고 지운다. [MORNING_ESC] 아침 보고 메일의 줄 값은 글로만(escape). [NOTICE_HEAD_FIRST] 알림 메일은 앞 300자만 실린다 — 할 일 줄을 앞에, 오류 글은 짧게 뒤에.
- [CANCEL_RESULT] 취소 결과도 된 것만 말한다(캘린더 · 안내 메일) — 빠지면 «빠진 것이 있어요»(B4) · 처리이력 · 관리 화면 같은 창. [CANCEL_SAME_WORDS] 같은 상태는 같은 제목 · 본문은 제목을 되풀이하지 않는다. [ERR_ID_RECORDED] 기록 상한에 닿은 동작에는 사고번호를 주지 않는다. [SECRET_GUARD_KIND] 비면 입구가 열리는 공유 열쇠는 `guard` 갈래(deployCheck ★ 줄).
- [AUTH_SEND_CAP 2026-10-09 라운드 7] 밖에서 누를 수 있는 «보내기» 동작(코드 찾기 · 재설정 안내)은 받는 주소마다 · 전체 시간당 상한을 둔다 — 답은 늘 같게(계정이 있는지 드러내지 않는다). [MAIL_SENT_TRUE] 모아 둔 것(실패 알림 · 밤사이 인계 수)은 메일이 나간 뒤에 센 만큼만 지운다. [RESULT_NOTIFIED] 화면의 «카톡이 나가요»는 서버가 실제로 보낼 때만.
- [LOGIN_TRY_CAP · SIGNUP_ADDR_CAP · NOTICE_ALL_CAP · SLOT_NOTICE_CAP 2026-10-09 라운드 8] **밖에서 누를 수 있는 동작은 횟수 상한을 둔다** — 로그인(고객 · 관리자)은 같은 아이디 15분 10번(없는 아이디도 센다), 같은 이메일 새 신청은 시간당 3번, 실패 알림은 시간당 스무 통(«오류 · 실패»는 제목 첫 토막만 본다 · 뒤 토막에 고객 이름이 든다), 같은 예약의 시간 선택 관리자 알림은 시간당 3번. 새 공개 동작을 만들면 «한 사람이 천 번 누르면?»을 먼저 묻는다(`scripts/audit/public-caps.mjs`).
- ★공개 저장소다 — 주석 · 커밋 · PR · deploy-marks 의 why 에는 **규칙만** 적는다. «무엇이 어떻게 열려 있었나»는 비공개 docs 저장소(기획 부록 B19 · 결정함)에만 둔다.

## 관리자 알림 = 메일 전용 (2026-06-29 사용자 지시)

관리자(운영자)에게 가는 모든 알림은 **문자 대신 메일**로 보낸다(문자비 0). 실시간 업무신호·AI 인계·아침보고·잔액경고·월간검증 전부 메일.
- 발송 경로: `95_notify`의 `_nfAdminLineEmail(text)`(짧은 1건) · `_nfAdminEmail(subject, html, opts)`(상세). 둘 다 `ADMIN_EMAIL`(contact@momentedit.kr) 수신 + `ADMIN_CC`(미쿠·희준 개인메일) cc.
- `aiAlertAdmin`·`_kakaoSend_`의 admin 분기·`_awNotifyAdmin_` 전부 위 메일 함수로 라우팅. SMS(`_solapiSend`+ADMIN_PHONE)는 고객 알림톡·`notifyTestAdminSms`(수동 테스트)만 사용.
- 사용자는 이 메일에 폰 푸시 알람을 걸어 즉시 확인(문자 대체). 고객 알림톡은 종전대로 솔라피 사용.
- **이모지 없이**: 관리자 메일 제목·문구엔 이모지를 쓰지 않는다. `95_notify`의 `_noEmoji()`가 `_nfAdminEmail`·`_nfAdminLineEmail`·`notifyStudio` 진입점에서 그림문자·변형선택자를 자동 제거(→ · 화살표·중점·한글은 보존). 새 문구에 이모지가 섞여도 자동으로 걸러짐.

## GAS 파일을 고치면 표식 한 줄을 함께 남긴다 [FILE_COVER] (2026-09-05 사용자 지시)

`.gs` 를 고쳤으면 **그 커밋 안에** 두 가지를 함께 넣는다. 안 넣으면 게이트가 막는다.
1. 고친 자리(**함수 본문 안**)에 `[표식이름]` 주석 한 줄
2. 루트 `deploy-marks.json` 의 `marks` 에 `{ "file", "fn", "mark", "why" }` 한 줄

### 왜 (사용자 질문에서 나온 규칙)
> *"메인에 있는 파일이 전부 올라가 있다는 거지? 다른 채팅방에서 작업하고 메인에 최신화하면 저기에 누락이 뜨는 거지?"*

그때 답은 **아니오**였다. 종전 게이트는 «새 함수와 함께 들어온 표식»만 요구해서,
기존 함수 본문을 고친 변경은 목록에 안 들어갔고 → 그 파일을 GAS 에 안 붙여넣어도
`deployCheck` 가 **「누락 0건」**이라고 답했다. 실제로 사용자의 `99_deployCheck.gs` 가
한 판 뒤처져 있었는데 점검은 초록이었다(2026-09-05 실측).

이제 규칙은 **«그 파일을 마지막으로 바꾼 커밋»이 넣은 표식이 목록에 하나 있어야 한다**이다.
- 창 전체가 아니라 «마지막 커밋» 기준 — 한 파일이 두 번 바뀔 때 첫 표식만으로 통과하던 구멍을 막는다(반증 재현함).
- 표식은 반드시 **함수 본문 안**에 — `mark()` 가 함수 소스를 읽는다. 함수 밖 주석은 영영 «누락»으로만 뜬다.
- 규칙 시작일(2026-09-05) 이전 커밋은 소급하지 않는다 — 고칠 수 없는 빨강을 만들지 않기 위해서다.
- 물량은 «파일 수»(≤20)로 묶여, 표식 단위로 요구하다 main 이 사흘 붉었던 사고(#602~#603)는 재발하지 않는다.

### 검사
`DC_DAYS=7 node scripts/audit/deploycheck-coverage.mjs` — merge-guard 가 자동 실행한다.
