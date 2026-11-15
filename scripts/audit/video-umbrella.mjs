// ★[VIDEO_UMBRELLA_1115 2026-11-15 대표님 «식전영상만이 아니라 식중영상도 있으니 이름도 바꿔야 · 그 안에 디자인도 멋지게»]
// 마이페이지 «상영 영상» 묶음(식중 영상 줄이 있는 분만) · 확인서 한 묶음 · 빌더 «보낼 것» 식중 줄 — 실제 화면(390 · 1280)으로 잰다.
//   ① 이름: mypage VU_NAME == order-preview VU_NAME · «예식 영상»(결과물 이름 · MPD_G10) 금지
//   ② 식중 없는 분: 묶음 머리 없음 · «식전 영상» 한 줄 그대로 · 확인서 «식전 영상 열기» 한 줄 그대로
//   ③ 식중 있는 분: 머리 줄(이름 + 기한) 하나 · 아래 식전 · 식중 두 줄(입장 전 · 덕담 뒤) · 기한 꼬리표는 머리에만 · 상태 꼬리표는 줄마다 · 단추 id 그대로 · 단추 오른쪽 끝 같은 자리
//   ④ 확인서: 이름 줄 하나 + 영상마다 상태 · 열기(data-cfpvc · data-cfmvc)
//   ⑤ 가로 넘침 0 · 쪽 오류 0
// 종료 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
let fail = 0; const ok = (name, cond, info) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond || info == null ? '' : ' — ' + info)); if (!cond) fail = 1; };
const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'), OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const nm = (s) => (s.match(/var VU_NAME='([^']+)'/) || [])[1];
ok('① 이름 한 벌(mypage = order-preview)', nm(MP) && nm(MP) === nm(OP), nm(MP) + ' / ' + nm(OP));
ok('① «예식 영상»은 결과물 이름 — 묶음 이름으로 쓰지 않는다', nm(MP) !== '예식 영상');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('재지 못했습니다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const { openWorld } = await import(path.join(ROOT, 'scripts/audit/_gasworld.mjs'));
const { G, world } = openWorld();
G.jsonOut = (o) => ({ __out: o });
const BASE = { 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 동의기록: '{}', 계약상태: '서명완료', 계약서명일시: '2026-10-14 10:00', 계약총액: 3300000, 현재단계: '제작중', 입금상태: '확인', 중도금상태: '확인' };
const ritOf = (mid) => ({ _v: 3, summary: { course: '담백', count: 7, min: '약 21분', flow: [] }, S: Object.assign({ course: 'open', on: Object.assign({ prevideo: 1, vow: 1 }, mid ? { free: 1 } : {}) }, mid ? { freeWhat: 'video', freeLen: '4' } : {}) });
const plus = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// 예식일은 오늘(한국)에서 12일 뒤 — 기한(7일 전)이 5일 남아 «N월 N일까지» 꼬리표가 서는 때
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), WED = plus(today, 12);
const CASES = {
  none: { mid: false, pv: { st: 'review' }, mv: null },
  both: { mid: true, pv: { st: 'review' }, mv: { st: 'draft', d: { link: 'https://drive.google.com/x', mode: 'upload' } } },
  done: { mid: true, pv: { st: 'done' }, mv: { st: 'done' } },
};
let CUR = null;
function setWorld(c) {
  world(Object.assign({}, BASE, { 예식일: WED }), { 상태: '확정', 입금확인: '확인', 선택날짜: WED, 선택시간: '14:00', 토큰: 'BT1' });
  const ref = G.findCustomerByCode('ME-TEST'); G.resolveSession = () => ({ ok: true, row: ref });
  const d = G.handleGetMyState({ token: 't' });
  G.handleSaveProductionTrack({ token: 't', track: 'ritual', draft: ritOf(c.mid), done: true, rev: (d.production.trackRevs || {}).ritual || d.production.rev });
}
function patch(out, c) { const p = out && out.production; if (!p) return out; const due = plus(WED, -7);
  p.prevideo = Object.assign({ up: true, kind: 'pre', st: '', d: null, consent: true, conf: null, due, wed: WED }, c.pv);
  p.midvideo = c.mv ? Object.assign({ up: true, kind: 'mid', st: '', d: null, consent: true, conf: null, due, wed: WED, on: true, len: 4 }, c.mv) : { up: true, kind: 'mid', st: '', on: false, len: 0, due, wed: WED };
  return out; }
