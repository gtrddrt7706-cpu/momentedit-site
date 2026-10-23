#!/usr/bin/env node
/* ★★[BGM_INFO_1023 2026-10-23 사장님 «BGM 까지는 ‹우리가 고른 곡›으로 안 해도 될 것 같아» · «최선인지 한 번 더 검토해 보고 제안대로 구현» · BGM 섹션 안]
   식순 화면(order-preview.html) ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기 «음악» 묶음 · 엔진(축사 · 편지 «음악과 함께») — 진짜 화면을 띄워 잰다(390 · 1280).
   0 원천(assets/bgm-slots.js) — 칸 10 · 덮는 순간 · 순간마다 한 줄(명세 문구 그대로) · 고르기는 축사 · 편지만(«음악 없이» · «음악과 함께») · 참고 값(크기 단계 둘 · 박수 줄 57 · 108 · 131 · 263 · 137)
     · 옛 값(own · warm · none · studio)은 읽을 때 버린다(get · clean) · 미리 듣기 주소는 'bed' 만 싣는다(곡 이름은 절대 안 나간다)
     · 엔진(assets/ritual-cue.js) — 'bed' 면 축사 사람 구간 · 편지 첫 큐 · 사람 구간 · 마무리 큐가 −20(duckRead) · 마무리 뒤 «2초 정적» 없이 4초 · 편지 장면 글 판 · 나머지 큐는 한 글자도 같다
   1 순간마다 한 줄 — 하객 맞이 · 식전 영상 · 화촉 · 맞절 · 감사 인사(S4 첫) · 서약 · 반지 · 선언 · 덕담(«앞 순서 곡이 그대로 이어져요» · 링크 없음) · 부모님께 인사 · 닫는 인사 · 축배 · 테이블 인사
     · 없음(입장 = 입장 음악 줄 그대로 · 축가) · 카드 · 꺾쇠 · 단추 없음 · 고르기 칸 맨 아래 · 이름표 «음악» 14px 같은 왼쪽 선 · 가로 넘침 없음
   2 축사 · 편지 칩 둘 — 처음엔 안 눌린 모양 · 아래 한 줄이 지금 상태 · 고르면 아래 줄이 바뀌고 S.bgm · 엔진 duck −90 ↔ −20 · «음악 없이»는 적지 않는다 · 칸 높이 그대로
   3 감사 인사를 빼면 안내 한 줄이 혼인 서약으로 옮긴다
   4 ④ «음악» 묶음 — «입장 곡 · …» + «음악과 함께»를 고른 칸 · «나머지는 스튜디오가 준비해요» / «나머지 음악은 스튜디오가 준비해요» · «보낼 것»에 음악 줄 없음
   5 옛 초안 — 저장된 own · warm · studio · none 은 불러올 때 버린다(곡 이름이 화면 어디에도 없다) · 옛 이 기기 보관함(me-bgm-song)을 지운다
   6 옛 초안 «영상» 축사(freeWhat video)는 «영상에 입힌 소리로 흘러요» 한 줄 · 요약에 안 센다 · 엔진도 무음 그대로
   8 ?mk=letter — 로그인 없이 편지 쪽이 바로 열린다(그냥 연 화면만) · 초안의 마지막 순간이 같아도 [BGM_JUMP_SAME]
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BF_MOD = 돌연변이 확인용(그 판의 bgm-form.js 로 잰다) · RC_MOD = 그 판의 ritual-cue.js · SHOT = 그림 폴더 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.BF_MOD || '', RCM = process.env.RC_MOD || '', SHOT = process.env.SHOT || '';
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const G = (t) => String(t).replace(/[«»]/g, '');   /* 화면은 «» 를 글꼴로 바꿔 글에서 지운다(GUIL_OFF) */

