// 어조 60벌 + 재더빙 3클립 **실청 점검** 화면을 뽑는다 [LISTEN_TONE]
//
//   node scripts/build-listen-tone.mjs           대조만 (파일 안 씀)
//   node scripts/build-listen-tone.mjs --write   audio-review-tone.html 을 쓴다
//
// ★왜 기존 audio-review.html 을 못 쓰나
//   그 화면은 `manifest.json` + `_recorded.json` 을 읽어 **이미 조립된 mp3** 를 튼다.
//   어조 60벌은 아직 manifest 에 없고(엔진 배선이 남았다) 조립도 안 됐다.
//   배선을 기다리면 사람이 더빙을 끝내 놓고 몇 시간을 논다 — 그건 순서가 틀렸다.
//   **소리는 이미 손에 있다.** 그러니 조립 전에, 문장 wav 그대로 듣고 판정한다.
//   여기서 잡히는 것(어색한 억양·틀린 강세·다른 발음)은 조립과 무관하게 재더빙 대상이다.
//
// ★조립을 여기서 하지 않는다 [ONE_SPEC]
//   무음 넣기·정규화·붙이기는 `assemble-narration.mjs` 몫이다. 여기서 또 하면 규격이 둘이 된다.
//   화면은 **재생할 때만** 문장 사이에 쉼을 준다(브라우저 타이머 · 저장되는 산출물이 아니다).
//   그래서 이 화면의 쉼은 «참고»지 «정본»이 아니고, 그 사실을 화면에도 적는다.
//
// ★목록을 손으로 적지 않는다
//   원천은 `더빙_한번에.txt` + `더빙_한번에_순서.json` 이다. 여기서 읽어 박는다.
//   다만 **한 파일로 박는다** — 사람이 서버 없이 두 번 클릭으로 열어야 하기 때문이다
//   (file:// 에서는 옆 파일 fetch 가 막힌다). 박은 것이 낡지 않게 두 가지를 건다:
//     ① 화면 첫 줄이 스스로 클립·문장 수를 말한다 [LISTEN_TONE_SELFID]
//     ② 인자 없이 돌리면 커밋된 html 을 지금 생성물과 **대조**한다(build-tone-dub 과 같은 규칙)
//
// ★소리는 올리지 않는다 — 44MB 다. 화면이 **폴더를 고르게** 한다(webkitdirectory · 업로드 없음).
//   파일은 브라우저 안에서만 열리고 아무데도 안 나간다.
//
// ★[USE_EXISTING] 「신랑 신부, 입장!」 12자리는 판정 대상이 아니다 (2026-08-15 사용자 지시)
//   기존 녹음을 쓰기로 했으므로 새 take 를 듣고 고칠 이유가 없다. 잠가서 보여만 준다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함(ffprobe 없음)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const STAGE = path.join(ROOT, '_dub_stage');
const OUT = path.join(ROOT, 'audio-review-tone.html');
const WRITE = process.argv.includes('--write');

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };

/* ── 원천 ─────────────────────────────────────────────────────────────────── */
const PASTE = path.join(DIR, '더빙_한번에.txt');
const ORDERP = path.join(DIR, '더빙_한번에_순서.json');
if (!fs.existsSync(PASTE) || !fs.existsSync(ORDERP)) die('더빙_한번에* 가 없다 — build-dub-onefile.mjs --write 먼저', 2);
const lines = fs.readFileSync(PASTE, 'utf8').split('\n').filter((l) => l.trim());
const sents = lines.map((l) => l.replace(/^[^:]*:\s*/, '').trim());
const voices = lines.map((l) => (l.match(/^([^:]*):/) || [, '우성'])[1].trim());
const ORDER = JSON.parse(fs.readFileSync(ORDERP, 'utf8'));
if (ORDER.총문장 !== sents.length) no(`순서.json(${ORDER.총문장})과 붙여넣기(${sents.length})가 어긋난다`);

const USE_EXISTING = '신랑 신부, 입장!';