const PORT = 8500 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
let b; try { b = await chromium.launch(); } catch (e) { srv.kill(); console.log('재지 못했습니다 — 브라우저를 열지 못함'); process.exit(fail ? 1 : 2); }
try {
  for (const W of [390, 1280]) for (const [name, c] of Object.entries(CASES)) {
    CUR = c; setWorld(c);
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e.message || e)));
    await page.route('**/script.google.com/**', async (r) => { const res = G.doPost({ postData: { contents: r.request().postData() || '{}' }, parameter: {} }); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(patch(res.__out, CUR)) }); });
    await page.route(/googleusercontent|tosspayments|naver|feelmaker|kakao/, (r) => r.abort());
    await page.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; try { localStorage.setItem('me_token', 't'); localStorage.setItem('me_ledtip_v1', 'o'); } catch (e) {} });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window._curView === 'mypageView', null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const b = document.getElementById('mp_cfOpen'); if (b) b.click(); });
    await page.waitForTimeout(300);
    const R = await page.evaluate(() => {
      const box = document.getElementById('mp_production') || document; const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
      const head = box.querySelectorAll('.vu-head'), rows = [...box.querySelectorAll('.trk.vu-row')];
      const pvB = document.getElementById('mp_pvcStart'), mvB = document.getElementById('mp_mvcStart');
      const rr = (e) => e && e.getBoundingClientRect();
      const plain = [...box.querySelectorAll('.trk')].filter((e) => !e.classList.contains('vu-row') && /^식전 영상/.test(t(e.querySelector('.trk-nm'))));
      const cf = document.getElementById('mp_cfPanel');
      return { head: head.length, headTxt: t(head[0]), due: t(head[0] && head[0].querySelector('.vu-due')), rows: rows.map((e) => ({ nm: [...e.querySelectorAll('.trk-nm > *, .trk-nm')].filter((x) => x.offsetParent !== null || x === e.querySelector('.trk-nm')).map((x) => (x.classList && x.classList.contains('trk-nm')) ? [...x.childNodes].filter((n) => n.nodeType === 3 || (n.offsetParent !== null)).map((n) => n.textContent).join('') : '').join('').replace(/\s+/g, ' ').trim(), tag: t(e.querySelector('.trk-tag')), btn: t(e.querySelector('.trk-act')) })), hRows: rows.map((e) => Math.round(e.getBoundingClientRect().height)),
        plain: plain.length, pv: !!pvB, mv: !!mvB, pvR: pvB ? rr(pvB).right : 0, mvR: mvB ? rr(mvB).right : 0, pvW: pvB ? rr(pvB).width : 0, mvW: mvB ? rr(mvB).width : 0,
        cf: cf ? { vu: cf.querySelectorAll('.vu-cf').length, p: cf.querySelectorAll('[data-cfpvc]').length, m: cf.querySelectorAll('[data-cfmvc]').length, txt: t(cf) } : null,
        sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    const tag = `${W} ${name}`;
    ok(`⑤ ${tag} 가로 넘침 0 · 쪽 오류 0`, R.sw <= R.iw && !errs.length, R.sw + '/' + R.iw + ' ' + errs.join(' | '));
    if (name === 'none') {
      ok(`② ${tag} 식중 없는 분 — 묶음 머리 없음 · «식전 영상» 한 줄`, R.head === 0 && R.rows.length === 0 && R.plain === 1 && R.pv && !R.mv, JSON.stringify(R));
      ok(`② ${tag} 확인서 — «식전 영상 열기» 한 줄 그대로`, R.cf && R.cf.vu === 0 && R.cf.p === 1 && R.cf.m === 0 && /식전 영상 열기/.test(R.cf.txt), JSON.stringify(R.cf));
    } else {
      ok(`③ ${tag} 머리 줄 하나(이름)`, R.head === 1 && R.headTxt.indexOf(nm(MP)) === 0, R.headTxt);
      ok(`③ ${tag} 두 줄 식전 · 식중 · «입장 전 · 덕담 뒤»는 시작 전에만 · 두 줄 높이 같음`, R.rows.length === 2 && /^식전 영상/.test(R.rows[0].nm) && /^식중 영상/.test(R.rows[1].nm) && R.rows.every((x, i) => (x.nm.indexOf(i ? '덕담 뒤' : '입장 전') > -1) === (!x.tag && !/✓/.test(x.nm) && x.btn === '시작하기')) && R.hRows[0] === R.hRows[1], JSON.stringify(R.rows));
      ok(`③ ${tag} 단추 id 그대로 · 오른쪽 끝 같은 자리 · 같은 폭`, R.pv && R.mv && Math.abs(R.pvR - R.mvR) < 1 && Math.abs(R.pvW - R.mvW) < 1, R.pvR + '/' + R.mvR + ' ' + R.pvW + '/' + R.mvW);
      ok(`③ ${tag} 기한 꼬리표는 머리에만(줄마다 되풀이 없음)`, R.rows.every((x) => !/까지$|기한 지남/.test(x.tag)), JSON.stringify(R.rows));
      if (name === 'both') {
        ok(`③ ${tag} 머리 기한 «확정 기한 · N월 N일(요일) · D-n»`, /^확정 기한 · \d+월 \d+일\([일월화수목금토]\) · D-5$/.test(R.due), R.due);
        ok(`③ ${tag} 상태 꼬리표는 줄마다(식전 «확인 필요»)`, R.rows[0].tag === '확인 필요', JSON.stringify(R.rows));
        ok(`④ ${tag} 확인서 — 이름 줄 + 영상마다 상태 · 열기`, R.cf && R.cf.vu === 2 && R.cf.p === 1 && R.cf.m === 1 && R.cf.txt.indexOf(nm(MP) + '은 각 영상 화면에서 따로 확정해요.') > -1 && /식전 영상 · 확인해 주세요영상 확인/.test(R.cf.txt) && /식중 영상 · 준비 중이에요이어하기/.test(R.cf.txt), JSON.stringify(R.cf));
      } else {
        ok(`③ ${tag} 둘 다 확정 — 머리 ✓ · 기한 없음`, /✓/.test(R.headTxt) && !R.due, R.headTxt + ' / ' + R.due);
      }
    }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
console.log(fail ? 'VIDEO UMBRELLA FAIL' : 'VIDEO UMBRELLA OK');
process.exit(fail);
