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
   ★★[BGM_R1_1023 2026-10-23 BGM 섹션 라운드 1 «안내는 ‹흐름›으로 · 고르기에는 고를 것만»] 1 · 3 · 5 · 6 · 8 을 새 꼴로 —
     고를 것이 없는 음악 안내는 «고르기»에 없다 · «흐름»의 채운 점 줄 하나(li.q.bgm-q · 입장 «음악에 맞춰 걸어 들어와요»와 같은 글자 크기 · 굵기 · 색 · 단추 · data-ml 없음) · 자리(맨 앞 · 영상 줄 앞 · 이음말 뒤 · 목례 뒤 · 위하여 뒤) ·
     «이 순간 전체 듣기 · n줄»의 n 은 엔진 나레이션 줄 수 그대로(음악 줄을 세지 않는다) · «고르기» 음악 줄은 입장 · 축사 · 편지만(이름표 «입장 음악 · 축사 음악 · 편지 음악») ·
     ④ 입장 곡을 안 골랐으면 «입장 곡 · 고르지 않으시면 스튜디오가 준비해요» + «이동하기»(입장 쪽 · 미완료 셈 그대로) · 골랐으면 곡 이름(이동하기 없음)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BF_MOD = 돌연변이 확인용(그 판의 bgm-form.js 로 잰다) · RC_MOD = 그 판의 ritual-cue.js · BS_MOD = 그 판의 bgm-slots.js · OP_MOD = 그 판의 order-preview.html · SHOT = 그림 폴더 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.BF_MOD || '', RCM = process.env.RC_MOD || '', BSM = process.env.BS_MOD || '', OPM = process.env.OP_MOD || '', SHOT = process.env.SHOT || '';
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const G = (t) => String(t).replace(/[«»]/g, '');   /* 화면은 «» 를 글꼴로 바꿔 글에서 지운다(GUIL_OFF) */

/* 명세 표 — 순간마다 흐름 줄 하나 · 자리 [BGM_R1_1023] */
const CONT = '감사 인사부터 흐르던 피아노가 아주 작게 이어져요';
const ONE = { guest: '하객이 앉는 동안 잔잔한 연주가 흘러요', prevideo: '영상에 입힌 소리로 흘러요', candle: '화촉을 밝히는 걸음에 맞춰 밝고 우아한 곡이 흘러요', matjeol: '입장 곡이 이어져요',
  welcome: '목소리 뒤로 잔잔한 피아노가 아주 작게 흘러요', vow: CONT, ring: CONT, declare: CONT, bless: CONT,
  tribute: '부모님께 인사드리는 동안 밝고 따뜻한 곡이 흘러요', _close: '«인사!»와 함께 힘 있는 곡이 시작돼요', toast: '«위하여!»와 함께 신나는 곡이 울려 퍼져요', table: '테이블 인사와 사진 동안 재즈가 흐르고, 마지막 곡으로 하루를 마무리해요' };
const AT = { guest: 'top', prevideo: 'video', candle: 'bridge', matjeol: 'top', welcome: 'top', vow: 'top', ring: 'top', declare: 'top', bless: 'top', tribute: 'top', _close: 'bow', toast: 'cheers', table: 'top' };
const NAME = { welcome: '감사 인사', vow: '혼인 서약', ring: '반지 교환', declare: '성혼 선언', bless: '덕담' };
const NOTE = { S5: { none: '축사 동안은 음악 없이 목소리만 들려요', bed: '축사 아래 밝은 연주곡이 아주 작게 깔려요' }, S6: { none: '편지 동안은 음악 없이 두 분 목소리만 들려요', bed: '편지 아래 오르골 · 피아노가 아주 작게 흘러요' } };

