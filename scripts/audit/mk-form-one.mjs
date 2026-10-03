#!/usr/bin/env node
/* ★★[MK_FORM_ONE 2026-10-03 사장님 «서약 쪽만 다른 쪽들과 안 맞는다 · 이 순간 들어 보기가 갑자기 나온다»] ② 순간 쪽은 한 틀이다 — 모든 순간 쪽을 그려 대조한다.
   보는 것(390 · 1280 · 가족 코스 + 모든 순간을 담은 코스)
   ① 칸 차례 = 머리 → 한 줄(길이) → 장면 → 고르기 → 흐름(«이 순간 들어 보기»는 흐름 머리) → 참고 예시 → 두 분이 할 말 → 두 분 목소리 → 부탁 · 준비 (있는 칸만 · 차례는 같다)
   ② «이 순간 들어 보기» = 나레이션 소리가 두 줄 이상인 순간에만 · 한 자리(흐름 칸 머리) · 한 개 [PLAY_ONE]
   ③ 흐름 줄 · 줄 카드 머리에 «약 n초 · 약 n분» 없음(길이는 순간 머리 한 곳 · LEN_ONE · LINE_NO_SEC)
   ④ 고르기 줄 라벨 칸 폭 · «이 순간 들어 보기» 글꼴 크기 · 높이 · 여백이 모든 쪽에서 같다 · 칸 사이 위 여백이 같다
   ⑤ 화면 오류 0
   SHOTS=<폴더> 면 쪽마다 한 장씩 찍는다. 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOTS = process.env.SHOTS || '';
/* 칸 차례 — 이름(쪽 안 맨 바깥 자식의 class)으로. 여기에 없는 칸이 나오면 «모르는 칸»으로 실패한다(새 칸을 넣으면 이 표에 자리를 정할 것) */
const ORDER = [['mk-h', '머리'], ['mk-one', '한 줄'], ['mk-note', '안내 한 줄'], ['mk-vid', '장면'], ['mk-pick', '고르기'], ['mk-flowsec', '흐름'], ['ls-why', '흐름 덧말'], ['mk-ref', '참고 예시'], ['mk-say', '두 분이 할 말'], ['mk-voice', '두 분 목소리'], ['mk-prep', '부탁 · 준비']];
const tok = (cls) => { for (let i = 0; i < ORDER.length; i++) if ((' ' + cls + ' ').indexOf(' ' + ORDER[i][0] + ' ') > -1) return i; return -1; };

