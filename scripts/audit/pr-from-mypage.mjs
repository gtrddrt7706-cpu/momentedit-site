// ★[PR_FROM_MYPAGE 2026-10-05 사장님 «여기서 미리듣기 이것도 연습하기로 바꾸기»] 마이페이지 식순 줄 «연습하기» 실렌더 점검(390 · 1280)
//   보는 것: ①줄 보조 단추 이름 «연습하기»(옛 «미리듣기» 없음) ②누르면 식순 빌더 창(mp_obViewer)이 열리고 ③ 연습하기 화면에서 시작한다
//     ③옛 미리듣기 창(mp_rpViewer)은 안 열린다 ④연습 화면에 «처음부터 끝까지» · 순간 목록 ⑤JS 오류 0
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SITE = path.resolve(HERE, '../..'), PORT = 8133;
let fail = 0; const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const eng = await launchBrowser(); if (!eng) { console.log('못 쟀다 — 브라우저 없음'); server.kill(); process.exit(2); }
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  // 실제 빌더에서 순간을 담은 초안을 만든다(손으로 적은 S 는 엔진과 어긋나기 쉽다)
  let S0 = null;
  { const { page } = await eng.newPage({ port: PORT, viewport: { width: 1280, height: 900 } });
    await page.goto(`http://localhost:${PORT}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
    S0 = await page.evaluate(() => { courseStarted = true; ['family', 'vow', 'ring'].forEach((k) => { try { S.on = S.on || {}; S.on[k] = 1; } catch (e) {} }); return JSON.parse(JSON.stringify(S)); });
    await page.close(); }
  const seed = { name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-PRF', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '다음 할 일을 안내해 드릴게요.',
    contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26', result: null, isException: false,
    production: { base: { weddingDate: '2026-10-26' }, tracks: { ritual: '진행중' }, ritualDraft: { _v: 3, S: S0 } } };
  for (const V of [{ n: 'm390', viewport: { width: 390, height: 844 } }, { n: 'd1280', viewport: { width: 1280, height: 900 } }]) {
    console.log(`\n[${V.n}]`);
    const { page, errors } = await eng.newPage({ port: PORT, viewport: V.viewport });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' }); await wait(900);
    await page.evaluate((st) => { show('mypageView'); renderMyPage(st); }, seed); await wait(400);
    const lab = await page.evaluate(() => { const b = document.getElementById('mp_ritualPreview'); return b ? b.textContent.trim() : ''; });
    ok(lab === '연습 ›', '식순 줄 보조 단추 «연습 ›»([PR_PREP_ONE] · [PRACTICE_ONLY_1123])', lab);
    ok(await page.evaluate(() => !/미리듣기/.test((document.getElementById('mp_ritualStart') || {}).closest ? document.getElementById('mp_ritualStart').closest('.trk').textContent : '')), '식순 줄에 옛 «미리듣기» 글이 없다');
    await page.evaluate(() => document.getElementById('mp_ritualPreview').click());
    let at = '';
    for (let t = 0; t < 40; t++) { await wait(250); at = await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); try { const w = f && f.contentWindow; return (w && w.STEPS && w.STEPS[w.idx]) ? w.STEPS[w.idx].k : ''; } catch (e) { return 'err'; } }); if (at === 'practice') break; }
    ok(at === 'practice', '누르면 식순 빌더가 ③ 연습하기에서 열린다', at);
    await wait(600);
    const pf = await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); try { const d = f.contentWindow.document, x = d.querySelector('.pr-prepf'); return { has: !!x, open: !!(x && x.open), sum: x ? x.querySelector('summary').textContent : '' }; } catch (e) { return { err: String(e) }; } });
    ok(!pf.has, '연습 화면에 «준비할 것» 접이가 없다 — 진짜 연습만(옛 PR_PREP_FOLD 기대 은퇴) [PRACTICE_ONLY_1123]', JSON.stringify(pf));
    if (process.env.PFM_SHOT) { await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); const x = f.contentWindow.document.querySelector('.pr-prepf'); if (x) x.scrollIntoView({ block: 'start' }); }); await wait(300); await page.screenshot({ path: process.env.PFM_SHOT + '-' + V.n + '.png' }); }
    ok(await page.evaluate(() => !document.getElementById('mp_rpViewer')), '옛 미리듣기 창(mp_rpViewer)은 열리지 않는다');
    ok(await page.evaluate(() => { const w = document.getElementById('mp_obFrame').contentWindow; return !!w.document.querySelector('[data-fk="prall"]') && w.document.querySelectorAll('[data-fk^="prj:"]').length > 2; }), '연습 화면에 «처음부터 끝까지» · 순간 목록이 선다');
    ok(await page.evaluate(() => { const w = document.getElementById('mp_obFrame').contentWindow; return !w.document.querySelector('.pr-later'); }), '마이페이지에서 들어온 연습엔 «나중에 마이페이지에서» 줄이 없다 [PR_ORDER]');
    ok(errors.length === 0, 'JS 오류 0건', errors.slice(0, 2).join(' | '));
    await page.close();
  }
  /* ★[MR_TO_PREP_1123] 빌더 축가 «보낼 것» — 마이페이지 안에서는 카톡 · 메일 · 손 «보냈어요» 대신 «준비할 것 열기» · 누르면 저장하고 나가 «준비할 것»이 열린다 · 받은 뒤엔 «받았어요» */
  for (const got of [false, true]) {
    const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' }); await wait(900);
    const S1 = JSON.parse(JSON.stringify(S0)); S1.on.song = 1;
    const st = JSON.parse(JSON.stringify(seed)); st.production.ritualDraft = { _v: 3, S: S1 }; if (got) st.production.prepFiles = { mr: { id: 'F1', name: 'mr.mp3', at: '2026-11-23 10:00' } };
    await page.evaluate((st) => { window.apiTrackSave = (b) => Promise.resolve({ ok: true, draft: b.draft }); window.loadMyState = (o) => { try { renderMyPage(st); } catch (e) {} if (o && o.done) o.done(); }; window.__msgs = []; window.addEventListener('message', (e) => { try { window.__msgs.push(e.data && e.data.type); } catch (x) {} }); show('mypageView'); renderMyPage(st); openRitualBuilder(st.production, null, { at: 'mk:song' }); }, st);   // 서버 없이 — 저장 성공 · 다시 불러오기만 흉내
    let r = null; for (let t = 0; t < 40; t++) { await wait(250); r = await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); try { const d = f && f.contentDocument; if (!d || !f.contentWindow._mkRO || f.contentWindow._mkRO().at !== 'song') return null; return { prep: !!d.querySelector('[data-fk="mksongprep"]'), kakao: !!d.querySelector('[data-fk="mksongkakao"]'), sent: /보냈어요/.test(d.body.innerText), recv: /받았어요/.test(d.body.innerText) }; } catch (e) { return { err: String(e) }; } }); if (r) break; }
    if (process.env.PFM_SHOT) { try { await page.evaluate(() => { const d = document.getElementById('mp_obFrame').contentDocument; const el = d.querySelector('[data-fk="mksongprep"]') || [...d.querySelectorAll('.mk-vt')].find((x) => /반주/.test(x.textContent)); if (el) el.scrollIntoView({ block: 'center' }); }); await wait(300); await page.screenshot({ path: process.env.PFM_SHOT + '-mr-' + (got ? 'got' : 'need') + '.png' }); } catch (e) {} }
    if (!got) ok(!!r && r.prep && !r.kakao && !r.sent && !r.recv, '빌더 축가 «보낼 것» = «준비할 것 열기» · 카톡 · 메일 · 손 «보냈어요» 없음 [MR_TO_PREP_1123]', JSON.stringify(r));
    else ok(!!r && !r.prep && !r.kakao && r.recv, '반주를 받았으면 «받았어요» · 올리라는 줄 없음 [MR_TO_PREP_1123]', JSON.stringify(r));
    if (!got && r && r.prep) {
      await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); f.contentDocument.querySelector('[data-fk="mksongprep"]').click(); });
      let ov = false; for (let t = 0; t < 120 && !ov; t++) { await wait(250); ov = await page.evaluate(() => { try { const w = document.getElementById('mp_obFrame'); const d = w && w.contentDocument; const yes = d && [...d.querySelectorAll('button')].find((b) => /^저장하고 나가기$/.test(b.textContent.trim()) && b.offsetParent); if (yes) yes.click(); } catch (e) {} return !!document.getElementById('mp_prepOverlay') && !document.getElementById('mp_obFrame'); }); }   // 바뀐 것이 있으면 «저장하고 나갈까요?» — «저장하고 나가기»를 골라도 «준비할 것»이 열려야 한다
      const dbg = await page.evaluate(() => ({ msgs: (window.__msgs || []).slice(-8), emb: (() => { try { const w = document.getElementById('mp_obFrame').contentWindow; return [w.EMBED, typeof w.clGo, w._obExiting, w._xBusy, w._autoWait, w._ordOv ? ('ov:' + String(w._ordOv.innerText || '').replace(/\s+/g, ' ').slice(0, 120)) : '', w.courseStarted]; } catch (e) { return String(e); } })(), fr: !!document.getElementById('mp_obFrame'), hub: !!document.getElementById('mp_prepHub'), ov: !!document.getElementById('mp_prepOverlay'), toast: (document.querySelector('.mini-toast,#mpToast,.toast')||{}).textContent||'' }));
      ok(ov, '«준비할 것 열기» → 빌더를 닫고 마이페이지 «준비할 것»이 열린다 [MR_TO_PREP_1123]', JSON.stringify(dbg));
    }
    ok(errors.length === 0, 'JS 오류 0건(축가 보낼 것)', errors.slice(0, 2).join(' | '));
    await page.close();
  }
  /* ★[PREP_GO_MK_1123] «준비할 것» 출처 줄 → at:'mk:<순간>' 로 연 빌더는 ② 그 순간 쪽에서 시작 · 없는 순간이면 그 자리(오류 0) */
  { const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' }); await wait(900);
    await page.evaluate((st) => { show('mypageView'); renderMyPage(st); openRitualBuilder(st.production, null, { at: 'mk:vow' }); }, seed);
    let got = null; for (let t = 0; t < 40; t++) { await wait(250); got = await page.evaluate(() => { const f = document.getElementById('mp_obFrame'); try { const w = f && f.contentWindow; return (w && w.STEPS && w.STEPS[w.idx]) ? [w.STEPS[w.idx].k, w._mkRO().at] : null; } catch (e) { return ['err', String(e)]; } }); if (got && got[0] === 'listen' && got[1] === 'vow') break; }
    ok(!!got && got[0] === 'listen' && got[1] === 'vow', '«준비할 것» 출처 줄로 연 빌더 = ② 하나씩 만들기 · 혼인 서약 쪽 [PREP_GO_MK_1123]', JSON.stringify(got));
    ok(errors.length === 0, 'JS 오류 0건(mk: 열기)', errors.slice(0, 2).join(' | '));
    await page.close(); }
} catch (e) { console.log('❌ 예외', e && e.message); fail++; }
finally { try { await eng.close(); } catch (e) {} server.kill(); }
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
