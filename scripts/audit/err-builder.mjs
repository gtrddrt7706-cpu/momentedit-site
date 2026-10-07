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
   ★★[ERR_R1_BUILDER 2026-10-07 사장님 «직접 테스트 · 표기 안 된 다른 에러는 없는지 딥하게 · 라운드별로 개선책이 없을 때까지»] 1라운드(triage-builder 23항목) — 고친 것마다 «되돌리면 빨강»
   ⑪ ERR_ZERO_TEXT 서버 까닭 글 + 0 은 코드 없이(화면이 지은 요약 글 · 나가기 판은 V0 · S0) · VC_DONE_LINE 만들기 · 맞추기 거절도 같은 받는 자리(마침표 · 사고번호 · 빈 답 V0)
      PLAY_FILE_WHY 두 분 소리 파일을 못 받으면 글 + 코드(② 순간 쪽은 그 줄 아래) · RF_LINE_CLEAR 받아 틀면 그 받기 실패 글을 걷는다
      ENG_FAIL_SHOW 엔진 실패는 보이는 알림 · LISTEN_NOTE 크게 보기 안 알림 · NOW_LINE_FAIL · TURN_PLAY_FAIL 줄의 일은 그 줄 아래 · TUNE_PLAY_WHY 맞추기 재생 막힘 M7
      SAMPLE_M6 · SAMPLE_CTX_CLOSE · FILL_CODES 빈 줄 채우기 결과 코드 · SKIP_CODE · MIC_M0 · UP_AGAIN_THROW U0 · SAVE_THROW_SAY · EXIT_THROW_SAY · CODE_NO_DOT · CODE_NOWRAP 코드 한 덩어리
   ⑫ 콘솔(고객 미리 듣기 · embed=1) GUEST_LINK_CUT 잘린 주소 L7 · GUEST_LOST_LINE 모르는 코스 L3(시스템 판 없음) · GUEST_BUILD_FAIL L9(영어 예외 없음) · GUEST_REC_WHY · GUEST_WHY 글 카드 까닭(L0 · M7)
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
/* [ERR_R1_BUILDER] 정적 — 1라운드에서 고친 자리가 옛 모양으로 돌아오지 않았나(되돌리면 빨강) */
const CON = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
ok('⑪ 정적 · 듣는 줄 알림은 _lNote(② 작은 플레이어의 lsPlay 하나만 MK.toast) · 줄 ▶ 실패는 그 줄 아래 · «이 자리 들어 보기»가 실패를 삼키지 않는다 · 엔진 실패를 LS.msg 에만 두지 않는다 [LISTEN_NOTE · NOW_LINE_FAIL · TURN_PLAY_FAIL · ENG_FAIL_SHOW]',
  (SRC.match(/MK\.toast=_vtWhyT\(/g) || []).length === 1 && !/MK\.toast=_ptWhyOf\(d\)/.test(SRC) && !/MK\.toast=EC_M6; render\(\); return; \} play\(MK\.nowUrl/.test(SRC) && !/pp\.catch\(function\(\)\{\}\); MK\.aud=au;/.test(SRC) && /au\.onerror=function\(\)\{ _playFail\(au,au\.error\); \}/.test(SRC) && !/LS\.msg='소리를 불러오지 못했어요/.test(SRC));
ok('⑪ 정적 · «일부는 아직 준비 중이에요»(추측) 없음 · 모르는 마이크 오류를 M3 로 넣지 않는다 · 코드 앞 마침표 없음(나가기 판 둘) [SKIP_CODE · MIC_M0 · CODE_NO_DOT]',
  !/일부는 아직 준비 중이에요/.test(SRC) && !/\(코드 M'\+\(c\|\|3\)\+'\)/.test(SRC) && !/이 기기에는 남아 있어요\.'\+\(_ecCodeOf/.test(SRC) && /이 기기에 그대로 있어요 · 잠시 뒤 다시 눌러 주세요 \(코드 S5\)'/.test(SRC) && !/\. \(코드 S5\)/.test(SRC));
ok('⑪ 정적 · 콘솔 — 서버 일반 오류의 새 글(«서버에서 오류가 났어요 …»)도 같은 갈래 · 받은 코드 꼬리(사고번호)를 버리지 않는다 · 고객 화면에 «순서를 만들 수 없습니다: »+영어 예외를 띄우지 않는다 [RF_SRV_ERR · GUEST_BUILD_FAIL]',
  /\/요청을 처리하지 못했어요\|서버에서 오류가 났어요\/\.test\(t\)\) return '서버 오류\(드라이브일 수 있어요\) \(' \+ \(c \? c\[1\] : '코드 L9'\) \+ '\)'/.test(CON) && /catch\(e\)\{ if \(GUEST\) \{ try \{ console\.warn\('preview build', e\); \} catch \(x\) \{\} R = null; gStop\('미리 듣기를 만들지 못했어요/.test(CON));
{ const vm = await import('node:vm'); const c1 = { window: {} }; vm.createContext(c1); vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/err-codes.js'), 'utf8'), c1); const ex = c1.window.ME_ERR.explain('M0');
  ok('⑪ 코드 표 M0(마이크 · 까닭 모름)가 있다 — 관리자 검색창이 «M0»를 풀어 준다 [MIC_M0]', !!ex && /까닭 모름/.test(ex.what) && /사파리/.test(ex.fix), JSON.stringify(ex)); }
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
  const ZERO = ['ecode', 'ecodeL'];   /* [ERR_ZERO_TEXT] 서버 까닭 글 + 숫자 0 = 글이 곧 까닭(코드 없음 · 페이지들 _ecSrv 와 같은 판단) */
  const once = Object.entries(u).every(([k, t]) => (t.match(/\(코드 /g) || []).length === (ZERO.indexOf(k) > -1 ? 0 : 1) && !BAD.test(t));
  ok('① 서버 코드는 그대로(«. » → « · » · 끝 마침표만 정리) · 두 번 붙이지 않음', u.coded === '파일을 저장하지 못했어요 · 다시 눌러 주세요 (코드 U4)' && u.coded9 === '요청을 처리하지 못했어요 · 잠시 후 다시 시도해 주세요 (코드 U9 · 7KQ2)', u.coded + ' | ' + u.coded9);
  ok('① 옛 마이페이지 글 — «연결을 확인» → 6 · 서버 글 없는 말 → 0 · 아무것도 없음 → 0', u.oldNet === '연결이 끊겨 못 올렸어요 · 다시 눌러 주세요 (코드 U6)' && u.oldGen === '올리지 못했어요 · 다시 눌러 주세요 (코드 U0)' && u.bare === '저장하지 못했어요 · 다시 저장해 주세요 (코드 S0)' && u.oldSave === '연결이 끊겼어요 · 다시 저장해 주세요 (코드 S6)', [u.oldNet, u.oldGen, u.bare, u.oldSave].join(' | '));
  ok('① kind · reason · ecode · closed → 5 · 7 · 8 · 서버 글 + 숫자(1~9) · 서버 글 + 0 은 글만(ERR_ZERO_TEXT)', u.ecodeL === '이 예식의 파일 자리가 없어요' && u.slow === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && u.bad === '서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 L7)' && u.sess === '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 S8)' && u.vSess === '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 V8)' && u.ecode === '파일을 찾을 수 없어요' && u.ecodeN === '한 개에 20MB 까지 올릴 수 있어요 (코드 U2)' && u.closed === '두 분 목소리 올리기는 아직 준비 중이에요 · 카톡이나 메일로 보내 주세요 (코드 U3)', JSON.stringify(u));
  ok('① 어느 글에도 코드가 꼭 하나(서버 까닭 글 + 0 은 없음) · 장식 이모지 · 전각 줄표 없음', once, JSON.stringify(u));
  /* ⑪ [ERR_ZERO_TEXT] 서버 까닭 글 + 0(또는 모름)은 코드 없이 · 1~9 는 코드 · 화면이 만든 대체 글엔 0 */
  const z = await pg.evaluate(() => ({ srv0: _ecLine('V', { ok: false, error: '아직 만든 AI 목소리가 없어요.', ecode: 'V0' }), srvN: _ecLine('U', { ok: false, error: '한 개에 20MB 까지 올릴 수 있어요.' }),
    srv3: _ecLine('U', { ok: false, error: '이 기능은 아직 꺼져 있어요.', ecode: 'U3' }), fb: _ecLine('V', { ok: false }), pt: _ptWhyOf({ ok: false, error: '아직 만든 AI 목소리가 없어요.', ecode: 'V0' }) }));
  ok('⑪ 서버 까닭 글 + 0(또는 숫자 없음) → 코드 없이 글만(«. » · 끝 마침표 정리) · 1~9 는 코드 · 화면이 만든 대체 글엔 V0 · 연습 읽기도 같은 판단 [ERR_ZERO_TEXT]', z.srv0 === '아직 만든 AI 목소리가 없어요' && z.srvN === '한 개에 20MB 까지 올릴 수 있어요' && z.srv3 === '이 기능은 아직 꺼져 있어요 (코드 U3)' && z.fb === '지금은 안 돼요 · 잠시 뒤 다시 눌러 주세요 (코드 V0)' && z.pt === z.srv0, JSON.stringify(z));
  /* ⑪ [VC_DONE_LINE] 목소리 답(만들기 · 맞추기 · 동의 · 확인 문장 · 지우기)도 받는 자리 한 곳 — 연습 읽기와 같은 말 */
  const vd = await pg.evaluate(async () => { const map = (d) => new Promise((res) => { const rid = 800000 + (window.__vdN = (window.__vdN || 0) + 1); VC.cb[rid] = res; _vcDone(Object.assign({ rid }, d)); }).then((r) => r.error);
    return { zero: await map({ ok: false, error: '아직 만든 AI 목소리가 없어요.', ecode: 'V0' }), noec: await map({ ok: false, error: '고객 정보를 찾을 수 없습니다.' }),
      v9: await map({ ok: false, ecode: 'V9', eid: '7KQ2', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 V9 · 7KQ2)' }),
      v3: await map({ ok: false, ecode: 'V3', error: '지금은 처리할 수 없어요. 잠시 뒤 다시 눌러 주세요. (코드 V3)' }), v4: await map({ ok: false, ecode: 'V4' }), empty: await map({ ok: false }),
      limit: await map({ ok: false, limit: true, error: '이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요' }), bad: await map({ ok: false, bad: true, error: '이 줄 글에 소리로 읽기 어려운 글자가 있어요. 글을 고치거나 직접 녹음해 주세요' }),
      short: await map({ ok: false, short: true, error: '조금 더 천천히, 끝까지 읽어 주세요' }), old: await map({ ok: false, error: '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요' }) }; });
  const zf = await pg.evaluate(() => { const h = 'zz-test-h'; PT.failWhy = PT.failWhy || {}; PT.failH = PT.failH || {}; PT.failWhy[h] = '고객 정보를 찾을 수 없습니다'; PT.failH[h] = 1; const t = _ptTurnWhy(h), codes = _ptFailCodes(); delete PT.failWhy[h]; delete PT.failH[h];
    MK.lineErr = MK.lineErr || {}; MK.lineErr.g0 = '아직 만든 AI 목소리가 없어요'; const o = window._upStale; window._upStale = () => true; const v = _vtWhyT('g0', false); window._upStale = o; delete MK.lineErr.g0; return { t, codes, v }; });
  ok('⑪ 화면이 만든 요약 글(연습 차례 · 못 만든 차례 모음 · 다시 만들기 알림)은 까닭이 서버 글만(코드 없음)이어도 V0 를 단다 [ERR_ZERO_TEXT]', zf.t === '이 차례는 AI 목소리를 만들지 못했어요 · 글을 보며 읽어 주세요 (코드 V0)' && zf.codes === ' (코드 V0)' && zf.v === '바뀐 글로 만들지 못했어요 · 이번엔 글로 보여 드려요 (코드 V0)', JSON.stringify(zf));
  ok('⑪ 목소리 거절도 받는 자리 한 곳 — 0 은 글만 · 1~9 는 «. (코드» 없이 코드 꼬리(사고번호) 그대로 · ecode 만 오면 그 코드 · 빈 답 V0 · 예산 · 글자 · 짧은 녹음은 종전 글(코드 없음) · 옛 서버 글은 V0 [VC_DONE_LINE]',
    vd.zero === '아직 만든 AI 목소리가 없어요' && vd.noec === '고객 정보를 찾을 수 없습니다' && vd.v9 === '요청을 처리하지 못했어요 · 잠시 후 다시 시도해 주세요 (코드 V9 · 7KQ2)' && vd.v3 === '지금은 처리할 수 없어요 · 잠시 뒤 다시 눌러 주세요 (코드 V3)'
    && vd.v4 === '처리하지 못했어요 · 다시 눌러 주세요 (코드 V4)' && vd.empty === '지금은 안 돼요 · 잠시 뒤 다시 눌러 주세요 (코드 V0)' && !/코드/.test(vd.limit + vd.bad + vd.short) && /글을 고쳐 다시 만들어 주세요/.test(vd.bad) && vd.short === '조금 더 천천히, 끝까지 읽어 주세요' && vd.old === '지금은 안 돼요 · 잠시 뒤 다시 눌러 주세요 (코드 V0)', JSON.stringify(vd));

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
  await pg.evaluate(() => { window.__mock['momentedit:ritualFile'] = () => null; __shrink({ 75000: 150, 8000: 40, 20000: 40 }); mkRecUse(); });   /* [UP_AGAIN] 75초 답 없음도 두 번 더 보낸 뒤에야 U5 */
  await wait(1600);
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
    window.__mock['momentedit:ritualFile'] = () => null; __shrink({ 75000: 200, 8000: 40, 20000: 40 }); window.__sent0 = window.__sent.filter((t) => t === 'momentedit:ritualFile').length; if (MK.lineErr) delete MK.lineErr.g1; MK.toast = ''; __trapToast();
    _vcMake('g1', {}).catch(() => {}); });
  await wait(3500);
  const f3d = await pg.evaluate(() => { __unshrink(); const o = { le: (MK.lineErr || {}).g1 || '', toasts: (window.__toasts || []).join(' | '), sent: window.__sent.filter((t) => t === 'momentedit:ritualFile').length - window.__sent0 }; __untrapToast(); return o; });
  ok('③ AI 줄 75초 → 그 줄 아래 U5 한 번(«응답이 없어요» 알림 · «만든 소리를 저장하지 못했어요» 겹침 없음)', f3d.le === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && !/응답이 없어요|저장하지 못했어요/.test(f3d.toasts) && f3d.sent === 3 /* [UP_AGAIN] 처음 + 두 번 더 */, JSON.stringify(f3d));

  /* ⑥ F6 ▶ 파일 받기 */
  await pg.evaluate(() => { S.up = S.up || {}; S.up.g2 = { n: '녹음', id: 'f-g2-404', src: 'rec', at: '' }; delete RF_URL.g2; delete RF_URL['g2#']; delete RF_LOAD['f-g2-404']; delete RF_ERR['f-g2-404']; if (MK.lineErr) delete MK.lineErr.g2;
    window.__mock['momentedit:ritualFileGet'] = () => ({ ok: false, error: '파일을 찾을 수 없어요.', ecode: 'L0' }); render(); mkUpPlay('g2'); });
  await wait(500);
  const f6 = await pg.evaluate(() => ({ le: (MK.lineErr || {}).g2 || '', load: !!RF_LOAD['f-g2-404'], shown: [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].some((p) => p.textContent === (MK.lineErr || {}).g2) }));
  ok('⑥ ▶ 파일 받기 실패(못 찾음 · 서버 글 + 0 은 글이 곧 까닭 ERR_ZERO_TEXT) → 그 줄 아래 까닭 · «불러오는 중»에 머물지 않음', f6.le === '파일을 찾을 수 없어요' && !f6.load && f6.shown, JSON.stringify(f6));
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

  /* ───── ⑪ [ERR_R1_BUILDER] 1라운드(triage-builder) — 고친 것마다 «되돌리면 빨강» ───── */
  const r14 = await pg.evaluate(async () => { _stopAud(); const b = document.createElement('button'); b.textContent = '들어 보기'; document.body.appendChild(b); const me = AUDTOK; AUDBTN = b; AUDO = b.innerHTML; b.classList.add('playing');
    _start(b, [{ src: URL.createObjectURL(__wav(0.3, 8000)) }, { src: '/assets/audio/__none-c.mp3' }], me);
    for (let i = 0; i < 80 && !/코드/.test(b.textContent); i++) await new Promise((r) => setTimeout(r, 50)); const t = b.textContent, nw = !!b.querySelector('.ec-nw'); _stopAud(); b.remove(); return { t, nw }; });
  ok('⑪ 이어 듣기에서 일부만 못 열면 «일부 소리를 못 불러왔어요 · 1개 건너뜀 (코드 L0)»(«준비 중» 추측 아님) · 코드 한 덩어리 [SKIP_CODE · CODE_NOWRAP]', r14.t === '일부 소리를 못 불러왔어요 · 1개 건너뜀 (코드 L0)' && r14.nw, JSON.stringify(r14));
  const r17 = await pg.evaluate(() => [_micWhy({ name: 'InvalidStateError' }, 'g0'), _micWhy({ name: 'InvalidStateError' }, 'vc:groom:1'), _micWhy({ name: 'NotReadableError' }, 'vc:groom:1')]);
  ok('⑪ 까닭을 모르는 마이크 오류는 M0(«다른 앱이 마이크를 써요» M3 아님) · 다른 앱은 그대로 M3 [MIC_M0]', /\(코드 M0\)$/.test(r17[0]) && r17[1] === '마이크를 열지 못했어요 · 다시 눌러 주세요 (코드 M0)' && r17[2] === '다른 앱이 마이크를 써요 · 그 앱을 닫아 주세요 (코드 M3)', JSON.stringify(r17));
  const r18 = await pg.evaluate(async () => { const s0 = window._mkSendWav0; let n = 0; window._mkSendWav0 = function () { n++; throw new Error('read'); };
    __shrink({ 8000: 30 }); if (MK.lineErr) delete MK.lineErr.g2; MK_UP.g2 = 1; const again = _upAgain('g2', { blob: new Blob(), url: '', src: 'rec', nm: '녹음', meta: null, n: 0 }, { ok: false, ecode: 'U6' });
    await new Promise((r) => setTimeout(r, 300)); __unshrink(); window._mkSendWav0 = s0; const o = { again, n, le: (MK.lineErr || {}).g2 || '', up: !!MK_UP.g2 }; if (MK.lineErr) delete MK.lineErr.g2; return o; });
  ok('⑪ 다시 보내기 직전에 던지면(기기 쪽) 연결(U6)이 아니라 첫 보내기와 같은 U0 · «보내는 중»에 멈추지 않음 [UP_AGAIN_THROW]', r18.again && r18.n === 1 && r18.le === '올리지 못했어요 · 다시 눌러 주세요 (코드 U0)' && !r18.up, JSON.stringify(r18));
  const r5 = await pg.evaluate(() => { if (MK.lineErr) delete MK.lineErr.g0; __trapToast(); const a = new Audio(); MK.aud = a; MK.audKey = 'turn:g0:1'; _playFail(a, new DOMException('blocked', 'NotAllowedError'));
    const o = { le: (MK.lineErr || {}).g0 || '', toasts: (window.__toasts || []).join(' | '), aud: !!MK.aud }; __untrapToast(); if (MK.lineErr) delete MK.lineErr.g0; render(); return o; });
  ok('⑪ «이 자리 들어 보기»(turn:) 재생 막힘 → 그 줄 아래 M7 · ■ 를 ▶ 로(맨 위 알림 아님) [TURN_PLAY_FAIL]', r5.le === '재생이 막혔어요 · ▶ 를 다시 눌러 주세요 (코드 M7)' && !r5.toasts && !r5.aud, JSON.stringify(r5));
  const r4 = await pg.evaluate(async (st) => { window.__STOK = st; S.pvVoice = 'couple'; S.pvText = '두 사람이 함께 고른 영상을 소개합니다.'; if (MK.lineErr) delete MK.lineErr.pv; MK.nowWhy = {}; MK.nowUrl = {};
    window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? window.__STOK : d.op === 'practice' ? { ok: false, down: true, kind: 'busy', http: 429, error: '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요' } : { ok: false, error: 'x' });
    __trapToast(); _playNowText('pv'); for (let i = 0; i < 30 && !(MK.lineErr || {}).pv; i++) await new Promise((r) => setTimeout(r, 50)); const o = { le: (MK.lineErr || {}).pv || '', toasts: (window.__toasts || []).join(' | ') }; __untrapToast();
    __trapToast(); _playNowText('pv'); const cleared = !(MK.lineErr || {}).pv; for (let i = 0; i < 30 && !(MK.lineErr || {}).pv; i++) await new Promise((r) => setTimeout(r, 50)); __untrapToast(); o.cleared = cleared; if (MK.lineErr) delete MK.lineErr.pv; return o; }, ST_OK);
  ok('⑪ 바뀐 글 줄 ▶ 의 연습 AI 읽기 실패 → 그 줄 아래 까닭(V1) · 맨 위 알림엔 «준비하고 있어요»만 · 다시 누르면 앞 까닭은 걷는다 [NOW_LINE_FAIL]', r4.le === '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)' && r4.toasts === '들려 드릴 소리를 준비하고 있어요' && r4.cleared, JSON.stringify(r4));
  const r6 = await pg.evaluate(async () => { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked', 'NotAllowedError')); };
    VC.read = null; VC.tune = { who: 'groom', tempo: '1', pause: 350, err: '' }; VC.sraw.groom = { x: new Float32Array(8000).map((x, i) => 0.1 * Math.sin(i / 9)), sr: 8000, text: _tuneText() }; render();
    _vcSamplePlay(); await new Promise((r) => setTimeout(r, 200)); const auto = VC.tune.err;
    _vcSamplePlay(true); await new Promise((r) => setTimeout(r, 200)); const forced = VC.tune.err, p = document.querySelector('#mkRecDlg .mk-exw[role="alert"]'), shown = p ? __N(p.textContent) : '', nw = !!(p && p.querySelector('.ec-nw'));
    HTMLMediaElement.prototype.play = P; VC.tune = null; delete VC.sraw.groom; MK.aud = null; MK.audKey = null; render(); return { auto, forced, shown, nw }; });
  ok('⑪ 맞추기 창 «예시 들어 보기»를 눌렀는데 막히면 창 안 M7 한 줄(코드 한 덩어리) · 저절로 틀다 막힌 것은 조용히(TUNE_PLAY_TRUE) [TUNE_PLAY_WHY · CODE_NOWRAP]', r6.auto === '' && r6.forced === '재생이 막혔어요 · ▶ 를 다시 눌러 주세요 (코드 M7)' && r6.shown === r6.forced && r6.nw, JSON.stringify(r6));
  const r10 = await pg.evaluate(async () => { const AC0 = window.AudioContext; let made = 0, closed = 0; window.AudioContext = function () { const c = new AC0(); made++; const cl = c.close.bind(c); c.close = () => { closed++; return cl(); }; return c; }; window.webkitAudioContext = window.AudioContext;
    window.__mock['momentedit:voiceClone'] = (d) => (d.op === 'status' ? window.__STOK : d.op === 'make' ? { ok: true, left: 900, parts: [{ who: 'groom', mime: 'audio/mpeg', data: btoa('not audio at all') }] } : { ok: false, error: 'x' });
    VC.tune = { who: 'groom', tempo: '1', pause: 350, err: '' }; delete VC.sraw.groom; const r = await _vcSampleLoad('groom', '시험으로 읽어 볼 글입니다.'); const o = { r, err: VC.tune.err, made, closed };
    window.AudioContext = AC0; window.webkitAudioContext = AC0; VC.tune = null; render(); return o; });
  ok('⑪ 맞추기 예시 소리를 이 기기가 못 풂 → «소리를 열지 못했어요 · 다시 눌러 주세요 (코드 M6)» · 해독이 실패해도 오디오 문맥을 닫는다 [SAMPLE_M6 · SAMPLE_CTX_CLOSE]', r10.r === null && r10.err === '소리를 열지 못했어요 · 다시 눌러 주세요 (코드 M6)' && r10.made === 1 && r10.closed === 1, JSON.stringify(r10));
  const r12 = await pg.evaluate(async () => { const mk0 = window._vcMake, lw0 = window._vcLineWho, wa0 = window._vcWarmAll; S.guestVoice = 'couple'; S.vself = {}; S.up = S.up || {}; ['g0', 'g1', 'g2', 'g3'].forEach((k) => { S.up[k] = 0; }); MK.lineErr = {};
    window._vcLineWho = () => 'both'; window._vcWarmAll = () => {}; let n = 0; window._vcMake = (k) => { n++; if (n === 1) return Promise.resolve(); MK.lineErr[k] = n === 2 ? '저희 쪽 계정 문제예요 · 문의해 주세요 (코드 V2)' : n === 3 ? '아직 만든 AI 목소리가 없어요' : '저희 쪽 계정 문제예요 · 문의해 주세요 (코드 V2)'; return Promise.reject(0); };
    VC.read = { who: 'groom', take: {}, phrase: '', step: 2, ph: 'done', err: '' }; _vcAutoFill('groom'); await new Promise((r) => setTimeout(r, 300));
    const p = document.querySelector('#mkRecDlg .mk-dlg-c1.mk-two'); const o = { t: p ? __N(p.textContent) : '', role: p ? p.getAttribute('role') : '', codes: ((VC.fill || {}).codes || []).join(','), n: (VC.fill || {}).n, ok: (VC.fill || {}).ok, nw: !!(p && p.querySelector('.ec-nw')) };
    window._vcMake = mk0; window._vcLineWho = lw0; window._vcWarmAll = wa0; VC.read = null; VC.fill = null; MK.lineErr = {}; render(); return o; });
  ok('⑪ 빈 줄 채우기 결과 창 — 못 채운 줄이 있으면 끝에 그 까닭 코드(V2 · 서버 글만 온 거절은 V0 · 많아야 둘) · role=alert [FILL_CODES]', r12.ok === 1 && r12.n > 1 && r12.codes === 'V2,V0' && /\(코드 V2 · V0\)$/.test(r12.t) && /나머지는 줄 카드의 \[목소리 만들기\]를 눌러 주세요/.test(r12.t) && r12.role === 'alert' && r12.nw, JSON.stringify(r12));
  /* [PLAY_FILE_WHY · LOAD_WAIT_KEEP] 두 분 소리 파일을 기다리는 동안 탭 잠금 무음이 끝나도 그 줄을 건너뛰지 않는다 → 끝내 못 받으면 예시 목소리로 흘리지 않고 글 + 까닭 */
  await pg.evaluate(() => { lsStop(); LP.unlocked = false; S.entryVoice = 'couple'; S.touched = Object.assign({}, S.touched, { entryVoice: 1 }); S.up = S.up || {}; S.up.entry = { n: '녹음', id: 'f-entry-why', src: 'rec', at: '' };
    delete RF_URL.entry; delete RF_URL['entry#']; delete RF_LOAD['f-entry-why']; delete RF_ERR['f-entry-why'];
    window.__mock['momentedit:ritualFileGet'] = () => null;   /* 답이 아직 안 온다 */
    S.on = S.on || {}; S.on.entry = 1; opSync(); lsBig('entry'); });
  await wait(1200);
  const p0 = await pg.evaluate(() => ({ n: LP.q.length, up: (LP.q[LP.i] || {}).up, load: LP.loadK, unlocked: !!LP.unlocked, note: /불러오는 중/.test((document.getElementById('lsFull') || {}).textContent || '') }));
  ok('⑪ 처음 듣기 — 두 분 소리 파일을 기다리는 동안 탭 잠금 무음이 끝나도 그 줄을 건너뛰지 않는다(«두 분 목소리를 불러오는 중이에요») [LOAD_WAIT_KEEP]', p0.n > 0 && p0.up === 'entry' && p0.load === 'entry' && p0.unlocked && p0.note, JSON.stringify(p0));
  await pg.evaluate(() => { _rfData({ key: 'entry', id: 'f-entry-why', ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' }); });   /* 늦게 온 답 — 로그인 풀림 */
  await wait(700);
  const p1b = await pg.evaluate(() => { const st = LP.q[LP.i] || {}, lab = (document.querySelector('#lsFull .lf-lab') || {}).textContent || ''; return { up: st.up, src: st.src || null, pfail: st.pfail || '', lab: __N(lab), load: LP.loadK, big: !!LP.big }; });
  ok('⑪ 두 분 소리 파일을 못 받으면(로그인 풀림) 예시 목소리로 흘리지 않고 글 + «두 분 목소리 · 소리를 불러오지 못해 글로 보여 드려요 (코드 L8)» · 8초를 다 기다리지 않는다 [PLAY_FILE_WHY]', p1b.big && p1b.up === 'entry' && !p1b.src && p1b.pfail === 'L8' && p1b.lab === '두 분 목소리 · 소리를 불러오지 못해 글로 보여 드려요 (코드 L8)' && !p1b.load, JSON.stringify(p1b));
  const n3big = await pg.evaluate(() => { const st = LP.q[LP.i], T1 = '바뀐 글로 만들지 못했어요 · 이번엔 글로 보여 드려요 (코드 V4)'; MK.toast = ''; _lNote(st, T1); const f = document.querySelector('#lsFull .lf-note'); const o = { t: f ? __N(f.textContent) : '', c: f ? f.className : '', toast: MK.toast, nw: !!(f && f.querySelector('.ec-nw')) }; lsStop(); return o; });
  for (let i = 0; i < 20 && await pg.evaluate(() => !!LP.big); i++) await wait(100);   /* 크게 보기는 뒤로(popstate)로 닫힌다 */
  const n3pr = await pg.evaluate(() => { const T1 = '바뀐 글로 만들지 못했어요 · 이번엔 글로 보여 드려요 (코드 V4)'; const i0 = idx; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'practice') idx = i; const t0 = document.getElementById('_toast'); if (t0) t0.textContent = ''; _lNote({ k: 'entry' }, T1); const tt = document.getElementById('_toast'); const o = { toast: tt ? __N(tt.textContent) : '', role: tt ? tt.getAttribute('role') : '', mk: MK.toast, big: !!LP.big };
    idx = i0; MK.toast = ''; render(); return o; });
  const n3 = { big: n3big, pr: n3pr };
  ok('⑪ 듣는 줄 알림 — 크게 보기면 그 안 그 줄 아래(진사 · 코드 한 덩어리) · ③ 작은 플레이어면 화면 알림(role=alert) · 맨 위 MK.toast 에 남기지 않는다 [LISTEN_NOTE]', n3.big.t === '바뀐 글로 만들지 못했어요 · 이번엔 글로 보여 드려요 (코드 V4)' && /mk-exw/.test(n3.big.c) && !n3.big.toast && n3.big.nw && n3.pr.toast === n3.big.t && n3.pr.role === 'alert' && !n3.pr.mk, JSON.stringify(n3));
  /* [PLAY_FILE_WHY] ② 순간 쪽(줄 ▶ 만 있고 작은 플레이어가 없다) — «이 순간 들어 보기»에서 두 분 소리 파일을 못 받으면 그 줄 아래에도 까닭 */
  await pg.evaluate(() => { lsStop(); });
  for (let i = 0; i < 20 && await pg.evaluate(() => !!LP.big); i++) await wait(100);
  await pg.evaluate(() => { S.up.entry = { n: '녹음', id: 'f-entry-why2', src: 'rec', at: '' }; delete RF_URL.entry; delete RF_URL['entry#']; delete RF_LOAD['f-entry-why2']; delete RF_ERR['f-entry-why2']; if (MK.lineErr) delete MK.lineErr.entry;
    window.__mock['momentedit:ritualFileGet'] = () => ({ ok: false, error: '파일을 찾을 수 없어요.', ecode: 'L0' }); mkGo('entry'); if (!(STEPS[idx] && STEPS[idx].k === 'listen')) opGoStep('listen'); });
  await wait(500);
  await pg.evaluate(() => { lsPlay('entry'); });
  await wait(1500);
  const p2 = await pg.evaluate(() => ({ step: (STEPS[idx] || {}).k, at: _mkState().at, le: (MK.lineErr || {}).entry || '', shown: [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].map((p) => __N(p.textContent)), big: !!LP.big, mini: document.documentElement.classList.contains('lsmini'), pend: _pendT(LP.q[LP.i] || {}, 1) }));
  ok('⑪ ② «이 순간 들어 보기»에서 두 분 소리 파일을 못 받으면 그 줄 아래 까닭(서버 글 + 0 은 글만) — 작은 플레이어가 없는 쪽이라 말없이 넘어가지 않게 [PLAY_FILE_WHY]', p2.step === 'listen' && p2.at === 'entry' && !p2.big && !p2.mini && p2.le === '파일을 찾을 수 없어요' && p2.shown.indexOf(p2.le) > -1, JSON.stringify(p2));
  /* [RF_LINE_CLEAR] 받아서 틀면 그 줄 아래 코드 없는 받기 실패 글도 걷는다(다른 일의 까닭은 그대로) */
  const p3 = await pg.evaluate(() => { lsStop(); const pl0 = window._playLead; window._playLead = () => {};   /* 소리는 틀지 않는다(늦은 오류 알림이 다음 시험에 끼지 않게) */
    RF_URL.entry = 'blob:none'; RF_URL['entry#'] = 'f-entry-why2'; MK.rfWant = null; mkUpPlay('entry'); const a = (MK.lineErr || {}).entry || ''; _stopMk();
    MK.lineErr.entry = '아직 만든 AI 목소리가 없어요'; mkUpPlay('entry'); const b = (MK.lineErr || {}).entry || ''; _stopMk(); window._playLead = pl0; delete MK.lineErr.entry; delete RF_URL.entry; delete RF_URL['entry#']; render(); return { a, b }; });
  ok('⑪ 받아서 틀면 그 줄 아래 앞 받기 실패 글(코드 없는 서버 글)을 걷는다 · 다른 일의 까닭은 그대로 [RF_LINE_CLEAR]', p3.a === '' && p3.b === '아직 만든 AI 목소리가 없어요', JSON.stringify(p3));
  await pg.evaluate(() => { lsStop(); if (MK.lineErr) delete MK.lineErr.entry; render(); });
  /* [ENG_FAIL_SHOW] 새 코스에서 엔진을 못 받음 → 빈 크게 보기를 닫고 보이는 알림 */
  FLAG.failEng = true;
  const e2 = await pg.evaluate(async () => { const g = ENG; ENG = null; ENGP = null; const t0 = document.getElementById('_toast'); if (t0) t0.textContent = ''; lsPlayAll();
    for (let i = 0; i < 60 && !/코드/.test((document.getElementById('_toast') || {}).textContent || ''); i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 400)); const t = document.getElementById('_toast'), f = document.getElementById('lsFull'); const o = { toast: t ? __N(t.textContent) : '', role: t ? t.getAttribute('role') : '', big: !!LP.big, full: !!(f && !f.hidden) };
    ENG = g; ENGP = null; return o; });
  FLAG.failEng = false;
  ok('⑪ 새 코스에서 소리 엔진을 못 받으면 빈 크게 보기를 닫고 보이는 알림 한 줄(role=alert · L0) — LS.msg(옛 화면)에만 두지 않는다 [ENG_FAIL_SHOW]', e2.toast === '소리를 불러오지 못했어요 · 잠시 뒤 다시 눌러 주세요 (코드 L0)' && e2.role === 'alert' && !e2.big && !e2.full, JSON.stringify(e2));
  /* [SAVE_THROW_SAY · EXIT_THROW_SAY] 꾸러미를 못 지음 */
  const r7 = await pg.evaluate(async () => { const op = window._ordPayload; window._ordPayload = function () { throw new Error('boom'); }; _saving = false; _saveErr = ''; doSave(); const s1 = { err: _saveErr, saving: _saving };
    window.__exitSent = 0; const h = (ev) => { if (ev.data && ev.data.type === 'momentedit:orderExit') window.__exitSent++; }; window.addEventListener('message', h);
    courseStarted = true; _doneSaved = false; _saving = false; _autoWait = false; _autoState = ''; _autoLast = 'x'; window._vtExitDone = true; window._obExit();
    await new Promise((r) => setTimeout(r, 300)); const y = document.querySelector('.ord-ask .oa-yes'); if (y) y.click(); await new Promise((r) => setTimeout(r, 450));
    const d = document.querySelector('.ord-ask .oa-d'), t = document.querySelector('.ord-ask .oa-t'); const s2 = { title: t ? t.textContent : '', body: d ? d.textContent : '', sent: window.__exitSent, btn: (document.getElementById('obExit') || {}).textContent };
    const y2 = document.querySelector('.ord-ask .oa-yes'); if (y2) y2.click(); await new Promise((r) => setTimeout(r, 300)); window.removeEventListener('message', h); window._ordPayload = op; window._vtExitDone = false; _autoLast = _autoKey(); _saveErr = ''; render(); return { s1, s2 }; });
  ok('⑪ 꾸러미를 못 지으면 완성 저장은 바로 S9(16초 뒤 «저장됐을 수 있어요 S5» 아님) · 나가기는 data:null 로 안 보내고 그 자리에서 «나가기 전 저장이 안 됐어요» + S9 · 나가기 단추는 다시 누를 수 있게 [SAVE_THROW_SAY · EXIT_THROW_SAY]',
    r7.s1.err === '뜻밖의 오류예요 · 잠시 뒤 다시 눌러 주세요 (코드 S9)' && !r7.s1.saving && r7.s2.title === '나가기 전 저장이 안 됐어요' && r7.s2.body === '뜻밖의 오류예요 · 잠시 뒤 다시 눌러 주세요 (코드 S9)\n\n고르신 내용은 이 기기에 그대로 있어요.' && r7.s2.sent === 0 && r7.s2.btn === '나가기', JSON.stringify(r7));
  const r19 = await pg.evaluate(async () => { courseStarted = true; _doneSaved = false; _saving = false; _autoWait = false; _autoState = 'fail'; _autoWhy = '연결이 끊겼어요 · 다시 저장해 주세요 (코드 S6)'; _autoLast = ''; window._vtExitDone = true; window._obExit(); await new Promise((r) => setTimeout(r, 300));
    const d = document.querySelector('.ord-ask .oa-d'), b = d ? d.textContent : '', nw = !!(d && d.querySelector('.ec-nw')); const c = document.querySelector('.ord-ask .oa-cancel'); if (c) c.click(); await new Promise((r) => setTimeout(r, 300)); window._vtExitDone = false; _autoState = ''; _autoWhy = ''; _autoLast = _autoKey(); render(); return { b: b.replace(/ /g, ' '), nw }; });
  ok('⑪ 나가기 판(방금 저장 실패) «… 남아 있어요 (코드 S6)» — 코드 앞 마침표 없음 · 코드 한 덩어리 [CODE_NO_DOT · CODE_NOWRAP]', /남아 있어요 \(코드 S6\)$/.test(r19.b) && !/\. \(코드/.test(r19.b) && r19.nw, JSON.stringify(r19));
  /* [ERR_ZERO_TEXT] 저장 실패가 서버 까닭 글만(코드 없음)이었어도 나가기 판은 화면이 지은 글 — S0 를 단다(까닭 글은 알림이 이미 말했다) */
  const r19z = await pg.evaluate(async () => { courseStarted = true; _doneSaved = false; _saving = false; _autoWait = false; _autoState = 'fail'; _autoWhy = '이미 확정된 식순이라 바꿀 수 없어요'; _autoLast = ''; window._vtExitDone = true; window._obExit(); await new Promise((r) => setTimeout(r, 300));
    const d = document.querySelector('.ord-ask .oa-d'), b = d ? d.textContent : ''; const c = document.querySelector('.ord-ask .oa-cancel'); if (c) c.click(); await new Promise((r) => setTimeout(r, 300)); window._vtExitDone = false; _autoState = ''; _autoWhy = ''; _autoLast = _autoKey(); render(); return { b: __N(b) }; });
  ok('⑪ 나가기 판 — 방금 실패의 까닭이 서버 글만(코드 없음)이어도 «… 남아 있어요 (코드 S0)» [ERR_ZERO_TEXT]', /남아 있어요 \(코드 S0\)$/.test(r19z.b), JSON.stringify(r19z));

  ok('390 화면 오류 0', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { ok('390 흐름이 끝까지 돈다(예외 없음)', false, String(e && e.message || e).split('\n')[0]); } finally { await ctx.close(); }
}

/* ───────── 360 — 한 줄 ───────── */
{
  const { ctx, pg, errs } = await open(360); try {
  await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; mkGo('guest'); }); await wait(500);
  /* 글은 화면 함수가 만든 그대로 잰다(문구를 고치면 이 검사가 다시 잰다) */
  const l1 = await pg.evaluate(() => { const C = [_ecWord('U', 0), _ecWord('U', 4), _ecWord('U', 5), _ecWord('U', 6), _ecWord('L', 0), _ecWord('L', 5), _ecWord('L', 6), _ecWord('L', 7), _ecWord('D', 5), EC_M6, '파일을 찾을 수 없어요', '지우지 못해 남아 있어요 · 다시 눌러 주세요 (코드 D6)', '파일을 지우지 못했어요 · 문의해 주세요 (코드 D4)', '재생이 막혔어요 · ▶ 를 다시 눌러 주세요 (코드 M7)', '목소리 정보가 안 왔어요 · 다시 눌러 주세요 (코드 V6)', '이 기기에 없는 녹음이에요 · 다시 녹음해 주세요', _ecWord('U', 1), _ecWord('U', 2), _ecWord('U', 3), _ecWord('U', 9), '만들지 못했어요 · 잠시 뒤 다시 눌러 주세요 (코드 V0)', _vcDownWord(1), '아직 만든 AI 목소리가 없어요'];   /* [ERR_R1_BUILDER] 만들기 대체 글 V0 · 연습 읽기 실패(NOW_LINE_FAIL) · 서버 까닭 글(ERR_ZERO_TEXT) */
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
  /* ⑪ [CODE_NOWRAP] 긴 실패 글이 줄을 넘겨도 «(코드 V9 · 7KQ2)»는 한 덩어리 — 그리는 순간에만 감싸고 글 자체(MK.lineErr)는 그대로 */
  await pg.evaluate(() => { MK_REC = null; mkGo('guest'); }); await wait(500);
  const nw = await pg.evaluate(() => { const L = '요청을 처리하지 못했어요 · 잠시 후 다시 시도해 주세요 (코드 V9 · 7KQ2)'; MK.lineErr = { g0: L }; render(); const p = [...document.querySelectorAll('.mk-pg .mk-exw[role="alert"]')].find((e) => /7KQ2/.test(e.textContent)), s = p && p.querySelector('.ec-nw');
    const o = { has: !!s, ws: s ? getComputedStyle(s).whiteSpace : '', rects: s ? s.getClientRects().length : 0, lines: p ? __lines(p) : 0, txt: p ? __N(p.textContent) : '', raw: MK.lineErr.g0 === L }; MK.lineErr = {}; render(); return o; });
  ok('⑪ 360 줄 아래 실패 글 — 줄이 넘어가도 «(코드 V9 · 7KQ2)»는 한 덩어리(nowrap · 상자 하나) · 글 자체는 그대로 [CODE_NOWRAP]', nw.has && nw.ws === 'nowrap' && nw.rects === 1 && nw.txt === '요청을 처리하지 못했어요 · 잠시 후 다시 시도해 주세요 (코드 V9 · 7KQ2)' && nw.raw, JSON.stringify(nw));
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok('⑩ 360 가로 넘침 없음', sw);
  ok('360 화면 오류 0', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { ok('360 흐름이 끝까지 돈다(예외 없음)', false, String(e && e.message || e).split('\n')[0]); } finally { await ctx.close(); }
}

/* ───────── ⑫ 콘솔 — 고객 미리 듣기(embed=1) [ERR_R1_BUILDER] ───────── */
{
  const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
  const openC = async (q, init) => { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const pg = await ctx.newPage(); const errs = [], dialogs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
    if (init) await pg.addInitScript(init);
    await pg.goto(`http://127.0.0.1:${port}/console.html?embed=1&mode=preview${q}`); await pg.waitForTimeout(600); return { ctx, pg, errs, dialogs }; };
  const intro = (pg) => pg.evaluate(() => { const w = document.getElementById('giWhy'), g = document.getElementById('giGo'); return { w: w && !w.hidden ? w.textContent : '', go: !!(g && g.offsetParent), on: document.getElementById('gIntro').classList.contains('on'), nw: !!(w && w.querySelector('.ec-nw')) }; });
  let cx = null;
  try {
    /* ⓐ 잘린 주소 */
    const S0 = b64({ course: 'family', guestVoice: 'couple', entry: 'B' });
    cx = await openC('&S=' + encodeURIComponent(S0.slice(0, S0.length - 7)));
    const a = await intro(cx.pg);
    ok('⑫ 콘솔 미리 듣기 — 잘린 주소(S 를 못 풂)면 시작하지 않고 «미리 듣기 주소가 잘렸어요 · 마이페이지에서 다시 열어 주세요 (코드 L7)» · «듣기 시작» 없음 [GUEST_LINK_CUT]', a.w === '미리 듣기 주소가 잘렸어요 · 마이페이지에서 다시 열어 주세요 (코드 L7)' && !a.go && a.on && a.nw, JSON.stringify(a));
    ok('⑫ ⓐ 화면 오류 0', !cx.errs.length, cx.errs.slice(0, 2).join(' | ')); await cx.ctx.close(); cx = null;
    /* ⓑ 엔진이 모르는 코스 */
    cx = await openC('&S=' + encodeURIComponent(b64({ course: 'retired-course-x' })));
    const b = await intro(cx.pg);
    ok('⑫ 엔진이 모르는 코스 — 고객 화면엔 시스템 판(alert) 없이 인트로 한 줄 «고르신 코스를 찾지 못해 기본 순서로 들려드려요 (코드 L3)»(인트로의 «들려드려요»와 같은 띄어쓰기) · 들을 수는 있다 [GUEST_LOST_LINE]', !cx.dialogs.length && b.w === '고르신 코스를 찾지 못해 기본 순서로 들려드려요 (코드 L3)' && b.go, JSON.stringify({ b, d: cx.dialogs }));
    await cx.ctx.close(); cx = null;
    /* ⓒ 순서를 못 만듦(엔진이 던짐) */
    cx = await openC('');
    await cx.pg.evaluate(() => { RitualCue.build = function () { throw new TypeError('boom is not a function'); }; });
    await cx.pg.click('#giGo'); await cx.pg.waitForTimeout(400);
    const c = await intro(cx.pg); const ct = await cx.pg.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    ok('⑫ 순서를 못 만들면 영어 예외 글 대신 인트로에 «미리 듣기를 만들지 못했어요 · 마이페이지에서 다시 열어 주세요 (코드 L9)» [GUEST_BUILD_FAIL]', c.w === '미리 듣기를 만들지 못했어요 · 마이페이지에서 다시 열어 주세요 (코드 L9)' && c.on && !c.go && !/boom|TypeError|순서를 만들 수 없습니다/.test(ct), JSON.stringify({ c, ct }));
    await cx.ctx.close(); cx = null;
    /* ⓓ 녹음 목록을 못 받음(500 · 한 번 더 받아도) → 글 카드 아래 까닭 */
    FLAG.failRec = true;
    cx = await openC('');
    await cx.pg.click('#giGo');
    await cx.pg.waitForFunction(() => { const w = document.getElementById('gWhy'); return !!(w && !w.hidden); }, null, { timeout: 15000 }).catch(() => {});
    const d = await cx.pg.evaluate(() => { const w = document.getElementById('gWhy'), s = w && w.querySelector('.ec-nw'); return { w: w && !w.hidden ? w.textContent : '', nw: !!s, ws: s ? getComputedStyle(s).whiteSpace : '', lines: w && !w.hidden ? Math.round(w.getBoundingClientRect().height / parseFloat(getComputedStyle(w).lineHeight)) : 0 }; });
    FLAG.failRec = false;
    ok('⑫ 녹음 목록을 못 받으면 글 카드 아래 «소리를 불러오지 못해 글로 보여 드려요 (코드 L0)» · 코드 한 덩어리 · 390 한 줄 [GUEST_REC_WHY · GUEST_WHY · CODE_NOWRAP]', d.w === '소리를 불러오지 못해 글로 보여 드려요 (코드 L0)' && d.nw && d.ws === 'nowrap' && d.lines === 1, JSON.stringify(d));
    ok('⑫ ⓓ 화면 오류 0', !cx.errs.length, cx.errs.slice(0, 2).join(' | ')); await cx.ctx.close(); cx = null;
    /* ⓔ 재생 막힘(M7) → 한 줄 · 누르면 그 손가락 안에서 소리 요소를 푼다 */
    cx = await openC('', () => { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (this.id === 'aNarr' && window.__block !== false && !/^data:/.test(this.getAttribute('src') || '')) return Promise.reject(new DOMException('blocked', 'NotAllowedError')); return P.apply(this, arguments); }; });
    await cx.pg.click('#giGo');
    let m7 = false; for (let i = 0; i < 24 && !m7; i++) { await cx.pg.waitForTimeout(500); m7 = await cx.pg.evaluate(() => { const w = document.getElementById('gWhy'); return !!(w && !w.hidden && /M7/.test(w.textContent)); }); if (!m7 && i % 6 === 5) await cx.pg.evaluate(() => { const b0 = document.getElementById('mBtn'); if (b0) b0.click(); }); }
    const e = await cx.pg.evaluate(() => (document.getElementById('gWhy') || {}).textContent || '');
    await cx.pg.evaluate(() => { window.__block = false; document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await cx.pg.waitForTimeout(250);
    const u = await cx.pg.evaluate(() => (document.getElementById('aNarr').getAttribute('src') || '').slice(0, 15));
    ok('⑫ 재생이 막히면 «재생이 막혔어요 · 화면을 한 번 누르면 이어서 들려요 (코드 M7)» · 누르면 그 손가락 안에서 소리 요소를 푼다 [GUEST_WHY]', e === '재생이 막혔어요 · 화면을 한 번 누르면 이어서 들려요 (코드 M7)' && u === 'data:audio/wav;', JSON.stringify({ e, u }));
    ok('⑫ ⓔ 화면 오류 0', !cx.errs.length, cx.errs.slice(0, 2).join(' | ')); await cx.ctx.close(); cx = null;
  } catch (e) { ok('⑫ 콘솔 흐름이 끝까지 돈다(예외 없음)', false, String(e && e.message || e).split('\n')[0]); } finally { FLAG.failRec = false; if (cx) await cx.ctx.close(); }
}
await br.close(); srv.close();
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
