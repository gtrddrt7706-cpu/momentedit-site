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
# chk는 한 줄 정의다 — 중간에 주석(#)을 넣으면 그 뒤가 통째로 주석이 되어 함수가 안 닫힌다(2026-07-26에 실제로 겪음).
# _ran = GATE_RAN 중단 감지용 실행 계수.
chk(){ _ran=$((_ran+1)); n=$(grep -c "$1" "$2" 2>/dev/null); n=${n:-0}; if [ "$n" -lt "$3" ]; then echo "REVERT? $2: '$1' ($n<$3)"; fail=1; else echo "ok $2: '$1' $n"; fi; }   # grep -c는 0건도 '0'을 출력하며 exit 1 — '|| echo 0'을 붙이면 '0\n0'이 돼 [ 비교가 깨짐
# ── 2026-07-18 위저드·대시보드 수정 마커
chk '_t04prev' mypage.html 2                       # 04 호칭 복원
chk 'QR을 받으실지 골라 주세요' mypage.html 1      # selfQR 미응답 발행 차단
chk 'AbortError' mypage.html 2                     # 공유·QR 저장 폴백
chk '발행 직전 1회만' mypage.html 1                # both 같게 미러 시점
chk '계좌를 비워 두면' mypage.html 1               # 계좌 필수 거짓 문구 정정
chk 'GUIDE_MAKE_COND' mypage.html 3                # 하객 안내 조건 공용 상수
chk '본예식 15분 전' mypage.html 1                 # 인쇄 킷 도착 안내
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
# (마커 '다이어트 2026-07-18' 폐지 2026-07-19: 옛 최종 확정 2단계 위저드가 좌석 화면으로 완전 통합됨 — 인원 자동·자리별 3음료. renderFinal은 좌석 화면 라우팅 백스톱으로만 남음)
chk '최종 확정 · 좌석' mypage.html 1               # 통합 행(2026-07-19 사용자 지시)
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
chk 'PHOTO_FX_MAX' mypage.html 3                    # 연출/이벤트 프리셋(photoFx) 상한+사용
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
chk 'PHOTO_FX_CARDS' mypage.html 3                 # 동작 예시 카드 데이터(제목·의도·구도 SVG) + 렌더 + 이름 파생
chk 'pfx-card' mypage.html 2                       # 동작 예시 카드 CSS + 렌더 마크업(무드단어 클릭 → 구도 보이는 카드)
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
chk 'MPD4_F4' mypage.html 1                         # 음료 바 하단 고정
# ── 2026-07-25 마이페이지 4차 스프린트 PR③(F2 SR 골격·포커스 복귀 · F3 칩 키보드화)
chk 'MPD4_F2' mypage.html 5                         # sr-only CSS+h1+NEXT h2+포커스 저장/복원
chk 'MPD4_F3' mypage.html 4                         # _kbChip 헬퍼+스냅·사진·큐시트 배선
chk '_kbChip' mypage.html 6                         # 헬퍼 정의+호출 5곳
# ── 2026-07-25 마이페이지 4차 스프린트 PR④(C3 명도 계단 · H3 blur 힌트 · H4 접기+내 완성물 · H5 1단계)
chk 'MPD4_C3' mypage.html 1                         # 잠긴 단계 명도 계단
chk 'MPD4_H3' mypage.html 3                         # blur 형식 힌트(헬퍼+ci+환불+이메일)
chk '_softHint' mypage.html 7                       # 헬퍼+배선 6곳
chk 'MPD4_H4' mypage.html 4                         # 완료 행 접기+내 완성물(CSS·조립·요약·게이트)
chk 'trk-fold' mypage.html 2                        # 접기 CSS+마크업
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
chk 'HOME_TAP40' index.html 2                   # 텍스트 링크 히트영역 40px(::before) + me-adv-close 패딩 11px. ★크기 대신 히트영역인 이유는 밑줄·화살표 장식 보존
chk 'FAB 레일' index.html 1                      # ★아이콘 레일 변경 금지 주석(2026-07-26 사용자 지시) — 삭제 금지
chk 'HOME_IMG_WEBP' index.html 1                # picture/source webp 전환(3223→1093KB) 설명 주석 — 삭제 금지
chk '<source type="image/webp"' index.html 22   # 22장 전부 webp source 유지(하나라도 빠지면 그 자리가 빈다)
chk 'img-webp.mjs' scripts/audit/img-webp.mjs 1  # 위 구조 상시 회귀(파일 존재 + 디코드 실패 이중 확인)
# ── 2026-07-26 /점검 · 나레이션 대본 교차점검
chk 'RINGWARM_NO_MIN' order-preview.html 1     # 링워밍 '하객 전체' 카드의 '약 2분 더'·'스물다섯 분' 복원 금지(recoTxt '인원에 따라 달라져요'와 정면 모순 · 수치 약속 금지)
chk 'DECL_PAUSE_POS' scripts/build-dubbing-script.mjs 1   # 선언 무음이 '마지막 문장'이 아니라 '끝에서 두 번째'(선언문) 기준임 — 구 지시 복원 금지
chk 'N0_STAY' scripts/build-dubbing-script.mjs 1          # N0가 '자리를 옮기실 때'로 되돌아가면 폐식 G3-15 '자리에서 그대로'와 다시 충돌
# ── 2026-07-26 홈 문구·정보 정리(사용자 결정)
chk 'HOME_PRICE_FMT' index.html 1              # 금액 표기 규칙 주석 — 삭제 금지(INVEST=₩전체자릿수 / 산문=210만 원 / 계약서 미러 조항은 50,000원 유지)
chk '210만 원' index.html 3                    # 산문 금액이 '210만'·'210만원'으로 되돌아가면 한 페이지에 세 형식이 다시 생긴다
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
chk 'MP_PHOTOSHARE_INFO' mypage.html 1         # 부부 쪽 짝 안내 — 접근 범위·프로필 노출·앨범을 지우면 버튼도 닫힘
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
chk 'ORD_NOTE_FIT' order-preview.html 1        # ★미니멀엔 편지 낭독이 없는데 '편지와 서약이 중심인 예식이라'로 권하고 있었다 — 고르지도 않은 순서를 근거로 든 말
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
chk 'CAKE_DUP_GUARD' order-preview.html 3          # 사이 순서+축배 케이크 이중 예약 알림(막지 않고 알림)
chk 'XM_MIRROR_9KEY' assets/ritual-data.js 1       # 소요분 9키 정합 — 빌더가 기준
chk 'XM_MIRROR_9KEY' scripts/check-ritual-mirror.js 1
chk 'NAR_MIRROR' scripts/check-ritual-mirror.js 1  # 빌더 인라인 사본 <-> 원천 문안 전수 대조
chk '두 사람이 함께 나이프를 잡습니다' assets/ritual-data.js 2   # G9 케이크 동작 교정(cake+both)
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
chk '★AI고지_부부' order-preview.html 1                       # 음성=완곡 / 인쇄=명시 분리를 부부가 알고 승인(회신4 조건 ㉯)
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
chk 'FALLBACK_LADDER' order-preview.html 2                   # 서약·편지 낭독 중단 안전망(§3 1~3순위) · 4순위 성우 대리는 올리지 않는다
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
chk 'act-off' guide.html 2                                   # 표본에서 지도·사진 올리기 이동 차단 · 지어낸 가게로 지도를 띄우면 고장난 화면이 된다
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
chk 'MOCKUP_TERSE' index.html 2                              # 목업 4단 설명 30자 이내 1줄 규칙 · 옆 폰이 이미 화면을 보여주므로 글이 한 번 더 묘사하면 중복이다
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
chk 'SEAT_DRINK_SRV' automation/platform/80_production.gs 3        # seatView 음료 3곳(전체공개 tables · 슬림 보존 · 내자리만 hits[0].drink) · 하나만 빠져도 한쪽 모드에서 음료가 사라진다
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
chk 'trk-act-min' mypage.html 2                         # 보조 버튼 크기 위계 · 빼면 「미리 들어보기」가 주 버튼과 같은 무게로 선다
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
chk 'MOCK_SAMPLE_SYNC' index.html 1                     # 홈 목업 표본일 = 청첩장 SAMPLE(2026-10-24 토 14:00) · 어긋나면 홈과 미리보기가 다른 예식일을 보여준다

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
nochk(){ n=$(grep -c -e "$1" -- "$2" 2>/dev/null); n=${n:-0}; if [ "$n" -gt "${3:-0}" ]; then echo "REVERT? $2: '$1' 이 남아 있다 ($n>${3:-0})"; fail=1; else echo "ok $2: '$1' 없음"; fi; }

