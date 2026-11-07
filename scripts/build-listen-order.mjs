#!/usr/bin/env node
/* ★★[LISTEN_ORDER_1107 2026-11-07 사장님 «식순 안에 나레이션 전부 · 마지막 테스트 해 보려고»] 식순 순서대로 나레이션 전부 — 반영 전 마지막 실청판.
   ① 이 가지 엔진(ritual-cue build)이 실제로 내보내는 최종 소리만 싣는다(지금/바뀐 뒤 비교 아님).
   ② 순간마다 기본 판 + 예시 칩(narExKeys) 하나씩 + 고름(식사 · 하객 안내 · 온라인 · 누가 선언 · 축사 자리 · 두 분 목소리 · 화촉 · 편지 · 인사 · 축배 · 입장 판 …)을
      한 가지씩 바꿔 엔진을 돌려, 그 순간의 줄이 달라지는 것만 판으로 남긴다(같은 소리는 하나로 묶고 어떤 고름에서 나오는지 적는다).
   ③ 만들 수 있는 코스 전부(build-junctions 와 같은 3,434가지)를 기본값으로 돌려 나온 소리 중 ②에 없는 것은 «코스 따라» 판으로 더 넣는다(앞 순간이 바뀌면 붙는 이음말 등).
   ④ 맨 위 «전체 이어 듣기» = 엔진의 예시 코스 넷(EXAMPLES)을 처음부터 끝까지 · 이음매 · 이음 문장도 엔진 그대로 · 사람 구간은 1초.
   ⑤ 요약 «엔진이 내보내는 클립 중 페이지에 빠진 것 n개»는 ②③④에서 엔진이 낸 소리 전체와 페이지 소리를 기계로 맞대어 센다.
   ⑥ 빼는 것(대본 11/07 20:08): 쓰지 않게 된 옛 판 — 식중 영상 임시 판(58 여는 말 + 129)은 이 판에 싣지 않는다(대본 11/07 20:28 — 식중 영상은 #1635 새 녹음 판으로 · 합친 엔진으로 뽑는다: --with <#1635 머리>) · 11 · 302 같은 옛 판은 엔진이 안 내므로 처음부터 없다.
   쓰기: node scripts/build-listen-order.mjs  →  listen-order-1107.html (실청 전용 · 승인 뒤 병합 전에 지운다) */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { statusOf, LISTEN_OUT } from './lib/clip-status.mjs';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');   // [LISTEN_ORDER_1107] #1635(식중 영상 새 녹음)와 합친 상태는 임시 작업 폴더에서 이 스크립트를 돌려 판만 가져온다
const OUT = path.join(ROOT, 'listen-order-1107.html');
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));

const PICK = ['candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'toast', 'table'];
const ALL = ['prevideo', ...PICK];
const fits = (on) => { const c = O.countOf({ course: 'open', on }); return c.n <= c.max && c.long <= c.longMax; };
function stateOf(on) { const S = O.sampleS(); S.on = { ...on }; S.ring = on.ring ? 'on' : 'off'; S.bless = on.bless ? 'on' : 'off'; S.growth = on.prevideo ? 'on' : 'off'; S.vow = 'ok'; if (on.toast) S.toast = O.toastMode(S); return S; }
const cuesOf = (S) => { const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); return Array.isArray(r) ? r : (r.cues || []); };
const NAME = (k) => ({ guest: '하객 맞이', _close: '닫는 인사', _photo: '단체 사진', _goodbye: '예식 뒤', free: '축사 · 식중 영상 · 깜짝 선물', toast: '케이크 · 축배' }[k] || (O.CARDS[k] && O.CARDS[k].n) || k);
const ORDER = ['guest', 'prevideo', 'candle', 'entry', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'cake', 'toast', 'table', '_close', '_photo', '_goodbye'];
const fileOf = (c) => { if (!c.file) return ''; for (const d of ['narration', 'cast']) { const r = `assets/audio/${d}/${c.file}.mp3`; if (fs.existsSync(path.join(ROOT, r))) return r; } return ''; };
/* ⑥ 식중 영상 임시 판(58 → 129) — 이 판에 싣지 않는다 */
const TEMP_MID = (c, prev) => c.k === 'free' && (c.slug === 'narr-free-in' || (c.slug === 'narr-prevideo-in-ex3' && prev && prev.slug === 'narr-free-in'));
const lineOf = (c) => ({ no: c.no || '', slug: c.slug || '', f: fileOf(c), t: c.text || '', g: +c.gapMs || 0, live: c.live && c.live.t ? c.live.t : '', act: !c.text && c.actId ? c.actId : '' });
function seqOf(cues, k) { const out = []; let skip = false;
  cues.forEach((c, i) => { if (c.k !== k) return; if (TEMP_MID(c, cues[i - 1])) { skip = true; return; } if (!c.text && !c.actId && !c.file) return; out.push(lineOf(c)); });
  return { lines: out, skip }; }
