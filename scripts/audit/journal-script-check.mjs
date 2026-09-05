// 저널 낭독 대본 ↔ 화면 본문 대조 + 타입캐스트 입력 규격 검사  [JOURNAL_SCRIPT_TRUTH]
//   node scripts/audit/journal-script-check.mjs
//
// ★왜 필요한가
//   대본(docs/plans/저널낭독/*.txt)과 화면 글(index.html 저널 카드)은 «같은 글»이어야 한다.
//   그런데 둘은 다른 파일에 살아서, 한쪽만 고쳐도 아무도 모른다 — 화면 문장을 다듬은 날
//   스피커에서는 옛 문장이 계속 나오게 된다(식순 쪽에서 실제로 겪은 사고와 같은 구조 · ASR_TRUTH).
//   그래서 «글끼리»만이라도 기계가 맞대 둔다.
//
// ★대본에서만 허용하는 차이 (아래 SPOKEN 이 흡수한다)
//   · 숫자는 한글로 — 140분을 «백사십 분»으로. TTS 오독을 막는다(더빙 대본 공통 규격)
//   · 말줄임표는 종결어미로 — «싶어하셔서…» → «싶어하셔서요.» 소리에는 말줄임이 없다
//   · 긴 문장은 두 줄로 쪼갠다 — 이어 붙이면 같은 글이므로 대조에 영향 없다
//
// ★타입캐스트 규격 (PASTE_NO_COMMENT · 타입캐스트에는 주석이 없다)
//   모든 줄이 «화자: 대사» 여야 한다. 주석·빈 줄·머리말이 있으면 그것까지 읽어 버린다.
//
// ★★화자 둘 [ESSAY_TWO_VOICES 2026-09-05 사용자 지시]
//   저널 1편에는 상담 온 신부의 «말»이 그대로 실려 있다. 그 줄만 다른 목소리가 읽는다.
//   화면에서 그 줄은 `<p class="q">`(이탤릭·금색)로 남들과 구별돼 있다. 그러니 검사도 그 표시를 본다 —
//   «대본의 신부 줄» 과 «화면의 인용문 문단» 이 글자까지 같은지 맞댄다.
//   그래서 화면에서 인용 표시를 떼거나 새 인용을 넣으면 여기가 먼저 붉어진다.
//   ★역할명(신부·디렉터)을 캐릭터 이름으로 바꾸지 말 것 — 목소리는 타입캐스트 3단계에서 고른다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DIR = path.join(ROOT, 'docs/plans/저널낭독');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const MAX_LINE = 55;                            // 한 호흡 상한 (더빙 대본 공통 규격)
const SPEAKERS = ['디렉터', '신부'];              // 역할명 · 타입캐스트 3단계에서 목소리를 고른다
const QUOTED = '신부';                           // 화면 인용문(<p class="q">)을 읽는 화자

// 화면 → 대조용 문자열: 주석·태그·서명을 걷고 한글·숫자만 남긴다
const bare = (t) => t.replace(/[^가-힣0-9]/g, '');
const rawCards = [...HTML.matchAll(/<div class="journal-card-full">([\s\S]*?)<div class="journal-footer/g)]
  .map((m) => m[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div class="journal-sign">[\s\S]*?<\/div>/g, ''));  // 서명은 낭독하지 않는다
const screens = rawCards.map((c) => c.replace(/<[^>]+>/g, ' '));
// 화면에서 «인용문»으로 표시된 문단 — 이 줄들이 대본에서 신부 목소리여야 한다
const screenQuotes = rawCards.map((c) => [...c.matchAll(/<p class="q">([\s\S]*?)<\/p>/g)]
  .map((m) => m[1].replace(/<[^>]+>/g, ' ')));

// 대본 → 대조용: 화자 prefix 를 떼고, 대본에서만 허용한 차이를 화면 쪽 표기로 되돌린다
const SPOKEN = (t) => t
  .replace(/백사십/g, '140')
  .replace(/싶어하셔서요\./g, '싶어하셔서…');

const files = fs.readdirSync(DIR).filter((f) => /^\d_.*\.txt$/.test(f)).sort();
let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? '  ok' : 'FAIL'}  ${msg}`); };

console.log(`저널 낭독 대본 ${files.length}편 · 화면 카드 ${screens.length}편`);
say(files.length === screens.length, `대본 편수 = 화면 카드 수 (${files.length}/${screens.length})`);

files.forEach((f, i) => {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\n+$/, '');
  const lines = raw.split('\n');
  console.log(`\n[${f}]`);

  // ── 규격
  const badForm = lines.filter((l) => !SPEAKERS.some((sp) => l.startsWith(sp + ': ')));
  say(badForm.length === 0, `모든 줄이 «${SPEAKERS.join(' / ')}: » 형식 (어긋난 줄 ${badForm.length})${badForm[0] ? ' · ' + badForm[0].slice(0, 30) : ''}`);

  const texts = lines.map((l) => l.replace(/^[^:]*:\s*/, ''));
  const who = lines.map((l) => (l.split(':')[0] || '').trim());

  // ── 화면의 인용문 == 대본의 신부 줄 [ESSAY_TWO_VOICES]
  const said = texts.filter((_, k) => who[k] === QUOTED).map((t) => bare(SPOKEN(t)));
  const shown = (screenQuotes[i] || []).map(bare);
  const same = said.length === shown.length && said.every((t, k) => t === shown[k]);
  say(same, `화면 인용문 ${shown.length}개 == 대본 «${QUOTED}» 줄 ${said.length}개`
    + (same ? '' : `\n        대본: ${said.join(' | ').slice(0, 60)}\n        화면: ${shown.join(' | ').slice(0, 60)}`));
  const digits = texts.filter((t) => /[0-9]/.test(t));
  say(digits.length === 0, `아라비아 숫자 0 (TTS 오독 방지)${digits[0] ? ' · ' + digits[0] : ''}`);

  const quotes = texts.filter((t) => /["'“”‘’]/.test(t));
  say(quotes.length === 0, `따옴표 0 (TTS 불안정)${quotes[0] ? ' · ' + quotes[0] : ''}`);

  const dash = texts.filter((t) => t.includes('—'));
  say(dash.length === 0, '전각 줄표 0 (브랜드 규칙)');

  const long = texts.filter((t) => t.length > MAX_LINE);
  say(long.length === 0, `한 줄 ${MAX_LINE}자 이하 (넘는 줄 ${long.length})${long[0] ? ' · ' + long[0].length + '자 ' + long[0].slice(0, 24) : ''}`);

  // ── 화면과 같은 글인가
  const a = bare(SPOKEN(texts.join(' ')));
  const b = bare(screens[i] || '');
  if (a === b) {
    say(true, `화면 본문과 한 글자도 다르지 않음 (${a.length}자)`);
  } else {
    let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
    say(false, `화면 본문과 다름 — ${k}번째 글자부터\n        대본: …${a.slice(Math.max(0, k - 14), k + 26)}\n        화면: …${b.slice(Math.max(0, k - 14), k + 26)}`);
  }

  const n = texts.join('').replace(/\s/g, '').length;
  const cast = SPEAKERS.map((sp) => `${sp} ${who.filter((w) => w === sp).length}`).filter((t) => !/ 0$/.test(t));
  console.log(`  줄 ${lines.length} (${cast.join(' · ')}) · ${n}자 · 낭독 약 ${Math.round(n / 4.2)}초`);
});

console.log(bad === 0 ? '\n전부 통과' : `\n${bad}건 실패`);
process.exit(bad === 0 ? 0 : 1);
