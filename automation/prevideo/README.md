# 식전 영상 뼈대 (Remotion) [PV_REMOTION_1101]

마이페이지 «식전 영상»에 두 분이 올린 사진 · 문구로 영상을 **자동으로** 만든다.
첫 스타일은 «에디토리얼»(크림 종이 · 매거진 펼침면 · 오늘 장은 흑백 영화 화면 · 영화 크레딧).

## 사장님 결정 (2026-11-01)
- **뼈대는 계속 무료로 쓸 수 있어야 한다** — 영상 한 편마다 돈이 드는 것을 뼈대에 넣지 않는다.
  - Remotion: 개인 · 직원 3명 이하 회사는 상업용도 무료(4.0.539 의 `node_modules/remotion/LICENSE.md`).
    5.0 에서 라이선스가 바뀐다고 적혀 있어 **버전을 고정했다**(`package.json` 에 `^` 없음). 올리기 전에 라이선스를 다시 읽는다.
  - 글꼴: Cormorant Garamond · Noto Serif KR — 둘 다 OFL(무료).
  - 렌더: 우리 컴퓨터에서 돌린다(클라우드 렌더 · Lambda 는 쓰지 않는다 — 쓸 때마다 돈이 든다).
  - 뼈대 밖(없어도 영상이 완성된다): 곡 라이선스 · AI 장면(선택 · 동의한 분만).
- **웃기게 만들지 않는다** — 개그 · 패러디 · 재미 위주 연출은 쓰지 않는다. 절제된 무드.
- AI 는 실제 사진을 잇는 두 곳만(선택): 처음 장 «어린 시절 → 지금 얼굴» · 오늘 장 «웨딩 사진 2~3장 살짝 움직이기». 없던 장면은 만들지 않는다.

## 길이
마이페이지 약속과 같은 식 — 사진 5장 70초 · 20장 117초 · 그 사이는 비례(`src/plan.ts` `totalSecs` = `mypage.html` `_pvcSecs`).
둘을 함께 고친다.

## 흐름
암전 1.5초 → 글자 표지(처음 만난 날 → 예식 날로 숫자 넘김) → 사진 표지 → CHAPTER 01 처음 → CHAPTER 02 우리의 날들
→ 오늘(첫 컷 위에 CHAPTER 03 · Our wedding day · 날짜) → 크레딧 → «Our story begins now».
- 사진은 자르지 않는다(세로 사진 잘림 = 식전 영상 불만 1위). 세로는 두 장씩 모아 보고 한 장씩 크게, 가로는 한 장.
- 장면 경계는 곡 박자(BPM)에 붙인다.

## 쓰는 법
```bash
cd automation/prevideo
npm ci
npm run sample      # 견본 사진(홈페이지 사진)을 public/photos 로 복사
npm run plan        # 타임라인만 찍어 보기
npm run studio      # 브라우저에서 보며 고치기
npm run render      # out/editorial.mp4 (1920×1080)
```
- 고객 영상: `npx remotion render src/index.ts Editorial out/<코드>.mp4 --props=props.json`
  (`props.json` 모양은 `src/plan.ts` 의 `Props` · 견본은 `src/sample.ts`).
- 이 클라우드처럼 브라우저가 따로 깔린 곳은 `REMOTION_BROWSER=<경로>` 또는 `--browser-executable=<경로>`.
- `sheet.py <mp4> <출력 앞부분> 3` — 3초마다 한 장씩 묶은 검토용 그림.

## 남은 일
- 마이페이지에 올린 사진 · 문구 → `props.json` 으로 잇기(GAS 쪽 저장분에서).
- 곡 3개 라이선스 · 박자 맞추기 · 렌더할 컴퓨터 정하기.
- 다른 스타일(동화 · 시네마틱 · 레트로)과 AI 두 곳(선택)은 이 뼈대 위에 더한다.
