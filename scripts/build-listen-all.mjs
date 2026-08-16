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
import { sentBounds, durOf } from './lib/sent-bounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const STAGE = path.join(ROOT, '_dub_stage');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', ''), EMBED = process.argv.includes('--embed');
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

/* ★★[EXPORT_MAN_ORDER 2026-08-16] 화면 차례와 **대본 차례는 다르다.**
   화면은 예식 순서(파트 → 클립 번호)로 보는 것이 편하다 — 사람이 식 흐름대로 듣기 때문이다.
   그런데 「다시」로 모은 **대본**은 그대로 타입캐스트에 붙여 넣고, 받은 wav 를 조립기에 준다.
   조립기(assemble-narration)는 `man.clips.filter(...)` — **대장 배열 차례**로 자리를 매긴다.
   둘이 갈리는 자리가 실제로 있다: 6_예식뒤 에서 no=80(배열 54번째) 이 no=63(배열 68번째) 보다 앞이다.
   ★그래서 대장 배열 차례(mi)를 클립마다 들고 다니다가, 대본을 낼 때만 그것으로 다시 세운다.
     화면은 그대로 예식 순서다 — 보는 차례와 붙이는 차례는 쓰임이 다르니 따로 둔다.
   ★이 저장소가 같은 병을 두 번 앓았다(--redub 의 클립번호 정렬 · 여기). 고치는 자리도 하나로 맞춘다. */
const OLDC = man.clips.map((c, mi) => ({ c, mi }))
  .sort((a, b) => (PART_ORDER.indexOf(a.c.part) - PART_ORDER.indexOf(b.c.part)) || (+a.c.no - +b.c.no))
  .map(({ c, mi }) => ({ id: `${c.no}_${c.file}`, no: c.no, mi, ko: c.label || c.file, part: c.part,
    role: c.role || '', mix: !!c.mix, has: !!srcOf(c),
    sents: (c.sents || []).map((s) => String(s.text || '').trim()).filter(Boolean) }));
/* ★[SENT_SEEK 2026-08-16 사용자 지적 "아래쪽 대사는 나레이션이 안 입혀졌나 오디오가 안 들리는데?"]
   기존 클립은 「클립 듣기」만 있고 문장별 듣기가 없었다. 눌러 볼 것이 없으니 «안 입혀진» 것처럼 보인다.
   ★소리를 더 넣지 않는다 — 같은 클립을 **그 구간만** 재생하면 된다(currentTime 으로 건너뛰고 끝에서 멈춘다).
     문장 wav 를 따로 잘라 넣으면 파일이 두 배가 되는데, 들리는 소리는 똑같다.
   ★경계는 [GAP_MATCH] 단일 구현(lib/sent-bounds.mjs)에서 받는다. 못 정하면 null →
     그 클립만 문장별 듣기를 안 붙이고 **왜 없는지 화면에 적는다**(조용히 빠지면 또 「안 들린다」가 된다). */
const BOUNDS = {}, SHORT = {};
let bOk = 0, bNo = 0;
/* ★[TOO_SHORT 2026-08-16] 소리가 글보다 짧은 클립을 표시한다.
   실측: 전 클립 말속도 중앙값 **초당 6.8음절**인데 11_narr-welcome-in 은 **14.3**이다.
   한국어는 빨라야 8~9음절/초라 그 속도로는 그 글을 다 읽을 수 없다 — 글과 소리가 어긋났을 수 있다.
   ★나는 소리를 못 듣는다. 그래서 «틀렸다»고 하지 않고 **「먼저 들어 보라」고 띄운다.**
     판정은 귀가 한다. 기계는 어디부터 들을지만 짚어 준다. */
