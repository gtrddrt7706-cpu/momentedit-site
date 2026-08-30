// **전체 실청 점검** — 기존 105클립 + 새 어조 63클립을 한 판에 [LISTEN_ALL]
//
//   node scripts/build-listen-all.mjs --out <경로>            소리 없이(가벼움)
//   node scripts/build-listen-all.mjs --out <경로> --embed     소리 심어서(한 파일로 다 들림)
//
// ★왜 따로 만드나 — 2026-08-15 사용자 지시
//   *"기존것도 전부 싱청점검에 포함하고 전부 들으면서 수정개선할수있게 직관적이게 만들어보자"*
//   `build-listen-tone.mjs` 는 «새로 받은 어조 63클립»만 본다(조립 전 문장 wav).
//   여기는 **이미 예식에 나가고 있는 105클립까지** 넣어 전체를 한 줄로 듣는다.
//   둘을 한 생성기에 억지로 합치지 않는다 — 보는 것도, 소리의 성질도, 검사도 다르다.
//     · 기존 = 조립 끝난 mp3(무음·정규화 포함) → **클립 통째로** 듣는 것이 실제 결과물이다
//     · 어조 = 아직 문장 wav → 문장 단위로 듣는다
//
// ★직관 = **예식 순서**
//   목록을 파일 이름순이 아니라 manifest 의 `no`(식순)대로 늘어놓고 파트로 나눈다.
//   사람은 「몇 번 클립」이 아니라 「입장 다음」으로 기억한다.
//
// ★조립을 여기서 하지 않는다 [ONE_SPEC] — assemble-narration.mjs 몫. 여기는 듣고 표시만 한다.
//
// ★소리 크기 — 기존 105클립 원본 27MB. 48kbps 모노로 줄이면 base64 뒤에도 한 파일에 들어간다.
//   ★정규화하지 않는다. 기존 클립은 이미 -16 LUFS 로 조립된 것이고, 새 어조는 받은 그대로 들어야 한다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { sentBounds, durOf, blockFit } from './lib/sent-bounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const STAGE = path.join(ROOT, '_dub_stage');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', ''), EMBED = process.argv.includes('--embed');
/* ★★[LISTEN_SPLIT 2026-08-26 사용자 지적 *"모바일이나 태블릿에서는 안나오네 항목들이"*]
   소리를 다 심으면 한 판이 8.5MB 다. 데스크톱은 열리는데 폰·태블릿에서 항목이 안 뜬다.
   ★실측으로 «화면 탓이 아님»을 먼저 확인했다 — 390px 헤드리스에서 클립 160·문장 495 가
     그대로 그려지고 pageerror 0 이다. 즉 레이아웃이 아니라 **무게**(또는 앱 내장 뷰어)다.
   ★그래서 파트별로 쪼갤 길을 연다: `--part 1_안내.txt` · `--part 어조`.
     쪼갠 판은 저마다 다른 지문을 갖는다(LISTEN_KEY_STAMP) → 판정이 서로 안 섞인다.
   ★쪼개는 것을 «기본»으로 만들지는 않는다 — 한 판으로 보고 싶은 사람이 있고,
     데스크톱에서는 그게 더 낫다. 고르게 둔다. */
const PART = arg('--part', '');
/* ★★[LISTEN_LIGHT 2026-08-26 사용자 지시 *"파트별? 하나로줘야지"*]
   쪼개지 말고 **한 판**으로 주되, 폰이 감당하게 무게를 줄인다.
   ★실청은 «무슨 말인지·어조가 맞는지»를 듣는 자리다. 음질을 최고로 둘 이유가 없다.
     당일 나가는 소리는 assets/audio 의 원본이고, 이 판은 그걸 검수하려고 줄여 담은 사본이다.
   ★기본을 24kbps 모노 22.05kHz 로 내린다(전 48k/32kHz). 말소리는 이 대역에서 또렷하다.
   ★--kbps 로 올릴 수 있다 — 어조를 더 곱게 들어야 하면 그때만 올린다. */
const KBPS = arg('--kbps', '24k');
/* ★★[LISTEN_WEB 2026-08-26 사용자 실물 세 번] 소리를 **주소로** 부른다 — 파일에 박지 않는다.
   ★왜 여기까지 왔나: 폰에서 세 번 안 열렸다. 원인은 앱 내장 미리보기가 스크립트를 막는 것이고,
     그건 파일을 손으로 주고받는 한 못 고친다. 파일이 아니라 **길**이 잘못된 것이다.
   ★이 저장소는 이미 내부 검수 페이지를 배포한다(audio-review-tone.html).
     assets/audio/**.mp3 도 배포되고 vercel.json 에 캐시 규칙까지 있다.
     그러면 base64 로 박을 이유가 없다 — 판이 92K 가 되고, 사파리로 주소만 열면 된다.
   ★--embed 는 남긴다: 인터넷 없이 손에 쥐여 줘야 할 때가 있다(코워크에게 넘길 때).
     둘은 쓰임이 다르다. 없애지 않고 고르게 둔다. */
const WEB = process.argv.includes('--web');
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
if (!OUT) die('--out <경로> 가 필요하다', 2);

/* ── ① 기존 105클립 (manifest = 정본) ─────────────────────────────────────── */
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const PART_KO = { '1_안내.txt': '하객 안내', '2_진행_전반.txt': '진행 · 전반', '3_진행_후반.txt': '진행 · 후반',
  '4_혼주편지.txt': '혼주 편지', '5_배역.txt': '배역(신랑·신부·가족)', '6_예식뒤.txt': '예식 뒤' };
const PART_ORDER = ['1_안내.txt', '2_진행_전반.txt', '3_진행_후반.txt', '4_혼주편지.txt', '5_배역.txt', '6_예식뒤.txt'];

const srcOf = (c) => ['narration', 'cast']
  .map((d) => path.join(ROOT, 'assets/audio', d, `${c.no}_${c.file}.mp3`)).find((p) => fs.existsSync(p)) || '';

/* ★★[RETIRED_OFF_SCREEN 2026-08-16] 폐지한 자리는 **목록에서 뺀다**
   ─ 사용자: *"축가는 뺄거야 축가는 생략이라고 전에 계속 얘기했는데 계속 등장하네?"*
   ─ 옳은 지적이다. 큐 엔진은 이미 축가를 안 낸다(SONG_RETIRED · 2026-08-09 팔레트 폐지).
     그런데 이 화면은 **대장(manifest)의 105클립을 그대로** 늘어놓았다. 폐지한 mp3 는
     번호가 밀리지 않게 파일을 남겨 두는 것이 원칙이라, 대장에는 그대로 있다.
     그 결과 「식장에서 안 나는 소리」를 사람이 계속 듣고 확인하게 만들었다.
   ─ 이 화면의 쓰임은 «당일 나갈 소리를 확인하는 것»이다. 안 나가는 소리가 섞이면
     확인 시간을 뺏고, 「뺐다고 했는데 왜 있지」로 신뢰가 깎인다.
   ★그렇다고 조용히 빼지 않는다 — **몇 개를 왜 뺐는지 화면 아래에 적는다.**
     조용히 빼면 다음에 「축가 클립이 사라졌다」로 잘못 복구된다.
   ★폐지 명단을 여기 다시 적지 않는다 — ritual-cue.js 의 RETIRED 가 정본이다 [ONE_SPEC]. */
const Cue = createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js'));
const RETIRED = Cue.RETIRED || {};

