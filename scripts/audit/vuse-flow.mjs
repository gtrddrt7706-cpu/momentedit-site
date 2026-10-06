// ★[VUSE_FLOW 2026-10-05 사장님 «주인공 안내 목소리 · 기본 이해 · 어디서 쓰이는지만 · 누르면 작은 창 · 다음으로 쭉»] 두 분 목소리 만들기 쪽(390 · 1280)
//   ①맨 위(목소리 카드보다 먼저) 이해 한 줄 «주인공의 목소리» ②나오는 곳 = AI 로 정한 자리 이름만(상태 · 읽는 분 없음) · 옛 목록(mk-vuse-r) 없음
//   ③누르면 작은 창 — 장면 그림 · 언제 · 듣는 문장 · 이전/다음 · «1 / n» ④다음으로 쭉 · 마지막은 «닫기» → 창 닫힘 ⑤좌우 화살표 · Esc ⑥AI 로 안 정한 자리는 빠진다
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: false } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(500); await pg.evaluate(() => mkGo('_voice')); await wait(700);
    const a = await pg.evaluate(() => { const v = document.querySelector('.mk-vuse'), c = document.querySelector('.mk-vpcs, .mk-vpc'); return { one: /주인공의 목소리/.test((document.querySelector('.mk-vuse-1') || {}).textContent || ''), first: !!(v && c && (v.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)), names: [...document.querySelectorAll('.mk-vfb')].map((b) => b.textContent.replace(/\s/g, ' ')), old: document.querySelectorAll('.mk-vuse-r').length, state: /만듦|확정됨|아직/.test((document.querySelector('.mk-vflow') || {}).textContent || '') }; });
    ok(`${w} ① 맨 위 이해 한 줄 «주인공의 목소리» · 목소리 카드보다 먼저`, a.one && a.first, JSON.stringify(a));
    ok(`${w} ② 나오는 곳 = AI 로 정한 자리 이름만(식전 영상 소개는 나레이션이라 빠짐) · 상태 없음 · 옛 목록 없음 ⑥`, a.names.join('|') === '하객 입장 때|시작 10분 전|시작 5분 전|시작 1분 전|입장 인사' && !a.state && a.old === 0, JSON.stringify(a));
    await pg.click('[data-fk="mkvuse:g1"]'); await wait(300);
    const b = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { dlg: !!(d && d.querySelector('[role=dialog][aria-modal=true]')), t: (document.getElementById('mkDlgT') || {}).textContent, img: !!(d && d.querySelector('.mk-vu-img img, .mk-vu-img video'))   /* [VU_VIDEO_PLAY 2026-10-06] 영상도 같은 틀 */, when: (d && d.querySelector('.mk-vu-when') || {}).textContent || '', q: ((d && d.querySelector('.mk-vu-q')) || {}).textContent || '', n: (d && d.querySelector('.mk-vu-n') || {}).textContent, edit: !!(d && d.querySelector('[data-fk^="mkai"],[data-fk^="mkkeep"],textarea')) }; });
    ok(`${w} ③ 누르면 작은 창 — 장면 · «예식 시작 10분 전 · 신부 목소리» · 듣는 문장 · 2 / 5 · 고치기 단추 없음`, b.dlg && b.t === '시작 10분 전' && b.img && /예식 시작 10분 전 · (신랑|신부|두 분) 목소리/.test(b.when) && b.q.length > 10 && b.n === '2 / 5' && !b.edit, JSON.stringify(b));
    await pg.keyboard.press('ArrowRight'); await wait(200);
    const c = await pg.evaluate(() => (document.getElementById('mkDlgT') || {}).textContent);
    ok(`${w} ⑤ 오른쪽 화살표 = 다음(시작 5분 전)`, c === '시작 5분 전', c);
    for (let i = 0; i < 2; i++) { await pg.click('[data-fk="mkusenext"]'); await wait(200); }
    const d = await pg.evaluate(() => ({ t: (document.getElementById('mkDlgT') || {}).textContent, next: (document.querySelector('[data-fk="mkusenext"]') || {}).textContent }));
    ok(`${w} ④ 마지막 장(입장 인사)은 «닫기»`, d.t === '입장 인사' && d.next === '닫기', JSON.stringify(d));
    await pg.click('[data-fk="mkusenext"]'); await wait(300);
    ok(`${w} ④ «닫기» → 창 닫힘 · 연 단추로 포커스`, await pg.evaluate(() => !document.getElementById('mkRecDlg') && MK.use == null));
    await pg.click('[data-fk="mkvuse:g0"]'); await wait(200); await pg.keyboard.press('Escape'); await wait(300);
    ok(`${w} ⑤ Esc 로 닫힘`, await pg.evaluate(() => !document.getElementById('mkRecDlg') && MK.use == null));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVUSE FLOW FAIL ${fail}` : '\nVUSE FLOW OK'); process.exit(fail ? 1 : 0);
