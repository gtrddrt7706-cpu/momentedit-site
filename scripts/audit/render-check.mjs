// 프론트 렌더·구문 점검 — 정적 페이지의 인라인 <script> 구문 + 실제 로드 시 콘솔/페이지 에러를 잡는다.
//   1) 모든 대상 HTML의 인라인 스크립트 구문 검사(new Function)
//   2) puppeteer로 mypage·admin을 띄워 script.google.com을 목(mock)하고 pageerror 수집
//   사용: node scripts/audit/render-check.mjs
//   puppeteer가 없으면 1)만 실행하고 2)는 건너뛴다(설치 안내 출력).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES = ['mypage.html', 'admin.html', 'index.html', 'schedule.html', 'inquiry.html',
  'contract/v1-1.html', 'contract/snap-v1-0.html'];
const DRIVE = ['mypage.html', 'admin.html'];   // puppeteer로 실제 로드해 pageerror 수집할 페이지
const PORT = 8111;

// ---------- 1) 인라인 스크립트 구문 검사 ----------
function checkSyntax(file) {
  const abs = path.join(SITE, file);
  if (!fs.existsSync(abs)) return { file, missing: true };
  const src = fs.readFileSync(abs, 'utf8');
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, blocks = 0, errors = [];
  while ((m = re.exec(src))) {
    if (/\btype=/.test(m[1]) && !/text\/javascript/.test(m[1])) continue;   // ld+json 등 비-JS 제외
    if (/\bsrc=/.test(m[1])) continue;
    blocks++;
    try { new Function(m[2]); } catch (e) { errors.push(e.message); }
  }
  return { file, blocks, errors };
}

console.log('── 1) 인라인 스크립트 구문 ──');
let synFail = 0;
for (const f of PAGES) {
  const r = checkSyntax(f);
  if (r.missing) { console.log(`  · ${f} (없음, 건너뜀)`); continue; }
  if (r.errors.length) { synFail += r.errors.length; console.log(`  ❌ ${f}: ${r.errors.join(' | ')}`); }
  else console.log(`  ✅ ${f} (${r.blocks} blocks)`);
}

// ---------- 2) puppeteer 렌더 ----------
const require = createRequire(import.meta.url);
let puppeteer = null;
for (const p of ['puppeteer', '/tmp/dz/node_modules/puppeteer']) { try { puppeteer = require(p); break; } catch {} }

if (!puppeteer) {
  console.log('\n── 2) 렌더 점검 건너뜀 ── puppeteer 미설치. `npm i puppeteer` 후 다시 실행하세요.');
  process.exit(synFail ? 1 : 0);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

let renderFail = 0;
try {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  console.log('\n── 2) 렌더(pageerror) ──');
  for (const page of DRIVE) {
    const pg = await browser.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
    await pg.setRequestInterception(true);
    pg.on('request', (req) => {
      const u = req.url();
      if (u.includes('script.google.com')) return req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true}' });
      if (u.startsWith(`http://localhost:${PORT}`)) return req.continue();
      return req.respond({ status: 200, contentType: 'text/plain', body: '' });
    });
    await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));
    if (errs.length) { renderFail += errs.length; console.log(`  ❌ ${page}: ${errs.slice(0, 4).join(' | ')}`); }
    else console.log(`  ✅ ${page} (pageerror 0)`);
    await pg.close();
  }
  await browser.close();
} finally { server.kill(); }

console.log(`\n결과 — 구문 오류 ${synFail} · 렌더 오류 ${renderFail}`);
process.exit(synFail + renderFail ? 1 : 0);
