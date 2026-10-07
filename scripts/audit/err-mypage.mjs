#!/usr/bin/env node
/* ★★[ERR_CODE_MYPAGE 2026-10-07 사장님 «다른 부분들도 스크린샷으로 혹은 고객이 오류 코드 등을 알려 주면 관리자가 어떤 문제인지 알 수 있게 · 전부 개선»]
   마이페이지 실패 문구가 «원인 한 줄 + (코드 X#)»로 나오는지, 고친 결함이 다시 살아나지 않는지 가짜 GAS 로 잰다.
   ① 까닭 없는 getMyState 실패는 로그아웃하지 않는다(토큰 · 이 기기 초안 me_order · me_snapLocal_* 그대로) · 저장본이 있으면 화면 + 위 막대(코드)
      reason='expired' 일 때만 로그인 화면 + «(코드 L8)» [F1]
   ② 보내기 한 벌(_post · api)이 실패 종류를 가른다 — 끊김 6 · JSON 아님 7 · 기다리다 멈춤 5(종전 표시 __meTimeout 도 그대로) · 첫 로드 · 로그인 칸도 그 코드 [A1 · F2 · F3]
   ③ 서버 답 — 이미 코드가 붙은 글은 그대로(두 번 안 붙인다) · ecode 만 오면 붙인다 · 옛 서버(잠금 대기 → 1 · 예외 → 9) · 영문 기술어는 싣지 않는다
   ④ 저장 실패 판 — 서버 까닭 + S 코드 · 로그인 풀림은 «로그인하기» 판 [F5]
   ⑤ 쓰기 동작 시간 초과 — «응답이 늦어요 · 처리됐는지 확인하고 있어요 (코드 P5)» → 상태를 다시 불러 반영됐으면 «처리됐어요» · 아니면 «아직 반영되지 않았어요 … (코드 P5)» [F4]
   ⑥ 빌더 중계 — ritualFileDel 은 지우기(D) · ritualFileGet 은 불러오기(L) · orderDraftFail 이 까닭(msg · ecode · sess)을 싣는다 [F7]
   ⑦ 360px 폰에서 새 문구가 한 줄(첫 로드 다시 불러오기 화면 · 실패 알림 판 본문)
   ⑧ 카드 승인 확인 — 결과를 모르면(끊김 · 서버 5) 주소의 결제 정보를 두고 «다시 확인» · 분명한 답(성공 · 거절)일 때만 정리 [F11]
   ★1라운드(2026-10-07 «라운드별로 개선책이 없을 때까지») — 서버 까닭(0)은 코드 없이 [ERR_SRV_REASON] · 코드 앞 마침표 걷음 [ERR_CODE_DOT] · 코드는 어느 칸에서도 한 덩어리 [ERR_CODE_NOWRAP]
   ⑨ 토스 복귀 갈래(PAY_FAIL_KIND · PAY_RET_EMPTY) ⑩ 좌석 파생 저장 skip(SEAT_FIN_SKIP) ⑪ 스냅 작은 그림 · 장면 목록(SNAP_THUMB_FAIL · SNAP_REFS_MISS)
   ⑫ QR · 이미지 창 · 처리방침 창(QR_LOAD_FAIL · PV_IMG_CODE · PRIVACY_FAIL_ONE) ⑬ 나가기 판 코드 · 옛 GAS 칸 버림(WIZ_EXIT_CODE · ECHO_LOST_CODE)
   ⑭ «불러오는 중» 고착(LOAD_FAIL_SPIN) ⑮ 360 코드 한 덩어리 · 알림 너비(ERR_CODE_NOWRAP · MINI_TOAST_WIDE)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

/* ⓪ 글자 검사 — 브라우저 없이 */
const MY = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
ok('⓪ 표식 [ERR_CODE_MYPAGE] 이 고친 자리마다 있다(30곳 이상)', (MY.match(/ERR_CODE_MYPAGE/g) || []).length >= 30, String((MY.match(/ERR_CODE_MYPAGE/g) || []).length));
ok('⓪ 옛 공통 실패 문구 «처리가 안 됐어요. 잠시 후 다시 시도해 주세요. 계속 안 되면…» 가 남지 않았다', !/처리가 안 됐어요\. 잠시 후 다시 시도해 주세요/.test(MY));
ok('⓪ 까닭 없는 getMyState 실패에 clearToken 하던 줄이 없다(F1)', !/else \{ clearToken\(\); show\('loginView'\); if\(d && d\.error\) softLoginNote\(d\.error\); \}/.test(MY));
ok('⓪ 상담 뒤 고객에게 틀린 «이 부분은 상담 때 디렉터가 함께 안내드릴게요» 를 대화에 넣지 않는다 · 지도 실패는 한 줄 + A4(F10)', !/content:'이 부분은 상담 때 디렉터가 함께 안내드릴게요/.test(MY) && /지도 정보를 잠시 못 불러왔어요 · 아래에서 직접 골라 주세요 \(코드 A4\)/.test(MY));
ok('⓪ 영문 기술어를 그대로 싣던 다이닝 줄 없음 · A 코드 표가 있다(F10)', /function _dncErr\(/.test(MY) && /\(코드 A3\)/.test(MY) && /\(코드 A4\)/.test(MY));
ok('⓪ 서명 «정말 없음» · «못 불러옴»을 가른다(F9)', /function _sigMiss\(/.test(MY) && !/서명 기록을 찾지 못했어요\./.test(MY));
ok('⓪ 카드 승인 확인 — 결과를 모를 땐 주소의 결제 정보를 지우지 않는다 · 토스 오류 코드를 P4 옆에(F11)', /결제 확인이 끝나지 않았어요/.test(MY) && /\(코드 P4'\+\(\(err&&err\.code\)/.test(MY));
/* ★[ERR_SRV_REASON · ERR_CODE_DOT · ERR_CODE_NOWRAP 2026-10-07 1라운드] 코드 앞 마침표 · 칸에 넣는 실패 줄 · 서버 까닭(0) */
{ const lits = MY.match(/'[^'\n]{0,240}[.。] \(코드 [A-Z]\d[^'\n]{0,40}'/g) || [];
  ok('⓪ 화면 글에 «…요. (코드 X#)» — 코드 앞 마침표가 남지 않았다 [ERR_CODE_DOT]', !lits.length, lits.slice(0, 3).join(' | ')); }
ok('⓪ _errLine 이 서버 까닭(0)엔 코드를 안 붙이고(if(i.t && !i.n) return i.t) · 이미 붙은 코드는 _errTidy 로 [ERR_SRV_REASON · ERR_CODE_DOT]', /if\(i\.has\) return _errTidy\(i\.t\);/.test(MY) && /if\(i\.t && !i\.n\) return i\.t;/.test(MY) && /function _errTidy\(t\)/.test(MY));
{ const sinks = ['textContent=_errLine(', 'textContent=_dncErr(', 'textContent=_saveFailBody(', 'escapeHtml(_sigMiss(', "msg.textContent=line;", "if(e) e.textContent=m||''; }", "errEl.textContent=msg||''", "$('iv_err').textContent=msg", "if(err) err.textContent=m; }", "n.textContent=t||''; };", "tx.textContent='최신 내용을 불러오지 못했어요 (코드 '", "+escapeHtml(line)+'</div>'", "el.textContent=t||''; el.style.display=t?'':'none';"];
  const left = sinks.filter((x) => MY.includes(x));
  ok('⓪ 실패 줄을 넣는 칸이 textContent · escapeHtml 로 코드를 쪼개지 않는다 — 전부 _errSet · _errHtml [ERR_CODE_NOWRAP]', !left.length && (MY.match(/_errSet\(/g) || []).length >= 20, left.join(' | ') + ' · _errSet=' + (MY.match(/_errSet\(/g) || []).length); }
ok('⓪ 판 본문(body 글) · 알림(_miniToast · mpToast)도 코드를 한 덩어리로 [ERR_CODE_NOWRAP]', /else if\(o\.body\)\{ b\.innerHTML=_errHtml\(String\(o\.body\)\);/.test(MY) && /t\.textContent=msg; t\.style\.opacity='1'; _errNowrap\(t\);/.test(MY) && /_errSet\(t, msg\); clearTimeout\(t\._h1\)/.test(MY));

ok('⓪ 청첩장 발행 시간 초과는 한 번 저절로 다시 보내 결과를 받는다(30초 · 멱등) [INV_PUB_AGAIN]', /if\(_to&&!_pubAgain\)\{ _pubAgain=true;/.test(MY) && /_pubSend\(\)\.then\(_pubOk,_pubErr\);\n\}/.test(MY) && /\+window\.__INV_PUB_MS\|\|30000/.test(MY));
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port, BASE = `http://127.0.0.1:${port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }

const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const STATE = (extra) => Object.assign({ ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '다음 할 일을 안내해 드릴게요.', contract: { signed: true }, payment: { confirmed: true }, result: null, production: null, isException: false, weddingDate: '2026-10-26' }, extra || {});
const CORS = { 'Access-Control-Allow-Origin': '*' };
let GAS = {};   // 동작 이름 → 답(객체 · 함수) — {json} · {abort:1} · {html:1} · {hold:ms, json}
const seen = [];

async function open(w, init) {
  const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 800 : 900 }, hasTouch: w < 1000 });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  if (init) await ctx.addInitScript(init);
  await ctx.route('**/*', async (rt) => {
    const u = rt.request().url();
    if (u.includes('script.google.com')) {
      let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {}
      seen.push(p.action);
      let h = GAS[p.action]; if (typeof h === 'function') h = h(p);
      if (!h) return rt.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{"ok":true}' });
      if (h.abort) return rt.abort('failed');
      if (h.hold) await new Promise((r) => setTimeout(r, h.hold));
      try {
        if (h.html) return await rt.fulfill({ status: h.status || 200, contentType: 'text/html', headers: CORS, body: '<!doctype html><title>Error</title><p>서버 오류</p>' });
        return await rt.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(h.json) });
      } catch { return; }
    }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' });
  });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  return { ctx, pg, errs };
}
const lines = (pg, sel) => pg.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return -1; const cs = getComputedStyle(el), b = el.getBoundingClientRect(), lh = parseFloat(cs.lineHeight) || 1;
  const h = b.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth); return Math.round(h / lh); }, sel);
const modal = (pg) => pg.evaluate(() => { const m = document.getElementById('mpModal'); const open = !!(m && m.classList.contains('open')); return { open, title: open ? (document.getElementById('mpModalTitle').textContent || '') : '', body: open ? (document.getElementById('mpModalBody').textContent || '') : '', btns: open ? [...document.querySelectorAll('#mpModalActions button')].map((b) => b.textContent) : [] }; });
/* 한 묶음이 도중에 멈춰도(고친 것을 되돌려 요소가 사라진 경우 등) 실패로 세고 다음 묶음으로 간다 — 멈춘 채 끝나면 «왜»가 안 보인다 */
async function sec(name, fn) { try { await fn(); } catch (e) { ok(name + ' — 재다가 멈췄다', false, String(e && e.message || e).split('\n')[0]); } }
const closeModal = (pg) => pg.evaluate(() => { const b = document.querySelector('#mpModalActions .mp-modal-btn'); if (b) b.click(); });

/* ① F1 — 까닭 없는 실패는 로그아웃하지 않는다 */
await sec('①', async () => {
  GAS = { getMyState: { json: { ok: false, error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' } } };
  const { ctx, pg, errs } = await open(360, "try{ if(!sessionStorage.getItem('__seed')){ sessionStorage.setItem('__seed','1'); localStorage.setItem('me_token','TOK'); localStorage.setItem('me_order', JSON.stringify({v:2,S:{a:1},who:'ME-SHOT'})); localStorage.setItem('me_snapLocal_ME-SHOT', JSON.stringify({v:2,zones:{}})); } }catch(e){}");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const a = await pg.evaluate(() => ({ tok: localStorage.getItem('me_token'), order: !!localStorage.getItem('me_order'), snap: !!localStorage.getItem('me_snapLocal_ME-SHOT'), login: document.getElementById('loginView').classList.contains('show'), retry: !!document.getElementById('mp_retryLoad'), retryTxt: (document.getElementById('mp_retryLoad') || {}).textContent || '', text: (document.getElementById('loading') || {}).innerText || '' }));
  ok('① 까닭 없는 getMyState 실패 → 토큰 · me_order · me_snapLocal_* 그대로 · 로그인 화면 아님 [F1]', a.tok === 'TOK' && a.order && a.snap && !a.login, JSON.stringify(a));
  ok('① 첫 로드 → «다시 불러오기» 화면 · 서버 글 + (코드 L9 · 코드 앞 마침표 없이 [ERR_CODE_DOT]) · 코드를 알려 달라는 한 줄', a.retry && a.retryTxt === '다시 불러오기' && /요청을 처리하지 못했어요\. 잠시 후 다시 시도해 주세요 \(코드 L9\)/.test(a.text) && !/주세요\. \(코드/.test(a.text) && /이 코드를 카카오톡으로/.test(a.text), JSON.stringify(a));
  /* 360 한 줄 — 끊김(L6)일 때의 원인 줄(서버 글 L9 는 서버 문장이라 길다) */
  GAS.getMyState = { abort: 1 };
  await pg.evaluate(() => { document.getElementById('mp_retryLoad').click(); }); await pg.waitForTimeout(1200);
  const l6 = await pg.evaluate(() => { const d = document.querySelector('#loading > div'); return d ? d.textContent : ''; });
  const ln = await lines(pg, '#loading > div');
  ok('① 다시 불러오기도 끊기면 «연결이 끊겼어요 · 다시 불러와 주세요 (코드 L6)»', l6 === '연결이 끊겼어요 · 다시 불러와 주세요 (코드 L6)', l6);
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, 'retry-360.png') });
  /* 저장본이 있으면 — 화면을 그대로 보이고 위에 막대(코드) */
  GAS.getMyState = { json: STATE() };
  await pg.evaluate(() => { document.getElementById('mp_retryLoad').click(); }); await pg.waitForTimeout(1200);
  GAS.getMyState = { json: { ok: false, ecode: 'L4', error: '불러오지 못했어요. 다시 눌러 주세요. (코드 L4)' } };
  await pg.evaluate(() => _mpRefresh()); await pg.waitForTimeout(1200);
  const b = await pg.evaluate(() => ({ my: document.getElementById('mypageView').classList.contains('show'), tok: localStorage.getItem('me_token'), bar: (document.getElementById('mp_loadBar') || {}).textContent || '' }));
  ok('① 보이던 화면에서 갱신 실패 → 화면 그대로 · 로그아웃 없음 · 위 막대 «최신 내용을 불러오지 못했어요 (코드 L4)» · 다시 불러오기', b.my && b.tok === 'TOK' && /최신 내용을 불러오지 못했어요 \(코드 L4\)/.test(b.bar) && /다시 불러오기/.test(b.bar), JSON.stringify(b));
  GAS.getMyState = { json: STATE() };
  await pg.evaluate(() => _mpRefresh()); await pg.waitForTimeout(1200);
  ok('① 다시 불러오면 막대가 걷힌다', await pg.evaluate(() => !document.getElementById('mp_loadBar')));
  /* reason='expired' 일 때만 로그아웃 */
  GAS.getMyState = { json: { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' } };
  await pg.evaluate(() => loadMyState()); await pg.waitForTimeout(1200);
  const c = await pg.evaluate(() => ({ tok: localStorage.getItem('me_token'), login: document.getElementById('loginView').classList.contains('show'), err: (document.getElementById('li_err') || {}).textContent || '' }));
  ok('① reason=expired → 로그아웃 · 로그인 화면 · 서버 글 + (코드 L8 · 앞 마침표 없이) [F1 · F12 · ERR_CODE_DOT]', !c.tok && c.login && /로그아웃됐어요\. 다시 로그인해 주세요 \(코드 L8\)$/.test(c.err), JSON.stringify(c));
  ok('⑦ 360 — 첫 로드 «다시 불러오기» 화면의 원인 줄이 한 줄', ln === 1, 'lines=' + ln);
  /* ③ 로그인 칸 — 끊김 L6 · 서버 글 L0(ecode 없는 옛 서버) · 새 서버 ecode */
  GAS.login = { abort: 1 };
  await pg.evaluate(() => { document.getElementById('li_code').value = 'ME-SHOT'; document.getElementById('li_pw').value = 'pw1234'; document.getElementById('li_btn').click(); }); await pg.waitForTimeout(900);
  const l1 = await pg.evaluate(() => document.getElementById('li_err').textContent);
  GAS.login = { json: { ok: false, error: '개인코드(이메일) 또는 비밀번호가 올바르지 않습니다.' } };
  await pg.evaluate(() => document.getElementById('li_btn').click()); await pg.waitForTimeout(900);
  const l2 = await pg.evaluate(() => document.getElementById('li_err').textContent);
  GAS.login = { json: { ok: false, ecode: 'L0', error: '개인코드(이메일) 또는 비밀번호가 올바르지 않습니다.' } };
  await pg.evaluate(() => document.getElementById('li_btn').click()); await pg.waitForTimeout(900);
  const l3 = await pg.evaluate(() => document.getElementById('li_err').textContent);
  ok('③ 로그인 — 끊김 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)» · 서버 거절 글은 코드 없이(글이 곧 까닭 · ecode 없는 옛 서버 · L0 둘 다) [F3 · ERR_SRV_REASON]', l1 === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)' && l2 === '개인코드(이메일) 또는 비밀번호가 올바르지 않습니다.' && l3 === l2, [l1, l2, l3].join(' | '));
  GAS.login = { abort: 1 };
  await pg.evaluate(() => document.getElementById('li_btn').click()); await pg.waitForTimeout(900);
  const lnLogin = await lines(pg, '#li_err');
  ok('⑦ 360 — 로그인 칸 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)» 한 줄', lnLogin === 1, 'lines=' + lnLogin);
  ok('① 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ② 보내기 한 벌이 실패 종류를 가른다 · ③ 서버 답 읽기 */
await sec('②③', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const k = async (h, ms) => { GAS.probe = h; return pg.evaluate((ms) => _post({ action: 'getMyState', token: 'x', probe: 1 }, ms).then((d) => 'resolved ' + JSON.stringify(d), (e) => ({ line: _errLine(e, 'L'), kind: _errKind(e), to: !!e.__meTimeout, act: e.meAct })), ms); };
  GAS.getMyState = (p) => (p.probe ? GAS.probe : { json: STATE() });
  const net = await k({ abort: 1 }, 12000), bad = await k({ html: 1 }, 12000), bad5 = await k({ html: 1, status: 500 }, 12000), slow = await k({ hold: 1500, json: { ok: true } }, 300);
  ok('② 끊김 → 6 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)»', net.kind === 'net' && net.line === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)', JSON.stringify(net));
  ok('② JSON 아님(200 · 500 오류 화면) → 7 «서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 L7)»', bad.kind === 'bad' && bad5.kind === 'bad' && bad.line === '서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 L7)', JSON.stringify([bad, bad5]));
  ok('② 기다리다 멈춤 → 5 «응답이 늦어요 · 잠시 뒤 다시 눌러 주세요 (코드 L5)» · 종전 표시(__meTimeout)도 그대로 · 동작 이름(meAct)', slow.kind === 'slow' && slow.to && slow.act === 'getMyState' && slow.line === '응답이 늦어요 · 잠시 뒤 다시 눌러 주세요 (코드 L5)', JSON.stringify(slow));
  const s = await pg.evaluate(() => ({
    has: _errLine({ ok: false, ecode: 'S9', eid: '7KQ2', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 S9 · 7KQ2)' }, 'S'),
    ec0: _errLine({ ok: false, ecode: 'C0', error: '서명할 계약서가 없습니다.' }, 'X'),
    busyOld: _errLine({ ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }, 'P'),
    excOld: _errLine({ ok: false, error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 'C'),
    eng: _errLine({ ok: false, ecode: 'G9', eid: 'K7QA', error: 'INTERNAL_ERROR' }, 'S', '저장이 안 됐어요 · 다시 눌러 주세요'),
    sess: _errLine({ ok: false, reason: 'invalid', error: '' }, 'P'),
    empty: _errLine({ ok: false }, 'R', '후기를 보내지 못했어요 · 다시 눌러 주세요'),
    nul: _errLine(null, 'S'),
    clip: _errClip('아주 긴 서버 문장 '.repeat(12) + '(코드 S9 · 7KQ2)', 60),
    toss: _errLine({ ok: false, ecode: 'P4', error: '결제 승인에 실패했습니다. (코드 P4 · REJECT_CARD_COMPANY)' }, 'P'),
    tossC: _errCode({ ok: false, error: '결제 승인에 실패했습니다. (코드 P4 · REJECT_CARD_COMPANY)' }, 'P'),
    fb: _errLine({ ok: false, ecode: 'R0' }, 'R', '후기를 보내지 못했어요 · 다시 눌러 주세요'),
    fb2: _errLine({ ok: false, error: 'INTERNAL' }, 'R', '수정 요청을 보내지 못했어요.')
  }));
  ok('③ 이미 코드가 붙은 글은 두 번 안 붙인다 · 코드 앞 마침표만 걷는다 [ERR_CODE_DOT]', s.has === '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요 (코드 S9 · 7KQ2)', s.has);
  ok('③ 서버 한글 까닭 + 0(ecode C0) → 글 그대로 · 코드 없음(글이 곧 까닭) [ERR_SRV_REASON]', s.ec0 === '서명할 계약서가 없습니다.', s.ec0);
  ok('③ 토스 코드가 붙어 온 글도 «이미 붙은 코드» — 두 번 안 붙이고 마침표만 걷는다 [ERR_CODE_TAIL]', s.toss === '결제 승인에 실패했습니다 (코드 P4 · REJECT_CARD_COMPANY)' && s.tossC === 'P4 · REJECT_CARD_COMPANY', s.toss + ' | ' + s.tossC);
  ok('③ 서버 까닭이 없을 때 화면이 만든 대체 글에는 0 코드 [ERR_SRV_REASON]', s.fb === '후기를 보내지 못했어요 · 다시 눌러 주세요 (코드 R0)' && s.fb2 === '수정 요청을 보내지 못했어요 (코드 R0)', s.fb + ' | ' + s.fb2);
  ok('③ 옛 서버 — 잠금 대기 → 1 · 처리 못 함 → 9', /\(서버 혼잡\) \(코드 P1\)$/.test(s.busyOld) && /\(코드 C9\)$/.test(s.excOld), s.busyOld + ' | ' + s.excOld);
  ok('③ 영문 기술어는 싣지 않고 사고번호는 남긴다 «저장이 안 됐어요 · 다시 눌러 주세요 (코드 G9 · K7QA)»', s.eng === '저장이 안 됐어요 · 다시 눌러 주세요 (코드 G9 · K7QA)', s.eng);
  ok('③ 로그인 풀림(글 없음) → «로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 P8)»', s.sess === '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 P8)', s.sess);
  ok('③ 서버가 까닭 없이 거절 → 그 자리의 말 + 0 · 객체 아닌 답 → 7 · 줄여도 코드는 남는다', s.empty === '후기를 보내지 못했어요 · 다시 눌러 주세요 (코드 R0)' && /\(코드 S7\)$/.test(s.nul) && /… \(코드 S9 · 7KQ2\)$/.test(s.clip) && s.clip.length <= 61, JSON.stringify([s.empty, s.nul, s.clip]));
  ok('② 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ④ 저장 실패 판(F5) · ⑤ 쓰기 동작 시간 초과(F4) · ⑦ 알림 판 한 줄 */
await sec('④⑤', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(360, "try{ if(!sessionStorage.getItem('__seed')){ sessionStorage.setItem('__seed','1'); localStorage.setItem('me_token','TOK'); } }catch(e){}");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window._mpStateD = { production: { base: { weddingDate: '2026-10-26' }, tracks: {} } }; show('mypageView'); const b = document.getElementById('mp_production'); if (b) b.style.display = 'block'; });
  GAS.saveProductionTrack = { json: { ok: false, error: '저장할 내용이 너무 길어요. 조금 줄여서 다시 저장해 주세요.' } };
  await pg.evaluate(() => { startTrkFlow('dining', { venuePick: '다이닝 없이 진행할게요', dining_on: 'N', _step: 1 }, { weddingDate: '2026-10-26' }); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => exitTrkFlow()); await pg.waitForTimeout(1300);
  const m1 = await modal(pg);
  ok('④ 저장 실패 판 — 제목 «저장이 안 됐어요» · 본문 = 서버 까닭 그대로(0 은 코드 없이 [ERR_SRV_REASON]) · «다시 저장»', m1.open && m1.title === '저장이 안 됐어요' && m1.body === '저장할 내용이 너무 길어요. 조금 줄여서 다시 저장해 주세요.' && m1.btns.includes('다시 저장'), JSON.stringify(m1));
  await pg.evaluate(() => { const g = document.querySelectorAll('#mpModalActions button'); g[g.length - 1].click(); }); await pg.waitForTimeout(500);   // 저장 없이 나가기
  GAS.saveProductionTrack = { abort: 1 };
  await pg.evaluate(() => { startTrkFlow('dining', { venuePick: '다이닝 없이 진행할게요', dining_on: 'N', _step: 1 }, { weddingDate: '2026-10-26' }); }); await pg.waitForTimeout(400);
  await pg.evaluate(() => exitTrkFlow()); await pg.waitForTimeout(1300);
  const m2 = await modal(pg);
  ok('④ 저장 실패 판 — 끊김이면 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 S6)»(종전 «네트워크가 잠시 불안정한 것 같아요»)', m2.open && m2.body === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 S6)', JSON.stringify(m2));
  const cut = await pg.evaluate(() => { const c = document.querySelector('#mpModalBody .err-code'); if (!c) return -1; return c.getClientRects().length; });
  ok('⑦ 360 — 판 본문이 좁아 줄이 바뀌어도 코드는 한 덩어리(«(코드 / S6)»로 갈리지 않는다)', cut === 1, 'rects=' + cut);
  await pg.evaluate(() => { const g = document.querySelectorAll('#mpModalActions button'); g[g.length - 1].click(); }); await pg.waitForTimeout(500);
  GAS.saveProductionTrack = { json: { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' } };
  await pg.evaluate(() => { startTrkFlow('dining', { venuePick: '다이닝 없이 진행할게요', dining_on: 'N', _step: 1 }, { weddingDate: '2026-10-26' }); }); await pg.waitForTimeout(400);
  await pg.evaluate(() => exitTrkFlow()); await pg.waitForTimeout(1300);
  const m3 = await modal(pg);
  ok('④ 로그인이 풀린 저장 → «다시 저장» 대신 «로그인이 풀렸어요» 판 · «로그인하기» · (코드 S8)', m3.open && m3.title === '로그인이 풀렸어요' && m3.btns[0] === '로그인하기' && /\(코드 S8\)$/.test(m3.body) && !m3.btns.includes('다시 저장'), JSON.stringify(m3));
  await pg.evaluate(() => { document.querySelector('#mpModalActions button').click(); }); await pg.waitForTimeout(1500);
  const lg = await pg.evaluate(() => ({ tok: localStorage.getItem('me_token'), login: document.getElementById('loginView').classList.contains('show'), err: (document.getElementById('li_err') || {}).textContent || '' }));
  ok('④ «로그인하기» → 로그인 화면 · 로그인 칸에 (코드 S8)', !lg.tok && lg.login && /\(코드 S8\)$/.test(lg.err), JSON.stringify(lg));

  /* ⑤ 쓰기 동작 시간 초과 — 반영됐으면 «처리됐어요» */
  await pg.evaluate(() => { localStorage.setItem('me_token', 'TOK'); loadMyState(); }); await pg.waitForTimeout(1400);
  GAS.getMyState = { json: STATE({ balance: { status: '완료신호', confirmed: false } }) };
  GAS.balanceSignal = { hold: 2500, json: { ok: true } };
  const runSig = () => pg.evaluate(() => {
    window.__alerts = []; window.__toasts = [];
    const om = window.mpModalOpen; if (!om.__w) { const w = function (o) { window.__alerts.push(o); return om.apply(this, arguments); }; w.__w = true; window.mpModalOpen = w; }
    const ot = window._miniToast; if (!ot.__w) { const w2 = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); }; w2.__w = true; window._miniToast = w2; }
    if (!window.__apiW) { window.__apiW = 1; const oa = window.api; window.api = function (p) { return p && p.action === 'balanceSignal' ? _post(p, 400) : oa(p); }; }
    let box = document.getElementById('__sig'); if (box) box.remove(); box = document.createElement('div'); box.id = '__sig';
    box.innerHTML = '<input id="mp_bPayer" value="김희준"><button id="mp_bSignal">입금했어요</button>'; document.body.appendChild(box);
    doBalanceSignal();
  });
  await runSig(); await pg.waitForTimeout(900);
  const veil = await pg.evaluate(() => { const v = document.getElementById('flow_busy'); if (!v) return { none: true }; const b = v.querySelector('.flow-busy-box'), r = b.getBoundingClientRect();
    return { parts: [...v.querySelectorAll('.ln-bal')].map((x) => x.textContent), lines: [...v.querySelectorAll('.ln-bal')].map((x) => Math.round(x.getBoundingClientRect().height / parseFloat(getComputedStyle(x).lineHeight))), inside: r.left >= 12 && r.right <= innerWidth - 12 }; });
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, 'veil-360.png') });
  ok('⑤ 시간 초과(결과 모름) → 베일 «응답이 늦어요.» / «처리됐는지 확인하고 있어요» — 저절로 다시 확인하는 중간 줄엔 코드 없음 [ERR_MID_NOCODE] · 문장마다 한 줄 · 화면 가장자리에 안 붙는다(360)', !veil.none && veil.parts.join('|') === '응답이 늦어요.|처리됐는지 확인하고 있어요' && veil.lines.every((n) => n === 1) && veil.inside, JSON.stringify(veil));
  await pg.waitForTimeout(3600);
  const done = await pg.evaluate(() => ({ toasts: window.__toasts.slice(), alerts: window.__alerts.map((o) => o.title + ' / ' + (o.body || '')), veil: !!document.getElementById('flow_busy') }));
  ok('⑤ 상태를 다시 불러 반영됐으면 «확인했어요 · 처리됐어요» · 실패 판 없음', done.toasts.some((t) => t === '확인했어요 · 처리됐어요') && !done.alerts.length, JSON.stringify(done));
  /* 반영 안 됐으면 — 두 번 본 뒤 «아직 반영되지 않았어요 … (코드 P5)» */
  GAS.getMyState = { json: STATE({ balance: { status: '대기', confirmed: false } }) };
  await pg.waitForTimeout(1500);
  await runSig(); await pg.waitForTimeout(10500);
  const no = await modal(pg);
  ok('⑤ 반영 안 됐으면 «잔금 입금 알림을 보내지 못했어요» / «아직 반영되지 않았어요 · 다시 눌러 주세요 (코드 P5)»', no.open && no.title === '잔금 입금 알림을 보내지 못했어요' && no.body === '아직 반영되지 않았어요 · 다시 눌러 주세요 (코드 P5)', JSON.stringify(no));
  await closeModal(pg); await pg.waitForTimeout(400);
  /* 끊김 — 바로 원인 한 줄(확인할 필요 없다 · 서버에 안 닿았다) */
  GAS.balanceSignal = { abort: 1 };
  await runSig(); await pg.waitForTimeout(1200);
  const nt = await modal(pg);
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, 'alert-360.png') });
  ok('⑤ 끊김 → 제목 = 무엇이 안 됐나 · 본문 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 P6)»', nt.open && nt.title === '잔금 입금 알림을 보내지 못했어요' && nt.body === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 P6)', JSON.stringify(nt));
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(300);
  const ln3 = await lines(pg, '#mpModalBody');
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, 'alert-390.png') });
  ok('⑦ 390 — 실패 알림 판 본문(원인 + 코드) 한 줄', ln3 === 1, 'lines=' + ln3);
  await closeModal(pg); await pg.setViewportSize({ width: 360, height: 800 });
  ok('④⑤ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑥ 빌더 중계 */
await sec('⑥', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window._mpStateD = window._mpStateD || {}; openRitualBuilder({ code: 'ME-SHOT', production: { base: { weddingDate: '2026-10-26' } } }, {}); });
  await pg.waitForTimeout(3500);
  const fr = pg.frames().find((f) => /order-preview\.html/.test(f.url()));
  if (!fr) { ok('⑥ 빌더 창이 떴다', false, '프레임 없음'); }
  else {
    const relay = async (msg, want) => fr.evaluate(([msg, want]) => new Promise((res) => {
      const t = setTimeout(() => res({ timeout: true }), 9000);
      const h = (e) => { if (e.data && e.data.type === want) { clearTimeout(t); window.removeEventListener('message', h); res(e.data); } };
      window.addEventListener('message', h); parent.postMessage(msg, location.origin);
    }), [msg, want]);
    GAS.ritualFileDel = { json: { ok: false } };
    const d0 = await relay({ type: 'momentedit:ritualFileDel', data: { key: 'g0', id: 'F1' } }, 'momentedit:ritualFileDelDone');
    GAS.ritualFileDel = { abort: 1 };
    const d6 = await relay({ type: 'momentedit:ritualFileDel', data: { key: 'g0', id: 'F1' } }, 'momentedit:ritualFileDelDone');
    GAS.ritualFileDel = { json: { ok: false, ecode: 'D4', error: '지우지 못했어요. 다시 눌러 주세요. (코드 D4)' } };
    const d4 = await relay({ type: 'momentedit:ritualFileDel', data: { key: 'g0', id: 'F1' } }, 'momentedit:ritualFileDelDone');
    ok('⑥ ritualFileDel — 지우기(D) «지우지 못했어요 · 다시 눌러 주세요 (코드 D0)» · 끊김 D6 · 서버 D4 그대로(종전 받기와 같은 «불러오지 못했어요»)', d0.error === '지우지 못했어요 · 다시 눌러 주세요 (코드 D0)' && d0.ecode === 'D0' && d6.error === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 D6)' && d6.kind === 'net' && d4.error === '지우지 못했어요. 다시 눌러 주세요 (코드 D4)' && !/불러오지/.test(d0.error + d6.error), JSON.stringify([d0, d6, d4]));
    GAS.ritualFileGet = { abort: 1 };
    const g6 = await relay({ type: 'momentedit:ritualFileGet', data: { key: 'g0', id: 'F1' } }, 'momentedit:ritualFileData');
    GAS.ritualFileGet = { json: { ok: false } };
    const g0 = await relay({ type: 'momentedit:ritualFileGet', data: { key: 'g0', id: 'F1' } }, 'momentedit:ritualFileData');
    ok('⑥ ritualFileGet — 불러오기(L) · 끊김 L6 · 서버 거절 «파일을 불러오지 못했어요 · 다시 눌러 주세요 (코드 L0)»', g6.error === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)' && g0.error === '파일을 불러오지 못했어요 · 다시 눌러 주세요 (코드 L0)', JSON.stringify([g6, g0]));
    GAS.ritualFile = { html: 1 };
    const u7 = await relay({ type: 'momentedit:ritualFile', data: { key: 'g0', tk: 7, name: 'a.mp3', mime: 'audio/mpeg', data: 'data:audio/mpeg;base64,AAAA' } }, 'momentedit:ritualFileDone');
    ok('⑥ ritualFile — 올리기(U) · 서버 답이 깨짐 U7 · 보낸 번호(tk) 그대로', u7.error === '서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 U7)' && u7.tk === 7 && u7.kind === 'bad', JSON.stringify(u7));
    GAS.saveProductionTrack = { json: { ok: false, error: '저장할 내용이 너무 길어요. 12,000자 안으로 줄여 주세요.' } };
    const f0 = await relay({ type: 'momentedit:orderDraft', data: { S: { a: 1 }, summary: {} } }, 'momentedit:orderDraftFail');
    GAS.saveProductionTrack = { json: { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' } };
    const f8 = await relay({ type: 'momentedit:orderDraft', data: { S: { a: 2 }, summary: {} } }, 'momentedit:orderDraftFail');
    GAS.saveProductionTrack = { json: { ok: false, ecode: 'S1', error: '잠시 후 다시 시도해 주세요. (서버 혼잡) (코드 S1)' } };
    const f1 = await relay({ type: 'momentedit:orderDraft', data: { S: { a: 3 }, summary: {} } }, 'momentedit:orderDraftFail');
    ok('⑥ orderDraftFail 이 까닭을 싣는다 — 서버 글 그대로(0 은 글에 코드 없이 · ecode S0 칸) · 로그인 풀림 sess · S8 · 새 서버 코드는 한 번만', f0.msg === '저장할 내용이 너무 길어요. 12,000자 안으로 줄여 주세요.' && f0.ecode === 'S0' && f0.sess === false && f8.sess === true && f8.ecode === 'S8' && /\(코드 S8\)$/.test(f8.msg) && f1.msg === '잠시 후 다시 시도해 주세요. (서버 혼잡) (코드 S1)', JSON.stringify([f0, f8, f1]));
    GAS.saveProductionTrack = { abort: 1 };
    const s6 = await relay({ type: 'momentedit:orderSave', data: { S: { a: 4 }, summary: {} } }, 'momentedit:orderSaveFail');
    ok('⑥ orderSaveFail — 끊김 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 S6)»(종전 «네트워크를 확인하고») · ecode · kind', s6.msg === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 S6)' && s6.ecode === 'S6' && s6.kind === 'net', JSON.stringify(s6));
  }
  ok('⑥ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑧ 카드 승인 확인(F11) — 결과를 모르면 주소의 결제 정보(paymentKey)를 지우지 않고 «다시 확인» · 분명한 답이 오면 그때 정리 */
await sec('⑧', async () => {
  GAS = { getMyState: { json: STATE() }, cardConfirm: { abort: 1 } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  const RET = `${BASE}/mypage.html?me_pay=1&m=${encodeURIComponent('잔금')}&paymentKey=pk_1&orderId=ME1&amount=330000`;
  await pg.goto(RET); await pg.waitForTimeout(1800);
  const r1 = await modal(pg), u1 = await pg.evaluate(() => location.search);
  ok('⑧ 승인 확인이 끊기면 «결제 확인이 끝나지 않았어요» · «연결이 끊겼어요 · 다시 확인을 눌러 주세요 (코드 P6)» · «다시 확인» · 주소의 paymentKey 그대로 [F11]', r1.open && r1.title === '결제 확인이 끝나지 않았어요' && r1.body.startsWith('연결이 끊겼어요 · 다시 확인을 눌러 주세요 (코드 P6)') && r1.btns[0] === '다시 확인' && /paymentKey=pk_1/.test(u1), JSON.stringify([r1, u1]));
  GAS.cardConfirm = { json: { ok: true } };
  await pg.evaluate(() => document.querySelector('#mpModalActions button').click()); await pg.waitForTimeout(1500);
  const r2 = await modal(pg), u2 = await pg.evaluate(() => location.search);
  ok('⑧ «다시 확인» → 승인되면 «결제가 완료됐어요» · 그때 주소를 정리한다', r2.open && r2.title === '결제가 완료됐어요' && !/paymentKey/.test(u2), JSON.stringify([r2, u2]));
  /* 서버가 «결과 모름»(5)을 알려도 주소를 둔다 · 분명한 거절(0)이면 알리고 정리 */
  GAS.cardConfirm = { json: { ok: false, ecode: 'P5', error: '결제 확인이 늦어지고 있어요. 다시 눌러 주세요. (코드 P5)' } };
  await pg.goto(RET); await pg.waitForTimeout(1800);
  const r3 = await modal(pg), u3 = await pg.evaluate(() => location.search);
  ok('⑧ 서버가 결과 모름(P5)을 알려도 다시 확인 판 · 주소 그대로', r3.open && r3.title === '결제 확인이 끝나지 않았어요' && /\(코드 P5\)/.test(r3.body) && /paymentKey=pk_1/.test(u3), JSON.stringify([r3, u3]));
  GAS.cardConfirm = { json: { ok: false, ecode: 'P0', error: '결제 금액이 맞지 않아요. 디렉터가 확인해 드릴게요.' } };
  await pg.goto(RET); await pg.waitForTimeout(1800);
  const r4 = await modal(pg), u4 = await pg.evaluate(() => location.search);
  ok('⑧ 서버가 분명히 거절(P0)하면 «결제 확인에 실패했어요» · 서버 글 그대로(코드 없이 [ERR_SRV_REASON]) · 주소 정리', r4.open && r4.title === '결제 확인에 실패했어요' && r4.body === '결제 금액이 맞지 않아요. 디렉터가 확인해 드릴게요.' && !/paymentKey/.test(u4), JSON.stringify([r4, u4]));
  ok('⑧ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ★★[ERR_SRV_REASON · ERR_CODE_DOT · ERR_CODE_NOWRAP · 2026-10-07 1라운드 «라운드별로 개선책이 없을 때까지»] 1라운드에서 찾은 마이페이지 실패 자리(#1~#19) —
   고친 것마다 «되돌리면 빨강»이 되게 잰다. 번호는 1라운드 보고(triage-mypage)의 번호 */

/* ⑨ #1 #10 토스 복귀 — failUrl 의 code 로 까닭을 가른다(PAY_FAIL_KIND) · 성공 주소에 결제 정보가 빠지면 알린다(PAY_RET_EMPTY) · 승인 거절은 토스 코드를 P4 옆에 */
await sec('⑨', async () => {
  GAS = { getMyState: { json: STATE() }, cardConfirm: { json: { ok: true } } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  const ret = async (q, shot) => { seen.length = 0; await pg.goto(`${BASE}/mypage.html?${q}`); await pg.waitForTimeout(1700);
    const m = await modal(pg), u = await pg.evaluate(() => location.search), one = await pg.evaluate(() => { const c = document.querySelector('#mpModalBody .err-code'); return c ? c.getClientRects().length : -1; }), br = await pg.evaluate(() => document.querySelectorAll('#mpModalBody br').length);
    if (shot && process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, shot) });
    await closeModal(pg); await pg.waitForTimeout(300); return Object.assign({ u, confirm: seen.includes('cardConfirm'), one, br }, m); };
  const k0 = await ret('me_pay=0&code=PAY_PROCESS_CANCELED'), k1 = await ret('me_pay=0');
  const k4 = await ret('me_pay=0&code=REJECT_CARD_COMPANY&message=x', 'payfail-p4-390.png');
  const k5 = await ret('me_pay=0&code=PAY_PROCESS_ABORTED'), kx = await ret('me_pay=0&code=FOO_ERROR');
  ok('⑨ 고객이 닫음(PAY_PROCESS_CANCELED · 코드 없음)만 «결제를 취소했어요»(코드 없음) [PAY_FAIL_KIND]', k0.body === '결제를 취소했어요. 필요하면 언제든 다시 하실 수 있어요.' && k1.body === k0.body, JSON.stringify([k0, k1]));
  ok('⑨ 카드사 거절 → «카드사에서 결제를 받지 않았어요» / «다른 카드로 해 주세요 (코드 P4 · REJECT_CARD_COMPANY)» · 코드는 한 덩어리 [PAY_FAIL_KIND]', k4.body === '카드사에서 결제를 받지 않았어요다른 카드로 해 주세요 (코드 P4 · REJECT_CARD_COMPANY)' && k4.one === 1 && k4.br === 1, JSON.stringify(k4));
  ok('⑨ 결제 중단 → «결제가 중간에 끊겼어요» / «돈은 나가지 않았어요 (코드 P5)» · 그 밖 → «결제가 되지 않았어요» / «… (코드 P0 · 토스코드)» [PAY_FAIL_KIND]', k5.body === '결제가 중간에 끊겼어요돈은 나가지 않았어요 (코드 P5)' && kx.body === '결제가 되지 않았어요다시 누르시거나 계좌이체로 해 주세요 (코드 P0 · FOO_ERROR)', JSON.stringify([k5, kx]));
  ok('⑨ failUrl 갈래는 승인 확인을 부르지 않고 주소를 정리한다', [k0, k1, k4, k5, kx].every((k) => !k.confirm && k.u === ''), JSON.stringify([k0, k4, kx].map((k) => [k.confirm, k.u])));
  const ke = await ret(`me_pay=1&m=${encodeURIComponent('잔금')}&paymentKey=pk_1`);
  ok('⑨ 성공 주소에 결제 정보가 빠지면 말없이 지우지 않고 «결제 정보를 받지 못했어요» / «다시 결제해 주세요 (코드 P0)» · 승인 확인 안 부름 [PAY_RET_EMPTY]', ke.open && ke.body === '결제 정보를 받지 못했어요다시 결제해 주세요 (코드 P0)' && !ke.confirm && ke.u === '', JSON.stringify(ke));
  GAS.cardConfirm = { json: { ok: false, ecode: 'P4', tossCode: 'REJECT_CARD_COMPANY', error: '결제 승인에 실패했습니다. 한도가 부족해요 (코드 P4)' } };
  const kc = await ret(`me_pay=1&m=${encodeURIComponent('잔금')}&paymentKey=pk_1&orderId=ME1&amount=330000`);
  ok('⑨ 승인에서 토스가 거절(P4 · tossCode) → 서버 글 + «(코드 P4 · REJECT_CARD_COMPANY)» [PAY_FAIL_KIND]', kc.title === '결제 확인에 실패했어요' && kc.body === '결제 승인에 실패했습니다. 한도가 부족해요 (코드 P4 · REJECT_CARD_COMPANY)', JSON.stringify(kc));
  ok('⑨ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑩ #2 #3 좌석 — 인원 파생 저장에 «보낼 것이 없다»는 실패가 아니다(SEAT_FIN_SKIP) · 진짜 실패는 칸 아래 줄에도 코드 */
await sec('⑩', async () => {
  GAS = { getMyState: { json: STATE() }, saveProductionTrack: { json: { ok: true } } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const a = await pg.evaluate(async () => {
    SEATFLOW.tables = [{ name: '테이블 1', side: 'L', seats: ['', ''], drinks: ['C', ''] }]; SEATFLOW.fd = {};
    const fin = await _seatFinSave(), sv = await saveSeat(false);
    const st = document.createElement('div'); document.body.appendChild(st); _seatNoteSave(st); await new Promise((r) => setTimeout(r, 400));
    return { fin, sv: { ok: !!(sv && sv.ok), error: (sv && sv.error) || '' }, st: st.textContent };
  });
  ok('⑩ 이름이 아직 없는 좌석 저장 → 파생 저장은 skip(실패 아님) · 좌석 저장은 성공 — 거짓 «인원·요금이 저장되지 않았어요» 없음 [SEAT_FIN_SKIP]', a.fin && a.fin.ok === true && a.fin.skip === 1 && a.sv.ok && !a.sv.error, JSON.stringify(a));
  ok('⑩ 「미리 알려주실 것」을 이름보다 먼저 적으면 «자리에 이름을 한 분 이상 적으면 함께 저장돼요»(실패 · 코드 아님) [SEAT_FIN_SKIP]', a.st === '자리에 이름을 한 분 이상 적으면 함께 저장돼요', a.st);
  GAS.saveProductionTrack = (p) => (p.track === 'final' ? { abort: 1 } : { json: { ok: true } });
  const b = await pg.evaluate(async () => {
    SEATFLOW.tables = [{ name: '테이블 1', side: 'L', seats: ['김희준', ''], drinks: ['C', ''] }]; SEATFLOW.fd = {};
    const sv = await saveSeat(false);
    const st = document.createElement('div'); document.body.appendChild(st); _seatNoteSave(st); await new Promise((r) => setTimeout(r, 900));
    return { sv: { ok: !!(sv && sv.ok), error: (sv && sv.error) || '', ecode: sv && sv.ecode, seatOk: !!(sv && sv._seatOk) }, st: st.textContent, chunk: !!st.querySelector('.err-code') };
  });
  ok('⑩ 파생 저장이 끊기면 «인원·요금이 저장되지 않았어요 · 한 번 더 저장해 주세요 (코드 S6)» · 칸 아래 줄에도 «(코드 S6)»(알림이 사라진 뒤에도) [SEAT_FIN_SKIP]', !b.sv.ok && b.sv.error === '인원·요금이 저장되지 않았어요 · 한 번 더 저장해 주세요 (코드 S6)' && b.sv.ecode === 'S6' && b.sv.seatOk && b.st === '저장이 안 됐어요 · 다시 적어 주세요 (코드 S6)' && b.chunk, JSON.stringify(b));
  ok('⑩ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑪ #9 #6 스냅 기획 — 올린 사진 작은 그림 실패를 삼키지 않는다(SNAP_THUMB_FAIL) · 장면 목록을 못 받으면 카드가 사라지지 않는다(SNAP_REFS_MISS) */
await sec('⑪', async () => {
  GAS = { getMyState: { json: STATE() }, snapThumbs: { abort: 1 } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const SD = { v: 2, zones: { candle: { picks: [], ups: [{ id: 'U1', th: 'T1', n: 'a.jpg' }], links: [] }, white: { picks: [], ups: [], links: [] } }, note: '' };
  const P = { base: { weddingDate: '2026-12-20' }, snapPick: 8, snapV2: true };
  const snap = async (shot) => { await pg.evaluate(([sd, p]) => { startSnapFlow(sd, p, false, { step: 1 }); }, [SD, P]); await pg.waitForTimeout(1300);
    const o = await pg.evaluate(() => ({ ph: [...document.querySelectorAll('#mp_snapInner .snp-up .snp-ph')].map((x) => x.textContent), err: (document.querySelector('#mp_snapInner .snp-err[role=status]') || {}).textContent || '' }));
    if (shot && process.env.SHOTS) { await pg.evaluate(() => { const e = document.querySelector('#mp_snapInner .snp-ups'); if (e) e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(200); await pg.screenshot({ path: path.join(process.env.SHOTS, shot) }); }
    await pg.evaluate(() => { _snapTearDown(); }); return o; };
  const s6 = await snap('snapthumb-390.png');
  ok('⑪ 작은 그림을 못 받으면(끊김) 칸 «못 불러왔어요» · 아래 «연결이 끊겼어요 · 다시 열어 주세요 (코드 L6)» — «불러오는 중» 고착 없음 [SNAP_THUMB_FAIL]', s6.ph.join('|') === '못 불러왔어요' && s6.err === '연결이 끊겼어요 · 다시 열어 주세요 (코드 L6)', JSON.stringify(s6));
  GAS.snapThumbs = { json: { ok: true, thumbs: {} } };
  const s4 = await snap();
  ok('⑪ 서버가 답했는데 그림이 빠지면(드라이브) «올린 사진을 불러오지 못했어요 · 다시 열어 주세요 (코드 L4)» [SNAP_THUMB_FAIL]', s4.ph.join('|') === '못 불러왔어요' && s4.err === '올린 사진을 불러오지 못했어요 · 다시 열어 주세요 (코드 L4)', JSON.stringify(s4));
  GAS.snapThumbs = { json: { ok: true, thumbs: { T1: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' } } };
  const sOk = await snap();
  ok('⑪ 받으면 그림 · 실패 줄 없음', !sOk.ph.length && !sOk.err, JSON.stringify(sOk));
  const card = await pg.evaluate(() => { const R = window.SNAP_REFS; window.SNAP_REFS = undefined; window._mpStateD = Object.assign({}, window._mpStateD || {}, { stage: '제작중' });
    let o; try { renderSnap({ snapV2: true, base: { weddingDate: '2026-12-20' }, snapDraft: {} }); const b = document.getElementById('mp_snap'); o = { shown: b.style.display !== 'none', text: b.textContent }; } finally { window.SNAP_REFS = R; } return o; });
  ok('⑪ 장면 목록(snap-refs.js)을 못 받으면 카드가 말없이 사라지지 않고 «장면 목록을 불러오지 못했어요 · 새로고침해 주세요 (코드 L6)» [SNAP_REFS_MISS]', card.shown && /장면 목록을 불러오지 못했어요 · 새로고침해 주세요 \(코드 L6\)/.test(card.text), JSON.stringify(card));
  ok('⑪ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑫ #7 #5 #17 QR · 이미지 창 · 처리방침 창 — 못 불러온 것을 «준비 중»으로 말하지 않는다 · 같은 꼴 */
await sec('⑫', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  let pvHits = 0;
  await ctx.route('**/shared/qrcode.min.js', (rt) => rt.abort('failed'));
  await ctx.route('**/privacy.html', (rt) => { pvHits++; return rt.fulfill({ status: 404, contentType: 'text/html', body: '<!doctype html><title>404</title><p>없음</p>' }); });
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const q = await pg.evaluate(() => new Promise((res) => { const d = document.createElement('div'); d.id = 'qq_t'; document.body.appendChild(d); ensureQR(function () { renderQRInto('qq_t', '', 'https://momentedit.kr/g/abc'); res(d.textContent); }); }));
  ok('⑫ QR 도구를 못 받으면 «준비 중» 대신 «QR을 불러오지 못했어요 · 아래 주소를 전달해 주세요 (코드 L6)» + 주소 [QR_LOAD_FAIL]', q === 'QR을 불러오지 못했어요 · 아래 주소를 전달해 주세요 (코드 L6)https://momentedit.kr/g/abc', q);
  const qi = await pg.evaluate(() => new Promise((res) => { const d = document.createElement('div'); d.id = 'iv_qr'; document.body.appendChild(d); ensureQR(function () { renderInvQR('https://momentedit.kr/i/abc'); res(d.textContent); }); }));
  ok('⑫ 청첩장 QR 도 같은 앞말 · 할 일만 그 자리 말(«인쇄물엔 아래 주소를 넣어 주세요») [QR_LOAD_FAIL]', qi === 'QR을 불러오지 못했어요 · 인쇄물엔 아래 주소를 넣어 주세요 (코드 L6)https://momentedit.kr/i/abc', qi);
  await pg.evaluate(() => mpImgView('/assets/__nope__.png', '예시')); await pg.waitForTimeout(900);
  const iv = await pg.evaluate(() => (document.querySelector('#pvBody .pv-modal-err') || {}).textContent || '');
  ok('⑫ 이미지 창 — 그림을 못 받으면 «이미지를 불러오지 못했어요 · 다시 열어 주세요 (코드 L6)» [PV_IMG_CODE]', iv === '이미지를 불러오지 못했어요 · 다시 열어 주세요 (코드 L6)', iv);
  await pg.evaluate(() => { const m = document.getElementById('pvModal'); if (m && m._close) m._close(); });
  await pg.evaluate(() => showContractPrivacy()); await pg.waitForTimeout(900);
  const pv1 = await pg.evaluate(() => (document.getElementById('mp_privacyBody') || {}).textContent || '');
  await pg.evaluate(() => { document.getElementById('mp_privacyOverlay').style.display = 'none'; showContractPrivacy(); }); await pg.waitForTimeout(900);
  ok('⑫ 처리방침 창 — 오류 응답(404)도 «불러오지 못했어요 (코드 L7)» + 새 창에서 보기(L6 과 같은 꼴) · 실패 화면을 담아 두지 않아 다시 열면 다시 받는다 [PRIVACY_FAIL_ONE]', pv1 === '불러오지 못했어요 (코드 L7)새 창에서 보기' && pvHits === 2, pv1 + ' · hits=' + pvHits);
  ok('⑫ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑬ #8 #4 나가기 판에도 코드(WIZ_EXIT_CODE) · 서버가 보낸 칸을 버리면 S3(ECHO_LOST_CODE) */
await sec('⑬', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window._mpStateD = { production: { base: { weddingDate: '2026-10-26' }, tracks: {} } }; show('mypageView'); const b = document.getElementById('mp_production'); if (b) b.style.display = 'block'; });
  GAS.saveProductionTrack = { abort: 1 };
  await pg.evaluate(() => { startTrkFlow('dining', { venuePick: '다이닝 없이 진행할게요', dining_on: 'N', _step: 1 }, { weddingDate: '2026-10-26' }); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => _wizSave()); await pg.waitForTimeout(1300);
  await pg.evaluate(() => _wizExit()); await pg.waitForTimeout(700);
  const m = await modal(pg);
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, 'wizexit-390.png') });
  ok('⑬ 저장이 실패한 뒤 «나가기» 판에도 까닭 코드 — «방금 저장이 실패했어요 (코드 S6)» / «다시 저장하고 나갈까요?» [WIZ_EXIT_CODE]', m.open && m.title === '저장이 아직 안 됐어요' && m.body === '방금 저장이 실패했어요 (코드 S6)다시 저장하고 나갈까요?', JSON.stringify(m));
  await pg.evaluate(() => { const g = document.querySelectorAll('#mpModalActions button'); g[g.length - 1].click(); }); await pg.waitForTimeout(800);
  GAS.saveProductionTrack = { json: { ok: true, draft: {} } };
  await pg.evaluate(() => { window._echoWarned = false; apiTrackSave({ action: 'saveProductionTrack', token: 'TOK', track: 'zz', draft: { venuePick: 'A' } }); }); await pg.waitForTimeout(1000);
  const e3 = await modal(pg);
  ok('⑬ 서버(옛 GAS)가 보낸 칸을 버리면 «입력하신 항목 중 일부가 저장되지 않았어요 (코드 S3)» + 할 일 한 줄 [ECHO_LOST_CODE]', e3.open && e3.body === '입력하신 항목 중 일부가 저장되지 않았어요 (코드 S3)새로고침 후 한 번 더 저장해 보시고, 계속되면 카카오톡으로 알려 주세요', JSON.stringify(e3));
  await closeModal(pg);
  ok('⑬ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑭ #11 «불러오는 중» 화면에서 조용한(silent) 받기가 실패해도 스피너가 끝난다(LOAD_FAIL_SPIN) · 서버 까닭(0)은 코드 없이 */
await sec('⑭', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  GAS.getMyState = { abort: 1 };
  await pg.evaluate(() => { try { localStorage.removeItem('me_state_v1'); } catch (e) {} show('loading'); loadMyState({ silent: true }); }); await pg.waitForTimeout(1300);
  const a = await pg.evaluate(() => ({ retry: !!document.getElementById('mp_retryLoad'), text: (document.querySelector('#loading > div') || {}).textContent || '' }));
  ok('⑭ «불러오는 중»에서 silent 받기가 끊겨도 다시 불러오기 화면 «연결이 끊겼어요 · 다시 불러와 주세요 (코드 L6)» — 스피너가 끝나지 않던 길 [LOAD_FAIL_SPIN]', a.retry && a.text === '연결이 끊겼어요 · 다시 불러와 주세요 (코드 L6)', JSON.stringify(a));
  GAS.getMyState = { json: { ok: false, ecode: 'L0', error: '고객 정보를 찾지 못했어요.' } };
  await pg.evaluate(() => { document.getElementById('mp_retryLoad').click(); }); await pg.waitForTimeout(1300);
  const b = await pg.evaluate(() => (document.getElementById('loading') || {}).innerText || '');
  ok('⑭ 서버 까닭 글(0)이면 코드 없이 · 아래 줄도 «이 코드를»이라 하지 않는다 [ERR_SRV_REASON]', /고객 정보를 찾지 못했어요\./.test(b) && !/\(코드/.test(b) && /계속 안 되면 카카오톡으로 알려 주세요/.test(b) && !/이 코드를/.test(b), b);
  ok('⑭ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑮ [ERR_CODE_NOWRAP] 360 — 실패 줄이 두세 줄로 바뀌어도 «(코드 S9 · 7KQ2)»는 한 덩어리(로그인 칸 · 알림 · 위저드 오류 줄 · 판 본문)
   덧붙이는 낱말 수를 바꿔 가며(줄 끝이 코드 위를 지나가게) 잰다 — nowrap 을 걷으면 어느 한 길이에서 «(코드 / S9 · 7KQ2)»로 갈린다 */
await sec('⑮', async () => {
  GAS = { getMyState: { json: STATE() } };
  const { ctx, pg, errs } = await open(360, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const lines = (rects) => { const tops = []; for (const b of rects) { if (b.width < 0.5) continue; if (!tops.some((t) => Math.abs(t - b.top) < 4)) tops.push(b.top); } return tops.length; };
    window.__codeLines = function (el) {
      const out = { lines: 0, elLines: 0, text: el ? el.textContent : '' }; if (!el) return out;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = []; let full = '';
      while (tw.nextNode()) { nodes.push({ n: tw.currentNode, s: full.length }); full += tw.currentNode.nodeValue; }
      const i = full.lastIndexOf('(코드'), j = i < 0 ? -1 : full.indexOf(')', i); if (j < 0) return out;
      const at = (k) => { for (let a = nodes.length - 1; a >= 0; a--) if (nodes[a].s <= k) return [nodes[a].n, k - nodes[a].s]; return null; };
      const s0 = at(i), s1 = at(j), r = document.createRange(); r.setStart(s0[0], s0[1]); r.setEnd(s1[0], s1[1] + 1); out.lines = lines(r.getClientRects());
      const r2 = document.createRange(); r2.selectNodeContents(el); out.elLines = lines(r2.getClientRects()); return out;
    };
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:16px;bottom:120px;width:300px;font-family:var(--serif-ko);font-size:12px;line-height:1.6;word-break:keep-all;text-align:center;background:#fff;z-index:13000';
    box.innerHTML = '<div id="seat_err" class="wz-err" role="alert"></div>'; document.body.appendChild(box);
    show('loginView');
  });
  const L = (k) => '저장이 안 됐어요' + ' 가'.repeat(k) + ' · 다시 눌러 주세요 (코드 S9 · 7KQ2)';
  const run = async (name, put, find, n) => { let worst = { lines: 0 }, wrapped = 0, same = true;
    for (let k = 0; k < n; k++) { const t = L(k); await put(t); const r = await find(t); if (!r) { same = false; continue; } if (r.text !== t) same = false; if (r.elLines > 1) wrapped++; if (r.lines > worst.lines) worst = Object.assign({ k }, r); }
    ok(`⑮ 360 ${name} — 줄이 바뀌어도 «(코드 S9 · 7KQ2)»는 한 덩어리 · 글은 그대로 [ERR_CODE_NOWRAP]`, worst.lines === 1 && wrapped > 0 && same, JSON.stringify({ worst, wrapped, same })); };
  await run('로그인 칸(showErr)', (t) => pg.evaluate((t) => showErr('li_err', t), t), () => pg.evaluate(() => __codeLines(document.getElementById('li_err'))), 26);
  await run('알림(_errToast)', async (t) => { await pg.evaluate((t) => _errToast(t), t); await pg.waitForTimeout(70); },
    (t) => pg.evaluate((t) => { const a = [...document.querySelectorAll('body > div[role=status]')].filter((d) => d.textContent === t); return a.length ? __codeLines(a[a.length - 1]) : null; }, t), 26);
  await run('위저드 오류 줄(_seatErr)', (t) => pg.evaluate((t) => _seatErr(t), t), () => pg.evaluate(() => __codeLines(document.getElementById('seat_err'))), 26);
  const tw = await pg.evaluate(async () => { const t = '미리 알려주실 것이 저장되지 않았어요 (코드 S6)'; _errToast(t); await new Promise((r) => setTimeout(r, 80));
    const a = [...document.querySelectorAll('body > div[role=status]')].filter((d) => d.textContent === t), el = a[a.length - 1]; if (!el) return { none: true };
    const b = el.getBoundingClientRect(); return { w: Math.round(b.width), vw: innerWidth, inside: b.left >= 0 && b.right <= innerWidth }; });
  ok('⑮ 360 알림(_miniToast)은 화면 반쪽에 갇히지 않는다 — 긴 실패 줄이 세 줄로 접히지 않게 너비를 연다(max-content · 86vw 안) [MINI_TOAST_WIDE]', !tw.none && tw.w > tw.vw * 0.6 && tw.inside, JSON.stringify(tw));
  await pg.evaluate(() => show('mypageView'));   // 판(#mpModal)은 마이페이지 화면 안에 있다 — 로그인 화면에선 그려지지 않는다
  await run('판 본문(mpAlert 글)', async (t) => { await pg.evaluate((t) => { mpAlert(t); }, t); await pg.waitForTimeout(60); },
    async () => { const r = await pg.evaluate(() => __codeLines(document.getElementById('mpModalBody'))); await closeModal(pg); await pg.waitForTimeout(80); return r; }, 14);
  if (process.env.SHOTS) { await pg.evaluate((t) => { document.querySelectorAll('body > div[role=status]').forEach((d) => d.remove()); const sb = document.getElementById('seat_err'); if (sb && sb.parentNode) sb.parentNode.remove(); show('loginView'); showErr('li_err', t); document.getElementById('li_err').scrollIntoView({ block: 'center' }); }, L(9)); await pg.waitForTimeout(250); await pg.screenshot({ path: path.join(process.env.SHOTS, 'nowrap-login-360.png') }); }
  ok('⑮ 화면 오류 0', !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
});

/* ⑯ [INV_PUB_AGAIN 2026-10-08 점검 R2] 청첩장 발행 시간 초과 — 한 번 저절로 다시 보내 결과를 받는다 · 두 번 다 늦으면 S5 */
await sec('⑯', async () => {
  let n = 0;
  GAS = { getMyState: { json: STATE() }, publishInvitation: () => (++n === 1 ? { hold: 1500, json: { ok: true, skipped: true } } : { json: { ok: true, skipped: true } }) };
  const { ctx, pg } = await open(390, "localStorage.setItem('me_token','TOK');");
  await pg.goto(`${BASE}/mypage.html`); await pg.waitForTimeout(1500);
  const run = () => pg.evaluate(() => { window.__INV_PUB_MS = 500; window.__toasts = []; const ot = window._miniToast; if (!ot.__w) { const w2 = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); }; w2.__w = true; window._miniToast = w2; }
    INVFLOW.draft = { method: 'none' }; let b = document.getElementById('__ivbox'); if (b) b.remove(); b = document.createElement('div'); b.id = '__ivbox'; b.innerHTML = '<button id="iv_pub">청첩장 만들기</button><p id="iv_err"></p>'; document.body.appendChild(b); doPublishInv(b); });
  await run(); await pg.waitForTimeout(2600);
  const a = await pg.evaluate(() => ({ err: (document.getElementById('iv_err') || {}).textContent || '', step: INVFLOW.step || '' }));
  ok('⑯ 첫 발행이 늦어도 한 번 다시 보내 결과(완료)를 받는다 · S5 없음 [INV_PUB_AGAIN]', n === 2 && !/코드 S5/.test(a.err) && a.step === 'done', JSON.stringify({ n, a }));
  n = 0; GAS.publishInvitation = () => (++n, { hold: 1500, json: { ok: true, skipped: true } });
  await run(); await pg.waitForTimeout(3200);
  const b2 = await pg.evaluate(() => { const b = document.getElementById('iv_pub') || {}; return { err: (document.getElementById('iv_err') || {}).textContent || '', btn: b.textContent || '', dis: !!b.disabled }; });
  ok('⑯ 두 번 다 늦으면 «응답이 늦어요 · 새로고침해 만들어졌는지 확인해 주세요 (코드 S5)» · 단추가 풀린다', n === 2 && /\(코드 S5\)$/.test(b2.err) && !b2.dis && !/중…$/.test(b2.btn), JSON.stringify({ n, b2 }));
  await ctx.close();
});
await br.close(); srv.close();
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
