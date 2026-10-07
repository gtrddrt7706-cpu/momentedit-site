#!/usr/bin/env node
/* ★★[ERR_CODE_BUILDER 2026-10-07 사장님 «다른 부분들도 스크린샷으로 혹은 고객이 오류코드 등을 알려 주면 관리자가 어떤 문제인지 알 수 있게 쓸 수 있을 만한 곳들 조사해서 전부 개선해 보자»]
   식순 화면(order-preview) 실패 글이 «무슨 일 · 할 일 (코드 X#)» 한 줄로 나오는지 실브라우저로 잰다 — AI 목소리(VC_DOWN_KIND)의 다음 판.
   글자 = 어디서(V 목소리 · U 올리기 · D 지우기 · S 저장 · L 불러오기 · M 기기) · 숫자 = 무슨 일(0 거절 · 4 처리 실패 · 5 늦음 · 6 연결 · 7 깨진 답 · 8 로그인 …)
   ① 받는 자리(_ecLine) — 서버 코드는 그대로(두 번 안 붙임) · 옛 마이페이지 글 · ecode · kind · reason → 맞는 코드
   ② F2 목소리 정보를 못 받음 → 만들기 단추 없음 · 까닭(V 코드) · «다시 불러오기» → 누르면 카드 · 순간 쪽도 · 로그인 → V8
   ③ F3 올리기 실패 → 녹음 창 안 빨간 글(U 코드 · 중립 글 아님) · «이걸로 쓰기»로 돌아옴 · 75초 → U5 · AI 줄은 그 줄 아래 한 번
   ④ F4 머리 «저장» 실패 → «다시 저장» + 까닭 알림 · title(S 코드) · 16초 → S5 · 로그인 → S8 · 완성 저장 · 나가기 판
   ⑤ F5 마이크 M1 · M2 · M3 · M5 · start 실패(창이 숫자에서 멈추지 않음) — 1분 읽기에는 «파일 올리기»를 권하지 않는다
   ⑥ F6 ▶ 파일 받기 실패 → 그 줄 아래 L 코드 · 이 기기에 없는 녹음 · ▶ 실패(못 엶 M6 · 파일 없음 L0 · 연결 L6 · 막힘 M7)는 ■ 를 ▶ 로
   ⑦ F7 지우기 실패 → 한 번 더 · «지우지 못해 남아 있어요 … (코드 D#)» · 줄이 되돌아옴 · 내려놓은 파일은 «… 문의해 주세요»
   ⑧ F8 · F10 · F12 빈 녹음 · 문맥 못 만듦 · 못 여는 파일 · 받은 소리를 못 풂(M6) · 60초 문구 · 1분 읽기 파일 읽기 실패 · 다시 만들기 알림
   ⑨ F9 차례마다 까닭 코드 · 예산 한 줄 · F11 녹음 목록 실패(L 코드 · 다시 받기) · 엔진 실패 · «이 순간 들어 보기» 소리가 전부 없음(L0) · 소리 요소 까닭(_mediaCode)
   ⑩ 360px 폰 한 줄(줄 카드 · 목소리 쪽 · 녹음 창) · 장식 이모지 · 전각 줄표 없음
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SRC = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
/* 정적 — 옛 글이 돌아오지 않았나 */
ok('정적 · 옛 실패 글 없음(«응답이 없어요» · «만든 소리를 받지 못했어요» · 마이크 «파일»로 · «저장 확인이 오지 않았어요. 네트워크를»)',
  !/MK\.toast='응답이 없어요/.test(SRC) && !/'만든 소리를 받지 못했어요/.test(SRC) && !/음성 메모로 녹음해 «파일»로/.test(SRC) && !/'저장 확인이 오지 않았어요\. 네트워크를/.test(SRC) && !/MK\.toast=ev\.data\.error\|\|'지우지 못했어요'/.test(SRC));
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const FLAG = { failRec: false, failEng: false };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (FLAG.failRec && u === '/assets/audio/narration/_recorded.json') { r.writeHead(500); r.end('x'); return; }
  if (FLAG.failEng && u === '/assets/ritual-cue.js') { r.writeHead(500); r.end('x'); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const ST_OK = { ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: {}, per: {} };
const BAD = /[—\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(w) {
  const ctx = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  /* 부모(마이페이지 + 서버) 흉내 — 보낸 종류마다 __mock[type](data) 가 답을 정한다(null = 답 없음) */
  await pg.evaluate((st) => { window.__mock = {}; window.__sent = [];
    const R = { 'momentedit:voiceClone': (d, o) => Object.assign({ type: 'momentedit:voiceCloneDone', rid: d.rid }, o),
      'momentedit:ritualFile': (d, o) => Object.assign({ type: 'momentedit:ritualFileDone', key: d.key, tk: d.tk }, o),
      'momentedit:ritualFileGet': (d, o) => Object.assign({ type: 'momentedit:ritualFileData', key: d.key, id: d.id }, o),
      'momentedit:ritualFileDel': (d, o) => Object.assign({ type: 'momentedit:ritualFileDelDone', key: d.key, id: d.id }, o),
      'momentedit:orderDraft': (d, o) => Object.assign({ type: o.ok ? 'momentedit:orderDraftSaved' : 'momentedit:orderDraftFail', pull: null }, o),
      'momentedit:orderSave': (d, o) => Object.assign({ type: o.ok ? 'momentedit:orderSaved' : 'momentedit:orderSaveFail', pull: null }, o) };
    window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? st : { ok: false, error: 'x' });
    window.addEventListener('message', (ev) => { const m = ev.data; if (!m || !R[m.type]) return; window.__sent.push(m.type); const f = window.__mock[m.type]; if (!f) return; const o = f(m.data || {}); if (!o) return;
      setTimeout(() => window.postMessage(R[m.type](m.data || {}, JSON.parse(JSON.stringify(o))), location.origin), 30); });
    window.__shrink = (map) => { const o = window.__st0 || (window.__st0 = window.setTimeout); window.setTimeout = function (f, ms) { const a = [].slice.call(arguments, 2); return o.apply(window, [f, map[ms] != null ? map[ms] : ms].concat(a)); }; };
    window.__unshrink = () => { if (window.__st0) window.setTimeout = window.__st0; };
    window.__wav = (sec, sr) => RecProcess.wav(new Float32Array(Math.round(sec * sr)).map((x, i) => 0.2 * Math.sin(i / 8)), sr);
    window.__b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window.__lines = (el) => { if (!el) return 0; const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.6; return Math.round(el.getBoundingClientRect().height / lh); };
    window.__N = (s) => String(s == null ? '' : s).replace(/ /g, ' ');   // 화면은 몇 낱말 사이를 붙임 빈칸(_nbWrap)으로 묶는다
    window.__trapToast = () => { window.__toasts = []; let v = MK.toast || ''; Object.defineProperty(MK, 'toast', { configurable: true, get() { return v; }, set(x) { v = x; if (x) window.__toasts.push(x); } }); };
    window.__untrapToast = () => { const v = MK.toast; delete MK.toast; MK.toast = v; };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true; S.on.prevideo = 1; S.vsChip = 1; opSync(); }, ST_OK);
  await nx(); await pg.waitForTimeout(900);
  return { ctx, pg, errs };
}

/* ───────── 390 — 흐름 전부 ───────── */
{
  const { ctx, pg, errs } = await open(390); try {
  /* ① 받는 자리 */
  const u = await pg.evaluate(() => ({
    coded: _ecLine('U', { ok: false, error: '파일을 저장하지 못했어요. 다시 눌러 주세요. (코드 U4)' }),
    coded9: _ecLine('U', { ok: false, error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 U9 · 7KQ2)' }),
    oldNet: _ecLine('U', { ok: false, error: '올리지 못했어요. 연결을 확인하고 다시 눌러 주세요.' }),
    oldGen: _ecLine('U', { ok: false, error: '올리지 못했어요. 다시 눌러 주세요.' }),
    bare: _ecLine('S', {}),
    slow: _ecLine('U', { ok: false, kind: 'slow', error: 'x' }),
    bad: _ecLine('L', { ok: false, kind: 'bad' }),
    sess: _ecLine('S', { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' }),
    ecode: _ecLine('L', { ok: false, error: '파일을 찾을 수 없어요.', ecode: 'L0' }),
    ecodeN: _ecLine('U', { ok: false, error: '한 개에 20MB 까지 올릴 수 있어요.', ecode: 2 }),
    ecodeL: _ecLine('U', { ok: false, error: '이 예식의 파일 자리가 없어요.', ecode: 'X0' }),
    closed: _ecLine('U', { ok: false, closed: true, error: '두 분 목소리 올리기는 아직 준비 중이에요 · 카톡이나 메일로 보내 주세요.' }),
    oldSave: _ecLine('S', { msg: '저장이 안 됐어요. 네트워크를 확인하고 다시 저장해 주세요.' }),
    vSess: _ecLine('V', { ok: false, reason: 'invalid', error: '로그인이 필요해요. 개인코드와 비밀번호로 로그인해 주세요.' }) }));
  const once = Object.values(u).every((t) => (t.match(/\(코드 /g) || []).length === 1 && !BAD.test(t));
  ok('① 서버 코드는 그대로(«. » → « · » · 끝 마침표만 정리) · 두 번 붙이지 않음', u.coded === '파일을 저장하지 못했어요 · 다시 눌러 주세요 (코드 U4)' && u.coded9 === '요청을 처리하지 못했어요 · 잠시 후 다시 시도해 주세요 (코드 U9 · 7KQ2)', u.coded + ' | ' + u.coded9);
  ok('① 옛 마이페이지 글 — «연결을 확인» → 6 · 서버 글 없는 말 → 0 · 아무것도 없음 → 0', u.oldNet === '연결이 끊겨 못 올렸어요 · 다시 눌러 주세요 (코드 U6)' && u.oldGen === '올리지 못했어요 · 다시 눌러 주세요 (코드 U0)' && u.bare === '저장하지 못했어요 · 다시 저장해 주세요 (코드 S0)' && u.oldSave === '연결이 끊겼어요 · 다시 저장해 주세요 (코드 S6)', [u.oldNet, u.oldGen, u.bare, u.oldSave].join(' | '));
  ok('① kind · reason · ecode · closed → 5 · 7 · 8 · 서버 글 + 숫자 · 서버가 준 자리 글자는 그대로(오류기록과 같은 코드)', u.ecodeL === '이 예식의 파일 자리가 없어요 (코드 X0)' && u.slow === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && u.bad === '서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 L7)' && u.sess === '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 S8)' && u.vSess === '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 V8)' && u.ecode === '파일을 찾을 수 없어요 (코드 L0)' && u.ecodeN === '한 개에 20MB 까지 올릴 수 있어요 (코드 U2)' && u.closed === '두 분 목소리 올리기는 아직 준비 중이에요 · 카톡이나 메일로 보내 주세요 (코드 U3)', JSON.stringify(u));
  ok('① 어느 글에도 코드가 꼭 하나 · 장식 이모지 · 전각 줄표 없음', once, JSON.stringify(u));

  /* ② F2 목소리 정보를 못 받음 */
  /* ★[VC_STATUS_RETRY 와 합침] 못 받은 칸은 VC_STATUS_RETRY 의 «불러오지 못했어요 · 지금 다시 불러오기»(_vcErrBox) 하나 — 그 칸 끝에 받은 까닭의 코드.
     이 탭에서 한 번 받은 상태(stLast)가 있으면 그것으로 그린다(그 검사는 vc-status-retry T3) — 여기서는 «받은 적 없음»으로 잰다 */
  await pg.evaluate(() => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? { ok: false, down: true, net: 1, error: '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6)' } : { ok: false, error: 'x' }); VC.st = null; VC.stErr = false; VC.stLast = null; __shrink({ 3000: 40, 8000: 40 }); mkGo('_voice'); });
  await wait(700); await pg.evaluate(() => __unshrink());
  const f2 = await pg.evaluate(() => { const v = document.querySelector('.mk-vpage'), b = v && v.querySelector('.mk-wait'), s = b && b.querySelector('.mk-wait-s');
    return { t: b ? __N((b.querySelector('.mk-wait-t') || {}).textContent) : '', txt: s ? __N(s.textContent) : '', make: v ? v.querySelectorAll('[data-fk^="mkvcok:"]').length : -1, re: !!(v && v.querySelector('[data-fk="mkvcretry"]')), guide: !!(v && v.querySelector('.mk-vsg')), stWhy: VC.stWhy }; });
  ok('② 목소리 정보를 못 받으면 «목소리 만들기» 단추 없음 · «불러오지 못했어요» 칸 끝에 까닭 코드(V6) · «지금 다시 불러오기» · 녹음 길잡이 없음', f2.t === '두 분 목소리 정보를 불러오지 못했어요' && f2.txt === '만든 목소리는 그대로 있어요 · 잠시 뒤 저절로 다시 불러와요 (코드 V6)' && f2.make === 0 && f2.re && !f2.guide && /\(코드 V6\)$/.test(f2.stWhy), JSON.stringify(f2));
  await pg.evaluate((st) => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? st : { ok: false, error: 'x' }); }, ST_OK);
  await pg.evaluate(() => { const b = document.querySelector('[data-fk="mkvcretry"]'); if (b) b.click(); });   /* 단추가 없으면(되돌린 판) 위 검사가 이미 빨강 — 여기서 멈추지 않는다 */ await wait(700);
  const f2b = await pg.evaluate(() => { const v = document.querySelector('.mk-vpage'); return { fail: !!(v && (v.querySelector('.mk-vstf') || v.querySelector('[data-fk="mkvcretry"]'))), make: v ? v.querySelectorAll('[data-fk^="mkvcok:"]').length : -1, tune: !!(v && v.querySelector('[data-fk="mkvctune:groom"]')), stErr: VC.stErr, why: VC.stWhy }; });
  ok('② «지금 다시 불러오기» → 다시 받아 사람 카드(신랑 맞추기 · 신부 만들기) · 까닭은 걷힘', !f2b.fail && f2b.make === 1 && f2b.tune && !f2b.stErr && f2b.why === '', JSON.stringify(f2b));
  await pg.evaluate(() => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' } : { ok: false, error: 'x' }); VC.st = null; VC.stErr = false; VC.stLast = null; render(); });
  await wait(700);
  const f2c = await pg.evaluate(() => { const b = document.querySelector('.mk-vpage .mk-wait'); return { s: b ? __N((b.querySelector('.mk-wait-s') || {}).textContent) : '', role: b ? b.getAttribute('role') : '', bar: !!(b && b.querySelector('.mk-wait-bar')), re: !!document.querySelector('.mk-vpage [data-fk="mkvcretry"]') }; });
  ok('② 로그인이 풀려 못 받음 → 칸에 V8 «로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요» · 움직이는 막대 없음(저절로 안 된다) · role=alert', f2c.s === '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 V8)' && f2c.role === 'alert' && !f2c.bar && f2c.re, JSON.stringify(f2c));
  await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; mkGo('guest'); });
  await wait(600);
  const f2d = await pg.evaluate(() => { const s = document.querySelector('.mk-pg .mk-voice'); return { fail: !!(s && s.querySelector('.mk-vstf [data-fk="mkvcstre3"]')), none: !!(s && s.querySelector('[data-fk="mkvoicego"]')) }; });
  ok('② 순간 쪽(하객 맞이 · AI) — «아직 만들지 않았어요 · 만들기» 대신 까닭 + 다시 불러오기', f2d.fail && !f2d.none, JSON.stringify(f2d));
  await pg.evaluate((st) => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? st : { ok: false, error: 'x' }); VC.st = null; VC.stErr = false; _vcStatus(); }, ST_OK);
  await wait(600);

  /* ③ F3 올리기 실패 — 녹음 창 */
  await pg.evaluate(() => { window.__mock['momentedit:ritualFile'] = () => ({ ok: false, error: '파일을 저장하지 못했어요. 다시 눌러 주세요. (코드 U4)' }); const wv = __wav(1, 24000); MK_REC = { key: 'g0', ph: 'review', wav: wv, url: URL.createObjectURL(wv), dur: 1, warn: [], src: 'rec', name: '' }; render(); mkRecUse(); });
  await wait(700);
  const f3 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'), m = d && d.querySelector('.mk-exw.mk-dlg-msg[role="alert"]'); return { msg: m ? m.textContent : '', ph: MK_REC && MK_REC.ph, use: !!(d && d.querySelector('[data-fk="mkrecuse"]')), info: !!(d && d.querySelector('.mk-toast.mk-dlg-msg')) }; });
  ok('③ 올리기 실패(서버 U4) → 녹음 창 안 빨간 글 · «이걸로 쓰기»로 돌아옴 · 중립 글 아님', f3.msg === '파일을 저장하지 못했어요 · 다시 눌러 주세요 (코드 U4)' && f3.ph === 'review' && f3.use && !f3.info, JSON.stringify(f3));
  await pg.evaluate(() => { window.__mock['momentedit:ritualFile'] = () => ({ ok: false, error: '올리지 못했어요. 연결을 확인하고 다시 눌러 주세요.' }); mkRecUse(); });
  await wait(700);
  const f3b = await pg.evaluate(() => (document.querySelector('#mkRecDlg .mk-exw.mk-dlg-msg') || {}).textContent || '');
  ok('③ 옛 마이페이지 중계 글 → U6 «연결이 끊겨 못 올렸어요»', f3b === '연결이 끊겨 못 올렸어요 · 다시 눌러 주세요 (코드 U6)', f3b);
  await pg.evaluate(() => { window.__mock['momentedit:ritualFile'] = () => null; __shrink({ 75000: 150 }); mkRecUse(); });
  await wait(900);
  const f3c = await pg.evaluate(() => { __unshrink(); const d = document.getElementById('mkRecDlg'); return { msg: (d && d.querySelector('.mk-exw.mk-dlg-msg') || {}).textContent || '', info: !!(d && d.querySelector('.mk-toast')), le: (MK.lineErr || {}).g0 || '', ph: MK_REC && MK_REC.ph }; });
  ok('③ 75초 답 없음 → «확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)» 한 곳(창) · «응답이 없어요» 없음', f3c.msg === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && !f3c.info && !f3c.le && f3c.ph === 'review', JSON.stringify(f3c));
  await pg.evaluate(() => { MK_REC = null; MK.dlgMsg = ''; render(); });

  /* ⑤ F5 마이크 */
  const mic = [];
  for (const [nm, code, file] of [['NotAllowedError', 'M1', true], ['NotFoundError', 'M2', true], ['NotReadableError', 'M3', false]]) {
    await pg.evaluate((n) => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('x', n)); MIC_KEEP = null; MK_REC = null; mkRec('g0'); mkRecGo('g0'); }, nm);
    await wait(300);
    const t = await pg.evaluate(() => { const p = document.querySelector('#mkRecDlg .mk-recp .mk-exw[role="alert"]'); return { shown: p ? p.textContent : '', msg: (MK_REC && MK_REC.msg) || '' }; });
    mic.push(t.msg); ok(`⑤ 줄 녹음 마이크 ${nm} → 창 안 빨간 글 ${code}${file ? ' · «파일 올리기» 대안' : ''}`, t.shown && t.msg.endsWith(`(코드 ${code})`) && (!file || /«파일 올리기»/.test(t.msg)) && !/«파일»로/.test(t.msg), JSON.stringify(t));
  }
  await pg.evaluate(() => { MK_REC = null; render(); VC.read = { who: 'groom', take: {}, phrase: '확인 문장', step: 1, ph: 'read', err: '' }; navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('x', 'NotAllowedError')); MIC_KEEP = null; render(); mkRecGo('vc:groom:1'); });
  await wait(300);
  const vcm = await pg.evaluate(() => { const p = document.querySelector('#mkRecDlg .mk-recp .mk-exw[role="alert"]'); return p ? p.textContent : ''; });
  ok('⑤ 1분 읽기(vc:) 마이크 M1 — 파일을 권하지 않는다(1분 읽기는 파일을 받지 않는다)', vcm === '마이크 허락이 없어요 · 설정에서 켜 주세요 (코드 M1)', vcm);
  await pg.evaluate(() => { window.__MR = window.MediaRecorder; window.MediaRecorder = undefined; MK_REC = null; mkRecGo('vc:groom:1'); });
  await wait(200);
  const m5 = await pg.evaluate(() => { const p = document.querySelector('#mkRecDlg .mk-recp .mk-exw[role="alert"]'), t = p ? p.textContent : ''; window.MediaRecorder = window.__MR; return { t, toast: MK.toast || '' }; });
  ok('⑤ 녹음 못 하는 브라우저 → 창 안 M5(알림 아님) · 1분 읽기는 «사파리나 크롬»', m5.t === '이 브라우저는 녹음이 안 돼요 · 사파리나 크롬으로 열어 주세요 (코드 M5)' && !m5.toast, JSON.stringify(m5));
  await pg.evaluate(() => { VC.read = null; MK_REC = null; render(); navigator.mediaDevices.getUserMedia = () => Promise.resolve(new MediaStream()); MIC_KEEP = null; mkRec('g0'); mkRecGo('g0'); });
  await wait(2600);
  const ms = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, msg: MK_REC && MK_REC.msg }));
  ok('⑤ 녹음 시작(start)이 던져도 숫자(3 · 2 · 1)에서 멈추지 않는다 → M5', ms.ph === 'err' && /\(코드 M5\)$/.test(ms.msg || ''), JSON.stringify(ms));
  await pg.evaluate(() => { MK_REC = null; MIC_KEEP = null; render(); });

  /* ⑧ F8 · F12 녹음 다듬기 */
  const f8 = await pg.evaluate(async () => { const out = {}; const grab = async (k, blob, src) => { MK_REC = null; _recFromBlob(k, blob, src, 'x'); for (let i = 0; i < 40 && MK_REC && MK_REC.ph === 'busy'; i++) await new Promise((r) => setTimeout(r, 50)); return MK_REC ? MK_REC.msg || MK_REC.ph : ''; };
    out.empty = await grab('g0', new Blob([]), 'rec'); out.emptyVc = await grab('vc:groom:1', new Blob([]), 'rec');
    out.badFile = await grab('g0', new Blob(['ID3notaudio'], { type: 'audio/mp4' }), 'file'); out.badVc = await grab('vc:groom:1', new Blob(['xx garbage xx'], { type: 'audio/webm' }), 'rec');
    const AC = window.AudioContext, WAC = window.webkitAudioContext; window.AudioContext = function () { throw new DOMException('too many', 'NotSupportedError'); }; window.webkitAudioContext = window.AudioContext;
    out.ctx = await grab('g0', __wav(2, 24000), 'file'); window.AudioContext = AC; window.webkitAudioContext = WAC;
    const rp = _recProcess; _recProcess = () => Promise.resolve({ dur: 61, wav: new Blob(), warn: [] });
    out.longFile = await grab('g0', __wav(1, 8000), 'file'); out.longVc = await grab('vc:groom:1', __wav(1, 8000), 'rec'); out.longRec = await grab('g0', __wav(1, 8000), 'rec'); _recProcess = rp;
    MK_REC = null; render(); return out; });
  ok('⑧ 빈 녹음(전화로 끊김) → M6 «녹음이 비어 있어요»', f8.empty === '녹음이 비어 있어요 · 다시 녹음해 주세요 (코드 M6)' && f8.emptyVc === f8.empty, JSON.stringify([f8.empty, f8.emptyVc]));
  ok('⑧ 오디오 문맥을 못 만듦 → «새로고침 뒤 다시» (m4a 로 올리라는 말 아님)', f8.ctx === '소리를 열지 못했어요 · 새로고침해 주세요 (코드 M6)', f8.ctx);
  ok('⑧ 정말 못 여는 파일 → 종전 글 + M6 · 1분 읽기는 «다시 녹음»만', f8.badFile === '이 파일은 열 수 없어요. m4a · mp3 · wav 로 올려 주세요 (코드 M6)' && f8.badVc === '녹음을 읽지 못했어요 · 다시 녹음해 주세요 (코드 M6)', JSON.stringify([f8.badFile, f8.badVc]));
  ok('⑧ 60초 — 올린 파일 · 1분 읽기 · 줄 녹음이 각각 맞는 말(입력 안내라 코드 없음)', f8.longFile === '60초가 넘는 파일이에요 · 60초 안으로 줄여 올려 주세요' && f8.longVc === '60초가 넘어요 · 이 글만 천천히 다시 읽어 주세요' && f8.longRec === '60초가 넘어요 · 한 줄만 천천히 다시 녹음해 주세요', JSON.stringify([f8.longFile, f8.longVc, f8.longRec]));
  /* F12 1분 읽기 — 녹음을 잇고 보내기 전 파일 읽기 실패 */
  const en = await pg.evaluate(async () => { VC.read = { who: 'groom', take: { 1: { wav: __wav(11, 8000), dur: 11 }, 2: { wav: __wav(11, 8000), dur: 11 } }, phrase: '확인 문장', step: 2, ph: 'read', err: '' };
    const RD = FileReader.prototype.readAsDataURL; FileReader.prototype.readAsDataURL = function () { const me = this; setTimeout(() => { if (me.onerror) me.onerror(new ProgressEvent('error')); }, 10); };
    mkVcEnroll(); await new Promise((r) => setTimeout(r, 600)); FileReader.prototype.readAsDataURL = RD;
    const R = VC.read || {}; const out = { ph: R.ph, step: R.step, err: R.err }; VC.read = null; render(); return out; });
  ok('⑧ 1분 읽기 파일 읽기 실패 → «만드는 중»에 멈추지 않고 글 2 로(M6)', en.ph === 'read' && en.step === 2 && en.err === '녹음을 열지 못했어요\n글 2 를 다시 읽어 주세요 (코드 M6)', JSON.stringify(en));

  /* ⑧ F10 받은 소리를 못 풂 · ③ AI 줄 75초 */
  await pg.evaluate(() => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? window.__STOK : d.op === 'make' ? { ok: true, left: 900, parts: [{ who: 'groom', mime: 'audio/mpeg', data: btoa('not audio at all') }] } : { ok: false, error: 'x' }); }, null);
  await pg.evaluate((st) => { window.__STOK = st; if (MK.lineErr) delete MK.lineErr.g0; _vcMake('g0', {}).catch(() => {}); }, ST_OK);
  await wait(1800);
  const f10 = await pg.evaluate(() => ({ le: (MK.lineErr || {}).g0 || '', shown: [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].map((p) => p.textContent) }));
  ok('⑧ 받은 소리를 이 기기가 못 풂 → M6 «소리를 열지 못했어요» · «만든 소리를 받지 못했어요» 아님 · 그 줄 아래', f10.le === '소리를 열지 못했어요 · 다시 눌러 주세요 (코드 M6)' && f10.shown.indexOf(f10.le) > -1, JSON.stringify(f10));
  await pg.evaluate(async () => { const b64 = await __b64(__wav(2, 24000)); window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? window.__STOK : d.op === 'make' ? { ok: true, left: 900, parts: [{ who: 'groom', mime: 'audio/wav', data: b64 }] } : { ok: false, error: 'x' });
    window.__mock['momentedit:ritualFile'] = () => null; __shrink({ 75000: 200 }); if (MK.lineErr) delete MK.lineErr.g1; MK.toast = ''; __trapToast();
    _vcMake('g1', {}).catch(() => {}); });
  await wait(2500);
  const f3d = await pg.evaluate(() => { __unshrink(); const o = { le: (MK.lineErr || {}).g1 || '', toasts: (window.__toasts || []).join(' | '), sent: window.__sent.filter((t) => t === 'momentedit:ritualFile').length }; __untrapToast(); return o; });
  ok('③ AI 줄 75초 → 그 줄 아래 U5 한 번(«응답이 없어요» 알림 · «만든 소리를 저장하지 못했어요» 겹침 없음)', f3d.le === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && !/응답이 없어요|저장하지 못했어요/.test(f3d.toasts) && f3d.sent > 0, JSON.stringify(f3d));

  /* ⑥ F6 ▶ 파일 받기 */
  await pg.evaluate(() => { S.up = S.up || {}; S.up.g2 = { n: '녹음', id: 'f-g2-404', src: 'rec', at: '' }; delete RF_URL.g2; delete RF_URL['g2#']; delete RF_LOAD['f-g2-404']; delete RF_ERR['f-g2-404']; if (MK.lineErr) delete MK.lineErr.g2;
    window.__mock['momentedit:ritualFileGet'] = () => ({ ok: false, error: '파일을 찾을 수 없어요.', ecode: 'L0' }); render(); mkUpPlay('g2'); });
  await wait(500);
  const f6 = await pg.evaluate(() => ({ le: (MK.lineErr || {}).g2 || '', load: !!RF_LOAD['f-g2-404'], shown: [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].some((p) => p.textContent === (MK.lineErr || {}).g2) }));
  ok('⑥ ▶ 파일 받기 실패(못 찾음 L0) → 그 줄 아래 까닭 · «불러오는 중»에 머물지 않음', f6.le === '파일을 찾을 수 없어요 (코드 L0)' && !f6.load && f6.shown, JSON.stringify(f6));
  await pg.evaluate(() => { window.__mock['momentedit:ritualFileGet'] = () => ({ ok: false, error: '불러오지 못했어요. 연결을 확인해 주세요.' }); mkUpPlay('g2'); });
  await wait(500);
  const f6b = await pg.evaluate(() => (MK.lineErr || {}).g2 || '');
  ok('⑥ ▶ 다시 누르면 다시 묻는다 · 옛 중계 글 → L6', f6b === '연결이 끊겼어요 · 다시 눌러 주세요 (코드 L6)', f6b);
  await pg.evaluate(() => { S.up.g3 = { n: '녹음', id: 'local:1', src: 'rec', local: 1 }; delete RF_URL.g3; if (MK.lineErr) delete MK.lineErr.g3; mkUpPlay('g3'); });
  await wait(400);
  const f6c = await pg.evaluate(() => ({ le: (MK.lineErr || {}).g3 || '', load: !!RF_LOAD['local:1'] }));
  ok('⑥ 이 기기에 없는 녹음(local:) → «이 기기에 없는 녹음이에요» · 영영 «불러오는 중» 아님', f6c.le === '이 기기에 없는 녹음이에요 · 다시 녹음해 주세요' && !f6c.load, JSON.stringify(f6c));
  await pg.evaluate(() => { S.up.g2 = { n: '녹음', id: 'f-g2-bad', src: 'rec', at: '' }; RF_URL.g2 = URL.createObjectURL(new Blob(['garbage not audio'], { type: 'audio/wav' })); RF_URL['g2#'] = 'f-g2-bad'; if (MK.lineErr) delete MK.lineErr.g2; mkUpPlay('g2'); });
  await wait(2200);
  const f11p = await pg.evaluate(() => ({ le: (MK.lineErr || {}).g2 || '', aud: !!MK.aud, key: MK.audKey || '' }));
  ok('⑥ ▶ 를 못 틀면(파일 오류 · 이 기기가 못 엶) ■ 를 ▶ 로 · 그 줄 아래 M6(막힘 M7 아님)', f11p.le === '소리를 열지 못했어요 · 다시 눌러 주세요 (코드 M6)' && !f11p.aud && !f11p.key, JSON.stringify(f11p));

  /* ⑦ F7 지우기 */
  await pg.evaluate(() => { S.up.g0 = { n: '녹음', id: 'f-g0-del', src: 'rec', at: '' }; window.__delN = 0; if (MK.lineErr) delete MK.lineErr.g0;
    window.__mock['momentedit:ritualFileDel'] = () => { window.__delN++; return { ok: false, error: '불러오지 못했어요. 연결을 확인해 주세요.' }; }; __shrink({ 3000: 60 }); _mkUpDelGo('g0'); });
  await wait(900);
  const f7 = await pg.evaluate(() => { __unshrink(); return { n: window.__delN, up: S.up.g0 && S.up.g0.id, le: (MK.lineErr || {}).g0 || '', old: /불러오지 못했어요/.test(document.body.innerText) }; });
  ok('⑦ 직접 지운 줄 실패 → 한 번 더 묻고 · 줄을 되돌려 «지우지 못해 남아 있어요 · 다시 눌러 주세요 (코드 D6)» · «불러오지 못했어요» 없음', f7.n === 2 && f7.up === 'f-g0-del' && f7.le === '지우지 못해 남아 있어요 · 다시 눌러 주세요 (코드 D6)' && !f7.old, JSON.stringify(f7));
  await pg.evaluate(() => { S.up.g1 = { n: 'AI', id: 'f-g1-ai', src: 'ai', by: 'groom' }; window.__delN = 0; if (MK.lineErr) delete MK.lineErr.g1;
    window.__mock['momentedit:ritualFileDel'] = () => { window.__delN++; return { ok: false, error: '지우지 못했어요. 다시 눌러 주세요. (코드 D4)' }; }; __shrink({ 3000: 60 }); _mkUpDrop('g1'); render(); });
  await wait(900);
  const f7b = await pg.evaluate(() => { __unshrink(); return { n: window.__delN, up: S.up.g1, le: (MK.lineErr || {}).g1 || '' }; });
  ok('⑦ 다른 일로 내려놓은 파일 실패(서버 D4) → 줄은 비운 채 «파일을 지우지 못했어요 · 문의해 주세요 (코드 D4)»', f7b.n === 2 && f7b.up === 0 && f7b.le === '파일을 지우지 못했어요 · 문의해 주세요 (코드 D4)', JSON.stringify(f7b));
  await pg.evaluate(() => { S.up.g0 = { n: '녹음', id: 'f-g0-ok', src: 'rec', at: '' }; if (MK.lineErr) delete MK.lineErr.g0; window.__mock['momentedit:ritualFileDel'] = () => ({ ok: true }); _mkUpDelGo('g0'); });
  await wait(400);
  const f7c = await pg.evaluate(() => ({ up: S.up.g0, le: (MK.lineErr || {}).g0 || '' }));
  ok('⑦ 지우기 성공 → 말 없음 · 줄은 비어 있다', f7c.up === 0 && !f7c.le, JSON.stringify(f7c));

  /* ④ F4 저장 */
  const f4 = [];
  for (const [reply, want] of [[{ ok: false, kind: 'net', error: '연결이 끊겨 저장하지 못했어요 · 다시 저장해 주세요 (코드 S6)' }, '연결이 끊겨 저장하지 못했어요 · 다시 저장해 주세요 (코드 S6)'], [{ ok: false }, '저장하지 못했어요 · 다시 저장해 주세요 (코드 S0)'], [{ ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' }, '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 S8)'], [null, '저장 확인이 늦어요 · 저장됐을 수 있어요 (코드 S5)']]) {
    await pg.evaluate((r) => { courseStarted = true; _doneSaved = false; _autoWait = false; clearTimeout(_autoGT); window.__mock['momentedit:orderDraft'] = () => r; __shrink({ 16000: 150 }); _autoLast = ''; _autoDirty = true; _autoSend(); }, reply);
    await wait(700);
    const g = await pg.evaluate(() => { __unshrink(); const b = document.getElementById('obSave'), t = document.getElementById('_toast'); return { btn: b && b.textContent, title: b && b.title, toast: t ? t.textContent : '', role: t ? t.getAttribute('role') : '' }; });
    f4.push(g); ok(`④ 머리 «저장» 실패 → «다시 저장» · 알림(role=alert) · title = «${want}»`, g.btn === '다시 저장' && g.title === want && g.toast === want && g.role === 'alert', JSON.stringify(g));
  }
  await pg.evaluate(() => { _autoState = ''; _autoWhy = ''; _autoDirty = false; window.__mock['momentedit:orderSave'] = () => ({ ok: false, msg: '저장이 안 됐어요. 네트워크를 확인하고 다시 저장해 주세요.' }); _saving = false; doSave(); });
  await wait(600);
  const fs1 = await pg.evaluate(() => _saveErr);
  ok('④ 완성 저장 실패(옛 마이페이지 글) → S6 한 줄', fs1 === '연결이 끊겼어요 · 다시 저장해 주세요 (코드 S6)', fs1);
  await pg.evaluate(() => { window.__mock['momentedit:orderSave'] = () => null; _saving = false; __shrink({ 16000: 150 }); doSave(); });
  await wait(700);
  const fs2 = await pg.evaluate(() => { __unshrink(); const i0 = idx; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'done') idx = i; render(); const e = document.querySelector('.save-err'); const o = { err: _saveErr, head: e ? (e.querySelector('b') || {}).textContent : '', txt: e ? e.textContent : '' }; idx = i0; _saveErr = ''; render(); return o; });
  ok('④ 완성 저장 16초 → S5 «저장됐을 수 있어요» · 머리말 «저장됐는지 아직 몰라요»(«저장이 안 됐어요» 아님)', fs2.err === '저장 확인이 늦어요 · 저장됐을 수 있어요 (코드 S5)' && fs2.head === '저장됐는지 아직 몰라요', JSON.stringify(fs2));
  await pg.evaluate(() => { window.postMessage({ type: 'momentedit:orderExitReset', msg: '저장이 안 됐어요. 잠시 후 다시 시도해 주세요.' }, location.origin); });
  await wait(500);
  const fx = await pg.evaluate(() => { const d = document.querySelector('.ord-ask .oa-d'), t = d ? d.textContent : ''; const y = document.querySelector('.ord-ask .oa-yes'); if (y) y.click(); return t; });
  ok('④ 나가기 저장 실패 판 → 까닭 + S0 한 줄 · «다시 눌러 주세요» 두 번 없음', fx === '저장하지 못했어요 · 다시 저장해 주세요 (코드 S0)\n\n고르신 내용은 이 기기에 그대로 있어요.', JSON.stringify(fx));
  await wait(300);

  /* ⑨ F9 연습 — 차례마다 까닭 · 예산 한 줄 */
  const f9 = await pg.evaluate(async () => { const o = window._vc0;
    window._vc0 = (op, d) => Promise.resolve(/첫째/.test(d.text) ? { ok: false, down: true, kind: 'busy', error: '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)' } : /둘째/.test(d.text) ? { ok: false, down: true, timeout: true, error: '오래 걸려 멈췄어요 · 다시 눌러 주세요 (코드 V5)' } : { ok: false, limit: true, error: '이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요' });
    const a = { who: '신랑', txt: '첫째 차례 글', talk2: true }, b = { who: '신부', txt: '둘째 차례 글', talk2: true }, c = { who: '신랑', txt: '셋째 차례 글', talk2: true };
    await _ptFetch(a); await _ptFetch(b); await _ptFetch(c); window._vc0 = o;
    const ha = _ptKey(a).h, hb = _ptKey(b).h, hc = _ptKey(c).h; PT.failH[ha] = 1; PT.failH[hb] = 1;
    return { a: _ptTurnWhy(ha), b: _ptTurnWhy(hb), c: _ptTurnWhy(hc), limit: PT.limit, codes: _ptFailCodes() }; });
  ok('⑨ 연습 — 차례마다 제 까닭 코드(앞 차례 실패가 덮지 않는다) · 못 만든 차례들 코드 요약', /\(코드 V1\)$/.test(f9.a) && /\(코드 V5\)$/.test(f9.b) && /만들지 못했어요/.test(f9.a) && f9.codes === ' (코드 V1 · V5)', JSON.stringify(f9));
  ok('⑨ 예산을 다 쓴 것은 따로 한 줄(코드 없음)', f9.c === '이번 예식의 AI 읽기를 다 썼어요 · 글을 보며 연습은 계속할 수 있어요' && f9.limit === f9.c, JSON.stringify(f9));
  await pg.evaluate(() => { PT.failH = {}; PT.failWhy = {}; PT.limit = ''; });
  /* F12 다시 만들기 알림 */
  const f12 = await pg.evaluate(() => { const o = window._upStale; window._upStale = () => true; const s1 = _vtWhyT('g0', true), s2 = _vtWhyT('g0', false); window._upStale = () => false; const t1 = _vtWhyT('g0', true); MK.lineErr = MK.lineErr || {}; MK.lineErr.g0 = '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)'; const t2 = _vtWhyT('g0', false); delete MK.lineErr.g0; window._upStale = o; return { s1, s2, t1, t2 }; });
  ok('⑧ 다시 만들기 알림 — 글을 고친 줄은 «글로 보여 드려요» · 빠르기만 바뀐 줄은 «지금 소리로» + 까닭 코드', f12.s1 === '바뀐 글로 만드는 데 오래 걸려요 · 이번엔 글로 보여 드려요' && /^바뀐 글로 만들지 못했어요 · 이번엔 글로 보여 드려요/.test(f12.s2) && f12.t1 === '새 빠르기 · 쉼으로 만드는 데 오래 걸려요 · 지금 소리로 먼저 들려 드려요' && f12.t2 === '새 빠르기 · 쉼으로 만들지 못했어요 · 지금 소리로 들려 드려요 (코드 V1)', JSON.stringify(f12));

  /* ⑨ F11 녹음 목록 · 엔진 */
  FLAG.failRec = true;
  await pg.evaluate(() => { LREC = null; LRECP = null; LREC_TRY = 3; return _lrec(); });
  const f11 = await pg.evaluate(() => ({ err: LREC_ERR, pend: _pendT(null), short: _pendT({ pending: true }, 1), own: _pendT({ own: true }), pf: _pendT({ pfail: 'M6' }) }));
  ok('⑨ 녹음 목록을 못 받으면(서버 500) «녹음 전»이 아니라 L0 · 두 분 줄은 «녹음 전» 그대로 · 못 연 줄은 M6', f11.err === 'L0' && f11.pend === '소리를 불러오지 못해 글로 보여 드려요 (코드 L0)' && f11.short === '소리를 못 불러왔어요 (코드 L0)' && f11.own === '녹음 전이라 글로 먼저 보여 드려요' && f11.pf === '소리를 틀지 못해 글로 보여 드려요 (코드 M6)', JSON.stringify(f11));
  FLAG.failRec = false;
  await pg.evaluate(() => { LREC_TRY = 0; __shrink({ 4000: 60 }); _lrecFail({ meN: 6 }); });
  await wait(700);
  const f11b = await pg.evaluate(() => { __unshrink(); return { err: LREC_ERR, n: Object.keys(LREC || {}).length }; });
  ok('⑨ 녹음 목록은 다시 받는다(굳히지 않음) — 받으면 까닭이 걷힌다', !f11b.err && f11b.n > 10, JSON.stringify(f11b));
  FLAG.failEng = true;
  const f11c = await pg.evaluate(async () => { const g = ENG; ENG = null; ENGP = null; const b = document.createElement('button'); b.textContent = '들어 보기'; document.body.appendChild(b); momPlay(b, 'vow');
    for (let i = 0; i < 40 && !/코드/.test(b.textContent); i++) await new Promise((r) => setTimeout(r, 50)); const t = b.textContent; ENG = g; ENGP = null; b.remove(); return { t, err: ENG_ERR }; });
  FLAG.failEng = false;
  ok('⑨ 소리 엔진을 못 받으면 «이 순간은 아직 소리가 없어요»가 아니라 L0', f11c.t === '소리를 불러오지 못했어요 (코드 L0)' && f11c.err === 'L0', JSON.stringify(f11c));
  /* ⑨ «이 순간 들어 보기» 이어 듣기 — 소리 파일이 전부 없으면(404) 코드 · 소리 요소가 못 연 까닭(_mediaCode) */
  const f11d = await pg.evaluate(async () => { _stopAud(); const b = document.createElement('button'); b.textContent = '들어 보기'; document.body.appendChild(b); const me = AUDTOK; AUDBTN = b; AUDO = b.innerHTML; b.classList.add('playing');
    _start(b, [{ src: '/assets/audio/__none-a.mp3' }, { src: '/assets/audio/__none-b.mp3' }], me);
    for (let i = 0; i < 60 && !/코드/.test(b.textContent); i++) await new Promise((r) => setTimeout(r, 50)); const t = b.textContent; _stopAud(); b.remove();
    const mc = [_mediaCode({ error: { code: 4 }, currentSrc: 'https://x.test/a.mp3' }), _mediaCode({ error: { code: 4 }, currentSrc: 'blob:https://x.test/1' }), _mediaCode({ error: { code: 2 }, currentSrc: 'https://x.test/a.mp3' }), _mediaCode({ error: { code: 3 }, currentSrc: 'https://x.test/a.mp3' }), _mediaCode({ error: { code: 2 }, currentSrc: 'blob:https://x.test/1' })];
    return { t, mc: mc.join(',') }; });
  ok('⑨ 이어 듣기 소리가 전부 없으면(404) «소리를 불러오지 못했어요 (코드 L0)» · 까닭 — 서버 파일 없음 L0 · 이 기기 소리 M6 · 연결 L6 · 해독 M6', f11d.t === '소리를 불러오지 못했어요 (코드 L0)' && f11d.mc === 'L0,M6,L6,M6,M6', JSON.stringify(f11d));

  ok('390 화면 오류 0', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { ok('390 흐름이 끝까지 돈다(예외 없음)', false, String(e && e.message || e).split('\n')[0]); } finally { await ctx.close(); }
}

/* ───────── 360 — 한 줄 ───────── */
{
  const { ctx, pg, errs } = await open(360); try {
  await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; mkGo('guest'); }); await wait(500);
  /* 글은 화면 함수가 만든 그대로 잰다(문구를 고치면 이 검사가 다시 잰다) */
  const l1 = await pg.evaluate(() => { const C = [_ecWord('U', 0), _ecWord('U', 4), _ecWord('U', 5), _ecWord('U', 6), _ecWord('L', 0), _ecWord('L', 5), _ecWord('L', 6), _ecWord('L', 7), _ecWord('D', 5), EC_M6, '파일을 찾을 수 없어요 (코드 L0)', '지우지 못해 남아 있어요 · 다시 눌러 주세요 (코드 D6)', '파일을 지우지 못했어요 · 문의해 주세요 (코드 D4)', '재생이 막혔어요 · ▶ 를 다시 눌러 주세요 (코드 M7)', '목소리 정보가 안 왔어요 · 다시 눌러 주세요 (코드 V6)', '이 기기에 없는 녹음이에요 · 다시 녹음해 주세요', _ecWord('U', 1), _ecWord('U', 2), _ecWord('U', 3), _ecWord('U', 9)];
    const out = C.map((x) => { MK.lineErr = { g0: x }; render(); const p = [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].find((e) => __N(e.textContent) === x); return [x, p ? __lines(p) : 0]; }); MK.lineErr = {}; render(); return out; });
  const l1x = l1.filter((r) => r[1] !== 1);
  ok(`⑩ 360 줄 카드 — 올리기 · 받기 · 지우기 · 틀기 · 목소리 정보 · 기기 실패 글 ${l1.length}개가 한 줄`, !l1x.length, JSON.stringify(l1x));
  await pg.evaluate(() => { window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? { ok: false, down: true, net: 1, sec: 61, error: '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6 · 61초)' } : { ok: false, error: 'x' }); VC.st = null; VC.stErr = false; VC.stLast = null; __shrink({ 3000: 40, 8000: 40 }); mkGo('_voice'); });
  await wait(700); await pg.evaluate(() => __unshrink());
  const l2 = await pg.evaluate(() => { const s = document.querySelector('.mk-vpage .mk-wait-s'); if (!s) return { n: 0 }; const r = document.createRange(); const t = s.firstChild; const at = s.textContent.indexOf('(코드'); if (!t || at < 0) return { n: __lines(s), code: false };
    r.setStart(t, at); r.setEnd(t, s.textContent.length); return { n: __lines(s), code: true, codeRects: r.getClientRects().length, txt: __N(s.textContent) }; });
  ok('⑩ 360 목소리 쪽 — «불러오지 못했어요» 칸 두 줄 안 · 코드(V6 · 61초)가 한 덩어리(줄에서 안 쪼개짐)', l2.n >= 1 && l2.n <= 2 && l2.code && l2.codeRects === 1 && /\(코드 V6 · 61초\)$/.test(l2.txt), JSON.stringify(l2));
  const l3 = await pg.evaluate(() => { const vc = 'vc:groom:1', C = [_micWhy({ name: 'NotAllowedError' }, vc), _micWhy({ name: 'NotFoundError' }, vc), _micWhy({ name: 'NotReadableError' }, vc), _micWhy({ name: 'Foo' }, vc), _micWhy({ name: 'NotReadableError' }, 'g0'), _openWhy({ meKind: 'empty' }, 'rec', 'g0'), _openWhy({ meKind: 'empty' }, 'file', 'g0'), _openWhy({ meKind: 'ctx' }, 'file', 'g0'), _openWhy({ meKind: 'decode' }, 'rec', vc), _ecWord('U', 4), _ecWord('U', 5), _ecWord('U', 6), _ecTidy('파일을 저장하지 못했어요. 다시 눌러 주세요. (코드 U4)')];
    const out = C.map((x) => { MK_REC = { key: 'g0', ph: 'err', msg: x }; render(); const p = document.querySelector('#mkRecDlg .mk-recp .mk-exw'); return [x, p ? __lines(p) : 0]; }); MK_REC = null; render(); return out; });
  const l3x = l3.filter((r) => r[1] !== 1);
  ok(`⑩ 360 녹음 창 — 1분 읽기 마이크 · 빈 녹음 · 문맥 · 올리기 글 ${l3.length}개가 한 줄`, !l3x.length, JSON.stringify(l3x));
  const l4 = await pg.evaluate(() => { const C = [_micWhy({ name: 'NotAllowedError' }, 'g0'), _micWhy({ name: 'NotFoundError' }, 'g0'), _micWhy({ name: 'TypeError' }, 'g0'), _micWhy({ name: '_nosup' }, 'vc:groom:1'), _openWhy({ meKind: 'decode' }, 'file', 'g0'), _openWhy({ meKind: 'decode' }, 'rec', 'g0'), EC_BASE[8] + ' (코드 S8)'];
    const out = C.map((x) => { MK_REC = { key: 'g0', ph: 'err', msg: x }; render(); const p = document.querySelector('#mkRecDlg .mk-recp .mk-exw'); return __lines(p) + '줄 ' + x; }); MK_REC = null; render(); return out; });
  console.log('  (재기만 · «파일 올리기» 대안 · 드문 길 · 로그인은 두 줄 허용)\n   ' + l4.join('\n   '));
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok('⑩ 360 가로 넘침 없음', sw);
  ok('360 화면 오류 0', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { ok('360 흐름이 끝까지 돈다(예외 없음)', false, String(e && e.message || e).split('\n')[0]); } finally { await ctx.close(); }
}
await br.close(); srv.close();
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
