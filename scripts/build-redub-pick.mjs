// 「다시」로 찍은 자리를 **버림/다시/글 바꿈/그대로** 로 가르는 판정 화면 [REDUB_PICK]
//
//   node scripts/build-redub-pick.mjs --out <경로> [--embed]
//
// ★왜 만드나 — 2026-08-17 사용자
//   *"내가선택 간편하게 페이지로 만들어주던지"*
//   실청에서 찍은 150줄을 md 두 장으로 드렸더니 손으로 적어야 했다. 손으로 적는 자리는 틀린다
//   (이 저장소가 붙여넣기 파일을 손으로 써서 화자를 틀린 것이 바로 어제다 · PHOTO_ASK).
//
// ★★두 갈래를 **한 화면에 담되 섞지 않는다**
//   ① 기존 클립 — 이미 조립된 mp3. 문장 wav 원본이 없어 **클립 통째로**만 다시 받을 수 있다.
//      그래서 판정 단위도 **클립**이다.
//   ② 새 어조 — 아직 조립 전 문장 wav. **문장 하나만** 갈아 끼울 수 있다.
//      그래서 판정 단위도 **문장**이다.
//   ★판정 단위를 실제 고칠 수 있는 단위와 같게 둔다. 다르면 「문장만 버리기」 같은
//     실행 불가능한 답이 나오고, 그걸 받은 내가 다시 되물어야 한다.
//
// ★★[PICK_EDIT 2026-08-17 사용자 지시 *"변경기능도 추가하자 문단이 조금 애매해서 내용을 바꾸고 싶을때"*]
//   판정을 **넷**으로 늘렸다 — 버림 / 다시 / **글 바꿈** / 그대로.
//   「다시」와 「글 바꿈」은 뒤에 오는 일이 다르다:
//     다시    = 같은 글을 다시 받는다. 대장을 안 건드린다. 붙여넣기 → 조립으로 끝난다.
//     글 바꿈 = **대장(ritual-data → cue → manifest)을 먼저 고쳐야** 한다. 그다음에 받는다.
//   ★이 둘을 한 칸에 두면 「다시」로 적고 새 글을 말로 덧붙이게 되고, 그 말이 어디에도 안 남는다.
//     칸을 갈라 두면 새 글이 **결과 상자에 글자로** 실려 나온다 — 옮겨 적는 사람이 없다.
//   ★고칠 글은 **지금 글을 채워서** 보여 준다. 빈 칸에 다시 쓰게 하면 원문이 사라진다.
//
// ★★[PICK_WHOLE 2026-08-17 사용자 지시 *"해당문장이 들어간 대본 전체를 듣고 판단할수있게"*]
//   어조는 **문장 하나만 들어서는 못 고른다.** 「간결/다정/서정」은 3~4문장이 흐르는 결이지
//   한 문장의 성질이 아니다. 그래서 클립마다 「이 대본 전체 듣기」를 붙여 **이어서** 튼다.
//   ★판정 단위는 그대로 문장이다 — 듣는 단위와 고치는 단위는 다를 수 있고, 여기서는 다르다.
//     (어조 wav 는 낱개라 문장만 갈아 낄 수 있다. 그러나 «귀»는 문단으로 듣는다)
//
// ★★[PICK_WHY 2026-08-17 사용자 지시 *"버림 혹은 변경 체크시 간단한 이유 적을수있게"*]
//   버림·바꿈에는 **한 줄 이유** 칸을 연다. 이유가 없으면 두 달 뒤에 「왜 뺐더라」가 되고,
//   그때 되살리는 판단이 근거 없이 뒤집힌다(이 저장소의 제거 지시 보존 규칙이 그래서 있다).
//   ★강제하지 않는다 — 비워도 넘어간다. 대신 결과에 「이유 없음」으로 실려 눈에 보인다.
//
// ★듣고 판정한다 — 글만 보고는 어조를 못 고른다. 소리를 심어 인터넷 없이도 들리게 한다.
// ★판정은 브라우저에 저장된다(localStorage) — 중간에 닫아도 이어서 한다.
// ★결과는 **붙여넣기 한 덩어리**로 낸다. 사람이 옮겨 적지 않는다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const STAGE = path.join(ROOT, '_dub_stage');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', ''), EMBED = process.argv.includes('--embed');
const MARK = arg('--mark', path.join(DIR, '실청_다시표시_20260817.txt'));
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
if (!OUT) die('--out <경로> 가 필요하다', 2);
if (!fs.existsSync(MARK)) die(`${MARK} 이 없다 — 실청에서 낸 「다시」 목록이 있어야 한다`, 2);

