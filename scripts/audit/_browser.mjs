// 감사 스크립트 공용 브라우저 어댑터 — playwright(이 저장소의 원격 점검 환경 기본) 우선, puppeteer 폴백.
//   두 엔진의 차이(요청 가로채기 API·실행 파일 탐색)를 여기서 흡수해 각 감사 스크립트는 동일한 형태로 쓴다.
//   사용:
//     const eng = await launchBrowser();            // null이면 둘 다 없음(호출부가 건너뜀 안내)
//     const { page, errors } = await eng.newPage({ port, gasBody: '{"ok":true}' });
//     await page.goto(...); await page.evaluate(...); await page.close();
//     await eng.close();
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function findChromium() {
  // playwright 실행 파일 후보 — PLAYWRIGHT_BROWSERS_PATH(원격 점검 환경) → 흔한 설치 경로 순서로 스캔
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    try {
      for (const d of fs.readdirSync(root)) {
        if (!/^chromium-\d+$/.test(d)) continue;
        const exe = path.join(root, d, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return exe;
      }
    } catch {}
  }
  return null;
}

export async function launchBrowser() {
  // 1) playwright
  let pw = null;
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { pw = require(p); break; } catch {}
  }
  if (pw) {
    let browser = null;
    try { browser = await pw.chromium.launch(); }
    catch {
      const exe = findChromium();
      if (exe) { try { browser = await pw.chromium.launch({ executablePath: exe }); } catch {} }
    }
    if (browser) {
      return {
        kind: 'playwright',
        close: () => browser.close(),
        async newPage({ port, gasBody = '{"ok":true}', viewport = { width: 414, height: 900 } } = {}) {
          const page = await browser.newPage({ viewport });
          const errors = [];
          page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
          page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
          await page.route('**', (route) => {
            const u = route.request().url();
            if (u.includes('script.google.com')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: gasBody });
            if (u.startsWith(`http://localhost:${port}`)) return route.continue();
            return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });   // 폰트·외부 리소스는 빈 응답(오프라인 환경 렌더 블록 방지)
          });
          return { page, errors };
        },
      };
    }
  }
  // 2) puppeteer 폴백(로컬 PC에서 npm i puppeteer 한 경우)
  let puppeteer = null;
  for (const p of ['puppeteer', '/tmp/dz/node_modules/puppeteer']) {
    try { puppeteer = require(p); break; } catch {}
  }
  if (!puppeteer) return null;
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  return {
    kind: 'puppeteer',
    close: () => browser.close(),
    async newPage({ port, gasBody = '{"ok":true}' } = {}) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const u = req.url();
        if (u.includes('script.google.com')) return req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: gasBody });
        if (u.startsWith(`http://localhost:${port}`)) return req.continue();
        return req.respond({ status: 200, contentType: 'text/plain', body: '' });
      });
      return { page, errors };
    },
  };
}