# [SOURCE_DRIFT] 원천 값이 손으로 적힌 자리를 찾는 검사 — 인스턴스가 아니라 병을 잡는다.
node scripts/check-source-drift.mjs || FAIL=1

# [FILE_NO_SOURCE] mp3 번호는 엔진(RitualCue.fileOf = FILES 인덱스+1)에서만 온다.
#   ★대본 생성기가 1부터 세어 붙이던 시절, 폐지 클립(53 narr-ringwarm-out)이 FILES 에 자리로
#     남아 있어 **53번부터 스물두 클립이 한 칸씩 밀려** 있었다. 검사는 전부 초록이었고
#     대본도 멀쩡해 보였다 — 녹음해 넣은 뒤 당일에야 「다 함께」 구간이 통째로 무음이 됐을 것이다.
chk 'FILE_NO_SOURCE' scripts/build-dubbing-script.mjs 1
chk 'padOf(file)' scripts/build-dubbing-script.mjs 1
# [CLIP_COUNT] 대본 클립 수 가드 — 51 로 굳어 있는 동안 대본은 74 가 됐고, 생성기가 매번
#   실패하면서 manifest.json 이 옛 51클립짜리로 얼어붙어 있었다(사람 눈에만 뜨는 실패였다).
chk 'CLIP_COUNT' scripts/build-typecast-import.mjs 2
node scripts/build-dubbing-script.mjs >/dev/null || FAIL=1
node scripts/build-typecast-import.mjs >/dev/null || FAIL=1