const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const V = man.voice || {};
const PART_ORDER = ['1_안내.txt', '2_진행_전반.txt', '3_진행_후반.txt', '4_혼주편지.txt', '5_배역.txt', '6_예식뒤.txt'];
const PART_KO = { '1_안내.txt': '하객 안내', '2_진행_전반.txt': '진행 · 전반', '3_진행_후반.txt': '진행 · 후반',
  '4_혼주편지.txt': '혼주 편지', '5_배역.txt': '배역', '6_예식뒤.txt': '예식 뒤' };
const norm = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, '');
const srcOf = (c) => ['narration', 'cast']
  .map((d) => path.join(ROOT, 'assets/audio', d, `${c.no}_${c.file}.mp3`)).find((p) => fs.existsSync(p)) || '';

const marks = fs.readFileSync(MARK, 'utf8').split('\n').filter((l) => l.trim())
  .map((l) => ({ v: l.split(':')[0].trim(), t: l.slice(l.indexOf(':') + 1).trim() }));

/* ── ① 기존 클립 ─────────────────────────────────────────────────────────── */
const flat = [];
man.clips.forEach((c, ci) => (c.sents || []).forEach((s, si) => flat.push({ ci, si, c, text: String(s.text).trim() })));
const hitOld = new Map();
for (const L of marks) for (const x of flat)
  if (norm(x.text) === norm(L.t) && V[x.c.role] === L.v) {
    if (!hitOld.has(x.ci)) hitOld.set(x.ci, new Set());
    hitOld.get(x.ci).add(x.si);
  }
const OLD = [...hitOld.keys()].map((ci) => ({ ci, c: man.clips[ci], hit: [...hitOld.get(ci)] }))
  .sort((a, b) => (PART_ORDER.indexOf(a.c.part) - PART_ORDER.indexOf(b.c.part)) || (+a.c.no - +b.c.no))
  .map((r) => ({ id: `${r.c.no}_${r.c.file}`, ko: r.c.label || r.c.file, part: PART_KO[r.c.part] || r.c.part,
    voice: V[r.c.role] || r.c.role, hit: r.hit,
    s: (r.c.sents || []).map((x) => String(x.text).trim()) }));

/* ── ② 새 어조 ───────────────────────────────────────────────────────────── */
const lines0 = fs.readFileSync(path.join(DIR, '더빙_한번에.txt'), 'utf8').split('\n').filter((l) => l.trim());
const tSent = lines0.map((l) => l.slice(l.indexOf(':') + 1).trim());
const tVoice = lines0.map((l) => (l.match(/^([^:]*):/) || [, '우성'])[1].trim());
const ORDER = JSON.parse(fs.readFileSync(path.join(DIR, '더빙_한번에_순서.json'), 'utf8'));
const hitNew = new Set();
for (const L of marks) tSent.forEach((t, i) => { if (norm(t) === norm(L.t) && tVoice[i] === L.v) hitNew.add(i); });
const NEW = ORDER.클립.map((c) => {
  const idx = []; for (let k = 0; k < c.문장수; k++) idx.push(c.시작줄 - 1 + k);
  return { slug: c.slug, ko: c.이름, g: c.묶음, n: idx.map((i) => ({ i, t: tSent[i], v: tVoice[i], hit: hitNew.has(i) })) };
}).filter((r) => r.n.some((x) => x.hit));

