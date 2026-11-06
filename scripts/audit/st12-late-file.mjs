#!/usr/bin/env node
/* ★[ST12_02_LATE_FILE 2026-11-06 점검 ST12-02 «현재 선택한 파일의 결과만 반영 · 이전 파일 결과는 새 소리와 안내를 바꾸지 않음»]
   식순 화면(order-preview) 줄 «파일 올리기» · 이 기기 파일 찾기에서 늦게 도착한 옛 결과가 새 선택을 덮지 않는지 실브라우저로 잰다.
   ① 파일 A(느린 다듬기)를 고르고 × → 파일 B 를 고름 → B 들어 보기 뒤 A 결과가 도착해도 B 그대로(이름 · 길이)
   ② 같은 길 · A 가 늦게 실패해도 B 들어 보기 그대로(오류 창으로 바뀌지 않음)
   ③ 옛 파일 찾기(IndexedDB)가 늦게 «있음» — 그 사이 새 파일로 바꾼 자리는 새 소리 그대로
   ④ 옛 녹음 찾기가 늦게 «없음» — 새 파일 줄 아래에 «이 기기에 없어요»를 적지 않는다
   ⑤ 자리를 비운 뒤 늦게 «있음» — 빈 자리에 소리를 붙이지 않는다
   돌연변이: 세 고침을 하나씩 되돌린 판을 띄워 맞는 검사가 빨강이 되는지 본다(되돌려도 초록이면 죽은 검사).
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SRC = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
/* 정적 — 고친 자리 셋 */
const FIX = {
  rec: [/if\(MK_REC!==me\) return;/g, 'if(!MK_REC||MK_REC.key!==key) return;'],
  get: [/var _now=\(S\.up\|\|\{\}\)\[key\]; if\(!_now\|\|typeof _now!=='object'\|\|_now\.id!==v\.id\)\{ delete RF_LOAD\[v\.id\]; return; \}/, ''],
  err: [/var _c=\(S\.up\|\|\{\}\)\[key\]; if\(!_c\|\|typeof _c!=='object'\|\|_c\.id!==id\) return;/, ''],
};
ok('정적 · _recFromBlob 차례표(me) · 결과 · 실패 둘 다 MK_REC!==me 로 거른다 [ST12_02_LATE_FILE]',
  /function _recFromBlob\(key,blob,src,name,cap,cut\)\{ var me=MK_REC=\{key:key,ph:'busy'/.test(SRC) && (SRC.match(/if\(MK_REC!==me\) return;/g) || []).length === 2 && !/if\(!MK_REC\|\|MK_REC\.key!==key\) return;\n    var _cap/.test(SRC));
ok('정적 · _rfUrl 찾기 결과는 그 자리가 아직 그 파일일 때만 · _rfErr 줄 글도 그 파일일 때만 [ST12_02_LATE_FILE]', FIX.get[0].test(SRC) && FIX.err[0].test(SRC));
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let HTML = SRC;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/order-preview.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HTML); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }

