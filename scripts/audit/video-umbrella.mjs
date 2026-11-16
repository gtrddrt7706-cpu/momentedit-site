// ★[VIDEO_UMBRELLA_1115 2026-11-15 대표님 «식전영상만이 아니라 식중영상도 있으니 이름도 바꿔야 · 그 안에 디자인도 멋지게»]
// 마이페이지 «상영 영상» 묶음(식중 영상 줄이 있는 분만) · 확인서 한 묶음 · 빌더 «보낼 것» 식중 줄 — 실제 화면(390 · 1280)으로 잰다.
//   ① 이름: mypage VU_NAME == order-preview VU_NAME · «예식 영상»(결과물 이름 · MPD_G10) 금지
//   ★★[UMBRELLA_ROW_1116 2026-11-16 대본 12:59 · 대표님 «이것도 이름 바꿔야지 · 식중 영상도 있잖아»] 목록은 늘 «상영 영상» 한 줄 — 옛 기대(② «식전 영상» 한 줄 · ③ 머리 줄 vu-head + 늘 펼친 두 줄)는 은퇴(RULES_SLIM ⑧)
//   ② 식전만 고른 분: «상영 영상» 한 줄(단추 mp_pvcStart · 펼침 없음) · 식중만 고른 분(드묾): «상영 영상» 한 줄(단추 mp_mvcStart) · 확인서 «식전 영상 열기» 한 줄 그대로
//   ③ 둘 다: «상영 영상» 한 줄(다른 줄과 같은 높이 · ✓ = 둘 다 완료 · 꼬리표 = 확정 기한 · 단추 mp_vuOpen 시작하기 / 보기 · aria-expanded · aria-controls) · 펼침은 처음 닫힘 ·
//      누르면 아래 식전 · 식중 두 줄(입장 전 · 축사 · 축가 뒤 · 기한 꼬리표 없음 · 상태 꼬리표는 줄마다 · 단추 id 그대로 · 오른쪽 끝 같은 자리) · 열어도 머리 줄 · 단추가 움직이지 않는다 · 다시 누르면 닫힘
//   ④ 확인서: 이름 줄 하나 + 영상마다 상태 · 열기(data-cfpvc · data-cfmvc)
//   ⑤ 가로 넘침 0 · 쪽 오류 0
//   ⑥ 안쪽 화면(식전 · 식중 첫 화면): 보조 길은 단추 위 한 줄(첫 눈에 다 보임 · [VU_SUBS_BAR_1115]) · 맨 위 «지금 하실 일 · 확정 기한» 띠 하나 · 날짜는 한 번만 · 단계 셋 · 식중은 «선택 사항 · 제작비는 두 분 부담»(★[SPEECH_SONG_1115] «축사 대신 상영» 걷음 — 식중 영상은 축사 · 축가와 함께 담는다 · 옛 기대 셋) · 진사 단추 0(첫 화면) · 흰 상자 0
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
const ritOf = (mid) => ({ _v: 3, summary: { course: '담백', count: 7, min: '약 21분', flow: [] }, S: Object.assign({ course: 'open', on: Object.assign({ prevideo: 1, vow: 1 }, mid ? { midvid: 1, song: 1 } : {}) }, mid ? { midLen: '4' } : {}) });   // ★[SPEECH_SONG_1115] 식중 영상 = S.on.midvid(축가와 함께) · 옛 초안 free + video 는 midvideo.mjs 가 잰다
const plus = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// 예식일은 오늘(한국)에서 12일 뒤 — 기한(7일 전)이 5일 남아 «N월 N일까지» 꼬리표가 서는 때
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), WED = plus(today, 12);
const CASES = {
  none: { mid: false, pv: { st: 'review' }, mv: null },
  midonly: { mid: true, pv: { up: false }, mv: { st: '' } },   // [UMBRELLA_ROW_1116] 식중만(식전 줄이 서지 않는 드문 날)
  both: { mid: true, pv: { st: 'review' }, mv: { st: 'draft', d: { link: 'https://drive.google.com/x', mode: 'upload' } } },
  done: { mid: true, pv: { st: 'done' }, mv: { st: 'done' } },
  fresh: { mid: true, pv: { st: '' }, mv: { st: '' } },
  late: { mid: true, pv: { st: 'done' }, mv: { st: 'checking' } },   // 식전 확정 + 식중 «스튜디오 확인 중»(390 에서 꼬리표가 가장 긴 때)   // ⑥ 안쪽 첫 화면(둘 다 시작 전)
};
let CUR = null; const HB = {};
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
    const MEAS = () => page.evaluate((VU) => {
      const box = document.getElementById('mp_production') || document; const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
      const vis = (e) => !!(e && e.offsetParent !== null);
      const hb = document.getElementById('mp_vuOpen'), hr = hb ? hb.closest('.trk') : null, fold = document.getElementById('mp_vuFold');
      const rows = [...box.querySelectorAll('.trk.vu-row')].filter(vis);
      const pvB = document.getElementById('mp_pvcStart'), mvB = document.getElementById('mp_mvcStart');
      const rr = (e) => e && e.getBoundingClientRect();
      const vuRows = [...box.querySelectorAll('.trk')].filter((e) => !e.classList.contains('vu-row') && t(e.querySelector('.trk-nm')).indexOf(VU) === 0);
      const old = [...box.querySelectorAll('.trk')].filter((e) => !e.classList.contains('vu-row') && /^식(전|중) 영상/.test(t(e.querySelector('.trk-nm'))));
      const other = [...box.querySelectorAll('.trk')].find((e) => /^청첩장/.test(t(e.querySelector('.trk-nm'))));
      const cf = document.getElementById('mp_cfPanel');
      return { oldHead: box.querySelectorAll('.vu-head').length, vu: vuRows.length, vuNm: vuRows[0] ? t(vuRows[0].querySelector('.trk-nm')) : '', vuTag: vuRows[0] ? t(vuRows[0].querySelector('.trk-tag')) : '', vuBtn: vuRows[0] ? t(vuRows[0].querySelector('.trk-act')) : '', vuBtnId: vuRows[0] ? (vuRows[0].querySelector('.trk-act') || {}).id : '',
        vuH: vuRows[0] ? Math.round(rr(vuRows[0]).height) : 0, otherH: other ? Math.round(rr(other).height) : 0, old: old.length,
        head: hr ? { exp: hb.getAttribute('aria-expanded'), ctl: hb.getAttribute('aria-controls'), top: Math.round(rr(hb).top + scrollY), right: Math.round(rr(hb).right), w: Math.round(rr(hb).width), h: Math.round(rr(hb).height), rowTop: Math.round(rr(hr).top + scrollY) } : null,
        fold: fold ? { hidden: fold.hidden, shown: vis(fold) } : null,
        rows: rows.map((e) => ({ nm: [...e.querySelector('.trk-nm').childNodes].filter((n) => n.nodeType === 3 || n.offsetParent !== null).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim(), tag: t(e.querySelector('.trk-tag')), btn: t(e.querySelector('.trk-act')) })), hRows: rows.map((e) => Math.round(e.getBoundingClientRect().height)),
        hBlock: hr && rows.length ? Math.round(rows[rows.length - 1].getBoundingClientRect().bottom - hr.getBoundingClientRect().top) : 0,
        pv: !!pvB, mv: !!mvB, pvVis: vis(pvB), mvVis: vis(mvB), pvR: pvB && vis(pvB) ? rr(pvB).right : 0, mvR: mvB && vis(mvB) ? rr(mvB).right : 0, pvW: pvB && vis(pvB) ? rr(pvB).width : 0, mvW: mvB && vis(mvB) ? rr(mvB).width : 0,
        cf: cf ? { vu: cf.querySelectorAll('.vu-cf').length, p: cf.querySelectorAll('[data-cfpvc]').length, m: cf.querySelectorAll('[data-cfmvc]').length, txt: t(cf) } : null,
        sw: document.documentElement.scrollWidth, iw: innerWidth };
    }, nm(MP));
    const R0 = await MEAS();   // 처음(닫힘)
    let R = R0, R2 = null;
    if (R0.head) { await page.evaluate(() => document.getElementById('mp_vuOpen').click()); await page.waitForTimeout(250); R = await MEAS();   // 펼침
      await page.evaluate(() => document.getElementById('mp_vuOpen').click()); await page.waitForTimeout(250); R2 = await MEAS();   // 다시 닫힘
      await page.evaluate(() => document.getElementById('mp_vuOpen').click()); await page.waitForTimeout(150); }
    let FL = null;
    if (name === 'fresh') {   // ⑥ 안쪽 화면 — 식전 · 식중 첫 화면을 차례로 연다(닫을 땐 쪽을 다시 연다)
      FL = {};
      for (const [k, id] of [['pre', 'mp_pvcStart'], ['mid', 'mp_mvcStart']]) {
        if (k === 'mid') { await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window._curView === 'mypageView', null, { timeout: 25000 }).catch(() => {}); await page.waitForTimeout(900); }
        await page.evaluate((id) => { const f = document.getElementById('mp_vuFold'), h = document.getElementById('mp_vuOpen'); if (f && f.hidden && h) h.click(); const b = document.getElementById(id); if (b && b.offsetParent !== null) b.click(); }, id); await page.waitForTimeout(700);   /* [UMBRELLA_ROW_1116] 두 줄은 «상영 영상» 을 펼친 뒤에 보인다 */
        FL[k] = await page.evaluate(() => { const c = document.getElementById('mp_pvcInner'); if (!c) return null; const tx = c.innerText;
          const now = c.querySelectorAll('.pvc-now'); const due = (tx.match(/\d+월 \d+일\([일월화수목금토]\)/g) || []).length;
          const cond = [...c.querySelectorAll('.pvc-cond span')].map((e) => e.textContent.trim());
          const boxes = [...c.querySelectorAll('.pvc-card *')].filter((e) => { const cs = getComputedStyle(e); return cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0 && cs.borderLeftStyle !== 'none' && parseFloat(cs.borderLeftWidth) > 0 && cs.borderRightStyle !== 'none' && parseFloat(cs.borderRightWidth) > 0 && !/^(BUTTON|INPUT|A)$/.test(e.tagName) && !e.closest('button') && !e.closest('.wz-bar') && !e.closest('.inv-head') && e.getBoundingClientRect().height > 30; }).length;
          const bt = c.querySelector('.wz-bar .cc-btn'), btR = bt ? bt.getBoundingClientRect() : null;   // [VU_SUBS_BAR_1115] 첫 눈에 보조 길이 단추 뒤로 걸리지 않나
          const subs = [...c.querySelectorAll('.pvc-subs .pvc-lk')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), top: Math.round(r.top), bot: Math.round(r.bottom), h: Math.round(r.height) }; });
          const hi = c.querySelector('.pvc-hero img'), hc = c.querySelector('.pvc-hero figcaption');   // [VU_MID_HERO_1115] 결과 먼저 한 컷이 실제로 뜨나
          const hero = hi ? { ok: hi.complete && hi.naturalWidth >= 640, src: hi.getAttribute('src'), cap: hc ? hc.textContent.trim() : '' } : null;
          return { hero, subs, btTop: btR ? Math.round(btR.top) : -1, vh: innerHeight, now: now.length, nowTxt: now[0] ? now[0].innerText.replace(/\s+/g, ' ') : '', due, steps: c.querySelectorAll('.pvc-3 > li').length, cond, seal: c.querySelectorAll('.cc-btn.seal,.cc-btn-seal,[class*="seal"]').length, boxes, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
      }
    }
    const tag = `${W} ${name}`;
    if (R.hBlock) HB[W + name] = R.hBlock;   // [UMBRELLA_ROW_1116] 펼친 묶음(머리 줄 위 ~ 둘째 줄 아래)
    ok(`⑤ ${tag} 가로 넘침 0 · 쪽 오류 0`, R.sw <= R.iw && !errs.length, R.sw + '/' + R.iw + ' ' + errs.join(' | '));
    if (name === 'fresh') {
      ok(`③ ${tag} 둘 다 시작 전 — «${nm(MP)}» 한 줄 · 단추 «시작하기» · ✓ 없음 · 기한 꼬리표`, R0.vu === 1 && R0.vuBtnId === 'mp_vuOpen' && R0.vuBtn === '시작하기' && !/✓/.test(R0.vuNm) && /^\d+월 \d+일까지$/.test(R0.vuTag), JSON.stringify([R0.vuNm, R0.vuTag, R0.vuBtn]));   // [UMBRELLA_ROW_1116]
      for (const k of ['pre', 'mid']) { const f = FL && FL[k];
        ok(`⑥ ${tag} ${k} 첫 화면 — 맨 위 «지금 하실 일 · 확정 기한» 띠 하나 · 날짜 한 번`, f && f.now === 1 && /지금 하실 일 영상 링크 보내기/.test(f.nowTxt) && /확정 기한 \d+월 \d+일\([일월화수목금토]\) · D-5/.test(f.nowTxt) && f.due === 1, JSON.stringify(f));
        ok(`⑥ ${tag} ${k} 첫 화면 — 단계 셋 · 진사 단추 없음 · 흰 상자 없음 · 가로 넘침 0`, f && f.steps === 3 && f.seal === 0 && f.boxes === 0 && f.sw <= f.iw, JSON.stringify(f)); }
      for (const k of ['pre', 'mid']) { const f = FL && FL[k]; const want = k === 'pre' ? '나중에 준비하기|사용하지 않기' : '식순에서 빼기';
        ok(`⑥ ${tag} ${k} 첫 화면 — 보조 길(${want})이 첫 눈에 다 보이고 단추 뒤로 걸리지 않는다 [VU_SUBS_BAR_1115]`, f && f.subs.map((x) => x.t).join('|') === want && f.subs.every((x) => x.h >= 44 && x.top >= 0 && x.bot <= f.vh && x.bot <= f.btTop), JSON.stringify(f && { subs: f.subs, btTop: f.btTop, vh: f.vh })); }
      for (const [k, nm, f0] of [['pre', '식전', 'prevideo-640.webp']].concat(/mid:'\/assets\/video\/moments\/midvideo-640\.webp'/.test(fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8')) ? [['mid', '식중', 'midvideo-640.webp']] : [])) { const f = FL && FL[k];   // [VU_MID_HERO_1115] 식중 그림은 고친 판이 들어온 뒤에만 잰다(23:12 보류)
        ok(`⑥ ${tag} ${nm} 첫 화면 — 결과 먼저 한 컷(${f0})이 뜨고 캡션 «예식 날 ${nm} 영상이 상영되는 모습(그림)» [VU_MID_HERO_1115]`, f && f.hero && f.hero.ok && f.hero.src.endsWith(f0) && f.hero.cap === `예식 날 ${nm} 영상이 상영되는 모습(그림)`, JSON.stringify(f && f.hero)); }
      ok(`⑥ ${tag} 식중 첫 화면 — «선택 사항 · 제작비는 두 분 부담»([SPEECH_SONG_1115] «축사 대신 상영» 걷음)`, FL && FL.mid && FL.mid.cond.join('|') === '선택 사항|제작비는 두 분 부담' && FL.pre && FL.pre.cond.length === 0, JSON.stringify(FL && FL.mid && FL.mid.cond));
    } else if (name === 'none') {
      ok(`② ${tag} 식전만 고른 분 — «${nm(MP)}» 한 줄(단추 mp_pvcStart · 펼침 없음 · 옛 «식전 영상» 줄 · 머리 줄 없음) · 다른 줄과 같은 높이`, R.vu === 1 && R.vuBtnId === 'mp_pvcStart' && !R.fold && !R.head && R.old === 0 && R.oldHead === 0 && R.pvVis && !R.mv && R.vuH === R.otherH, JSON.stringify(R));
      ok(`② ${tag} 확인서 — «식전 영상 열기» 한 줄 그대로`, R.cf && R.cf.vu === 0 && R.cf.p === 1 && R.cf.m === 0 && /식전 영상 열기/.test(R.cf.txt), JSON.stringify(R.cf));
    } else if (name === 'midonly') {
      ok(`② ${tag} 식중만 고른 분 — «${nm(MP)}» 한 줄(단추 mp_mvcStart · 펼침 없음)`, R.vu === 1 && R.vuBtnId === 'mp_mvcStart' && !R.fold && R.old === 0 && R.mvVis && !R.pv && R.vuH === R.otherH, JSON.stringify(R));
    } else {
      ok(`③ ${tag} «${nm(MP)}» 한 줄(옛 머리 줄 · «식전 영상» 줄 없음) · 다른 줄과 같은 높이 · 단추 mp_vuOpen(aria-controls mp_vuFold)`, R0.vu === 1 && R0.oldHead === 0 && R0.old === 0 && R0.vuBtnId === 'mp_vuOpen' && R0.head && R0.head.ctl === 'mp_vuFold' && R0.vuH === R0.otherH && R0.head.h + 8 >= 44, JSON.stringify(R0));   // 단추 36px + 위아래 4px 손가락 자리(.trk-act::after) = 44 — 다른 줄 단추와 같은 규격
      ok(`③ ${tag} 처음엔 닫힘(두 줄 안 보임 · aria-expanded false) → 누르면 펼침(true) → 다시 누르면 닫힘`, R0.fold && R0.fold.hidden && !R0.pvVis && !R0.mvVis && R0.head.exp === 'false' && R.fold && !R.fold.hidden && R.fold.shown && R.head.exp === 'true' && R2 && R2.fold.hidden && R2.head.exp === 'false', JSON.stringify([R0.fold, R0.head && R0.head.exp, R.fold, R.head && R.head.exp, R2 && R2.fold]));
      ok(`③ ${tag} 펼쳐도 머리 줄 · 단추가 제자리(흔들림 0)`, R.head && Math.abs(R.head.top - R0.head.top) < 1 && Math.abs(R.head.right - R0.head.right) < 1 && R.head.w === R0.head.w && Math.abs(R.head.rowTop - R0.head.rowTop) < 1, JSON.stringify([R0.head, R.head]));
      ok(`③ ${tag} 펼친 두 줄 식전 · 식중 · «입장 전 · 축사 · 축가 뒤»는 시작 전에만 · 두 줄 높이 같음`, R.rows.length === 2 && /^식전 영상/.test(R.rows[0].nm) && /^식중 영상/.test(R.rows[1].nm) && R.rows.every((x, i) => (x.nm.indexOf(i ? '축사 · 축가 뒤' : '입장 전') > -1) === (!x.tag && !/✓/.test(x.nm) && x.btn === '시작하기')) && R.hRows[0] === R.hRows[1], JSON.stringify([R.rows, R.hRows]));
      ok(`③ ${tag} 두 줄 단추 id 그대로 · 오른쪽 끝 같은 자리 · 같은 폭 · 머리 단추와도 같은 오른쪽 끝`, R.pvVis && R.mvVis && Math.abs(R.pvR - R.mvR) < 1 && Math.abs(R.pvW - R.mvW) < 1 && Math.abs(R.pvR - R.head.right) < 1, R.pvR + '/' + R.mvR + '/' + R.head.right + ' ' + R.pvW + '/' + R.mvW);
      ok(`③ ${tag} 기한 꼬리표는 머리 줄에만(두 줄엔 없음)`, R.rows.every((x) => !/까지$|기한 지남/.test(x.tag)), JSON.stringify(R.rows));
      if (name === 'both') {
        ok(`③ ${tag} 머리 줄 꼬리표 = 두 영상 중 기한 꼬리표(«N월 N일까지») · 단추 «보기»(시작한 영상이 있다) · ✓ 없음`, /^\d+월 \d+일까지$/.test(R0.vuTag) && R0.vuBtn === '보기' && !/✓/.test(R0.vuNm), JSON.stringify([R0.vuNm, R0.vuTag, R0.vuBtn]));
        ok(`③ ${tag} 상태 꼬리표는 줄마다(식전 «확인 필요»)`, R.rows[0].tag === '확인 필요', JSON.stringify(R.rows));
        ok(`④ ${tag} 확인서 — 이름 줄 + 영상마다 상태 · 열기`, R.cf && R.cf.vu === 2 && R.cf.p === 1 && R.cf.m === 1 && R.cf.txt.indexOf(nm(MP) + '은 각 영상 화면에서 따로 확정해요.') > -1 && /식전 영상 · 확인해 주세요영상 확인/.test(R.cf.txt) && /식중 영상 · 준비 중이에요이어하기/.test(R.cf.txt), JSON.stringify(R.cf));
      } else if (name === 'done') {
        ok(`③ ${tag} 둘 다 확정 — 머리 ✓ · 기한 꼬리표 없음 · 단추 «보기»`, /✓/.test(R0.vuNm) && !R0.vuTag && R0.vuBtn === '보기', JSON.stringify([R0.vuNm, R0.vuTag, R0.vuBtn]));

      } else if (name === 'late') {
        ok(`③ ${tag} 식전 확정 · 식중 확인 중 — ✓ 없음(둘 다 완료일 때만)`, !/✓/.test(R0.vuNm), R0.vuNm);
      }
    }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); }
for (const W of [390, 1280]) { const hs = ['both', 'done', 'late'].map((n) => HB[W + n]); ok(`⑦ ${W} 펼친 묶음 높이가 상태마다 같다(흔들림 0)`, hs.every((h) => h && h === hs[0]), hs.join(' / ')); }
console.log(fail ? 'VIDEO UMBRELLA FAIL' : 'VIDEO UMBRELLA OK');
process.exit(fail);