/* ★★[EXPORT_MAN_ORDER 2026-08-16] 화면 차례와 **대본 차례는 다르다.**
   화면은 예식 순서(파트 → 클립 번호)로 보는 것이 편하다 — 사람이 식 흐름대로 듣기 때문이다.
   그런데 「다시」로 모은 **대본**은 그대로 타입캐스트에 붙여 넣고, 받은 wav 를 조립기에 준다.
   조립기(assemble-narration)는 `man.clips.filter(...)` — **대장 배열 차례**로 자리를 매긴다.
   둘이 갈리는 자리가 실제로 있다: 6_예식뒤 에서 no=80(배열 54번째) 이 no=63(배열 68번째) 보다 앞이다.
   ★그래서 대장 배열 차례(mi)를 클립마다 들고 다니다가, 대본을 낼 때만 그것으로 다시 세운다.
     화면은 그대로 예식 순서다 — 보는 차례와 붙이는 차례는 쓰임이 다르니 따로 둔다.
   ★이 저장소가 같은 병을 두 번 앓았다(--redub 의 클립번호 정렬 · 여기). 고치는 자리도 하나로 맞춘다. */
const RETIRED_ROWS = man.clips.filter((c) => RETIRED[c.file]).map((c) => `${c.no}_${c.file}`);
const OLDC0 = man.clips.map((c, mi) => ({ c, mi })).filter(({ c }) => !RETIRED[c.file])
  .sort((a, b) => (PART_ORDER.indexOf(a.c.part) - PART_ORDER.indexOf(b.c.part)) || (+a.c.no - +b.c.no))
  .map(({ c, mi }) => ({ id: `${c.no}_${c.file}`, no: c.no, mi, ko: c.label || c.file, part: c.part,
    role: c.role || '', mix: !!c.mix, has: !!srcOf(c),
    sents: (c.sents || []).map((s) => String(s.text || '').trim()).filter(Boolean) }));
/* [LISTEN_SPLIT] 파트를 짚으면 그 파트만 — 「어조」면 기존 클립을 통째로 뺀다 */
const PARTSEL = PART && PART !== '어조' ? (PART_ORDER.find((x) => x.startsWith(PART) || x === PART) || PART) : '';
if (PART && PART !== '어조' && !PART_ORDER.includes(PARTSEL)) {
  die(`--part ${PART} 는 없는 파트다. 있는 것: ${PART_ORDER.join(' · ')} · 어조`, 2);
}
const OLDC = PART === '어조' ? [] : (PARTSEL ? OLDC0.filter((c) => c.part === PARTSEL) : OLDC0);
if (PART && PART !== '어조' && !OLDC.length) die(`--part ${PART} 에 클립이 하나도 없다`, 2);
/* ★[SENT_SEEK 2026-08-16 사용자 지적 "아래쪽 대사는 나레이션이 안 입혀졌나 오디오가 안 들리는데?"]
   기존 클립은 「클립 듣기」만 있고 문장별 듣기가 없었다. 눌러 볼 것이 없으니 «안 입혀진» 것처럼 보인다.
   ★소리를 더 넣지 않는다 — 같은 클립을 **그 구간만** 재생하면 된다(currentTime 으로 건너뛰고 끝에서 멈춘다).
     문장 wav 를 따로 잘라 넣으면 파일이 두 배가 되는데, 들리는 소리는 똑같다.
   ★경계는 [GAP_MATCH] 단일 구현(lib/sent-bounds.mjs)에서 받는다. 못 정하면 null →
     그 클립만 문장별 듣기를 안 붙이고 **왜 없는지 화면에 적는다**(조용히 빠지면 또 「안 들린다」가 된다). */
const BOUNDS = {}, SHORT = {}, MISS = {};
let bOk = 0, bNo = 0;
/* ★[TOO_SHORT 2026-08-16] 소리가 글보다 짧은 클립을 표시한다.
   실측: 전 클립 말속도 중앙값 **초당 6.8음절**인데 11_narr-welcome-in 은 **14.3**이다.
   한국어는 빨라야 8~9음절/초라 그 속도로는 그 글을 다 읽을 수 없다 — 글과 소리가 어긋났을 수 있다.
   ★나는 소리를 못 듣는다. 그래서 «틀렸다»고 하지 않고 **「먼저 들어 보라」고 띄운다.**
     판정은 귀가 한다. 기계는 어디부터 들을지만 짚어 준다. */
const sylOf = (t) => (String(t).match(/[가-힣]/g) || []).length;
man.clips.forEach((c) => {
  const id = `${c.no}_${c.file}`, f = srcOf(c);
  if (RETIRED[c.file]) return;                    // [RETIRED_OFF_SCREEN] 폐지한 자리는 재지도 않는다
  if (!f || !(c.sents || []).length) return;
  const b = sentBounds(f, c.sents);
  if (b && b.length === c.sents.length) { BOUNDS[id] = b; bOk++; } else bNo++;
  const d = durOf(f), sy = c.sents.reduce((a, x) => a + sylOf(x.text), 0);
  if (isFinite(d) && d > 0 && sy >= 6 && sy / d > 8.5) SHORT[id] = +(sy / d).toFixed(1);
  /* ★★[SENT_MISSING 2026-08-16] 소리에 **문장이 통째로 빠진** 클립을 그 자리에 띄운다.
     ─ 사용자가 귀로 잡았다: *"근데 나레이션 멘트랑 문구가 다른데 왜 그래?"* (13_narr-vow-in)
     ─ 재는 자는 check-audio-sents 와 **같은 것**이다(lib/sent-bounds 의 blockFit) — 자를 두 벌 두지 않는다.
     ─ ★화면에 띄우는 이유: 나는 소리를 못 듣는다. 「여기부터 들어 보세요」를 짚어 주는 것까지가
       기계가 할 수 있는 일이고, 그 표시가 없으면 105클립을 처음부터 다 들어야 한다. */
  const bf = blockFit(f, c.sents);
  if (bf && !bf.ok) MISS[id] = bf.guess && bf.guess.drop
    ? { at: bf.guess.drop.map((k) => k + 1), n: c.sents.length, b: bf.blocks.length }
    : { at: null, n: c.sents.length, b: bf.blocks.length };
});
console.log(`  문장 구간 — 찾음 ${bOk}클립 · 못 정함 ${bNo}클립(그 클립은 통째로만 듣는다)`);
if (Object.keys(SHORT).length) console.log(`  ★소리가 글보다 짧은 클립 ${Object.keys(SHORT).length}개: ` +
  Object.entries(SHORT).map(([k, v]) => `${k}(${v}음절/초)`).join(' · '));
if (Object.keys(MISS).length) console.log(`  ★★소리에 문장이 빠진 것으로 보이는 클립 ${Object.keys(MISS).length}개 [SENT_MISSING]: ` +
  Object.entries(MISS).map(([k, v]) => `${k}(대본 ${v.n} · 덩어리 ${v.b}${v.at ? ' · ' + v.at.join('·') + '번째' : ' · 자리 못 정함'})`).join(' · '));

if (RETIRED_ROWS.length) console.log(`  · [RETIRED_OFF_SCREEN] 폐지한 자리 ${RETIRED_ROWS.length}개는 목록에서 뺐습니다(식장에서 안 납니다): ${RETIRED_ROWS.join(' · ')}`);
const missing = OLDC.filter((c) => !c.has && !c.mix);
if (missing.length) console.log(`  · 소리 없는 기존 클립 ${missing.length}개(합성/미녹음): ${missing.map((c) => c.id).join(' · ')}`);

