// 타입캐스트 「대본 가져오기」 붙여넣기 파일 생성기
//   입력: docs/plans/식순연구/더빙_녹음_대본_최종.txt (build-dubbing-script.mjs가 만든 것)
//   출력: docs/plans/식순연구/타입캐스트/*.txt   ← 화면에 그대로 붙여넣는 파일
//         docs/plans/식순연구/타입캐스트/manifest.json ← 조립기(assemble-narration.mjs)가 읽는 매핑
//         docs/plans/식순연구/타입캐스트/README.md     ← 절차서
//
// ★왜 한 문장 = 한 줄인가
//   타입캐스트 다운로드는 `전체 통합 / 문장별 분리` 선택이다. '문장별'이 문장 기준인지 줄 기준인지
//   확인할 방법이 이 환경에 없다. 한 문장을 한 줄로 두면 **둘 중 무엇이든 결과가 같다.**
//   쪼개진 문장은 조립기가 manifest대로 다시 붙이므로 손해가 없고, 오히려 문장 사이 여백을
//   대본 규격(1.5~2.5초 · 예외 다수)대로 정확히 넣을 수 있어 편집 단계가 통째로 자동화된다.
//
// ★왜 화자가 캐릭터 이름이 아니라 역할명인가
//   나레이션 보이스가 아직 A/B 대기다(협의안 §5). 역할명으로 두면 타입캐스트 3단계
//   「보이스 배정」에서 사람이 고르면 되고, A/B를 파트 단위로 바꿔 끼울 수 있다.
//   확정되면 --voice 진행=대길,안내=김경화 앵커,편지=한준 로 캐릭터 이름을 박아 자동 배정시킨다.
//   ★2026-08-01 리서치로 8자리 후보 확정(더빙_타입캐스트_보이스_추천.md v2 §2-B). 청취만 남았다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
// ★[VOW_CHORUS] 합성 클립(mix) 판정은 여기 다시 적지 않고 재생 표에서 읽는다.
//   두 군데 적으면 클립이 늘거나 줄어드는 날 한쪽만 고쳐진다.
const ST_ = createRequire(import.meta.url)(path.join(root, 'assets/ritual-story.js'));
const IS_MIX = (no, file) => !!(ST_.CAST[`${no}_${file}`] || {}).mix;
const SRC = path.join(root, 'docs/plans/식순연구/더빙_녹음_대본_최종.txt');
const CAST = path.join(root, 'docs/plans/식순연구/배역_예시_대사.txt');
const OUT = path.join(root, 'docs/plans/식순연구/타입캐스트');

// ── --voice 진행=대길,안내=김경화 앵커,편지=한준
//    보이스가 확정되면 화자명을 캐릭터 이름으로 바꿔 타입캐스트가 자동 배정하게 만든다.
//    ★공백이 든 이름(김경화 앵커)에 백슬래시를 붙이지 않는다 — 아래에서 slice(a+1).join(' ')로
//      다시 이어 붙이므로 셸이 나눈 토큰이 저절로 복원된다. 이스케이프하면 이름에 \가 박힌다.
// ★★VOICE_FIXED — 2026-08-02, 형님이 귀로 여덟 자리를 골랐다. 그 결과를 코드에 박는다.
//   왜 CLI 인자가 아니라 상수인가: --voice 로 매번 손으로 치면 오타가 나고, 오타 난 역할명은
//   조용히 무시돼 역할명 그대로 나간다(아래 가드가 이제 그걸 잡는다). 확정된 배정은 재현돼야 한다.
//   --voice 는 오버라이드로 남긴다 — 한 자리만 잠깐 바꿔 들어 볼 때 쓴다.
//
//   ★2026-08-02 진행까지 확정됐다 — 여덟 자리 전부 찼다. 남준 · 우성 결승에서 형님이 우성을 골랐다
//     (보이스찾기/3_진행_결승.txt · 블록 30줄로 지구력, 교대 6줄로 성혼 선언을 붙여 비교).
//     38/51클립을 이 목소리가 끌고 간다. 바꾸려면 여기 한 줄이지만, 바꾸는 순간 예식 전체가 바뀐다.
//     (2026-08-03 베일 폐지로 41/54 → 38/51 · 진행 3클립이 빠졌다)
//   ★'잔희' 는 형님이 적어 준 표기 그대로다. 2026 설 무료 30종에 '진희' 가 있어 오타일 수 있다.
//     타입캐스트에서 자동 배정이 안 되면 이 줄을 '진희' 로 고쳐 다시 돌리면 된다.
const DEFAULT_VOICE = {
  진행: '우성',
  안내: '잔희',
  편지: '김호인',
  신랑: '이준',
  신부: '서진',
  아버님: '권일',
  어머님: '주하',
  하객대표: '영목',
};

const VOICE = { ...DEFAULT_VOICE };
{
  const a = process.argv.indexOf('--voice');
  if (a >= 0 && process.argv[a + 1]) {
    for (const kv of process.argv.slice(a + 1).join(' ').split(',')) {
      const [k, v] = kv.split('=').map((s) => s && s.trim());
      if (k && v) VOICE[k] = v;
    }
  }
}
const named = (role) => VOICE[role] || role;

// ── 역할 배정 (협의안 §5 「역할 분담 권장안」 · 총 3인을 넘기지 않는다)
//    진행 38 · 안내 12 · 편지 1 = 51   [VEIL_RETIRED 2026-08-03] 베일 3클립 제거분
const ROLE_OF = (id) => {
  if (/^G1-/.test(id)) return '안내';          // 식전 안내방송
  if (/^N\d/.test(id)) return '안내';          // 폐식 후 브릿지
  if (/^G10$/.test(id)) return '편지';         // 혼주 편지 3분
  return '진행';                                // 나머지 전부 — 한 사람이 예식을 끌고 간다
};

// ── 파트 분할 (한 파트 = 한 프로젝트)
//    화자가 거의 안 섞이게 나눴다. 보이스 배정이 단순해지고, A/B를 파트째로 바꿔 끼울 수 있다.
//    편집기 렉 보고(협의안 §3-②)가 있어 한 파트를 60줄 안쪽으로 유지한다.
const PARTS = [
  { f: '1_안내.txt',   t: '식전 안내 + 폐식 브릿지', role: '안내', has: (id) => /^G1-|^N\d/.test(id) },
  { f: '2_진행_전반.txt', t: '입장 + 고정 진행 나레이션', role: '진행', has: (id) => /^G2-|^G3-/.test(id) },
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  //   G6(베일)은 사라졌지만 has 패턴에는 남겨 둔다 — 남은 그룹 번호를 당기지 않았으므로
  //   빈 접두사를 지우는 것과 같고, 나중에 G6이 다른 용도로 생기면 이 파트가 맞는 자리다.
  { f: '3_진행_후반.txt', t: '편지 도입 · 선언 · 링워밍 · 헌정 · 축배', role: '진행',
    has: (id) => /^G4-|^G5-|^W2-|^G6-|^G7-|^G8-|^G9-/.test(id) },
  { f: '4_혼주편지.txt', t: '어른께 드리는 안내 편지 (3분 통낭독)', role: '편지', has: (id) => id === 'G10' },
  // ★배역은 원천도 출력 폴더도 다르다. 당일 콘솔은 이 클립을 재생하지 않는다(미리듣기 전용).
  { f: '5_배역.txt', t: '배역 예시 대사 (미리듣기 전용 · 가상 인물)', role: '배역',
    src: CAST, dir: 'assets/audio/cast', has: () => true },
];