/* 0 원천 · 엔진 · 미리 듣기 주소 — 브라우저 없이 */
const B = require(BSM || path.join(ROOT, 'assets/bgm-slots.js'));
const RC = require(RCM || path.join(ROOT, 'assets/ritual-cue.js')), RO = require(path.join(ROOT, 'assets/ritual-open.js')), ST = require(path.join(ROOT, 'assets/ritual-story.js'));
{ const ids = B.SLOTS.map((s) => s.id).join(' '), ks = {}; B.SLOTS.forEach((s) => s.ks.forEach((k) => { ks[k] = s.id; }));
  ok('0 칸 10 · 덮는 순간 그대로(하객 맞이 S1 · 화촉 S2 · 입장 · 맞절 S3 · 감사 인사 ~ 덕담 S4 · 축사 S5 · 편지 S6 · 부모님께 인사 S7 · 닫는 인사 S8 · 축배 S9 · 테이블 인사 S10)',
    ids === 'S1 S2 S3 S4 S5 S6 S7 S8 S9 S10' && JSON.stringify(ks) === JSON.stringify({ guest: 'S1', candle: 'S2', entry: 'S3', matjeol: 'S3', welcome: 'S4', vow: 'S4', ring: 'S4', declare: 'S4', bless: 'S4', free: 'S5', letter: 'S6', tribute: 'S7', _close: 'S8', toast: 'S9', table: 'S10' }), { ids, ks });
  const all = () => true, V = (k, o) => B.viewOf(k, Object.assign({ onOf: all, seq: ['welcome', 'vow', 'ring', 'declare', 'bless'], freeKind: 'speech', nameOf: (x) => NAME[x] || x }, o || {}));
  const badL = Object.keys(ONE).filter((k) => { const v = V(k); return !v || v.kind !== 'flow' || v.t !== ONE[k] || v.at !== AT[k]; });
  ok('0 [BGM_R1_1023] 순간마다 흐름 줄 하나 — 명세 표 문구 · 자리 그대로(«말 아래» · «터져요» 없음 · 테이블 인사 «하루를 마무리» · 서약 ~ 덕담 «감사 인사부터 흐르던 피아노가 아주 작게 이어져요»)',
    badL.length === 0 && !/어머님|개식/.test(ONE.candle) && !/식사/.test(ONE.table) && !B.SLOTS.some((s) => /말 아래|터져요|곡으로 닫아요/.test(s.one || '')), badL.map((k) => [k, V(k)]));
  /* 자리 — 엔진 줄 차례로 «이 줄 앞에» 번호 */
  const S0 = (a) => a.map((x) => Object.assign({ slug: '', txt: '' }, x));
  const FA = typeof B.flowAt !== 'function' ? { none: 'flowAt 없음' } : { video: B.flowAt('video', S0([{ slug: 'narr-prevideo-in' }, { skip: true, txt: '여기서 두 분의 영상이 흘러요' }, { slug: 'narr-prevideo-out' }])), video0: B.flowAt('video', S0([{ slug: 'a' }, { slug: 'b' }])),
    bridge: B.flowAt('bridge', S0([{ slug: 'bridge-b14-candle-name' }, { slug: 'narr-candle-in' }])), bridge0: B.flowAt('bridge', S0([{ slug: 'narr-candle-in' }])),
    bow: B.flowAt('bow', S0([{ slug: 'narr-close-bow' }, { quiet: true, txt: '두 분이 하객께 목례 · 박수' }, { slug: 'b13' }])),
    cheers: B.flowAt('cheers', S0([{ slug: 'toast-toast', txt: '… 위하여 …' }, { talk: true, txt: '여기서 두 분이 «위하여!»를 외치면' }, { slug: 'narr-toast-out' }])), top: B.flowAt('top', S0([{}, {}])) };
  ok('0 [BGM_R1_1023] 자리 — 영상 줄 바로 앞(없으면 맨 앞) · 첫 줄이 이음말이면 그 뒤(아니면 맨 앞) · 목례 줄 뒤 · «위하여!» 차례 뒤 · 맨 앞',
    FA.video === 1 && FA.video0 === 0 && FA.bridge === 1 && FA.bridge0 === 0 && FA.bow === 2 && FA.cheers === 2 && FA.top === 0, FA);
  ok('0 고르기는 축사 · 편지만 — «음악 없이»(기본 · 먼저) · «음악과 함께» · 나머지 칸은 고르기 없음 · 입장 · 축가는 흐름 줄 없음(입장 음악 줄 그대로)',
    B.SLOTS.filter((s) => s.picks.length).map((s) => s.id + ':' + s.picks.join('/')).join() === 'S5:none/bed,S6:none/bed' && B.label(B.slot('S5'), 'none') === '음악 없이' && B.label(B.slot('S5'), 'bed') === '음악과 함께'
    && V('free').kind === 'pick' && V('letter').kind === 'pick' && V('entry').kind === 'entry' && V('song') === null);
  ok('0 축사 · 편지 아래 한 줄 넷 그대로', ['S5', 'S6'].every((id) => B.lineOf(B.slot(id), 'none') === NOTE[id].none && B.lineOf(B.slot(id), 'bed') === NOTE[id].bed));
  ok('0 옛 «영상» 축사 = 흐름 줄 «영상에 입힌 소리로 흘러요»(영상 줄 앞) · 옛 선물 · 기타 = 줄 없음 · 감사 인사를 빼면 서약이 첫 줄을 받고 반지는 «혼인 서약부터…»',
    V('free', { freeKind: 'video' }).kind === 'flow' && V('free', { freeKind: 'video' }).t === '영상에 입힌 소리로 흘러요' && V('free', { freeKind: 'video' }).at === 'video' && V('free', { freeKind: 'gift' }) === null && V('free', { freeKind: 'etc' }) === null
    && V('vow', { onOf: (k) => k !== 'welcome' }).t === ONE.welcome && V('ring', { onOf: (k) => k !== 'welcome' }).t === '혼인 서약부터 흐르던 피아노가 아주 작게 이어져요');
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
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (MOD && u === '/assets/bgm-form.js') ? MOD : (RCM && u === '/assets/ritual-cue.js') ? RCM : (BSM && u === '/assets/bgm-slots.js') ? BSM : (OPM && u === '/order-preview.html') ? OPM : path.join(ROOT, u);
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
    bgm: JSON.stringify(S.bgm === undefined ? null : S.bgm), hz: document.documentElement.scrollWidth > innerWidth + 1, head: (document.querySelector('#mkHead') || { textContent: '' }).textContent,
    gl: gl ? t(gl) : '', gls: vars ? [...vars.querySelectorAll('.ls-cg > .gl')].map(t) : [],
    /* [BGM_R1_1023] 흐름 음악 줄 — 몇 개 · 글 · 칸 · 자리(앞뒤 줄) · 단추 · 모양(글자 크기 · 굵기 · 색 · 들여쓰기 · 점 색) · 나레이션 줄 수 · 알약 n */
    ...(() => { const lis = [...document.querySelectorAll('.mk-flow > li')], bq = [...document.querySelectorAll('.mk-flow > li.bgm-q')], q0 = bq[0] || null, qi = q0 ? lis.indexOf(q0) : -1, qa = q0 && q0.querySelector('.qa');
      const cs = qa ? getComputedStyle(qa) : null, lcs = q0 ? getComputedStyle(q0) : null, pill = document.querySelector('.mk-hbtn[data-mp]'), m = pill ? /· (\d+)줄/.exec(pill.textContent) : null;
      return { fq: bq.length, ftxt: q0 ? t(q0) : '', fslot: q0 ? q0.getAttribute('data-bgm') : '', fi: qi, fcls: q0 ? q0.className : '',
        prev: qi > 0 ? t(lis[qi - 1]) : '', prevCls: qi > 0 ? lis[qi - 1].className : '', next: qi > -1 && qi < lis.length - 1 ? t(lis[qi + 1]) : '', nextCls: qi > -1 && qi < lis.length - 1 ? lis[qi + 1].className : '',
        fbtn: q0 ? q0.querySelectorAll('button,[data-ml],svg').length : 0, flook: cs ? [cs.fontSize, cs.fontWeight, cs.color, lcs.paddingLeft, lcs.fontSize, getComputedStyle(q0, '::after').backgroundColor].join(' ') : '',
        nN: document.querySelectorAll('.mk-flow > li.n').length, pillN: m ? +m[1] : null }; })() }; });
