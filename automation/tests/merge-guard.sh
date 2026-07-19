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
chk 'seat-fee' mypage.html 2                       # 캔버스 아래 인원·요금 자동 안내(25명 초과 경고)
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
# ── 2026-07-19 스냅사진 사전기획 파트(마이페이지 여정 스텝 · snap 트랙 · SNAPFLOW)
chk 'SNAP_PREP_STEP' mypage.html 1                 # 진행바 합성 '스냅기획' 스텝 삽입
chk 'SNAP_PREP_FLOW' mypage.html 1                 # SNAPFLOW 전용 화면 블록
chk 'SNAP_PREP_OVERLAY' mypage.html 1              # 스냅 기획 전체화면 오버레이(식순 빌더처럼 집중)
# PROD_FS_OVERLAY·.mp-fs 재등록(2026-07-19) — 청첩장·다이닝/최종·좌석 3종 편집을 mp_production .mp-fs로 전체화면화(단체사진은 전용 오버레이 PROD_OVERLAY, 스냅은 SNAP_PREP_OVERLAY).
chk 'PROD_FS_OVERLAY' mypage.html 1                 # 청첩장·다이닝·최종·좌석 3종 전체화면(.mp-fs 클래스 토글)
chk '\.mp-fs{' mypage.html 1                        # 전체화면 클래스 CSS
chk 'SNAP_PREP_NORMALIZE' automation/platform/80_production.gs 1   # 백엔드 snap 트랙 정규화
chk "track !== 'snap'" automation/platform/80_production.gs 2      # snap 화이트리스트 + 확인해제 제외
chk '스냅 기획 (촬영 전)' admin.html 1             # 관리자 상세 스냅 기획 블록
# ── 2026-07-19 단체사진 동작·하객 사진 모으기(QR 갤러리)·전체화면 오버레이 전환
chk '다 함께 하는 동작' mypage.html 1              # 단체컷 동작 프리셋 섹션(무드/트렌드 정리)
chk 'photoShareNorm' mypage.html 3                 # 하객 사진 모으기 링크 정규화(QR 갤러리 파일럿)
chk 'photoShareHtml' guide.html 2                  # 하객 안내 '사진 올리기' 버튼 섹션
chk 'photoShareUrl' automation/platform/80_production.gs 2   # guideinfo 정규화+guideView 출력
chk 'PROD_OVERLAY' mypage.html 1                   # 단체사진 전체화면 오버레이 전환(파일럿)
# 식순 문안 단일 원천 정합(빌더↔KB) — node 있으면 실행(문안 이중 원천·KB 드리프트·토큰 캡 감지)
if command -v node >/dev/null 2>&1; then node scripts/check-ritual-mirror.js || fail=1; else echo 'skip check-ritual-mirror (node 없음)'; fi
[ "$fail" = "1" ] && { echo '── 역전 의심: 해당 수정 커밋을 git log에서 찾아 패치 재적용(git show <sha> -- 파일 | git apply -3) 후 복원 커밋'; exit 1; }
echo 'ALL MARKERS OK'
