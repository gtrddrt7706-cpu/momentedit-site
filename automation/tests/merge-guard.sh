#!/bin/sh
# 병렬 세션 병합 역전 감지 — 최근 수정 마커 생존 grep (0이면 병합이 조용히 되돌린 것)
# 사용: main 병합(pull 포함) 직후 sh automation/tests/merge-guard.sh
# 실사고 3건: ①.done-fold CSS 오삭제 ②guideFold 조립 줄 소실 ③d42540f 낡은 버퍼 통째 커밋(위저드 수정 7건 무언급 역전 · 2026-07-18)
# 마커가 정당하게 사라지면(기능 폐지 등) 이 목록에서 함께 지울 것 — 목록 갱신 없이 0이 나오면 무조건 역전 의심.
cd "$(dirname "$0")/../.." || exit 1
fail=0
chk(){ n=$(grep -c "$1" "$2" 2>/dev/null); n=${n:-0}; if [ "$n" -lt "$3" ]; then echo "REVERT? $2: '$1' ($n<$3)"; fail=1; else echo "ok $2: '$1' $n"; fi; }   # grep -c는 0건도 '0'을 출력하며 exit 1 — '|| echo 0'을 붙이면 '0\n0'이 돼 [ 비교가 깨짐
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
chk '_coreDone' mypage.html 3                      # 강조·접힘 공용 게이트
chk 'DELIV_STEP_HONEST' mypage.html 3              # 결과물전달 진행 중엔 '후기 점프' 금지(전달완료만 후기)
chk 'DELIV_FLOW_STEP' mypage.html 2                # 원본 도착~컨펌 동안 진행바 '결과물 전달' 현재(표시 전용)
chk 'DELIV_WAIT_TITLE' mypage.html 1               # 대기 카드 제목 단계 인식(전달 단계=기록 준비 중)
chk 'DELIV_FORCE_RESUME' admin.html 1              # 강제 결과물전달 상태서 등록·전달 버튼 유지(거짓 '전달 완료' 막다른길 방지)
chk 'CARD_STAGE_ORDER' admin.html 3                # 고객 상세: 지금 단계 카드 최상단 재배치(stageCards/orderCards)
chk 'DELIV_FORCE_RESUME' automation/admin/admin.gs 2   # 강제 단계 고객도 전달 완료 처리 가능(멱등 유지)
chk 'SEARCH_DAYS_1Y' automation/consultation/consultation-booking.gs 1   # 예약 가능일 조회창 120→365(1년) 확대(2026-07-25 사용자 지시)
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
chk 'SNAP_PREP_STEP' mypage.html 1                 # 진행바 합성 '스냅기획' 스텝 삽입
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
# ── 2026-07-25 강제 롤백 데이터 정합(코드리뷰 7건 · 수납 보존/트랙 강등/스냅 도달/파기 플래그/좌석 캐시/카드 가드)
chk 'ROLLBACK_KEEP_PAID' automation/admin/admin.gs 5   # 확인된 수납(계약금·중도금·잔금·추가보정) 롤백 보존 — 지우면 카드 이중청구·영수증 큐 소실
chk 'ROLLBACK_TRACK_DEMOTE' automation/admin/admin.gs 1 # 결과물전달 아래 롤백 시 '전달완료'→'컨펌완료' 강등(단계·고객화면 정합)
chk 'FORCE_SEAT_INV' automation/admin/admin.gs 1        # 강제 롤백 시 좌석 공개 캐시 톰스톤
chk 'PAY_ROLLBACK_GUARD' automation/platform/98_pay_card.gs 1   # 카드 수납 흔적(결제수단) 기반 재청구 차단
chk '결과물파기' automation/admin/admin.gs 1            # 설문 그룹 consent에 결과물파기 포함(재전달 시 12조③ 통지 부활)
# ── 2026-07-25 신청 메일 FOR PARENTS 미니멀화 + 메일 모바일 하단 잘림(외곽 패딩 트림) 수정
chk 'PARENTS_MINIMAL' automation/platform/40_signup.gs 1   # FOR PARENTS 본문 1문장 스탠자·코칭 각주 3문장 삭제(복원 금지)
chk 'EMAIL_BOTTOM_SPACER' automation/consultation/consultation-booking.gs 1   # 공용 emailShell 카드 아래 실콘텐츠 스페이서(모바일 Gmail 외곽 아래 패딩 트림 방어)
# ── 2026-07-25 마이페이지 디자인 개선 배치 A(PLAN_마이페이지_디자인_개선.md · 5차 교차 점검 확정분)
chk 'MPD_A1' mypage.html 1                          # 잔금 게이트 '(1분)' 수치 약속 삭제(재추가 금지)
_a1=$(grep -c '(1분)' mypage.html 2>/dev/null); _a1=${_a1:-0}; if [ "$_a1" -gt 1 ]; then echo "REVERT? mypage.html: '(1분)' 소요시간 약속 부활($_a1)"; fail=1; else echo "ok mypage.html: '(1분)' 약속 없음(마커 주석 1건만)"; fi
chk 'MPD_A2' mypage.html 1                          # 렌더 전 placeholder 전각 줄표 → 공백
chk 'MPD_A3' mypage.html 1                          # 계약 카운트다운 만료 문구 해요체('기한이 지났어요')
chk 'MPD_A4' mypage.html 1                          # 로그인 네트워크 실패 기본 문구(무인자 showErr 금지)
# 식순 문안 단일 원천 정합(빌더↔KB) — node 있으면 실행(문안 이중 원천·KB 드리프트·토큰 캡 감지)
if command -v node >/dev/null 2>&1; then node scripts/check-ritual-mirror.js || fail=1; else echo 'skip check-ritual-mirror (node 없음)'; fi
[ "$fail" = "1" ] && { echo '── 역전 의심: 해당 수정 커밋을 git log에서 찾아 패치 재적용(git show <sha> -- 파일 | git apply -3) 후 복원 커밋'; exit 1; }
echo 'ALL MARKERS OK'