const sig = (L) => JSON.stringify(L.map((l) => [l.slug, l.f, l.t, l.g]));

/* 고름 — 한 가지씩 바꿔 본다 */
const VAR = [];
[['식사 없음', {}], ['카페 · 다과', { meal: 1 }], ['식사 · 예약 없음', { meal: 1, mealFull: 1 }], ['식사 · 예약', { meal: 1, mealFull: 1, resv: 1 }]]
  .forEach(([n, o]) => VAR.push([n, (S) => { delete S.meal; delete S.mealFull; delete S.resv; Object.assign(S, o); }]));
VAR.push(['하객 안내 페이지 있음', (S) => { S.guide = 1; }], ['하객 안내 페이지 없음', (S) => { S.guide = 0; }], ['온라인 참석', (S) => { S.digital = 1; }]);
[10, 15, 20].forEach((m) => VAR.push([`하객 맞이 ${m}분 판`, (S) => { S.guestN = m; }]));
[['gdad', '신랑 아버님'], ['bdad', '신부 아버님'], ['gmom', '신랑 어머님'], ['bmom', '신부 어머님'], ['other', '그 밖의 분']].forEach(([t, n]) => ['yes', 'no'].forEach((y) =>
  VAR.push([`선언 ${n}${y === 'yes' ? ' · 첫 덕담도' : ' · 덕담 따로'}`, (S) => { S.declTitle = t; S.declBless = y; if (O.declBlessKey) S.declBlessKey = O.declBlessKey(S); }])));
['speech', 'gift', 'etc', 'video'].forEach((v) => VAR.push([v === 'video' ? '식중 영상 · 감사 영상' : `축사 자리 · ${(O.CHIPS.free.find((x) => x[0] === v) || [v, v])[1]}`, (S) => { O.setChip(S, 'free', v); }]));
[1, 2].forEach((n) => VAR.push([`식중 영상 · ${['감사 영상', '두 사람 이야기', '어떤 영상이든'][n]}`, (S) => { O.setChip(S, 'free', 'video'); S.mvEx = n; }]));   // [LISTEN_ORDER_1107] #1635 식중 영상 판(S.mvEx 0 ~ 2 · ① 감사 영상 기본)
VAR.push(['두 분 목소리(하객 맞이 · 입장 · 식전 영상)', (S) => { S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; }]);
[1, 2].forEach((i) => VAR.push([`식전 영상 소개 예시 ${i + 1}`, (S) => { S.pvEx = i; }]));
['mothers', 'fathers', 'others'].forEach((w) => VAR.push([`화촉 ${{ mothers: '어머님', fathers: '아버님', others: '다른 두 분' }[w]}`, (S) => { S.candleWho = w; }]));
Object.keys(O.CHIPS).filter((k) => ['letter', 'tribute', 'toast', 'entryScene'].includes(k)).forEach((k) => O.CHIPS[k].forEach(([v, n]) =>
  VAR.push([`${{ letter: '편지', tribute: '부모님께 인사', toast: '케이크 · 축배', entryScene: '입장 뒤' }[k]} · ${n}`, (S) => { O.setChip(S, k, v); }])));
['A', 'B', 'C', 'D', 'E', 'F'].forEach((e) => VAR.push([`입장 멘트 ${e}`, (S) => { S.entry = e; }]));
VAR.push(['서약 · 신부 먼저', (S) => { S.vowFirst = 'b'; }], ['사진 부탁 · 받아 주세요 판', (S) => { S.photoShare = 1; }]);
VAR.push(['서약 · 감사 서약', (S) => { S.vowKind = 'thanks'; }], ['축가 · 두 분이 직접', (S) => { S.songBy = 'self'; }], ['덕담 · 나레이션이 대독', (S) => { S.blessProxy = true; }]);
/* 예시 칩 — 순간마다 넣을 수 있는 번호 전부(엔진 narExList) */
O.narExKeys().forEach((k) => { for (let i = 1; i <= 8; i++) VAR.push([`예시 칩 · ${k} ${i}`, (S) => { S.narEx = Object.assign({}, S.narEx || {}); S.narEx[k] = i; }, k, i]); });

