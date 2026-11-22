#!/usr/bin/env node
/* ★★[PREP_HUB_1123 2026-11-23 사장님 결정] 마이페이지 «예식 준비» 카드의 «준비할 것» 줄 · 전체 화면 · 서버 길.
   잰다
     A 서버(GAS · 가짜 세상) — 열쇠마다 받는 파일 꼴(아니면 U0) · 예식 날부터 닫힘(U0) · 받으면 production.prepFiles 에 이름 · 곡 · 부르는 분 ·
       목소리 문(VOICE_UP)과 상관없다 · 지우면 기록에서도 빠진다 · «모두 지우기»(RFGONE) 뒤 빈 기록
     B 목록(assets/send-list.js) — 고른 것마다 맞는 줄 · 받은 것은 아래로 · 마감 말 · 예식 날 닫힘 · 줄 아래 한 줄 · 새 항목 점 판정
     C 화면(playwright · 1280) — 줄이 «가족 · 친구 스냅» 바로 뒤 · 같은 단추 폭 · 해당 없으면 줄 없음 · 점 → 열면 사라짐 ·
       전체 화면 = [MP_FS_OVERLAYS] · 뒤로가기로 닫힘 · 파일 올리기 = action ritualFile + 새 열쇠(mr) + 곡 · 부르는 분 · 받으면 «받음» ·
       체크 = 식순 초안 S.mkc 'p:ring:0' (+ fAt) · 원고 붙여 넣기 = S.tx 'bless.p' · 새 항목이 생기면 점이 다시 · 390 가로 넘침 없음
   --selftest : 줄을 빼 버린 mypage 를 내보내 C 가 빨강이 되는지(죽은 검사가 아닌지) 본다
   --shots <폴더> : 390 · 1280(배율 2) 카드 · 전체 화면 스크린샷
   종료 코드 0 통과 · 1 실패 · 2 브라우저 없음(A · B 는 그래도 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
import { openWorld, kstAhead, kstAgo } from './_gasworld.mjs';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest'); const SHOTS = (() => { const i = process.argv.indexOf('--shots'); return i > -1 ? process.argv[i + 1] : ''; })();
let fail = 0; const ok = (m, c, d) => { if (!SELF || !c) console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const SL = (() => { const box = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/send-list.js'), 'utf8'), box); return box.window.SendList; })();

/* ── A 서버 ── */
const { G, world } = openWorld(); const WED = kstAhead(60);
const cust = (wed) => world({ 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 이메일: 't@example.com', 연락처: '01012345678', 현재단계: '제작중', 계약상태: '서명완료', 계약서명일시: kstAgo(1), 계약총액: 3300000, 입금상태: '확인', 입금자명: '김희준', 시착동의상태: '동의완료', 시착동의일시: kstAgo(200), 예식일: wed,
  동의기록: JSON.stringify({ 계약정보: { weddingDate: wed, weddingTime: '12:20', requestedAt: kstAgo(30) } }) }, { 상태: '확정', 입금확인: '확인', 선택날짜: kstAhead(-40), 선택시간: '14:50', 토큰: 'BKTOK' });
