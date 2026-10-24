#!/usr/bin/env node
/* ★[DRESS_DETAIL_FIT 2026-10-23 코워크 검토 2 «시착 준비»] 고르기 화면 «자세히» 첫 화면에서 고르는 단추가 아래 막대에 가리지 않는지 «숫자로» 잰다.
 *
 *   왜 — 검토 1 에서 아래 막대(#pkBar)를 화면에 붙이자, 사진 아래에 있던 «입어 볼 드레스로 고르기»가 막대 뒤로 숨었다
 *        (390×844 단추 top 789 · 막대 top 707). 막대만 보면 누를 수 없는 «두 벌을 골라 주세요»뿐이라 어디서 고르는지 몰랐다.
 *        단추 자리는 사진 크기 · 글 길이 · 막대 높이가 함께 정한다 — 눈대중이 아니라 세 화면 크기에서 잰다.
 *
 *   잰다 — 390×844 · 390×740 · 1280×900 에서 «자세히» 첫 화면(스크롤 0)의 네 상태
 *     ① 아직 안 고름 «입어 볼 드레스로 고르기»(칠한 단추) ② 고름 «Nº 01 고른 드레스예요 · 빼기»
 *     ③ 한 벌 고른 뒤 다른 드레스 «Nº 02로 고르기»(외곽 단추 · [DRESS_PICK_TIER] 코워크 검토 4) ④ 두 칸이 다 참 «… 다 찼어요» 줄
 *     기준: 그 아래 끝 ≤ 막대 위 끝. 덤으로 가로 넘침 0 · 페이지 오류 0 · 진한 단추가 한 화면에 둘이 아니다.
 *     ★[DRESS_SLIDES 코워크 검토 4] 넘겨 보는 사진은 사진이 있는 장만 — 표본(사진 없음)은 한 장이라 ‹ › · n / 5 가 없어야 하고,
 *       사진을 넣은 사본(이 검사가 시험 사진을 꽂는다)에서는 ‹ › 가 사진 칸 안에 있어야 한다(사진 아래 줄로 돌아가면 단추가 다시 내려간다).
 *     ★[DRESS_SOLO_NOSAVE] 그다음 막대 단추로 완료 화면에 가서, 단독(저장 없음)이면 머리 «저장» · «남기기»가 안 보이고 «저장됨 · 남겼어요»라 말하지 않는지 본다.
 *     ★[DRESS_LIST_FIRST 명세 2] 열면 드레스 목록부터 — 맨 위 띠(«답하기 ›» · 누르는 칸 44px) · 진행 표시 없음 · 띠 아래 점 줄 둘을 보고,
 *       «답하기 ›» → 물음 셋(진행 표시 셋 · 점 줄 없음) → 목록(띠 «발목까지 · 몸 선을 따라 · 노출이 적은 드레스 · 답 바꾸기 ›»)을 따라간다.
 *     ★[코워크 디자인 라운드 1] 띠 글 «원하시는 길이와 핏을 고르시면 그 드레스부터 보여 드려요»([DRESS_BAND_WORDS]) · 점 줄 둘([DRESS_BAND_DOTS]) · 보이는 소제목 없음 ·
 *       답한 뒤에도 한 그리드(맞는 칸 앞 · «답과 맞아요» [DRESS_ONE_GRID]) · 물음에 «아직 몰라요» 없음([DRESS_Q_TRIM]) · 단독 완료 화면 단추는 글을 써도 «마이페이지로 돌아가기»([DRESS_MEMO_ONEBTN])
 *     ★[DRESS_PUBLIC_OFF 명세 2] /dress.html(?pick=1 없이)은 마이페이지로 넘어간다(한 크기에서).
 *     ★[DRESS_BACK_STEP 코워크 디자인 라운드 2 · 1] 휴대폰 뒤로가기(history.back) = 겹화면 안에서 한 걸음 — 390×844 마이페이지 겹화면에서
 *       자세히 → 목록(읽던 자리 · 그 칸 초점) · 물음 3 → 2 → 1 → 목록 · 목록(바뀐 것 없음) → 닫힘(마이페이지에 남는다) · 고른 뒤 목록 → «저장하지 않은 변경이 있어요» 판.
 *       ★[DRESS_NEXT_PREV] 덤으로 자세히 맨 아래 «‹ 이전 드레스 · 다음 드레스 ›»(첫 드레스는 다음만 · 누르면 다음 드레스 · 44px).
 *     ★[코워크 디자인 라운드 3] 두 벌 찬 뒤 다른 드레스 «두 벌을 다 골랐어요.» + «Nº 01과 바꾸기 · Nº 02와 바꾸기»(한 줄 · 44px) → «Nº 02와 바꾸기» = 막대 Nº 02 만 바뀐다([DRESS_FULL_SWAP]) ·
 *       막대 작은 사진 = 그 드레스 자세히(고른 수 그대로 · [DRESS_SLOT_SEE]) · 답을 바꾼 뒤에도 고른 두 벌 그대로 · 띠 아래 점 줄 하나([DRESS_NO_PICK_CARD]).
 *     375×667(작은 폰)은 «참고»로만 찍는다 — 코워크 기준 밖이라 빨강으로 세지 않는다.
 *     ★[DRESS_BAR_FIT 코워크 디자인 라운드 1 · 2 «390 · 1280 목록 · 자세히에서 막대에 반쯤 걸린 글 0»] 첫 화면(스크롤 0)의 글줄이 막대 위 끝을 가르지 않는다 —
 *       여섯 크기(360×780 · 375×812 · 390×844 · 390×740 · 414×896 · 1280×900) × (목록 + 표본 여섯 자세히)를 마이페이지 겹화면(고객이 실제 보는 길 · 목록에서 칸을 눌러 들어간다)에서,
 *       390×844 · 1280×900 은 단독(?pick=1 · &open= 으로 바로 연 자세히)에서도 잰다. 크기마다 줄 자리가 달라 한두 크기만 보면 놓친다(10/23 실측: 390×844 목록 · 375 · 360 · 414 폭 자세히).
 *
 *   종료: 0 통과 · 1 가린다 · 2 재지 못했다(브라우저 없음 — 화면 결함이 아니다)
 *   어디서 도나 — PR 의 merge-guard(브라우저 없음)에서는 2 로 빠지고, nightly-screen(run-all.mjs 가 스스로 찾는다)과 로컬에서 실제로 잰다.
 *   사람이 잴 때: node scripts/audit/dress-fit.mjs   (숫자만 보려면 --print)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SIZES = [[390, 844, true], [390, 740, true], [1280, 900, true], [375, 667, false]];
const BAR_SIZES = [[360, 780], [375, 812], [390, 844], [390, 740], [414, 896], [1280, 900]];   // [DRESS_BAR_FIT] 막대 선에 걸린 글줄 0 — 겹화면은 여섯 다 · 단독은 390×844 · 1280×900

/* 시험 사진 — PHOTOS 가 켜진 동안만 원천에 넘겨 보는 사진 세 장을 꽂는다(파일은 홈 Styling 사진을 빌린다 · 저장소에 아무것도 더하지 않는다) */
let PHOTOS = false;
const PATCH = "\n;(function(R){ if(!R) return; R.dresses.slice(0, 3).forEach(function(d){ d.ex = [{ t: '앞', img: '__fit/p' }, { t: '뒤', img: '__fit/p' }, { t: '디테일', img: '__fit/p' }]; }); })(window.DRESS_REFS);\n";
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/assets/dress-refs/__fit/p.webp' || u === '/assets/dress-refs/__fit/p.jpg') u = '/assets/home/styling' + path.extname(u);
  const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  r.setHeader('cache-control', 'no-store');
  if (PHOTOS && u === '/assets/dress-refs.js') return r.end(fs.readFileSync(f, 'utf8') + PATCH);
  r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const eng = await launchBrowser();