const eng = (pg) => pg.evaluate(async () => { const g = await engine(); const cs = g.RitualCue.build(JSON.parse(JSON.stringify(S)), { mode: 'console' }).cues, fr = cs.find((c) => c.k === 'free' && c.live), l0 = cs.find((c) => c.k === 'letter' && c.live), le = cs.find((c) => c.slug === 'narr-letter-end');
  return { free: fr ? fr.live.duck : null, l0: l0 ? l0.live.duck : null, lt: l0 ? l0.live.t : '', le: le ? le.duck : null }; });
const hideFixed = (pg) => pg.evaluate(() => { const st = document.createElement('style'); st.id = 'bfShot'; st.textContent = '.nav,.nav *,.ls-mini{visibility:hidden!important;opacity:0!important}'; document.head.appendChild(st); });
const showFixed = (pg) => pg.evaluate(() => { const st = document.getElementById('bfShot'); if (st) st.remove(); });
async function shot(pg, W, name, sel) { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await hideFixed(pg);
  const box = await pg.evaluate((sel) => { if (!sel) { const a = document.querySelector('.mk-pg .mk-h') || document.querySelector('.mk-pick'), z = document.querySelector('.mk-flowsec') || document.querySelector('.mk-pick'); if (!a || !z) return null;   /* [BGM_R1_1023] 순간 머리 ~ 흐름 끝(고르기 · 흐름 음악 줄 함께) */
      const r0 = a.getBoundingClientRect(), r1 = z.getBoundingClientRect(); return { x: 0, y: Math.max(0, r0.top + scrollY - 12), width: innerWidth, height: Math.min(2600, r1.bottom - r0.top + 24) }; }
    const a = document.querySelector(sel); if (!a) return null; const r = a.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 12), width: innerWidth, height: Math.min(2600, r.height + 24) }; }, sel);
  if (box) await pg.screenshot({ path: path.join(SHOT, `${name}-${W}.png`), clip: box, fullPage: true }); await showFixed(pg); }