cust(WED);
let ref = G.findCustomerByCode('ME-TEST'); G.resolveSession = () => ({ ok: true, row: ref });
if (!SELF) {
  let fn = 0; const made = [];
  G.Utilities.base64Decode = () => [0]; G.Utilities.newBlob = (d, m, n) => ({ name: n, mime: m });
  G._rfFolderFor = () => ({ createFile: (b) => { const id = 'FID' + (++fn) + 'xxxxxxxx'; made.push({ id, name: b.name, mime: b.mime }); return { getId: () => id, getName: () => b.name }; }, getUrl: () => 'u', getFiles: () => ({ hasNext: () => false }) });
  G._voiceUpLive = () => false;   // 목소리 문이 닫혀 있어도 «준비할 것»은 받는다
  const bad = G.handleRitualFile({ token: 't', key: 'bl', name: 'a.exe', mime: 'application/x-msdownload', data: 'AAAA' });
  ok('A 덕담 원고 칸에 실행 파일 → U0 거절', bad.ok === false && bad.ecode === 'U0', bad);
  const r1 = G.handleRitualFile({ token: 't', key: 'mr', name: 'mr.mp3', mime: 'audio/mpeg', data: 'data:audio/mpeg;base64,AAAA', t: '  너의 의미  ', w: '신랑 친구' });
  ok('A 축가 반주(mr) 받기 — 목소리 문이 닫혀 있어도 받는다 · 파일 이름 «축가 반주 · …»', r1.ok === true && /^축가 반주 · /.test((made[0] || {}).name || ''), [r1, made[0]]);
  const st1 = JSON.parse(JSON.stringify(G.handleGetMyState({ token: 't' })));
  const pf = (st1.production || {}).prepFiles || {};
  ok('A getMyState production.prepFiles.mr = 이름 · 곡 · 부르는 분(다듬어서)', pf.mr && pf.mr.name === 'mr.mp3' && pf.mr.t === '너의 의미' && pf.mr.w === '신랑 친구' && pf.mr.st === '', pf);
  const vr = G.handleRitualFile({ token: 't', key: 'g0', name: 'g.m4a', mime: 'audio/mp4', data: 'AAAA' });
  ok('A 목소리 열쇠(g0)는 종전대로 목소리 문을 탄다(닫혀 있으면 closed)', vr.ok === false && vr.closed === true, vr);
  const txt = G.handleRitualFile({ token: 't', key: 'sp', name: '축사.txt', mime: 'text/plain', data: 'AAAA' });
  ok('A 축사 원고(sp) 글 파일 받기', txt.ok === true, txt);
  G._rfFileIn = (code, id) => (id === pf.mr.id ? { setTrashed() {}, getId: () => id, getName: () => '축가 반주 · mr.mp3', getDateCreated: () => new Date() } : null);
  const dr = G.handleRitualFileDel({ token: 't', key: 'mr', id: pf.mr.id });
  const pf2 = JSON.parse(JSON.stringify(G.handleGetMyState({ token: 't' }))).production.prepFiles;
  ok('A 지우면 받은 기록에서도 빠진다(축사 원고는 남음)', dr.ok === true && !pf2.mr && !!pf2.sp, pf2);
  G.PropertiesService.getScriptProperties().setProperty('RFGONE_ME-TEST', '2026-11-23');
  ok('A «모두 지우기»(RFGONE) 뒤 받은 기록은 비어 보인다', Object.keys(G._rfPrepPub('ME-TEST')).length === 0);
  G.PropertiesService.getScriptProperties().deleteProperty('RFGONE_ME-TEST');
  cust(G._kstYmd ? G._kstYmd(new Date()) : kstAhead(0)); ref = G.findCustomerByCode('ME-TEST');
  const day = G.handleRitualFile({ token: 't', key: 'mr', name: 'mr.mp3', mime: 'audio/mpeg', data: 'AAAA' });
  ok('A 예식 날부터는 닫힌다(U0 · «예식 전날까지»)', day.ok === false && day.ecode === 'U0' && /전날까지/.test(day.error || ''), day);
  cust(WED); ref = G.findCustomerByCode('ME-TEST');
}