/* ── ② 새 어조 63클립 ─────────────────────────────────────────────────────── */
const lines = fs.readFileSync(path.join(DIR, '더빙_한번에.txt'), 'utf8').split('\n').filter((l) => l.trim());
const sents = lines.map((l) => l.replace(/^[^:]*:\s*/, '').trim());
const voices = lines.map((l) => (l.match(/^([^:]*):/) || [, '우성'])[1].trim());
const ORDER = JSON.parse(fs.readFileSync(path.join(DIR, '더빙_한번에_순서.json'), 'utf8'));
const USE_EXISTING = '신랑 신부, 입장!';
const EXFROM = (slug) => { const m = /^entry-([A-F])\b/.exec(slug); if (!m) return '';
  return `${{ A: '05', B: '06', C: '07', D: '08', E: '09', F: '10' }[m[1]]}_entry-${m[1]}`; };
const NEWC = (PART && PART !== '어조' ? [] : ORDER.클립).map((c) => {
  const idx = []; for (let k = 0; k < c.문장수; k++) idx.push(c.시작줄 - 1 + k);
  return { slug: c.slug, ko: c.이름, 묶음: c.묶음, idx };
});
/* ★[LISTEN_SPLIT] 파트를 짚으면 어조는 뺀다 — 어조는 파트가 없어서, 안 빼면 **모든 파트 판에 딸려 온다.**
   실측으로 잡혔다: `--part 1_안내.txt` 인데 클립이 76개(어조 63 포함)로 나왔다. 12개여야 맞다.
   ★「어조」는 그 자체를 파트 이름처럼 짚어 따로 본다. */

/* 이미 녹음된 문장인지 — 견주기 힌트 */
const OLDSENT = new Map();
man.clips.forEach((c) => (c.sents || []).forEach((s) => {
  const k = String(s.text || '').trim(); if (k && !OLDSENT.has(k)) OLDSENT.set(k, `${c.no}_${c.file}`); }));