const sumLook = (pg) => pg.evaluate(() => { const secs = [...document.querySelectorAll('.mk-sum .mk-sec')], send = secs.find((s) => /^보낼 것/.test((s.querySelector('h4') || {}).textContent || '')), mus = document.querySelector('.mk-sum .mk-bgm');
  const t = (x) => x.textContent.replace(/[\s ]+/g, ' ').trim();
  return { sends: send ? [...send.querySelectorAll('.mk-vn')].map(t) : [], rows: mus ? [...mus.querySelectorAll('li')].map((li) => t(li.querySelector('.mk-vn') || li) + (li.querySelector('button') ? ' [' + t(li.querySelector('button')) + ']' : '')) : [], hz: document.documentElement.scrollWidth > innerWidth + 1,
    todoN: (() => { try { return _mkTodoN(); } catch (e) { return null; } })(), vlist: !!(mus && mus.querySelector('ul.mk-vlist')),
    order: secs.map((s) => (s.querySelector('h4') || {}).textContent || '') }; });

try {
  for (const W of [390, 1280]) {
    const { ctx, pg, errs } = await openPage(W); await walk(pg);
    /* 1 순간마다 [BGM_R1_1023] — 입장 먼저(입장 «음악에 맞춰 걸어 들어와요» 줄이 모양 기준) */
    const bad = [], seen = {}, REFQ = {};
    await go(pg, 'entry'); REFQ.look = await pg.evaluate(() => { const q = [...document.querySelectorAll('.mk-flow > li.q')].find((x) => /음악에 맞춰 걸어 들어와요/.test(x.textContent)), qa = q && q.querySelector('.qa'); if (!q) return ''; const cs = getComputedStyle(qa), lcs = getComputedStyle(q);
      return [cs.fontSize, cs.fontWeight, cs.color, lcs.paddingLeft, lcs.fontSize, getComputedStyle(q, '::after').backgroundColor].join(' '); });
    const posOk = (k, L) => AT[k] === 'top' ? L.fi === 0 : AT[k] === 'video' ? /영상이 흘러요/.test(L.next) : AT[k] === 'bridge' ? (L.fi === 1 && /넘어가며/.test(L.prev)) : AT[k] === 'bow' ? /목례/.test(L.prev) : AT[k] === 'cheers' ? (/\bt\b/.test(L.prevCls) && /\bn\b/.test(L.nextCls)) : false;
    for (const k of ['entry', ...Object.keys(ONE), 'song', 'free', 'letter']) { await go(pg, k); const L = await look(pg); seen[k] = L;
      if (['candle', 'welcome', 'vow', 'free', 'letter', '_close', 'toast'].includes(k)) await shot(pg, W, 'bgm-' + k.replace('_', ''));
      let good = !L.hz && !L.old && L.fq <= 1 && !L.gls.includes('음악');
      if (ONE[k]) good = good && !L.row && L.fq === 1 && L.ftxt === G(ONE[k]) && L.fbtn === 0 && /\bq\b/.test(L.fcls) && posOk(k, L) && !!REFQ.look && L.flook === REFQ.look && (L.pillN == null || L.pillN === L.nN);
      else if (k === 'entry') good = good && !L.row && L.mu && L.fq === 0 && L.gls.includes('입장 음악');   /* 입장 음악 줄은 그대로 */
      else if (k === 'song') good = good && !L.row && L.fq === 0;
      else good = good && L.row && L.last && L.fq === 0 && L.gl === (k === 'free' ? '축사 음악' : '편지 음악') && L.chips.join() === '음악 없이,음악과 함께' && L.note === NOTE[k === 'free' ? 'S5' : 'S6'].none && L.noteFs === '12.5px' && L.glX === L.glX0 && L.glFs === '14px';
      if (!good) bad.push([k, L]); }
    ok(`${W} 1 [BGM_R1_1023] «고르기»에는 입장 · 축사 · 편지 음악만(이름표 «입장 음악 · 축사 음악 · 편지 음악» · 칩 둘 · 아래 한 줄 12.5px) · 나머지 순간은 «흐름»의 채운 점 줄 하나(명세 글 · 자리 · 입장 «음악에 맞춰 걸어 들어와요»와 같은 모양 · 단추 없음) · «이 순간 전체 듣기 · n줄» = 나레이션 줄 수 · 축가 없음 · 가로 넘침 없음`, bad.length === 0, bad.map(([k, L]) => [k, { row: L.row, gls: L.gls, fq: L.fq, ftxt: L.ftxt, fi: L.fi, prev: L.prev, next: L.next, prevCls: L.prevCls, nextCls: L.nextCls, flook: L.flook, ref: REFQ.look, pillN: L.pillN, nN: L.nN, gl: L.gl, chips: L.chips, note: L.note, hz: L.hz }]));
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
    await pg.evaluate(() => { delete S.bgm; delete S.mu; _persist(); }); await go(pg, 'free'); await go(pg, '_sum'); await pg.click('[data-fk="bgmgo:entry"]', { timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(500);
    const zGo = await pg.evaluate(() => /입장/.test((document.querySelector('#mkHead') || {}).textContent || '') && !!document.querySelector('.ls-mu'));
    ok(`${W} 4 [BGM_R1_1023] 요약 — 안 골랐으면 «입장 곡 · 고르지 않으시면 스튜디오가 준비해요» + «이동하기»(누르면 입장 쪽) · 골랐으면 곡 이름(이동하기 없음) · 둘째 줄 그대로 · 다른 묶음과 같은 줄 꼴 · 남은 할 일 수 그대로(${z0.todoN} · ${z2.todoN}) · «보낼 것» 다음 · 보낼 것에 음악 줄 없음`,
      z0.rows.join(' / ') === '입장 곡 · 고르지 않으시면 스튜디오가 준비해요 [이동하기] / 나머지 음악은 스튜디오가 준비해요' && z1.rows.join(' / ') === '입장 곡 · 고르지 않으시면 스튜디오가 준비해요 [이동하기] / 축사 · 편지는 음악과 함께 · 나머지는 스튜디오가 준비해요'
      && z2.rows.join(' / ') === '입장 곡 · ‹시험 곡› / 편지는 음악과 함께 · 나머지는 스튜디오가 준비해요' && z0.vlist && z2.vlist && z0.todoN != null && z0.todoN === z2.todoN && !z1.sends.some((x) => /음악/.test(x)) && z1.order.indexOf('음악') === z1.order.indexOf('보낼 것') + 1 && !z1.hz && zGo, { z0, z1, z2, zGo });
    /* 3 감사 인사 빼기 */
    await pg.evaluate(() => { delete S.on.welcome; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); }); await go(pg, 'vow'); const v3 = await look(pg); await go(pg, 'ring'); const r3 = await look(pg);
    await pg.evaluate(() => { S.on.welcome = 1; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); });
    ok(`${W} 3 감사 인사를 빼면 혼인 서약이 첫 줄(«목소리 뒤로 잔잔한 피아노가 아주 작게 흘러요»)을 받고 반지는 «혼인 서약부터 흐르던 피아노가 아주 작게 이어져요»`, v3.ftxt === ONE.welcome && r3.ftxt === '혼인 서약부터 흐르던 피아노가 아주 작게 이어져요', { v3, r3 });
    /* 6 옛 «영상» 축사 */
    await pg.evaluate(() => { S.freeWhat = 'video'; S.bgm = { S5: { m: 'bed' } }; _persist(); }); await go(pg, '_sum'); await go(pg, 'free'); const v6 = await look(pg), e6 = await eng(pg); await go(pg, '_sum'); const s6 = await sumLook(pg);
    await pg.evaluate(() => { S.freeWhat = 'speech'; delete S.bgm; _persist(); });
    ok(`${W} 6 옛 «영상» 축사 — 흐름 줄 «영상에 입힌 소리로 흘러요» · 고르기 음악 줄 · 칩 없음 · 요약에 안 센다 · 엔진 무음 그대로`,
      v6.ftxt === '영상에 입힌 소리로 흘러요' && !v6.row && v6.chips.length === 0 && s6.rows[1] === '나머지 음악은 스튜디오가 준비해요' && e6.free === -90, { v6, s6, e6 });
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
      o1.bgm === '{"S5":{"m":"bed"}}' && o1.chips.join() === '음악 없이,음악과 함께*' && o2.ftxt === ONE.guest && !/옛곡이름|옛가수/.test(body) && o3.rows[1] === '축사는 음악과 함께 · 나머지는 스튜디오가 준비해요' && dbs.indexOf('me-bgm-song') < 0,
      { o1, o2, o3, dbs, hit: /옛곡이름/.test(body) });
    await ctx.close(); }
  /* 8 바로 열기 */
  { const { ctx, pg, errs } = await openPage(390, '?mk=letter'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=letter — 로그인 없이 편지 쪽이 바로 열린다 · 음악 줄(S6) 칩 둘', /편지/.test(L.head) && L.slot === 'S6' && L.chips.length === 2 && errs.length === 0, { L, errs });
    await ctx.close(); }
  { const { ctx, pg } = await openPage(390, '?mk=table'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=table — 빠져 있던 테이블 인사를 담고 그 쪽 · 흐름 음악 줄(S10)', /테이블/.test(L.head) && L.fslot === 'S10' && L.ftxt === ONE.table, L); await ctx.close(); }
  /* [BGM_JUMP_SAME 2026-10-23 실사이트 확인] 초안의 마지막 순간(S.mk.at)이 주소와 같아도 «고르기»에 머물지 않고 그 순간 쪽이 열린다 */
  { const { ctx, pg, errs } = await openPage(390, '?mk=letter'); await pg.waitForTimeout(1200);
    const at0 = await pg.evaluate(() => { try { _persist(); return JSON.parse(localStorage.getItem('me_order')).S.mk.at; } catch (e) { return null; } });
    await pg.goto(pg.url(), { waitUntil: 'load' }); await pg.waitForTimeout(2000); const L = await look(pg);
    ok('8 at 이 같은 초안(at=letter)으로 ?mk=letter 를 다시 열어도 편지 쪽(하나씩 만들기) · 음악 줄(S6)', at0 === 'letter' && /편지/.test(L.head) && L.slot === 'S6' && errs.length === 0, { at0, L, errs });
    await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `bgm-form: FAIL ${fail}` : 'bgm-form: ok');
process.exit(fail ? 1 : 0);