/* ── B 목록 ── */
const S1 = { on: { song: 1, bless: 1, ring: 1 }, songWho: 'gfr', guestVoice: 'narr' };
if (!SELF) {
  const L1 = SL.build({ S: S1, summary: { prep: O.prepList(S1) }, prevideo: { use: true, st: '', due: '2027-04-24' }, wed: '2027-05-01', today: '2027-04-20', files: {} });
  ok('B 축가 · 덕담 · 반지 · 식전 영상 → 보낼 것이 가까운 마감부터(식전 영상 4/24 · 덕담 원고 4/24 · 축가 반주 4/28)', JSON.stringify(L1.send.map((r) => r.id)) === JSON.stringify(['pv', 'bl', 'mr']), L1.send.map((r) => [r.id, r.dueYmd]));
  ok('B 마감 말 — 덕담(7일 전) «4일 남음 · 4월 24일까지» · 축가 반주(3일 전) «8일 남음 · 4월 28일까지»', L1.send[1].dueWord === '4일 남음 · 4월 24일까지' && L1.send[2].dueWord === '8일 남음 · 4월 28일까지', L1.send.map((r) => r.dueWord));
  ok('B 두 분이 준비할 것 = 반지 · 축가 부탁(식순 차례 · 체크 열쇠 p:ring:0 · p:song:0)', JSON.stringify(L1.two.map((r) => r.mk)) === JSON.stringify(['p:ring:0', 'p:song:0']), L1.two.map((r) => [r.mk, r.name]));
  ok('B 줄 아래 한 줄 = «5개 남음 · 다음 마감 4월 24일»', SL.subOf(L1) === '5개 남음 · 다음 마감 4월 24일', SL.subOf(L1));
  const L2 = SL.build({ S: S1, summary: { prep: O.prepList(S1) }, wed: '2027-05-01', today: '2027-04-20', files: { mr: { id: 'F', name: 'mr.mp3' } } });
  ok('B 받은 것은 아래로 · «받음»', L2.send[L2.send.length - 1].id === 'mr' && L2.send[L2.send.length - 1].word === '받음', L2.send.map((r) => [r.id, r.word]));
  const L3 = SL.build({ S: S1, summary: { prep: O.prepList(S1) }, wed: '2027-05-01', today: '2027-04-29', files: { mr: { id: 'F', name: 'a', st: 'trim' } } });
  ok('B 마감 지난 덕담 = «마감 지남» + «계속 올릴 수 있어요» · 관리자 상태 trim = «다듬는 중»', L3.send.find((r) => r.id === 'bl').word === '마감 지남' && L3.send.find((r) => r.id === 'bl').dueWord === '계속 올릴 수 있어요' && L3.send.find((r) => r.id === 'mr').word === '다듬는 중');
  const L4 = SL.build({ S: S1, summary: { prep: O.prepList(S1) }, wed: '2027-05-01', today: '2027-05-01', files: {} });
  ok('B 예식 날 = 닫힘(올리기 없음 · 셈에서 빠짐)', L4.send.find((r) => r.id === 'bl').closed === true && L4.send.find((r) => r.id === 'bl').open === false);
  const S5 = Object.assign({}, S1, { mkc: { 'p:bless:0': 'site' } });
  ok('B 덕담 «원고 없이 현장에서» → 덕담 원고 줄 없음', !SL.build({ S: S5, summary: { prep: O.prepList(S5) } }).send.some((r) => r.id === 'bl'));
  const L6 = SL.build({ S: {}, summary: {} });
  ok('B 고른 것 없음 → any=false(줄 없음) · 한 줄 비어 있음', L6.any === false && SL.subOf(L6) === '');
  ok('B 새 항목 점 — 처음(본 목록 없음) 켜짐 · 다 봤으면 꺼짐 · 새 열쇠 생기면 켜짐', SL.hasNew(L1, null) === true && SL.hasNew(L1, L1.ids) === false && SL.hasNew(L1, L1.ids.filter((x) => x !== 'bl')) === true);
}