async function walk(w, course) {
  const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  if (course === 'all') await pg.evaluate(() => { const R = RitualOpen; R.ORDER.forEach((k) => { if (!R.ALWAYS[k]) S.on[k] = 1; }); opSync(); });
  if (course === 'ai') await pg.evaluate(() => { /* AI 두 분 목소리 판 — 줄 카드 · 말 빠르기가 붙는 쪽(하객 맞이 · 식전 영상 · 입장) */
    window._vc = function (op) { if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: {}, per: {} }); return Promise.resolve({ ok: false }); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.on.prevideo = 1; opSync();
    VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; });
  await nx(); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { try { engine(); } catch (e) {} }); await pg.waitForTimeout(800);
  const pages = await pg.evaluate(() => _mkPages().filter((k) => k !== '_intro' && k !== '_sum' && k !== '_voice'));
  const rows = [];
  for (const k of pages) {
    await pg.evaluate((k) => { try { lsStop(); } catch (e) {} mkGo(k); }, k); await pg.waitForTimeout(450);
    const d = await pg.evaluate((k) => {
      const pgEl = document.querySelector('.mk-pg'); if (!pgEl) return null;
      const kids = [...pgEl.children].filter((c) => c.offsetParent !== null || getComputedStyle(c).display !== 'none');
      const seq = kids.map((c) => c.className || c.tagName);
      const lb = [...document.querySelectorAll('[data-fk="mkplay"]')];
      let pn = 0; try { if (ENG) pn = _lSteps(ENG, [k]).filter((x) => !x.quiet && !x.talk && !x.skip && !x.talk2).length; } catch (e) {}
      const flowT = [...document.querySelectorAll('.mk-pg .mk-flow li, .mk-pg .mk-vs, .mk-pg .mk-vch')].map((e) => e.textContent).filter((t) => /약\s?\d+\s?(초|분)/.test(t));
      const cs = (el, ps) => (el ? ps.map((p) => getComputedStyle(el)[p]).join('/') : '');
      const gl = document.querySelector('.mk-pg .mk-pick .ls-cg:not(.cg-vp) .gl');   /* 목소리 준비 줄(.cg-vp)은 좁은 폭에서 라벨이 위로 선다 — 일부러다([R3-06] «어떻게 준비할까요»가 64px 칸에서 두 줄로 깨졌다) · 그 줄은 vpS 로 따로 본다 */
      const vp = document.querySelector('.mk-pg .mk-pick .ls-cg.cg-vp'), vpS = vp ? getComputedStyle(vp).gridTemplateColumns.split(' ').length + '열|' + cs(vp.querySelector('.gl'), ['fontSize']) : '';
      const glW = gl ? Math.round(gl.getBoundingClientRect().width) + '|' + cs(gl, ['fontSize', 'color']) : '';
      const lbS = lb[0] ? cs(lb[0], ['fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'borderTopWidth']) + '|h' + Math.round(lb[0].getBoundingClientRect().height) : '';
      const lbInFlowHead = lb[0] ? !!lb[0].closest('.mk-flowsec > .mk-sech') : null;
      const secGap = [...pgEl.querySelectorAll(':scope > .mk-sec')].map((s) => { const c = [...s.classList].filter((x) => x !== 'mk-sec').join('.') || 'mk-sec'; return c + '=' + getComputedStyle(s).marginTop + '/' + getComputedStyle(s).paddingTop; });   /* 칸 종류마다(고르기 · 흐름은 선 없이 붙는다 · 나머지는 선 + 여백) */
      const refH = document.querySelector('.mk-pg .mk-ref h4'); const refS = refH ? cs(refH, ['fontSize', 'fontWeight', 'color', 'letterSpacing']) : '';
      const vid = pgEl.querySelector(':scope > .mk-vid'), nxt = vid && vid.nextElementSibling; const vidGap = nxt ? Math.round(nxt.getBoundingClientRect().top - vid.getBoundingClientRect().bottom) + 'px' : '';
      return { vpS, vidGap, seq, lbN: lb.length, pn, flowT, glW, lbS, lbInFlowHead, secGap: [...new Set(secGap)], refS, off: pgEl.classList.contains('off') };
    }, k);
    if (SHOTS && d) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.evaluate(() => { window.scrollTo(0, 0); const n = document.getElementById('nav'); if (n) n.style.display = 'none'; }); await pg.screenshot({ path: path.join(SHOTS, `${course}-${w}-${k}.png`), fullPage: true }); await pg.evaluate(() => { const n = document.getElementById('nav'); if (n) n.style.display = ''; }); }   /* 붙는 아래 막대가 긴 쪽 한가운데를 가리지 않게(찍을 때만) */
    rows.push({ k, d });
  }
  await ctx.close();
  return { rows, errs };
}