/* 명세 표 — 순간마다 한 줄 */
const ONE = { guest: '하객이 앉는 동안 잔잔한 연주가 흘러요', prevideo: '영상에 입힌 소리로 흘러요', candle: '화촉을 밝히는 걸음에 맞춰 밝고 우아한 곡이 흘러요', matjeol: '입장 곡이 이어져요',
  welcome: '말 아래 잔잔한 피아노가 아주 작게 깔려요', vow: '앞 순서 곡이 그대로 이어져요', ring: '앞 순서 곡이 그대로 이어져요', declare: '앞 순서 곡이 그대로 이어져요', bless: '앞 순서 곡이 그대로 이어져요',
  tribute: '부모님께 인사드리는 동안 밝고 따뜻한 곡이 흘러요', _close: '«인사!»와 함께 힘 있는 곡이 시작돼요', toast: '«위하여!»와 함께 신나는 곡이 터져요', table: '테이블 인사 · 사진 동안 재즈가 흐르고, 마지막 곡으로 닫아요' };
const NOTE = { S5: { none: '축사 동안은 음악 없이 목소리만 들려요', bed: '축사 아래 밝은 연주곡이 아주 작게 깔려요' }, S6: { none: '편지 동안은 음악 없이 두 분 목소리만 들려요', bed: '편지 아래 오르골 · 피아노가 아주 작게 흘러요' } };