/* ── 소리 실측 — 있으면 우선 청취 표시에 쓴다(없어도 화면은 나온다) ─────────── */
const meas = {};
if (fs.existsSync(STAGE)) {
  const files = {};
  for (const f of fs.readdirSync(STAGE)) { const m = /^audio_(\d+)_/.exec(f); if (m) files[+m[1]] = f; }
  const n = Object.keys(files).length;
  if (n) {
    if (spawnSync('ffprobe', ['-version']).error) die('ffprobe 가 없다 — 실측 없이 화면만 뽑으려면 _dub_stage 를 비울 것', 2);
    for (const [i, f] of Object.entries(files)) {
      const p = path.join(STAGE, f);
      const d = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], { encoding: 'utf8' }).stdout);
      const r = spawnSync('ffmpeg', ['-hide_banner', '-i', p, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'], { encoding: 'utf8' });
      const seg = []; let cur = null;
      for (const m of (r.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
        if (m[1] === 'start') cur = parseFloat(m[2]); else if (cur !== null) { seg.push([cur, parseFloat(m[2])]); cur = null; } }
      if (cur !== null) seg.push([cur, d]);
      const head = (seg.length && seg[0][0] <= 0.03) ? seg[0][1] : 0;
      const tail = (seg.length && seg[seg.length - 1][1] >= d - 0.05) ? d - seg[seg.length - 1][0] : 0;
      const inner = seg.filter(([s, e]) => s > 0.03 && e < d - 0.05).reduce((a, [s, e]) => Math.max(a, e - s), 0);
      meas[i] = { d: +d.toFixed(2), h: +head.toFixed(2), t: +tail.toFixed(2), i: +inner.toFixed(2) };
    }
    console.log(`실측 ${n}개 (ffprobe)`);
  }
}

/* ── 우선 청취 표시 — 기계가 「여기부터 들어 보라」고 짚어 준다 ────────────────
   ★[COMPARE_OLD 2026-08-15] 1차 자는 음절수 대비 속도(402음절/분)만 봤고, 그게 오해를 낳았다.
     「하나, 둘, 셋.」 셋을 «느림»이라 찍었는데 — 기존 녹음(78_fx-count)은 **4.82초**에
     사이 쉼 0.45초씩이고 새 take 는 **1.65초**다. 즉 실제로는 «훨씬 빠르다».
     산문 기준 자로 세는 말을 재면 답이 뒤집힌다. 사진 카운트다운은 사람이 반응할 틈이 필요하다.
   ★그래서 자를 바꾼다 — **이미 녹음된 문장인지**를 먼저 말한다. 48문장이 그렇다(2바퀴 실측).
     그 자리는 「기존과 결이 맞는가」를 귀로 견주는 것이 음절 산수보다 훨씬 정확하다.
     속도 힌트는 남기되 «판정»이 아니라 «길이»로만 적는다 — 소리를 못 듣는 내가 넘볼 선이 아니다. */
const OLD = new Map();
try {
  const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
  man.clips.forEach((c) => (c.sents || []).forEach((s) => {
    const k = String(s.text || '').trim(); if (!k) return;
    if (!OLD.has(k)) OLD.set(k, `${c.no}_${c.file}`);
  }));
} catch (e) { console.log('  · manifest 를 못 읽어 기존 대조는 생략(화면은 나온다)'); }

const SPS = 60 / 402;
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const flagOf = (i) => {
  const old = OLD.get(sents[i]);
  if (old) return '기존에도 있음 · ' + old;              // ★가장 센 힌트를 앞에
  const m = meas[i]; if (!m) return '';
  const want = syl(sents[i]) * SPS, spoken = m.d - m.h - m.t;
  if (want < 0.3) return '';
  if (spoken > want * 1.6 || spoken < want * 0.62) return `길이 ${spoken.toFixed(1)}s (또래 ${want.toFixed(1)}s)`;
  if (m.i > 0.45) return `안쪽 쉼 ${m.i}s`;
  if (m.h > 0.6) return `앞 무음 ${m.h}s`;
  return '';
};