// ── 배역 보류분: 하객 군중 2클립은 붙여넣기 파일에서 뺀다 (기획서 §6 결정 7 대기)
//    AI 단일 보이스로 스물다섯 명의 응답을 만들 수 없다. 한 명이 "네, 그러겠습니다"를 말하면
//    군중이 아니라 한 사람의 대답으로 들리고 그 순간 예식이 우스워진다.
//    문안은 원천 파일에 남겨 둔다 — 결정이 어느 쪽으로 나든 필요하다.
const CAST_HOLD = (id) => /^R-declare-/.test(id);

// ── 여백 규칙 (초) · 대본 「공통 녹음 규격」과 각 그룹 note에서 그대로 옮겼다
// ★★[GAP_SHRUNK 2026-08-03] 여백 축소 — 사용자 실청: "문장이 바뀌는 곳에서 턴이 너무 길어"
//   원인이 둘이었다.
//   ① 설계값 자체가 길었다 — 문장 사이 1.8초는 한 생각 안의 두 문장을 끊어 놓는다.
//   ② 타입캐스트가 클립마다 앞뒤로 0.2~0.4초씩 무음을 이미 넣어 주는데, 그 위에 우리 여백을
//      그대로 얹고 있었다. 혼주 편지 실측 — 설계 2.6초 자리가 3.2~3.4초, 3.3초 자리가 3.8~4.1초.
//      무음이 전체 길이의 30%였다.
//   ②는 조립기가 원본 가장자리 무음을 깎아서 없앴다(assemble-narration.mjs · TRIM_VENDOR_EDGE).
//   **그래서 이제 여기 적은 숫자가 곧 귀에 들리는 초다.** 그 전제 위에서 숫자도 함께 줄였다.
//
// ★★[GAP_HALF 2026-08-03 · 2차 축소] 사용자 실청 재판정: "아직도 턴이 길어 절반으로 줄여"
//   1차 축소(1.8→0.9)로도 길었다. 아래 숫자를 전부 반으로 접었다.
//   ★그런데 여기 숫자만 접으면 혼주 편지는 한 초도 안 줄어든다 — 편지는 문단 10개로 받아서
//     문장 사이 여백을 우리가 넣지 않기 때문이다. 편지에서 들리는 문장 사이 쉼은 전부
//     타입캐스트가 넣어 둔 자연 쉼이고, 그건 이 표에 없는 무음이라 우리가 줄일 대상 밖에 있었다.
//     그래서 조립기에 **클립 안쪽 쉼의 상한**(SENT_CAP)을 함께 신설했고, 그 상한은 아래 `sent`를
//     그대로 읽어 쓴다. 규칙을 두 군데 적으면 한쪽만 고치는 날이 온다.
//   ★축배 뒤 4.5초·폐식 뒤 2.5초는 접지 않았다 — 그건 말 사이 여백이 아니라 현장에서 잔을 들고
//     내리는 **동작 대기 시간**이다. clipGap()에 이유를 적어 뒀다.
//   되살리지 말 것 — 늘려야 한다면 실청 근거를 적고 이 주석을 함께 갱신한다.
const GAP = {
  head: 0.18,     // 클립 앞 무음   (원 0.4 → 1차 0.35 → 2차 0.18)
  sent: 0.45,     // 문장 사이 기본 (원 1.8 → 1차 0.9  → 2차 0.45) ★조립기 SENT_CAP이 이 값을 상한으로 읽는다
  tail: 0.45,     // 클립 뒤 무음   (원 1.0 → 1차 0.9  → 2차 0.45)
};
// ★자잘한 예외 여백도 한 곳에만 적는다 — 아래 본문과 맨 끝 안내 표가 같은 값을 읽는다.
//   두 군데 적어 두면 표만 낡은 숫자를 지키는 날이 온다.
const FINE = {
  decl:  [0.25, 0.40],   // 선언문 앞/뒤          (1차 0.5 / 0.8)
  demo:  [0.25, 0.25],   // 답 시연 앞/뒤         (1차 0.5 / 0.5)
  head4: [0.55, 0.55],   // 편지 소제목 앞/뒤     (원 1.5 → 1차 1.1 → 2차 0.55)
  para:  0.25,           // 편지 문단 들머리      (1차 0.5)
};
// 선언문 (★DECL_PAUSE_POS · 2026-07-26 실측 정정: '마지막 문장'이 아니라 이 문장 자체)
const DECL_LINE = '신랑 신부, 이제 두 사람은 부부입니다.';
// W2-b 안에서 나레이터가 답을 시연하는 구간
const DEMO_LINE = '네, 그러겠습니다.';

// ★파일명이 아니라 '마지막 문장'으로 판정한다.
//   `toast-toast`만 보고 4.5초를 주면 축배로 끝나는 `toast-both`가 그대로 새어 나간다.
//   대본 note가 말한 건 "축배 뒤"이지 "축배 클립 뒤"가 아니다 — 환호가 터진 자리의 낙차를 받는 무음이다.
//   반대로 `toast-cake`는 같은 블록이지만 환호가 없어 기본값이 맞다.
//   ★[GAP_HALF 2026-08-03] 이 둘은 2차 축소에서 **접지 않았다.** GAP은 말과 말 사이 여백이지만
//     이 둘은 동작 대기 시간이다 — 축배 4.5초는 스물다섯 명이 잔을 들어 올렸다가 내리는 시간이고,
//     폐식 2.5초는 사람들이 자리에서 일어서기 시작하는 시간이다. 여기를 반으로 접으면 다음 소리가
//     아직 잔을 든 손 위로 겹쳐 든다. 여백을 줄이는 일과 진행을 밀어붙이는 일은 다르다.
const clipGap = (id, file, lastSent) => {
  if (/위하여!$/.test(lastSent)) return { tail: 4.5 };     // 축배 뒤 온도 낙차 4~5초 (동작 대기)
  if (file === 'narr-close') return { tail: 2.5 };         // 예식의 마지막 소리 — 여운을 길게
  return {};
};

// ── 문장 분할
//   한국어 종결부호 뒤에서만 자른다. 숫자 소수점·영문 약어는 이 대본에 없다(숫자는 전부 한글로 적혀 있다).
const splitSents = (para) =>
  para.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