/* 0 원천 · 엔진 · 미리 듣기 주소 — 브라우저 없이 */
const B = require(path.join(ROOT, 'assets/bgm-slots.js'));
const RC = require(RCM || path.join(ROOT, 'assets/ritual-cue.js')), RO = require(path.join(ROOT, 'assets/ritual-open.js')), ST = require(path.join(ROOT, 'assets/ritual-story.js'));
{ const ids = B.SLOTS.map((s) => s.id).join(' '), ks = {}; B.SLOTS.forEach((s) => s.ks.forEach((k) => { ks[k] = s.id; }));
  ok('0 칸 10 · 덮는 순간 그대로(하객 맞이 S1 · 화촉 S2 · 입장 · 맞절 S3 · 감사 인사 ~ 덕담 S4 · 축사 S5 · 편지 S6 · 부모님께 인사 S7 · 닫는 인사 S8 · 축배 S9 · 테이블 인사 S10)',
    ids === 'S1 S2 S3 S4 S5 S6 S7 S8 S9 S10' && JSON.stringify(ks) === JSON.stringify({ guest: 'S1', candle: 'S2', entry: 'S3', matjeol: 'S3', welcome: 'S4', vow: 'S4', ring: 'S4', declare: 'S4', bless: 'S4', free: 'S5', letter: 'S6', tribute: 'S7', _close: 'S8', toast: 'S9', table: 'S10' }), { ids, ks });
  const all = () => true, V = (k, o) => B.viewOf(k, Object.assign({ onOf: all, seq: ['welcome', 'vow', 'ring', 'declare', 'bless'], freeKind: 'speech' }, o || {}));
  const badL = Object.keys(ONE).filter((k) => { const v = V(k); return !v || v.kind !== 'line' || v.t !== ONE[k]; });
  ok('0 순간마다 한 줄 — 명세 표 문구 그대로(화촉 «걸음» · 테이블 인사 «식사» 없음 · 서약 ~ 덕담 «앞 순서 곡이 그대로 이어져요»)', badL.length === 0 && !/어머님|개식/.test(ONE.candle) && !/식사/.test(ONE.table), badL.map((k) => [k, V(k)]));
  ok('0 고르기는 축사 · 편지만 — «음악 없이»(기본 · 먼저) · «음악과 함께» · 나머지 칸은 고르기 없음 · 입장 · 축가는 줄 없음(입장 음악 줄 그대로)',
    B.SLOTS.filter((s) => s.picks.length).map((s) => s.id + ':' + s.picks.join('/')).join() === 'S5:none/bed,S6:none/bed' && B.label(B.slot('S5'), 'none') === '음악 없이' && B.label(B.slot('S5'), 'bed') === '음악과 함께'
    && V('free').kind === 'pick' && V('letter').kind === 'pick' && V('entry').kind === 'entry' && V('song') === null);
  ok('0 축사 · 편지 아래 한 줄 넷 그대로', ['S5', 'S6'].every((id) => B.lineOf(B.slot(id), 'none') === NOTE[id].none && B.lineOf(B.slot(id), 'bed') === NOTE[id].bed));
  ok('0 옛 «영상» 축사 = «영상에 입힌 소리로 흘러요» · 옛 선물 · 기타 = 줄 없음 · 감사 인사를 빼면 서약이 안내 한 줄을 받는다',
    V('free', { freeKind: 'video' }).t === '영상에 입힌 소리로 흘러요' && V('free', { freeKind: 'gift' }) === null && V('free', { freeKind: 'etc' }) === null
    && V('vow', { onOf: (k) => k !== 'welcome' }).t === ONE.welcome && V('ring', { onOf: (k) => k !== 'welcome' }).t === ONE.vow);
  const r4 = B.slot('S4').ref, cl = B.SLOTS.flatMap((s) => (s.ref.clap || []).map((c) => c.no)).join();
  ok('0 참고 값 그대로 — S4 크기 단계 둘 · 박수 줄 57 · 108 · 131 · S2 이음말(263) · 개식 인사(137)',
    r4.levels.length === 2 && r4.levels[0].lv === '작게' && r4.levels[1].lv === '아주 작게 · 거의 들리지 않게' && cl === '57,108,131' && /263/.test(B.slot('S2').ref.from) && /137/.test(B.slot('S1').ref.note), { r4, cl });
  const OLD = { S1: { m: 'own', own: { n: '옛 곡', a: '가수', d: 200 } }, S5: { m: 'studio' }, S6: { m: 'none' }, S7: { m: 'warm' }, S10: { m: 'own' } };
  ok('0 옛 값은 버린다 — get: own · studio · none · warm → 기본 · clean: «음악과 함께»만 남고 곡 이름은 사라진다',
    B.get({ bgm: OLD }, 'S5').m === 'none' && !B.get({ bgm: OLD }, 'S5').set && B.get({ bgm: OLD }, 'S1').m === null && B.clean(OLD) === undefined
    && JSON.stringify(B.clean(Object.assign({}, OLD, { S6: { m: 'bed', own: { n: 'x' } } }))) === '{"S6":{"m":"bed"}}' && B.get({ bgm: { S1: { m: 'bed' } } }, 'S1').m === null);
  /* 엔진 */
  const ALL = {}; RO.PICKABLE.forEach((k) => { ALL[k] = 1; });
  const bld = (bgm, x) => { const S = Object.assign({ course: 'open', on: Object.assign({}, ALL) }, x || {}); RO.setChip(S, 'free', (x && x.freeWhat) || 'speech'); if (bgm) S.bgm = bgm; return RC.build(S, { mode: 'console' }).cues; };
  const pick = (cs) => { const fr = cs.find((c) => c.k === 'free' && c.live), l0 = cs.find((c) => c.k === 'letter' && c.live), le = cs.find((c) => c.slug === 'narr-letter-end');
    return { free: fr && fr.live.duck, l0: l0 && l0.duck, l0live: l0 && l0.live.duck, lt: l0 && l0.live.t, le: le && le.duck, post: le && JSON.stringify(le.post) }; };
  const n0 = pick(bld(null)), nb = pick(bld({ S5: { m: 'bed' }, S6: { m: 'bed' } })), n5 = pick(bld({ S5: { m: 'bed' } })), nOld = bld(OLD), nNone = bld(null);
  ok('0 엔진 기본(음악 없이) — 축사 사람 구간 −90 · 편지 첫 큐 · 사람 구간 · 마무리 −90 · 마무리 뒤 2초 정적 → 4초에 −16',
    n0.free === -90 && n0.l0 === -90 && n0.l0live === -90 && n0.le === -90 && n0.lt === '두 분이 직접 편지 낭독' && n0.post === '[{"wait":2000},{"music":"to","v":-16,"ms":4000}]', n0);
  ok('0 엔진 «음악과 함께» — 축사 −20 · 편지 첫 큐 · 사람 구간 · 마무리 −20(duckRead) · 정적 없이 4초에 −16 · 편지 장면 글 판(«음악이 아주 작게») · 축사만 고르면 편지는 그대로',
    RC.PARAM.duckRead === -20 && nb.free === -20 && nb.l0 === -20 && nb.l0live === -20 && nb.le === -20 && nb.post === '[{"music":"to","v":-16,"ms":4000}]'
    && nb.lt === '두 분이 직접 편지 낭독 (음악이 아주 작게)' && n5.free === -20 && n5.l0 === -90 && n5.lt === '두 분이 직접 편지 낭독', { nb, n5 });
  const same = (a, b) => a.length === b.length && a.every((c, i) => JSON.stringify(c) === JSON.stringify(b[i]));
  const bedCs = bld({ S5: { m: 'bed' }, S6: { m: 'bed' } }), touched = bedCs.filter((c, i) => JSON.stringify(c) !== JSON.stringify(nNone[i])).map((c) => c.slug);
  ok('0 엔진 — 옛 값(own · studio · none · warm)은 기본과 한 글자도 같다 · «음악과 함께»가 바꾸는 큐는 축사 · 편지 셋뿐',
    same(nOld, nNone) && bedCs.length === nNone.length && touched.join() === 'narr-free-in-speech,letter-each,narr-letter-end', touched);
  const vid = pick(bld({ S5: { m: 'bed' } }, { freeWhat: 'video' }));
  ok('0 엔진 — 옛 «영상» 축사는 «음악과 함께»가 남아 있어도 무음 그대로', vid.free === -90, vid);
  const sc = ST.LIVE['두 분이 직접 편지 낭독 (음악이 아주 작게)'], s0 = ST.LIVE['두 분이 직접 편지 낭독'];
  ok('0 장면 글 — 편지 «음악과 함께» 판은 «이 자리에는 안내 음성이 없어요. 음악이 아주 작게 흐르고 두 분의 목소리가 주인공이에요.» · 기본 판은 그대로 · 팁 · 안심은 같다',
    !!sc && /이 자리에는 안내 음성이 없어요\. 음악이 아주 작게 흐르고 두 분의 목소리가 주인공이에요\.$/.test(sc.scene) && /음악도 안내 음성도 없어요/.test(s0.scene) && sc.tip === s0.tip && sc.safe === s0.safe && sc.who === s0.who);
  const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8'))(w); const PL = w.RitualPreviewLink;
  const u1 = PL.pick({ course: 'open', bgm: Object.assign({}, OLD, { S5: { m: 'bed' } }) }), u2 = PL.pick({ course: 'open', bgm: OLD });
  ok('0 미리 듣기 주소 — «음악과 함께»만 싣는다 · 옛 곡 이름은 절대 안 나간다', JSON.stringify(u1.bgm) === '{"S5":{"m":"bed"}}' && u2.bgm === undefined && !/옛 곡|own/.test(JSON.stringify([u1, u2])), { u1, u2 });
}

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('skip bgm-form: 브라우저가 없어 화면은 재지 못함(원천 · 엔진은 쟀다)'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (MOD && u === '/assets/bgm-form.js') ? MOD : (RCM && u === '/assets/ritual-cue.js') ? RCM : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('skip bgm-form: 브라우저 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const ALLK = ['candle', 'free', 'letter', 'tribute', 'toast', 'table', 'prevideo', 'song', 'ring', 'bless', 'declare', 'vow', 'welcome'];
async function openPage(W, q, ctx0) {
  const ctx = ctx0 || await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (!u.startsWith('http://127.0.0.1:' + port)) return rt.fulfill({ status: 200, body: '' }); return rt.continue(); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html${q || ''}`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  return { ctx, pg, errs };
}
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
async function walk(pg) { await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500);
  await pg.evaluate((all) => { all.forEach((k) => { S.on[k] = 1; }); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALLK);
  await clickNext(pg); await pg.waitForTimeout(1200); }
const go = async (pg, k) => { await pg.evaluate((k) => mkGo(k), k); await pg.waitForTimeout(500); };
const look = (pg) => pg.evaluate(() => { const row = document.querySelector('.ls-bgm'), vars = document.querySelector('.mk-pick .ls-vars'), gl = row && row.querySelector('.gl'), gl0 = vars && vars.querySelector('.ls-cg:not(.ls-bgm) .gl');
  const t = (x) => x ? x.textContent.replace(/[\s ]+/g, ' ').trim() : '';
  return { row: !!row, slot: row && row.getAttribute('data-slot'), last: !!(row && vars && vars.lastElementChild === row), mu: !!document.querySelector('.ls-mu'),
    txt: row ? t(row.querySelector('.bgm-line')) : '', note: row ? t(row.querySelector('.bgm-note')) : '', btns: row ? row.querySelectorAll('button:not(.op-chip)').length : 0, old: !!document.querySelector('.bgm-sum,.bgm-card,.bgm-cv,[data-fk^="bgmup:"],[data-fk^="bgmopen:"]'),
    chips: row ? [...row.querySelectorAll('.op-chip')].map((b) => b.textContent.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')) : [], rowH: row ? Math.round(row.getBoundingClientRect().height * 10) / 10 : 0,
    noteFs: row && row.querySelector('.bgm-note') ? getComputedStyle(row.querySelector('.bgm-note')).fontSize : '',
    glX: gl ? Math.round(gl.getBoundingClientRect().left) : null, glX0: gl0 ? Math.round(gl0.getBoundingClientRect().left) : null, glFs: gl ? getComputedStyle(gl).fontSize : '',
    bgm: JSON.stringify(S.bgm === undefined ? null : S.bgm), hz: document.documentElement.scrollWidth > innerWidth + 1, head: (document.querySelector('#mkHead') || { textContent: '' }).textContent }; });
const eng = (pg) => pg.evaluate(async () => { const g = await engine(); const cs = g.RitualCue.build(JSON.parse(JSON.stringify(S)), { mode: 'console' }).cues, fr = cs.find((c) => c.k === 'free' && c.live), l0 = cs.find((c) => c.k === 'letter' && c.live), le = cs.find((c) => c.slug === 'narr-letter-end');
  return { free: fr ? fr.live.duck : null, l0: l0 ? l0.live.duck : null, lt: l0 ? l0.live.t : '', le: le ? le.duck : null }; });
const hideFixed = (pg) => pg.evaluate(() => { const st = document.createElement('style'); st.id = 'bfShot'; st.textContent = '.nav,.nav *,.ls-mini{visibility:hidden!important;opacity:0!important}'; document.head.appendChild(st); });
const showFixed = (pg) => pg.evaluate(() => { const st = document.getElementById('bfShot'); if (st) st.remove(); });
async function shot(pg, W, name, sel) { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await hideFixed(pg);
  const box = await pg.evaluate((sel) => { const a = document.querySelector(sel || '.mk-pick'); if (!a) return null; const r = a.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 12), width: innerWidth, height: Math.min(2600, r.height + 24) }; }, sel);
  if (box) await pg.screenshot({ path: path.join(SHOT, `${name}-${W}.png`), clip: box, fullPage: true }); await showFixed(pg); }
const sumLook = (pg) => pg.evaluate(() => { const secs = [...document.querySelectorAll('.mk-sum .mk-sec')], send = secs.find((s) => /^보낼 것/.test((s.querySelector('h4') || {}).textContent || '')), mus = document.querySelector('.mk-sum .mk-bgm');
  const t = (x) => x.textContent.replace(/[\s ]+/g, ' ').trim();
  return { sends: send ? [...send.querySelectorAll('.mk-vn')].map(t) : [], rows: mus ? [...mus.querySelectorAll('li')].map(t) : [], hz: document.documentElement.scrollWidth > innerWidth + 1,
    order: secs.map((s) => (s.querySelector('h4') || {}).textContent || '') }; });

try {
  for (const W of [390, 1280]) {
    const { ctx, pg, errs } = await openPage(W); await walk(pg);
    /* 1 순간마다 */
    const bad = [], seen = {};
    for (const k of [...Object.keys(ONE), 'entry', 'song', 'free', 'letter']) { await go(pg, k); const L = await look(pg); seen[k] = L;
      if (['candle', 'vow', 'tribute', '_close', 'table'].includes(k)) await shot(pg, W, 'bgm-' + k.replace('_', ''));
      let good = !L.hz && !L.old;
      if (ONE[k]) good = good && L.row && L.last && L.txt === G(ONE[k]) && L.chips.length === 0 && L.btns === 0 && L.glX === L.glX0 && L.glFs === '14px';
      else if (k === 'entry') good = good && !L.row && L.mu;   /* 입장 음악 줄은 그대로 */
      else if (k === 'song') good = good && !L.row;
      else good = good && L.row && L.last && L.chips.join() === '음악 없이,음악과 함께' && L.note === NOTE[k === 'free' ? 'S5' : 'S6'].none && L.noteFs === '12.5px' && L.glX === L.glX0;
      if (!good) bad.push([k, L]); }
    ok(`${W} 1 순간마다 한 줄(명세 표 그대로) · 서약 ~ 덕담 «앞 순서 곡이 그대로 이어져요»(링크 없음) · 축사 · 편지만 칩 둘(안 눌린 모양 · 아래 한 줄 12.5px) · 입장 = 입장 음악 줄 · 축가 없음 · 카드 · 꺾쇠 없음 · 맨 아래 · 이름표 같은 왼쪽 선 · 가로 넘침 없음`, bad.length === 0 && errs.length === 0, { bad, errs });
    ok(`${W} 1 손대지 않으면 S.bgm 이 없다`, seen.table.bgm === 'null', seen.table.bgm);
    /* 2 칩 */
    await go(pg, 'free'); const f0 = await look(pg), e0 = await eng(pg); await shot(pg, W, 'bgm-free-none');
    await pg.click('[data-fk="bgm:S5:bed"]'); await pg.waitForTimeout(300); const f1 = await look(pg), e1 = await eng(pg); await shot(pg, W, 'bgm-free-bed');
    await pg.click('[data-fk="bgm:S5:none"]'); await pg.waitForTimeout(300); const f2 = await look(pg), e2 = await eng(pg);
    ok(`${W} 2 축사 — «음악과 함께» → 눌린 모양 · «축사 아래 밝은 연주곡이 아주 작게 깔려요» · S.bgm.S5 bed · 엔진 −90 → −20 · «음악 없이» → 눌린 모양 · 지운다 · 엔진 −90 · 칸 높이 그대로`,
      f0.chips.join() === '음악 없이,음악과 함께' && e0.free === -90 && f1.chips.join() === '음악 없이,음악과 함께*' && f1.note === NOTE.S5.bed && f1.bgm === '{"S5":{"m":"bed"}}' && e1.free === -20
      && f2.chips.join() === '음악 없이*,음악과 함께' && f2.note === NOTE.S5.none && f2.bgm === 'null' && e2.free === -90 && Math.abs(f0.rowH - f1.rowH) < 0.6 && Math.abs(f1.rowH - f2.rowH) < 0.6, { f0, f1, f2, e0, e1, e2 });
    await go(pg, 'letter'); const l0 = await look(pg);
    await pg.click('[data-fk="bgm:S6:bed"]'); await pg.waitForTimeout(300); const l1 = await look(pg), m1 = await eng(pg); await shot(pg, W, 'bgm-letter-bed');
    ok(`${W} 2 편지 — «음악과 함께» → «편지 아래 오르골 · 피아노가 아주 작게 흘러요» · S.bgm.S6 bed · 엔진 사람 구간 · 마무리 −20 · 장면 판 · 칸 높이 그대로`,
      l0.note === NOTE.S6.none && l1.chips.join() === '음악 없이,음악과 함께*' && l1.note === NOTE.S6.bed && l1.bgm === '{"S6":{"m":"bed"}}' && m1.l0 === -20 && m1.le === -20 && m1.lt === '두 분이 직접 편지 낭독 (음악이 아주 작게)' && m1.free === -90
      && Math.abs(l0.rowH - l1.rowH) < 0.6 && !l1.hz, { l0, l1, m1 });
    /* 4 요약 */
    await pg.evaluate(() => { delete S.bgm; delete S.mu; _persist(); }); await go(pg, 'free'); await go(pg, '_sum'); const z0 = await sumLook(pg); await shot(pg, W, 'bgm-sum-none', '.mk-sum .mk-bgm');
    await pg.evaluate(() => { S.bgm = { S5: { m: 'bed' }, S6: { m: 'bed' } }; _persist(); }); await go(pg, 'free'); await go(pg, '_sum'); const z1 = await sumLook(pg); await shot(pg, W, 'bgm-sum-bed', '.mk-sum .mk-bgm');
    await pg.evaluate(() => { S.bgm = { S6: { m: 'bed' } }; S.mu = { src: 'rec', k: 'r1', t: '시험 곡', hook: 30 }; _persist(); }); await go(pg, 'free'); await go(pg, '_sum'); const z2 = await sumLook(pg);
    await pg.evaluate(() => { delete S.bgm; delete S.mu; _persist(); });
    ok(`${W} 4 요약 — 기본 «입장 곡 · 스튜디오가 준비해요» + «나머지 음악은 스튜디오가 준비해요» · 둘 다 «축사 · 편지는 음악과 함께 · 나머지는 스튜디오가 준비해요» · 편지만 · 입장 곡 이름 · «보낼 것» 다음 · 보낼 것에 음악 줄 없음`,
      z0.rows.join(' / ') === '입장 곡 · 스튜디오가 준비해요 / 나머지 음악은 스튜디오가 준비해요' && z1.rows.join(' / ') === '입장 곡 · 스튜디오가 준비해요 / 축사 · 편지는 음악과 함께 · 나머지는 스튜디오가 준비해요'
      && z2.rows.join(' / ') === '입장 곡 · ‹시험 곡› / 편지는 음악과 함께 · 나머지는 스튜디오가 준비해요' && !z1.sends.some((x) => /음악/.test(x)) && z1.order.indexOf('음악') === z1.order.indexOf('보낼 것') + 1 && !z1.hz, { z0, z1, z2 });
    /* 3 감사 인사 빼기 */
    await pg.evaluate(() => { delete S.on.welcome; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); }); await go(pg, 'vow'); const v3 = await look(pg);
    await pg.evaluate(() => { S.on.welcome = 1; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); });
    ok(`${W} 3 감사 인사를 빼면 혼인 서약이 «말 아래 잔잔한 피아노가 아주 작게 깔려요»를 받는다`, v3.txt === ONE.welcome, v3);
    /* 6 옛 «영상» 축사 */
    await pg.evaluate(() => { S.freeWhat = 'video'; S.bgm = { S5: { m: 'bed' } }; _persist(); }); await go(pg, '_sum'); await go(pg, 'free'); const v6 = await look(pg), e6 = await eng(pg); await go(pg, '_sum'); const s6 = await sumLook(pg);
    await pg.evaluate(() => { S.freeWhat = 'speech'; delete S.bgm; _persist(); });
    ok(`${W} 6 옛 «영상» 축사 — «영상에 입힌 소리로 흘러요» 한 줄 · 칩 없음 · 요약에 안 센다 · 엔진 무음 그대로`,
      v6.txt === '영상에 입힌 소리로 흘러요' && v6.chips.length === 0 && s6.rows[1] === '나머지 음악은 스튜디오가 준비해요' && e6.free === -90, { v6, s6, e6 });
    if (errs.length) ok(`${W} 쪽 오류 없음`, false, errs); else ok(`${W} 쪽 오류 없음`, true);
    await ctx.close();
  }
  /* 5 옛 초안 — 저장된 옛 값 · 이 기기 보관함 */
  { const { ctx, pg, errs } = await openPage(390); await walk(pg);
    await pg.evaluate(() => new Promise((ok) => { const q = indexedDB.open('me-bgm-song', 1); q.onupgradeneeded = () => q.result.createObjectStore('f'); q.onsuccess = () => { q.result.close(); ok(); }; q.onerror = () => ok(); }));
    await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('me_order')); d.S.bgm = { S1: { m: 'own', own: { n: '옛곡이름', a: '옛가수', d: 200 } }, S5: { m: 'bed' }, S6: { m: 'studio' }, S7: { m: 'warm' }, S10: { m: 'own' } }; localStorage.setItem('me_order', JSON.stringify(d)); });
    const pg2 = (await openPage(390, '', ctx)).pg; await pg2.waitForTimeout(1200);
    const dbs = await pg2.evaluate(() => (indexedDB.databases ? indexedDB.databases().then((l) => l.map((x) => x.name)) : Promise.resolve(['?'])));
    await go(pg2, 'free'); const o1 = await look(pg2); await go(pg2, 'guest'); const o2 = await look(pg2); await go(pg2, '_sum'); const o3 = await sumLook(pg2);
    const body = await pg2.evaluate(() => document.body.innerText + JSON.stringify(S.bgm || null) + localStorage.getItem('me_order'));
    ok('5 옛 초안 — 불러올 때 «음악과 함께»만 남는다(S.bgm = {S5:bed}) · 축사 칩 눌린 모양 · 옛 곡 이름 · 가수가 화면 · 저장 어디에도 없다 · 요약 «축사는 음악과 함께» · 이 기기 보관함(me-bgm-song) 지움',
      o1.bgm === '{"S5":{"m":"bed"}}' && o1.chips.join() === '음악 없이,음악과 함께*' && o2.txt === ONE.guest && !/옛곡이름|옛가수/.test(body) && o3.rows[1] === '축사는 음악과 함께 · 나머지는 스튜디오가 준비해요' && dbs.indexOf('me-bgm-song') < 0,
      { o1, o2, o3, dbs, hit: /옛곡이름/.test(body) });
    await ctx.close(); }
  /* 8 바로 열기 */
  { const { ctx, pg, errs } = await openPage(390, '?mk=letter'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=letter — 로그인 없이 편지 쪽이 바로 열린다 · 음악 줄(S6) 칩 둘', /편지/.test(L.head) && L.slot === 'S6' && L.chips.length === 2 && errs.length === 0, { L, errs });
    await ctx.close(); }
  { const { ctx, pg } = await openPage(390, '?mk=table'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=table — 빠져 있던 테이블 인사를 담고 그 쪽', /테이블/.test(L.head) && L.slot === 'S10' && L.txt === ONE.table, L); await ctx.close(); }
  /* [BGM_JUMP_SAME 2026-10-23 실사이트 확인] 초안의 마지막 순간(S.mk.at)이 주소와 같아도 «고르기»에 머물지 않고 그 순간 쪽이 열린다 */
  { const { ctx, pg, errs } = await openPage(390, '?mk=letter'); await pg.waitForTimeout(1200);
    const at0 = await pg.evaluate(() => { try { _persist(); return JSON.parse(localStorage.getItem('me_order')).S.mk.at; } catch (e) { return null; } });
    await pg.goto(pg.url(), { waitUntil: 'load' }); await pg.waitForTimeout(2000); const L = await look(pg);
    ok('8 at 이 같은 초안(at=letter)으로 ?mk=letter 를 다시 열어도 편지 쪽(하나씩 만들기) · 음악 줄(S6)', at0 === 'letter' && /편지/.test(L.head) && L.slot === 'S6' && errs.length === 0, { at0, L, errs });
    await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `bgm-form: FAIL ${fail}` : 'bgm-form: ok');
process.exit(fail ? 1 : 0);
