#!/usr/bin/env node
/* ★★[BGM_FORM_1023 2026-10-23 사장님 «식순부분에 알맞게 디자이너 관점으로 적절하게 bgm 도 구현» · «우선 폼형태부분만» · BGM 섹션 명세 v2]
   식순 화면(order-preview.html) ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기 «음악» 묶음 · «보낼 것» — 진짜 화면을 띄워 잰다(390 · 1280).
   0 원천(assets/bgm-slots.js) — 칸 10 · 덮는 순간 · 화면 한 줄(v2 문구 그대로) · 고르기 · 참고 값(크기 단계 둘 · 박수 줄 57 · 108 · 131 · 들어오는 때 263 · 137)
   1 순간마다 — 고르는 자리(접힌 한 줄) · 이어지는 자리(«앞 순서 곡이 이어져요 · 바꾸려면 ‹감사 인사›에서») · 한 줄(식전 영상 · 맞절) · 없음(입장 = 입장 음악 줄 그대로 · 축가)
              자리는 고르기 칸 맨 아래 · 이름표 «음악» 은 다른 칩 줄 이름표와 같은 왼쪽 선 · 가로 넘침 없음
   2 손대지 않으면 S.bgm 이 없다(기본값은 적지 않는다) · 펴면 칩이 열리고 안 눌린 모양(BOSS_WAY 1) · 펴고 접어도 접힌 줄 높이 그대로
   3 감사 인사를 빼면 고르는 자리가 혼인 서약으로 옮긴다
   4 «음악 없이»(편지) · 부모님께 인사 칩 이름 셋 · 테이블 인사 «마지막 곡만 고르기»
   5 우리가 고른 곡(축사 · 4분 이상) — 올리기 전 «보낼 것» 한 줄 + 남은 할 일 +1 → 200초 곡을 올리면 이름 · 3:20 · «이 곡은 3분 20초라 반복해서 이어 틀어요» · S.bgm.S5 · 이 기기 보관 → «보낼 것»에서 빠짐 → 빼기
   6 옛 초안 «영상» 축사(freeWhat video)는 «영상에 입힌 소리로 흘러요» 한 줄 · 요약에서도 축사 칸이 없다
   7 ④ «음악» 묶음 — 바꾼 칸만 한 줄씩 + «나머지 n곳은 스튜디오가 골라 둘게요» · 하나도 안 바꿨으면 «음악은 모두 …» 한 줄 [BGM_SUM_CHANGED]
   ★검토 1 [BGM_LINES_TRUE] — 한 줄은 늘 참인 역할 · 둘째 줄이 고른 것 · 펴 있으면 곡 이름은 카드만
   8 ?mk=letter — 로그인 없이 편지 쪽이 바로 열린다(그냥 연 화면만)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BF_MOD = 돌연변이 확인용(그 판의 bgm-form.js 로 잰다) · SHOT = 그림 폴더 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.BF_MOD || '', SHOT = process.env.SHOT || '';
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };

/* 0 원천 — 브라우저 없이 */
const B = require(path.join(ROOT, 'assets/bgm-slots.js'));
{ const ids = B.SLOTS.map((s) => s.id).join(' '), ks = {}; B.SLOTS.forEach((s) => s.ks.forEach((k) => { ks[k] = s.id; }));
  ok('0 칸 10 · S1 ~ S10', ids === 'S1 S2 S3 S4 S5 S6 S7 S8 S9 S10', ids);
  ok('0 덮는 순간 — 하객 맞이 S1 · 화촉 S2 · 입장 · 맞절 S3 · 감사 인사 ~ 덕담 S4 · 축사 S5 · 편지 S6 · 부모님께 인사 S7 · 닫는 인사 S8 · 축배 S9 · 테이블 인사 S10',
    JSON.stringify(ks) === JSON.stringify({ guest: 'S1', candle: 'S2', entry: 'S3', matjeol: 'S3', welcome: 'S4', vow: 'S4', ring: 'S4', declare: 'S4', bless: 'S4', free: 'S5', letter: 'S6', tribute: 'S7', _close: 'S8', toast: 'S9', table: 'S10' }), ks);
  const one = (id) => B.slot(id).one;
  const WANT = { S1: ['하객이 들어와 앉는 동안 흘러요', '잔잔한 연주로 스튜디오가 골라 둘게요'], S2: ['화촉을 밝히는 걸음에 맞춰 흘러요', '밝고 우아한 곡으로 스튜디오가 골라 둘게요'],
    S4: ['말 아래 아주 작게 깔려요', '잔잔한 피아노로 스튜디오가 골라 둘게요'], S5: ['축사 아래 아주 작게 깔려요', '밝은 연주곡으로 스튜디오가 골라 둘게요'],
    S6: ['편지 아래 끊기지 않게 흘러요', '오르골 · 피아노로 스튜디오가 골라 둘게요'], S7: ['부모님께 인사드리는 동안 흘러요', '밝고 따뜻한 곡으로 스튜디오가 골라 둘게요'],
    S8: ['마지막 인사와 함께 힘 있게 시작해요', '힘 있는 곡으로 스튜디오가 골라 둘게요'], S9: ['«위하여!»에 맞춰 크게 시작해요', '후렴부터 트는 신나는 곡으로 스튜디오가 골라 둘게요'],
    S10: ['테이블 인사 · 사진 동안 흐르고, 마지막 곡으로 하루를 닫아요', '재즈 연주와 마지막 곡을 스튜디오가 골라 둘게요'] };
  const badL = Object.keys(WANT).filter((id) => { const L = B.lines(B.slot(id), B.get({}, id), false); return L.one !== WANT[id][0] || L.now !== WANT[id][1]; });
  ok('0 검토 1 — 한 줄 = 무엇을 골라도 참인 역할 · 둘째 줄 = 스튜디오 곡일 때 곡 성격(아홉 칸 문구 그대로) · 화촉 «걸음»(어머님 · 개식 없음) · 테이블 인사 «식사» 없음',
    badL.length === 0 && /걸음/.test(one('S2')) && !/어머님|개식/.test(one('S2')) && !/식사/.test(one('S10') + B.slot('S10').sub.studio), badL);
  const ln = (id, g, op) => B.lines(B.slot(id), Object.assign({ own: null }, g), !!op);
  ok('0 [BGM_LINES_TRUE] 고른 것에 따라 두 줄이 바뀐다 — 축사 · 편지 «음악 없이» = «…는 음악 없이 목소리만 들려요» + «음악 없이 조용히 진행해요» · 부모님께 인사 «감동적인 곡» · 우리가 고른 곡(접힘 ‹이름› · 펼침 «우리가 고른 곡») · 한 줄은 역할 그대로',
    ln('S5', { m: 'none' }).one === '축사는 음악 없이 목소리만 들려요' && ln('S5', { m: 'none' }).now === '음악 없이 조용히 진행해요'
    && ln('S6', { m: 'none' }).one === '편지는 음악 없이 목소리만 들려요' && ln('S6', { m: 'none' }).now === '음악 없이 조용히 진행해요'
    && ln('S7', { m: 'warm' }).one === WANT.S7[0] && ln('S7', { m: 'warm' }).now === '감동적인 곡으로 스튜디오가 골라 둘게요'
    && ln('S4', { m: 'own', own: { n: 'A', d: 95 } }).one === WANT.S4[0] && ln('S4', { m: 'own', own: { n: 'A', d: 95 } }).now === '‹A›' && ln('S4', { m: 'own', own: { n: 'A', d: 95 } }, true).now === '우리가 고른 곡'
    && ln('S4', { m: 'own' }).now === '우리가 고른 곡 · 파일을 올려 주세요' && ln('S10', { m: 'own' }).now === '마지막 곡 · 파일을 올려 주세요');
  ok('0 고르기 — «음악 없이»는 축사 · 편지만 · 부모님께 인사 = 밝고 따뜻한 곡(기본) · 감동적인 곡 · 우리가 고른 곡 · 테이블 인사 = 스튜디오 곡 · 마지막 곡만 고르기',
    B.SLOTS.filter((s) => s.picks.includes('none')).map((s) => s.id).join() === 'S5,S6' && B.slot('S7').picks.map((p) => B.label(B.slot('S7'), p)).join(' · ') === '밝고 따뜻한 곡 · 감동적인 곡 · 우리가 고른 곡'
    && B.slot('S10').picks.map((p) => B.label(B.slot('S10'), p)).join(' · ') === '스튜디오 곡 · 마지막 곡만 고르기');
  const r4 = B.slot('S4').ref, cl = B.SLOTS.flatMap((s) => (s.ref.clap || []).map((c) => c.no)).join();
  ok('0 참고 값 — S4 크기 단계 둘(나레이션 아래 «작게» · 직접 말하는 자리 «아주 작게 · 거의 들리지 않게») · 박수 줄 57 · 108 · 131 · S2 이음말(263) · 개식 인사(137)',
    r4.levels.length === 2 && r4.levels[0].lv === '작게' && r4.levels[1].lv === '아주 작게 · 거의 들리지 않게' && /서약 낭독 · 성혼 선언 낭독 · 덕담/.test(r4.levels[1].at) && cl === '57,108,131'
    && /263/.test(B.slot('S2').ref.from) && /137/.test(B.slot('S1').ref.note) && /111/.test(B.slot('S4').ref.clap[0].down) && /23/.test(B.slot('S4').ref.clap[0].down), { r4, cl });
  ok('0 짧은 곡 한 줄 — 180 «3분이라» · 200 «3분 20초라» · 길면 없음 · 마지막 곡(S10)은 없음',
    B.shortNote(B.slot('S5'), 180) === '이 곡은 3분이라 반복해서 이어 틀어요' && B.shortNote(B.slot('S5'), 200) === '이 곡은 3분 20초라 반복해서 이어 틀어요' && B.shortNote(B.slot('S5'), 300) === '' && B.shortNote(B.slot('S10'), 100) === '');
  ok('0 손대지 않은 칸 = studio · 칸에 없는 값도 studio(«음악 없이»는 축사 · 편지만)', B.get({}, 'S1').m === 'studio' && !B.get({}, 'S1').set && B.get({ bgm: { S1: { m: 'none' } } }, 'S1').m === 'studio' && B.get({ bgm: { S6: { m: 'none' } } }, 'S6').m === 'none');
}

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (MOD && u === '/assets/bgm-form.js') ? MOD : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
/* 시험 곡 — 200초 · 8000Hz 모노 16bit 잔잔한 소리(곡 이름 태그 없음 → 파일 이름) */
function testSong() { const sr = 8000, n = sr * 200, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * i / sr) * 3000), 44 + i * 2);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-form-')), f = path.join(d, 'bgm-test-song.wav'); fs.writeFileSync(f, b); return f; }
const SONG = testSong();
const ALL = ['candle', 'free', 'letter', 'tribute', 'toast', 'table', 'prevideo', 'song', 'ring', 'bless', 'declare', 'vow', 'welcome'];
async function openPage(W, q) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (!u.startsWith('http://127.0.0.1:' + port)) return rt.fulfill({ status: 200, body: '' }); return rt.continue(); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html${q || ''}`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  return { ctx, pg, errs };
}
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
async function walk(pg) { await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500);
  await pg.evaluate((all) => { all.forEach((k) => { S.on[k] = 1; }); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALL);
  await clickNext(pg); await pg.waitForTimeout(1200); }
const go = async (pg, k) => { await pg.evaluate((k) => mkGo(k), k); await pg.waitForTimeout(500); };
const look = (pg) => pg.evaluate(() => { const row = document.querySelector('.ls-bgm'), vars = document.querySelector('.mk-pick .ls-vars'), sum = row && row.querySelector('.bgm-sum'), gl = row && row.querySelector('.gl'), gl0 = vars && vars.querySelector('.ls-cg:not(.ls-bgm) .gl');
  return { row: !!row, slot: row && row.getAttribute('data-slot'), last: !!(row && vars && vars.lastElementChild === row), mu: !!document.querySelector('.ls-mu'),
    txt: row ? row.querySelector('.bgm-w').textContent.replace(/\s+/g, ' ').trim() : '', one: sum ? sum.querySelector('.bgm-one').textContent : '', now: sum ? sum.querySelector('.bgm-now').textContent : '',
    exp: sum ? sum.getAttribute('aria-expanded') : null, sumH: sum ? Math.round(sum.getBoundingClientRect().height * 10) / 10 : 0, chips: row ? [...row.querySelectorAll('.bgm-ch .op-chip')].map((b) => b.textContent + (b.getAttribute('aria-checked') === 'true' ? '*' : '')) : [],
    glX: gl ? Math.round(gl.getBoundingClientRect().left) : null, glX0: gl0 ? Math.round(gl0.getBoundingClientRect().left) : null, glFs: gl ? getComputedStyle(gl).fontSize : '', glFs0: gl0 ? getComputedStyle(gl0).fontSize : '',
    card: row ? (row.querySelector('.bgm-card') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim() : '', bgm: JSON.stringify(S.bgm || null), hz: document.documentElement.scrollWidth > innerWidth + 1,
    head: (document.querySelector('#mkHead') || { textContent: '' }).textContent }; });
/* 그림만 — 아래 붙은 «이전 · 다음» 줄(.nav sticky)이 잘라 찍은 그림 가운데에 서지 않게 그 순간만 감춘다 */
const hideFixed = (pg) => pg.evaluate(() => { const st = document.createElement('style'); st.id = 'bfShot'; st.textContent = '.nav,.nav *,.ls-mini{visibility:hidden!important;opacity:0!important}'; document.head.appendChild(st); });
const showFixed = (pg) => pg.evaluate(() => { const st = document.getElementById('bfShot'); if (st) st.remove(); });
async function shot(pg, W, name, sel) { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); await hideFixed(pg);
  const box = await pg.evaluate((sel) => { const a = document.querySelector(sel || '.mk-pick'); if (!a) return null; const r = a.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 12), width: innerWidth, height: Math.min(2600, r.height + 24) }; }, sel);
  if (box) await pg.screenshot({ path: path.join(SHOT, `${name}-${W}.png`), clip: box, fullPage: true }); await showFixed(pg); }
async function upload(pg, id) {
  const fc = pg.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
  await pg.click(`[data-fk="bgmup:${id}"]`); const ch = await fc; if (ch) await ch.setFiles(SONG); else await pg.setInputFiles('#bgmUpFile', SONG);
  await pg.waitForFunction((id) => !!(S.bgm && S.bgm[id] && S.bgm[id].own && S.bgm[id].own.d > 0) && !document.querySelector(`.ls-bgm[data-slot="${id}"] [role=status]`), id, { timeout: 30000 }).catch(() => {}); await pg.waitForTimeout(300); }
const sumLook = (pg) => pg.evaluate(() => { const secs = [...document.querySelectorAll('.mk-sum .mk-sec')], send = secs.find((s) => /^보낼 것/.test((s.querySelector('h4') || {}).textContent || '')), mus = document.querySelector('.mk-sum .mk-bgm');
  const t = (x) => x.textContent.replace(/[\s\u00a0]+/g, ' ').trim();
  return { sends: send ? [...send.querySelectorAll('.mk-vn')].map(t) : [], rows: mus ? [...mus.querySelectorAll('li')].map((li) => li.children.length ? [...li.children].map(t).join(' | ') : t(li)) : [], todo: (typeof _mkTodoN === 'function') ? _mkTodoN() : -1,
    order: secs.map((s) => (s.querySelector('h4') || {}).textContent || '') }; });

try {
  for (const W of [390, 1280]) {
    const { ctx, pg, errs } = await openPage(W); await walk(pg);
    /* 1 순간마다 */
    const want = { guest: ['pick', 'S1'], prevideo: ['line', '영상에 입힌 소리로 흘러요'], candle: ['pick', 'S2'], entry: ['none'], matjeol: ['line', '입장 곡이 이어져요'], welcome: ['pick', 'S4'],
      vow: ['cont'], ring: ['cont'], declare: ['cont'], bless: ['cont'], free: ['pick', 'S5'], song: ['none'], letter: ['pick', 'S6'], tribute: ['pick', 'S7'], _close: ['pick', 'S8'], toast: ['pick', 'S9'], table: ['pick', 'S10'] };
    const bad = [], seen = {};
    for (const k of Object.keys(want)) { await go(pg, k); const L = await look(pg), w = want[k]; seen[k] = L; if (['vow', 'matjeol', 'entry'].includes(k)) await shot(pg, W, 'bgm-' + k);
      let good = !L.hz;
      if (w[0] === 'pick') good = good && L.row && L.slot === w[1] && L.last && L.exp === 'false' && L.chips.length === 0 && L.one === B.slot(w[1]).one.replace(/[«»]/g, '') && /스튜디오가 골라 둘게요$/.test(L.now) && L.glX === L.glX0 && L.glFs === '14px';
      else if (w[0] === 'line') good = good && L.row && !L.slot && L.last && L.txt === w[1];
      else if (w[0] === 'cont') good = good && L.row && L.last && L.txt === '앞 순서 곡이 이어져요 · 바꾸려면 감사 인사에서';
      else good = good && !L.row;
      if (k === 'entry') good = good && L.mu;   /* 입장 음악 줄은 그대로 */
      if (!good) bad.push([k, L]); }
    ok(`${W} 1 순간마다 — 고르는 자리 10 · 이어지는 자리(서약 · 반지 · 선언 · 덕담) · 한 줄(식전 영상 · 맞절) · 없음(입장 = 입장 음악 줄 · 축가) · 고르기 칸 맨 아래 · 이름표 «음악» 14px 같은 왼쪽 선 · 가로 넘침 없음`, bad.length === 0, bad);
    ok(`${W} 2 손대지 않으면 S.bgm 이 없다(기본값을 적지 않는다)`, seen.table.bgm === 'null', seen.table.bgm);
    await go(pg, '_sum'); const z2 = await sumLook(pg);
    ok(`${W} 2 [BGM_SUM_CHANGED] 하나도 안 바꿨으면 ④ «음악»은 «음악은 모두 스튜디오가 골라 둘게요» 한 줄만`, z2.rows.length === 1 && z2.rows[0] === '음악은 모두 스튜디오가 골라 둘게요', z2);
    /* 2 펴기 · 접기 */
    await go(pg, 'candle'); const c0 = await look(pg); await shot(pg, W, 'bgm-candle-closed');
    await pg.click('[data-fk="bgmopen:S2"]'); await pg.waitForTimeout(300); const c1 = await look(pg); await shot(pg, W, 'bgm-candle-open');
    await pg.click('[data-fk="bgmopen:S2"]'); await pg.waitForTimeout(300); const c2 = await look(pg);
    ok(`${W} 2 펴면 칩 둘(스튜디오 곡 · 우리가 고른 곡 · 안 눌린 모양) · 접힌 줄 높이 그대로(${c0.sumH} → ${c1.sumH} → ${c2.sumH}) · 접으면 칩이 걷힌다 · 그래도 S.bgm 없음`,
      c1.exp === 'true' && c1.chips.join() === '스튜디오 곡,우리가 고른 곡' && c0.sumH === c1.sumH && c1.sumH === c2.sumH && c2.exp === 'false' && c2.chips.length === 0 && c2.bgm === 'null', { c0, c1, c2 });
    /* 3 감사 인사를 빼면 */
    await pg.evaluate(() => { S.on.welcome = 0; try { opSync(); buildSteps(); } catch (e) {} _persist(); }); await go(pg, 'vow'); const v3 = await look(pg); await go(pg, 'ring'); const r3 = await look(pg);
    ok(`${W} 3 감사 인사를 빼면 고르는 자리 = 혼인 서약 · 반지 교환은 «바꾸려면 혼인 서약에서»`, v3.slot === 'S4' && v3.one === B.slot('S4').one.replace(/[«»]/g, '') && r3.txt === '앞 순서 곡이 이어져요 · 바꾸려면 혼인 서약에서', { v3, r3 });
    await pg.evaluate(() => { S.on.welcome = 1; try { opSync(); buildSteps(); } catch (e) {} _persist(); });
    /* 4 음악 없이 · 칩 이름 */
    await go(pg, 'letter'); await pg.click('[data-fk="bgmopen:S6"]'); await pg.waitForTimeout(250); await pg.click('[data-fk="bgm:S6:none"]'); await pg.waitForTimeout(300); const l4 = await look(pg);
    await go(pg, 'tribute'); await pg.click('[data-fk="bgmopen:S7"]'); await pg.waitForTimeout(250); const t4 = await look(pg); await pg.click('[data-fk="bgm:S7:warm"]'); await pg.waitForTimeout(300); const t5 = await look(pg); await shot(pg, W, 'bgm-tribute-open');
    await go(pg, 'table'); await pg.click('[data-fk="bgmopen:S10"]'); await pg.waitForTimeout(250); await pg.click('[data-fk="bgm:S10:own"]'); await pg.waitForTimeout(300); const b4 = await look(pg); await shot(pg, W, 'bgm-table-own');
    ok(`${W} 4 편지 «음악 없이» → S.bgm.S6.m none · 한 줄 «편지는 음악 없이 목소리만 들려요» · 둘째 줄 «음악 없이 조용히 진행해요» · 칩 눌림`, /"S6":\{"m":"none"\}/.test(l4.bgm) && l4.one === '편지는 음악 없이 목소리만 들려요' && l4.now === '음악 없이 조용히 진행해요' && l4.chips.join() === '스튜디오 곡,우리가 고른 곡,음악 없이*', l4);
    ok(`${W} 4 부모님께 인사 칩 «밝고 따뜻한 곡 · 감동적인 곡 · 우리가 고른 곡» · 둘째 줄 «밝고 따뜻한 곡으로 …» → «감동적인 곡»을 누르면 «감동적인 곡으로 스튜디오가 골라 둘게요» · 한 줄(역할)은 그대로`,
      t4.chips.join() === '밝고 따뜻한 곡,감동적인 곡,우리가 고른 곡' && t4.now === '밝고 따뜻한 곡으로 스튜디오가 골라 둘게요' && t5.now === '감동적인 곡으로 스튜디오가 골라 둘게요' && t5.one === '부모님께 인사드리는 동안 흘러요' && t4.one === t5.one && t5.chips.join() === '밝고 따뜻한 곡,감동적인 곡*,우리가 고른 곡', { t4, t5 });
    ok(`${W} 4 테이블 인사 «마지막 곡만 고르기» → «마지막 곡 · 파일을 올려 주세요» · 카드 «재즈 연주는 스튜디오가 골라 둘게요»(위 줄과 겹치지 않게) · 곡 파일 올리기`, b4.now === '마지막 곡 · 파일을 올려 주세요' && /^재즈 연주는 스튜디오가 골라 둘게요/.test(b4.card) && !/마지막 곡 하나/.test(b4.card) && /곡 파일 올리기/.test(b4.card), b4);
    await pg.evaluate(() => { delete S.bgm.S10; _persist(); });
    /* 5 우리가 고른 곡(축사) */
    await go(pg, '_sum'); const s0 = await sumLook(pg);
    await go(pg, 'free'); await pg.click('[data-fk="bgmopen:S5"]'); await pg.waitForTimeout(250); await pg.click('[data-fk="bgm:S5:own"]'); await pg.waitForTimeout(300); const f0 = await look(pg);
    await go(pg, '_sum'); const s1 = await sumLook(pg);
    ok(`${W} 5 «우리가 고른 곡»을 누르면 «4분 이상 곡이면 좋아요 · 짧으면 반복해서 이어 틀어요» · ④ «보낼 것»에 «축사 음악 · 우리가 고른 곡 파일» · 남은 할 일 ${s0.todo} → ${s1.todo}`,
      /^4분 이상 곡이면 좋아요 · 짧으면 반복해서 이어 틀어요/.test(f0.card) && f0.now === '우리가 고른 곡 · 파일을 올려 주세요' && s1.sends.includes('축사 음악 · 우리가 고른 곡 파일') && !s0.sends.includes('축사 음악 · 우리가 고른 곡 파일') && s1.todo === s0.todo + 1, { f0, s0, s1 });
    await go(pg, 'free'); await upload(pg, 'S5'); const f1 = await look(pg); await shot(pg, W, 'bgm-free-own'); await pg.click('[data-fk="bgmopen:S5"]'); await pg.waitForTimeout(250); const f1c = await look(pg); await pg.click('[data-fk="bgmopen:S5"]'); await pg.waitForTimeout(250);
    const kept = await pg.evaluate(() => new Promise((ok) => { try { const q = indexedDB.open('me-bgm-song', 1); q.onsuccess = () => { const g = q.result.transaction('f').objectStore('f').get('local:S5'); g.onsuccess = () => ok(!!g.result); g.onerror = () => ok(false); }; q.onerror = () => ok(false); } catch (e) { ok(false); } }));
    const ls = await pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('me_order')).S.bgm; } catch (e) { return null; } });
    ok(`${W} 5 200초 곡을 올리면 이름 · 3:20 · «이 곡은 3분 20초라 반복해서 이어 틀어요» · 펴 있으면 둘째 줄 «우리가 고른 곡»(이름은 카드만) · 접으면 ‹이름› · 칸 높이 그대로 · S.bgm.S5 = own{n,a,d} · 이 기기 보관 · 이 기기 초안에도`,
      /^bgm-test-song 3:20 이 곡은 3분 20초라 반복해서 이어 틀어요 다른 곡 올리기 ?· ?빼기$/.test(f1.card) && f1.now === '우리가 고른 곡' && f1c.now === '‹bgm-test-song›' && f1c.exp === 'false' && f1c.sumH === f1.sumH && f1.one === '축사 아래 아주 작게 깔려요' && /"S5":\{"m":"own","own":\{"n":"bgm-test-song","a":"","d":200\}\}/.test(f1.bgm) && kept && ls && ls.S5 && ls.S5.own && ls.S5.own.d === 200, { f1, f1c, kept, ls });
    await go(pg, '_sum'); const s2 = await sumLook(pg); await shot(pg, W, 'bgm-sum', '.mk-sum .mk-bgm');
    ok(`${W} 5 올리면 «보낼 것»에서 빠지고 남은 할 일이 돌아온다(${s2.todo})`, !s2.sends.includes('축사 음악 · 우리가 고른 곡 파일') && s2.todo === s0.todo, s2);
    await go(pg, 'free'); await pg.click('[data-fk="bgm:S5:studio"]'); await pg.waitForTimeout(250); await pg.click('[data-fk="bgm:S5:own"]'); await pg.waitForTimeout(250); const f2 = await look(pg);
    ok(`${W} 5 다른 칩을 눌렀다 돌아와도 올린 곡 그대로`, f2.now === '우리가 고른 곡' && /bgm-test-song/.test(f2.card), f2);
    await pg.click('[data-fk="bgmdel:S5"]'); await pg.waitForTimeout(300); const f3 = await look(pg);
    ok(`${W} 5 빼기 → 곡 파일 올리기로 · S.bgm.S5 = {m:own}`, /곡 파일 올리기/.test(f3.card) && /"S5":\{"m":"own"\}/.test(f3.bgm) && f3.now === '우리가 고른 곡 · 파일을 올려 주세요', f3);
    /* 7 요약 */
    const s3 = s2;
    ok(`${W} 7 [BGM_SUM_CHANGED] ④ «음악» — 바꾼 칸만(축사 ‹곡› · 편지 낭독 음악 없이 · 부모님께 인사 감동적인 곡) + «나머지 7곳은 스튜디오가 골라 둘게요» · «보낼 것» 다음`,
      s3.rows.join(' / ') === '축사 | ‹bgm-test-song› / 편지 낭독 | 음악 없이 / 부모님께 인사 | 감동적인 곡 / 나머지 7곳은 스튜디오가 골라 둘게요' && s3.order.indexOf('음악') === s3.order.indexOf('보낼 것') + 1, s3);
    await pg.evaluate(() => { S.mu = { src: 'rec', k: 'r1', t: '시험 곡', hook: 30 }; }); await go(pg, 'free'); await go(pg, '_sum'); const s7 = await sumLook(pg); await pg.evaluate(() => { delete S.mu; _persist(); });
    ok(`${W} 7 입장 · 맞절은 입장 곡을 고르면 바꾼 칸(«추천 곡 ‹시험 곡›») · 나머지 6곳`, s7.rows[0] === '입장 · 맞절 | 추천 곡 ‹시험 곡›' && s7.rows[s7.rows.length - 1] === '나머지 6곳은 스튜디오가 골라 둘게요', s7);
    /* 6 옛 «영상» 축사 */
    await pg.evaluate(() => { S.freeWhat = 'video'; _persist(); }); await go(pg, '_sum'); await go(pg, 'free'); const v6 = await look(pg); await go(pg, '_sum'); const s6 = await sumLook(pg);
    ok(`${W} 6 옛 «영상» 축사 — «영상에 입힌 소리로 흘러요» 한 줄 · 요약에 축사 칸 없음`, v6.txt === '영상에 입힌 소리로 흘러요' && !v6.slot && !s6.rows.some((r) => /^축사 \|/.test(r)) && s6.rows[s6.rows.length - 1] === '나머지 7곳은 스튜디오가 골라 둘게요', { v6, s6 });
    ok(`${W} 9 쪽 오류 없음`, errs.length === 0, errs);
    await ctx.close();
  }
  /* 8 바로 열기 */
  { const { ctx, pg, errs } = await openPage(390, '?mk=letter'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=letter — 로그인 없이 편지 쪽이 바로 열린다 · 음악 줄(S6)', /편지/.test(L.head) && L.slot === 'S6' && errs.length === 0, { L, errs });
    await ctx.close(); }
  { const { ctx, pg } = await openPage(390, '?mk=table'); await pg.waitForTimeout(1200); const L = await look(pg);
    ok('8 ?mk=table — 빠져 있던 테이블 인사를 담고 그 쪽', /테이블/.test(L.head) && L.slot === 'S10', L); await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `bgm-form: FAIL ${fail}` : 'bgm-form: ok');
process.exit(fail ? 1 : 0);
