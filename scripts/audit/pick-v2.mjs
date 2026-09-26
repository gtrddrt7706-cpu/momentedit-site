// [PICK_V2 2026-09-26 코워크 최종판 3-10] ① 고르기 개편 — 받아들일 기준을 실브라우저로 잰다.
//
//   node scripts/audit/pick-v2.mjs          # 390 · 360 · 1280
//
// 보는 것(최종판 3-10 그대로)
//   ① 휴대폰 390(가족 예시): ① 길이 약 2,900px ±15% · 칸 글 말줄임 0 · 칸 이름 한 줄 · 가로 넘침 0 · 담기 원 누르는 자리 44 이상
//      아래 막대 요약 한 줄(360 · 390) · 개수 없이 «본식 · 단체 사진» 시간 둘 [BAR_SUM]
//   ② 창: ▶ → 열림 → 뒤로 가기 한 번에 창만 닫힘 → 초점이 누른 칸 · Esc · 창 안 담기 = 칸 상태 [PREVIEW_SHEET]
//   ③ 흐름 그림(예시 넷 · 빈 채 · 가장 긴 조합): 선이 그림 밖으로 안 나감 · 점이 가장 벅찬 순간 구간 안 ·
//      곡선 stroke 한 가지(#7A5F37) · 칠한 것은 점 하나 · 바닥선은 옅은 1px [FLOW_LINE]
//   ④ PC 1280: 레일 자리(오른쪽 88px)에 아무것도 안 닿음 · 얇은 띠는 흐름 띠가 나간 뒤에만 · 아래 단추 줄은 숨김 [PC_STORY]
//
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br;
try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄웠다'); srv.close(); process.exit(2); }

async function open(w, h) {
  const ctx = await br.newContext({ viewport: { width: w, height: h || 844 } });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  for (let i = 0; i < 5; i++) { if ((await pg.evaluate(() => STEPS[idx] && STEPS[idx].k)) === 'pick') break; await pg.click('#next'); await pg.waitForTimeout(450); }
  await pg.waitForTimeout(400);
  return { ctx, pg, errs };
}

// ① · ② 휴대폰
for (const w of [390, 360]) {
  const { ctx, pg, errs } = await open(w, w === 360 ? 640 : 844);
  ok(`${w} ① 에 들어왔다`, (await pg.evaluate(() => STEPS[idx].k)) === 'pick');
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => {
    const cta = document.getElementById('opCta'), nw = cta ? [...cta.querySelectorAll('.nw')].map((e) => Math.round(e.getBoundingClientRect().top)) : [];
    const sel = [...document.querySelectorAll('.pk-sel')].map((e) => e.getBoundingClientRect());
    return { H: document.documentElement.scrollHeight, ow: document.documentElement.scrollWidth - innerWidth,
      clamp: [...document.querySelectorAll('.pk-s')].filter((e) => e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent),
      names: [...document.querySelectorAll('.pk-n')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent),
      selW: Math.min(...sel.map((r) => r.width)), selH: Math.min(...sel.map((r) => r.height)), nw, cta: cta ? cta.textContent : '' };
  });
  if (w === 390) ok(`390 ① 길이 약 2,900px ±15% (${m.H}px)`, m.H >= 2465 && m.H <= 3335, m.H);
  ok(`${w} 칸 글 말줄임 0`, m.clamp.length === 0, m.clamp.join(' | '));
  ok(`${w} 칸 이름 한 줄`, m.names.length === 0, m.names.join(' | '));
  ok(`${w} 가로 넘침 0`, m.ow <= 0, m.ow);
  ok(`${w} 담기 원 누르는 자리 44 이상`, m.selW >= 44 && m.selH >= 44, m.selW + 'x' + m.selH);
  ok(`${w} 아래 막대 요약 한 줄 · 시간 둘 · 개수 없음 [BAR_SUM]`, m.nw.length === 2 && m.nw[0] === m.nw[1] && /단체\s사진/.test(m.cta) && !/담은 순간|고른 순간/.test(m.cta), JSON.stringify(m.nw) + ' ' + m.cta);
  if (w === 390) {
    // 창 — ▶ → 열림 → 뒤로 가기 한 번 → 창만 닫힘 → 초점이 누른 칸
    await pg.click('[data-fk="pto:candle"]'); await pg.waitForTimeout(600);
    ok('창이 열린다 · 초점은 창 안(✕) · 뒤는 inert', await pg.evaluate(() => !document.getElementById('pvSheet').hidden && document.activeElement.classList.contains('pv-x') && document.querySelector('.wrap').hasAttribute('inert')));
    await pg.goBack(); await pg.waitForTimeout(500);
    ok('뒤로 가기 한 번에 창만 닫힌다 · 초점이 누른 칸', await pg.evaluate(() => document.getElementById('pvSheet').hidden && STEPS[idx].k === 'pick' && document.activeElement.getAttribute('data-fk') === 'pto:candle' && !document.querySelector('.wrap').hasAttribute('inert')));
    await pg.click('[data-fk="pto:ring"]'); await pg.waitForTimeout(500);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
    ok('Esc 로 닫힌다(기록도 되감는다) · 초점이 누른 칸', await pg.evaluate(() => document.getElementById('pvSheet').hidden && !(history.state && history.state.pv) && document.activeElement.getAttribute('data-fk') === 'pto:ring'));
    await pg.click('[data-fk="pto:letter"]'); await pg.waitForTimeout(500);
    const before = await pg.evaluate(() => document.querySelector('[data-fk="opt:letter"]').getAttribute('aria-pressed'));
    await pg.click('#pvAct .pv-add'); await pg.waitForTimeout(400);
    const after = await pg.evaluate(() => ({ tile: document.querySelector('[data-fk="opt:letter"]').getAttribute('aria-pressed'), on: !!(S.on && S.on.letter), act: document.getElementById('pvAct').textContent, open: !document.getElementById('pvSheet').hidden }));
    ok('창 안 담기 = 칸 상태 · 창은 열린 채', before === 'false' && after.tile === 'true' && after.on && /담겨 있어요/.test(after.act) && after.open, JSON.stringify(after));
    ok('창 «② 보고 듣기에서 고를 것 · 받는 분»(② 묶음 이름과 같게)', await pg.evaluate(() => document.getElementById('pvCh').textContent === '② 보고 듣기에서 고를 것 · 받는 분'));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
    ok('예시를 누르면 6초 되돌리기 알림 줄', await pg.evaluate(() => { opEx('record'); const u = document.getElementById('pkUndo'); return !!u && !u.hidden && /‹기록› 예시로 바꿨어요/.test(u.textContent); }));
    await pg.click('#pkUndo button'); await pg.waitForTimeout(400);
    ok('되돌리기 → 앞 예시(가족 + 편지)로', await pg.evaluate(() => S.pickFrom === 'family' && !!(S.on && S.on.letter)));
  }
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