const MOM = {}; ORDER.forEach((k) => { MOM[k] = { k, name: NAME(k), pans: new Map(), skip: false }; });
const ENGINE = new Set(), PAGE = new Set();
function addPan(k, lines, lab) { if (!lines.length) return; const m = MOM[k] || (MOM[k] = { k, name: NAME(k), pans: new Map(), skip: false }); const s = sig(lines);
  const p = m.pans.get(s); if (p) { if (!p.lab.includes(lab)) p.lab.push(lab); return; } m.pans.set(s, { lab: [lab], lines }); lines.forEach((l) => l.f && PAGE.add(l.f)); }
const baseOn = (k) => { if (!ALL.includes(k)) return {}; const on = { [k]: 1 }; if (k === 'bless' || k === 'ring') on.declare = 1; return on; };
/* ② 순간마다 — 기본 판 + 고름 · 예시 칩 */
for (const k of ORDER) {
  const on = baseOn(k);
  const SEL = [['기본', () => {}], ...VAR.filter((v) => !v[2])], EXS = [null, ...VAR.filter((v) => v[2])];
  /* 예시 칩 × 고름 한 가지(화촉 아버님 × 예시 · 누가 선언 × 예시 · 감사 서약 × 예시 · 각자 부모님께 × 예시 …) */
  for (const [lab0, fx, exK, exI] of SEL.flatMap((sv) => EXS.map((ev) => (ev ? [sv[0] === '기본' ? ev[0] : sv[0] + ' + ' + ev[0], (S) => { sv[1](S); ev[1](S); }, ev[2], ev[3]] : sv)))) {
    const lab = lab0;
    const S = stateOf(on); try { fx(S); } catch (e) { continue; }
    if (exK && O.narExOf(S, exK) !== exI) continue;   // 이 순간 · 이 상태에서 고를 수 없는 예시 번호
    let cues; try { cues = cuesOf(S); } catch (e) { continue; }
    cues.forEach((c, i) => { if (fileOf(c) && !TEMP_MID(c, cues[i - 1])) ENGINE.add(fileOf(c)); });
    const r = seqOf(cues, k); if (r.skip) MOM[k].skip = true;
    const exNm = exK ? `예시 · ${(O.narExList(S, exK).find((x) => x[0] === exI) || [0, exI])[1]}` + (exK !== k ? ` (${exK})` : '') : '';
    const exLab = exK ? (lab.includes(' + ') ? lab.split(' + ')[0] + ' + ' + exNm : exNm) : lab;
    if (r.lines.length) addPan(k, r.lines, lab === '기본' ? '기본' : exLab);
    /* 길어졌을 때 디렉터가 바꿔 트는 판(cue.alt · 예: 덕담 3분 넘김 → 25) — 그 줄만 바꾼 판으로 */
    cues.forEach((c) => { if (c.k !== k || !c.alt || !c.alt.slug) return; const af = C.fileOf ? C.fileOf(c.alt.slug) : '';
      const alt = lineOf({ no: String(af || '').split('_')[0], slug: c.alt.slug, file: af, text: c.alt.text || '', gapMs: c.gapMs, live: c.live });
      if (alt.f) { ENGINE.add(alt.f); addPan(k, r.lines.map((l) => (l.slug === c.slug ? alt : l)), (lab === '기본' ? '' : exLab + ' · ') + (c.alt.name || '바꿔 트는 판')); } });
    // 이 고름이 다른 순간도 바꾸면 그 순간에도 판으로(예: 식사 → 닫는 인사 · 단체 사진 뒤)
    ORDER.forEach((k2) => { if (k2 === k) return; const r2 = seqOf(cues, k2); if (r2.lines.length && lab !== '기본') { const m2 = MOM[k2]; if (m2.pans.size && !m2.pans.has(sig(r2.lines))) addPan(k2, r2.lines, exLab); } });
  }
}
/* ③ 코스 전부 — 페이지에 없는 소리가 나오면 그 순간에 «코스 따라» 판으로 */
let nCourse = 0;
/* 코스마다 하객 · 닫는 인사가 갈리는 고름(식사 4 × 온라인 2 × 하객 안내 3)을 함께 돌린다 */
const GLOB = [];
[['', {}], ['카페 · 다과', { meal: 1 }], ['식사 · 예약 없음', { meal: 1, mealFull: 1 }], ['식사 · 예약', { meal: 1, mealFull: 1, resv: 1 }]].forEach(([a, x]) =>
  [['', {}], ['온라인', { digital: 1 }]].forEach(([b, y]) => [['', {}], ['안내 있음', { guide: 1 }], ['안내 없음', { guide: 0 }]].forEach(([c, z]) =>
    GLOB.push([[a, b, c].filter(Boolean).join(' · '), Object.assign({}, x, y, z)]))));
