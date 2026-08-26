#!/bin/sh
# 병렬 세션 병합 역전 감지 — 최근 수정 마커 생존 grep (0이면 병합이 조용히 되돌린 것)
# 사용: main 병합(pull 포함) 직후 sh automation/tests/merge-guard.sh
# 실사고 3건: ①.done-fold CSS 오삭제 ②guideFold 조립 줄 소실 ③d42540f 낡은 버퍼 통째 커밋(위저드 수정 7건 무언급 역전 · 2026-07-18)
# 마커가 정당하게 사라지면(기능 폐지 등) 이 목록에서 함께 지울 것 — 목록 갱신 없이 0이 나오면 무조건 역전 의심.
# ★SELF_ABS(2026-07-26) — 이 스크립트가 '자기 자신'을 읽을 때 쓸 절대경로. 반드시 아래 cd 前에 확정한다.
#   $0는 호출 시점 cwd 기준이라, cd 뒤에 "$0"로 자기 파일을 열면 상대 호출에서 통째로 깨진다.
#   실측(2026-07-26 · GATE_AT_EXIT 이후 main) — cd automation/tests && sh merge-guard.sh 하면
#     ①GUARD_TAIL의 grep이 빈 결과 → "EXIT 트랩이 사라졌다"는 거짓 경보(트랩은 멀쩡하다)
#     ②GATE_RAN의 _exp가 빈 문자열 → "chk 347/ 만 실행됐다"는 깨진 중단 보고
#   둘 다 멀쩡한 저장소에서 RED가 뜬다. 자가검사가 자기 파일을 못 찾아 생기는 오탐이라 원인 추적도 어렵다.
#   ※ 자기 파일을 읽는 곳은 전부 "$_SELF"를 쓸 것 — "$0"는 아래 cd 한 줄에서만.
_SELF=$(cd "$(dirname "$0")" 2>/dev/null && pwd)/$(basename "$0")
cd "$(dirname "$0")/../.." || exit 1
[ -r "$_SELF" ] || { echo "REVERT? merge-guard.sh: 자기 파일을 못 읽는다($_SELF) — 자가검사(GATE_RAN·GUARD_TAIL) 무력화"; exit 1; }
fail=0
# ★GATE_AT_EXIT(2026-07-26) — 성패 판정을 EXIT 트랩에 걸어 '파일 맨 끝'에서 돌게 한다.
#   이유: 판정을 본문 중간에 두면, 나중에 누가 검사를 파일 끝에 덧붙였을 때 그 검사가 fail=1을 세워도
#   판정은 이미 지나가 exit 0 + 'ALL MARKERS OK'로 초록이 된다(=죽은 검사).
#   실사고 2건 — ①ADM_GATE_CB(#292 통과 → #294가 발견) ②SURVEY_READ 2개(#295 · #297 리뷰에서 발견).
#   ①을 고치며 '판정보다 위에 두라'는 경고 주석을 달았지만 한 커밋 뒤 ②가 같은 패턴을 다시 만들었다.
#   주석은 두 번째를 막지 못했다 → 사람이 지킬 규칙을 없애고 구조로 바꾼다.
#   트랩은 스크립트가 어떻게 끝나든 마지막에 돌므로, 검사를 어디에 덧붙여도 판정 위에 놓인다.
#   (sh·dash·bash 전부에서 트랩 안 exit 1이 종료코드로 반영되는 것 확인)
#   ★GATE_RAN(2026-07-26 추가) — 트랩은 스크립트가 '어떻게' 끝나든 돈다. 그게 장점이자 새 구멍이었다:
#   중간에서 죽어도(fail=0인 채) 트랩은 그대로 'ALL MARKERS OK'를 찍는다.
#   실측 — 301행에 구문오류 1줄을 넣으니 출력 243/394줄 · 마지막 줄 'ALL MARKERS OK' · rc=2.
#   종료코드는 CI가 잡지만 사람은 못 잡는다(우리 규약이 "돌려서 ALL MARKERS OK 확인"이고 꼬리 몇 줄만 본다).
#   #301 이전에는 판정 줄에 도달하지 못해 아무것도 안 찍혔다 → 트랩이 '판정은 반드시 돈다'를 얻으면서
#   '판정이 돌았다 = 검사가 다 돌았다'를 잃은 것. 그래서 실행된 chk 수를 파일의 chk 줄 수와 대조한다.
#   ※ chk를 조건부(if 안 등)로 넣으면 이 대조가 어긋난다 — 새 chk는 무조건 실행되는 자리에 둘 것.
#   ※ 한계: 마지막 chk보다 아래(끝 node 검사 구간)에서 죽으면 이 대조로는 못 잡는다. 그 구간은 몇 줄뿐이고
#      전부 출력을 캡처하는 형태라 여기까지를 값싼 대책으로 본다('맨 끝에 있어야 하는 줄'을 다시 만들지 않기 위해).
_ran=0
_gate() {
  _rc=$?   # ★반드시 트랩의 첫 줄 — 아래 $(grep …)이 $?를 덮어쓴다
  _exp=$(grep -c '^chk ' "$_SELF")   # ★$0 금지 — 위에서 저장소 루트로 cd했다(SELF_ABS 주석 참고)
  if [ "$_ran" != "$_exp" ]; then
    echo "REVERT? merge-guard 중단 — chk $_ran/$_exp 만 실행됐다(직전 종료코드 $_rc). 위 결과는 전체 검사가 아니다"; exit 1
  fi
  [ "$fail" = "1" ] && { echo '── 역전 의심: 해당 수정 커밋을 git log에서 찾아 패치 재적용(git show <sha> -- 파일 | git apply -3) 후 복원 커밋'; exit 1; }
  echo 'ALL MARKERS OK'
}
trap _gate EXIT
# ★GATE_SELFTEST(2026-08-09 · 코워크 제안) — 게이트 자신을 한 번 시험하고 시작한다.
#   왜: GUARD_FAIL_VAR 사고에서 `|| FAIL=1`(대문자 오타) 때문에 검사 실패가 통째로 흘러가
#   게이트가 초록이었다. 검사를 아무리 늘려도 **게이트가 빨개지지 않으면 전부 무의미하다.**
#   그래서 '일부러 실패하는 가짜 실행'을 자식 프로세스로 돌려, 그때 정말 빨개지는지 먼저 본다.
#   check-source-drift.test.sh(돌연변이 테스트)와 같은 생각을 게이트 자신에게 적용한 것.
#   ①MG_SELFTEST=1 → fail=1 인 채 트랩 진입(판정 분기) ②=2 → chk 미실행(GATE_RAN 분기).
#   자식은 트랩 등록 직후 즉시 빠지므로 비용이 사실상 0이다(전체 검사를 두 번 돌지 않는다).
#   ※ 이 블록에 '^chk ' 로 시작하는 줄을 넣지 말 것 — _exp 계수가 어긋난다.
if [ "${MG_SELFTEST:-}" = "1" ]; then _ran=$(grep -c '^chk ' "$_SELF"); fail=1; exit 0; fi
if [ "${MG_SELFTEST:-}" = "2" ]; then _ran=0; exit 0; fi
for _m in 1 2; do
  _o=$(MG_SELFTEST=$_m sh "$_SELF" 2>&1); _r=$?
  # ★여기서만 직접 exit 한다(GUARD_TAIL 의 트랩 부재 처리와 같은 이유) — 자가시험이 빨간 것은
  #   '판정 기구 자체가 고장'이라는 뜻이라, fail=1 을 세워 봐야 그걸 종료코드로 바꿀 주체가 없다.
  #   실측(2026-08-09): 트랩의 fail 분기를 죽이는 돌연변이에서 경고는 2줄 찍혔는데 exit 0 이었다.
  if [ "$_r" = "0" ]; then echo "REVERT? merge-guard 자가시험 — 일부러 실패시켰는데 종료코드 0(mode $_m). 게이트가 실패를 흘려보낸다"; exit 1; fi
  if echo "$_o" | grep -q 'ALL MARKERS OK'; then echo "REVERT? merge-guard 자가시험 — 실패인데 'ALL MARKERS OK'를 찍었다(mode $_m)"; exit 1; fi
done
# ★FAIL_VAR_CASE — 실패 전파 변수는 소문자 fail 하나뿐이다. 대문자·혼합 변형이 보이면
#   그 줄은 아무 데도 닿지 않는 죽은 대입이다(GUARD_FAIL_VAR 사고 그 자체). 정적으로도 막는다.
if grep -nE '^[^#]*\|\|[[:space:]]*(FAIL|Fail)=' "$_SELF"; then
  echo "REVERT? merge-guard: 실패 전파 변수가 대문자다 — 소문자 fail=1 이어야 한다(위 줄)"; fail=1
fi
# chk는 한 줄 정의다 — 중간에 주석(#)을 넣으면 그 뒤가 통째로 주석이 되어 함수가 안 닫힌다(2026-07-26에 실제로 겪음).
# _ran = GATE_RAN 중단 감지용 실행 계수.
chk(){ _ran=$((_ran+1)); case "$3" in ''|*[!0-9]*) echo "REVERT? merge-guard: chk '$1' $2 — 셋째 인자 '$3' 가 정수가 아니다 · 그 줄은 조용히 초록이 된다(CHK_ARG_SPACE)"; fail=1; return;; esac; n=$(grep -c -e "$1" -- "$2" 2>/dev/null); n=${n:-0}; if [ "$n" -lt "$3" ]; then echo "REVERT? $2: '$1' ($n<$3)"; fail=1; else echo "ok $2: '$1' $n"; fi; }   # grep -c는 0건도 '0'을 출력하며 exit 1 — '|| echo 0'을 붙이면 '0\n0'이 돼 [ 비교가 깨짐
# ★★[CHK_ARG_SPACE 2026-08-21] 위 case 가 이 게이트의 가장 조용한 고장을 막는다.
#   chk 의 셋째 인자는 «최소 개수»(정수)다. 거기에 주석이 붙거나(`1#주석` — 띄어쓰기 하나 빠짐)
#   「없음」 같은 말이 오면 `[ "$n" -lt "$3" ]` 가 산술 비교에 실패한다. sh 는 그때
#   stderr 에 한 줄 찍고 **비교를 거짓으로 쳐서 else(초록)로 떨어뜨린다.**
#   실측 2건 — ①`photoWish … 1#★★[PHOTOSHARE_DIRECT` (2026-08-16부터 5일간 안 쏜 화살)
#              ②`chk '영목' … 없음` (2026-08-21 · 내가 부재 검사를 chk 로 쓴 것 · nochk 가 맞다)
#   ★붉게 지는 고장이 아니라 «초록으로 지는» 고장이라 눈으로는 영영 못 찾는다. 호출 때 잡는다.
# ★[CHK_DASH_SAFE 2026-08-15] chk 에 `-e … --` 를 붙였다(nochk 는 이미 있었다).
#   없으면 대시로 시작하는 패턴이 grep 의 옵션으로 먹힌다 — 실측: `chk '{--col:720px}' console.html 1` 가
#   `grep --color console.html` 로 해석돼 **파일 인자를 잃고 stdin 을 기다리며 영영 멈췄다.**
#   붉게 지는 게 아니라 매달린다 — CI 라면 6시간 타임아웃까지 간다. 그 창을 없앤다.
# ★[NOCHK_DEFINED_FIRST 2026-08-11] nochk 정의를 chk 바로 아래로 올렸다.
#   전엔 1248행에 있어서 그 위에서 nochk 를 부르면 `nochk: not found` 만 찍히고
#   게이트는 **그대로 초록**이었다(실측 — 내가 410행대에 두 줄 넣었다가 당했다).
#   쓰는 자리가 정의보다 위면 그 검사는 안 쏜 화살이 된다(★11-c). 정의를 위로 올려 그 창을 없앤다.
nochk(){ case "${3:-0}" in ''|*[!0-9]*) echo "REVERT? merge-guard: nochk '$1' $2 — 셋째 인자 '$3' 가 정수가 아니다 · 그 줄은 조용히 초록이 된다(CHK_ARG_SPACE)"; fail=1; return;; esac; n=$(grep -c -e "$1" -- "$2" 2>/dev/null); n=${n:-0}; if [ "$n" -gt "${3:-0}" ]; then echo "REVERT? $2: '$1' 이 남아 있다 ($n>${3:-0})"; fail=1; else echo "ok $2: '$1' ${n}개 (한도 ${3:-0})"; fi; }
# ── 2026-07-18 위저드·대시보드 수정 마커
chk '_t04prev' mypage.html 2                       # 04 호칭 복원
chk 'QR을 받으실지 골라 주세요' mypage.html 1      # selfQR 미응답 발행 차단
chk 'AbortError' mypage.html 2                     # 공유·QR 저장 폴백
chk '발행 직전 1회만' mypage.html 1                # both 같게 미러 시점
chk '계좌를 비워 두면' mypage.html 1               # 계좌 필수 거짓 문구 정정
chk 'GUIDE_MAKE_COND' mypage.html 3                # 하객 안내 조건 공용 상수
chk '본예식 20분 전' mypage.html 1                 # 인쇄 킷 도착 안내 · [DAY_PLAN 2026-08-09] 본식 10:05 기준 09:45 입장 = 20분 전(청첩장 16종과 같은 값)
chk 'trk-sep' mypage.html 2                        # 확인·전달 그룹 구분선
chk 'trk-tag' mypage.html 2                        # 선택 태그
# (_coreDone 마커 폐지 2026-07-25 — 유일한 사용처 '확인서 강조'가 사용자 지시로 삭제됨(TRK_BTN_SAME). 접힘 게이트 복원 시 재등록할 것)
chk 'DELIV_STEP_HONEST' mypage.html 3              # 결과물전달 진행 중엔 '후기 점프' 금지(전달완료만 후기)
chk 'DELIV_FLOW_STEP' mypage.html 2                # 원본 도착~컨펌 동안 진행바 '결과물 전달' 현재(표시 전용)
chk 'DELIV_WAIT_TITLE' mypage.html 1               # 대기 카드 제목 단계 인식(전달 단계=기록 준비 중)
chk 'DELIV_FORCE_RESUME' admin.html 1              # 강제 결과물전달 상태서 등록·전달 버튼 유지(거짓 '전달 완료' 막다른길 방지)
chk 'CARD_STAGE_ORDER' admin.html 3                # 고객 상세: 지금 단계 카드 최상단 재배치(stageCards/orderCards)
chk 'DELIV_FORCE_RESUME' automation/admin/admin.gs 2   # 강제 단계 고객도 전달 완료 처리 가능(멱등 유지)
chk 'SEARCH_DAYS_1Y' automation/consultation/consultation-booking.gs 1   # 예약 가능일 조회창 120→365(1년) 확대(2026-07-25 사용자 지시)
chk 'REFUND_QUEUE_CANCEL_NOACCT' automation/admin/admin.gs 3   # 취소+계좌없음도 예약금 수령분 있으면 환불송금 큐 노출('계좌 요청 필요' 라벨) — Q3 구멍 차단
chk 'FORCE_CANCEL_TS' automation/admin/admin.gs 1   # 강제이동→취소 시 Bookings.취소일시 기록 — 환불 견적·aging '오늘' 기준 흔들림 차단 Q4
chk 'REFUND_CARD_NOTE' mypage.html 1   # 환불카드: 카드 수령분이면 '카드분은 카드로 취소·계좌는 이체분' 안내(Q1)
chk 'REFUND_CARD_NOTE' automation/platform/60_mypage.gs 1   # 서버 refundBank.card 플래그(동의기록.결제수단='카드' 감지)
chk 'CARD_REFUND_VIA_TOSS' admin.html 1   # 관리자 취소 환불: 카드 수령분이면 토스 결제취소로 처리 경고(Q2 · 구 Admin.html 복원)
chk 'REFUND_DONE_NOACCT' admin.html 2   # 취소 환불 완료 버튼을 c.refund 게이트 밖으로 — 계좌 미입력 건도 완료 처리 가능(FU 큐 노출분 막다른길 해소)
chk 'ADMIN_BACK_NAV' admin.html 4   # 관리자 SPA 뒤로가기 — 상세·아카이브에서 사이트 이탈 대신 이전 목록 복귀(pushState/popstate)
chk 'REFUND_QUEUE_INLINE' admin.html 3   # 큐 '환불 처리' 버튼 = 상세 이동 대신 바로 완료 확인 팝업(inlineKinds+onQueueAct+doMarkRefundedInline)
chk 'REFUND_ACCT_REQ' automation/platform/95_notify.gs 2   # 취소 고객 환불계좌 요청 알림 이벤트+문구(Q5)
chk 'REFUND_ACCT_REQ' automation/admin/admin.gs 1   # 강제취소 시 계좌 미입력·수령분 있으면 고객에게 계좌 요청 1회(Q5 트리거)
chk 'REFUND_ACCT_REQ' automation/consultation/consultation-booking.gs 3   # 관리자 상담취소(actCancel)·이메일취소 경로도 계좌 요청 알림(FU4 · _maybeRefundAcctReq)
# ── 2026-07-25 현금영수증 초과발급 차단(사용자 지시 "실제 입금한 금액보다 많은 금액을 현금영수증 처리하면 안 된다")
chk 'RECEIPT_PAID_SPLIT' automation/platform/70_journey.gs 2   # 예약금(Bookings 입금확인) vs 계약금 잔액(Customers 입금상태) 수령 판정 분리 — 계약서 발송~계약금 입금 사이 '계약금 잔액' 초과 발행지시 차단. ★단일 게이트(_depCf 공유) 복원 금지
chk 'RECEIPT_QUEUE_LEDGER' automation/admin/admin.gs 1   # 관리자 큐를 원장(_cashReceiptLedger) 단일 소스로 — 카드결제분 이중발급 차단·계약금 잔액 누락 해소·잔금 확정금액 반영. ★큐 자체계산 복원 금지
chk 'done-fold' mypage.html 3                      # 완성 화면 접힘(과거 오삭제 사고)
# ★★[TRK_NO_FOLD 자 교정 2026-08-12] 위 .done-fold 는 **청첩장 트랙의 접힘**이고 살아 있다.
#   폐지된 것은 `.trk-fold`(예식 준비 트랙 완료 행 접기 · 2026-08-09)로 **이름이 다르다.**
#   check-mypage-shell 이 .done-fold 를 세면서 「폐지분이 되살아났다」고 말하고 있었다 —
#   로그인 전엔 그 요소가 안 그려져 지금까지 안 터졌을 뿐이다. 로그인 뒤 한 번이라도 돌면
#   멀쩡한 청첩장 접힘을 보고 헛붉는다(★9 늑대). 자를 .trk-fold 로 바꿨다.
chk 'trk-fold' scripts/check-mypage-shell.mjs 3
# ★★[SHELL_SKELETON 2026-08-12 · 클로드코드 요청] 로그인 뒤 화면을 재는 자가 **생겼다 — 단 좁게.**
#   renderProduction({}, null) 하나로 진짜 제작 트랙이 그려진다(실측 7줄). 서버 응답을 지어낼 게 없다.
#   빈 객체는 허구가 아니라 **아무것도 안 채운 상태** — 제작 단계에 막 들어온 고객이 보는 화면이다.
#   ★여기서 잴 수 있는 것은 **구조**뿐이다(폐지 클래스가 되살아났나). 값·정렬은 여전히 못 본다 —
#     그건 지어내야 하고, 지어내면 내 허구를 확인하는 것이 된다(이 파일 머리말의 거절은 그대로 유효).
#   돌연변이: 진짜 트랙 줄에 trk-fold 를 심으니 붉음(1개) · 빼니 통과.
chk 'SHELL_SKELETON' scripts/check-mypage-shell.mjs 4
chk 'renderProduction({}, null)' scripts/check-mypage-shell.mjs 1   # 빈 객체로 진짜 화면을 그리는 그 줄
# ★못 그린 판에서 숫자를 찍지 않는다 — 옛 판은 「트랙 undefined줄 · 폐지분 undefined개(0이어야)」였다(실측).
#   붉은 줄은 아래 서지만, 요약 줄이 **안 잰 자리에 잰 값 모양의 칸**을 남기는 것이 목록 11-d 의 병이다.
chk '아무것도 못 쟀다' scripts/check-mypage-shell.mjs 1
# ★★[SKEL_NOT_VISIBLE 2026-08-12] style.display==='block' 은 **보인다는 뜻이 아니다.**
#   실측: 그 값은 true 인데 offsetParent 는 null · 폭높이 0x0 이다(부모 #mypageView 가 로그인 전이라 닫혀 있다).
#   .trk-fold 세기는 배치와 무관해 이 검사 목적엔 영향 없다. 다만 **좌표를 재려는 사람**이 0 을 받고
#   「무너졌다」로 읽는다 — 실제로 그럴 뻔했다. 그래서 이름을 「그리기 끝남」으로 바꾸고 한계를 찍는다.
chk 'SKEL_NOT_VISIBLE' scripts/check-mypage-shell.mjs 2
nochk '보임=' scripts/check-mypage-shell.mjs        # ★안 잰 것을 「보임」이라 부르지 말 것
nochk "querySelectorAll('.done-fold," scripts/check-mypage-shell.mjs   # ★폐지분 세는 자로 되돌리지 말 것
# ★★[SKEL_LAYOUT 2026-08-12 · 클로드코드 요청 「어떻게 열고 쟀는지 한 줄만 알려 달라」]
#   말로 답하지 않고 **하네스에 넣었다.** 방법만 알려 주면 다음 사람이 또 임시 스크립트로 알아내고,
#   그 스크립트는 저장소에 안 남는다. 위 SKEL_NOT_VISIBLE 이 「좌표는 못 잰다」로 닫아 둔 문을 여기서 연다.
#   여는 법 세 단계 — ①renderProduction({}, null) ②#mp_production 의 조상 중 display:none 을 전부 block
#   ③#loginView 를 none. 그 뒤에야 좌표가 선다(그전엔 0x0 · offsetParent=null 이 실측값이다).
#   ★돌연변이 4발 전부 붉었다(실측 · 하나도 죽은 그물이 아니다):
#     .trk-act 의 min-width:122px 제거 → 왼끝이 266/279/249/274/261 로 갈림   [TRK_ACT_ALIGN]
#     .trk-act-min 에 border:1px 되돌림 → 테두리 1px                          [TRK_PRE_QUIET]
#     .trk-act-min padding 8px→16px → 보조 48px vs 주 36px                    [TRK_ACT_H36]
#     .trk-act-min 을 left:90px 로 밀기 → 오른끝 305 > 주 왼끝 225            [TRK_ACT_ALIGN]
#   ★한계도 같이 못박는다 — 「미리듣기」 보조 단추는 초안이 있어야 서는 단추라 **검사가 대신 놓는다.**
#     놓을 때 클래스를 손으로 적지 않고 원본에서 찾는다. 제품이 그 조합을 바꾸면 못 찾고 붉는다
#     (classFound=false) — 조용히 옛 클래스로 재는 일은 없다. 그 한계 표기를 지우지 말 것.
chk 'SKEL_LAYOUT' scripts/check-mypage-shell.mjs 5
chk 'SKEL_LAST_MEASURE' automation/tests/merge-guard.sh 2   # ★순서 가드는 「무엇 뒤인가」가 아니라 「마지막인가」로 묻는다
chk "a.style.display = 'block'" scripts/check-mypage-shell.mjs 1        # ① 조상 여는 그 줄
chk "getElementById('loginView'); if (lv)" scripts/check-mypage-shell.mjs 1   # ② 로그인 판 닫는 그 줄
chk 'renderProduction({}, null)' scripts/check-mypage-shell.mjs 2       # 구조 재는 곳 + 좌표 재는 곳 둘
chk 'TRK_ACT_ALIGN' scripts/check-mypage-shell.mjs 3
chk 'TRK_PRE_QUIET' scripts/check-mypage-shell.mjs 1                    # 테두리 되돌아오면 붉는 그물
chk 'TRK_ACT_H36' scripts/check-mypage-shell.mjs 1                      # 보조·주 높이 어긋나면 붉는 그물
chk 'classFound' scripts/check-mypage-shell.mjs 3                       # 못 찾으면 붉는다(조용히 옛 클래스로 재지 않게)
chk '검사가 놓은 것' scripts/check-mypage-shell.mjs 1                   # ☐ 한계 표기 · 지우지 말 것
# ★이 단계는 **맨 마지막**이어야 한다 — 조상 숨김을 여는 것은 화면을 바꾸는 일이라,
#   앞 단계(ASK_SENDS 는 실제로 단추를 누른다)가 끝나기 전에 열면 그쪽 측정이 오염된다.
#   줄 수로는 못 재니 **줄 번호로 잰다**(1088행 게이트 자가진단과 같은 방식).
_sl_ask=$(grep -n 'ask.sent.includes' scripts/check-mypage-shell.mjs | head -1 | cut -d: -f1); _sl_ask=${_sl_ask:-0}
_sl_lay=$(grep -n 'const lay = await h.page.evaluate' scripts/check-mypage-shell.mjs | head -1 | cut -d: -f1); _sl_lay=${_sl_lay:-0}
# ★[SKEL_LAST_MEASURE 2026-08-12] 위 주석은 「probe·busy·REFUND_STATE·ASK_SENDS 뒤여야 한다」고 적었는데
#   실제로 대조하던 것은 **ASK_SENDS 하나**였다. 지금은 그것이 넷 중 마지막이라 맞지만,
#   누가 REFUND_STATE 를 뒤로 옮기면 주석은 그대로인 채 그물만 조용히 헐거워진다(★14-b — 한 칸 재고 전칭).
#   그래서 이름을 나열하지 않고 **「이 파일의 마지막 page.evaluate 인가」**로 잰다 — 늘어나도 안 낡는다.
_sl_last=$(grep -n 'h\.page\.evaluate' scripts/check-mypage-shell.mjs | tail -1 | cut -d: -f1); _sl_last=${_sl_last:-0}
if [ "$_sl_lay" -eq 0 ] || [ "$_sl_ask" -eq 0 ] || [ "$_sl_last" -eq 0 ]; then echo "REVERT? check-mypage-shell.mjs: SKEL_LAYOUT 또는 ASK_SENDS 자리를 못 찾음(ask=$_sl_ask lay=$_sl_lay last=$_sl_last) — 순서 검사가 헛돌았다"; fail=1
elif [ "$_sl_lay" -lt "$_sl_ask" ]; then echo "REVERT? check-mypage-shell.mjs: SKEL_LAYOUT($_sl_lay행)이 ASK_SENDS($_sl_ask행)보다 앞이다 — 화면을 열어 놓고 단추를 누르면 앞 측정이 오염된다"; fail=1
elif [ "$_sl_lay" -ne "$_sl_last" ]; then echo "REVERT? check-mypage-shell.mjs: SKEL_LAYOUT($_sl_lay행) 뒤에 또 재는 곳이 있다($_sl_last행) — 조상을 열어 둔 화면에서 재면 그 값이 오염된다 [SKEL_LAST_MEASURE]"; fail=1
else echo "ok check-mypage-shell.mjs: SKEL_LAYOUT($_sl_lay행)이 ASK_SENDS($_sl_ask행) 뒤이고 **마지막으로 재는 곳**이다"; fi
# (마커 '다이어트 2026-07-18' 폐지 2026-07-19: 옛 최종 확정 2단계 위저드가 좌석 화면으로 완전 통합됨 — 인원 자동·자리별 3음료. renderFinal은 좌석 화면 라우팅 백스톱으로만 남음)
# ★★[ORD_SAVE_BTN 2026-08-13 사용자 지시 "지금은 자동저장이잖아 그렇게하지말고 저장 버튼을 따로 만들자"]
#   2026-08-12 에는 저장을 나가기에서 떼면서 **자동 저장**을 골랐다(ORD_AUTOSAVE · 1.5초 디바운스).
#   사용자가 그 방식을 물렸다 — 자동을 걷고 **손으로 누르는 저장 버튼**으로 바꾼다.
#   ★그래도 잃지 않는다. 서버로 가는 갈래는 셋뿐이다:
#     저장 버튼(나가지 않고 지금 · done:false) · 나가기(있으면 저장하고 닫기) · 완성(done:true).
#     「저장 안 하고 나가는 길」이 없으므로 **나갈 때 묻는 팝업도 안 만든다.**
#   ★그 문장의 범위를 좁혀 둔다(클로드코드 실측) — 없는 것은 **사람이 스스로 나가는 길**뿐이다.
#     Esc·부모 닫기까지 전부 orderExitReq→_obExit 를 지나 저장한다(확인함).
#     그러나 **탭이 죽거나 폰이 꺼지면** 서버로 가는 길이 없다 — beforeunload·pagehide·sendBeacon
#     어느 것도 안 걸려 있다(실측 0건). 그 판에서 살아남는 것은 기기 안 localStorage 뿐이라,
#     다른 기기로 옮겨 앉으면 마지막 「저장」 이후가 사라진다.
#     ★이건 결함이 아니라 **사용자가 고른 값**이다(자동 저장을 물린 그 지시). 다만 어제 자동 저장의
#       존재 이유가 바로 그 경우였으므로, 「안 잃는다」를 조건 없이 적어 두면 다음 사람이 오해한다.
#   ★상태는 버튼이 스스로 말한다 — 진행 줄의 .prog-save 는 폐지했다(같은 말이 두 곳에 나면 갈린다).
#     네 상태: 저장 / 저장 중… / 저장됨(비활성) / 다시 저장(실패).
#   ★저장 버튼은 나가기와 **같은 옷**이다(.ob-exit) — 한 줄에 생김새가 둘이면 그게 소음이다.
#     폭은 86px 로 못박았다: 네 상태에서 머리줄이 움찔하지 않게(가장 긴 「저장 중…」에 맞춤).
#   실측 @390: 저장 86x44 · 나가기 68x44 · 전 단계 가로 넘침 없음 · 폭 흔들림 0 · JS 오류 0
#   실측(검사): 값만 바꾸고 3초 → 0건 · 저장 누름 → 1건 · 저장 뒤 나가기 → orderClose만 ·
#              저장 안 하고 나가기 → 묻는 판(EXIT_ASK · 아래 블록) · 완성 상태 → 0건·버튼 숨김
chk 'ORD_SAVE_BTN' order-preview.html 6
chk 'obSave' order-preview.html 2
chk 'function _dirtyMark' order-preview.html 1       # ★값이 바뀌면 표시만 켠다 — 타이머를 다시 걸지 말 것
nochk 'setTimeout(_autoSend' order-preview.html      # ★자동 저장을 되살리지 말 것(사용자가 물린 방식)
nochk 'id="psave"' order-preview.html                # ★진행 줄 저장 표시 폐지 — 상태는 버튼이 말한다
chk '.ob-save,#obExit{min-width:86px}' order-preview.html 1  # ★[BTN_PAIR] 두 단추 같은 크기 · 상태만 다르게
chk 'ORD_SAVE_BTN' scripts/check-ord-save.mjs 8
chk 'check-ord-save' .github/workflows/nightly-screen.yml 1   # [NO_GATE] 게이트가 못 도는 검사는 야간 잡이 돈다
chk 'ORD_SAVE_AFTER_AUTO' scripts/check-ord-save.mjs 4        # 날아간 저장 경주 — 이름이 바뀌어도 이 안전선은 남는다
# ★★[EXIT_ASK 2026-08-13 사용자 지시] 나가기의 **조용한 저장**을 걷었다.
#   원문: "나가기 누르면 그냥 나가지던가 저장할게있으면 팝업으로 확인안내를 해주던가해야지
#         나가기누르면 자동으로 저장되는데 그럼 옆에 저장이 있을필요가없잖아"
#   깨끗하면 그냥 닫고, 저장 안 된 변경이 있으면 판으로 묻는다(저장하고 나가기/그냥 나가기/취소).
#   ★Esc·바깥 클릭은 dismissNull 이 null 로 갈라 '취소'다 — false 로 합치면 Esc 가 「그냥 나가기」가
#     되어 저장 없이 닫힌다(돌연변이 실측: dismissNull 제거 → check-ord-save rc=1 「취소가 취소가 아니다」).
#   ★몰래 저장(무조건 orderExit)으로 되돌리지 말 것 — 판 자체가 사용자 지시다.
chk 'EXIT_ASK' order-preview.html 4
chk 'dismissNull:true' order-preview.html 1                   # 나가기 판의 취소 갈래가 사는 그 줄
chk 'EXIT_ASK' scripts/check-ord-save.mjs 10                  # 세 갈래(취소·그냥·저장하고) 전부 밟는 그물
# ★[SEEN_NOT_DIRTY 2026-08-13 사용자 제보 "저장눌렀는데도 팝업이 계속"] dirty 비교값에서 걸음(_seenK)을 뺐다.
#   자동 저장 시절의 비교값이 수동 저장 체제에서 「저장 직후 한 칸 걸어도 변경 있음」을 만들던 것.
#   걸음은 _ordPayload 가 보낼 때마다 실려 가므로 버려지지 않는다 — 미리듣기 자르기는 「저장된 데까지」.
chk 'SEEN_NOT_DIRTY' order-preview.html 2
nochk "stringify(S)+'|'" order-preview.html                   # ★비교값에 걸음을 되넣지 말 것 — 제보가 재현된다
chk 'SEEN_NOT_DIRTY' scripts/check-ord-save.mjs 3             # 저장 뒤 걷기만 → 판 없이 닫히는 그물
# ★[EXIT_BASELINE 2026-08-13 같은 제보의 둘째 갈래] 복원 직후가 비교 기준선 — 없으면 재진입 고객이
#   아무것도 안 바꾸고 나가도 판을 만난다. 실패 상태(다시 저장)의 판 제목은 「저장이 아직 안 됐어요」.
chk 'EXIT_BASELINE' order-preview.html 2
chk 'EXIT_BASELINE' scripts/check-ord-save.mjs 3
chk '저장이 아직 안 됐어요' order-preview.html 1               # 실패 상태 전용 문구 — 「변경이 있다」는 그 상태에선 거짓
# ★[ADM_LINK_CLICK 2026-08-13 점검 발견] 고객이 붙인 링크(성장영상·하객 사진 모으기·스냅 영감·영상)를
#   관리자 상세에서 눌리는 링크로 — 종전엔 맨글자라 손으로 긁어 복사해야 했다.
#   http(s) 로 시작하는 값만 a 태그(esc 유지 · javascript: 는 글자 그대로 = XSS 차단) · noopener 필수.
chk 'ADM_LINK_CLICK' admin.html 4
chk 'rel="noopener noreferrer"' admin.html 1
# ★[ADM_SUM_ESC 2026-08-13 점검 발견] 요약 카드 count 가 esc 없이 붙었다 — 초안(summary)은 고객
#   기기가 만들어 보낸 값이라 전부 외부 데이터다(저장형 XSS 경로 · 돌연변이 실측: esc 빼면 붉음).
#   flow 는 Array.isArray 로 지킨다 — 배열 아니면(깨진 초안) join 이 던져 상세가 통째로 죽었다.
chk 'ADM_SUM_ESC' admin.html 2
chk 'Array.isArray(sm3.flow)' admin.html 1
# ★[GROW_LINK_HINT 2026-08-13 점검] 성장영상 링크가 주소 형태가 아니면 그 자리에서 힌트 —
#   안 잡으면 「abc」가 그대로 저장돼 관리자 링크(ADM_LINK_CLICK)가 맨글자가 되고 D-3에 영상을 못 받는다.
chk 'GROW_LINK_HINT' order-preview.html 2
chk 'draft:{_v:3, S:d.data.S, summary:d.data.summary||{}}, done:false' mypage.html 2   # ★★둘이다(나가며 저장 · 손 저장) · done:true 면 중간 초안이 완성으로 굳는다(ORDERFILL_DONE)
chk 'orderDraftSaved' mypage.html 1                  # 성공 회신 — 한쪽만 보내면 버튼이 한 상태에 갇힌다
chk "row('좌석 · 음료'" mypage.html 1              # 통합 행(2026-07-19) · 라벨은 2026-08-09 '최종 확정 · 좌석'→'좌석 · 음료'[SEAT_DRINK_LABEL]
chk 'SEAT_DRINK_LABEL' mypage.html 1                # 라벨 근거 주석 · '최종 확정'은 예식 확인서 쪽 성격이라 뺐다
# ★[SUB_SEG_JOIN 2026-08-14 사용자 제보 "디자인 끊어진 거 의도된 거야?"] 모서리 잇기(:has)만으론
#   부족했다 — .opts 의 flex gap(12px)이 카드와 세부 패널 사이를 도로 벌렸다(실측 12px → 0px).
#   .subset 의 margin-top:-12px 가 그 간격을 되물린다. .opts 의 gap 과 짝 — 한쪽만 바꾸면 다시 끊긴다.
chk 'SUB_SEG_JOIN' order-preview.html 1
# ★[SUB_SEG_NOLINE 2026-08-14 사용자 지적 "갈색 텍스트박스 안에 가로줄이 올드한 느낌"]
#   한 몸으로 붙이자 부모 카드의 아래 테두리가 베이지 상자를 반 자르는 실선으로 남았다 → 지웠다.
#   여백이 그 일을 한다(실측 라벨 위 28px : 아래 9px = 3.1배 · [TYPO_RHYTHM] 2배 이상).
#   전폭 실선으로 되돌리지 말 것 — [ADV_INDEX] "선은 가장 싸고 가장 시끄러운 구분자다".
chk 'SUB_SEG_NOLINE' order-preview.html 1
# ★[GUEST_NODUP 2026-08-14 사용자 지적 "이 부분 안내 전문 보기로 대체하자 · 중복 설명이야"]
#   하객 맞이 상단의 「이렇게 흘러요 · 안내 네 번」 4줄 박스를 지웠다 — 바로 아래 전문 보기가 같은 넷을
#   다시 보여 주고 있었다. 「네 번」은 fold 라벨이 이어받았다. 4줄 박스를 되살리지 말 것.
chk 'GUEST_NODUP' order-preview.html 2
chk '안내 네 번, 문구 전문 보기' order-preview.html 1
#   ★자는 **마크업**을 겨눈다 — 문구만 겨누면 바로 위 근거 주석의 인용문을 제 발로 밟는다(실측 REVERT?).
nochk 'proc-l">이렇게 흘러요' order-preview.html
# ★[TUNE_HINT_ONE 2026-08-14 사용자 지시] 다듬기 안내는 한 줄 — 조작 설명(↑↓·카드 누름)은 단추가 말한다.
chk 'TUNE_HINT_ONE' order-preview.html 1
# ★★[ORD_FLOW_ONE 2026-08-14 사용자 지적 "코스 이벤트를 눌러 들어가면 처음 이벤트와 매칭이 안 된다"]
#   카드 흐름은 손으로 적은 flow 가 아니라 seq 에서 뽑고, 이름은 안쪽 목록과 같은 원천(TUNE)에서 읽는다.
#   상세(detail)는 index 가 아니라 키(k)로 붙는다 — 기록형은 칩 4/실제 6/상세 5 로 갈라져 있었고
#   「성혼 선언」 칩이 「반지 교환」 상세의 배지를 물고 있었다(실측).
chk 'ORD_FLOW_ONE' order-preview.html 2
chk 'ORD_FLOW_ONE' assets/ritual-data.js 2
chk 'function courseFlow' order-preview.html 1
# ★[FLOW_NO_GUEST 2026-08-14 사용자 지적 "코스 이게 적절하다고 판단한 거야?"] 하객 맞이는 **식전**이라
#   카드 칩에서 뺀다 — 카드 옆 「약 N분」이 식전을 안 세므로(MMIN) 개수만 세면 둘이 다른 말을 한다.
#   게다가 세 카드가 전부 같은 두 칩으로 시작해 코스끼리의 차이를 가렸다. 안쪽 목록에는 그대로 있다.
chk 'FLOW_NO_GUEST' order-preview.html 1
# ★★[CAKE_ONE_HOME 2026-08-14 사용자 지적 "축배 케이크랑 사이 순서 중복 아니야?"]
#   케이크 커팅이 사이 순서와 축배 두 곳에 다 살아 목록이 같은 것을 두 번 파는 것처럼 읽혔다.
#   집은 축배·케이크 하나(축배/케이크/둘 다 세 갈래). 사이 순서는 와인 세리머니로 좁혔다.
#   옛 초안(S.valley==='cake')은 그대로 뜬다 — 고르는 자리에서만 뺐다.
chk 'CAKE_ONE_HOME' order-preview.html 3
# ★[CAKE_DUP_GONE 2026-08-16] 이중 커팅 경고를 **걷었다** — 지키던 것을 뒤집었으니 마커도 뒤집는다.
#   [WINE_RETIRED] 로 사이 순서가 사라져 inSeq('valley') 가 영영 false 다 → 경고가 닿을 조합이 0.
#   실측: scripts/audit/ritual-guard-scan.mjs [E] 가 «한 번도 안 걸렸다»로 잡았다.
#   ★죽은 가드를 남기면 다음 사람이 「이중 예약은 막혀 있다」고 믿는다 — 이제는 **구조**가 막는다
#     (케이크를 고를 수 있는 자리가 「축배·케이크」 하나뿐이다). 되살아나면 그건 사이 순서가 돌아온 것이다.
nochk '_cakeDup' order-preview.html
nochk 'c.flow.forEach' order-preview.html          # ★카드가 flow 를 다시 읽으면 같은 드리프트가 재발한다
chk "k:'_close'" assets/ritual-data.js 6           # 폐식은 코스마다 자기 상세를 갖는다(기록형은 축배와 뭉쳐 있었다)
# ★★[ORD_ADD_ALL 2026-08-14 사용자 지시 "위에 없는 다른 순서 더하기, 여기에 다 추가해 줘"]
#   더할 수 있는 순간을 전부 목록 제자리에 세운다(꺼진 카드 + 버튼). 접힌 팔레트 상자는 폐지.
chk 'ORD_ADD_ALL' order-preview.html 4
chk 'paletteCand().forEach' order-preview.html 1
nochk 'function paletteHtml' order-preview.html    # ★접힌 팔레트 UI 되살리기 금지(같은 더하기가 두 곳)
# ★[SPECIAL_GONE 2026-08-14 사용자 지시] 「목록에 없는 순서가 있나요?」 폐지 — 자유 한 칸이 그 자리다.
chk 'SPECIAL_GONE' order-preview.html 2
#   ★nochk 는 **호출부 모양**을 겨눈다 — 이름만 겨누면 바로 위 근거 주석의 인용문을 제 발로 밟는다.
#     오늘 두 번 겪었다(GUEST_NODUP 문구 · 이 줄). 새 nochk 를 쓸 땐 주석에 못 나오는 형태로 적을 것.
nochk 'onclick="askSpecial' order-preview.html
# ★[TIP_QUIET 2026-08-14 사용자 지적 "팁 부분 너무 주저리야"] 팁은 상자가 아니라 왼쪽 실선 곁말.
chk 'TIP_QUIET' order-preview.html 3   # [NO_DIRECTOR_READ 2026-08-14] 서약 팁의 TIP_QUIET 주석은 그 팁을 다시 쓰며 사라졌다(같은 커밋에서 내림)
nochk 'background:#F3EEE6;border:1px solid #E7DFD2' order-preview.html
chk '.oc:has(+ .subset){border-bottom:0' order-preview.html 1
# ★[GLINE_FADE 2026-08-14 사용자 지적 "가로줄이 좀 올드한 느낌"] 일러스트 바닥선 6개 전부
#   양끝 페이드 헬퍼(GLINE) 하나로 — 딱 끊기는 전폭 직선으로 되돌리지 말 것.
#   ★가로 직선은 bbox 높이 0이라 userSpaceOnUse 그라디언트여야 칠해진다(objectBoundingBox 는 투명 · 실측).
chk 'GLINE_FADE' order-preview.html 1
chk 'GLINE(' order-preview.html 7                             # 정의 1 + 바닥선 호출 6
chk 'userSpaceOnUse' order-preview.html 1
# ★★[SUB_SEG 2026-08-13 사용자 지적 "여기 디자인이 좀 이상한데 디자이너관점으로 개선"]
#   성혼 선언 화면 — 세부 선택(낭독 톤)이 최상위와 **똑같은 카드(oc)** 를 입고 있었다.
#   진한 ✓ 동그라미가 한 화면에 둘(무엇을 할까 / 어떤 톤으로)이라 층이 안 읽혔고,
#   고른 톤 카드만 대본 여덟 줄을 품어 자식이 부모보다 무거웠다. 「기본」 배지도 두 층에 겹쳤는데
#   정작 고른 건 그 배지가 안 붙은 쪽이라, 무엇이 기본인지가 되레 흐려졌다.
#   → 세부는 칩 두 칸 · 대본은 **판이 아니라 글** · 「기본」은 칩 안 작은 글씨로.
#   ★두 번 고쳤다. 첫 판은 대본을 상자째 곁판으로 옮기고 「기본은 …」을 제목 옆 한 줄로 뒀는데,
#     그건 ①이 지면의 규칙(.oc .nar 은 배경·테두리를 뺀다)을 깨 여덟 줄짜리 상자를 부활시켰고
#     ②배지를 없앤 자리에 문장을 바꿔 단 것이라 소음이 그대로였다. 사용자: "최선이야?"
#     판단 근거(대본)는 선택지보다 조용해야 한다 — .subset .nar 을 원래 규칙에 태워 되돌렸다.
#   ★선택 칩의 '말'은 한 곳에서만 정한다 — .ex-chip 규칙에 .seg-b 를 함께 태웠다.
#     따로 적으면 한 지면에 '고름'을 말하는 방식이 셋이 된다(그 자체가 사용자가 지적한 소음이다).
#   실측 @390: 칩 158x44 두 칸(44 확보) · 가로 넘침 없음 · tap-targets 통과 · 진한 ✓ 1개
chk 'SUB_SEG' order-preview.html 5
chk 'seg-b' order-preview.html 4
chk '.ex-chip,.seg-b{' order-preview.html 1        # ★선택 칩의 말을 한 줄에서만 — 갈라 적지 말 것
chk '.oc .nar,.oc .self,.subset .nar{' order-preview.html 1   # ★대본은 판이 아니라 글 — 곁판도 같은 규칙에 태운다
chk 'seg-b .df' order-preview.html 1                # 「기본」은 칩 안 작은 글씨(최상위 배지와 층이 갈린다)
# ★★[BADGE_GAP 2026-08-13 · 클로드코드 ④ 「낭독기가 「엄숙하게기본」으로 붙여 읽는다」]
#   ★먼저 자를 확인했다 — 크로미움 접근성 트리는 이미 「엄숙하게 기본」으로 읽는다(실측).
#     붙어 보인 것은 textContent 를 읽었기 때문이다(내 검사 출력도 그랬다) — ★11, 자를 잘못 든 것.
#   ★그래도 한 칸을 넣는다. 크로미움이 넣어 주는 그 칸은 **엔진이 해 주는 것**이고,
#     고객 폰은 iOS 사파리인데 이 세션에서는 재 볼 수 없다 [CANT_LOOK]. 기대지 않고 우리가 넣는다.
#   ★aria-label 로 버튼 이름을 통째로 갈아끼우는 길(클로드코드 추천 ㉯)은 안 골랐다 —
#     그 순간 «눈에 보이는 글»과 «귀에 읽히는 글»이 두 벌이 되고, 둘 중 하나만 고치는 날이 온다.
#     이 저장소가 반복해서 당한 모양이다(사본은 늙는다). 한 칸이면 원본 하나로 끝난다.
#   실측: 칩 폭 158 그대로(플렉스에서 끝 공백은 접힌다) · 접근성 이름 「엄숙하게 기본」 유지
chk 'BADGE_GAP' order-preview.html 1
chk "esc(nm)+(rec?' <span" order-preview.html 1      # ★배지 앞 한 칸 — 지우지 말 것(위 이유)
chk "나레이션 <span class=\"oc-rec\">기본" order-preview.html 2
chk "_dd?' <span class=\"df\">기본" order-preview.html 1
# ★[BADGE_GAP · 그물 하나를 쓰다가 갈아엎었다 2026-08-13]
#   처음엔 브라우저 검사에 「배지가 붙어 읽히는가」를 넣었다. 돌연변이로 한 칸을 지워 봤더니
#   **안 붉었다** — 크로미움이 접근성 이름을 만들 때 스스로 한 칸을 넣는다(실측 2회).
#   이 엔진에서 늘 참인 죽은 그물이었다(★11-c). 한 칸 자체는 **위 정적 chk 넷**이 지킨다.
#   브라우저 쪽 겨냥은 **다른 위험**으로 바꿨다 — aria-label 로 버튼 이름을 갈아끼우면
#   눈에 보이는 글과 귀에 읽히는 글이 두 벌이 된다. 2026-08-13 에 일부러 안 고른 길이고,
#   나중에 누가 고르면 붉는다(돌연변이 확인: aria-label 얹으니 exit 1 · 기준선 0).
#   ★겨냥은 「배지 붙은 버튼」으로 좁혔다 — 전체에 걸었더니 아이콘 버튼의 정당한 aria-label 넷이
#     걸렸다(「안내 문구 전문 보기」 등). 그것까지 붉히면 늑대가 된다(★9).
chk 'BADGE_GAP' scripts/check-ord-save.mjs 7
chk 'accessibility.snapshot' scripts/check-ord-save.mjs 1   # ★귀는 접근성 이름으로 잰다 — textContent 로 되돌리지 말 것
nochk 'subq-def' order-preview.html                 # ★제목 옆 「기본은 …」 한 줄로 되돌리지 말 것(소음을 바꿔 다는 것)
nochk "oc('declare',v,DECLARE" order-preview.html   # ★세부를 다시 카드로 되돌리지 말 것(위 이유)
chk 'WAVE_SOFT' index.html 1                        # 큰 칩은 '약 N' · 범위(16~25)는 설명 문장에 남긴다(2026-08-09)
chk "var allDone = false" mypage.html 1            # 예식 준비 카드 항상 펼침(2026-07-19 사용자 지시 · 접힘 아코디언 부활 금지)
chk '_seatNext' mypage.html 2                      # 확정 저장→좌석 자동 연결
chk 'seat-fstrip' mypage.html 3                    # 좌석 상단 확정 요약 스트립
chk 'rs-dk dk-' mypage.html 1                     # 자리별 음료 색점 복원(2026-07-19 · 스탭 프린트용)
chk 'seat-privacy' mypage.html 1                   # 공개 방식 별도 카드(캔버스 아래)
chk 'data-drink' mypage.html 3                     # 자리별 음료 칩 배선 복원
# ── 2026-07-19 자리별 3음료 + 인원 자동계산(사용자 지시: "고르고 인원 정하는 탭 전부 제거 · 자리 클릭하면 3가지 음료")
chk 'SEAT_DRINK_LABEL' mypage.html 1               # 자리별 3음료(샴페인/레드와인/논알콜 스파클링) 레지스트리 — 상단 대표음료 폐지
chk '_seatNamedCount' mypage.html 2                # 최종 인원=이름 있는 자리 수 자동계산(별도 인원 입력 폐지)
chk 'seat-summary' mypage.html 2                   # 캔버스 아래 인원·요금+음료 집계 통합 요약 카드(2026-07-19 디자이너 개편 · 25명 초과 경고)
_ftop=$(grep -c 'class="seat-ftop"' mypage.html 2>/dev/null); _ftop=${_ftop:-0}; if [ "$_ftop" -gt 0 ]; then echo "REVERT? mypage.html: 폐지된 상단 인원/대표음료 블록(seat-ftop) 부활($_ftop)"; fail=1; else echo "ok mypage.html: 상단 인원/대표음료 블록 없음(자리별 3음료 유지)"; fi
# ── 2026-07-19 담은 곳 = 하객 공개 분리(담기≠노출 · 대표+선택한 곳만 하객 노출)
chk 'data-favshow' mypage.html 2                   # 담은 곳 하객 공개 토글 렌더+배선
chk '_dnFavShowToggle' mypage.html 2               # 하객 공개 토글 헬퍼+호출
chk 'dn-showtgl' mypage.html 3                     # 토글 CSS·마크업
chk 'v.show === true' automation/platform/80_production.gs 2   # 서버 하객 노출=최종 선택(show)만 필터
# ── 2026-07-19 단체 사진 전용화면(PHOTOFLOW·구도+연출 photoFx) — 병렬 세션 기능을 통합 브랜치에 포트(역전 방지)
chk 'startPhotoFlow' mypage.html 2                  # 단체사진 전용화면 진입 함수+배선
# ★[PHOTO_WISH 2026-08-16] 연출 카드 선택 폐지로 PHOTO_FX_MAX 는 PHOTO_WISH_MAX 로 대체됐다(근거는 같음 · 마지막 토막 4~5분).
#   기능을 정당히 없앤 경우라 옛 마커를 지우고 새 이름을 센다 — 아래 PHOTO_WISH 블록이 그 자리를 지킨다.
chk 'PHOTO_WISH_MAX' mypage.html 4                  # 요청 상한 정의 + 안내 문구 + 추가·예시 상한 판정
chk 'photoFx:' mypage.html 2                        # 저장(savePhoto·guideinfo collect)에 연출 포함 — 공개 방식 저장이 연출 지우지 않게
chk 'renderPhoto(box)' mypage.html 3                # PHOTOFLOW 렌더 디스패치(가드1)+정의+재렌더 (전용 오버레이 전환으로 start는 renderPhoto(inner) · 2026-07-19 4→3 갱신)
# 음수 마커 — 통합 역전 시 분리된 옛 좌석 행 부활 감지(bd0ee33 4차 역전류 조기 감지)
_sep=$(grep -c "row('좌석 배치도', t.seat" mypage.html 2>/dev/null); _sep=${_sep:-0}; if [ "$_sep" -gt 0 ]; then echo "REVERT? mypage.html: 분리된 옛 좌석 배치도 행 부활($_sep)"; fail=1; else echo "ok mypage.html: 분리 좌석 행 없음(통합 유지)"; fi
# ── 2026-07-19 식순 AI 상담사 · 위젯 배선(추가형 · 서버 KB만 ritual-data 원천)
chk 'ritual-data 공유 원천 v1' assets/ritual-data.js 1   # 공유 모듈 자체 생존
chk '식순 AI 상담 배선 v1' order-preview.html 1    # 빌더 위젯 배선(ME_ADV_PAGE·맥락 칩·그라운딩)
chk '신원 번들' mypage.html 1                     # 식순 임베드 AI 신원주입(orderFill cust · 4회 역전됨 2026-07-19)
# ── 2026-07-19 코스 밖 순서 더하기(전체 팔레트) — 고정 3개·핵심 빼고 어느 코스에서든 추가 가능
chk 'RITUAL_ADD_PALETTE' order-preview.html 2      # 전체 순서 팔레트(GADD·RANK 삽입 + 팔레트 UI)
chk 'paletteCand' order-preview.html 2             # 팔레트 후보 헬퍼(코스에 없는 순간)
# ── 2026-07-19 스냅사진 사전기획 파트(마이페이지 여정 스텝 · snap 트랙 · SNAPFLOW)
chk 'SNAP_PREP_STEP' mypage.html 1                 # (폐지 2026-07-25 사용자 지적) 진행바 합성 '스냅기획' 스텝 삭제 — 마커는 '재삽입 금지' 주석으로 생존. 카드(SNAP_PREP_FLOW)는 유지
chk 'SNAP_PREP_FLOW' mypage.html 1                 # SNAPFLOW 전용 화면 블록
chk 'SNAP_PREP_OVERLAY' mypage.html 1              # 스냅 기획 전체화면 오버레이(식순 빌더처럼 집중)
# 2026-07-20 정보중심 개편: 무드 색 타일(SNAP_MOOD_META·smt-grid) 폐지 → 어떤 작가여도 도움되는 실무 정보(인물·관계·각도·꼭 담을 것)로 전환. 색 타일 복원 금지.
chk 'SNAP_PEOPLE' mypage.html 2                     # 스냅 인물·관계 정보(누가 함께 담기나요) — 무드 색타일 폐지 대체
chk 'aboutNote' mypage.html 3                       # 각도·신경 쓰이는 점(작가 브리핑) 필드 — 렌더+저장+수집
chk 'mustPeople' mypage.html 3                       # 꼭 챙겨 담고 싶은 분 필드
_smttile=$(grep -c 'class="smt' mypage.html 2>/dev/null); _smttile=${_smttile:-0}; if [ "$_smttile" -gt 0 ]; then echo "REVERT? mypage.html: 폐지된 무드 색 타일(.smt) 부활($_smttile)"; fail=1; else echo "ok mypage.html: 무드 색 타일 폐지 유지(정보중심)"; fi
# PROD_FS_OVERLAY·.mp-fs 재등록(2026-07-19) — 청첩장·다이닝/최종·좌석 3종 편집을 mp_production .mp-fs로 전체화면화(단체사진은 전용 오버레이 PROD_OVERLAY, 스냅은 SNAP_PREP_OVERLAY).
chk 'PROD_FS_OVERLAY' mypage.html 1                 # 청첩장·다이닝·최종·좌석 3종 전체화면(.mp-fs 클래스 토글)
chk '\.mp-fs{' mypage.html 1                        # 전체화면 클래스 CSS
chk 'SNAP_PREP_NORMALIZE' automation/platform/80_production.gs 1   # 백엔드 snap 트랙 정규화
chk "track !== 'snap'" automation/platform/80_production.gs 2      # snap 화이트리스트 + 확인해제 제외
chk '스냅 기획 (촬영 전)' admin.html 1             # 관리자 상세 스냅 기획 블록
# ── 2026-07-19 단체사진 동작·하객 사진 모으기(QR 갤러리)·전체화면 오버레이 전환
chk '함께 하는 동작' mypage.html 1                 # 단체컷 동작 섹션(2026-07-20 '다 함께 하는 동작'→예시 카드형 개편)
chk 'PHOTO_WISH_EX' mypage.html 4                  # [PHOTO_WISH] 구 PHOTO_FX_CARDS — 이제 '고르는 카드'가 아니라 예시·이어받기·확인서 대조의 근거
# ★[PFX_CSS_GONE 2026-08-16] 'pfx-card' 마커 폐지 — 고르는 카드 UI 자체가 [PHOTO_WISH]로 없어졌고,
#   남아 있던 CSS 10개도 실측 사용 0건이라 지웠다. 기능을 정당히 폐지한 경우라 같은 커밋에서 목록을 지운다.
#   그 자리를 지키는 것은 아래 PFX_CSS_GONE·nochk('.pfx-grid{') 다(되살아나면 잡힌다).
chk 'photoShareNorm' mypage.html 3                 # 하객 사진 모으기 링크 정규화(QR 갤러리 파일럿)
chk 'photoShareHtml' guide.html 2                  # 하객 안내 '사진 올리기' 버튼 섹션
chk 'photoShareUrl' automation/platform/80_production.gs 2   # guideinfo 정규화+guideView 출력
chk 'PROD_OVERLAY' mypage.html 1                   # 단체사진 전체화면 오버레이 전환(파일럿)
# ── 2026-07-21 애프터 웨딩 입구 게이트('선택' 태그 폐지 · 만들기 vs 안 함 3-상태)
chk 'DN_GATE' mypage.html 2                         # 입구 두 카드 게이트(CSS 마커+렌더 마커)
chk 'dn_none' mypage.html 1                         # '안 함'(안내 없이 진행) 카드 배선
chk 'dn_again' mypage.html 2                        # 안 함 되돌리기('역시 만들래요') 버튼+배선
_dseltag=$(grep -c "{tag:'선택'})" mypage.html 2>/dev/null); _dseltag=${_dseltag:-0}; if [ "$_dseltag" -gt 0 ]; then echo "REVERT? mypage.html: 애프터 웨딩 '선택' 태그 부활($_dseltag)"; fail=1; else echo "ok mypage.html: 애프터 웨딩 '선택' 태그 폐지 유지(3-상태)"; fi
# ── 2026-07-21 스크롤 잠금 자가 치유(오버레이 다녀온 뒤 마이페이지 스크롤 굳음 실기기 버그)
chk 'MP_LOCK_RECONCILE' mypage.html 2              # orphan 배경 잠금 자가 해제(show가 바탕 복귀 시 호출 · 정의+배선)
chk 'meGuideCta-inline' shared/hydrate.js 1
chk 'pruneEmptyVenueRows' shared/hydrate.js 2       # 오시는길 빈 메타행(교통편·주차 미입력) 숨김(2026-07-22 · 라벨만 남던 문제) — 정의+호출
chk 'mapOverlayHide' shared/hydrate.js 1          # 지도 미정 시 '지도에서 열기' 버튼 숨김(위치 미정인데 지도 CTA 모순 · 2026-07-22)        # 하객안내 박스=마지막 본문섹션 안 삽입(2026-07-22 · 100vh 섹션 뒤 홀로 떨어져 '너무 내려가' 보이던 문제 · footer 앞 배치로 역전 금지)
# ── 2026-07-20 저장중 피드백 베일 + 오버레이 z-index 역전 수정(사진·스냅 저장이 멈춘 듯 보여 반복 클릭 · 실패 확인창이 오버레이 뒤에 숨던 문제)
chk 'flow-busy' mypage.html 4                       # 저장중 '저장 중…' 베일 CSS+헬퍼+배선
_ovz=$(grep -c "inset:0;z-index:9999;background:var(--bg,#FAFAF8);display:flex;flex-direction:column;opacity:0" mypage.html 2>/dev/null); _ovz=${_ovz:-0}; if [ "$_ovz" -gt 0 ]; then echo "REVERT? mypage.html: 사진·스냅 오버레이 z-index 9999 역전 부활($_ovz · 모달 뒤에 숨음)"; fail=1; else echo "ok mypage.html: 사진·스냅 오버레이 z-index 950 유지(모달 아래)"; fi
# ── 2026-07-22 식순 글 입력 2단계(각 순간 1차 입력 + 글 적어두기 2차 확인 · 목차 항시 노출)
chk 'WRITE_2CHECK' order-preview.html 5            # 글 입력 카드 단일화(writeCard)+2차 확인+완성 인라인 '글 비어 있음'(옛 writePtr/별도 fillbadge 배지 복원 금지)
chk 'function writeCard' order-preview.html 1      # 순간·글 적어두기 공용 입력 카드 함수
# ── 2026-07-22 메일 카드 하단 '잘림' 수정(border+radius에 border-collapse:separate 미선언 → 일부 앱서 각짐)
chk 'EMAIL_CARD_RADIUS_FIX' automation/consultation/consultation-booking.gs 1   # 공용 emailShell 카드 라운드 안정화 주석
chk 'border-collapse:separate' automation/consultation/consultation-booking.gs 1 # 카드 테두리 라운드 유지(collapse 강제 방어)
# ── 2026-07-22 예식/촬영 종료 대기 화면 여운 메시지(제목 아래·안내 위)
chk 'RESULT_WAIT_EMO' mypage.html 2                 # _resultWaitHtml 감정 블록(cc-emo) CSS+마크업 · cc-sub '한 장 한 장' 중복 제거 유지
chk 'wedchg-seat-inv' automation/platform/70_journey.gs 1   # 예식일 변경 확정 시 하객 좌석 페이지 캐시 무효화(80_production 톰스톤 패턴)
# ── 2026-07-25 결과물 링크 서버 검증(경고하되 저장 허용)
chk 'LINK_VERIFY' automation/admin/admin.gs 2                        # 링크 검증 헬퍼(형식·접근성·공유제한) + 저장부 warnings 반환
chk 'LINK_VERIFY_WARN' admin.html 1                                  # 저장 성공과 구분되는 링크 경고 모달
chk 'LINK_VERIFY_RECLOCK' automation/admin/admin.gs 1                # 락 밖 처리이력 기록을 짧은 락으로 보호(동시 갱신 유실 방지)
chk 'RESULT_NOTIFY_STEPS' automation/platform/95_notify.gs 4         # 원본·보정본 도착 고객 알림 이벤트 2종(문구·이메일 폴백·템플릿 슬롯)
chk 'RESULT_NOTIFY_STEPS' automation/admin/admin.gs 2                # 결과물 링크 저장 시 상태 전이 1회만 발송 배선
chk '카톡·메일로 알려드려요' mypage.html 1                # 대기 카드 알림 안내 문구(백엔드 알림이 근거) — 2026-07-25 사용자 지시로 부연 축약('준비되는 대로 카톡·메일로 알려드려요' · 기능 유지)
chk 'DLV_SEC' mypage.html 2                          # 결과물 대기 '전해드리는 순서' 섹션 헤더(CSS 마커+규칙+마크업) — fn-intro 각주형 복원 금지
# ── 2026-07-25 조용한 실패 가시화(관리자 메일 통지 · 메일 전용 규칙)
chk 'NOTIFY_SENT_RET' automation/platform/95_notify.gs 4             # 알림 발송 결과 반환(true/held/false · 기존 호출부 호환)
chk 'SILENT_FAIL_ALERT' automation/admin/admin.gs 1                  # 결과물 전달 알림톡+메일 이중 실패 → 관리자 메일
chk 'SILENT_FAIL_ALERT' automation/platform/70_journey.gs 1          # 주간 백업 실패 → 관리자 메일 1줄
chk 'SILENT_FAIL_ALERT' automation/platform/20_customers-data.gs 1   # 개인정보 자동 파기 스킵(락 실패) → 관리자 메일 1줄
# ── 2026-07-26 결과물 대기 화면 디자인 다듬기(여백 균형·크기 역전 해소·강조 1개 원칙·가독 대비)
chk 'RESULT_WAIT_POLISH' mypage.html 10               # cc-emo 여백 20/20 · dlv-sec .t 12px · vg-v 400 · cc-mini 대비 · 표 간격 10px · 원본 행 강조/기간 위치 · 부연 한 줄 압축 · 각주 좌측정렬 · 기간 우측 정렬 열 A안(2026-07-26 · 각주/헤더 좌측정렬 2026-07-25 사용자 지시)
# ── 2026-07-23 후기(설문) 단계 개선(협업 회의 확정 · 구현=클로드 코드·검증=코워크)
chk 'SURVEY_DONE_TONE' mypage.html 2                # 후기 완료 패널 톤(감정/로지스틱 분리·이모지 제거·진사 '오래') CSS+마크업
chk '고객 측 설문 스킵 버튼 복원 금지' mypage.html 1   # .srv-skip 죽은 CSS 삭제 자리(복원 금지 · 건너뜀은 관리자 전용)
chk 'it.req && !missing' mypage.html 1              # 설문 필수(req) 문항만 미응답 검증(전 문항 강제 회귀 방지)
# ── 2026-07-25 Wave 1(결과물+식순 회의 합의 · 코워크 스펙)
chk 'RITUAL_BACK_SAVE' mypage.html 3                                 # 뒤로가기=저장 후 닫기(멱등 done·3초 타임아웃·토스트)
chk 'ORDERFILL_DONE' mypage.html 2                                   # 서버 초안 완료 여부 실값 동봉(송신)
chk 'ORDERFILL_DONE' order-preview.html 1                            # done 실값 주입 + 로컬 방문기록 보존(수신)
chk 'PICK_NORMALIZE' mypage.html 3                                   # 컷 선택 캐논 정규화·칩 미리보기·고유 카운트(프론트)
chk 'PICK_NORMALIZE' automation/platform/80_production.gs 1          # 서버 방어층 파이프(고유 토큰 수=선택수)
chk 'DRAFT_SIZE_CAP' automation/platform/80_production.gs 2          # ritual/dining 12k 트랙 캡 + 45k 합산 캡(조기 거부)
chk 'RITUAL_ADMIN_V3' admin.html 2                                   # 관리자 식순 v3 렌더(요약 칩+상세 · v1 폴백)
chk 'DELIV_MATRIX' scripts/audit/deliv-matrix.mjs 1                  # 결과물 여정 32조합 상시 회귀(마커 합의 동작과 세트)
chk 'launchBrowser' scripts/audit/_browser.mjs 1                     # 감사 공용 브라우저 어댑터(playwright 우선)
# ── 2026-07-25 Wave 2 보안 트랙(AI 위젯 신원·로깅 · 코워크 스펙 S-1~S-4)
chk 'AI_TEST_TAG' api/ritual-advisor.js 1                            # test 플래그 로깅 우회 폐지(항상 적재·isTest 태그)
chk 'AI_TEST_TAG' automation/platform/96_ai_cost.gs 4                # 비용 적재 태그 + 집계 3곳(비용·교육후보·리포트) 테스트 제외
chk 'AI_TEST_TAG' automation/consultation/consultation-booking.gs 1  # 질문 로그 테스트 태그 컬럼
chk 'AI_WIDGET_HMAC' api/ritual-advisor.js 3                         # embed 신원 HMAC 검증(timingSafeEqual·익명 강등·rate 키)
chk 'AI_WIDGET_HMAC' automation/platform/60_mypage.gs 2              # getMyState aiToken 발급(ScriptProperty AI_WIDGET_SECRET)
chk 'AI_WIDGET_HMAC' mypage.html 1                                   # orderFill cust 번들 aiToken 릴레이
chk 'AI_WIDGET_HMAC' order-preview.html 1                            # advExtra auth 전송
chk 'AI_STATE_SCHEMA' api/ritual-advisor.js 2                        # state 구조체 검증·고정 템플릿 조립(문자열 폴백 유지)
chk 'AI_STATE_SCHEMA' order-preview.html 1                           # 클라 구조체 상태(stateData) 생성
# ── 2026-07-25 Wave 3 결과물 마무리 루프(회의 A-2·R-7·R-6·R-8·E-2 · 코워크 스펙)
chk 'REVISION_LOOP' mypage.html 4                                    # 무료 재보정 수정 요청(칩+사유 폼·접수 확인 상태·확정 문구 대체)
chk 'REVISION_LOOP' automation/platform/80_production.gs 3           # requestRevision 핸들러·결과물 상태 revision·확정 보류 가드
chk 'REVISION_LOOP' automation/admin/admin.gs 3                      # 보정본 재등록=반영 처리+고객 재안내 · raw.수정요청 노출
chk 'REVISION_LOOP' admin.html 1                                     # 결과물 카드 수정 요청 배지+내용
chk 'REVISION_LOOP' automation/consultation/consultation-booking.gs 1 # doPost 라우트
chk 'TRACK_REV_GUARD' automation/platform/80_production.gs 4         # 트랙별 rev 지문·락 안 대조·force 백업(_prev)·응답 rev
chk 'TRACK_REV_GUARD' mypage.html 3                                  # rev 동봉·충돌 2버튼 UX·모달 z 11000
chk 'V2_DRAFT_NOTICE' mypage.html 1                                  # v2 초안 침묵 폐기 대신 1회 안내
chk 'ORDER_SAVE_FAIL' mypage.html 1                                  # 완료 저장 실패 신호 송신
chk 'ORDER_SAVE_FAIL' order-preview.html 1                           # 낙관 '저장됨' 되돌림(수신)
chk 'KEEP_UNTIL_DATE' mypage.html 1                                  # 보관 만료일 날짜 명시(전달일+6개월 · 폴백 유지)
# ── 2026-07-25 Wave 4 PR-A 구조 준비(접근자 단일화·멀티탭·데드코드 · 코워크 스펙)
chk 'PROD_ACCESSOR' automation/platform/80_production.gs 6           # 소비처 전환 표기(창구 본체는 PR-B에서 PROD_COL_SPLIT로 재작성 · 직접 접근 0은 아래 음수 마커가 지킴)
chk 'PROD_ACCESSOR' automation/platform/85_invitation.gs 5           # 청첩장 초안·발행·배선 쓰기 4곳 + 읽기 1곳 전환
chk 'PROD_ACCESSOR' automation/platform/70_journey.gs 3              # 예식일 변경 base 동기화(읽기·쓰기) + 잔금 추가요금 읽기
chk 'PROD_ACCESSOR' automation/admin/admin.gs 5                      # 목록·상세 읽기 3곳 + 강제 롤백 초기화 목록 + 좌석 캐시 무효화 판정
chk 'PROD_ACCESSOR' automation/platform/20_customers-data.gs 1       # PII 자동파기가 제작 컬럼 전체 포함(_custPiiCols · PR-B 신 컬럼 누락 방지)
chk 'PROD_ACCESSOR' scripts/audit/prod-accessor.mjs 1                # 접근자 계약 상시 회귀(PR-B S1~S4가 여기 얹힘)
chk 'UISTRIP_FAVS_EXEMPT' automation/platform/80_production.gs 1     # R-9 담은 곳·공개 토글은 확인서 해제 안 함(명시 고정)
chk 'PROD_MULTITAB' mypage.html 2                                    # 다른 탭 저장 감지 배너(BroadcastChannel + storage 폴백)
# 음수 마커 — 도달 불가로 삭제한 v2 식순 위저드가 '유실 기능 복원'으로 되살아나는 것 감지(2026-07-25 Wave 4 PR-A)
_rrv=$(grep -c 'function renderRitual' mypage.html 2>/dev/null); _rrv=${_rrv:-0}; if [ "$_rrv" -gt 0 ]; then echo "REVERT? mypage.html: 삭제된 v2 식순 위저드(renderRitual) 부활($_rrv)"; fail=1; else echo 'ok mypage.html: v2 식순 위저드 삭제 유지(전용 빌더 단일 경로)'; fi
# ── 2026-07-25 Wave 4 PR-B 트랙별 컬럼 분리 + 지연 마이그레이션(코워크 스펙 · 되돌릴 수 없는 데이터 축)
chk 'PROD_COL_SPLIT' automation/platform/80_production.gs 3      # 컬럼 스키마·두 세대 공존·캡/손상 격리 본체
chk 'PROD_COL_SPLIT' automation/platform/00_platform-config.gs 1 # CUSTOMER_HEADERS 끝 append(열 인덱스 밀림 금지)
chk 'PROD_COL_SPLIT' scripts/audit/prod-accessor.mjs 2           # S1~S4 마이그레이션·캡/손상 격리 상시 회귀
chk 'addProdTrackColumns' automation/platform/80_production.gs 1 # 멱등 1회 컬럼 추가 함수(★배포 '전' 실행 · CLAUDE.md 위치표 등재)
chk '_prodColsMissing' automation/platform/80_production.gs 3    # [A-1] 컬럼 미생성 시 무증상 유실 대신 명시적 거부(정의+판정+메일)
chk '_prodColsMissingError' automation/platform/85_invitation.gs 3 # 청첩장 저장 3경로 동일 가드
chk 'cust: cust' automation/platform/85_invitation.gs 8           # [B급1] 합산 상한이 청첩장 4쓰기 전부에서 돌게 cust 전달
chk '_prodSyncFail' automation/platform/70_journey.gs 4           # [A급1] 예식일 변경의 제작 base 동기화 실패를 조용히 넘기지 않음(통지+이력)
chk 'checkProdCapOverflow' automation/platform/80_production.gs 1 # 배포 전 신 캡 초과 행 사전 진단(읽기 전용)
chk 'migrating' automation/platform/80_production.gs 4            # ★이전은 캡으로 막히지 않는다(막히면 그 행 영구 정체) · 복원 금지
chk 'PROD_META_COL' automation/platform/80_production.gs 7       # 크로스트랙 키 전용 컬럼(트랙 캡이 확인서를 게이트하지 않게)
# 음수 마커 — ★구셀 삭제·갱신 부활 감지. 이 PR에서 유일하게 되돌릴 수 없는 데이터 사고 지점(반쪽 마이그레이션 증발).
_plw=$(grep -cE "\[ *(PROD_LEGACY_COL|'제작임시저장') *\] *=|\{ *'제작임시저장' *:" automation/platform/80_production.gs automation/platform/85_invitation.gs automation/platform/70_journey.gs 2>/dev/null | awk -F: '{s+=$2} END{print s+0}'); if [ "$_plw" -gt 0 ]; then echo "REVERT? 구셀(제작임시저장) 쓰기 부활($_plw) — 두 세대 공존 규칙 위반"; fail=1; else echo 'ok 구셀 동결 유지(읽기 폴백 전용 · 쓰기 0)'; fi   # [B-7] 변수명(upd/updCols…)에 안 묶이게 대괄호 대입 형태로 매칭
# ── 2026-07-25 강제 롤백 데이터 정합(코드리뷰 7건 · 수납 보존/트랙 강등/스냅 도달/파기 플래그/좌석 캐시/카드 가드)
chk 'ROLLBACK_KEEP_PAID' automation/admin/admin.gs 5   # 확인된 수납(계약금·중도금·잔금·추가보정) 롤백 보존 — 지우면 카드 이중청구·영수증 큐 소실
chk 'ROLLBACK_TRACK_DEMOTE' automation/admin/admin.gs 1 # 결과물전달 아래 롤백 시 '전달완료'→'컨펌완료' 강등(단계·고객화면 정합)
chk 'FORCE_SEAT_INV' automation/admin/admin.gs 1        # 강제 롤백 시 좌석 공개 캐시 톰스톤
chk 'PAY_ROLLBACK_GUARD' automation/platform/98_pay_card.gs 1   # 카드 수납 흔적(결제수단) 기반 재청구 차단
chk '결과물파기' automation/admin/admin.gs 1            # 설문 그룹 consent에 결과물파기 포함(재전달 시 12조③ 통지 부활)
# ── 2026-07-25 신청 메일 FOR PARENTS 미니멀화 + 메일 모바일 하단 잘림(외곽 패딩 트림) 수정
chk 'PARENTS_MINIMAL' automation/platform/40_signup.gs 1   # FOR PARENTS 본문 1문장 스탠자·코칭 각주 3문장 삭제(복원 금지)
chk 'EMAIL_BOTTOM_SPACER' automation/consultation/consultation-booking.gs 1   # 공용 emailShell 카드 아래 실콘텐츠 스페이서(모바일 Gmail 외곽 아래 패딩 트림 방어)
chk 'HOLD_MINIMAL' schedule.html 1   # 일정선택 임시고정 카드 미니멀화(불릿 3→1문장·안내 5→2줄·7일 중복 제거 · 2026-07-25 사용자 지시 — 불릿 복원 금지)
chk 'FAB_STACK_FIXED' mypage.html 1   # FAB 스택 인라인 position:relative 금지(첫방문 툴팁이 fixed 덮어써 FAB 3종 문서 흐름 추락 실사고 · 2026-07-25)
chk 'TOPFAB_STEADY' mypage.html 2   # 맨위로 FAB 자리 상시 확보+페이드(display 토글 금지 — 등장 때 내역·챗 밀림 · 2026-07-25 사용자 지시) CSS+JS
chk 'DASH_FALLBACK_FIX' mypage.html 2   # 단계·개인코드 폴백에서 전각 줄표 제거('확인 중'·빈칸) — stageList 빈 응답 시 실노출 확인(2026-07-25 /점검)
chk 'RESTORE_HONEST_HEAD' order-preview.html 1   # 식순 미저장 복원 착지 헤드 '불러왔어요'(완성됐어요 모순 수정 · 2026-07-25 사용자 발견 — 축하 헤드 복원 금지)
chk 'ORDER_OWNER' order-preview.html 5   # 식순 로컬 초안 계정 바인딩(who 스탬프·독립열람 미복원·임베드 계정 대조 폐기 — 2026-07-25 사용자 지시 · 계정 전환 누출 방지)
chk 'ORDER_OWNER' schedule.html 1   # 가능일 캐시 토큰별 키 분리(이전 계정 성함 잔상 방지)
chk 'PRODUCE_ENTRY_FIX' automation/platform/80_production.gs 2   # 제작 트랙·확인서 저장 시 입금완료→제작중 전이(기초정보 화면 폐지로 전이가 영영 안 걸리던 실사고 · 2026-07-25)
chk 'PRODUCE_ENTRY_FIX' automation/platform/85_invitation.gs 4   # 청첩장 4진입 전이(초안·발행 2경로·미리보기) — 재진입 발행만 하는 경로가 전이를 빠뜨리던 코워크 교차검증 치명1
chk 'EVENT_GATE_WIDE' automation/admin/admin.gs 2   # 시그니처 예식완료 진입 ['입금완료','제작중'] — 제작 미작업 고객이 예식 후 막다른길에 빠지던 문제(코워크 치명2). 단일 상수로 좁히지 말 것
chk 'SUBSTATUS_TRACKS' automation/admin/admin.gs 2   # 제작중 하위상태를 트랙 전체 기준으로(청첩장 단독 판정 복원 금지 · 코워크 주의2)
chk 'STAGE_FLOW_FENCE' automation/consultation/consultation-booking.gs 1   # 상품 흐름에 없는 단계 쓰기 차단(마지막 방어선 · 코워크 관찰1)
chk 'DEAD_ACTION_NOTE' automation/platform/85_invitation.gs 1   # 호출부 0건 죽은 액션 표기(이번 사고 원인 유형 재발 방지)
chk 'backfillProduceStage' automation/platform/80_production.gs 1   # 입금완료 고착 고객 단계 백필(드라이런 기본)
chk 'backfillProduceStageApply' automation/platform/80_production.gs 2   # 백필 실제반영 래퍼(GAS 편집기는 인자 실행 불가 · 삭제하면 운영자가 임시 함수를 매번 붙여야 함)
chk 'SNAP_PRODUCE_GUARD' automation/platform/85_invitation.gs 3   # 스냅 고객 청첩장 3진입 차단 — 스냅 flow엔 '제작중'이 없어 produce 전이 시 진행바·관리자 파이프라인 이탈(2026-07-25)
chk 'SCHED_MINIMAL' schedule.html 2   # 스케줄 페이지 미니멀 2차(AI 카드 헤더 1줄·Date Check 태그 제거·시간표 버튼→텍스트 링크·안내 박스 1문단·확정 절차 중복 제거·들여쓰기 통일 · 2026-07-25 사용자 지시 — 장식·중복 복원 금지)
chk 'SCHED_UX' schedule.html 5   # 스케줄 고객·디자인 디테일(전마감 안내·가능일 0 안내·다음달 잠금·입금자명 에러 문구·iOS 줌 방지 16px·달력 aria·체크박스 라벨 칼럼 정렬·AI 폼 높이 정렬 · 2026-07-25)
chk 'SCHED_AI_ROUTE' schedule.html 4   # 스케줄 막다른 안내를 카카오 대신 AI 도우미로 연결(openSchedAi·holdReveal 분리 래퍼 · 2026-07-25 사용자 지시 "카카오 연결 금지" — 카카오 문의 복원 금지)
chk 'SCHED_AI_CONSULT' schedule.html 2   # AI 도우미에 상담 가능일 전달(열린 날만·전마감 제외) + submit 중복 바인딩 가드(2026-07-25 사용자 승인 "상담 일정까지만 제한 허용")
chk 'SCHED_AI_CONSULT' api/schedule-advisor.js 3   # 상담 일정 intent·판정 분기(승인제 미적용·목록 상한) — 예식일 신비주의 규칙은 예식일에만 유지
chk 'PROD_BTN_UNIFORM' mypage.html 1   # 예식 준비 행 버튼 통일(min-width 104·국문 서체 통일 · 2026-07-25 사용자 지시 "우측 버튼 통일감·연속성")
chk 'DDAY_TIME' mypage.html 1   # 헤더 D-day 줄에 예식 시간 병기(D-81 · 오후 1:20 · 지난 뒤 생략 · 2026-07-25 사용자 지시)
chk 'DDAY_ONELINE' mypage.html 2   # 헤더 칩 한 줄 병기(예식 2026.10.14 · D-80 · 오후 1:20 · 2026-07-25 사용자 지시 "한 줄로" — 구 MPD_B1 별도 줄 복원 금지)
chk 'NAME_BADGE_LABEL' mypage.html 3   # 환영 영역 상품 알약 배지 폐지 → 상단 라벨 합류 'My Page · 시그니처'(2026-07-25 사용자 선택 C안 — 알약 배지·이름 옆 배치 복원 금지)
chk 'TRK_NO_SUB' mypage.html 6   # '예식 준비' 5행의 행 아래 설명(.trk-sub) 폐지 → 각 화면 안으로 이관(2026-07-25 사용자 지시) · ★준비 5행 설명 복원 금지 / '확인·전달' 2행(하객 안내·예식 확인서)은 사용자 지시로 설명 유지
# ── 2026-07-25 카톡 직행 차단 · AI 1차 응대(사용자 지시: "카톡으로 바로 들어오게 하지 말고 AI가 1차 해결 → 안 되면 그때 카톡")
chk 'KAKAO_AI_FIRST' assets/advisor-widget.js 1   # window.MEAdvisor(open·ask) 공개 API — 다른 화면의 문의 버튼이 카톡 직행 대신 AI 위젯을 연다. ★제거 시 호출부가 카톡 직행으로 폴백
chk 'KAKAO_AI_FIRST' mypage.html 3   # 내 내역 하단 카톡 직행 링크 삭제 + 예식일 변경 '무상 변경·면제'를 AI 위젯으로 라우팅. ★카톡 href 직행 복원 금지
_kkdirect=$(grep -c 'href="[^"]*pf\.kakao' mypage.html 2>/dev/null); _kkdirect=${_kkdirect:-0}; if [ "$_kkdirect" -gt 0 ]; then echo "REVERT? mypage.html: 카톡 직행 링크 부활($_kkdirect)"; fail=1; else echo "ok mypage.html: 카톡 직행 링크 없음(AI 1차 응대 유지)"; fi
# ── 2026-07-25 마이페이지 디자인 개선 배치 A(PLAN_마이페이지_디자인_개선.md · 5차 교차 점검 확정분)
chk 'MPD_A1' mypage.html 1                          # 잔금 게이트 '(1분)' 수치 약속 삭제(재추가 금지)
_a1=$(grep -c '(1분)' mypage.html 2>/dev/null); _a1=${_a1:-0}; if [ "$_a1" -gt 1 ]; then echo "REVERT? mypage.html: '(1분)' 소요시간 약속 부활($_a1)"; fail=1; else echo "ok mypage.html: '(1분)' 약속 없음(마커 주석 1건만)"; fi
chk 'MPD_A2' mypage.html 1                          # 렌더 전 placeholder 전각 줄표 → 공백
chk 'MPD_A3' mypage.html 1                          # 계약 카운트다운 만료 문구 해요체('기한이 지났어요')
chk 'MPD_A4' mypage.html 1                          # 로그인 네트워크 실패 기본 문구(무인자 showErr 금지)
# ── 2026-07-25 마이페이지 디자인 개선 PR②(실버그 G1~G3)
chk 'MPD_G1' mypage.html 2                          # 스냅 예약금 0 허위 차감 수정('|| 100000' 폴백 금지)+촬영 준비 어휘
_g1f=$(grep -c '예약금 || 100000' mypage.html 2>/dev/null); _g1f=${_g1f:-0}; if [ "$_g1f" -gt 0 ]; then echo "REVERT? mypage.html: 예약금 100000 폴백 부활($_g1f)"; fail=1; else echo "ok mypage.html: 예약금 100000 폴백 없음"; fi
chk 'MPD_G2' mypage.html 1                          # 취소·노쇼 로드맵 미노출
chk 'MPD_G3' mypage.html 1                          # 수락 버튼 로딩 상태
# ── 2026-07-25 마이페이지 디자인 개선 PR③(배치 B 확정분 B7~B14)
chk 'MPD_B7' mypage.html 1                          # D-n 구간 볼드 해제(줄당 강조 1개) — 2026-07-25 TRK_NO_SUB로 행 아래 fNote → 좌석 화면 _seatLeadNote로 이관(규칙 동일)
chk 'MPD_B8' mypage.html 1                          # 시스템체→해요체 전수(§7-3-⑤)
chk 'MPD_B9' mypage.html 2                          # 입력 16px(iOS 줌 방지)+좌석 포커스 16px
chk 'MPD_B10' mypage.html 2                         # 깜깜이 대기 보완('거의 다 됐어요' 삭제 포함)
_b10=$(grep -c '거의 다 됐어요. 준비되는 대로' mypage.html 2>/dev/null); _b10=${_b10:-0}; if [ "$_b10" -gt 0 ]; then echo "REVERT? mypage.html: '거의 다 됐어요' 근거 없는 안심 부활($_b10)"; fail=1; else echo "ok mypage.html: '거의 다 됐어요' 없음"; fi
chk 'MPD_B11' mypage.html 2                         # 터치 타깃 44px 1차 보정
chk 'MPD_B12' mypage.html 1                         # 보정 4주 구간 예상표 유지
chk 'MPD_B13' mypage.html 2                         # 막다른 에러 출구 표준화
chk 'MPD_B14' mypage.html 2                         # 버튼 한글·쿠폰 영문 eyebrow·이모지 ⏳⏰ 제거
_b14=$(grep -c '⏳\|⏰' mypage.html 2>/dev/null); _b14=${_b14:-1}; if [ "$_b14" -gt 1 ]; then echo "REVERT? mypage.html: 장식 이모지 ⏳/⏰ 부활($_b14 · 허용 1=hold 상태 아이콘)"; fail=1; else echo "ok mypage.html: 장식 이모지 ⏳⏰ 제거 유지($_b14)"; fi
# ── 2026-07-25 마이페이지 디자인 개선 PR④(배치 E · 위저드/접근성/성능)
chk 'MPD_E1' mypage.html 2                          # postcode 동기 로드 제거+lazy 주입
_e1=$(grep -c 'script src="//t1.daumcdn.net' mypage.html 2>/dev/null); _e1=${_e1:-0}; if [ "$_e1" -gt 0 ]; then echo "REVERT? mypage.html: postcode head 동기 로드 부활($_e1)"; fail=1; else echo "ok mypage.html: postcode 동기 로드 없음(lazy 유지)"; fi
chk 'MPD_E2' mypage.html 2                          # 저장 후 스크롤 보존(캡처+복원)
chk 'MPD_E3' mypage.html 2                          # api 12초 타임아웃+재시도 전환
chk 'MPD_E4' mypage.html 2                          # 텍스트 골드 대비(--gold-deep 5.7:1 · label-soft 다운)
chk 'MPD_E5' mypage.html 1                          # 초소형 폰트 하한 상향
chk 'MPD_E6' mypage.html 2                          # 토스트·NOW aria-live
chk 'MPD_E7' mypage.html 1                          # 자동저장 신호 확산(청첩장)
chk '담으면 바로 저장돼요' mypage.html 1            # 자동저장 신호(다이닝 담기)
chk '고른 내용은 나갈 때 자동으로 저장돼요' mypage.html 1   # 자동저장 신호(단체사진)
chk 'MPD_E8' mypage.html 1                          # 좌석 테이블 통삭제 확인
chk 'MPD_E9' mypage.html 2                          # 청첩장 경로별 단계 수
chk 'MPD_E10' mypage.html 3                         # note 적층 압축
# ── 2026-07-25 마이페이지 디자인 개선 PR⑤(배치 G 잔여 G4~G12 · G5는 보류)
chk 'MPD_G4' mypage.html 1                          # 변수 폴백=본값 정합(색 77곳)
_g4=$(grep -c 'var(--gold-deep,#9[aA]7' mypage.html 2>/dev/null); _g4=${_g4:-0}; if [ "$_g4" -gt 0 ]; then echo "REVERT? mypage.html: gold-deep 낡은 폴백 드리프트 부활($_g4)"; fail=1; else echo "ok mypage.html: gold-deep 폴백 정합 유지"; fi
chk 'MPD_G6' mypage.html 2                          # 맨 위로 FAB(ensureTopFab) — NOW 바로가기 앵커는 2026-07-25 사용자 지시로 삭제
chk 'MPD_G7' mypage.html 2                          # 내 내역 FAB 툴팁+계약 직후 안내
chk 'MPD_G8' mypage.html 1                          # 공통 :active 눌림 토큰
chk 'MPD_G9' mypage.html 1                          # 카피 미세 조정('두 분' 폴백 등)
chk 'MPD_G10' mypage.html 1                         # 용어 통일(예식 영상·보정본·사진작가)
_g10=$(grep -c '본식 영상' mypage.html 2>/dev/null); _g10=${_g10:-0}; if [ "$_g10" -gt 0 ]; then echo "REVERT? mypage.html: '본식 영상' 용어 부활($_g10)"; fail=1; else echo "ok mypage.html: '예식 영상' 용어 유지"; fi
chk 'MPD_G11' mypage.html 2                         # 계약 성사·제작 시작 환대 1줄
chk 'MPD_G12' mypage.html 1                         # 당일 칩 중립 톤·결측 꼬리·오버플로 가드
# ── 2026-07-25 마이페이지 2차 스프린트 PR①(B1~B6 위계·강조)
chk 'MPD_B1' mypage.html 2                          # D-day 별도 줄 승격(먹색 · G12 중립 톤 공존)
# (MPD_B2·TRK_NOW_TONE 폐지 2026-07-25 사용자 지시 "전부 똑같이 만들어줘" — 행 버튼 '지금 할 차례' 강조 자체를 삭제. 아래 TRK_BTN_SAME이 부활을 감시)
chk 'TRK_BTN_SAME' mypage.html 2   # 예식 준비·확인 전달 행 버튼 완전 동일(강조 없음) · ★진한 채움(.cc-btn)·골드 아웃라인(.trk-now) 복원 금지
chk 'TRK_ACT_RAIL' mypage.html 6   # 행 오른쪽 액션 열 단일 규격(.trk-act 104px 레일) — 결과물 카드만 6px 12px라 폭이 43px 벌어지던 것 통일. 카드별 개별 치수로 되돌리지 말 것(2026-07-26 사용자 지적)
#   위 레일을 인라인 치수(style="width:auto;padding:…")로 되돌리면 다시 카드마다 폭이 달라진다 — .trk 행 안의 ghost 버튼에 한해 금지.
_trkInline=$(grep -c 'cc-btn-ghost" style="width:auto;padding:[68]px 12px' mypage.html 2>/dev/null); _trkInline=${_trkInline:-0}
if [ "$_trkInline" -gt 0 ]; then echo "REVERT? mypage.html: 행 액션 버튼이 인라인 치수로 되돌아감($_trkInline) — .trk-act 레일을 쓸 것"; fail=1; else echo 'ok mypage.html: 행 액션 버튼 = .trk-act 공용 레일'; fi
#   행 자체엔 클릭 동작이 없다(핸들러 0건 실측) → 손가락 커서 부활 금지. 행 전체를 누르게 만들 땐 그 행에만 주고 이 가드도 함께 갱신.
_trkCur=$(grep -c '^\.trk{[^}]*cursor:pointer' mypage.html 2>/dev/null); _trkCur=${_trkCur:-0}
if [ "$_trkCur" -gt 0 ]; then echo "REVERT? mypage.html: .trk 행에 cursor:pointer 부활($_trkCur) — 동작 없는 행이 눌리는 것처럼 보인다"; fail=1; else echo 'ok mypage.html: .trk 행 커서 = default(헛클릭 유도 없음)'; fi
#   .trk-st의 gap 제거 금지 — flex라 자식 사이 공백 텍스트가 안 그려져 체크와 글자가 붙는다.
chk '.trk-list .trk-st{display:inline-flex;align-items:center;justify-content:center;gap:4px' mypage.html 1
chk 'res-relink' mypage.html 4   # 패널 안 '다시 보기'가 아래 CTA와 같은 높이로 쌓이게(<a>의 line-height 상속으로 혼자 낮던 것)
_trknow=$(grep -c 'trk-now' mypage.html 2>/dev/null); _trknow=${_trknow:-0}; if [ "$_trknow" -gt 1 ]; then echo "REVERT? mypage.html: 폐지된 행 버튼 강조(trk-now) 부활($_trknow)"; fail=1; else echo "ok mypage.html: 행 버튼 강조 없음(전부 동일)"; fi
chk 'MPD_B3' mypage.html 1                          # 계좌 복사 중립(이중 진사 해소)
chk 'MPD_B4' mypage.html 1                          # 취소류 텍스트 링크 강등
chk 'cc-btn-textlink' mypage.html 4                 # 강등 클래스 CSS+적용 3곳
chk 'MPD_B5' mypage.html 1                          # 추가보정 화살표 톤다운
chk 'MPD_B6' mypage.html 1                          # 후기 카피 정직화+필수 범례
_b6=$(grep -c '탭만 하면 끝나요' mypage.html 2>/dev/null); _b6=${_b6:-0}; if [ "$_b6" -gt 0 ]; then echo "REVERT? mypage.html: '탭만 하면 끝나요' 과장 카피 부활($_b6)"; fail=1; else echo "ok mypage.html: 후기 카피 정직화 유지"; fi
# ── 2026-07-25 마이페이지 2차 스프린트 PR②(구조 퀵윈 D4·D5·D6·C3·C5)
chk 'MPD_D4' mypage.html 1                          # NOW D-1/당일 정점 카피
chk 'MPD_D5' mypage.html 1                          # 진행중 행 진척 태그(청첩장 N/4·최종 N/3)
chk 'MPD_D6' mypage.html 1                          # 계약 전 결제 자물쇠 게이트
chk 'MPD_C3' mypage.html 1                          # 잠금 해제 시점 힌트
chk 'MPD_C5' mypage.html 1                          # 잔금 미니 카드 eyebrow 공용 패턴
# ── 2026-07-25 마이페이지 2차 스프린트 PR③(D1 경량분)
chk 'MPD_D1' mypage.html 2                          # 신청접수 신뢰 블록+확인서 장소 라인
chk 'TRUST_MINI' mypage.html 3                      # 신뢰 블록 조립+주입 2곳
# ── 2026-07-25 마이페이지 3차 스프린트 PR①(G5 만료 임박 배너 · GAS+프론트)
chk 'MPD3_G5' mypage.html 2                         # 만료 배너+자동 펼침(구 GAS 폴백)
chk 'MPD3_G5' automation/platform/80_production.gs 1   # buildResultState 전달일 필드
# ── 2026-07-25 마이페이지 3차 스프린트 PR②(D2 알림 딥링크 · GAS+프론트)
chk 'MPD3_D2' mypage.html 3                         # focus 캡처+소비 2곳+CSS
chk 'MPD3_D2' automation/platform/95_notify.gs 1    # _nfMy 매핑표
chk "_nfMy('" automation/platform/95_notify.gs 15   # 이벤트별 focus 부여(19곳)
# ── 2026-07-25 마이페이지 3차 스프린트 PR③(썸네일 갤러리 GAS · Phase 2 B안)
chk 'MPD3_GAL' automation/platform/80_production.gs 4   # 마이그레이션+갤러리 플래그+getResultGallery+배열 제출
chk 'MPD3_GAL' automation/admin/admin.gs 2              # 폴더ID 자동 추출+접근 검사 경고
chk 'MPD3_GAL' automation/consultation/consultation-booking.gs 1   # doPost 라우터
chk 'handleGetResultGallery' automation/platform/80_production.gs 1
# ── 2026-07-25 마이페이지 3차 스프린트 PR④(썸네일 갤러리 프론트)
chk 'MPD3_GALF' mypage.html 4                       # 갤러리 슬롯+로직+CSS(실패 시 번호 입력 폴백)
chk 'MPD3_GALF' admin.html 1                        # 관리자 고른 컷 썸네일
chk 'mp_pickManual' mypage.html 2                   # 번호 입력 폴백 래퍼(무회귀)
# ── 2026-07-25 마이페이지 4차 스프린트 PR①(C1 확정 카드 접기 · C2 시착 격 상향 · H6 보이스 가이드)
chk 'MPD4_C1' mypage.html 1                         # 확정 카드 핵심만 상시+접기(카드 전체 아코디언 아님)
chk 'MPD4_C2' mypage.html 2                         # 시착 진사 CTA+확인 체크(스펙 문구 고정)
chk '예약금 공제 안내를 확인했어요' mypage.html 1   # C2 법적 동의 문구(임의 변경 금지)
chk '§6-B 보이스 가이드' CLAUDE.md 1                # H6 참조 링크
chk '보이스 가이드 (H6 채택본' docs/plans/PLAN_마이페이지_디자인_개선.md 1
# ── 2026-07-25 마이페이지 4차 스프린트 PR②(F1 완료 확인 · F4 음료 바 하단 고정)
chk 'MPD4_F1' mypage.html 2                         # 저장-복귀 토스트 헬퍼+사진 경로(좌석은 인라인)
chk '_mpNextToast' mypage.html 3                    # 지연 토스트 배선(헬퍼+좌석+사진)
chk 'DRINK_SHEET' mypage.html 3                     # 음료 = 바닥 시트(2026-08-09) · 구 MPD4_F4 '떠 있는 작은 판' 폐지
# ── 2026-07-25 마이페이지 4차 스프린트 PR③(F2 SR 골격·포커스 복귀 · F3 칩 키보드화)
chk 'MPD4_F2' mypage.html 5                         # sr-only CSS+h1+NEXT h2+포커스 저장/복원
chk 'MPD4_F3' mypage.html 4                         # _kbChip 헬퍼+스냅·사진·큐시트 배선
chk '_kbChip' mypage.html 6                         # 헬퍼 정의+호출 5곳
# ── 2026-07-25 마이페이지 4차 스프린트 PR④(C3 명도 계단 · H3 blur 힌트 · H4 접기+내 완성물 · H5 1단계)
chk 'MPD4_C3' mypage.html 1                         # 잠긴 단계 명도 계단
chk 'MPD4_H3' mypage.html 3                         # blur 형식 힌트(헬퍼+ci+환불+이메일)
chk '_softHint' mypage.html 7                       # 헬퍼+배선 6곳
chk 'MPD4_H4' mypage.html 4                         # 완료 행 접기+내 완성물(CSS·조립·요약·게이트)
chk 'TRK_NO_FOLD' mypage.html 2                     # 완료 행 접기 폐지(2026-08-09) · .trk-fold 는 CSS까지 삭제 · 되살리지 말 것
# ── [REFUND_NO_NUDGE 2026-08-11 사용자 지시] 「내 내역」의 취소·환불 금액 계산 폐지 ──
# 옛 판: 접힌 <details> 안에 「지금 취소하시는 경우 · 840,000원」 + 위약금·공제 내역(서버 계산).
# 뺀 이유 — ①마이페이지에 계약 취소 버튼이 없다(누를 것 없는 금액은 알림이 아니라 암시다)
#   ②그 자리 스스로 「예상 · 취소 시점에 확정」이라 적었다(구속력 없이 기준점만 남는 수)
#   ③「내 내역」은 결제·서류를 보러 여는 곳이다. 열 때마다 「그만두면 얼마」가 서 있으면 안 된다.
# ★접점은 0 으로 만들지 않았다 — 계약서 위치 + 문의처를 한 줄로 남긴다(숨긴 모양이 더 나쁘다).
# ★서버 계산(l.refundQuote)은 살아 있다. admin.html 이 쓴다 — 없앤 것은 화면이지 능력이 아니다.
chk 'REFUND_NO_NUDGE' mypage.html 2
# ── [REFUND_ASK_AI 2026-08-11 사용자 지시 "카카오톡 말고 AI 채팅으로"] ──
# ★실제로 물어보고 바꿨다 — 라이브 /api/advisor 에 「9일 뒤 취소하면?」을 넣으니
#   「9~1일 전 50% 구간」이라고 규정을 짚고 정확한 금액은 사람에게 넘겼다. 지어내지 않는다.
# ★위치를 글로 설명하지 않는다(「오른쪽 아래」는 화면이 바뀌면 거짓이 된다) — 그 자리에서 연다.
# ★위젯이 없으면 단추를 안 그린다 — 눌러도 안 열리는 단추는 「고장」으로 읽힌다.
chk 'REFUND_ASK_AI' mypage.html 2
# ── [REFUND_STATE 2026-08-11 사용자 지시 "물어보는 사람 현황 파악해서 정확한 안내를"] ──
# 상담 도우미에 넘기는 상태에 **서버가 계산한 환불 견적**을 싣는다. 옛 판엔 없어서
# 도우미가 규정만 말하고 「사람이 확인해야」로 넘겼다(라이브 실측).
# ★★AI 에게 계산을 시키지 않는다 — 돈을 두 곳에서 셈하면 갈라지고, 갈라진 쪽이 고객에게 먼저 닿는다.
#   계약서 7조·9조로 셈하는 곳은 서버(_refundQuote) 하나다. 여기서는 말로 옮기기만 한다.
# ★수와 **근거일(dd·asOf)** 을 함께 싣는다 — 실측에서 배웠다. 일부러 어긋난 값을 넣으니
#   모델이 서버 값을 그대로 말했다. 서버가 이기는 건 옳지만 근거 없는 수는 권위만 얻는다.
# ★산정 못 하는 상태(벌수 미기록)는 「못 함」으로 적는다 — 라이브 실측에서 모델이 추측하지 않았다.
# ★이 자리는 틀려도 조용하다(필드 이름 하나면 줄이 통째로 빠진다) → check-mypage-shell 이 직렬화를 쏜다.
chk 'REFUND_STATE' mypage.html 1
chk 'REFUND_STATE' scripts/check-mypage-shell.mjs 2
chk '직접 다시 계산하지 말고' mypage.html 1
chk '금액을 추측해 말하지 말 것' mypage.html 1
nochk 'var rq = null;' mypage.html                 # ★환불 견적 싣기를 꺼 두지 말 것
# ── [REFUND_SHORTFALL 2026-08-11 실측] 「환불 0원」이 「더 낼 것 없음」으로 읽히는 자리 ──
# 서버는 refund 를 Math.max(0, …) 로 깎는다(70_journey.gs out()). 그런데 9조② 위약금은
# **총 계약금액** 기준이라, 예약금만 낸 사람이 예식 직전에 취소하면 0 원을 받는 게 아니라 차액을 낸다.
#   실측: 받은 금액 300,000 · 위약금 1,470,000(70%) · refund 0 → 도우미가 「환불은 0원입니다」로 단정.
#   1,170,000원을 더 내야 한다는 말은 어디에도 없었다.
# ★여기서도 계산하지 않는다 — 차액을 말하지 않고 「넘는다」는 사실만 알리고 사람에게 넘긴다.
#   돈을 두 곳에서 셈하지 않는다는 REFUND_STATE 원칙 그대로다.
# ★check-mypage-shell 이 두 방향을 쏜다(넘을 때 뜨나 · 안 넘을 때 안 뜨나) — 한 방향만 쏘면
#   「늘 뜨는 줄」도 통과하고, 그러면 멀쩡한 고객이 겁을 먹는다.
chk 'REFUND_SHORTFALL' mypage.html 1
chk 'REFUND_SHORTFALL' scripts/check-mypage-shell.mjs 3
chk 'rq.penalty > rq.paid' mypage.html 1
chk '위약금이 받은' scripts/check-mypage-shell.mjs 3   # 그물이 이 줄을 볼 수 있어야 한다(옛 그물은 못 봤다)
# ★[ASK_SENDS 2026-08-11] 내부 id 대신 공개 API(MEAdvisor.ask)를 쓰고 **질문까지 보낸다.**
#   단추가 「물어보기」라고 말하는데 빈 상자가 열리면 그 말이 거짓이 된다.
#   ★질문은 중립이다 — 이 자리에서 금액 상자를 뺀 이유가 「볼 때마다 취소하고 싶어진다」였다.
chk 'ASK_SENDS' mypage.html 1
chk 'MEAdvisor' mypage.html 1
chk '취소·환불 기준과 지금 기준 환불 예상액' mypage.html 1
nochk "getElementById('meAdvFab')" mypage.html      # ★내부 id 를 찌르지 말 것(공개 API 가 있다)
# ★이 자리를 **실제로 눌러 보는** 검사. 지우면 두 가지가 다시 조용히 죽는다 —
#   ①공개 API 이름이 어긋나 단추가 카카오톡 안내로 바뀌는 것 ②질문이 안 실려 빈 상자만 열리는 것.
#   돌연변이 넷(속성명 오타·질문 삭제·질문을 취소 선언으로·코드 구조 변경)에 전부 붉어지는 것을 확인했다.
chk 'ASK_SENDS' scripts/check-mypage-shell.mjs 9
chk 'mp_refundAsk' scripts/check-mypage-shell.mjs 3   # 코드를 떼어 오는 그물 · 놓는 단추 · 다시 찾기
# ★★[SLICE_WIDTH_READ 2026-08-11 실측 · ★15 재발] 떼어 오는 그물이 닫는 줄 들여쓰기를 **박으면 안 된다.**
#   처음 판은 `\n {2}\}, 0\);` 로 2칸 고정이었다. ★15 의 옛 `^          }$`(10칸 고정)와 같은 실수다.
#   실측 — 이 덩이의 닫는 줄을 4칸으로 정리하고 뒤에 2칸 `}, 0);` 로 끝나는 평범한 덩이를 하나 두니
#     그물이 그 사이를 통째로 삼켰고, eval 이 **남의 코드를 실행했다.** 검사는 조용히 초록이었다
#     (코드 떼옴=true · 눌림=true). 안 터지던 유일한 이유는 그런 줄이 파일에 하나뿐이라서 — 운이다.
#   → ★15 의 고침 셋 그대로: ①폭을 첫 줄에서 읽는다 ②넘치면 섞일 것을 그물로 본다 ③안쪽 깊이를 본다.
#   ★「넘쳤다」와 「못 떼어 왔다」를 다른 말로 알린다 — 뭉치면 사람이 정규식 탓으로 읽고 그물을 넓힌다.
chk 'SLICE_WIDTH_READ' scripts/check-mypage-shell.mjs 2
chk 'out.spilled' scripts/check-mypage-shell.mjs 2
chk '밖으로 넘쳤다' scripts/check-mypage-shell.mjs 1
# ★★[SLICE_DEPTH_NET 2026-08-12 실측] 옛 ③(「마지막 줄이 그 닫는 줄인가」)은 **구조상 늘 참이었다.**
#   조각을 바로 그 닫는 줄로 잘라 냈으니(indexOf → slice) 마지막 줄은 언제나 그것이다.
#   실측 — 880자·19줄(정상 16줄)을 삼킨 넘친 조각에서도 마지막 줄은 그대로 '  }, 0);' 였다.
#   즉 ③은 죽은 그물이었고 보호는 전부 ②(목록 그물) 하나에 얹혀 있었다 — ②는 「새는 날이 온다」고
#   그 자리에 스스로 적어 둔 그물이다. 그래서 **자른 자리 말고 안쪽 모양**을 본다:
#   머리와 닫는 줄 사이의 빈 줄 아닌 모든 줄은 머리보다 깊다. 목록이 없다.
#   ★②를 일부러 끄고 재서 ③만으로 넘침이 잡히는 것을 확인했다(끄기 전엔 초록이었다).
#   ★덩이 **전체**를 2칸 더 들여쓰는 정당한 재정렬에는 초록인 것도 확인했다(헛붉음 아님).
chk 'SLICE_DEPTH_NET' scripts/check-mypage-shell.mjs 1
# ★★[SENT_POLL 2026-08-12 실측] 거품이 떴는지를 **한 시각에 한 번** 보지 않는다.
#   옛 판은 클릭 뒤 900ms 에 한 번만 봤다. 따뜻한 판은 359ms(여유 540ms)인데
#   **차가운 판 첫 회에서 한 번 헛붉었다**(「상자에 실린 말=없음」·exit 1 · 다음 다섯 회는 통과).
#   야간 잡이 바로 그 차가운 판이다 — GitHub Actions 는 매번 크로미움을 처음 띄운다.
#   ★이 저장소 목록 11-b(「정착 전에 잰 값은 값이 아니다」)를 우리가 만든 자로 밟았다.
#   느슨해진 게 아니다 — 안 뜨면 여전히 붉는다(마감을 1ms 로 줄여 붉는 것을 확인).
chk 'SENT_POLL' scripts/check-mypage-shell.mjs 2
# ★[SENT_POLL 확산 2026-08-12] 같은 꼴이 **옆 검사에 둘 더** 있었다(클로드코드가 훑어 찾음).
#   check-listen-export ⑧ — 단추 누르고 200ms 뒤 한 번만 봄(글칸) · blur 뒤 200ms 뒤 한 번만 봄(되돌아온 글).
#   그리고 새로고침 뒤 waitForTimeout(2200) 로 목록이 실렸다 치고 바로 읽었다.
#   차가운 판에서 각각 「글칸을 못 찾았습니다」·「빈 채로 남았습니다」·「클립을 못 찾았습니다」로 헛붉는다.
#   → 뜰 때까지 25ms 마다 보고 3초에 포기(목록은 waitForFunction 15초). 안 나타나면 여전히 붉는다.
#   ★돌연변이 셋 전부 제 이름으로 붉는 것을 확인했다(되돌리기 없앰·input 때 되채움·글칸 안 그림).
chk 'SENT_POLL' scripts/check-listen-export.mjs 2
chk 'waitForFunction' scripts/check-listen-export.mjs 1
nochk 'setTimeout(r, 200)' scripts/check-listen-export.mjs   # ★한 시각에 한 번 보는 자로 되돌리지 말 것
# ★★★[SLICE_PAREN_MATCH 2026-08-12 실측] 범위를 **들여쓰기로 찾는 것을 그만뒀다.** 괄호를 맞춘다.
#   들여쓰기 그물을 세 판 만들었고 셋 다 구멍이 있었다 —
#     ①닫는 폭 2칸 박음 → 정당한 재정렬에 넘침  ②「마지막 줄이 닫는 줄인가」 → 구조상 늘 참(죽은 그물)
#     ③「안쪽은 머리보다 깊다」 → 남의 덩이 **머리를 더 깊게** 쓰면 지나간다(실측 · 880자·19줄 삼킴).
#   ★들여쓰기는 글의 모양이고 범위는 문법이다. 모양으로 문법을 흉내 내면 다음 구멍이 또 생긴다.
#   ★실측: 얕은 넘침·깊은 넘침·덩이 전체 재정렬 **셋 다** 정확히 16줄을 떼어 온다 —
#     넘침을 잡는 게 아니라 **일어나지 않게** 됐다. 못 맞추면 「못 정했다」로 붉는다(통과 아님).
chk 'SLICE_PAREN_MATCH' scripts/check-mypage-shell.mjs 2
chk 'out.unmatched' scripts/check-mypage-shell.mjs 1     # 세우는 자리
chk 'ask.unmatched' scripts/check-mypage-shell.mjs 1     # 읽는 자리 — 세워만 두고 안 읽으면 안 쏜 화살이다
chk '괄호로 못 맞췄다' scripts/check-mypage-shell.mjs 1
chk 'l.match(/\^\[ .t\]\*/)\[0\].length <= ind.length' scripts/check-mypage-shell.mjs 1   # 깊이로 재는 그 줄
#   ★nochk 로 「폭을 박은 정규식」을 금지하려다 접었다 — 그 파일의 **주석이 옛 정규식을 인용**하고 있어
#     깨끗한 나무에서도 붉었다(실측 1>0). 금지어 그물은 그 금지어를 설명하는 글까지 잡는다.
#     → 없어야 할 것을 세는 대신 **있어야 할 것**을 센다. 폭을 읽어 쓰는 그 줄은 글로 흉내 낼 수 없다.
#   ★2026-08-12 이 자리의 마커를 **정당하게 갈아 끼웠다.** 전엔 `+ ind + '}, 0);'`(폭을 읽어 닫는 줄을
#     만드는 그 줄)을 셌는데, 그 줄 자체가 SLICE_PAREN_MATCH 로 사라졌다 — 이제 끝을 들여쓰기로
#     찾지 않는다. 폐지된 것을 계속 세면 붉음이 거짓말이 되므로 아래 괄호 세는 줄로 옮긴다.
#     (ind 는 아직 산다 — ② 덤 그물이 쓴다. 다만 **범위를 정하는 것**은 더 이상 ind 가 아니다.)
chk 'if (d === 0) { endAt = i' scripts/check-mypage-shell.mjs 1
nochk '카카오톡으로 물어봐 주세요.</div>' mypage.html   # ★옛 안내로 되돌리지 말 것
# ── [SEAT_ADD_PLUS · DRINK_CENTER 2026-08-11 사용자 지시] ──
# 빈 자리 알약에서 '이름' 두 글자를 뺐다(30번 반복돼 정작 읽을 손님 이름을 묻었다).
#   ★보이는 ＋ 는 aria-hidden · 뜻은 버튼의 aria-label 이 진다. 글자를 도로 넣지 말 것.
# 음료 창을 바닥 시트에서 **가운데 대화상자**로 옮겼다. 옛 옛판(둥근 쪽지)으로 되돌아간 것이 아니다 —
#   정해진 폭 · 3열 격자 · 뒤를 덮는 어둠으로 그때의 문제 넷을 그대로 막은 채 가운데에 세웠다.
#   ★transform 으로 가운데를 잡지 말 것 — 자식 position:fixed 의 기준이 되어 어둠이 상자만 덮는다(실측).
#   ★어둠은 pointer-events:none — 막으면 다음 자리를 바로 못 누른다(25명 연달아 채우는 흐름).
chk 'SEAT_ADD_PLUS' mypage.html 1
# ── [ENTRY_OUT_TONE 2026-08-11 사용자 지시] 도착 직후 닫는 말을 입장 느낌 A~F 로 갈랐다 ──
# 입장 느낌은 이미 여섯인데 그 뒤 닫는 말이 하나여서, 어떤 느낌을 골라도 같은 말로 닫혔다.
# ★[ENTRY_OUT_PICK 2026-08-12 사용자 지시 "따로따로"] 위 두 줄이 바뀌었다 — **따로 고른다.**
#   옛 판은 「새로 묻지 않는다 · S.entry 가 이 멘트까지 정한다 · 전용 키를 두지 않는다」였다.
#   사용자가 화면을 보고 따로 고르겠다고 했다. 두 말은 서 있는 자리가 다르다 —
#   앞엣말은 문이 열리기 전 하객에게, 뒤엣말은 두 사람이 마주 선 뒤에 나온다.
#   ★키(entryOut)는 **묻는 화면과 같은 커밋**에 넣었다. 2026-08-11 에 키만 먼저 뒀다가
#     [PREVIEW_KEYS] 에 막혔고, 그때 「화면과 함께 되살릴 것」이라 적어 둔 그대로 했다.
#   ★빈값이면 종전대로 S.entry 를 따라간다 — 이미 저장해 둔 분들의 소리가 오늘 바뀌면 안 된다.
# ★A 는 슬러그를 안 바꾼다 — 문안 그대로라 52번 음원을 그대로 쓴다.
# ★★FILES 는 **파일 맨 끝**에 붙인다. 'narr-cake-out' 옆에 끼웠다가 fx-count 가 78→83 으로 밀려
#   이미 녹음된 78_fx-count.mp3 가 번호를 잃고, 새 클립이 78 을 가져가 한 번호에 두 소리가 됐다(실측).
chk 'ENTRY_OUT_TONE' assets/ritual-data.js 1
chk 'ENTRY_OUT_TONE' assets/ritual-cue.js 1
# ★[ENTRY_OUT_MIRROR 2026-08-11 사용자 발견] 빌더 화면도 느낌을 따라간다.
#   갈래를 엔진에만 넣었더니 **화면은 옛 한 줄을 계속 보여 줬다** — 적힌 것과 들리는 것이 달랐다.
#   NAR_MIRROR 는 문자열·{nar,end} 만 훑어서 {A..F} 꼴을 그냥 지나갔다.
#   ★꼴이 새로우면 그물도 새로 짠다 — 「기존 그물을 통과했다」는 「본 적 있다」가 아니다.
# ★[ORD_ASK_ONE · WAIT_PAST_PARENT 2026-08-12 사용자 폰 스크린샷] 알림 판이 **두 개 겹쳐** 떴다.
#   ①나가기 자가해제가 8초라 부모(GAS 12초 · mypage 1899행)가 답하기 전에 먼저 울었고
#   ②ordAsk 가 판을 무조건 append 해서 뒤이어 온 진짜 사유가 그 위에 쌓였다.
#   ★기다리는 자리는 둘(완료 저장·나가기)이고 같은 부모 호출을 본다 — 수를 따로 적지 말 것.
#     따로 적어 뒀던 것이 이 사고의 뿌리다(16000 대 8000).
chk 'ORD_ASK_ONE' order-preview.html 3
# ★★[REHEARSE_MERGED 2026-08-12 사용자 지시 "연습공간 없에고 미리듣기로 통합하자"]
#   완성 화면에 듣기 단추가 둘이었다(미리듣기 · 연습 공간 열기). 둘 다 「내 예식을 들어본다」라
#   무엇이 다른지 알 수 없었고, 고르는 일 자체가 일이 됐다.
#   ★연습 공간 화면·진입점 **폐지 — 되살리지 말 것**(제거 지시 보존 규칙).
#   ★대본 복사·파일 저장·당일까지 준비할 것은 **완성 화면에 남겼다.** 미리듣기 안에 못 넣는다 —
#     미리듣기는 ?S= 주소로 열리고 그 주소에는 고객이 쓴 글(서약문·편지)을 싣지 않기 때문이다.
#     「내가 준비한 말」이 빠진 대본은 연습에 쓸모가 없다.
chk 'REHEARSE_MERGED' order-preview.html 5
# ★[DONE_ACTS 2026-08-12 사용자 지시] 완성 화면 단추 셋을 한 덩어리로 · 사이 힌트 줄 폐지.
#   실측(390px): 미리듣기 354px 한 줄 · 대본 둘 173+173(gap 8) · 아래 문의/초기화도 173+173 반반.
#   ★위 .play-acts 와 아래 .done-acts 는 **다른 덩어리**다(이름이 비슷하니 주의).
chk 'play-acts' order-preview.html 5
chk 'DONE_ACTS_EVEN' order-preview.html 1
chk 'DONE_TAIL_QUIET' order-preview.html 2
nochk '흐름을 들어봐요' order-preview.html    # ★단추 이름이 이미 하는 말 — 셋 사이에 끼우지 말 것
# ★[REHEARSE_MERGED 뒷정리 2 · 2026-08-12] `mode` 변수도 걷었다 — 연습 공간이 사라져 값이 하나뿐이었다.
#   CSS 비계보다 **더 센 되살림 근거**다(「모드가 둘인데 하나가 비었네」로 읽힌다).
#   쓰던 자리 넷은 늘 참이던 조건이라 그대로 뺐고, 레일이 뜨는 세 자리를 실브라우저로 확인했다:
#     입장=block(노드 14) · 글 적어두기=block(노드 16 · 끝 노드 하나 더) · 코스=none.
nochk "var mode=" order-preview.html      # ★모드를 다시 만들지 말 것 — 두 번째 값은 폐지된 화면이다
nochk 'openRehearse' order-preview.html          # ★진입점을 되살리지 말 것
nochk 'function renderRehearse' order-preview.html
chk '전체 대본 복사' order-preview.html 1        # 연습 공간에서 옮겨 온 것 — 같이 사라지면 안 된다
chk '당일까지 준비할 것' order-preview.html 1
# ★[REHEARSE_MERGED 2026-08-12] 고객이 읽는 안내에서도 그 화면을 가리키던 줄을 고쳤다 —
#   「완성본을 이어듣고, **연습 공간에서** 당일을 미리 익혀요」가 그대로 남아 있었다.
#   화면을 지울 때 **그 화면을 가리키는 안내 문구까지** 같이 본다(비계보다 이쪽이 더 급하다 —
#   고객이 직접 읽고 없는 것을 찾으러 간다).
nochk '연습 공간에서 당일을' order-preview.html
chk '미리듣기로 이어들으며' order-preview.html 1
chk 'WAIT_PAST_PARENT' order-preview.html 2
chk 'PARENT_GIVEUP' order-preview.html 3      # 정의 1 + 기다리는 자리 2 · 하나라도 숫자로 되돌아가면 붉어진다
chk 'ORD_ASK_ONE' scripts/check-ord-dialog.mjs 9
# ★★[EXIT_SCAN_BOUNDED 2026-08-12 실측] 나가기 자가해제에 숫자가 박혔나 보는 확인은 **그 덩이 안만** 본다.
#   옛 판은 `[\s\S]*?` 로 파일 끝까지 훑었고, 안 터지던 이유는 그 뒤에 `},<숫자>)` 가
#   우연히 하나도 없어서였다. 실측 — 그 덩이 **뒤에** 무관한 `}, 200);` 한 줄을 두니
#   「나가기 자가해제가 숫자 200ms 로 박혀 있다」고 **헛붉었다**(멀쩡한 코드를 고치라고 말한다).
#   SLICE_WIDTH_READ 와 같은 병이다 — 비한정 스캔은 제 덩이 밖을 본다. 앵커 들여쓰기를 읽어 자른다.
#   ★앵커가 사라지면 「헛돌았다」로 붉는다 — 전엔 조용히 통과했다(안 쏜 화살 ★11-c).
chk 'EXIT_SCAN_BOUNDED' scripts/check-ord-dialog.mjs 1
chk 'exitHead' scripts/check-ord-dialog.mjs 3          # 앵커 읽기 · 들여쓰기 · 시작점
chk '헛돌았다' scripts/check-ord-dialog.mjs 1          # 앵커 실종을 조용히 넘기지 말 것
chk 'check-ord-dialog' .github/workflows/nightly-screen.yml 1   # [NO_GATE] 야간 잡이 돌린다(chk 는 줄 수를 센다)
chk 'ENTRY_OUT_TONE' order-preview.html 1
chk 'ENTRY_OUT\[S\.entryOut\]' order-preview.html 1     # 고른 값을 먼저 본다
chk 'ENTRY_OUT\[_eo||S\.entry\]' order-preview.html 1   # 안 고르면 입장 느낌으로 떨어진다
chk 'data-fk="entryOut' order-preview.html 2               # 고르는 칩 두 줄(「입장과 같이」 + A~F 반복)
# ★[ENTRY_SECT 2026-08-13 사용자 지시 "위부분처럼 느낌을 골라주세요 라는식으로 아래쪽으로 따로 빼자"]
#   도착 멘트 고르기를 입장 카드 **안**에서 꺼내 자기 절로 — 위 절과 같은 문법(라벨→칩→카드+들어보기).
#   들어보기는 순간 전체가 아니라 그 자리 클립만 낸다(SLUG_CUE · narr-entry-out 파일 이름으로 거른다).
#   실측 @390: 절 두 개 같은 문법 · 들어보기 2개 · C 고르면 80_narr-entry-out-C.mp3 한 개만 ·
#             「입장과 같이」면 입장 느낌을 따라간다(52_narr-entry-out.mp3) · 넘침 없음 · JS 오류 0
chk 'ENTRY_SECT' order-preview.html 5
chk '도착하면 이어서, 느낌을 골라주세요' order-preview.html 1
chk "playBtn('entryOut')" order-preview.html 1      # 아래 절에도 들어보기 — 위 절과 같은 문법
chk 'SLUG_CUE' order-preview.html 2                 # 그 자리 클립만 내는 배관(세우는 곳·읽는 곳·거르는 곳)
nochk '이 말만 따로 고르실 수도 있어요' order-preview.html   # ★옛 문구로 되돌리지 말 것 — 절 라벨이 그 말을 한다
# ★★[PREVIEW_UPTO 2026-08-12 사용자 지시 · 두 번째 요청] 미리듣기가 **걸어온 데까지만** 들려준다.
#   코스를 고르면 모든 순간이 기본값으로 채워져, 중간에 「저장 후 나가기」를 해도 폐식까지 흘렀다 —
#   두 분이 본 적 없는 뒷부분을 「고르신 순서 그대로」라며 들려주던 것이다.
#   _seenK(방문한 단계 키 · 이미 있던 것)를 S.seen 으로 실어 보내고 엔진이 거기서 끊는다.
#   ★키(seen)와 값을 만드는 곳(_embedSave)이 **같은 커밋**이다 — entryOut 때 배운 순서.
#   ★수를 말하지 말 것 — cues 는 한 순간에 둘씩 붙어 「N개 순서」가 거짓이 된다(실측 7 대 4).
#     무엇까지 들려주는지를 **이름**으로 말한다(uptoName).
#   ★자르는 것은 미리듣기뿐이다. 디렉터 콘솔은 당일 전체를 봐야 한다.
#   실측 — 끝까지 걸음: 큐 17 · 안 자름 / 중간(서약까지): 큐 10 · 「혼인 서약」까지 · 그 뒤 안 담음
chk 'PREVIEW_UPTO' assets/ritual-cue.js 1
chk 'PREVIEW_UPTO' order-preview.html 1
chk 'PREVIEW_UPTO' assets/ritual-preview-link.js 1
chk 'PREVIEW_UPTO' console.html 2
chk "'seen'," assets/ritual-preview-link.js 1        # 화이트리스트에 열린 키
chk 'S.seen = fin ?' order-preview.html 1        # [DONE_SEEN_EMPTY] seen 을 채우는 그 줄 — 완성 저장만 비운다(옛 _doneSaved 조건은 회신 뒤에야 참이라 틀렸다)
chk 'uptoName' assets/ritual-cue.js 3
nochk '개 순서는 아직' console.html                    # ★수를 말하지 말 것 — 큐와 순서는 단위가 다르다
chk 'ENTRY_OUT_MIRROR' scripts/check-ritual-mirror.js 1
chk 'entryOutBy' assets/ritual-data.js 1
chk '두 사람이 섰습니다' assets/ritual-data.js 1     # B 문안 — 갈래가 통째로 사라지면 붉어진다
chk 'narr-entry-out-F' assets/ritual-cue.js 1        # 다섯이 FILES 에 살아 있는가
chk 'S.entryOut' assets/ritual-cue.js 1        # ★[ENTRY_OUT_PICK] 이제 읽는다(값은 빌더 칩이 만든다)
chk '진짜 끝' assets/ritual-cue.js 1            # 번호 충돌 사고의 근거 — 지우면 다시 옆에 끼운다
chk 'DRINK_CENTER' mypage.html 2
chk 'pointer-events:none' mypage.html 1
nochk '＋ 이름' mypage.html
nochk 'seat-drinkbar{position:fixed;left:50%' mypage.html   # ★transform 중앙정렬로 되돌리지 말 것(어둠이 상자만 덮는다)
chk '취소·환불 기준은 <b>계약서</b>에' mypage.html 1
nochk 'led-refund' mypage.html                      # ★접기 상자·CSS 되살리지 말 것
nochk '지금 취소하시는 경우' mypage.html            # ★금액 문구 되살리지 말 것
chk 'MPD4_H5' mypage.html 3                         # led-foot(CSS·헬퍼·배선)
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR①(AA1 긴급 신호 · AA3 파괴 클래스 · AA9 쿠폰 과잉 완화)
chk 'ADM_AA1' admin.html 3                          # 긴급 큐 색 바+배지 CSS+렌더
chk 'urg-badge' admin.html 2                        # 급함 배지(0건이면 미출력)
chk 'ADM_AA3' admin.html 1                          # 파괴 계열 danger 통일(가역 액션 제외 기준)
_aa3=$(grep -c "ab('cancel','[^']*','btn-ghost')" admin.html 2>/dev/null); _aa3=${_aa3:-0}; if [ "$_aa3" -gt 0 ]; then echo "REVERT? admin.html: 취소 버튼 btn-ghost 복귀($_aa3)"; fail=1; else echo "ok admin.html: 취소=danger 통일 유지"; fi
chk 'ADM_AA9' admin.html 1                          # 쿠폰 회수 danger 제거
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR②(AA2 동사 사전 · AA4 백오피스 톤)
chk 'ADM_AA2' admin.html 1                          # 액션 라벨 동사 사전(확인/처리/착수/등록)
chk '결과물 전달 처리' admin.html 3                 # delivered 라벨 통일(큐+상세 2곳)
_aa2=$(grep -c "결과물 전달 완료 처리" admin.html 2>/dev/null); _aa2=${_aa2:-0}; if [ "$_aa2" -gt 0 ]; then echo "REVERT? admin.html: delivered 이중 라벨 부활($_aa2)"; fail=1; else echo "ok admin.html: delivered 라벨 단일 유지"; fi
chk 'ADM_AA4' admin.html 1                          # 값 없음 자리표시 하이픈(전각 줄표 금지)
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR③(AA5 붙여넣기 · AA6 최근 본 고객 · AA7 자동 갱신)
chk 'ADM_AA5' admin.html 3                          # 붙여넣기 헬퍼+링크 필드+CSS
chk '_linkField' admin.html 4                       # 정의 1 + 결과물 링크 3필드
chk 'ADM_AA6' admin.html 5                          # 최근 본 고객(CSS·자리·저장·렌더·적재)
chk 'RECENT_KEY' admin.html 3                       # localStorage 키(정의+읽기+쓰기)
chk 'ADM_AA7' admin.html 7                          # 조용한 폴링(가드·틱·시작/정지·배선)
chk '_pollSkip' admin.html 2                        # 폴링 건너뛰기 가드(정의+호출)
chk '_silentN' admin.html 5                         # 조용한 갱신 카운터(진행바 억제)
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR④(AA8 벌수 중복 저장 · AA10 오래 기다린 것 분리)
chk 'ADM_AA8' admin.html 2                          # 인라인 저장 직후 같은 값이면 재저장 생략
chk 'ADM_AA10' admin.html 2                         # 7일+ 대기 별도 묶음(대기 일수 헬퍼+렌더)
chk '_waitDays' admin.html 2                        # 대기 일수 계산(정의+분류)
chk '오래 기다린 것' admin.html 1                    # 방치 묶음 헤더
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR⑤(AB1 금액·입금자 · AB2 환불 예상 · AB4 알림 예고)
chk 'ADM_AB1' admin.html 4                          # 금전 확인 모달 근거(헬퍼+큐 전달+상세 전달)
chk '_payFacts' admin.html 5                        # 라벨/값 칸(정의+모달 4곳)
chk '_payRows' admin.html 5                         # 값 조립(정의+모달 4곳)
chk 'ADM_AB2' admin.html 3                          # 환불 예상 단일 원천(헬퍼+카드+모달)
chk '_rqLine' admin.html 4                          # 환불 한 줄 헬퍼(정의+카드+모달 2)
chk 'ADM_AB4' admin.html 1                          # 결과물 링크 저장 = 고객 알림 예고
chk '처음 등록하면 고객에게 도착 알림이 바로 가요' admin.html 1   # 실제 조건(상태 전이 1회)에 맞춘 문구
# ── 2026-07-26 관리자 페이지 1차 스프린트 PR⑥(AB3 알림 예고·토스트 정직화)
chk 'ADM_AB3' admin.html 8                          # 자동 발송 모달 예고 7 + 토스트 분기
chk '카톡이 자동으로 가요' admin.html 7             # 자동 발송 액션 예고문(결과물 등록은 AB4 문구로 대체)
chk 'NH_AUTO' admin.html 4                          # 자동/무발송 플래그(정의+주석+분기)
chk '이 확인은 고객 알림이 따로 가지 않아요' admin.html 1   # 입금 확인 3종 토스트(거짓 '잊지 마세요' 폐기)
_ab3=$(grep -c "카톡 알림 잊지 마세요" admin.html 2>/dev/null); _ab3=${_ab3:-0}; if [ "$_ab3" -gt 0 ]; then echo "REVERT? admin.html: 자동 발송인데 '잊지 마세요' 토스트 부활($_ab3)"; fail=1; else echo "ok admin.html: 알림 토스트 정직화 유지"; fi
# ── 2026-07-26 관리자 페이지 2차 스프린트 PR①(AC1 입금 확인 취소 · 차단 조건 6종은 조건별로 감시)
chk 'ADM_AC1' automation/admin/admin.gs 2           # 되돌리기 코어+FNS 등록
chk 'ADM_AC1' admin.html 5                          # 버튼 3 + 디스패처 + 모달
chk 'UNDO_WINDOW_HOURS' automation/admin/admin.gs 4  # 되돌리기 허용 시간 상수(정책값)
chk 'adminUndoConfirmPreview' automation/admin/admin.gs 2   # dry-run 진입점(정의+FNS)
chk "block: 'A'" automation/admin/admin.gs 1        # 카드 확정분 차단(동의기록.결제수단)
chk "block: 'B'" automation/admin/admin.gs 1        # 현금영수증 발행분 차단(콤보 키 포함)
chk "block: 'C'" automation/admin/admin.gs 1        # 단계 전진 차단(계약금 한정 — 중도금·잔금엔 적용 금지)
chk "block: 'D'" automation/admin/admin.gs 1        # 종료 고객 차단
chk "block: 'E'" automation/admin/admin.gs 2        # 시간 경과·시각 미상 차단
chk "block: 'F'" automation/admin/admin.gs 1        # 환불 정산 완료 건 차단
# ── 2026-07-26 관리자 페이지 2차 스프린트 PR②(AC2 환불 완료 표시 취소)
chk 'ADM_AC2' automation/admin/admin.gs 2           # 되돌리기 함수+FNS 등록
chk 'ADM_AC2' admin.html 3                          # 버튼+디스패처+모달
chk 'adminUndoRefunded' automation/admin/admin.gs 2  # 정의+FNS
# ── 2026-07-26 관리자 페이지 2차 스프린트 PR③(AC3 강제변경 안전 게이트)
chk 'ADM_AC3' automation/admin/admin.gs 4           # report 모드+미리보기+FNS
chk 'ADM_AC3' admin.html 5                          # 비선택 기본값·미리보기·게이트·인라인 힌트·CSS
chk 'adminForceStagePreview' automation/admin/admin.gs 2   # dry-run 진입점(정의+FNS)
chk '_forceGate' admin.html 3                       # 체크 전 실행 버튼 비활성
chk 'adv-prev' admin.html 6                         # 미리보기 박스(CSS+렌더)
# [ADM_AC3FIX 2026-07-26] _clearForwardData는 미리보기(dry-run)도 함께 쓰는 계산 함수 — 본문에 외부 부작용이 있으면
#   단계를 골라보기만 해도 가예약 캘린더 슬롯이 실제로 풀린다(6차 검증 AC3-BUG). 본문 안 _holdCalDelete( 호출은 0곳이어야 한다.
_ac3fix=$(awk '/^function _clearForwardData/{f=1} f{print} f&&/^}/{exit}' automation/admin/admin.gs 2>/dev/null | grep -c '_holdCalDelete(')
_ac3fix=${_ac3fix:-0}
if [ "$_ac3fix" -gt 0 ]; then echo "REVERT? automation/admin/admin.gs: _clearForwardData 본문에 _holdCalDelete 부작용 부활($_ac3fix) — 미리보기가 캘린더를 지운다"; fail=1; else echo "ok automation/admin/admin.gs: _clearForwardData 본문에 캘린더 삭제 부작용 없음"; fi
chk 'ADM_AC3FIX' automation/admin/admin.gs 3        # 계산 함수에서 부작용 분리 + 실행 경로 이동
chk 'ADM_AC1B' admin.html 2                         # 번들 되돌리기(콤보 버튼 + 모달 안내)
# [ADM_DELIVDATE 2026-07-26 사용자 결정] 보관 시계(결과물전달일·보관만료통지·결과물파기)는 '결과물전달' 그룹 — 설문 그룹에 되돌려 붙이면
#   후기→결과물전달 롤백이 보관 6개월 기산일까지 지운다(전달은 그대로인데 만료 통지·배너 근거만 사라짐).
chk 'ADM_DELIVDATE' automation/admin/admin.gs 1     # 보관 시계 그룹 분리
# [ADM_MONEYNUM 2026-07-26 점검] 시트 금액이 문자('3,500,000'·'₩2,800,000원')로 오면 Number()가 NaN → 화면에 '총액 NaN원'.
#   서버 _wonNum과 같은 기준(숫자만 추출)으로 프론트도 통일. 금액 표기는 전부 _moneyNum 경유.
chk 'ADM_MONEYNUM' admin.html 2                     # 헬퍼 + 추가보정 수량·금액
chk '_moneyNum' admin.html 16                       # 금액 표기 경유 지점
_dd=$(grep -c "at: '후기', consent:" automation/admin/admin.gs 2>/dev/null); _dd=${_dd:-0}
if [ "$_dd" -gt 0 ]; then echo "REVERT? automation/admin/admin.gs: 보관 시계 키가 설문('후기') 그룹으로 복귀($_dd)"; fail=1; else echo "ok automation/admin/admin.gs: 보관 시계 = 결과물전달 그룹 유지"; fi
_ac3=$(grep -c "STAGE_EX.map(function(s){ return '<option value=\"'+esc(s)+'\"'+(s===d.stage?' selected':'')" admin.html 2>/dev/null); _ac3=${_ac3:-0}; if [ "$_ac3" -gt 0 ]; then echo "REVERT? admin.html: 강제변경 드롭다운 기본 선택 부활($_ac3)"; fail=1; else echo "ok admin.html: 강제변경 드롭다운 비선택 기본값 유지"; fi
# ── 2026-07-26 관리자 페이지 2차 스프린트 PR④(AC4 월 사업현황 · 아침 메일 1줄)
chk 'ADM_AC4' automation/admin/admin.gs 1           # 읽기 전용 집계(실입금 기준)
chk 'ADM_AC4' automation/platform/96_ai_cost.gs 1   # 아침 보고 한 줄 배선
chk 'monthBusinessData' automation/admin/admin.gs 1  # 집계 함수
chk 'monthBusinessData' automation/platform/96_ai_cost.gs 2   # 호출부
# ── 2026-07-26 관리자 페이지 2차 스프린트 PR⑤(AC5 카톡 문구 복사 · AB1-보완 서버 금액)
chk 'ADM_AC5' automation/admin/admin.gs 2           # 문구 제공 함수+FNS
# [REV_ROUND_NOTE 2026-07-26 점검] 무료 재보정 2회차 이상 관리자 경고 — 계약서 §12②(1회·14일) vs 서버 무제한 격차의 사람-판단 신호.
#   ★서버 회차 차단으로 바꾸지 말 것 — 같은 조 ③이 '하자 재작업은 횟수·기간 제한 없음'이라 일괄 차단은 계약 위반이 된다.
chk 'REV_ROUND_NOTE' admin.html 1
chk 'ADM_AC5' admin.html 1                          # 복사 버튼 헬퍼
chk 'adminNotifyText' automation/admin/admin.gs 2   # 정의+FNS
chk '_copyNotifyBtn' admin.html 4                   # 정의 + 알림 없는 3종 모달
chk 'ADM_AB1B' automation/admin/admin.gs 1          # 서버 마일스톤 금액
chk 'ADM_AB1B' admin.html 1                         # 프론트는 받아 쓰기만
chk 'milestoneAmounts' automation/admin/admin.gs 2  # 조립
chk 'milestoneAmounts' admin.html 1                 # 사용(산식 복제 금지)
_ab1b=$(grep -c "_amtKo(r\['계약총액'\])" admin.html 2>/dev/null); _ab1b=${_ab1b:-0}; if [ "$_ab1b" -gt 0 ]; then echo "REVERT? admin.html: 입금 확인 모달에 '계약 총액' 표기 부활($_ab1b)"; fail=1; else echo "ok admin.html: 입금 확인 모달 금액=마일스톤 금액 유지"; fi
# ── 2026-07-25 마이페이지 결과물 섹션(사용자 지적 2건 · 헌장 8·9)
chk 'PICK_TRUTH' mypage.html 3                    # 표시=선택 기록 / 잠금=상태 분리(거짓 '✓ 선택 완료' 재발 방지)
chk 'hasPick' mypage.html 5                         # 정의 + ②행·미니라인·제출 버튼 라벨
_pt=$(grep -c "picked ? chipOk(res.선택수" mypage.html 2>/dev/null); _pt=${_pt:-0}; if [ "$_pt" -gt 0 ]; then echo "REVERT? mypage.html: ②행 완료 칩이 상태 기준으로 되돌아감($_pt)"; fail=1; else echo 'ok mypage.html: ②행 완료 칩=실제 선택 기록 기준 유지'; fi
_ar=$(grep -c ' ↗' mypage.html 2>/dev/null); _ar=${_ar:-0}; if [ "$_ar" -gt 0 ]; then echo "REVERT? mypage.html: 외부 링크 화살표(↗) 부활 $_ar곳 — 디자인 헌장 8(2026-07-25 사용자 지시)"; fail=1; else echo 'ok mypage.html: 외부 링크 화살표(↗) 0곳 유지'; fi
# ── 2026-07-25 '후기' 단계 승격(PLAN_후기단계_추가 · 관리자 강제이동 지원)
chk 'STAGE_REVIEW' automation/platform/00_platform-config.gs 3   # STAGE_FLOW 두 배열·데이터검증·nextAction에 '후기'
chk 'STAGE_REVIEW' automation/platform/80_production.gs 2        # RESULT_STAGES 후기 포함 + 설문 제출 단계 가드
chk 'STAGE_REVIEW' automation/admin/admin.gs 10                  # 큐·보드·아카이브·롤백·강제이동 후기 반영
chk 'STAGE_REVIEW' admin.html 4                                  # STAGE_COLOR·STAGE_FLOW 폴백·stageCards·결과물 액션
chk 'STAGE_REVIEW' mypage.html 7                                 # 합성 폴백·라벨·로드맵·리터럴 4종
# ★최고위험 2곳 — 값 자체 확인(주석이 아니라 실제 배열/코드)
_rs=$(grep -c "RESULT_STAGES = \['예식완료', '촬영완료', '결과물전달', '후기'\]" automation/platform/80_production.gs 2>/dev/null); _rs=${_rs:-0}
if [ "$_rs" -lt 1 ]; then echo "REVERT? 80_production.gs: RESULT_STAGES에 '후기' 누락 — 후기 단계 고객의 결과물·갤러리·설문 카드가 통째로 사라짐"; fail=1; else echo "ok 80_production.gs: RESULT_STAGES 후기 포함"; fi
_sf=$(grep -c "'결과물전달', '후기'\]," automation/platform/00_platform-config.gs 2>/dev/null); _sf=${_sf:-0}
if [ "$_sf" -lt 1 ]; then echo "REVERT? 00_platform-config.gs: STAGE_FLOW 시그니처에 '후기' 누락"; fail=1; else echo "ok 00_platform-config.gs: STAGE_FLOW 후기 포함"; fi
# 음수 가드 — 마이페이지 합성 스텝 '무조건' 재삽입 감지(조건부 폴백만 허용)
_cc=$(grep -c "^      list = list.concat(\['후기'\]);" mypage.html 2>/dev/null); _cc=${_cc:-0}
if [ "$_cc" -gt 0 ]; then echo "REVERT? mypage.html: 후기 합성 스텝 무조건 재삽입 부활($_cc) — 후기 2회 표시·STEP N/11 부풀음"; fail=1; else echo "ok mypage.html: 후기 합성은 조건부 폴백만(구 GAS 대비)"; fi
# ── 2026-07-26 링크 스킴 가드(시트 셀 직접 수정 경로의 저장형 XSS 차단)
chk 'SAFE_URL' mypage.html 1                                           # 헬퍼 정의 + 근거 주석
_su=$(grep -c 'safeUrl(' mypage.html 2>/dev/null); _su=${_su:-0}
if [ "$_su" -lt 10 ]; then echo "REVERT? mypage.html: safeUrl 적용 지점 감소($_su<10) — javascript: 주소가 href로 새는 경로 재개방"; fail=1; else echo "ok mypage.html: 링크 스킴 가드 적용 $_su곳"; fi
[ -f scripts/audit/mypage-fuzz.mjs ] && echo 'ok scripts/audit/mypage-fuzz.mjs: 극단입력 퍼즈 하네스 존재' || { echo 'REVERT? scripts/audit/mypage-fuzz.mjs 삭제됨 — 링크스킴·오염 상시 회귀 소실'; fail=1; }
[ -f scripts/audit/review-stage-sim.mjs ] && echo 'ok scripts/audit/review-stage-sim.mjs: 후기 단계 서버 회귀 존재' || { echo 'REVERT? review-stage-sim.mjs 삭제됨'; fail=1; }

# ── 2026-07-25 전달완료 시 NEXT 자물쇠 동기화(열린 카드와 자물쇠 동시 표시 금지)
chk 'DELIV_NEXT_SYNC' mypage.html 1                                    # 후기 폼이 열려 있는데 '후기'가 잠긴 다음 단계로도 보이던 모순
_dn=$(grep -c "it\[0\] !== '후기' && it\[0\] !== '결과물 전달'" mypage.html 2>/dev/null); _dn=${_dn:-0}
if [ "$_dn" -lt 1 ]; then echo "REVERT? mypage.html: 전달완료 NEXT 필터 소실 — 후기 폼과 후기 자물쇠가 같은 화면에 다시 뜬다"; fail=1; else echo 'ok mypage.html: 전달완료면 결과물·후기 자물쇠 제외'; fi

# ── 2026-07-25 Customers 헤더 순서 정합(setupCustomers 재실행이 '라벨만' 밀어 써서 열이 오정렬되는 사고 방지)
chk 'HEADER_ORDER_GUARD' automation/platform/10_customers-setup.gs 2   # 덮어쓰기 전 시트 헤더 대조 후 중단(데이터 무변경)
chk 'HEADER_ORDER_LIVE' automation/platform/00_platform-config.gs 1    # 리터럴 순서 = _prodCreateOrder(meta 마지막) 고정 근거
chk 'HEADER_ORDER_AUDIT' automation/platform/10_customers-setup.gs 1   # 읽기 전용 실측 진단(checkCustomerHeaderOrder) — 리터럴 정정 전 근거
chk 'HEADER_ORDER_MEASURED' automation/platform/00_platform-config.gs 1   # 원본폴더ID 59열 = 2026-07-26 운영 시트 실측 근거(추측 금지)
chk 'PII_GAL' automation/platform/20_customers-data.gs 1             # 원본폴더ID도 파기 대상(원본링크만 비우면 같은 폴더가 그대로 남음)
# 꼬리 10열의 '상대 순서'를 본다 — 안내공유토큰 → 원본폴더ID → 제작 7 → 제작_meta(마지막).
#   이 순서가 2026-07-26 운영 시트 실측(67열)과 같아야 setupCustomers가 HEADER_ORDER_GUARD를 통과한다.
#   CUSTOMER_HEADERS 블록만 잘라내 라벨 등장 순서를 비교하므로 줄바꿈·들여쓰기·따옴표 스타일이 바뀌어도
#   오탐이 나지 않는다(구버전은 한 줄 완전일치라 포맷팅만으로 RED였다).
# (주석 줄에도 라벨이 예시로 등장하므로 // 뒤를 잘라내고 실제 배열 원소만 본다)
_hlblk=$(awk '/^var CUSTOMER_HEADERS = \[/,/^\];/' automation/platform/00_platform-config.gs 2>/dev/null | sed 's|//.*||')
_hlseq=$(printf '%s' "$_hlblk" | grep -oE "안내공유토큰|원본폴더ID|제작_(ritual|dining|seat|guideinfo|snap|final|invitation|meta)" | tr '\n' ',')
_hlexp='안내공유토큰,원본폴더ID,제작_ritual,제작_dining,제작_seat,제작_guideinfo,제작_snap,제작_final,제작_invitation,제작_meta,'
if [ "$_hlseq" != "$_hlexp" ]; then echo "REVERT? 00_platform-config.gs: CUSTOMER_HEADERS 꼬리 순서가 운영 시트 실측(2026-07-26 · 67열)과 어긋남 — setupCustomers가 라벨을 밀어 쓴다 / 실제=$_hlseq"; fail=1; else echo 'ok 00_platform-config.gs: 꼬리 순서 = 운영 시트 실측(안내공유토큰→원본폴더ID→제작7→meta)'; fi
# 위 검사는 꼬리 10개만 본다 — 앞쪽(예: 잔금상태↔중도금상태 자리 바꿈·설문일시 삭제)은 못 잡는다.
#   그래서 전체 라벨 시퀀스를 개수 + 해시로 함께 고정한다. 열을 정당하게 추가·변경했다면 이 두 값도 같은 커밋에서 갱신할 것
#   (갱신 자체가 '헤더를 건드렸다'는 신호 — 운영 시트와의 정합을 checkCustomerHeaderOrder로 확인하고 넘어가라는 뜻).
_hcnt=$(printf '%s' "$_hlblk" | grep -oE "'[^']*'" | tr -d "'" | grep -c .)
_hexp_cnt=67
if [ "$_hcnt" != "$_hexp_cnt" ]; then echo "REVERT? 00_platform-config.gs: CUSTOMER_HEADERS 개수 $_hcnt (기대 $_hexp_cnt) — 열 추가·삭제 시 이 값과 아래 해시를 같은 커밋에서 갱신할 것"; fail=1; else echo "ok 00_platform-config.gs: CUSTOMER_HEADERS $_hcnt개"; fi
_hmd=''
if command -v md5sum >/dev/null 2>&1; then _hmd=$(printf '%s' "$_hlblk" | grep -oE "'[^']*'" | tr -d "'" | tr '\n' ',' | md5sum | cut -c1-12)
elif command -v md5 >/dev/null 2>&1; then _hmd=$(printf '%s' "$_hlblk" | grep -oE "'[^']*'" | tr -d "'" | tr '\n' ',' | md5 -q | cut -c1-12); fi
_hmd_exp='864f743024db'
if [ -z "$_hmd" ]; then echo 'skip CUSTOMER_HEADERS 시퀀스 해시 (md5 도구 없음)'
elif [ "$_hmd" != "$_hmd_exp" ]; then echo "REVERT? 00_platform-config.gs: CUSTOMER_HEADERS 전체 시퀀스 변경($_hmd ≠ $_hmd_exp) — 라벨 이름·순서가 조용히 바뀌었다. 의도한 변경이면 이 기대값을 같은 커밋에서 갱신"; fail=1
else echo 'ok 00_platform-config.gs: CUSTOMER_HEADERS 전체 시퀀스 해시 일치'; fi
# 음수 가드 — 구 리터럴 순서(meta 먼저) 부활 감지
_hm=$(grep -c "'제작_meta', '제작_ritual'" automation/platform/00_platform-config.gs 2>/dev/null); _hm=${_hm:-0}
if [ "$_hm" -gt 0 ]; then echo "REVERT? 00_platform-config.gs: meta-first 헤더 순서 부활($_hm) — 운영 시트와 한 칸씩 어긋남"; fail=1; else echo 'ok 00_platform-config.gs: meta-first 순서 미부활'; fi
# ── 2026-07-26 저장소 위생: 루트 __*.html 화면 비교용 임시 사본 재유입 차단
#   실사고: __b5/__b7/__b9/__before4.html(각 ~690KB · mypage.html 전체 사본)이 기획 커밋에 딸려 들어가
#   momentedit.kr에 공개 배포됨. 넷 다 실서비스 GAS를 그대로 호출하는 '작동하는' 옛 클라이언트였고
#   TRACK_REV_GUARD·PROD_MULTITAB·V2_DRAFT_NOTICE·ORDER_OWNER 방어장치가 0건이라
#   그 사본으로 저장하면 충돌 감지 없이 다른 기기의 트랙을 덮어쓸 수 있었다.
#   .gitignore·.vercelignore 2중 장치 + 이 가드로 3중. 루트 __*.html은 항상 0개여야 한다.
_stray=$(git ls-files | grep -cE '^__.*\.html$'); _stray=${_stray:-0}
if [ "$_stray" -gt 0 ]; then echo "REVERT? 루트 __*.html 임시 사본 재유입($_stray개) — 배포 노출 위험 · git rm 후 .gitignore 확인"; git ls-files | grep -E '^__.*\.html$' | sed 's/^/    /'; fail=1; else echo 'ok 루트 __*.html 임시 사본 0개 유지'; fi
_ign=$(grep -c '^__\*\.html$' .gitignore 2>/dev/null); _ign=${_ign:-0}
_vig=$(grep -c '^__\*\.html$' .vercelignore 2>/dev/null); _vig=${_vig:-0}
if [ "$_ign" -lt 1 ] || [ "$_vig" -lt 1 ]; then echo "REVERT? __*.html 무시 규칙 소실(.gitignore=$_ign .vercelignore=$_vig)"; fail=1; else echo 'ok __*.html 무시 규칙 .gitignore+.vercelignore 유지'; fi

# ── 2026-07-26 관리자 화면 눈확인에서 잡은 3건(체크박스 특이도 · noop 가드 · 조사 오타)
chk 'ADM_GATE_CB' admin.html 1                     # 강제변경 동의 체크박스가 .adv-body 공통 입력 규칙(전폭 46px·appearance:none)에 안 먹히게 하는 규칙 · ★공통 규칙 '뒤'에 두어야 함 · 삭제 금지
                                                   #   ※ 위치 제약 없음(2026-07-26 GATE_AT_EXIT 이후) — 판정이 EXIT 트랩으로 옮겨져 어디에 두든 살아 있다. 종전 '판정보다 위에 두라'는 제약은 폐지.
chk 'ADM_GATE_CHK' scripts/audit/admin-shot.mjs 1  # 위 회귀 단언(크기 24px 이하 · appearance ≠ none)
chk 'ADM_AC3NOOP' automation/admin/admin.gs 5      # 강제변경 noop 판정을 '실제로 값이 바뀌는 컬럼'으로 — Object.keys(cleared) 복원 금지
#   ★이 목록은 '이미 실제로 난 오류' 2개만 담는다. 늘리지 말 것 — 받침 유무는 앞 낱말마다 달라서 열거는 끝이 없고,
#   한 항목이라도 규칙을 거꾸로 담으면 가드가 맞는 문구를 신고해 오히려 틀린 쪽으로 고치게 만든다.
#   실제로 그랬다: 2026-07-26에 '완료)를'을 넣었는데 '료'는 받침이 없어 '를'이 맞다 — 맞는 문장을 신고하는 규칙이었다(삭제함).
#   증상 열거는 여기까지. 원인은 아래 _josaCat(조사를 문자열 밖에 이어붙이는 형태 부재)이 막는다.
#   ★이 목록의 리터럴을 admin.gs 주석에 그대로 쓰지 말 것 — 주석이 스스로 걸린다(실제로 한 번 걸렸다).
_dtl=$(grep -cE '데이터을|포함\)를' automation/admin/admin.gs 2>/dev/null); _dtl=${_dtl:-0}
if [ "$_dtl" -gt 0 ]; then echo "REVERT? automation/admin/admin.gs: 관리자 노출 문구 조사 오류 부활($_dtl) — '데이터을'·'포함)를' 등"; fail=1; else echo "ok automation/admin/admin.gs: 조사 정상('데이터를'·'포함)을')"; fi
chk 'ADM_JOSA' automation/admin/admin.gs 1   # 조사를 분기 안으로 넣어 두 경우 다 맞게(붙여 쓰기 복원 금지)
#   ★위 렌더 형태 grep은 이어붙이기를 못 잡는다 — 소스에선 …포함)' + '를… 로 끊겨 있어 리터럴이 존재하지 않는다(실측).
#   그래서 '고쳐진 문장이 통째로 있는지'와 '옛 이어붙이기 형태가 없는지'를 소스 기준으로 함께 본다.
chk '진행 데이터와 상담 예약(캘린더 포함)을' automation/admin/admin.gs 1   # 분기 안에 조사까지 든 완성 문장
_josaCat=$(grep -cE "'이후 단계 진행 데이터' *\+" automation/admin/admin.gs 2>/dev/null); _josaCat=${_josaCat:-0}
if [ "$_josaCat" -gt 0 ]; then echo "REVERT? automation/admin/admin.gs: 조사를 문자열 밖에 붙이는 옛 형태 부활($_josaCat) — bookingReset=true에서 조사가 틀어진다"; fail=1; else echo 'ok automation/admin/admin.gs: 조사 이어붙이기 형태 없음'; fi
# 식순 문안 단일 원천 정합(빌더↔KB) — node 있으면 실행(문안 이중 원천·KB 드리프트·토큰 캡 감지)
if command -v node >/dev/null 2>&1; then node scripts/check-ritual-mirror.js || fail=1; else echo 'skip check-ritual-mirror (node 없음)'; fi
# 헤더 진단의 '결론'이 실제 가드 판정과 갈리지 않는지(GUARD_MIRROR) — 진짜 GAS 함수를 vm에서 돌려 대조
#   ★실패 원인을 단정하지 말 것 — 이 스크립트는 결론 대조 말고도 빈 통과·읽기 전용·리터럴 무결성을 함께 본다.
#   무엇이 깨졌는지는 실패한 줄이 말하게 하고, 여기서는 그 줄만 흘려준다.
if command -v node >/dev/null 2>&1; then
  _ho=$(node scripts/audit/header-order.mjs 2>&1) && echo 'ok header-order: 진단 결론 == 가드 판정 · 빈 통과 0 · 리터럴 무결' \
    || { echo 'REVERT? header-order 실패:'; printf '%s\n' "$_ho" | grep '❌'; fail=1; }
else echo 'skip header-order (node 없음)'; fi
# (성패 판정·ALL MARKERS OK 출력은 파일 머리의 GATE_AT_EXIT 트랩이 맡는다 — 여기서 끝내지 않는다.
#  아래에 검사를 계속 덧붙여도 안전하다. 그게 이 구조의 목적이다.)

# ── 2026-07-25 후기(설문) 카드 가독성(사용자 지적 "안쪽 색이 전부 노란색이라 가독성이 안 좋다")
#   ※ 원래 판정 줄 아래(파일 끝)에 붙어 있어 실행은 되지만 exit 코드에 반영되지 않았다 — 2026-07-26 위로 이동.
chk 'SURVEY_READ' mypage.html 1   # 선택지 칩을 흰 바탕으로(패널 --bg2와 같은 색이라 한 덩어리로 읽히던 것) + 문항 사이 구분선 + 자유서술 칸 높이 92px. ★칩 배경 --bg2 복원 금지
# ── 2026-07-26 메인 홈 조판
chk 'BR_NO_GLUE' index.html 1                 # br을 display:none 하는 구간의 소스 br 앞 공백 규칙(모바일에서 문장이 붙던 실사고 9곳) · 주석 삭제 금지
chk 'br-glue.mjs' scripts/audit/br-glue.mjs 1  # 위 규칙 상시 회귀 스크립트 자체
chk 'LABEL_KO_TRACK' index.html 1              # 섹션 라벨 22% 자간이 한글에도 걸려 낱글자로 흩어지던 것 · 한글만 8%
chk 'll-ko' index.html 18                     # 라벨 17개 한글 꼬리 span + CSS 규칙 1 = 18 (span 제거 시 자간 원복)
chk 'HOME_GOLD_TEXT' index.html 2               # 글자용 골드를 --gold-text(#7a5f37)로 분리 — 2.54:1→5.71:1. 장식 선·아이콘용 --gold 복원 금지
chk 'gold-text' index.html 3                    # 변수 정의 1 + 사용 2 + 주석 1
chk 'HOME_TAP40' index.html 1                   # 텍스트 링크 히트영역 ::before (규칙 블록)
# [TAP44-3] 두 번째 HOME_TAP40(상담 위젯 닫기 padding 11px 주석)은 13px·44px 로 올리며 TAP44-3 주석으로 바뀜(2026-08-09)
chk 'TAP44-3' index.html 2                      # 44px 승격 — FAQ 알약 + 위젯 닫기
chk 'PLUS_Z' order-preview.html 1               # ＋− 버튼이 카드 펼침 덮개 아래 깔리던 실탭 버그 — 목록에서 .mvb 빼면 재발
chk 'AI_TIP' order-preview.html 2               # AI 더빙은 팁 — '두 분 목소리로 만들어'로 되돌리면 남의 서비스 능력을 단정하는 거짓 안내
chk 'SUBSET' order-preview.html 2                # 성혼 선언 — 톤 곁판이 사라지면 두 축이 다시 한 줄로 섞인다
# ★[REHEARSE_MERGED 2026-08-12] 8→6. 연습 공간 전용 CSS 두 줄(.rh-blk.active · .rh-cue b)이
#   그 화면과 함께 사라졌다. **세어 보고 줄인 것이다** — 남은 여섯은 전부 살아 있는 화면이다:
#   ①규칙 머리말(53) ②.play.playing(77) ③.subset(98) ④.seqr.on(129) ⑤.crs.on(147) ⑥.mc.open(191).
#   진사를 점으로만 쓰는 자리(체크·지금 알약·경고)는 하나도 안 빠졌다.
#   ★숫자만 맞췄으면 이 마커가 지키던 것이 조용히 빠진다 — VOW_CHORUS 4→3 과 같은 방식으로 셌다.
chk 'SEAL_POINT' order-preview.html 5            # 진사는 점(체크·지금 알약·경고)으로만 — 그릇(테두리·배경·라벨)에 되돌리면 화면이 경고로 읽힌다 + me-adv-close 패딩 11px. ★크기 대신 히트영역인 이유는 밑줄·화살표 장식 보존
# [CRS_OPEN_CALM 2026-08-14] 6→5 — 고른 코스 카드의 베이지 바탕을 걷으며 그 자리의 SEAL_POINT 주석도 함께 내렸다.
#   ★진행바만은 예외로 진사를 **면**으로 쓴다(PROG_SEAL) — 걸어온 만큼을 쌓아 보이는 유일한 자리라 점으로는 안 된다.
chk 'PROG_SEAL' order-preview.html 1
chk 'CRS_OPEN_CALM' order-preview.html 2
chk 'FAB 레일' index.html 1                      # ★아이콘 레일 변경 금지 주석(2026-07-26 사용자 지시) — 삭제 금지
chk 'HOME_IMG_WEBP' index.html 1                # picture/source webp 전환(3223→1093KB) 설명 주석 — 삭제 금지
chk '<source type="image/webp"' index.html 22   # 22장 전부 webp source 유지(하나라도 빠지면 그 자리가 빈다)
chk 'img-webp.mjs' scripts/audit/img-webp.mjs 1  # 위 구조 상시 회귀(파일 존재 + 디코드 실패 이중 확인)
# ── 2026-07-26 /점검 · 나레이션 대본 교차점검
chk 'RINGWARM_NO_MIN' order-preview.html 1     # 링워밍 '하객 전체' 카드의 '약 2분 더'·'스물다섯 분' 복원 금지(recoTxt '인원에 따라 달라져요'와 정면 모순 · 수치 약속 금지)
chk 'DECL_PAUSE_POS' scripts/build-dubbing-script.mjs 1   # 선언 무음이 '마지막 문장'이 아니라 '끝에서 두 번째'(선언문) 기준임 — 구 지시 복원 금지
chk 'N0_STAY' scripts/build-dubbing-script.mjs 1          # N0가 '자리를 옮기실 때'로 되돌아가면 폐식 G3-15 '자리에서 그대로'와 다시 충돌
# ── 2026-07-26 홈 문구·정보 정리(사용자 결정)
chk 'HOME_PRICE_FMT' index.html 1              # 금액 표기 규칙 주석 — 삭제 금지(INVEST=₩전체자릿수 / 산문=250만 원 / 계약서 미러 조항은 50,000원 유지)
chk '250만 원' index.html 3                    # 산문 금액이 '250만'·'250만원'으로 되돌아가면 한 페이지에 세 형식이 다시 생긴다 [PRICE_2026_08_15]
chk 'HOME_CTA_KO' index.html 1                 # 주 버튼 한글 주·영문 보조 — 영문 단독 라벨로 복원 금지
chk 'cta-eyebrow' index.html 4                 # 영문 아이브로우 3곳 + CSS 1. ★영문을 버튼 '안'에 2줄로 넣는 안(cta-btn-ko/en)은 2026-07-26 재검토로 폐기 — 되살리지 말 것(버튼 73px·영문 불투명 66%로 안 읽힘)
chk 'BTN_TIER' index.html 4                    # 버튼 2단 체계(채움=전환 3곳 / 외곽=보조 이동 1곳). journal-guide-link를 채움 마룬으로 되돌리면 화면에 전환 버튼이 4개가 된다 — 복원 금지
chk 'MAP_BREATH' index.html 1                  # 지도 블록 상하 여백 80/88 — margin-top만 두고 아래를 0으로 되돌리면 다시 푸터에 끼인다
# ── 2026-07-26 inquiry.html 1라운드
chk 'INQ_REQ_DOT' inquiry.html 1               # 필수 표시 점 3px 골드(2.54:1) 복원 금지 — 폼에서 가장 중요한 정보가 안 보였다
chk 'INQ_RAIL_CLEAR' inquiry.html 1            # ★본문 우측 여백 확보 '금지' 기록(2026-07-26 철회 — 본문이 왼쪽으로 치우쳐 보임). 겹침을 이유로 padding-right를 다시 넣지 말 것
chk 'INQ_TAP40' inquiry.html 1                 # 선택지 라벨 40px — 라디오는 opacity:0이라 라벨이 실제 탭 타깃
chk 'INQ_NAV_HIDE' inquiry.html 1              # 네비 스크롤 숨김 로직 — 없으면 fixed·투명 네비가 페이지 전체에서 본문과 겹친다(홈엔 있고 여기만 빠져 있었다)
chk 'INQ_LABEL_ALIGN' inquiry.html 1           # 필드 아이콘 복원 금지 — 12개 중 2개에만 있어 라벨 좌측선이 20/46 두 줄로 갈렸다
chk 'INQ_TAP40B' inquiry.html 1                # 상품 탭·동의 상세 40px + 네비/동의/푸터로고 ::before 히트영역
chk 'INQ_NOTE_ONE' inquiry.html 1              # 보조 안내 표기 5종 → 인라인 이탤릭 1종·10.5px. 테두리 박스 Note 복원 금지
chk 'INQ_KO_TRACK' inquiry.html 1              # 영문 자간이 한글 '필수'에 걸려 벌어지던 것 — 홈 LABEL_KO_TRACK과 같은 처방
chk 'll-ko' inquiry.html 7                     # 한글 꼬리 span 6 + CSS 1
chk '적어 주세요' inquiry.html 2               # 보조용언 띄어쓰기 통일(붙여쓴 12건 → 띄어쓰기) · '부탁드립니다·안내드립니다'는 명사+겸양이라 붙임 유지
chk 'gold-text' inquiry.html 14                # 읽는 골드 텍스트 24건 → 2건(대비 2.54→5.71)
# ── 2026-07-26 live.html 1라운드(하객이 예식 당일 여는 화면)
chk 'LIVE_KO_TRACK' live.html 1                # 영문 트래킹이 한글에 걸려 낱글자로 흩어지던 것(최악 .couple-ko 24% — 신랑·신부 이름) + 히어로 eyebrow 3줄 방지
chk 'LIVE_CONTRAST' live.html 3                # 본문 1 + CONTRAST2 1 + OPACITY 주석 1. 장식용 골드(2.54:1)를 글자색으로 되돌리지 말 것(선·테두리엔 --gold 유지)
chk 'LIVE_TAP40' live.html 1                   # 복사 29px·브랜드 27px·편지 수신인 33px → 40px. ★브랜드는 ::before 히트영역이 아니라 헤더 패딩 14→8 + 앵커 min-height로 '박스 자체'를 키운 것
chk 'LIVE_OPACITY' live.html 1                 # ★색만 고쳐도 opacity로 다시 흐려지던 자리(영상 안내문·전체화면 힌트·'의 아들'). 투명도로 위계를 만들지 말 것 — 크기·서체로
chk 'LIVE_LINK_UNKNOWN' live.html 4            # 링크가 틀렸을 때 더미 예식(이서준·정하윤 / 국민은행 123456-78-901234 + 복사 버튼)이 진짜처럼 뜨던 것. CSS·마크업·JS·핸들러 4곳 — 하나만 지워도 가짜 계좌가 돌아온다
chk 'link-unknown-box\[hidden\]' live.html 1   # ★.lp-message-box{display:flex}가 브라우저 기본 [hidden]을 이겨서 정상 화면에도 안내문이 떴던 사고. 이 한 줄 지우면 재발
chk 'LIVE_LETTER_KO' live.html 1               # 편지 폼 aria-label 3종 + 한글 CTA + 한글 안내문
chk '편지 보내기' live.html 3                  # 폼·프리뷰 버튼 2곳 + 주석. 'Deliver' 영문 단독으로 복원 금지(홈 HOME_CTA_KO와 같은 근거)
chk 'aria-label="두 분께 남길 편지"' live.html 1  # 세 칸 모두 label 없이 placeholder만 있던 것 — 화면은 그대로 두고 이름만 붙였다
# ── 2026-07-26 guide.html 1라운드(하객이 예식장에서 여는 안내 허브)
chk 'GUIDE_CONTRAST' guide.html 1              # --gold-deep(3.82:1)·--faint(2.61:1)이 본문 글자에 쓰이던 것. 글자엔 --gold-text, 선엔 --gold/--gold-deep 유지
chk 'gold-text' guide.html 6                   # 토큰 정의 1 + 읽는 골드 5(브랜드·식당소개·지도전화·예약·검색결과 등). 되돌리면 지도·전화 버튼부터 안 읽힌다
chk 'GUIDE_TAP40' guide.html 1                 # 지도·전화 71×34 · 뒤로 48×29 → 40px. ★뒤로는 .backbar top -4→-9를 함께 옮겨야 라벨이 안 어긋난다
chk 'GUIDE_KO_TRACK' guide.html 1              # '여기로 모여요'(16%)·'단상·신랑 신부'(20%) — 영문 라벨 트래킹이 한글에 걸린 것. 홈/문의/live와 같은 처방
chk 'GUIDE_ORPHAN' guide.html 1                # ★text-wrap:pretty는 한글을 재배분하지 않는다(실측). word-break:keep-all로 되돌리지 말 것
chk 'GUIDE_FOCUS' guide.html 1                 # .find input:focus{outline:none}가 초점 링을 지우고 있던 것. ★:where()는 특이도 0이라 .find input:focus-visible 재선언이 함께 있어야 이긴다
chk 'GUIDE_HEADING' guide.html 1               # h1·h2가 0개였다 — 화면낭독기에 구조가 없었다
chk 'h2 class="sec-t"' guide.html 4            # 섹션 제목 4곳(좌석·내자리·식사·사진). span으로 되돌리면 헤딩 구조가 다시 사라진다
chk 'aria-label="성함"' guide.html 1           # 좌석 검색 입력이 placeholder만 있던 것
# ── 2026-07-26 guide.html 2라운드(화면낭독기·극단 데이터·외부 링크 고지)
chk 'aria-live="polite"' guide.html 1          # 좌석 검색 결과가 live region이 아니라, 이름을 쳐도 낭독기가 아무 말도 안 했다 — 이 페이지의 존재 이유가 무음이었다
chk 'GUIDE_MAP_SR' guide.html 2                # 배치도 그림이 '3 김민수 5 2 4'로 흘러나오던 것. 검색모드=aria-hidden · 전체공개=sr-only 명단으로 대체(CSS 1 + JS 1)
chk 'sr-only' guide.html 4                     # 위 대체 수단의 본체. ★display:none으로 바꾸면 낭독기도 건너뛰어 전체공개 모드가 다시 무음이 된다
chk 'GUIDE_RT_SR' guide.html 1                 # 번호 알약이 '3테이블 3 자리예요'로 두 번 들리던 것. 테이블에 이름이 따로 있을 때만 번호를 말로 넣는다
chk 'GUIDE_LINKNAME' guide.html 1              # 링크 목록이 '지도·전화·지도·지도·지도'로만 들려 가게 구분이 안 되던 것(WCAG 2.4.4) + 새 탭 고지(3.2.5)
chk 'GUIDE_EMPTY_SEC' guide.html 1             # dining.on만 켜고 담은 곳이 0이면 제목만 있는 빈 섹션이 뜨던 것(실측)
chk 'GUIDE_DATE_GUARD' guide.html 1            # 2027-13-45가 롤오버돼 '13월 45일 (월)'로 자신 있게 틀린 요일까지 붙던 것
chk 'GUIDE_SAFEAREA' guide.html 1              # viewport-fit=cover만 켜고 env(safe-area-inset-*)은 안 쓰던 것 — 노치폰 가로에서 잘림
chk 'GUIDE_PHOTO_INFO' guide.html 2            # 외부 공간으로 나가는 버튼인데 하객이 누르기 전에 알 수 없던 것(CSS 1 + JS 1)
# ★[SHARE_KAKAO_1TO1 2026-08-16] 'MP_PHOTOSHARE_INFO' 마커 폐지 — 그 블록을 1:1 오픈채팅 기준으로 다시 썼다.
#   ★마커는 없어져도 **지키려던 세 가지는 그대로 있어야 한다**(접근 범위·프로필 노출·정리하면 버튼도 닫힘).
#     그래서 마커 대신 문장을 직접 센다 — 이름이 아니라 내용을 지키는 쪽이 원래 의도에 맞다.
chk '링크를 아는 분은 누구나 들어갈 수 있어요' mypage.html 1
chk '버튼도 닫혀요' mypage.html 1                 # [SEC_RANK] 문구를 줄여도 안 걸리게 핵심만 센다 — 지키는 것은 문장이 아니라 '앨범을 지우면 버튼도 닫힌다'는 사실
# ── 2026-07-26 guide.html 3라운드(예식장 현장 조건 — 느린 회선·실패·확대)
chk 'GUIDE_FONT_NOBLOCK' guide.html 1          # 폰트 CSS가 렌더 블로킹이라 FCP 3056ms·백지였다. media=print+onload로 뺐다 → FCP 60ms
chk 'media="print"' guide.html 1               # ★위 처방의 본체. rel=stylesheet만 남기면 다시 렌더 블로킹이 되고 흰 화면이 돌아온다
chk 'preconnect" href="https://script.google.com' guide.html 1  # 데이터가 오는 곳 사전 연결 — 폰트만 preconnect하고 정작 GAS는 빠져 있었다
chk 'GUIDE_RETRY' guide.html 2                 # 실패 시 하객이 누를 게 0개였다(실측). 자동 재시도 1.2·3초 + '다시 불러오기' 버튼(CSS 1 + JS 1)
chk 'retry-btn' guide.html 3                   # 위 버튼 — CSS 2(본체·:active) + 마크업 1
chk 'GUIDE_CACHE' guide.html 1                 # 회선 불량 재방문 시 캐시로 즉시 표시. ★재시도 전부 실패해도 캐시 화면을 지우지 않는다(painted 가드)
chk 'GUIDE_MAP_REFLOW' guide.html 1            # 200% 확대(207px)에서 좌석표가 페이지를 가로로 밀던 것 → 스크롤을 블록 안에 가둠
chk 'GUIDE_DEADREF' guide.html 1               # 호출부 없는 findSeat 안의 문구가 삭제된 '전체 배치도'를 가리키고 있던 것
# ── 2026-07-27 seat.html 1라운드(guide 1~3라운드 처방을 복제 페이지에 적용)
chk 'SEAT_FONT_NOBLOCK' seat.html 1            # 폰트 CSS 렌더 블로킹 — 백지 + 좌석 데이터 요청까지 밀림
chk 'media="print"' seat.html 1                # ★위 처방 본체. rel=stylesheet만 남기면 흰 화면이 돌아온다
chk 'SEAT_CONTRAST' seat.html 1                # --gold-deep 3.82:1 · 하드코딩 #A49D8E 2.61:1이 글자에 쓰이던 것
chk 'gold-text' seat.html 5                    # 토큰 1 + 읽는 골드 4(브랜드·검색결과·좌우 라벨·♡)
chk 'SEAT_TAP40' seat.html 1                   # 뒤로 48×29 → 40px. ★.backbar top을 함께 올려야 라벨이 안 어긋난다
chk 'SEAT_HEADING' seat.html 1                 # h1이 0개였다 — 화면낭독기에 구조 없음
chk 'h1 class="couple"' seat.html 2            # 전체 배치도·내 자리만 두 화면 모두
chk 'aria-live="polite"' seat.html 2           # 검색 결과가 live region이 아니라 이름을 쳐도 낭독기가 무음이었다(두 화면)
chk 'SEAT_SR' seat.html 3                      # 배치도 그림을 aria-hidden으로 덮고 sr-only 명단으로 대체(CSS 1 + 전체 1 + 내자리 1)
chk 'sr-only' seat.html 3                      # ★display:none으로 바꾸면 낭독기도 건너뛰어 다시 무음이 된다
chk 'SEAT_FOCUS' seat.html 1                   # .find input:focus{outline:none}가 초점 링을 지우던 것
chk 'SEAT_MAP_REFLOW' seat.html 1              # ★320px에서 페이지가 336>320으로 밀리던 것. 400px 이하에서만 가둔다 — 414px는 전 모습 유지(잘림 방지)
chk 'SEAT_RETRY' seat.html 2                   # 실패 시 누를 게 0개였다. 자동 재시도 1.2·3초 + 버튼(CSS 1 + JS 1)
chk 'SEAT_NOCACHE' seat.html 2                 # ★guide의 localStorage 캐시를 '의도적으로' 안 가져온 기록 — 이 응답엔 하객 전원 실명이 들어 있다. 캐시 추가 금지
chk 'SEAT_DATE_GUARD' seat.html 1              # 2027-13-45가 롤오버돼 '13월 45일 (월)'로 나오던 것
chk 'SEAT_MOTION' seat.html 1                  # 검색마다 도는 smooth 스크롤 — 동작 줄이기 설정 존중
chk 'SEAT_SAFEAREA' seat.html 1                # viewport-fit=cover만 켜고 env(safe-area-inset-*)은 안 쓰던 것
# ── 2026-07-27 seat.html 2라운드(배치도를 하객이 실제로 읽을 수 있는가)
chk 'SEAT_ZIG' seat.html 1                     # ★zig가 side로 부호를 뒤집어 짝수 행에서 좌·우 표가 60px 수렴 → 통로 16px에서 이름표 정면충돌('김민수'가 '박지영'에 덮여 '김'만 보였다). 4안 실측 비교에서 평행화만 0으로 떨어졌다(18→0) — side 분기 복원 금지
chk 'return ((row%2===0)?1:-1)\*30' seat.html 1  # 위 처방 본체(평행 이동). side 부호 반전을 되살리면 충돌이 그대로 돌아온다
chk 'SEAT_CROWD' seat.html 3                   # 자리 8명 이상이면 원 위 이름표가 겹쳐 못 읽던 것 → 원엔 점, 이름은 표 아래 목록(주석 1 + CSS 1 + 분기 1)
chk 'crowd=(n>=8)' seat.html 1                 # ★임계 8. 짧은 더미로 재면 9로 보인다 — 한글 3자 실명으로 재야 8인 원탁(가장 흔한 규격)이 잡힌다
chk 'tbl-list' seat.html 2                     # 목록형 표 본체(CSS 1 + 조립 1). max-width는 통로 침범 때문에 126px — 넓히지 말 것
chk 'SEAT_ORIENT' seat.html 2                  # '좌측/우측'이 무엇 기준인지 화면에 없던 것 — 단상을 바라볼 때 기준임을 한 줄로(주석 1 + CSS 1)
chk '단상을 바라볼 때의 좌·우예요' seat.html 1     # 위 한 줄 — 지우면 하객이 좌우를 반대로 읽을 수 있다
# ── 2026-07-27 parents.html 1라운드(사이트에서 독자 나이가 가장 많은 화면)
chk 'PAR_CONTRAST' parents.html 1              # 장식 골드(2.54:1)가 一二三四 장 번호·아이브로우 글자에 쓰이던 것 → --gold-text
chk 'gold-text' parents.html 3                 # 토큰 1 + 적용 2. 노안 독자에게 장 번호는 '어디까지 읽었는지' 짚는 표시다
chk 'PAR_FOOTER' parents.html 1                # 상호·대표·사업자등록번호가 2.71:1이던 것 → 5.16:1(법정 표기이자 신뢰 확인 자리)
chk 'PAR_TAP40' parents.html 1                 # 상단 로고·뒤로·메일 링크가 12~22px이던 것 → 40px. 손이 정확하지 않은 독자에겐 여기가 첫 벽
chk 'PAR_TOOLS' parents.html 3                 # 글자 크기 단계 표시 + 끝단 disabled + role=group(주석 1 + CSS 1 + 마크업 1)
chk 'fontLabel' parents.html 2                 # ★'눌렀는데 안 커지네'를 막는 현재 단계 표시 — 지우면 어른이 계속 누르게 된다
chk 'PAR_KO_TRACK' parents.html 1              # 영문용 트래킹(.08em)이 한글 '뒤로'에 걸려 있던 것
# ── 2026-07-27 assets/advisor-widget.js (inquiry·mypage·order-preview·parents 4개 페이지 공용)
chk 'ADV_A11Y' assets/advisor-widget.js 3      # 아이브로우 2.54:1 · 닫기 30×30 · 카톡문의 높이 23px — 공용 위젯이라 4개 페이지가 함께 고쳐진다
chk 'gold-text' assets/advisor-widget.js 2     # 위 아이브로우 색(주석 1 + 값 1). --gold-text 미정의 페이지는 폴백 #7A5F37
chk 'ADV_PRINT' assets/advisor-widget.js 1     # ★인쇄 시 떠다니는 FAB이 편지 본문 위에 찍히던 것(parents 인쇄 미리보기 스크린샷에서 발견)
# ── 2026-07-27 order-preview.html 1라운드(코스 5종 × 전 단계 65회 순회 실측)
chk 'ORD_OFF_OPACITY' order-preview.html 1     # ★'순서에 없음'을 opacity(.5~.62)로 표현해 판단용 글자까지 흐려지던 것(7.16→2.79 등). 투명도를 올려선 못 푼다(4.5:1을 넘기려면 .84 필요 → 신호 소멸) — 흐림 대신 색으로. opacity 복원 금지
chk 'ORD_CHEV' order-preview.html 1            # 펼침 표시 '›'가 2.25:1이라 '눌러서 펼쳐진다'는 신호가 안 보이던 것 → 3.82:1(UI 요소 기준 3:1)
chk 'ORD_NOW' order-preview.html 1             # 지금 단계 표시(흰 글자/골드)가 3.95:1이던 것 → 5.97:1. 위저드에서 가장 자주 보는 정보다
chk 'ORD_ONBG' order-preview.html 1            # --light가 회색 카드 위에서 4.2~4.47로 내려가던 것 → 바탕 있는 자리만 --sub
chk 'ORD_TAP40' order-preview.html 1           # 순서 바꾸는 ↑↓ 27×27 등 17종 → 40px
chk 'ORD_STRUCT' order-preview.html 2          # h1·main이 0개였다(주석 1 + CSS 1). 단계 제목은 바뀌므로 고정 제목은 sr-only h1으로
chk '<main class="stage"' order-preview.html 1 # div로 되돌리면 랜드마크가 다시 사라진다
chk 'sr-only' order-preview.html 2             # ★display:none으로 바꾸면 낭독기도 건너뛴다
chk 'aria-label="서로에게 하는 약속' order-preview.html 1  # 긴 글 칸 4개가 placeholder만 있던 것(치는 순간 이름이 사라진다)
# ── 2026-07-27 order-preview.html 2라운드(고객 입장 · 편의성/직관성/디자인성/이해성/디테일)
chk 'ORD_KEY' order-preview.html 12            # ★위저드에서 '고르는' 것 전부가 <div onclick>이라 Tab으로 닿지 않았다(8종 254개). 카드 제목만 button으로 만들고 ::after를 카드 전체로 늘려 덮는다 — 카드를 통째로 button으로 바꾸면 안쪽 들어보기·↑↓가 버튼 안에 들어간다(nested interactive). div onclick으로 되돌리기 금지
chk 'button.oc-nm::after' order-preview.html 1 # 위 오버레이 — 지우면 카드 아무 데나 누르는 감각이 제목 줄로 쪼그라든다
chk 'ORD_FOCUS' order-preview.html 1           # 포커스 표시 규칙이 아예 없었고 .ta:focus{outline:none}이 오히려 지우고 있었다. :where()는 특이도 0이라 .ta:focus-visible를 따로 써야 이긴다
chk 'ORD_H2' order-preview.html 5              # 단계 제목이 전부 div였다(h2 0개) — 낭독기 제목 이동으로 아무 데도 못 갔다
chk 'ORD_STEPFOCUS' order-preview.html 2       # '다음'을 눌러도 포커스가 버튼에 남아 낭독기엔 아무 일도 안 일어난 것처럼 들렸다 → 새 단계 제목으로 이동(첫 렌더 제외)
chk 'ORD_STEPNO' order-preview.html 1          # ★'순서 N / N'이 완성 요약과 다른 숫자였다(담백 10/10 vs 7개 순서). 뺀 순간까지 세던 것 → fullBlocks 한 원천으로. 단계 수로 되돌리기 금지
chk 'ORD_NEXTNAME' order-preview.html 1        # tune 한 단계를 세 이름으로 불렀다(예고 '함께 볼 순간 확인(전체 기본)' · 라벨 '기본 식순이 준비됐어요' · 제목 '어떤 순간을…')
# ★[DONE_TAIL_QUIET 2026-08-12 사용자 지시 "웨멘트들 삭제"] 본식 영상 권유 줄 폐지 → ORD_NOTE_FIT 도 함께 사라졌다.
#   그 마커는 그 줄의 코스 적합성을 지키던 것이라, 줄이 없으면 지킬 것도 없다(세어 보고 뺀 것).
nochk '본식 영상 기록을 함께 권해' order-preview.html   # ★순서 고른 자리에서 상품을 더 권하지 말 것
chk 'ORD_AUDITION' order-preview.html 1        # 나레이션 글은 보여 주면서 들어보기는 고른 카드에만 있었다(담백 덕담·사이, 가족 링워밍 4곳) — 넣을지 판단하려고 듣는 건데 넣기 전엔 못 들었다
chk 'ORD_DESC' order-preview.html 3            # 버튼 이름이 '아버지가'뿐이라 낭독기로는 무엇인지 알 수 없었다 → aria-describedby로 설명줄 연결
# ── 2026-07-27 schedule.html 1라운드(상담 일정 선택 · 화면 5상태 순회 실측 · 414/360px)
chk 'SCH_CONTRAST' schedule.html 1             # ★--gold(#B89A75)는 흰 바탕 2.65:1이다. 테두리엔 좋지만 글자엔 못 쓴다 — 두 분 성함 2.54 · '상담 예약금' 2.65 · 시간칸 '오전/오후/저녁' 1.92까지 그 색이었다(16종). --gold는 테두리·그라데이션 그대로, 글자만 --gold-text로 가른다
chk 'gold-text' schedule.html 5                # 위 색 정의 + 적용(주석 포함). --gold로 되돌리면 16종이 그대로 돌아온다
chk 'SCH_FULL_OPACITY' schedule.html 1         # ★마감 시간을 opacity:.5로 흐려 어느 시간이 찼는지 못 읽던 것(2.83·1.92:1). 투명도로는 못 푼다(4.5:1에 0.85 필요 → 신호 소멸) — 흐림 대신 색으로. opacity 복원 금지
chk 'SCH_TAP40' schedule.html 1                # 달 넘기는 ‹› 38 · 계좌 복사 35 · 진행 시간표 줄 19 · 카카오톡 12 → 40px
chk 'SCH_DAY40' schedule.html 1                # 360px에서 날짜 칸이 38×38로 내려앉던 것 — 이 페이지에서 제일 많이 누르는 자리다
chk 'SCH_KO_TRACK' schedule.html 1             # 영문 소캡용 자간(0.08~0.16em)이 한글에 그대로 걸려 있었다 — 신청 버튼 포함 6종
chk 'SCH_FOCUS' schedule.html 1                # 포커스 표시 규칙이 아예 없었고 #depPayer:focus{outline:none}이 지우고 있었다. :where()는 특이도 0이라 #depPayer:focus-visible를 따로 써야 이긴다
chk 'SCH_STRUCT' schedule.html 1               # h2·h3가 0개 · main 랜드마크 0개 · AI 도우미 입력칸에 이름이 없었다
chk '<main class="wrap">' schedule.html 1      # div로 되돌리면 '본문으로 건너뛰기'가 다시 사라진다
chk 'SCH_SRNAME' schedule.html 4               # 제목이 '날짜 선택셀렉트 어 데이트'로 붙어 읽히고 시간칸이 '저녁18:10약 40분'이었다 → 영문 장식 aria-hidden + 칸마다 aria-label
chk 'SCH_ALERT' schedule.html 2                # 제출이 막힌 이유가 글자색 변화로만 나타나 낭독기엔 아무 말도 안 들렸다 → role=alert·aria-live·aria-invalid
chk 'SCH_DONEFOCUS' schedule.html 1            # 신청 접수 순간에 포커스가 body에 남아 완료 안내가 안 읽혔다 → 대화상자 안으로 이동
chk 'SCH_AMOUNT' schedule.html 1               # ★맨 위 '상담 예약금 · 신청 시 안내'인데 같은 페이지 아래엔 금액이 크게 있었다 — 돈 이야기 첫 줄이 '아직 안 알려드려요'로 읽히던 것. 같은 서버 값으로 채움
chk 'SCH_REQUIRED' schedule.html 1             # 입금자명이 없으면 제출이 막히는데 라벨·힌트가 선택 입력처럼 읽혔다
# ── 2026-07-30 privacy·cancel·preview 1라운드(고객 입장 실측 · 414/360px)
chk 'PRV_CONTRAST' privacy.html 1              # 라벨·조항번호가 --gold(2.54:1)였다 → 글자만 --gold-text(5.71:1)
chk '푸터 손대기 금지' privacy.html 1           # ★2026-07-30 사용자 지시 — 어두운 푸터는 실측상 2.05~2.71:1·링크 12px지만 지금 톤이 의도된 것. 감사가 다시 집어내도 되살리지 말 것
chk 'PRV_TAP40' privacy.html 1                 # 상단 로고·'상담 페이지로' 21px → 40px (푸터는 위 지시로 제외)
chk 'PRV_LOGO' privacy.html 2                  # 왼쪽 위 로고를 자간 텍스트 → 브랜드 워드마크 이미지(2026-07-30 사용자 지시 · 주석 1 + CSS 1). 이미지 실패 시 종전 텍스트로 폴백
chk 'nav-mark-fb' privacy.html 2               # 위 폴백 — 지우면 이미지 실패 시 로고가 통째로 사라진다
chk 'NAV_LOGO' inquiry.html 1                  # 같은 nav 컴포넌트를 쓰는 자매 페이지도 함께 교체(로고만 페이지마다 다르면 더 어색)
chk 'NAV_LOGO' parents.html 1                  # 위와 동일
chk 'nav-mark-fb' inquiry.html 2               # 이미지 실패 폴백
chk 'nav-mark-fb' parents.html 2               # 이미지 실패 폴백
chk 'PRV_KO_TRACK' privacy.html 1              # '상담 페이지로'(8%)·'개정 시행일자'(14%) — 한글에 영문용 자간
chk 'CAN_CONTRAST' cancel.html 1               # ★취소가 막힌 화면의 유일한 출구(카카오톡 링크)가 2.65:1로 안 읽혔다 · 상태 라벨도
chk 'CAN_TAP40' cancel.html 1                  # 문장 속 카카오톡 링크 12px — ::before 히트영역으로 40px(중심±19px 히트 실측)
chk 'CAN_FOCUS' cancel.html 1                  # 포커스 표시가 없었고 input:focus는 테두리 색만 바꿨다
chk 'CAN_STRUCT' cancel.html 1                 # h1·h2·main 0개 · 상태가 innerHTML로 바뀌는데 낭독기에 안 들렸다 → aria-live
chk 'CAN_ALERT' cancel.html 1                  # ★네트워크 실패가 OS alert였다 → 화면 안 role=alert · 버튼 복구 확인
chk 'CAN_KO_TRACK' cancel.html 1               # 한글 eyebrow('안내')에 영문용 .22em 자간
chk '비워 두셔도 취소는 진행돼요' cancel.html 1  # 환불계좌를 비워도 되는지 몰라 취소를 멈추던 것 — 서버 REFUND_ACCT_REQ(취소 후 계좌 요청)와 일치하는 사실 안내
chk 'PV_CONTRAST' preview.html 1               # 템플릿 이름·'예시예요' 안내가 바탕(#EDEBE6) 위 3.31:1
chk 'PV_TAP40' preview.html 1                  # 유일한 조작 '← 돌아가기'가 66×19였다
chk 'PV_FOCUS' preview.html 1                  # 포커스 표시 규칙이 없었다
chk 'PV_STRUCT' preview.html 1                 # h1·main 0개 — 템플릿 이름표를 h1로
# ── 2026-07-30 계약서 3종 1라운드(고객 입장 실측 · 414/360px)
chk 'CTR_CONTRAST' contract/v1-1.html 1        # ★서명 전에 꼭 읽어야 할 것들이 --gold였다 — 조문 번호 '제1조'(2.65:1) · '금액' 라벨(2.56:1) · 흰 글자/골드 '중요' 배지(2.65:1)
chk 'CTR_CONTRAST' contract/snap-v1-0.html 1   # 위와 동일(두 계약서가 같은 CSS)
chk 'CTR_CONTRAST' contract/fitting.html 1     # 서명란 '고객 · Customer'까지 3.78~3.95:1
chk '.summary-card .sum-k,.toc-list a .tn,.sign-cell .sc-role' contract/v1-1.html 1  # ★원 규칙이 0,2,0이라 단순 클래스로 쓰면 조용히 안 먹는다(실측으로 발견) — 같은 깊이 유지
chk 'CTR_TAP40' contract/v1-1.html 1           # ★목차 17개가 19px였다. ::before 가짜 히트영역은 줄 간격 32px에서 이웃과 8px씩 겹쳐(실측 5건) 옆 조문으로 잘못 뛴다 → 줄 자체를 40px로. 가짜 영역으로 되돌리기 금지
chk 'CTR_TAP40' contract/snap-v1-0.html 1      # 위와 동일
chk 'CTR_FOCUS' contract/v1-1.html 1           # 포커스 표시 규칙이 없었다 — 계약서를 키보드로 훑으면 위치를 잃는다
chk '푸터 손대기 금지' contract/v1-1.html 1     # ★2026-07-30 사용자 지시(privacy와 동일 판단) — 어두운 푸터 3.12~3.25:1은 의도된 톤
# ── 2026-07-30 청첩장 템플릿 8종 1라운드(하객 입장 실측 · 414/360px)
chk 'INV_TAP40' i/invitations/invitation-01-classic.html 1     # ★청첩장에서 하객이 실제로 누르는 건 축의금 계좌 복사 버튼 하나인데 8종 전부 24~30px였다
chk 'INV_TAP40' i/invitations/invitation-08-noir.html 1        # 위와 동일(8종 전부에 같은 블록)
chk 'INV_STRUCT' i/invitations/invitation-01-classic.html 1    # 두 분 이름이 h1이 아니라 div였다 · main 랜드마크 0개
chk '<h1 class="cover-names-ko"' i/invitations/invitation-03-letterpress.html 1  # 청첩장의 제목은 두 분의 이름이다
chk '<main class="invitation">' i/invitations/invitation-01-classic.html 1       # div로 되돌리면 랜드마크가 다시 사라진다
# ── 2026-07-31 홈 홍보 최신화(전환법칙 플랜 '빈 틈 메우기' 준수 · CTA 단일성 유지)
chk 'PRM_JR5' index.html 1                     # ★마이페이지 쇼케이스 5번째 화면 = 식순 위저드 실화면(mp-order) — 말 대신 화면으로. 4장으로 되돌리면 steps/shots 수가 어긋나 캐러셀이 죽는다(JS가 length 불일치 시 전체 비활성)
chk 'mp-order' index.html 1                    # 위 실화면 자산 참조(webp·png가 한 줄의 picture 안에)
chk 'PRM_DEMO_GATE' index.html 1               # ★식순 도구 공개 체험 링크 제거 — 2026-07-31 사용자 지시(경쟁사 노출 우려). 홈에 order-preview 공개 링크 복원 금지 · 대신 '상담 자리에서 직접' 한 줄(희소성·상담 유인)
chk 'PRM_PHONE300' index.html 2                # ★폰 목업 확대(300/266) — LIVE(.phone)·JOURNEY(.jr-phone)는 항상 같은 크기(사용자 지시 '할거면같이'). aspect-ratio는 프레임이 아닌 스크린에(패딩 9px 탓에 프레임에 두면 9:19 캡처가 좌우 크롭)
chk 'PRM_BYO' index.html 1                     # ★직접 제작 청첩장도 인쇄용 QR 한 장으로 하객 안내·디지털 참석 연결(사용자 지정 소재) — 실제 기능(마이페이지 '실물(종이)·개인 제작' 경로)만 서술
chk 'PRM_GUEST' index.html 1                   # 오시는 하객의 손안 화면 3종(길·주차/자리 찾기/사진 모으기) — 전부 실기능 · 사진 모으기는 '원하시면'으로 조건 명시
chk '직접 제작해 쓰시는 경우에도' index.html 2   # FAQ 보이는 답 + JSON-LD 동기(둘이 어긋나면 검색 결과와 화면이 다른 말을 한다)
chk 'btn-tier.mjs' scripts/audit/btn-tier.mjs 1  # 위 체계 상시 회귀(채움 버튼 규격 동일 · 외곽은 총높이까지 동일)
chk '프라이빗 방문 상담 예약하기' index.html 3   # 버튼 한글 라벨 3곳 — 영문 단독 라벨로 복원 금지
_srvbg=$(grep -c 'srv-opts button{[^}]*background:var(--bg2)' mypage.html 2>/dev/null); _srvbg=${_srvbg:-0}; if [ "$_srvbg" -gt 0 ]; then echo "REVERT? mypage.html: 설문 칩 배경이 패널과 같은 --bg2로 되돌아감($_srvbg)"; fail=1; else echo "ok mypage.html: 설문 칩 흰 바탕 유지(가독성)"; fi
# [ADM_DELIVDATE] 보관 시계 분리를 grep이 아니라 '실제 동작'으로 — 진짜 admin.gs 함수를 vm에서 돌려 결과 값을 본다.
#   후기→결과물전달 롤백에서 동의기록.결과물전달일 보존 / 예식완료 이하에선 제거 / 미리보기==실제(5개 목표 전수).
if command -v node >/dev/null 2>&1; then
  _rd=$(node scripts/audit/rollback-deliverydate.mjs 2>&1) && echo 'ok rollback-deliverydate: 보관 기산일 보존·리셋 분기 정상' \
    || { echo 'REVERT? rollback-deliverydate 실패:'; printf '%s\n' "$_rd" | grep 'FAIL' || printf '%s\n' "$_rd" | tail -3; fail=1; }   # 스크립트가 아예 못 뜨면 'FAIL' 줄이 없다 — 그때는 마지막 3줄로 이유를 남긴다
else echo 'skip rollback-deliverydate (node 없음)'; fi
# ── [GUARD_TAIL 2026-07-26] 이 스크립트 자신을 검사한다 — '판정 뒤에 붙은 가드는 죽는다'는 사고를 막는 자리.
#   실사고 2건: ADM_GATE_CB(실측) · SURVEY_READ(#295). 새 가드는 관행상 파일 끝에 붙으므로 사람 주의로는 재발한다.
#
#   ★역할 전환(2026-07-26 · GATE_AT_EXIT와 병합) — 원래 이 검사는 '판정 줄을 찾아 그 뒤의 chk/fail=1을 신고'했다.
#   지금은 판정이 EXIT 트랩으로 옮겨져 '뒤에 붙는다'는 상태가 구조적으로 불가능해졌다(트랩은 무조건 마지막에 돈다).
#   그래서 죽은 줄을 세는 대신, 그 불가능을 떠받치는 전제 두 가지를 지킨다:
#     ① 트랩 등록(trap _gate EXIT)이 살아 있는가
#     ② 트랩 등록이 첫 검사보다 위인가 (아래로 내려가면 그 위 검사들이 다시 죽는다)
#     ③ 본문에 인라인 판정([ "$fail" = "1" ] && … exit 1)이 되살아나지 않았는가 (되살리면 그 아래가 다시 죽는다)
#   ①~③이 지켜지는 한 검사를 어디에 덧붙여도 안전하다. 종전의 '이 블록 위에 추가할 것' 제약은 폐지.
#   ※ 자기 파일은 "$_SELF"로 연다 — "$0"를 쓰면 서브디렉터리에서 호출했을 때 grep이 빈 결과를 내고
#     "트랩이 사라졌다"는 거짓 REVERT?가 뜬다(2026-07-26 실측 · 멀쩡한 저장소에서 RED).
_gt_trap=$(grep -n '^trap _gate EXIT' "$_SELF" | head -1 | cut -d: -f1); _gt_trap=${_gt_trap:-0}
_gt_first=$(grep -n '^chk ' "$_SELF" | head -1 | cut -d: -f1); _gt_first=${_gt_first:-0}
_gt_inline=$(grep -cE '^\[ "\$fail" = "1" \]' "$_SELF"); _gt_inline=${_gt_inline:-0}
#   ④ 자기 파일을 다시 "$0"로 열지 않는가 — 허용은 맨 위 두 줄(_SELF 확정 · cd)뿐이다.
_gt_self=$(grep -vE '^[[:space:]]*#' "$_SELF" | grep -c '"\$0"'); _gt_self=${_gt_self:-0}
if [ "$_gt_trap" = "0" ]; then
  # ★여기서만 직접 exit 한다 — 트랩이 없으면 종료코드를 세울 주체가 없어 fail=1이 아무 효과도 못 낸다(그게 이 사고의 본질).
  echo 'REVERT? merge-guard.sh: EXIT 트랩(GATE_AT_EXIT)이 사라졌다 — 판정이 본문으로 돌아가면 뒤에 붙는 가드가 다시 죽는다'; fail=1; exit 1
elif [ "$_gt_first" != "0" ] && [ "$_gt_trap" -gt "$_gt_first" ]; then
  echo "REVERT? merge-guard.sh: 트랩 등록($_gt_trap행)이 첫 검사($_gt_first행)보다 아래 — 그 사이 검사가 판정에 안 잡힌다"; fail=1
elif [ "$_gt_inline" -gt 0 ]; then
  echo "REVERT? merge-guard.sh: 본문 인라인 판정 부활($_gt_inline줄) — 그 아래 가드가 다시 죽는다. 트랩 하나만 남길 것"; fail=1
elif [ "$_gt_self" -gt 2 ]; then
  echo "REVERT? merge-guard.sh: 자기 파일을 \$0로 여는 줄이 늘었다($_gt_self > 2) — 서브디렉터리 호출에서 거짓 REVERT?가 뜬다. \"\$_SELF\"를 쓸 것"; fail=1
else
  echo 'ok merge-guard.sh: 판정=EXIT 트랩(첫 검사보다 위 · 인라인 판정 없음 · 자기참조는 $_SELF) — 어디에 덧붙여도 죽은 가드 0'
fi

# ── 2026-07-26 나레이션 더빙 확정안 반영 마커 (문안·기본값·정합 검사)
chk 'COURSE_DEF_MAP' order-preview.html 4          # 코스별 기본값 단일 원천 — applyCourse·기본 배지·추천이 같은 맵을 봄
nochk 'cakeDupNote' order-preview.html             # [CAKE_DUP_GONE] 위와 같은 이유 — 경고 함수 자체가 없다
chk 'XM_MIRROR_9KEY' assets/ritual-data.js 1       # 소요분 9키 정합 — 빌더가 기준
chk 'XM_MIRROR_9KEY' scripts/check-ritual-mirror.js 1
chk 'NAR_MIRROR' scripts/check-ritual-mirror.js 1  # 빌더 인라인 사본 <-> 원천 문안 전수 대조
# [TOAST_SCENE 2026-08-09] 옛 마커('두 사람이 함께 나이프를 잡습니다')는 장면화로 사라졌다.
# 대신 **장면을 세우는 세 문장**을 지킨다 — 하나라도 빠지면 그 자리가 다시 매끄럽지 않아진다.
#   ①★[COUNT_RETIRED 2026-08-17 사용자 지시] 카운트는 **폐지했다.**
#     *"하나둘셋도그렇고 행동을 너무 쪼개서 강요하는느낌도 별로 안좋아보여"*
#     *"이런 사진관련 하나둘셋 이런건 사진작가가 하는게 맞는거같아"*
#     ★전에는 「없으면 커팅이 언제인지 아무도 모른다」를 근거로 지켰다. 그 자리를 **작가가 맡는다**로
#       옮긴 것이지 신호를 없앤 것이 아니다. 안내 음성이 세지 않을 뿐이다.
#     ★되살리지 말 것 — 카운트를 다시 넣으면 같은 지적이 세 번째로 온다.
#     대신 **장면을 세우는 문장**이 남았는지 지킨다(무음이 되지 않게).
#   ②시연 문장(축배·둘 다 2벌) — 하객이 답할 말. 없으면 선창에 돌아오는 소리가 없다(성혼 선언과 같은 금지)
#   ③사이 문안 — 나이프를 걷고 잔을 쥐여 드리는 15~20초. 없으면 통째로 무음이다
chk '이제 두 사람이 천천히, 함께 내립니다' assets/ritual-data.js 4   # [COUNT_RETIRED] 카운트를 대신하는 장면 문장
chk '하고 답해 주시면 됩니다' assets/ritual-data.js 2
chk '두 분께 잔을 전해 드리는 동안' assets/ritual-data.js 1
chk 'cakeOut' assets/ritual-data.js 2                    # 케이크만 골랐을 때 잔 이야기가 나가던 자리
chk 'TOAST_SCENE' assets/ritual-story.js 2
chk '오래 쥐지 마시고, 다음 분께 바로 전해' assets/ritual-data.js 2  # 링워밍 속도 통제(family+all)
chk '오늘, 두 집안은 서로의 가족이 되었습니다' assets/ritual-data.js 1  # G8-out 관계 강화 문장
# ★[CLOSE_V2 2026-08-08] 폐식 문안 교체 — 옛 마커('오늘 예식의 마지막 순서입니다')는 폐기.
#   ①규칙 6 위반(정의문으로 열기) ②'마지막'이 사실과 다르다(예식 뒤 30분이 더 있다)
#   ③"자리에서 그대로"가 새 설계와 정면으로 어긋난다(이제 전원이 앞으로 모인다)
chk '모두 앞으로 나와, 두 분 곁에 서 주세요' assets/ritual-data.js 1     # 폐식 → 전체 하객컷 전환
chk '오늘 예식의 마지막 순서입니다' assets/ritual-data.js 0              # 옛 문안이 되살아나면 실패
chk 'DECL_SET_INVARIANT' scripts/check-ritual-mirror.js 1   # 선언 택1 세트 개수 3중 대조(원천·빌더·생성기)
chk "ask:{d:'하객이 함께 답하기'" assets/ritual-data.js 1    # 응답형 = 선언 택1의 네 번째 선택지(덧붙임 아님)
chk "'narr','ask','chorus','family'" order-preview.html 1
chk 'DECL_ADMIN_MIRROR' scripts/check-ritual-mirror.js 1   # 운영자 화면 2곳이 선언 주체 4종을 다루는지
chk '_declWhoLabel' admin.html 2                            # 선언 주체 라벨은 원천(DECLWHO)에서 읽는다 · 하드코딩 맵 복귀 금지
chk 'assets/ritual-data.js' admin.html 1                    # 위 함수가 참조할 원천 로드
chk "declareWho==='ask'" automation/admin/Admin.html 1      # GAS 관리자도 응답형을 분기(틀린 값 표시 방지)
chk '★AI고지_G1-4' assets/ritual-data.js 1                   # G1-4 앞 2문장 = 하객 사전 고지(발각 시나리오 차단) · 원천
chk '미리 준비한 안내 음성으로 진행합니다' order-preview.html 1   # 위 고지의 빌더 인라인 사본(NAR_MIRROR 대상)
# ★★[AI고지_부부 2026-08-12] 빌더 완성 화면의 **고지 줄은 뺐다**(사용자 지시). 근거 주석은 그 자리에 남겼다.
#   ★뺀 것은 줄이지 고지가 아니다 — 하객에게 실제로 알리는 두 곳은 그대로여야 한다. 아래 둘로 못박는다.
chk '★AI고지_부부' order-preview.html 1                       # 결정 기록(2026-08-13 계약 동의로 이전) · 빌더에 고지 줄 되살리기 금지
# ★[CONTRACT_V16 2026-08-13 사용자 "추천대로해결"] 부부 승인 자리 = 계약 동의 화면(회신4 조건 ㉯).
#   계약서 v1.6 서명란 확인 줄 + mypage 서명 판 checkLabels 넷째 줄이 짝이다 — 한쪽만 지우면
#   판에서 확인한 것과 문서에 적힌 것이 어긋난다. v1.5 보존본 매핑을 지우면 옛 서명자가
#   서명한 적 없는 확인 줄을 「확인했습니다」로 보게 된다.
chk '★AI고지_부부' mypage.html 1                              # 서명 판 넷째 줄 근거 주석
chk '★AI고지_부부' contract/v1-1.html 1                       # v1.6 서명란 확인 줄
chk 'AI 음성으로 미리 제작되며' mypage.html 1                  # 판과 문서의 같은 문안(짝)
chk 'AI 음성으로 미리 제작되며' contract/v1-1.html 1
chk 'CONTRACT_V16' mypage.html 2                              # v1.5→보존본 매핑 + 넷째 줄 주석
chk "archive/v1-5" mypage.html 1                              # 옛 서명자 열람 경로
chk "docVersion: 'v1.8'" automation/platform/70_journey.gs 1  # 서명 스냅샷 버전(GAS 재배포 필요) — v1.7=금액 인상[PRICE_2026_08]
chk '미리 준비한 안내 음성으로 진행합니다' assets/ritual-data.js 1   # ①하객 맞이 음성(완곡)
chk 'AI 음성 안내로 진행합니다' admin.html 1                   # ②식순지 인쇄물(명시)
nochk '식순지엔 AI 음성 안내로 적혀요' order-preview.html      # 빌더 화면에서는 뺀 줄
chk '진행 안내는 뒷면에 있습니다' admin.html 1                  # 식순지 앞면 유도 한 줄 — 뒷면이 유일한 AI 명시 채널이라 필수(조건 ㉮)
chk 'PRINT_FROM_SOURCE' admin.html 1                        # 인쇄물 문안 복붙 금지(네 번째 원천 방지) 표식
chk '_DECL_CARD_WHO' admin.html 3                           # 낭독 카드 대상 주체 배열 · 합송(chorus) 분기 자리 보존
chk "'나레이션 대행' 선택지 복원 금지" assets/ritual-data.js 1   # 8842582로 폐지된 선택지 · 카피만 뒤늦게 정리(제거 지시 보존)
chk 'FESTIVE_MIN_WHY' assets/ritual-data.js 1                   # 축하 여유 16분은 오타 아님 · 첫 예식 실측 전 낮추기 금지
chk '가장 가까운 정면 열에 앉으신 채로' assets/ritual-data.js 3   # 헌정 큐 · 부모님 좌석·자세(3종 전부)
chk 'GOLD_TEXT_AA' index.html 6                             # 텍스트 골드는 --gold-text(#7A5F37·5.71:1) · 장식 --gold(#B89A75·2.54:1)로 되돌리기 금지
chk 'NOWRAP_CLIP_FIX' index.html 1                          # 390px서 17px 잘리던 문장 · white-space:nowrap 재삽입 금지
chk 'MOCKUP_ARIA_HIDDEN' index.html 1                       # 장식 목업 스크린리더 제외 · 목업에 포커스 요소 추가 시 함께 재검토
chk 'SECTION_RHYTHM' index.html 2                           # 섹션 간격은 .divider 단독(--gap×2+40) · 새는 마진 차단 규칙 + about 인라인 마진
chk 'SECTION_RHYTHM_TIER2' index.html 1                    # 장 전환 4경계 divider +32px(264/312) · 기본 200/248과 2단 리듬 유지
chk 'TYPO_SCALE7' index.html 1                              # 본문·라벨 7단계(11~20) · 반px 금지 · 목업 구역 예외
chk 'TYPO_RHYTHM' index.html 1                              # 타임라인 항목 padding 40px — 벽처럼 붙는 회귀 금지
chk 'HOME_MASTHEAD_WORDMARK' index.html 2                       # 홈 마스트헤드 = 워드마크 이미지(width 148/130px) · height 기준으로 되돌리면 이 면만 크기가 어긋난다(원본 비율 7.3:1)
chk 'SCHED_STICKY_BAR' schedule.html 5                          # 하단 고정 선택 바 마크업+숨김 시 접근성(visibility)+푸터 여백 토글 · 마크업만 또 소실되면 기능이 조용히 꺼진다
chk 'id="stickyBar"' schedule.html 1                            # JS 배선 계약(stickyBar·stickyPick·stickyBtn) — id 이름 변경 금지
chk 'SCHED_FOOTER_LOGO' schedule.html 1                         # 스케줄 푸터 워드마크 1장 · 비우면 이 페이지만 끝이 뚝 끊긴다
chk '.sticky-label{color:var(--gold-text)}' schedule.html 1     # 9.5px 골드 라벨 2.54:1 → 5.71:1 · var(--gold)로 되돌리기 금지
chk 'TRACK_RAMP8' index.html 1                              # 자간 8단계 램프 · 히어로/워드마크/목업 예외
chk 'A11Y_PINCH_ZOOM' index.html 1                          # 핀치줌 허용 · user-scalable=no 재삽입 금지(WCAG 1.4.4)
chk 'A11Y_LETTER_EXPOSED' index.html 1                      # 받은편지 예시는 콘텐츠 · aria-hidden 되돌리면 버튼이 포커스만 되고 안 읽힘
chk 'A11Y_FOOTER_AA' index.html 1                           # 푸터 f-copy 알파 0.7 유지 · 0.44로 되돌리면 2.71:1 미달
chk 'A11Y_INPUT_16' index.html 1                            # 입력창 16px 이상 · 미만이면 iOS가 포커스 시 강제 확대
chk 'A11Y_LABEL_MATCH' index.html 1                         # aria-label은 보이는 글자를 포함(WCAG 2.5.3) · 요약형으로 축약 금지
chk 'SUB_TYPO_SYNC' schedule.html 1                         # 서브페이지 타이포 이식 마커 · 반px 재유입 금지
chk 'SUB_TYPO_SYNC' mypage.html 1                           # 반px 제거 상태 유지(정수 통합은 로그인 QA 후)
chk 'SCHED_FAIL_AA' schedule.html 1                         # 오류 화면 링크 #7A5F37(5.71:1)·main 유지 · #9A7F5F로 되돌리면 3.6:1 미달
chk 'SCALE_LEADING7' index.html 1                           # 행간 8단계 램프(한글 보정) · 목업 구역 예외
chk 'SCALE_RADIUS6' index.html 1                            # 모서리 2/4/6/8/12+알약 · 폰 목업 곡률 예외
chk 'WEIGHT_RAMP4' index.html 1                             # 굵기 300/400/500/600 · 350은 300으로 렌더되는 유령값
chk 'BRAND_VAR' index.html 1                                # 브랜드색 하드코딩 금지 · var(--accent)/(--seal) 사용
chk 'HERO_VIG_REVERT' index.html 1                          # 히어로 비네트 회갈(58,45,34) 원복(사용자 실기기 판정) · 재변경은 실기기 확인 후에만
chk 'PERF_CV_SECTIONS' index.html 1                         # 아래 8섹션 content-visibility:auto · 제거하면 첫 로드 레이아웃 5.6s 회귀
chk 'TEASE_LINE_CASCADE' index.html 3                       # 티저 두 줄 시차 페이드(마크업·CSS·JS) · 한 덩어리 페이드로 되돌리기 금지
chk 'CTA_TYPE_QUIET' index.html 2                           # 전환 CTA 글자 14px/0.08em(schedule .btn과 동일 격) · 16px로 되돌리기 금지
chk 'MOTION_RAMP5' index.html 1                             # 전환 0.12/0.3/0.45/0.7/1.2 · 이징 var(--ease) 통일 · 기본 ease 재유입 금지
chk 'INQ_A11Y' inquiry.html 1                               # 전환 페이지 접근성 · role=tablist 재삽입 금지(자식이 button)
chk '<main' inquiry.html 1                                  # 폼 영역 main 랜드마크 · div로 되돌리면 랜드마크 소실
chk 'INQ_FONT_FALLBACK' inquiry.html 1                      # 폰트 폴백 메트릭 · 제거하면 CLS 0.245 회귀(웹폰트 도착 시 페이지가 밀림)
chk 'INQ_CLS_NAVLOGO' inquiry.html 1                        # head 크리티컬 CSS(로고 크기) · 빼면 CLS 0.97 재발
chk 'SUB_PAGE_SYNC' parents.html 1                          # 토큰 체계 동기(반px·푸터 AA·aria-label) 유지
chk 'SUB_PAGE_SYNC' invitation-gallery.html 1               # 반px·이징 동기 유지 · 템플릿 base64 구역은 대상 아님
chk 'TOKENS_REF' shared/tokens.css 1                        # 참조본 경고 헤더 · --gold-deep에 다른 색(#9A7B4F) 재삽입 금지(연결 시 mypage 68곳 AA미달)
chk 'NAV_TABLET_FIX' index.html 1                           # 내비 전환점 1023px · 680px로 되돌리면 아이패드에서 My Page가 화면 밖으로 밀림
chk 'EDGE_BACK' index.html 1                                # 가장자리 스와이프 뒤로가기 연결 · iOS 제외 로직은 스크립트 내부
chk 'EDGE_BACK' inquiry.html 1                              # 가장자리 스와이프 뒤로가기(전환 페이지)
chk 'EDGE_BACK' parents.html 1                              # 가장자리 스와이프 뒤로가기
chk 'EDGE_BACK' schedule.html 1                             # 가장자리 스와이프 뒤로가기
chk 'EDGE_BACK' mypage.html 1                               # 가장자리 스와이프 뒤로가기 · 당겨서 새로고침(세로)과 공존
chk 'SHEET_DISMISS' shared/edge-back.js 1                   # 모달 아래로 쓸어 닫기 · 캔버스/입력 위에서는 포기
chk 'ZONE_MIN' shared/edge-back.js 1                        # iOS는 시스템 띠(0~20px)를 비켜 24~76px에서 받는다 · 통째로 끄지 말 것

# ── 현장 콘솔 · 큐 엔진 (2026-07-31) ─────────────────────────────
chk '\[CUE_ENGINE_V1\]' assets/ritual-cue.js 1               # 큐 생성 엔진 본체 · 콘솔과 미리듣기가 같이 죽는다
chk 'CUE_FIRE_RULE' assets/ritual-cue.js 2                   # "앞 큐에 live가 있으면 manual" 규칙 주석 · 지우면 수동/자동 판정 근거가 사라짐
chk 'LIVE_DOING' assets/ritual-cue.js 1                      # 말/동작 구분 · 빠지면 입장·반지에 "직접 말하는 시간"이 뜬다
chk '\[CONSOLE_V1\]' console.html 1                          # 디렉터 콘솔 본체
chk 'LIVE_DOING' console.html 1                              # 콘솔 쪽 말/동작 분기
chk '\[CUE_GUARD_V1\]' scripts/check-ritual-cue.js 1         # 큐 엔진 회귀 검사 자체
# 큐 엔진 회귀 검사 — §3-A 20큐 판정표 · CUE_FIRE_RULE · EXTRA 문안 대조를 전 조합에서 돌린다
if command -v node >/dev/null 2>&1; then node scripts/check-ritual-cue.js || fail=1; fi
# ★★[PREVIEW_UPTO 2026-08-12 사용자 제보 "중간에 저장후나가기 했는데 미리듣기는 폐식까지 나온다"]
#   S.seen(방문한 단계 키)으로 그 뒤를 자른다. 여기가 깨져도 **화면은 멀쩡하고 소리만 달라진다** —
#   조용히 낡는 자리라 그물이 필요하다. 브라우저가 없어도 되므로 게이트가 직접 돌린다.
#   ★가장 중요한 안전선은 자르기가 **preview 밖으로 안 새는 것**이다. live 로 새면
#     그날 식장에서 폐식이 안 나온다 — 되돌릴 수 없다.
#   ★이 검사는 클로드코드가 임시 스크립트로 쟀던 다섯 갈래를 저장소에 남긴 것이다(목록 ★17).
#   돌연변이 5발 전부 붉음(실측): preview 조건 제거 → live 24→8 · 자르기 제거 → 16→16 ·
#     uptoAfter 하나 어긋 → 9 대 8 · KEYS 에 vowText 추가 → 주소에서 서약문 검출 ·
#     KEYS 에서 seen 제거 → 「실어 놓고도 못 자른다」
if command -v node >/dev/null 2>&1; then node scripts/check-preview-upto.mjs || fail=1; fi
chk 'PREVIEW_UPTO' scripts/check-preview-upto.mjs 8
chk "mode === 'preview' && S.seen" assets/ritual-cue.js 1    # ★자르기가 preview 안에만 사는 그 줄 · live 로 새면 식장에서 폐식이 안 나온다
# ★[UPTO_CLOSE_FIXED 2026-08-13 점검 발견] 폐식(_close)은 「안 본 것」으로 세지 않는다.
#   폐식은 방문하는 단계가 아니라 늘 붙는 고정 마무리 — S.seen 에 실릴 길이 없다. 이걸 세면
#   고를 것을 **전부 본** 고객(글 적기까지 걷고 저장한 사람)의 미리듣기가 폐식 하나 때문에 잘리고
#   「그 뒤는 아직 정하기 전」이라는 거짓 안내가 뜬다. 돌연변이 실측: 고침 되돌림 → rc=1
#   「고를 것을 전부 봤는데 잘렸다(upto=toast)」. 중간 이탈 자르기는 그대로다(★③ 이 지킨다).
chk 'UPTO_CLOSE_FIXED' assets/ritual-cue.js 1                # 제외 조건이 사는 그 줄 · 지우면 전부 걸은 고객이 다시 잘린다
chk 'UPTO_CLOSE_FIXED' scripts/check-preview-upto.mjs 4      # 경계 그물(전부 방문 → 안 자름 + 폐식 포함) · 줄면 그물이 삭은 것
# ★위 제외 조건은 _close 하나 집기에서 **_ 접두 전체**로 일반화됐다(병렬 발견 합침 · 자동 블록 키 여섯:
#   _close·_farewell·_final·_goodbye·_greet·_photo). 오늘 미리듣기 꼬리엔 _close 뿐임을 전 코스×digital
#   실측했다 — 동작 동일 · 미래만 넓힌다. '_close' 하나 집기로 되돌리면 다른 자동 블록에서 재발한다.
chk "charAt(0) !== '_'" assets/ritual-cue.js 1
# ★[DONE_SEEN_EMPTY 2026-08-13 같은 점검이 잡은 짝 사고] 완성 저장(done:true) 꾸러미에 seen 이 통째로
#   실렸다 — 비우는 조건이 _doneSaved(회신 뒤에야 참)여서 「완료 저장에서는 비운다」는 의도와 코드가
#   달랐다. 엔진 고침이 증상을 구제하지만 서버 초안 자체도 깨끗해야 한다(두 겹).
#   돌연변이 실측: fin 인자 되돌리면 check-ord-save rc=1(「완성 저장 꾸러미의 seen 이 4개」).
chk 'DONE_SEEN_EMPTY' order-preview.html 2
chk '_ordPayload(true)' order-preview.html 1                 # 완성 저장만 fin — 나가며·손 저장은 seen 을 실어야 자르기가 산다
chk 'DONE_SEEN_EMPTY' scripts/check-ord-save.mjs 2

# ── 텍스트 장면 레이어 · 고객 미리듣기 (2026-08-02) ──────────────
chk '\[STORY_LAYER_V1\]' assets/ritual-story.js 1            # 고객이 읽는 장면 지문 원천 · 미리듣기 화면이 통째로 빈다
chk 'STORY_KEY_IS_SOURCE' assets/ritual-story.js 1           # LIVE의 키는 live.t 원문 · slug로 바꾸면 꽃/큰절/포옹이 한 칸에 뭉친다
chk 'STORY_BLOCK_FILL' assets/ritual-story.js 1              # 순서 소개의 원천은 COURSES[].detail · BLOCK은 detail에 없는 것만
chk '\[STORY_COVER\]' scripts/build-course-story.mjs 1       # 커버리지 검사 + 코스별 장면 대본 생성기 자체
chk 'FIRE_FROM_CONSOLE' scripts/build-course-story.mjs 1     # 진행 방식은 console 빌드가 진실 · preview meta로 세면 머리글이 거짓말한다
# 장면 레이어 커버리지 — 미커버/중복/죽은 문안/fallback 원문 어긋남/내부 용어 누출을 전 조합에서 잡는다
if command -v node >/dev/null 2>&1; then node scripts/build-course-story.mjs --check || fail=1; fi

# ── 배역 예시 음성 · 고객용 미리듣기 스킨 (2026-08-02) ───────────
#   배역 클립은 '고객 화면에서만' 쓰인다 — 디렉터 콘솔은 이 표를 한 번도 읽지 않는다.
#   그래서 여기서 안 잡으면 틀린 채로 고객에게만 보이고, 우리 눈에는 끝까지 안 띈다.
chk 'CAST_MAP_V1' assets/ritual-story.js 1                   # 배역 클립 15종 표 · 빠지면 고객 화면에 예시 목소리가 통째로 안 붙는다
chk 'CAST_KEY_NS' assets/ritual-story.js 1                   # CAST_AT 키 세 갈래(slug:/live:/own:) 근거 · 뭉치면 엉뚱한 자리에 붙는다
chk 'CAST_TWO_SLOTS' assets/ritual-story.js 1                # 한 큐가 main·live 두 자리를 동시에 가지면 한쪽이 조용히 먹힌다
chk 'CAST_TWO_SLOTS' scripts/build-course-story.mjs 1        # 그 겹침을 전 조합에서 잡는 판정 · 지우면 겹쳐도 통과한다
chk 'CAST_PAIR' assets/ritual-story.js 2                     # 두 사람이 말하는 자리(서약=신랑+신부)의 합친 배지 · 없으면 화면이 나머지 한 사람을 지운다
chk 'castBadgeOf' console.html 1                             # 배지 문구 조립은 장면 레이어가 한다 · l[0]로 되돌리면 신부가 화면에서 사라진다
chk '\[CAST_COVER\]' scripts/build-course-story.mjs 1        # 배역 매핑 커버리지 · 죽은 키/죽은 클립/manifest 역할 불일치를 매번 대조
chk 'GUEST_SKIN' console.html 3                              # 고객 스킨 분기 · 빠지면 디렉터 설정 패널·조작 문구가 고객에게 그대로 보인다
chk 'TIMER_REARM' console.html 1                             # 미리듣기 타이머 재무장 · 빠지면 중간에 멈춘 채 끝까지 안 간다
chk '\[GUEST_SKIN_RENDER\]' scripts/check-guest-skin.mjs 1   # 6조합 × 390/1280 실렌더 검증 자체
#   ※ check-guest-skin.mjs 는 여기서 실행하지 않는다 — 브라우저와 로컬 서버(:8765)가 필요해서다.
#     console.html · ritual-story.js · ritual-cue.js 를 고쳤으면 푸시 전에 손으로 한 번 돌릴 것.

# ── 덕담 길어짐 대응 (2026-08-01 · 런북 §8 4단 · §11-A) ─────────
chk 'ALT_CLIP' assets/ritual-cue.js 1                        # 한 큐가 문안 2개를 갖는 구조 · 빠지면 alt가 통째로 사라져 3분 초과 대응이 없어진다
chk 'ALT_CLIP' console.html 2                                # 콘솔 판정부(resolve)와 fire 진입부 · 하나만 남으면 판정이 다음 큐로 샌다
chk 'BLESS_LONG' assets/ritual-data.js 1                     # blessEndLong 문안 · 지우면 24번 뒤 클립 번호가 통째로 되밀린다
chk 'BLESS_LONG' order-preview.html 1                        # 1단 예방 문안('한 말씀 청하겠습니다') 근거 주석
chk '한 말씀 청하겠습니다' assets/ritual-data.js 1             # 열어만 두는 '말씀이 있습니다'로 되돌리기 금지(§8 1단)
chk '한 말씀 청하겠습니다' order-preview.html 2                # 빌더 인라인 사본 2곳 · 하나만 고치면 화면과 완성 대본이 갈린다
# [NO_DIRECTOR_READ 2026-08-14 사용자 지시 "디렉터가 대신읽어주는 건 없어 삭제"]
#   FALLBACK_LADDER 는 「기다림 · 배우자 이어읽기 · 디렉터 대독」 셋을 한 문장에 담는 규칙이었다.
#   그런데 셋째가 **실제로 하지 않는 일**이었다 — 근거 있는 안심만 적는다는 규칙(2026-07-15)은
#   근거를 붙이라는 뜻이지 없는 서비스를 근거처럼 적으라는 뜻이 아니다.
#   ★남은 사다리는 둘(기다림 · 배우자). 디렉터 대독을 되살리지 말 것.
chk 'NO_DIRECTOR_READ' order-preview.html 2
chk 'NO_DIRECTOR_READ' assets/ritual-story.js 1
nochk "필요하면 대신 읽어 드려요.');" order-preview.html
nochk '힘드시면 저희가 대신' assets/ritual-story.js
chk 'NAR_MIRROR' order-preview.html 1                        # endLong 인라인 사본이 '안 쓰이니 지워도 된다'로 보이지 않게 하는 주석
chk 'PHASE_CLIP' console.html 1                              # 클립 재생 중 phase를 끊는 한 줄 · 빼면 녹음이 흐르는 동안 "사람의 시간"이 남는다
chk 'ALT_CLIP_TEST' automation/tests/console-alt-clip.mjs 1  # 실렌더 검증 스크립트 자체(브라우저 필요라 여기선 실행 안 함 · 손으로 돌릴 것)

# ── 더빙 대본 단일 원천 (2026-08-01) ────────────────────────────
chk 'DUB_SHEET_GUARD' scripts/check-dub-sheet.js 1                          # 시트/자동생성 대본 드리프트 검사 자체
chk '더빙_녹음_대본_최종.md' 'docs/plans/식순연구/더빙_대본_시트.md' 1        # 시트가 단일 원천을 지목 · 빼면 읽는 사람이 어느 문서로 녹음할지 갈린다
chk 'AI 음성 고지' scripts/build-dubbing-script.mjs 1                        # G1-4 고지 삭제 금지 근거 · 예식 전체에서 AI 고지가 나가는 유일한 자리
# 시트가 문안·연출노트를 다시 복사해 들고 있으면 여기서 걸린다(2026-08-01 드리프트 8건 · 그중 4건이 사고급)
if command -v node >/dev/null 2>&1; then node scripts/check-dub-sheet.js || fail=1; fi

# ── 타입캐스트 핸드오프 무인화 (2026-08-02) ────────────────────
#   붙여넣기 전(VOICE_PROBE)·되받기(PART_AUTOMATCH) 두 자리에서 사람 손을 없앤 자동화.
#   되살아나면 안 되는 폐지: "받은 폴더 이름을 1_안내/ 처럼 파트 번호로 시작하게 바꿔 주세요".
#   타입캐스트 zip 이름에는 우리 파트 번호가 없어 그 안내는 매번 사람이 손으로 고쳐야 했다.
chk 'PART_AUTOMATCH' scripts/assemble-narration.mjs 3        # 개수+길이로 파트를 짚는 본체·주석·안내 3곳 · 빼면 '폴더 이름 맞추기'가 되살아난다
chk 'VOICE_PROBE' scripts/build-typecast-import.mjs 1        # 0_보이스확인.txt 생성부 · 빼면 이름 오타가 5파트 다 붙여넣은 뒤에야 드러난다
chk 'PART_AUTOMATCH' 'docs/plans/식순연구/타입캐스트/README.md' 1   # 절차서 쪽 근거 · 빼면 폐지된 폴더 이름 규칙이 문서로 되돌아온다
chk 'TC_HANDOFF_GUARD' scripts/check-typecast-handoff.mjs 1  # 아래 상시 검사 자체
# 프로브·파트 개수가 manifest와 어긋나면 여기서 걸린다 — 어긋난 채로 붙여넣으면 크레딧을 쓰고 나서야 안다
if command -v node >/dev/null 2>&1; then node scripts/check-typecast-handoff.mjs || fail=1; fi

# ── 상담 도우미 패널 개편 (2026-08-01) ────────────────────────
chk 'ADV_INDEX' index.html 3                                 # 목차형 메뉴 3곳(칩·라벨·›) · 선 없애고 여백으로 나눔 · ›를 글자 뒤에 붙임 · 14px
chk 'ADV_TC' index.html 5                                    # 상태바 진사 띠 방지 · 히어로 잠금 + 동기화 훅 + 상담패널 + 모바일 메뉴(열기/닫기)
chk 'MM_TOPROW' index.html 6                                 # Close를 눈썹 행에 묶음 + 상단 여백 env() · 절대배치/고정 104px로 되돌리면 기기마다 어긋난다
chk '__meTCSync' index.html 2                                # 잠금 해제 시 캐시 비우고 재계산 · 없으면 닫은 뒤 테마색이 한 번 씹힌다
chk 'ADV_OPEN_TOP' index.html 1                              # fab 클릭에 open을 그대로 넘기면 MouseEvent가 keepScroll로 들어가 목록 상단이 잘린다
chk 'me-adv-chip:active' index.html 1                        # 폰엔 호버가 없다 · 눌림 워시를 지우면 탭 피드백이 사라진다

# ── 청첩장 CTA 통일 · 관리자 설문 요약화 (2026-08-01) ──────────
chk 'BTN_TIER' index.html 7                                  # 버튼 2단 체계 · 청첩장 미리보기도 외곽 마룬으로 편입(세 번째 스타일 금지)
chk 'journal-guide-link' index.html 10                       # 외곽 마룬 버튼 3곳(청첩장·하객 안내·부모님)이 같은 클래스를 쓴다
chk 'SV_DIGEST' admin.html 3                                 # 설문 요약화 · neg 정의 + renderSurvey + 접힘 CSS
chk 'sv-fold' admin.html 8                                   # 문항별 분포·후기 접기 · 풀면 응답 1건에 막대 12개가 다시 깔린다
chk 'sv-watch' admin.html 5                                  # '눈여겨볼 응답'만 추리는 요약 카드 · 이게 빠지면 요약이 평균 3개뿐이 된다
chk 'GUIDE_DEMO' guide.html 4                                # ?g=demo 표본 · GAS 무호출 · 좌석 결과 선표시(배너는 2026-08-01 사용자 지시로 제거)
chk "g==='demo'" guide.html 1                                # 데모 분기는 boot 맨 앞 · 실제 하객 경로는 이 코드를 지나가지 않는다
chk 'GUIDE_DEMO_CTA' index.html 1                            # 하객 안내를 '설명'에서 '열어볼 수 있는 것'으로
chk 'BTN_WIDTH' index.html 1                                 # 데스크톱 버튼 폭 288px 통일 · inline-block이라 글자 수가 폭을 정하던 것
chk 'A11Y_SEATMAP' guide.html 1                              # 가로 스크롤 배치도 tabindex=0 · 빼면 키보드 하객이 화면 밖 테이블을 못 본다(WCAG 2.1.1)
# ★[DEMO_TIP 2026-08-18] 옛 가드는 표본 지도 버튼을 죽이던 클래스를 2개 셌다(CSS + 적용).
#   그 '버튼 죽이기'는 사용자 지적으로 **정당히 폐지**했다 — 이제 표본 버튼도 눌리고,
#   누르면 시트가 실제 동작을 말한다. 그래서 세는 것을 바꾼다: '이동을 막는다'는 여전히 지키되
#   (a→button 이라 애초에 이동할 수 없다), 대신 **말해 주는가**를 센다.
#   ★아래 nochk 는 그 폐지한 클래스가 되살아나는 것을 막는다(죽은 버튼 복귀 금지).
nochk 'act\-off' guide.html
chk "querySelectorAll('a.act')" guide.html 1                 # 표본에선 지도 <a> 를 button 으로 갈아 끼운다 · 지어낸 가게로 지도를 띄우지 않는다
chk 'ps-btn-off' guide.html 3                                # 남는 잠금은 '업로드 중' 한 가지뿐(CSS + 걸기 + 풀기)
chk 'GUEST_PREVIEW' index.html 1                             # 청첩장·하객 안내 미리보기를 한 블록으로 · 3줄 설명으로 되돌리지 말 것
chk 'GALLERY_GUIDE' invitation-gallery.html 2                # 10번째 카드 = 하객 안내 표본 · 빼면 오프라인판 발견 여정의 종착지가 사라진다
chk "g=demo" invitation-gallery.html 1                       # 10번째 카드가 가리키는 표본 주소
chk 'GALLERY_HREF' invitation-gallery.html 1                 # Open↗ = 화면과 같은 실물 주소 · 폴백 404 사고(2026-08-01)의 재발 방지 근거 주석
# ── 갤러리 실물 전환 (2026-08-01 · 관문 GV_CHOOSE는 GV_VER 토글로 대체·폐기) ──
chk 'GV_REAL' invitation-gallery.html 3                      # 실물(cover/family) src 직접 표시 · base64 사본으로 되돌리면 문서 651KB + 이중 관리 부활
chk 'GV_VER' invitation-gallery.html 5                       # 온라인/오프라인 판 토글 · 관문으로 되돌리지 말 것(학습 순서 역전)
chk 'HYDRATE_DEMO' shared/hydrate.js 2                       # test-couple = 시트 무조회 표본 + 하객 안내 버튼 상시 주입 · 빠지면 홍보 조회가 GAS를 때리고 시트 잡값이 노출된다
chk 'i-family/family-01.html' invitation-gallery.html 1      # 오프라인판 실물 연결 · 카탈로그로 되돌리면 '전체 볼 수 있게'가 다시 깨진다
chk 'GD_TRY' i/invitations/invitation-09-guide.html 2        # '이렇게 맞춰집니다' 카드의 눌러보기 버튼 · 갤러리 안에선 카드 이동
chk 'GD_TRY' invitation-gallery.html 1                       # 그 버튼이 보내는 메시지를 받는 쪽 · 빠지면 버튼이 먹통이 된다
chk 'GV_CENTER' invitation-gallery.html 1                    # .gv-stage min-width:0 근거 · 지우면 스테이지가 4920px로 부풀어 프레임이 왼쪽으로 밀린다
chk 'GV_SCROLLBAR' invitation-gallery.html 1                 # 프레임 안 실물 스크롤바 숨김 주입 · 윈도우에서 회색 막대 재발 방지
chk 'GV_OPEN_SAME' invitation-gallery.html 1                 # Open은 같은 탭 · ?i·?v 기록 덕에 뒤로가기로 정확히 복귀
chk 'GUIDE_INFRAME' guide.html 2                             # 프레임 안에선 뒤로·홈 버튼을 켜지 않는다 · 미리보기 여정 밖으로 새는 문
chk 'GUIDE_SCROLLCUE' guide.html 3                           # 스크롤바 숨김 + Scroll 큐 · 내용이 길 때만 나타나고 스크롤하면 사라진다
chk 'DEMO_SEATS' guide.html 1                                # 표본 좌석 만석 5석 + 맨뒤 2석 · 총 24명(25명 약속 안쪽) · 늘릴 때 25 넘기지 말 것
chk 'INV_BACK' shared/hydrate.js 1                           # 알약이 shared/gv-back.js 로 옮겨 간 자리 표시 · 여기에 다시 만들지 말라는 안내가 남아 있어야 한다
chk 'GV_SCROLLCUE' invitation-gallery.html 1                 # 프레임 안 Scroll 큐 · 없으면 83~87% 깊이의 하객 안내 CTA를 '없다'고 오해한다
chk 'CTA_STACK' shared/hydrate.js 1                          # 하객 안내 CTA position:relative+z-index · 빼면 배경 레이어(.venue-bg 등)에 덮여 일부 디자인만 조용히 사라진다
chk 'GUIDE_DRINK' guide.html 4                               # 내 자리 음료 3종(마이페이지 계약) · 서버가 drink를 보낼 때만 뜬다 · 남의 음료 노출 금지
chk 'DEMO_MAP' guide.html 2                                  # 표본 지도 도식 · 지명·도로명 없는 추상 도식이어야 한다
chk 'PS_QUIET' guide.html 1                                  # 사진 올리기 = 채움·진사 없는 헤어라인 버튼 · 골드 채움으로 되돌리지 말 것
chk 'LIVE_DEMO' live.html 1                                  # ?e=test-couple = 프리뷰(GAS 무호출) · 빼면 갤러리 온라인판 Enter가 '예식을 찾을 수 없습니다'로 떨어진다
chk 'MOCKUP_TERSE' index.html 1                              # 목업 설명 30자 이내 1줄 규칙 · 옆 폰이 이미 화면을 보여주므로 글이 한 번 더 묘사하면 중복이다
#   ★[GA_TABS 2026-08-18] 2→1 — 마커 하나가 손목업 마크업 안에 있었고 그 마크업이 실물 iframe 으로 대체됐다.
#     규칙 자체는 살아 있다(목록 문구가 JS 로 옮겨갔을 뿐).
chk 'VENUE_MAP_DEMO' shared/hydrate.js 2                     # 표본만 지도 도식 · 실물은 '장소는 본 계약 후'를 그대로 둔다(본계약 전이라 정확 주소가 없는 건 사실이다) · 하객에게 가짜 지도 금지
chk 'xMidYMid slice' shared/hydrate.js 1                     # 지도 도식 slice · 08종 박스 비율이 제각각이라 이걸 빼면 디자인마다 찌그러진다 (주석이 아니라 SVG 속성을 직접 지킨다)
chk 'CTA_EYEBROW' shared/hydrate.js 1                        # Guest Guide 라벨 opacity .68 = 5.0:1 · .55로 되돌리면 3.1:1로 AA 미달, 고정 hex로 바꾸면 어두운 디자인에서 안 보인다
chk 'OFF04_DATE_REAL' i-family/family-04.html 1              # 04 가족판 SAVE THE DATE 실데이터 토큰 · '08·23' 시안 잔재로 되돌리면 모든 커플이 8월 23일로 나간다
chk 'WEDDING_MONTH_NUM_PAD' i-family/family-04.html 1        # 위와 세트 — 주점 스타일 유지한 월·일 토큰
chk '{{WEDDING_YEAR_EN}}' i/cover-04.html 1                  # 04 온라인판 연도 토큰 · 'Two Thousand Twenty-Six' 하드코딩 복귀 금지
# ── 2026-08-02 16종 디자이너 검수 교정 [AUD16] — 마커·구조 가드
chk 'AUD16' i/cover-01.html 28                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-02.html 26                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-03.html 34                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-04.html 15                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-05.html 25                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-06.html 8                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-07.html 28                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i/cover-08.html 12                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-01.html 31                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-02.html 29                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-03.html 38                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-04.html 15                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-05.html 25                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-06.html 5                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-07.html 33                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'AUD16' i-family/family-08.html 10                     # 16종 교정 마커(대비·role·이탤릭·토큰) · 줄면 어딘가 되돌아간 것
chk 'DEMO_ENVELOPE' shared/hydrate.js 1               # 표본에 마음 전하실 곳 재현 · 빼면 예비 고객이 봉투 기능을 못 본다
chk 'CTA_FONT' shared/hydrate.js 1                    # 하객 안내 카드 서체를 본문 문단에서 상속 · 빼면 01에서 혼자 산세리프
chk 'INV_BACK_DODGE' shared/gv-back.js 1              # 알약 워드마크 회피 히트테스트 · 빼면 커버 로고를 가린다(옮겨 온 뒤에도 살아 있어야 한다)
chk '{{WEDDING_MONTH_NUM_PAD}}' i/cover-03.html 1     # 03 날짜 토큰(하드코딩 동류 결함 수정분)
chk '{{WEDDING_MONTH_NUM_PAD}}' i-family/family-03.html 1
chk '{{WEDDING_YEAR}}' i/cover-04.html 1              # 04 콜로폰 연도 토큰
chk '{{WEDDING_YEAR}}' i-family/family-04.html 1      # 04 가족판 콜로폰 신설(판형 짝)
# 장식 달력 role=grid 금지 — 재유입 즉시 적발 (aria-required-children critical 재발 방지)
for _f in i/cover-02.html i/cover-03.html i/cover-05.html i/cover-06.html i/cover-07.html i-family/family-02.html i-family/family-03.html i-family/family-05.html i-family/family-06.html i-family/family-07.html; do
  if grep -v '<!--' "$_f" | grep -q 'role="grid"'; then echo "REVERT? $_f: 장식 달력에 role=grid 재유입"; fail=1; else echo "ok $_f: role=grid 없음(주석 제외)"; fi
done
# ── 2026-08-02 변주 스트레스 심화 [DTL16] — 16종 하나씩 점검 라운드
chk 'DTL16' i/cover-01.html 9                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-02.html 7                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-03.html 8                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-04.html 7                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-05.html 10                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-06.html 8                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-07.html 9                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i/cover-08.html 8                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-01.html 11                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-02.html 8                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-03.html 8                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-04.html 6                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-05.html 9                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-06.html 7                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-07.html 7                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' i-family/family-08.html 7                     # 변주(긴이름·결손·6주달력·오전) 견고성 교정 마커
chk 'DTL16' shared/hydrate.js 1                       # '본 계약 후' 안내문 4.95:1
# '15분 전' 자기중첩 사문 셀렉터 재유입 금지 (8종 가족판 전수에서 적발·정정된 오타 패턴)
for _f in i-family/family-01.html i-family/family-02.html i-family/family-03.html i-family/family-04.html i-family/family-05.html i-family/family-06.html i-family/family-07.html i-family/family-08.html; do
  if sed 's|/\*.*\*/||g' "$_f" | grep -q "\.venue-meta-row \.venue-meta-row"; then echo "REVERT? $_f: 자기중첩 사문 셀렉터 재유입"; fail=1; else echo "ok $_f: 자기중첩 셀렉터 없음(주석 제외)"; fi
done
chk 'LD_FILL' shared/hydrate.js 1                      # JSON-LD 런타임 채움 · 빼면 커버 8종 구조화 데이터가 " ·  결혼식"/빈 날짜로 회귀
chk 'INV_EM_HINT' mypage.html 1                        # 별표 힌트 '강조' 문구 · '금색'으로 되돌리면 디자인 5종에서 거짓 안내
chk 'SEAT_DRINK_SRV' automation/platform/80_production.gs 2   # 전체 배치도 쪽 1건은 [SEAT_DRINK_NOSEND 2026-08-16]로 정당히 제거 — 검색 경로(본인 1자리)만 남는다        # seatView 음료 3곳(전체공개 tables · 슬림 보존 · 내자리만 hits[0].drink) · 하나만 빠져도 한쪽 모드에서 음료가 사라진다
chk 'PC_TALL' invitation-gallery.html 1                # PC 미리보기 프레임 높이 재배분 · 빼면 1440x900에서 551px로 되돌아간다
chk 'INV_COVER_COPY' mypage.html 1                     # 표지 이름 안내 — '영문만'은 01(병기)·06(한글 주도)에서 거짓
chk 'lp-cta-preview' live.html 2                        # 프리뷰 CTA 뮤트 배경(opacity 금지) · 되돌리면 흰 글자가 3.31:1로 무너진다
chk 'gold-text' i/invitations/invitation-09-guide.html 2   # 09 카드 글자용 진골드
chk 'FAB_OVER_FS' mypage.html 2                        # 위저드 전체화면(.mp-fs z:950) 위로 FAB 스택 올림 · 빼면 '청첩장 샘플' 아이콘이 다시 파묻힌다
chk 'GALLERY_LIVE' invitation-gallery.html 3           # 라이브 카드(모바일 참석) + Enter 내부 이동 + goto:live 수신
chk 'LIVE_DOW_TZ' live.html 1                          # 요일 UTC 성분 계산 · getDay()로 되돌리면 해외 하객에게 하루 밀린 요일이 나간다
chk 'LIVE_DEMO_DATE' live.html 1                       # 표본 날짜를 청첩장 SAMPLE과 일치 · 빼면 2027·12·17 더미가 노출
chk 'LIVE_INFRAME' live.html 1                         # 갤러리 프레임 안 홈 링크 무력화
chk 'GV_INFO' invitation-gallery.html 6
chk 'GV_CAP_OFF' invitation-gallery.html 1
chk 'GV_ONEROW' invitation-gallery.html 1                 # 모바일 한 줄 병합(영문 제목 접기) · 되돌리면 상단 껍데기가 98px로 복귀                # 모바일 캡션 접기 + min-height 동반 인하 · 캡션만 지우면 빈 자리만 남는다                # 안내 카드 설명(띠 연속성·옆 패널·자세히) · 빠지면 9~11번이 무설명 화면으로 회귀
chk 'GV_SAFEBG' invitation-gallery.html 1              # 모바일 몸통색 카드 추종 · 빼면 아이폰 하단 흰 박스 재발
chk 'SAMPLE_TALL' mypage.html 4                        # 샘플 모달 세로 재배분 · 되돌리면 판 토글에 눌려 미리보기가 다시 짧아진다
chk 'EG_SIDE_HONEST' mypage.html 1                     # 온라인 단독 고객에게 오프라인 크롭을 '이 청첩장'이라 하지 않는다

# ── 예식 미리 들어보기 진입점 (2026-08-02 · 기획서 §5 3단계) ─────────────────────────
# 주소를 한 곳에서만 조립한다 · 고객이 쓴 글은 주소에 싣지 않는다 · 연타로 배경이 잠긴 채 남지 않는다
chk 'PREVIEW_LINK_V1' assets/ritual-preview-link.js 1   # 주소 조립 단일 원천 · 이 파일이 사라지면 두 진입점이 각자 조립하게 된다
chk 'PREVIEW_LINK_V1' mypage.html 4                     # 마이페이지 식순 행 진입점(버튼 조립·배선·오버레이)
chk 'PREVIEW_LINK_V1' order-preview.html 4              # 빌더 완성 화면 진입점 + Esc 양보
chk 'PREVIEW_LINK_V1' scripts/audit/preview-entry.mjs 1 # 390/1280 실렌더 하네스 자체 · 지우면 위 넷이 무검증으로 돈다
chk 'PREVIEW_KEYS' scripts/build-course-story.mjs 2     # 엔진이 읽는 S 키 ↔ 미리듣기가 옮기는 키 양방향 대조(+고객이 쓴 글 차단)
chk 'RitualPreviewLink' mypage.html 2                   # 주소를 손으로 다시 만들지 않는다(마이페이지)
chk 'RitualPreviewLink' order-preview.html 2            # 주소를 손으로 다시 만들지 않는다(빌더)
chk 'MP_FS_OVERLAYS' mypage.html 6                      # 전체화면 오버레이 단일 목록 · 미리듣기가 빠지면 잠금 자가치유가 열린 판을 못 보고 스크롤이 굳는다
chk 'mp_rpViewer' mypage.html 5                         # 마이페이지 미리듣기 오버레이 id(목록·열기·닫기·잠금 판정이 이 이름을 공유한다)
chk 'ob_rpViewer' order-preview.html 4                  # 빌더 미리듣기 오버레이 id(Esc 양보 판정이 이 이름을 본다)
# ★★[TRK_PRE_QUIET 2026-08-12 사용자 지시 「미리듣기 버튼도 디자이너 관점으로 개선」]
#   높이(TRK_ACT_H36)는 2026-08-11 에 맞췄다. 남은 문제는 **한 줄에 테두리 상자가 둘**이라는 것 —
#   크기만 다를 뿐 「고를 것이 둘」로 읽혔고, 그 줄만 목록 리듬을 끊었다(다른 다섯 줄은 상자 하나).
#   보조에서 면·테두리를 걷고 글자만 남겼다. 실측(390px · 진짜 트랙을 그려서):
#     보조 x148 w67 h36 테두리 0 · 주 x225 w122 h36 테두리 1
#     주 버튼 왼끝 전부 225 · 오른끝 전부 347(한 열) · 식순 줄 높이 61 = 다른 줄과 같음
#     탭 영역 36×67 그대로 — 걷어낸 것은 테두리·배경뿐이다.
#   ★상자를 되돌리지 말 것 — 위계가 다시 폭 차이에만 실린다.
chk 'trk-act-min' mypage.html 3                         # 보조 버튼 위계(규격 + 걷어낸 테두리 + hover)
chk 'TRK_PRE_QUIET' mypage.html 1
chk 'trk-act-min{min-width:auto;padding:8px 10px' mypage.html 1   # 테두리 없는 글자 단추 그 줄
chk 'if(old) return old' mypage.html 1                  # 연타 = 떠 있는 판 그대로 · '닫고 다시 열기'로 되돌리면 히스토리 층이 어긋나 페이지 밖으로 튕긴다
chk 'if(old) return old' order-preview.html 1           # 연타 = 떠 있는 판 그대로 · 떼고 새로 짜면 배경 스크롤이 잠긴 채로 남는다

# ── 디지털 참석 → 배웅 장면 갈림 [PREVIEW_DIGITAL] (2026-08-02 · 미리듣기가 늘 오프라인 배웅으로 흐르던 결함 수리)
# 규칙은 서버 한 곳에만 산다 · 프론트는 결과만 읽는다 · 파생값을 식순 초안 S 에 굳히지 않는다
chk '_invDigital' automation/platform/85_invitation.gs 2 # 규칙 소유 함수(_invCouplesFields)를 그대로 돌려 결과만 낸다 · 지우면 프론트가 조건을 베껴 적게 되고 규칙이 바뀌는 날 사본만 옛 규칙을 지킨다
chk 'var INJECT' assets/ritual-preview-link.js 1        # '엔진은 읽는데 S 에는 없는 키' 선언 · 빠지면 [PREVIEW_KEYS]가 digital 을 '아무도 값을 안 만드는 키'로 잡아 빌드가 선다
chk 'digitalOf' assets/ritual-preview-link.js 2         # 결과 읽기 단일 원천(정의+공개) · 두 진입점이 각자 청첩장 상태를 해석하면 판정이 갈라진다
chk 'PREVIEW_DIGITAL' assets/ritual-preview-link.js 2   # 왜 S 에 안 넣는지(=_embedSave 가 서버 초안에 굳힌다) 근거 주석 · 지우면 다음 사람이 S 에 넣는다
chk 'PREVIEW_DIGITAL' mypage.html 2                     # 마이페이지 두 경로 — 식순 행 「미리 들어보기」 조립 · 빌더로 넘기는 orderFill 동봉
chk 'CUSTDIG' order-preview.html 6                      # 빌더가 받아 둔 디지털 참석 · S 가 아니라 주소 조립 순간에만 쓴다(선언·수신·조립2·주석)
chk 'PREVIEW_DIGITAL' scripts/build-course-story.mjs 1  # 정적 검사: 엔진이 읽는 키마다 값을 만드는 곳이 있나(빌더의 S 이거나 INJECT 이거나)
chk 'PREVIEW_DIGITAL' scripts/audit/preview-entry.mjs 9  # 실렌더 검사 9종(기본선 2 · orderFill 3 · 배웅 갈림 5 중 서버·폴백·우선순위 · S 이탈 차단)
chk 'GV_LIVE_TOP' invitation-gallery.html 1              # 프레임 안 라이브 브랜드 띠 고정 해제 · 되돌리면 상단에 띠가 두 겹으로 남는다
chk 'GV_EXTRAS_POLL' invitation-gallery.html 1           # load 미발생 문서에도 배선 · 라이브 카드는 load에 못 닿는다
chk 'LIVE_INFRAME' live.html 2                           # 프레임 안 조정(홈 링크·띠) · CSS 훅과 스크립트 쌍
chk 'COPY_TRIM4' index.html 1
chk 'COPY_QUIET' index.html 1                            # 수식·중복만 덜어낸 문단 7곳 · 되돌리면 최장 139자·설득조 문장이 복귀                           # 긴 문단 4곳 압축(소개·서비스 리드·두 공간·스타일링) · 되돌리면 100~122자 문단이 복귀
chk 'IG_ONCE' index.html 2                               # 기록 갤러리 = '인스타그램'을 한 번만 · 되돌리면 큰 제목이 남의 회사 이름이 되고 사진 9장 위에 배지가 다시 상시로 찍힌다(모바일 hover 없음)
chk 'ORD_ROWCTL' order-preview.html 3                   # 넣기·빼기를 ↑↓ 옆 한 칸으로 + '꼭 들어가는 순서' 알약 제거 · 되돌리면 목록이 카드당 한 줄씩 길어지고 알약이 여섯 개로 늘어난다
chk 'ORD_HUE' order-preview.html 5                      # 진사 절제(주 버튼 먹빛 · 선택 글자 accent · 칩 아웃라인) · 마이페이지와 같은 말을 쓰기 위한 것
chk 'ORD_ASK' order-preview.html 3                       # 우리 톤 확인 판 · 브라우저 confirm()으로 되돌리면 검은 시스템 판이 한 화면에 두 언어를 만든다
chk 'ORD_RESET_SRV' order-preview.html 1                # '처음부터 다시'가 서버 초안까지 비운다
chk 'ORD_RESET_SRV' mypage.html 1                       # 그 요청을 받아 실제로 비우는 쪽 · 한쪽만 있으면 나갔다 오면 완성 화면으로 되살아난다
chk 'ORD_STEPKEY' order-preview.html 1                   # 단계 이동은 키로 · idx 하드코딩으로 되돌리면 안내 화면이 하나만 늘어도 '시작하기'가 제자리를 다시 그린다(2026-08-03 실제 사고)
chk 'ORD_LEAN' order-preview.html 3                      # 순간 화면 설명 감축 원칙(부제는 제목이 말하지 않은 것만 · 안심 줄 폐지 · 목록 앞 안내 2줄) · 되돌리면 '~순간이에요' 상용구와 '대부분 X를 골라요' 중복이 복귀
chk 'ORD_A11Y' order-preview.html 1                     # 강조 행 캡션 대비(4.19→5.48)
chk 'ORD_INTRO2' order-preview.html 6                    # 안내 2화면 분리 + 퍼센트 제외 + 꼬리표 · 되돌리면 안내가 한 화면에 몰려 390px에서 3화면을 스크롤해야 '시작하기'에 닿는다
chk 'renderIntro2' order-preview.html 2                 # 둘째 안내 화면(분기 + 함수) 둘 다 있어야 뜬다
chk 'pf-key' order-preview.html 5                       # 꼬리표 줄(스타일 1 + 4줄) · :has() 대신 클래스라 구 사파리에서도 점이 안 남는다
chk 'NOW_ONELINE' mypage.html 1                          # NOW 헤드라인 한 줄 원칙 + balance 안전망 · 빼면 '주세요' 3자만 둘째 줄에 남는 고아 줄이 돌아온다
chk 'NOW_ONELINE' automation/platform/00_platform-config.gs 1  # 서버 문구 첫 문장 13자 이내 규칙(그 문장이 곧 헤드라인이다)
chk 'IG_LEGIBLE' index.html 2                            # 마크 다층 그림자(어두운 윤곽선) + 리빌 대각 파동 · 한 겹으로 되돌리면 밝은 사진 3장(2·7·9)에서 마크가 대비 1.6으로 사라진다
chk 'IG_GAP' index.html 1                                # 기록 갤러리 세로 리듬(눈썹 4 / 그리드 24·PC 20) · 공용값(12/36)으로 되돌리면 아이디가 위아래 어디에도 안 붙어 뜬다
chk 'IG_MARK' index.html 1                               # 제목 옆 인스타 마크 하나 · 빼면 '@momentedit.kr'이 세리프에선 홈페이지 주소로 읽힌다(.kr 때문에 특히)
chk 'archive-grid-ig' index.html 14                      # 사진 9장 우상단 마크(마크업 9 + CSS) · 정중앙 흰 원으로 되돌리면 인물 얼굴 위에 다시 얹힌다
chk 'DM_FOOT_SIGN' index.html 1                          # 편지 맺음 = 이름(Moment Edit) 위 · 문장 아래 · 메일 없음 · 되돌리면 금색(대비 2.3) 문구가 위로 서고 연락처가 편지 안에 다시 들어온다
# ── 편지 전달 점검 (2026-08-03 사용자 "편지 전달되는 부분 점검해보자 시스템이나 연동이나 디자인부분도")
chk 'LETTER_RATE' automation/guest-letter-webhook.gs 2         # 예식별 전송 속도 제한 · 없애면 한 예식으로 편지를 무제한 쏟아부을 수 있다
chk 'LETTER_DELIVERED' automation/guest-letter-webhook.gs 2    # 메일이 실제로 나갔는지 응답에 담는다 · 지우면 '받을 주소 없음'인데 하객은 전해졌다고 믿는 상태로 되돌아간다
chk 'LETTER_DELIVERED' live.html 2                             # 그 응답을 받아 '스튜디오가 직접 전해드릴게요'를 띄우는 쪽
chk 'LETTER_PLAIN' automation/guest-letter-webhook.gs 1        # 텍스트 대체본 · 빈 문자열로 되돌리면 HTML 못 그리는 클라이언트에서 편지가 통째로 사라진다
chk 'LETTER_PREHEADER' automation/guest-letter-webhook.gs 1    # 받은편지함 미리보기 줄 · 없으면 누가 보낸 편지인지 열어야만 안다
chk 'LETTER_TARGET' automation/guest-letter-webhook.gs 1       # 수신 주소 유무만 참/거짓으로(주소는 계속 비공개)
chk 'LETTER_TARGET' live.html 1                                # 받을 곳 없는 수신인은 고르지 못하게
chk 'LETTER_SEND' live.html 2                                  # 재진입 차단 + '서버가 ok라고 할 때만 성공' · 2xx만 보고 성공 처리로 되돌리면 한 통도 안 나갔는데 전해졌다고 뜬다
chk 'LETTER_UI' live.html 2                                    # 글자수 위치 · 카드 세로 가운데
chk '[guestName, relation, message]' automation/guest-letter-webhook.gs 1  # 금지어 검사 대상 · 본문만 보면 이름·관계 칸으로 그대로 새어 나간다
chk 'DM_FOOT_SIGN' automation/guest-letter-webhook.gs 1  # ★실제 하객이 보내고 두 분이 받는 편지 메일 — 홈 예시만 고치면 진짜 편지는 옛 모습으로 남는다(2026-08-03 사용자 확인)
chk 'DM_FOOT_SIGN' automation/form-to-couple.gs 2        # 청첩장 전달 메일 2종(안내·재제출)
chk 'DM_FOOT_SIGN' automation/consultation/consultation-booking.gs 1  # 상담 메일(흰 지면) — 금색을 글자로 쓰면 대비 2.3                          # 편지 맺음 = 이름(Moment Edit) 위 · 문장 아래 · 메일 없음 · 되돌리면 금색(대비 2.3) 문구가 위로 서고 연락처가 편지 안에 다시 들어온다
# ★[GA_TABS 2026-08-18] 'MOCK_SAMPLE_SYNC' 마커 폐지 — **구조적으로 불필요해졌다.**
#   이 마커는 손으로 베낀 목업의 표본일이 청첩장 SAMPLE 과 어긋나는 것을 막던 것이다.
#   이제 홈 목업이 실물 live.html?e=test-couple 을 그대로 띄우므로 두 날짜가 갈릴 자리가 아예 없다.
#   ★손목업을 되살리면 이 마커도 함께 되살릴 것(그때 다시 갈릴 수 있으므로).

# ── 미리듣기 배경 음악 [PREVIEW_BED] (2026-08-02 · 사용자 제안 "오디오북처럼 BGM까지 나오게")
# 엔진은 이미 음악을 지시하고 있었다(post music) · 없던 것은 소리와 '그 곡이 무엇인지 말하는 줄'뿐이다
# ★고지는 소리가 실제로 난 뒤에만 선다 — 안 나는 소리를 설명하면 그 줄이 거짓말이 된다
chk 'PREVIEW_BED' console.html 6                        # 상수·감쇠·폴백·고지 배선 + 왜 당일 곡이 아닌지 근거 주석
chk 'gBed' console.html 6                               # 고지 줄 — CSS · 마크업 · playing/pause/error 세 리스너
chk 'BED_TRIM_DB' console.html 2                        # 미리듣기 전용 감쇠 — 현장 더킹 수치는 예식장 PA 전제다
chk 'PREVIEW_BED' scripts/check-guest-skin.mjs 4        # 실렌더: 곡 유무를 기대값으로 삼아 양쪽을 다 본다
chk 'BED_FILE' scripts/check-guest-skin.mjs 3           # 기대값의 원천이 파일 존재 하나뿐(곡을 놓는 날 검사가 저절로 반대편을 본다)
# ── 커버 8종 세로 균형 통일 [COVER_BAL] (2026-08-03 · 사용자 "비슷한균형으로 셋팅" + 03 실기기 지적)
# 16종 전부 록업 중심을 화면 중심 10px 위(광학 중심)에 맞춰 두었다. 실측 폭 390/430/1440 전부 -11~+5.
# ★마커가 0이 되면 그 디자인만 다시 처지고, 갤러리에서 나란히 놓았을 때 한 장만 어긋나 보인다.
chk 'COVER_BAL' i/cover-01.html 1                       # 위 66/아래 86 · 80/64로 되돌리면 이름 록업이 다시 아래로 처진다
chk 'COVER_BAL' i-family/family-01.html 1
chk 'COVER_BAL' i/cover-02.html 1                       # .cover-main 23/57
chk 'COVER_BAL' i-family/family-02.html 1
chk 'COVER_BAL' i/cover-03.html 2                       # 상시 세로 오프셋 제거 + 18/62 · 온라인 03만 리빌 잔재로 카드가 30px 내려가 있었다(사용자 실기기 지적)
chk 'COVER_BAL' i-family/family-03.html 2
chk 'COVER_BAL' i/cover-04.html 1                       # 보정 불필요 근거 · 지우면 다음 사람이 04만 빠진 줄 알고 패딩을 더한다
chk 'COVER_BAL' i-family/family-04.html 1
chk 'COVER_BAL' i/cover-05.html 3                       # 기본(넓은 폰·PC) + 400px + 360px 세 구간
chk 'COVER_BAL' i-family/family-05.html 3
chk 'COVER_BAL' i/cover-06.html 2                       # 커버를 한 화면으로(예전 115svh) + .cover-main 27/53 · 되돌리면 록업이 접힘선 아래로 66px 내려가고 푸터·스크롤 큐가 안 보인다
chk 'COVER_BAL' i-family/family-06.html 2
chk 'COVER_BAL' i/cover-07.html 1                       # .cover-stage 17/31
chk 'COVER_BAL' i-family/family-07.html 1
chk 'COVER_BAL' i/cover-08.html 2                       # 기본은 대칭 · 좁은 폰(390)만 31/65 · 커버 패딩이 60/40으로 바뀌는 구간이라 값이 다르다
chk 'COVER_BAL' i-family/family-08.html 2
chk 'GV_CUE_DUP' invitation-gallery.html 2               # 자체 Scroll 큐가 있으면 안 얹는다 + 하단 줄과 겹치면 위로 비킨다 · 되돌리면 06 '아래로'·08 'MOMENT EDIT STUDIO' 위에 알약이 겹친다
chk 'GV_CUE_LATE' invitation-gallery.html 1              # 큐 판정 재시도(문서가 자리 잡을 때까지) · 한 번만 재면 하이드레이션 전에 '스크롤할 게 없다'로 읽혀 큐가 뜨는 날·안 뜨는 날이 갈린다
chk 'GV_TITLE_PLAIN' invitation-gallery.html 2           # 09 카드 제목 '내용 맞춤' + 모바일 제목 알약 · 되돌리면 '두 판 한 번에'와 맨 꺾쇠로 회귀(사용자 "무슨 말이야?"·"화살표가 애매하다")
# ── 스크롤 큐 통일 [CUE_ONE] · 좌석 음료 선택 [SEAT_DRINK_SEL] · 로딩 표시 통일 [BUSY_ONE] (2026-08-03)
chk 'CUE_ONE' i/cover-01.html 2                         # 큐 CSS 블록 + 이 판의 --cue-bottom · 16종 전부 같은 값이어야 한다
chk 'CUE_ONE' i-family/family-01.html 2
chk 'CUE_ONE' i/cover-02.html 2
chk 'CUE_ONE' i-family/family-02.html 2
chk 'CUE_ONE' i/cover-03.html 2
chk 'CUE_ONE' i-family/family-03.html 2
chk 'CUE_ONE' i/cover-04.html 2
chk 'CUE_ONE' i-family/family-04.html 2
chk 'CUE_ONE' i/cover-05.html 2
chk 'CUE_ONE' i-family/family-05.html 2
chk 'CUE_ONE' i/cover-06.html 2
chk 'CUE_ONE' i-family/family-06.html 2
chk 'CUE_ONE' i/cover-07.html 2
chk 'CUE_ONE' i-family/family-07.html 2
chk 'CUE_ONE' i/cover-08.html 2
chk 'CUE_ONE' i-family/family-08.html 2
chk 'cover-scroll-label' i/cover-04.html 1              # 마크업이 아예 없던 판(02·03·04·05·07) 대표 — 지우면 그 판만 다시 '아래 더 있다' 신호가 사라진다
chk 'SEAT_DRINK_SEL' mypage.html 4                     # 음료 바를 '고른 자리'에 매단다 · edit 기준으로 되돌리면 이름 확정 순간 바가 사라져 음료를 한 번도 못 고른다
chk 'data-seat-selclose' mypage.html 3                 # 바 닫기 — 선언·위임 셀렉터·핸들러 셋이 다 있어야 실제로 닫힌다(셀렉터 누락으로 안 닫히던 실측)
chk 'BUSY_ONE' mypage.html 1                           # 저장 베일도 진사 점 · 회전 링으로 되돌리면 한 화면에 표시가 두 언어
chk 'BUSY_ONE' admin.html 1
chk 'BUSY_ONE' live.html 1
chk 'GV_ONEROW_CTR' invitation-gallery.html 2            # 한 줄 헤더 좌우 패딩 대칭 + 320px 여유 확보 · 40/84로 되돌리면 가운데 것이 화면 중심에서 22px 왼쪽에 앉는다
chk 'GV_EDGE_PLATE' invitation-gallery.html 1            # 좌우 넘김 화살표 원판 · 없애면 화살표가 청첩장 위에 떠 장식으로 읽힌다
chk 'ADM_HEAD2' admin.html 3                            # 관리자 헤더 2단(묶음 div + 600px 분기 + 340px 보정) · 한 줄로 되돌리면 'MOMENT EDIT'가 두 줄로 쪼개지고 '로그아웃'이 화면 밖으로 잘린다
chk 'tb-group' admin.html 4                             # 버튼 묶음 — 풀면 flex-wrap이 버튼을 하나씩 흘려 둘째 줄이 들쭉날쭉해진다

# ══ 베일 다운 폐지 · 순서 고정 · 저장 상태 · 네이티브 팝업 추방 (2026-08-03) ══
# nochk = '있으면 안 되는 것'. chk 와 달리 _ran 을 올리지 않는다(_gate 는 '^chk ' 만 센다).

# [SOURCE_DRIFT] 원천 값이 손으로 적힌 자리를 찾는 검사 — 인스턴스가 아니라 병을 잡는다.
#   ★이 아래 네 줄은 `fail`(소문자)에 넣는다. 판정 트랩 _gate 가 읽는 변수가 그것 하나뿐이다.
#     `FAIL`(대문자)로 적혀 있었고, 그동안 이 네 검사는 빨개져도 게이트가 초록이었다(실측:
#     check-source-drift 를 일부러 실패시켜도 'ALL MARKERS OK' + EXIT 0). 대문자로 되돌리지 말 것.
node scripts/check-source-drift.mjs || fail=1
# [NOTE_TABLE] 야간 잡의 note() — 표에 붉게 적은 것이 요약도 붉은가.
#   ★이건 브라우저가 필요 없다(순수 셸) → 게이트가 직접 돈다. NO_GATE 대상이 아니다.
#   ★fail(소문자)에 넣는다 — 위 GUARD_FAIL_VAR 사고와 같은 이유.
sh automation/tests/nightly-note-table.sh || fail=1
# [TIME_HONEST] 시간표를 손으로 적은 자리를 지운 커밋들의 마커 — 위 검사가 병을 잡고, 이 줄이 자리를 지킨다.
chk 'TIME_HONEST' index.html 1
chk 'TIME_HONEST' order-preview.html 3
chk 'TIME_HONEST' assets/sequence-modal.js 3

# [DAY_PLAN] 하루 140분의 뼈대는 assets/ritual-data.js 의 DAY 하나에서만 나온다.
#   2026-08-08 합 60분 → 2026-08-09 합 55분. 하루 만에 바뀌었다 —
#   검사가 60을 손으로 들고 있었으면 열 벌을 다 고쳐 놓고도 검사만 빨개졌을 것이다.
chk 'DAY_PLAN' assets/ritual-data.js 1
chk 'D.DAY' scripts/check-source-drift.mjs 3
# [CLOCK_TABLE] 시계 숫자로 적힌 시간표 3벌(inquiry·schedule·mypage)도 DAY 에서 계산해 대조한다.
#   실사고 2026-08-09 — 스냅 40→45로 본예식이 10:00→10:05 로 밀렸는데, 길이 표기 열 벌은 다 고쳐지고
#   이 세 벌만 옛 시각으로 남았다(검사 전부 초록). 길이만 보는 검사는 시계 숫자를 못 본다.
chk 'CLOCK_TABLE' scripts/check-source-drift.mjs 1
chk 'ref-time' scripts/check-source-drift.mjs 1
# ── [FAQ_MID_HOLD 2026-08-10] FAQ·JSON-LD 두 자리는 **범위 꼴로 둔다** ──
# 이 두 자리를 가운데값(20m/35m)으로 통일하면 보기엔 깔끔한데, 그 대가로 **감시망에서 빠진다.**
# 주변 산문에 숫자가 많아서(140분·45분·5분·55분·20분·9시 45분…) check-source-drift 가
# 숫자를 '순서 있는 부분열'로 맞출 때, 가운데값 20 은 근처의 다른 20 으로 대신 채워진다.
# ★두 세션이 따로 재서 같은 결과를 봤다 — 같은 자리(The Ceremony)를 30 으로 망가뜨렸을 때
#     범위 꼴 `16~25m | The Ceremony` → drift exit 1 (CAUGHT)
#     가운데값 `20m | The Ceremony`   → drift exit 0 (MISSED)
# 그래서 통일을 보류했다. 넷 다 사실이고(16+39=55 · 24+31=55) 지금은 네 벌 모두 감시 아래 있다.
# ★통일하려면 검사부터 고칠 것 — 숫자를 순서로 훑지 말고 라벨('The Ceremony')에 붙여 읽게.
#   그 뒤에 통일하면서 **같은 커밋에서** 이 두 줄도 함께 고친다(결정 대기함에 근거 있음).
chk '16~25m | The Ceremony' index.html 2
chk '30~39m | Group Record' index.html 2
# [ROUND_FIT] 라운드 길이는 남는 시간에서 계산한다 — est 를 손으로 박으면 예산을 넘는다.
#   실측: 다 함께가 30~39분이 된 날, 엔진은 20분짜리 라운드를 들고 39.5분을 쓰고 있었다.
chk 'ROUND_FIT' assets/ritual-cue.js 2
chk 'ROUND_FIT' scripts/check-ritual-cue.js 1
chk '2패스가 라운드를 더한다' assets/ritual-cue.js 2   # [ROUND_FIT] 캐리어 두 곳 — 손계산 _grFixed 부활 금지
# [ROUND_EXACT] 2패스는 '넘지 않는가'가 아니라 '정확히 채우는가'로 본다.
#   창을 슬러그 목록이 아니라 **큐 순서**(narr-close ~ 배웅 직전)로 잡는 것이 핵심 —
#   목록을 복제하면 엔진과 검사가 같은 실수를 함께 한다. 실측: 창 안에 고정 자리 큐를 새로 넣고
#   엔진 IN 목록에 안 넣으면 기존 부등식 검사는 초록인데 이 검사만 '초과 240초'로 잡았다.
chk 'ROUND_EXACT' scripts/check-ritual-cue.js 1
chk "c.blockN === '배웅'" scripts/check-ritual-cue.js 1
# [PHOTO_CAP] 다 함께가 짧아지면 사진 세팅 상한도 함께 내려간다(밀도의 함정 방지).
chk 'PHOTO_CAP' mypage.html 2
chk 'PHOTO_MAX=5' mypage.html 1
chk 'PHOTO_WISH_MAX=2' mypage.html 1
# [CONTRACT_V15] 계약서 v1.4 서명자는 보존본으로 열람
chk 'archive/v1-4.html' admin.html 1
chk 'archive/v1-4.html' mypage.html 1
# [CONTRACT_V16 2026-08-13] 계약서 v1.6(AI 음성 안내 확인 줄) · v1.5 서명자는 보존본으로 열람
chk 'archive/v1-5.html' admin.html 1
chk 'archive/v1-5.html' mypage.html 1
chk "docVersion: 'v1.8'" automation/platform/70_journey.gs 1

# [FILE_NO_SOURCE] mp3 번호는 엔진(RitualCue.fileOf = FILES 인덱스+1)에서만 온다.
#   ★대본 생성기가 1부터 세어 붙이던 시절, 폐지 클립(53 narr-ringwarm-out)이 FILES 에 자리로
#     남아 있어 **53번부터 스물두 클립이 한 칸씩 밀려** 있었다. 검사는 전부 초록이었고
#     대본도 멀쩡해 보였다 — 녹음해 넣은 뒤 당일에야 「다 함께」 구간이 통째로 무음이 됐을 것이다.
chk 'FILE_NO_SOURCE' scripts/build-dubbing-script.mjs 1
chk 'padOf(file)' scripts/build-dubbing-script.mjs 1
#   ★콘솔도 같은 규칙이다 — 클립을 꺼내는 세 자리 전부 번호를 noOf 에서 받는다.
#     '대기' 버튼에 '51' 이 손으로 박혀 있었다(진짜 번호는 49 · 51 은 bridge-6-resume '재개').
#     디렉터가 클립 파일을 불러오면 CLIPS 에 번호 열쇠가 생기므로, 당일 '대기' 를 눌렀을 때
#     재개 안내가 나갔을 자리다. 숫자를 다시 박으면 이 줄이 빨간불을 켠다.
chk 'CLIPS\[RitualCue.noOf' console.html 3
nochk "CLIPS\['[0-9]" console.html 0
# [CLIP_COUNT] 대본 클립 수 가드 — 51 로 굳어 있는 동안 대본은 74 가 됐고, 생성기가 매번
#   실패하면서 manifest.json 이 옛 51클립짜리로 얼어붙어 있었다(사람 눈에만 뜨는 실패였다).
chk 'CLIP_COUNT' scripts/build-typecast-import.mjs 2
node scripts/build-dubbing-script.mjs >/dev/null || fail=1
node scripts/build-typecast-import.mjs >/dev/null || fail=1

# [SPLIT_JOIN] 타입캐스트가 한 문장을 쉼표에서 쪼개 보내는 것을 도로 잇는 도구.
#   `신랑 신부, 입장!` 이 두 파일로 와서 입장 6클립이 23 → 29개가 됐다(두 번 당했다).
chk 'SPLIT_JOIN' scripts/join-split-sentences.mjs 1
chk 'SPLIT_JOIN' scripts/assemble-narration.mjs 1

# [DRIFT_MUTATION] 그 검사가 **진짜로 잡는지** 시험한다. 초록은 아무것도 증명하지 않는다 —
#   실제로 두 번 뚫려 있었고(주석이 낡은 행을 대신 통과시킴 · 줄 뒤 주석이 그 줄을 면제시킴),
#   둘 다 행을 일부러 낡게 바꿔 보고 나서야 드러났다. 검사를 고칠 때마다 이걸 함께 돌린다.
sh scripts/check-source-drift.test.sh || fail=1
# ★[2026-08-10 코드 세션] 그 돌연변이 시험 자신에게 난 구멍 셋 — 지우지 말 것.
#   EVERY_HIT : 같은 문장이 두 곳이면 앞 하나만 시험하고 뒤는 미검증으로 남았다
#               (index.html 162행 JSON-LD 만 시험되고 6334행 보이는 FAQ 는 한 번도 안 됐다)
#   NO_FILE   : 파일을 못 읽으면 조용히 돌아가 그 자리가 세어지지도 않았다
#   RAN_NONE  : 그래서 열한 자리 파일이 전부 없어도 "11자리 전부 잡힌다 · exit 0" 이 나왔다(실측)
chk 'DRIFT_EVERY_HIT' scripts/check-source-drift.test.sh 1
chk 'DRIFT_NO_FILE' scripts/check-source-drift.test.sh 1
chk 'DRIFT_RAN_NONE' scripts/check-source-drift.test.sh 1

# [CONTRACT_V14] 계약서 3조① 본식 16~24분 · Group Record 36~44분(합 60분 고정) · 문서 v1.4.
#   ★v1.3 서명자는 archive/v1-3.html 로 열람해야 한다 — 이 줄이 사라지면 옛 서명자가
#     자기가 서명하지 않은 문서를 보게 된다(계약서 32조③ '이미 체결된 계약의 효력은 불변').
chk 'archive/v1-3.html' admin.html 1
chk 'archive/v1-3.html' mypage.html 1
chk 'CONTRACT_V14' admin.html 1
chk 'CONTRACT_V14' mypage.html 1

# [PHOTOCUE_BOARD] 촬영 안내는 콘솔의 '골라 트는 판'에서만 나온다.
#   판이 없으면 녹음한 클립 10개를 틀 수단이 사라진다(한 번 그 상태로 떠 있었다).
chk 'PHOTOCUE_BOARD' console.html 3
chk 'playLoose' console.html 2                  # 체인 밖 재생 — 진행 위치를 바꾸지 않는다

# [NO_AUDIO] 녹음 대기 목록은 FILES ↔ manifest 를 통째로 대조해 만든다.
#   미리듣기에 안 나오는 콘솔 전용 클립이 목록에서 조용히 빠지던 것을 막는다(실제로 16개가 떠 있었다).
chk 'NO_AUDIO' scripts/check-text-audio.mjs 2
chk 'RETIRED_SLUG' assets/ritual-cue.js 1        # 폐지한 자리를 다시 녹음하지 않게
chk 'NARR_CONSOLE_ONLY' assets/ritual-data.js 1  # 검사를 속이려 빌더에 죽은 변수를 넣지 않게
chk 'NARR_CONSOLE_ONLY' scripts/check-ritual-mirror.js 1

# [AFTER_PARTY] 예식 뒤 30분 — 전환 6큐(순서 고정) + 골라 트는 판 10(순서 유동).
#   둘을 섞지 말 것: 예식은 흐름이라 체인이고, 촬영은 작업이라 판이다.
chk 'AFTER_PARTY' assets/ritual-cue.js 2
chk 'AFTER_PARTY' assets/ritual-data.js 1
chk 'PHOTOCUE' assets/ritual-data.js 3
chk 'PHOTOCUE_NO_CLIP' assets/ritual-data.js 1        # 안내가 없는 것이 정체인 연출 둘 — 클립을 만들지 말 것
chk '스태프가 차례로 안내' assets/ritual-cue.js 0      # 옛 문안(사회자 전제)이 되살아나면 실패

# [PHOTO_LIST_V2] 단체사진 구도 목록 v2 — 순서(subtractive)와 상한은 5차 리서치 실측에 매여 있다.
#   11개로 되돌리면 30분에 안 들어간다(전체컷 6분 + 11×3 = 39분).
#   ★2→1 (2026-08-16 [PHOTO_GATHER_OFF]) — 두 번째 마커는 렌더에서 갈래(gather) 배지를 그리던 줄이었고,
#     그 갈래가 사용자 지시로 폐지되면서 함께 사라졌다. 기능을 정당히 없앤 경우라 목록도 같은 커밋에서 낮춘다
#     (규칙: 마커가 정당하게 사라지면 가드 목록을 함께 갱신 · 남은 1은 목록 데이터 쪽 주석이라 여전히 유효).
chk 'PHOTO_LIST_V2' mypage.html 1
chk 'var PHOTO_MAX=5' mypage.html 1              # [PHOTO_CAP] 다 함께 30~39분에 맞춘 값 · 6으로 되돌리면 밀도의 함정
chk 'var PHOTO_WISH_MAX=2' mypage.html 1   # [PHOTO_WISH] 구 var PHOTO_FX_MAX=2 · 같은 근거(다 함께 마지막 토막)
chk 'var PHOTO_MAX=11' mypage.html 0                # 옛 상한이 되살아나면 실패

# [RINGWARM_RETIRED] 링 워밍 폐지(2026-08-07 사용자 "유치하고 별로") — 팔레트(GADD)에 되살리지 말 것.
#   클립·빌더는 남아 있다(FILES 번호가 인덱스+1이라 빼면 뒤가 전부 밀린다). 막는 곳은 팔레트 하나다.
chk 'RINGWARM_RETIRED' assets/ritual-cue.js 2
chk 'RINGWARM_RETIRED' order-preview.html 2
chk "ringwarm: 1" assets/ritual-cue.js 0            # GADD 에 되살아나면 실패
chk "ringwarm:1" order-preview.html 0               # 빌더 GADD 사본도 같이

# [VEIL_RETIRED] 전 예식 동시입장이라 베일 다운은 실행 불가 — 코스·팔레트·큐·KB 어디에도 되살리지 말 것
chk 'VEIL_RETIRED' order-preview.html 3                 # 상수·장면도해·카드분기 세 자리에 폐지 사유가 남아 있어야 한다
chk 'VEIL_RETIRED' assets/ritual-data.js 3              # 원천(코스 seq·문안·소요분)
chk 'VEIL_RETIRED' assets/ritual-cue.js 3               # 큐시트 생성기
chk 'VEIL_RETIRED' api/_ritual-kb.js 3                  # AI 상담 지식
nochk "'veil'" order-preview.html                       # 빌더 코드에 veil 키가 남으면 팔레트·순서·요약 어딘가로 다시 샌다
nochk "'veil'" assets/ritual-cue.js
nochk 'D.VEIL' api/_ritual-kb.js
# ★★[VEIL_RETIRED 네 번째 겹 · 2026-08-12] 관리자 두 면도 같이 잠근다 — 목록 ★16 이 말한 「두 줄」이다.
#   ①코드 이름 ②그 사람이 읽던 말. 08-03 폐지가 화면 admin.html 만 손대고 GAS 사본을 남겨,
#   폐지 전 초안(기본값 'mother')에는 진행표에 실행 불가한 한 줄이 계속 섰다.
#   ★admin.html 쪽 '읽던 말' 은 안 건다 — 그 파일의 폐지 근거 주석이 그 말을 그대로 인용하고 있어
#     그 주석 자신을 문다(이번 세션에 다섯 번 밟은 함정). 그래서 코드 이름으로만 잠근다.
chk 'VEIL_RETIRED' automation/admin/Admin.html 2         # 이름표·행 두 자리에 폐지 사유
nochk "'veil'" automation/admin/Admin.html               # ①코드 이름
nochk '베일 다운' automation/admin/Admin.html             # ②디렉터가 읽던 말
nochk 's3d.veil' admin.html                              # ①코드 이름(화면 관리자 · 08-03에 이미 뺌)
# ★반대쪽도 못박는다 — 같은 자로 훑다가 **남겨야 할 것**을 지우지 않게.
#   축가 행은 남긴다(SONG_RETIRED 원문이 「없애는 것이 아니라 옮기는 것」 · 지금도 할 수 있는 순서다).
#   기준은 「지금 고를 수 있나」가 아니라 「지금 할 수 있나」. 베일=삭제 · 축가·링워밍=유지.
chk 'SONG_RETIRED' automation/admin/Admin.html 1          # 남긴 근거 — 없으면 다음 사람이 베일과 같은 것으로 보고 지운다
chk "_ko('song'" automation/admin/Admin.html 1            # 그 행 자체

# [ORD_FIXPOS] 하객 맞이·입장은 자리 고정 — 두 분이 식장에 없는데 진행되는 순서를 만들 수 없다
chk 'ORD_FIXPOS' order-preview.html 3                   # 선언 + ordNow 정규화 + 화살표 렌더 · 하나만 빠져도 옛 초안이 밀린 채 열리거나 눌리지 않는 화살표가 남는다
chk 'var FIXPOS=' order-preview.html 1
chk 'if(FIXPOS\[k\]) return' order-preview.html 1        # 자기가 고정
chk 'if(FIXPOS\[o\[j\]\]) return' order-preview.html 1    # 이웃이 고정(스와프로 밀어내는 경로)

# [ORD_SAVE_STATE] 저장됨은 부모가 확인해 준 뒤에만 — 낙관 표시로 되돌리면 '실패 알림 + 저장됨 버튼'이 한 화면에 공존한다
chk 'ORD_SAVE_STATE' order-preview.html 6
chk 'ORD_SAVE_STATE' mypage.html 2
chk 'momentedit:orderSaved' order-preview.html 1         # 성공 신호 수신
chk 'momentedit:orderSaved' mypage.html 1                # 성공 신호 발신 · 한쪽만 있으면 저장 성공이 영원히 '저장 중'으로 남는다
chk 'function doSave' order-preview.html 1
chk 'function _saveDone' order-preview.html 1

# [ORD_EXIT_ALWAYS] 완성 화면에도 나가기 · 숨기면 부모의 플로팅 ✕도 숨은 상태라 나갈 길이 하나도 없다(2026-08-03 제보)
chk 'ORD_EXIT_ALWAYS' order-preview.html 2
chk 'momentedit:orderClose' order-preview.html 1          # 저장 완료 뒤 나가기는 재저장이 아니라 그냥 닫기(완료본이 초안으로 되돌아가지 않게)

# [ORD_DONEACTS][ORD_TELL][ORD_EMPTY_LINE] 완성 화면 정리
chk 'ORD_DONEACTS' order-preview.html 2                   # 문의·다시 만들기 한 줄 묶음 · 풀면 회색 판이 음악 카드 옆에 홀로 뜬다
chk 'ORD_TELL' order-preview.html 2                       # 알림형 브랜드 판
chk 'ORD_EMPTY_LINE' order-preview.html 4                 # 배지 자리·이름폭 96·빈 값 줄표 · 되돌리면 배지가 행마다 다른 줄에 찍힌다
chk 'flex:0 0 96px' order-preview.html 1                  # 88px 이면 '하객 맞이 안내'·'폐식 · 단체촬영'만 이름이 두 줄로 접힌다(실측)

# [POPUP_BRAND][ADM_MODAL][MP_MODAL_ONE] 네이티브 팝업 추방 — 검은 시스템 판은 이 지면의 말이 아니고, alert 은 동기 차단이라 뒤 화면과 어긋난 채 함께 보인다
chk 'MP_MODAL_ONE' mypage.html 1
chk 'POPUP_BRAND' index.html 3
chk 'POPUP_BRAND' invitation-gallery.html 3
chk 'POPUP_BRAND' automation/consultation/ScreenA_apply.html 3
chk 'ADM_MODAL' admin.html 20
chk 'function admConfirm\|admConfirm=' admin.html 1
nochk '[^.a-zA-Z_]alert(' order-preview.html
nochk '[^.a-zA-Z_]alert(' mypage.html
nochk '[^.a-zA-Z_]alert(' index.html
nochk '[^.a-zA-Z_]alert(' invitation-gallery.html
nochk '[^.a-zA-Z_]alert(' admin.html
nochk '[^.a-zA-Z_]confirm(' admin.html
nochk '[^.a-zA-Z_]prompt(' admin.html
nochk '[^.a-zA-Z_]alert(' automation/consultation/ScreenA_apply.html

# ── 곡 선정 폐지 · 순환 CSS 변수 · 저장 중 대비 (2026-08-03) ──
chk 'MUSIC_GONE' order-preview.html 2                     # 곡 선정 칸 폐지(음악은 저희가 고른다) + jumpTo 포커스 분기 제거 · 되살리면 완성 화면에 필수처럼 보이는 입력이 다시 생긴다
nochk 'musicCard' order-preview.html                      # 요소가 사라졌으므로 이 id를 찾는 코드도 남으면 안 된다
chk 'CC_SUB_FIT' mypage.html 2                            # 스냅 기획 설명 21자 + 균형 줄바꿈 · 26자로 되돌리면 '준비해요.' 한 마디만 둘째 줄로 떨어진다
nochk '[-][-]ease:var[(][-][-]ease[)]' invitation-gallery.html 1    # 자기참조 순환(주석 1건만 허용) · 되살리면 이 페이지 transition 36개가 통째로 죽는다
chk 'btn-next.busy' order-preview.html 2                  # 저장 중은 disabled 가 아니라 busy · .btn:disabled{opacity:.4}로 되돌리면 '저장 중…' 대비가 2.12로 떨어진다(실측)
nochk 'nx.disabled=!!_saving' order-preview.html
chk 'ORD_BTN_ALIGN' order-preview.html 4                  # 요약 행 버튼 폭 고정 + 320 보정 + 뺌 행 값 통일 · 풀면 '변경'(52px)/'채우기'(64px)로 왼쪽 가장자리가 12px씩 지그재그가 된다
chk 'min-width:62px' order-preview.html 1                 # 62px 이 경계 — 64면 값 칸이 줄어 '나레이션 · 엄숙하게'가 두 줄, 58이면 좁아 보인다(실측)

# ── 청첩장 예시 이미지 (2026-08-03) ──
# 생성기를 지우지 말 것 — 2026-08-02 판까지는 임시 스크립트로 뽑고 버려서, 예시를 고치라는 지시가 왔을 때 원본이 없어 통째로 다시 만들었다
chk 'build-preview-annot' scripts/build-preview-annot.mjs 1
chk 'inkRect' scripts/build-preview-annot.mjs 2                 # 글자 잉크 폭으로 점선을 잡는다 · 요소 박스로 되돌리면 가운데 정렬된 짧은 글에 전폭 상자가 생긴다
chk 'inkAll' scripts/build-preview-annot.mjs 3                  # 라벨이 청첩장 본문 글자를 덮지 않게 · 빼면 '혼주 성함'이 신랑 이름 위에 앉는다(실측)
chk 'details::details-content' scripts/build-preview-annot.mjs 1  # 닫힌 계좌 아코디언 강제 노출 · 없으면 신랑측이 빈 칸으로 찍힌다
chk 'env-acc-item' scripts/build-preview-annot.mjs 2             # 01 은 details 가 아니라 클래스 토글 아코디언
chk 'on-dark' scripts/build-preview-annot.mjs 5                  # 어두운 판에서 점선·라벨을 크림으로 반전 · 빼면 08 누아르에서 점선이 배경에 묻힌다(실측 대비 9.92→1.3)
chk "mode: 'box'" scripts/build-preview-annot.mjs 8              # 계좌 패널은 요소 테두리로 · 글자 잉크로 재면 점선이 '복사' 버튼을 뚫는다
chk '대표 문구' scripts/build-preview-annot.mjs 1                # 02 전용 칸(data-k=quote)
chk '한마디' scripts/build-preview-annot.mjs 2                   # 08 전용 칸(data-k=gb/bb)

# ── 「들어보기」 실음원 배선 (2026-08-04 사용자 제보 *"여기왜 다른 오디오가나와?"* / *"전부다 줬잖아 파일"*) ──
# 옛 배선은 만들어진 적 없는 `/assets/narration/m-<키>.mp3` 를 불렀다 → 404 → 조용히 대표 샘플로 폴백 →
# 어느 순간을 눌러도 같은 목소리인데 화면은 멀쩡했다. ★조용한 폴백은 눈으로 못 잡는다.
chk 'ORD_REAL_AUDIO' order-preview.html 4                 # 실음원 배선(원인 주석·playBtn 인자·oc 미리듣기·EXTRA_ON·엔진 프리로드)
chk 'ORD_ENG_SANDBOX' order-preview.html 1                # 엔진을 new Function 인자 그림자로 가짜 전역에만 싣는다
nochk "assets/narration/m-'" order-preview.html           # 존재한 적 없는 이름 · 되살리면 같은 버그가 그대로 돌아온다(주석의 사고 기록은 남긴다)
nochk 'NARR_SAMPLE' order-preview.html                    # 대표 샘플 폴백 폐지 — 소리가 없으면 없다고 말한다
nochk 'mockPlay' order-preview.html                       # 샘플 재생 진입점 폐지(momPlay 하나로 통일)
chk 'var AUDEL' order-preview.html 1                      # 소리 요소 1개 재사용 · new Audio 를 항목마다 만들면 iOS 에서 두 번째 클립부터 막힌다
chk 'EXTRA_ON' order-preview.html 3                       # 팔레트 기본 연출 표 1곳(extraTgl·미리듣기가 같은 표를 본다)
chk 'order-audio-check' scripts/audit/order-audio-check.mjs 1   # 실렌더 검증 — 순간마다 다른 파일을 요청하는지 기계가 본다

# ── [CLIP_SUBSET] 한 대목만 다시 더빙해 갈아 끼우기 (2026-08-04 사용자 요청
#    *"신랑신부 입장 부분만 더빙을 수정하고싶으면 그부분만 더빙파일너한테주면 수정가능해?"*) ──
# PART_AUTOMATCH는 「파트 전체의 문장 개수」로 파트를 짚는다 → 입장 23문장만 주면 어느 파트와도 안 맞아 멈춘다.
# 멈추는 건 옳다(개수가 다른데 조용히 붙이면 클립이 통째로 다른 자리에 간다). 그래서 --clip 으로
# 「지금 다루는 게 부분집합이다」를 선언하게 하고, 개수·길이상관·순서검증을 전부 그 부분집합 기준으로 다시 센다.
# ★고르는 규칙은 clip-select.mjs 한 곳에만 있다 — 만드는 쪽(repatch-clip)과 붙이는 쪽(assemble)이
#   서로 다른 규칙을 쓰면 개수만 맞고 순서가 밀린다. 규칙을 두 군데 적으면 한쪽만 고치는 날이 온다.
# ★repatch-clip은 manifest를 읽기만 한다 — 부분 대장이 전체 대장을 덮어쓰면 66클립이 자기 자리를 잃는다.
chk 'selectClips' scripts/clip-select.mjs 1
chk 'CLIP_SUBSET' scripts/assemble-narration.mjs 1
chk 'clipsOf' scripts/assemble-narration.mjs 7   # ★grep -c는 '줄 수'다 — 한 줄에 두 번 나오는 자리가 있어 8회/7줄
chk 'selectClips' scripts/repatch-clip.mjs 2
nochk 'man.clips.filter((c) => c.part === P.file)' scripts/assemble-narration.mjs
nochk 'writeFileSync(MAN' scripts/repatch-clip.mjs
nochk '\-\-clip' scripts/build-typecast-import.mjs
# ── 대기 표시 한 벌 · 예시에서 화면 장치 제거 · 샘플 모달 (2026-08-04) ──
nochk 'keyframes spin' mypage.html                       # 회전 스피너를 되살리지 말 것 — 사이트 대기 표시는 '숨쉬는 점' 하나다
nochk 'keyframes spin' order-preview.html
nochk 'keyframes spin' admin.html
nochk 'keyframes spin' schedule.html
nochk 'keyframes spin' inquiry.html
nochk 'keyframes spin' automation/consultation/ScreenA_apply.html
nochk 'keyframes spin' automation/consultation/ScreenB_schedule.html
nochk 'keyframes spin' automation/admin/Admin.html
chk 'meBreath 1.7s' mypage.html 1                        # 리듬은 1.7s 한 벌 · 1.5s 로 갈리면 같은 흐름에서 두 박자가 보인다(실측 지적)
chk 'meBreath 1.7s' order-preview.html 1
chk 'meBreath 1.7s' admin.html 1
chk 'meBreath 1.7s' automation/consultation/ScreenA_apply.html 1
chk 'meBreath 1.7s' automation/consultation/ScreenB_schedule.html 1
chk 'meBreath 1.7s' automation/admin/Admin.html 1
chk 'PREV_NO_CHROME' scripts/build-preview-annot.mjs 2   # 예시에서 고정·스티키 화면 장치 제거 · 빼면 '‹ 갤러리' 알약이 16장 한복판에 박힌다
chk 'vertical' scripts/build-preview-annot.mjs 2         # 세로쓰기는 요소 상자로 · Range 잉크가 62px 짧게 잡혀 점선이 첫·끝 글자를 문다
chk 'SAMPLE_TOPCUT' mypage.html 2                        # 샘플 모달 flex-start+margin:auto+dvh · center+100vh 로 되돌리면 제목·닫기가 화면 위로 잘린다
chk 'align-items:flex-start' mypage.html 1

# ── [SENT_PATCH] 문장 한 자리만 갈아 끼우기 (2026-08-04 사용자 질문 "문장중 신랑신부 입장 이 문장만 할수는 없는거야?") ──
#   같은 문장이 6클립에 나오므로 1개만 받아 6자리에 넣는다. 판별(clipsOf)과 생성(buildOf)을 갈라 둔 것이 핵심.
chk 'selectSents' scripts/clip-select.mjs 1
chk 'selectSents' scripts/assemble-narration.mjs 2
chk 'selectSents' scripts/repatch-clip.mjs 2
chk 'SENT_PATCH' scripts/assemble-narration.mjs 3
chk 'buildOf' scripts/assemble-narration.mjs 3
chk 'patchMap' scripts/assemble-narration.mjs 6
chk 'const at = k' scripts/assemble-narration.mjs 1
nochk 'c.sents.map(() => norm' scripts/assemble-narration.mjs

# ── [TEXT_AUDIO] 화면에 쓰인 글 = 그 자리에서 나는 소리 (2026-08-04 사용자 지적
#    *"근데왜 이부분이 나래이션이랑 다르지?"* → *"전부다 똑같이 나오게해야지 당연한거잖아 전수조사해"*) ──
# 입장 「두 분 목소리」에서 화면은 느낌 6종(ENTRY[v].self)을 보여 주는데 소리는 05_entry 한 클립이었다.
# 글자와 소리가 다른 말이었고, 여섯 중 무엇을 골라도 같은 소리라 고르는 일이 아무것도 바꾸지 못했다.
# 하객 맞이 4클립도 배역 대본이 화면 글과 다른 문장이었다(가상 인물 이름까지 들어 있었다).
# ★눈으로 훑어 찾은 게 아니다 — 축을 둘씩 흔들어 전 자리를 기계로 대조해 10곳을 찾았다.
#   한 축씩만 흔들면 「두 분 목소리 × 느낌 C」처럼 두 값이 만나야 생기는 자리가 통째로 빠진다.
# ★이 검사를 지우지 말 것. 문안은 앞으로도 고쳐진다 — 고치는 날 소리가 따라오지 않으면 여기서 멈춘다.
chk 'TEXT_AUDIO' scripts/check-text-audio.mjs 1
chk 'TEXT_AUDIO' assets/ritual-story.js 2
chk 'TEXT_AUDIO' 'docs/plans/식순연구/배역_예시_대사.txt' 2
chk "'own:entry-A'" assets/ritual-story.js 1               # 입장 6종이 각자 제 클립을 받는다
chk "'own:entry-F'" assets/ritual-story.js 1
nochk "'own:entry':" assets/ritual-story.js                # 한 클립 공유로 되돌리지 말 것
nochk "'05_entry'" assets/ritual-story.js                  # 폐기된 클립 — 되살리면 여섯 자리가 다시 한 소리를 낸다
if command -v node >/dev/null 2>&1; then node scripts/check-text-audio.mjs >/dev/null 2>&1 \
  && echo 'ok text-audio: 화면 글 = 그 자리 소리 (전 자리 대조)' \
  || { echo 'FAIL text-audio: 화면 글과 소리가 다른 자리가 있습니다 — node scripts/check-text-audio.mjs'; fail=1; }; fi
# ── 스크롤 큐 자리 (2026-08-04 사용자 지적 "스크롤 효과가 애매한 위치에 있어") ──
# 큐가 빈 대역의 아래쪽에 몰려 위 여유가 57~188px 로 3.3배 벌어져 있었다 → 8종 모두 대역 한가운데로.
# 낮은 화면에선 위 글자가 내려와 여유가 0px 까지 좁아진다 → 700px 아래로는 감추고 갤러리가 대신 얹는다.
chk 'CUE_POS' i/cover-01.html 2
chk 'CUE_POS' i/cover-08.html 2
chk 'CUE_POS' i-family/family-01.html 2
chk 'CUE_POS' i-family/family-08.html 2
# ★2026-08-04 사용자 결정으로 방침이 바뀌었다: 판마다 자리를 피해 다니지 않고 **전부 같은 자리**.
#   글자에 겹쳐도 스크롤하면 곧 사라진다(.hidden). 그래서 높이별 감추기(max-height:700px)는 폐지.
chk 'cue-bottom:80px' i/cover-01.html 1                   # 16장 공통값 · 판별로 다른 값을 넣지 말 것
chk 'cue-bottom:80px' i/cover-08.html 1
chk 'cue-bottom:80px' i-family/family-08.html 1
chk 'position:fixed !important' i/cover-08.html 1          # 커버 기준(absolute)이면 판마다 화면 자리가 어긋난다(08 이 84px 떴다)
chk 'CUE_IN' i/cover-08.html 2                             # 등장은 JS 가 0.9s 뒤 .in — CSS 지연(2.4s)으로 되돌리면 느려지고, 노드를 옮길 때 애니메이션이 되감겨 판마다 시점이 갈린다
chk 'CUE_PLATE' i/cover-08.html 2                          # 하얀 원형 배경판 · 없으면 큐가 본문 글자와 뒤엉킨다(자리를 피해 다니지 않기로 했으므로)
chk 'document.body.appendChild(el)' i/cover-08.html 1       # transform 걸린 조상이 fixed 기준을 가로챈다 → 큐만 body 로
chk 'CUE_REARM' i/cover-01.html 1                           # 카드가 앞에 설 때 큐를 다시 켠다 · 없으면 미리 불러 둔 카드는 보기도 전에 타이머가 끝나 "어떤 건 나오고 어떤 건 안 나온다"
chk 'CUE_REARM' invitation-gallery.html 1                   # 알려 주는 쪽(갤러리)과 받는 쪽(청첩장)이 둘 다 있어야 동작한다
chk 'momentedit:cueRearm' i/cover-08.html 1
chk 'momentedit:cueRearm' invitation-gallery.html 1
chk '__cueArmed' i/cover-04.html 2                          # 하이드레이션이 body 를 갈아 끼워도 큐가 살아남게 여러 박자 재확인 · 타이머 중복 방지
chk 'CUE_AUTOHIDE' i/cover-01.html 1                        # 스스로 물러난다(3.2초) · 없으면 홈·갤러리 미리보기에서 스크롤을 안 해 큐가 청첩장을 계속 가린다
chk 'CUE_AUTOHIDE' i-family/family-08.html 1
nochk 'rgba(250,250,248,.88)' i/cover-04.html               # 배경판은 옅게(.58) — .88 로 되돌리면 뒤 디자인이 안 보인다
chk 'CUE_MOOD' i/cover-01.html 1                            # 이탤릭 소문자 Scroll + 흘러내리는 선 · 트래킹 넓은 대문자로 되돌리면 UI 명령어 톤이 된다
chk 'cueDrip' i/cover-08.html 2                             # 말로 시키는 대신 동작을 보여 준다(제자리 맥박 → 흘러내림)
chk 'text-transform:none' i/cover-04.html 1
chk 'cue-dark' i/cover-08.html 2                            # 어두운 판(누아르)엔 어두운 배경판
nochk 'max-height:700px' i/cover-04.html                  # 높이별 감추기 폐지 — 되살리면 어떤 화면에선 있고 어떤 화면에선 없다
nochk 'var(--safe-bottom,0px));' i/cover-08.html          # --safe-bottom 은 판마다 값이 달라 같은 80px 이어도 자리가 어긋난다

# ── 대기 표시는 '하나의 취급' (2026-08-04 사용자 "왜 통일을 못 시키는 거야?") ──
# 점만 같아선 통일이 아니었다. 한 동작 안에서 ①반투명 베일 → ②페이지를 통째로 비우는 흰 화면 으로 넘어가
# 다 만들어 둔 마이페이지가 사라졌다 다시 나타났다. 화면에 내용이 있으면 지우지 않는다.
chk '_mpRefresh' mypage.html 18                          # 동작 뒤 갱신은 전부 베일 방식 · show('loading')+loadMyState() 조합으로 되돌리지 말 것
chk 'function _mpRefresh' mypage.html 1
chk 'opts.done' mypage.html 1                            # 베일을 걷을 시점(성공·실패·끊김 모두)
nochk "show('loading'); loadMyState" mypage.html          # 이 조합이 곧 '화면 비우기'다
chk 'SAMPLE_FOOT' mypage.html 3                          # 판 높이에서 하단 안전영역을 뺀다 · 안 빼면 실기기에서 아래 모서리가 잘린다

# ── [VOW_CHORUS] 서약의 마지막 한 문장은 두 분이 함께 (2026-08-04 사용자
#    *"합창부분도 시현해보자 적절한곳 찾아서 파일 다시주고 그부분도 문자수정하고"*
#    *"너무 유치하지않게 인스타감성 요즘 트랜드 세련된 웨딩이되어야하니깐"*) ──
# 왜 서약 자리인가 — 후보 다섯(첫인사·서약·성혼선언·헌정·폐식)을 의미·동선·길이·절제로 재서 골랐다.
#   교대 낭독 → 마지막은 함께가 요즘 서약문의 표준형이고, 두 분이 이미 마주 서 있어 동선이 안 생긴다.
# ★한 자리에만 둔다. 여러 곳에 뿌리면 희소성이 사라져 '장치'로 보인다 — 절제가 세련됨이다.
# ★재생기는 배열을 **순차** 재생한다. 두 파일을 동시에 트는 길이 없으므로 겹침은 미리 만들어 둬야 한다:
#   24(신랑)·25(신부)는 재료, 26은 그 둘을 겹친 결과물(scripts/build-chorus.mjs).
#   그래서 24·25 는 어디에도 배선하지 않는다 — 그대로 틀면 같은 말이 세 번 이어져 들린다.
#   대신 mixFor 로 "나는 저 클립의 재료다"를 표에 적어, 커버리지 검사가 목적지를 대신 보게 했다.
#   ★예외를 검사에 하드코딩하지 않았다 — 목적지가 사라지는 날 재료만 조용히 남는 걸 막기 위해서다.
chk 'VOW_CHORUS' assets/ritual-data.js 1
chk 'VOW_CHORUS' assets/ritual-cue.js 1
chk 'VOW_CHORUS' assets/ritual-story.js 3
# ★[REHEARSE_MERGED 2026-08-12] 4→3. 연습 공간 화면에 있던 **네 번째 표시 자리**가 그 화면과 함께 사라졌다.
#   남은 셋은 ①VOWBOTH 인라인 사본 근거(1129) ②서약 절 화면이 문장을 보여 주는 자리(2207)
#   ③복사되는 대본이 읽는 순서에 넣는 자리(2554). 고객이 준비하는 자리와 들고 갈 대본 둘 다 남았다.
#   ★확인하고 줄인 것이다 — 세지 않고 숫자만 맞추면 이 마커가 지키던 것이 조용히 빠진다.
chk 'VOW_CHORUS' order-preview.html 3
chk 'VOW_CHORUS' scripts/assemble-narration.mjs 1
chk 'VOW_CHORUS' scripts/check-text-audio.mjs 1
chk 'VOW_CHORUS' scripts/check-ritual-mirror.js 1
chk 'CAST_SILENT' order-preview.html 2                     # 건너뛴 클립을 화면이 말한다 — 지우면 다시 조용해진다
chk 'CHORUS_LAG' scripts/build-chorus.mjs 3                # '트랙 총길이 차 0' 을 '잘 맞았다'로 읽지 않게 진짜 값을 함께 찍는다

# ── [CAST_AUDIO_GUARD] 배선된 클립의 음원이 실제로 있는가 (2026-08-04)
#   배선만 되고 mp3 가 없으면 미리듣기가 그 대목을 건너뛴다. 예정된 결원은 PENDING 명단에만 적히고,
#   명단에 없는 결원·낡은 명단·죽은 id 는 여기서 하드 실패로 잡는다.
chk 'OPT_KEY' order-preview.html 4                         # 옵션 키(declareWho) != 큐 키(declare) — 표를 한 곳에만 두고 검사가 그 표를 읽는다
chk 'OPT_KEY' scripts/check-option-audio.mjs 1
chk 'NO_PLAY' order-preview.html 4                          # 소리 없는 자리는 버튼을 숨기고 이유를 남긴다 — 표는 화면 한 곳, 검사는 그 표를 읽는다
chk 'NO_PLAY' scripts/check-option-audio.mjs 3
if command -v node >/dev/null 2>&1; then node scripts/check-option-audio.mjs || fail=1; fi   # 옵션 카드 들어보기가 전부 소리를 내는지 전수(값 목록은 코드에서 편다)
chk 'CAST_AUDIO_GUARD' scripts/check-cast-audio.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/check-cast-audio.mjs || fail=1; fi
chk 'VOW_CHORUS' 'docs/plans/식순연구/배역_예시_대사.txt' 1
chk 'var VOWBOTH' assets/ritual-data.js 1                  # 문안 원천은 여기 하나
chk 'VOWBOTH:VOWBOTH' assets/ritual-data.js 1              # export 안 하면 화면·검사가 원천을 못 읽는다
chk 'mixFor' assets/ritual-story.js 2                      # 재료 두 칸 · 지우면 커버리지 검사가 옳게 화를 낸다
chk 'mixFor' scripts/build-course-story.mjs 3
chk "'26_vow-both'" assets/ritual-story.js 3               # CAST_AT 배선 · CAST 표 · mixFor 목적지
chk 'CAST_PAIR\[c.role\]' assets/ritual-story.js 1          # '신랑|신부'처럼 겹친 역할도 배지를 찾게
chk "split('|')" assets/ritual-story.js 1                  # 안 쪼개면 배지 키가 '신랑|신랑|신부|신부'로 깨진다
chk 'CHORUS_SEGN' scripts/build-chorus.mjs 5              # 문장 경계를 소리에서 추정하지 않는다 — manifest 가 아는 문장 수를 쓴다
chk 'CHORUS_MEET' scripts/build-chorus.mjs 1                # 목표 길이는 긴 쪽이 아니라 가운데 — 두 사람의 보정 여유를 둘 다 쓴다
chk 'CHORUS_STAGGER' scripts/build-chorus.mjs 1            # 0이면 사람이 아니라 합성처럼 들린다(플랜저)
chk 'IS_MIX' scripts/build-typecast-import.mjs 5           # 붙여넣기·화자 수·클립 수에서 합성 클립 제외
# ★[CHORUS_PASTE_2 2026-08-21] 가리키는 파일과 문장을 함께 옮겼다 — 뜻은 그대로다:
#   «재더빙 붙여넣기에 합창 재료 2클립(24·25)이 들어 있어야 한다». 26은 그 둘을 겹쳐 만드는 것이라
#   재료가 빠지면 26이 낡은 채 남는다. 옛 파일(재더빙_화면글자_맞추기.txt)은 옛 신랑 이름을 들고 있어
#   지웠고(VOICE_CAST_2), 문장도 COPY_BATCH 에서 VOWBOTH 가 바뀌었다.
chk '저희 두 사람, 오늘 한 약속대로 살겠습니다.' 'docs/plans/식순연구/타입캐스트/재더빙_20260821_5_배역.txt' 2
nochk "'live:두 분이 각자 준비한 서약문을 낭독'" assets/ritual-story.js   # 옛 키 — 되살리면 장면 안내가 조용히 끊긴다

# ── [ENTRY_ALT] 입장 인사는 두 분이 한 문장씩 번갈아 (2026-08-04 사용자
#    *"입장 번갈아가면서 하는게좋지 남편이랑 신부랑 같이 입장하는건데 왜 신부만 나래이션이있어?"*) ──
# 입장은 신랑·신부가 **함께 걷는** 자리인데 예시 인사 여섯 종이 전부 신부 한 사람 목소리였다.
# 화면은 "두 분이 읽을 인사"라 말하고 소리는 한 사람이었다.
# ★규칙이 네 곳에 흩어진다 — 원천(ritual-data ENTRY_ALT) · 화면(order-preview 사본+entryAlt) ·
#   성우 대본(배역_예시_대사.txt 줄 앞 화자) · 조립/재생 표(manifest sents[].role · ritual-story CAST).
#   하나만 고치는 날 화면엔 '신랑'인데 신부 목소리가 나온다 → check-entry-alt.mjs 가 넷을 전수 대조한다.
#   ★그 검사는 화면 entryAlt() 를 **떼어다 그대로 돌린다** — 손으로 다시 구현하면 자르는 자리가 갈린다.
# ★합창(둘이 동시)은 서약 마지막 한 문장뿐이다. 입장까지 합창으로 바꾸지 말 것 — 서약의 정점이 희석된다.
chk 'ENTRY_ALT' assets/ritual-data.js 2
chk 'var ENTRY_ALT=' assets/ritual-data.js 1               # 규칙 원천은 여기 하나
chk 'ENTRY_ALT:ENTRY_ALT' assets/ritual-data.js 1          # export 안 하면 화면·검사가 원천을 못 읽는다
chk 'ENTRY_ALT' order-preview.html 4
chk 'function entryAlt(t){' order-preview.html 1           # 검사가 이 함수를 떼어 돌린다 — 이름을 바꾸면 검사가 못 찾는다
chk 'ENTRY_ALT' assets/ritual-story.js 1
chk 'ENTRY_ALT' scripts/build-typecast-import.mjs 6        # 줄별 화자 파싱 · '신랑|신부' 펼치기
chk 'ENTRY_ALT' scripts/check-entry-alt.mjs 3
chk 'ENTRY_ALT' scripts/check-typecast-handoff.mjs 1        # 프로브 후보를 문장 화자로 고른다 — 클립 단위면 '신랑'이 한 건도 안 잡힌다
chk 'ENTRY_SELF_MIRROR' scripts/check-ritual-mirror.js 1   # ENTRY.self 사본도 대조 — NAR_MIRROR 는 .nar 만 훑어 안 걸렸다
chk '신랑|신부' 'docs/plans/식순연구/배역_예시_대사.txt' 7   # 입장 6 + 합창 1
chk '"role": "신랑|신부"' 'docs/plans/식순연구/타입캐스트/manifest.json' 7
if command -v node >/dev/null 2>&1; then node scripts/check-entry-alt.mjs || fail=1; fi

# ── [ENTRY_VOICE] 글자 말고 **소리**로 화자를 본다 ──
# 위 check-entry-alt.mjs 는 원천·화면·대본·조립표가 같은 말을 하는지 본다. 그런데 그 넷이 전부
# 초록인 채로 **소리만 한 사람**일 수 있다. 실제로 그랬다 — 화면은 "신랑 한 문장, 신부 한 문장"인데
# 여섯 클립 전부 신부 목소리였다. 글자 검사는 이걸 원리적으로 못 잡는다.
# check-entry-voice.mjs 가 문장별 기본 주파수(F0)를 재서, 대본이 말한 화자 쪽에 붙는지 본다.
# ★남/여 Hz 를 적어 넣지 않는다 — 받은 소리에서 두 무리를 스스로 만들어 자가 보정한다(성우가 바뀌어도 산다).
# ★소리가 아직 없으면 조용히 skip — 붙여넣기 전에는 잴 것이 없다. 있는데 어긋난 것만 실패다.
chk 'ENTRY_PASTE' scripts/check-entry-alt.mjs 1         # 붙여넣기 파일이 낡으면 다시 붙여넣는 날 사고가 그대로 재발한다
chk 'ENTRY_VOICE' scripts/check-entry-voice.mjs 1

# ── [ORDER_AUDIT] 식순 이벤트 전수 점검 화면 (2026-08-07 · 임시) ──
# 사용자가 코스를 다시 짜기 전에 "이벤트가 전부 나열되고 이벤트마다 나레이션을 들어 볼" 화면을 요청.
# ★임시 화면이다. 코스 리뉴얼이 끝나면 order-audit.html 과 이 블록을 **같은 커밋에서 함께** 지운다.
# ★이 화면은 원천이 아니다 — 목록·문안·파일 이름을 여기 적지 않고 assets/ritual-cue.js 를 돌려서 그린다.
#   표를 화면에 다시 적는 순간, 코스가 바뀌는 날 이 화면만 낡은 식순을 보여 준다.
# ── [LEAD_OUT] 사람의 시간은 자기 닫는 말을 갖는다 (2026-08-07 사용자
#    *"나래이션멘트가 주인공 신랑신부가 행동하게 자연스럽게 시작과끝을 매워주고 리드해야하는데"*) ──
# 닫는 말이 없으면 디렉터가 누르는 순간 '다음 순간의 여는 말'이 나와, 그 한 문장이 앞을 닫고
# 뒤를 여는 두 몫을 혼자 진다 → 앞 순간이 증발한다(축가는 3분 30초를 7초 도입 하나로 열고 끝이 없었다).
# ★디렉터의 누름은 이미 그 자리에 있다 — 수동 큐 수는 그대로 10개다(check-ritual-cue.js 가 고정).
# ★닫는 말은 다음 순서를 지목하지 않는다 — 코스마다 순서가 다르고 사용자가 바꾼다.
chk 'LEAD_OUT' assets/ritual-data.js 1
# ★[MARKER_TAUTOLOGY 2026-08-11] 전엔 `chk 'entryOut' … 1` 이었다. ENTRY_OUT_TONE 이 들어오며
#   'entryOutBy' 가 이 낱말을 품어, **평키를 통째로 지워도 'ok … 2'** 라고 답했다(실측).
#   재는 것이 사라졌는데 초록이던 자리다 — 낱말이 아니라 **정의 줄**(앞 빈칸+콜론)로 못박는다.
#   ※ 지워지면 build-dubbing-script.mjs 가 죽어 게이트는 어차피 붉지만, 그건 다른 검사의 공이다.
chk ' entryOut:' assets/ritual-data.js 1
chk 'narr-entry-out' assets/ritual-cue.js 2
chk 'narr-song-out' assets/ritual-cue.js 2
chk 'LEAD_OUT' order-preview.html 2
chk 'OUT_ENTRY' order-preview.html 2
# ── [REDUB_PENDING] 글은 새 것 · 소리는 아직 옛 것인 창을 명단 하나로 지킨다 ──
# 빨갛게만 두면 재더빙이 끝날 때까지 검사 전체가 빨개서 사람이 검사를 안 본다. 조용히 넘기면
# "고쳤는데 소리는 안 바뀐" 상태가 배포된다. → **사용자가 실제로 붙여넣는 파일이 곧 명단**이고,
# check-text-audio.mjs 가 어긋난 자리 ↔ 명단을 양방향으로 대조한다(명단을 코드에 또 적지 않는다).
# ── [RECORD_COURSE] 기록형 — 촬영이 본체인 코스 (2026-08-07 사용자
#    *"촬영이 메인이고 웨딩이벤트만이 줄수있는 감동의 순간들 한두개 정도 아니면 3개정도만"*) ──
# ★긴 말하는 자리가 **하나**여야 성립하는 코스다(서약 또는 편지 택일 · peakOne).
#   둘이 되는 순간 디렉터가 카메라를 놓아야 한다 — 끝을 사람이 재야 하는 자리라서.
#   그 규칙은 코스 정의가 아니라 norm() 에 있다(seq/opt 로는 '둘 중 하나'를 못 적는다).
# ★vow 빌더가 S.vow 를 봐야 한다 — 안 보면 norm() 의 결정이 조용히 무시된다.
# ★입장 행진 없음(하객 사이를 지나 옴) · 선언은 하객이 함께(격식 축을 지키는 최소 형식).
chk 'RECORD_COURSE' assets/ritual-data.js 1
chk 'peakOne' assets/ritual-data.js 1
chk 'PEAK_ONE' assets/ritual-cue.js 2
chk 'peakOne' assets/ritual-cue.js 1
chk "record: { entry: 'F'" assets/ritual-cue.js 1
chk 'FREE_SLOT' assets/ritual-data.js 1
chk 'FREE_SLOT' assets/ritual-cue.js 2
chk 'narr-free-in' assets/ritual-cue.js 2
chk 'free: 1' assets/ritual-cue.js 1                       # GADD — 빼면 자유 칸을 팔레트로 못 넣는다
chk "'free'" scripts/check-text-audio.mjs 1                # 훑는 목록에서 빠지면 두 클립이 조용히 사라진다
chk 'free:1' order-audit.html 1
chk 'REDUB_PENDING' scripts/check-text-audio.mjs 1
chk 'REDUB_PENDING' scripts/check-option-audio.mjs 2
chk 'REDUB_PENDING' order-audit.html 2
chk '재더빙_리드보강.txt' scripts/check-text-audio.mjs 1
chk '재더빙_리드보강' scripts/check-option-audio.mjs 1
chk 'ORDER_AUDIT' order-audit.html 1
chk 'ritual-cue.js' order-audit.html 3                     # 엔진을 돌려서 그린다는 사실 자체가 지켜져야 한다
chk 'noindex' order-audit.html 1                           # 고객에게 노출되는 페이지가 아니다
if command -v node >/dev/null 2>&1; then node scripts/check-entry-voice.mjs || fail=1; fi

# ── [GV_NOBACK][GV_TOPRESET] 청첩장 미리보기 좌우 넘김 (2026-08-04 사용자
#    *"좌로넘길때 옆으로안가고 뒤로가기 실행되는데 청첩장 미리보기 부분에서만 뒤로가기 기능 끄자"*
#    *"다시 그청첩장으로 넘겻을때 스크롤이 최상단이 아니라 마지막으로 봣던 페이지부분이 나오는데"*) ──
# ① 뒤로가기: iOS·안드로이드는 화면 가장자리에서 시작한 가로 스와이프를 브라우저 이동으로 가져간다.
#    막을 수 있는 시점은 touchstart 뿐이다(그 뒤엔 이미 제스처가 시작된다) — 그래서 {passive:false}.
#    좌우 끝 44px 는 넘기기 버튼(.gv-edge)이 덮은 자리라 아래에 굴릴 본문이 없다 → 스크롤을 안 뺏는다.
#    ★touchstart 를 막으면 브라우저가 click 을 안 보낸다. 탭 대체 처리를 지우면 가장자리 화살표가 죽는다.
# ② 최상단 복귀: 떠나는 카드만 되돌리던 것을 **도착하는 카드**로 옮겼다.
#    청첩장 html 은 scroll-behavior:smooth 라 화면 밖 카드에서는 되감기가 중간에 멈춘다(실측) —
#    되돌리는 동안만 auto 로 내려야 진짜 0 이 된다.
chk 'GV_NOBACK' invitation-gallery.html 3
chk 'passive:false, capture:true' invitation-gallery.html 1
chk 'GV_TOPRESET' invitation-gallery.html 1
chk 'resetScroll(cards\[i\])' invitation-gallery.html 1
chk "scrollBehavior = 'auto'" invitation-gallery.html 1
nochk 'resetScroll(cards\[idx\])' invitation-gallery.html    # 옛 형태(떠나는 카드만 되돌리기) — 되살리면 돌아온 카드가 아까 보던 자리에서 열린다

# ── [CUE_GLIDE][CUE_OFFSCROLL][CUE_ONE] 스크롤 표시 한 벌 (2026-08-04 사용자
#    *"사라질때 스르르 웨딩 무드에 맞게 청첩장 샘플쪽도 똑같이"*
#    *"나올때도 스르륵 무드잇게 샘플쪽도 미리보기청첩장이랑 시간이랑 투명도라우전부 같이 적용해"*) ──
# 값 한 벌: 자리 80px · 알약 rgba(250,250,248,.42)+blur7 · 라벨 10.5px/.13em · 선 22px/cueDrip 2.1s ·
#           0.5s 뒤 .in(0.95s 상승) · 2.2s 뒤 .hidden(1.15s 하강) · 손으로 내리면 그 즉시.
# ★animation:none 이 핵심이다. 옛 fadeInUp(지연 2.4s·forwards)이 살아 있어 **애니메이션이 전환을 이겨**
#   사라질 때 불투명도만 뚝 끊겼다(실측: transform 은 1.15s, opacity 는 0ms). 지우면 그 증상이 돌아온다.
# ★마이페이지 '청첩장 샘플' 모달은 invitation-gallery.html 을 그대로 띄운다 — 그래서 한 벌로 족하다.
# ★개수로 세지 않는다 — 개수는 "있다"만 말하고, 여기 요구는 "**같다**"였다.
#   18개 파일의 값을 맞대어 보는 검사를 따로 두고, 이 줄은 그 검사가 살아 있는지만 지킨다.
chk 'CUE_ONE' scripts/check-cue-one.mjs 1
chk 'CUE_GLIDE' guide.html 2
chk 'CUE_GLIDE' i/invitations/invitation-09-guide.html 2
chk 'CUE_ONE' invitation-gallery.html 1
if command -v node >/dev/null 2>&1; then node scripts/check-cue-one.mjs || fail=1; fi

# ── [GV_ROW_TIGHT] 미리보기 상단 띠 54 → 42px (2026-08-04 사용자
#    *"샘플이랑 미리보기 두쪽전부 온라인,오프라인 위에 선택창 부분 세로폭 최대한으로 줄여보자"*) ──
# 헤더와 띠가 **같은 높이**여야 한 줄로 겹친다(GV_ONEROW). 한쪽만 고치면 토글이 헤더 밖으로 삐져나온다.
chk 'GV_ROW_TIGHT' invitation-gallery.html 3

# ── [VIEWPORT_ONE] 청첩장 16장의 viewport 선언은 한 줄이어야 한다 (2026-08-04 axe 적발) ──
# 01(온라인·오프라인) 두 판만 maximum-scale=1.0,user-scalable=no 였다. 두 가지가 동시에 깨져 있었다:
#   ① 확대 금지 = WCAG 1.4.4 위반(axe meta-viewport) — 글씨를 키워 읽는 사람을 막는다.
#   ② viewport-fit=cover 가 없어 env(safe-area-inset-*)이 늘 0 — [CUE_POS]의 하단 안전영역 보정이
#      그 두 판에서만 조용히 죽어 있었다(노치 기기에서 큐가 홈 인디케이터에 더 붙는다).
nochk 'user-scalable=no' i/cover-01.html
nochk 'user-scalable=no' i-family/family-01.html

# ── [DEL_TRUTH] 삭제 확인 문구가 서버의 실제 동작과 같은 말을 하는가 (2026-08-04 사용자 "4번 너가확인해봐") ──
# 서버(automation/platform/96_ai_cost.gs)를 읽고 셋을 갈랐다:
#   · aiFactDelete  — 지우기 직전 값을 이력 시트에 '(삭제)'로 남기고 aiFactRollback 이 되살린다 → 되돌릴 수 있다.
#     다만 지우면 목록에서 행이 빠져 '이력' 버튼에 닿을 길이 없었다. 그래서 지운 직후 이력을 펼친다.
#     ★showFactHist 호출을 빼면 '되돌릴 수 있다'는 문구가 거짓말이 된다.
#   · aiKbNoteDelete / aiRegDelete — sh.deleteRows 한 줄, 이력 없음 → 정말 못 되돌린다.
#     둘 다 바로 옆에 '끄기'(SetActive)가 있고 그건 되돌릴 수 있다 — 문구가 그쪽을 가리킨다.
chk 'DEL_TRUTH' admin.html 3
chk 'showFactHist(k)' admin.html 1
chk '되돌릴 수 없어요 — 잠깐 멈추려는 거라면' admin.html 2

# ── [GV_SIDE_OFF][GV_NAME_KO][GV_BACK] PC 미리보기 연속성 (2026-08-04 사용자
#    *"연속성을 위해 좌측에있는 설명부분은 삭제 / 하단 좌측 영문은 삭제 한글로 / 오픈눌러서 들어가면
#      그전 청첩장이랑 똑같은 디자인으로 뒤로가기 버튼"*) ──
# ① 좌측 설명 판(aside.gv-info) 폐기 — 9~11번에서만 켜져 넘길 때마다 화면 왼쪽이 켜졌다 꺼졌다 했다.
#    설명 3줄은 상단 띠 '자세히'(.gv-vi-lines)에 그대로 있다 — .gv-info-l 규칙을 지우면 그쪽이 민얼굴이 된다.
# ② 안내 카드 이름에서 영문 삭제 → 한글만. Cormorant 에는 한글이 없어 .ko 로 한글 세리프를 받쳐야 한다.
# ③ 돌아가기 알약을 shared/gv-back.js **한 곳**으로 모았다(종전엔 hydrate.js 안에 있어 16장 전용).
#    갤러리가 Open 주소에 ?gv=<카드>-<판> 표식을 붙이고, 그 표식이 있을 때만 뜬다.
#    ★진짜 하객이 받은 주소엔 표식이 없다 — 거기 '갤러리'가 뜨면 결함이다(실측 4경로 0건).
#    ★hydrate.js 에 다시 만들지 말 것. 두 벌이 되면 언젠가 한쪽만 손대 생김새가 갈린다.
chk 'GV_SIDE_OFF' invitation-gallery.html 3
nochk 'aside class="gv-info"' invitation-gallery.html
chk 'gv-info-l' invitation-gallery.html 4
chk 'GV_NAME_KO' invitation-gallery.html 2
chk 'gv-meta-name.ko' invitation-gallery.html 1   # CSS가 한 줄로 붙어 있어 줄 수는 1
chk 'GV_BACK' invitation-gallery.html 1
chk "'gv=' + i + '-' + ver" invitation-gallery.html 1
chk 'INV_BACK' shared/gv-back.js 2
nochk 'function injectGalleryBack' shared/hydrate.js
if command -v node >/dev/null 2>&1; then
  _n=$(grep -l 'shared/gv-back.js' i/cover-0*.html i-family/family-0*.html live.html guide.html i/invitations/invitation-09-guide.html 2>/dev/null | wc -l | tr -d ' ')
  [ "$_n" = "19" ] || { echo "REVERT? gv-back.js 배선이 19곳이 아니다($_n) — 빠진 판은 Open 후 돌아갈 문이 없다"; fail=1; }
fi

# ── [SEAL_POINT] 진사(#6B2A24)는 포인트에만 (2026-08-04 사용자 *"진사 색상은 최소한 포인트 부분만 사용하자"*) ──
# 브랜드 규칙은 원래 '진사 = CTA·강조 포인트, 넓은 면적 금지'였는데, 상담 신청 화면 한 곳에
# 진사 덩어리가 셋이었다(실측: 신청 버튼 17500px² · 시간표 열기 13608px² · 상품 칩 6360px²,
# 모달을 열면 시간대 칩 5803px² 까지 넷). 셋이 모이면 그건 포인트가 아니라 색 배합이다.
# 남긴 것 — 화면당 주 행동 하나(신청 보내기)와 진짜 점들(타임라인 '지금' 점 · 나브 점 · 지도 핀).
# 옮긴 것 — 선택 상태는 먹색(#4E3F31)으로. 같은 상품 토글이 화면에선 진사, 모달에선 먹색이라
#           열었다 닫으면 같은 버튼의 색이 바뀌어 보이던 것도 이걸로 함께 정리됐다.
# 조용해진 것 — '시간표 보기'는 주 행동이 아니다. 헤어라인 + 먹색 글자(guide.html .ps-btn과 같은 말),
#           진사는 시계 아이콘 하나에만 남는다.
chk 'SEAL_POINT' assets/sequence-modal.js 2
chk 'SEAL_POINT' inquiry.html 1
nochk 'meseq-tab.on{background:#6B2A24' assets/sequence-modal.js
nochk 'seq-open-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#6B2A24' assets/sequence-modal.js
nochk 'seqref-sw button.on{background:#6B2A24' inquiry.html
chk 'seq-open-btn svg{color:var(--seal' assets/sequence-modal.js 1     # 진사를 지운 게 아니라 점으로 되돌린 자리

# ── 예약·신청 화면 디자인 점검 (2026-08-04 사용자 *"예약페이지 디자이너 관점으로 디자인 체크 디테일 까지"*
#    *"홈페이지에서 예약정보 작성하는 예약페이지도 점검"*) ──
# [SCHED_QUIET_OFF] 비활성 CTA — 진사 채움을 opacity 0.32 로 낮춘 것이었다. 크림 위에서 분홍(모브)으로
#   읽히고, 346x56 이라 '아직 눌리지도 않는 것'이 화면에서 가장 큰 색 덩어리였다. 채움 없이 헤어라인으로.
#   ★기본 .btn 에 투명 테두리를 미리 깔아 둔다 — 비활성에만 테두리를 주면 켜질 때 높이가 2px 튄다(실측).
# [SCHED_PALETTE] 토요일 머리글이 파랑(#556791)이었다 — 크림·먹·금·진사뿐인 지면의 유일한 한색.
#   그리고 상담 신청 화면은 라디오·체크 49개가 accent-color 없이 브라우저 기본 파랑으로 켜졌다.
# [SCHED_EMPTY_SPAN] '날짜를 선택하시면…'이 슬롯 격자의 첫 칸에 갇혀 폭 154px, 넉 줄로 쪼개져 있었다.
# [SCHED_KEEPALL] 안내 본문에서 '예약 완료는'이 '예약 / 완료는'으로 끊겼다.
# [KO_TRACKING] 영문 눈썹용 규칙(이탤릭+넓은 자간+uppercase)에 한글이 들어가 '확 인' '필 수'로 흩어졌다(6곳).
chk 'SCHED_QUIET_OFF' schedule.html 2
chk 'SCHED_PALETTE' schedule.html 1
chk 'SCHED_PALETTE' inquiry.html 1
chk 'SCHED_EMPTY_SPAN' schedule.html 1
chk 'SCHED_KEEPALL' schedule.html 1
chk 'KO_TRACKING' inquiry.html 1
chk 'grid-column:1/-1;text-align:center' schedule.html 1
chk 'accent-color:var(--seal)' inquiry.html 1
chk 'accent-color' order-preview.html 1
nochk 'btn:disabled{opacity:0.32' schedule.html
nochk 'wd.sat{color:#556791' schedule.html

# ── [DEPLOY_ONE] 배포 한 줄 + 프록시 403 대응 (2026-08-04 사용자 지시 "앞으로 자동으로도 할수잇게") ──
# 배포는 sh scripts/deploy.sh 로 한다 — 마커 자가진단 → 최신화 → 푸시, 막히면 인계용 patch 를 만든다.
# ★프록시 우회(https_proxy= / no_proxy="*" / -c http.proxy=)는 하지 않는다.
#   저장소도 토큰도 우리 것이지만 그 프록시는 실행 환경이 에이전트에게 건 통제다.
#   이 두 줄(스크립트의 금지 주석 · CLAUDE.md 의 금지 항목)이 사라지면 다음 세션이 그 유혹에 그대로 걸린다.
chk 'DEPLOY_ONE' scripts/deploy.sh 1
chk 'DEPLOY_ONE' CLAUDE.md 1
chk 'never unset HTTPS_PROXY' CLAUDE.md 1
chk 'authorized repository set' scripts/deploy.sh 1
chk 'format-patch' scripts/deploy.sh 1
nochk 'no_proxy="\*"' scripts/deploy.sh

# ── [GV_EDGE_AWAY] 좌우 화살표도 스르륵 물러난다 (2026-08-04 사용자
#    *"좌우 버튼 넘기면 적절하게 스르륵 사라지도록해죠 모바일청첩장에 집중할수있게"*) ──
# 스크롤 표시와 **같은 한 벌**: 0.95s 등장 / 1.15s 퇴장 · visibility 를 전환 목록에 함께 넣는다.
# 머무는 시간만 더 길다(3.6s) — 큐는 한 번의 안내지만 화살표는 조작 수단이라 알아볼 여유가 필요하다.
# 돌아오는 조건이 핵심이다: 카드가 바뀔 때 · 청첩장이 맨 위로 돌아왔을 때. 빼면 넘길 방법을 못 찾는 사람이 생긴다.
# ★화살표가 물러나면 좌우 가장자리가 청첩장 본문이 된다 — 그래서 iframe 안 뒤로가기 가드를 44→26px 로 좁혔다.
#   되돌리면 좌우 44px 에서 시작한 세로 스크롤이 먹통이 된다.
chk 'GV_EDGE_AWAY' invitation-gallery.html 5
chk 'gvEdgeWake' invitation-gallery.html 4
chk 'gv-edge.gv-away' invitation-gallery.html 1
chk 'sx <= 26' invitation-gallery.html 1
nochk 'sx <= 44' invitation-gallery.html

# ── [MAST_TOP] 머리글 위 공간 (2026-08-04 사용자 *"모먼트에디트 로고 윗쪽 간격이 너무 넓은데 적절하게줄여죠"*
#    *"청첩장 전부 점검해서 적절하게 제작에 샘플쪽도"*) ──
# 실측: 8종 모두 위 공간(25~32px)이 옆 여백(22~28px)보다 넓어 머리글이 아래로 밀려 보였다.
# 머리글은 본문이 아니라 running head — 옆보다 좁아야 지면 위에 얹힌 것으로 읽힌다.
# 잉크가 위에서 **18px** 에 오도록 6종을 맞췄다(실측 18/18/18/18/18/18 · 08 은 편집 여백이라 86→68 로 폭만 동일하게).
# ★var(--safe-top) 은 건드리지 않았다 — 노치 보정은 이 값과 별개다. 되살릴 때 함께 지우지 말 것.
chk 'MAST_TOP' i/cover-02.html 1
chk 'MAST_TOP' i/cover-03.html 1
chk 'MAST_TOP' i/cover-04.html 1
chk 'MAST_TOP' i/cover-05.html 1
chk 'MAST_TOP' i/cover-06.html 1
chk 'MAST_TOP' i/cover-07.html 1
chk 'MAST_TOP' i/cover-08.html 1
chk 'MAST_TOP' i-family/family-02.html 1
chk 'MAST_TOP' i-family/family-03.html 1
chk 'MAST_TOP' i-family/family-04.html 1
chk 'MAST_TOP' i-family/family-05.html 1
chk 'MAST_TOP' i-family/family-06.html 1
chk 'MAST_TOP' i-family/family-07.html 1
chk 'MAST_TOP' i-family/family-08.html 1

# ── [TOKEN_DEFINED] 대체값 없는 미정의 CSS 변수 (2026-08-09) ──
# 실사고: order-preview 에서 var(--gold-text) 5곳이 미정의라 카드 테두리가 **검게** 나왔다.
# 문법이 맞아 어떤 검사도 안 잡았고 사용자가 화면을 보고 지적했다.
# 미정의 var 는 그 선언을 계산 시점에 무효로 만든다 → border-color 는 currentColor 로 떨어진다.
# ★대체값이 있는 var(--x, 값)은 정상이라 넘긴다 · 주석은 지우고 읽는다(사고 기록이 물리지 않게).
chk 'TOKEN_DEFINED' scripts/check-css-tokens.mjs 1
chk '주석을 먼저 지운다' scripts/check-css-tokens.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/check-css-tokens.mjs \
  index.html inquiry.html mypage.html order-preview.html guide.html console.html schedule.html \
  live.html admin.html parents.html privacy.html preview.html seat.html form.html cancel.html \
  invitation-gallery.html order-audit.html >/dev/null \
  || { echo 'FAIL token: 대체값 없는 미정의 CSS 변수 — node scripts/check-css-tokens.mjs <페이지들>'; fail=1; }; fi

# ── [TAP44_FOOT_OFF] 푸터 링크를 히트영역 확장 규칙에서 뺀 것 (2026-08-09) ──
# padding:15px + margin:-15px 은 상자를 50px 로 키우고 자리는 도로 뺏는다 → 이웃 줄로 넘쳐
# **나중에 그려진 링크가 앞 링크의 한가운데를 가져갔다**(실측: 푸터 'My Page' 탭 → privacy.html).
# 되살리려면 줄이 44px 를 실제로 차지해야 하고 그건 푸터 모양이 바뀌는 일이다 — 사용자 선택이 먼저.
#   (한 줄 flex 로 모으는 판을 만들어 보였고 사용자가 *"푸터 이상한데 그냥 전으로 돌려"* 로 물렀다)
chk 'TAP44_FOOT_OFF' index.html 1
chk 'TAP44_FOOT_OFF' inquiry.html 1
chk 'TAP44_FOOT_OFF' parents.html 1
nochk 'footer a\[href\$="mypage.html"\]' index.html
nochk 'footer a\[href\$="mypage.html"\]' inquiry.html
# 크기와 눌림은 다른 문제다 — 사각형이 44 이상이면 검사를 건너뛰던 지름길이 이 사고를 초록으로 만들었다
# ── [EST_ONE_NUMBER 2026-08-10] 예식 길이는 화면마다 같은 수여야 한다 ──
# 실사고: 빌더 완성 화면 '약 28분' ↔ 미리듣기 인트로 '실제 예식은 약 47분'. 세 배 넘게 갈렸고
# 거꾸로 붙어 있었다(짧은 코스일수록 큰 수). 원인은 totalSec(= 예식 + 남는 시간)을 '예식'이라 부른 것.
# ※ check-est-one.mjs 는 여기서 실행하지 않는다 — 브라우저와 로컬 서버(:8895)가 필요해서다 [NO_GATE].
# ── [PROBE_RULER 2026-08-10] 화면을 재는 공용 자 ──
# 한 세션에서 같은 종류의 측정 실수를 여섯 번 했다(innerText 로 접힌 것 못 봄 · script 문자열을
# 화면 글로 셈 · 잘려서 안 보이는 것을 넘침으로 셈 · 저장소 밖 서버 404 를 결함으로 읽음 등).
# 자를 파일 하나로 모으고, 서버가 저장소 루트를 보는지 **재기 전에** 확인하게 했다.
# ※ 이 파일도 게이트가 실행하지 않는다 [NO_GATE] — 브라우저·서버가 필요하다.
# ── [FAQ_ASK_CLEAR 2026-08-10] 레일을 숨기지 말고 겹치는 본문 두 줄을 비켜 앉힌다 ──
# 사용자: 「우측 아이콘 레일이 어느 지점에서 사라지는데 해결해죠」 → FAQ_DODGE 숨김 폐지.
# 대신 .faq-ask-eg / .faq-ask-form 을 ≤700px 에서 오른쪽 24px 안쪽으로. 실측: 겹침 2건 → 0건.
# ★숨김 규칙(opacity:0 / visibility:hidden)을 .faq-dodge 에 되살리지 말 것.
chk 'FAQ_DODGE 폐지' index.html 1                       # 폐지 근거가 코드 옆에 남아 있어야 한다
chk 'FAQ_ASK_CLEAR' index.html 1                        # 대체 처방
chk 'margin-right: 24px' index.html 1                   # 그 처방의 실제 값
# [ASK_CLEAR_NUM 2026-08-11] 기준선 정정 — FAB 왼끝은 350 이 아니라 338 이다(transform 네 번 확인).
# 옛 주석은 「20~28px 이면 350 안쪽」이라 적었는데, 338 기준으로는 0~28 어디에도 넘지 않는 값이 없다.
# 24px 은 겹침을 없애는 값이 아니라 **한 줄을 지키며 16px → 4px 로 줄이는 값**이다.
# 남은 4px 은 눌리는 자리를 안 뺏는다(check-tap-targets ⚠겹침 0). 겹침 자체는 RAIL_OVERLAP_OK.
chk 'ASK_CLEAR_NUM' index.html 1                        # 정정 근거 — 350 으로 되돌아가지 않게
nochk 'FAB 버튼 왼끝 350px' index.html                  # 틀린 기준선이 되살아나면 잡는다
# ── [DUR_SAY_WHY 2026-08-10] 막는 것과 왜 막혔는지 말하는 것은 다른 일이다 ──
# execFileSync 는 ffprobe 가 비정상 종료하면 먼저 던져, dur() 의 안내문에 닿지 못하고
# Node 스택 덤프가 뿌려졌다(깨진 wav 로 재현). spawnSync 로 두 실패를 한 문장으로 낸다.
# 적대 실측: 깨진 파일 → 「길이를 못 읽었습니다 … Invalid data found」 exit 1 ·
#            ffprobe 없음 → r.error ENOENT · 정상 재조립 → 5클립 바이트 동일(멱등)
chk 'DUR_SAY_WHY' scripts/assemble-narration.mjs 1
chk 'DUR_SAY_WHY' scripts/assemble-parents-letter.mjs 1
chk 'r.error' scripts/assemble-narration.mjs 1
chk 'r.error' scripts/assemble-parents-letter.mjs 1
# ── [LISTEN_REVIEW 2026-08-11] 소리를 사람 귀로 통과시키는 유일한 자리 ──
# mp3 100개 중 사람이 들어 본 것은 6개(입장 A~F)뿐이었다. 나머지는 기계가 파형만 쟀다.
# 이 화면은 목록을 베끼지 않는다 — manifest + _recorded 를 실행 시점에 읽는다.
# 판정 결과가 곧바로 재더빙 붙여넣기 대본(화자: 문장)으로 나와 기존 파이프라인에 물린다.
# ★[LISTEN_EXPORT_REAL 2026-08-11] 윗줄 「물린다」는 처음엔 **확인 안 하고 쓴 말**이었다.
#   실제로 넣어 보니 exit 1 — 복수 화자가 `신랑|신부:` 로 나갔고 타입캐스트엔 그런 사람이 없다.
#   꼴로는 「이름: 대사」라 멀쩡했고 화면으로도 멀쩡했다. 지금은 실행으로 확인한다
#   (scripts/check-listen-export.mjs 가 진짜 검사를 자식 프로세스로 그대로 돌린다).
# ── [NIGHTLY_SCREEN · MYPAGE_UNSEEN 2026-08-11] 게이트 밖 브라우저 검사를 하루 한 번 ──
# 검사 51개 중 merge-guard 가 실행하는 것은 22개. 갈림이 우연이 아니라 **브라우저가 필요한
# 것들만** 밖에 있었다(= 눈으로 보는 것들). 레일 사라짐을 아무 검사도 안 잡은 이유다.
# 야간 잡은 **막지 않고 알린다** — 막는 일은 merge-guard 하나로 족하다.
# ★check-mypage-shell 은 일부러 0 을 안 낸다. 로그인 뒤가 사각지대라는 사실을 매일 알린다.
chk 'NIGHTLY_SCREEN' .github/workflows/nightly-screen.yml 1
chk '막지 않고 알린다' .github/workflows/nightly-screen.yml 1
# [EXPECTED_TWO 2026-08-11] 「늘 2 인 검사」의 2 는 요약 색을 바꾸지 않는다.
# 안 그러면 **모든 밤이 노란색**이 되어, 진짜 고장난 밤과 글자까지 같은 문구가 나온다(시뮬 실측).
# 그러면 이 잡을 게이트에 안 넣은 이유(「잘 울면 사람이 무시한다」)를 스스로 저지르는 셈이다.
# 네 상태가 갈리는지 확인함 — 정상 0 · 진짜 못 잼 2 · 틀림 1 · expected 인데 1 이면 그래도 1.
chk 'EXPECTED_TWO' .github/workflows/nightly-screen.yml 1
chk '늘 켜져 있는 신호는 신호가 아니다' .github/workflows/nightly-screen.yml 1
chk 'note "check-mypage-shell (늘 2 · 사각지대 알림)" $? expected' .github/workflows/nightly-screen.yml 1
chk 'MYPAGE_UNSEEN' scripts/check-mypage-shell.mjs 1
chk '가짜 데이터를 지어내 통과시키지 않는다' scripts/check-mypage-shell.mjs 1
nochk 'process.exit(0)' scripts/check-mypage-shell.mjs      # ★초록을 내게 고치지 말 것
chk 'LISTEN_REVIEW' audio-review.html 1
# ── [SENT_PICK 2026-08-11 사용자 지시 "예를 들어 이 문단 다시 녹음 이런식으로"] ──
# 클립 통째가 아니라 **문장 단위**로 다시 고를 수 있다. 고른 문장만 붙여넣기 대본에 실린다.
# ★문장은 manifest 의 sents 에서 온다 — 화면에서 다시 쪼개지 않는다(규칙이 둘이면 갈라진다).
# ★안 고르면 클립 전체다. 「하나도 안 골랐다」를 「아무것도 안 한다」로 읽지 않는다.
chk 'SENT_PICK' audio-review.html 3
# ── [SENT_EDIT 2026-08-11 · 클로드코드 지적] 고른 문장을 **그 줄에서** 고친다 ──
# 옛 판은 아래 글칸이 클립 전체를 고치고, 문장을 고르면 그 고침이 대본에서 빠졌다 —
# 「고친 글이 대본으로 나갑니다」와 「고른 문장만 실려요」가 서로를 부정했다.
# ★문구로 덮지 않고 어긋남의 뿌리를 없앴다: 고른 문장은 그 줄에서 고치고 그 글이 그대로 나간다.
# ★check-listen-export 가 그 길을 실제로 쏜다(문장 고르기 · 고쳐 쓰기 두 발) — 돌연변이 둘 다 붉었다.
chk 'SENT_EDIT' audio-review.html 2
chk 'sentText' audio-review.html 3
chk 'SENT_EDIT' scripts/check-listen-export.mjs 2
chk '문장 고르기' scripts/check-listen-export.mjs 1
# ★[PICK_KEEPS_SOUND 2026-08-11 실측] 문장을 고를 때 paintStage() 를 부르지 말 것 —
#   무대를 다시 그리면 au.src 가 다시 걸려 듣던 소리가 처음으로 되감기고 멈춘다(0.66초→0.00초·paused).
#   들으면서 표시하는 화면이라 한 문장 고르자고 처음부터 다시 듣게 된다. 그 줄의 글칸만 넣고 뺀다.
#   ★가드를 nochk 로 짜려다 접었다 — `toggle('on'); saveNg(false);` 는 **사유 칩 손잡이**에도 있어
#     문턱 1 을 주면 「없음」이라고 말하면서 하나를 눈감는다. 어제 적은 15-b(MARKER_TAUTOLOGY)를
#     하루 만에 내가 다시 밟은 자리다. → 낱말 대신 **수술 자국**을 세고, 진짜 확인은 아래 ⑦이 쏜다.
chk 'PICK_KEEPS_SOUND' audio-review.html 1
chk 'wrap.appendChild(inp)' audio-review.html 1     # 그 줄의 글칸만 넣고 뺀다 — repaint 로 되돌리면 사라진다
chk 'PICK_KEEPS_SOUND' scripts/check-listen-export.mjs 1   # ⑦ 소리가 살아 있나를 실제로 쏜다
chk 'BLANK_SHOWS_TRUTH' scripts/check-listen-export.mjs 1  # ⑧ 보이는 글과 나가는 글이 같나
# ★[SETS_OWN_STATE] ⑧ 은 ⑦ 이 남긴 상태를 물려받지 않는다 — ⑦ 이 문장을 한 번 더 눌러 고르기를 푼다.
#   처음 짤 때 그걸 몰라 **깨끗한 나무에서도 붉었고** 돌연변이 셋도 똑같이 1 이라 「다 잡았다」로 읽을 뻔했다.
#   게다가 ⑦ 은 브라우저가 재생을 막으면 누르지 않고 빠져나가 판마다 상태가 달라진다(★11-b).
chk 'SETS_OWN_STATE' scripts/check-listen-export.mjs 1
# ★[BLANK_SHOWS_TRUTH 2026-08-11 실측] 글칸을 비우면 대본엔 원문이 그대로 나간다(빈 값=안 고침).
#   지운 사람은 「이 문장은 빠지겠지」로 읽는다 — 칸을 떠날 때 원문을 되돌려 보이는 것이 나갈 것이게 한다.
#   ★input 이 아니라 focusout 에서 되돌린다 — 지우고 다시 쓰는 중에 되채우면 사람과 싸운다.
chk 'BLANK_SHOWS_TRUTH' audio-review.html 1
chk 'focusout' audio-review.html 1
chk 'c.sents' audio-review.html 3
chk '고른 문장만' audio-review.html 1
chk '_recorded.json' audio-review.html 2                # 목록을 베끼지 않고 원천을 읽는 배선
chk '안 들은 것을 통과로 세지 않는다' audio-review.html 1   # 진행률의 뜻
nochk 'const CLIPS = \[{' audio-review.html             # ★목록을 파일에 박아 넣지 말 것
# ── [EXPORT_TRUTH · LISTEN_EXPORT_REAL] 내보낸 대본이 진짜 규격을 통과하는가 ──
# ★규칙 둘은 실물(5_배역.txt)에서 옮겨 온 것이다. 지우면 첫 판의 사고가 그대로 돌아온다.
#   ① role 에 `|` 가 있으면 문장마다 번갈아 읽는다  ② 합성 클립(mix)은 대본에서 뺀다
# ★뺀 것을 **조용히** 빼지 않는다 — 상자 밖(#skipNote)에 띄운다. 상자 안에 적으면 그것도 읽힌다.
chk 'EXPORT_TRUTH' audio-review.html 3
chk 'PASTE_NO_COMMENT' audio-review.html 2
chk 'showSkip' audio-review.html 2                      # 값만 세팅하고 안 띄우던 판이 실제로 있었다
chk 'LISTEN_EXPORT_REAL' scripts/check-listen-export.mjs 1
chk 'check-paste-format' scripts/check-listen-export.mjs 2   # 규격을 두 벌로 만들지 않는다
chk 'NO_INJECT' scripts/check-listen-export.mjs 1       # 상태 주입 대신 실제로 단추를 누른다
nochk 'const line = /' scripts/check-listen-export.mjs  # ★붙여넣기 규격을 여기서 다시 정의하지 말 것
# ── [NOTE_TABLE 2026-08-11] 야간 잡의 note() 는 표와 요약을 **동시에** 정한다 ──
# 둘이 어긋나면 표엔 ✗ 인데 요약은 「전부 통과」가 된다(EXIT_TRAP · GUARD_FAIL_VAR 와 같은 병).
# 실제로 어긋나 있었다 — 127·124·137·139 는 붉게 적히고도 worst 를 안 올렸다.
chk 'NOTE_TABLE' .github/workflows/nightly-screen.yml 1
chk 'NOTE_TABLE' automation/tests/nightly-note-table.sh 1
chk '제 결론에 닿지 못' .github/workflows/nightly-screen.yml 1   # 죽은 검사 라벨 — 「못 잼」과 구분
chk 'yml 에서' automation/tests/nightly-note-table.sh 2          # ★함수를 베끼지 말고 떼어 올 것
# ★[SLICE_ONLY_FN 2026-08-11] 이 nochk 의 겨냥을 좁혔다 — 뜻은 그대로, 자만 정확해졌다.
#   원래 뜻: 「note() 를 이 파일에 **베껴 두지 말 것**」(사본은 갈라지고, 갈라진 쪽이 초록을 낸다).
#   그런데 `note() {` 를 통짜로 금지하면 **그 함수를 찾는 앵커**까지 막힌다 —
#   yml 에서 떼어 오려면 `note() {` 라는 글자를 어딘가에는 적어야 한다(sed·awk 패턴·설명 주석).
#   실제로 막혔다: 앵커를 그 글자로 바꾸자 REVERT? 5>0 으로 게이트가 붉어졌다.
#   ★그때 코드를 비틀어 초록을 만들지 않았다(앵커 이름 바꾸기 = 검사 맞추려고 코드 고치기).
#     대신 「사본」의 정의를 정확히 적는다 — 진짜 사본은 **줄머리에 선 함수 정의**다.
#     실측: 지금 파일의 5건은 전부 주석·패턴 안이고 줄머리 정의는 0건.
nochk '^note() {' automation/tests/nightly-note-table.sh         # ★사본(줄머리 함수 정의)을 두면 갈라진다
chk 'SLICE_ONLY_FN' automation/tests/nightly-note-table.sh 1     # 떼어 온 것이 함수 하나인지 확인하는 자리
chk '실행 명령이 섞였' automation/tests/nightly-note-table.sh 1   # 범위가 넘치면 붉게 — 조용히 돌리지 않는다
# ★그물 둘은 성격이 다르다. 위(명령)는 **목록**이라 새 명령이 생기면 샌다.
#   아래(닫힘)는 목록이 없어 일반적이다 — 함수를 파일 끝으로 옮겨 넘친 범위에 명령이
#   하나도 없게 만든 판에서 이것만 홀로 섰다(코워크 실측 · exit 1).
#   ★둘 다 쏴 봤다. 안 쏜 화살은 게이트에 명중으로 보인다(11-c) — 두 번째 그물에도 같다.
chk '} 로 안 끝납니다' automation/tests/nightly-note-table.sh 1   # 닫힘 그물 — 목록이 없어 일반적이다
chk '15. 「그 문자열이 있나」' docs/검사가_속인_방식_목록.md 1     # ★15 — 존재 확인은 범위 확인이 아니다
chk 'SLICE_ONLY_FN' docs/검사가_속인_방식_목록.md 1
chk '15-b' docs/검사가_속인_방식_목록.md 1                        # 긴 이름이 옛 마커의 낱말을 삼킨다
chk 'MARKER_TAUTOLOGY' docs/검사가_속인_방식_목록.md 1
# ★[15-c · 15-d 2026-08-12] 같은 병이 이틀 사이 세 번 났다(#443 · #444 · SLICE_DEPTH_NET).
#   15-c = 앵커에서 훑는 그물은 범위를 닫기 전엔 파일 전체를 본다(넘쳐 초록 / 넘쳐 헛붉음 · 증상이 정반대다).
#   15-d = 조각을 **자른 기준으로** 그 조각을 검사하면 언제나 통과한다.
#          ★15 의 고침 셋 3번이 그대로 옮겨져 죽은 그물이 됐다 — 자르는 방법이 달라서다.
#          ★그물이 여럿이면 **하나씩 꺼 봐야** 어느 것이 잡았는지 안다.
chk '15-c' docs/검사가_속인_방식_목록.md 1
chk '15-d' docs/검사가_속인_방식_목록.md 2       # 항목 제목 + ★15 본문에서 되짚는 자리
chk '앵커에서 훑는' docs/검사가_속인_방식_목록.md 2
chk '자른 기준으로' docs/검사가_속인_방식_목록.md 2
chk 'SLICE_DEPTH_NET' docs/검사가_속인_방식_목록.md 2
chk 'EXIT_SCAN_BOUNDED' docs/검사가_속인_방식_목록.md 2
# ★[15-e 2026-08-12] 15-d 의 깊이 그물도 몇 시간 뒤 뚫렸다 — 「목록이 없다」와 「가정이 없다」는 다르다.
#   남의 덩이 **머리를 더 깊게** 쓰면 그물 셋이 전부 지나가고 eval 이 남의 코드를 실행한다(실측).
#   → 네 번째 들여쓰기 그물을 만들지 않고 **괄호를 맞춘다.** 들여쓰기는 모양이고 범위는 문법이다.
#   ★15-d 본문에 「이 고침도 오래 못 갔다」를 붙여 뒀다 — 거기까지만 읽고 깊이 그물을 옮겨 심지 않게.
chk '15-e' docs/검사가_속인_방식_목록.md 2         # 항목 제목 + 15-d 에서 가리키는 자리
chk 'SLICE_PAREN_MATCH' docs/검사가_속인_방식_목록.md 2
chk '이 고침도 오래 못 갔다' docs/검사가_속인_방식_목록.md 1
chk '들여쓰기는 글의 모양이고 범위는 문법이다' docs/검사가_속인_방식_목록.md 1
# ── [DOC_SELF_COUNT 2026-08-11] 「적지 말 것」을 사람이 아니라 기계가 지킨다 ──
# COUNT_ROTS 로 제목의 개수는 뺐지만, 「다시 적지 말 것」은 문서 안 당부 한 줄로 남아 있었다.
# 이 저장소는 사람이 기억해야 하는 구조를 안 남기기로 했다 → check-source-drift 가 머리말을 본다.
# ★머리(첫 ## 앞)만 본다. 본문의 「실사고 셋」·「돌연변이 여덟 발」은 국소 수치라 늙지 않는다.
# ★HTML 주석은 벗기고 본다 — 사고 경위 주석에 옛 문구(「열두 줄」)가 그대로 있다.
#   안 벗기면 경위를 적었다는 이유로 붉어진다(주석이 검사를 대신 맞는 병).
chk 'DOC_SELF_COUNT' scripts/check-source-drift.mjs 1
# ── [HEAD_BOUNDED · NET_SAYS_GAPS 2026-08-11 · 코워크 적대검증] ──
# ①머리를 못 정하면 「전부 본다」가 아니라 「못 정한다」고 붉게 선다.
#   `## ` 를 전부 `# ` 로 바꿔 재니 본문의 멀쩡한 수 아홉 개가 붉었다(3건·한 줄·100개…).
#   넓게 보는 것은 안전하지 않다 — 좁힘이 이 검사의 값이고, 사라지면 늑대를 아홉 번 부른다(★9).
# ②초록일 때 **안 본 것을 말한다.** 세는 이름 없는 수(「지금까지 열일곱」)는 못 잡는다.
#   말하지 않으면 사람이 초록을 커버리지로 읽는다(★4) — 이 검사가 지키는 문서가 그 목록이다.
chk 'HEAD_BOUNDED' scripts/check-source-drift.mjs 1
# ★[14-b] 「잰 범위보다 넓게 말하지 않는다」 — 새 번호를 만들지 않고 ★14 본문에 붙였다.
#   COUNT_ROTS 의 취지 그대로다(늘 것을 하나 줄인다). 항목 수를 늘리면 목차도 같이 늙는다.
chk '14-b' docs/검사가_속인_방식_목록.md 1
chk '실행했다는 사실이 범위를 넓혀' docs/검사가_속인_방식_목록.md 1
chk 'NET_SAYS_GAPS' scripts/check-source-drift.mjs 1
chk '안 보는 것' scripts/check-source-drift.mjs 1        # ★초록 줄의 고지 — 지우면 초록이 커버리지로 읽힌다
chk '항목 번호 범위' scripts/check-source-drift.mjs 1     # ★1~★15 꼴 (말뜻 없이 잡히는 유일한 무단위)
# ★[STOP_HERE 2026-08-11 · 두 세션 합의] 이 검사는 여기서 멈춘다 — 더 조이지 말 것.
#   멈추는 기준을 코드 옆에 적어 뒀다: **막는 결함의 값 < 헛붉음이 치를 값**이면 멈춘다.
#   여기 결함은 「머리말 문장 하나가 낡음」(작다) · 헛붉음은 「사람이 붉은색을 무시함」(번진다 · ★9).
#   다시 조이려면 먼저 **진짜 rot 가 그 구멍으로 샌 실사고**를 하나 들 것.
chk 'STOP_HERE' scripts/check-source-drift.mjs 1
# ★[COUNT_NET_OPEN 2026-08-11] '스스로를 세' 2 → 1 로 내렸다. 느슨해진 것이 아니라 **문구가 바뀌었다.**
#   붉은 쪽 문장이 「머리말이 스스로를 세고 있다」 → 「머리말에 "수 + 세는 이름"이 있다」가 됐다.
#   이 그물은 꼴만 보지 그 수가 목록을 센 것인지는 모르기 때문이다(헛붉음 실측 2건).
#   초록 쪽 문장(「스스로를 세지 않는다」)은 그대로라 1 이 맞다.
#   ★대신 더 값나가는 것을 건다 — 붉을 때 **두 갈래를 다 말하는가**(SAY_BOTH).
#     한 갈래만 말하면 멀쩡한 글에 틀린 지시가 나가고, 몇 번 반복되면 사람이 붉은색을 무시한다(★9).
chk '스스로를 세' scripts/check-source-drift.mjs 1
chk 'SAY_BOTH' scripts/check-source-drift.mjs 1
chk '둘 중 하나다' scripts/check-source-drift.mjs 1
chk 'COUNT_NET_OPEN' scripts/check-source-drift.mjs 1              # 목록형 그물을 일반 그물로 바꾼 자리
nochk "'열하나', '열한'" scripts/check-source-drift.mjs            # ★수사 목록으로 되돌아가지 말 것
chk '개수나 마감 날짜를 다시 적지 말 것' docs/검사가_속인_방식_목록.md 1
# ★[COUNT_ROTS 2026-08-11] 이 문서가 말하는 병을 이 문서의 첫 두 줄이 앓고 있었다.
#   제목은 「열두 줄」인데 항목은 열일곱(1~15 + 11-b·11-c) · 머리말은 「08-09~10 이틀」인데
#   08-08 과 08-11 사고가 들어와 있었다. 적어 둔 것과 실제가 갈렸고 아무도 세어 보지 않았다(11-b).
#   ★고침은 「17 로 고치기」가 아니다 — 그러면 다음 항목에서 또 낡는다.
#     세지 않아도 참인 문장으로 바꿨다. 늙는 사본을 만들지 않는 것이 늙은 사본을 고치는 것보다 낫다.
chk 'COUNT_ROTS' docs/검사가_속인_방식_목록.md 1
nochk '^# 검사가 우리를 속인 방식 — ' docs/검사가_속인_방식_목록.md   # 제목에 개수를 다시 달지 말 것
chk 'PROBE_RULER' scripts/audit/page-probe.mjs 1
chk '여섯 번' scripts/audit/page-probe.mjs 1              # 왜 생겼는지가 지워지면 다시 흩어진다
chk 'serverRooted' scripts/audit/page-probe.mjs 2         # 404 를 결함으로 읽지 않게 하는 문지기
chk 'SKIP' scripts/audit/page-probe.mjs 2                 # script/style 을 화면 글로 세지 않는다
# [TUNNEL_UNSEEN 2026-08-11] 바깥에 못 닿은 것을 '페이지 오류'로 세지 않는다 — 그 자의 일곱 번째 꼴.
# 실사고: index.html 을 이 자로 재니 exit 1. 원인은 프록시가 막은 googletagmanager 한 줄이었다.
# 목록에 주소(fonts.googleapis)는 있었는데 콘솔 문구엔 주소가 없고 오류 이름만 있어 안 걸렸다.
# 적대 검증: 진짜 오류(null.x())를 심은 쪽은 그대로 exit 1 · 프록시 줄만 unseen 으로 빠져 exit 0.
chk 'TUNNEL_UNSEEN' scripts/audit/page-probe.mjs 1
# ★[TUNNEL_UNSEEN 여덟 번째 꼴 · 2026-08-12] ERR_CERT_AUTHORITY_INVALID 도 '못 받음'으로 옮긴다.
#   실사고: check-ord-autosave 첫 판이 그 한 줄로 exit 1(뒤이어 세 판 rc=0 — 지나가는 것이다).
#   프록시가 자기 인증서로 가로챌 때 나는 줄이라 재는 쪽 사정이다. 야간 잡이 매일 도는데
#   이런 줄로 하루 걸러 붉으면 그 검사는 늑대가 된다(★9). 고칠 자리는 각 검사가 아니라 공용 자다.
chk 'ERR_CERT_' scripts/audit/page-probe.mjs 2
# ★[API_501_LOCAL 2026-08-13 점검] 로컬 하네스엔 Vercel 함수(/api/*)가 없다 — python http.server 가
#   POST 에 501 을 돌려주고, 화면은 이미 우아하게 받는다(실측: 친절한 대체 문구·pageerror 0).
#   response·console 두 채널 모두 unseen 으로 옮긴다(삼키지 않음) — 한 채널만 고치면 남은 귀가 또 붉힌다(실측).
chk 'API_501_LOCAL' scripts/audit/page-probe.mjs 2
chk 'ERR_TUNNEL_CONNECTION_FAILED' scripts/audit/page-probe.mjs 2
# ── [OPT_AT_MOVE · NO_AIM_IS_FAIL 2026-08-11] 겨냥을 잃은 돌연변이가 사흘간 조용했다 ──
# 「밸리만 자리 옮기기」가 08-08 부터 skip. skip 은 fail 로 안 세어져 감사는 계속 exit 0 이었다.
# 원인 둘 — 겨냥 형식이 낡았고(작은따옴표 seq → JSON 예쁜 판), 대상이 이사했다(valley: seq → opt).
#   실측: 옛 겨냥 적중 0건 / 새 겨냥(opt 의 at:) 적중 9건. 형식만 고쳤으면 여전히 0건이었다.
# 이제 겨냥을 못 찾으면 붉게 선다. 적대: opt 의 at: 을 전부 없애니 FAIL + exit 1(옛 판은 0).
chk 'OPT_AT_MOVE' scripts/audit/ritual-order-sim-audit.mjs 1
chk 'NO_AIM_IS_FAIL' scripts/audit/ritual-order-sim-audit.mjs 1
nochk "skip \${label}" scripts/audit/ritual-order-sim-audit.mjs   # 안 쏜 화살을 조용히 넘기던 옛 길
chk '11-b' docs/검사가_속인_방식_목록.md 1               # 정착 전에 잰 값은 값이 아니다
chk '11-c' docs/검사가_속인_방식_목록.md 1               # 안 쏜 화살은 게이트에 명중으로 보인다
chk 'EST_ONE_NUMBER' console.html 1                     # 인트로가 minLabel 을 쓰는 근거 주석
chk 'minLabel' console.html 2                           # 디렉터 패널 '기준' + 고객 인트로 '실제 예식'
chk 'EST_ONE_NUMBER' scripts/check-est-one.mjs 2        # 검사 자신이 왜 생겼는지
chk 'CANT_LOOK' scripts/check-est-one.mjs 1             # 못 잰 것은 2 로 갈라 낸다
# [EST_ALL_COURSES] 코스 목록을 리터럴로 박지 않는다 — 화면에서 읽는다.
# 박아 두면 ritual-data 에 코스가 늘어도 검사는 모르고 '전부 통과'라고 말한다(안 본 것을 통과라 부름).
# 적대 검증: order-preview 의 COURSES 에 7번째를 넣으니 목록에 나타나 exit 1. 리터럴 판은 건너뛰었다.
chk 'EST_ALL_COURSES' scripts/check-est-one.mjs 2       # 왜 목록을 화면에서 읽나 + 읽는 자리
nochk "COURSES = \['damback'" scripts/check-est-one.mjs # 리터럴 목록이 되살아나면 잡는다
# ── [ORD_SIM_RULER 2026-08-10] 순서 시뮬레이터의 자를 고친 셋 ──
# ① PAREN_TOO — 두 번째 토크나이저도 괄호 깊이를 센다. 안 그러면 new Proxy({},{…}) 에서 66자 일찍 멈춰
#    「끝 지점이 다르다」로 붉게 운다. 틀린 쪽이 시뮬레이터가 아니라 자였다.
# ② OFF_CHOKE — 축2 점검을 '18개 호출 자리'가 아니라 '길목 한 곳(curSeq→momOn)'으로 옮겼다.
#    옛 판의 전제(inSeq 는 축1만 본다)는 [ALL_OPTIONAL] 이후 거짓 · 되살리면 멀쩡한 3줄을 결함이라 부른다.
# ③ FIXPOS_MISSING — ordNow 의 [ORD_FIXPOS] 가지가 읽는 FIXPOS 가 DECLS 에 없었다.
#    S.ord 가 배열일 때만 도는 가지라 3104조합(전부 ord:null)이 한 번도 안 밟았다 — '자유변수 0' 이 거짓이었다.
chk 'PAREN_TOO' scripts/audit/ritual-order-sim-audit.mjs 1
chk 'OFF_CHOKE' scripts/audit/ritual-order-sim-audit.mjs 1
chk 'FIXPOS_MISSING' scripts/audit/ritual-order-sim.mjs 1
chk "var FIXPOS={" scripts/audit/ritual-order-sim.mjs 1  # DECLS 에서 다시 빠지면 잡는다
nochk "s.needle === 'var OFFTGL={'" scripts/audit/ritual-order-sim-audit.mjs  # 낡은 리터럴 needle 부활 차단
chk 'TAP_HITTEST' scripts/check-tap-targets.mjs 1
chk '이미 크다' scripts/check-tap-targets.mjs 1
# [CENTER_NO_MERCY] 한가운데 무관용 — 스침·조상 용서가 C 에도 적용되던 구멍을 적대 검증이 찾았다
#   (1.4px 실오라기 강탈·stretched-link ::after 덮개가 전부 초록이었다 · scripts/fixtures/tap-attack-*.html 로 재현)
chk 'CENTER_NO_MERCY' scripts/check-tap-targets.mjs 2
chk 'SPACING_24' scripts/check-tap-targets.mjs 1
chk 'CLIP_FOLD' scripts/check-tap-targets.mjs 1
# [RECORDED_TRUTH 배선] _recorded.json 은 조립기가 mp3 를 만드는 순간에만 갱신 — 배선이 사라지면 다음 재더빙 때 반대 방향 거짓말
chk 'RECORDED_TRUTH 2026-08-09 배선' scripts/assemble-narration.mjs 1
chk 'RECORDED_TRUTH cast 확장' scripts/check-text-audio.mjs 1

# ── [RECORDED_TRUTH] '녹음하기로 한 글' 과 '실제로 녹음된 글' 을 가른다 (2026-08-09) ──
# 구멍이었다: check-text-audio 가 오른쪽(소리)을 manifest.json 에서 읽는데, 문안을 고치면
# build-typecast-import 가 manifest 를 다시 쓰고 이 게이트가 그 생성기를 매번 돌린다.
# 그래서 양쪽이 **함께** 새 문안이 되고 검사는 늘 '맞음' 이라 말한다 — mp3 는 옛말인 채로.
#   실측: 축배 4클립을 다시 썼는데 어긋남 0 으로 통과했다. 당일 화면과 스피커가 달랐을 자리다.
# 이제 assets/audio/narration/_recorded.json 이 '실제로 녹음된 글' 이고, 거기 없으면 '소리 없음' 이다.
chk 'RECORDED_TRUTH' scripts/check-text-audio.mjs 1
chk '_recorded.json' scripts/check-text-audio.mjs 2
[ -f assets/audio/narration/_recorded.json ] || { echo 'REVERT? _recorded.json 이 없다 — 녹음된 글의 원천이다'; fail=1; }
# ── [TOAST_SCENE] 축배·케이크 장면 ──
chk 'TOAST_SCENE' assets/ritual-cue.js 2
chk 'TOAST_SCENE' order-preview.html 3
chk 'toast-both-b' assets/ritual-cue.js 2
chk 'narr-cake-out' assets/ritual-cue.js 2

# ── [MEASURE_FONTS] 측정 환경 폰트 (2026-08-09) ──
# 같은 도구인데 두 세션의 탭 판정 숫자가 달랐다. 원인은 판정 로직이 아니라 폰트였다 —
# 웹폰트 요청이 안 나가는 컨테이너에서 'Noto Serif KR' 이름이 로컬에 없어 DejaVu 로 떨어졌고,
# 한글 폭 2.6% 차이가 줄바꿈을 바꿔 요소 높이와 줄 간격을 바꿨다.
chk 'MEASURE_FONTS' scripts/check-tap-targets.mjs 1
chk 'Noto Serif CJK KR' scripts/measure-env-fonts.sh 2
[ -x scripts/measure-env-fonts.sh ] || { echo 'REVERT? measure-env-fonts.sh 실행권한이 없다'; fail=1; }

# ── [SWEEP_SETTLE] 탭 점검은 화면이 멎은 뒤에 잰다 (2026-08-09) ──
# 두 세션이 같은 쪽에서 '대상 42' 와 '대상 48' 을 봤다. 폰트도 원인이었지만(MEASURE_FONTS)
# 진짜는 이것 — 쓸기가 6개를 잠깐 드러냈다가 도로 감춘다(실측 곡선 늘 49→43).
# 고정 대기는 그 사이 어디서든 자를 수 있다. 시간이 아니라 상태를 기다린다.
# 20초를 기다려도 안 멎으면 재지 않고 실패로 센다 — 움직이는 화면에서 뽑은 숫자는 증거가 아니다.
chk 'SWEEP_SETTLE' scripts/check-tap-targets.mjs 1
chk '재지 않았습니다' scripts/check-tap-targets.mjs 1

# ── [EXIT_FEEDBACK][EXIT_TAP44][GUEST_LIGHT][AI_TIP MINIMAL] (2026-08-09) ──
# 저장 후 나가기: 버튼 110×31(44 미달) + 첫 탭이 들어가도 화면이 아무 말을 안 했다.
# 빗나간 탭과 들어간 탭이 똑같아 보이던 것이 '반응을 안 한다'의 정체다. 라벨로 답하게 하고,
# 부모가 8초간 답이 없으면 스스로 잠금을 푼다(예전엔 부모 메시지가 유일한 해제 경로였다).
chk 'EXIT_FEEDBACK' order-preview.html 1
chk 'EXIT_TAP44' order-preview.html 1
chk '저장 중…' order-preview.html 2
# 미리듣기는 고객 화면인데 디렉터 콘솔의 어두운 피부를 그대로 입고 있었다. .guest 에서만 갈아입힌다.
# ★디렉터 화면(embed 없음)은 어두워야 한다 — 예식장에서 화면 빛이 하객 쪽으로 새면 안 된다.
chk 'GUEST_LIGHT' console.html 1
chk 'GUEST_MIN' console.html 1                       # 고객 미리듣기 미니멀(2026-08-09) · 짙은 색은 '다음으로' 버튼 하나
chk 'GUEST_CTL_EMPTY' scripts/check-guest-skin.mjs 2
chk 'HERO_NO_HAIR' index.html 3                      # 히어로 구분선 폐지(2026-08-10 사용자 지시) · 되살리지 말 것
chk 'REASON_SAYS' scripts/check-hero-lockup.mjs 1    # 근거는 길이가 아니라 '값을 말하는가'로 본다(2026-08-10 적대검증)
chk 'REASON_GAP' scripts/check-hero-lockup.mjs 2     # 그 값이 글자 크기가 아니라 **간격값**이어야 한다(2026-08-10 적대검증)
chk 'LOCKUP_SAID' scripts/check-hero-lockup.mjs 1     # 적어 둔 숫자↔실제 값 대조 검사 · 지우지 말 것
chk 'HERO_LOCKUP_RATIO' index.html 2                 # 자물쇠 사이 = 워드마크 대문자 높이의 0.60배(폰 13 · PC 21) · px 만 고치지 말 것
chk 'GUEST_PREV' console.html 3                      # 고객 미리듣기 '이전 순서'(2026-08-10 사용자 지시)
chk 'gPrev' scripts/check-guest-skin.mjs 2           # 조작부 허용 명단(OK)에 이름으로 올라 있어야 한다
chk 'OK_SUBTREE' scripts/check-guest-skin.mjs 1      # 허용된 이름은 자기 자신만 면제 — 그 안에 숨은 조작기는 잡는다
chk 'BUSY_ONE_PLACE' mypage.html 3                   # 대기 표시 = 하나·한 자리·한 낱말(2026-08-09)
chk 'color-scheme:light' console.html 1

# ── [TWO_COUNTS] 두 숫자에 다른 이름 (2026-08-09 · 코드 세션 제안) ──
# 정착 루프가 세는 수(화면에 보이는 타깃 전부)와 출력의 수(면제 뺀 것)가 둘 다 '대상'이었다.
# 두 세션이 42 대 43 을 '어긋남'으로 읽고 원인을 찾아 들어갔는데 실은 같은 것이었다(차이 = 인라인 면제 1).
chk 'TWO_COUNTS' scripts/check-tap-targets.mjs 1
# [TAP_UNSEEN 2026-08-10] '전부 통과'가 '전부 쟀다'로 읽히던 것을 막는 줄. 지우지 말 것.
#   mypage 는 화면에 7·잰 것 7·✓전부 통과였는데 그 7 이 **로그인 폼**이었다.
#   로그인 뒤 제작 카드·좌석 캔버스·위저드·음료 시트는 한 번도 재지 않았다.
#   실측 2026-08-10: index 못 잰 것 34+ · mypage 9+(잰 것보다 많다).
#   ★실패로 세지 않는다 — 접힌 아코디언·닫힌 모달은 정당히 숨어 있다. 초록은 그대로다.
# [RAIL_OVERLAP_OK 2026-08-10] 고정 아이콘 레일이 본문 위에 겹치는 것은 **의도된 것**이라는
#   사용자 확인("계획된거야")과 그 실측(89줄)이 advisor-widget.js 에 적혀 있다. 지우지 말 것 —
#   지우면 다음 세션이 같은 측정을 하고 같은 제안을 다시 들고 온다(이미 두 세션이 그랬다).
chk 'RAIL_OVERLAP_OK' assets/advisor-widget.js 1
chk '계획된거야' assets/advisor-widget.js 1
# [CANT_LOOK 2026-08-10 코워크 제안 · 코드 세션 구현] 못 잰 것(2)과 재서 틀린 것(1)을 종료 코드로 가른다.
#   코워크가 서버 없이 tap-targets 를 돌려 '✗ 겹침·작다 1건'을 보고 없는 결함을 고칠 뻔했다.
#   실측 확인 — 통과 0 · 진짜 결함 1 · 서버 없음 2. 둘 다 0 이 아니라 게이트는 여전히 막는다.
#   ★[NO_GATE] 다만 **이 게이트는 그 두 검사를 실행하지 않는다** — 여기서는 마커만 센다.
#     내가 앞 커밋에 "2 도 0 이 아니라 게이트가 그대로 막는다"고 적은 것은 틀렸다.
#     막는 힘이 안 줄어든 건 맞지만 **원래 0 이라서** 참이었다(코워크 지적 · 실측으로 확인).
#     둘 다 브라우저·로컬 서버가 필요해 CI 에 넣으면 느리고 잘 운다 — 손검사로 두는 것이 판단이다.
#     대신 그 사실을 두 파일 머리에 적었다. 없는 방벽을 근거로 안심하지 않기 위해서다.
chk 'NO_GATE' scripts/check-tap-targets.mjs 1
chk 'NO_GATE' scripts/check-guest-skin.mjs 1
chk 'CANT_LOOK' scripts/check-tap-targets.mjs 2
chk 'CANT_LOOK' scripts/check-guest-skin.mjs 1
chk 'TAP_UNSEEN' scripts/check-tap-targets.mjs 2
chk '못 잰 것' scripts/check-tap-targets.mjs 3
chk '보이는 데까지 봤다' scripts/check-tap-targets.mjs 1
chk '화면에 ' scripts/check-tap-targets.mjs 1

# ── [OPEN_PALETTE] 자유 한 칸을 전 코스에서 (2026-08-09 사용자 결정 "전코스개방") ──
# 엔진 GADD 엔 처음부터 free 가 있었는데 빌더에만 없어, record 코스 말고는 도달할 길이 없었다.
# 축가 폐지(SONG_RETIRED)의 이주로가 이 칸이라 막혀 있으면 '옮기는 것이다'가 거짓말이 된다.
# ★팔레트 카드는 TUNE 에 문안이 있어야 그려진다 — GADD 만 열면 아무 일도 안 난다(조용히 건너뜀).
chk 'OPEN_PALETTE' order-preview.html 2
chk 'free:1' order-preview.html 1
chk 'free:{n:' order-preview.html 1
chk 'free:{ph:' order-preview.html 1
chk "free:{k:'free'" order-preview.html 1

# ── [STALE_DONE] 서버의 '완료'를 이 기기의 기억보다 앞세우지 않는다 (2026-08-09) ──
# 재현: 완료 → 처음부터 다시 → 중간에 저장 후 나가기 → 다시 들어가면 완성 화면으로 열린다.
# 빌더·마이페이지는 done:false 를 제대로 보내는데 서버 기록이 안 내려온다(GAS 안이라 여기선 못 본다).
# 이 기기가 마지막으로 남긴 기록이 '중간 저장'이면 위치와 완료 표시는 그쪽을 믿는다(내용 S 는 서버 것).
chk 'STALE_DONE' order-preview.html 1
chk '_localMid' order-preview.html 2

# ── [DONE_UNDO] 완료 표시가 영영 안 내려가던 한 줄 (2026-08-09) ──
# `else if (d.tracks[track] !== '완료')` 때문에 한 번 완료가 되면 비우기(done:false)도 무시됐다.
# → 마이페이지 식순 행이 계속 ✓ · 다시 들어가면 빌더가 완성 화면으로 열림(사용자 재현).
# 아무 done:false 나 받아 주지는 않는다 — **빈 초안일 때만** 내린다(빈 채로 완료인 상태는 옳지 않다).
chk 'DONE_UNDO' automation/platform/80_production.gs 1
chk '_emptyDraft' automation/platform/80_production.gs 2

# ── [RECORDED_1TO1] 녹음 기록이 폴더와 1:1인지 (2026-08-09 · 코드 세션 지적) ──
# narration/_recorded.json 에 파일 없는 항목 23개(배역 클립)가 섞여 있었다 — 내가 씨앗을 뜰 때
# 폴더를 안 가리고 넣었다. text-audio 는 통과했다(유령은 조회되지 않아 조용했다).
# 이 기록은 '소리 쪽 진실'로 쓰이므로, 유령도 기록 없는 mp3 도 없어야 한다. 양방향으로 본다.
chk 'RECORDED_TRUTH' scripts/check-recorded.mjs 1
chk '유령' scripts/check-recorded.mjs 2
if command -v node >/dev/null 2>&1; then node scripts/check-recorded.mjs >/dev/null \
  || { echo 'FAIL recorded: 녹음 기록과 mp3 가 1:1 이 아닙니다 — node scripts/check-recorded.mjs'; fail=1; }; fi

# ── [DONE_UNDO_TRACKS] '닿는 트랙' 목록을 사람이 지키지 않게 한다 (2026-08-09 · 코드 세션) ──
# 이 목록을 두 번 틀렸다. 1차 "전 트랙에 적용" · 2차 "guideinfo 도 닿는다" — 두 번 다 코드는
# 멀쩡했고 설명만 틀렸다. 그런데 다음 사람은 코드가 아니라 설명을 읽는다.
# 판정식을 파일에서 그대로 떼어 트랙별로 통과시킨 뒤, 주석의 두 목록과 대조한다.
chk 'DONE_UNDO_TRACKS' scripts/check-done-undo-tracks.mjs 1
chk '닿는다   :' automation/platform/80_production.gs 1
if command -v node >/dev/null 2>&1; then node scripts/check-done-undo-tracks.mjs >/dev/null \
  || { echo 'FAIL done-undo-tracks: 주석의 닿는 트랙 목록이 실제와 다릅니다 — node scripts/check-done-undo-tracks.mjs'; fail=1; }; fi
# ── [FAQ_DODGE] FAQ 칩 줄에서만 레일이 비켜난다 (2026-08-09 사용자 승인 ②) ──
# 칩 줄 오른끝 354px 과 FAB 왼끝 350px 이 4px 물려 44px 창의 오른쪽을 먹고 있었다.
# ★레일 자체는 안 건드린다(위치·크기·모양 변경 금지 2026-07-26) — 그 자리에서 잠시 물러날 뿐이다.
# ★`hide` 를 재사용하지 않는다 — 상담 패널 개폐용이라 같이 쓰면 서로 켜고 끈다.
chk 'FAQ_DODGE' index.html 2
chk 'faq-dodge' index.html 2
nochk "classList.toggle('hide'" index.html

# ── [SETTLE_LIMIT] 정착은 '개수'만 지킨다 — 좌표는 계속 움직인다 (2026-08-09) ──
# SWEEP_SETTLE 로 수가 멎은 뒤에도 body 높이가 22536→21384 로 줄었다. scrollIntoView 로 올려 둔
# 요소가 곧 화면 위로 596px 밀려나, 두 세션이 FAQ_DODGE 검증에서 연달아 "안 비켜난다"고 헛짚었다.
# 위치에 의존하는 시험은 좌표를 수렴시켜야 한다는 것을 파일 안에 남긴다.
chk 'SETTLE_LIMIT' scripts/check-tap-targets.mjs 1
chk '좌표를 수렴' scripts/check-tap-targets.mjs 1
# ── [COURSE_MIRROR] 빌더의 COURSES 사본이 원천과 같은지 (2026-08-09) ──
# 파일 주석은 "다시 뽑아 넣는다"고 하는데 뽑는 도구가 없었다. 그래서 원천만 고치고 사본은
# 그대로인 일이 실제로 났다 — 약속 코스에 축배를 넣었는데 빌더 단계에 안 생겼다(렌더해 보고 알았다).
# 검사만 있고 도구가 없으면 사람은 결국 손으로 옮겨 적는다. 도구와 검사를 함께 둔다.
chk 'COURSE_MIRROR' scripts/build-course-mirror.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/build-course-mirror.mjs >/dev/null \
  || { echo 'FAIL course-mirror: 빌더 COURSES 사본이 원천과 갈렸습니다 — node scripts/build-course-mirror.mjs --write'; fail=1; }; fi

# ── [NOAUDIO_REAL] '소리 없는 클립'을 대장이 아니라 파일로 판정 (2026-08-09) ──
# 옛 판은 manifest 에 없으면 소리도 없다고 봤다. 그런데 대장은 생성기가 다시 쓰고 이 게이트가
# 그 생성기를 매번 돌린다 → 새 클립을 넣는 순간 '소리 있음'이 된다. 실제로 fx-count 가 그랬다
# (mp3 는 없는데 재더빙 명단 0클립). RECORDED_TRUTH 와 같은 병이 한 곳 더 남아 있었다.
chk 'NOAUDIO_REAL' scripts/check-text-audio.mjs 1
chk '파일이 없으면 없는 것이다' scripts/check-text-audio.mjs 1
# ── [PHOTO_COUNT] 단체촬영 셔터 신호 ──
chk 'PHOTO_COUNT' assets/ritual-data.js 1
chk 'fx-count' assets/ritual-cue.js 1

# ── [PASTE_VOICE] 붙여넣기 파일이 잘 돌아간 파일과 같은 꼴인지 (2026-08-09) ──
# 이 파일은 사용자가 타입캐스트에 그대로 붙인다. 한 줄만 달라도 그 줄이 소리로 읽히고,
# 화자 이름이 빠지면 목소리를 매번 손으로 골라야 한다 — 둘 다 실제로 겪게 만들었다.
# ★기준을 새로 정하지 않는다. 이미 잘 돌아간 3_진행_후반.txt 의 모양이 기준이다.
chk 'PASTE_VOICE' scripts/check-paste-format.mjs 1
chk 'PASTE_VOICE' scripts/check-text-audio.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/check-paste-format.mjs >/dev/null \
  || { echo 'FAIL paste: 붙여넣기 파일 형식이 다릅니다 — node scripts/check-paste-format.mjs'; fail=1; }; fi

# ── [PASTE_MISSING] 붙여넣기 파일이 '없으면 통과'를 막는다 (2026-08-09 · 적대 검증) ──
# check-paste-format 옛 판은 파일이 없으면 exit 0 이었다. 대기 명단이 「대기 1클립」이라고
# 말하는데도 게이트까지 전부 초록이 났고, 건너뛰기 메시지는 세지도 않고 '대기 0클립'이라 단정했다.
# RECORDED_TRUTH·NOAUDIO_REAL 과 같은 병이다 — '없으면 통과'는 늘 조용한 거짓말이 된다.
chk 'PASTE_MISSING' scripts/check-paste-format.mjs 1
chk '대기 수를 셀 수 없어' scripts/check-paste-format.mjs 1

# ── [PASTE_MAN_ORDER] 붙여넣기 **차례**가 조립기가 읽을 차례와 같은가 (2026-08-16 · 실사고) ──
# --redub 는 붙여넣기를 **클립 번호 오름차순**으로 뽑았는데, 조립기(assemble-narration)는
#   clipsOf(P) = man.clips.filter(...) — 즉 **대장 배열 차례**로 자리를 매긴다. 둘이 갈렸다:
#   6_예식뒤 에서 no=80(배열 54번째) 이 no=63(배열 68번째) 보다 앞이다. 붙여넣기는 63을 먼저 놨다.
# 실측 — 11문장 재더빙 wav 중 6개가 통째로 서로의 자리에 붙을 뻔했다(조립 r=0.578 로 멎어 살았다).
# ★상관계수가 살려 준 것이지 검사가 잡은 것이 아니다 — 길이가 엇비슷했으면 조용히 완성됐다.
#   그래서 ①뽑는 쪽을 대장 배열 차례로 맞추고 ②붙여넣기 파일의 차례를 검사로 못박는다.
chk 'PASTE_MAN_ORDER' scripts/check-text-audio.mjs 2
chk 'PASTE_MAN_ORDER' scripts/check-paste-format.mjs 2
chk 'IDX_OF' scripts/check-text-audio.mjs 3           # 대장 배열 차례를 쓰는 자리 — 클립 번호로 되돌아가지 않게
chk 'a.idx - b.idx' scripts/check-text-audio.mjs 1
chk 'PASTE_PART_SPLIT' scripts/check-text-audio.mjs 1  # 파트 경계를 사람이 손으로 가르지 않게
# 같은 병이 **두 곳**에 있었다 — 실청 페이지의 「다시 받을 것 대본」도 클립 번호 순으로 냈다.
# 화면은 예식 순서로 보는 것이 맞다. 그러나 **대본**은 조립기가 읽을 차례여야 한다 — 그래서 낼 때만 다시 세운다.
chk 'EXPORT_MAN_ORDER' audio-review.html 3
chk 'EXPORT_MAN_ORDER' scripts/build-listen-all.mjs 2
chk 'a.mi - b.mi' audio-review.html 1
chk 'a.mi - b.mi' scripts/build-listen-all.mjs 1
# ★틀린 옛 주석이 되살아나는 것을 막는다 — 그 말이 있으면 다음 사람이 그 말대로 다시 짠다.
#   패턴은 옛 문장 **앞부분**이다. 뒷부분("클립 번호 순서를 지킨다")은 새 주석이 인용으로 안고 있어
#   그것으로 세면 자기 자신에 걸린다(실측 — 1>0 으로 붉었다).
nochk '조립기가 정렬 순서로 자리를 매기므로' audio-review.html
# [CANT_PLACE] 대장에 없는 글은 「틀렸다」가 아니라 「못 쟀다」 — 붉히지 않되 화면에 적는다.
# 클립 통째 재녹음 대본은 _recorded.json(녹음된 글)에서 나오고, 그 글은 대장과 다를 수 있다.
chk 'CANT_PLACE' scripts/check-paste-format.mjs 2
chk '못 잰 줄' scripts/check-paste-format.mjs 2
# ── [ONE_CANDIDATE] 후보 파트가 하나면 상관계수로 거르지 않는다 (2026-08-09) ──
# 셔터 신호 2문장은 예상 길이가 서로 같아 기댓값 분산이 0 → 상관계수가 늘 0.85 미만.
# 파일도 파트도 맞는데 "파트를 못 찾았다"고 멎었다. 상관은 후보를 가리는 도구지 검증이 아니다.
# ★순서 검증(--force 로만 넘어감)은 그대로 남는다 — 그게 진짜 안전망이다.
chk 'ONE_CANDIDATE' scripts/assemble-narration.mjs 1
# ── [FLAT_AUTOSPLIT] 받은 zip 을 파트별 폴더로 «사람이» 가르지 않는다 (2026-08-16 사용자 지시) ──
# *"2폴더 나누는 법은 뭐야 너가 최대한 알아서해봐 어려운거 시키지말고"*
# 손으로 가르는 단계에 순서를 틀릴 자리가 있었고 실제로 틀렸다(PASTE_MAN_ORDER · r=0.578 이 겨우 막았다).
# 한 묶음의 개수가 고른 파트들의 **합**과 같으면 대장 배열 차례로 잘라 나눈다.
# ★자동으로 갈랐다고 검사를 건너뛰지 않는다 — 길이 상관 검증은 그대로 돈다.
chk 'FLAT_AUTOSPLIT' scripts/assemble-narration.mjs 3
chk '길이 상관 검증은 그대로 돕니다' scripts/assemble-narration.mjs 1
chk '후보가 둘 이상이면 종전대로' scripts/assemble-narration.mjs 1
# ── [CORR_NAN_SAY] 못 본 자리를 「r = NaN」으로 적지 않는다 (2026-08-16 · 코워크 요청 적대검증) ──
# 코워크: *"이것도 깨 봐 달라 — 합이 «우연히» 맞는 다른 조합이 있으면 조용히 엉뚱하게 갈린다."*
# 실제 조립기를 149번 돌려 재 봤다. 가른 «자리»는 튼튼했다(경계 한 칸 밀림 r 0.397·-0.204 → 멎음).
# 구멍은 **문장이 1개인 파트**였다 — n=1 이면 corr 이 0/0 → NaN, `NaN < 0.85` 는 false 라 무조건 통과.
# 6_예식뒤 의 1문장 클립 8개(54·68~74)는 서로 아무거나 바꿔치기해도 안 멎었다(잡음과 무관·산수).
# ★막지 않는다 — 74_fx-clap 한 자리만 다시 받는 일은 정당하다. 대신 «검사하지 않았다»고 적는다.
#   그래야 사람이 그 자리만 귀로 확인한다. 문턱(0.85)은 건드리지 않았다.
chk 'CORR_NAN_SAY' scripts/assemble-narration.mjs 3
chk '못 봤습니다' scripts/assemble-narration.mjs 1
chk '못 잼' scripts/assemble-narration.mjs 1
chk 'CORR_NAN_SAY' scripts/check-corr-claim.mjs 5
# ★옛 판(못 본 것을 잰 것처럼 찍던 줄)이 되살아나면 잡는다 — 이름이 아니라 **줄의 모양**을 본다
nochk "r = \${r.toFixed(3)}\${r < 0.85 ? '   ✗' : ''}" scripts/assemble-narration.mjs

# ── [CORR_CLAIM] 조립기 '길이 상관' 주석이 실제 계산과 맞는지 (2026-08-09 · 적대 검증) ──
# ONE_CANDIDATE 완화의 근거로 "예상 길이가 같아 분산 0 · 상관계수 미정의"라 적혀 있었는데
# 둘 다 사실이 아니었다: estSec 1.000/0.800 로 분산 0 이 아니고, NaN < 0.85 는 false 라
# 미정의여도 안 막힌다. 진짜 이유는 n=2 라서 피어슨 상관이 늘 ±1 이 되는 것이다.
# DONE_UNDO 주석과 같은 병 — 코드는 멀쩡한데 설명이 틀렸다. 설명을 계산으로 붙들어 둔다.
chk 'CORR_CLAIM' scripts/check-corr-claim.mjs 1
chk 'n=2' scripts/assemble-narration.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/check-corr-claim.mjs >/dev/null \
  || { echo 'FAIL corr-claim: 조립기 주석과 실제 계산이 어긋납니다 — node scripts/check-corr-claim.mjs'; fail=1; }; fi

# ── [NO_SILENT_SKIP] '없으면 통과' 를 뒤집는다 (2026-08-09 · 코드 세션이 세 번째로 짚은 병) ──
# 유령 기록(RECORDED_1TO1) · 대장을 믿던 판정(NOAUDIO_REAL) · 붙여넣기 파일 없음(PASTE_MISSING)
# 셋이 전부 같은 꼴이었다. 그래서 남은 두 곳도 뒤집었다:
#   check-css-tokens  — 목록에 적힌 쪽이 없으면 멈춘다(옮기거나 이름만 바꿔도 조용히 빠지던 자리)
#   check-source-drift — FACING 목록의 파일이 없으면 신고한다(없으면 hit 0 = '안 샜다'로 읽혔다)
# ★그리고 그 신고를 scan 이 채우는 값으로 하지 않는다 — 블록이 먼저 돌아 늘 초록이었다(실측).
chk 'NO_SILENT_SKIP' scripts/check-css-tokens.mjs 1
chk 'NO_SILENT_SKIP' scripts/check-source-drift.mjs 2
chk '순서에 기대는 검사는' scripts/check-source-drift.mjs 1
chk 'CORR_PERMISSIVE' scripts/assemble-narration.mjs 1
chk 'CORR_PERMISSIVE' scripts/check-corr-claim.mjs 1

# ── [EXIT_AT_END] 검사 파일의 종료코드는 맨 끝 한 곳에서만 정한다 (2026-08-09 · 적대 검증) ──
# check-corr-claim 은 중간에 `if (bad) process.exit(1)` 이 있었고, 그 **뒤에** 붙은 CORR_PERMISSIVE
# 블록이 실패해도 아무도 그걸 종료코드로 바꾸지 않았다 — 화면엔 ✗ 인데 'CORR_CLAIM OK' · exit 0(실측).
# merge-guard 의 GUARD_FAIL_VAR·GATE_AT_EXIT 과 같은 병이다. 붉어질 수 없는 실패는 실패가 아니다.
chk 'EXIT_AT_END' scripts/check-corr-claim.mjs 2
chk '붉어질 수 없는 실패는' scripts/check-corr-claim.mjs 1

# ── [EXIT_AT_END] 결론은 파일 맨 끝 한 곳에서만 (2026-08-09 · 코드 세션 처방을 내 검사에도) ──
# 중간 exit 뒤에 검사를 덧붙이면 그 블록이 종료코드에 못 닿는다 — 실제로 코워크가 붙인 블록이
# check-corr-claim 에서 그렇게 죽었다(화면엔 ✗ 인데 exit 0). GUARD_FAIL_VAR 와 같은 병이다.
# ★고칠 것은 붙인 자리가 아니라 **구조**다. 사람이 "여기 뒤엔 붙이면 안 된다"를 기억하게 두지 않는다.
chk 'EXIT_AT_END' scripts/check-paste-format.mjs 2
chk 'EXIT_AT_END' scripts/build-course-mirror.mjs 2

# ── [EXIT_TRAP] 마지막 결론 '뒤에' 붙은 실패도 붉게 (2026-08-09 · 적대 검증) ──
# EXIT_AT_END 로 중간 exit 은 없앴지만, 주석은 "어디에 무엇을 덧붙여도 결론에 닿는다"고 단정한다.
# 실측하니 맨 끝 줄 뒤에 no() 를 붙이면 ✗ 를 찍고도 exit 0 이었다 — 단정이 참이 아니었다.
# process.on('exit') 트랩으로 참이 되게 했다(merge-guard 의 GATE_AT_EXIT 과 같은 처방).
# ★build-course-mirror 는 마지막이 process.exit() 이라 뒤 코드가 아예 안 돌았다 → exitCode 로 바꿨다.
chk 'EXIT_TRAP' scripts/check-paste-format.mjs 1
chk 'EXIT_TRAP' scripts/check-corr-claim.mjs 1
chk 'EXIT_TRAP' scripts/build-course-mirror.mjs 1
chk 'process.exitCode = bad' scripts/build-course-mirror.mjs 1

# ── [CONSOLE_TEXT] 콘솔 전용 클립도 글↔소리를 대조한다 (2026-08-09) ──
# 종전엔 preview 모드만 훑어, **예식 뒤 구간(콘솔 전용)은 글이 바뀌어도 아무도 안 물었다.**
# 실측: 하객과 함께(61)·나눠 담기(60)·단체촬영 개시(44)를 다시 썼는데 재더빙 대기 0클립.
# 하필 사람의 시간이 가장 긴 자리들이다(18분·4분·5분). 화면과 스피커가 다른 말을 할 뻔했다.
# ★RECORDED_TRUTH · NOAUDIO_REAL 에 이은 같은 집안 세 번째 — '안 보이는 것은 안 센다'.
chk 'CONSOLE_TEXT' scripts/check-text-audio.mjs 1
chk "for (const MODE of \['preview', 'console'\])" scripts/check-text-audio.mjs 1

# ── [NARR_LEN] 문안을 고칠 때 '합'을 보게 한다 (2026-08-09 · 적대 검증) ──
# 필요한 문장을 하나씩 더했더니 각각은 옳은데 합이 31.5초가 됐다(지금 있는 어떤 나레이션보다 길다).
# 그런데 그 '합'을 눈으로 잰 비교표가 통째로 틀렸다 — "편지 빼면 폐식 23.3초가 최장"이라 적었지만
# 23.3초는 축배였고 폐식은 13.2초, 진짜 최장은 declare-1-solemn 25.9초였다.
# 그래서 사람이 세지 않게 여기서 센다. 조립기와 같은 식(음절/300*60 + 쉼 + head/tail)을 쓴다.
chk 'NARR_LEN' scripts/check-narr-len.mjs 1
chk 'LEN_FIX' assets/ritual-data.js 1
if command -v node >/dev/null 2>&1; then node scripts/check-narr-len.mjs >/dev/null \
  || { echo 'FAIL narr-len: 주석의 길이 수치가 실측과 다릅니다 — node scripts/check-narr-len.mjs'; fail=1; }; fi

# ── [SYL_RATE] 음절 속도 상수와 실제 낭독의 폭 (2026-08-09) ──
# 길이 예상은 음절/300*60 인데 실제 낭독은 406음절/분이다 — 예상이 35% 길게 나온다.
# 그 예상으로 "너무 길다"를 판단하면 멀쩡한 문장을 계속 깎는다.
# ★실제로 갈렸다: 같은 클립을 코워크는 실측 19.5초, 코드 세션은 예상 25.8초로 적었다. 둘 다 맞았다.
# ★ffprobe 없는 세션에서는 '안 쟀다'고 밝히고 넘어간다 — 초록으로 위장하지 않는다.
chk 'SYL_RATE' scripts/check-syl-rate.mjs 1
chk '안 쟀다' scripts/check-syl-rate.mjs 1
chk 'CANT_LOOK' scripts/check-syl-rate.mjs 2
# ── [NAN_NOT_ZERO 2026-08-10] 못 읽은 길이를 값으로 삼키지 않는다 ──
# build-chorus 의 `|| 0` 과 같은 병 · 꼴만 다르다(0 대신 NaN). ffprobe 는 못 재면 'N/A' 를 내고,
# parseFloat('N/A') = NaN 은 **던지지 않고 비교를 무력화한다**.
# 실측: assemble-parents-letter 의 정렬 게이트가 `r < 0.85` 라, 한 파일만 NaN 이면
#       완전 역순(r=-1.000, 원래 막힘)이 통과로 넘어갔다. 그래서 `!(r >= 0.85)` 로 바꿨다.
chk 'NAN_NOT_ZERO' scripts/assemble-narration.mjs 1
chk 'NAN_NOT_ZERO' scripts/assemble-parents-letter.mjs 2
chk 'NAN_NOT_ZERO' scripts/check-syl-rate.mjs 1
chk 'Number.isFinite' scripts/assemble-narration.mjs 1
chk 'Number.isFinite' scripts/assemble-parents-letter.mjs 1
chk '!(r >= 0.85)' scripts/assemble-parents-letter.mjs 1
nochk 'if (r < 0.85' scripts/assemble-parents-letter.mjs   # NaN 을 통과시키던 옛 비교 부활 차단
chk 'Number.isFinite' scripts/build-chorus.mjs 1           # 같은 병을 먼저 고친 자리 — 함께 지킨다
# ★[CANT_LOOK 2026-08-10] 0/1/2 를 갈라 읽는다. 옛 판은 `|| fail=1` 한 줄이라 0 이 아니면 전부 실패였고,
#   그래서 이 검사가 ffprobe 없는 환경에서 **0 으로 나갈 수밖에 없었다** — 안 잰 것이 통과로 읽혔다.
#   이제 2(못 잼)를 따로 적는다. 안 잰 것을 안 잤다고 화면에 남기면서도 게이트는 안 무너진다.
if command -v node >/dev/null 2>&1; then
  node scripts/check-syl-rate.mjs >/dev/null 2>&1; _syl=$?
  if [ "$_syl" = 1 ]; then
    echo 'FAIL syl-rate: 음절 상수와 실측의 폭이 범위를 벗어났습니다 — node scripts/check-syl-rate.mjs'; fail=1
  elif [ "$_syl" = 2 ]; then
    echo 'skip syl-rate: 이번엔 재지 못했습니다(ffprobe 없음 또는 mp3 없음) — 통과가 아니라 안 본 것입니다'
  elif [ "$_syl" != 0 ]; then
    echo "FAIL syl-rate: 뜻 모를 종료 코드 $_syl — node scripts/check-syl-rate.mjs"; fail=1
  fi
fi

# ★★[LOCKUP_SAID 2026-08-10] 히어로 자물쇠 — 적어 둔 숫자와 실제 값이 갈렸는지.
#   같은 종류가 **세 번** 났다(커밋 제목·본문·가드 주석이 그때그때 실제와 달랐다).
#   "패치 내기 전에 눈으로 대조하자"는 세 번 다 안 지켜졌다 — 기억에 맡기지 않고 게이트가 본다.
#   ★파일만 읽는 검사라 브라우저·로컬 서버가 필요 없다(그래서 여기서 돌릴 수 있다).
if command -v node >/dev/null 2>&1; then node scripts/check-hero-lockup.mjs >/dev/null \
  || { echo 'FAIL hero-lockup: 적어 둔 숫자와 실제 값이 다릅니다 — node scripts/check-hero-lockup.mjs'; fail=1; }; fi

# ── [LEN_FRAME] 길이 수치는 '예상'인지 '실측'인지 밝힌다 (2026-08-09) ──
# 같은 '23.3초'를 두 세션이 서로 다른 클립·다른 틀로 적어 한 번 헛돌았다(한쪽 narr-close 실측 ·
# 한쪽 toast-toast 예상 · 둘 다 맞았다). '폐식'이라는 말도 서로 다른 클립을 가리켰다.
# 오늘 목록 그대로다 — 같은 이름의 두 숫자는 증명을 방해한다. 그래서 화면에도 틀을 박아 둔다.
chk '예상 · 실측 아님' scripts/check-narr-len.mjs 1
chk '실측인지 예상인지' assets/ritual-data.js 1

# ── [REDUB_VOICE] 재더빙 붙여넣기는 클립마다 제 화자를 붙인다 (2026-08-10 · 적대 검증) ──
# 옛 판은 VOICE(진행=우성) 하나를 모든 줄에 박았다. CONSOLE_TEXT 로 훑는 범위가 넓어지며
# 안내(잔희) 클립이 들어오자 14줄 중 5줄이 틀린 화자로 나갔다 — 그대로 녹음하면 안내만 목소리가 바뀐다.
# ★PASTE_VOICE 는 형식(`화자: 대사`)만 봤다. 꼴이 맞아도 사람은 틀릴 수 있다.
chk 'REDUB_VOICE' scripts/check-text-audio.mjs 1
# [REDUB_TWIN 2026-08-10] 한 화면 자리에 녹음이 둘일 수 있다(guest-2-10min = 안내판 + 배역판).
#   슬러그로 중복 제거하면 다른 녹음까지 버린다 — 녹음 파일 이름으로 접는다. 되돌리지 말 것.
# [WAIT_TWO_COUNTS] 명단 머리의 수는 **아래 적힌 항목 수**와 같아야 한다.
#   그 둘이 갈린 것이 REDUB_TWIN 을 찾아낸 단서였다 — 신호를 죽이지 말 것.
chk 'REDUB_TWIN' scripts/check-text-audio.mjs 7
chk 'WAIT_TWO_COUNTS' scripts/check-text-audio.mjs 1
chk 'REDUB_VOICE' scripts/check-paste-format.mjs 1
chk 'voiceOf' scripts/check-text-audio.mjs 4
# ── [PW_FIND] check-guest-skin 이 playwright 를 한 곳만 보던 것 ──
# 경로를 박아 둬서, 그 경로가 아닌 세션에선 조용히 SKIP 하고 exit 0 이었다.
# 이 검사가 지키는 GUEST_CTL_EMPTY(고객 화면에 디렉터 도구가 새는지)가 한 번도 안 돌고 초록이었다.
chk 'PW_FIND' scripts/check-guest-skin.mjs 1
chk 'npm root -g' scripts/check-guest-skin.mjs 1

# ── [WIZ_EXIT_ONE] 위저드 저장·나가기 = 한 벌 (2026-08-14 사용자 지시) ──
# 원문: "식순섹션에서 했던 것이랑 통일해서 똑같이 적용 저장 나가기 /
#        따로 저장없이 나가기 시 팝업등장 이건 전부 통일되게 적용 다른곳들도 조사해서 전부"
# 청첩장·애프터 웨딩·좌석·단체 사진·스냅 다섯이 「저장 후 나가기」 한 버튼을 쓰고 있었다 —
# 나가기가 몰래 저장하니 저장 버튼이 설 자리가 없었다(식순에서 2026-08-13 에 이미 고친 것).
# ★한 버튼으로 되돌리지 말 것. 손잡이는 둘이고, 나가기는 바뀐 게 있을 때만 묻는다.
chk 'WIZ_EXIT_ONE' mypage.html 15
chk 'data-wiz-save' mypage.html 4
chk 'wizActs()' mypage.html 9
# dismissNull — Esc·바깥클릭을 '아니오'와 가른다. mpConfirm 이 이걸 안 넘기면 Esc 가 곧 '그냥 나가기'다(실측으로 잡힌 결함).
chk 'dismissNull' mypage.html 5
# 되살아나면 안 되는 것들 — 마크업/호출부 모양을 겨눈다(이름만 겨누면 근거 주석을 제 발로 밟는다)
nochk '>저장 후 나가기<' mypage.html
nochk 'data-seat-exit' mypage.html
nochk 'mp_photoExit' mypage.html
nochk '자동으로 저장돼요<' mypage.html

# ── [WIZ_VCENTER] 카드 한 장뿐인 화면의 세로 자리 (2026-08-14 사용자 지적) ──
# "모바일화면인데 너무 위쪽에 쏠려잇어" — 짧은 단계가 화면 위에 붙고 아래가 통째로 비었다.
# 남는 공간이 있을 때만 먹는 auto 마진이라 긴 단계는 종전대로 위에서부터 흐른다. 높이로 조건 걸지 말 것.
chk 'WIZ_VCENTER' mypage.html 3
chk 'only-child{margin-top:auto' mypage.html 1
# display:flex 는 !important 여야 한다 — renderProduction 이 인라인 display:block 을 얹는다
chk 'display:flex!important;flex-direction:column}' mypage.html 1

# ── [TOAST_STUCK] 토스트가 화면에 박히던 것 (2026-08-14 사용자 제보) ──
# '보이기'는 rAF · '숨기기'는 그와 무관한 setTimeout 이었다. 화면을 안 그리는 동안(앱 전환·화면 꺼짐)
# rAF 만 멈추니 숨김이 먼저 지나가고 보이기가 나중에 실행돼 아무도 안 지우는 상태가 됐다.
# ★숨김 타이머는 '보이게 만든 그 순간'에 건다. 되돌리지 말 것.
chk 'TOAST_STUCK' mypage.html 2

# ── [INV_EN_GATE] 청첩장 영문 이름은 적는 자리에서 막는다 (2026-08-14 사용자 지시) ──
# "eventId 생성 실패 — 영문 이름·예식 날짜를 확인해 주세요. (1014)" 가 마지막 화면에서 터졌다.
# 영문 칸에 한글을 적으면 서버가 a-z 만 남겨 빈 문자열이 되는데, 프런트는 '비어 있지 않다'만 봤다.
# ★판정식은 서버 _invMakeEventId(85_invitation.gs)와 같은 꼴이어야 한다 — 바꿀 땐 둘을 같이.
chk 'INV_EN_GATE' mypage.html 4
chk '_invEnIni' mypage.html 2
chk '_invEnMiss' mypage.html 3
# 실브라우저 계약 검사 — 마커만으로는 '판이 실제로 뜨는지'를 못 잰다(로컬 서버 필요 · 없으면 스스로 건너뛴다)
chk 'WIZ_EXIT_ONE' scripts/check-wiz-exit.mjs 1
chk 'WIZ_VCENTER' scripts/check-wiz-vcenter.mjs 1

# ── [SEAT_ROW_TRUTH] 행이 읽는 값 = 그 행이 바꾸는 값 (2026-08-14 사용자 제보) ──
# "좌석음료부분 이대로완료했는데 왜 계속 시작하기지?"
# 「좌석 · 음료」 행이 t.final 을 읽는데, 그 버튼은 2026-07-19 이후 좌석 편집기를 연다.
# t.final 은 이제 _seatFinSave 가 '이름 적힌 자리 수 > 0' 일 때만 세우는 파생값이라,
# 자리·음료만 정하고 이름을 안 적으면 좌석을 끝내도 행이 영영 '시작하기'였다(확인서도 안 열렸다).
# ★t.final 로 되돌리지 말 것. 행의 진실은 그 행이 실제로 바꾸는 트랙이다.
chk 'SEAT_ROW_TRUTH' mypage.html 2
chk 'PROD_ROW_TRUTH' scripts/check-prod-rows.mjs 1
nochk "t.final==='진행중'" mypage.html

# ── [PUBLISH_FAIL_CHANNEL] 성공했는데 실패라고 말하지 않기 (2026-08-14 사용자 제보) ──
# `.then(성공처리).catch(실패문구)` 는 **성공 처리 안의 예외까지** 같은 catch 로 떨어뜨린다.
# 그래서 청첩장이 만들어진 뒤에도 화면은 「발행이 안 됐어요」라고 말했다.
# 통신 실패는 then 의 두 번째 인자가, 그리기 실패는 자기 자리에서 잡는다.
chk 'PUBLISH_FAIL_CHANNEL' mypage.html 1

# ── [FS_FLEX_SHRINK] flex 아이템은 min-width:0 이 없으면 안 줄어든다 (2026-08-14) ──
# .mp-fs 를 flex 로 바꾼 그 변경이 긴 주소가 든 완성 화면을 390px 칸에서 467px 로 벌렸다.
# "여기왜이렇게 확대가되서나오지?" — 화면이 통째로 옆으로 밀린 것이다.
chk 'FS_FLEX_SHRINK' mypage.html 1
chk 'min-width:0;width:100%' mypage.html 1
chk 'FS_FLEX_SHRINK' scripts/check-fs-overflow.mjs 1

# ── [PREVIEW_LINK_BOOT] 캐시 첫 페인트에도 「미리듣기」가 선다 (2026-08-14 사용자 제보) ──
# "식순에 어쩔땐 미리듣기가 안보이고 언쩔땐 보이고" — 로드 순서였다.
# 캐시 페인트(마이크로태스크)가 ritual-preview-link.js 보다 먼저 돌아, 첫 화면엔 늘 버튼이 없었다.
# 검사가 순서를 정적으로도 본다(찬 캐시에서만 드러나는 결함이라 브라우저 재현만으로는 못 잡는다).
chk 'PREVIEW_LINK_BOOT' mypage.html 1
chk 'PREVIEW_LINK_BOOT' scripts/check-preview-link-boot.mjs 1

# ── [PRICE_2026_08] 패키지 금액 인상 (2026-08-14 사용자 결정 "추천대로 진행") ──
# 주말 280→330만 · 평일 210→240만 · 계약 시 납입 잔액 18만→23만 / 11만→14만.
# 같은 금액이 화면·계약서·AI 지식·관리자 드롭다운에 열 곳 넘게 사본으로 산다 —
# 한 곳만 고치면 고객은 옛 가격을 보고 계약서는 새 가격을 말한다. 사본 대조는 아래 검사가 한다.
# ★인상 전 금액이 남아도 되는 곳은 둘뿐: 계약서 보존본(archive/) · 관리자 드롭다운 '(인상 전)' 항목.
#   그 둘은 지우지 말 것 — 2026-08-14 전 예약금 납부 고객이 구가로 계약한다.
chk 'PRICE_2026_08' automation/platform/70_journey.gs 3
chk 'PRICE_2026_08' contract/v1-1.html 1
chk 'PRICE_2026_08' admin.html 3
chk 'PRICE_2026_08' automation/admin/Admin.html 1
chk 'PRICE_SYNC' scripts/check-price-sync.mjs 1
# ★[PRICE_2026_08_15] 평일 240 → 250 (2026-08-15 사용자 지시 "가격은 지금 바로 바꾸는거야").
#   인상이 두 번이라 **구가가 두 세대**다 — 관리자 드롭다운에서 셋 다 지우지 말 것:
#     240만(8/15 인상 전) · 280/210만(8/14 인상 전). 8/14~8/15 창이 이틀뿐이라 지우기 쉽다.
chk "'시그니처': { 평일: 2500000, 주말: 3300000 }" automation/platform/70_journey.gs 1
chk 'value="2400000">평일 · 240만 (8/15 인상 전)' admin.html 1
chk 'v1.8' contract/v1-1.html 4
chk "docVersion: 'v1.8'" automation/platform/70_journey.gs 1
chk "v1-6.html" mypage.html 1
chk "v1-7.html" mypage.html 1
# 평일 240만이 적힌 보존본 — 8/14~8/15 이틀 창의 서명자가 여는 문서다
chk '2,400,000원' contract/archive/v1-7.html 1
# 인상 전 금액이 적힌 계약서 보존본 — 구가 서명자가 여는 문서다. 지우면 그분들이 새 금액 문서를 보게 된다
chk '2,800,000원' contract/archive/v1-6.html 1
chk '2,100,000원' contract/archive/v1-6.html 1
chk '180,000원 · 평일 110,000원' contract/archive/v1-6.html 1

# ── [WELCOME_DEFAULT] 첫인사를 세 코스 기본으로 (2026-08-14 사용자 결정) ──
# "첫인사안내도 첫멘트로 항상 위치해놓는게 좋지안아?" → 세 코스 전부 ON.
# 예전엔 기록·약속은 팔레트에만, 가족은 opt(선택)에만 있었다 — 하객이 앉자마자 의식이 시작돼
# 완충이 없었고 두 분의 첫 목소리를 듣는 자리가 없었다.
# ★seq 에 넣는 것만으로 켜지는 이유는 isGAdd 가 seq 를 먼저 보기 때문 — 그 함수를 고치면 여기가 조용히 꺼진다.
# ★대독(나레이션 대신 읽기)은 되살리지 않는다(2026-07 사용자 지시 · S.welcome='self' 고정).
chk 'WELCOME_DEFAULT' assets/ritual-data.js 9
chk 'WELCOME_DEFAULT' scripts/check-welcome-default.mjs 1
chk "seq:\['guest','entry','welcome','vow','ring','declare','toast'\]" assets/ritual-data.js 1
chk "seq:\['guest','entry','welcome','vow','ring','declare','letter','toast'\]" assets/ritual-data.js 2
chk "seq:\['guest','entry','welcome','bless','vow','ring','tribute','declare'\]" assets/ritual-data.js 1
chk 'base:{damback:23,minimal:18,gamdong:28,family:25,festive:30,record:17}' assets/ritual-data.js 1
chk 'base={damback:23,minimal:18,gamdong:28,family:25,festive:30,record:17}' order-preview.html 1
# [MIN_RING_OFF] 기록 카드 라벨은 base(17)가 아니라 '고객이 보게 될 시간'(16)이다 — 반지 기본 빼기가 1분을 뺀다
chk 'MIN_RING_OFF' assets/ritual-data.js 1
chk "record:{nm:'기록', badge:'사진이 중심', ready:true, min:'약 16분'" assets/ritual-data.js 1

# ── [FREE_BLOCK] 자유 한 칸이 완성 순서표에서 빠져 있었다 (2026-08-14 · 검사가 발견) ──
# 엔진(ritual-cue.js)에는 narr-free-in/out 큐가 처음부터 있는데 빌더의 BLOCK 지도에만 free 가 없어,
# 고객이 축가·영상을 넣으면 미리듣기엔 소리가 나는데 완성 순서표엔 그 줄이 없었다(순서 12 vs 블록 11).
# ★문안은 무엇인지 지목하지 않는다 — 자유 한 칸의 약속이 "앞뒤만 열고 닫아 드려요" 이다.
chk 'FREE_BLOCK' order-preview.html 1
chk 'free:function()' order-preview.html 1

# ── [NARR_PICK] 나레이션 문안 후보 세 벌 (2026-08-14 사용자 지시) ──
# "각각 이벤트마다 여러게의 대사 준비해" — 결은 담백·서정·다정 셋으로 고정한다.
# ★index 0 은 **지금까지 쓰던 문안**이다. 저장된 초안이 고르지 않았을 때 열리는 자리라,
#   0 을 갈아치우면 이미 만든 고객의 예식이 말없이 바뀐다. 0 은 건드리지 말 것.
chk 'NARR_PICK' assets/ritual-data.js 1
chk 'var NARV={' assets/ritual-data.js 1
chk 'NARV:NARV' assets/ritual-data.js 1

# ── [MUNAN_COPY] 대본 개정 제안 문안의 문구 규칙 (2026-08-14) ──
# 문서 전체를 훑으면 설명 산문의 줄표·★ 까지 잡힌다 — 실제로 첫 판이 그랬다.
# 문안임을 형식으로 표시하고(굵은 번호 · 결 이름 아래 인용줄), 검사는 그것만 본다.
chk 'MUNAN_COPY' scripts/check-munan-copy.mjs 1
# [AI_VOICE_TENSE 2026-08-14 코워크 B 지적 · 확인함] 나레이션은 AI 음성으로 **미리 제작**된다.
#   미리 녹음된 목소리가 현장을 실시간으로 보고 있는 척하면 서명받은 AI 고지와 어긋난다
#   (계약서 서명란 + mypage 서명 판 넷째 줄). '저도 지금 처음 봅니다'가 실제로 그랬다.
chk 'AI_VOICE_TENSE' assets/ritual-data.js 1
nochk 'nar:"두 사람이 몰래 준비한' assets/ritual-data.js   # [AI_VOICE_TENSE] 옛 문안 자체를 겨눈다(근거 주석은 그 말을 인용하므로 이름으로 겨누면 제 발을 밟는다 · 네 번째 사고)
chk 'STAR_OK' scripts/check-munan-copy.mjs 1

# ── [NO_ADDABLE] 코스 카드 맨 아래 '더할 수 있어요' 줄 폐지 (2026-08-14 사용자 지시) ──
# 원문: "코스중 이부분 멘트는 다 빼자"
# 두 가지가 겹쳤다 — ①고를 것이 이미 다음 화면(다듬기)에 전부 서 있어(ORD_ADD_ALL) 같은 말이 두 번,
# ②첫인사가 기본이 되며(WELCOME_DEFAULT) "첫인사를 더할 수 있어요"가 사실이 아니게 됐다.
# ★되살리지 말 것(제거 지시 보존 규칙). 더할 수 있다는 안내는 다듬기 화면이 한다.
chk 'NO_ADDABLE' assets/ritual-data.js 1
chk 'NO_ADDABLE' order-preview.html 1
nochk "if(c.addable)" order-preview.html
nochk "addable:'" assets/ritual-data.js

# ── [NARR_RULE] 나레이션 합격 기준을 손이 아니라 기계가 잰다 (2026-08-14 R4) ──
# R2 에서 사람이 손으로 센 것이 두 번 틀렸고, R3 이 적은 N7 은 한 번 넓었다(승인된 DECLWHO.ask 가 걸렸다).
# 셋 다 "자가 기준의 사본이라는 것을 잊는" 같은 병이라, 자를 문서 밖으로 꺼낸다.
# ★검사 자신이 자가진단(잡아야 하는 7종) + 반례(붉히면 안 되는 4종)를 함께 돈다 —
#   아무것도 못 잡는 채로 초록인 검사는 통과가 아니라 눈을 감은 것이다.
chk 'NARR_RULE' scripts/check-narr-rule.mjs 1
chk 'SELFPASS' scripts/check-narr-rule.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/check-narr-rule.mjs || fail=1; else echo 'skip check-narr-rule (node 없음)'; fi
# [VOICE_2ND_ONE] 저장소 유일했던 '한 문장 안 3인칭+2인칭 혼용'을 R4 에서 고쳤다 — 되돌리지 말 것.
#   ★문장의 꼴을 겨눈다(이름으로 겨누면 바로 위 근거 주석이 제 발을 밟는다 · 같은 사고 다섯 번째 방지).
nochk '몸짓으로 전합니다. 두 사람, 천천히' assets/ritual-data.js
nochk '몸짓으로 전합니다. 두 사람, 천천히' order-preview.html
# [NARR_RULE --doc] 고르는 일은 **들어오기 전**에 한다 — 제안 문서도 같은 자로 잰다.
#   손으로 세면 R2 에서 두 번 틀린 그 자리로 돌아간다(B 39벌을 손으로 셀 뻔했다).
chk "'--doc'" scripts/check-narr-rule.mjs 1
# ★판정은 한 곳(judge)에서만 — 자가진단이 규칙을 따로 들면 자가진단만 초록인 날이 온다(이중 원천)
chk 'export function judge' scripts/check-narr-rule.mjs 1

# ── [TONE_PICK] 예식 어조 1회 전역 선택 (2026-08-14 사용자 지시 "전부 더빙 붙이고 고객이 고를수있게") ──
# ★표에 **현행이 안 들어간다**는 것이 이 설계의 전부다 — 없으면 현행으로 읽는다.
#   52 §5-3 이 「없으면 서정(index 0)」이라 적었다가 함정에 빠졌다(index 0 은 담백이다 · 52 §7).
#   결 이름으로 폴백하면 tone 없는 옛 초안의 나레이션이 통째로 바뀐다. 되돌리지 말 것.
chk 'TONE_PICK' assets/ritual-data.js 1
chk 'function TONE_NAR' assets/ritual-data.js 1
chk 'TONE_NAR:TONE_NAR' assets/ritual-data.js 1
# 표는 손으로 안 고친다 — 원천은 21_B_제안.md §3 · 생성기가 뽑고 이 검사가 대조한다
chk 'TONE_TABLE:BEGIN' assets/ritual-data.js 1
chk 'TONE_TABLE' scripts/build-tone-table.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/build-tone-table.mjs || fail=1; else echo 'skip build-tone-table (node 없음)'; fi

# ── [TONE_COPY] 어조 화면 이름은 문서 용어와 **따로 산다** (53_어조화면문구.md · 2026-08-14) ──
# 화면: 간결하게 / 차분하게(기본) / 다정하게   ·   문서: 담백 / 서정 / 다정   ·   키: plain/lyric/warm
# ★문서 용어를 화면 이름으로 갈아 끼우지 말 것 — 21_B 의 `**담백**` 라벨은 세 스크립트가 읽는
#   **파서의 표식**이다(check-narr-rule --doc · check-munan-copy · build-tone-table).
#   바꾸면 원천이 통째로 안 읽히고, 그때 검사는 「0벌 전부 통과」라고 조용히 초록이 된다.
chk 'TONE_COPY' docs/plans/대본개정/53_어조화면문구.md 1
chk '담백|서정|다정' scripts/check-narr-rule.mjs 1
chk '담백|서정|다정' scripts/check-munan-copy.mjs 1
# 51 은 나레이션 부분이 폐기됐다 — 배너가 사라지면 다음 사람이 「자리마다 한 벌만」을 구현한다
chk '나레이션 부분(§1~§5)은 폐기됐다' docs/plans/대본개정/51_고른결과.md 1

# ── [EX_MIRROR] 고객 예시도 빌더가 인라인 사본을 든다 (2026-08-14 · 실사고로 발견) ──
# NAR_MIRROR 는 nar/end 만 훑어 EXVOW·EXLETTER·EXWEL 을 **한 번도 안 봤다.**
# 서약 예시를 7→10 벌로 갈아 끼웠는데 빌더는 옛 일곱을 그대로 들고 있었고 검사는 전부 초록이었다.
# 고객 화면엔 뺀 문안이 계속 떴을 자리다. 그물이 안 덮는 곳은 조용히 갈라진다.
chk 'EX_MIRROR' scripts/check-ritual-mirror.js 1
# [EXVOW_TEN] 서약 예시 10벌 · 현행 일곱 중 다섯 교체 (2026-08-14 사용자 "추천대로" · 51 §6-1)
#   ★뺀 다섯을 되살리지 말 것 — 전부 구체 명사가 없어 「누구의 문장도 아닌」 쪽이라 뺐다(C1·B3).
nochk '가장 가까운 친구이자' assets/ritual-data.js
nochk '가장 가까운 친구이자' order-preview.html
nochk '오늘부터, 영원히' assets/ritual-data.js
nochk '오늘부터, 영원히' order-preview.html

# ── [TONE_DUB] 어조 60벌 붙여넣기 대본 — 배선보다 먼저 더빙을 시작하려고 따로 뽑는다 ──
chk 'TONE_DUB' scripts/build-tone-dub.mjs 1
# [TONE_DUB_SELFID] 명단 첫 줄이 스스로 벌 수를 말한다 · [TONE_DUB_DIFF] 인자 없이 돌리면 커밋된 두 파일과 대조한다
# ★아래 node 한 줄이 이제 진짜 대조다(전엔 세기만 했다) — 옛 명단이 남아 있으면 여기서 붉어진다
chk 'TONE_DUB_SELFID' scripts/build-tone-dub.mjs 1
chk 'TONE_DUB_DIFF' scripts/build-tone-dub.mjs 1
if command -v node >/dev/null 2>&1; then node scripts/build-tone-dub.mjs || fail=1; fi

# ── [DUB_ONEFILE 2026-08-15] 붙여넣는 파일은 **하나**다 (사용자 지시) ──
# 원문: *"4개 파일 그냥 하나로 만들고 너한테 보내면 너가알아서 분리해도돼잖아"*
# 합치는 쪽(build-dub-onefile) 과 되나누는 쪽(split-dub-onefile) 은 짝이다. 하나만 남으면 못 쓴다.
chk 'DUB_ONEFILE' scripts/build-dub-onefile.mjs 1
chk 'DUB_ONEFILE' scripts/split-dub-onefile.mjs 1
# [PASTE_IS_ORDER] 순서의 정본은 붙여넣기 파일이다 — 명단과 순서가 다른 것은 의도된 것이라
#   (재더빙 붙여넣기는 클립번호 오름차순 · 명단은 발견순) 「순서가 같은가」를 물으면 안 된다.
#   실측 차이: 붙여넣기 38·63·80 / 명단 63·80·38. 이 주석을 지우면 다음 사람이 또 같게 만든다.
chk 'PASTE_IS_ORDER' scripts/build-dub-onefile.mjs 1
# ★[DUB_FROZEN 2026-08-16] 소리를 받은 뒤에는 번호가 계약이다 — 다시 매기지 않는다.
#   재더빙 대기가 3→4클립이 되며 꼬리 번호가 밀렸고, 그대로 두면 받아 둔 wav 9개가
#   조용히 다른 자리로 간다(파일명엔 번호뿐이라 되돌릴 수도 없다). 가드가 실제로 잡았다.
chk 'DUB_FROZEN' scripts/build-dub-onefile.mjs 1
# [ORDER_CORR] 자르기 전에 길이 상관으로 순서를 확인한다 — 못 재면 통과가 아니라 멈춤(rc 2)
chk 'ORDER_CORR' scripts/split-dub-onefile.mjs 1

# ── [LISTEN_TONE 2026-08-15] 어조 63클립 실청 점검 화면 ──
# 기존 audio-review.html 은 manifest+조립 mp3 를 읽는다. 어조 60벌은 아직 둘 다 없다 →
# 조립 전에 문장 wav 그대로 듣고 판정하는 화면을 따로 뽑는다(자동생성물 · 손편집 금지).
# [FOOT_CLEAR] 390px 에서 발판이 두 줄(119px)로 접힌다 — 아래 여백 150px 을 되돌리지 말 것
chk 'LISTEN_TONE' scripts/build-listen-tone.mjs 1
# [USE_EXISTING] 「신랑 신부, 입장!」은 기존 녹음을 쓴다 — 잠그는 것만으로는 부족하다.
#   그 자리에서 **기존 소리가 실제로 나야** 한다(안 그러면 화면 말과 소리가 달라진다 · 실사고).
chk 'EXTRACT_SENT' scripts/extract-existing-sent.mjs 1
# ── [LISTEN_ALL 2026-08-15] 전체 실청(기존 105 + 어조 63) — 예식 순서대로 한 판 ──
# ★산출물은 저장소에 담지 않는다(소리 심으면 13MB) — 생성기만 커밋한다.
# [SELF_PARSE] 뽑은 화면의 스크립트를 그 자리에서 node --check 로 돌려 본다.
#   실사고: 이스케이프 한 단계가 덜 먹어 SyntaxError → 판정 화면이 통째로 백지였다.
# [EXPORT_TRUTH] 화자 이름은 manifest.voice 에서만 가져온다 — 지어내면 없는 사람이 대본에 실린다.
chk 'LISTEN_ALL' scripts/build-listen-all.mjs 1
# [SENT_SEEK] 기존 클립도 문장별로 들린다 — 소리를 더 넣지 않고 그 구간만 재생한다
# [RATE_VETO] 경계를 골라도 사람이 못 내는 속도(>10음절/초)면 거부한다 — 고르는 자와 거부하는 자를 나눈다
# [TOO_SHORT] 소리가 글보다 짧은 클립을 화면에 띄운다(못 듣는 내가 «틀렸다»고 하지 않고 «먼저 들어 보라»고 한다)
chk 'SENT_SEEK' scripts/build-listen-all.mjs 1
chk 'TOO_SHORT' scripts/build-listen-all.mjs 1
# ── [AUDIO_SENTS 2026-08-16] 소리에 대본만큼의 문장이 실제로 있는가 ──
# ★실사고: 4클립이 대본 2문장인데 소리엔 1문장뿐이었다(둘째가 통째로 빠짐).
#   check-text-audio 는 글↔글만 봐서 초록이었다 — 「A=B」를 아무리 봐도 둘 다 실물과 다르면 소용없다.
# [NO_GATE] merge-guard 에서 돌리지 않는다 — 91클립을 ffmpeg 로 재느라 3분 넘게 걸린다.
#   야간 잡이 돌린다. 여기서는 검사가 살아 있는지만 본다.
chk 'AUDIO_SENTS' scripts/check-audio-sents.mjs 1
chk 'CANT_HEAR' scripts/check-audio-sents.mjs 2
# ── [BLOCK_FIT] 덩어리마다 말속도를 본다 (2026-08-16 · 사용자가 또 귀로 잡았다) ──
# 옛 잣대는 클립 **전체** 말속도만 봤다. 13_narr-vow-in 은 3문장 중 2문장만 들어 있는데
# 전체가 초당 7.7음절(상한 9.5 밑)이라 통과했다 — 시간이 남은 것은 문장이 빠졌기 때문인데
# 평균이 그 사실을 지웠다. 이제 소리 덩어리마다 따로 재고, 어떤 배분도 사람 속도가 안 되면 붉힌다.
# ★재는 자는 lib/sent-bounds.mjs 한 곳뿐이다 — check-audio-sents 와 실청 화면이 같은 것을 쓴다.
chk 'BLOCK_FIT' scripts/lib/sent-bounds.mjs 1
chk 'export function blockFit' scripts/lib/sent-bounds.mjs 1
chk 'blockFit' scripts/check-audio-sents.mjs 2
chk 'blockFit' scripts/build-listen-all.mjs 3
chk 'SENT_MISSING' scripts/build-listen-all.mjs 3
# ── [RETIRED_OFF_SCREEN] 폐지한 자리는 실청 목록에서 뺀다 (2026-08-16 사용자 지적) ──
# *"축가는 뺄거야 축가는 생략이라고 전에 계속 얘기했는데 계속 등장하네?"*
# 큐 엔진은 이미 축가를 안 낸다(SONG_RETIRED). 그런데 실청 화면은 대장 105클립을 그대로 늘어놨다.
# 안 나가는 소리를 사람이 계속 확인하게 만들면 확인 시간을 뺏고 신뢰가 깎인다.
# ★조용히 빼지 않는다 — 무엇을 왜 뺐는지 화면과 콘솔에 적는다(그래야 「사라졌다」로 잘못 복구되지 않는다).
# ★폐지 명단은 ritual-cue.js 의 RETIRED 가 정본이다 — 여기 다시 적지 않는다.
chk 'RETIRED_OFF_SCREEN' scripts/build-listen-all.mjs 4
chk 'Cue.RETIRED' scripts/build-listen-all.mjs 1
chk 'RETIRED_ROWS' scripts/build-listen-all.mjs 3
# ── [REDUB_PICK] 「다시」로 찍은 자리를 버림/다시/그대로로 가르는 판정 화면 (2026-08-17 사용자 지시) ──
# *"내가선택 간편하게 페이지로 만들어주던지"* — md 로 드렸더니 손으로 적어야 했다.
# 손으로 적는 자리는 틀린다(바로 어제 붙여넣기를 손으로 써서 화자를 틀렸다 · PHOTO_ASK).
# ★판정 단위를 **실제 고칠 수 있는 단위**와 같게 둔다 — 기존은 클립(문장 wav 원본이 없다),
#   어조는 문장(아직 조립 전이라 낱개로 갈아 낀다). 다르면 실행 불가능한 답이 나온다.
chk 'REDUB_PICK' scripts/build-redub-pick.mjs 3
chk 'SELF_PARSE' scripts/build-redub-pick.mjs 1
# [PICK_EDIT] 판정 넷째 칸 — 「다시」와 「글 바꿈」은 뒤에 오는 일이 다르다.
#   다시 = 같은 글을 다시 받는다(대장 무변경) / 글 바꿈 = 대장을 먼저 고치고 받는다.
#   한 칸에 두면 새 글이 말로만 오가고 아무 데도 안 남는다. 칸을 갈라 결과 상자에 글자로 싣는다.
# ★글칸은 다시 그리지 않는다 — 입력 중 repaint 하면 커서가 튀고 글이 날아간다.
chk 'PICK_EDIT' scripts/build-redub-pick.mjs 2
chk '글 바꿈' scripts/build-redub-pick.mjs 4
# [PICK_WHOLE] 어조는 문장 하나로 안 갈린다 — 클립마다 「이 대본 전체 듣기」로 이어서 튼다.
#   ★듣는 단위(문단)와 고치는 단위(문장)는 다를 수 있고, 어조에서는 다르다.
# [PICK_WHY] 버림·바꿈에 이유 한 줄. 강제하지 않되 비면 결과에 「이유 없음」으로 실려 눈에 보인다.
#   이유가 없으면 두 달 뒤 「왜 뺐더라」가 되고 되살리는 판단이 근거 없이 뒤집힌다.
# [PICK_MACHINE] 결과는 기계가 읽는 한 가지 꼴로만 — 사람 줄과 섞으면 파서가 문안으로 착각한다.
chk 'PICK_WHOLE' scripts/build-redub-pick.mjs 2
chk 'PICK_WHY' scripts/build-redub-pick.mjs 1
chk 'PICK_MACHINE' scripts/build-redub-pick.mjs 1
chk 'REDUB_PICK v1' scripts/build-redub-pick.mjs 1
chk '소리를 하나도 못 심었다' scripts/build-redub-pick.mjs 1   # LISTEN_HAS_SOUND 와 같은 처방
# [GUESS_TIE] 1·2등이 붙으면 «어느 문장인지»를 지목하지 않는다 — GAP_MATCH 와 같은 처방.
# 실측 27_letter-parent: 3번째 1.90 vs 4번째 1.94(차이 0.04). 지목했으면 엉뚱한 문장을 받았다.
chk 'GUESS_TIE' scripts/lib/sent-bounds.mjs 2
chk 'GUESS_TIE' scripts/check-audio-sents.mjs 1
# ── ★★[COPY_BATCH] 문안 교체안을 원천에 한 번에 넣는다 (2026-08-17 사용자 *"추천대로 우선 진행하고"*) ──
# ★★같은 문장이 **여러 사본**에 흩어져 있다. 원천만 고치면 사본이 옛말을 하고, 그 차이는
#   고객 화면에서만 드러난다. 실측으로 사본이 넷이나 나왔다:
#     ①order-preview.html  빌더 인라인 사본 50개 (merge-guard 가 drift 17건으로 잡았다)
#     ②scripts/build-dubbing-script.mjs  EXTRA 문안 사본 (cue 의 EXTRA_MIRROR 가 6건으로 잡았다)
#     ③docs/plans/대본개정/21_B_제안.md  ★어조(TONE)의 **진짜 원천** — ritual-data.js 쪽이 생성물이다
#       (실측 사고: ritual-data 의 TONE 을 고쳤다가 tone 생성기를 돌리자 4곳 → 2곳으로 되돌아갔다)
#     ④assets/ritual-cue.js  EXTRA 맵
#   ★그래서 사본에 **옮겨 적지 않는다** — 같은 표를 사본에도 한 번 더 돌린다(--mirror).
chk 'COPY_BATCH' scripts/apply-copy-batch.mjs 1
chk 'MIRROR_P' scripts/apply-copy-batch.mjs 1
chk 'MIRROR_S' scripts/apply-copy-batch.mjs 1
chk 'MIRROR_B' scripts/apply-copy-batch.mjs 1
# ★★[TEXT_WITH_SOUND] 문안과 소리는 같은 커밋에서 바꾼다. 글만 먼저 넣으면 그 사이 내내
#   화면과 스피커가 다른 말을 한다. check-text-audio 가 붉은 채로 있는 것이 **정상**이고,
#   그 붉음이 곧 「소리 받기 전엔 병합하지 마라」는 자물쇠다. 초록으로 만들려고 검사를 고치지 말 것.
chk 'TEXT_WITH_SOUND' scripts/apply-copy-batch.mjs 2
# ★★[AI고지_G1-4 보호] 문안을 다듬다가 **AI 음성 고지를 지울 뻔했다.**
#   1분 전 안내에서 「미리 준비한 안내 음성으로 진행합니다」를 빼자 merge-guard 가 즉시 잡았다.
#   사용자가 지적한 것은 «두 문장이 따로 논다»였지 «고지를 빼라»가 아니다. 순서만 바꿔 이었다.
chk 'AI고지_G1-4' scripts/apply-copy-batch.mjs 1
# ★[PHOTO_POSE_RETIRED 2026-08-17] 촬영 연출 두 자리 폐지 — 「둘러싸기」·「하나, 둘, 셋」.
#   ★줄을 **지우지 않고** off:1 로 끈다 — 지우면 뒤 클립 번호가 두 칸씩 밀려 이미 녹음된 mp3 가
#     남의 자리에 앉는다(2026-08-08 에 fx-count 가 78→83 으로 밀린 그 사고). 실측으로 84→82 로 줄어드는 걸 확인하고 되돌렸다.
chk 'PHOTO_POSE_RETIRED' assets/ritual-cue.js 1
chk 'PHOTO_POSE_RETIRED' assets/ritual-data.js 2
chk 'PHOTO_POSE_RETIRED' console.html 1
chk "'fx-surround': 1, 'fx-count': 1," assets/ritual-cue.js 1
# ★[WELCOME_TONE 2026-08-17] 「말주변이 없어도 된다」를 **대사로 말하지 않는다.**
#   의도는 옳았지만 실물로 들으면 성의 없어 들린다. 부담을 더는 일은 «길이»가 한다.
chk 'WELCOME_TONE' "docs/plans/식순연구/배역_예시_대사.txt" 1
# ★★[PERF_CANON_2 2026-08-17] N8 표준형에서 호명(「신랑 신부,」)을 뺐다 — 규칙을 없앤 게 아니라 옮겼다.
#   다섯 자리가 여전히 같은 한 문장을 쓰는지 전수 대조한다. 하나만 옛 꼴이면 붉는다.
chk 'PERF_CANON_2' scripts/check-narr-rule.mjs 1
chk "PERF_CANON = '이제 두 사람은 부부입니다'" scripts/check-narr-rule.mjs 1
# ★★[VOICE_CAST_2 2026-08-21] 배역 성우 2자리 교체 — 신랑 이준→이겸 · 하객대표 영목→규민
#   신랑은 사용자 선택, 하객대표는 판정 *"너무 짧고 어색해 · 더빙 성우 바꿔야해"*.
#   시험 녹음을 실측해 둘 다 바뀐 것을 확인했다 — 이준 116.8→이겸 133.3Hz · 영목 128.0→규민 144.1Hz.
#   보이스 이름은 DEFAULT_VOICE 한 곳에만 적는다 — manifest.voice·붙여넣기 파일·보이스찾기 표가
#   전부 거기서 생성된다. 옛 이름이 한 곳이라도 남으면 타입캐스트가 그 줄만 옛 성우로 배정한다.
chk 'VOICE_GROOM_2' scripts/build-typecast-import.mjs 1
chk 'VOICE_FRIEND_2' scripts/build-typecast-import.mjs 1
chk "신랑: '이겸'" scripts/build-typecast-import.mjs 1
chk "하객대표: '규민'" scripts/build-typecast-import.mjs 1
#   ★부재는 nochk 로 쏜다(chk 셋째 인자는 «최소 개수»다 — CHK_ARG_SPACE 참고).
#   ★이름 통짜로 세지 않는다 — 배역 «가상 인물»이 이준호(31)라서 '이준' 이 정당하게 남고,
#     근거 주석에도 옛 이름이 남아야 한다(왜 바꿨는지). 대장 줄 모양 그대로만 없는지 본다.
nochk "신랑: '이준'" scripts/build-typecast-import.mjs 0
nochk "하객대표: '영목'" scripts/build-typecast-import.mjs 0
#   ★생성물도 함께 본다 — 원천만 고치고 생성기를 다시 안 돌린 날을 잡으려는 것이다.
nochk '이준:' "docs/plans/식순연구/타입캐스트/5_배역.txt" 0
nochk '영목:' "docs/plans/식순연구/타입캐스트/5_배역.txt" 0
chk '이겸:' "docs/plans/식순연구/타입캐스트/재더빙_20260821_5_배역.txt" 32
chk '규민:' "docs/plans/식순연구/타입캐스트/재더빙_20260821_5_배역.txt" 4
# ★★[PASTE_ROLE_SENT 2026-08-21] 붙여넣기 화자는 «문장» 역할에서 온다 — 클립 역할이 아니다.
#   사용자가 타입캐스트 화면을 보내 왔다: 「신랑|신부 · 대사 9개」 묶음에 «보이스를 선택하세요» 만
#   붉게 떠 있었다. clip.role '신랑|신부' 는 캐릭터가 아니라 «번갈아 읽는다»는 표시라 배정이 안 된다.
#   손으로 하나 골랐으면 입장 아홉 줄이 통째로 한 사람 목소리가 됐다.
chk 'PASTE_ROLE_SENT' scripts/repatch-clip.mjs 1
# ★★[RECORDED_MIX 2026-08-21] 합성 클립(26)도 «무슨 말인지»를 _recorded.json 에 적는다.
#   assemble-narration 은 만드는 자리에서 적는데(RECORDED_TRUTH) build-chorus 만 안 적었다.
#   실측: 재료 24·25 를 새 문안으로 받아 26 을 다시 겹쳤는데도 대장엔 26 이 옛말로 남아
#   67곳이 전부 맞는 판에서 26 하나만 붉었다. 적는 값은 manifest 가 아니라 «재료가 실제로 녹음한 글»이다.
chk 'RECORDED_MIX' scripts/build-chorus.mjs 1
chk 'recordMixed' scripts/build-chorus.mjs 2
chk 'voiceOf' scripts/repatch-clip.mjs 4
nochk 'man.voice?.\[c.role\]' scripts/repatch-clip.mjs 0
nochk '신랑|신부:' "docs/plans/식순연구/타입캐스트/재더빙_20260821_5_배역.txt" 0

# ── ★★[DROP_GUARD] 「버림」으로 찍어도 비울 수 없는 자리 (2026-08-17 사용자 지시) ──
# *"버림으로 체크해도 이 부분의 안내가 없으면 안 된다고 판단이 들면 너가 같이 적은 이유를 보고
#   적절한 문장으로 변경 적용하자"*
# ★「버림」은 «클립을 지운다»지 «식순에서 그 순서를 없앤다»가 아니다. 둘을 같게 보면
#   엔진이 부르는 큐가 소리 없는 큐가 된다 = 식장에서 아무 안내 없이 다음이 시작된다.
# ★★엔진(Cue.build)만으로는 못 가른다 — 실측(2026-08-17): 「다시」로 찍힌 56클립 중 엔진이
#   부르는 것 49개. 남은 7개를 「비워도 됨」으로 넘길 뻔했는데 그중 5개가 비우면 안 되는 자리였다:
#     24_vow-both-1(합창 26_vow-both 의 재료) · 49·50 bridge(콘솔에서 손으로 튼다)
#     32_declare-family(폴백) · 25_narr-bless-end-long(런타임 조건)
#   진짜로 비워도 되는 것은 이미 폐지한 2개뿐이었다. 그래서 답을 셋으로 둔다 —
#   못비움(false) · 비워도됨(true) · **확인 필요(null)**. ★null 을 「괜찮다」로 접지 말 것.
chk 'DROP_GUARD' scripts/lib/drop-guard.mjs 2
chk 'DROP_ANSWERS' scripts/lib/drop-guard.mjs 1
chk '합성 재료' scripts/lib/drop-guard.mjs 1
chk '콘솔에서 손으로 고르는 판' scripts/lib/drop-guard.mjs 1
chk '확인 필요' scripts/lib/drop-guard.mjs 3
chk 'DROP_GUARD' scripts/build-redub-pick.mjs 4
chk '이 자리는 비울 수 없어요' scripts/build-redub-pick.mjs 1
chk 'DROP_GUARD' scripts/apply-redub-pick.mjs 4
chk 'REDUB_PICK_APPLY' scripts/apply-redub-pick.mjs 1
chk 'PICK_PARSE' scripts/apply-redub-pick.mjs 1
# ★[ENGINE_CALLS] 「엔진이 부르는 자리」는 저장소에 한 곳만 둔다. 셋이 각자 세면 답이 갈리고,
#   갈린 날 사람은 「비워도 된다」고 말한 쪽을 믿는다 — 그쪽이 되돌리기 비싼 쪽이다.
chk 'ENGINE_CALLS' scripts/lib/engine-calls.mjs 1
chk 'ENGINE_CALLS' scripts/check-listen-cover.mjs 1
chk 'engineCalls' scripts/lib/drop-guard.mjs 2
# ── ★[VOICE_ID] 조립된 mp3 가 대장에 적힌 성우의 목소리인가 (2026-08-17 사용자 물음) ──
# *"나래이션 성우 각각맞게 입힌거지 ?"*
# ★대장 ↔ 붙여넣기 대조는 둘 다 «글»이다. 사고가 그 틈에서 났다(PHOTO_ASK) — 손으로 쓴 화자가
#   틀렸는데 글끼리는 아무 데도 안 걸렸고 사람이 귀로 잡았다. 그래서 여기서는 파형을 잰다.
# ★F0 만으로는 사람을 못 지목한다(실측: 주하 145Hz · 우성 151Hz). 음색까지 본다.
# ★★자기 클립은 중심에서 빼고 잰다(leave-one-out) — 안 빼면 검사가 아니라 거울이 된다.
# ★못 잰 자리를 «통과»로 세지 않는다 — 클립이 하나뿐인 성우 4명은 «판정 불가»로 따로 적는다.
chk 'VOICE_ID' scripts/audit/clip-voice-id.py 2
chk 'leave-one-out' scripts/audit/clip-voice-id.py 3
chk 'EXPORT_TRUTH' scripts/audit/clip-voice-id.py 1
chk '판정 불가' scripts/audit/clip-voice-id.py 3
chk 'clip-voice-id' .github/workflows/nightly-screen.yml 1   # 야간에 매일 다시 잰다
# ── [LISTEN_COVER] 실청 화면에 «식장에서 날 소리»가 전부 있는가 (2026-08-16 사용자 지시) ──
# 왼쪽을 대장(manifest)이 아니라 **큐 엔진**에 둔다 — 대장과 화면은 같은 생성기에서 나와 늘 맞는다.
# ★castLive(배역 상황극)를 보는 첫 검사다. check-text-audio 는 그것을 일부러 뺀다(화면 글과 짝이 아니라서).
#   그 사정과 「들어 있나」는 별개인데, 여태 아무도 그 별개를 안 봤다.
chk 'LISTEN_COVER' scripts/check-listen-cover.mjs 1
chk 'castLiveOf' scripts/lib/engine-calls.mjs 1      # [ENGINE_CALLS] 상황극을 세는 곳은 이제 lib 이다
chk 'UNREACHED_TEXT' scripts/check-listen-cover.mjs 1
chk 'check-listen-cover' .github/workflows/nightly-screen.yml 1
# ★[LISTEN_KEEP 2026-08-16] 만든 실청 판을 버리지 않는다 — 사용자가 내려받아 «들을» 판이다.
#   전에는 /tmp 에 만들어 검사만 하고 버려서, 들으려면 ffmpeg 이 있는 세션이 매번 새로 만들어
#   사람 손으로 넘겨야 했다. 실청은 사람만 할 수 있는 마지막 검사인데 그 판을 얻는 길이 심부름이었다.
# ── [LISTEN_KEY_STAMP 2026-08-26 사용자 지적] 판정 저장 열쇠에 내용 지문을 찍는다 ──
# *"이미 전에 체크한것들이 그대로 저장되어있는데 왜그래? 지금 새로운것을 다시 테스트하는거아니야?"*
# 열쇠가 `me_listen_all_v1` 고정 문자열이라, 재더빙 58클립을 갈아 낀 새 판을 열어도
# 브라우저가 같은 칸을 봐서 「판정 478/483」이 이미 차 있었다.
# ★불편이 아니라 **기록이 거짓이 되는 것**이다 — 옛 소리에 누른 「좋아요」가 새 소리 위에 앉는다.
# 지문 = 클립 글 + 어조 문장 + mp3 파일 크기 + _recorded.json.
# 실측: mp3 에 1바이트 더하면 9f7b3c6d → b0fd2b20 · 되돌리면 9f7b3c6d 로 복귀.
# ── [NO_SOUND_SAY 2026-08-26 사용자 지시 *"한번에해 … 중간에 또작업없이"*] ──
# 소리가 없는 자리에 「듣기」를 내밀지 않는다. 전엔 버튼이 있고 누르면 경고가 떴다 —
# 186문장을 하나씩 눌러 봐야 알았다. 그러면 「한 번에」가 안 된다.
# ★그리고 맨 위에 「이 판으로 되는 것 / 안 되는 것」을 **세어서** 적는다(손으로 적은 수는 언젠가 어긋난다).
# ── [LISTEN_WHY · LISTEN_SPLIT 2026-08-26 사용자 지적] ──
# ①*"다시 하는 이유를 적어야 너한테전달했을때 너가 하나하나 파악해서 개선을하지"*
#   「다시」에만 이유 칸을 연다. 비워도 넘어가되 대본에 「(이유 없음)」으로 실려 눈에 보인다.
#   ★열쇠를 판정과 따로 둔다 — 「판정 지우기」로 판정을 비워도 적어 둔 이유는 남는다.
#   ★글칸은 다시 그리지 않는다(입력 중 repaint 하면 커서가 튄다 · 마이페이지에서 겪은 병).
# ②*"모바일이나 태블릿에서는 안나오네 항목들이"* — 한 판 8.5MB 가 폰에서 버겁다.
#   ★화면 탓이 **아님**을 먼저 쟀다: 390px 헤드리스에서 클립 160·문장 495 그려지고 pageerror 0.
#   그래서 --part 로 쪼갤 길을 연다(1.0~2.2MB). 쪼갠 판은 지문이 달라 판정이 안 섞인다.
#   ★어조는 파트가 없어 안 빼면 **모든 파트 판에 딸려 온다**(실측: 1_안내 가 13이 아니라 76클립).
# ── [LISTEN_LIGHT 2026-08-26 사용자 지시 *"파트별? 하나로줘야지"*] ──
# 쪼개지 말고 **한 판**으로 주되 폰이 감당하게 무게를 줄인다. 48k/32kHz → 24k/22.05kHz.
# 실측: 8.5MB → 4.3MB · 390px 로드 4.8초 · pageerror 0 · 첫 클립 디코드 17.6초 정상.
# ★실청은 «무슨 말인지·어조가 맞는지»를 듣는 자리다. 당일 나가는 소리는 assets/audio 원본이고
#   이 판은 그걸 검수하려고 줄여 담은 사본이다. 더 곱게 들어야 하면 --kbps 로 올린다.
# ★[STAMP_TONE 2026-08-26 실측] 지문이 «귀에 들리는 것 전부»를 세는지 — 어조 재료까지.
#   실제로 샜다: 어조 186개를 심었는데 지문이 9f7b3c6d 로 안 바뀌어 옛 판정이 딸려 왔다.
#   내가 만든 검사가 내가 만든 자리에서 새는 것을 실물로 보고 고쳤다.
#   실측: 어조 있음 e17caa93 · 없음 833048dc · 되돌리면 e17caa93.
# ★[EMPTY_IS_OK 2026-08-26 실측] 「없는 것이 정답인」 경우를 실패로 세지 않는다.
#   재더빙 대기가 0이면 붙여넣기 파일은 «일부러» 지운다. 그런데 build-dub-onefile 이 그 상태를
#   「원천 생성기를 먼저 돌릴 것」이라 붉혔다 — 돌려도 안 생기니 끝나지 않는 고리였다.
#   명단에 클립이 있는데 붙여넣기가 없을 때만 붉힌다.
chk 'EMPTY_IS_OK' scripts/build-dub-onefile.mjs 1
# ★[COPY_MOBILE 2026-08-26] 폰에서 복사 — navigator.clipboard 먼저, 실패하면 execCommand, 둘 다 막히면 «막혔다»고 적는다.
#   ★안 된 것을 됐다고 하지 않는다. 사람은 붙여넣기가 빌 때까지 모른다.
#   실측(iPhone 13 에뮬·터치): 세 갈래 다 옳게 갈림. 단 iOS Safari 실물은 여기서 못 잰다 — 그래서 안전판을 깐 것이다.
# ── [SOUND_OUT_OF_JS · SHOW_THE_CRASH 2026-08-26 사용자 실물(폰 스크린샷)] ──
# 폰에서 판정줄·탭·목록·안내칸이 전부 비었다 — 그 자리는 모두 스크립트가 채우는 곳이다.
# 즉 화면 폭이 아니라 **스크립트가 시작을 못 한 것**(헤드리스 390px 는 멀쩡했다).
# 범인은 «var AO = { …6.5MB base64… }» — 브라우저가 통째로 파싱해 문자열 300여 개를 만든다.
# ★소리를 줄이지 않고 JS «밖»으로 뺐다: script type=text/plain 283개 · 누를 때 하나만 읽는다.
#   실측 로드 6.0초 → 3.1초 · 재생 정상(17.6·3.7·2.7초) · 소리 품질 그대로(어조 판정용이라 안 뭉갠다).
# ★그리고 죽으면 화면이 말한다 — 이번엔 사용자가 알려 줄 때까지 아무도 몰랐다.
chk 'SOUND_OUT_OF_JS' scripts/build-listen-all.mjs 5
# ★[JS_BLOCKED_SAY 2026-08-26 사용자 실물 두 번] 스크립트가 «아예 안 도는» 경우를 화면이 말한다.
#   단서: 목록도 탭도 안 뜨는데 window.onerror 배너까지 비어 있었다 — 죽은 게 아니라 시작을 못 한 것.
#   앱 내장 미리보기가 스크립트를 막는다(정적 HTML 은 멀쩡히 그려졌다). 무게 문제가 아니었다.
#   ★안내를 «정적 HTML»로 박아 둔다 — 스크립트가 돌면 sayCanDo 가 덮고, 안 돌면 그 글이 남는다.
#   실측: JS 켜짐 → 「97클립 …」으로 덮임 / JS 꺼짐 → 「앱이 스크립트를 막은 것입니다」 그대로.
# ── [LISTEN_WEB 2026-08-26 사용자 실물 세 번] 소리를 «주소로» 부른다 — 파일에 박지 않는다 ──
# 폰에서 세 번 안 열렸다. 원인은 앱 내장 미리보기가 스크립트를 막는 것이고,
# 파일을 손으로 주고받는 한 못 고친다. **파일이 아니라 길이 잘못된 것**이었다.
# ★이 저장소는 이미 내부 검수 페이지를 배포한다(audio-review-tone.html) · assets/audio/**.mp3 도 배포된다.
#   그러면 base64 로 박을 이유가 없다 — 판이 6.6MB → **105K** 가 되고 사파리로 주소만 열면 된다.
# ★--embed 는 남긴다: 인터넷 없이 손에 쥐여 줘야 할 때(코워크 전달)가 있다. 쓰임이 다르다.
# ★어조 mp3 186개를 assets/audio/tone/ 에 넣었다(2.0MB) — 재료가 또 사라지는 것도 함께 막는다
#   (_dub_stage 가 gitignore 라 코워크 컨테이너와 함께 날아간 적이 있다).
# 실측(iPhone13 에뮬·http 서빙): 클립 160 · 문장 495 · 「소리없음」 0 · 주소 재생 17.6/3.7/2.7초.
# ★[LISTEN_URL 2026-08-26] 실청판을 **주소로** 연다 — listen-075c9ad62acf.html
#   폰 앱 미리보기가 스크립트를 막아 파일 전달로는 못 쓴다(세 번 실패). 사이트에서 열면 그 문제가 없다.
#   ★주소를 어렵게 둔다 — 검색 차단(noindex)에 더해, 아는 사람만 열도록.
#   ★소리는 assets/audio/{narration,cast,tone}/ 에서 받는다 — 판 자체는 105K 다.
chk 'listen-075c9ad62acf.html' automation/tests/merge-guard.sh 1
chk 'LISTEN_WEB' scripts/build-listen-all.mjs 3
chk 'SRCMAP' scripts/build-listen-all.mjs 3
chk 'assets/audio/tone' scripts/build-listen-all.mjs 1
chk 'JS_BLOCKED_SAY' scripts/build-listen-all.mjs 1
chk '브라우저로 열어 주세요' scripts/build-listen-all.mjs 1
nochk 'if (AO\[c.id\]) oldOK' scripts/build-listen-all.mjs
chk 'SHOW_THE_CRASH' scripts/build-listen-all.mjs 1
chk 'function sndOf' scripts/build-listen-all.mjs 1
nochk 'AO\[id\]' scripts/build-listen-all.mjs
chk 'COPY_MOBILE' scripts/build-listen-all.mjs 1
chk 'navigator.clipboard' scripts/build-listen-all.mjs 2
nochk "o.select(); try { document.execCommand('copy'); alert('복사했습니다.'); }" scripts/build-listen-all.mjs
chk 'STAMP_TONE' scripts/build-listen-all.mjs 1
chk 'LISTEN_LIGHT' scripts/build-listen-all.mjs 1
chk "arg('--kbps'" scripts/build-listen-all.mjs 1
nochk "'-ar', '32000'" scripts/build-listen-all.mjs
chk 'LISTEN_WHY' scripts/build-listen-all.mjs 8
chk 'LISTEN_SPLIT' scripts/build-listen-all.mjs 3
chk 'function whyBox' scripts/build-listen-all.mjs 1
chk '왜 다시' scripts/build-listen-all.mjs 3
chk 'NO_SOUND_SAY' scripts/build-listen-all.mjs 3
chk 'function hasSnd' scripts/build-listen-all.mjs 1
chk 'function sayCanDo' scripts/build-listen-all.mjs 1
nochk "canPlay ? '<button class=\"btn sm play\"" scripts/build-listen-all.mjs   # ★소리 유무를 안 보고 버튼 내밀던 옛 줄
chk 'LISTEN_KEY_STAMP' scripts/build-listen-all.mjs 4
chk 'me_listen_all_\${STAMP}' scripts/build-listen-all.mjs 1
nochk "var KEY = 'me_listen_all_v1'" scripts/build-listen-all.mjs   # ★고정 열쇠 복원 금지 — 코드 모양으로 잡는다
chk 'LISTEN_KEEP' .github/workflows/nightly-screen.yml 1
chk 'upload-artifact' .github/workflows/nightly-screen.yml 1
chk 'name: 실청_전체' .github/workflows/nightly-screen.yml 1
# ★★[FFMPEG_HERE · LISTEN_HAS_SOUND 2026-08-16 · 코워크가 잡은 것] 이 잡에 ffmpeg 이 없었다.
#   --embed 가 rc1 로 죽어 **파일을 안 썼고**, 그래서 내가 붙인 artifact 는 올릴 것이 없어
#   «조용히 아무것도 안 남기고» 있었다. 「붉어도 남긴다」고 적어 놨는데 남길 게 없었다.
#   ★그리고 올리기 전에 소리를 «센다» — 「없으면 조용히 안 올리기」는 이 저장소가 네 번 앓은 병이다.
#     정상 283개 · 100 미만이면 속 빈 판이라 붉힌다. 실측: 파일 없음도 소리 0도 둘 다 rc=1.
chk 'FFMPEG_HERE' .github/workflows/nightly-screen.yml 1
chk 'apt-get install -y ffmpeg' .github/workflows/nightly-screen.yml 1
chk 'LISTEN_HAS_SOUND' .github/workflows/nightly-screen.yml 1
chk 'data:audio/mpeg' .github/workflows/nightly-screen.yml 1
# ★★[NUM_FROM_HERE 2026-08-16] 기대값을 **리터럴로 박지 않는다.**
#   첫 판은 「정상 283」이라 적었다가 CI 에서 97 이 나와 붉었다. 283 은 코워크의 «로컬» 수치다 —
#   어조 186문장은 _dub_stage 에서 오는데 그 폴더는 .gitignore 라 CI 에는 아예 없다(STAGE_ABSENT 와 같은 병).
#   ★한 곳에서 잰 수를 다른 곳에 단언한 것이다. 그래서 기대값을 «만든 쪽이 스스로 적은 수»에서 읽는다.
#   자가검사 4종 실측 — CI값(97/0/97) 통과 · 코워크 로컬값(97/186/283) 통과
#                      말한 수 ≠ 박힌 수 rc1 · 클립 0개 rc1
chk 'NUM_FROM_HERE' .github/workflows/nightly-screen.yml 1
chk 'BUILD_SAYS' .github/workflows/nightly-screen.yml 1
chk '실청_빌드.log' .github/workflows/nightly-screen.yml 4
# ★리터럴 기대값 복원 금지 — 잰 자리와 단언한 자리가 달랐다.
# ★[NOCHK_SHAPE] 이름('정상 283')이 아니라 **코드 모양**을 잡는다 — 처음엔 이름으로 잡았다가
#   바로 위 «내가 왜 틀렸는지» 설명 주석을 스스로 물었다(자가덫 8번째). 설명은 남아야 하고 코드는 안 된다.
nochk '"$n" -ge 100' .github/workflows/nightly-screen.yml
# [EXTRA_ENABLE_ALL] 한 자리에 값이 여럿이면 전부 켠다 — valley 를 wine 만 켜서
# 18_narr-valley-cake 가 대조에서 통째로 빠져 있었다(대조 자리 69 → 70).
chk 'EXTRA_ENABLE_ALL' scripts/check-text-audio.mjs 1
# ── ★★[ASR_TRUTH] 소리를 «받아 적어» 대장과 맞댄다 (2026-08-16 사용자 지시) ──
# *"지금 실제 멘트랑 적혀있는 나레이션 문구랑 안 맞는게 많아 점검해봐"*
# 그 시점 모든 검사가 초록이었다 — check-text-audio 70곳 어긋남 0 · check-audio-sents 91클립 문장 수 맞음.
# ★원인: _recorded.json 의 **첫 값이 그 시점 manifest 복사본**이라 옛 클립은 A=A 였다.
#   RECORDED_TRUTH·NOAUDIO_REAL·CONSOLE_TEXT 에 이어 네 번째다. 앞의 셋은 «대조 대상을 넓혀» 고쳤는데,
#   넓히는 것으로는 안 낫는다 — **한쪽 끝이 실물에 닿아 있지 않으면** 글의 세계 안에서만 맴돈다.
# 실측 8클립이 어긋나 있었다(13·15·26·12 는 옛 문안 그대로 · 27·28·29 는 마지막 문장 없음).
chk 'ASR_TRUTH' scripts/check-audio-text.mjs 1
chk 'ASR_TRUTH' scripts/audit/asr-transcribe.py 1
chk 'IN_ORDER_COVER' scripts/audit/asr-transcribe.py 1
chk 'IN_ORDER_COVER' scripts/check-audio-text.mjs 1
chk 'rev' scripts/check-audio-text.mjs 3          # 대본에 «없는 말»이 붙은 자리도 본다(12_narr-welcome-out)
chk 'check-audio-text' .github/workflows/nightly-screen.yml 1
# [WINE_RETIRED 2026-08-16] valley 를 훑을 이유가 사라졌다(팔레트에서 뺐다) — 대신 **뺐다는 사실**을 못박는다.
chk 'WINE_RETIRED' scripts/check-text-audio.mjs 1
chk 'WINE_RETIRED' assets/ritual-cue.js 3
chk 'WINE_RETIRED' order-preview.html 2
# ★팔레트(GADD)에만 못 박는다 — OFFKEY·_PAL_COST 의 valley:1 은 옛 초안 처리용이라 남는다.
nochk "GADD={welcome:1,bless:1,valley:1" order-preview.html
chk 'GAP_MATCH' scripts/lib/sent-bounds.mjs 1
chk 'RATE_VETO' scripts/lib/sent-bounds.mjs 1
# [ONLINE_ALREADY_ENDED] 배웅에서 온라인을 갈라 말하지 않는다 — 라이브는 온라인 인사에서 끝난다
chk 'ONLINE_ALREADY_ENDED' assets/ritual-cue.js 2
# [MIC_PIN 2026-08-16] 주인공=핀 · 하객(혼주 포함)=핸드. 「마이크가 전해지면」은 핸드를 건네는 그림이라
#   신랑·신부 자리에서 지웠다. 부모님(bless) 자리는 그대로 둔다 — 혼주는 건네받는 것이 맞다.
chk 'MIC_PIN' docs/plans/식순연구/개편_진행판.md 1
nochk '마이크가 전해지면, 편하게' assets/ritual-data.js
nochk '마이크가 전해지면, 편하게' order-preview.html
chk '마이크가 전해지면, 편히' assets/ritual-data.js 2
nochk "S.digital ? 'end-1b-farewell-online'" assets/ritual-cue.js
chk 'SELF_PARSE' scripts/build-listen-all.mjs 1
chk 'EXPORT_TRUTH' scripts/build-listen-all.mjs 1
chk 'USE_EXISTING' scripts/build-listen-tone.mjs 1
chk 'FOOT_CLEAR' scripts/build-listen-tone.mjs 1
chk 'LISTEN_TONE' audio-review-tone.html 1
if command -v node >/dev/null 2>&1; then node scripts/build-listen-tone.mjs >/dev/null || fail=1; fi
if command -v node >/dev/null 2>&1; then node scripts/build-dub-onefile.mjs || fail=1; fi

# [GAP_TRUTH] manifest 지시값(0.4/0.45) ≠ 실측(0.23/0.50). 새 클립을 지시값으로 재면 기존 82개가 다 붉는다.
chk 'GAP_TRUTH' scripts/audit/gap-profile.mjs 1

# ── [CX_AUDIT] 고객 눈 점검 — 코워크가 화면을 걷고 코드가 데이터를 훑은 합본 ──
# ★§7-3: 사이 순서(valley)는 사용자 지시로 제거 대상이다. 어조·더빙을 붙이지 말 것.
chk 'CX_AUDIT' docs/plans/대본개정/60_고객눈_점검.md 1
chk '제거 대상이다' docs/plans/대본개정/60_고객눈_점검.md 1
# [TONE_DUB 60] 구 어조38_* 는 지웠다 — 두 벌이 남으면 사람이 38벌짜리를 붙여넣고 22벌을 빠뜨린다
nochk '어조38_붙여넣기' scripts/build-tone-dub.mjs
chk 'NARV_DUB' scripts/build-tone-dub.mjs 1

# ── [CX_FIX 2026-08-15] 고객 눈 점검 3건을 화면에 반영 — 되돌리지 말 것 ──
# ①표적 40px: `.minitl` 여백을 레일 min-height 로 옮겼다. 여백을 스트립에 되돌리면 표적이 23px 로 돌아간다
#   (레일 콘텐츠 상자가 줄어 align-self:stretch 가 무력해진다 — 실측으로 한 번 밟은 함정이다)
# ②레일 끝 흐림: 넘칠 때만 건다(data-edge) · ③나가기 판 '취소'는 보이는 버튼(폰엔 Esc 가 없다)
chk 'MTL_TAP40' order-preview.html 2
chk 'MTL_EDGE' order-preview.html 2
chk 'EXIT_CANCEL' order-preview.html 3
chk 'align-self:stretch' order-preview.html 1
chk 'min-height:40px' order-preview.html 1
chk 'oa-cancel' order-preview.html 1
# [ASK_FOCUS_BOX 2026-08-15 사용자 실기기 제보] 판 첫 포커스는 버튼이 아니라 판 자체 —
#   버튼에 주면 스크립트 포커스가 :focus-visible 을 켜서 폰에서도 씰색 테두리가 그려진다(위계 역전)
chk 'ASK_FOCUS_BOX' order-preview.html 2
chk 'oa-box:focus' order-preview.html 1

# ── ★[SIM_ALIVE 2026-08-15 점검] 순서 엔진 시뮬레이터가 **조용히 죽지 않게** ──
# 왜 이제야 만드나: ritual-order-sim.mjs 의 DECL_SHAPE 주석이 2026-08-10 에
#   「아무도 못 본 이유는 게이트가 없어서다」라고 적어 뒀는데, 게이트를 안 만들었다.
#   나흘 뒤 876adff9(ORD_ADD_ALL)가 defaultOrd 에 paletteCand() 를 넣으면서 같은 일이 또 났고
#   세 도구가 함께 죽은 채 하루가 지났다. 이번엔 게이트를 만든다.
# 이 셋은 브라우저가 필요 없고 합쳐 2초다(실측 219+928+732ms) — 게이트에 얹어도 싸다.
#   order-audio-check 는 브라우저가 필요해 여기 안 넣는다(render-check 와 같은 이유).
#   대신 그 검사가 폐지된 openRehearse 를 부르던 자리에 REHEARSE_GONE 마커를 남겨 물린다.
if command -v node >/dev/null 2>&1; then
  for _s in ritual-order-sim ritual-guard-scan ritual-order-sim-audit; do
    if node "scripts/audit/$_s.mjs" >/dev/null 2>&1; then echo "ok scripts/audit/$_s.mjs: 엔진이 선다"
    else echo "REVERT? scripts/audit/$_s.mjs 가 죽었다 — 순서 엔진 심볼이 바뀌었으면 DECLS 를 같은 커밋에서 갱신할 것"; fail=1; fi
  done
fi
chk 'PALETTE_MISSING' scripts/audit/ritual-order-sim.mjs 1
chk 'REHEARSE_GONE' scripts/audit/order-audio-check.mjs 1
# [HINT_RETIRED] preview-entry 가 폐지된 「미리듣기 아래 한 줄」을 요구하다 사흘 붉었다.
#   이제 그 자리가 비어 있는지를(단추 셋 한 덩어리) 본다 — 멘트를 되살리면 그 검사가 붉어진다.
chk 'HINT_RETIRED' scripts/audit/preview-entry.mjs 1
chk 'DONE_TAIL_QUIET' order-preview.html 1

# ── [MP_NX_AA · MP_TAP44 2026-08-15 디자이너 점검] 마이페이지 11단계 실측 반영 ──
# NEXT 레일: opacity 이중 감광(기본 .72 × 행별 ×0.5)이 첫 항목 3.61:1 · 꼬리 2.03:1 을 만들었다.
#   원근은 색 계단(.nx-far → --light 4.74:1)이 낸다 — opacity 계단으로 되돌리면 AA 아래로 뚫린다.
chk 'MP_NX_AA' mypage.html 2
chk 'nx-far' mypage.html 3
nochk "1-_ni" mypage.html
# 설문 칩 39→44 · 결과물 행 버튼은 ::after 로 손가락 자리만 44
chk 'MP_TAP44' mypage.html 2
# [SV_NOW_HONEST] 후기 NOW 의 시간 약속('잠깐이면') 금지 — 11문항 앞에서 거짓 안심이 된다(2026-07-15 규칙)
chk 'SV_NOW_HONEST' mypage.html 1
nochk '잠깐이면 끝나요' mypage.html
# [SV_MISS_AT 2026-08-15 실클릭 점검] 빈 제출 안내가 스크롤 도착 화면 밖(top 1133/vh 844)이었다 —
#   그 문항 바로 위에 인라인 안내를 세운다(실측 top 392 · 칩 고르면 걷힘). 되돌리면 안내가 다시 안 보인다
chk 'SV_MISS_AT' mypage.html 3
chk 'srv-miss-note' mypage.html 4
# [SIG_FOCUS · ADV_FOCUS 2026-08-15 실클릭 점검] 서명 모달·상담 패널이 열릴 때 포커스가 판 안으로.
#   서명 모달의 Esc·바깥클릭 닫기 부재는 의도(그리던 서명 보호) — '비일관 정리'로 달지 말 것
chk 'SIG_FOCUS' mypage.html 1
chk 'ADV_FOCUS' assets/advisor-widget.js 1
# [WIZ_BASE_AFTER 2026-08-15 실클릭 점검] inv·trk 기준선은 첫 렌더 **뒤** — 앞이면 프리필이 전부 '변경'이 되어
#   갓 열고 안 건드려도 나가기 판이 뜬다(실사고 · 좌석/사진/스냅은 모델 기반이라 무사)
chk 'WIZ_BASE_AFTER' mypage.html 2
# [WIZ_SAVE_AA] '저장됨' 은 opacity 흐림(2.31:1)이 아니라 색(--light 4.74:1)으로
chk 'WIZ_SAVE_AA' mypage.html 1

# ── [SCALE_LOCK 2026-08-15 사용자 지시 "손님이 늘 때 수정할 시간 없어 · 지금 모든 준비"] ──
# ①잠금 대기 초과가 나면 관리자 메일(하루 1통·누적 집계) — 규모 신호를 기계가 센다
# ②로그 appendRow 는 _lockedAppend 로 — 동시 기록 행 충돌 차단(3초 못 잡으면 그냥 쓴다)
# ③환불 계좌: 확인→쓰기 잠금 안 · 알림은 잠금 밖  ④취소 경로 무잠금은 '판단'이다(주석 참고) — 잠그면 개악
chk 'SCALE_LOCK' automation/platform/95_notify.gs 1
chk 'lockBusySignal' automation/platform/95_notify.gs 1
chk '_lockedAppend' automation/platform/95_notify.gs 1
chk '_lockedAppend' automation/consultation/consultation-booking.gs 4
chk '_lockedAppend' automation/platform/96_ai_cost.gs 1
chk 'SCALE_LOCK' automation/platform/70_journey.gs 1
chk 'SCALE_LOCK 판단' automation/consultation/consultation-booking.gs 1
# [DATA_ROUNDTRIP 2026-08-15] 저장 왕복 무손실 게이트 — 고객 저장 → 셀 → 재조회 → 관리자 상세가 같은 값.
#   진짜 핸들러 호출(모의 GAS 세계 · 브라우저 불필요 · ~1초). 저장·연동이 갈라지면 푸시 전에 붉어진다
if command -v node >/dev/null 2>&1; then
  if node scripts/audit/data-roundtrip.mjs >/dev/null 2>&1; then echo "ok scripts/audit/data-roundtrip.mjs: 왕복 무손실"
  else echo "REVERT? scripts/audit/data-roundtrip.mjs 가 붉다 — 저장 왕복 어딘가에서 값이 갈라졌다"; fail=1; fi
fi
chk 'DATA_ROUNDTRIP' scripts/audit/data-roundtrip.mjs 1
# [ADV_CLOSED 2026-08-15] 코워크 돌연변이 4건을 전수화로 메움 — 표본 하나로 되돌리지 말 것
chk 'RT_ALLTRACK' scripts/audit/data-roundtrip.mjs 3
chk 'RT_REVIEW' scripts/audit/data-roundtrip.mjs 2
chk 'RT_DROPCOL' scripts/audit/data-roundtrip.mjs 3
chk 'WORLD_DROPCOL' scripts/audit/_gasworld.mjs 1
chk 'ADV_AUDIT' docs/plans/대본개정/62_적대적점검.md 1
chk 'ADV_CLOSED' docs/plans/대본개정/62_적대적점검.md 1
# [ADV_ROUND2 2026-08-15] 2바퀴 — 돌연변이 0 · 실버그 1건(컷 제출 8000자 vs 400개 캡 불일치)
#   7-1 은 같은 날 [PICK_NO_SILENT] 로 수리됨 — 문서(§7·§8)가 사라지면 근거가 사라진다.
chk 'ADV_ROUND2' docs/plans/대본개정/62_적대적점검.md 1
# [ADV_ROUND3 2026-08-15] 3바퀴 — 시드 3/4 · 새 구멍 2건(둘 다 **아직 안 고침**)
#   9-2 모의 세계가 예약 시트 컬럼 32개를 모른다(WORLD_DROPCOL 의 쌍둥이)
#   9-3 400 캡 vs 20,000자 캡이 여전히 짝이 아니다 — 이름 28자면 333장에서 막힌다
chk 'ADV_ROUND3' docs/plans/대본개정/62_적대적점검.md 1
# [ADV_ROUND4 2026-08-15] 4바퀴 — 수리 셋 튼튼 · §10-3 정정문에 구멍 1건(**아직 안 고침**)
#   11-2 갤러리 경로: _gnm 이 공백·중점·전각쉼표를 안 지워 한 항목이 두 토큰이 된다
#        → 선택수 부풀림 → 추가보정 견적 기본값이 위로 틀린다(20,000원/컷)
chk 'ADV_ROUND4' docs/plans/대본개정/62_적대적점검.md 1
chk '갤러리 경로에서 갈린다' docs/plans/대본개정/62_적대적점검.md 1
chk 'WORLD_BOOKING' docs/plans/대본개정/62_적대적점검.md 1
chk '400개 캡과 세트' docs/plans/대본개정/62_적대적점검.md 1
# [PICK_NO_SILENT 2026-08-15] 7-1 수리 — 상한(컷 400 · 20,000자 · 추가보정 500)은 자르지 않고 거부.
#   절단 코드 모양이 되살아나면 164개부터 무증상 유실로 돌아간다(nochk 는 그 코드 모양을 겨눈다).
chk 'PICK_NO_SILENT' automation/platform/80_production.gs 3
chk 'PICK_NO_SILENT' mypage.html 1
chk 'RT_PICKS' scripts/audit/data-roundtrip.mjs 6
nochk 'picks.slice(0, 8000)' automation/platform/80_production.gs
nochk 'qty = 500' automation/platform/80_production.gs
# [MP_LOCK_EVEN 2026-08-15] 마이페이지 NEXT 자물쇠 = 전 행 같은 톤(원근은 글자 색 계단이 낸다).
#   자물쇠에 opacity 계단을 다시 실으면 먼 행이 2.21:1 로 떨어져 '고르지 않다'로 읽힌다.
chk 'MP_LOCK_EVEN' mypage.html 1
nochk 'nx-far .lock{opacity' mypage.html
# [GUEST_PC_FOOT 2026-08-15] PC 진행 콘솔 — 다음·그다음을 '다음 순서로' 바로 위로(세로 한 줄).
#   오른쪽 칸으로 되돌리지 말 것 — 두 줄짜리 목록이 폭 절반을 먹고 버튼과 대각선으로 갈린다.
chk 'GUEST_PC_FOOT' console.html 1
nochk 'grid-template-columns:1.6fr 1fr;gap:28px' console.html
# [GUEST_PC_BAL 2026-08-15] 한 기둥(카드·레일·바 같은 폭) + 주 버튼 비중 · 아이콘 SVG.
#   실측 근거: 세 버튼이 96/96/116 이던 360px 에서 주 버튼 38% → 글자 접어 64%.
chk 'GUEST_PC_BAL' console.html 6
chk '{--col:720px}' console.html 1
# [GUEST_PAUSE 2026-08-15] 미리듣기 멈춤·이어듣기 — 그 자리에 서고 그 지점부터 잇는다.
#   '길게 눌러 전체 정지'와 다른 문이다(그건 끝내는 문). 지우면 미리듣기에 멈출 자리가 없어진다.
chk 'GUEST_PAUSE' console.html 6
chk 'gPause' console.html 3
# [ADV_ROUND3 2026-08-15] 3바퀴 — 시드 3/4 · 새 구멍 2건(둘 다 같은 날 메움)
#   9-3 → [PICK_CAP_PAIR] 상한을 곱셈으로 묶음 · 9-2 → [WORLD_BOOKING] 시트마다 제 헤더
chk 'ADV_ROUND3' docs/plans/대본개정/62_적대적점검.md 1
chk 'PICK_CAP_PAIR' automation/platform/80_production.gs 1
chk 'PICK_CAP_PAIR' scripts/audit/data-roundtrip.mjs 3
chk 'PICK_TEXT_CAP' automation/platform/80_production.gs 2
nochk 'picks.length > 20000' automation/platform/80_production.gs
chk 'WORLD_BOOKING' scripts/audit/_gasworld.mjs 3
chk 'WORLD_BOOKING' scripts/audit/data-roundtrip.mjs 4
# [PICK_SEP_ONE 2026-08-15] 4바퀴 11-2 — 이름 씻는 집합 = 토큰 쪼개는 집합.
#   갈리면 선택수가 부풀고 그 수가 추가보정 견적 기본값(컷당 2만원)을 만든다(돈이 틀린다).
chk 'PICK_SEP_ONE' automation/platform/80_production.gs 3
chk 'PICK_SEP_ONE' scripts/audit/data-roundtrip.mjs 4
chk 'PICK_NAME_BAD' automation/platform/80_production.gs 2
nochk 'replace(/[(),]/g' automation/platform/80_production.gs
# [STAGE_ABSENT 2026-08-15] 실청 화면 대조는 wav 폴더(_dub_stage · 44MB · gitignore)가 없어도 돌아야 한다.
#   없으면 실측이 비어 생성물이 커밋본과 반드시 달라진다 → 전엔 wav 가진 사람 말고는 게이트를 못 지나갔고,
#   --write 로 '고치면' 커밋된 실측 186개가 지워졌다. 구조만 대조 + --write 차단으로 그 창을 닫는다.
chk 'STAGE_ABSENT' scripts/build-listen-tone.mjs 2
chk '실측(_dub_stage)이 없는 곳에서는 --write 를 막는다' scripts/build-listen-tone.mjs 1
# [PRICE_KIND_NEW 2026-08-15] 인상 때 «신가»가 이름을 잃는 자리 둘 — 게이트도 화면도 안 보던 곳.
#   ①계약서 요약 '평일 기준' 라벨에 250 이 빠져 신가만 빈칸(구가는 붙는 역전) ②관리자 요일 자동전환
#   NEW 가 240 을 신가로 들고 있어 250 을 고르면 전환이 조용히 멈춤(gen=null).
chk 'PRICE_KIND_NEW' contract/v1-1.html 1
chk 'PRICE_KIND_NEW' admin.html 1
chk 'amt===2500000' contract/v1-1.html 1
chk 'var GENS=' admin.html 1
nochk "var NEW=\['3300000','2400000'\]" admin.html
if command -v node >/dev/null 2>&1; then node scripts/audit/price-gen-switch.mjs >/dev/null || fail=1; fi
# [CHK_DASH_SAFE 2026-08-15] chk·nochk 의 `-e … --` 를 지우지 말 것 — 대시로 시작하는 패턴이
#   grep 의 옵션으로 먹혀 파일 인자를 잃고 stdin 을 기다린다. 붉게 지는 게 아니라 **매달린다**
#   (실측 10분+ · CI 면 타임아웃까지). 아래 개수엔 이 검사 줄 자신도 포함된다(자기 세기).
chk 'CHK_DASH_SAFE' automation/tests/merge-guard.sh 2
chk 'grep -c -e "$1" --' automation/tests/merge-guard.sh 3
# [PRICE_LABEL_VALUE 2026-08-16] 드롭다운은 value 와 라벨이 한 쌍이다 — 어긋나면 고른 사람이 본 금액과
#   계약서 금액이 달라진다(실사고: value 2500000 인데 라벨 「240만」). 세대 라벨도 값과 같이 적는다.
chk 'PRICE_LABEL_VALUE' automation/admin/Admin.html 1
chk 'value="2500000">평일 — 250만' automation/admin/Admin.html 1
chk 'value="2400000">평일 — 240만' automation/admin/Admin.html 1
# [PRICE_OLD_TWO 2026-08-16] 구가가 둘이라 240 도 훑는다 — 안 훑으면 메타·AI 지식이 옛 금액으로 남는다.
chk 'PRICE_OLD_TWO' scripts/check-price-sync.mjs 1
chk '2800000, 2100000, 2400000' scripts/check-price-sync.mjs 1
nochk '240만' api/_kb.js
nochk '240만' assets/advisor-kb.js
# [NEW_TONE_PLAY 2026-08-16] 새 어조 문장에도 듣기 단추가 붙는다 — 소리를 다 심어 놓고 174문장에
#   단추가 없어 못 듣던 실사고(ops 의 인자 이름이 playUrl 이라 null 을 넘겼다). 이름을 canPlay 로.
chk 'NEW_TONE_PLAY' scripts/build-listen-all.mjs 1
nochk ': ops(k, null))' scripts/build-listen-all.mjs   # ★모양으로 겨눈다(이름만 쓰면 설명 주석을 문다)
# [DINING_NOT_INCLUDED 2026-08-16 사용자 지적 "우리는 다이닝 별도인데 틀린정보가 있네"]
#   계약 제3조② — '을'은 소개·조율만 하고 식사비는 파트너사 직결제다. 「견적에 포함」으로 쓰지 말 것.
#   실사고: 핵심 구성 카드와 JSON-LD 상품설명 2곳이 「다이닝 포함」·「하나의 견적에」라 계약과 정면 충돌.
nochk '다이닝 포함' index.html
nochk '다이닝을 하나의 견적' index.html
chk '다이닝 식사비는 파트너사 직접 결제' index.html 2
# [CORE_TRIM 2026-08-16] 핵심 구성 3칸은 위 REALITY 3칸(본문 37~39자)과 호흡을 맞춘다(전 86~97자).
chk '140분, 또렷이 남도록 설계한 호흡입니다' index.html 1
# [CORE_PRICE_LINK 2026-08-16 사용자 결정] 금액 자리를 가격 섹션(#invest)으로 가는 링크로.
#   ★금액을 카드에서 빼지 말 것 — 700px 위 「Hidden Costs」의 즉답 자리다(index.html 주석 참조).
#   ★[ROW_EVEN] 링크를 **별도 줄**로 빼지 말 것 — 가운데 칸만 길어져 세 칸 아랫변이 61px 어긋났다.
#     문장 속 인라인이어야 한다(그래서 문구는 3줄 원문 그대로 유지된다).
#   ★마커는 주석에도 실리는 산문이 아니라 **마크업**을 잡는다 — 문구만 세면 본문을 지우고 주석만
#     남겨도 초록이 된다. 링크는 클래스+목적지를 함께 봐야 '어디로 가는 입구'인지가 지켜진다.
chk '그 밖은 미리 밝힙니다' index.html 1
chk 'class="core-price-link" href="#invest"' index.html 1
# [JOURNAL_ROW_EVEN 2026-08-16] 에세이 두 칸의 구분선·READ 는 본문이 남는 세로를 먹어 바닥에 선다.
#   ★.journal-card-btn 의 margin-top:auto 는 5,700줄 뒤 탭 타깃 규칙(margin-top:-16px)에 덮여 죽어 있다 —
#     되살리지 말고 이 규칙을 쓸 것(되살리면 펼친 상태 간격이 16px 벌어진다).
# [ESSAY_CLOSE_ANCHOR 2026-08-16] CLOSE 때 카드가 화면 위로 783px 벗어나던 것 — 스크롤 보정 + 되돌아오기.
chk 'ESSAY_CLOSE_ANCHOR' index.html 1
chk '_essayJump' index.html 2
# [GUEST_DIM_AA 2026-08-16] 고객 미리듣기의 --dim 은 브랜드 텍스트 하한선(#75705F · 4.74:1)이다.
#   ★디렉터 스킨의 #8A8478 을 다시 옮겨 오지 말 것 — 밝은 바탕에서 3.55:1 로 떨어져 axe 8곳이 잡혔던 값이다.
#   ★끝 화면 부제의 opacity 도 되살리지 말 것(회색 버튼 위에서 3.34:1). 위계는 크기·굵기가 낸다.
chk '--dim:#75705F' console.html 1
chk 'body.guest .main.wait small{opacity:1}' console.html 1
# [PREVIEW_SOUND_CUE 2026-08-16] 누르면 소리가 난다는 사실을 먼저 말한다(이어폰·무음 스위치).
chk '폰이 무음이면 들리지 않아요' console.html 1
# [GUEST_HONORIFIC 2026-08-16] 고객 설명문의 호칭은 보이스 가이드대로 「하객분들」이다(CLAUDE.md H6).
#   ★같은 예식 장면에서 장면 지문은 '하객분들께'인데 대목 설명은 '하객에게'로 갈려 있었다 —
#     BLOCK_FX 로 fx 가 고객 화면에 자주 뜨게 된 뒤로는 한 화면에서 둘이 부딪친다.
#   ★원천과 사본 두 곳을 함께 본다. 한쪽만 고치면 조용히 갈라지는 자리다.
chk '하객분들께 직접 감사 인사를 전해요' assets/ritual-data.js 4
chk '하객분들께 직접 감사 인사를 전해요' order-preview.html 4
nochk '하객에게 직접 감사 인사' assets/ritual-data.js
nochk '하객에게 직접 감사 인사' order-preview.html
#   ★mypage 표시 문구도 같은 기준(좌석 공개 질문·다이닝 노출 토글). 실렌더로 확인하고 넣었다 —
#     startSeatFlow·startTrkFlow 로 그 화면을 직접 띄울 수 있다(scripts/audit/page-probe.mjs).
#   ★단, 계약 동의문 「하객에게는 안내 음성과 식순지…」는 **그대로 둔다** —
#     contract/v1-1.html 및 서명 완료된 보존본(archive/v1-6·v1-7)과 글자 그대로 대조되는 문장이다.
chk '하객분들께 어떻게 보여드릴까요' mypage.html 1
chk '하객분들께도 보여주기' mypage.html 3
chk '하객에게는 안내 음성과 식순지' mypage.html 1
# [PAID_STAGE_RESYNC 2026-08-16 사용자 신고 "강제변경으로 돌린 뒤 더 이상 진행이 안 된다"]
#   ROLLBACK_KEEP_PAID(수납 보존) + 입금확인 already 조기반환 + 되돌리기 24시간 가드가 겹쳐
#   계약완료에 갇히는 막다른 길이 있었다. 수납이 확인된 고객이 그 앞 단계에 서 있으면
#   **돈은 그대로 두고 단계만** 입금완료로 맞춘다(서버) + 그 버튼을 화면에 낸다(관리자).
#   ★지우지 말 것 — 지우면 강제변경으로 되돌린 고객이 다시 앞으로 갈 문을 잃는다.
chk 'PAID_STAGE_RESYNC' automation/admin/admin.gs 1
chk 'PAID_STAGE_RESYNC' automation/admin/Admin.html 1
chk '단계 맞추기 · 입금완료로' automation/admin/Admin.html 1
# ── [SEAT_ONE_CARD · ALC_ONE 2026-08-16 사용자 지시] 좌석·음료 편집기 개편 ──
#   ①"이름부분을 클릭하면 음료랑 이름적는게 동시에" → 한 창(이름칸+음료)으로 통합
#   ②"논알콜스파클링은 고정이고 + 샴페인 혹은 레드와인" → 알콜은 행사 전체 한 종류
chk 'SEAT_ONE_CARD' mypage.html 8
chk 'ALC_ONE' mypage.html 6
chk 'ALC_ONE' index.html 1
chk 'sdb-nm' mypage.html 4                      # 이름칸이 자리 창 안에 있다(캔버스 알약 안이 아니라)
# ★[SEAT_NO_CHAIN 2026-08-16 사용자 지시 "쭉쭉 이어지게 하지말고 클릭하면 그때 적을수있게만하자"]
#   한 자리를 마치면 창이 닫힌다. 다음 자리로 자동으로 끌고 가지 않는다 — 어디를 적을지는 두 분이 누른다.
chk 'SEAT_NO_CHAIN' mypage.html 3
chk 'class="sdb-ok" data-seat-selclose' mypage.html 1
nochk 'data-seat-next' mypage.html               # ★'다음 자리 →' 단추 복원 금지(한 번 만들었다가 걷어낸 것)
nochk 'function _seatGoNext' mypage.html         # ★엔터 연쇄 이동도 함께 걷어냈다(주석의 이름 언급은 남겨 둔다 — 그래서 'function ~'로 잡는다)
nochk 'class="rs-edit" data-ed' mypage.html     # ★캔버스 자리 알약 안 입력칸 복원 금지(이름·음료가 다시 갈라진다)
chk 'data-alc-all' mypage.html 3                # 알콜 1종 통일·전환
# ★★[SEAT_NO_UNDEC 2026-08-16 사용자 지시 "음료 미정은 없에자"] 이름이 붙으면 음료가 반드시 하나 붙는다.
#   기본값은 행사 알콜(없으면 샴페인) — 불러오기·그리기·저장 세 길 모두 _seatFillDefaults 를 지난다.
chk 'SEAT_NO_UNDEC' mypage.html 6
chk 'function _seatFillDefaults' mypage.html 1
chk '_seatFillDefaults()' mypage.html 2          # 그리기 직전 + 저장 직전(화면을 안 거치는 자동저장까지 덮는다)
nochk 'data-alc-fill="' mypage.html               # ★'미정 일괄 채우기' 복원 금지 — 채울 미정이 없다(폐지 주석의 이름 언급은 남긴다)
nochk 'class="sdb-clear"' mypage.html            # ★'미정으로 되돌리기' 복원 금지
nochk 'rs-dk rs-dk-none' mypage.html             # ★미정 빈 골드 링 복원 금지
nochk "_dkPill('dk-U'" mypage.html               # ★요약의 미정 알약 복원 금지
nochk "음료 미정 '+" mypage.html                   # ★완료 전 '음료 미정 n명' 확인 복원 금지(폐지 주석은 남긴다)
# [SEAT_KBD] 창 안에 이름칸이 생겨 키보드가 창을 덮는다 — bottom 에 --kbd 를 실어 '키보드 위'에서 가운데
chk 'SEAT_KBD' mypage.html 3
chk 'bottom:var(--kbd,0px)' mypage.html 1
# ★★[SEAT_DIRTY_KEEP] 더러움 판정이 편집을 닫으면 좌석 이름이 통째로 사라진다(f515438 이후 실사고 · 2026-08-16 실측).
#   판정에 필요한 건 '입력값을 모델에 반영'뿐이다 — 닫는 것은 그 일이 아니다.
chk 'SEAT_DIRTY_KEEP' mypage.html 1
nochk "if(SEATFLOW.edit && typeof commitSeatEdit==='function' && bx) commitSeatEdit(bx)" mypage.html
# ★★[SEAT_DRINK_SAVE] 저장 화이트리스트가 옛 코드(N·A·J)에 멈춰 샴페인(C)·레드와인(R)이 조용히 지워지던 사고.
#   읽는 쪽은 진작 C|R|N 을 전제했다 — 두 쪽을 한 벌로 본다. 왕복 게이트(data-roundtrip ①-a)가 이 경로를 붙잡는다.
chk 'SEAT_DRINK_SAVE' automation/platform/80_production.gs 1
chk "_dv === 'C' || _dv === 'R' || _dv === 'N'" automation/platform/80_production.gs 1
chk 'SEAT_DRINK_SAVE' scripts/audit/data-roundtrip.mjs 3
chk "drinks: \['C', 'R', 'N', 'K', 'Y'\]" scripts/audit/data-roundtrip.mjs 1
# [PHOTO_GATHER_OFF 2026-08-16 사용자 지시 "자리에서는 무엇이지?"] 단체 사진 구도의 「불러 모아요/자리에서」
#   두 갈래 배지 폐지 — 전 구도가 모여서 한 컷이다. 「자리에서」는 고객에게 "제대로 모여 찍지 않는다"로
#   읽혔다(가장 갖고 싶어 하는 친구·가족 컷에서). 리뷰가 '유실된 기능'으로 되살리지 못하게 막는다.
chk 'PHOTO_GATHER_OFF' mypage.html 4
nochk "ph-fix\" style=\"opacity:.6\">자리에서" mypage.html
nochk 'gather:true' mypage.html
# [PHOTO_SCENE 2026-08-16] 식순에서 고른 순간 → 그날 남는 사진(읽기 전용 칸). 이름은 식순 블록 이름
#   리터럴이라 빌더가 바꾸면 조용히 안 맞는다 → check-photo-scene.mjs 가 양쪽을 실제로 읽어 대조한다.
chk 'PHOTO_SCENE' mypage.html 5
chk 'PHOTO_FX_LINK' mypage.html 2   # [PHOTO_WISH]로 카드가 사라지며 배지 렌더 줄 1개가 정당히 없어졌다(연동 자체는 요청 안내로 남음)
if command -v node >/dev/null 2>&1; then node scripts/check-photo-scene.mjs >/dev/null \
  || { echo 'FAIL photo-scene: 단체 사진의 식순 연동 이름이 빌더 블록 이름과 다릅니다 — node scripts/check-photo-scene.mjs'; fail=1; }; fi

# ── [RETIRED_SCENE] 폐지한 순서가 고객 화면·AI 지식에 남아 있나 (2026-08-16 · 코워크 요청 적대검증) ──
# 코워크: *"폐지를 사방에 흩뿌렸다 … 한 군데라도 빠뜨렸으면 그 자리만 살아남는다.
#   특히 mypage.html · admin.html · Admin.html · api/_ritual-kb.js 쪽은 내가 안 봤다."*
# 실제로 둘 새어 있었다 —
#   ① mypage `PHOTO_SCENE` 에 「와인 세리머니」·「케이크 커팅」·「축가」 (엔진은 valley 큐를 0개 낸다 · 실측)
#   ② api/_ritual-kb.js 가 AI 상담사에게 와인·축가를 «고를 수 있는 순간»으로 알려 주고,
#      D-14 준비 목록에서 「축가 부탁」까지 시키고 있었다(SONG_RETIRED 는 8/9 · 이레 동안).
# ★옆의 check-photo-scene 은 이걸 못 본다 — 「이름이 파일에 있나」를 볼 뿐인데
#   폐지 순서는 클립 번호 때문에 **일부러 파일에 남긴다**. 그래서 왼쪽을 「고를 수 있나」로 옮긴 검사를 따로 둔다.
# ── [POST_LIVE_DUCK] post 가 올린 음량을 live 가 도로 내리는 모양 (2026-08-16 · 코워크가 판정 요청) ──
# 코워크: *"narr-close 의 post 가 -8 로 올린 걸 live 가 1.2초 만에 -12 로 되돌린다. 의도인가 사고인가."*
# ★사고였다 — 세어서 확정했다. post 로 «올리면서» live 가 있는 큐 12개 중 11개(entry-A~F)가
#   live.duck 을 post 목표값과 같게 명시한다. narr-close 하나만 없어 자동 채움이 -12 를 넣었다.
#   집 안에 이미 규칙이 있었고 이 자리만 빠뜨린 것이다(note 가 «가장 느리게»인데 2초 올렸다 1.2초 내려간다).
# ★한 큐만 고치면 다음에 또 난다 — 자동 채움(ritual-cue.js:284)이 있는 한 계속 생기는 모양이라 검사로 잡는다.
chk 'POST_LIVE_DUCK' assets/ritual-cue.js 2
chk 'POST_LIVE_DUCK' scripts/check-ritual-cue.js 3
chk "doing: 'move', duck: PARAM.duckMusic" assets/ritual-cue.js 1
# ── [PHOTO_ASK 2026-08-16 사용자 확정] 하객에게 사진을 부탁하는 두 자리(84·85) ──
# *"추천대로 진행해 우선 내가 실청테스트하면서 거를거니깐"*
# ★번호는 Cue.FILES **맨 끝**(84·85) — 중간에 끼우면 이미 녹음된 83개가 전부 개명된다.
# ★두 클립 다 S.photoShare 가 참일 때만 나온다. 링크를 안 넣은 두 분에게 「보내 주세요」라고 하면
#   없는 버튼을 안내하는 셈이다. 그래서 04·45 «안»에 문장을 더하지 않고 별도 클립으로 뺐다.
# ★photoShare 는 digital 과 같은 ★INJECT 키다 — 값은 **유무 boolean 뿐**이고 URL 은 안 싣는다
#   (미리듣기 주소는 하객이 볼 수도 있는 공개 링크다).
# ★화자는 사람이 정하지 않는다 — 파트(1_안내)의 role 에서 대장이 읽는다(→ 잔희). 코워크가 손으로
#   적은 판은 '우성'이었고 그건 틀렸다. 기계가 읽은 값이 맞았다.
chk 'PHOTO_ASK' assets/ritual-cue.js 5
chk 'PHOTO_ASK' assets/ritual-preview-link.js 3
chk 'PHOTO_ASK' mypage.html 3
chk 'PHOTO_ASK' order-preview.html 2
chk 'photoShare' scripts/lib/engine-calls.mjs 1       # ★축을 안 흔들면 84·85 가 「엔진이 안 부르는 줄」로 잡힌다(실측 89→91)
# ★[ENGINE_CALLS 2026-08-17] 이 축 표는 check-listen-cover 안에 있었다. 쓰는 곳이 셋이 되어 lib 으로 옮겼다.
#   옮긴 것이지 폐지한 것이 아니다 — 파일만 바뀌고 규칙은 그대로다.
chk "INJECT = \['digital', 'photoShare'\]" assets/ritual-preview-link.js 1
# ★주소를 미리듣기가 «옮기지» 말 것 — 유무 boolean 만 간다.
# ★[NOCHK_SHAPE] 이름('photoShareUrl')이 아니라 **KEYS 에 실리는 모양**을 잡는다 — 처음엔 이름으로
#   걸었다가 정당하게 읽는 photoShareOf() 와 그 주석을 스스로 물었다(자가덫 9번째).
#   읽는 것은 괜찮다. 안 되는 것은 «담을 것 목록에 넣는 것»이다.
nochk "'photoShareUrl'" assets/ritual-preview-link.js
# ★[NEW_CLIP_SENTS · SAY_WHAT_DID] --redub 가 «썼다»고 말하면서 파일을 안 쓰던 자리.
#   새 클립은 화면 글이 없어 0문장으로 계산됐고, 그래서 붙여넣기 파일이 안 써졌는데
#   화면에는 「(2클립 · 0문장)」이라고 썼다고 적혔다. check-paste-format 은 「--redub 로 다시 뽑으세요」라고
#   안내했고 — 돌려도 같은 결과라 **끝나지 않는 고리**였다. 대장에서 문장을 읽어 고쳤다(0문장 → 4문장).
chk 'NEW_CLIP_SENTS' scripts/check-text-audio.mjs 1
chk 'SAY_WHAT_DID' scripts/check-text-audio.mjs 1
chk 'RETIRED_SCENE' scripts/check-retired-scene.mjs 2
# ★[재점검 2026-08-16] 첫 판은 지식서를 **한 파일만** 봤다(api/_ritual-kb.js).
#   고객이 읽는 AI 지식은 셋이고 그중 assets/advisor-kb.js 는 **공개 홈페이지**에 실린다 —
#   계약 전 사람이 보는 제일 넓은 자리인데 그걸 안 보고 「전수」라 말할 뻔했다.
#   거기서 실제로 나왔다: [MUSIC_GONE 2026-08-03] 으로 곡 입력칸을 지웠는데
#   지식서 셋이 열사흘 동안 「마이페이지에서 입퇴장 음악·축가를 입력」이라 말하고 있었다.
chk 'KB_ALL_THREE' scripts/check-retired-scene.mjs 1
chk 'MUSIC_GONE' scripts/check-retired-scene.mjs 3
chk 'MUSIC_GONE' assets/advisor-kb.js 1
chk 'MUSIC_GONE' api/_kb.js 1
chk '자유 한 칸' assets/advisor-kb.js 3       # 축가는 없앤 게 아니라 옮긴 것 — 어디로 옮겼는지를 고객에게 적는다
nochk '입퇴장 음악·축가 등 구성을 직접 입력' assets/advisor-kb.js   # ★없는 칸을 있다고 하던 줄
chk 'WINE_RETIRED' mypage.html 1
chk 'WINE_RETIRED' api/_ritual-kb.js 3
chk 'SONG_RETIRED' api/_ritual-kb.js 3
chk '링 워밍 · 폐지' api/_ritual-kb.js 1     # 절 머리에도 폐지를 적는다 — 아래 POLICY 끝에만 있어 이 절만 읽으면 소개로 보였다
nochk "{n:'와인 세리머니'" mypage.html        # ★되살리기 금지 — 고를 길이 없는 장면을 약속하게 된다
nochk "{n:'축가',      " mypage.html
nochk '축가 부탁' api/_ritual-kb.js           # ★없어진 순서를 «부탁하라»고 시키던 D-14 줄
if command -v node >/dev/null 2>&1; then node scripts/check-retired-scene.mjs >/dev/null \
  || { echo 'FAIL retired-scene: 폐지한 순서가 고객 화면이나 AI 지식에 살아 있습니다 — node scripts/check-retired-scene.mjs'; fail=1; }; fi
# ★[SHARE_KAKAO_1TO1 2026-08-16] 'MP_PHOTOSHARE_WHAT' 마커 폐지 — 「무엇을 넣나」를 첫 줄에 둔다는 그 취지는
#   1:1 오픈채팅 안내가 그대로 이어받았다(만드는 법이 첫 줄이다). 지키는 문장은 위 두 줄이 센다.
# [PHOTO_FX_STALE 2026-08-16 사용자 질문 "연동하는거 확실하게 한거야?"] 연동은 화면을 열 때 계산된다 —
#   축배가 있을 때 「잔 부딪히기」를 골라 두고 나중에 식순에서 축배를 빼면, 화면을 다시 열지 않는 한
#   어긋난 채로 당일을 맞는다. 확인서에서 한 번 더 대조한다(좌석 인원 대조와 같은 자리).
#   ★판정 근거는 PHOTO_WISH_EX 의 link 하나 — 조건을 손으로 또 적으면 화면과 확인서가 다른 말을 한다.
chk 'PHOTO_FX_STALE' mypage.html 1
chk '_rf.indexOf(c.link.when)<0' mypage.html 1
# [ORD_RESET_MID 2026-08-16 사용자 지시 "처음부터 다시 만들기 코스 진행하는 중간에도 클릭할 수 있게"]
#   식순 빌더 진행 줄(2행 오른쪽)의 「처음부터 다시 만들기」 — 완성 화면에만 있던 것을 걷는 동안에도 둔다.
#   ★아래(이전·다음 옆)로 옮기지 말 것(EXIT_TAP44 와 같은 원칙 · 지우는 동작이라 더 세게 적용).
#   ★_paintReset 이 사라지면 예고 이름표(#pnext)와 두 글자가 한 칸에서 겹친다.
chk 'ORD_RESET_MID' order-preview.html 4
chk 'prog-reset' order-preview.html 3
chk '_paintReset' order-preview.html 3
chk "id=\"pReset\"" order-preview.html 1
# [INDEX_FACT_2026_08_16] 메인 전수 점검으로 잡은 사실 오류·고지 공백.
#   ★계약서 제3조·제7조가 정본이다. 화면이 계약서보다 큰 약속을 하면 그대로 이행 의무가 된다.
nochk '다섯 코스에서 골라' index.html                    # 코스는 셋([THREE_COURSES 2026-08-07])
nochk '촬영·예식·다이닝·디지털 참석이 통합된' index.html   # 다이닝은 파트너사 직결제(제3조②)
nochk '본식영상 데이터 + 수정본' index.html               # 계약서 용어는 '편집본'
chk '25명 초과 스탠딩' index.html 1                       # 제3조⑥ 1인 50,000원·최대 30명(값이 비어 있었다)
chk '총 30명으로 진행하실 수 있습니다' index.html 2        # 30명 상한 고지(화면에 0건이었다)
chk '드레스를 시착하신 경우에만' index.html 1              # 제4조⑧ — '전액 환불' 단서 없던 자리
# 제7조② — 23스크린 접힘 안에만 있던 사실을 가격 카드로 끌어올린 것이 이 가드의 뜻이다.
#   ★2026-08-18 문구만 바뀌었다(「위약금 없이 전액 환급」→「전액 돌려드립니다」·[PRICE_NOTE_TONE]).
#     사실도 자리도 그대로다 — 지키려던 것은 «일찍 보인다»이지 특정 단어가 아니다.
chk '예식 150일 전까지는 전액 돌려드립니다 · 드레스 시착 비용만 제외' index.html 1
chk '디지털 참석 페이지' index.html 1                     # 제3조⑥ 포함 칸(별도 칸에 있었다)
# [PRICE_STAGE_TABLE 2026-08-16] 계약서 단계별 지급 표가 총액과 따로 놀지 않게(평일 열이 240만이었다)
chk 'PRICE_STAGE_TABLE' scripts/check-price-sync.mjs 1
nochk '<td data-label="평일">240,000원</td>' contract/v1-1.html
# [TERM_VIDEO 2026-08-16] 화면 용어는 「예식 영상」이다 — 「본식 영상」은 2026-07-25 사용자 지시로
#   폐기(§6-B 표준 용어 G10). 계약서는 법률 문서라 「본식영상(편집본)」을 그대로 두고, 화면만 통일한다.
#   ★되살리지 말 것 — 계약서와 다르다는 이유로 화면을 되돌리면 폐기 지시를 뒤집는 것이 된다.
chk '예식 영상' index.html 8
nochk '본식영상' index.html
# [DUB_FROZEN_FILE 2026-08-16] 번호 계약은 저장소에 적는다(_dub_stage 는 gitignore 라 그것만 보면
#   소리 가진 기계에서만 초록이 되고 CI 는 붉는다 · [STAGE_ABSENT] 와 같은 병).
chk 'DUB_FROZEN_FILE' scripts/build-dub-onefile.mjs 1
chk 'frozen' "docs/plans/식순연구/타입캐스트/더빙_번호계약.json" 1
# [EXTRA_CROSS 2026-08-16 CC 적대검증 ④] extra 는 «그 축의 모든 값»과 곱한다 —
#   'wine' 하나로만 켜서 18_narr-valley-cake(valley:'cake' + extra.valley 동시)가 통째로 빠져 있었다(91→92곳).
chk 'EXTRA_CROSS' scripts/lib/engine-calls.mjs 1     # [ENGINE_CALLS] 위와 같은 이유로 파일이 바뀌었다
# [AUDIO_PATH_REAL 2026-08-16 CC 적대검증 ⑤] 손으로 박은 mp3 경로가 실물에 닿는가.
#   ★지금 rc 1 이 정상이다 — preview-bed.mp3 가 없다(고칠지는 사용자가 정한다). 게이트는 «세는 것»만 건다.
chk 'AUDIO_PATH_REAL' scripts/audit/audio-paths.mjs 1
chk 'PREVIEW_BED' console.html 6
# ★[SEAT_FIT 2026-08-16] 이름이 세 글자만 넘어가도 자리 알약이 카드 밖으로 30px 넘게 나갔다(390px 실측).
#   지그재그 배율 1.9→1.15 · --zig 26→20 으로 잡고, 테이블 커스텀 이름은 원 안에서 원 아래 한 줄로 내렸다.
#   scripts/audit/seat-onecard.mjs 의 '긴 이름이 카드 밖으로 안 나간다' 절이 이 값을 지킨다.
chk 'SEAT_FIT' mypage.html 4
chk 'mag=even?1:1.15' mypage.html 1
chk 'rt-cap' mypage.html 4
nochk 'class="rt-cnm"' mypage.html                # ★원 안 커스텀 이름 복원 금지(좌우 자리 알약과 겹친다 · 폐지 주석의 이름 언급은 남긴다)
chk 'SEAT_FIT' scripts/audit/seat-onecard.mjs 3
# ★★[KID_SEAT 2026-08-16 사용자 지시 "애기들도 있을수있으니깐 … 음료는 물로"] 유아 자리 = 음료 한 칸(K).
#   물 + 유아용 의자를 한 번에 정한다. 코드 K 는 네 파일이 한 벌 — 하나만 빠지면 저장 때 조용히 지워진다.
chk 'KID_SEAT' mypage.html 6
# ★★[KID_CHAIR 2026-08-16 사용자 지시 "추천대로"] 아이는 둘 — 유아(K·의자 필요)와 어린이(Y·물만).
#   하이체어 수량은 K 만 센다. Y 를 더하면 스태프가 쓰지 않을 의자를 꺼낸다.
chk 'KID_CHAIR' mypage.html 4
chk 'KID_CHAIR' admin.html 1
chk 'KID_CHAIR' guide.html 1
chk "Y:'어린이 · 물'" mypage.html 1
chk "_dv === 'Y'" automation/platform/80_production.gs 1
chk 'cK+' admin.html 1                              # 의자 개수는 유아만(어린이 cY 를 더하지 말 것)
# ★★[SEAT_NOTE 2026-08-16] 「미리 알려주실 것」 — 2026-07-19 위저드 통합 때 홀로 빠져
#   관리자 화면·관리자 메일·서버 재통지가 반년간 빈 값을 읽던 배관을 이었다. 지우면 다시 끊긴다.
chk 'SEAT_NOTE' mypage.html 4
chk 'data-seat-note' mypage.html 3
chk 'fd.allergy' mypage.html 1
chk 'SEAT_NOTE' scripts/audit/data-roundtrip.mjs 3
chk 'SEAT_NOTE' scripts/audit/seat-onecard.mjs 2
# ★★[SEAT_NOTE_TRUTH 2026-08-16 자체 적대점검] 저장 실패를 '저장됐어요'로 덮지 않는다.
#   여기 적히는 것은 알레르기다 — 안 닿았는데 닿았다고 말하면 두 분은 말한 줄 알고 당일을 맞는다.
chk 'SEAT_NOTE_TRUTH' mypage.html 1   # (#529 가 _seatFinSave 를 더 낫게 고쳐 그쪽 주석이 이 자리를 대신한다 · 규칙 설명은 wireSeatNote 머리에)
chk 'SEAT_NOTE_TRUTH' scripts/audit/seat-onecard.mjs 2
nochk "_seatFinSave(); if(st) st.textContent='저장됐어요'" mypage.html   # 결과를 안 보고 성공이라 말하던 첫 판
chk "v==='N'||v==='K'||v==='Y'" mypage.html 1        # [KID_CHAIR] 아이만 있는 자리가 '샴페인'으로 떨어지지 않게(FIN_DRINK_NOALC 와 한 짝)
# ★★[CF_SEAT_DRINK 2026-08-16] 확인서에 음료 집계 — 두 분이 도장 찍는 자리에 유아 수(=유아용 의자 수량)가 보여야 한다.
chk 'CF_SEAT_DRINK' mypage.html 1
chk 'CF_SEAT_DRINK' scripts/audit/seat-onecard.mjs 2
chk 'KID_SEAT' guide.html 1
chk 'KID_SEAT' admin.html 2
chk 'KID_SEAT' automation/platform/80_production.gs 1
chk 'KID_SEAT' scripts/audit/data-roundtrip.mjs 1   # 저장 왕복에 K 를 태워 둔다(화이트리스트가 다시 빠지면 붉게)
chk "K:'유아 · 물'" mypage.html 1
chk "_dv === 'K'" automation/platform/80_production.gs 1
chk '유아용 의자' admin.html 2                    # 스태프 A4 합계 줄 + 관리자 상세(당일 준비물)
chk 'KID_SEAT' scripts/audit/seat-onecard.mjs 1
# [CF_SEAL·CF_ASK·CF_GATE_ONE 2026-08-16 사용자 지시 "고객이 확인했습니다 버튼 … 날짜랑 내가 이때
#   이것으로 확정했다라는 책임의 부분이 느껴지게" + "모든걸 완료하면 한번에"]
#   예식 확인서의 확정 = **이 한 곳뿐**이다. 섹션마다 확인 버튼을 만들지 말 것(사용자가 명시로 거절).
#   ★확정 판(mpConfirm)을 빼고 즉시 저장으로 되돌리지 말 것 — 오터치 한 번이 곧 확정 기록이 된다.
#   ★게이트는 ritual·seat·final 셋 — 하나라도 빼면 서버(ritual+final)와 어긋나 죽은 버튼이 돌아온다.
chk 'CF_SEAL' mypage.html 3   # 4→3: 행 라벨 주석이 [TRK_ACT_ALIGN]으로 대체됨(2026-08-16 · 기능은 그대로)
chk 'CF_ASK' mypage.html 1
chk 'CF_GATE_ONE' mypage.html 1
chk 'cfWhenText' mypage.html 2
chk 'cf-seal-mk' mypage.html 2
chk "_need.push('좌석 · 음료')" mypage.html 1

# ★★[PHOTO_WISH 2026-08-16 사용자 지시 "고르게 하지말고 꼭 넣고싶은 사진"] 연출 카드 10장 선택 폐지 →
#   요청 적기({어떤 사진·누구와·참고 링크} 한 덩어리 · 최대 2). 리뷰가 '유실된 선택 UI'로 되살리지 못하게 막는다.
#   ★셋을 한 요청에 묶는 것이 핵심 — 따로 두면 어느 링크가 어느 요청인지 모른다(스냅의 refs/mustHaves 가 그 상태).
chk 'PHOTO_WISH' mypage.html 12
chk 'var PHOTO_WISH_EX=' mypage.html 1
chk 'var PHOTO_WISH_MAX=2' mypage.html 1
nochk 'var PHOTO_FX_CARDS=' mypage.html          # 고르는 카드 배열 복원 금지
nochk 'function fxToggle' mypage.html            # 카드 토글 복원 금지
nochk 'class="pfx-grid"' mypage.html             # 카드 그리드 복원 금지
# [WISH_FROM_FX] 옛 저장분 이어받기 — 카드로 골라 둔 부부의 선택을 버리지 않는다(유실이 이 저장소 최악의 사고 유형)
chk 'WISH_FROM_FX' mypage.html 1
chk 'function _wishFromFx' mypage.html 1
# [PHOTO_WISH] 서버 화이트리스트 — 없으면 새 키가 통째로 버려진다(화면엔 '저장됐어요'). ★GAS 새 버전 재배포 필요
chk 'PHOTO_WISH' automation/platform/80_production.gs 2
chk 'body.draft.photoWish = _pw' automation/platform/80_production.gs 1
chk 'photoWish' admin.html 1                     # 관리자 화면이 요청을 읽는다
# [PHOTO_WISH] 좌석 공개설정만 바꿔도 guideinfo 트랙이 통째로 교체된다 — 통과 목록에서 빠지면 요청이 조용히 지워진다
chk 'photoWish: (gi.photoWish||\[\]).slice()' mypage.html 1 # ★★[PHOTOSHARE_DIRECT 2026-08-16 사용자 결정 "우리를 안거치고 부부한테 바로가는걸원해"]
# ★[CHK_ARG_SPACE 2026-08-21] 위 줄은 `1#` 이라 셋째 인자가 «1#» 이었다 — 산술 비교가 깨져
#   `line 70: [: 1#: integer expression expected` 만 찍고 조용히 초록으로 떨어졌다(2026-08-16부터 5일간).
#   붉게 지지 않는 고장이라 아무도 몰랐다. 아래 자가검사가 그 꼴을 정적으로 잡는다.
#   하객 사진은 우리를 거치지 않는다. 리뷰가 「우리 안내 페이지에서 직접 받자」를 개선안으로 되살리지 못하게 막는다.
#   (조사: 구글 드라이브·폼은 로그인 없이 업로드 불가 → 우리가 받으려면 GAS 업로드 배관이 필요한데 그 길을 안 간다)
chk 'PHOTOSHARE_DIRECT' mypage.html 1
# [PHOTOSHARE_ONE] 선택지 하나(구글 포토 공유 앨범) — 카톡은 사진을 압축해 사진이 상품인 우리와 안 맞는다
chk 'PHOTOSHARE_ONE' mypage.html 2
chk '「공동작업」' mypage.html 1                   # 같은 이유 — 지키는 것은 '공동작업을 켜야 올릴 수 있다'는 사실 하나
# ★★[FIN_DRINK_FILL 2026-08-16 사용자 제보 "좌석 배치완료했는데도 좌석 완료하라고 되어있네"]
#   GAS 80_production.gs:409 가 final 저장에 `drink`(대표 음료)를 요구하는데 그 입력 UI 는 2026-07-19 폐지됐다
#   → 그 뒤 고객 전원이 tracks.final 을 못 만들었다(확인서 미완료·잔금 미합산·관리자 메일 미발송).
#   ★자리별 음료에서 파생해 **비었을 때만** 채운다. 덮어쓰면 초안이 바뀌어 확정이 풀린다(_prodConfirmVoid).
#   ★키는 반드시 **마지막**에 붙인다 — _prodUiStrip 이 JSON 문자열 비교라 키 순서만 달라도 확정이 풀린다(시뮬레이션 확인).
chk 'FIN_DRINK_FILL' mypage.html 4
chk '_finDrinkFrom' mypage.html 3
chk 'SEAT_FIN_HEAL' mypage.html 3
chk 'SEAT_FIN_SEQ' mypage.html 2
chk 'SEAT_TRUTH_ONE' mypage.html 2
chk 'CF_GATE_SERVER' mypage.html 1
chk 'SEAT_NAME_PENDING' mypage.html 2
nochk '0명 배치' mypage.html                      # [SEAT_NAME_PENDING] 테이블만 놓은 상태를 '0명 배치'로 부르지 않는다
# ★[FIN_DRINK_NOALC 2026-08-16 재점검] 알콜이 한 자리도 없으면 대표음료는 **논알콜**이다.
#   1차안(`SEAT_DRINK_LABEL[code||'C']`)은 전원 논알콜 예식에도 「샴페인」을 관리자 메일·화면에 보냈다 —
#   화면 글자가 아니라 당일 준비물이 틀어지는 자리다. 되돌리지 말 것.
chk 'FIN_DRINK_NOALC' mypage.html 1
chk "hasN?'N':'C'" mypage.html 1
chk 'FIN_SAVE_LOUD' mypage.html 2


# ★★[WISH_FX_MIRROR 2026-08-16 점검에서 잡은 실사고] photoFx 를 비우면 GAS 재배포 전 저장 한 번에
#   고객 선택이 통째로 사라진다(트랙 통째 교체 + photoWish 는 아직 화이트리스트 밖). 거울로 보낸다.
chk 'WISH_FX_MIRROR' mypage.html 2
chk 'WISH_FX_MIRROR' admin.html 1
nochk 'photoFx:\[\], photoWish' mypage.html          # 비우는 판 복원 금지(유실 창이 다시 열린다)
# [PFX_CSS_GONE] 고르는 카드 CSS 10개 제거 — 카드 UI 자체가 폐지돼 실측 사용 0건이었다
chk 'PFX_CSS_GONE' mypage.html 1
nochk '.pfx-grid{' mypage.html
# [WISH_TAP44] 상자 안 보조 칩도 44px — 낮출 것은 높이가 아니라 글자 크기와 색
chk 'WISH_TAP44' mypage.html 1   # 요청 빼기 ✕ 44px(보조 칩 규칙은 [WISH_MINIMAL]로 칸과 함께 폐지)
# [WISH_IN_TIME] 요청 개수를 시간 줄에 — 분은 더하지 않는다(별도 컷인지 얹는 동작인지 미리 못 가른다)
chk 'WISH_IN_TIME' mypage.html 1
# ★[TRK_ACT_ALIGN·CF_LINK_TAP·CF_INFO_TONE 2026-08-16 사용자 지시 "버튼 사이즈도 다른것도 거슬리고 디테일한부분들 체크"]
#   ①확인서 행 버튼에 날짜를 다시 넣지 말 것 — 실측 132px 로 혼자 삐져나와 오른쪽 열이 계단이 된다(다른 여섯은 122px).
#     날짜·상태는 행 설명줄(cfSub)이 말한다.
#   ②확인서 안 「전화」·「지도」는 보이는 크기 그대로 44px 히트영역(실측 26×21 → 34×45).
#   ③「이렇게 진행된다」류 안내는 조용한 상자(.cf-info) — 진사(.cf-warn)는 손이 필요한 것에만.
chk 'TRK_ACT_ALIGN' mypage.html 4
chk 'cfSub' mypage.html 2
chk 'CF_LINK_TAP' mypage.html 2
chk 'CF_INFO_TONE' mypage.html 2
chk 'cf-info' mypage.html 2
# ★[ALLERGY_ASK_OFF 2026-08-16 사용자 지시 "알레르기까지는 체크할순없어서 빼자 · 어차피 핑거푸드라서"]
#   알레르기를 **묻지 않는다.** 설명·플레이스홀더에서 뺐다 — 되살리지 말 것(묻는 것 자체가 조치 약속이 된다).
#   칸(미리 알려주실 것)과 저장 키(allergy)는 그대로다 — 거동 불편·아기 나이는 계속 받아야 한다.
chk 'ALLERGY_ASK_OFF' mypage.html 1
nochk '땅콩 알레르기' mypage.html
nochk '알레르기, 거동이 불편한 분' mypage.html
# ★★[CF_DRINK_ONE 2026-08-16 사용자 지시 "너가 직접보면서 확인점검해봐" — 화면을 보고 잡은 중복]
#   음료 집계가 「좌석 · 음료」와 「좌석 배치」 두 줄에 각각 있었다(병렬 세션 둘이 같은 날 다른 자리에 넣음).
#   표기까지 갈려 한 화면이 같은 사실을 두 번, 다른 말로 적었다. 음료는 **줄 이름이 음료인 줄** 하나에만.
#   ★수를 세는 진짜 검사는 seat-onecard.mjs 가 한다(확인서 HTML 에서 '샴페인 N' 이 1회인지) — 여기선 마커만.
chk 'CF_DRINK_ONE' mypage.html 3
chk 'CF_DRINK_ONE' scripts/audit/seat-onecard.mjs 2
nochk "음료 · '+escapeHtml(_cp" mypage.html          # 좌석 배치 줄에 집계를 되살리지 말 것



# ★★[WISH_MINIMAL 2026-08-16 사용자 지적 "너무 정신없는데 미니멀하게 심플하게"]
#   쉬는 상태 = 단추 한 줄. 요청은 눌러서 연다. 칸은 둘(자유 서술 + 링크) — '누구와' 칸과 칩 5개 폐지.
#   ★정말 선택인 칸이 화면을 가장 많이 먹으면 그 자체가 "적어야 하나?"라는 압박이 된다. 펼친 판으로 되돌리지 말 것.
chk 'WISH_MINIMAL' mypage.html 3
nochk 'data-wwho' mypage.html                    # '누구와' 칩 복원 금지
nochk 'class="cc-input wsh-who"' mypage.html     # '누구와' 전용 칸 복원 금지
chk '+ 요청 적기' mypage.html 1
# [WISH_LINK_ASKED 2026-08-16] 식순 연동 안내는 **적은 요청에 대해서만** — 묻지도 않은 것에 답하면 소음이고,
#   정작 진짜로 걸리는 날 눈에 안 들어온다. 확인서 대조와 같은 기준(글자를 본다).
chk 'WISH_LINK_ASKED' mypage.html 1
# ★★[SAVE_FALSE_OK 2026-08-16 사용자 지시 "데이터 저장 비슷한경우 전수점검 · 버튼 하나하나"]
#   저장이 실패했는데 화면이 성공이라고 말하지 않게 — 뿌리는 saveTrkDraft 가 거부를 삼켜
#   **undefined** 를 돌려주던 것이었다. 받는 쪽 `if(r && r.ok===false)` 가 그 값을 통과시켜,
#   다이닝·최종확정 '완료'가 저장 실패에도 위저드를 닫고 나갔다.
#   ★빈 catch 로 되돌리지 말 것 · 'ok===false 가 아니면 성공' 극성으로 되돌리지 말 것.
chk 'SAVE_FALSE_OK' mypage.html 7
chk 'return {ok:false, error:' mypage.html 1       # saveTrkDraft 가 실패를 값으로 돌려준다(빈 catch 금지)
nochk 'done:!!done})).catch(function(){});' mypage.html   # 거부를 삼켜 undefined 를 내보내던 첫 판
chk '_dnFavSaved' mypage.html 6                    # 찜·공개 토글도 실패하면 되돌리고 말한다(정의 1 + 사용 5)
# 실패를 주입해 **실제로 눌러 보는** 게이트 — 정적 읽기로는 'undefined 가 검사를 통과하는' 모양을 놓친다
chk 'SAVE_FALSE_OK' scripts/audit/save-honesty.mjs 4
chk 'apiTrackSave=fail' scripts/audit/save-honesty.mjs 1




# ★★★[SHARE_KAKAO_1TO1 2026-08-16 사용자 결정 "1:1 오픈톡방으로"] 하객 사진은 카톡 1:1 오픈채팅방으로 받는다.
#   링크 하나로 하객마다 별도 1:1 방이 열린다 — 서로 안 보이고 프로필도 안 드러나며 마찰이 0이다.
#   ★guide.html 의 「원본」 안내를 지우지 말 것 — 카톡은 기본으로 사진을 줄이고, 그 버튼을 **누르는 사람은 하객**이다.
#     부부에게 말해 봐야 소용이 없다. 이 줄이 사라지면 사진이 조용히 압축된다.
chk 'SHARE_KAKAO_1TO1' mypage.html 1
chk 'SHARE_KAKAO_1TO1' guide.html 1
chk '원본' guide.html 1
# ★[SHARE_WEDUP 2026-08-17] 이 자리의 chk '오픈채팅 → 1:1 채팅방' 은 **정당한 폐지**로 내렸다.
#   카톡을 권장에서 내리고 WedUploader 로 바꾼 결정(아래 SHARE_WEDUP 블록)이라 마커가 사라진 것이 맞다.
#   카톡 안내 자체는 접힌 「다른 방법도 되나요」 안에 남아 있고, 그쪽은 아래에서 따로 지킨다.
chk '카톡 1:1 오픈채팅</b> · 하객마다 방이 따로 생겨' mypage.html 1
# [SHARE_KIND] 넣은 링크가 무엇인지 되읽어 준다(막지 않는다) — 엉뚱한 주소를 넣고도 모르는 일이 없게
chk 'SHARE_KIND' mypage.html 3
chk 'function photoShareKind' mypage.html 1





# [SEC_RANK 2026-08-16 디자이너 점검] 섹션 제목 13 → 14px — 본문 12px 과 1px 차이면 제목이 제목으로 안 읽힌다.
#   꼬리(· 설명)는 아래 본문과 같은 말을 하면 뺀다 · 390px 에서 두 줄로 꺾이면 그것도 뺀다.
chk 'SEC_RANK' mypage.html 3
chk '.ph-sec{font-family:var(--serif-ko);font-size:14px' mypage.html 1
# ★★[SAVE_FALSE_OK · 2라운드 2026-08-16] 관리자 화면 + 위저드 뿌리.
#   ①_wizWatch 가 실패도 기록한다 — 저장 버튼을 안 거친 배경 저장이 실패해도 손잡이가 '다시 저장'이 된다
#   ②좌석 파생(인원·스탠딩·추가요금) 실패를 화면에 싣는다 — 자리는 저장·요금은 미저장인데 '저장했어요'가 뜨던 것
#   ③관리자 인계 목록: 응답 형태가 어긋나면 '대기 건이 없어요(AI가 다 처리 중)'라는 **안심 문구**가 뜨던 것
#   ④서명 진본을 못 가져오면 말한다 — 조용히 실패하면 '서명완료' 계약서가 서명칸만 빈 채로 인쇄된다
#   ⑤교육·회귀셋 켜기/끄기/삭제 넷: 결과를 보고 실패하면 말한다(_eduDone)
chk 'SAVE_FALSE_OK' admin.html 3
chk '_eduDone' admin.html 5                       # 정의 1 + 호출 4 (★정의는 rEdu·loadReg 를 함께 감싸는 공용 스코프에)
nochk "\.then(loadEdu);" admin.html               # 결과를 안 보고 목록만 다시 읽던 첫 판
chk '대기 건이 없다는 뜻이 아니에요' admin.html 1
chk '서명칸이 빈 채로' admin.html 1   # ★chk 는 '줄 수'를 센다 — 실패 분기(else)와 catch 둘 다 같은 한 줄 안에 있어 1
chk '_seatOk:true' mypage.html 1                  # 좌석은 저장됐고 파생만 실패한 상태를 구분해서 말한다
chk 'mark(!!(r&&r.ok))' mypage.html 1             # _wizWatch 가 실패도 기록
# ★★[TRK_INFLIGHT · MODAL_ONE 2026-08-16 전수점검 2라운드 — 실측으로 재현한 경합 사고 셋]
#   ①같은 트랙을 겹쳐 저장하면 rev 가드가 **자기 자신**을 때려 «다른 기기에서 먼저 저장됐어요»가 떴다
#     (그 판에서 '최신 불러오기'를 고르면 방금 담은 것이 사라진다 — 가드가 데이터를 지운다)
#   ②판(모달)이 겹쳐 열리면 첫 약속이 영영 안 풀려 '저장 중…' 베일이 안 걷히고 화면이 멈췄다
#   ③청첩장은 rev 가드가 없는 유일한 트랙 — 늦게 온 옛 초안이 고른 디자인을 덮었다
#   ★큐(_saveQueued)·모달 직렬화를 '바로 보내기'로 되돌리지 말 것. 되돌리면 셋 다 그대로 돌아온다.
chk 'TRK_INFLIGHT' mypage.html 2
chk '_saveQueued' mypage.html 4   # 정의 1 + 재귀 1 + 트랙 1 + 청첩장 1
chk 'MODAL_ONE' mypage.html 1
chk '_mpModalBusy' mypage.html 3
chk 'TRK_INFLIGHT' scripts/audit/save-honesty.mjs 3
chk 'MODAL_ONE' scripts/audit/save-honesty.mjs 2
# ★★[노출 점검 2026-08-16 3라운드] 남에게 보이면 안 되는 것이 나가던 자리.
#   ①전체 배치도 응답에 **하객 전원의 음료 코드**가 실려 나갔다 — 그리는 화면이 하나도 없는데(순수 과다전송),
#     논알콜(N)·유아(K)는 실명과 나란히 건강·종교를 추론하게 하는 값이다. guide.html 주석은
#     «남의 음료는 절대 노출하지 않는다»라고 적어 두었는데 서버가 그 약속을 깨고 있었다.
#   ②좌석 검색 «두 글자부터»가 클라이언트에만 있어, 요청을 직접 보내면 한 글자로 성씨 훑기가 됐다.
#   ③관리자 로그아웃이 토큰만 지워 「최근 본 고객」의 실명·개인코드가 공용 PC에 남았다.
chk 'SEAT_DRINK_NOSEND' automation/platform/80_production.gs 1
nochk 'if (_drk.length) row.drinks' automation/platform/80_production.gs   # 전체 배치도에 음료를 다시 싣지 말 것
chk 'SEAT_Q_MIN' automation/platform/80_production.gs 1
chk 'SEAT_Q_MIN' automation/tests/guide.test.js 4   # 한 글자 거절 + 두 글자 질의로 고친 자리들
chk 'q.length < 2' automation/platform/80_production.gs 1
chk 'ADM_LOGOUT_WIPE' admin.html 1
chk 'removeItem(RECENT_KEY)' admin.html 1
chk 'GUIDE_DEFAULT_TRUTH' guide.html 1                # 기본값은 '전체 공개' — 주석이 반대로 적혀 있었다






# [QR_CENTER 2026-08-16] .ph-qr 는 CSS 가 flex+center 다 — 켜는 코드가 인라인 display 를 박으면 가운데 정렬이 죽는다.
#   빈 문자열로 지워 스타일시트 값으로 되돌릴 것. 'block'·'flex' 를 박지 말 것(CSS 가 바뀌면 또 갈린다).
chk 'QR_CENTER' mypage.html 1
nochk "qbox.style.display='block'" mypage.html
# [WISH_BOX_QUIET 2026-08-16 디자이너 점검] 요청 상자 머리 행 폐지 — 번호 배지는 뜻 없는 순서를 가장 진하게 찍었고,
#   번호와 ✕ 사이 space-between 이 빈 골짜기를 만들어 상자가 '표'로 읽혔다. ✕ 만 우상단에 얹는다.
chk 'WISH_BOX_QUIET' mypage.html 1
nochk 'class="wsh-no"' mypage.html                # 번호 배지 복원 금지
nochk 'class="wsh-hd"' mypage.html                # 머리 행 복원 금지
# [WISH_DEL_ASK 2026-08-16] ✕(44px)가 글칸 오른쪽 여백과 겹쳐 오탭이 가능하다 — 적은 글이 있으면 한 번 묻는다.
#   표적을 줄이면 「지우는 단추」의 44px 근거가 무너지고, 칸을 밀면 없앤 머리 행이 높이로 되살아난다.
chk 'WISH_DEL_ASK' mypage.html 1
chk '이 요청을 뺄까요' mypage.html 1







# ★★[SHARE_1TO1_ASK 2026-08-16 시뮬에서 잡은 거짓 단정] open.kakao.com/o/… 는 **그룹과 1:1 이 같은 형식**이라
#   URL 로 구분할 수 없다. 「하객끼리 서로 안 보여요」로 단정하면 그룹으로 만든 부부에게 화면이 거짓말을 한다.
#   → 단정 대신 확인을 부탁한다. 하객 화면도 「단둘이 열려요」를 빼고 우리가 아는 것만 말한다.
chk 'SHARE_1TO1_ASK' mypage.html 1
chk '1:1 채팅방</b>으로 만드셨는지 확인' mypage.html 1
nochk '하객끼리 서로 안 보여요 · 사진은' mypage.html
nochk '단둘이</b> 열려요' guide.html
chk '닉네임을 고를 수 있어요' guide.html 1
# ★★[PAID_STAGE_BACK 2026-08-16 사용자 제보 "강제로 돌렸는데 입금단계에서 아무것도 고객화면에 안나오는걸 확인"]
#   관리자가 단계를 계약완료로 되돌리면 입금 기록은 남는데(ROLLBACK_KEEP_PAID · 돈은 지우지 않는다)
#   그 단계에 뜰 수 있는 카드가 «서명+입금확인 → 접기» 하나뿐이라 **화면이 백지가 됐다.**
#   NOW 는 단계 라벨만 보고 «계약금을 입금해 주세요»라고 말했다 — 내라는데 낼 곳이 없는 화면.
#   ★불변식: 내라고 말하면 낼 곳이 있어야 하고, 보이는 카드가 없으면 NOW 라도 상황을 말해야 한다.
chk 'PAID_STAGE_BACK' mypage.html 2
chk '다시 입금하지 않으셔도 돼요' mypage.html 2
chk 'PAID_STAGE_BACK' scripts/audit/stage-back.mjs 2
chk '내라면 낼 곳' scripts/audit/stage-back.mjs 1
# ★★[JOURNEY_SIM 2026-08-16 사용자 지시 "관리자·고객 연동 스탭바이스탭 a~z 심층 점검"]
#   여정 시뮬레이터 — 진짜 서버 핸들러(handleGetMyState·adminDetail)의 응답을 진짜 화면에 그려 확인한다.
#   ★수정을 되돌려 실제로 붉어지는 것까지 확인했다 — [PAID_STAGE_BACK] 을 서버 문장까지 그대로 재현했다.
chk 'JOURNEY_SIM' scripts/audit/journey-sim.mjs 1
chk 'handleGetMyState' scripts/audit/journey-sim.mjs 1
chk '이름이 아니라 «뜻»으로 짝지어야' scripts/audit/journey-sim.mjs 1   # 관리자 계약금=납부액 · 이름끼리 비교하면 가짜 실패
# ★★[시뮬레이션에서 잡은 연동 어긋남 넷]
#   ①관리자 상세만 레거시 '업로드'를 정규화하지 않아, 같은 고객을 두고 관리자 «업로드» ↔ 고객 «원본이 도착했어요»
#   ②돈을 확인하는 동작(중도금·잔금·중도금잔금·추가보정·보정시작)이 처리이력에 흔적을 남기지 않았다
#   ③후기를 기다리는 단계는 '후기'인데 adminSkipSurvey 는 '결과물전달'만 받아 막다른 길이었다
#   ④관리자 화면이 금액·기한 산식을 하드코딩 복제 — 정책을 고치면 관리자만 옛 숫자를 말한다(통장 대조에 쓰이는 화면)
chk 'RESULT_LABEL_ONE' admin.html 1
chk 'ADM_TRACE_MONEY' automation/platform/70_journey.gs 3
chk 'ADM_TRACE_MONEY' automation/platform/80_production.gs 2
chk 'SURVEY_STAGE_BOTH' automation/admin/admin.gs 1
chk 'ADM_AMT_ONE' admin.html 1
nochk "var _DEP=Math.round(_T\*0.1)" admin.html    # 프론트 금액 산식 복제 금지(admin.gs 주석과 같은 규칙)
# ★[CF_SEAL_MIN 2026-08-16 사용자 지시 "미니멀하게 아래 확정함 상세 문구부분도 심플하고 깔끔하게 줄여보자"]
#   확정 기록 카드 네 줄 → 세 줄(226px → 135px). 예식일 되풀이·미리 적은 절차·요일 괄호를 걷었다.
#   ★진사는 **인장 배지 하나뿐**이다 — 왼쪽 3px 선을 되살리지 말 것(둘이면 서로를 깎는다).
#   ★남은 한 줄 「저희가 이대로 준비해요」는 지우지 말 것 — 그게 확정의 대가이자 이 카드의 값이다.
chk 'CF_SEAL_MIN' mypage.html 4
chk '저희가 이대로 준비해요' mypage.html 1
nochk 'border-left:3px solid var(--seal)' mypage.html
nochk "_wdT+' 예식은 이 내용" mypage.html   # 문구 자체는 위 주석이 근거로 인용하므로 '조립하는 코드'가 없는지를 본다

# ★★★[SHARE_NO_DAYS 2026-08-17 리서치로 뒤집힌 숫자] 「30일 뒤 만료」는 근거가 없었다.
#   카카오 고객센터 원문이 "임시 저장 기간은 시스템의 부하와 성능을 고려하여 수시로 변경되기 때문에
#   정확한 안내가 어렵습니다" 라고 밝힌다 — 카카오도 숫자를 공개하지 않는다.
#   30/90/180일·1·2·3년 목록은 카카오톡이 아니라 카카오워크(기업용) 관리자 설정이었고,
#   「최대 90일」은 2025 오픈채팅 개편의 커뮤니티형 텍스트 이력이지 사진 만료가 아니다.
#   ★어떤 숫자도 되살리지 말 것. 기간은 「시간이 지나면」으로만 쓴다.
chk 'SHARE_NO_DAYS' mypage.html 1
chk '시간이 지나면 다시 받을 수 없어요' mypage.html 1
nochk '30일 뒤 만료' mypage.html
# ★★[SHARE_ROOM_EACH 2026-08-17] 1:1 오픈채팅은 방이 하객 수만큼 쪼개진다. 여러 방을 가로지르는 일괄 저장이
#   없고 오픈채팅 미디어는 톡서랍/톡클라우드 백업에서도 빠진다 — 돈으로 못 푸는 부담이라 감추지 않는다.
chk 'SHARE_ROOM_EACH' mypage.html 1
chk '하객마다 방이 따로 생겨요' mypage.html 1
# ★★[DEPOSIT_TICK 2026-08-16 시뮬레이션 점검] 예약금 입금확인 칸이 비면 관리자에게 보인다.
#   고객 화면은 예약금을 '결제 완료'로 찍는다(60_mypage 148 · 예약금을 받고 상담을 진행하니 실무와 맞는 의도된 판단).
#   그런데 관리자 근거는 **예약 시트의 입금확인 칸**이라, 비면 조용히 갈린다:
#     ·현금영수증 원장에 예약금이 '발행 대기'로 안 떠 → 의무발급(받은 날 D+5) 영구 미발행
#     ·환불 견적 기수령액에서 10만이 빠져 → 환불 금액이 틀린다
#   ★고객 화면을 '확인 중'으로 바꾸는 쪽은 택하지 않았다 — 실제로 낸 분께 안 냈다고 말하는 것이 더 나쁘다.
#     고칠 곳은 «비어 있는 칸을 채우게 하는 것»이다. 이 경고를 지우지 말 것.
chk 'DEPOSIT_TICK' automation/admin/admin.gs 1
chk 'DEPOSIT_TICK' admin.html 1
chk 'depositTick' automation/admin/admin.gs 2   # 초기화 1 + 채우는 곳 1(같은 줄에 두 번 나오는 곳은 1줄로 센다)
chk 'DEPOSIT_TICK' scripts/audit/journey-sim.mjs 1
# ★★[PAID_BACK_TYPO 2026-08-16 사용자 지적 "문단이랑 조금 어색한데"] 되돌림 안내 카드의 위계.
#   원래 네 줄이 같은 무게로 가운데 정렬돼 읽는 순서가 없었고, 강조가 문장 꼬리에 매달려 있었고,
#   무엇보다 **바로 위 NOW 카드와 같은 문장**이 한 화면에 두 번 나왔다.
#   → 역할을 나눈다: 요약(결론·안심)은 NOW · 근거(금액·입금자)는 카드. 카드는 영수증처럼 조용히 든다.
#   ★카드에 «계약금은 확인됐어요»·«다시 입금하지 않으셔도 돼요»를 다시 넣지 말 것 — NOW 가 이미 말한다.
chk 'PAID_BACK_TYPO' mypage.html 2
chk '요약은 NOW · 근거는 카드' mypage.html 1
chk '확인됨' mypage.html 1
nochk '디렉터가 확인하는 중이에요 · 다음 안내는 이 화면에 열려요' mypage.html   # 같은 문장 두 번 쓰던 첫 판
# ★★[STAGE_REACH 2026-08-17 사용자 지시 "각각 전부 병렬로 스텝바이스텝 시뮬레이션 … 경우의수 따져서 전부"]
#   여정 «도달성» 검사기 — 상태 하나가 아니라 **상태 사이의 문**을 본다.
#   journey-sim(화면이 뭐라고 말하나)이 통과시킨 [PAID_STAGE_RESYNC] 를 잡으려고 만들었다.
#   ★이 셋을 지우면 «서버는 되는데 화면에 문이 없는» 종류가 다시 조용히 들어온다.
chk 'STAGE_REACH' scripts/audit/stage-reach.mjs 1
chk 'WORLD_RANGE' scripts/audit/_gasworld.mjs 1   # 행 전체 읽기 목 — 없으면 예약 쪽 동작이 던져 «가짜 막다른 길»이 뜬다
# ★★[PAID_STAGE_RESYNC] 단계 맞추기 버튼 — **두 관리자 화면 모두에** 있어야 한다.
#   admin.html(momentedit.kr/admin · 실제로 쓰는 쪽)에만 없으면 사용자에겐 고쳐진 것이 아니다.
chk 'PAID_STAGE_RESYNC' automation/admin/admin.gs 1
chk 'PAID_STAGE_RESYNC' automation/admin/Admin.html 1
chk 'PAID_STAGE_RESYNC' admin.html 1
chk '단계 맞추기 · 입금완료로' automation/admin/Admin.html 1
chk '단계 맞추기 · 입금완료로' admin.html 1
# ★★[EVENT_BTN_WIDE 2026-08-17] 시그니처 예식완료 버튼은 입금완료에서도 뜬다.
#   서버는 이미 둘 다 받는다(EVENT_GATE_WIDE) — 화면만 좁으면 제작을 한 번도 안 연 고객이 갇힌다.
chk 'EVENT_BTN_WIDE' admin.html 1
chk "(!isSnap&&(st==='제작중'||st==='입금완료'))" admin.html 1
# ★★[RESULT_LINK_REVIEW 2026-08-17] 결과물 링크 등록은 '후기' 단계도 받는다(화면이 이미 버튼을 그린다).
chk 'RESULT_LINK_REVIEW' automation/admin/admin.gs 1
chk "'결과물전달', '후기'\].indexOf(stage)" automation/admin/admin.gs 1
# ★★[BTN_SERVER 2026-08-17] «보이는 버튼이 실제로 눌리는가» — 화면·서버 맞대보기.
#   stage-reach 는 서버만 두드려 버튼을 모른다. 이 검사가 그 반대편(보이는데 안 되는 버튼)을 맡는다.
#   실제로 넷을 잡았다: 후기 단계의 보정본 등록·결과물 전달 처리 · 되돌리기 버튼 상시노출 · 서명 전 상담완료.
chk 'BTN_SERVER' scripts/audit/admin-btn-server.mjs 1
# ★후기 단계도 결과물 손질 자격이 같다 — 좁히면 «보이는데 안 되는 버튼»이 다시 생긴다
chk 'DELIV_RESUME_REVIEW' automation/admin/admin.gs 1
chk "stage === '결과물전달' || stage === '후기'" automation/admin/admin.gs 1
# ★서버가 못 받는 자리에 버튼을 그리지 않는다(대신 왜 안 되는지를 적는다)
chk 'UNDO_BTN_GATE' admin.html 1
chk 'CONSULTDONE_BTN_GATE' admin.html 1
chk '고객 시착 서명을 기다리는 중이에요' admin.html 1
# ★★[BLANK_STRICT 2026-08-16 자체 점검에서 잡음] «백지 금지» 판정이 사문이었다.
#   처음엔 «카드가 있거나 NOW 가 있으면 통과»였는데, NOW 문구엔 폴백이 있어(mypage 2286)
#   항상 비어 있지 않다 → **절대 실패할 수 없는 조건**이었다. 초록이 안전을 뜻하지 않았다.
#   ★NOW 는 한 줄 요약이지 «할 일이 있는 자리»가 아니다. 카드 존재를 직접 본다(예외 단계는 제외).
#   ★이 조건을 «|| !!r.now» 로 되돌리지 말 것 — 되돌리면 아래 FITTING_STAGE_BLANK 를 못 잡는다.
chk 'BLANK_STRICT' scripts/audit/journey-sim.mjs 2
chk 'r.cards.length > 0,' scripts/audit/journey-sim.mjs 1
nochk 'r.cards.length > 0 || !!r.now' scripts/audit/journey-sim.mjs
# ★★[SIM_FIXTURE_REAL 2026-08-16] 되돌리기 상태를 손으로 짜지 않고 **진짜 adminForceStage** 로 만든다.
#   손으로 행을 짜면 _clearForwardData·ROLLBACK_KEEP_PAID 의 실제 동작이 아니라 내 추측을 검사하게 된다.
#   ★상담 예약 행도 함께 심는다 — 없으면 서버가 정당하게 consult:null 을 줘 «가짜 백지»로 붉어진다.
chk 'SIM_FIXTURE_REAL' scripts/audit/journey-sim.mjs 1
chk 'adminForceStage' scripts/audit/journey-sim.mjs 2
# ★★[FITTING_STAGE_BLANK 2026-08-16] 단계가 '시착'인데 동의서가 없으면 화면이 백지였다.
#   이 단계에 뜰 수 있는 카드는 시착 카드 하나뿐인데(상담 카드는 «시착이 받는다»는 전제로 숨는다)
#   그 하나가 스스로를 지웠고, NOW 는 «동의서에 서명해 주세요»라고 말했다 — 서명할 곳이 없는 화면.
#   ★관리자 동작 둘로 실제 도달한다: adminCloseFitting(동의 닫기) · adminForceStage(시착).
chk 'FITTING_STAGE_BLANK' mypage.html 2
chk '시착 동의서를 준비하고 있어요' mypage.html 1
chk '시착 준비 중이에요' mypage.html 1
# ★★[CONTRACT_STAGE_BLANK 2026-08-16] 단계가 '계약완료'인데 계약서가 없으면 화면이 백지였다.
#   이 단계에 뜰 수 있는 카드는 계약+계약금 병합 카드 하나뿐인데 그 하나가 사라졌고,
#   NOW 는 «계약금을 입금해 주세요»라고 말했다 — 낼 곳도 서명할 곳도 없는 화면.
#   ★관리자 동작 한 번으로 도달한다(실행 확인): adminForceStage(상담완료 → 계약완료).
#     목표가 계약완료면 _clearForwardData 가 계약 열을 지우지 않아 계약서 없이 단계만 올라간다.
#   ★[PAID_STAGE_BACK]·[FITTING_STAGE_BLANK] 과 같은 병이다. 셋 다 «전제가 깨졌으면 말한다»로 고쳤다.
chk 'CONTRACT_STAGE_BLANK' mypage.html 2
chk '계약금은 서명 뒤에 안내드려요' mypage.html 1
chk 'CONTRACT_STAGE_BLANK' scripts/audit/journey-sim.mjs 1
chk '계약완료·계약서 없음' scripts/audit/journey-sim.mjs 1
# ★★[FORCE_WARN_TRUTH 2026-08-17 사용자 고립 사례] 지운 것이 없으면 «지웠다»고 말하지 않는다.
#   강제변경 결과 문구가 무조건 «이후 단계 진행 데이터를 초기화했습니다» 였다. 앞으로 가는 복구
#   (계약완료→입금완료)는 실제로 아무것도 안 지우는데(cleared: []) 같은 경고가 떠서,
#   고립을 푸는 유일한 손잡이를 «누르면 날아간다»로 읽게 만들었다. 거짓 경고는 없는 경고보다 나쁘다.
chk 'FORCE_WARN_TRUTH' automation/admin/admin.gs 1
chk 'FORCE_WARN_TRUTH' admin.html 1
chk '초기화된 데이터는 없어요' automation/admin/admin.gs 1
nochk '위 데이터가 초기화되는 것을 확인했어요' admin.html   # 미리보기가 사실대로 말하므로 라벨은 그것을 가리킨다
# ★★[RESYNC_NOOP_HONEST 2026-08-17] 「단계 맞추기」가 조용히 헛돌면 그렇다고 말한다.
#   버튼(admin.html)은 Vercel 로 바로 나가지만 단계를 고치는 곳은 GAS(admin.gs)다. 재배포 전에 누르면
#   옛 서버가 «이미 확인됨»만 주고 단계는 그대로인데 화면은 «✓ 처리됨»을 띄웠다 — 조용한 실패.
chk 'RESYNC_NOOP_HONEST' admin.html 1
chk 'res.stageFixed' admin.html 1
chk 'stageFixed' automation/admin/admin.gs 1
# ★★[STRANDED_QUEUE 2026-08-17] 갇힌 고객이 «관리자 눈»에 보이는지 실측하는 검사기.
#   ★큐 항목 자체는 다른 세션이 같은 시각에 [STALE_ROLLBACK_Q]('단계정리')로 넣었다 — 둘을 겹쳐 두면
#     같은 고객에게 줄이 두 개 뜬다. 그래서 내 중복 항목은 빼고 **그쪽 것을 정본으로** 삼는다.
#   이 검사기가 지키는 것은 «뜨는가»와 «가짜로 뜨지 않는가» 두 가지다
#   (미리 낸 중도금·잔금으로 걸리면 큐가 늑대소년이 되어 진짜 신호까지 죽는다 — 실측으로 좁혔다).
chk 'STRANDED_QUEUE' scripts/audit/stranded-queue.mjs 1
# ★★[SUB_PAID_TRUTH] 입금이 '확인'인데 «입금 대기»라고 말하지 않는다 — 그 거짓말이 고립의 실질 원인이었다.
# ★★[RESYNC_SNAP_FLOW] 상품 흐름을 d.product 로 읽는다 — d.raw 에는 상품타입 키가 없다(admin.gs 1026).
#   r['상품타입'] 로 읽으면 늘 시그니처로 폴백해, 스냅이 「촬영확정」에 갇히면 문이 안 그려진다.
chk 'RESYNC_SNAP_FLOW' admin.html 1
chk 'RESYNC_SNAP_FLOW' automation/admin/Admin.html 1
# ★대괄호를 escape 한다 — chk/nochk 는 `grep -c -e` (기본정규식)라 `[` 가 문자클래스로 먹힌다.
#   escape 없이 쓰면 엉뚱한 줄을 세어 **멀쩡한 코드가 붉게** 뜬다(실측: 4건이라며 REVERT).
nochk "STAGE_FLOW\[String(r\['상품타입'\]" admin.html
nochk "STAGE_FLOW\[String(r\['상품타입'\]" automation/admin/Admin.html
# ★★[STALE_ROLLBACK_Q 2026-08-17 사용자 제보 "아무쪽에도 어떤푸시가없는데"] 교착 금지.
#   되돌려진 고객(단계는 입금 전 · 입금상태 '확인')이 어떤 큐에도 안 잡혀,
#   고객은 «디렉터가 확인하는 중»을 기다리고 관리자는 «처리할 일 없어요»를 봤다 —
#   양쪽 다 상대를 기다리는 교착. 파이프라인 라벨도 «입금 대기»라고 거짓말을 했다.
#   ★공은 관리자에게 있다(되돌린 것도 관리자) — 처리할 일에 '단계정리'로 띄우고 라벨을 사실로.
chk 'STALE_ROLLBACK_Q' automation/admin/admin.gs 2
chk "kind: '단계정리'" automation/admin/admin.gs 1
# [STALE_ROLLBACK_WIDE] 문구가 «입금 확인됨» 고정에서 «계약금·중도금·잔금 이름 나열»로 진화 — 같은 불변식의 새 꼴
chk "확인됨 · 단계 정리 필요" automation/admin/admin.gs 1
chk 'STALE_ROLLBACK_Q' scripts/audit/journey-sim.mjs 2
chk 'WORLD_READ' scripts/audit/_gasworld.mjs 1     # 월드가 시트 읽기(getLastRow·getValues)도 지원 — adminHome 을 진짜로 부를 수 있게
# ★★[UNDO_BEHIND 2026-08-17 사용자 스크린샷 «되돌릴 수 없어요»] 되돌려진 상태의 되돌리기를 막지 않는다.
#   강제변경으로 단계가 입금완료보다 앞으로 간 상태에서 계약금 취소를 누르면 차단 C 가
#   «이미 계약완료(으)로 진행된 고객이에요»라고 거짓말했다(계약완료는 입금완료보다 앞이다).
#   behind 는 C·E 면제(강제변경만이 만드는 이상 상태) — 전진 고객 보호(C)·24시간 창(E)·영수증(B)·종료(D)는 그대로.
#   ★단계는 입금완료에 서 있을 때만 계약완료로 내린다 — behind 에서 앞으로 «올리면» 그게 새 사고다.
chk 'UNDO_BEHIND' automation/admin/admin.gs 4
chk '_ubBehind' automation/admin/admin.gs 3
# ★★[STALE_ROLLBACK_WIDE 2026-08-17] 갇힘 탐지를 계약금 하나에서 중도금·잔금으로 넓혔다.
#   behind 취소로 계약금만 비우면 중도금·잔금 '확인' 잔재가 남는데 구 조건(입금==='확인')이 놓쳤다.
chk 'STALE_ROLLBACK_WIDE' automation/admin/admin.gs 3
chk '_srPaid' automation/admin/admin.gs 6
# ★★[ROLLBACK_ONECLICK 2026-08-17 사용자 지시 "처리할일에 나오고 원클릭으로 팝업 안내 · 진행 클릭이면 모든셋팅"]
#   단계정리 큐에 인라인 「단계 맞추기」 — 팝업이 두 갈래(단계 맞추기/확인 취소)를 안내하고 한 번에 처리.
#   ★잔금 판정은 raw 로 — mirror.balance 는 되돌려진 단계에서 null 이라 반쪽 정리가 된다(queue-oneclick ⑤).
chk 'ROLLBACK_ONECLICK' admin.html 3
chk 'doFixStage' admin.html 2
chk 'fxUndo' admin.html 2
chk "'단계정리':'fixStage'" admin.html 1
chk 'ROLLBACK_REDO' scripts/audit/rollback-redo.mjs 1
chk 'QUEUE_ONECLICK' scripts/audit/queue-oneclick.mjs 1

# ★★★[SHARE_WEDUP 2026-08-17 사용자 결정] 권하는 곳 = WedUploader(부부 구글드라이브 직송).
#   카톡 1:1 을 내린 이유: "1:1 카톡 이용은 전문성이 없어 보인다" + "부부가 답장을 해줘야 하는 번거로움".
#   대기업 8곳(애플·구글·네이버·카카오·아마존·삼성·어도비·MS) 전부 계정 로그인 필수라 이름값으로 고를 길이 없다.
#   그래서 「안정적」을 회사 크기가 아니라 **사진이 어디에 쌓이느냐**로 다시 정의했다 —
#   직송형은 업체가 망해도 부부 드라이브에 사진이 남는다(업체는 예식 당일 하루만 살면 된다).
#   ★스냅웨딩 복원 금지: 개업 5개월 개인사업자 · 통신판매업 번호 불일치 · 4개월 만에 보관 90일→3일 · 종료 조항 없음.
#   ★드롭박스 복원 금지: 하객 이름+이메일 강제(못 끔) · 부부에게 업로드마다 알림 메일(못 끔).
chk 'SHARE_WEDUP' mypage.html 3
chk 'SHARE_WEDUP' guide.html 1
chk "weduploader\\\\.com" mypage.html 1
# ★[GUEST_PHOTO_IN 2026-08-17] 위 두 chk(weduploader 권장 문구·부부 드라이브 직송 문구)는 **정당한 폐지**로 내렸다.
#   우리가 직접 받게 되면서 그 자리 첫 줄이 '남의 링크를 넣어 주세요'에서 '준비하실 건 없어요'로 바뀌었다.
#   외부 링크 안내 자체는 접힌 「다른 방법도 되나요」 안에 남아 있고, 그쪽은 아래에서 지킨다.
chk '가입도 이름 입력도 없이' mypage.html 1        # 외부 링크(weduploader)를 넣었을 때의 안내는 살아 있다
chk '가입도 이름 입력도 없이' mypage.html 1
chk '예식 전날 한 번 열어' mypage.html 1              # 직송형 공통 약점(OAuth 끊김) 안내
chk 'BROWSE FILES' guide.html 1                       # 영어 두 단어를 한국어로 덮는 유일한 자리
chk '이름도 가입도 필요 없어요' guide.html 1
nochk '카톡 → <b>오픈채팅 → 1:1 채팅방</b>을 만들어' mypage.html   # 권장 자리에서 카톡 복원 금지
# ★단어 자체를 막지 않는다 — 「왜 안 권하나」를 적은 주석이 같은 단어를 쓰기 때문이다.
#   막을 것은 **고객이 읽는 문구**이고, 지켜야 할 것은 **근거 주석**이라 둘을 나눠 검사한다.
chk '스냅웨딩은 권하지 않는다' mypage.html 1     # 근거가 사라지면 다음 리뷰가 다시 후보로 올린다
nochk '<b>스냅웨딩</b>' mypage.html               # 고객 화면 문구로는 복원 금지
nochk '스냅웨딩' guide.html                       # 하객 화면엔 주석도 없다 — 통째로 금지
chk 'placeholder="링크 붙여넣기 (weduploader.com)"' mypage.html 1   # [SHARE_WEDUP] 자리표시가 안내와 어긋나지 않게
nochk '링크 붙여넣기 (1:1 오픈채팅방)' mypage.html
# ★★[SHARE_DRIVE_ROOM 2026-08-17] 용량도 함께 보게 한다 — 연결보다 더 자주 일어나고 더 조용히 망한다.
#   구글 드라이브 15GB 는 지메일·구글포토와 나눠 쓰는 한 덩어리라, 사진이 작아도 남은 자리가 없으면 실패한다.
#   게다가 드라이브가 차면 지메일 수신까지 멈춘다. 사진은 우리를 안 거치므로(PHOTOSHARE_DIRECT)
#   우리가 대신 봐 줄 수 없다 — 우리가 못 보는 것을 부부가 보게 만드는 줄이다.
chk 'SHARE_DRIVE_ROOM' mypage.html 1
chk '남은 용량</b>을 봐 주세요' mypage.html 1
chk '드라이브가 꽉 차면 사진이 안 들어와요' mypage.html 1

# ★★★[GUEST_PHOTO_IN 2026-08-17 사용자 지시] 하객 사진을 우리 페이지에서 직접 받는다(외부 서비스 없이).
#   사용자 원문: "오프라인 청첩장 하객안내 페이지에서 사진올리기 누르면 자동으로 구글 드라이브에 업로드되는 시스템말이야"
#   ■ 지켜야 할 것들 — 하나라도 빠지면 예식 당일에 사진이 통째로 사라진다
#     · 열 가드(_gp 폴더ID 없으면 저장 거부) — writeCell 이 헤더 없는 컬럼을 조용히 건너뛰기 때문
#     · 만료 동기(_guideExpired) — 안내 화면은 닫혔는데 업로드 구멍만 열려 있으면 안 된다
#     · 파일 쓰기는 잠금 밖 — 잠그고 쓰면 하객들이 줄을 서다 당일에 실패한다
#     · 순차 전송 + 실패분 재시도 — 몰아 보내면 한 장 실패에 전부 잃는다
chk 'GUEST_PHOTO_IN' automation/platform/80_production.gs 1
chk 'GUEST_PHOTO_IN' guide.html 2
chk 'GUEST_PHOTO_IN' mypage.html 2
chk 'function handleGuestPhoto' automation/platform/80_production.gs 1
chk "case 'guestPhoto'" automation/consultation/consultation-booking.gs 1
chk 'function addGuestPhotoColumns' automation/platform/80_production.gs 1
chk 'function purgeGuestPhotos' automation/platform/80_production.gs 1
chk "colOf\['하객사진폴더ID'\]" automation/platform/80_production.gs 3    # 열 가드 · 폴더 확보 · 정리
chk '_guideExpired' automation/platform/80_production.gs 3               # 안내·업로드 만료 기준 동기
chk 'guestPhoto:' automation/platform/80_production.gs 1                 # 부부 화면 표시용 필드
chk 'function bindGuestUpload' guide.html 1
chk 'function guestUploadHtml' guide.html 1
chk "action:'guestPhoto'" guide.html 1
chk 'gpRetry' guide.html 2                                               # 실패분 다시 시도 — 조용히 넘어가지 않는다
chk '이름도 가입도 필요 없어요' guide.html 1
chk '안내 페이지에서 바로</b> 사진을 올려요' mypage.html 1
nochk 'weduploader.com</b>에서 앨범을 만들고' mypage.html                 # 권장 자리에서 외부 링크 안내 복원 금지
chk 'GP_NO_REPAINT' guide.html 3                                         # 올리는 중 재렌더 금지(진행 표시가 사라지던 결함)
chk 'GUEST_PHOTO_SIM' scripts/audit/guest-photo-sim.mjs 1
# ★서버 판정을 기계가 확인한다 — 예식 당일은 재시도가 없으므로 배포 전에 여기서 걸러야 한다.
node scripts/audit/guest-photo-sim.mjs >/dev/null 2>&1 && echo "ok guest-photo-sim (17항목)" || { echo "FAIL guest-photo-sim — node scripts/audit/guest-photo-sim.mjs"; fail=1; }

# ★★★[GPM_MODAL 2026-08-18 사용자 지시] 메인 홈페이지 청첩장 소개 → 하객 사진 안내 모달.
#   사용자 원문: "오프라인 하객안내 사진올리기부분 클릭시 어떻게 되며 신랑신부에게 어떻게 전달이되는지
#   장점 위주로 홍보 적절하게 팝업형식으로" · "디자인적으로 마케팅적으로 완성도높게"
#   ★자동으로 뜨지 않는다 — 브랜드 규칙이 팝업(자동 노출)을 금지한다. 타이머·스크롤·이탈 감지 금지.
#   ★[ADV_TC] 오버레이 계약 — 불투명 크림이라 상태바를 크림으로 '고정'한다. 잠그지 않으면
#     position:fixed 가 무너뜨린 scrollY 를 히어로 핸들러가 읽고 진사로 되돌린다(아이폰 검은 띠).
#   ★닫을 때 __meTCSync() 는 잠금 해제 뒤에 부른다 — 캐시를 비워야 복귀가 안 씹힌다.
chk 'GPM_MODAL' assets/guest-photo-modal.js 1
chk 'GPM_MODAL' index.html 2
chk 'data-gpm-open' index.html 1
chk 'guest-photo-modal.js' index.html 1
# ★[GPM_MODAL 트리거 자리 2026-08-18 사용자 지시 «여기 ... 부분은 없어도될거같아»]
#   「두 편의 청첩장」 카드 안 트리거 한 줄은 삭제했다. 세 장을 나란히 비교하는 칸이라 한 칸에만
#   더 읽을 것이 붙으면 리듬이 어긋나고, 비교하러 온 사람을 딴 데로 데려간다.
#   ★복원 금지 — 모달은 살아 있고, 여는 자리는 목업의 [GA_POPLINK] 한 곳이다.
nochk '하객 사진은 어떻게 오나요' index.html
chk '__meTCLock = 1' assets/guest-photo-modal.js 1
chk '__meTCSync' assets/guest-photo-modal.js 1
chk 'aria-modal' assets/guest-photo-modal.js 1
chk 'prefers-reduced-motion:reduce' assets/guest-photo-modal.js 1
chk 'transition-delay:0s' assets/guest-photo-modal.js 1          # 지속시간만 죽이면 늦게 뜬다([DTL16] 5번)
chk 'gold-text' assets/guest-photo-modal.js 3                    # 글자와 같은 줄의 글리프는 --gold-text(2.54:1 금지)
nochk 'setTimeout(open' assets/guest-photo-modal.js              # 자동 노출 금지
nochk 'scroll.*open()' assets/guest-photo-modal.js

# ★★[GOLD_BAR_OFF 2026-08-18 사용자 지적 "골드선이 조금 올드해보이는데"] 왼쪽 세로 골드바를 두 곳에서 걷었다.
#   세로 골드바는 인용문(blockquote) 관용구라 에디토리얼이 아니라 옛 블로그처럼 읽힌다.
#   그 바가 지던 뜻(종속·읽기전용)은 소제목과 들여쓰기가 이미 낸다 — 선은 가장 시끄러운 구분자다([ADV_INDEX] 1번).
#   ★되살리지 말 것. 밋밋해 보이면 선이 아니라 **항목 사이 여백**부터 늘릴 것.
chk 'GOLD_BAR_OFF' mypage.html 1
chk 'GOLD_BAR_OFF' assets/guest-photo-modal.js 1
nochk 'border-left:2px solid var(--gold)' mypage.html
nochk "gpm-gains{border-left" assets/guest-photo-modal.js

# ★★★[GA_TABS 2026-08-18 사용자 지시] 하객이 만나는 화면 = 실물 두 판(온라인 라이브 · 오프라인 하객안내)을 탭으로.
#   손으로 베낀 목업(.mock-slide 4장)을 실물 iframe 으로 바꿨다 — [GV_REAL] 이 이미 정한 원칙이다
#   ("갤러리는 실물을 src로 띄운다, 사본 금지. 실물이 바뀌면 미리보기도 저절로 같다").
#   ★src 는 화면에 들어올 때만 넣는다(첫 로드 비용 0) · 데모 경로는 GAS 를 부르지 않는다(LIVE_DEMO·GUIDE_DEMO).
#   ★iframe 에 tabindex="-1" + inert — 폰 그림 안에 포커스 가능 요소 0개라는 전제를 지킨다(실측 통과).
#   ★live.html 의 html.me-inframe .reveal{opacity:1} 을 지우지 말 것 — 없으면 미리보기가 통째로 백지다.
chk 'GA_TABS' index.html 3
chk 'GA_TABS' live.html 1
chk 'id="gaFrame"' index.html 1
chk 'inert' index.html 1
chk 'live.html?e=test-couple' index.html 1
chk 'guide.html?g=demo' index.html 1
chk 'html.me-inframe .reveal{opacity:1;transform:none}' live.html 1
nochk "querySelectorAll('.live-mockup-wrap .mock-slide')" index.html   # 옛 슬라이드 스크립트 복원 금지
# ★★[LIVE_DEMOTE 2026-08-18 사용자 지시 "라이브홍보를 격하 · 선택 안하는 고객도 손해보는 느낌이 없게"]
#   섹션 축을 '디지털 참석'에서 '하객이 만나는 화면'으로 올렸다. 라이브는 그중 하나다.
#   ★'고르지 않으셔도 손해 없다'는 **섹션 머리**에 있어야 한다 — 탭 각주에 있으면 그 탭을 연 사람만 본다.
chk 'LIVE_DEMOTE' index.html 2
chk 'live-optional' index.html 2
chk '고르지 않으셔도 예식 영상은 추가금 없이' index.html 1
nochk 'SELECTIVE PRESENCE' index.html
# ★★[GA_SYNC 2026-08-18 사용자 지적 "글씨에 맞춰 화면전환되는 기능까지점검"] 목록 ↔ 폰 화면 연동.
#   실물 iframe 으로 바꾸면서 한 번 잃었던 기능이다 — 목록이 '폰에 안 보이는 화면'을 설명하면 글과 그림이 따로 논다.
#   같은 출처라 안쪽 문서를 직접 스크롤한다. 항목 표의 넷째 칸이 그 자리(선택자 또는 sec:n)다.
#   ★모션 최소화 설정이면 저절로 넘기지 않고, 화면 밖으로 나가면 멈춘다.
chk 'GA_SYNC\|목록 ↔ 폰 화면 연동' index.html 1
chk 'var RM = window.matchMedia' index.html 1
chk "key.indexOf('sec:')" index.html 1
chk 'id="gaPages"' index.html 1
# ★★[GA_FRAME_FLEX 2026-08-18 사용자 실기기 지적 "화면이좀 이상한데"] .phone-screen 은 flex 컨테이너다.
#   flex 아이템이면 iframe 에 준 height 가 무시되고 상자 높이로 눌린다 — 실측 825px 지정에 innerHeight 524.
#   그 상태로 0.63배 축소하니 실제로 그려진 높이가 333px 뿐이라 폰 아래가 191px 비어 흰 띠로 보였다.
#   ★flex:none 을 빼면 흰 띠가 그대로 돌아온다.
chk 'GA_FRAME_FLEX\|flex 아이템이면 지정한 height' index.html 1
chk 'flex: none; align-self: flex-start;' index.html 1
# ★[GUEST_PHOTO_IN] 하객 안내 표본은 photoShare 를 비워 둔다 — 비어야 우리 업로드 화면이 뜬다(현재 기본값).
#   옛 표본은 외부 주소를 넣어 두어 '두 분이 준비한 외부 공간' 안내가 떴다(홈 홍보와 어긋남).
nochk "photoShare:'https://momentedit.kr/'" guide.html
chk '표본은 \*\*비워 둔다\*\*' guide.html 1



# ★★[UNDO_ALL 2026-08-17 사용자 질문 "강제되돌리기 돌려도 … 원클릭으로 가능한거야?"] 실측 답이 «아니오»였다.
#   계약완료로 되돌린 경우만 「단계 맞추기」가 됐다 — 더 앞으로 되돌리면 _clearForwardData 가 계약상태를
#   비워 서버가 «계약 서명 완료 후 입금 확인이 가능합니다»로 거부(큐엔 뜨는데 원클릭은 실패).
#   또 계약금만 취소하면 중도금·잔금 잔재가 남아 큐가 다시 떴다 — 3클릭은 원클릭이 아니다.
#   → 갈래를 «계약 유무»로 정하고, 취소는 '전체' 한 번으로 끝낸다. 불변식: 한 번 누르면 큐가 빈다.
chk 'UNDO_ALL' automation/admin/admin.gs 3
chk "'전체'" automation/admin/admin.gs 3
chk 'UNDO_ALL_UI' admin.html 2
chk 'ROLLBACK_ANYWHERE' scripts/audit/rollback-anywhere.mjs 1
# ★★[BLOCK_CHAIN 2026-08-17 사용자 지시 "현금영수증 발행취소같은것도 확인 메세지 나와서 바로선택해서 넘길수있게"]
#   막혔으면 «막혔다»로 끝내지 않고 그 다음 손잡이를 그 자리에 낸다(영수증 취소 → 이어서 입금 확인 취소).
#   ★무엇이 막는지는 blockKey 로 온다 — 화면이 한글 문구를 파싱하면 문구를 다듬는 순간 조용히 깨진다.
#   ★카드(A)는 이어 붙이지 않는다 — 토스에서 먼저 취소해야 하는 바깥 일이라 안내만 한다.
chk 'BLOCK_KEY' automation/admin/admin.gs 1
chk 'blockKey' automation/admin/admin.gs 2
chk 'BLOCK_CHAIN' admin.html 1
chk '진행 · 영수증 취소 후 계속' admin.html 1
# ★★[SHARE_DRIVE_ROOM 2026-08-17] 용량도 함께 보게 한다 — 연결보다 더 자주 일어나고 더 조용히 망한다.
#   구글 드라이브 15GB 는 지메일·구글포토와 나눠 쓰는 한 덩어리라, 사진이 작아도 남은 자리가 없으면 실패한다.
#   게다가 드라이브가 차면 지메일 수신까지 멈춘다. 사진은 우리를 안 거치므로(PHOTOSHARE_DIRECT)
#   우리가 대신 봐 줄 수 없다 — 우리가 못 보는 것을 부부가 보게 만드는 줄이다.
chk 'SHARE_DRIVE_ROOM' mypage.html 1
chk '남은 용량</b>을 봐 주세요' mypage.html 1
chk '드라이브가 꽉 차면 사진이 안 들어와요' mypage.html 1
# ★★[ROLLBACK_ROUNDTRIP 2026-08-17 사용자 지시 "되돌리기(강제변경) … 의도를 파악후 시뮬레이션 … 문제점 개선점"]
#   파악한 의도 = 강제변경은 사고 복구용 비상구다. 그러니 ①갇히지 않고 ②상태가 앞뒤 맞고
#   ③되돌린 뒤 **다시 끝까지 갈 수 있어야** 한다. ③은 앞선 검사들(anywhere·redo)이 안 보던 것이다 —
#   «정리됐다»가 «여정이 이어진다»를 뜻하지 않기 때문. 왕복으로 걸어 봐야 안다.
#   예외(취소·노쇼·미계약) + 환불완료 표시까지 붙인 최악 조건에서의 복구도 함께 고정한다.
chk 'ROLLBACK_ROUNDTRIP' scripts/audit/rollback-roundtrip.mjs 1
chk '다시 결과물전달까지 완주' scripts/audit/rollback-roundtrip.mjs 1
chk '환불완료 흔적이 지워진다' scripts/audit/rollback-roundtrip.mjs 1
# ★★[ROLLBACK_NOTICE 2026-08-17 사용자 지시 "관리자에의해 되돌라갔다 … 고객마이페이지 화면에 팝업 안내"]
#   되돌리면 고객 화면이 **조용히** 앞 단계로 돌아갔다 — 서명한 계약이 사라진 것처럼 보이는데 설명이 없다.
#   ★관리자 사유·컬럼 이름은 고객에게 안 나간다 · «관리자/강제변경» 같은 내부 용어도 쓰지 않는다(디렉터로).
#   ★해소되면 서버가 애초에 안 내려준다(buildRollbackNotice) — 지난 일을 말하는 안내는 소음이다.
chk 'ROLLBACK_NOTICE' automation/admin/admin.gs 1
chk 'ROLLBACK_NOTICE' automation/platform/60_mypage.gs 2
chk 'ROLLBACK_NOTICE' mypage.html 2
chk 'buildRollbackNotice' automation/platform/60_mypage.gs 2
chk '화면이 앞 단계로 돌아가 있어요' mypage.html 1
# ★내부 용어 금지는 «실제로 화면에 나가는 줄»만 본다 — 근거를 적은 주석까지 걸면
#   설명을 지워야 통과하게 되어, 검사가 문서를 갉아먹는다(그러면 다음 사람이 이유를 모른다).
#   화면 문구는 lines.push(...) 안에만 있으므로 그 꼴로 겨눈다.
nochk "lines.push('관리자" mypage.html
chk 'ROLLBACK_NOTICE' scripts/audit/rollback-notice.mjs 1
# ★★[KEEP_SIGNAL 2026-08-17 조사 실측] 입금 '완료신호'도 되돌림에 보존 — 이미 이체한 분께 또 내라고 하지 않는다.
chk 'KEEP_SIGNAL' automation/admin/admin.gs 1
chk "_v === '확인' || _v === '완료신호'" automation/admin/admin.gs 1
# ★★[FORCE_EXIT_TS 2026-08-17 조사 실측] 노쇼·미계약도 기준일을 찍는다 — 환불 예정액이 매일 흔들리던 것 차단.
chk 'FORCE_EXIT_TS' automation/admin/admin.gs 1
chk 'STAGE_EXCEPTIONS.indexOf(targetStage) !== -1) {' automation/admin/admin.gs 1
# ★★[KEEP_MONEY_BASIS 2026-08-17 조사 실측] 수납이 살아 있으면 «금액의 근거»도 함께 남긴다.
#   종전엔 입금상태='확인'은 보존하면서 계약총액·예식일·시착벌수는 무조건 지웠다 →
#   «받은 돈은 기록에 남았는데 얼마인지 아무도 모르는» 상태. 현금영수증 큐 금액이 비고,
#   고객 내 내역에서 결제가 통째로 사라지고, 재취소 때 시착 공제가 빠져 과다 환불이 났다.
chk 'KEEP_MONEY_BASIS' automation/admin/admin.gs 2
chk '_rbPaidAny' automation/admin/admin.gs 3
# ★★[EXIT_TS_REFRESH 2026-08-17] 정상→예외 «전환»이면 기준일을 다시 찍는다.
#   멱등 가드 탓에 재취소 시 첫 취소일에 굳어 위약 구간이 틀린 값으로 계산됐다.
chk 'EXIT_TS_REFRESH' automation/admin/admin.gs 1
chk '_exFresh' automation/admin/admin.gs 2
# ★★[FORCE_MODAL_TRUTH 2026-08-17] 마지막 확인창이 하드코딩 거짓말을 하고 있었다 —
#   앞으로 가는 복구에도 «초기화돼요», 신청접수로 내릴 땐 «상담 예약은 별개예요»(실제로는 초기화된다).
#   서버 미리보기를 다시 물어 그 답을 그대로 읽는다. 예고가 곧 실행이라야 확인창이 뜻을 갖는다.
chk 'FORCE_MODAL_TRUTH' admin.html 1
nochk '상담 예약(캘린더)은 별개예요' admin.html

# ★★[FITTING_SPLIT 2026-08-18] 시착은 컬럼과 기록을 나눠 다룬다 —
#   컬럼(시착동의상태)을 남기면 되돌린 뒤 「시착 동의 보내기」가 already 로 조용히 넘어가
#   단계가 안 올라가고 「상담완료 처리」가 거부된다(관리자가 그 자리에 갇힘 · 실측 재현).
#   기록(동의기록.시착)은 수납이 있으면 남긴다 — 벌수가 환불 공제의 근거(계약서 4조⑧).
chk 'FITTING_SPLIT' automation/admin/admin.gs 1
chk "{ cols: \['시착동의상태', '시착동의일시'\], at: '시착' }," automation/admin/admin.gs 1
# ★★[CONTRACT_STAGE_GATE 2026-08-18] 예식일만으로 계약서를 보낼 수 있던 우회로 차단.
#   KEEP_MONEY_BASIS 로 예식일을 보존하게 되면서, 되돌린 고객이 시착·상담완료를 건너뛴 채
#   계약완료로 올라갔다(왕복 검사의 발자국이 «안 밟음: 시착·상담완료»로 잡아냄).
chk 'CONTRACT_STAGE_GATE' automation/admin/admin.gs 1
chk '_consultDone' automation/admin/admin.gs 2
# ★★[CONTRACT_AMOUNT_REQ 2026-08-18] 총액이 지금도 없고 이번에도 안 오면 계약서 발송을 막는다.
#   무작위 순서 검사(rollback-fuzz)가 «받은 돈은 있는데 얼마인지 모르는» 상태를 15회 만들어 냈다.
chk 'CONTRACT_AMOUNT_REQ' automation/admin/admin.gs 1
# ★★[STAGE_REVIEW_DOOR 2026-08-18] '후기'로 올려 주는 문. 이게 없으면 STAGE_FLOW 의 마지막 칸이
#   강제변경으로만 닿는 방이 된다(stage-reach 도달성 검사가 마지막까지 붉게 남겼던 지적).
chk 'STAGE_REVIEW_DOOR' automation/consultation/consultation-booking.gs 1
chk "review:   '후기'," automation/consultation/consultation-booking.gs 1
chk 'STAGE_REVIEW_DOOR' automation/platform/80_production.gs 1
chk 'STAGE_REVIEW_DOOR' automation/admin/admin.gs 1
# ★★[REFUND_MARK_TRACE 2026-08-18] 예외→정상 복구가 «환불완료» 표시를 지운 사실을 처리이력에 남긴다.
#   안 남기면 이미 송금한 고객이 «입금 확인 · 환불 흔적 없음»으로 보여 두 번 송금할 수 있다.
chk 'REFUND_MARK_TRACE' automation/admin/admin.gs 2
# ★★[WALK_TRACE 2026-08-18] 왕복 검사는 도착지만 묻지 않는다 — 걸음마다 단계를 적어
#   «건너뛰고 도착한» 여정을 잡는다. 이 발자국이 FITTING_SPLIT 회귀를 실제로 찾아냈다.
chk 'WALK_TRACE' scripts/audit/rollback-roundtrip.mjs 1
chk '건너뛴 단계 없이 밟고 갔다' scripts/audit/rollback-roundtrip.mjs 1
# ★★[ROLLBACK_FUZZ 2026-08-18] 무작위 순서 + 불변식 검사. 정해진 길만 걷는 검사들이 못 보는 자리를 본다.
chk 'ROLLBACK_FUZZ' scripts/audit/rollback-fuzz.mjs 1
chk 'FUZZ_COVER' scripts/audit/rollback-fuzz.mjs 1
# ★★[REVIEW_DOOR_AUDIT 2026-08-18] '후기' 문 하나만 초 단위로 확인하는 검사(stage-reach 는 10분이라 자주 못 돈다).
chk 'REVIEW_DOOR_AUDIT' scripts/audit/review-door.mjs 1
chk '결과물전달 → 후기 (고객 제출이 문이다)' scripts/audit/review-door.mjs 1
# ★★[RB_NOTICE_TRUTH 2026-08-18] 되돌림 팝업의 첫 줄은 «조건»이다 —
#   수납이 없는 고객은 예식일·계약총액이 실제로 지워지는데, 종전엔 «그대로예요»가 무조건 첫 줄이라
#   바로 아래 «계약 내용 · 예식 일정을 다시 진행하시게 돼요»와 한 팝업 안에서 모순됐다(실측).
chk 'RB_NOTICE_TRUTH' mypage.html 1
chk 'RB_NOTICE_TRUTH' scripts/audit/rollback-notice.mjs 1
nochk "var lines = \['예식 일정과 계약 내용은 그대로예요.'\]" mypage.html
# ★★[MODAL_DISMISS 2026-08-18] 팝업은 버튼으로 닫는다 — class 만 떼면 _mpModalBusy 가 풀리지 않아
#   그 뒤 팝업이 큐에 쌓인 채 영영 안 뜬다. 그 탓에 «두 번째엔 안 뜬다»가 엉뚱한 이유로 초록이었다.
chk 'MODAL_DISMISS' scripts/audit/rollback-notice.mjs 1
chk '전제 — 첫 진입엔 뜬다' scripts/audit/rollback-notice.mjs 1
# ★★[GUIDE_TOKEN_CLEAR 2026-08-18] 되돌리면 공개 링크 열쇠도 함께 버린다 —
#   안내 허브·좌석은 무인증 페이지라 토큰만 알면 열리고, 그 화면엔 두 분의 실명이 실린다.
#   내용만 지우고 열쇠를 남기면 이미 뿌려진 QR 이 계속 열린다(실측).
chk 'GUIDE_TOKEN_CLEAR' automation/admin/admin.gs 1
chk "'안내공유토큰', '좌석공유토큰'\]), at: isSnap" automation/admin/admin.gs 1
# ★★[GUIDE_EXPIRE_FAILCLOSED 2026-08-18] 예식일을 모르면 «만료»로 본다 — 개인정보는 모를 때 닫는다.
#   종전엔 열어 뒀고, 미수납 되돌림에선 예식일까지 지워져 영영 만료되지 않았다.
chk 'GUIDE_EXPIRE_FAILCLOSED' automation/platform/80_production.gs 1
chk '옛 링크로는 더 이상 안 열린다' scripts/audit/rollback-roundtrip.mjs 1
# ★★[GP_DONE_SHEET 2026-08-18 사용자 지시 "이 멘트는 굳이 필요한가 · 팝업으로 확인메세지 나오면 될거같은데
#   저 문구 삭제하고 팝업으로 대체하고 표본 미리보기 부분에서도 삭제하자"]
#   버튼 아래 늘 떠 있던 안내 세 줄을 뺐다. 하객은 «누르기 전»에 그 글을 읽지 않는다 —
#   읽는 순간은 «올린 직후»이고 그때는 확인 한 마디면 된다. 그 말을 시트가 맡는다.
#   ★진행(「3 / 5 올리는 중」)과 실패(「다시 시도」)는 그대로 인라인이다 —
#     진행은 계속 보여야 하고 실패엔 누를 버튼이 붙는다. 시트로 옮기면 둘 다 망가진다.
#     실측: 전부 성공 → 인라인 숨김·시트 「3장 전해졌어요」 / 일부 실패 → 인라인 유지·시트 안 뜸.
#   ★시트는 페이지에 «하나»만 둔다(sheetEnsure/sheetOpen) — 표본 안내와 업로드 확인이 같은 것을 쓴다.
#     구현이 둘이면 여닫는 규칙·초점 되돌리기·Esc 가 갈라진다.
#   ★표본에 결과를 «미리 그리던» 자리(옛 DEMO_PHOTO_DONE)는 폐지했다. 되살리지 말 것 —
#     그 판단(핵심을 상호작용 뒤에 숨기지 말자)은 시트가 이어받았다(누르면 답한다).
chk 'GP_DONE_SHEET' guide.html 4
chk 'function gpDoneMsg' guide.html 1
chk 'GP_DONE_SUB' guide.html 2
chk 'function sheetEnsure' guide.html 1
chk "sheetOpen('Photos', gpDoneMsg(done), sub, pick)" guide.html 1
nochk 'id=\"gpNote\"' guide.html                 # 폐지한 정적 안내 줄 — 시트가 그 말을 맡는다
nochk 'gpS.innerHTML' guide.html                  # 표본에 결과를 미리 그리던 자리
# ★[DEMO_REAL_COPY] 그 약속을 브라우저에서 실제로 재는 자 — 실제 화면을 만드는 함수를 페이지 안에서
#   직접 불러 표본이 그려 놓은 글과 맞춘다. 검사에 문구를 베껴 적지 않는다(베끼면 검사부터 낡는다).
#   ★적대 검증 완료 — 표본 결과 줄만 한 글자 고쳐 보니 exit 1 로 걸렸다.
chk 'DEMO_REAL_COPY' scripts/audit/demo-real-copy.mjs 1
chk '표본이 실제와 같은 말을 한다' scripts/audit/demo-real-copy.mjs 1
chk 'cantLook' scripts/audit/demo-real-copy.mjs 1            # 브라우저 없는 자리에선 '못 봤다'고 말하고 비켜선다(초록 아님)
# ★종료코드 셋을 가른다 — 0 잰 결과 초록 · 2 브라우저가 없어 «안 쟀다» · 그 외 불일치.
#   2026-08-18 실측: 안 쟀는데 «ok 표본=실제 문구»라고 찍혔다(CI·170ms). 안 본 것을 봤다고 말하지 않는다.
#   ★CI 러너엔 playwright 가 없어 늘 2로 비켜선다 — 실제로 재는 자리는 «푸시 전 로컬»이다.
#     CI 도 재게 하려면 워크플로에 playwright 설치를 더해야 한다(아직 안 했다 · 여기 적어 둔다).
node scripts/audit/demo-real-copy.mjs >/dev/null 2>&1; _drc=$?
case "$_drc" in
  0) echo "ok demo-real-copy (표본=실제 문구)" ;;
  2) echo "· demo-real-copy 안 쟀다(브라우저·서버 없는 자리) — 푸시 전에 손으로: node scripts/audit/demo-real-copy.mjs" ;;
  *) echo "FAIL demo-real-copy — node scripts/audit/demo-real-copy.mjs"; fail=1 ;;
esac

# ★★[ROLLBACK_SLOT 2026-08-18 사용자 결정 «추천대로»] 되돌려도 예식 자리는 이 부부 것으로 잠근다.
#   점유 판정(_weddingOccupancy)이 계약상태를 함께 보므로, 되돌리면 그냥 두면 그 날짜가 다른 분께 열린다.
#   확정 점유를 임시고정(승인·14일)으로 되돌려 잠그고, 여는 것은 관리자가 확인창에서 고른다(기본 잠금).
chk 'ROLLBACK_SLOT' automation/admin/admin.gs 5
chk '_rbConfirmedSlot' automation/admin/admin.gs 3
chk '_rbSlotPlan' automation/admin/admin.gs 3
chk 'ROLLBACK_SLOT' admin.html 2
chk 'fSlotOpen' admin.html 2
# ★★[ROLLBACK_SLOT 캘린더] 확정된 예식은 «지우지 않는다» — 제목만 [가예약]·[보류]로 바꾼다.
#   지우면 되돌릴 수 없고, 사고 복구용 되돌림에서 예식이 달력에서 통째로 사라진다.
chk '_rbCalRetitle' automation/admin/admin.gs 4
chk "String(_fsRep.holdCal.status || '') === '계약전환'" automation/admin/admin.gs 1
chk 'ROLLBACK_SLOT' automation/platform/70_journey.gs 1
nochk "_hev.getTitle().replace('\[가예약\]', '\[예식확정\]')" automation/platform/70_journey.gs
chk 'ROLLBACK_SLOT_AUDIT' scripts/audit/rollback-slot.mjs 1
chk '되돌린 뒤에도 자리가 이 부부 것이다' scripts/audit/rollback-slot.mjs 1

# ★★[DEMO_TIP 2026-08-18 사용자 제안 "저 메세지를 팝업으로 · 고객이 누르면 직관적으로 확인할수있게"]
#   표본(미리보기) 화면의 버튼은 종전에 **죽은 버튼**이었다 — 눌러도 아무 일이 없고,
#   왜 안 되는지는 화면 맨 아래 각주에만 적혀 있었다. 누르는 사람은 그 각주를 보지 않는다.
#   이제 누르면 그 자리에서 시트가 올라와 «실제 예식에서는 이렇게 됩니다»를 말한다.
#   ★두 모양 모두 잡아야 한다 — 지도는 <a class="act">, 사진은 우리 업로더의 <button id="gpPick">.
#     a.ps-btn 만 보던 초판은 사진 버튼을 놓쳐 팝업이 붙지 않았다.
#   ★표본에서만 — 실제 하객 페이지의 버튼은 그대로 동작해야 하므로 renderDemo 경로 안에만 있다.
chk 'DEMO_TIP' guide.html 2
chk "psB.setAttribute('data-dtip','photo')" guide.html 1
chk '표본이라 사진이 올라가지 않아요' guide.html 1
chk '눌러 보시면' guide.html 1

# ★★[GA_POPLINK 2026-08-18] 홈 목업의 폰은 inert 라 안을 누를 수 없다(접근성 계약 — 초점이 프레임에 갇히면 안 된다).
#   그래서 «사진 올리기» 줄에는 목록 쪽에 설명 팝업(GPM_MODAL)을 여는 단추를 따로 둔다.
#   폰 안을 누를 수 있게 inert 를 푸는 방향으로 되돌리지 말 것 — Tab 25회 측정으로 0회 진입을 확인한 계약이다.
chk 'GA_POPLINK' index.html 2
chk '어떻게 오는지 보기' index.html 1

# ★★[SLOT_HOLD_EXPIRY_Q 2026-08-18 점검] 되돌리며 «잠가 둔» 자리가 조용히 풀리지 않게.
#   만료 안내(D-3)는 고객에게만 간다. 되돌린 것도, 계약서를 다시 보낼 사람도 관리자다 —
#   공을 쥔 쪽이 아무 신호를 못 받으면 14일 뒤 그 날짜가 아무도 모르게 열린다.
chk 'SLOT_HOLD_EXPIRY_Q' automation/admin/admin.gs 1
chk "kind: '자리만료'" automation/admin/admin.gs 1
chk "'자리만료'" admin.html 2
# ★★[DATE_ONE_STYLE 2026-08-18 점검] 한 문장 안에서 날짜 표기를 섞지 않는다
#   (2026.12.20(일) 과 2026-08-20 이 한 줄에 있으면 두 날짜가 다른 종류처럼 읽힌다).
chk 'DATE_ONE_STYLE' automation/admin/admin.gs 2
chk '_ymdDot' automation/admin/admin.gs 2
chk '한 문장 안에서 날짜 표기를 섞지 않는다' scripts/audit/rollback-slot.mjs 1
chk '되돌린 뒤에도 자리가 이 부부 것이다' scripts/audit/rollback-slot.mjs 1

# ★★[GA_NO_SNAP 2026-08-18 사용자 지적 "온라인에서 오프라인 버튼 누르면 목업 화면이 순간적으로 빨라지면서 부자연스럽게"]
#   탭을 바꾸면 새 문서가 맨 위로 한 프레임 그려졌다가 첫 화면 자리로 «순간이동»했다(실측 201px).
#   오프라인 첫 화면(좌석)이 문서 맨 위가 아니라 머리글 아래에 있어서다.
#   처방 둘 — ①자리를 잡기 전까지 감춘다(.ready 없으면 opacity 0) ②정말로 «즉시» 옮긴다.
#   ★transition 은 .ready 에만 둔다. 양쪽에 두면 감추는 0.3초 동안 새 문서가 반투명하게 비쳐
#     점프가 그대로 보였다(실측: 그 상태에서도 201px).
#   ★behavior:'auto' 는 «즉시»가 아니다 — 안쪽 문서의 scroll-behavior 를 따르라는 뜻이라
#     live.html(smooth)에서는 0→51px 램프로 애니메이션됐다. CSS 를 잠깐 꺼서 옮긴다.
#   ★load 에만 기대지 않는다 — 바깥 글꼴이 막히면 load 가 영영 안 와 폰이 «영영 투명»해진다. 1.2초 뒤엔 나타난다.
chk 'GA_NO_SNAP' index.html 3
chk 'ga-frame.ready { opacity: 1; transition' index.html 1
chk 'function arm()' index.html 1
chk 'setTimeout(reveal, 1200)' index.html 1
chk "de.style.scrollBehavior = 'auto'" index.html 1
# ★★[GA_LATE_PIN 2026-08-18 점검 라운드3 발견] 자리를 «한 번만» 잡으면 늦게 완성되는 문서에서 어긋난다.
#   실측(표적 .sec 이 2.2초 뒤 생기는 판): 1.2초 대비책이 먼저 나타나 y=0 · 그 뒤 표적이 생겨도 그대로 ·
#   load 가 와도 그대로 · 3.8초 뒤 자동 넘김이 02 로 가 **01 을 통째로 건너뛰었다.**
#   그동안 목록은 「01 활성」이라 글과 그림이 따로 놀았다 — GA_SYNC 가 금지하는 바로 그 상태다.
#   → 잡힐 때까지 200ms 간격으로 다시 시도(잡히면 즉시 멈춤 · 못 잡아도 4초면 그만).
#   ★늦게 온 load 도 자리를 못 잡았으면 그때 잡는다(reveal 의 !armed 갈래).
chk 'GA_LATE_PIN' index.html 1
chk 'function pin()' index.html 1
chk 'if (!armed) { if (!pinned) pin(); frame.classList.add' index.html 1
chk 'pinned || ++n > 20' index.html 1
nochk 'fit(); show(0, false); frame.classList.add' index.html
nochk "behavior: smooth === false ? 'auto' : 'smooth'" index.html

# ★★[ENV_DEMO_OPEN 2026-08-18 사용자 제안 "계좌 신부쪽이 열려있는 부분으로 등록해놓으면"]
#   홈 목업의 봉투 화면은 양쪽 다 접혀 있어 «무엇을 하는 곳인지» 보이지 않았다.
#   목업 안(me-inframe)에서만 신부 쪽을 펼친다. ★실제 하객 페이지는 접힌 채여야 한다 —
#   봉투는 원하는 분만 펼치는 것이 예의다. 이 열기가 me-inframe 밖으로 나가면 안 된다.
chk 'ENV_DEMO_OPEN' live.html 1
chk "classList.contains('me-inframe')" live.html 1
chk 'ENV_DEMO_OPEN' index.html 1
chk '이름을 펼친 분에게만 계좌가 보입니다' index.html 1   # 화면이 열려 있으니 설명도 같은 말을 해야 한다
nochk '아코디언 안에 접혀 있어 필요한 분만' index.html

# ★★[CARD_FOOT_25 2026-08-18 사용자 지적 "여기 문구 이상한 위치에서 확인되는데"]
#   「25 Guests」 카드의 꼬리말이 divider 를 건너 「Our Perspective」 블록의 첫 줄로 들어가 있었다.
#   설명하는 카드와 같은 칸, divider 앞에 둔다. divider 뒤로 다시 옮기지 말 것.
chk 'CARD_FOOT_25' index.html 1
# ★[ORPHAN_COPY] 같은 사고를 기계가 잡게 — 「본문이 제목보다 앞서는 블록」을 6쪽에서 찾는다.
#   정렬 차이로 찾지 않는다(left/start 가 같은 값이라 오탐 3건). 적대 검증: 고치기 전 파일로 되돌리면 1건을 집어낸다.
chk 'ORPHAN_COPY' scripts/audit/orphan-copy.mjs 1
chk '제목이 본문보다 앞선다' scripts/audit/orphan-copy.mjs 1
chk 'cantLook' scripts/audit/orphan-copy.mjs 1
node scripts/audit/orphan-copy.mjs >/dev/null 2>&1; _orc=$?
case "$_orc" in
  0) echo "ok orphan-copy (문구 제자리)" ;;
  2) echo "· orphan-copy 안 쟀다(브라우저·서버 없는 자리) — 푸시 전에 손으로: node scripts/audit/orphan-copy.mjs" ;;
  *) echo "FAIL orphan-copy — node scripts/audit/orphan-copy.mjs"; fail=1 ;;
esac

# ★★[PRICE_NOTE_TONE 2026-08-18 사용자 지시 "계약서 조항 같은 느낌은 빼자"]
#   가격 아래 세 줄은 «약속»이지 «약관»이 아니다. 셋 다 방어 문서 어조로 적혀 있었다.
#   ①조항 번호(계약서 제7조②) — 약속에 각주가 붙으면 「믿어 주세요」가 「따져 보세요」가 된다.
#     전문은 FAQ 「계약 후 사정이 생기면」에 조항 번호까지 그대로 있으니 여기서 잃는 정보가 없다.
#   ②「위약금 없이」 — 안심 문장이 가장 무서운 단어로 시작했고, 「전액」이 이미 그 뜻이라 중복이었다.
#     ★근거를 뺀 것이 아니다(책임질 수 없는 안심 금지) — 근거인 기한 150일은 그대로 남는다.
#   ③「보증인원」 — 웨딩홀 견적서 용어. 홀을 아직 안 본 분껜 안 읽힌다.
#   ④서두르라는 마감 문구 — 브랜드 규칙이 금지한 긴급성. 가격 바로 아래·금색·자간까지 준 자리였다.
#     하루 세 팀은 원래 «품질 근거»다(THE REALITY 「30분마다 다음 식」의 반대편). 압박이 아니라 약속으로.
#     ★되살리지 말 것 — 「빨리 하세요」는 이 브랜드가 파는 것(정중·절제)과 정반대다.
#   ★「VAT 포함」은 그대로 둔다 — 페이지에 6곳이라 여기만 바꾸면 표기가 갈라진다.
chk 'PRICE_NOTE_TONE' index.html 2
chk '최소 인원 조건 없음' index.html 1
chk '하루 세 팀까지만 맡습니다' index.html 1
nochk '계약서 제7조②' index.html
nochk '조기\s*마감' index.html      # 서두르라는 마감 문구가 가격 아래로 돌아오는 것을 막는다
nochk '보증인원 없음' index.html
# ★체크 목록은 한 줄에 하나 — 인라인이라 「…조건 없음 ✓ 예식 150일…」로 붙어 가운데 ✓ 가 오타처럼 보였다
#   (390·1280 실렌더 둘 다 · 고치기 전 화면에도 있던 결함). 선이 아니라 여백으로 나눈다.
chk '.price-note span { display: block; }' index.html 1

# ★★[REFUND_CAVEAT 2026-08-18 점검 라운드5 — 계약서 원문 대조에서 나온 것]
#   가격 카드의 「전액 돌려드립니다」에 단서가 없으면 «책임질 수 없는 안심»이 된다.
#   계약서 제7조②는 「기수령액 전액 환급」에 예외 둘을 단다:
#     ㄱ. 드레스 시착을 했으면 시착 비용으로 전환된 예약금은 환급 제외(제4조⑧)  ← 화면에 적는다
#     ㄴ. 사전 명시 + «갑의 서면 동의»가 있는 계약추진비 공제               ← 적지 않는다(아래 근거)
#   ㄱ만 적는 이유: 고객이 «모르고 당할 수 있는» 것은 이쪽뿐이다.
#   ㄴ은 사전 명시·서면 동의가 성립 요건이라 이미 알고 서명한 금액이고, 적으면 안 겪을 일로 겁을 준다.
#   ★조항 «번호»를 뺀 것이지 «정확성»을 뺀 것이 아니다(사용자 지시는 번호 쪽이었다).
#   ★이 저장소는 같은 사고를 이미 겪었다 — 6213행 「드레스를 시착하신 경우에만…」은 «상담 예약금» 쪽이고
#     이 줄은 «계약 총액» 쪽이라 서로 다른 문장이다. 한쪽이 있다고 다른 쪽을 지우지 말 것.
chk 'REFUND_CAVEAT' index.html 1
chk '드레스 시착 비용만 제외' index.html 1
chk '드레스를 시착하신 경우에만' index.html 1   # 예약금 쪽 단서(앞선 점검이 세운 것) — 함께 살아 있어야 한다

# ★★[WAKE_LOCK 2026-08-18 사용자 지시 "음성 끝날때까지 핸드폰 자동꺼짐 안하게 할수있어?"]
#   이 페이지는 화면이 꺼지면 소리가 «멈춘다» — visibilitychange 가 stopAll 을 부르기 때문이다.
#   그건 두 소리가 겹치지 않게 하는 [LISTEN_ONE_HANDLER] 계약이라 그대로 두고, 대신 잠들지 않게 잡는다.
#   ★잡았으면 반드시 놓는다 — 안 놓으면 편지가 끝난 뒤에도 화면이 안 꺼진다.
#     실측(잠금 API 를 스텁해 셈): 재생 1회 잡음 → 멈춤·도구줄멈춤·숨김 세 경로 모두 1회 놓음(짝이 맞음).
#   ★없는 기기에서는 조용히 지나간다(구형 iOS 등) — 소리는 그대로 나고 화면이 꺼지면 종전대로 멈춘다.
chk 'WAKE_LOCK' parents.html 1
chk 'navigator.wakeLock.request' parents.html 1
chk 'var wakeOff' parents.html 1
chk 'if(on)wakeOn(); else wakeOff();' parents.html 1

# ★★[LISTEN_BAR 2026-08-18 사용자 지시 "재생 멈춤 버튼도 적절하게 만들어주고"]
#   멈춤은 원래도 있었다 — 맨 위 도구줄 「듣기」가 라벨만 바뀌는 방식. 그런데 편지를 읽어 내려가면
#   그 버튼이 «화면 밖으로 사라져» 멈출 길이 없었다. 이 페이지의 독자는 어른이다.
#   ★재생 중에만 선다(자동으로 뜨는 팝업이 아니다 · 누른 사람에게만).
#   ★멈추는 길은 stopAll 하나로 모은다 — 길이 둘이면 상태가 갈라진다.
#   ★막대가 뜬 동안 body 에 여백을 준다. 안 주면 맨 아래 사업자 정보 줄이 통째로 가린다(실측 1건→0건).
chk 'LISTEN_BAR' parents.html 3
chk "id=\"playBarStop\"" parents.html 1
chk 'barStop.addEventListener' parents.html 1
chk 'body.listening{padding-bottom' parents.html 1
chk 'var setPlaying' parents.html 1
nochk "label('멈춤')" parents.html      # 상태는 setPlaying 한 곳에서만 바꾼다(라벨·막대·잠금이 갈라지지 않게)

# ★★[OVERLAY_CANVAS 2026-08-18 사용자 지적 "어떻게 오는지 보기 클릭하면 아랫부분이 진사색상으로"]
#   최상단 캔버스(html·body 배경)를 칠하는 paint() 가 scrollY 로 색을 정한다.
#   오버레이가 body{position:fixed} 로 잠그면 scrollY 가 0 으로 무너져 「지금 히어로 맨 위」로 오해하고
#   진사를 칠한다. 화면 크림은 .page-bg 가 칠하므로, 그 상자를 벗어난 자리에서 진사가 드러났다.
#   ★종전 예외 목록은 «이름»(menu-open · me-restoring) 뿐이라 뒤에 생긴 팝업이 그대로 뚫렸다.
#     이름 목록은 새 오버레이가 생길 때마다 조용히 낡는다 — 그래서 «잠금이 걸렸나»(__meTCLock)로 센다.
#   실측 4상태: 히어로 진사 · 본문 크림 · 팝업 크림(전엔 진사) · 닫으면 크림 복귀 + 스크롤 10943 복원.
chk 'OVERLAY_CANVAS' index.html 1
chk "de.classList.contains('me-restoring') || window.__meTCLock" index.html 1

# ★★[SILENT_HINT 2026-08-18 사용자 신고 "어른께드리안내 소리가 안나오는데?"]
#   대조 결과 코드·파일·배포는 정상이었다 — 변경 전/후 모두 play=1·오류 0, mp3 는 170.9초·진폭 0.82(무음 아님).
#   남는 원인은 기기 쪽이고, 이 증상(화면은 「멈춤」인데 소리만 없음)의 1순위는 아이폰 옆면 무음 스위치다.
#   iOS 는 new Audio() 소리를 벨소리 스위치로 함께 음소거한다.
#   ★처음부터 띄우지 않는다 — 잘 들리는 분께는 잔소리다. 5초쯤 지나 「이상하다」 싶을 때 나타난다.
chk 'SILENT_HINT' parents.html 1
chk '안 들리면 볼륨·무음 스위치를 확인해 주세요' parents.html 1
chk 'play-bar-row' parents.html 2
# ★★[BAR_RHYTHM 2026-08-18 사용자 지적 "하단 내용부분 좀더 깔끔하게 · 지금은 너무 간격도 이상해"]
#   옛 짜임은 «행(글+버튼) 위 / 힌트 아래»였다. 행 높이를 44px 버튼이 정하는데 글자는 28px 뿐이라
#   위아래 8px 씩 죽은 공간이 생기고 gap 6px 이 더해져 두 글줄 사이가 14px 로 벌어졌다(실측).
#   같은 덩어리인 두 줄이 남남처럼 떨어져 보였다.
#   → 글 두 줄을 한 덩어리(.play-bar-row)로 묶고 버튼을 그 «옆»에 세운다. 버튼이 글줄 사이를 못 벌린다.
#   실측: 글줄 사이 14px→2px · 막대 99px→73px(390·430) · 44px 탭 타깃은 그대로.
chk 'BAR_RHYTHM' parents.html 1
# ★★[BAR_ONE_LINE 2026-08-18 사용자 지시 "이걸 위로 올려서 한줄로 만들자"]
#   안내를 아랫줄이 아니라 «같은 줄»에 잇는다 — 흐르는 한 문장이라 넓은 화면에선 한 줄로 끝나고,
#   좁은 화면에선 문단처럼 접힌다. 블록 두 개로 나누면 그 접힘이 «두 덩어리»로 보인다.
#   실측: 1240·768px 한 줄(막대 69px) · 390px 두 줄(73px) · 320px 세 줄(97px).
#   ★가운뎃점은 앞뒤로 줄바꿈이 «허용되는» 글자다 — 묶지 않으면 320px 에서 「·」가 줄 맨 앞에 매달린다(실측).
#     앞말과 nowrap 으로 묶고 줄바꿈은 그 뒤에서만 일어나게 한다.
chk 'BAR_ONE_LINE' parents.html 1
chk 'play-bar-nb{white-space:nowrap}' parents.html 1
# ★★[BAR_COLUMN 2026-08-18 사용자 스크린샷에서 발견] 막대 «안»은 편지 글단과 같은 폭으로 가둔다.
#   종전엔 좌우 끝에 붙어 1240px 화면에서 글과 버튼이 1000px 넘게 벌어져 서로 남남으로 보였다.
#   실측: 안쪽 640px · 본문단과 좌우가 정확히 같다(l 300 · r 940).
chk 'BAR_COLUMN' parents.html 1
chk 'play-bar-in{max-width:var(--max)' parents.html 1
# ★★[HINT_NO_POP 2026-08-18 사용자 지적 "이 문구가 나중에 등장하는 버그가 잇어"]
#   5초 뒤에 띄우던 것을 «처음부터» 보이게 했다. 늦게 나타나면 막대가 69→99px 로 갑자기 커지며
#   글이 튀어나와, 배려로 만든 것이 «고장»으로 읽힌다. 되살리지 말 것.
#   잔소리로 읽히지 않게 하는 것은 «시점»이 아니라 «격»이다(12px · --light 로 한 단 아래).
#   실측: 재생 0.9~8.1초 내내 막대 73px 고정(튀는 구간 없음).
chk 'HINT_NO_POP' parents.html 2
nochk "classList.add('hint')" parents.html   # 늦게 띄우던 기제 — 되살리지 말 것
#   ★nochk 에 'play-bar.hint' 를 쓰지 말 것: '.' 이 정규식 와일드카드라 살아 있는 play-bar-hint 를 잡는다(겪음)
chk '편지를 읽어 드려요' parents.html 1   # 320px 글자칸 174px · 9자까지 한 줄(13자는 접힌다)
nochk '편지를 읽어 드리는 중이에요' parents.html
# ★인쇄에는 막대 «자리»도 남기지 않는다 — 막대만 감췄더니 body 의 70px 이 그대로 찍혀 빈 띠가 남았다.
#   ★반드시 base 규칙 뒤에 둘 것 — 특이도가 같아 순서가 승부를 가른다(앞에 뒀다가 밀렸다·실측).
chk '@media print{body.listening{padding-bottom:0}}' parents.html 1

# ★★[LETTER_AUDIO_DIVERGED 2026-08-18 사용자가 새 녹음을 직접 주심] 두 경로가 더 이상 같은 파일이 아니다.
#     assets/audio/parents-letter.mp3              ← 「어른께 드리는 안내」 페이지 · 사용자 새 녹음(162.9초)
#     assets/audio/narration/43_parents-letter.mp3 ← 예식 «당일» 나레이션 · 옛 조립본(170.9초) 그대로
#   사용자가 바꿔 달라고 한 것은 페이지 쪽이고, 예식 당일 소리는 실예식에 나가는 것이라 손대지 않았다.
#   ★assemble-parents-letter.mjs 를 다시 돌리면 사본 복사가 «사용자 녹음을 조립본으로 덮어쓴다» —
#     되살릴 수 없다. 그래서 그 자리에 «있으면 덮지 않는다» 가드를 뒀다(--overwrite-page-audio 로만 강제).
# ★★★2026-08-21 사용자 확정: "예식당일은 신경쓰지마 따로작업하고있어" — 갈라진 채로 «둔다».
#   두 파일이 다른 것은 «어긋난 것»이 아니라 그렇게 정한 것이다. 통일하지 말고, 다시 묻지도 말 것.
chk 'LETTER_AUDIO_DIVERGED' scripts/assemble-parents-letter.mjs 1
chk '갈라진 채로 «둔다»' scripts/assemble-parents-letter.mjs 1
chk 'overwrite-page-audio' scripts/assemble-parents-letter.mjs 2
nochk '^fs.copyFileSync(dst, alt);' scripts/assemble-parents-letter.mjs
# ★★[INV_NO_PHOTO 2026-08-17 사용자 제보 — 접점마다 다른 답] 청첩장에는 사진이 들어가지 않는다.
#   실측: 16종 전부 사진 0장(장식은 인라인 SVG) · 위저드에 업로드 칸 0개 · 초안에 사진 키 0개.
#   그런데 「마이」가 «네, 가능합니다 · 개인 사진을 넣어 편집하실 수 있어요»라고 **없는 기능을 지어냈다**.
#   ★KB 에서 이 줄을 빼지 말 것 — 빼면 근거가 없어져 다시 지어낸다.
chk 'INV_NO_PHOTO' api/_kb.js 1
chk '사진이 들어가는 자리가 처음부터 없다' api/_kb.js 1
# ★★[AUTO_DISAGREE 2026-08-17 사용자 지시 "자동으로 학습해서 … 시간이 갈수록 똑똑해지는거지"]
#   실제 고객 질문을 매일 전 직원에게 되물어 **답이 갈린 것만** 아침 메일로 올린다.
#   정답을 몰라도 오답을 찾는 방식(둘이 다르면 하나는 틀렸다) — 그래서 사람 없이 매일 돈다.
#   ★«반영»까지 자동으로 만들지 말 것: AI 답을 근거로 지식을 자동 저장하면 틀린 답이 전 접점 영구 사실이 된다.
chk 'AUTO_DISAGREE' automation/platform/96_ai_cost.gs 3
chk '직원 답이 갈렸어요' automation/platform/96_ai_cost.gs 1
# ★★[KB_TRUTH 2026-08-17 사용자 지시 "주기적으로 핵심정보등을 스스로 학습"] 사실 «자동 재검증».
#   AI 가 사실을 고쳐 쓰게 하지 않는다(가격이 그렇게 틀리면 그대로 청구 사고) —
#   대신 KB 가 말하는 것이 **실제 코드와 같은지** 매번 대조한다. 어긋나면 사람에게 알린다.
#   ★[KB_TRUTH_STRICT] 값 비교는 «KB 어딘가에 그 숫자가 있나»가 아니라 **선언 줄의 값**으로 —
#     includes 로 짰더니 330→350만 오류가 통과했다(다른 줄에 330만원이 또 있었다). 되돌리지 말 것.
# ★★[KB_TRUTH_RUN 2026-08-21 사용자 질문 "자동으로 점검하고 개선하고 스스로 하게 해놨어?"에 답하다 발견]
#   이 아래 chk 들은 **파일에 마커 글자가 있는지**만 본다 — 검사기를 «부르지는» 않았다.
#   즉 «핵심정보 자동 재검증»이라 해 놓고 실제로는 사람이 손으로 돌려야 도는 상태였다.
#   ★여기서 실제로 실행한다 — PR 마다·main 푸시마다 돈다(check-photo-scene 과 같은 방식).
#   ★이 줄을 지우면 kb-truth 는 다시 «있지만 안 도는 검사»가 된다.
if command -v node >/dev/null 2>&1; then node scripts/audit/kb-truth.mjs >/dev/null 2>&1 \
  || { echo 'FAIL kb-truth: KB(고객에게 말하는 사실)와 실제 코드가 어긋납니다 — node scripts/audit/kb-truth.mjs'; fail=1; }; fi
chk 'KB_TRUTH' scripts/audit/kb-truth.mjs 2
chk 'KB_TRUTH_STRICT' scripts/audit/kb-truth.mjs 1
nochk 'KB.includes(`\${weekend}만원`)' scripts/audit/kb-truth.mjs
# ★★[KB_DRAFT 2026-08-17] 교육 초안은 **KB·핵심정보에 적힌 것만** 근거로 쓴다. 없으면 «근거 없음».
#   초안 생성기가 지어내면 그 거짓이 «승인된 교육»이 되어 전 직원에 영구히 박힌다.
chk 'KB_DRAFT' api/kb-draft.js 1
chk 'grounded' api/kb-draft.js 6
# ★★[AI_TABS3 2026-08-17 사용자 지시 "개편"] AI 직원실 8탭 → 3탭(핵심정보·가르치기·기록).
#   기능을 지운 게 아니라 «누를 이유»로 다시 묶었다 — 렌더 함수(rEdu·rImprove·rHandoff·rRoster)는 그대로 쓴다.
#   리포트·테스트만 탭에서 내렸다(통계는 아침 메일 한 줄 · 테스트는 전 직원 점검과 중복).
#   ★탭을 다시 늘리기 전에 물을 것: «이건 사장이 눌러야만 도는가?» 그렇다면 자동으로 만들 자리다.
chk 'AI_TABS3' admin.html 3
chk "\['핵심정보'\],\['가르치기'\],\['기록'\]" admin.html 1
chk 'function rTeach' admin.html 1
chk 'function rRecords' admin.html 1
# ★[KB_DRAFT] 원클릭 초안 — GAS 함수 + adminCall 화이트리스트가 **둘 다** 있어야 버튼이 산다.
chk 'function aiDraftAnswer' automation/platform/96_ai_cost.gs 1
chk 'aiDraftAnswer: aiDraftAnswer' automation/admin/admin.gs 1
chk '근거 없음' admin.html 1                      # 근거 없으면 초안을 보여주지 않는다(거짓이 교육으로 굳는 것 방지)


# ★★[CPN_QUEUE 2026-08-18 쿠폰 연동 점검] 후기는 받았는데 커피를 안 드린 고객이 화면에서 사라지지 않게.
#   후기 마감 순간 아카이브 분기로 들어가 보드에서 빠졌고, 남는 리마인드는 메일 한 통뿐이었다.
#   추가보정·현금영수증과 같은 «끝난 고객이라도 우리 의무는 남는다» 자리에 둔다.
chk 'CPN_QUEUE' automation/admin/admin.gs 1
chk "kind: '쿠폰발급'" automation/admin/admin.gs 1
chk "'쿠폰발급'" admin.html 4
chk "act==='issueCoupon'" admin.html 1
# ★★[CPN_SAY_ONCE 2026-08-18] 되돌리면 설문은 초기화되고 쿠폰은 남는다(남기는 게 맞다) —
#   그때 «후기 쓰면 커피 드려요»를 다시 말하면 한 잔 더 준다는 뜻이 된다. 상태에 맞게 한 번만 말한다.
chk 'CPN_SAY_ONCE' mypage.html 1
chk 'CPN_SAY_ONCE' scripts/audit/rollback-notice.mjs 1
chk '_hasCpn' mypage.html 3
# ★★[CPN_PASTE 2026-08-18] 기프티콘은 «복사»로 온다 — 붙여넣기·끌어놓기도 받는다(같은 압축 경로로).
chk 'CPN_PASTE' admin.html 4
chk '_cpnTake' admin.html 4
chk '_modalClose' admin.html 3
# ★★[CPN_NOTIFY 2026-08-18] 바코드가 떴다는 안내 — 배선만 하고 기본은 꺼짐(고객 발송은 사용자 판단).
chk 'CPN_NOTIFY' automation/platform/95_notify.gs 1
chk "'cust.couponIssued'" automation/platform/95_notify.gs 1
chk "notifyKakao('cust.couponIssued'" automation/admin/admin.gs 1
# ★★[GAS_NOT_EMPTY 2026-08-18 내가 저지른 사고] 빈 파일도 «로드 OK» 였다 — 구문만 보는 검사는
#   «내용이 통째로 사라진 것»을 못 잡는다. 크기도 함께 본다.
chk 'GAS_NOT_EMPTY' scripts/audit/gas-lint.mjs 2
chk 'COUPON_FLOW' scripts/audit/coupon-flow.mjs 1
# ★★[NOW_CONTRACT_EXPIRED 2026-08-18 journey-sim] 서명 기한이 지나면 «지금 할 일»도 바뀐다 —
#   결제 칸이 사라지고 재요청 버튼만 남는데 «계약금을 입금해 주세요»라고 말하던 화면(낼 곳이 없다).
chk 'NOW_CONTRACT_EXPIRED' automation/platform/60_mypage.gs 1
chk '계약서 서명 기한이 지났어요. 아래에서 다시 요청하시면' automation/platform/60_mypage.gs 1
# ★★[FIXTURE_NO_ROT 2026-08-18] 고정 날짜 금지 — 달력이 지나면 같은 픽스처의 뜻이 말없이 바뀐다
#   (계약서발송일시가 박혀 있어 사흘 뒤 «발송됨»이 «기한 지남»이 됐고, 그 붉음은 시간이 만든 것이었다).
chk 'FIXTURE_NO_ROT' scripts/audit/journey-sim.mjs 2
chk 'const SENT_OK' scripts/audit/journey-sim.mjs 1
nochk "계약서발송일시: '2026-08-16 10:00'" scripts/audit/journey-sim.mjs
# ★★[CPN_NOTIFY 켬 2026-08-18 사용자 «추천대로»] 후기 감사 선물 안내를 실제로 보낸다.
#   다른 확인·축하류는 여전히 off 인데 이것만 켠 이유 — 저것들은 «고객이 이미 아는 사실»의 확인이지만
#   이건 «모르면 영영 못 받는» 안내다(화면이 "준비되면 바코드가 떠요"라고만 말해 두고 끝난다).
nochk "'cust.couponIssued':    { to: 'customer', need: false, off: true" automation/platform/95_notify.gs
chk "case 'cust.couponIssued':" automation/platform/95_notify.gs 1
chk "coupon:'mp_coupon'" mypage.html 1
chk 'T19 · 후기 감사 선물' automation/알림톡_템플릿_신청문안.md 1
chk '바코드 자체는 문자로 보내지 않는다' scripts/audit/coupon-flow.mjs 1
# ★★[KB_TRUTH_RUN · NIGHTLY_JOURNEY 2026-08-21] «자동으로 점검하나?»에 답하다 구멍 둘을 찾았다.
#   ①kb-truth 는 마커만 검사하고 **스크립트를 부르지 않았다** — «핵심정보 자동 재검증»이 실은 수동이었다.
#     이제 이 가드가 직접 실행한다(반증 확인: KB 가격을 330→350만으로 틀리게 하니 FAIL kb-truth 로 막혔다).
#   ②journey-sim·save-honesty·stage-back·seat-onecard 는 **게이트에도 야간에도 없었다** —
#     이 저장소에서 가장 큰 사고들(고객 화면 백지 3건 등)을 잡은 검사인데 내가 손으로 돌릴 때만 돌았다.
#     야간 잡(nightly-screen)에 등록했다 — 브라우저가 필요해 게이트에는 넣지 않는다(막지 않고 알린다).
#   ★«검사를 만들었다»와 «검사가 돈다»는 다른 말이다. 새 검사를 만들면 어디서 도는지 반드시 확인할 것.
chk 'KB_TRUTH_RUN' automation/tests/merge-guard.sh 1
chk 'node scripts/audit/kb-truth.mjs' automation/tests/merge-guard.sh 2
chk 'NIGHTLY_JOURNEY' .github/workflows/nightly-screen.yml 1
chk 'journey-sim.mjs' .github/workflows/nightly-screen.yml 1
chk 'save-honesty.mjs' .github/workflows/nightly-screen.yml 1


# ★★[NAV_MASK 2026-08-18 «점검 직접 보면서» 에서 눈으로 발견] 스크롤해도 숨지 않는 nav 는 마스크가 있어야 한다.
#   실측(390px): parents.html 은 그라디언트가 0.92→0 이라 글자가 앉은 y≈22 의 알파가 0.53 뿐이었고,
#   편지 본문이 그 뒤로 비쳐 「MOMENT EDIT」와 겹쳐 뭉개졌다. privacy.html 은 마스크가 아예 없었다
#   (y=700 에서 「가. 방문 상담 신청 단계」를 덮음).
#   ★index·inquiry 는 스크롤하면 nav 를 «숨겨» 이 문제가 없다 — 방식이 달라 처방도 다르다.
#     그 두 곳에 마스크를 넣지 말 것(히어로 진사 위에 크림 띠가 남는다).
#   ★글자 띠(0~72%)는 불투명, 나머지에서 사라진다. 띠 높이는 그대로다.
chk 'NAV_MASK' parents.html 1
chk 'NAV_MASK' privacy.html 1
chk 'rgba(250,250,248,1) 72%' parents.html 1
chk 'rgba(250,250,248,1) 72%' privacy.html 1
nochk 'rgba(250,250,248,0.92)),' parents.html      # 글자가 비치던 옛 곡선

# ★★[CUE_NO_COVER 2026-08-18 «점검 직접 보면서» 에서 눈으로 발견] 스크롤 큐는 «누를 것» 위에 앉지 않는다.
#   실측(390×844 · 좌석 없는 구성): 문서 933 vs 화면 844 라 스크롤할 것이 89px 뿐인데 큐가 떴고,
#   큐(707~764)가 「사진 올리기」 버튼(721~781)을 43px 덮어 글자가 「사 ▒▒ 기」로 보였다.
#   ★fixed 라 문서 길이와 무관하게 늘 그 띠에 뜬다 — «길이»가 아니라 «겹치는가»로 판단한다.
#   ★긴 화면에서는 그대로 뜬다(실측: 표본 2031px·좌석 구성 1395px 둘 다 큐 있음·겹침 0).
chk 'CUE_NO_COVER' guide.html 1
chk "querySelectorAll('button,a\[href\],input,.ps-btn,.act')" guide.html 1

# ★[FOOT_BALANCE 2026-08-18] 표본 꼬리말 마지막 줄에 「요.」 한 글자만 떨어져 있었다(390px).
#   글자 수를 깎아 맞추면 다음 문구 수정 때 바로 깨진다 — 두 줄을 고르게 나누게 한다.
#   실측: 마지막 줄이 첫 줄의 72%(전에는 한 글자).
chk 'FOOT_BALANCE' guide.html 1
chk 'text-wrap:balance' guide.html 1
# ★★[KB_TRUTH_WIDE 2026-08-21 사용자 지시 "추천대로 진행"] KB↔코드 대조를 4항목 → 전 결제·결과물 정책으로.
#   왜: 자동 탐지(AUTO_DISAGREE)는 «답이 갈릴 때»만 잡는다 — 다섯 직원이 **똑같이 틀리면** 조용하다.
#   그 사각을 KB↔코드 대조가 메운다(갈리든 안 갈리든 값이 다르면 잡힌다).
#   ★넓히면서 KB 에 없던 사실도 하나 찾았다: 계약서 서명 기한 72시간 — 고객 화면엔 카운트다운이 뜨는데
#     KB 엔 없어서 «서명 기한이 얼마인가요?»에 답할 근거가 없었다. 그것도 이 검사가 잡아 준 것이다.
#   ★새 항목은 반드시 kbNum(선언라벨)로 — includes 로 짜면 다른 줄의 같은 숫자에 걸려 통과한다
#     (확장 때 실제로 그렇게 짰다가 반증에서 걸렸다: 추가보정 20,000→30,000 이 통과했다).
# ★★[REFUND_SIM 2026-08-21] 환불 계산을 **경계일마다 실제로 호출해** 본다(node 전용·빠름 → 게이트 안).
#   위약 구간은 «예식 150일 전»처럼 하루로 갈린다 — `>` 와 `>=` 한 글자가 수십만 원이고 읽어서는 안 보인다.
#   불변식 셋: 음수 아님 · 받은 것보다 많이 돌려주지 않음 · 예식이 가까울수록 늘지 않음(단조 감소).
#   ★실측(2026-08-21): 전 구간이 계약서 비율과 일치했다(330만×0.9=297만 …). 이 검사는 그 상태를 고정한다.
if command -v node >/dev/null 2>&1; then node scripts/audit/refund-sim.mjs >/dev/null 2>&1 \
  || { echo 'FAIL refund-sim: 환불 계산이 불변식을 깨거나 계단이 뒤집혔습니다 — node scripts/audit/refund-sim.mjs'; fail=1; }; fi
chk 'REFUND_SIM' scripts/audit/refund-sim.mjs 1
chk '단조 감소' scripts/audit/refund-sim.mjs 2
chk 'KB_TRUTH_WIDE' scripts/audit/kb-truth.mjs 1
chk 'KB_TRUTH_WIDE' api/_kb.js 1
chk 'kbNum' scripts/audit/kb-truth.mjs 5
chk '계약서 서명 기한' api/_kb.js 1
# ★★[CHANGE_RATCHET 2026-08-21 환불 경계값 전수점검] 계약서 제8조⑤ «변경을 통한 회피 금지» 구현.
#   조항은 있는데 **코드에 없었다.** D-19(위약 40%)에서 예식일을 1년 뒤로 미룬 뒤 취소하면
#   코드가 «무상취소»로 보고 환불 165만을 지시했다 — 계약서대로면 66만. **건당 99만원.**
#   고객이 마이페이지에서 혼자 변경 요청을 넣고 관리자가 확인 한 번 누르면 성립하는 경로였다.
#   ★래칫: 변경이력의 {from, at} 으로 «그 시점의 최초 예식일 기준 요율»을 구해 하한으로 쓴다.
#   ★무상 구간에서 미룬 것에는 하한을 세우지 않는다(과잉 적용 금지) — 검사가 그것도 함께 본다.
chk 'CHANGE_RATCHET' automation/platform/70_journey.gs 2
chk '_floorRate' automation/platform/70_journey.gs 5
chk 'CHANGE_RATCHET' scripts/audit/refund-sim.mjs 1
chk '8조⑤' scripts/audit/refund-sim.mjs 2
# ★★[ADMIN_MAIL_UNCHAINED 2026-08-21 알림 전수점검] 솔라피 설정 검사를 고객 분기로 내렸다.
#   관리자 알림은 2026-06-29 메일 전용인데 솔라피 키 검사에 묶여 있어서, SOLAPI_SENDER 오타 하나로
#   입금신호·계약서요청·환불송금 같은 **행동 게이트 알림이 통째로 무음**이 됐다(알려주는 장치도 없음).
chk 'ADMIN_MAIL_UNCHAINED' automation/platform/95_notify.gs 2
# ★★[DEMO_BADGE 2026-08-21 하객 경로 점검] 표본 화면임을 하객에게 «보이게» 밝힌다.
#   링크가 잘려 오면(?e= 유실 · 이 저장소가 스스로 적어 둔 실제 사고 유형) live.html 이
#   표본 부부와 **표본 계좌 넷**을 진짜처럼 그렸고, 화면에 «표본»이라는 글자가 한 곳도 없었다
#   (파일 안 11군데는 전부 주석 · 실측). 하객이 표본 계좌로 축의금을 보낼 수 있었다.
#   ★배지를 지우지 말 것 — 되돌릴 수 없는 송금이 다시 가능해진다.
chk 'DEMO_BADGE' live.html 1
chk '예시 화면이에요' live.html 1
# ★★[GUIDE_EXPIRE_REASON 2026-08-21 하객 경로 점검] 닫는 «이유»를 구분해 말한다.
#   _guideExpired 는 ①예식 +30일 경과 ②예식일을 모름(되돌림·미기입) 두 경우에 닫는데
#   네 곳 전부 «예식이 끝나…»라는 한 문구를 썼다 — ②에 걸린 하객은 아직 하지도 않은 예식을
#   «끝났다»고 듣고, 그 화면엔 문의처도 없었다(만료 화면은 정상 종료라 출구를 일부러 안 붙인다).
#   ★닫는 판정은 그대로다(FAILCLOSED · 날짜를 모르면 실명을 계속 보여 줄 근거가 없다). 문구와 출구만 고쳤다.
#   ★guide.test.js 12b 가 main 에서도 오래 붉어 있던 자리 — 기대를 제품 결정에 맞추고 사유·문의처까지 검사한다.
chk 'GUIDE_EXPIRE_REASON' automation/platform/80_production.gs 2
chk '_guideCloseInfo' automation/platform/80_production.gs 5
chk 'GUIDE_EXPIRE_REASON' guide.html 1
chk 'GUIDE_EXPIRE_REASON' automation/tests/guide.test.js 1
# ★★[DEMO_BADGE · 청첩장 16종 2026-08-22] 지난 라운드에 live.html 만 고치고 **청첩장은 그대로였다.**
#   실측: ?e= 없이 /i/cover-01 을 열면 남의 이름 8곳 + 표본 계좌 2개가 «예시» 표시 없이 뜬다.
#   hydrate 한 곳을 고치면 16종이 함께 붙는다. 세 경로(인자 없음·응답 실패·예외) 전부에 표시한다.
#   ★캐시에 «전에 본 진짜 내용»이 있으면 그것을 쓰고 배지를 달지 않는다(표본이 아니므로).
chk 'DEMO_BADGE' shared/hydrate.js 3
chk 'markDemo' shared/hydrate.js 4
chk '예시 청첩장이에요' shared/hydrate.js 1
# ★★[TEST_BLAST_GUARD 2026-08-22] 인자 없이 실행하면 아무것도 보내지 않는다.
#   종전엔 실개인코드가 기본값이라, 함수 드롭다운에서 잘못 고르고 ▶ 를 누르면 그 고객에게 6통이 나갔다.
#   되돌릴 수 없는 사고다(발송 취소 없음). 기본 개인코드를 되살리지 말 것.
chk 'TEST_BLAST_GUARD' automation/platform/95_notify.gs 2
nochk "code || ZZ_TEST_CODE" automation/platform/95_notify.gs   # 실고객 기본값 복원 금지
# ★★[HOLD_NO_LOSS 2026-08-22] 밤사이 보류 큐를 «보내고 나서» 지운다(매 건 저장).
#   종전엔 먼저 지우고 보내서, 6분 한도·쿠터·예외로 끊기면 남은 건이 영구 소실됐다(기록도 없음).
#   실패한 건은 큐에 남겨 다음 아침 재시도 · 3회 실패하면 관리자에게 알리고 내린다.
if command -v node >/dev/null 2>&1; then node scripts/audit/notify-hold-sim.mjs >/dev/null 2>&1 \
  || { echo 'FAIL notify-hold-sim: 보류 큐가 중간에 죽으면 알림이 사라집니다 — node scripts/audit/notify-hold-sim.mjs'; fail=1; }; fi
chk 'HOLD_NO_LOSS' automation/platform/95_notify.gs 1
chk 'HOLD_NO_LOSS' scripts/audit/notify-hold-sim.mjs 2
# ★★[2026-08-25 시뮬레이션 병렬 점검 라운드]
# [RETRY_NO_TAG] «다시 불러오기» 직후 화면에 <span> 태그가 글자로 찍히던 것 — stateHtml 은 esc() 라
#   HTML 을 넘기면 안 된다. 초기 로딩 카드와 같은 마크업을 직접 그린다. 클릭 직후 프레임 실측으로 확인.
chk 'RETRY_NO_TAG' guide.html 1
chk 'RETRY_NO_TAG' seat.html 1
nochk "stateHtml('<span" guide.html
nochk "stateHtml('<span" seat.html
# [EXIT_QUOTE_TS] 노쇼·미계약 환불 큐의 기준일 = 취소일시(없으면 오늘) — today 고정이라 관리자가
#   하루 미룰 때마다 큐 금액이 혼자 바뀌고 상세·마이페이지와 최대 33만 원 갈렸다.
chk 'EXIT_QUOTE_TS' automation/admin/admin.gs 1
# [COUPON_NOTIFY_ONCE] «선물 도착» 카톡은 처음 발급에만 — 바코드 교체 재저장마다 또 나갔다.
chk 'COUPON_NOTIFY_ONCE' automation/admin/admin.gs 2
# [CONTRACT_NOTIFY_THROTTLE] 계약서 발송 알림 3분 연타 가드 — 정당한 재발송(새 기한)은 알림이 가야 하므로 창을 늘리지 말 것.
chk 'CONTRACT_NOTIFY_THROTTLE' automation/admin/admin.gs 2
# ★★[OLD_SIGNER_TERMS · F3b/F4] 스냅샷 없는 서명자 = 구서명자 — 서명본(예약금 200,000 · 1벌당 70,000)으로 계산한다.
#   현행 서명은 스냅샷을 항상 남기므로(handleSignFittingConsent) 이 판정이 성립한다.
#   종전엔 _refundQuote·cancel 화면만 현행 상수로 떨어져, 서명본대로면 60,000원인 환불이 0원이 되어
#   환불송금 큐·고객 화면에서 동시에 숨었다. 세 구현체(_refundQuote·buildFittingState·_consultRefundQuote)는 한 몸.
chk 'OLD_SIGNER_TERMS' automation/platform/70_journey.gs 1
chk 'OLD_SIGNER_TERMS' automation/consultation/consultation-booking.gs 1
chk 'OLD_SIGNER_TERMS' automation/tests/refund-quote.test.js 2
chk '0원으로 숨지 않는다' automation/tests/refund-quote.test.js 1
# ★★[SLOT_OCC 2026-08-26] 예식 슬롯 점유 의미 일곱 가지 고정 — «한 타임 한 팀»의 판정부.
#   실측 전부 올바름 · 이 검사는 그 상태를 지킨다(취소·만료 홀드·예식일 변경 시 슬롯이 풀리는 것 포함).
if command -v node >/dev/null 2>&1; then node scripts/audit/slot-occupancy.mjs >/dev/null 2>&1 \
  || { echo 'FAIL slot-occupancy: 예식 슬롯 점유 판정이 바뀌었습니다(더블부킹/유령점유 위험) — node scripts/audit/slot-occupancy.mjs'; fail=1; }; fi
chk 'SLOT_OCC' scripts/audit/slot-occupancy.mjs 1
# ★★[2026-08-29 시뮬레이션 병렬 점검 라운드 — 계약·상담·결과물 서버 가드 11건]
# [SIGN_SLOT_REQUIRED] 예식일·시간이 비면 서명을 막는다 — 비면 슬롯 가드가 통째로 건너뛰어 침묵의 더블부킹.
chk 'SIGN_SLOT_REQUIRED' automation/platform/70_journey.gs 1
# [SIGN_BOUNCE_ALERT] 서명 튕김(방금 마감)은 처리이력+관리자 메일 — 디렉터가 모르던 사건이었다.
chk 'SIGN_BOUNCE_ALERT' automation/platform/70_journey.gs 1
# [SEND_HOLD_SYNC] 계약서 발송 슬롯이 가예약 홀드를 따라간다(만료 연장 포함) — 발송·홀드가 서로 달라 마감 오판.
chk 'SEND_HOLD_SYNC' automation/admin/admin.gs 1
# [HOLD_LOCK] 가예약 승인·거절은 락 안에서 — 동의기록(서명 증빙) 동시 쓰기 유실 방지.
chk 'HOLD_LOCK' automation/admin/admin.gs 4
# [REVISION_QUEUE] 보정 수정 요청 대기(컨펌대기+수정요청이력 대기)를 관리자 처리할 일 큐에 띄운다 — 고객 잠김 방치 방지.
chk 'REVISION_QUEUE' automation/admin/admin.gs 1
# [ACCEPT_GUARDED] 상담 변경제안 수락 = 제안 상태에서만·락·슬롯 재검증(_slotTaken(nd,nt,row.num) 인자 순서 주의)·제안 셀 청소.
chk 'ACCEPT_GUARDED' automation/consultation/consultation-booking.gs 2
# [PAST_SLOT_REJECT] 지난 날짜·오늘 지난 시간은 서버가 거절 — normalizeDateKey 비패딩이라 숫자 비교 필수(문자열 비교 금지).
chk 'PAST_SLOT_REJECT' automation/consultation/consultation-booking.gs 1
# [PICK_MAX_MANUAL] 수동 입력 컷 제출도 PICK_MAX(400) 상한 — 짧은 토큰이면 글자 상한만으론 수천 컷 통과.
chk 'PICK_MAX_MANUAL' automation/platform/80_production.gs 1
# [XR_SIGNAL_KEEP] 추가보정 «결제대기» 중 재신청 거부 + 재신청 시 낡은 입금자명 청소 — 입금 신호 증발 방지.
chk 'XR_SIGNAL_KEEP' automation/platform/80_production.gs 1
# [XR_STAGE_GUARD] 추가보정 입금신호도 결과물 단계에서만 — 강제이동 뒤 유령 신호 차단.
chk 'XR_STAGE_GUARD' automation/platform/80_production.gs 1
# [SURVEY_ONCE] 설문 재제출 멱등 — 응답 덮어쓰기·커피쿠폰 리마인드 메일 중복 방지.
chk 'SURVEY_ONCE' automation/platform/80_production.gs 1
# ★[CF_FOCUS 2026-08-17 자체 점검] 확정 직후 포커스가 body 로 날아가 낭독기 사용자에겐 아무 일도 안 일어났다.
#   새로 생긴 기록 카드로 옮긴다(빌더 [ORD_STEPFOCUS] 와 같은 처방) · tabindex=-1 이라 Tab 순서엔 안 낀다.
#   ★:focus 테두리는 반드시 꺼 둘 것 — 프로그램 포커스는 :focus-visible 을 켜서, 가장 조용해야 할 기록이 외친다.
chk 'CF_FOCUS' mypage.html 2
chk 'aria-labelledby="mpModalTitle"' mypage.html 1
# ★★[확정 흐름 적대검증 2026-08-17 · 실제 .gs 샌드박스] 화면·서버 양쪽에 안전망을 걸었다. 되돌리지 말 것.
#   ①CF_CORE_TRUTH — 확정은 트랙 딱지가 아니라 **실값**(1~30명)을 본다. 손상 컬럼도 confirm 에서 격리 판정('final').
#     그러지 않으면 「하객 -명 · 추가 0원」짜리 빈 도장이 찍히고 잔금 15만 원이 조용히 사라진다(실측).
#   ②CF_ONCE — 같은 상태의 두 번째 확정은 첫 기록을 그대로 돌려준다(두 탭이 각각 눌러도 기록·메일 1회).
#   ③CF_LOG — 처리이력 + 관리자 메일에 핵심 수치. 면책 문서인데 되짚을 근거가 없었다.
#   ④CF_VOID_WEDDAY — 예식일이 바뀌면 확정이 풀린다(옛 날짜에 찍은 도장이 새 날짜 위에 남던 것).
#   ⑤CF_HEADS_MISSING·FIN_NO_BLANK — 화면도 같은 잣대. 인원이 비면 확정 버튼을 세우지 않고,
#     빈 초안을 서버로 보내 저장된 인원을 지우지 않는다.
chk 'CF_CORE_TRUTH' automation/platform/80_production.gs 2
chk 'CF_ONCE' automation/platform/80_production.gs 1
chk 'CF_LOG' automation/platform/80_production.gs 1
chk "track === 'confirm' ? 'final'" automation/platform/80_production.gs 1
chk 'CF_VOID_WEDDAY' automation/platform/70_journey.gs 2
chk 'CF_HEADS_MISSING' mypage.html 3
chk 'FIN_NO_BLANK' mypage.html 1
# ★[CF_WRAP_BALANCE·SHARE_BTN_WRAP·TRK_TAP44 2026-08-17 · 폭별 실측 감사]
#   ①320px 에서 하객 안내 버튼 셋이 카드를 좌우 6px 씩 뚫고 나갔다(페이지 넘침엔 안 잡히는 종류) → flex-wrap.
#   ②320·360·430 의 고아 줄(「05」·「공개」·「41분」·「작성됨」) → 이 화면이 이미 쓰는 text-wrap:balance 로.
#   ③행 버튼 히트영역 44px 는 **재는 검사**로 고정 — 옛 검사는 버튼이 0개인 화면만 돌아 늘 초록이었다(죽은 검사).
#     mypage-shot 에 '예식 준비 카드가 그려지는 케이스'를 두고, 잴 것이 0개면 통과로 세지 않는다.
chk 'CF_WRAP_BALANCE' mypage.html 2
chk 'SHARE_BTN_WRAP' mypage.html 1
chk 'text-wrap:balance' mypage.html 3
chk 'TRK_TAP44' scripts/audit/mypage-shot.mjs 4
chk 'mp-7-제작중-준비카드' scripts/audit/mypage-shot.mjs 1
# [SEQ_MIN_BASELINE 2026-08-29] 140분 타임라인 «20 min» 록업 = 순수 인라인 흐름(flex 금지).
#   inline-flex 베이스라인은 실기기 WebKit에서 min이 떠 보였다(사용자 스크린샷) — flex로 되돌리지 말 것.
chk 'SEQ_MIN_BASELINE' index.html 1
# ★★[DEPLOY_CHECK_COVER 2026-08-29 사용자 질문 "메인 최신 파일이 업로드 안 되면 저기에 체크되는 거야?"]
#   답은 «절반만»이었다 — 파일을 통째로 안 붙이면 잡히지만, 붙였는데 **옛 내용**인 것은
#   99_deployCheck 의 목록에 그 변경의 표식이 있을 때만 잡힌다. 목록은 사람이 짜므로 반드시 뒤처진다
#   (실제로 8/26 판이 8/29 확정 변경을 못 잡았고, 30일 치로 재니 목록 밖 표식이 50개였다).
#   ★그래서 «최근 7일 안에 GAS 로 들어간 표식»이 목록에 있는지 기계가 대조한다 — 앞으로 들어오는 것부터 강제.
#     30일 치 전부를 요구하지 않는 것은 의도다: 밀린 50개를 지금 다 넣으라고 하면 게이트가 무시당한다.
#   빠지면 붉어진다 → automation/platform/99_deployCheck.gs 의 MARKS 에 한 줄 추가하고 GAS 에도 다시 붙여넣을 것.
# ★★[GATE_SAY_WHY 2026-08-30] 실패하면 «이유»를 함께 찍는다.
#   종전엔 출력을 버려서 CI 로그에 「목록에 없다」 한 줄만 남았다 — 어떤 표식인지 알 수 없어
#   두 번 연속 원인 못 찾고 헤맸다(실측: 로컬은 통과하고 CI 만 붉었는데 이유를 볼 길이 없었다).
#   초록일 때는 종전대로 조용하다. 붉을 때만 말한다.
if command -v node >/dev/null 2>&1; then
  _dcOut=$(DC_DAYS=7 node scripts/audit/deploycheck-coverage.mjs 2>&1) \
    || { echo 'FAIL deploycheck-coverage: 최근 GAS 변경이 99_deployCheck 목록에 없다 — DC_DAYS=7 node scripts/audit/deploycheck-coverage.mjs'
         printf '%s\n' "$_dcOut" | sed 's/^/    | /'; fail=1; }
fi
chk 'DEPLOY_CHECK' automation/platform/99_deployCheck.gs 1
# ★[MARKS_REMOTE 2026-08-30] 아래 넷은 «점검 목록»에 그 항목이 살아 있는지 보는 줄이다.
#   목록이 99_deployCheck.gs → deploy-marks.json 으로 옮겨 갔으므로 보는 곳도 옮긴다.
#   ★.gs 를 계속 보게 두면 목록이 통째로 사라져도 이 줄들이 조용히 초록을 낸다.
chk 'CF_CORE_TRUTH' deploy-marks.json 1
chk 'platformSelfTest' automation/platform/99_deployCheck.gs 2   # ★setupAllTriggers 로 되돌리면 90_test-utils 누락이 안 잡힌다

# ★★[LISTEN_LEAD_IN 2026-08-30 사용자 지시 "듣기 누르면 바로 나오기보단 2초정도 있다가 음성나오게
#   해죠 처음 누를때 가끔씩 씹히는 경우가 있어 첫마디가 말이야"]
#   parents.html 「듣기」는 누른 뒤 2초를 두고 소리를 낸다. 그 2초가 소리 장치를 깨우는 시간이다
#   (음원은 버퍼, 기기 음성은 엔진). 그래서 첫 글자가 안 씹힌다.
#   ★«재생»을 늦추는 게 아니라 «소리»를 늦춘다 — 재생을 setTimeout 으로 미루면 사용자 조작과의 끈이
#     끊겨 iOS 자동재생 정책에 막힌다. 음원은 muted 로 시작해 2초 뒤 되감아 풀고, 기기 음성은
#     빈 문장으로 엔진만 먼저 깨운다. volume 으로 바꾸지 말 것 — iOS 는 volume 을 코드로 못 바꾼다.
#   ★clearPending 을 빼지 말 것 — 멈춘 뒤 2초 있다 혼자 읽기 시작하는 유령이 생긴다(돌연변이로 확인).
chk 'LISTEN_LEAD_IN' parents.html 3
chk 'clearPending' parents.html 6
chk 'audioEl.muted=true' parents.html 1
chk 'LISTEN_IDEMPOTENT' parents.html 1
chk 'LISTEN_LEAD_IN' scripts/audit/parents-listen-race.mjs 3

# ★[JR_HOVER 2026-08-30 사용자 지시 "이부분도 위쪽 목업 처럼 클릭하지않아도 마우스 올려도 전환되게 해죠"]
#   index.html My Page 목업 목록 = 짚기만 해도 그 화면으로. 위쪽 「하객이 만나는 화면」과 같은 방식.
#   click 리스너를 지우지 말 것 — 손가락 기기에는 hover 가 없다.
chk 'JR_HOVER' index.html 1
chk "stepsWrap.addEventListener('mouseover'" index.html 1
chk "steps\[idx\].querySelector('.jr-step-btn').addEventListener('click'" index.html 1
# [LEAD_IN_SAY] 기다리는 2초 동안엔 「안 들리면 볼륨을 확인하세요」를 감춘다 — 그 2초는 원래 안 들린다.
#   띄워 두면 어른들이 멀쩡한 볼륨을 최대로 올려 두고, 소리가 나는 순간 깜짝 놀란다.
chk 'LEAD_IN_SAY' parents.html 2

# ── 2026-08-30 전수점검 라운드 [AUDIT_0830] ──
# [INV_CANONICAL_PATH] 청첩장 SEO 8페이지 canonical·og:url·prev/next = 실경로 /i/invitations/ (구 루트 경로는 404 · 08은 velour→noir 오기까지).
chk 'INV_CANONICAL_PATH' i/invitations/invitation-01-classic.html 1
chk 'https://momentedit.kr/i/invitations/invitation-08-noir.html' i/invitations/invitation-08-noir.html 2
# [SNAP_BALANCE_D7] 스냅 잔금 = 촬영 D-7(스냅 계약서 §4 표) — 시그니처 9 재사용으로 되돌리지 말 것.
chk '잔금일수전_스냅' automation/platform/70_journey.gs 3
chk '잔금일수전_스냅' automation/admin/admin.gs 1
chk '_balanceDaysFor' automation/platform/60_mypage.gs 2
# [SNAP_PENALTY_TABLE] 스냅 위약표(§9②) 엔진 구현 — 'return null(시그니처 전용)'로 되돌리면 서명된 표를 아무도 계산하지 않게 된다.
chk 'SNAP_PENALTY_TABLE' automation/platform/70_journey.gs 1
chk 'B27 스냅 당일' scripts/audit/calc-audit.mjs 1
# [FIT_EXTRA_N2] 시착 추가 벌수 경계 n>2·증분 n-2 (구 n>3 은 1벌 적게 안내하던 off-by-one).
chk 'FIT_EXTRA_N2' contract/fitting.html 1
# [CAL_320_FIT] 노아르 달력 320px 맞춤(부모 패딩+300px 넘침 수정).
chk 'CAL_320_FIT' i/invitations/invitation-08-noir.html 1
# [PRICE_DERIVED] 구가 파생 금액(18만/14만/11만) 스캔 — mypage 미리보기·_kb "14만원 인용"·sim 정답 잠금 3중 실사고의 그물.
chk 'PRICE_DERIVED' scripts/check-price-sync.mjs 2
# [SUM_GATE] 시퀀스 카드 대표값 합=140 · '합은 N분' 산문=55 — drift 게이트가 일부러 안 보던 자리에서 실제로 새던 둘.
chk 'SUM_GATE' scripts/check-source-drift.mjs 1

# ★★[GP_OVER_PICK 2026-08-22 병렬 시뮬레이션 점검에서 발견] 한 번에 고를 수 있는 장수를 넘기면
#   «말없이» 잘렸다. 실측: 35장을 골랐더니 30장만 가고 「30장 전해졌어요」로 끝났다 —
#   남은 5장이 사라진 것을 하객이 알 길이 없었다. 조용한 절삭은 «다 갔다»로 읽힌다.
#   → 잘린 수를 send/finish 로 넘겨 끝에서 함께 말한다(성공 시트·실패 인라인 양쪽).
chk 'GP_OVER_PICK' guide.html 1
chk 'over=all.length-f.length' guide.html 1
chk '남은 '"'"'+over+'"'"'장은 다시 눌러 보내 주세요' guide.html 1

# ★★[GP_NONE_WHY 2026-08-22 병렬 점검에서 발견 · 내가 만든 결함] 한 장도 못 갔을 때
#   「보낼 사진이 없었어요」는 «고르지 않았다»는 뜻으로 읽힌다. 실제로는 크기 때문에 걸러진 것이다.
#   실측: 25MB 한 장만 고르니 그 문구가 떴다 — 왜 안 갔는지 알 수 없었다.
#   [GP_DONE_SHEET] 로 성공을 시트로 옮기면서 big 을 이 갈래에서 잃어버린 것이 원인이다.
chk 'GP_NONE_WHY' guide.html 1
chk '사진이 너무 커서 보내지 못했어요' guide.html 1

# ★★[DEPLOY_CHECK 2026-08-22 사용자 요청 "GAS 파일 전부 업로드 했는데 누락없는지 체크해보자"]
#   여러 파일을 한꺼번에 붙여 넣으면 «빠뜨린 파일»보다 «옛 판을 붙인 파일»이 더 흔하다.
#   있는지만 보면 그걸 못 잡는다 — 그래서 넷을 따로 본다:
#     ①파일이 있나(그 파일에만 있는 함수) ②최신판인가(최근 커밋이 새로 넣은 함수)
#     ③배포가 먹었나(/exec 를 직접 찔러 '알 수 없는 요청' 인지 본다 — 저장만으론 안 먹는다)
#     ④시트가 준비됐나(addGuestPhotoColumns 로 생긴 컬럼)
#   ★프록시가 막아 내가 라이브를 못 찌른다 — 그래서 «GAS 안에서» 도는 함수로 만들었다.
#   ★적대 검증: 다섯 상황을 흉내 내 각각 다른 이유를 짚는지 확인한다(deploy-check-sim).
# ★★2026-08-30 — 같은 것을 두 세션이 만들었다. 내가 만든 99_deploy_check.gs 는 «지웠다».
#   99_deployCheck.gs(다른 세션)가 더 낫다 — 함수 본문 표식(toString)으로 «붙여넣다 잘린 것»까지 잡고,
#   deploycheck-coverage 게이트가 목록이 뒤처지는 것을 막는다. 원천은 하나여야 한다.
#   ★내 쪽에만 있던 둘(배포본 확인·시트 컬럼)은 그 파일에 «보탰다» — 버린 것이 아니다.
# ★[DEPLOY_LIVE → DEPLOY_STAMP 2026-08-30] 옛 ④ 는 자기 /exec 를 찔러 응답 문구('알 수 없는 요청')로
#   배포 여부를 갈랐다. 그 길은 «구글이 막는다» — 실측 HTTP 401, 두 번의 실기 실행에서 늘 「확인 불가」였다.
#   그래서 지문 대조로 갈아탔다(아래 DEPLOY_STAMP 블록). 마커가 사라진 것은 역전이 아니라 정당한 폐지다.
#   ★되살리지 말 것 — 되살려도 401 이라 「확인 불가」만 반복하고, 그러면 사람이 ④ 를 안 읽게 된다.
chk '하객사진 컬럼 4개' automation/platform/99_deployCheck.gs 1
# ★중복 점검 파일이 되살아나는 것을 «문자열»이 아니라 «파일이 있느냐»로 본다.
#   nochk 로 두었더니 그 nochk 줄 자신이 걸렸다(자기 참조 · 오늘만 세 번째다).
[ -e automation/platform/99_deploy_check.gs ] \
  && { echo "FAIL 중복 점검 파일이 되살아났다 — 99_deployCheck.gs 하나만 둔다"; fail=1; } \
  || echo "ok 점검 파일은 하나뿐(99_deployCheck.gs)"

# ★★[SEQ_FIG_LINING 2026-08-22 사용자 지적 "min이 하단에 붙어있어야 하는데 어떤건 중간에 있고"]
#   ★먼저 «레이아웃 문제가 아님»을 실측으로 배제했다 — 다섯 min 이 각자 상자 위에서 전부 21px 로 같다.
#     상자 높이만 65/89 로 다른데(설명이 1줄이냐 2줄이냐) 그건 min 자리와 무관하다.
#     min 을 옮겨 고치려 하지 말 것 — 이미 같은 자리다. 옮기면 이번엔 다른 줄이 어긋난다.
#   원인은 글리프다: Cormorant 의 기본 숫자가 «올드스타일»이라 2·0·1 은 x높이인데 3·4·5 는
#   기준선 아래로 내려간다. 그래서 45·35 는 숫자가 min 보다 더 내려가 min 이 «가운데»처럼 보였다.
#   → 숫자를 높이가 같은 라이닝으로. 폭도 고정해 다섯 줄이 한 단으로 선다(실측 칸폭 80px 통일).
#   ★구형 사파리는 font-variant-numeric 을 무시하므로 font-feature-settings 도 함께 둔다.
#   ★내 환경에서는 실제 글꼴을 못 띄운다(프록시가 fonts.gstatic 을 404 로 막는다) —
#     적용 여부는 계산된 스타일로 확인했고, 눈으로의 확정은 사용자 기기 몫이다.
chk 'SEQ_FIG_LINING' index.html 1
chk 'font-variant-numeric: lining-nums tabular-nums' index.html 1
chk '"lnum" 1, "tnum" 1' index.html 1

# ★★[DEPLOY_CHECK_SIM 2026-08-30 사용자 지시 "너가 임의로 메인 파일 살짝 변경하고 필터되는지 체크"]
#   점검 파일(99_deployCheck.gs) 자체가 «점검받지 않은 코드»였다. GAS 실행에서 「누락 0건」이 나온 건
#   지금이 온전하다는 뜻이지 «망가뜨렸을 때 붉어진다»는 뜻이 아니다.
#   그래서 GAS 없이 실제 .gs 를 node vm 에 올려 붙여넣기 상태를 흉내 내고, 셋을 실제로 확인한다:
#     ①파일 18개를 하나씩 빼 본다 ②80_production 을 옛 커밋 판으로 바꿔 올린다 ③표식 한 줄만 지운다
#   ★샌드박스가 못 재는 둘(④배포본 판정·⑤시트 확인)은 빼고 센다 — 안 빼면 늘 2건 붉어 차이를 못 잰다.
#   0.4초. 붉어지면 점검 파일에 구멍이 생긴 것이다.
if command -v node >/dev/null 2>&1; then node scripts/audit/deploycheck-sim.mjs >/dev/null 2>&1 \
  || { echo 'FAIL deploycheck-sim: 99_deployCheck 가 안 붙인 파일/옛 버전을 못 잡는다 — node scripts/audit/deploycheck-sim.mjs'; fail=1; }; fi
chk 'DEPLOY_CHECK_SIM' scripts/audit/deploycheck-sim.mjs 1
chk 'SIM_BLIND' scripts/audit/deploycheck-sim.mjs 2

# ★[STAMP_MISS_WORDING 2026-09-05 사용자 "배포했는데 최신본맞는지 직접확인해볼래?"]
#   ④ 의 실패 줄이 OK 쪽 라벨을 재사용해 「MISS 배포본이 지금 저장된 코드와 같다」로 찍혔다 —
#   재배포가 먹었는지 보는 «바로 그 순간»에 정반대를 말하던 줄이다.
#   ★sim 5번이 그 잘못된 문구를 «정답»으로 고정하고 있었다(게이트가 모순을 지켜 준 자리) — 둘 다 고쳤다.
#   되돌리면 sim 5번이 종료코드 1 로 붉어진다(돌연변이로 확인).
chk 'STAMP_MISS_WORDING' automation/platform/99_deployCheck.gs 1
chk 'STAMP_MISS_WORDING' scripts/audit/deploycheck-sim.mjs 2
chk '저장된 코드와 «다르다»' automation/platform/99_deployCheck.gs 1

# ── 2026-08-30 라운드 3(병렬 심층 점검) ──
# [SNAP_WITHDRAW_GUARD] 스냅 청약철회는 촬영 개시 «전»에만(계약서 §7③) — dd>=1 가드를 빼면
#   촬영이 끝난 뒤에도 전액 환급이 나온다(실측으로 잡은 구멍).
chk 'SNAP_WITHDRAW_GUARD' automation/platform/70_journey.gs 1
chk '_sDd >= 1' automation/platform/70_journey.gs 3
# [FIT_DEDUCT_FLOOR] 시착 벌수가 음수여도 공제는 0 이상 — 받은 돈보다 더 돌려주지 않게.
chk 'FIT_DEDUCT_FLOOR' automation/platform/70_journey.gs 1
# [PAY_LOCK_REENTRANT] 돈 확인 계열의 재진입 안전 락 — 관리자 동시 클릭 직렬화 + 카드 경로에서 조기 해제 금지.
#   ★단순 LockService 로 되돌리지 말 것: 카드(handleCardConfirm)가 락을 쥔 채 이 함수들을 부른다.
chk 'PAY_LOCK_REENTRANT' automation/platform/70_journey.gs 4
chk '_payLock' automation/platform/70_journey.gs 4
chk '_payLock' automation/admin/admin.gs 10
chk '_payLock' automation/platform/98_pay_card.gs 1
# [KB_DRAFT_RATE] kb-draft 레이트 가드 — 시그니처 불일치로 한 번도 안 걸리던 것(200회 전부 통과 실측).
chk 'KB_DRAFT_RATE' api/kb-draft.js 1
chk 'rateLimit(req, 3, 30)' api/kb-draft.js 1
# [OG_HOST_FIX] og-inv 가 요청 헤더의 호스트를 그대로 fetch 대상에 쓰던 것 — 허용 목록으로.
chk 'OG_HOST_FIX' api/og-inv.js 1
# [SURVEY_DIRTY] 후기 객관식은 버튼(data-sel)이라 태그 기반 dirty 검사에 안 걸려 새로고침에 조용히 날아갔다.
chk 'SURVEY_DIRTY' mypage.html 1
# [LOGOUT_SWEEP] 로그아웃이 식순 초안·펼침 상태를 남겨 다음 사람 화면에 비치던 것(me_guide_* 는 보존).
chk 'LOGOUT_SWEEP' mypage.html 1
# [SEATNOTE_LEAVE] 좌석 «미리 알려주실 것» 0.8초 디바운스가 앱 전환·탭 닫기에서 유실되던 것.
chk 'SEATNOTE_LEAVE' mypage.html 1
# ★두 세션이 같은 결론에 동시에 도달했다 — 단위 스위트 «실행» 배선은 아래 main 쪽(UNIT_SUITES_RUN)으로 합쳤다.
#   guide.test 는 #606 이 되살려 이제 초록이라 그 목록에 함께 들어 있다.
chk 'PAYCARD_HARNESS_FLOW' automation/tests/pay-card.test.js 1

# ★★[UNIT_SUITES_RUN 2026-08-29 점검] 단위 스위트를 **실행**한다 — 종전엔 이 파일들 안의 마커만 보고
#   내용은 한 번도 돌리지 않았다(#589 «검사를 만들었다 ≠ 검사가 돈다»의 재발).
#   그 결과 pay-card 는 PR #555 이후 몇 주 동안 ReferenceError 로 통째로 죽어 있었고(60건 미실행),
#   guide 9건·change-fee 4건이 붉은 채 병합됐다. 마커 검사로는 이런 것을 잡을 수 없다.
#   ★스위트를 추가하면 이 목록에도 넣을 것.
if command -v node >/dev/null 2>&1; then
  for _t in guide refund-quote change-fee pay-card dining-sync notify-msg; do
    node "automation/tests/$_t.test.js" >/dev/null 2>&1 \
      || { echo "FAIL $_t.test.js: 단위 스위트가 실패합니다 — node automation/tests/$_t.test.js"; fail=1; }
  done
fi
chk 'UNIT_SUITES_RUN' automation/tests/merge-guard.sh 1
chk 'HARNESS_STAGEFLOW' automation/tests/pay-card.test.js 1
chk 'CF_CORE_TRUTH 픽스처' automation/tests/guide.test.js 1
chk 'OLD_SIGNER_TERMS 픽스처' automation/tests/change-fee.test.js 1
# ★★[SEND_TIME_REQ 2026-08-29 점검] 시그니처 계약서는 «예식 시간»과 함께만 나간다.
#   서명 가드([SIGN_SLOT_REQUIRED])는 시간이 없으면 서명을 거부한다 — 그런데 발송 폼엔 시간 칸이
#   아예 없어, 시간 없이 나간 계약서를 받은 고객은 **아무것도 할 수 없는 막다른 길**에 선다.
#   막는 자리를 서명이 아니라 발송으로 옮겼다(고칠 수 있는 사람이 그쪽에 있다) + 화면에 고를 칸을 뒀다.
#   ★서버 가드만 지우거나 화면 칸만 지우면 각각 다른 방식으로 발송이 깨진다 — 둘은 한 몸이다.
chk 'SEND_TIME_REQ' automation/admin/admin.gs 1
chk 'SEND_TIME_REQ' admin.html 2
chk 'ctWedT' admin.html 2
chk 'SEND_TIME_REQ' scripts/audit/admin-shot.mjs 2
# ★씨앗의 예식 시간은 main(#597 라운드)이 먼저 넣었다 — 마커 이름이 아니라 «값»으로 지킨다.
#   이게 빠지면 [SIGN_SLOT_REQUIRED]가 서명을 거부해 «계약완료에 못 닿는다»는 가짜 경보가 난다.
chk "계약정보: { weddingTime: '12:20' }" scripts/audit/stage-reach.mjs 1
# [UNDO_AHEAD_LINE] 앞선 단계에선 되돌리기 «버튼» 대신 «사유 한 줄» — 두 검사가 서로 반대를 요구하지 않게.
chk 'UNDO_AHEAD_LINE' scripts/audit/admin-shot.mjs 1
# [DC_LIST_WIDEN 2026-08-30 점검] 99_deployCheck 목록에 넷을 더했다 — SEND_TIME_REQ 와,
#   같은 라운드에 드러난 EXIT_QUOTE_TS · OLD_SIGNER_TERMS · TEST_BLAST_GUARD.
#   넷 다 «옛 코드인 채로도 점검을 통과»하던 자리다(GAS 에 안 붙여넣어도 안 걸림).
#   ★얕은 체크아웃 문제(검사가 CI 에서만 붉던 것)는 #595·#607 이 fetch-depth: 0 + depth<=1 기권으로
#     이미 고쳤다 — 그 설계를 되돌리지 말 것. #607 이 표식 수집을 «새 함수 근처»로 좁힌 것도
#     헛경보를 줄이려는 의도적 결정이다(넓히지 말 것).
chk 'SEND_TIME_REQ' deploy-marks.json 1
chk 'EXIT_QUOTE_TS' deploy-marks.json 1
chk '개인코드 인자가 필요합니다' deploy-marks.json 1

# ★★[MARKS_REMOTE 2026-08-30 사용자 질문 "99파일은 매번 같이 업로드해야하는거야?"]
#   답은 «그랬다» 였다 — 목록이 99_deployCheck.gs 안에 있어 새 변경마다 그 파일도 함께 붙여야 했다.
#   ★이제 목록은 저장소 루트 deploy-marks.json 이고, 점검이 실행할 때 momentedit.kr 에서 읽어 간다.
#     main 병합 → Vercel 자동 배포라 늘 최신 → **99_deployCheck.gs 는 한 번만 붙여넣으면 된다.**
#   ★사이트를 못 읽으면 파일 존재 확인(FILES)만 하고, «②를 건너뛰었다»고 크게 알린다.
#     조용히 줄어든 점검은 «통과»로 읽혀서 가장 위험하다 — 그래서 침묵하지 않는다.
#   ★deploy-marks.json 을 지우거나 marks 를 비우면 시뮬레이터가 붉어진다(돌연변이로 확인).
chk 'MARKS_REMOTE' automation/platform/99_deployCheck.gs 2
chk 'deploy-marks.json' automation/platform/99_deployCheck.gs 1
chk 'MARKS_REMOTE' scripts/audit/deploycheck-coverage.mjs 1
chk 'SIM_MARKS_REMOTE' scripts/audit/deploycheck-sim.mjs 1
chk 'COVER_SCOPE' scripts/audit/deploycheck-coverage.mjs 1

# ★★[DEPLOY_STAMP 2026-08-30 사용자 질문 "재배포가 최신인지 그것도 같이 체크는 불가해?"]
#   막힌 것은 «GAS 가 자기 /exec 를 부르는 것»이었다(실측 HTTP 401 · 구글이 막는다).
#   그래서 방향을 뒤집었다 — 배포된 코드가 /exec 를 탈 때마다 «자기 지문»을 ScriptProperty 에 남기고,
#   deployCheck 는 «저장된 코드»의 지문을 같은 방법으로 계산해 대조한다. 다르면 재배포를 안 한 것이다.
#   ★지문은 핵심 함수 소스에서 «자동으로» 나온다 — 손으로 버전을 올리게 하면 그게 또 빠뜨릴 일거리가 된다.
#   ★★doPost·doGet 의 try 를 절대 벗기지 말 것 — /exec 는 고객의 길이고 배포 확인은 편의 기능이다.
#     보호막을 두 겹(호출 자리 + deployStamp 안) 다 벗기면 Property 장애 때 고객 요청이 통째로 죽는다.
#     돌연변이로 확인했다: 둘 다 벗기면 deploycheck-sim 6번이 붉어진다(한 겹만 벗기면 성질은 유지).
chk 'DEPLOY_STAMP' automation/platform/00_platform-config.gs 1
chk 'deployFingerprint' automation/platform/00_platform-config.gs 2
chk 'DEPLOY_STAMP' automation/consultation/consultation-booking.gs 2
chk "catch (_ds) {}" automation/consultation/consultation-booking.gs 2
chk 'DEPLOY_STAMP' automation/platform/99_deployCheck.gs 1
chk 'SIM_DEPLOY_STAMP' scripts/audit/deploycheck-sim.mjs 1
# ★★[DEMO_BADGE_QUIET 2026-08-30 사용자 지적 «빨간색 부분이 너무 튀는게»] 표본 배지는 «맥락»으로 갈린다.
#   우리 폰 목업 안(iframe) = 크림 캡션(노치 아래 26px) · 그 밖(하객이 잘린 링크로 연 자리) = 진사 채움 유지.
#   ★배지 자체를 지우지 말 것(표본 계좌 송금 사고 방지) · ①을 이유로 ②까지 조용하게 만들지 말 것.
chk 'DEMO_BADGE_QUIET' live.html 1
chk 'DEMO_BADGE_QUIET' shared/hydrate.js 1
chk '_inFrame' live.html 3
chk 'padding:26px 14px 9px' live.html 1
chk 'padding:26px 14px 9px' shared/hydrate.js 1

# [SECTION_GAP 2026-08-30] 점검 로그의 섹션 제목 앞 빈 줄 — 같은 실수를 두 번 했다(②③·④⑤).
#   둘 다 «블록을 통째로 다시 쓰며 끝의 L.push('') 를 옮겨 적지 않아서»다. 기능은 멀쩡하지만
#   40줄짜리 목록이 다음 제목과 붙어 한 덩어리로 읽힌다 — 이 로그는 사람이 눈으로 훑는 것이다.
#   세 번째는 사람의 주의가 아니라 검사가 막는다(deploycheck-sim 7번 · 돌연변이로 확인).
chk 'SECTION_GAP' scripts/audit/deploycheck-sim.mjs 1

# ★★[COVER_PAIR 2026-08-30 사용자 지시 "왜못잡앗는지 추적해서 확실하게 개선해"]
#   근본 원인이었다 — 커버리지 게이트가 목록 전체를 «한 덩어리 문자열»로 놓고 표식 «이름»만 찾았다.
#     const missing = alive.filter(([mk]) => !checkSrc.includes(mk));
#   그래서 같은 표식이 여러 파일에 있을 때, 어느 «한 파일»만 목록에 있으면 나머지가 전부 통과했다.
#   실사고: PAY_LOCK_REENTRANT 가 70_journey·admin·98_pay_card 셋에 있는데 목록엔 70_journey 한 줄뿐 →
#           98_pay_card 를 안 붙여도 「누락 0건」(옛 판으로 되돌려 재현 확인).
#   ★고친 것 둘 — ①게이트를 (파일,표식) «짝»으로 ②창과 무관한 전수 훑기(deploycheck-sim 8번).
#     ②가 필요한 이유: 게이트는 최근 7일 창만 본다. 옛날에 벌어진 짝은 그 창에 안 잡힌다.
#     실제로 ②로 6짝을 더 찾아 목록에 넣었다(ROLLBACK_SLOT·SNAP_BALANCE_D7×2·SIGN_SLOT_REQUIRED·
#     STAGE_REVIEW_DOOR·OLD_SIGNER_TERMS).
#   ★표식 이름만 보는 방식으로 되돌리지 말 것 — 되돌리면 이 구멍이 그대로 돌아온다.
chk 'COVER_PAIR' scripts/audit/deploycheck-coverage.mjs 1
# ★[COVER_COMMENT_ONLY 2026-09-05] 표식은 주석에 산다 — setValues([ADMIN_HEADERS]) 같은 배열
#   리터럴을 표식으로 세어 30일 창이 영구히 붉었다(붉은 채 사는 게이트 = 무시되는 게이트).
#   ★COVER_SCOPE 가 말하는 «좁힘»과 다른 것이다 — 그건 의도된 범위, 이건 오탐이었다.
chk 'COVER_COMMENT_ONLY' scripts/audit/deploycheck-coverage.mjs 1
chk 'COVER_PAIR' scripts/audit/deploycheck-sim.mjs 1
chk 'listedPairs' scripts/audit/deploycheck-coverage.mjs 2
# ★★[DEMO_BADGE_PLACE 2026-08-30 사용자 지적 «라이브 페이지도 개선해 줘»] 표본 경고를 두 자리로 나눈다.
#   위쪽 띠 = 크림 머리글(진사 채움 폐지) · **계좌 자리 = 별도 표시**([DEMO_ACCT_MARK]).
#   ★띠만 남기고 계좌 표시를 지우지 말 것 — 손이 움직이는 순간엔 띠가 화면 밖이다. 둘은 한 몸.
#   ★붙이는 자리는 «계좌 줄의 실제 부모»다(섹션에 바로 붙이면 NotFoundError 로 조용히 실패 · 실측).
chk 'DEMO_BADGE_PLACE' live.html 1
chk 'DEMO_BADGE_PLACE' shared/hydrate.js 1
chk 'DEMO_ACCT_MARK' live.html 1
chk 'DEMO_ACCT_MARK' shared/hydrate.js 1
chk 'demoAcctMark' live.html 2
chk 'meDemoAcct' shared/hydrate.js 2
nochk "background:#6B2A24;color:#fff" live.html

# ★★[ORPHAN_AUDITS 2026-08-30 사용자 지시 "자동으로 전부 개선"]
#   감사 61개를 훑어보니 **10개를 아무데서도 안 불렀다** — 게이트에도 야간 CI 에도 없었다.
#   만들어 두고 손으로 한 번 돌린 뒤 잊힌 것들이다. 안 도는 검사는 없느니만 못하다 —
#   «있다고 믿게 만들어서» 그 자리를 안 보게 한다. (오늘 내가 만든 index-jr-hover 도 그중 하나였다.)
#   ★여기 셋만 게이트에 둔다 — 합쳐 0.3초. 나머지 일곱은 브라우저·시뮬레이션이라 3~10초씩 걸려
#     게이트가 91초→124초가 된다. 그건 nightly-screen.yml 로 보냈다(느린 검사를 게이트에 넣으면
#     잘 울고, 그러면 사람이 붉은 것을 무시하기 시작한다 — 그 잡의 머리 주석이 적어 둔 이유).
if command -v node >/dev/null 2>&1; then
  for _a in admin-ac-check admin-forcestage-noop balance-sim; do
    node "scripts/audit/$_a.mjs" >/dev/null 2>&1 \
      || { echo "FAIL $_a — node scripts/audit/$_a.mjs"; fail=1; }
  done
fi
chk 'ORPHAN_AUDITS' automation/tests/merge-guard.sh 1
chk 'ORPHAN_AUDITS' .github/workflows/nightly-screen.yml 1
# [FREE_PORT 2026-08-30] 자기 서버를 띄우는 감사는 포트를 박지 않는다 — 나란히 돌면 부딪혀
#   «화면이 깨진 것»처럼 붉어진다(실측: 단독은 초록, 9개 연달아 돌리자 index-jr-hover 만 3건 실패).
#   실측 충돌 2쌍 중 admin-review-stage↔seat-onecard 는 내가 방금 야간 CI 에 나란히 넣은 조합이었다.
#   ★scripts/check-est-one.mjs 등 «워크플로가 띄운 8895 공용 서버에 접속»하는 쪽은 대상이 아니다(의도된 공유).
chk 'FREE_PORT' scripts/audit/_freeport.mjs 1
chk 'freePort()' scripts/audit/index-jr-hover.mjs 1
chk 'freePort()' scripts/audit/seat-onecard.mjs 1
chk 'freePort()' scripts/audit/admin-review-stage.mjs 1
# ★★[CROSS_SESSION 2026-08-25] 여러 세션의 수정이 «서로를 깨지 않는가» — 접점만 모은 검사.
#   한 PR 안에서는 각자 초록이다. 사고는 둘이 만나는 자리에서 나고, 그 자리는 어느 쪽 검사에도 없다.
#   ★특히 [CHANGE_RATCHET] 의 근거인 동의기록.변경이력 — 되돌리기가 지우는 키 목록에 이것이
#     한 번이라도 들어가면 99만원짜리 구멍이 «되돌리기»라는 다른 문으로 다시 열린다.
chk 'CROSS_SESSION' scripts/audit/cross-session.mjs 1
chk '되돌려도 변경이력' scripts/audit/cross-session.mjs 1
nochk "'변경이력'" automation/admin/admin.gs
