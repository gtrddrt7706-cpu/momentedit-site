// 좌석 캔버스 · 실제 같은 이름(3~4자)이 서로 · 옆 테이블 · 컨트롤 · 테이블 이름과 겹치지 않는가 [SEAT_NAME_FIT]
//
// ★왜 만드나 (2026-09-26 마이페이지 점검 trk-2)
//   테스트 이름이 한 글자(가·나·다)라 4년 가까이 안 보였다. 김철수·사촌동생·작은삼촌을 넣으니
//   320 에서 버진로드 건너 옆 테이블 알약 밑에 깔려 «이영»만 보였고, 390~430 도 같은 테이블 윗줄 짝이 8~14px 겹쳤다.
//   [SEAT_FIT](seat-onecard.mjs)은 4자리 · 카드 넘침만 재서 이 겹침을 못 봤다 — 그래서 «5자리 · 테이블 이름 있음» 표본으로 따로 잰다.
// ★재는 것(폭마다): 알약×알약 0 · 알약×＋－✕ 0 · 알약×테이블 이름(rt-cap) 0 · 알약×번호 ≤1px · 알약이 카드 밖 ≤2px · 가로 넘침 0
// ★종료코드 [CANT_LOOK] — 0 통과 · 1 재서 틀림 · 2 재지 못함(브라우저 없음 · 편집기가 안 뜸)
//   사용: node scripts/audit/seat-name-fit.mjs
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = await freePort();   // [FREE_PORT] 박아 두면 나란히 돌 때 부딪힌다
const WIDTHS = [320, 360, 375, 390, 414, 430, 480, 600];
const NAMES = [['김철수', '이영희', '박민준', '정하늘', '최지우'], ['사촌동생', '작은삼촌', '큰이모', '고모부', '외숙모'],
  ['김민지', '이서연', '박지훈', '최수빈', '한유진'], ['회사동료', '팀장님', '선배', '후배', '동기'],
  ['아버님', '어머님', '할머니', '할아버지', '외삼촌'], ['친구A', '친구B', '친구C', '친구D', '친구E']];
const CAPS = ['양가 부모님', '신랑 친척', '신부 친구', '회사', '가족', '친구'];

const eng = await launchBrowser();
if (!eng) { console.log('━━ seat-name-fit — playwright·puppeteer 가 없어 재지 못했습니다'); process.exit(2); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

let fail = 0, looked = 0;
const bad = [];
try {
  for (const w of WIDTHS) {
    for (const withCap of [false, true]) {
      const { page } = await eng.newPage({ port: PORT, viewport: { width: w, height: 900 } });
      await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 900));
      const tables = NAMES.map((s, i) => ({ name: withCap ? CAPS[i] : '테이블 ' + (i + 1), side: i < 3 ? 'L' : 'R', seats: s, drinks: s.map(() => 'C') }));
      /* ★show() 의 등장 애니메이션(.view · transform) 이 도는 동안은 position:fixed 오버레이가 화면이 아니라 그 view 상자에 갇힌다 —
         카드가 좌우 22px 씩 좁아져 실제 화면(목록에서 누르고 들어온 화면)보다 가혹한 판을 재게 된다(2026-09-26 실측 314 vs 358px).
         그래서 view 를 먼저 띄우고 애니메이션이 끝난 뒤에 편집기를 연다 — 고객이 실제로 보는 판이다. */
      await page.evaluate(() => { window._mpStateD = { production: { base: { weddingDate: '2026-10-26' }, tracks: {} } }; show('mypageView'); });
      await new Promise((r) => setTimeout(r, 800));
      await page.evaluate((tbls) => { document.getElementById('mp_production').style.display = 'block'; startSeatFlow({ tables: tbls }, { headcount: '' }, 'TESTTOKEN', { seatMode: 'all' }); }, tables);
      await new Promise((r) => setTimeout(r, 400));
      const m = await page.evaluate(() => {
        const R = (sel) => [...document.querySelectorAll('#mp_production ' + sel)].map((e) => ({ t: e.textContent.trim(), r: e.getBoundingClientRect() }));
        const pills = R('.rs'), nos = R('.rt-c'), ctl = R('.rt-mini'), caps = R('.rt-cap');
        if (!pills.length) return null;
        const ov = (a, b) => { const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return (x > 0 && y > 0) ? Math.round(Math.min(x, y)) : 0; };
        const out = [];
        for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) { const o = ov(pills[i].r, pills[j].r); if (o > 0) out.push(`알약 ${pills[i].t}×${pills[j].t} ${o}px`); }
        for (const p of pills) { for (const c of ctl) { const o = ov(p.r, c.r); if (o > 0) out.push(`알약 ${p.t}×단추 ${c.t} ${o}px`); }
          for (const c of caps) { const o = ov(p.r, c.r); if (o > 0) out.push(`알약 ${p.t}×테이블 이름 ${c.t} ${o}px`); }
          for (const n of nos) { const o = ov(p.r, n.r); if (o > 1) out.push(`알약 ${p.t}×번호 ${n.t} ${o}px`); } }
        const card = document.querySelector('#mp_production .seat-card'); const cr = card ? card.getBoundingClientRect() : null;
        if (cr) for (const p of pills) { const o = Math.max(cr.left - p.r.left, p.r.right - cr.right); if (o > 2) out.push(`알약 ${p.t} 카드 밖 ${Math.round(o)}px`); }
        if (document.documentElement.scrollWidth > innerWidth) out.push(`가로 넘침 ${document.documentElement.scrollWidth - innerWidth}px`);
        return { out, n: pills.length, caps: caps.length, cardW: cr ? Math.round(cr.width) : 0 };
      });
      await page.close();
      if (!m) { console.log(`  ?  ${w}px${withCap ? ' · 테이블 이름' : ''} — 편집기가 안 떴다`); continue; }
      looked++;
      const tag = `${w}px${withCap ? ' · 테이블 이름 ' + m.caps : ''} · 알약 ${m.n} · 카드 ${m.cardW}px`;
      if (m.out.length) { fail++; bad.push(tag); console.log(`  ❌ ${tag} — ${m.out.slice(0, 6).join(' · ')}${m.out.length > 6 ? ` 외 ${m.out.length - 6}` : ''}`); }
      else console.log(`  ✅ ${tag} — 겹침 0`);
    }
  }
} finally {
  try { await eng.close?.(); } catch {}
  server.kill();
}
if (!looked) { console.log('━━ seat-name-fit — 한 폭도 재지 못했습니다'); process.exit(2); }
if (fail) { console.log(`━━ seat-name-fit — 빨강 ${fail}건(${bad.join(' / ')}) · mypage.html [SEAT_NAME_FIT] 블록(≤480 반지름 ×.44 · 이름 칸 38px · ≤380 지그재그 4px)을 확인할 것`); process.exit(1); }
console.log(`━━ seat-name-fit OK — ${looked}판(${WIDTHS.join('·')}px × 테이블 이름 없음/있음) · 실제 같은 이름 5자리 · 겹침 0`);
process.exit(0);