for (let mm = 0; mm < 1 << ALL.length; mm++) { const on = {}; ALL.forEach((k, i) => { if ((mm >> i) & 1) on[k] = 1; }); if (!fits(on)) continue; nCourse++;
  for (const [gn, g] of GLOB) { const S = stateOf(on); Object.assign(S, g);
  const cues = cuesOf(S); cues.forEach((c, i) => { if (fileOf(c) && !TEMP_MID(c, cues[i - 1])) ENGINE.add(fileOf(c)); });
  const seq = []; cues.forEach((c) => { if (c.k && seq[seq.length - 1] !== c.k) seq.push(c.k); });
  ORDER.forEach((k) => { const r = seqOf(cues, k); if (!r.lines.some((l) => l.f && !PAGE.has(l.f))) return;
    const prev = seq[seq.indexOf(k) - 1]; const nx = seq[seq.indexOf(k) + 1];
    addPan(k, r.lines, `코스 따라 · ${prev ? NAME(prev) + ' 뒤' : '맨 앞'}${nx ? ' · ' + NAME(nx) + ' 앞' : ''}${gn ? ' · ' + gn : ''}`); }); } }
/* ④ 예시 코스 넷 — 처음부터 끝까지 */
const COURSES = O.EXAMPLES.map((e) => { const S = O.applyExample({ course: 'open' }, e.k); S.course = 'open'; const cues = cuesOf(S);
  cues.forEach((c, i) => { if (fileOf(c) && !TEMP_MID(c, cues[i - 1])) ENGINE.add(fileOf(c)); });
  const lines = []; cues.forEach((c, i) => { if (TEMP_MID(c, cues[i - 1])) return; if (!c.text && !c.actId && !c.file) return; lines.push(Object.assign(lineOf(c), { k: c.k })); });
  lines.forEach((l) => l.f && PAGE.add(l.f)); return { nm: e.nm, k: e.k, lines }; });
const MISSING = [...ENGINE].filter((f) => !PAGE.has(f)).sort();
const moms = ORDER.map((k) => MOM[k]).filter((m) => m.pans.size).map((m) => ({ k: m.k, name: m.name, skip: m.skip, pans: [...m.pans.values()].map((p) => ({ lab: p.lab.slice(0, 30), n: p.lab.length, lines: p.lines })) }));
const nPan = moms.reduce((a, m) => a + m.pans.length, 0);
/* 참고 — 녹음 상태표(clip-status · RETIRED · CAST_MUTE)가 «나는 소리»로 두는 클립 중 이 엔진이 어떤 고름으로도 내지 않는 것(싣지 않음 · 까닭은 엔진 주석) */
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const LIVE_NOT = MAN.clips.filter((c) => !LISTEN_OUT.has(statusOf(c.dir, `${c.no}_${c.file}`))).map((c) => `${String(c.dir || '').replace(/^.*?assets/, 'assets')}/${c.no}_${c.file}.mp3`)
  .filter((f) => fs.existsSync(path.join(ROOT, f)) && !PAGE.has(f)).map((f) => f.split('/').pop().replace(/\.mp3$/, ''));