/* ── C 화면 ── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let br = null; if (pw) { for (const o of [{}, { executablePath: '/usr/bin/google-chrome' }]) { try { br = await pw.chromium.launch(o); break; } catch {} } }
if (!br) { console.log(fail ? `\nPREP_HUB FAIL ${fail} (화면 못 잼)` : '\n못 쟀다 — 브라우저 없음(A · B 통과)'); process.exit(fail ? 1 : 2); }
G.resolveSession = () => ({ ok: true, row: ref });
const BASE_ST = JSON.parse(JSON.stringify(G.handleGetMyState({ token: 't' })));
const stOf = (S, extra) => { const st = JSON.parse(JSON.stringify(BASE_ST)); const P = st.production; P.ritualDraft = S ? { _v: 3, S, summary: { prep: O.prepList(S) } } : null; P.prepFiles = {}; Object.assign(P, extra || {}); return st; };
let MY = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
if (SELF) { const b = MY.replace('    ,_prhRow   /*', '    /*'); if (b === MY) { console.log('FAIL selftest — 뺄 줄을 못 찾았다'); process.exit(1); } MY = b; }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/mypage.html') { r.writeHead(200, { 'Content-Type': T['.html'] }); r.end(MY); return; } const p = path.join(ROOT, u); if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
async function page(st, vw, opt) {
  opt = opt || {}; const posts = [];
  const ctx = await br.newContext({ viewport: { width: vw, height: vw < 500 ? 844 : 900 }, deviceScaleFactor: opt.dsf || 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await ctx.addInitScript("window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem('me_token','TOK'); localStorage.setItem('me_ledtip_v1','o'); }catch(e){}" + (opt.seen ? `try{ localStorage.setItem('me_prephub_seen_ME-TEST', ${JSON.stringify(JSON.stringify(opt.seen))}); }catch(e){}` : ''));
  await ctx.route('**/*', async (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com') || u.includes('script.googleusercontent.com')) { let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {} posts.push(p);
      let j = { ok: true };
      if (p.action === 'getMyState') j = st;
      if (p.action === 'ritualFile') j = { ok: true, key: p.key, id: 'NEWFILE01', name: p.name, at: '2026-11-23 10:00', prep: { [p.key]: { id: 'NEWFILE01', name: p.name, at: '2026-11-23 10:00', kb: 1, t: p.t || '', w: p.w || '', st: '' } } };
      if (p.action === 'saveProductionTrack') j = { ok: true, rev: 'r2', draft: p.draft };
      return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(j) }).catch(() => {}); }
    if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }).catch(() => {}); });
  const pg = await ctx.newPage(); pg.on('pageerror', (e) => { if (!/ResizeObserver/.test(String(e))) console.log('  (페이지 오류) ' + String(e).slice(0, 200)); });
  await pg.goto(BASE + '/mypage.html', { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => { const v = document.getElementById('mypageView'); return v && v.classList.contains('show') && document.getElementById('mp_production'); }, null, { timeout: 20000 }); await wait(1200);
  return { ctx, pg, posts };
}
const rowNames = (pg) => pg.evaluate(() => [...document.querySelectorAll('#mp_production .trk .trk-nm')].map((e) => e.firstChild ? e.firstChild.textContent.trim() : ''));
{ // C1 줄 · 점 · 열기 · 뒤로가기
  const { ctx, pg } = await page(stOf(S1), 1280);
  const names = await rowNames(pg); const i = names.indexOf('준비할 것');
  ok('C 줄 «준비할 것»이 «가족 · 친구 스냅» 바로 뒤', i > 0 && names[i - 1] === '가족 · 친구 스냅', names);
  const g = await pg.evaluate(() => { const b = document.getElementById('mp_prepHub'), s = document.getElementById('mp_photoStart'), sub = document.getElementById('mp_prepSub'); const a = b && b.getBoundingClientRect(), c = s && s.getBoundingClientRect(); return { lb: b && b.textContent, w: a && Math.round(a.width), w2: c && Math.round(c.width), r: a && Math.round(a.right), r2: c && Math.round(c.right), sub: sub && sub.textContent, dot: !!document.querySelector('#mp_production .prh-dot') }; });
  ok('C 단추 «열기» · 이웃 줄 단추와 같은 폭 · 같은 오른끝', g.lb === '열기' && g.w === g.w2 && g.r === g.r2, g);
  ok('C 줄 아래 회색 한 줄 «n개 남음 · 다음 마감 …»', /^\d+개 남음( · 다음 마감 \d+월 \d+일)?$/.test(g.sub || ''), g.sub);
  ok('C 처음엔 새 항목 점(진사 6px)', g.dot === true);
  if (SELF && fail) { await ctx.close(); await br.close(); srv.close(); console.log(`ok   selftest — 줄을 뺀 mypage 는 빨강(${fail}건)`); process.exit(0); }
  const inert0 = await pg.evaluate(() => [...document.querySelectorAll('[inert]')].length);
  await pg.click('#mp_prepHub'); await wait(500);
  const o = await pg.evaluate(() => ({ ov: !!document.getElementById('mp_prepOverlay'), fs: typeof _mpFsOpen === 'function' && _mpFsOpen(), dot: !!document.querySelector('#mp_production .prh-dot'), seen: localStorage.getItem('me_prephub_seen_ME-TEST'), secs: [...document.querySelectorAll('#mp_prepOverlay .prh-st')].map((e) => e.textContent), rows: [...document.querySelectorAll('#mp_prepOverlay .prh-row .prh-nm')].map((e) => e.textContent), inert: !!document.querySelector('#mypageView[inert], .mp-main[inert], main[inert]') || [...document.body.children].some((e) => e.inert) }));
  ok('C 열면 전체 화면(mp_prepOverlay · [MP_FS_OVERLAYS] 안) · 뒤 페이지 막음', o.ov && o.fs && o.inert, o);
  ok('C 세 묶음 · 줄(축가 반주 · 식전 영상 · 덕담 원고 · 축가 부탁 · 반지)', JSON.stringify(o.secs.slice(0, 2)) === JSON.stringify(['스튜디오에 보낼 것', '두 분이 준비할 것']) && o.rows.some((t) => /^축가 반주/.test(t)) && o.rows.some((t) => /^덕담 원고/.test(t)) && o.rows.some((t) => /^반지 두 개/.test(t)), o);
  ok('C 열면 점이 사라지고 본 목록이 남는다', !o.dot && /mr/.test(o.seen || ''), o.seen);
  await pg.goBack(); await wait(500);
  const c = await pg.evaluate(() => ({ ov: !!document.getElementById('mp_prepOverlay'), fs: _mpFsOpen(), inert: [...document.querySelectorAll('[inert]')].length, lock: document.body.style.overflow || document.documentElement.style.overflow || '' }));
  ok('C 뒤로가기로 닫힌다 · 막음이 열기 전 그대로', !c.ov && !c.fs && c.inert === inert0, Object.assign({ inert0 }, c));
  await ctx.close();
}
{ // C2 올리기 · 체크 · 원고
  const { ctx, pg, posts } = await page(stOf(S1), 1280, { seen: SL.build({ S: S1, summary: { prep: O.prepList(S1) }, prevideo: { use: true } }).ids });
  ok('C 다 본 목록이면 점 없음', !(await pg.evaluate(() => !!document.querySelector('#mp_production .prh-dot'))));
  await pg.click('#mp_prepHub'); await wait(400);
  await pg.click('#prh_r_mr .prh-act'); await wait(200);
  await pg.fill('#prh_t_mr', '너의 의미'); await pg.fill('#prh_w_mr', '신랑 친구');
  await pg.setInputFiles('#prh_file_mr', { name: 'mr.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('ID3abc') }); await wait(900);
  const up = posts.find((p) => p.action === 'ritualFile');
  ok('C 파일 올리기 = action ritualFile · 열쇠 mr · 곡 · 부르는 분 · 소리 꼴', !!up && up.key === 'mr' && up.t === '너의 의미' && up.w === '신랑 친구' && up.mime === 'audio/mpeg' && /^data:/.test(up.data || ''), up && { key: up.key, t: up.t, w: up.w, mime: up.mime });
  const got = await pg.evaluate(() => { const r = document.getElementById('prh_r_mr'); return r && r.textContent; });
  ok('C 받으면 그 줄이 «받음» · 받은 파일 이름', /받음/.test(got || '') && /mr\.mp3/.test(got || ''), got);
  await pg.check('#prh_c_p_ring_0'); await wait(700);
  const sv = posts.filter((p) => p.action === 'saveProductionTrack').pop();
  ok('C 반지 체크 = 식순 초안 S.mkc[p:ring:0]=1 · 칸 시각 fAt · done:false · 다른 칸 그대로', !!sv && sv.track === 'ritual' && sv.done === false && sv.draft.S.mkc['p:ring:0'] === 1 && +sv.draft.S.fAt['mkc.p:ring:0'] > 0 && sv.draft.S.songWho === 'gfr', sv && { mkc: sv.draft.S.mkc, fAt: sv.draft.S.fAt });
  await pg.click('#prh_r_bl .prh-act'); await wait(200);
  await pg.fill('#prh_x_bl', '사랑하는 두 사람에게.\n늘 서로를 아껴 주렴.'); await pg.click('#prh_p_bl [data-prh="savetxt"]'); await wait(700);
  const sv2 = posts.filter((p) => p.action === 'saveProductionTrack').pop();
  ok('C 덕담 원고 붙여 넣기 = S.tx[bless.p] (빌더 «받은 덕담 원고»와 한 칸) · 앞 체크도 남음', !!sv2 && sv2.draft.S.tx['bless.p'] === '사랑하는 두 사람에게.\n늘 서로를 아껴 주렴.' && sv2.draft.S.mkc['p:ring:0'] === 1, sv2 && sv2.draft.S.tx);
  const bl = await pg.evaluate(() => document.getElementById('prh_r_bl').textContent);
  ok('C 원고를 받으면 덕담 원고 줄도 «받음»', /받음/.test(bl), bl);
  await pg.click('#mp_prepOverlay [data-prh="close"]'); await wait(900);
  ok('C 닫기 단추로 닫힌다', !(await pg.evaluate(() => !!document.getElementById('mp_prepOverlay'))));
  await ctx.close();
}
{ // C3 해당 없음 → 줄 없음 · 새 항목 → 점 다시
  const { ctx, pg } = await page(stOf(null, { prevideo: null, midvideo: null }), 1280);
  ok('C 고른 것이 없으면 줄 없음', !(await rowNames(pg)).includes('준비할 것'));
  await ctx.close();
  const S2 = { on: { song: 1 }, guestVoice: 'narr' };
  const seen = SL.build({ S: S2, summary: { prep: O.prepList(S2) }, prevideo: { use: true } }).ids;
  const b = await page(stOf(Object.assign({}, S2, { on: { song: 1, bless: 1 } })), 1280, { seen });
  ok('C 본 뒤에 새 필수 항목(덕담 원고)이 생기면 점이 다시', await b.pg.evaluate(() => !!document.querySelector('#mp_production .prh-dot')));
  await b.ctx.close();
}
{ // C4 390 가로 넘침 · 스크린샷
  const S3 = { on: { song: 1, bless: 1, ring: 1, declare: 1 }, songWho: 'gfr', guestVoice: 'narr' };
  for (const vw of [390, 1280]) {
    const { ctx, pg } = await page(stOf(S3, { prepFiles: { mr: { id: 'F1xxxxxxxxx', name: '너의의미_MR.mp3', at: '2026-11-20 21:10', kb: 4210, t: '너의 의미', w: '신랑 친구', st: '' } } }), vw, { dsf: SHOTS ? 2 : 1 });
    const card = await pg.evaluate(() => { const b = document.getElementById('mp_prepHub'); return b ? b.closest('.consult-card') && true : false; });
    if (SHOTS && card) { fs.mkdirSync(SHOTS, { recursive: true }); const el = await pg.$('#mp_production .consult-card'); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(SHOTS, `card-${vw}.png`) }); }
    await pg.click('#mp_prepHub'); await wait(500);
    const ov = await pg.evaluate(() => { const b = document.getElementById('mp_prepBody'); return { sw: b.scrollWidth, cw: b.clientWidth, doc: document.documentElement.scrollWidth, vw: innerWidth }; });
    ok(`C ${vw} 전체 화면 가로 넘침 없음`, ov.sw <= ov.cw && ov.doc <= ov.vw, ov);
    if (SHOTS) { await pg.screenshot({ path: path.join(SHOTS, `overlay-${vw}.png`), fullPage: false }); await pg.click('#prh_r_bl .prh-act'); await wait(300); const hh = await pg.evaluate(() => document.getElementById('mp_prepInner').scrollHeight + 60); await pg.setViewportSize({ width: vw, height: hh }); await wait(300); await pg.screenshot({ path: path.join(SHOTS, `overlay-${vw}-full.png`) }); }
    await ctx.close();
  }
}
await br.close(); srv.close();
if (SELF) { console.log(fail ? `ok   selftest — 줄을 뺀 mypage 는 빨강(${fail}건)` : 'FAIL selftest — 줄을 뺐는데 통과했다(죽은 검사)'); process.exit(fail ? 0 : 1); }
console.log(fail ? `\nPREP_HUB FAIL ${fail}` : '\nPREP_HUB OK'); process.exit(fail ? 1 : 0);
