# 예식 준비 행 → 전체화면 편집 오버레이 전환 (2026-07-19)

사용자 지시: "각 행 클릭 시 식순처럼 전체화면으로 바뀌며 수정 · 집중도↑ · 관건은 디자인".

## 현황
- **이미 전체화면 오버레이**: 식순(order-preview iframe), 스냅 기획(mp_snapOverlay div)
- **인라인 슬롯(mp_production) 렌더**(위 진행바·헤더 잔존): 청첩장(INVFLOW)·애프터 웨딩+최종 확정(TRKFLOW)·좌석(SEATFLOW)·단체 사진(PHOTOFLOW)

## 설계 결정 (디자인)
- **타깃 패턴 = 스냅 오버레이**: `position:fixed;inset:0;z-index:9999` 별도 div를 body에 append → 그 안에 flow 렌더. 별도 div라 ancestor transform 위험 없음·renderProduction과 독립(pull-refresh 무관·`_mpLock`으로 배경 잠금).
- **헤더 통일**: 상단 `.inv-head`(좌: 파트명 / 우: `저장 후 나가기`). fade-in .22s. 뒤로가기 = 저장 후 나가기(bkOpen 가드).
- **저장 규약**: 각 flow의 기존 save-on-exit 유지. 성공=오버레이 닫고 loadMyState. 실패=오버레이 유지 + 재시도 mpConfirm(무음 유실 금지).
- **본문**: `max-width:620px` 중앙 정렬·내부 스크롤(body overflow-y:auto).

## 롤아웃 순서 (리스크 낮은 것부터 · 각 단계 e2e 회귀 검증)
1. **단체 사진(PHOTOFLOW)** — ✅ 완료(파일럿 · 2026-07-19). fxflow·photoshare 하네스 PASS. marker: `PROD_OVERLAY`.
2. **좌석 배치도(SEATFLOW)** — 자기완결·선택 항목. seatflow 하네스로 검증.
3. **애프터 웨딩(TRKFLOW track=dining)** — 다이닝 위저드.
4. **청첩장(INVFLOW)** — 4스텝 위저드(진행 표시 유지)·발행 연관 → 신중.
5. **최종 확정(TRKFLOW track=final)** — 인원·음료·잔금 연관(결제 영향) → 마지막·최중점 검증.

주: 식순은 이미 오버레이라 대상 아님.

## 공통 리스크·체크
- `_mpLock`/`_mpUnlock` 중첩 카운터 — enter 1회 lock, exit 1회 unlock(각 exit 경로 3개: 성공·저장없이나가기·뒤로가기).
- 각 flow의 renderProduction 인라인 분기 제거(오버레이 독립화) — 단, 위저드가 mp_production을 참조하던 내부 재렌더/포커스 코드가 있으면 오버레이 inner로 교체.
- pull-to-refresh: `_mpLock`(body fixed)로 자동 차단. dirtyOutsideFlows 가드가 flow.active를 보던 부분은 유지.
- back-guard 재무장(실패 시 bkAlive 재확인).

## 검증 자산
- scratchpad/review4/fxflow_e2e.js · photoshare_e2e.js (PHOTOFLOW)
- 좌석·다이닝·청첩장·최종은 각 하네스 재사용/신규 후 전환.