/* ── 클립 묶음 ────────────────────────────────────────────────────────────── */
const clips = ORDER.클립.map((c) => {
  const idx = []; for (let k = 0; k < c.문장수; k++) idx.push(c.시작줄 - 1 + k);
  return { slug: c.slug, ko: c.이름, 묶음: c.묶음, idx };
});
const DATA = {
  clips: clips.map((c) => ({ s: c.slug, k: c.ko, g: c.묶음,
    n: c.idx.map((i) => ({ i, t: sents[i], v: voices[i], f: flagOf(i), lock: sents[i] === USE_EXISTING, m: meas[i] || null })) })),
  총클립: clips.length, 총문장: sents.length,
  잠금: sents.filter((s) => s === USE_EXISTING).length,
  실측: Object.keys(meas).length,
};
const flagged = clips.flatMap((c) => c.idx).filter((i) => flagOf(i) && sents[i] !== USE_EXISTING).length;

/* ── 화면 ─────────────────────────────────────────────────────────────────── */
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>어조 ${DATA.총클립}클립 실청 점검 · Moment Edit</title>
<!--
  [LISTEN_TONE] 자동생성물이다. 손으로 고치지 말 것 —
  고칠 것이 있으면 scripts/build-listen-tone.mjs 를 고치고 --write 로 다시 뽑는다.
  ★목록은 더빙_한번에.txt + _순서.json 에서 박았다. 낡았는지는 인자 없는 실행이 대조한다.
  ★소리는 어디에도 안 올라간다 — 브라우저가 고른 폴더를 그 자리에서 읽을 뿐이다.
  ★내부용. 어디에서도 링크하지 않는다.
-->
<style>
:root{--bg:#FAFAF8;--bg2:#F5F3EF;--bg3:#EDEBE6;--text:#1C1B19;--sub:#5A554C;--light:#75705F;
--border:#DDD8D1;--gold:#B89A75;--gold-text:#7A5F37;--seal:#6B2A24;--green:#3B6E4F;
--serif-ko:'Noto Serif KR',serif;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--serif-ko),system-ui,sans-serif;
font-size:15px;line-height:1.7;-webkit-text-size-adjust:100%}
/* ★아래 여백은 **발판이 접히는 폭**에 맞춘다 [FOOT_CLEAR 2026-08-15 실측]
   390px 에서 발판이 두 줄로 접혀 119px 이 되는데 여백이 96px 이라 마지막 문장이 10px 가렸다.
   마지막 한 자리가 안 눌리는 화면은 186개를 다 듣고 온 사람에게 가장 나쁜 자리에서 고장 난다. */
