#!/usr/bin/env node
/* ★[PREVIEW_LOGIN_1122 2026-11-22 대표님 «로그인해야 확인할 수 있게 · 신랑 신부는 아이디 공유»] 예식 미리 듣기 로그인 관문 실행 검사.
   ① 로그인 없이 미리 듣기(console.html?mode=preview) → 마이페이지 로그인(?next=그 주소) · 안내 한 줄
   ② 두 분 로그인(me_token) 있으면 그대로 열림 · ③ 관리자 로그인(me_admin_token)만 있어도 열림 · ④ 현장 진행(mode 없음)은 관문 없음
   ⑤ 마이페이지에 이미 로그인된 채 ?next=미리 듣기 → 바로 그 주소로 · ⑥ ?next=다른 곳(밖 주소 · 다른 쪽)은 따라가지 않는다(열린 리다이렉트 금지)
   로컬 서버는 관문을 건너뛰므로(검사 수십 개가 로그인 없이 연다) 여기서는 ?gate=1 로 켠다 · 실제 계정 · 비밀번호는 쓰지 않는다.
   ★스스로 깨 보기: --selftest 는 관문 줄을 지운 판을 띄워 ①이 빨강이 되는지 본다. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const pw = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest');
let root = ROOT;
if (SELF) {   // 관문을 지운 사본(콘솔 한 파일만 바꿔 tmp 에 둔다 · 나머지는 심볼릭 링크)
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pvlogin-'));
  for (const f of fs.readdirSync(ROOT)) if (f !== 'console.html') fs.symlinkSync(path.join(ROOT, f), path.join(root, f));
  fs.writeFileSync(path.join(root, 'console.html'), fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8').replace("if (MODE === 'preview' && _PV_GATE &&", "if (false && MODE === 'preview' && _PV_GATE &&"));
}
/* 서버는 node 로(파이썬 · 고정 기다림 없이) — CI 러너가 느려도 준비된 뒤에 연다 */
import http from 'node:http';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let bad = 0;
const ok = (c, m, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' → ' + JSON.stringify(d))); if (!c) bad++; };
const B = `http://127.0.0.1:${port}`;
const S = Buffer.from(JSON.stringify({ course: 'open' })).toString('base64');
const PV = `/console.html?mode=preview&embed=1&gate=1&S=${encodeURIComponent(S)}`;
const b = await pw.chromium.launch();
async function open(url, ls, want) {
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.route('**/script.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"error":"offline"}' }));
  if (ls) await p.addInitScript((o) => { try { for (const k in o) localStorage.setItem(k, o[k]); } catch (e) {} }, ls);
  await p.goto(B + url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  if (want) await p.waitForURL((u) => want.test(u.pathname), { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return { ctx, p };
}
try {
  { const { ctx, p } = await open(PV, null, SELF ? null : /^\/mypage\.html$/); await p.waitForSelector('#li_err', { timeout: 15000 }).catch(() => {}); await p.waitForFunction(() => /로그인한 뒤/.test((document.getElementById('li_err') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {}); const u = new URL(p.url());
    const note = await p.evaluate(() => (document.getElementById('li_err') || {}).textContent || '').catch(() => '');
    ok(u.pathname === '/mypage.html' && u.searchParams.get('next') === PV, '① 로그인 없이 미리 듣기 → 마이페이지 로그인 · ?next=그 미리 듣기 주소', p.url());
    if (!SELF) ok(/로그인한 뒤 들을 수 있어요/.test(note), '① 로그인 화면에 까닭 한 줄', note);
    await ctx.close(); }
  if (!SELF) {
    { const { ctx, p } = await open(PV, { me_token: 'T_TEST' }); ok(new URL(p.url()).pathname === '/console.html', '② 두 분 로그인(me_token) 있으면 미리 듣기가 그대로 열린다', p.url()); await ctx.close(); }
    { const { ctx, p } = await open(PV, { me_admin_token: 'A_TEST' }); ok(new URL(p.url()).pathname === '/console.html', '③ 관리자 로그인만 있어도 열린다(관리자에서 여는 미리 듣기 그대로)', p.url()); await ctx.close(); }
    { const { ctx, p } = await open('/console.html?gate=1'); ok(new URL(p.url()).pathname === '/console.html', '④ 현장 진행(mode 없음)은 관문 없음', p.url()); await ctx.close(); }
    { const { ctx, p } = await open('/mypage.html?next=' + encodeURIComponent(PV), { me_token: 'T_TEST' }, /^\/console\.html$/); const u = new URL(p.url());
      ok(u.pathname === '/console.html' && u.searchParams.get('mode') === 'preview', '⑤ 이미 로그인된 채 마이페이지 ?next=미리 듣기 → 바로 그 주소', p.url()); await ctx.close(); }
    for (const evil of ['https://evil.example/x', '//evil.example/console.html?mode=preview', '/admin.html', '/console.html?mode=console']) {
      const { ctx, p } = await open('/mypage.html?next=' + encodeURIComponent(evil), { me_token: 'T_TEST' });
      ok(new URL(p.url()).pathname === '/mypage.html' && new URL(p.url()).host === `127.0.0.1:${port}`, `⑥ ?next=${evil} 는 따라가지 않는다`, p.url()); await ctx.close(); }
  }
} finally { await b.close(); srv.close(); }
if (SELF) { console.log(bad ? 'ok   깨 보기 — 관문을 지우면 ①이 빨강' : 'FAIL 깨 보기 — 관문을 지워도 초록(죽은 검사)'); process.exit(bad ? 0 : 1); }
console.log(bad ? `\nPREVIEW LOGIN FAIL ${bad}` : '\nPREVIEW LOGIN OK');
process.exit(bad ? 1 : 0);