// ③ 흐름 그림 — 예시 넷 · 빈 채 · 가장 긴 조합
{
  const { ctx, pg, errs } = await open(390);
  const res = await pg.evaluate(() => {
    const R = RitualOpen, out = [];
    const longest = Object.assign(R.applyExample({}, 'family'), { freeWhat: 'video', freeLen: '3', tributeSay: 'long', letter: 'parent' });
    longest.on = {}; ['candle', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'toast'].forEach((k) => { longest.on[k] = 1; });
    const cases = R.EXAMPLES.map((e) => [e.k, R.applyExample({}, e.k)]).concat([['빈 채', { on: {} }], ['가장 긴 조합', longest]]);
    cases.forEach(([nm, S0]) => {
      [[324, { h: 112 }], [718, { names: true }], [112, { mini: true, h: 40 }], [180, { mini: true, h: 34 }], [64, { mini: true, h: 18 }]].forEach(([w, opt]) => {
        const sg = R.flowSegs(S0), host = document.createElement('div'); host.innerHTML = R.flowSVG(sg, w, opt);
        const svg = host.querySelector('svg'), h = +svg.getAttribute('height'), bad = [];
        svg.querySelectorAll('path').forEach((p) => { const n = (p.getAttribute('d').match(/-?\d+(\.\d+)?/g) || []).map(Number); for (let i = 0; i < n.length; i += 2) { if (n[i] < -0.5 || n[i] > w + 0.5 || n[i + 1] < -0.5 || n[i + 1] > h + 0.5) { bad.push('선이 밖(' + n[i] + ',' + n[i + 1] + ')'); break; } }
          if ((p.getAttribute('stroke') || '').toUpperCase() !== '#7A5F37') bad.push('선 색 ' + p.getAttribute('stroke'));
          if ((p.getAttribute('fill') || '') !== 'none') bad.push('선에 칠'); });
        const filled = [...svg.querySelectorAll('circle,rect,polygon,ellipse')].filter((e) => { const f = e.getAttribute('fill'); return f && f !== 'none' && f !== 'transparent'; });
        const p = R.flowPeak(sg);
        if (filled.length !== (p ? 1 : 0)) bad.push('칠한 것 ' + filled.length);
        svg.querySelectorAll('line').forEach((l) => { if (l.getAttribute('stroke') !== '#E6E1D9' || l.getAttribute('stroke-width') !== '1') bad.push('바닥선 ' + l.getAttribute('stroke') + '/' + l.getAttribute('stroke-width')); });
        if (p) { const c = svg.querySelector('circle.flow-peak'), t = +c.getAttribute('data-t'); if (!(t >= Math.floor(p.st) && t <= Math.ceil(p.st + p.d + 15))) bad.push('점이 구간 밖 ' + t); }
        if (bad.length) out.push(nm + ' ' + w + ': ' + bad.join(' · '));
      });
    });
    return out;
  });
  ok('흐름 그림 — 선이 안 · 점이 가장 벅찬 순간 구간 안 · 선 한 색 · 칠한 것은 점 하나 · 바닥선 옅은 1px (여섯 조합 × 다섯 크기) [FLOW_LINE]', res.length === 0, res.slice(0, 4).join(' | '));
  ok('흐름 그림 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ④ PC 1280
{
  const { ctx, pg, errs } = await open(1280, 900);
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(700);
  const lim = 1280 - 88;
  const pc = await pg.evaluate((lim) => ({
    nav: getComputedStyle(document.getElementById('nav')).display,
    right: [...document.querySelectorAll('.wrap *,#pkSlim *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > lim + 0.5; }).slice(0, 4).map((e) => e.className || e.tagName),
    slim: (document.getElementById('pkSlim') || {}).className || '',
    tiles: [...document.querySelectorAll('.pk-act')].map((a) => a.querySelectorAll('.pk-tile').length).join(',')
  }), lim);
  ok('PC 아래 단추 줄은 숨김(흐름 띠 · 얇은 띠에 «다음 · 보고 듣기»)', pc.nav === 'none', pc.nav);
  ok('PC 레일 자리(오른쪽 88px)에 아무것도 안 닿음 [RAIL_LOCKED]', pc.right.length === 0, pc.right.join(','));
  ok('PC 얇은 띠는 처음엔 안 보인다', !/\bon\b/.test(pc.slim), pc.slim);
  ok('PC 막마다 한 줄(4 · 4 · 3 · 2)', pc.tiles === '4,4,3,2', pc.tiles);
  await pg.evaluate(() => document.getElementById('pkActsH').scrollIntoView({ block: 'start' })); await pg.waitForTimeout(500);
  const sl = await pg.evaluate((lim) => { const s = document.getElementById('pkSlim'); const r = [...s.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > lim + 0.5; }).length; return { on: s.classList.contains('on'), t: s.textContent, r }; }, lim);
  ok('PC 흐름 띠가 나가면 얇은 띠(시간 둘 · ★) · 레일 자리 비움', sl.on && /본식\s약\s?\d+~\d+분\s·\s단체\s사진/.test(sl.t) && /★/.test(sl.t) && sl.r === 0, JSON.stringify(sl));
  await pg.click('[data-fk="pto:declare"]'); await pg.waitForTimeout(600);
  const sh = await pg.evaluate((lim) => { const b = document.querySelector('.pv-box').getBoundingClientRect(); return { w: Math.round(b.width), right: Math.round(b.right), cx: Math.round(b.left + b.width / 2) }; }, lim);
  ok('PC 미리 보기 = 가운데 창 680 · 레일 자리 비움', sh.w === 680 && sh.right <= lim && Math.abs(sh.cx - 640) <= 1, JSON.stringify(sh));
  ok('PC pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// ④-b [F2 · G3] 창의 «② 보고 듣기에서 고를 것» = ② 줄의 묶음 이름(_lGroups) — 한쪽만 고치면 창과 ② 가 갈린다
{
  const { ctx, pg } = await open(390);
  const miss = await pg.evaluate(() => {
    const R = RitualOpen, out = [], S0 = JSON.parse(JSON.stringify(S));
    try {
      Object.keys(R.CHOOSE_AT_LISTEN).forEach((k) => {
        R.applyExample(S, 'family'); S.on[k] = 1; S.toast = 'both'; S.wine = 'mix'; S.tribute = ''; S.cakeBy = 'self'; S.flowerBy = 'self';
        const labs = _lGroups(k).map((g) => g.l);
        /* 한 묶음 이름 안에도 « · »가 있다(선언 «누가 · 말투») — 긴 이름부터 통째로 맞춘다 */
        const t = R.CHOOSE_AT_LISTEN[k].split(' · ');
        for (let i = 0; i < t.length;) {
          let hit = 0; for (let n = t.length - i; n >= 1; n--) { if (labs.indexOf(t.slice(i, i + n).join(' · ')) > -1) { hit = n; break; } }
          if (!hit) { out.push(k + ': «' + t[i] + '» 가 ② 에 없다(② = ' + labs.join(' / ') + ')'); i++; } else i += hit;
        }
      });
    } finally { S = S0; }
    return out;
  });
  ok('창 «② 보고 듣기에서 고를 것»의 말이 모두 ② 묶음 이름이다 [F2 · G3]', miss.length === 0, miss.join(' | '));
  await ctx.close();
}
// ⑤ 좁은 화면에서는 얇은 띠가 안 보인다(시안에서 한 번 났던 버그 — 흐름 띠가 숨은 것을 «나갔다»로 읽음)
{
  const { ctx, pg } = await open(390);
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await pg.waitForTimeout(400);
  ok('390 얇은 띠 없음(스크롤해도)', await pg.evaluate(() => { const s = document.getElementById('pkSlim'); return !s || !s.classList.contains('on'); }));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}` : 'PICK_V2 OK');
process.exit(fail ? 1 : 0);