const nSel = VAR.filter((v) => !v[2]).length, nEx = VAR.filter((v) => v[2]).length;
const SUM = { moments: moms.length, pans: nPan, clips: PAGE.size, engine: ENGINE.size, missing: MISSING, courses: nCourse, sel: nSel, ex: nEx, glob: GLOB.length, liveNot: LIVE_NOT };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DATA = { moms, courses: COURSES.map((c) => ({ nm: c.nm, lines: c.lines })), sum: SUM };
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>식순 순서 실청 · 나레이션 전부 · Moment Edit</title>
<!-- [LISTEN_ORDER_1107] 자동생성물 — scripts/build-listen-order.mjs 를 고치고 다시 뽑는다 · 실청 전용(승인 뒤 병합 전에 지운다) -->
<style>
:root{--bg:#FAFAF8;--bg2:#F5F3EF;--bg3:#EDEBE6;--text:#1C1B19;--sub:#5A554C;--light:#6E6959;--border:#DDD8D1;--gold:#B89A75;--gold-text:#7A5F37;--seal:#6B2A24;--accent:#3A2D22}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.7}
.wrap{max-width:820px;margin:0 auto;padding:18px 16px 150px}
h1{font-size:19px;margin:0 0 6px}
.note{font-size:13px;color:var(--sub);background:var(--bg2);border-radius:10px;padding:10px 12px;margin:0 0 12px}
.sum b{color:var(--accent)}
.ph{font-size:12px;letter-spacing:.08em;color:var(--gold-text);margin:22px 0 8px;border-top:1px solid var(--border);padding-top:14px;font-weight:600}
.card{border:1px solid var(--border);border-radius:12px;background:#fff;margin:0 0 10px;overflow:hidden}
.card.on{outline:2px solid var(--gold);outline-offset:2px}
.hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 13px;background:var(--bg2);border-bottom:1px solid var(--border)}
.hd b{font-size:14.5px}
.lab{font-size:12px;color:var(--light)}
.btn{font:inherit;font-size:14px;min-height:44px;padding:8px 14px;border:1px solid var(--border);background:#fff;color:var(--text);border-radius:9px;cursor:pointer}
.btn.main{background:var(--accent);color:#fff;border-color:transparent}
.ln{padding:8px 13px;border-top:1px solid var(--bg3);font-size:14px}
.ln .mi{font-size:12px;color:var(--light)}
.ln.live{color:var(--light);font-size:12.5px;background:var(--bg)}
.ln.cur{background:#fbf6ee}
.top4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 12px}
details summary{cursor:pointer;font-size:13px;color:var(--sub);padding:8px 13px;list-style:none}
.bar{position:fixed;left:0;right:0;bottom:0;background:rgba(250,250,248,.97);border-top:1px solid var(--border);padding:8px 16px;z-index:30}
.bar .in{max-width:820px;margin:0 auto;display:flex;gap:8px;align-items:center}
.bar .nm{flex:1 1 auto;min-width:0;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.bar .nm small{display:block;color:var(--light);font-size:11.5px}
.bar .pg{height:4px;background:var(--bg3);border-radius:99px;overflow:hidden;max-width:820px;margin:6px auto 0}
.bar .pg>i{display:block;height:100%;width:0;background:var(--gold)}
</style></head><body><div class="wrap">
<h1>식순 순서 실청 · 나레이션 전부</h1>
<div class="note" id="canDo"><b>목록이 비어 있다면 미리보기 화면이라 그렇습니다.</b> 사파리 · 크롬에서 이 주소를 직접 열어 주세요.</div>
<div class="note sum">순간 <b>${SUM.moments}</b>개 · 판 <b>${SUM.pans}</b>개 · 클립 <b>${SUM.clips}</b>개 · 엔진이 내보내는 클립 중 페이지에 빠진 것 <b>${SUM.missing.length}</b>개${SUM.missing.length ? ' — ' + esc(SUM.missing.join(' · ')) : ''}
<br><span class="lab">이 가지 엔진의 최종 소리만 실었습니다(지금 · 바뀐 뒤 비교 아님). 판 = 기본 + 고름 ${SUM.sel}가지 × 예시 칩 ${SUM.ex}가지 조합으로 줄이 달라지는 경우 · 같은 소리는 하나로 묶었습니다. 빠진 것은 만들 수 있는 코스 ${SUM.courses.toLocaleString()}가지 × 식사 · 온라인 · 하객 안내 ${SUM.glob}가지 · 예시 코스 넷 · 위 고름에서 엔진이 낸 소리 ${SUM.engine}개와 맞대어 셉니다. 사람 구간은 1초로 줄여 넘깁니다.${SUM.liveNot.length ? '<br>참고 · 녹음 상태표가 «나는 소리»로 두지만 이 엔진이 어떤 고름으로도 내지 않는 ' + SUM.liveNot.length + '개(싣지 않음): ' + esc(SUM.liveNot.join(' · ')) : ''}</span></div>
<div class="ph">전체 이어 듣기 · 예시 코스 넷</div>
<div class="top4" id="top4"></div>
<div id="list"></div>
</div>
<div class="bar"><div class="in"><button class="btn main" id="bPlay" aria-label="멈춤">&#10074;&#10074;</button><div class="nm" id="bNm">듣기 단추를 누르세요<small id="bSub">판 하나 또는 코스 하나를 처음부터 이어 틉니다</small></div></div><div class="pg"><i id="bFill"></i></div></div>
<script>
var D = ${JSON.stringify(DATA)};
var $ = function (i) { return document.getElementById(i); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
function lineHtml(l, id) {
  return '<div class="ln" id="' + id + '"><div class="mi">' + (l.no ? '[' + esc(l.no) + '] ' : '') + esc(l.slug || l.act || '') + (l.g ? ' · 앞 줄 뒤 쉼 ' + (l.g / 1000).toFixed(1) + '초' : '') + (l.f ? '' : ' · 소리 없음') + '</div>'
    + (l.t ? '<div>' + esc(l.t) + '</div>' : '') + '</div>' + (l.live ? '<div class="ln live">사람 구간 · 1초로 줄임 · ' + esc(l.live) + '</div>' : '');
}
function labOf(p) { var n = p.n || p.lab.length; return p.lab[0] + (n > 1 ? (p.lab[0] === '기본' ? ' · 같은 소리 고름 ' + n + '가지' : ' 외 ' + (n - 1)) : ''); }
function draw() {
  $('top4').innerHTML = D.courses.map(function (c, i) { return '<button class="btn" data-c="' + i + '">' + esc(c.nm) + ' 코스 처음부터</button>'; }).join('');
  var h = '';
  D.moms.forEach(function (m, mi) {
    h += '<div class="ph">' + esc(m.name) + ' · 판 ' + m.pans.length + '</div>';
    m.pans.forEach(function (p, pi) {
      var id = 'p' + mi + '_' + pi;
      h += '<div class="card" id="' + id + '"><div class="hd"><b>' + esc(labOf(p)) + '</b><span class="lab">' + p.lines.length + '줄</span>'
        + '<button class="btn" style="margin-left:auto" data-m="' + mi + '" data-p="' + pi + '">듣기</button></div>'
        + ((p.n || 0) > 1 ? '<details><summary>같은 소리 ' + p.n + '가지 고름 보기</summary><div class="ln lab">' + esc(p.lab.join(' · ')) + (p.n > p.lab.length ? ' 외 ' + (p.n - p.lab.length) + '가지' : '') + '</div></details>' : '')
        + p.lines.map(function (l, li) { return lineHtml(l, id + '_' + li); }).join('') + '</div>';
    });
  });
  $('list').innerHTML = h;
  $('canDo').innerHTML = '판의 «듣기»는 그 판 한 줄씩 이어서(엔진 쉼 그대로 · 사람 구간 1초) · 맨 위 넷은 예시 코스를 처음부터 끝까지 틉니다. 화면을 꺼도 이어집니다.';
}
/* [IOS_GESTURE] 소리 요소는 하나(PA) — 사람이 처음 누른 요소의 src 만 바꿔 잇는다 */
var PA = null, Q = null, T = null;
function el() { if (PA) return PA; PA = new Audio(); PA.preload = 'auto';
  PA.addEventListener('ended', next); PA.addEventListener('error', function () { $('bSub').textContent = '이 소리를 못 열어 다음으로 넘어갑니다'; T = setTimeout(next, 600); });
  PA.addEventListener('timeupdate', function () { if (PA.duration) $('bFill').style.width = (PA.currentTime / PA.duration * 100) + '%'; }); return PA; }
function start(nm, lines, idp) { clearTimeout(T); Q = { nm: nm, lines: lines, idp: idp, i: -1, on: true }; next(); }
function mark() { var o = document.querySelectorAll('.ln.cur'); for (var i = 0; i < o.length; i++) o[i].classList.remove('cur');
  var e = Q && Q.idp ? $(Q.idp + '_' + Q.i) : null; if (e) { e.classList.add('cur'); try { e.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {} } }
function next() {
  clearTimeout(T); if (!Q || !Q.on) return;
  var prev = Q.lines[Q.i]; Q.i++;
  if (Q.i >= Q.lines.length) { Q.on = false; $('bPlay').innerHTML = '&#9654;'; $('bSub').textContent = '끝까지 들었어요'; return; }
  var l = Q.lines[Q.i], wait = Q.i === 0 ? 0 : (prev && prev.live ? 1000 : (l.g || 600));
  if (document.hidden) wait = Math.min(wait, 0);
  T = setTimeout(function () { play(l); }, wait);
}
function play(l) {
  if (!Q || !Q.on) return; mark();
  $('bNm').firstChild.nodeValue = Q.nm; $('bSub').textContent = (Q.i + 1) + ' / ' + Q.lines.length + ' · ' + (l.no ? '[' + l.no + '] ' : '') + (l.slug || l.act || '');
  if (!l.f) { T = setTimeout(next, 1000); return; }
  var a = el(); a.src = l.f; var pr; try { pr = a.play(); } catch (e) { stuck(); return; } if (pr && pr.catch) pr.catch(stuck);
  if ('mediaSession' in navigator && window.MediaMetadata) try { navigator.mediaSession.metadata = new MediaMetadata({ title: Q.nm, artist: (l.slug || '') + ' · Moment Edit 실청' }); } catch (e) {}
}
function stuck() { if (Q) Q.on = false; $('bPlay').innerHTML = '&#9654;'; $('bSub').textContent = '브라우저가 이어 틀기를 막았어요 · ▶ 를 눌러 이어 주세요'; }
$('bPlay').onclick = function () {
  if (!Q) return;
  if (Q.on) { Q.on = false; clearTimeout(T); if (PA) PA.pause(); this.innerHTML = '&#9654;'; return; }
  Q.on = true; this.innerHTML = '&#10074;&#10074;'; if (PA && PA.src && PA.currentTime > 0 && !PA.ended) { var pr = PA.play(); if (pr && pr.catch) pr.catch(stuck); } else { Q.i = Math.max(-1, Q.i - 1); next(); }
};
document.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.c != null) { var c = D.courses[+b.dataset.c]; $('bPlay').innerHTML = '&#10074;&#10074;'; el(); start(c.nm + ' 코스 · 처음부터 끝까지', c.lines, ''); return; }
  if (b.dataset.m != null) { var m = D.moms[+b.dataset.m], p = m.pans[+b.dataset.p]; $('bPlay').innerHTML = '&#10074;&#10074;'; el();
    var cs = document.querySelectorAll('.card.on'); for (var i = 0; i < cs.length; i++) cs[i].classList.remove('on');
    var idp = 'p' + b.dataset.m + '_' + b.dataset.p; $(idp).classList.add('on'); start(m.name + ' · ' + labOf(p), p.lines, idp); }
});
if ('mediaSession' in navigator) try { navigator.mediaSession.setActionHandler('pause', function () { $('bPlay').click(); }); navigator.mediaSession.setActionHandler('play', function () { $('bPlay').click(); }); navigator.mediaSession.setActionHandler('nexttrack', function () { if (PA) PA.pause(); next(); }); } catch (e) {}
/* [CRASH_TEXT] 스크립트가 죽으면 그 까닭을 글자 그대로(textContent) 보인다 */
window.addEventListener('error', function (e) { var el2 = $('canDo'); if (!el2) return; el2.textContent = '이 판이 이 기기에서 안 열립니다 · ' + String((e && (e.message || e.error)) || '알 수 없음').slice(0, 200); });
draw();
</script></body></html>
`;
fs.writeFileSync(OUT, html);
console.log(`  참고 · 상태표 «나는 소리» 중 엔진이 안 내는 것 ${LIVE_NOT.length}: ${LIVE_NOT.join(' · ')}`);
console.log(`썼다 ${path.relative(ROOT, OUT)} · 순간 ${SUM.moments} · 판 ${SUM.pans} · 클립 ${SUM.clips} · 엔진 소리 ${SUM.engine} · 빠진 것 ${SUM.missing.length}${SUM.missing.length ? ' — ' + SUM.missing.join(' · ') : ''} · 코스 ${nCourse}`);