if (!eng) {
  console.log('━━ dress-fit — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다');
  srv.close();
  process.exit(2);
}

let bad = 0;
const rows = [];
const no = (m) => { bad++; console.log('   ✗ ' + m); };
try {
  /* ★★[DRESS_GUIDE_ONLY · POPUP_FIXED_1024 2026-10-24 사장님 «골라 둘 필요가 없어 · 오기 전 가이드» · «창이 막 움직이면 정신없으니깐 · 하단 기준으로»]
     마이페이지 겹화면(고객이 실제 보는 길)을 390×844 · 1280×900 에서 물음 1 → 답 → 물음 2 → 물음 3 → 결과 → 다른 드레스 → 자세히 → 다음 드레스까지 눌러
     창 위 끝 · 높이가 걸음마다 같은지 · 물음 단계 막대 위 끝이 같은지 · 결과 · 자세히에 막대 · 고르기 · Nº 가 없는지 · 맨 아래 안내 한 줄 · 단계 숫자 · 벌 수 · 닫을 때 판 없음을 잰다 */
  const DR = { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: { picks: ['S01', 'S02'], names: [], ans: { len: 'ankle', fit: 'body', pref: ['low'] }, memo: '옛 저장본' } };   // 옛 저장본이 와도 읽지 않는다
  const expand = async (fr) => { await fr.evaluate(() => { const b = document.querySelector('.pk-main [data-act="more"]'); if (b) b.click(); }); };
  for (const [W, H] of [[390, 844], [1280, 900]]) {
    const tag = `${W}×${H}`;
    const pg = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    const P = pg.page;
    await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    await P.evaluate((dr) => openDressPicker(dr, {}), DR);
    const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame();
    await fr.waitForSelector('.pk-q', { timeout: 15000 }); await P.waitForTimeout(300);
    const steps = [];
    const geo = async (nm) => { await P.waitForTimeout(200);
      const g = await P.evaluate(() => { const c = document.querySelector('.dr-pop-card').getBoundingClientRect(), f = document.getElementById('mp_drFrame').getBoundingClientRect(); return { t: Math.round(c.top), h: Math.round(c.height), ft: f.top }; });
      const b = await fr.evaluate(() => { const bar = document.querySelector('#pkBar .wz-bar'), r = bar ? bar.getBoundingClientRect() : null;
        return { bar: r ? { t: r.top, h: Math.round(r.height) } : null, pick: !!document.querySelector('[data-act="pick"],[data-act="unpick"],[data-act="save"],.pk-slots,.pk-swap,.dr-badge,.pk-picked'),
          guide: [...document.querySelectorAll('.pk-end-dots .dotln')].map((e) => e.textContent).join('|'), sub: [...document.querySelectorAll('.pk-sub-h')].map((e) => e.textContent).join('|'),
          steps: [...document.querySelectorAll('.wz-steps li')].map((e) => e.textContent.trim()), intro: (document.querySelector('.pk-intro') || {}).textContent || '', q: (document.getElementById('pkQ') || {}).textContent || '' }; });
      steps.push({ nm, t: g.t, h: g.h, bt: b.bar ? Math.round(g.ft + b.bar.t) : null, bh: b.bar ? b.bar.h : null, ...b });
    };
    await geo('물음1');
    { const g = await fr.evaluate(() => { const o = [...document.querySelectorAll('.pk-opt')].map((e) => ({ h: Math.round(e.getBoundingClientRect().height), fs: getComputedStyle(e).fontSize })); const qq = getComputedStyle(document.querySelector('.pk-q')).fontSize; return { o, qq, w: innerWidth }; });   // ★[DRESS_FORM_1024] 폼 크기
      const pc = g.w >= 560, hs = g.o.map((x) => x.h);
      if (g.qq !== (pc ? '24px' : '22px')) no(`${tag} 물음 제목 ${g.qq} — ${pc ? 24 : 22}px 이 아니다 [DRESS_FORM_1024]`);
      if (g.o.some((x) => x.fs !== '16px')) no(`${tag} 보기 글 ${g.o.map((x) => x.fs).join(' ')} — 16px 이 아니다 [DRESS_FORM_1024]`);
      if (pc ? hs.some((h) => h < 128 || h > 136) : hs.some((h) => h !== 76)) no(`${tag} 그림 있는 보기 칸 높이 ${hs.join(' ')} — ${pc ? '128~136' : '76'} 이 아니다 [DRESS_FORM_1024]`);
      rows.push(`${tag} 물음1 보기 칸 ${hs.join('/')} · 제목 ${g.qq}`); }
    await fr.click('.pk-opt[data-a="ankle"]'); await geo('물음1 답');
    await fr.click('.wz-bar [data-go="1"]'); await geo('물음2');
    await fr.click('.pk-opt[data-a="body"]'); await fr.click('.wz-bar [data-go="1"]'); await geo('물음3');
    await fr.click('.pk-opt[data-a="low"]'); await fr.click('.wz-bar [data-go="1"]'); await geo('결과');
    await expand(fr); await P.waitForTimeout(500); await geo('다른 드레스');
    await fr.evaluate(() => document.querySelector('.pk-main [data-open]').click()); await geo('자세히');
    await fr.evaluate(() => { const n = document.querySelector('.pk-nb-n'); if (n) n.click(); }); await geo('다음 드레스');
    rows.push(`${tag} ` + steps.map((x) => `${x.nm} 창 ${x.t}/${x.h} 막대 ${x.bt ?? '-'}`).join(' · '));
    const q = steps.filter((x) => x.bt !== null), all = steps;
    if (new Set(all.map((x) => x.t + '/' + x.h)).size !== 1) no(`${tag} 창 위 끝 · 높이가 걸음마다 다르다 ${all.map((x) => x.t + '/' + x.h).join(' ')} [POPUP_FIXED_1024]`);
    if (q.length !== 4 || new Set(q.map((x) => x.bt + '/' + x.bh)).size !== 1) no(`${tag} 물음 단계 막대 위 끝 · 높이가 같지 않다(또는 물음 밖에 막대) ${steps.map((x) => x.nm + ':' + (x.bt ?? '-')).join(' ')} [POPUP_FIXED_1024]`);
    if (steps.some((x) => x.pick)) no(`${tag} 고르기 · 저장 · Nº 가 보인다 [DRESS_GUIDE_ONLY]`);
    { const BH = W < 560 ? 72 : 80; if (q.some((x) => Math.abs(x.bh - BH) > 0.5)) no(`${tag} 막대 높이 ${q.map((x) => x.bh).join(' ')} — ${BH} 이 아니다 [DRESS_FORM_1024]`); }
    const GL = '마음에 드는 드레스를 떠올려 오시면 상담 날 바로 비교해 볼 수 있어요. 시착은 현장에서 정해요.|상담 날 이 화면을 보여 주셔도 좋아요.';
    if (!steps.filter((x) => /결과|자세히/.test(x.nm)).every((x) => x.guide === GL)) no(`${tag} 결과 · 자세히 맨 아래 안내 한 줄이 아니다 [DRESS_GUIDE_ONLY]`);
    if (steps[0].steps.join(' ') !== '1/3 · 길이 2/3 · 라인 3/3 · 노출·소매') no(`${tag} 단계 숫자 «1/3 · 길이» 꼴이 아니다 ${steps[0].steps.join(' ')} [DRESS_STEP_NUM]`);
    if (steps[0].intro !== '상담 전, 마음에 드는 스타일을 살펴보세요.') no(`${tag} 첫 물음 목적 한 줄이 아니다 [DRESS_INTRO_LINE]`);
    if (steps[2].q !== '어떤 라인이 마음에 드세요?') no(`${tag} 물음 2 가 «어떤 라인이 마음에 드세요?»가 아니다 [DRESS_Q2_LINE]`);
    if (!/^답에 어울리는 드레스 · \d+벌/.test(steps[4].sub)) no(`${tag} 결과 소제목에 벌 수가 없다 ${steps[4].sub} [DRESS_FIT_COUNT]`);
    const hy = await fr.evaluate(() => { window.scrollTo(0, 0); return 0; });
    await P.evaluate(() => { const x = document.getElementById('mp_drFrame').contentDocument.getElementById('pkExit'); if (x) x.click(); }); await P.waitForTimeout(600);
    const dlg = await P.evaluate(() => { const m = document.getElementById('mpModal'); return m && m.classList.contains('open'); });
    if (dlg || await P.$('#mp_drFrame')) no(`${tag} ✕ 로 닫을 때 확인 판이 뜨거나 안 닫힌다 [DRESS_GUIDE_ONLY]`);
    if (pg.errors.length) no(`${tag} 페이지 오류 ${pg.errors[0]}`);
    await P.close(); void hy;
  }

  /* ★★[DRESS_STICKER 2026-10-24 코워크 설계 명세] 상담 카드 스티커 — 7폭(360 · 390 · 430 · 768 · 820 · 1024 · 1280) × (확정 0벌 · 확정 2벌 · 일정 선택 전)
     «방문 전 안내»(일정 선택 전은 «진행 흐름») 제목 · «상담 장소» 줄을 비롯해 카드 안 글과 겹침 0 · 누름 칸 44px 이상 · 가로 넘침 0 ·
     그린 뒤 자리 흔들림 0(글꼴 · 그림이 늦게 와도) · 크기 56 · 64 · 76 · 88 · 폰(768 미만)은 폰 자리(구분선 1/4 걸침) · 알약은 2벌에만(폰은 스티커 칸 안) ·
     따로 카드(#mp_dress)는 비어 있다. 실제 마이페이지 칸(#mp_consult)에 renderConsult 로 그려 잰다(로그인 없이 · 같은 폭) */
  {
    const ST_W = [360, 375, 390, 430, 767, 768, 820, 1024, 1280];   // [STICKER_TIP] 코워크 7폭 + 375 · 767(폰 끝) — 되돌아가면 빨강
    const LIST = ['신청접수', '상담확정', '시착', '상담완료'];
    const mkSt = (kind) => { const pre = kind === 'pre';
      return { product: '시그니처', code: 'ME-T', stage: pre ? '신청접수' : '상담확정', stageList: LIST, isException: false,
        consult: pre ? { status: '신청접수', scheduleUrl: 'x', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null } }
          : { status: '승인완료', date: '2026년 11월 3일 (화)', time: '14:00', canChange: true, canCancel: true, deposit: { amount: 100000, confirmed: true },
              dress: { attire: '대여 희망 · 2벌', open: true, ymd: '2026-11-03', saved: kind === 'two' ? { picks: ['S01', 'S02'], names: [], ans: { len: 'ankle', fit: 'body', pref: ['low'] }, memo: '' } : null } } }; };
    const stRows = [];
    for (const kind of ['zero', 'two', 'pre']) for (const W of ST_W) {
      const tag = `스티커 ${kind} ${W}`;
      const ps = await eng.newPage({ port: PORT, viewport: { width: W, height: 900 } });
      await ps.page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
      const at = (m) => ps.page.evaluate(() => { const st = document.querySelector('#mp_consult .dst'); if (!st) return null;
        const card = st.closest('.consult-card'), vg = st.parentNode, C0 = card.getBoundingClientRect(), sb = st.getBoundingClientRect(), box = st.querySelector('.dst-box').getBoundingClientRect();
        const hits = []; const rg = document.createRange(); const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        const shape = (typeof _dstVis === 'function') ? _dstVis(st).rest : [sb];   // ★[STICKER_HIT_SHAPE] 드레스 윤곽(쉼 −3°) · 글 — 그림 칸의 투명한 모서리는 보지 않는다(누름도 받지 않는다)
        for (let t = w.nextNode(); t; t = w.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; rg.selectNodeContents(t);
          for (const r of rg.getClientRects()) if (r.width >= 1 && shape.some((b) => r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom)) hits.push(t.nodeValue.trim().slice(0, 12)); }
        const boxHit = (() => { const b = st.querySelector('.dst-box').getBoundingClientRect(), o = []; const w3 = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); for (let t = w3.nextNode(); t; t = w3.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; const r3 = document.createRange(); r3.selectNodeContents(t); for (const q of r3.getClientRects()) if (q.width >= 1 && q.right > b.left && q.left < b.right && q.bottom > b.top && q.top < b.bottom) o.push(t.nodeValue.trim().slice(0, 10)); } return o; })();   // [STICKER_BOX_CLEAR] 그림 상자(투명 부분 포함) ↔ 글 사각형
        const tapTop = (() => { const b = st.querySelector('.dst-box').getBoundingClientRect(), e = document.elementFromPoint(b.left + 2, b.top + b.height - 2); return e ? (st.contains(e) ? 'dst' : (e.className || e.tagName)) : ''; })();   // 그림 칸 왼쪽 아래 모서리(투명) = 단추가 아니다
        const txt = () => { const o = []; const w2 = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); for (let t = w2.nextNode(); t; t = w2.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; const r2 = document.createRange(); r2.selectNodeContents(t); for (const q of r2.getClientRects()) o.push([q.left, q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10).join(',')); } return o.join('|') + '#' + card.getBoundingClientRect().height; };
        const withSt = txt(); st.style.display = 'none'; const noSt = txt(); st.style.display = '';   // ★[STICKER_NO_REFLOW] 스티커가 있을 때와 없을 때 카드 글 상자가 같아야 한다
        const pill = st.querySelector('.dst-pill'), pr = pill && pill.getBoundingClientRect(), lb = st.querySelector('.dst-tip').getBoundingClientRect();
        const lbR = st.querySelector('.dst-tip').getBoundingClientRect();   // [STICKER_TIP] 안내(보이지 않을 때도 자리는 잡혀 있다)
        const v = (typeof _dstVis === 'function') ? _dstVis(st) : null, cr = card.getBoundingClientRect();   // ★[STICKER_VIS_EDGE] 기운 드레스 · 그림자 · 알약 · 진행 점
        const dots = [...document.querySelectorAll('span,i,div,li')].filter((e) => { const r = e.getBoundingClientRect(); return !e.children.length && r.width > 3 && r.width < 16 && r.height > 3 && r.height < 16 && r.bottom <= cr.top && v && r.right > v.left && r.left < v.right; }).map((e) => e.getBoundingClientRect().bottom);
        const vis = v ? { l: v.left, r: v.right, t: v.top, dress: v.dress, lbL: lbR.left, lbR: lbR.right, gap: st.getAttribute('data-gap'), dotB: dots.length ? Math.max(...dots) : -1e9 } : null;
        return { reflow: withSt !== noSt, pm: st.classList.contains('dst-pm'), cardW: Math.round(C0.width), mode: st.getAttribute('data-at') || '?', inView: lbR.left >= 4 && lbR.right <= innerWidth - 4, tapTop, boxHit, lbTxt: st.querySelector('.dst-tip').textContent, aria: st.getAttribute('aria-label'), oldLb: !!st.querySelector('.dst-lb'), inCard: st.parentNode === card, pos: [sb.left - C0.left, sb.top - C0.top, sb.width, sb.height].map(Math.round).join(','), cardH: Math.round(C0.height),
          w: sb.width, h: sb.height, box: Math.round(box.width), hits, ow: document.documentElement.scrollWidth - innerWidth, lbH: lb.height,
          overDiv: Math.round(vg.getBoundingClientRect().top - box.top), pill: pill ? pill.textContent : '', pillIn: pill ? (Math.abs(pr.right - box.right) <= 0.5 && pr.top >= box.top - 6.5 && pr.top <= box.top + 2.5 && pr.height <= 18.5 && pr.width >= 23.5) : true,
          dressCard: (document.getElementById('mp_dress') || {}).innerHTML || '', vis }; });
      await ps.page.evaluate((d) => { const v = document.getElementById('mp_consult'); for (let e = v; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).display === 'none') e.style.display = 'block';
        renderConsult(d.consult, d.product, d); renderDress(d); }, mkSt(kind));
      const m0 = await at(); await ps.page.waitForTimeout(900); const m = await at();
      if (!m) { no(`${tag} 스티커가 없다 [DRESS_STICKER]`); await ps.page.close(); continue; }
      const want = W < 768 ? -1 : 112;   // [STICKER_PHONE_HEAD] 폰은 계산 · [STICKER_PHONE_BIG] 72 ~ 112   // [STICKER_DECO_1024] 폭마다 고정 · 768+ 112(확정 전 카드는 «일정 선택» 단추 때문에 96)
      const bad = [];
      if (m.hits.length) bad.push(`글과 겹침 ${m.hits.join('|')}`);
      if (m.w < 44 || m.h < 44) bad.push(`누름 칸 ${m.w}×${m.h}`);
      if (m.ow > 0) bad.push(`가로 넘침 ${m.ow}`);
      if (m0.pos !== m.pos || m0.cardH !== m.cardH) bad.push(`자리 흔들림 ${m0.pos}→${m.pos} · 카드 ${m0.cardH}→${m.cardH}`);
      if (W < 768 ? (m.box < 72 || m.box > 112) : (m.box !== want && m.box !== 96)) bad.push(`크기 ${m.box}(이 폭은 ${want})`);
      if (m.reflow) bad.push('스티커 때문에 카드 글 자리 · 폭 · 줄바꿈이 바뀌었다 [STICKER_NO_REFLOW]');
      if ((W < 768) !== m.pm) bad.push(`폰 표시(dst-pm)가 폭과 다르다 (${m.pm ? '폰' : '넓은 화면'})`);
      if (m.boxHit && m.boxHit.length) { if (m.cardW >= 300 && W < 768 && m.mode !== 'head') bad.push(`그림 상자(투명 부분 포함)가 글 사각형에 걸침 — ${m.boxHit.join('|')} [STICKER_BOX_CLEAR]`); else rows.push(`스티커 ${kind} ${W} 그림 상자가 글 사각형에 걸침(좁은 검사 카드 ${m.cardW}px · 윤곽 기준) — ${m.boxHit.join('|')} [STICKER_BOX_CLEAR]`); }
      if (m.tapTop === 'dst') bad.push('그림 칸의 투명한 모서리가 누름을 받는다 [STICKER_HIT_SHAPE]');
      if (m.lbH > 34) bad.push(`안내가 한 줄이 아니다(${m.lbH}px)`);
      if (!m.inCard) bad.push('스티커가 상담 카드 머리에 있지 않다 [DRESS_STICKER_HEAD]');
      if (m.mode === 'none' || m.mode === '?') bad.push(`맞는 자리를 못 찾았다(${m.mode})`);
      if (m.cardW >= 500 && W >= 768 && m.mode !== 'in') bad.push(`768+ 넓은 카드는 카드 안이어야 한다(${m.mode} · 카드 ${m.cardW}px)`);
      if (W < 768 && m.mode !== 'head' && m.mode !== 'edge') bad.push(`폰은 머리 오른쪽 빈자리(head) · 없으면 모서리(edge)여야 한다(${m.mode})`);
      if (W < 768 && m.mode === 'edge') rows.push(`스티커 ${kind} ${W} 머리 오른쪽 빈자리에 안 들어가 모서리 자리 [STICKER_PHONE_HEAD] · 코워크 확인`);
      if (m.lbTxt !== '드레스 보기' || m.aria !== '드레스 보기') bad.push(`안내 · 단추 이름이 «드레스 보기»가 아니다(${m.lbTxt} · ${m.aria}) [STICKER_TIP]`);
      if (m.oldLb) bad.push('상시 글(.dst-lb)이 되살아났다 [STICKER_NO_LABEL]');
      if (m.vis && m.vis.gap !== '8' && !(m.mode === 'head' && m.vis.gap === '6')) rows.push(`스티커 ${kind} ${W} 간격 ${m.vis.gap} — 글자 8px · 진행 점 4px 로는 자리가 없어 한 단 줄였다 [STICKER_GAP_LADDER] · 코워크 확인`);
      if (!m.inView) bad.push('스티커 · 글이 화면 밖');
      if (m.pill) bad.push(`«n벌» 배지가 되살아났다 «${m.pill}» [DRESS_GUIDE_ONLY]`);
      if (!m.pillIn) bad.push('«n벌»이 고리 오른쪽 옆(칸 위 −6 ~ +2 · 오른쪽 끝 맞춤 · 24×18)이 아니다');   // [DRESS_STICKER_HEAD] 자리는 겹침으로 — 안쪽 모서리(in) · 모서리 걸침(edge) · 글은 그대로
      { const v = m.vis, M = W < 768 ? (m.mode === 'head' ? 6 : 16) : W < 1024 ? 24 : 32;   // [STICKER_PHONE_BIG] 폰 머리 자리는 화면 끝 6px(그림 상자 투명 부분은 글에 걸쳐도 된다 · 누름은 윤곽만)   // ★[STICKER_VIS_EDGE] 기운 드레스(흔들림 포함) · 그림자 · 글이 화면 끝 16 · 24 · 32px 안 · 보이는 드레스 56 이상 · 진행 점과 겹침 0
        if (!v) bad.push('보이는 드레스를 잴 수 없다(_dstVis 없음)');
        else { if (v.r > W - M + 0.5 || v.l < M) bad.push(`기운 드레스 · 그림자가 화면 끝 ${M}px 밖(${Math.round(v.l)}~${Math.round(v.r)} / ${W})`);
          if (v.lbR > W - M + .5 || v.lbL < M - .5) bad.push(`안내가 화면 끝 ${M}px 밖(${Math.round(v.lbL)}~${Math.round(v.lbR)}) [STICKER_TIP]`);
          if (v.dress < 56 - 0.01) bad.push(`보이는 드레스 ${v.dress.toFixed(1)}px(56 아래)`);
          if (v.t < v.dotB) bad.push(`진행 점과 겹친다(드레스 위 ${Math.round(v.t)} · 점 아래 ${Math.round(v.dotB)})`); } }
      if (W < 768 && m.mode === 'head') { const g = await ps.page.evaluate(() => { const st = document.querySelector('#mp_consult .dst'), card = st.closest('.consult-card'), v = _dstVis(st), out = { rest: 1e9, env: 1e9 };   // ★[STICKER_PHONE_BIG] 획(잉크) ↔ 윤곽 멈춤 6 · 흔들림 3
          const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); for (let t = w.nextNode(); t; t = w.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; const ink = _dstInk(t.nodeValue, t.parentElement); const r = document.createRange(); r.selectNodeContents(t);
            for (const q0 of r.getClientRects()) { const q = ink ? { left: q0.left, right: q0.right, top: q0.top + ink[0], bottom: q0.top + ink[1] } : q0; const d = (a) => { const dx = Math.max(q.left - a.right, a.left - q.right), dy = Math.max(q.top - a.bottom, a.top - q.bottom); return (dx < 0 && dy < 0) ? -1 : Math.hypot(Math.max(dx, 0), Math.max(dy, 0)); };
              for (const a of v.rest) out.rest = Math.min(out.rest, d(a)); for (const a of v.env) out.env = Math.min(out.env, d(a)); } } return out; });
        if (g.rest < 6 - 0.05 || g.env < 3 - 0.05) bad.push(`글자 획과 간격 멈춤 ${g.rest.toFixed(1)} · 흔들림 ${g.env.toFixed(1)}(6 · 3 아래) [STICKER_PHONE_BIG]`);
        const floor = { 360: 80, 375: 88, 390: 94, 430: 108, 767: 112 }[W];   // [STICKER_PHONE_BIG] 확정 카드 기준 크기 — 줄면 빨강(일정 선택 전은 단추 때문에 작다)
        if (floor && kind !== 'pre' && m.box < floor) bad.push(`폰 크기 ${m.box} — 이 폭 기준 ${floor} 아래 [STICKER_PHONE_BIG]`); }
      if (m.dressCard) bad.push('따로 카드가 다시 그려졌다');
      if (ps.errors.length) bad.push(`페이지 오류 ${ps.errors[0]}`);
      stRows.push(`${W}/${kind}=${m.mode}`);
      if (bad.length) no(`${tag} — ${bad.join(' · ')} [DRESS_STICKER]`);
      await ps.page.close();
    }
    rows.push(`스티커 자리 ${stRows.join(' ')}`);
  }
  // ★[DRESS_BACK_STEP 코워크 디자인 라운드 2 · 1] 휴대폰 뒤로가기 = 겹화면 안에서 한 걸음(390×844 · 마이페이지 겹화면)
  {
    const pb = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
    const P = pb.page;
    await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    const open = async (demo, dr) => { await P.evaluate(([dr, demo]) => openDressPicker(dr, demo ? { demo: true } : {}), [dr || DR, demo]); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('.pk-mine, .pk-q', { timeout: 15000 }); await P.waitForTimeout(250); return fr; };
    const look = (fr) => fr.evaluate(() => ({ list: !!document.querySelector('.pk-main .pk-mine'), detail: (document.querySelector('.dv-nm') || {}).textContent || '', q: (document.getElementById('pkQ') || {}).textContent || '', y: Math.round(window.pageYOffset), focus: document.activeElement ? (document.activeElement.getAttribute('data-open') || '') : '' })).catch(() => ({ gone: true }));   // 겹화면이 닫혔으면(옛 동작 · 뒤로가기 = 통째 닫기) gone
    const back = async (ms = 500) => { await P.evaluate(() => history.back()); await P.waitForTimeout(ms); };
    const rows2 = [];
    const QS = await P.evaluate(() => window.DRESS_REFS.questions.map((q) => q.q));
    try {
    let fr = await open(false);
    /* [DRESS_Q_FIRST] 열면 물음 1 — 셋을 답해 결과로 · 펼쳐서 읽던 자리를 만든다 */
    const q0 = await look(fr);
    if (q0.q !== QS[0]) { no(`뒤로가기 — 처음 연 겹화면이 물음 1 이 아니다 ${JSON.stringify(q0)} [DRESS_Q_FIRST]`); throw new Error('stop'); }
    await fr.click('.pk-opt[data-a="ankle"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="body"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="low"]'); await fr.click('.wz-bar [data-go="1"]'); await P.waitForTimeout(150);
    await expand(fr); await P.waitForTimeout(80);
    await fr.evaluate(() => window.scrollTo(0, 300)); await P.waitForTimeout(120);
    const y0 = await fr.evaluate(() => Math.round(window.pageYOffset));
    const id3 = await fr.evaluate(() => { const c = document.querySelectorAll('.pk-main [data-open]')[2]; c.click(); return c.getAttribute('data-open'); }); await P.waitForTimeout(250);
    const a = await look(fr); await back(); const b2 = await look(fr);
    rows2.push(`자세히 «${a.detail}» → 뒤로 = ${b2.list ? '목록' : '?'} · 자리 ${y0} → ${b2.y} · 초점 ${b2.focus}`);
    if (!a.detail || !b2.list || b2.y !== y0 || b2.focus !== id3) { no(`뒤로가기 — 자세히 → 목록(읽던 자리 ${y0} · 그 칸 초점)이 아니다 ${b2.gone ? '— 겹화면이 통째로 닫혔다' : JSON.stringify(b2)} [DRESS_BACK_STEP]`); throw new Error('stop'); }
    /* ★[DRESS_Q_FIRST] 결과 → 물음 3 → 2 → 1 → 닫기 판단 */
    await back(); const q3 = await look(fr); await back(); const q2 = await look(fr); await back(); const q1 = await look(fr);
    rows2.push(`결과 → 뒤로 = 물음 «${q3.q}» → «${q2.q}» → «${q1.q}»`);
    if (q3.q !== QS[2] || q2.q !== QS[1] || q1.q !== QS[0]) { no(`뒤로가기 — 결과 → 물음 3 → 2 → 1 이 아니다 ${JSON.stringify([q3.q || q3, q2.q || q2, q1.q || q1])} [DRESS_BACK_STEP · DRESS_Q_FIRST]`); throw new Error('stop'); }
    await back(900);
    const gone = !(await P.$('#mp_drFrame')), path1 = await P.evaluate(() => location.pathname);
    rows2.push(`물음 1(바뀐 것 없음) → 뒤로 = 겹화면 ${gone ? '닫힘' : '그대로'} · ${path1}`);
    if (!gone || !/\/mypage\.html$/.test(path1)) no(`뒤로가기 — 물음 1 에서(바뀐 것 없음) 겹화면이 닫히지 않았거나 마이페이지를 떠났다 [DRESS_BACK_STEP]`);
    fr = await open(false);   // [DRESS_GUIDE_ONLY] 다시 열어 물음 셋 → 결과 → 첫 드레스 자세히 → 이웃 넘기기
    await fr.click('.pk-opt[data-a="ankle"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="body"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="none"]'); await fr.click('.wz-bar [data-go="1"]'); await P.waitForTimeout(150);
    const [f1, want2] = await fr.evaluate(() => { const c = [...document.querySelectorAll('.pk-main [data-open]')]; const nm = (el) => el.closest('.dr-cell').querySelector('.dr-nm').textContent; return [c[0].getAttribute('data-open'), c[1] ? nm(c[1]) : '']; });   // 화면 순서 그대로
    await fr.click(`.pk-main [data-open="${f1}"]`); await P.waitForTimeout(150);
    const nb1 = await fr.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? { t: e.textContent.replace(/\u00a0/g, ' '), h: Math.round(e.getBoundingClientRect().height) } : null; }; return { prev: g('.pk-nb-p'), next: g('.pk-nb-n') }; });
    await fr.click('.pk-nb-n'); await P.waitForTimeout(150);
    const n2 = await look(fr);
    rows2.push(`첫 드레스 이웃 줄 ${JSON.stringify(nb1)} → 다음 = «${n2.detail}» (화면 둘째 «${want2}»)`);
    if (nb1.prev || !nb1.next || nb1.next.t !== '다음 드레스 ›' || nb1.next.h < 44 || n2.detail.replace(/\s+/g, ' ').trim() !== String(want2).replace(/\s+/g, ' ').trim()) no(`이웃 넘기기 — 첫 드레스는 «다음 드레스 ›»만(44px) · 누르면 목록 다음 드레스가 아니다 ${JSON.stringify(nb1)} «${n2.detail}» [DRESS_NEXT_PREV]`);
    await fr.click('.pk-main [data-act="list"]'); await P.waitForTimeout(150);
    await back(); await back(); await back(); await back(900);   // 결과 → 물음 3 → 2 → 1 → 닫힘(고르기가 없어 판도 없다)
    const dlg = await P.evaluate(() => { const m = document.getElementById('mpModal'); return m && m.classList.contains('open') ? m.innerText.replace(/\s+/g, ' ').slice(0, 30) : ''; });
    rows2.push(`둘러본 뒤 결과 → 물음 3 · 2 · 1 → 뒤로 = ${dlg ? '판 «' + dlg + '»' : '닫힘'}`);
    if (dlg || (await P.$('#mp_drFrame'))) no(`뒤로가기 — 둘러본 뒤 물음 1 에서 판이 뜨거나 닫히지 않았다(${dlg}) [DRESS_GUIDE_ONLY]`);
    } catch (e) { if (e.message !== 'stop') no(`뒤로가기 검사가 끝까지 돌지 못했다 — ${String(e.message).split('\n')[0]} [DRESS_BACK_STEP]`); }
    if (pb.errors.length) no(`뒤로가기 검사 페이지 오류 ${pb.errors.length} · ${pb.errors[0]}`);
    rows.push('390×844 뒤로가기: ' + rows2.join(' · '));
    await P.close();
  }
  // ★[DRESS_PUBLIC_OFF 명세 2] ?pick=1 없이 열면 마이페이지로 넘어간다(그리기 전에 · replace)
  const p3 = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  await p3.page.goto(`http://localhost:${PORT}/dress.html`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p3.page.waitForTimeout(800);
  const landed = p3.page.url();
  rows.push(`/dress.html → ${landed.replace(/^https?:\/\/[^/]+/, '')}`);
  if (!/\/mypage\.html(\?|#|$)/.test(landed)) no(`/dress.html(공개 화면 주소)이 마이페이지로 넘어가지 않는다 — ${landed} [DRESS_PUBLIC_OFF]`);
  await p3.page.close();
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-fit — 실패 ${bad}건 [DRESS_DETAIL_FIT]`); process.exit(1); }
console.log(`━━ dress-fit — 통과 · [DRESS_GUIDE_ONLY] 고르기 없음 · 창 · 물음 막대 고정 · 열면 물음 1(답해야 다음 · 건너뛰기 없음) · 결과 «내가 고른 스타일» → «답에 어울리는 드레스 · n벌» → «다른 드레스도 살펴보기» → 펼침 · 막대 작은 사진 = 자세히 · 답 바꾸기 뒤 두 벌 그대로 · 세 크기 × 네 상태 모두 단추가 막대 위 · 진한 단추 하나 · 넘김은 사진 있는 장만 · 단독 완료 화면에 저장 단추 없음 · 여섯 크기 첫 화면 막대 선에 걸린 글줄 0 · 뒤로가기 한 걸음(자세히 → 목록 · 물음 3 → 2 → 1 → 목록 · 목록 → 나가기 판단) · 이웃 넘기기 · 공개 주소는 마이페이지로 [DRESS_DETAIL_FIT · DRESS_BAR_FIT · DRESS_BACK_STEP]`);