.wrap{max-width:780px;margin:0 auto;padding:20px 16px 96px}
@media (max-width:560px){ .wrap{padding-bottom:150px} }
h1{font-size:19px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--light);font-size:13px;margin:0 0 18px}
.bar{position:sticky;top:0;z-index:20;background:rgba(250,250,248,.96);backdrop-filter:blur(8px);
border-bottom:1px solid var(--border);padding:10px 0;margin:0 0 14px}
.pg{height:5px;background:var(--bg3);border-radius:99px;overflow:hidden;margin:8px 0 6px}
.pg > i{display:block;height:100%;background:var(--gold);width:0;transition:width .25s}
.st{font-size:13px;color:var(--sub);display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.btn{font:inherit;font-size:14px;padding:9px 14px;min-height:44px;border:1px solid var(--border);
background:#fff;color:var(--text);border-radius:9px;cursor:pointer}
.btn:hover{background:var(--bg2)}
.btn.sm{font-size:13px;padding:7px 11px;min-height:40px}
.btn.pri{background:var(--accent,#3A2D22);color:#fff;border-color:transparent;background:#3A2D22}
.btn.on{background:var(--green);color:#fff;border-color:transparent}
.btn.re{background:var(--seal);color:#fff;border-color:transparent}
.drop{border:1.5px dashed var(--gold);border-radius:12px;padding:18px;text-align:center;
background:var(--bg2);margin:0 0 18px}
.drop p{margin:0 0 10px;font-size:14px;color:var(--sub)}
.clip{border:1px solid var(--border);border-radius:12px;background:#fff;margin:0 0 12px;overflow:hidden}
.clip.done{opacity:.55}
.ch{display:flex;gap:10px;align-items:center;padding:12px 14px;background:var(--bg2);
border-bottom:1px solid var(--border);flex-wrap:wrap}
.ch b{font-size:15px}
.tag{font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid var(--border);
background:#fff;color:var(--light)}
.tag.re{background:#fdf1ef;color:var(--seal);border-color:#e8c9c4}
.tag.lock{background:#f2f5f2;color:var(--green);border-color:#cfe0d4}
.tag.flag{background:#fdf7ec;color:var(--gold-text);border-color:#e8dcc4}
.sent{padding:11px 14px;border-top:1px solid var(--bg3);display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}
.sent:first-child{border-top:0}
.sent .tx{flex:1 1 260px;min-width:0}
.sent .tx .q{font-size:15px}
.sent .tx .mi{font-size:12px;color:var(--light);margin-top:2px}
.sent.lock{background:#f7faf8}
.sent.re{background:#fdf7f6}
.ops{display:flex;gap:6px;flex-wrap:wrap}
.foot{position:fixed;left:0;right:0;bottom:0;background:rgba(250,250,248,.97);
border-top:1px solid var(--border);padding:10px 16px;display:flex;gap:10px;justify-content:center;
flex-wrap:wrap;backdrop-filter:blur(8px);z-index:30}
textarea{width:100%;min-height:180px;font:13px/1.6 ui-monospace,Menlo,monospace;padding:10px;
border:1px solid var(--border);border-radius:9px;background:#fff;color:var(--text)}
.note{font-size:12.5px;color:var(--light);background:var(--bg2);border-radius:9px;padding:10px 12px;margin:0 0 14px}
.hide{display:none}
</style></head><body><div class="wrap">

<h1>어조 ${DATA.총클립}클립 · ${DATA.총문장}문장 실청 점검</h1>
<p class="sub">[LISTEN_TONE] 클립 ${DATA.총클립}개 · 문장 ${DATA.총문장}개 · 기존 사용 ${DATA.잠금}자리 · 실측 ${DATA.실측}개
&nbsp;·&nbsp; 이 줄이 ${DATA.총클립}클립이면 최신입니다</p>

<div class="note">
  <b>쉼(무음)은 여기서 판정하지 마세요.</b> 문장 사이 쉼은 조립할 때 <b>숫자로</b> 넣습니다(wav 에 없습니다).
  이 화면이 주는 쉼은 듣기 편하라고 브라우저가 임시로 넣는 것이라 실제 결과물과 다릅니다.<br>
  여기서 볼 것은 <b>억양 · 강세 · 발음 · 속도</b>입니다.<br>
  <b>「기존에도 있음」</b>이 붙은 자리는 이미 녹음된 문장입니다 — 그 옛 클립과 <b>결이 맞는지</b> 견줘 들어 주세요.
  (실측 한 건: 「하나, 둘, 셋.」은 기존이 4.8초에 사이 쉼 0.45초씩인데 새 take 는 1.65초입니다. 사진 카운트다운이라 반응할 틈이 필요합니다.)
</div>

<div class="drop" id="drop">
  <p><b>더빙 wav 폴더를 고르세요.</b> 파일은 브라우저 안에서만 열리고 어디에도 올라가지 않습니다.</p>
  <input type="file" id="pick" webkitdirectory directory multiple class="hide">
  <button class="btn pri" id="pickBtn">폴더 고르기</button>
  <div id="pickInfo" class="sub" style="margin-top:8px"></div>
</div>

<div class="bar">
  <div class="pg"><i id="pgi"></i></div>
  <div class="st">
    <span id="stTxt">판정 0 / ${DATA.총문장 - DATA.잠금}</span>
    <span id="stRe" style="color:var(--seal)"></span>
    <label style="margin-left:auto;font-size:13px"><input type="checkbox" id="onlyLeft"> 남은 것만</label>
    <label style="font-size:13px"><input type="checkbox" id="onlyFlag"> 의심만${flagged ? ` (${flagged})` : ''}</label>
  </div>
</div>

<div id="list"></div>

<div id="outWrap" class="hide" style="margin-top:20px">
  <p class="sub" style="margin:0 0 6px">아래를 타입캐스트에 통째로 붙여넣으세요. 다시 받은 wav 는 저에게 폴더째 주시면 됩니다.</p>
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
var KEY = 'me_listen_tone_v1';
var V = {}; try { V = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { V = {}; }
var save = function () { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch (e) {} };
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };

/* 폴더에서 고른 소리 — audio_N 으로 색인. 업로드 없음(objectURL). */
var AUD = {};
$('pickBtn').onclick = function () { $('pick').click(); };
$('pick').onchange = function (e) {
  var fs_ = e.target.files || [], got = 0;
  for (var i = 0; i < fs_.length; i++) {
    var m = /audio_(\\d+)_/.exec(fs_[i].name); if (!m) continue;
    if (!/\\.(wav|mp3|m4a|flac|ogg)$/i.test(fs_[i].name)) continue;
    AUD[+m[1]] = URL.createObjectURL(fs_[i]); got++;
  }
  $('pickInfo').innerHTML = got
    ? ('소리 <b>' + got + '</b>개 붙었습니다' + (got < D.총문장 ? (' · ' + (D.총문장 - got) + '개는 못 찾았어요') : ' · 전부 있습니다'))
    : '이 폴더에서 audio_N 이름의 소리를 못 찾았어요.';
  draw();
};

/* 재생 — 문장 하나 / 클립 통째(사이 쉼 0.45s · 참고용) */
var cur = null;
function stop() { if (cur) { try { cur.pause(); } catch (e) {} cur = null; } }
function play1(i, done) {
  stop(); var u = AUD[i];
  if (!u) { alert('그 자리 소리를 아직 못 찾았어요. 폴더를 고르셨나요?'); return; }
  var a = new Audio(u); cur = a; a.onended = function () { cur = null; if (done) done(); }; a.play();
}
function playClip(ci) {
  var ns = D.clips[ci].n, k = 0;
  (function next() { if (k >= ns.length) return; var i = ns[k++].i;
    play1(i, function () { setTimeout(next, 450); }); })();
}

function setV(i, val) { if (val) V[i] = val; else delete V[i]; save(); draw(); }

function draw() {
  var onlyLeft = $('onlyLeft').checked, onlyFlag = $('onlyFlag').checked;
  var need = D.총문장 - D.잠금, done = 0, re = 0;
  D.clips.forEach(function (c) { c.n.forEach(function (s) {
    if (s.lock) return; if (V[s.i]) done++; if (V[s.i] === 're') re++; }); });
  $('pgi').style.width = (need ? (done / need * 100) : 0) + '%';
  $('stTxt').textContent = '판정 ' + done + ' / ' + need;
  $('stRe').textContent = re ? ('다시 받을 것 ' + re + '문장') : '';

  var h = '';
  D.clips.forEach(function (c, ci) {
    var open = c.n.filter(function (s) { return !s.lock && !V[s.i]; }).length;
    var cre = c.n.filter(function (s) { return V[s.i] === 're'; }).length;
    var cfl = c.n.filter(function (s) { return s.f && !s.lock; }).length;
    if (onlyLeft && !open) return;
    if (onlyFlag && !cfl) return;
    h += '<div class="clip' + (open ? '' : ' done') + '">'
      + '<div class="ch"><b>' + esc(c.k || c.s) + '</b>'
      + '<span class="tag">' + esc(c.s) + '</span>'
      + (c.g === 'redub' ? '<span class="tag">재더빙</span>' : '')
      + (cre ? '<span class="tag re">다시 ' + cre + '</span>' : '')
      + (cfl ? '<span class="tag flag">의심 ' + cfl + '</span>' : '')
      + '<button class="btn sm" style="margin-left:auto" data-clip="' + ci + '">클립 통째 듣기</button></div>';
    c.n.forEach(function (s) {
      var v = V[s.i];
      h += '<div class="sent' + (s.lock ? ' lock' : (v === 're' ? ' re' : '')) + '">'
        + '<div class="tx"><div class="q">' + esc(s.t) + '</div>'
        + '<div class="mi">' + esc(s.v) + ' · audio_' + s.i
        + (s.m ? (' · ' + s.m.d + 's') : '')
        + (s.f ? (' · <b style="color:var(--gold-text)">' + esc(s.f) + '</b>') : '')
        + (s.lock ? ' · <b style="color:var(--green)">기존 녹음을 씁니다 (판정 안 함)</b>' : '')
        + '</div></div>'
        + '<div class="ops">'
        + '<button class="btn sm" data-p="' + s.i + '">듣기</button>'
        + (s.lock ? '' :
            '<button class="btn sm' + (v === 'ok' ? ' on' : '') + '" data-v="ok" data-i="' + s.i + '">좋아요</button>'
          + '<button class="btn sm' + (v === 're' ? ' re' : '') + '" data-v="re" data-i="' + s.i + '">다시</button>')
        + '</div></div>';
    });
    h += '</div>';
  });
  $('list').innerHTML = h || '<p class="sub">해당하는 것이 없습니다.</p>';
}

$('list').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.p != null) return play1(+b.dataset.p);
  if (b.dataset.clip != null) return playClip(+b.dataset.clip);
  if (b.dataset.v) { var i = +b.dataset.i; setV(i, V[i] === b.dataset.v ? null : b.dataset.v); }
});
$('onlyLeft').onchange = draw; $('onlyFlag').onchange = draw;

$('mkOut').onclick = function () {
  var out = [];
  D.clips.forEach(function (c) {
    var re = c.n.filter(function (s) { return V[s.i] === 're'; });
    if (!re.length) return;
    re.forEach(function (s) { out.push(s.v + ': ' + s.t); });
  });
  $('outWrap').className = out.length ? '' : 'hide';
  $('out').value = out.join('\\n') + (out.length ? '\\n' : '');
  if (!out.length) alert('「다시」로 표시한 문장이 없습니다.');
  else $('outWrap').scrollIntoView({ behavior: 'smooth' });
};
$('copyOut').onclick = function () {
  var o = $('out'); if (!o.value) { alert('먼저 대본을 만들어 주세요.'); return; }
  o.select(); try { document.execCommand('copy'); alert('복사했습니다.'); } catch (e) {}
};
$('reset').onclick = function () {
  if (!confirm('판정을 전부 지울까요?')) return; V = {}; save(); draw();
};
draw();
</script></body></html>
`;

console.log(`실청 화면 — 클립 ${DATA.총클립} · 문장 ${DATA.총문장} · 기존 사용 ${DATA.잠금} · 의심 표시 ${flagged}`);
if (WRITE && !bad) { fs.writeFileSync(OUT, html); console.log('  썼다: audio-review-tone.html'); }
else if (!WRITE) {
  if (!fs.existsSync(OUT)) no('audio-review-tone.html 이 없다 — --write 로 뽑을 것');
  else if (fs.readFileSync(OUT, 'utf8') !== html) no('audio-review-tone.html 이 생성물과 다르다 — 손으로 고쳤거나 옛 판이다(--write 로 다시 뽑을 것)');
  else console.log('  대조 ok — 커밋된 화면이 생성물과 같다');
}
console.log(bad ? `틀림 ${bad}건` : '실청 화면 OK');
process.exit(bad ? 1 : 0);
