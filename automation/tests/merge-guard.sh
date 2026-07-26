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
chk '오늘 예식의 마지막 순서입니다' assets/ritual-data.js 1     # G3-15 폐식 finality cue
chk 'DECL_SET_INVARIANT' scripts/check-ritual-mirror.js 1   # 선언 택1 세트 개수 3중 대조(원천·빌더·생성기)
chk "ask:{d:'하객이 함께 답하기'" assets/ritual-data.js 1    # 응답형 = 선언 택1의 네 번째 선택지(덧붙임 아님)
chk "'narr','ask','chorus','family'" order-preview.html 1
chk 'DECL_ADMIN_MIRROR' scripts/check-ritual-mirror.js 1   # 운영자 화면 2곳이 선언 주체 4종을 다루는지
chk '_declWhoLabel' admin.html 2                            # 선언 주체 라벨은 원천(DECLWHO)에서 읽는다 · 하드코딩 맵 복귀 금지
chk 'assets/ritual-data.js' admin.html 1                    # 위 함수가 참조할 원천 로드
chk "declareWho==='ask'" automation/admin/Admin.html 1      # GAS 관리자도 응답형을 분기(틀린 값 표시 방지)