async function run() {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  const out = await pg.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    /* 파일 고르기 — mkUp 이 만든 파일 칸을 잡아 진짜 onchange 길로 */
    let inp; const C0 = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { inp = this; return; } return C0.call(this); };
    const file = (name, sec) => new File([RecProcess.wav(new Float32Array(Math.round(sec * 24000)).map((x, i) => 0.2 * Math.sin(i / 8)), 24000)], name, { type: 'audio/wav' });
    const pick = (f) => { mkUp('g0'); const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.onchange(); };
    const P0 = RecProcess.process; let gate = null, slowN = -1, slowFail = false;
    RecProcess.process = function (ab, need) { const n = ab.byteLength; return P0(ab, need).then((x) => (n === slowN ? new Promise((res, rej) => { gate = () => (slowFail ? rej(new Error('late')) : res(x)); }) : x)); };
    const settle = async () => { for (let i = 0; i < 60 && MK_REC && MK_REC.ph === 'busy'; i++) await sleep(50); };
    for (const late of ['ok', 'fail']) {
      MK_REC = null; render(); gate = null; slowFail = late === 'fail';
      const a = file('A.wav', 3); slowN = a.size; pick(a); await sleep(80); mkDlgClose();
      pick(file('B.wav', 2)); await settle();
      const b = MK_REC && { ph: MK_REC.ph, name: MK_REC.name, dur: Math.round(MK_REC.dur) };
      if (gate) gate(); await sleep(250);
      const z = MK_REC && { ph: MK_REC.ph, name: MK_REC.name, dur: Math.round(MK_REC.dur), use: !!document.querySelector('#mkRecDlg [data-fk="mkrecuse"]') };
      o[late] = { b, z, gated: !!gate };
    }
    MK_REC = null; render(); RecProcess.process = P0;
    /* 이 기기 파일 찾기 — 늦게 오는 IndexedDB 답 */
    const gates = []; window._rfGet = (id) => new Promise((res) => gates.push(res));
    S.up = S.up || {}; S.up.g0 = { n: 'A', id: 'idA', src: 'file' }; delete RF_URL.g0; delete RF_URL['g0#']; _rfUrl('g0', true);
    S.up.g0 = { n: 'B', id: 'local:B', src: 'file', local: 1 }; RF_URL.g0 = 'blob:B';
    gates.shift()(new Blob(['aaaa'], { type: 'audio/wav' })); await sleep(50); o.found = _rfUrl('g0');
    S.up.g1 = { n: 'A', id: 'local:A1', src: 'rec', local: 1 }; delete RF_URL.g1; if (MK.lineErr) delete MK.lineErr.g1; _rfUrl('g1', true); MK.rfWant = { k: 'g1', at: Date.now() };
    S.up.g1 = { n: 'B', id: 'local:B1', src: 'file', local: 1 }; RF_URL.g1 = 'blob:B1';
    gates.shift()(null); await sleep(50); o.missErr = (MK.lineErr || {}).g1 || ''; o.wantKept = !!MK.rfWant;
    S.up.g2 = { n: 'A', id: 'idA2', src: 'file' }; delete RF_URL.g2; _rfUrl('g2', true); S.up.g2 = 0;
    gates.shift()(new Blob(['a'], { type: 'audio/wav' })); await sleep(50); o.leftUrl = RF_URL.g2 || '';
    /* 서버 받기(마이페이지 · ritualFileGet) 실패가 늦게 — 그 사이 새 파일로 바꾼 줄 */
    S.up.g3 = { n: 'A', id: 'idA3', src: 'file' }; if (MK.lineErr) delete MK.lineErr.g3; MK.rfWant = { k: 'g3', at: Date.now() };
    S.up.g3 = { n: 'B', id: 'idB3', src: 'file' }; _rfData({ key: 'g3', id: 'idA3', ok: false, error: '연결이 끊겼어요 (코드 L6)', ecode: 'L6' }); await sleep(30);
    o.srvErr = (MK.lineErr || {}).g3 || '';
    /* 같은 파일이면 그대로 받는다(고침이 정상 길을 막지 않는다) */
    S.up.g5 = { n: 'C', id: 'idC', src: 'file' }; delete RF_URL.g5; delete RF_URL['g5#']; _rfUrl('g5', true);
    gates.shift()(new Blob(['c'], { type: 'audio/wav' })); await sleep(50); o.sameUrl = /^blob:/.test(_rfUrl('g5') || '');
    return o;
  });
  await ctx.close(); return { out, errs };
}
const judge = (o) => ({
  okLate: !!(o.ok && o.ok.gated && o.ok.b && o.ok.b.name === 'B' && o.ok.z && o.ok.z.ph === 'review' && o.ok.z.name === 'B' && o.ok.z.dur === 2 && o.ok.z.use),
  failLate: !!(o.fail && o.fail.gated && o.fail.z && o.fail.z.ph === 'review' && o.fail.z.name === 'B'),
  found: o.found === 'blob:B', miss: o.missErr === '', srv: o.srvErr === '', left: o.leftUrl === '', same: o.sameUrl,
});
const { out, errs } = await run(); const j = judge(out);
ok('① A 를 고르고 × → B · 늦게 끝난 A 가 B 들어 보기(이름 · 길이 · «이걸로 쓰기»)를 덮지 않는다', j.okLate, JSON.stringify(out.ok));
ok('② A 가 늦게 실패해도 B 들어 보기 그대로', j.failLate, JSON.stringify(out.fail));
ok('③ 옛 파일 찾기가 늦게 «있음» — 새 파일 자리는 새 소리 그대로', j.found, out.found);
ok('④ 옛 녹음 찾기가 늦게 «없음» — 새 파일 줄 아래 옛 까닭 없음', j.miss, out.missErr);
ok('④-2 서버 받기 실패가 늦게 와도 새 파일 줄 아래 옛 까닭 없음', j.srv, out.srvErr);
ok('⑤ 비운 자리에 늦은 소리를 붙이지 않는다', j.left, out.leftUrl);
ok('⑥ 같은 파일 찾기는 그대로 받는다(정상 길)', j.same);
ok('페이지 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | '));
/* 돌연변이 — 고침을 하나씩 되돌리면 맞는 검사가 빨강이어야 한다 */
for (const [k, [re, back], want] of [['rec', FIX.rec, ['okLate', 'failLate']], ['get', FIX.get, ['found', 'left']], ['err', FIX.err, ['srv']]]) {
  re.lastIndex = 0; if (!re.test(SRC)) { ok(`돌연변이 ${k} · 고친 자리를 못 찾음`, false); continue; }
  HTML = SRC.replace(re, back); const m = judge((await run()).out); HTML = SRC;
  ok(`돌연변이 ${k} · 되돌리면 ${want.join(' · ')} 빨강`, want.every((w) => !m[w]), JSON.stringify(m));
}
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}` : 'ALL OK'); process.exit(fail ? 1 : 0);