// ── 파싱: `[NN] ID · 라벨  →  NN_file.mp3` 헤더 + 다음 빈 줄까지가 본문(문단 여러 줄 가능)
//    배역 원천도 형식이 같다 — 파서를 한 벌만 쓴다.
const parse = (file) => {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\[(\d{2})\]\s+(\S+)\s+·\s+(.+?)\s+→\s+\d{2}_(.+)\.mp3\s*$/);
    if (!m) continue;
    const paras = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) paras.push(lines[j].trim());
    out.push({ no: m[1], id: m[2], label: m[3], file: m[4], paras });
  }
  return out;
};

const clips = parse(SRC);
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것. (54 → 51)
if (clips.length !== 51) { console.error(`✗ 클립 수 불일치: ${clips.length} (기대 51)`); process.exit(1); }

const castAll = fs.existsSync(CAST) ? parse(CAST) : [];
// [TEXT_AUDIO 2026-08-04] 입장이 1클립 → 6클립(A~F)으로 벌어져 17 → 22.
//   화면이 느낌 6종을 보여 주는데 소리가 하나뿐이면, 고르는 일이 아무 소리도 바꾸지 못한다.
// [VOW_CHORUS 2026-08-04] 서약 마지막 한 문장 합창 3클립(재료 2 + 합성 1)이 붙어 22 → 25.
if (castAll.length && castAll.length !== 25) { console.error(`✗ 배역 클립 수 불일치: ${castAll.length} (기대 25)`); process.exit(1); }
// 배역은 라벨 첫 칸이 화자다 — `신랑 · 식전 안내 · 도착` → 화자 `신랑`
for (const c of castAll) {
  const seg = c.label.split('·').map((s) => s.trim());
  c.speaker = seg[0];
  c.label = seg.slice(1).join(' · ') || seg[0];
}
const held = castAll.filter((c) => CAST_HOLD(c.id));
const cast = castAll.filter((c) => !CAST_HOLD(c.id));

// ── 조립
fs.mkdirSync(OUT, { recursive: true });
// ★voice 를 manifest 에 실어 보낸다 — 확정 배정의 단일 진실 원천을 하나로 둔다.
//   build-voice-screen.mjs 가 이걸 읽어 "어느 자리가 남았나"를 스스로 안다.
//   두 파일에 이름을 각각 적어 두면 한쪽만 고치는 날이 오고, 그날 조용히 어긋난다.
const manifest = { version: 2, source: '더빙_녹음_대본_최종.txt', cast: '배역_예시_대사.txt',
                   voice: VOICE, gap: GAP, parts: [], clips: [] };
let totalSent = 0;