const sylOf = (t) => (String(t).match(/[가-힣]/g) || []).length;
man.clips.forEach((c) => {
  const id = `${c.no}_${c.file}`, f = srcOf(c);
  if (!f || !(c.sents || []).length) return;
  const b = sentBounds(f, c.sents);
  if (b && b.length === c.sents.length) { BOUNDS[id] = b; bOk++; } else bNo++;
  const d = durOf(f), sy = c.sents.reduce((a, x) => a + sylOf(x.text), 0);
  if (isFinite(d) && d > 0 && sy >= 6 && sy / d > 8.5) SHORT[id] = +(sy / d).toFixed(1);
});
console.log(`  문장 구간 — 찾음 ${bOk}클립 · 못 정함 ${bNo}클립(그 클립은 통째로만 듣는다)`);
if (Object.keys(SHORT).length) console.log(`  ★소리가 글보다 짧은 클립 ${Object.keys(SHORT).length}개: ` +
  Object.entries(SHORT).map(([k, v]) => `${k}(${v}음절/초)`).join(' · '));

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
const NEWC = ORDER.클립.map((c) => {
  const idx = []; for (let k = 0; k < c.문장수; k++) idx.push(c.시작줄 - 1 + k);
  return { slug: c.slug, ko: c.이름, 묶음: c.묶음, idx };
});

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
      '-b:a', kbps, '-ac', '1', '-ar', '32000', o]);
    if (r.status !== 0 || !fs.existsSync(o)) { no(`mp3 변환 실패: ${key}`); return; }
    bag[key] = fs.readFileSync(o).toString('base64');
  };
  OLDC.forEach((c) => { const s = srcOf({ no: c.no, file: c.id.replace(/^\d+_/, '') }); if (s) enc(s, c.id, A_OLD, '48k'); });
  if (fs.existsSync(STAGE)) {
    const ff = {};
    for (const f of fs.readdirSync(STAGE)) { const m = /^audio_(\d+)_/.exec(f); if (m) ff[+m[1]] = f; }
    for (const [i, f] of Object.entries(ff)) enc(path.join(STAGE, f), 'n' + i, A_NEW, '48k');
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
    r: c.role, mix: c.mix, has: c.has, s: c.sents, b: BOUNDS[c.id] || null, short: SHORT[c.id] || 0 })),
  neu: NEWC.map((c) => ({ s: c.slug, k: c.ko, g: c.묶음,
    n: c.idx.map((i) => ({ i, t: sents[i], v: voices[i], lock: sents[i] === USE_EXISTING,
      old: OLDSENT.get(sents[i]) || '' })) })),
  parts: PART_ORDER.map((p) => PART_KO[p]).filter(Boolean),
  /* ★[EXPORT_TRUTH] 화자 이름을 화면에서 지어내지 않는다 — manifest 가 정한 표를 그대로 싣는다.
     지어내면 `신랑|신부:` 같은, 타입캐스트에 없는 사람이 대본에 실린다(이 저장소가 겪은 사고). */
  voice: man.voice || {},
};
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
.foot{position:fixed;left:0;right:0;bottom:0;background:rgba(250,250,248,.97);border-top:1px solid var(--border);
padding:9px 14px;display:flex;gap:9px;justify-content:center;flex-wrap:wrap;backdrop-filter:blur(8px);z-index:30}
textarea{width:100%;min-height:170px;font:13px/1.6 ui-monospace,Menlo,monospace;padding:10px;
border:1px solid var(--border);border-radius:9px;background:#fff}
.hide{display:none}
</style></head><body><div class="wrap">

<h1>전체 실청 점검</h1>
<p class="sub">[LISTEN_ALL] 지금 나가는 기존 <b>${OLDC.length}클립</b>(문장 ${oldSents}) + 새 어조 <b>${NEWC.length}클립</b>(문장 ${newSents})
&nbsp;·&nbsp; 예식 순서대로 늘어놓았습니다</p>

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
<script>
var D = ${JSON.stringify(DATA)};
var AO = ${EMBED ? JSON.stringify(Object.fromEntries(Object.entries(A_OLD).map(([k, v]) => [k, 'data:audio/mpeg;base64,' + v]))) : '{}'};
var AN = ${EMBED ? JSON.stringify(Object.fromEntries(Object.entries(A_NEW).map(([k, v]) => [k, 'data:audio/mpeg;base64,' + v]))) : '{}'};
var KEY = 'me_listen_all_v1';
var V = {}; try { V = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { V = {}; }
var save = function () { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch (e) {} };
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
  var u = AO[id]; if (!u) { alert('그 클립 소리가 이 판에 없습니다.'); return; }
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
function ops(k, canPlay) {
  var v = V[k];
  return '<div class="ops">'
    + (canPlay ? '<button class="btn sm play" data-u="' + k + '">듣기</button>' : '')
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
        + (c.has ? '<button class="btn sm play" style="margin-left:auto" data-u="' + c.id + '">클립 듣기</button>'
                 : '<span class="tag" style="margin-left:auto">소리 없음</span>') + '</div>';
      c.s.forEach(function (t, j) {
        var k = c.id + '#' + j, v = V[k], bb = c.b && c.b[j];
        h += '<div class="sent' + (v === 're' ? ' re' : '') + '"><div class="tx"><div>' + esc(t) + '</div>'
          + (c.has && !bb ? '<div class="mi">문장별 듣기는 이 클립에서 자리를 못 정했어요 · 위 「클립 듣기」로 들어 주세요</div>' : '')
          + '</div><div class="ops">'
          + (bb ? '<button class="btn sm play" data-seek="' + c.id + '" data-a="' + bb[0] + '" data-b="' + bb[1] + '">듣기</button>' : '')
          + '<button class="btn sm' + (v === 'ok' ? ' on' : '') + '" data-v="ok" data-k="' + k + '">좋아요</button>'
          + '<button class="btn sm' + (v === 're' ? ' re' : '') + '" data-v="re" data-k="' + k + '">다시</button></div></div>';
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
          + (s.lock ? '<div class="ops"><button class="btn sm play" data-u="' + k + '">듣기</button></div>' : ops(k, true))
          + '</div>';
      });
      h += '</div>';
    });
  }
  $('list').innerHTML = h || '<p class="sub">해당하는 것이 없습니다.</p>';
}

$('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { TAB = b.dataset.t; draw(); window.scrollTo(0, 0); } });
$('list').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.seek) return playSeg(b.dataset.seek, +b.dataset.a, +b.dataset.b);
  if (b.dataset.u != null) { var u = b.dataset.u; return play(u.charAt(0) === 'n' && AN[u] ? AN[u] : AO[u]); }
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
    picked.push({ mi: c.mi, j: j, line: vn + ': ' + t }); }); });
  picked.sort(function (a, b) { return (a.mi - b.mi) || (a.j - b.j); });
  picked.forEach(function (x) { out.push(x.line); });
  if (bad.length) alert('화자를 못 정한 클립이 있어 대본에서 뺐습니다:\\n' + bad.join('\\n') + '\\n\\n(합창처럼 여럿이 말하는 자리입니다 · 따로 알려 주세요)');
  D.neu.forEach(function (c) { c.n.forEach(function (s) { if (V['n' + s.i] === 're') out.push(s.v + ': ' + s.t); }); });
  $('outWrap').className = out.length ? '' : 'hide';
  $('out').value = out.join('\\n') + (out.length ? '\\n' : '');
  if (!out.length) alert('「다시」로 표시한 문장이 없습니다.'); else $('outWrap').scrollIntoView({ behavior: 'smooth' });
};
$('copyOut').onclick = function () { var o = $('out'); if (!o.value) { alert('먼저 대본을 만들어 주세요.'); return; }
  o.select(); try { document.execCommand('copy'); alert('복사했습니다.'); } catch (e) {} };
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