/* ── ③ 소리 심기 ─────────────────────────────────────────────────────────── */
const A_OLD = {}, A_NEW = {};
if (EMBED) {
  const tmp = fs.mkdtempSync('/tmp/la-');
  const enc = (src, key, bag, kbps) => {
    const o = path.join(tmp, key.replace(/[^\w.-]/g, '_') + '.mp3');
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-c:a', 'libmp3lame',
      '-b:a', kbps, '-ac', '1', '-ar', '22050', o]);
    if (r.status !== 0 || !fs.existsSync(o)) { no(`mp3 변환 실패: ${key}`); return; }
    bag[key] = fs.readFileSync(o).toString('base64');
  };
  OLDC.forEach((c) => { const s = srcOf({ no: c.no, file: c.id.replace(/^\d+_/, '') }); if (s) enc(s, c.id, A_OLD, KBPS); });
  if (fs.existsSync(STAGE)) {
    const ff = {};
    for (const f of fs.readdirSync(STAGE)) { const m = /^audio_(\d+)_/.exec(f); if (m) ff[+m[1]] = f; }
    for (const [i, f] of Object.entries(ff)) enc(path.join(STAGE, f), 'n' + i, A_NEW, KBPS);
    /* [USE_EXISTING] 입장 자리는 기존에서 잘라 온 것으로 덮는다 */
    let cut = 0;
    NEWC.forEach((c) => { const from = EXFROM(c.slug); if (!from) return;
      c.idx.forEach((i) => { if (sents[i] !== USE_EXISTING) return;
        const o = path.join(tmp, `ex_${i}.mp3`);
        const r = spawnSync('node', [path.join(ROOT, 'scripts/extract-existing-sent.mjs'),
          '--clip', from, '--sent', USE_EXISTING, '--out', o], { encoding: 'utf8' });
        if (r.status !== 0 || !fs.existsSync(o)) { no(`기존 소리 잘라내기 실패: ${c.slug}`); return; }
        A_NEW['n' + i] = fs.readFileSync(o).toString('base64'); cut++; }); });
    if (cut) console.log(`  [USE_EXISTING] 입장 ${cut}자리에 기존 녹음을 잘라 심었다`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const mb = (Object.values(A_OLD).join('').length + Object.values(A_NEW).join('').length) / 1048576;
  console.log(`소리 심음 — 기존 ${Object.keys(A_OLD).length}클립 · 새 ${Object.keys(A_NEW).length}문장 · base64 ${mb.toFixed(1)}MB`);
}

/* ── ④ 화면 데이터 ───────────────────────────────────────────────────────── */
const DATA = {
  old: OLDC.map((c) => ({ id: c.id, no: c.no, mi: c.mi, k: c.ko, p: PART_KO[c.part] || c.part || '기타',
    r: c.role, mix: c.mix, has: c.has, s: c.sents, b: BOUNDS[c.id] || null, short: SHORT[c.id] || 0, miss: MISS[c.id] || null })),
  neu: NEWC.map((c) => ({ s: c.slug, k: c.ko, g: c.묶음,
    n: c.idx.map((i) => ({ i, t: sents[i], v: voices[i], lock: sents[i] === USE_EXISTING,
      old: OLDSENT.get(sents[i]) || '' })) })),
  parts: PART_ORDER.map((p) => PART_KO[p]).filter(Boolean),
  /* ★[EXPORT_TRUTH] 화자 이름을 화면에서 지어내지 않는다 — manifest 가 정한 표를 그대로 싣는다.
     지어내면 `신랑|신부:` 같은, 타입캐스트에 없는 사람이 대본에 실린다(이 저장소가 겪은 사고). */
  voice: man.voice || {},
};
/* ★★[LISTEN_KEY_STAMP 2026-08-26 사용자 지적] 저장 열쇠에 **내용 지문**을 찍는다.
   사용자 원문: *"이미 전에 체크한것들이 그대로 저장되어있는데 왜그래? 지금 새로운것을 다시 테스트하는거아니야?"*
   ★무엇이 문제였나 — 열쇠가 `me_listen_all_v1` 고정 문자열이었다. 브라우저는 판이 바뀌어도
     같은 칸을 본다. 그래서 **옛 소리에 누른 판정이 새 소리 위에 그대로 앉는다.**
     실측: 재더빙 58클립을 갈아 끼운 판을 열었는데 「판정 478/483」이 이미 차 있었다.
   ★단순한 불편이 아니라 **기록이 거짓이 되는 것**이다 — 「좋아요」가 가리키는 소리가
     그 소리가 아니다. 이 저장소가 계속 싸워 온 병(적힌 것과 실물이 다르다)의 또 한 얼굴이다.
   ★지문에 무엇을 넣나 — «귀에 들리는 것을 정하는 것» 전부다:
     클립 id·글·녹음된 글(_recorded) · 어조 문장. 하나라도 바뀌면 열쇠가 바뀐다.
     반대로 아무것도 안 바뀌면 열쇠가 같아, 같은 판을 다시 열었을 때 판정이 살아 있다.
   ★열쇠를 화면에도 찍는다 — 두 판을 놓고 어느 것을 보고 있는지 사람이 알아야 한다. */
const STAMP = (() => {
  const h = createHash('sha1');
  /* 글 — 화면에 뜨는 문장 */
  h.update(JSON.stringify(OLDC.map((c) => [c.id, c.sents])));
  h.update(JSON.stringify(NEWC.map((c) => [c.slug, c.idx.map((i) => sents[i])])));
  /* 소리 — 파일 크기로 잰다. 다시 조립하면 반드시 바뀐다(실측: 84번이 174573 → 164781).
     ★바이트를 다 읽지 않는 이유는 27MB 를 매번 훑을 값이 없어서다. 크기가 같은데 내용만 다른
       재조립은 이론상 가능하니, 그때를 위해 _recorded.json 도 함께 넣는다(조립기가 매번 갱신한다). */
  for (const c of OLDC) { const f = srcOf({ no: c.no, file: c.id.replace(/^\d+_/, ''), dir: null });
    let sz = 0; try { sz = fs.statSync(f).size; } catch (e) {}
    h.update(c.id + ':' + sz + ';'); }
  for (const f of ['assets/audio/narration/_recorded.json', 'assets/audio/cast/_recorded.json'])
    { try { h.update(fs.readFileSync(path.join(ROOT, f))); } catch (e) {} }
  /* ★[STAMP_TONE 2026-08-26 실측] 어조 재료도 센다 — 안 세면 **어조 소리를 넣어도 열쇠가 그대로**다.
     실제로 그랬다: 어조 186개를 심었는데 지문이 9f7b3c6d 로 안 바뀌어, 옛 판정이 그대로 딸려 왔다.
     ★지문은 «귀에 들리는 것 전부»를 세야 한다. 기존 mp3 만 세고 어조를 빼면 반만 센 것이다.
       내가 만든 검사가 내가 만든 자리에서 새는 것을 실물로 확인하고 고친다. */
  try { for (const f of fs.readdirSync(STAGE).sort())
    h.update(f + ':' + fs.statSync(path.join(STAGE, f)).size + ';'); } catch (e) { h.update('no-stage;'); }
  return h.digest('hex').slice(0, 8);
})();
const oldSents = OLDC.reduce((a, c) => a + c.sents.length, 0);
const newSents = NEWC.reduce((a, c) => a + c.idx.length, 0);

/* ── ⑤ 화면 ─────────────────────────────────────────────────────────────── */
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>전체 실청 점검 · 기존 ${OLDC.length} + 어조 ${NEWC.length}클립 · Moment Edit</title>
<!-- [LISTEN_ALL] 자동생성물. 손으로 고치지 말 것 — scripts/build-listen-all.mjs 를 고치고 다시 뽑는다.
     ★목록은 manifest.json + 더빙_한번에* 에서 박았다. ★소리는 어디에도 안 올라간다. ★내부용. -->
<style>
:root{--bg:#FAFAF8;--bg2:#F5F3EF;--bg3:#EDEBE6;--text:#1C1B19;--sub:#5A554C;--light:#75705F;
--border:#DDD8D1;--gold:#B89A75;--gold-text:#7A5F37;--seal:#6B2A24;--green:#3B6E4F;--serif-ko:'Noto Serif KR',serif;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--serif-ko),system-ui,sans-serif;font-size:15px;line-height:1.7}
.wrap{max-width:820px;margin:0 auto;padding:18px 14px 120px}
@media (max-width:560px){.wrap{padding-bottom:170px}}
h1{font-size:19px;margin:0 0 4px}
.sub{color:var(--light);font-size:13px;margin:0 0 14px}
.note{font-size:12.5px;color:var(--light);background:var(--bg2);border-radius:9px;padding:10px 12px;margin:0 0 12px}
.bar{position:sticky;top:0;z-index:20;background:rgba(250,250,248,.97);backdrop-filter:blur(8px);
border-bottom:1px solid var(--border);padding:9px 0;margin:0 0 12px}
.pg{height:5px;background:var(--bg3);border-radius:99px;overflow:hidden;margin:6px 0}
.pg>i{display:block;height:100%;background:var(--gold);width:0;transition:width .25s}
.st{font-size:13px;color:var(--sub);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.tab{font:inherit;font-size:13px;padding:8px 12px;min-height:40px;border:1px solid var(--border);
background:#fff;border-radius:99px;cursor:pointer;color:var(--sub)}
.tab.on{background:#3A2D22;color:#fff;border-color:transparent}
.btn{font:inherit;font-size:14px;padding:9px 13px;min-height:44px;border:1px solid var(--border);
background:#fff;color:var(--text);border-radius:9px;cursor:pointer}
.btn.sm{font-size:13px;padding:7px 11px;min-height:40px}
.btn.on{background:var(--green);color:#fff;border-color:transparent}
.btn.re{background:var(--seal);color:#fff;border-color:transparent}
.btn.play{background:var(--bg2)}
.ph{font-size:12px;letter-spacing:.06em;color:var(--gold-text);margin:22px 0 8px;
border-top:1px solid var(--border);padding-top:14px;font-weight:600}
.ph:first-of-type{border-top:0;margin-top:6px}
.clip{border:1px solid var(--border);border-radius:12px;background:#fff;margin:0 0 10px;overflow:hidden}
.clip.done{opacity:.5}
.ch{display:flex;gap:9px;align-items:center;padding:11px 13px;background:var(--bg2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.ch .n{font-size:12px;color:var(--light);font-variant-numeric:tabular-nums}
.ch b{font-size:15px}
.tag{font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid var(--border);background:#fff;color:var(--light)}
.tag.re{background:#fdf1ef;color:var(--seal);border-color:#e8c9c4}
.tag.lock{background:#f2f5f2;color:var(--green);border-color:#cfe0d4}
.tag.new{background:#fdf7ec;color:var(--gold-text);border-color:#e8dcc4}
.sent{padding:10px 13px;border-top:1px solid var(--bg3);display:flex;gap:9px;align-items:flex-start;flex-wrap:wrap}
.sent .tx{flex:1 1 250px;min-width:0}
.sent .mi{font-size:12px;color:var(--light);margin-top:2px}
.sent.re{background:#fdf7f6}
.sent.lock{background:#f7faf8}
.ops{display:flex;gap:6px;flex-wrap:wrap}
.nosnd{font-size:12px;color:var(--light);white-space:nowrap;padding:0 8px}   /* [NO_SOUND_SAY] 소리가 없으면 죽은 「듣기」 대신 이 글을 낸다 — 눌러 봐야 아는 판을 만들지 않는다 */
.why{margin-top:8px;flex-basis:100%}
.why input{width:100%;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:9px 10px;font-family:inherit;box-sizing:border-box}
.why input:focus{border-color:var(--gold);outline:none}   /* [LISTEN_WHY] 「다시」에 이유 한 줄 — 이유가 없으면 다음 판이 같은 이유로 또 걸린다 */
.foot{position:fixed;left:0;right:0;bottom:0;background:rgba(250,250,248,.97);border-top:1px solid var(--border);
padding:9px 14px;display:flex;gap:9px;justify-content:center;flex-wrap:wrap;backdrop-filter:blur(8px);z-index:30}
textarea{width:100%;min-height:170px;font:13px/1.6 ui-monospace,Menlo,monospace;padding:10px;
border:1px solid var(--border);border-radius:9px;background:#fff}
.hide{display:none}
</style></head><body><div class="wrap">

<h1>전체 실청 점검</h1>
<p class="sub">[LISTEN_ALL] 지금 나가는 기존 <b>${OLDC.length}클립</b>(문장 ${oldSents}) + 새 어조 <b>${NEWC.length}클립</b>(문장 ${newSents})
&nbsp;·&nbsp; 예식 순서대로 늘어놓았습니다
&nbsp;·&nbsp; <b>판 ${STAMP}</b></p>
<p class="sub" style="color:var(--light)">[LISTEN_KEY_STAMP] 판정은 이 판(<b>${STAMP}</b>)에만 저장됩니다 &mdash; 소리나 글이 바뀌면 판이 달라져 <b>판정을 새로 받습니다</b>.<br>옛 소리에 누른 판정이 새 소리 위에 남아 있으면 그 기록은 거짓이 되기 때문입니다.</p>
${RETIRED_ROWS.length ? `<p class="sub" style="color:var(--light)">[RETIRED_OFF_SCREEN] 폐지한 자리 <b>${RETIRED_ROWS.length}개</b>는 목록에 없습니다 &mdash; 식장에서 나지 않습니다: ${RETIRED_ROWS.join(' · ')}<br>(파일은 남겨 둡니다 &mdash; 지우면 뒤 클립 번호가 전부 밀립니다)</p>` : ''}

<!-- ★★[JS_BLOCKED_SAY 2026-08-26 사용자 실물 두 번] 스크립트가 «아예 안 도는» 자리를 화면이 말한다.
     ★단서: 폰에서 목록도 탭도 안 뜨는데 **내가 넣은 오류 배너(window.onerror)까지 비어 있었다.**
       죽었으면 배너가 떴을 것이다. 즉 죽은 게 아니라 **시작을 못 한 것** — 무게가 아니라
       앱 내장 미리보기가 스크립트를 막는 것이다(정적 HTML 은 멀쩡히 그려졌다).
     ★그래서 이 글을 **정적 HTML 로 미리 박아 둔다.** 스크립트가 돌면 sayCanDo 가 덮어쓴다.
       안 돌면 이 글이 그대로 남아, 사람이 «고장»이 아니라 «여는 법»을 보게 된다.
     ★빈 화면은 아무것도 안 알려 준다. 안 도는 것을 안 돈다고 적는 것이 이 저장소의 규칙이다. -->
<div class="note" id="canDo">
  <b>이 화면이 이대로 멈춰 있으면, 지금 보고 계신 앱이 스크립트를 막은 것입니다.</b><br>
  판정 단추와 목록이 안 뜨고 이 글만 보이면 그 경우예요.<br>
  <b>브라우저로 열어 주세요</b> — 아이폰이면 아래 공유 단추 → 「파일에 저장」 → 파일 앱에서 열기,
  또는 사파리·크롬으로 여시면 됩니다.
</div>

<div class="note">
  <b>기존 클립</b>은 이미 예식에 나가는 완성본입니다 — 무음·음량까지 들어간 <b>실제로 들릴 소리</b>라 클립 통째로 들려 드립니다.<br>
  <b>새 어조</b>는 아직 조립 전이라 <b>문장 하나씩</b> 들립니다. 문장 사이 쉼은 조립할 때 숫자로 넣으니 여기서 판정하지 마세요.<br>
  고칠 것이 보이면 그 문장에 <b>「다시」</b>를 눌러 주세요. 누른 것만 모아 <b>재더빙 대본</b>이 나옵니다.
</div>

${EMBED ? `<div class="note" style="background:#f2f5f2;color:var(--green);border:1px solid #cfe0d4">
  <b>소리가 이 화면 안에 있습니다.</b> 바로 「듣기」를 누르세요.
</div>` : `<div class="note" style="background:#fdf7ec;color:var(--gold-text);border:1px solid #e8dcc4">
  이 판은 <b>소리가 없는 가벼운 판</b>입니다(목록·판정만). 소리까지 들으려면 <code>--embed</code> 로 뽑은 판을 쓰세요.
</div>`}

<div class="bar">
  <div class="pg"><i id="pgi"></i></div>
  <div class="st"><span id="stTxt"></span><span id="stRe" style="color:var(--seal)"></span>
    <label style="margin-left:auto"><input type="checkbox" id="onlyLeft"> 남은 것만</label>
    <label><input type="checkbox" id="onlyRe"> 다시만</label></div>
</div>
<div class="tabs" id="tabs"></div>
<div id="list"></div>

<div id="outWrap" class="hide" style="margin-top:18px">
  <p class="sub" style="margin:0 0 6px">타입캐스트에 통째로 붙여넣으세요. 받은 wav 는 폴더째 주시면 됩니다.</p>
  <textarea id="out" readonly></textarea>
</div>
</div>
<div class="foot">
  <button class="btn" id="mkOut">다시 받을 것 대본 만들기</button>
  <button class="btn" id="copyOut">복사</button>
  <button class="btn" id="reset">판정 지우기</button>
</div>
<!-- ★[SOUND_OUT_OF_JS] 소리는 여기 있다 — type="text/plain" 이라 브라우저가 **파싱하지 않는다.**
     누를 때 그 하나만 textContent 로 읽는다(위 sndOf). 이 블록을 지우면 판이 통째로 벙어리가 된다. -->
${EMBED ? Object.entries(A_OLD).map(([k, v]) => `<script type="text/plain" id="snd_${k}">${v}<\/script>`).join('\n')
        + '\n' + Object.entries(A_NEW).map(([k, v]) => `<script type="text/plain" id="snd_${k}">${v}<\/script>`).join('\n') : ''}
<script>
var D = ${JSON.stringify(DATA)};
/* ★★[SOUND_OUT_OF_JS 2026-08-26 사용자 실물 · 폰 스크린샷] 소리를 **자바스크립트 밖**에 둔다.
   ★무엇이 보였나 — 폰에서 「판정 N/M」도 탭도 목록도 안 뜨고, 안내 칸(#canDo)마저 빈 회색 막대였다.
     그 자리는 전부 스크립트가 채우는 곳이다. 즉 **스크립트가 시작조차 못 했다.**
     헤드리스 390px 에서는 멀쩡했으니 화면 폭이 아니라 **엔진/기기**다.
   ★왜 — «var AO = { … 6.5MB base64 … }» 는 브라우저가 **통째로 파싱해 문자열 300여 개를 만드는** 일이다.
     iOS 계열 내장 뷰어는 그 자리에서 죽는다. 죽으면 아무 말도 없이 화면이 빈다.
   ★그래서 소리를 «script type=text/plain» 에 담는다 — **브라우저가 파싱하지 않는 자리**다.
     그냥 텍스트 노드로 놓였다가, 누를 때 그 하나만 읽는다. 파싱 비용이 사라진다.
   ★소리를 줄이지 않았다 — 어조를 판정할 판인데 소리를 뭉개면 판정이 못 미더워진다.
     무게가 아니라 «어떻게 담느냐»가 문제였다. */
var AO = {}, AN = {};
var WEBSND = ${WEB ? 'true' : 'false'};   /* [LISTEN_WEB] */
/* [LISTEN_WEB] 배포된 mp3 주소표 — 파일에 소리를 안 담고 사이트에서 받아 온다.
   기존 클립은 assets/audio/{narration,cast}/ 에 이미 있다. 어조는 assets/audio/tone/ 에 넣는다. */
var SRCMAP = ${WEB ? JSON.stringify(Object.fromEntries([
  ...OLDC.filter((c) => c.has).map((c) => {
    const f = srcOf({ no: c.no, file: c.id.replace(/^\d+_/, '') });
    return [c.id, '/' + path.relative(ROOT, f).split(path.sep).join('/')];
  }),
  ...(fs.existsSync(STAGE) ? fs.readdirSync(STAGE).map((f) => {
    const m = /^audio_(\d+)_/.exec(f); return m ? ['n' + (+m[1]), '/assets/audio/tone/n' + (+m[1]) + '.mp3'] : null;
  }).filter(Boolean) : []),
])) : '{}'};
function sndOf(k) {
  if (WEBSND) return (SRCMAP[k] || '');          /* 주소로 부른다 — 배포된 mp3 를 그대로 */
  var e = document.getElementById('snd_' + k);
  return e ? 'data:audio/mpeg;base64,' + e.textContent.trim() : '';
}
var KEY = 'me_listen_all_${STAMP}';
/* [LISTEN_KEY_STAMP] 옛 열쇠(고정 문자열)에 판정이 남아 있으면 «있다»고 알린다 — 조용히 버리지 않는다.
   옮겨 주지도 않는다: 그 판정이 어느 소리에 대한 것인지 이 판은 모른다. */
try { var _old = localStorage.getItem('me_listen_all_v1');
  if (_old && _old.length > 2) console.log('[LISTEN_KEY_STAMP] 옛 판정이 브라우저에 남아 있습니다(me_listen_all_v1). 이 판은 소리가 달라 새로 받습니다.');
} catch (e) {}
var V = {}; try { V = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { V = {}; }
var save = function () { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch (e) {} };
/* ★★[LISTEN_WHY 2026-08-26 사용자 지시] 「다시」에 **이유 한 줄**을 받는다.
   사용자 원문: *"다시 하는 이유를 적어야 너한테전달했을때 너가 하나하나 파악해서 개선을하지"*
   ★이게 없으면 넘어오는 것은 «어느 문장을 다시 받아라»뿐이라, 무엇이 마음에 안 들었는지가 사라진다.
     받는 쪽은 같은 글을 다시 뽑을 수밖에 없고, 두 번째도 같은 이유로 걸린다.
   ★강제하지 않는다 — 비워도 넘어간다. 대신 대본에 「(이유 없음)」으로 실려 **눈에 보인다.**
   ★열쇠를 따로 둔다 — 「판정 지우기」로 판정을 비워도 적어 둔 이유는 남는다(다시 적게 하지 않는다). */
var WKEY = KEY + '_why';
var W = {}; try { W = JSON.parse(localStorage.getItem(WKEY) || '{}') || {}; } catch (e) { W = {}; }
var saveW = function () { try { localStorage.setItem(WKEY, JSON.stringify(W)); } catch (e) {} };
var $ = function (i) { return document.getElementById(i); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
var TAB = '전체';
var cur = null;
function stop() { if (cur) { try { cur.pause(); } catch (e) {} cur = null; } }
function play(u) { stop(); if (!u) { alert('그 자리 소리가 이 판에 없습니다.'); return; } var a = new Audio(u); cur = a; a.play(); }
/* [SENT_SEEK] 같은 클립을 그 구간만 — 소리를 더 넣지 않고 문장 하나를 들려준다 */
var segT = null;
function playSeg(id, a0, b0) {
  stop(); if (segT) { clearTimeout(segT); segT = null; }
  var u = sndOf(id); if (!u) { alert('그 클립 소리가 이 판에 없습니다.'); return; }   /* [SOUND_OUT_OF_JS] */
  var a = new Audio(u); cur = a;
  a.addEventListener('loadedmetadata', function () { a.currentTime = a0; a.play(); });
  a.addEventListener('timeupdate', function () { if (a.currentTime >= b0) { try { a.pause(); } catch (e) {} } });
  segT = setTimeout(function () { try { a.pause(); } catch (e) {} }, Math.max(300, (b0 - a0) * 1000 + 250));
}

/* 판정 키 — 기존은 "clipId#문장번호", 새 어조는 "n<번호>" */
function setV(k, val) { if (val) V[k] = val; else delete V[k]; save(); draw(); }

function counts() {
  var need = 0, done = 0, re = 0;
  D.old.forEach(function (c) { c.s.forEach(function (_t, j) { var k = c.id + '#' + j; need++; if (V[k]) done++; if (V[k] === 're') re++; }); });
  D.neu.forEach(function (c) { c.n.forEach(function (s) { if (s.lock) return; var k = 'n' + s.i; need++; if (V[k]) done++; if (V[k] === 're') re++; }); });
  return { need: need, done: done, re: re };
}

/* ★[NEW_TONE_PLAY 2026-08-16 CC 지적] 둘째 인자는 «주소»가 아니라 **「들을 수 있나」**다.
   내가 ops(k, null) 로만 불러서 **새 어조 174문장에 듣기 단추가 안 그려졌다**(소리는 AN 에 다 있었다).
   기존 클립 줄은 구간 재생이라 자기 자리에서 따로 단추를 그리므로 여기선 false 로 부른다.
   ★이름을 playUrl 로 둔 것이 화근이었다 — 「주소를 안 주면 못 튼다」로 읽혀 null 을 넣게 된다.
     canPlay 로 바꿔 «무엇을 묻는 인자인지»가 이름에 드러나게 한다. */
/* ★★[NO_SOUND_SAY 2026-08-26 사용자 지시 *"한번에해 … 중간에 또작업없이"*]
   소리가 없으면 「듣기」를 **내밀지 않는다.** 전에는 버튼이 그대로 있고 누르면
   「그 자리 소리가 이 판에 없습니다」 경고가 떴다 — 사람이 **눌러 보고서야** 알았다.
   186문장을 하나씩 눌러 확인하게 만드는 셈이라, 「한 번에」가 안 된다.
   ★그래서 있는지를 먼저 보고, 없으면 그 자리에 «소리 없음»이라고 적는다. */
function hasSnd(k) { return WEBSND ? !!SRCMAP[k] : !!document.getElementById('snd_' + k); }   /* [SOUND_OUT_OF_JS] */
/* [LISTEN_WHY] 「다시」일 때만 연다 — 안 고칠 자리에 빈 칸을 늘어놓으면 화면이 시끄럽다 */
function whyBox(k) {
  if (V[k] !== 're') return '';
  return '<div class="why"><input data-w="' + k + '" value="' + esc(W[k] || '')
    + '" placeholder="왜 다시 받나요? (예: 너무 딱딱해요 · 문장이 길어요 · 목소리가 안 맞아요)"></div>';
}
function ops(k, canPlay) {
  var v = V[k];
  var snd = canPlay && hasSnd(k);
  return '<div class="ops">'
    + (canPlay ? (snd ? '<button class="btn sm play" data-u="' + k + '">듣기</button>'
                      : '<span class="nosnd">소리 없음</span>') : '')
    + '<button class="btn sm' + (v === 'ok' ? ' on' : '') + '" data-v="ok" data-k="' + k + '">좋아요</button>'
    + '<button class="btn sm' + (v === 're' ? ' re' : '') + '" data-v="re" data-k="' + k + '">다시</button></div>';
}

function draw() {
  var c0 = counts();
  $('pgi').style.width = (c0.need ? c0.done / c0.need * 100 : 0) + '%';
  $('stTxt').textContent = '판정 ' + c0.done + ' / ' + c0.need;
  $('stRe').textContent = c0.re ? ('다시 ' + c0.re + '문장') : '';
  var tabs = ['전체'].concat(D.parts).concat(['새 어조']);
  $('tabs').innerHTML = tabs.map(function (t) { return '<button class="tab' + (t === TAB ? ' on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');

  var oL = $('onlyLeft').checked, oR = $('onlyRe').checked, h = '', lastP = '';
  if (TAB !== '새 어조') {
    D.old.forEach(function (c) {
      if (TAB !== '전체' && c.p !== TAB) return;
      var keys = c.s.map(function (_t, j) { return c.id + '#' + j; });
      var open = keys.filter(function (k) { return !V[k]; }).length;
      var re = keys.filter(function (k) { return V[k] === 're'; }).length;
      if (oL && !open) return; if (oR && !re) return;
      if (c.p !== lastP) { h += '<div class="ph">' + esc(c.p) + '</div>'; lastP = c.p; }
      h += '<div class="clip' + (open ? '' : ' done') + '"><div class="ch"><span class="n">' + esc(c.no) + '</span><b>' + esc(c.k) + '</b>'
        + '<span class="tag">' + esc(c.id) + '</span>' + (c.r ? '<span class="tag">' + esc(c.r) + '</span>' : '')
        + (re ? '<span class="tag re">다시 ' + re + '</span>' : '')
        + (c.short ? '<span class="tag re" title="말속도 ' + c.short + '음절/초 · 보통 6~7">★소리가 글보다 짧음</span>' : '')
        + (c.miss ? '<span class="tag re" title="대본 ' + c.miss.n + '문장인데 소리 덩어리는 ' + c.miss.b + '개 [SENT_MISSING]">★문장이 빠진 듯 — '
            + (c.miss.at ? c.miss.at.join('·') + '번째' : '자리 못 정함') + '</span>' : '')
        + (c.has ? '<button class="btn sm play" style="margin-left:auto" data-u="' + c.id + '">클립 듣기</button>'
                 : '<span class="tag" style="margin-left:auto">소리 없음</span>') + '</div>';
      c.s.forEach(function (t, j) {
        var k = c.id + '#' + j, v = V[k], bb = c.b && c.b[j];
        h += '<div class="sent' + (v === 're' ? ' re' : '') + '"><div class="tx"><div>' + esc(t) + '</div>'
          + (c.has && !bb ? '<div class="mi">문장별 듣기는 이 클립에서 자리를 못 정했어요 · 위 「클립 듣기」로 들어 주세요</div>' : '')
          + '</div><div class="ops">'
          + (bb ? '<button class="btn sm play" data-seek="' + c.id + '" data-a="' + bb[0] + '" data-b="' + bb[1] + '">듣기</button>' : '')
          + '<button class="btn sm' + (v === 'ok' ? ' on' : '') + '" data-v="ok" data-k="' + k + '">좋아요</button>'
          + '<button class="btn sm' + (v === 're' ? ' re' : '') + '" data-v="re" data-k="' + k + '">다시</button></div>'
          + whyBox(k) + '</div>';   /* [LISTEN_WHY] */
      });
      h += '</div>';
    });
  }
  if (TAB === '전체' || TAB === '새 어조') {
    var head = false;
    D.neu.forEach(function (c) {
      var keys = c.n.filter(function (s) { return !s.lock; }).map(function (s) { return 'n' + s.i; });
      var open = keys.filter(function (k) { return !V[k]; }).length;
      var re = keys.filter(function (k) { return V[k] === 're'; }).length;
      if (oL && !open) return; if (oR && !re) return;
      if (!head) { h += '<div class="ph">새 어조 (아직 예식에 안 나감 · 문장 단위)</div>'; head = true; }
      h += '<div class="clip' + (open ? '' : ' done') + '"><div class="ch"><b>' + esc(c.k || c.s) + '</b>'
        + '<span class="tag new">' + esc(c.s) + '</span>'
        + (re ? '<span class="tag re">다시 ' + re + '</span>' : '') + '</div>';
      c.n.forEach(function (s) {
        var k = 'n' + s.i, v = V[k];
        h += '<div class="sent' + (s.lock ? ' lock' : (v === 're' ? ' re' : '')) + '"><div class="tx"><div>' + esc(s.t) + '</div>'
          + '<div class="mi">' + esc(s.v) + (s.lock ? ' · <b style="color:var(--green)">기존 녹음을 씁니다(판정 안 함)</b>'
              : (s.old ? (' · 기존에도 있음 · ' + esc(s.old)) : '')) + '</div></div>'
          + (s.lock ? ('<div class="ops">' + (hasSnd(k) ? '<button class="btn sm play" data-u="' + k + '">듣기</button>' : '<span class="nosnd">소리 없음</span>') + '</div>') : ops(k, true))
          + (s.lock ? '' : whyBox(k)) + '</div>';   /* [LISTEN_WHY] */
      });
      h += '</div>';
    });
  }
  $('list').innerHTML = h || '<p class="sub">해당하는 것이 없습니다.</p>';
}

/* ★★[NO_SOUND_SAY] 「이 판으로 무엇이 되나」를 **세어서** 맨 위에 적는다.
   ★숫자를 손으로 적지 않는다 — 판마다 달라지고, 손으로 적은 수는 언젠가 실물과 어긋난다.
   ★사용자 지시가 «한 번에, 중간에 또 작업 없이»다. 그러려면 시작 전에 전부 알아야 한다. */
function sayCanDo() {
  var oldOK = 0, oldNo = 0, warn = [];
  /* ★[SOUND_OUT_OF_JS] 세는 자리도 새 저장소를 본다 — 안 고쳤더니 「기존 0클립」으로 나왔다.
     구조를 바꾸면 «그 구조를 세던 곳»도 같이 바꿔야 한다. 실측으로 잡았다. */
  D.old.forEach(function (c) { if (hasSnd(c.id)) oldOK++; else oldNo++;
    if (c.miss) warn.push(c.id); });
  var nTot = 0, nOK = 0;
  D.neu.forEach(function (c) { c.n.forEach(function (x) { nTot++; if (hasSnd('n' + x.i)) nOK++; }); });
  var seg = D.old.filter(function (c) { return c.b; }).length;
  var h = '<b>이 판으로 지금 할 수 있는 것</b><br>'
    + '· 기존 나레이션·배역 <b>' + oldOK + '클립</b> — 소리가 다 들어 있습니다. 문장 단위로 건너뛰며 듣기 <b>' + seg + '클립</b>.<br>';
  if (oldNo) h += '· 기존 클립 중 <b>' + oldNo + '개</b>는 이 판에 소리가 없습니다.<br>';
  h += '<b>이 판으로 못 하는 것</b><br>';
  if (nOK < nTot) h += '· 새 어조 <b>' + (nTot - nOK) + '문장</b>은 <b>소리가 없습니다</b> — 글만 보실 수 있고, 「소리 없음」이라 적어 두었습니다.<br>'
    + '&nbsp;&nbsp;조립 전 재료라 이 저장소에 없습니다. 어조까지 들으려면 그 재료를 가진 판이 따로 필요합니다.<br>';
  h += '· 「손으로 고르는·폴백·폐지」로 표시된 자리는 <b>식장에서 나지 않습니다</b> — 소리가 옛 말이어도 정상이니 판정하지 마세요.';
  var e = $('canDo'); if (e) e.innerHTML = h;
}
/* ★★[SHOW_THE_CRASH 2026-08-26 사용자 실물] 죽으면 **화면이 말한다.**
   ★이번에 폰에서 빈 화면이 나왔다. 탭도 목록도 안내 칸도 비어 있었다 — 스크립트가 시작을 못 한 것인데
     화면에는 아무 말이 없어, 사용자가 「안 나온다」고 알려 줄 때까지 아무도 몰랐다.
   ★조용한 실패는 실패가 아니다(이 저장소가 계속 싸운 그것). 무엇이 죽었는지 적어야 다음 판이 나아진다. */
window.addEventListener('error', function (e) {
  var el = document.getElementById('canDo'); if (!el || el.dataset.crashed) return;
  el.dataset.crashed = '1';
  el.innerHTML = '<b>이 판이 이 기기에서 안 열립니다.</b><br>' +
    '아래 글을 그대로 알려 주시면 고칠 수 있습니다 — 기기·브라우저도 함께요.<br>' +
    '<code style="font-size:12px;word-break:break-all">' +
    String((e && (e.message || e.error)) || '알 수 없음').slice(0, 200) + '</code>';
});
sayCanDo();

$('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { TAB = b.dataset.t; draw(); window.scrollTo(0, 0); } });
$('list').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.seek) return playSeg(b.dataset.seek, +b.dataset.a, +b.dataset.b);
  if (b.dataset.u != null) { return play(sndOf(b.dataset.u)); }   /* [SOUND_OUT_OF_JS] 누를 때 그 하나만 읽는다 */
  if (b.dataset.v) { var k = b.dataset.k; setV(k, V[k] === b.dataset.v ? null : b.dataset.v); }
});
$('onlyLeft').onchange = draw; $('onlyRe').onchange = draw;
$('mkOut').onclick = function () {
  var out = [];
  var bad = [];
  /* [EXPORT_MAN_ORDER] 화면은 예식 순서지만 **대본은 대장 배열 차례(mi)**로 낸다 —
     조립기가 그 차례로 자리를 매기기 때문이다. 여기서 안 세우면 받은 wav 가 서로의 자리에 붙는다. */
  var picked = [];
  D.old.forEach(function (c) { c.s.forEach(function (t, j) {
    if (V[c.id + '#' + j] !== 're') return;
    var vn = D.voice[c.r];                       /* [EXPORT_TRUTH] manifest 표에서만 가져온다 */
    if (!vn) { bad.push(c.id + ' (' + (c.r || '역할없음') + ')'); return; }
    picked.push({ mi: c.mi, j: j, line: vn + ': ' + t,
      why: '왜 다시: ' + (W[c.id + '#' + j] || '(이유 없음)') }); }); });   /* [LISTEN_WHY] */
  picked.sort(function (a, b) { return (a.mi - b.mi) || (a.j - b.j); });
  picked.forEach(function (x) { out.push(x.line); if (x.why) out.push('# ' + x.why); });
  if (bad.length) alert('화자를 못 정한 클립이 있어 대본에서 뺐습니다:\\n' + bad.join('\\n') + '\\n\\n(합창처럼 여럿이 말하는 자리입니다 · 따로 알려 주세요)');
  D.neu.forEach(function (c) { c.n.forEach(function (s) { if (V['n' + s.i] !== 're') return;
    out.push(s.v + ': ' + s.t);
    out.push('# 왜 다시: ' + (W['n' + s.i] || '(이유 없음)')); }); });   /* [LISTEN_WHY] */
  $('outWrap').className = out.length ? '' : 'hide';
  $('out').value = out.join('\\n') + (out.length ? '\\n' : '');
  if (!out.length) alert('「다시」로 표시한 문장이 없습니다.'); else $('outWrap').scrollIntoView({ behavior: 'smooth' });
};
/* ★[LISTEN_WHY] 글칸은 **다시 그리지 않는다** — 입력 중 repaint 하면 커서가 튀고 글이 날아간다
   (이 저장소가 마이페이지 글칸에서 겪은 것과 같은 병). 값만 담는다. */
$('list').addEventListener('input', function (e) {
  var t = e.target; if (!t || !t.dataset || t.dataset.w == null) return;
  var k = t.dataset.w; if (t.value.trim()) W[k] = t.value.trim(); else delete W[k]; saveW();
});
/* ★★[COPY_MOBILE 2026-08-26] 폰에서도 복사가 되게 — 새 길을 먼저, 안 되면 옛 길로 내려앉는다.
   ★실측(iPhone 13 에뮬레이션·터치): 탭·이유 입력·대본 생성·execCommand 전부 됐다.
     그런데 그 에뮬레이션은 Chromium 이다 — **iOS Safari 실물은 여기서 못 잰다.**
     Safari 는 readonly textarea 의 select() 가 먹지 않는 경우가 있고 execCommand 는 폐기 예정이다.
   ★못 재는 자리에 «되겠지»를 두지 않는다. navigator.clipboard 를 먼저 쓰고, 실패하면 옛 길로 간다.
   ★두 길 다 실패하면 «복사했다»고 말하지 않는다 — 손으로 긁으시라고 적는다.
     안 된 것을 됐다고 하면, 사람은 붙여넣기가 빌 때까지 모른다. */
$('copyOut').onclick = function () {
  var o = $('out'); if (!o.value) { alert('먼저 대본을 만들어 주세요.'); return; }
  var done = function () { alert('복사했습니다.'); };
  var fallback = function () {
    try { o.removeAttribute('readonly'); o.focus(); o.setSelectionRange(0, o.value.length);
      var ok = document.execCommand('copy'); o.setAttribute('readonly', '');
      if (ok) return done();
    } catch (e) {}
    alert('복사가 막혔습니다 — 아래 칸의 글을 길게 눌러 직접 복사해 주세요.');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(o.value).then(done, fallback);
  } else fallback();
};
$('reset').onclick = function () { if (confirm('판정을 전부 지울까요?')) { V = {}; save(); draw(); } };
draw();
</script></body></html>
`;

console.log(`전체 실청 — 기존 ${OLDC.length}클립(문장 ${oldSents}) + 어조 ${NEWC.length}클립(문장 ${newSents})`);

/* ★[SELF_PARSE 2026-08-15] 뽑은 화면의 **스크립트가 실제로 파싱되는지** 여기서 본다.
   13MB 짜리를 눈으로 훑을 수 없고, 한 글자 어긋나면 화면이 통째로 백지가 된다.
   실제로 겪었다 — 파이썬으로 문자열을 갈아 끼우다 `\n` 이스케이프가 한 단계 덜 먹어
   alert 문자열 안에 진짜 줄바꿈이 들어갔고, SyntaxError 로 판정 화면이 하나도 안 떴다.
   ★「만들었다」와 「돈다」는 다른 말이다. 만든 자리에서 돌려 본다. */
{
  const i = html.lastIndexOf('<script>'), j = html.lastIndexOf('</script>');
  if (i < 0 || j < 0) no('script 태그를 못 찾았다');
  else {
    const tmpf = path.join('/tmp', 'listen-all-selfcheck.js');
    fs.writeFileSync(tmpf, html.slice(i + 8, j));
    const r = spawnSync(process.execPath, ['--check', tmpf], { encoding: 'utf8' });
    fs.rmSync(tmpf, { force: true });
    if (r.status !== 0) no('뽑은 화면의 스크립트가 문법 오류다 — 열어도 백지다\n' + String(r.stderr || '').split('\n').slice(0, 4).join('\n'));
    else console.log('  자가검사 ok — 스크립트가 파싱된다');
  }
}

if (!bad) { fs.writeFileSync(OUT, html); console.log(`  썼다: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(1)}MB)`); }
console.log(bad ? `틀림 ${bad}건` : '전체 실청 OK');
process.exit(bad ? 1 : 0);
