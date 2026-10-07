// ★[PREP_LINK → PR_PREP_ONE 2026-10-07 사장님 «연습하기 · 준비할 것을 그 윗줄로 · 한 줄로 · 하나로 통합» → «추천대로»] mypage 식순 줄 실렌더 점검(390 · 1280)
//   보는 것: ①보조 단추는 «연습 · 준비 ›» 하나(옛 «준비할 것» 단추 · 줄 아래 목록 없음) ②«식순 ✓»과 같은 줄(폰 포함) ③폰에서 줄이 넘치지 않는다
//   (준비 목록은 연습 화면으로 옮겼다 — order-preview PR_PREP_FOLD · pr-from-mypage 가 연다)
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SITE = path.resolve(HERE, '../..'), PORT = 8131;
let fail = 0; const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const eng = await launchBrowser(); if (!eng) { console.log('못 쟀다 — 브라우저 없음'); server.kill(); process.exit(2); }
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const seed = (summary) => ({ name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-PRV', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '다음 할 일을 안내해 드릴게요.',
  contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26', result: null, isException: false,
  production: { base: { weddingDate: '2026-10-26' }, tracks: { ritual: '완료' }, ritualDraft: { _v: 3, S: { course: 'family' }, summary } } });
const SUM = { open: true, prep: [{ what: '반지', who: 'couple', due: 3 }, { what: '서약문 원고', who: 'couple', due: 7 }, { what: '덕담 한마디', who: 'parents', due: 7 }], helpers: [['반지 전달', '예식 당일'], ['편지 낭독 도우미', '예식 당일']] };
try {
  for (const V of [{ n: 'm390', viewport: { width: 390, height: 844 } }, { n: 'd1280', viewport: { width: 1280, height: 900 } }]) {
    console.log(`\n[${V.n}]`);
    const { page, errors } = await eng.newPage({ port: PORT, viewport: V.viewport });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 900));
    await page.evaluate((st) => { show('mypageView'); renderMyPage(st); }, seed(SUM)); await new Promise((r) => setTimeout(r, 300));
    const a = await page.evaluate(() => { const pv = document.getElementById('mp_ritualPreview'), st = document.getElementById('mp_ritualStart'), row = st && st.closest('.trk'), nm = row && row.querySelector('.trk-nm');
      const r1 = pv && pv.getBoundingClientRect(), r2 = nm && nm.getBoundingClientRect(), r3 = st && st.getBoundingClientRect();
      return { lab: pv ? pv.textContent.trim() : '', old: !!document.getElementById('mp_ritualPrep') || !!document.getElementById('mp_ritPrepBox'), sameLine: !!(r1 && r2 && Math.abs((r1.top + r1.bottom) / 2 - (r2.top + r2.bottom) / 2) < 10 && Math.abs((r1.top + r1.bottom) / 2 - (r3.top + r3.bottom) / 2) < 10), over: row ? row.scrollWidth > row.clientWidth + 1 : true, sum: /준비할 것 \d+가지/.test(document.body.innerText) }; });
    ok(a.lab === '연습 · 준비 ›' && !a.old, '보조 단추 «연습 · 준비 ›» 하나 · 옛 «준비할 것» 단추 · 목록 없음 [PR_PREP_ONE]', JSON.stringify(a));
    ok(a.sameLine && !a.over, '«식순 ✓» · «연습 · 준비 ›» · «완료 · 수정»이 한 줄 · 넘침 없음', JSON.stringify(a));
    ok(!a.sum, '마이페이지에 «준비할 것 N가지» 요약 줄 없음(PREP_FOLD_OFF)', JSON.stringify(a));
    ok(!errors.length, 'pageerror 0', errors.slice(0, 2).join(' | '));
    await page.close();
  }
} catch (e) { console.log('예외', e && e.message); fail++; }
finally { await eng.close(); server.kill(); }
console.log(fail ? `\nPREP_LINK FAIL ${fail}` : '\nPREP_LINK OK'); process.exit(fail ? 1 : 0);