# [SPLIT_JOIN] 타입캐스트가 한 문장을 쉼표에서 쪼개 보내는 것을 도로 잇는 도구.
#   `신랑 신부, 입장!` 이 두 파일로 와서 입장 6클립이 23 → 29개가 됐다(두 번 당했다).
chk 'SPLIT_JOIN' scripts/join-split-sentences.mjs 1
chk 'SPLIT_JOIN' scripts/assemble-narration.mjs 1

# [DRIFT_MUTATION] 그 검사가 **진짜로 잡는지** 시험한다. 초록은 아무것도 증명하지 않는다 —
#   실제로 두 번 뚫려 있었고(주석이 낡은 행을 대신 통과시킴 · 줄 뒤 주석이 그 줄을 면제시킴),
#   둘 다 행을 일부러 낡게 바꿔 보고 나서야 드러났다. 검사를 고칠 때마다 이걸 함께 돌린다.
sh scripts/check-source-drift.test.sh || FAIL=1

# [CONTRACT_V14] 계약서 3조① 본식 16~24분 · Group Record 36~44분(합 60분 고정) · 문서 v1.4.
#   ★v1.3 서명자는 archive/v1-3.html 로 열람해야 한다 — 이 줄이 사라지면 옛 서명자가
#     자기가 서명하지 않은 문서를 보게 된다(계약서 32조③ '이미 체결된 계약의 효력은 불변').
chk 'archive/v1-3.html' admin.html 1
chk 'archive/v1-3.html' mypage.html 1
chk 'CONTRACT_V14' admin.html 1
chk 'CONTRACT_V14' mypage.html 1
chk "docVersion: 'v1.4'" automation/platform/70_journey.gs 1

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

# [PHOTO_LIST_V2] 단체사진 구도 목록 v2 — 갈래(gather)와 상한은 5차 리서치 실측에 매여 있다.
#   11개로 되돌리면 30분에 안 들어간다(전체컷 6분 + 11×3 = 39분).
chk 'PHOTO_LIST_V2' mypage.html 2
chk 'var PHOTO_MAX=6' mypage.html 1
chk 'var PHOTO_FX_MAX=3' mypage.html 1
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
chk 'VOW_CHORUS' order-preview.html 4
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
chk '저희, 그렇게 살겠습니다.' 'docs/plans/식순연구/타입캐스트/재더빙_화면글자_맞추기.txt' 2   # 재더빙 붙여넣기에 합창 재료 2클립이 들어 있어야 한다
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
chk 'entryOut' assets/ritual-data.js 1
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
