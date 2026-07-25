# [지시문] 환불 정비 후속 4건(FU1~FU4) 구현 — 배포 검증에서 나온 경계 케이스

배경: Q1~Q5 구현(main #222·#224·#225) 후 코워크 배포 검증에서 경계 케이스 4건 발견. 전부 차단급 아님, 작은 정비. 기존 마커(REFUND_QUEUE_CANCEL_NOACCT · FORCE_CANCEL_TS · REFUND_CARD_NOTE · CARD_REFUND_VIA_TOSS · REFUND_ACCT_REQ) 동작을 깨지 말 것.

## 작업 규칙
- CLAUDE.md 전 규칙 준수. `git fetch origin main` 후 최신 main에서 분기. main 직접 push 금지, 브랜치+PR(auto-merge), push 전 `sh automation/tests/merge-guard.sh`.
- 각 수정에 마커 주석 + merge-guard 등록. `.gs` 변경분은 응답에 파일 첨부 + "R3n9Mr에서 '새 버전' 재배포 필요" 명시.
- 고객 노출 문구: 전각 줄표(—) 금지 · 장식 이모지 금지 · 근거 없는 보증 금지.

## FU1 · 취소 큐 수령분 판정 기준 통일 [admin.gs]
- 문제: REFUND_QUEUE_CANCEL_NOACCT의 `_rPaidC`가 `Bookings.입금확인==='확인'`만 봄. 노쇼·미계약 안전망(`_rPaid2`)과 Q5 트리거(`_paidF`)는 `Customers.입금상태==='확인'`도 봄. 계약 후 취소(입금상태만 확인) + 계좌 미입력이면 여전히 큐 누락.
- 수정: `_rPaidC`를 노쇼·미계약과 동일하게 `(Bookings.입금확인==='확인') || (Customers.입금상태==='확인')`으로. 마커는 기존 REFUND_QUEUE_CANCEL_NOACCT 주석에 이력 한 줄 추가(새 마커 불요).

## FU2 · 취소 큐 0원 건 생략 (신규 노출분만) [admin.gs]
- 문제: 노쇼·미계약 분기는 `refund<=0`이면 큐 생략(_show2=false)인데, 취소+계좌없음 신규 노출분엔 생략이 없어 '0원 송금 필요' 항목이 뜰 수 있음(공제로 환불액 0원이면 고객 환불카드도 안 떠서 계좌 받을 일 자체가 없음).
- 수정(권장안): **계좌 미입력(_racct 없음) 건에 한해** `_rq.refund != null && refund<=0 && !needCount`면 pushQ 생략. 계좌가 이미 입력된 건은 기존 동작 그대로(변화 0 원칙 · 사람이 판단).
- 대안(비권장·구현하지 말 것): 계좌 입력 건까지 0원 생략 — 기존 동작 변경이라 별도 결정 필요, 이번 범위 제외.

## FU3 · 관리자 카드취소 경고를 계좌 입력 전에도 [admin.html]
- 문제: CARD_REFUND_VIA_TOSS 경고가 `if(d.stage==='취소' && c.refund)` 게이트 안에 있어, 카드 수령분 있고 환불계좌 미입력인 취소 고객 상세에선 경고가 안 보임(카드 취소 처리를 놓칠 수 있음).
- 수정: 카드 수령분 감지(_hasCardA)와 경고 출력을 `c.refund` 게이트 밖으로 — 조건: `d.stage==='취소' && _hasCardA && !d.refundDone`. 계좌 유무와 무관하게 경고 1줄. 기존 게이트 안 문구·버튼은 불변.
- 휴면 검증: 결제수단 마커 없으면(현재 라이브 전부) 출력물이 기존과 바이트 동일해야 함.

## FU4 · 계좌 요청 알림을 관리자 상담취소 경로에도 [consultation-booking.gs]
- 문제: REFUND_ACCT_REQ 알림이 adminForceStage(강제취소)에서만 발송. 관리자 상담카드 '취소' 버튼(doAdminCancel→actCancel) 경로는 미발송(현재는 Q3 큐 라벨만 커버).
- 수정: actCancel 내부, 상태가 '취소'로 **전이되는 순간에만**(기존 상태!==취소 분기 안) 동일 가드로 발송: 환불계좌 미입력 && 수령분(Bookings.입금확인==='확인' || Customers.입금상태==='확인') && `notifyKakao('cust.refundAcctReq', code)`. try/catch로 감싸 취소 처리 본연을 막지 않게.
- 주의: ①actCancel은 셀프취소도 지나감 — 셀프취소는 계좌 입력 후 취소라 가드(계좌 있음)로 자동 생략되지만, handleCancelReservation은 **actCancel 호출 후에 계좌를 기록하는지 순서 확인** — 계좌 기록(2017행 writeCell)이 actCancel(2018행)보다 먼저인 현 순서면 안전. 이메일취소(handleEmailCancel)는 actCancel 미경유이므로 acct 미입력 제출 시 동일 가드 발송을 넣을지 판단해 반영(수령분 있으면 발송 권장). ②이미 취소인 행 재처리(취소일시만 갱신) 시 재발송되지 않아야 함 — 반드시 상태 전이 분기 안쪽에 배치. ③중복 방지 이중화가 필요하면 동의기록에 refundAcctReqAt 1회 플래그 기록(권장).

## PR 분리 제안
- PR-A: FU1+FU2 [admin.gs] · PR-B: FU3 [admin.html] · PR-C: FU4 [consultation-booking.gs (+필요시 95_notify 문구 재사용 확인)]
- 각각 작게, auto-merge, merge-guard 초록 확인.

## 검증(각 PR 공통)
1. `node --check` 해당 파일(.gs는 문법 호환 확인 방식 기존과 동일).
2. merge-guard 전체 통과 + 신규/갱신 마커 등재.
3. 휴면 렌더 비교(FU3): 결제수단 빈 객체 입력 시 cardConsult 출력 구/신 동일함을 확인(코워크 하니스 방식 참고 가능 — 함수 추출 후 동일 mock으로 문자열 비교).
4. FU4 시나리오 표: 셀프취소(계좌 있음)=미발송 · 관리자 상담취소(계좌 없음·수령분 있음)=1회 발송 · 이미 취소 재처리=미발송 · 수령분 없음=미발송.

## 완료 보고 형식
- PR 번호·마커 목록·검증 결과(위 4항) + 재배포 필요한 .gs 파일 첨부 + "R3n9Mr에서 '새 버전' 재배포 필요" 명시.
- 이번 범위 밖 발견사항은 구현하지 말고 목록으로만.