for (const P of PARTS) {
  const mine = (P.src === CAST ? cast : clips).filter((c) => P.has(c.id));
  if (!mine.length) continue;
  const body = [];
  let sentInPart = 0;

  for (const c of mine) {
    const role = c.speaker || ROLE_OF(c.id);
    // ★[ENTRY_ALT 2026-08-04] 화자가 '신랑|신부'처럼 겹쳐 있으면 **줄마다** 누가 읽는지 적혀 있어야 한다.
    //   입장 인사는 두 분이 한 문장씩 번갈아 읽는다(ritual-data.js 의 ENTRY_ALT 가 규칙 원천).
    //   ★자기 검증형으로 만든 이유 — 머리글만 '신랑|신부'로 바꾸고 줄 앞을 안 적으면,
    //     붙여넣기 파일에 `신랑|신부: …` 라는 **없는 캐릭터**가 화자로 나간다. 타입캐스트는 그걸
    //     기본 화자에 몰아 배정하고, 다운로드하는 순간 크레딧이 차감되며 취소가 안 된다.
    //     그러니 개수가 아니라 **모든 줄**을 보고, 목록 밖 이름도 거부한다.
    //   ★합창 클립(mix)은 예외다 — 둘이 **동시에** 말하는 자리라 문장별 화자가 없다.
    //     같은 문장을 두 목소리로 따로 받아 겹치는 것이라 재료 쪽([24][25])에 화자가 이미 적혀 있다.
    const ALT = (!IS_MIX(c.no, c.file) && role.includes('|')) ? role.split('|') : null;
    const sents = [];
    c.paras.forEach((para, pi) => {
      let who = null, text = para;
      if (ALT) {
        const m = para.match(/^\s*([^:]+?)\s*:\s*(.+)$/);
        if (!m || !ALT.includes(m[1])) {
          console.error(`\n✗ [${c.no}] ${c.id} — 화자가 '${role}'인데 줄 앞에 누가 읽는지 없거나 목록 밖입니다. [ENTRY_ALT]`);
          console.error(`   문제 줄: ${para}`);
          console.error(`   ${ALT.map((r) => `${r}: …`).join(' · ')} 처럼 줄마다 화자를 적으세요.\n`);
          process.exit(1);
        }
        who = m[1]; text = m[2];
      }
      splitSents(text).forEach((s, si) => {
        sents.push({ text: s, para: pi, first: si === 0, who });
      });
    });
    if (ALT) {
      // 머리글에 이름만 올려 두고 한 줄도 안 읽는 사람이 있으면, 화면은 두 분이라 말하는데 소리는 한 사람이다.
      const idle = ALT.filter((r) => !sents.some((s) => s.who === r));
      if (idle.length) {
        console.error(`\n✗ [${c.no}] ${c.id} — 머리글엔 있는데 한 줄도 안 읽는 화자: ${idle.join(' · ')} [ENTRY_ALT]\n`);
        process.exit(1);
      }
    }

    // 이 클립의 문장별 뒤 여백을 계산해 둔다 (조립기가 그대로 쓴다)
    const over = clipGap(c.id, c.file, sents.length ? sents[sents.length - 1].text : '');
    const mix = IS_MIX(c.no, c.file);
    const rec = { no: c.no, id: c.id, label: c.label, file: c.file, role,
                  part: P.f, dir: P.dir || 'assets/audio/narration',
                  head: GAP.head, tail: over.tail ?? GAP.tail, sents: [] };
    if (mix) rec.mix = ST_.CAST[`${c.no}_${c.file}`].mix;   // 재료 목록 — 조립기가 건너뛰고 build-chorus 가 읽는다

    sents.forEach((s, k) => {
      const last = k === sents.length - 1;
      let after = last ? 0 : GAP.sent;   // 마지막 문장 뒤는 클립 tail이 맡는다
      let before = 0;

      if (s.text === DECL_LINE) { before = FINE.decl[0]; if (!last) after = FINE.decl[1]; }
      if (s.text === DEMO_LINE) { before = FINE.demo[0]; if (!last) after = FINE.demo[1]; }
      // 혼주 편지 소제목(하나~넷) 앞뒤 — 없으면 3분짜리 편지의 구조가 귀에 안 들린다
      // (원 1.5 → 1차 1.1 → 2차 0.55 · 가장자리 무음을 깎아 냈으므로 이 숫자가 곧 들리는 초다)
      if (c.id === 'G10' && /^(하나|둘|셋|넷),\s/.test(s.text)) { before = FINE.head4[0]; if (!last) after = FINE.head4[1]; }
      // 문단 경계는 한 박 더 쉰다
      // 마지막 줄(서명)은 새 문단을 여는 게 아니라 앞줄을 닫는 코다다 — 문단 들머리 여백을 주지 않는다
      else if (c.id === 'G10' && s.first && k > 0 && !last) { before = Math.max(before, FINE.para); }

      // [ENTRY_ALT] 문장별 화자는 겹친 역할일 때만 적는다 — 한 사람짜리 클립에 같은 값을 되풀이하지 않는다
      rec.sents.push(s.who ? { i: k, text: s.text, role: s.who, before, after } : { i: k, text: s.text, before, after });
      // ★[VOW_CHORUS] 합성 클립은 manifest 에는 남기고 붙여넣기 본문에서만 뺀다.
      //   타입캐스트에서 받는 파일이 아니라 build-chorus.mjs 가 재료를 겹쳐 만든다.
      //   ★보류분(CAST_HOLD)처럼 통째로 빼면 안 된다 — manifest 에서 사라지면 재생 표가
      //     '대본에 없는 음원'을 가리키게 되고, 커버리지 검사가 그 자리에서 멎는다.
      if (mix) return;
      body.push(`${named(s.who || role)}: ${s.text}`);   // [ENTRY_ALT] 줄마다 다른 사람일 수 있다
      sentInPart++; totalSent++;
    });

    manifest.clips.push(rec);
  }

  // ★[VOW_CHORUS] 합성 클립의 화자('신랑|신부')는 붙여넣기에 없는 사람이다. 화자 수에서 뺀다.
  //   안 빼면 머리글이 "화자 6인"이라 말하는데 파일에는 5인만 있고, 보이스 배정 화면과 어긋난다.
  // [ENTRY_ALT] '신랑|신부'는 두 자리다 — 안 쪼개면 없는 화자 하나가 목록에 서고 진짜 두 사람이 사라진다
  const roleList = [...new Set(mine.filter((c) => !IS_MIX(c.no, c.file)).flatMap((c) => String(c.speaker || ROLE_OF(c.id)).split('|')))];
  const spk = roleList.map(named);
  const mapped = roleList.filter((r) => VOICE[r]);
  const unmapped = roleList.filter((r) => !VOICE[r]);

  // ★★PASTE_NO_COMMENT — 붙여넣기 파일에는 대사 줄만 넣는다. 안내 문구는 README.md로 간다.
  //   2026-08-01 실사고(2차): 머리 주석을 '#'로 달고 "이 줄은 화자로 잡히지 않습니다"라고 적어 뒀는데,
  //   사용자 화면에서 그 8줄이 통째로 하나의 블록이 되어 기본 화자(박창수)에 배정됐다.
  //   타입캐스트는 '#'를 주석으로 취급하지 않는다 — 콜론이 없으면 '유령 화자'가 안 될 뿐,
  //   텍스트는 그대로 남아 낭독 대상이 된다(에디터 재생 길이에도 포함된다).
  //   그 상태로 다운로드하면 크레딧이 즉시 차감되고 취소가 안 되므로 손실이 실제다.
  //   ★교훈은 COMMENT_NO_COLON과 같다 — 기계 입력 채널에 사람용 문서를 섞지 않는다.
  //   문구를 고치는 게 아니라 채널을 분리해서 끝낸다. 주석을 되살리지 말 것.
  const note = [
    `타입캐스트 「대본 가져오기 → 텍스트 붙여넣기」에 파일 내용을 통째로 붙여넣으세요.`,
    `★이 파일에는 안내 주석이 한 줄도 없습니다(PASTE_NO_COMMENT). 붙여넣은 그대로가 낭독 대상입니다.`,
    // ★파트의 role 하나로 판정하지 않는다 — 배역 파트는 P.role이 '배역'이라 VOICE에 영원히 없고,
    //   그러면 5명이 전부 자동 배정되는 상황에서도 "손으로 고르세요"라고 거짓 안내를 하게 된다.
    //   화자 하나하나를 보고, 아직 역할명으로 남은 것만 이름을 대 준다.
    unmapped.length === 0
      ? `화자 ${spk.length}인 — ${spk.join(' · ')}. 전부 타입캐스트 캐릭터 이름이라 자동 배정됩니다.`
      : mapped.length === 0
        ? `화자 ${spk.length}인 — ${spk.join(' · ')}. 아직 역할명이라 3단계 「보이스 배정」에서 고르면 됩니다.`
        : `화자 ${spk.length}인 — ${spk.join(' · ')}. 이 중 ${unmapped.join(' · ')} 만 아직 역할명이라 ` +
          `3단계 「보이스 배정」에서 손으로 골라야 하고, 나머지는 자동 배정됩니다.`,
    `한 문장 = 한 줄입니다. 다운로드는 반드시 '문장별 분리'로 받으세요 — 순서가 곧 파일명이 되고, ` +
      `node scripts/assemble-narration.mjs 가 그 순서로 클립을 다시 붙입니다.`,
  ];
  if (P.src === CAST) {
    note.push(
      `★이 파트는 미리듣기 전용입니다. 당일 콘솔은 재생하지 않습니다.`,
      `대사는 전부 가상 인물의 것이고, 낭독톤으로 수록합니다 — 울먹임·떨림·감정 고조 금지.`,
      `스타일 태그를 쓴다면 소괄호입니다. (담담하게)·(차분하게) 선에서 멈추세요 — 베타라 안 먹을 수 있습니다.`,
      `출력 폴더가 다릅니다 — assemble-narration.mjs가 assets/audio/cast/ 로 떨굽니다.`,
    );
  }

  // ★COMMENT_NO_COLON — 위 안내 문구는 이제 붙여넣기 파일에 들어가지 않지만 가드는 남긴다.
  //   타입캐스트 화자 감지는 '#'를 주석으로 취급하지 않고 콜론 앞뒤만 본다.
  //   2026-08-01 실사고(1차): `'화자: 대사' 형식이 아니라 화자로 잡히지 않습니다`라고 안내하던
  //   그 문장이 문장 안에 콜론을 품고 있어서, 안내문이 정확히 자기가 부정하던 일을 당했다.
  //   사용자 화면에 유령 화자 1개(대사 1개 · 줄 3)가 떴다. 5번 배역 파트엔 지뢰가 둘이었다.
  //   누군가 note를 다시 파일로 흘려보내는 날을 대비해 검사는 그대로 둔다. 지우지 말 것.
  const colonInNote = note.filter((l) => /[:：]/.test(l));
  if (colonInNote.length) {
    console.error(`\n✗ ${P.f} 안내 문구에 콜론이 있습니다 — 파일로 새면 화자로 오검출됩니다.`);
    for (const l of colonInNote) console.error(`   ${l}`);
    console.error('  안내 문구에서 콜론을 빼세요(연결은 · 또는 —). 본문 대사 줄의 콜론은 정상입니다.\n');
    process.exit(1);
  }

  // ★PASTE_NO_COMMENT 자가 검사 — 대사 줄이 아닌 것이 하나라도 섞이면 즉시 실패한다.
  const stray = body.filter((l) => l.trim() && !/^[^:：]{1,20}[:：]\s*\S/.test(l));
  if (stray.length) {
    console.error(`\n✗ ${P.f} 에 대사 줄이 아닌 줄이 ${stray.length}개 있습니다 — 타입캐스트가 이걸 낭독합니다.`);
    for (const l of stray.slice(0, 5)) console.error(`   ${l}`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(OUT, P.f), body.join('\n') + '\n', 'utf8');
  const chars = body.join('\n').length;
  manifest.parts.push({ file: P.f, title: P.t, role: P.role, speakers: spk, note,
                        dir: P.dir || 'assets/audio/narration',
                        clips: mine.filter((c) => !IS_MIX(c.no, c.file)).length, sents: sentInPart, chars });
  const warn = chars > 20000 ? '  ★20,000자 초과 — 더 쪼갤 것' : '';
  const pasted = mine.filter((c) => !IS_MIX(c.no, c.file)).length;
  console.log(`  ${P.f.padEnd(18)} 클립 ${String(pasted).padStart(2)} · 문장 ${String(sentInPart).padStart(3)} · ${String(chars).padStart(6)}자${warn}`);
}

// ★★VOICE_ROLE_GUARD — 박아 둔 배정이 실제 역할에 걸렸는지 검사한다.
//   오타 난 키('하객' · '어머니' · '진행자')는 조용히 무시된다. 파일은 정상으로 보이고
//   그 자리만 역할명으로 남는다 — 붙여넣고 나서야 "얘만 왜 배정이 안 되지" 하고 알게 된다.
//   2026-08-01 교훈과 같은 계열이다. 개수를 세는 검사는 엉뚱한 키가 들어온 것을 못 잡는다.
{
  // ★[VOW_CHORUS] 합성 클립은 타입캐스트에서 목소리를 고를 자리가 아니다(우리가 겹쳐 만든다).
  //   빼지 않으면 "보이스 배정 8/9 — 남은 자리 신랑|신부"가 떠서, 다 정해 놓고도 덜 된 것처럼 보인다.
  const realRoles = new Set(manifest.clips.filter((c) => !c.mix).flatMap((c) => String(c.role).split('|')));   // [ENTRY_ALT]
  const ghost = Object.keys(VOICE).filter((r) => !realRoles.has(r));
  if (ghost.length) {
    console.error(`\n✗ VOICE 에 실제로 없는 역할명이 ${ghost.length}개 있습니다 — 이 배정은 무시됩니다.`);
    for (const g of ghost) console.error(`   '${g}' → '${VOICE[g]}'`);
    console.error(`  실제 역할은 ${[...realRoles].join(' · ')} 입니다.\n`);
    process.exit(1);
  }

  // ★중복 배정 검사 — 8자리 = 8개 다른 목소리. 특히 진행(41클립)과 편지·하객대표가 겹치면
  //   편지가 진행의 연장으로 들리고, 축배는 낭독처럼 들린다. 낙차가 전부인 자리들이다.
  const byVoice = {};
  for (const [role, v] of Object.entries(VOICE)) (byVoice[v] ||= []).push(role);
  const dup = Object.entries(byVoice).filter(([, rs]) => rs.length > 1);
  if (dup.length) {
    console.error(`\n✗ 한 목소리가 여러 자리에 배정돼 있습니다 — 같은 사람이 계속 말하는 예식이 됩니다.`);
    for (const [v, rs] of dup) console.error(`   '${v}' → ${rs.join(' · ')}`);
    process.exit(1);
  }

  const left = [...realRoles].filter((r) => !VOICE[r]);
  console.log(left.length
    ? `  보이스 배정 ${realRoles.size - left.length}/${realRoles.size} — 남은 자리 ${left.join(' · ')}`
    : `  보이스 배정 ${realRoles.size}/${realRoles.size} — 전 자리 확정`);
}

// ── ★★VOICE_PROBE (2026-08-02) — 붙여넣기 전에 여덟 자리가 다 잡히는지 10초 만에 확인한다
//   왜 필요한가: 캐릭터 이름이 한 글자만 달라도 타입캐스트는 그 화자를 자동 배정하지 못한다.
//   지금 구조에서 그 사실은 **파트를 다 붙여넣고 배정 화면까지 가서야** 드러난다.
//   '잔희'가 '진희'의 오타라면 그때는 파일을 다시 만들고 다섯 파트를 다시 붙여넣어야 한다.
//   이 파일은 여덟 줄이다. 붙여넣고 화자 목록만 보면 끝난다. 다운로드를 안 하니 크레딧은 0이다.
//   덤이 하나 있다 — 여덟 목소리가 한 화면에 서므로 미리듣기(무료)로 캐스팅을 통으로 다시 들어볼 수 있다.
//   ★이 파일은 파트가 아니다. manifest.parts에 넣지 않는다 — 조립기가 파트로 착각하면 안 된다.
const sylOf = (t) => (t.match(/[가-힣]/g) || []).length;
const probe = [];
for (const [role, name] of Object.entries(VOICE)) {
  // [ENTRY_ALT] 클립이 아니라 **문장**으로 고른다 — 한 클립 안에서 화자가 갈리는 자리가 있다
  const pool = manifest.clips.flatMap((c) => c.sents.filter((x) => (x.role || c.role) === role).map((x) => x.text));
  if (!pool.length) continue;                       // VOICE_ROLE_GUARD가 위에서 이미 막는다
  // 대표 문장 — 너무 짧으면 목소리가 안 들리고 너무 길면 확인이 일이 된다. 길이 60퍼센타일로 뽑는다.
  const sorted = pool.slice().sort((x, y) => sylOf(x) - sylOf(y));
  probe.push({ role, name, text: sorted[Math.floor((sorted.length - 1) * 0.6)] });
}
{
  const want = Object.keys(VOICE).length;
  if (probe.length !== want) {
    console.error(`\n✗ 보이스 확인 파일이 ${probe.length}줄입니다 — ${want}자리를 다 확인할 수 없습니다.`);
    process.exit(1);
  }
  const names = probe.map((x) => x.name);
  if (new Set(names).size !== names.length) {
    console.error(`\n✗ 보이스 확인 파일에 같은 이름이 두 번 나옵니다 — 한 화자로 합쳐져 자리 확인이 안 됩니다.`);
    process.exit(1);
  }
  // ★COMMENT_NO_COLON과 같은 가드 — 대사 줄이 아닌 것이 섞이면 붙여넣는 순간 유령 화자가 생긴다.
  const lines = probe.map((x) => `${x.name}: ${x.text}`);
  const stray = lines.filter((l) => !/^[^:：]{1,20}[:：]\s*\S/.test(l));
  if (stray.length) {
    console.error(`\n✗ 보이스 확인 파일에 대사 줄이 아닌 줄이 있습니다.`);
    for (const l of stray) console.error(`   ${l}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, '0_보이스확인.txt'), lines.join('\n') + '\n', 'utf8');
  manifest.probe = { file: '0_보이스확인.txt', roles: probe.map((x) => ({ role: x.role, name: x.name })) };
  console.log(`  0_보이스확인.txt    ${probe.length}줄 — 붙여넣어 여덟 자리가 다 잡히는지만 보세요(다운로드 금지 · 크레딧 0)`);
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// ── 절차서
const R = [];
R.push('# 타입캐스트 붙여넣기 · 절차서', '');
R.push('> **이 폴더는 자동 생성됩니다.** 손으로 고치지 말고 `node scripts/build-typecast-import.mjs`로 다시 뽑으세요.');
R.push('> 원본은 `더빙_녹음_대본_최종.txt`이고, 그 원본은 `assets/ritual-data.js`입니다. 문안을 고치려면 맨 위부터 고치세요.', '');
R.push(`## 무엇이 들어 있나 — ${manifest.clips.length}클립 · ${totalSent}문장 · ${manifest.parts.length}파트`, '');
R.push('| 파일 | 내용 | 화자 | 클립 | 문장 | 글자 | 출력 폴더 |');
R.push('|---|---|---|---|---|---|---|');
for (const p of manifest.parts) {
  const s = p.speakers.length === 1 ? p.speakers[0] : `${p.speakers.length}인 · ${p.speakers.join('·')}`;
  R.push(`| \`${p.file}\` | ${p.title} | ${s} | ${p.clips} | ${p.sents} | ${p.chars.toLocaleString()} | \`${p.dir}/\` |`);
}
R.push('', '타입캐스트 입력 한도는 20,000자입니다. 파트를 나눈 이유는 한도보다 **편집기 렉**(협의안 §3-②)과 **보이스 배정 단순화**입니다.', '');
R.push(`**출력 폴더가 두 갈래인 것에 주의하세요.** 1~4번은 나레이션(\`assets/audio/narration/\`)이고 당일 콘솔이 실제로 재생합니다.`);
R.push(`5번 배역은 미리듣기 전용(\`assets/audio/cast/\`)이라 **당일 콘솔이 재생하지 않습니다.** 조립기가 알아서 갈라 떨굽니다.`, '');
R.push('## 순서', '');
R.push('### 0. 먼저 `0_보이스확인.txt` 여덟 줄부터 붙여넣으세요 (크레딧 0)', '');
R.push('여덟 자리에 박아 둔 캐릭터 이름이 타입캐스트에서 실제로 잡히는지 확인하는 파일입니다.');
R.push('이름이 한 글자만 달라도 그 화자는 자동 배정이 안 되는데, 그 사실은 원래 다섯 파트를 다 붙여넣은 뒤에야 드러납니다.', '');
R.push('| 자리 | 캐릭터 이름 |');
R.push('|---|---|');
for (const x of manifest.probe.roles) R.push(`| ${x.role} | **${x.name}** |`);
R.push('');
R.push('붙여넣은 뒤 **화자가 여덟 개 다 잡히면 통과**입니다. 그대로 다음으로 가세요.');
R.push('하나라도 기본 화자(예: `박창수`)로 남거나 이름이 안 잡히면 그 이름이 타입캐스트에 없는 것입니다.');
R.push('그 자리 이름만 알려 주면 한 줄 고쳐 다시 뽑습니다 — `node scripts/build-typecast-import.mjs --voice 안내=진희` 형태입니다.', '');
R.push('**이 파일은 절대 다운로드하지 마세요.** 미리듣기·재생성은 무료지만 다운로드만 한도를 깎습니다.');
R.push('여덟 목소리가 한 화면에 서므로, 미리듣기로 캐스팅 전체를 한 번에 다시 들어 보기에도 좋습니다.', '');
R.push('### 1~7. 본 작업', '');
R.push('1. 타입캐스트 → **대본 가져오기** → **텍스트 붙여넣기** 탭.');
R.push('2. 파트 파일 하나를 통째로 복사해 붙여넣고 **다음**.');
R.push('3. **화자 감지** — 위 표의 화자가 그대로 잡히면 정상입니다. 1~4번은 1인, 5번 배역은 여러 명입니다.');
R.push('   화자 옆 **대사 개수**가 위 표의 `문장` 칸과 같은지 보세요. 숫자가 맞으면 본문은 다 들어간 겁니다.');
R.push('   **표에 없는 화자가 하나라도 더 잡혔다면 그 칩을 눌러 그 블록을 지우세요.** 그 화자에 붙은 줄은 본문이 아닙니다.');
R.push('   타입캐스트에는 주석이 없습니다. `#`로 시작하든 말든 텍스트는 전부 낭독 대상이 되고, 콜론이 없으면');
R.push('   이름만 안 생길 뿐 **기본 화자(예: `박창수`)에 통째로 배정돼 같이 읽힙니다.** 재생 길이에도 포함됩니다.');
R.push('   그래서 이제 붙여넣기 파일에는 **대사 줄만** 들어갑니다(`PASTE_NO_COMMENT`) — 안내는 전부 이 README에 있습니다.');
R.push('   생성기가 대사 형식이 아닌 줄을 하나라도 발견하면 파일을 쓰지 않고 실패합니다. 확인은 그래도 3초입니다.');
R.push('4. **보이스 배정** — 각 화자에 목소리를 고릅니다. 파트마다 다른 목소리를 배정하는 게 설계입니다.');
R.push('5. 문장별로 감정·속도를 다듬습니다. **여기서는 다운로드하지 마세요** — 미리듣기·재생성은 무제한 무료고, 다운로드만 한도를 깎습니다(협의안 §3-①).');
R.push('6. 전부 확정한 뒤 **다운로드 → 문장별 분리**로 받습니다. 줄 수만큼 파일이 떨어집니다.');
R.push('7. **받은 zip이나 폴더를 한 곳에 모아** `node scripts/assemble-narration.mjs --in <모아 둔 폴더>`를 돌립니다.');
R.push('   문장이 클립으로 붙고, 여백이 들어가고, 음량이 맞춰지고, 나레이션·배역이 갈라져 각 폴더로 떨어집니다.', '');
// ★★PART_AUTOMATCH — 폴더 이름을 사람이 맞추는 절차는 폐기됐다. 되살리지 말 것.
R.push('### 폴더 이름은 안 맞춰도 됩니다 (`PART_AUTOMATCH`)', '');
R.push('예전엔 `1_안내/` 처럼 파트 번호로 시작하는 폴더에 손으로 나눠 담아야 했습니다. 그건 우리 사정이지 받는 쪽 사정이 아닙니다 —');
R.push('타입캐스트가 주는 zip 이름에는 파트 번호가 없어서 매번 사람이 이름을 고쳐야 했고, 손이 가는 자리는 결국 틀립니다.', '');
R.push('지금은 조립기가 **문장 개수**로 파트를 짚고 **길이 상관**으로 확인합니다. zip은 알아서 풀어서 봅니다.');
R.push('폴더 이름이 `다운로드 (3)` 이든 `무제 프로젝트.zip` 이든 상관없고, 이름이 틀리게 붙어 있어도 내용이 이깁니다.', '');
R.push('| 파트 | 파일 개수 |');
R.push('|---|---|');
for (const p of manifest.parts) R.push(`| \`${p.file}\` | ${p.sents}개 |`);
R.push('');
R.push('개수가 파트마다 다르기 때문에 이게 성립합니다. 개수가 안 맞으면 `문장별 분리`가 아니라 `전체 통합`으로 받았거나');
R.push('두 파트가 한 폴더에 섞인 것이고, 조립기가 그 경우를 이름 대신 개수로 짚어 알려 줍니다.');
R.push('한 파트만 먼저 조립하려면 `--part 3`처럼 지정하세요(A/B 중인 파트만 뽑아 볼 때).', '');
// ★PASTE_NO_COMMENT — 파일에서 뺀 안내는 여기로 온다. 이 블록을 지우면 안내가 어디에도 없게 된다.
R.push('## 파트별 안내', '');
R.push('붙여넣기 파일에는 대사 줄만 있습니다. 파트별로 알아야 할 것은 전부 여기 있습니다.', '');
for (const p of manifest.parts) {
  R.push(`### \`${p.file}\` — ${p.title}`, '');
  for (const l of p.note) R.push(`- ${l}`);
  R.push('');
}
// ★확정 현황은 VOICE 에서 그린다. 손으로 이름을 적지 않는다 —
//   두 군데 적으면 한쪽만 고치는 날이 오고, 그날 이 문서가 조용히 거짓말을 시작한다.
{
  // [ENTRY_ALT] 겹친 역할('신랑|신부')은 두 자리로 편다. 안 펴면 표가 "9자리 중 8자리 확정 · 남은 자리 신랑|신부"라고
  //   거짓 보고를 한다 — 실제로는 여덟 자리가 다 찼는데도 사용자가 손으로 고를 게 남은 줄 안다.
  const roles = [...new Set(manifest.clips.flatMap((c) => String(c.role).split('|')))];
  const left = roles.filter((r) => !VOICE[r]);
  R.push(left.length ? '## 보이스 배정 현황' : '## ★보이스 8자리 전부 확정 — 손으로 고를 것이 없습니다', '');
  if (left.length) {
    R.push(`${roles.length}자리 중 **${roles.length - left.length}자리 확정** · 남은 자리 **${left.join(' · ')}**.`);
    R.push('남은 자리는 붙여넣은 뒤 3단계 「보이스 배정」에서 손으로 골라야 합니다.', '');
  } else {
    R.push('**붙여넣으면 여덟 자리가 이미 배정된 채로 나옵니다.** 화자 이름이 곧 타입캐스트 캐릭터 이름이기 때문입니다.');
    R.push('3단계 「보이스 배정」에서 할 일이 없습니다 — 배정된 이름이 아래 표와 같은지만 확인하세요.', '');
  }
  R.push('| 자리 | 클립 | 목소리 |');
  R.push('|---|---|---|');
  for (const r of roles) {
    const n = manifest.clips.filter((c) => String(c.role).split('|').includes(r)).length;   // [ENTRY_ALT]
    R.push(`| ${r} | ${n} | ${VOICE[r] ? `**${VOICE[r]}**` : '⬜ 미정'} |`);
  }
  R.push('');
  R.push('★**한 글자 차이 이름을 조심하세요.** 검색창에서 나란히 뜹니다 — `서진`(우리 신부)과 `서현`(밈 지도 2관왕 · 탈락),');
  R.push('`잔희`(우리 안내)와 `진희`(무료 30종). 잘못 고르면 가장 피하려던 목소리가 그 자리에 앉습니다.');
  R.push('자동 배정이 안 되는 자리가 있으면 그 이름이 실재하지 않는다는 뜻이니 알려 주세요.', '');
  R.push('선정 근거·탈락 사유는 `docs/plans/식순연구/더빙_타입캐스트_보이스_추천.md`, 고르는 과정은 `보이스찾기/README.md`입니다.', '');
}
// ── 배역 파트 안내 (원천이 다르고 쓰임이 다르다)
if (cast.length) {
  const spk = [...new Set(cast.flatMap((c) => String(c.speaker).split('|')))];   // [ENTRY_ALT]
  R.push(`## 5번 배역은 성격이 다릅니다 — 미리듣기 전용 ${cast.length}클립`, '');
  R.push('1~4번은 **당일 식장에서 실제로 울리는 소리**입니다. 5번은 아닙니다.');
  R.push('상담 때 고객이 "우리 예식이 어떤 소리로 흘러가는지" 미리 듣는 용도이고, **당일 콘솔은 이 클립을 재생하지 않습니다.**');
  R.push('그 자리에서는 신랑·신부·부모님이 직접 말합니다. 재생 중 화면에 배지가 뜹니다 — "예시 목소리 · 당일엔 두 분이 직접 말해요".', '');
  R.push('그래서 녹음 기준이 다릅니다.', '');
  R.push('- **연기하지 마세요.** 낭독톤으로 갑니다. 울먹임·떨림·감정 고조 금지. 감정 프리셋은 `일반` 고정입니다.');
  R.push('  스타일 태그를 쓴다면 **소괄호**입니다 — 공식 예시가 `(슬프지만 억제하며)` 형식이고 대괄호는 근거가 없습니다.');
  R.push('  `(담담하게)`·`(차분하게)` 선에서 멈추세요. **이 기능은 베타라 몇몇 성우에게만 적용됩니다** — 태그가 안 먹어도');
  R.push('  결과가 성립하도록 프리셋만으로 톤을 맞춰 두고, 태그가 본문으로 읽히지 않는지 귀로 확인하세요.');
  R.push('  서약·편지가 특히 그렇습니다. 예시가 울면 고객은 두 가지를 잃습니다 — 당일의 첫 감정과, "나도 저래야 하나"라는 부담 없음.');
  R.push('- **어른 말투에 사투리·유행어를 얹지 마세요.** 특정 지역·세대의 캐릭터가 되는 순간 밈이 됩니다.');
  R.push(`- 화자가 ${spk.length}명(${spk.join(' · ')})입니다. 원천은 \`배역_예시_대사.txt\`입니다.`);
  R.push(`  ${spk.every((x) => Object.values(VOICE).includes(x))
    ? '전부 타입캐스트 캐릭터 이름이라 붙여넣으면 자동 배정됩니다.'
    : '역할명으로 남은 화자는 3단계 「보이스 배정」에서 고릅니다.'}`, '');
  R.push('대사는 전부 **가상 인물**의 것입니다 — 신랑 이준호(31) · 신부 정세영(29) · 아버님 이만수(62) · 어머님 김영자(58).');
  R.push('★**고객이 실제로 쓴 서약문·편지는 어떤 경우에도 여기 넣지 않고 TTS도 하지 않습니다.**');
  R.push('①"당일까지 비밀" 정책과 충돌하고 ②실물 낭독의 감정 가치를 미리 소진하며 ③민감 텍스트를 외부로 보냅니다.', '');
  if (held.length) {
    R.push(`### 빠져 있는 ${held.length}클립 — 하객 군중 (결정 대기)`, '');
    R.push('원천 파일에는 있는데 붙여넣기 파일에서 뺐습니다. 여기 넣으면 안 되는 걸 넣게 되기 때문입니다.', '');
    for (const h of held) R.push(`- \`${h.id}\` (${h.label}) — "${h.paras.join(' ')}"`);
    R.push('', 'AI 단일 보이스로는 군중 소리를 만들 수 없습니다. 한 사람이 "네, 그러겠습니다"를 말하면');
    R.push('스물다섯 명의 응답이 아니라 **한 명의 대답**으로 들리고, 그 순간 예식이 우스워집니다.');
    R.push('후보 셋 — ①팀·지인 4~5명 실녹음 ②그 구간만 텍스트 카드 ③생략. 추천은 ②입니다(기획서 §6 결정 7).');
    R.push('문안은 어느 쪽으로 결정되든 필요하므로 원천에 남겨 뒀습니다.', '');
  }
}
R.push('## 왜 한 문장이 한 줄인가', '');
R.push("'문장별 분리'가 문장 기준인지 줄 기준인지 확인할 방법이 없습니다. **한 문장을 한 줄로 두면 둘 중 무엇이든 결과가 같습니다.**");
R.push('쪼개져도 조립기가 `manifest.json`대로 다시 붙이므로 손해가 없고, 오히려 문장 사이 여백을 대본 규격대로 정확히 넣을 수 있어 **편집 단계가 통째로 자동화**됩니다.', '');
R.push('## 자동으로 들어가는 여백', '');
R.push('| 자리 | 초 | 근거 |');
R.push('|---|---|---|');
R.push(`| 클립 앞 | ${GAP.head} | 실청 축소 2차 (원 0.4 → 0.35 → ${GAP.head}) |`);
R.push(`| 문장 사이 | ${GAP.sent} | 실청 축소 2차 (원 1.8 → 0.9 → ${GAP.sent}) · ★타입캐스트가 넣어 준 앞뒤 무음은 조립기가 깎아 내고, 클립 안쪽 쉼도 이 값을 상한으로 줄입니다(SENT_CAP) |`);
R.push(`| 클립 뒤 | ${GAP.tail} | 실청 축소 2차 (원 1.0 → 0.9 → ${GAP.tail}) |`);
R.push('| `…위하여!`로 끝나는 클립 뒤 | 4.5 | 축배 뒤 환호가 터진 자리의 낙차 (G9-toast·G9-both 둘 다) · ★잔을 들었다 내리는 동작 대기라 축소 대상이 아닙니다 |');
R.push('| 폐식(`narr-close`) 뒤 | 2.5 | 예식의 마지막 소리 · 여운 · ★사람이 일어서기 시작하는 시간이라 축소 대상이 아닙니다 |');
R.push(`| \`${DECL_LINE}\` 앞/뒤 | ${FINE.decl[0]} / ${FINE.decl[1]} | ★DECL_PAUSE_POS |`);
R.push(`| \`${DEMO_LINE}\` 앞/뒤 | ${FINE.demo[0]} / ${FINE.demo[1]} | W2-b 답 시연 구간 |`);
R.push(`| 혼주 편지 소제목(하나~넷) 앞/뒤 | ${FINE.head4[0]} / ${FINE.head4[1]} | 3분 편지의 구조를 귀로 듣게 |`);
R.push(`| 혼주 편지 문단 들머리 | ${FINE.para} | 문단이 바뀌는 자리 (서명 줄은 제외 — 앞줄을 닫는 코다다) |`);
// ── 중복 문장: 코스가 갈리는 자리라 같은 문장이 여러 클립에 들어간다
{
  // ★클립 번호는 파트 안에서만 유일하다 — 나레이션 01과 배역 01은 다른 클립이다.
  //   파트를 안 적으면 이 표가 사람을 엉뚱한 자리로 보낸다.
  const dup = {};
  for (const c of manifest.clips)
    for (const s of c.sents) (dup[s.text] ||= []).push(`${c.part.replace(/\.txt$/, '')} ${c.no}`);
  const rep = Object.entries(dup).filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  if (rep.length) {
    const n = rep.reduce((a, [, v]) => a + v.length, 0);
    R.push('', `## ★같은 문장이 ${rep.length}종 ${n}번 나옵니다`, '');
    R.push('코스·상황에 따라 갈리는 자리라 같은 문장이 여러 클립에 들어갑니다. 두 가지를 지켜 주세요.', '');
    R.push('**① 같은 문장은 같은 감정·속도로 맞추세요.** "신랑 신부, 입장!"이 클립마다 다르게 들리면,');
    R.push('코스를 바꿔 본 고객이 "아까랑 다른데?"를 느낍니다. 하나를 다듬고 나머지에 같은 설정을 복사하는 편이 빠릅니다.', '');
    R.push('**② 다운로드 파일명이 겹칠 수 있으니 반드시 순서로 매칭하세요.** 조립기가 길이 상관(r ≥ 0.85)으로 검증하지만,');
    R.push('애초에 파트별로 폴더를 나눠 풀면 섞이지 않습니다.', '');
    R.push('| 문장 | 횟수 | 나오는 자리 (파트 · 클립) |');
    R.push('|---|---|---|');
    for (const [t, v] of rep) R.push(`| ${t} | ${v.length} | ${v.join(' · ')} |`);
  }
}
R.push('', '## 보이스가 정해지면', '');
R.push('역할명 대신 캐릭터 이름을 박아 **자동 배정**시킬 수 있습니다.', '');
R.push('```bash');
R.push('node scripts/build-typecast-import.mjs --voice 진행=남준');   // 한 자리만 잠깐 바꿔 들어 볼 때
R.push('```', '');
R.push('배역도 같은 방식입니다 — 화자명이 역할이 아니라 사람이라는 것만 다릅니다.', '');
R.push('```bash');
R.push('node scripts/build-typecast-import.mjs --voice 신랑=진,신부=에이프릴,아버님=대진,어머님=정숙,하객대표=세진');
R.push('```', '');
R.push('타입캐스트가 화자명을 캐릭터로 인식하면 4단계(보이스 배정)가 통째로 사라집니다.');
R.push('아직 A/B가 안 끝났으므로 **지금은 역할명·인물명이 기본값**입니다.', '');
fs.writeFileSync(path.join(OUT, 'README.md'), R.join('\n') + '\n', 'utf8');

console.log(`\n✓ ${manifest.clips.length}클립 (나레이션 ${clips.length} + 배역 ${cast.length}) · ${totalSent}문장 → ${OUT.replace(root + '/', '')}/`);
if (held.length) console.log(`  보류 ${held.length}클립 제외: ${held.map((h) => h.id).join(' · ')} (기획서 §6 결정 7 대기)`);
