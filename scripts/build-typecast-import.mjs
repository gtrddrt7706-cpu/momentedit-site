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

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(root, 'docs/plans/식순연구/더빙_녹음_대본_최종.txt');
const CAST = path.join(root, 'docs/plans/식순연구/배역_예시_대사.txt');
const OUT = path.join(root, 'docs/plans/식순연구/타입캐스트');

// ── --voice 진행=대길,안내=김경화 앵커,편지=한준
//    보이스가 확정되면 화자명을 캐릭터 이름으로 바꿔 타입캐스트가 자동 배정하게 만든다.
//    ★공백이 든 이름(김경화 앵커)에 백슬래시를 붙이지 않는다 — 아래에서 slice(a+1).join(' ')로
//      다시 이어 붙이므로 셸이 나눈 토큰이 저절로 복원된다. 이스케이프하면 이름에 \가 박힌다.
const VOICE = {};
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
//    진행 41 · 안내 12 · 편지 1 = 54
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
  { f: '3_진행_후반.txt', t: '편지 도입 · 선언 · 베일 · 링워밍 · 헌정 · 축배', role: '진행',
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
const GAP = {
  head: 0.4,      // 클립 앞 무음 0.3~0.5
  sent: 1.8,      // 문장 사이 기본 1.5~2.5
  tail: 1.0,      // 클립 뒤 무음 0.8~1.5
};
// 선언문 — 앞 0.5 / 뒤 1.0 (★DECL_PAUSE_POS · 2026-07-26 실측 정정: '마지막 문장'이 아니라 이 문장 자체)
const DECL_LINE = '신랑 신부, 이제 두 사람은 부부입니다.';
// W2-b 안에서 나레이터가 답을 시연하는 구간 — 앞뒤 각 0.5
const DEMO_LINE = '네, 그러겠습니다.';

// ★파일명이 아니라 '마지막 문장'으로 판정한다.
//   `toast-toast`만 보고 4.5초를 주면 축배로 끝나는 `toast-both`가 그대로 새어 나간다.
//   대본 note가 말한 건 "축배 뒤"이지 "축배 클립 뒤"가 아니다 — 환호가 터진 자리의 낙차를 받는 무음이다.
//   반대로 `toast-cake`는 같은 블록이지만 환호가 없어 기본값이 맞다.
const clipGap = (id, file, lastSent) => {
  if (/위하여!$/.test(lastSent)) return { tail: 4.5 };     // 축배 뒤 온도 낙차 4~5초
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
if (clips.length !== 54) { console.error(`✗ 클립 수 불일치: ${clips.length} (기대 54)`); process.exit(1); }

const castAll = fs.existsSync(CAST) ? parse(CAST) : [];
if (castAll.length && castAll.length !== 17) { console.error(`✗ 배역 클립 수 불일치: ${castAll.length} (기대 17)`); process.exit(1); }
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
const manifest = { version: 2, source: '더빙_녹음_대본_최종.txt', cast: '배역_예시_대사.txt',
                   gap: GAP, parts: [], clips: [] };
let totalSent = 0;

for (const P of PARTS) {
  const mine = (P.src === CAST ? cast : clips).filter((c) => P.has(c.id));
  if (!mine.length) continue;
  const body = [];
  let sentInPart = 0;

  for (const c of mine) {
    const role = c.speaker || ROLE_OF(c.id);
    const sents = [];
    c.paras.forEach((para, pi) => {
      splitSents(para).forEach((s, si) => {
        sents.push({ text: s, para: pi, first: si === 0 });
      });
    });

    // 이 클립의 문장별 뒤 여백을 계산해 둔다 (조립기가 그대로 쓴다)
    const over = clipGap(c.id, c.file, sents.length ? sents[sents.length - 1].text : '');
    const rec = { no: c.no, id: c.id, label: c.label, file: c.file, role,
                  part: P.f, dir: P.dir || 'assets/audio/narration',
                  head: GAP.head, tail: over.tail ?? GAP.tail, sents: [] };

    sents.forEach((s, k) => {
      const last = k === sents.length - 1;
      let after = last ? 0 : GAP.sent;   // 마지막 문장 뒤는 클립 tail이 맡는다
      let before = 0;

      if (s.text === DECL_LINE) { before = 0.5; if (!last) after = 1.0; }
      if (s.text === DEMO_LINE) { before = 0.5; if (!last) after = 0.5; }
      // 혼주 편지 소제목(하나~넷) 앞뒤 각 1.5초 — 없으면 3분짜리 편지의 구조가 귀에 안 들린다
      if (c.id === 'G10' && /^(하나|둘|셋|넷),\s/.test(s.text)) { before = 1.5; if (!last) after = 1.5; }
      // 문단 경계는 한 박 더 쉰다
      else if (c.id === 'G10' && s.first && k > 0) { before = Math.max(before, 0.8); }

      rec.sents.push({ i: k, text: s.text, before, after });
      body.push(`${named(role)}: ${s.text}`);
      sentInPart++; totalSent++;
    });

    manifest.clips.push(rec);
  }

  const spk = [...new Set(mine.map((c) => named(c.speaker || ROLE_OF(c.id))))];

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
    spk.length === 1
      ? `화자 '${spk[0]}' = 이 파트의 목소리 1인.` +
        (VOICE[P.role] ? ' 타입캐스트 캐릭터 이름이라 자동 배정됩니다.'
                       : ' 3단계 「보이스 배정」에서 고르면 됩니다.')
      : `화자 ${spk.length}인 — ${spk.join(' · ')}. 3단계 「보이스 배정」에서 각각 고르면 됩니다.`,
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
                        clips: mine.length, sents: sentInPart, chars });
  const warn = chars > 20000 ? '  ★20,000자 초과 — 더 쪼갤 것' : '';
  console.log(`  ${P.f.padEnd(18)} 클립 ${String(mine.length).padStart(2)} · 문장 ${String(sentInPart).padStart(3)} · ${String(chars).padStart(6)}자${warn}`);
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
R.push('7. **파트 번호로 시작하는 폴더에 각각 풀고** `node scripts/assemble-narration.mjs --in <상위폴더>`를 돌립니다.');
R.push('   문장이 클립으로 붙고, 여백이 들어가고, 음량이 맞춰지고, 나레이션·배역이 갈라져 각 폴더로 떨어집니다.', '');
R.push('```');
R.push('~/Downloads/타입캐스트/');
for (const p of manifest.parts) R.push(`  ${p.file.replace(/\.txt$/, '')}/   ← ${p.file} 다운로드분 ${p.sents}개`);
R.push('```', '');
R.push('**폴더 이름은 파트 번호(`1_`·`2_`…)로 시작하기만 하면 됩니다.** 조립기가 그 번호로 파트를 붙입니다 —');
R.push('폴더를 안 나누고 한 곳에 다 풀면 파트끼리 섞여서 순서 검증에 걸립니다.');
R.push('한 파트만 먼저 조립하려면 `--part 3`처럼 지정하세요(A/B 중인 파트만 뽑아 볼 때).', '');
// ★PASTE_NO_COMMENT — 파일에서 뺀 안내는 여기로 온다. 이 블록을 지우면 안내가 어디에도 없게 된다.
R.push('## 파트별 안내', '');
R.push('붙여넣기 파일에는 대사 줄만 있습니다. 파트별로 알아야 할 것은 전부 여기 있습니다.', '');
for (const p of manifest.parts) {
  R.push(`### \`${p.file}\` — ${p.title}`, '');
  for (const l of p.note) R.push(`- ${l}`);
  R.push('');
}
R.push('## ★먼저 할 일 — 목소리 A/B (30분 · 0원)', '');
R.push('나레이션 목소리가 안 정해져서 트랙 2·3이 통째로 멈춰 있습니다. 이 폴더가 그 병목을 30분짜리로 줄입니다.', '');
R.push('`3_진행_후반.txt`를 붙여넣고, **클립 27(`G4-parent` · 편지 도입)과 클립 34(`W2-b` · 서약 문답)** 두 자리만 들어 보세요.');
R.push('앞은 가장 조용한 대목이고 뒤는 가장 형식적인 대목이라, 이 둘을 다 견디는 목소리면 나머지 52클립은 다 됩니다.');
R.push('화자 `진행` 하나에 목소리만 바꿔 끼우면 되고, **미리듣기는 무제한 무료**입니다(다운로드만 한도 차감).', '');
R.push('후보는 `docs/plans/식순연구/더빙_타입캐스트_보이스_추천.md` 참고 — 밈 리스크 판정이 붙어 있습니다.', '');
R.push('**2026-08-01 리서치로 8자리 후보가 좁혀졌습니다**(같은 문서 §2-B). 진행 **대길** · 안내 **김경화 앵커** ·');
R.push('편지 **한준**(대안 현주) · 신랑 **진** · 신부 **에이프릴** · 아버님 **대진** · 어머님 **정숙** · 하객대표 **세진**.');
R.push('★들어 보고 고른 것이 아니라 **공식 톤 설명·밈 노출 지도·대사 적합성으로 좁힌 것**입니다. 확정은 청취 뒤에.', '');
// ── 배역 파트 안내 (원천이 다르고 쓰임이 다르다)
if (cast.length) {
  const spk = [...new Set(cast.map((c) => c.speaker))];
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
  R.push(`- 화자가 ${spk.length}명(${spk.join(' · ')})이라 3단계 「보이스 배정」에서 각각 고릅니다. 원천은 \`배역_예시_대사.txt\`입니다.`, '');
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
R.push(`| 클립 앞 | ${GAP.head} | 대본 공통 규격 0.3~0.5 |`);
R.push(`| 문장 사이 | ${GAP.sent} | 대본 공통 규격 1.5~2.5 |`);
R.push(`| 클립 뒤 | ${GAP.tail} | 대본 공통 규격 0.8~1.5 |`);
R.push('| `…위하여!`로 끝나는 클립 뒤 | 4.5 | 축배 뒤 환호가 터진 자리의 낙차 (G9-toast·G9-both 둘 다) |');
R.push('| 폐식(`narr-close`) 뒤 | 2.5 | 예식의 마지막 소리 · 여운 |');
R.push(`| \`${DECL_LINE}\` 앞/뒤 | 0.5 / 1.0 | ★DECL_PAUSE_POS |`);
R.push(`| \`${DEMO_LINE}\` 앞/뒤 | 0.5 / 0.5 | W2-b 답 시연 구간 |`);
R.push('| 혼주 편지 소제목(하나~넷) 앞/뒤 | 1.5 / 1.5 | 3분 편지의 구조를 귀로 듣게 |');
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
R.push('node scripts/build-typecast-import.mjs --voice 진행=대길,안내=김경화 앵커,편지=한준');
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