/* ── 소리 심기 ──────────────────────────────────────────────────────────── */
const AO = {}, AN = {};
let bad = 0;
if (EMBED) {
  const tmp = fs.mkdtempSync('/tmp/rp-');
  const enc = (src, key, bag) => {
    const o = path.join(tmp, key.replace(/[^\w.-]/g, '_') + '.mp3');
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-c:a', 'libmp3lame',
      '-b:a', '48k', '-ac', '1', '-ar', '32000', o]);
    if (r.status !== 0 || !fs.existsSync(o)) { console.error(`✗ mp3 변환 실패: ${key}`); bad++; return; }
    bag[key] = fs.readFileSync(o).toString('base64');
  };
  for (const r of OLD) {
    const c = man.clips.find((x) => `${x.no}_${x.file}` === r.id);
    const s = c && srcOf(c); if (s) enc(s, r.id, AO);
  }
  if (fs.existsSync(STAGE)) {
    const ff = {};
    for (const f of fs.readdirSync(STAGE)) { const m = /^audio_(\d+)_/.exec(f); if (m) ff[+m[1]] = f; }
    for (const r of NEW) for (const x of r.n) if (ff[x.i]) enc(path.join(STAGE, ff[x.i]), 'n' + x.i, AN);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const mb = (Object.values(AO).join('').length + Object.values(AN).join('').length) / 1048576;
  console.log(`소리 심음 — 기존 ${Object.keys(AO).length}클립 · 어조 ${Object.keys(AN).length}문장 · base64 ${mb.toFixed(1)}MB`);
  /* ★[LISTEN_HAS_SOUND 와 같은 처방] --embed 를 시켰는데 소리가 0이면 파일을 쓰지 않는다.
     속 빈 판이 나가면 사람이 「소리가 안 난다」로 시간을 쓴다. 없으면 없다고 붉는다. */
  if (!Object.keys(AO).length && !Object.keys(AN).length) die('소리를 하나도 못 심었다 — ffmpeg 이 있는지 보라', 1);
}