const all = [];
for (const course of ['family', 'all', 'ai']) for (const w of [390, 1280]) {
  const { rows, errs } = await walk(w, course);
  const tag = `${course} ${w}`;
  ok(`${tag} 쪽 ${rows.length}개를 다 그렸다 · 화면 오류 0`, rows.length >= 6 && rows.every((r) => r.d) && !errs.length, errs.join(' | ') + ' ' + rows.filter((r) => !r.d).map((r) => r.k).join(','));
  const unknown = [], badOrder = [], badPlay = [], badSec = [];
  rows.forEach(({ k, d }) => { if (!d) return;
    const ix = d.seq.map(tok); ix.forEach((i, j) => { if (i < 0) unknown.push(k + ':' + d.seq[j]); });
    const kn = ix.filter((i) => i > -1); if (kn.some((v, i) => i && v < kn[i - 1])) badOrder.push(k + ':' + d.seq.join(' > '));
    const want = d.off ? 0 : (d.pn >= 2 ? 1 : 0); if (d.lbN !== want || (d.lbN && !d.lbInFlowHead)) badPlay.push(`${k}(나레이션 ${d.pn}줄 · 단추 ${d.lbN}${d.lbN && !d.lbInFlowHead ? ' · 흐름 머리 밖' : ''})`);
    if (d.flowT.length) badSec.push(k + ':' + d.flowT[0].slice(0, 40));
    all.push({ course, w, k, d }); });
  ok(`${tag} ① 칸 차례가 모든 쪽에서 같은 틀(머리 → 장면 → 고르기 → 흐름 → 참고 예시 → 할 말 → 목소리 → 부탁) · 모르는 칸 없음 [MK_FORM_ONE]`, !unknown.length && !badOrder.length, unknown.concat(badOrder).join(' | '));
  ok(`${tag} ② «이 순간 들어 보기» = 나레이션 두 줄 이상인 쪽에만 · 흐름 머리 한 자리 · 한 개 [MK_FORM_ONE · PLAY_ONE]`, !badPlay.length, badPlay.join(' | '));
  ok(`${tag} ③ 흐름 줄 · 줄 카드에 «약 n초/분» 없음 [MK_FORM_ONE · LINE_NO_SEC]`, !badSec.length, badSec.join(' | '));
  const same = (f) => { const v = [...new Set(rows.map((r) => r.d && f(r.d)).filter(Boolean))]; return v; };
  const gl = same((d) => d.glW), lbs = same((d) => d.lbS), refs = same((d) => d.refS);
  const gm = {}; rows.forEach((r) => r.d && r.d.secGap.forEach((g) => { const [c, v] = g.split('='); (gm[c] = gm[c] || new Set()).add(v); }));
  const gaps = Object.entries(gm).filter(([, v]) => v.size > 1).map(([c, v]) => c + ':' + [...v].join('|'));
  const vg = [...new Set(rows.map((r) => r.d && r.d.vidGap).filter(Boolean))];
  ok(`${tag} ④ 고르기 라벨 칸 폭 · 글꼴 한 벌(${gl.join(' ; ')})`, gl.length <= 1, gl.join(' ; '));
  const vps = same((d) => d.vpS); ok(`${tag} ④ 목소리 준비 줄(하객 맞이 · 식전 영상 · 입장) 모양 한 벌(${vps.join(' ; ') || '없음'})`, vps.length <= 1, vps.join(' ; '));
  ok(`${tag} ④ «이 순간 들어 보기» 크기 · 굵기 · 여백 · 높이 한 벌(${lbs.join(' ; ')})`, lbs.length <= 1, lbs.join(' ; '));
  ok(`${tag} ④ 참고 예시 머리 한 벌 · 칸 종류마다 여백 한 벌 · 장면 아래 첫 칸까지 한 간격(${vg.join(' ; ')})`, refs.length <= 1 && !gaps.length && vg.length <= 1, refs.join(' ; ') + ' || ' + gaps.join(' ; ') + ' || ' + vg.join(' ; '));
}
if (process.env.TABLE) { console.log('\n순간 | 칸 | 들어 보기'); all.filter((x) => x.w === 390).forEach(({ course, k, d }) => console.log(`${course} ${k} | ${d.seq.map((c) => { const i = tok(c); return i < 0 ? '?' + c : ORDER[i][1]; }).join(' › ')} | ${d.lbN ? 'O' : '-'} (나레이션 ${d.pn})`)); }
await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