const DATA = { old: OLD, neu: NEW };
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>재더빙 판정 · 기존 ${OLD.length}클립 + 어조 ${NEW.length}클립</title>
<!-- [REDUB_PICK] 자동생성물. 손으로 고치지 말 것 — scripts/build-redub-pick.mjs 를 고치고 다시 뽑는다. -->
<style>
:root{--ink:#2B2A28;--sub:#6B6862;--light:#9C9891;--line:#E6E2DC;--bg:#FBFAF8;--gold:#B89A75;
--re:#B4544A;--keep:#3B6E4F;--drop:#8A8A8A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
font-size:15px;line-height:1.7;padding-bottom:120px}
.wrap{max-width:820px;margin:0 auto;padding:20px 16px}
h1{font-size:19px;margin:0 0 6px}.sub{color:var(--sub);font-size:13px;margin:0 0 14px}
.note{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0 0 16px;font-size:13px;color:var(--sub)}
.tabs{display:flex;gap:8px;position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5;border-bottom:1px solid var(--line)}
.tabs button{flex:1;padding:10px;border:1px solid var(--line);background:#fff;border-radius:10px;font-size:14px;cursor:pointer}
.tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin:12px 0}
.bar i{display:block;height:100%;background:var(--gold);width:0}
.grp{margin:22px 0 8px;font-size:13px;color:var(--gold);font-weight:700}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 10px}
.card.done{border-color:var(--gold);background:#FEFDFB}
.hd{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}
.no{font-weight:700;font-size:15px}.tag{font-size:11px;color:var(--sub);border:1px solid var(--line);border-radius:20px;padding:1px 8px}
.sent{padding:4px 0 4px 20px;position:relative;font-size:14px}
.sent.hit{color:var(--ink);font-weight:600}.sent:not(.hit){color:var(--light)}
.sent.hit::before{content:'★';position:absolute;left:0;color:var(--re)}
.btns{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.btns button{flex:1;min-width:78px;padding:9px 6px;border:1px solid var(--line);background:#fff;border-radius:9px;font-size:13px;cursor:pointer}
.btns button.play{flex:0 0 auto;min-width:96px;border-color:var(--gold);color:var(--gold)}
.btns button.v-drop.on{background:var(--drop);color:#fff;border-color:var(--drop)}
.btns button.v-re.on{background:var(--re);color:#fff;border-color:var(--re)}
.btns button.v-keep.on{background:var(--keep);color:#fff;border-color:var(--keep)}
.btns button.v-edit.on{background:var(--gold);color:#fff;border-color:var(--gold)}
.ed{margin-top:8px}
.ed textarea{width:100%;height:auto;min-height:64px;font-size:14px;line-height:1.6;
border:1px solid var(--gold);border-radius:9px;padding:9px;font-family:inherit;margin:0}
.ed .hint{font-size:12px;color:var(--sub);margin:4px 0 0}
.why{margin-top:8px}
.why input{width:100%;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-family:inherit}
.why input:focus{border-color:var(--gold);outline:none}
.whole{display:block;width:100%;margin:2px 0 10px;padding:9px;border:1px solid var(--gold);
background:#fff;color:var(--gold);border-radius:9px;font-size:13px;cursor:pointer}
.whole.on{background:var(--gold);color:#fff}
.srow{display:flex;gap:6px;align-items:center;margin:6px 0}
.srow .t{flex:1;font-size:14px}
.srow button{padding:5px 9px;border:1px solid var(--line);background:#fff;border-radius:7px;font-size:12px;cursor:pointer}
.foot{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:10px 16px;z-index:9}
.foot .in{max-width:820px;margin:0 auto;display:flex;gap:8px;align-items:center}
.foot .n{font-size:13px;color:var(--sub);flex:1}
.foot button{padding:10px 14px;border:0;background:var(--ink);color:#fff;border-radius:9px;font-size:14px;cursor:pointer}
textarea{width:100%;height:200px;font-family:ui-monospace,Menlo,monospace;font-size:12px;
border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px}
.hide{display:none}
</style></head><body>
<div class="wrap">
<h1>재더빙 판정</h1>
<p class="sub">실청에서 「다시」로 찍으신 자리입니다 · 기존 <b>${OLD.length}클립</b> + 어조 <b>${NEW.length}클립</b></p>
<div class="note">
★ 표시가 찍으신 문장입니다. 흐린 줄은 같은 문단의 나머지입니다.<br>
<b>기존 클립</b>은 문장 하나만 다시 받을 수 없어 <b>문단 통째로</b> 판정합니다.<br>
<b>어조</b>는 아직 조립 전이라 <b>문장 하나씩</b> 갈아 끼울 수 있습니다.<br>
<b>글 바꿈</b>을 누르면 글칸이 열려요 · 지금 글이 채워져 있으니 고치시면 됩니다.<br>
<b>버림·글 바꿈</b>에는 <b>이유 한 줄</b>을 적는 칸이 열려요 · 비워 두셔도 넘어갑니다.<br>
어조는 <b>이 대본 전체 듣기</b>로 문단을 통째로 들어 보고 고르세요 · 느낌은 한 문장으로는 안 갈립니다.<br>
판정은 이 브라우저에 저장돼요 · 중간에 닫아도 이어서 하시면 됩니다.
</div>
<div class="tabs">
  <button data-t="old" class="on">① 기존 클립 <span id="c1"></span></button>
  <button data-t="neu">② 새 어조 <span id="c2"></span></button>
</div>
<div class="bar"><i id="bi"></i></div>
<div id="list"></div>
<div id="outWrap" class="hide">
  <div class="grp">결과 — 이걸 통째로 복사해서 주세요 (제가 그대로 읽어 반영합니다)</div>
  <textarea id="out" readonly></textarea>
</div>
</div>
<div class="foot"><div class="in">
  <span class="n" id="tally"></span>
  <button id="mk">결과 만들기</button>
</div></div>
<audio id="a"></audio>
<script>
var D = ${JSON.stringify(DATA)};
var AO = ${EMBED ? JSON.stringify(Object.fromEntries(Object.entries(AO).map(([k, v]) => [k, 'data:audio/mpeg;base64,' + v]))) : '{}'};
var AN = ${EMBED ? JSON.stringify(Object.fromEntries(Object.entries(AN).map(([k, v]) => [k, 'data:audio/mpeg;base64,' + v]))) : '{}'};
var KEY = 'me_redub_pick_v2', TAB = 'old', V = {}, T = {};
var R = {};
try { var _s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; V = _s.v || {}; T = _s.t || {}; R = _s.r || {}; } catch (e) { V = {}; T = {}; R = {}; }
function save(){ try { localStorage.setItem(KEY, JSON.stringify({v:V, t:T, r:R})); } catch (e) {} }
function $(i){ return document.getElementById(i); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];}); }
var A = $('a'), Q = [], QI = -1;
function play(src){ Q=[]; if(!src){ alert('이 판에는 소리가 안 심겼어요.'); return; } A.pause(); A.src = src; A.play().catch(function(){}); }
/* ★[PICK_WHOLE] 문단을 «이어서» 튼다 — 어조는 문장 하나로 안 갈린다 */
function playAll(list){
  Q = list.filter(Boolean); QI = -1;
  if(!Q.length){ alert('이 판에는 소리가 안 심겼어요.'); return; }
  nextQ();
}
function nextQ(){ QI++; if(QI>=Q.length){ Q=[]; return; } A.src=Q[QI]; A.play().catch(function(){}); }
A.addEventListener('ended', function(){ if(Q.length) nextQ(); });
/* 이유 칸 — 버림·바꿈에만 연다. 비워도 넘어간다(강제하지 않는다) */
function whyBox(k, v){
  if(v!=='버림' && v!=='바꿈') return '';
  return '<div class="why"><input data-w="'+esc(k)+'" value="'+esc(R[k]||'')+'" '
    + 'placeholder="왜 '+esc(v)+'인지 한 줄 (비워도 됩니다)"></div>';
}

/* 판정 단위가 다르다 — 기존은 클립 하나, 어조는 문장 하나 [REDUB_PICK] */
function need(){ return TAB==='old' ? D.old.length : D.neu.reduce(function(a,c){ return a + c.n.filter(function(x){return x.hit;}).length; },0); }
function done(){ var n=0;
  if(TAB==='old') D.old.forEach(function(c){ if(V['o|'+c.id]) n++; });
  else D.neu.forEach(function(c){ c.n.forEach(function(x){ if(x.hit && V['n|'+x.i]) n++; }); });
  return n; }

function draw(){
  var h='', prev='';
  if(TAB==='old'){
    D.old.forEach(function(c,i){
      if(c.part!==prev){ h+='<div class="grp">'+esc(c.part)+'</div>'; prev=c.part; }
      var v=V['o|'+c.id]||'';
      h+='<div class="card'+(v?' done':'')+'">'
        +'<div class="hd"><span class="no">'+(i+1)+'.</span><b>'+esc(c.ko)+'</b>'
        +'<span class="tag">'+esc(c.id)+'</span><span class="tag">'+esc(c.voice)+'</span>'
        +'<span class="tag">'+c.hit.length+'/'+c.s.length+' 표시</span></div>';
      c.s.forEach(function(t,si){ h+='<div class="sent'+(c.hit.indexOf(si)>=0?' hit':'')+'">'+esc(t)+'</div>'; });
      h+='<div class="btns">'
        +'<button class="play" data-p="o:'+esc(c.id)+'">문단 듣기</button>'
        +'<button class="v-drop'+(v==='버림'?' on':'')+'" data-v="o|'+esc(c.id)+'|버림">버림</button>'
        +'<button class="v-re'+(v==='다시'?' on':'')+'" data-v="o|'+esc(c.id)+'|다시">다시</button>'
        +'<button class="v-edit'+(v==='바꿈'?' on':'')+'" data-v="o|'+esc(c.id)+'|바꿈">글 바꿈</button>'
        +'<button class="v-keep'+(v==='그대로'?' on':'')+'" data-v="o|'+esc(c.id)+'|그대로">그대로</button>'
        +'</div>';
      if(v==='바꿈'){ var k='o|'+c.id, cur=(T[k]!=null? T[k] : c.s.join('\\n'));
        h+='<div class="ed"><textarea data-e="'+esc(k)+'" rows="'+Math.max(2,c.s.length)+'">'+esc(cur)+'</textarea>'
          +'<p class="hint">한 줄에 한 문장 · 줄을 늘리거나 지우면 문장 수도 그렇게 바뀝니다</p></div>'; }
      h+=whyBox('o|'+c.id, v);
      h+='</div>';
    });
  } else {
    D.neu.forEach(function(c,i){
      if(c.g!==prev){ h+='<div class="grp">'+esc(c.g)+'</div>'; prev=c.g; }
      var all=c.n.filter(function(x){return x.hit;}).every(function(x){ return V['n|'+x.i]; });
      h+='<div class="card'+(all?' done':'')+'">'
        +'<div class="hd"><span class="no">'+(i+1)+'.</span><b>'+esc(c.ko)+'</b>'
        +'<span class="tag">'+esc(c.slug)+'</span><span class="tag">'+c.n.length+'문장</span></div>'
        +'<button class="whole" data-w-all="'+i+'">이 대본 전체 듣기 ('+c.n.length+'문장 이어서)</button>';
      c.n.forEach(function(x,k){
        if(!x.hit){ h+='<div class="sent">'+esc(x.v+': '+x.t)+'</div>'; return; }
        var v=V['n|'+x.i]||'';
        h+='<div class="srow"><span class="t sent hit" style="padding-left:20px">'+esc(x.v+': '+x.t)+'</span></div>'
          +'<div class="btns">'
          +'<button class="play" data-p="n:'+x.i+'">듣기</button>'
          +'<button class="v-drop'+(v==='버림'?' on':'')+'" data-v="n|'+x.i+'|버림">버림</button>'
          +'<button class="v-re'+(v==='다시'?' on':'')+'" data-v="n|'+x.i+'|다시">다시</button>'
          +'<button class="v-edit'+(v==='바꿈'?' on':'')+'" data-v="n|'+x.i+'|바꿈">글 바꿈</button>'
          +'<button class="v-keep'+(v==='그대로'?' on':'')+'" data-v="n|'+x.i+'|그대로">그대로</button>'
          +'</div>';
        if(v==='바꿈'){ var nk='n|'+x.i, ncur=(T[nk]!=null? T[nk] : x.t);
          h+='<div class="ed"><textarea data-e="'+esc(nk)+'" rows="2">'+esc(ncur)+'</textarea>'
            +'<p class="hint">이 한 문장만 고칩니다 · 화자는 '+esc(x.v)+' 그대로예요</p></div>'; }
        h+=whyBox('n|'+x.i, v);
      });
      h+='</div>';
    });
  }
  $('list').innerHTML = h;
  var d=done(), n=need();
  $('tally').textContent = (TAB==='old'?'기존 클립':'어조 문장') + '  ' + d + ' / ' + n + ' 판정';
  $('bi').style.width = (n? d/n*100 : 0) + '%';
  $('c1').textContent = '(' + D.old.filter(function(c){return V['o|'+c.id];}).length + '/' + D.old.length + ')';
  var tn=0, td=0; D.neu.forEach(function(c){ c.n.forEach(function(x){ if(x.hit){ tn++; if(V['n|'+x.i]) td++; } }); });
  $('c2').textContent = '(' + td + '/' + tn + ')';
}
document.querySelector('.tabs').addEventListener('click', function(e){
  var b=e.target.closest('button'); if(!b||!b.dataset.t) return;
  TAB=b.dataset.t;
  [].forEach.call(document.querySelectorAll('.tabs button'), function(x){ x.classList.toggle('on', x.dataset.t===TAB); });
  draw(); window.scrollTo(0,0);
});
$('list').addEventListener('click', function(e){
  var b=e.target.closest('button'); if(!b) return;
  if(b.dataset.wAll!=null){ var c=D.neu[+b.dataset.wAll];
    return playAll(c.n.map(function(x){ return AN['n'+x.i]; })); }
  if(b.dataset.p){ var p=b.dataset.p.split(':'); return play(p[0]==='o'? AO[p.slice(1).join(':')] : AN['n'+p[1]]); }
  if(b.dataset.v){ var a=b.dataset.v.split('|'), k=a[0]+'|'+a[1], v=a[2];
    if(V[k]===v) delete V[k]; else V[k]=v; save(); draw(); }
});
/* ★[PICK_EDIT] 글칸은 **다시 그리지 않는다.** 입력 중에 repaint 하면 커서가 튀고 글이 날아간다
   (이 저장소가 마이페이지 글칸에서 겪은 것과 같다 · PICK_KEEPS_SOUND 계열). 값만 담는다. */
$('list').addEventListener('input', function(e){
  var t=e.target; if(!t.dataset) return;
  if(t.dataset.e){ T[t.dataset.e]=t.value; save(); }
  else if(t.dataset.w){ R[t.dataset.w]=t.value; save(); }
});
$('mk').onclick = function(){
  /* ★★[PICK_MACHINE 2026-08-17 사용자 지시 *"복사 한번에 너한테전달되어 너가 바꿔줄수있게 반자동으로"*]
     결과를 **기계가 읽을 수 있는 한 가지 꼴**로만 낸다. 사람이 읽는 줄과 섞지 않는다 —
     섞으면 그걸 읽는 쪽(scripts/apply-redub-pick.mjs)이 «사람 줄»을 문안으로 착각한다.
       O <클립id> = 판정      기존 클립
       N <슬러그> #<줄번호> = 판정   어조 문장(줄번호는 더빙_한번에.txt 기준 1부터)
       <  지금 글   ·   >  바꿀 글   (판정이 「바꿈」일 때만 · 한 줄에 한 문장)
       #  이유 한 줄   (판정이 「버림」·「바꿈」일 때만)
     ★이 꼴을 바꾸면 apply-redub-pick.mjs 의 파서도 같은 커밋에서 고칠 것. */
  var L=['### REDUB_PICK v1'];
  var miss=0;
  D.old.forEach(function(c){ var k='o|'+c.id, v=V[k];
    if(!v){ miss++; L.push('O ' + c.id + ' = (안 정함)'); return; }
    L.push('O ' + c.id + ' = ' + v);
    if(v==='버림'||v==='바꿈') L.push('# ' + ((R[k]||'').trim() || '(이유 없음)'));
    if(v==='바꿈'){
      c.s.forEach(function(t){ L.push('< ' + t); });
      String(T[k]!=null?T[k]:c.s.join('\\n')).split('\\n').forEach(function(t){ if(t.trim()) L.push('> ' + t.trim()); });
    } });
  D.neu.forEach(function(c){ c.n.forEach(function(x){
    if(!x.hit) return; var k='n|'+x.i, v=V[k];
    if(!v){ miss++; L.push('N ' + c.slug + ' #' + (x.i+1) + ' = (안 정함)'); return; }
    L.push('N ' + c.slug + ' #' + (x.i+1) + ' = ' + v);
    if(v==='버림'||v==='바꿈') L.push('# ' + ((R[k]||'').trim() || '(이유 없음)'));
    if(v==='바꿈'){ L.push('< ' + x.t);
      L.push('> ' + String(T[k]!=null?T[k]:x.t).replace(/\\n/g,' ').trim()); } }); });
  L.push('### END  안 정한 것 ' + miss + '개');
  $('out').value = L.join('\\n');
  $('outWrap').className='';
  $('out').select();
  try { document.execCommand('copy'); alert('복사했습니다. 그대로 붙여넣어 주세요.' + (miss? ('\\n\\n★안 정한 것이 '+miss+'개 있습니다.') : '')); } catch(e){}
  $('outWrap').scrollIntoView({behavior:'smooth'});
};
draw();
</script></body></html>
`;

/* ★[SELF_PARSE] 내가 만든 스크립트가 실제로 파싱되는지 — 백틱·따옴표 사고를 여기서 잡는다 */
{
  const i = html.lastIndexOf('<script>'), j = html.lastIndexOf('</script>');
  if (i < 0 || j < 0) die('script 태그를 못 찾았다', 2);
  try { new Function(html.slice(i + 8, j)); } catch (e) { die('자가검사 실패 — 스크립트가 안 파싱된다: ' + e.message, 1); }
  console.log('  자가검사 ok — 스크립트가 파싱된다');
}
if (bad) die(`소리 변환 실패 ${bad}건 — 판을 쓰지 않는다`, 1);
fs.writeFileSync(OUT, html);
console.log(`재더빙 판정 — 기존 ${OLD.length}클립 · 어조 ${NEW.length}클립(문장 ${NEW.reduce((a, c) => a + c.n.filter((x) => x.hit).length, 0)})`);
console.log(`  썼다: ${OUT} (${(html.length / 1048576).toFixed(1)}MB)`);
process.exit(0);
