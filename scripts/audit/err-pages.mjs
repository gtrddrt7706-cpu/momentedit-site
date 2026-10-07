#!/usr/bin/env node
/* ★★[ERR_CODE_PAGES 2026-10-07 사장님 «다른 부분들도 스크린샷으로 혹은 고객이 오류 코드 등을 알려 주면 관리자가 어떤 문제인지 알 수 있게 · 전부 개선»]
   고객 · 하객 · 직원 화면의 실패가 «까닭 한 줄 + (코드 X#)»로 보이는지 «실제로 실패시켜» 잰다(목소리는 vc-down-kind.mjs 가 잰다).
   글자 = 어디서(B 예약 · 문의 · 취소 / P 결제 / A AI 상담 / G 하객 / L 불러오기(콘솔)) · 숫자 = 무슨 일(assets/err-codes.js 표).

   ① 정적 — 여섯 쪽의 같은 이름 네 함수(_ecN · _ecOff · _ecNet · _ecSrv)가 같은 몸통인가 · 옛 문구(«네트워크 상태를 확인» 등)가 사라졌나
   ② 서버(api) — 노드에서 핸들러를 직접 부른다(가짜 fetch):
      handoff 요약 실패 → 대화 원문을 GAS 로 넘김(F7) · advisor 502 에 업체 번호 · 실패 질문 «오류» 기록(F6) · schedule-advisor 주소 없음 = 모름(avail:'unknown') · 업체 실패 502(F8)
   ③ 화면 — 가짜 GAS · /api 로 실제로 실패시킨다(긴 타이머는 1/10 로 줄여 돈다):
      cancel 시간 초과 → 다시 확인 → 완료 화면(F3) · 무효 링크 B8 · schedule 토스 failUrl 카드사 거절 P4 · 중간 끊김 P5 · 승인 확인 자동 재시도(F4 · F5)
      위젯 429 → A1 · 베르셀 504(HTML) → A7 · 디렉터 전달 실패에 «전달했어요» 없음(F6 · F7) · 날짜 확인 A3(F8)
      live INTERNAL_ERROR → G9(링크 안내 아님) · COUPLE_NOT_FOUND → 링크 안내 · 편지 INTERNAL_ERROR 영문 미노출(F9)
      청첩장(hydrate) 서버가 안 오면 «{{…}}»를 보이지 않고 기다림 한 줄 → 예시 + G5 · G9(F9)
      guide 사진 설정 없음 G3(다시 시도 없음) · 드라이브 실패 G4 · 연결 G6(F10) · 좌석 «아직 배치가 없어요»(F11) · seat 서버 답이 깨짐 G7(F2) · 콘솔 로그인 풀림 L8(F12)
   ④ 360px 폰에서 한 줄 — 취소 · 좌석 · 예약 화면의 실패 줄
   ⑤ [ERR_PAGES_R2 2026-10-07 2라운드] ERR_N_HONEST(0 = 화면 쪽 예외 · 6 은 fetch 실패 글만) · ERR_NO_DOT_PAGE(코드 앞 마침표 · 마침표 없는 옛 doPost 글) ·
      ERR_RETRY_3 · ERR_CODE_GLUE(«(코드 …)» 괄호 안 줄바꿈 기회 없음) · SCHED_SUBMIT_RECHECK · SCHED_NO_TOKEN · HOLD_WT_WHY · LETTER_TIMEOUT · COPY_FAIL_SHOW(청첩장 24 · live · schedule) ·
      SHARE_COPY_FAIL · PLAY_FAIL_SAY(parents · 홈 저널) · PV_IMG_CODE · GUIDE_MINE_SWAP · HANDOFF_ECODE · SCHED_AI_EMPTY · SCRIPT_FILE_BACK(script-file · voice-file)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import zlib from 'node:zlib';
import { Readable } from 'node:stream'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ══════════ ① 정적 ══════════ */
function fnBody(src, name) {   // 'function name(' 의 몸통 — 중괄호를 세어 끝을 찾는다(이 네 함수엔 글자 속 중괄호가 없다)
  const i = src.indexOf('function ' + name + '('); if (i < 0) return null;
  let j = src.indexOf('{', i), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  return null;
}
const norm = (t) => String(t || '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
const SIX = ['cancel.html', 'schedule.html', 'inquiry.html', 'seat.html', 'guide.html', 'live.html'];
for (const fn of ['_ecN', '_ecOff', '_ecNet', '_ecSrv', '_ecGlue', '_ecHtml']) {   // [ERR_CODE_GLUE] 새 두 함수도 여섯 쪽이 글자까지 같아야 한다
  const bodies = SIX.map((f) => norm(fnBody(read(f), fn)));
  ok(`① ${fn} — 여섯 쪽(${SIX.join(' · ')})이 같은 몸통`, bodies.every((b) => b && b === bodies[0]), SIX.filter((f, i) => bodies[i] !== bodies[0]).join(','));
}
{
  /* 옛 «문구 그대로»(따옴표째) — 주석이 옛 문구를 인용하는 것은 괜찮다(왜 바꿨는지 남기는 자리) */
  const gone = [
    ['seat.html', "'잠시 후 다시 시도해 주세요. 네트워크 상태를 확인해 주세요.'"], ['seat.html', "'<div class=\"sm\">네트워크 상태를 확인한 뒤 다시 눌러 주세요.</div>'"],
    ['guide.html', "'잠시 후 다시 시도해 주세요. 네트워크 상태를 확인해 주세요.'"], ['guide.html', "'<div class=\"sm\">네트워크 상태를 확인한 뒤 다시 눌러 주세요.</div>'"], ['guide.html', '<div class="sm">잠시 후 새로고침해 주세요.</div>'],
    ['cancel.html', "'취소에 실패했어요. 네트워크 상태를 확인하고 잠시 후 다시 시도해 주세요.'"], ['cancel.html', "'네트워크 상태를 확인하고 잠시 후 다시 시도해 주세요.'"],
    ['schedule.html', "'불러오기 실패 · 새로고침 해주세요.'"], ['schedule.html', "'신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'"], ['schedule.html', "'네트워크 오류 · 잠시 후 다시 시도해 주세요.'"],
    ['schedule.html', "'결제를 진행하지 못했어요. 잠시 후 다시 시도해 주세요.'"], ['schedule.html', "'결제 확인을 마치지 못했어요. 카카오톡으로 알려 주시면 결제 상태를 확인해 드릴게요.'"], ['schedule.html', "'지금은 확인이 어려워요. 잠시 후 다시 시도해 주세요.'"],
    ['live.html', "'네트워크 오류입니다. 잠시 후 다시 시도해 주세요.'"], ['live.html', 'showError(data.error)'],
    ['index.html', "'연결이 잠시 불안정합니다. 디렉터가 직접 안내해 드릴게요.'"], ['index.html', "'지금은 자동 답변을 불러오지 못했어요. 디렉터가 직접 안내해 드릴게요.'"],
    ['assets/advisor-widget.js', "'연결이 잠시 불안정해요. 디렉터가 직접 안내해 드릴게요.'"], ['assets/advisor-widget.js', "'지금은 일정 확인이 어려워요. 잠시 후 다시 시도해 주세요.'"],
    ['shared/hydrate.js', 'setTimeout(reveal, 5000)'], ['shared/hydrate.js', "markDemo('연결이 불안정해요')"],
  ];
  const left = gone.filter(([f, t]) => read(f).includes(t)).map(([f, t]) => f + ' «' + t + '»');
  ok('① 옛 실패 문구가 남아 있지 않다(서버 사고도 «네트워크»로 말하던 것 · 영문 오류 이름 · 자리 표시를 여는 안전망)', !left.length, left.join(' | '));
  const w = read('assets/advisor-widget.js');
  ok('① 위젯 — «전달했어요»는 /api/handoff 답을 받은 뒤(doHandoff().then)에만', /doHandoff\(\)\.then\(function \(r\) \{\s*if \(r\.ok\)/.test(w) && w.lastIndexOf("'디렉터에게 바로 전달했어요") > w.indexOf('doHandoff().then('), '');
}

{
  /* [ERR_RETRY_3] _ecRetry 는 네 쪽(cancel · inquiry · seat · guide)에 있다 — 같은 몸통 */
  const FOUR = ['cancel.html', 'inquiry.html', 'seat.html', 'guide.html'];
  const rb = FOUR.map((f) => norm(fnBody(read(f), '_ecRetry')));
  ok('① [ERR_RETRY_3] _ecRetry — 네 쪽이 같은 몸통', rb.every((b) => b && b === rb[0]), FOUR.filter((f, i) => rb[i] !== rb[0]).join(','));
  /* 함수 자체를 노드에서 돌려 본다(cancel 판 · 여섯 쪽이 같으니 하나로 충분) */
  const src = ['_ecN', '_ecOff', '_ecNet', '_ecSrv', '_ecGlue', '_ecHtml', '_ecRetry'].map((n) => fnBody(read('cancel.html'), n)).join('\n');
  const F = new Function('navigator', src + '\nreturn { _ecN, _ecNet, _ecSrv, _ecGlue, _ecHtml, _ecRetry };')({ onLine: true });
  const te = (m) => new TypeError(m);
  ok('① [ERR_N_HONEST] _ecN — 6 은 fetch 가 연결을 못 한 글(Failed to fetch · Load failed · NetworkError · network error)일 때만 · 그 밖의 예외는 0',
    F._ecN(te('Failed to fetch')) === 6 && F._ecN(te('Load failed')) === 6 && F._ecN(te('NetworkError when attempting to fetch resource.')) === 6 && F._ecN(te('network error')) === 6
    && F._ecN(te("Cannot read properties of null (reading 'addEventListener')")) === 0 && F._ecN(new Error('boom')) === 0 && F._ecN(null) === 0
    && F._ecN({ name: 'AbortError' }) === 5 && F._ecN(new SyntaxError('Unexpected token <')) === 7);
  ok('① [ERR_N_HONEST] 화면 쪽 예외 → «화면 오류예요 · 새로 고쳐 주세요 (코드 X0)» — «연결이 끊겼어요»가 아니다(할 일 칸을 받아도 새로 고치게)',
    F._ecNet(te('q is null'), 'B', '다시 눌러 주세요') === '화면 오류예요 · 새로 고쳐 주세요 (코드 B0)' && F._ecNet(te('Failed to fetch'), 'G', '') === '연결이 끊겼어요 (코드 G6)', F._ecNet(te('q is null'), 'B', 'x'));
  const dp1 = F._ecSrv({ ok: false, ecode: 'B9', eid: '7KQ2', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요 (코드 B9 · 7KQ2)' }, 'B', 'x');
  const dp2 = F._ecSrv({ ok: false, error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 B9 · 7KQ2)' }, 'B', 'x');
  ok('① [ERR_NO_DOT_PAGE] 서버가 끝 마침표를 걷어 보낸 옛 doPost 글도 짧은 말로 · 꼬리(코드 · 사고번호)는 그대로', dp1 === '서버에서 오류가 났어요 · 다시 해 주세요 (코드 B9 · 7KQ2)' && dp2 === dp1, { dp1, dp2 });
  const rt = ['요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요 (코드 B9 · 7KQ2)', '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 B9 · 7KQ2)', '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요', '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    '서버에서 오류가 났어요 · 잠시 뒤 다시 해 주세요 (코드 B9 · 7KQ2)'].map((e) => F._ecRetry({ ok: false, error: e }));
  ok('① [ERR_NO_DOT_PAGE] _ecRetry — 옛 doPost 글은 마침표 · 코드가 있든 없든, 통합 뒤 새 서버 글(9)도 «다시 불러오기»로 같게 본다', rt.every(Boolean), rt);
  const d3 = F._ecSrv({ error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요. (코드 B8)' }, 'B', 'x');
  ok('① [ERR_NO_DOT_PAGE] 코드 앞 끝 마침표는 걷는다 · 0 은 글만(P1) · 화면 대체 글에만 X0',
    d3 === '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요 (코드 B8)' && F._ecSrv({ ecode: 'G0', error: '아직 배치가 없어요.' }, 'G', 'x') === '아직 배치가 없어요.'
    && F._ecSrv({ ecode: 'G3', error: '설정이 없어요.' }, 'G', 'x') === '설정이 없어요 (코드 G3)' && F._ecSrv(null, 'B', '신청을 받지 못했어요') === '신청을 받지 못했어요 (코드 B0)', d3);
  ok('① [ERR_RETRY_3] _ecRetry — 3(설정 · 배포 «잠시 뒤 다시 눌러 주세요»)도 다시 해 볼 일 · 0 · 8 은 아니다',
    F._ecRetry({ ecode: 'G3' }) && F._ecRetry({ error: '지금은 처리할 수 없어요. 잠시 뒤 다시 눌러 주세요 (코드 G3)' }) && !F._ecRetry({ ecode: 'G0', error: 'x' }) && !F._ecRetry({ ecode: 'B8' }));
  ok('① [ERR_CODE_GLUE] _ecHtml — 글은 이스케이프 · «(코드 …)»만 nowrap 한 덩어리(글자는 그대로)',
    F._ecHtml('a<b (코드 B9 · 7KQ2)') === 'a&lt;b <span class="ec-code" style="white-space:nowrap">(코드 B9 · 7KQ2)</span>' && F._ecGlue('x <b>y</b>') === 'x <b>y</b>');
  /* [COPY_FAIL_SHOW] 청첩장 24장 + live — 복사 도움 함수 두 개가 글자까지 같고, execCommand 는 그 함수 안 한 곳뿐(돌려받은 값을 본다) */
  const INV = fs.readdirSync(path.join(ROOT, 'i')).filter((f) => /^cover-0\d\.html$/.test(f)).map((f) => 'i/' + f)
    .concat(fs.readdirSync(path.join(ROOT, 'i/invitations')).filter((f) => /^invitation-0[1-8]-.*\.html$/.test(f)).map((f) => 'i/invitations/' + f))
    .concat(fs.readdirSync(path.join(ROOT, 'i-family')).filter((f) => /^family-0\d\.html$/.test(f)).map((f) => 'i-family/' + f));
  ok('① [COPY_FAIL_SHOW] 청첩장이 24장이다(셀 수 있어야 아래 검사가 뜻이 있다)', INV.length === 24, INV.length);
  for (const fn of ['meCopyText', 'meCopyFail']) {
    const all = INV.concat(['live.html']), b = all.map((f) => norm(fnBody(read(f), fn)));
    ok(`① [COPY_FAIL_SHOW] ${fn} — 청첩장 24장 · live 가 같은 몸통`, b.every((x) => x && x === b[0]), all.filter((f, i) => b[i] !== b[0]).join(','));
  }
  const exec = INV.concat(['live.html']).filter((f) => (read(f).match(/execCommand\('copy'\)/g) || []).length !== 1 || /'복사에 실패했습니다'|'복사 실패 · 수동으로/.test(read(f)));   // 따옴표째(코드) — 주석이 옛 문구를 인용하는 것은 괜찮다
  ok('① [COPY_FAIL_SHOW] execCommand(copy) 는 도움 함수 한 곳뿐 · 옛 «복사에 실패했습니다»(화면 읽기 전용) · «복사 실패 · 수동으로» 없음', !exec.length, exec.join(','));
  const sch = read('schedule.html');
  ok('① [COPY_FAIL_SHOW] schedule 예약금 계좌 — _legacyCopy 가 돌려받은 값을 돌려준다 · 실패면 «복사됨» 대신 한 줄', /ok=document\.execCommand\('copy'\)/.test(sch) && /if\(_legacyCopy\(t\)\) ok\(\); else line\(true\)/.test(sch));
  /* [ADV_TWO_COPIES] 위젯 두 벌 — codeHtml · aiN 이 같은 몸통 */
  for (const fn of ['codeHtml', 'aiN']) {
    const a = norm(fnBody(read('index.html'), fn)), b = norm(fnBody(read('assets/advisor-widget.js'), fn));
    ok(`① [ADV_TWO_COPIES] 위젯 ${fn} — 홈 인라인 사본과 파일판이 같은 몸통`, !!a && a === b);
  }
}

/* ══════════ ② 서버(api) — 노드에서 핸들러를 직접 ══════════ */
function fakeReq(body, ip) { const r = Readable.from([Buffer.from(JSON.stringify(body))]); r.method = 'POST'; r.headers = { 'x-real-ip': ip }; r.socket = { remoteAddress: ip }; return r; }
function fakeRes() { const o = { statusCode: 200, h: {}, body: '', setHeader(k, v) { o.h[k.toLowerCase()] = v; }, end(b) { o.body = String(b || ''); o.done = true; } }; return o; }
let ipN = 0; const ip = () => '10.9.' + Math.floor(++ipN / 200) + '.' + (ipN % 200);
const J = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
async function callApi(file, body, env, router) {
  const keep = {}; for (const k of ['ANTHROPIC_API_KEY', 'HANDOFF_WEBHOOK_URL', 'HANDOFF_SECRET', 'VERCEL_ENV']) { keep[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env || {});
  const calls = [], f0 = globalThis.fetch;
  globalThis.fetch = async (u, o) => { let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch {} calls.push({ u: String(u), b }); return router(String(u), b, calls); };
  try {
    const h = require(path.join(ROOT, 'api', file)); const res = fakeRes();
    await h(fakeReq(body, ip()), res);
    let j = null; try { j = JSON.parse(res.body); } catch {}
    return { status: res.statusCode, j, calls };
  } finally { globalThis.fetch = f0; for (const k in keep) { if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]; } }
}
const HOOK = 'https://gas.example/exec', ANT = 'https://api.anthropic.com/v1/messages';
const CONVO = [{ role: 'user', content: '환불 규정이 복잡해서 사람과 이야기하고 싶어요' }, { role: 'assistant', content: '디렉터에게 연결해 드릴게요' }];
{
  const gasRoute = (u, b) => (u.startsWith(HOOK) ? (b.action === 'aiHandoff' ? J({ ok: true, id: 'H1' }) : J({ ok: true })) : null);
  let r = await callApi('handoff.js', { messages: CONVO, page: '예약' }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK },
    (u, b) => gasRoute(u, b) || (u === ANT ? J({ type: 'error', error: { type: 'overloaded_error' } }, 529) : J({})));
  let fwd = r.calls.find((c) => c.b.action === 'aiHandoff');
  ok('② handoff — 요약 업체 529 여도 대화 원문을 GAS 로 넘긴다(종전엔 502 로 끝나 인계가 사라졌다) · delivered:true · brief:false', r.status === 200 && r.j && r.j.ok === true && r.j.delivered === true && r.j.brief === false
    && !!fwd && Array.isArray(fwd.b.conversation) && fwd.b.conversation.length === 2 && /요약 실패/.test(fwd.b.brief && fwd.b.brief.category), { status: r.status, j: r.j, brief: fwd && fwd.b.brief });
  r = await callApi('handoff.js', { messages: CONVO, page: '메인' }, { HANDOFF_WEBHOOK_URL: HOOK }, (u, b) => gasRoute(u, b) || J({}));
  ok('② handoff — 키가 없어도(종전 503) 원문은 넘긴다', r.status === 200 && r.j && r.j.delivered === true && r.j.briefWhy === 'unconfigured' && r.calls.some((c) => c.b.action === 'aiHandoff'), r.j);
  r = await callApi('handoff.js', { messages: CONVO, page: '메인', test: true }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK }, (u, b) => gasRoute(u, b) || J({}, 529));
  ok('② handoff — 관리자 시험(test)은 요약 고장을 숨기지 않는다(502 · GAS 로 안 보냄) — 매일 안전점검이 잡게', r.status === 502 && !r.calls.some((c) => c.b.action === 'aiHandoff'), { status: r.status, j: r.j });
  r = await callApi('handoff.js', { messages: CONVO, page: '메인' }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK },
    (u, b) => (u.startsWith(HOOK) ? (b.action === 'aiHandoff' ? J({ ok: false, error: 'busy' }) : J({ ok: true })) : J({ content: [{ type: 'text', text: JSON.stringify({ category: '환불', summary: '요약', suggestedReply: '답', rationale: '근거', confidence: '보통' }) }], usage: {} })));
  ok('② handoff — GAS 가 거절하면 delivered:false · why(gas_busy) — 화면이 «자동 전달이 안 됐어요 (코드 A4)»로 말한다', r.status === 200 && r.j && r.j.delivered === false && r.j.why === 'gas_busy', r.j);
  r = await callApi('advisor.js', { messages: [{ role: 'user', content: '식사는 어떻게 되나요?' }], page: '메인' }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK },
    (u, b) => (u.startsWith(HOOK) ? J({ ok: true, facts: '' }) : J({ type: 'error' }, 529)));
  const lg = r.calls.find((c) => c.b.action === 'advisorLog');
  ok('② advisor — 업체 실패 502 에 업체 번호(upstream:529) · 실패한 질문도 «오류»로 기록', r.status === 502 && r.j && r.j.upstream === 529 && !!lg && lg.b.flag === '오류' && lg.b.escalate === true, { status: r.status, j: r.j, log: lg && lg.b });
  r = await callApi('schedule-advisor.js', { probe: true }, { ANTHROPIC_API_KEY: 'k' }, () => J({}));
  ok('② schedule-advisor — 주소(HANDOFF_WEBHOOK_URL)가 없으면 점유 맵은 «모름»(종전 {} = 모두 비었다로 읽힘)', r.j && r.j.availSource === 'unknown', r.j);
  let n = 0;
  r = await callApi('schedule-advisor.js', { messages: [{ role: 'user', content: '2027년 10월 9일 오후 예식 가능한가요?' }], today: '2026-10-07', page: '예약' }, { ANTHROPIC_API_KEY: 'k' },
    (u) => (u === ANT ? (++n === 1 ? J({ content: [{ type: 'text', text: JSON.stringify({ intent: 'check', date: '2027-10-09', periodFrom: '', periodTo: '', weekendOnly: false, slot: '12:20', anySlot: false }) }], usage: {} })
      : J({ content: [{ type: 'text', text: '지금은 일정 확인 시스템 연결이 잠시 원활하지 않아요. 잠시 후 다시 물어봐 주세요.' }], usage: {} })) : J({})));
  ok('② schedule-advisor — 점유를 모르는 채 답하면 avail:\'unknown\' · availWhy:\'unset\'(화면이 코드 A3 를 단다)', r.status === 200 && r.j && r.j.avail === 'unknown' && r.j.availWhy === 'unset', r.j);
  r = await callApi('schedule-advisor.js', { messages: [{ role: 'user', content: '10월 9일 가능해요?' }], taken: { '2027-01-01': ['09:00'] } }, { ANTHROPIC_API_KEY: 'k' }, (u) => (u === ANT ? J({ type: 'error' }, 401) : J({})));
  ok('② schedule-advisor — 업체 401 은 500 이 아니라 502 + upstream:401(화면 A2)', r.status === 502 && r.j && r.j.upstream === 401, { status: r.status, j: r.j });
  /* [SCHED_AI_EMPTY] 모델이 빈 글을 돌려주면 200 «죄송합니다…»가 아니라 502 upstream 0(화면 A4) · 못 푼 질문을 «오류»로 남긴다 */
  n = 0;
  r = await callApi('schedule-advisor.js', { messages: [{ role: 'user', content: '2027년 10월 9일 오후 예식 가능한가요?' }], today: '2026-10-07', page: '예약', taken: { '2027-01-01': ['09:00'] } }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK },
    (u) => (u === ANT ? (++n === 1 ? J({ content: [{ type: 'text', text: JSON.stringify({ intent: 'check', date: '2027-10-09', periodFrom: '', periodTo: '', weekendOnly: false, slot: '12:20', anySlot: false }) }], usage: {} })
      : J({ content: [{ type: 'text', text: '   ' }], usage: {} })) : J({ ok: true })));
  ok('② schedule-advisor [SCHED_AI_EMPTY] — 빈 답 → 502 upstream 0 (종전 200 «죄송합니다» 코드 없음) · 질문은 «오류»로 기록', r.status === 502 && r.j && r.j.upstream === 0 && !r.j.reply
    && r.calls.some((c) => c.b.action === 'advisorLog' && c.b.flag === '오류'), { status: r.status, j: r.j });
  /* [HANDOFF_ECODE] GAS 가 거절한 까닭을 화면 코드로 — 비밀 키 불일치 A3 · 미배포(모르는 동작 A3) · 잠금 대기 A1 · 서버 오류 A9(사고번호) · JSON 아님 A7 */
  const BRIEF = () => J({ content: [{ type: 'text', text: JSON.stringify({ category: '환불', summary: '요약', suggestedReply: '답', rationale: '근거', confidence: '보통' }) }], usage: {} });   // 부를 때마다 새 응답(몸통은 한 번만 읽힌다)
  for (const [gas, want, nm] of [[() => J({ ok: false, ecode: 'A0', error: 'unauthorized' }), { ecode: 'A3' }, '비밀 키 불일치(unauthorized) → A3'],
    [() => J({ ok: false, ecode: 'A3', error: '지금은 처리할 수 없어요. 잠시 뒤 다시 눌러 주세요 (코드 A3)' }), { ecode: 'A3' }, 'GAS 미배포(모르는 동작) → A3'],
    [() => J({ ok: false, error: 'busy' }), { ecode: 'A1' }, '잠금 대기(busy) → A1'],
    [() => J({ ok: false, ecode: 'A9', eid: 'K7QA', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요 (코드 A9 · K7QA)' }), { ecode: 'A9', eid: 'K7QA' }, 'GAS 오류 → A9 · 사고번호'],
    [() => new Response('<html>Service invoked too many times</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }), { ecode: 'A7' }, 'GAS 답이 JSON 아님 → A7']]) {
    r = await callApi('handoff.js', { messages: CONVO, page: '메인' }, { ANTHROPIC_API_KEY: 'k', HANDOFF_WEBHOOK_URL: HOOK }, (u, b) => (u.startsWith(HOOK) ? (b.action === 'aiHandoff' ? gas() : J({ ok: true })) : BRIEF()));
    ok(`② handoff [HANDOFF_ECODE] — ${nm}`, r.status === 200 && r.j && r.j.delivered === false && r.j.ecode === want.ecode && (!want.eid || r.j.eid === want.eid), r.j);
  }
}
/* [SCRIPT_FILE_BACK] 폼 POST 로 «파일로» 받는 두 길 — 실패해도 화면을 흰 글 한 줄로 덮지 않는다: 까닭 + 코드(한 덩어리) + «돌아가기» */
{
  const formReq = (body, ip) => { const q = Readable.from([Buffer.from(body)]); q.method = 'POST'; q.headers = { 'x-real-ip': ip, 'content-type': 'application/x-www-form-urlencoded' }; q.socket = { remoteAddress: ip }; return q; };
  const call = async (file, body, ipx) => { const h = require(path.join(ROOT, 'api', file)), res = fakeRes(); await h(formReq(body, ipx), res); return res; };
  const page = (res) => /text\/html/.test(res.h['content-type'] || '') && /id="back"/.test(res.body) && /history\.back\(\)/.test(res.body) && /돌아가기/.test(res.body);
  let x = await call('script-file.js', 'text=&name=a.txt', ip());
  ok('② script-file [SCRIPT_FILE_BACK] — 빈 글 400 → 까닭 + 돌아가기(종전 흰 화면 «보낼 글이 없어요.»)', x.statusCode === 400 && page(x) && /보낼 글이 없어요/.test(x.body), x.body.slice(0, 120));
  const ipR = ip(); for (let i = 0; i < 20; i++) await call('script-file.js', 'text=x&name=a.txt', ipR);
  x = await call('script-file.js', 'text=x&name=a.txt', ipR);
  ok('② script-file [SCRIPT_FILE_BACK] — 몰림 429 → «요청이 몰렸어요 · … (코드 X1)» · 코드는 한 덩어리 · 돌아가기', x.statusCode === 429 && page(x) && /<span class="c">\(코드 X1\)<\/span>/.test(x.body), x.body.slice(0, 160));
  x = await call('script-file.js', 'text=' + encodeURIComponent('안녕') + '&name=a.txt', ip());
  ok('② script-file — 성공은 종전대로 attachment(화면을 덮지 않는다)', x.statusCode === 200 && /^attachment;/.test(x.h['content-disposition'] || ''), x.h);
  const f0 = globalThis.fetch;
  const vcall = async (form, fake) => { globalThis.fetch = fake; try { return await call('voice-file.js', new URLSearchParams(form).toString(), ip()); } finally { globalThis.fetch = f0; } };
  const ab = () => { const e = new Error('aborted'); e.name = 'AbortError'; return e; };
  for (const [form, fake, want, nm] of [
    [{ id: 'FILEID_abcdef0123' }, async () => { throw new Error('no call'); }, /로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 <span class="c">\(코드 L8\)<\/span>/, '토큰 없음 → L8'],
    [{ token: 'T', id: 'FILEID_abcdef0123' }, async () => { throw ab(); }, /응답이 늦어요 · 마이페이지에서 다시 눌러 주세요 <span class="c">\(코드 L5\)<\/span>/, 'GAS 늦음 → L5'],
    [{ token: 'T', id: 'FILEID_abcdef0123' }, async () => { throw new TypeError('fetch failed'); }, /파일을 받지 못했어요 · 마이페이지에서 다시 눌러 주세요 <span class="c">\(코드 L4\)<\/span>/, 'GAS 못 닿음 → L4'],
    [{ token: 'T', id: 'FILEID_abcdef0123' }, async () => ({ json: async () => { throw new SyntaxError('Unexpected token <'); } }), /서버가 잠깐 멈췄어요 · 마이페이지에서 다시 눌러 주세요 <span class="c">\(코드 L7\)<\/span>/, 'GAS 답 깨짐 → L7'],
    [{ token: 'T', id: 'FILEID_abcdef0123' }, async () => ({ json: async () => ({ ok: false, ecode: 'L4', error: '파일을 받지 못했어요.' }) }), /파일을 받지 못했어요 <span class="c">\(코드 L4\)<\/span>/, 'GAS 거절 + ecode 만 → 끝 마침표 걷고 코드']]) {
    const v = await vcall(form, fake);
    ok(`② voice-file [SCRIPT_FILE_BACK] — ${nm} · 돌아가기`, page(v) && want.test(v.body), v.body.replace(/^[\s\S]*<main[^>]*>/, '').slice(0, 160));
  }
}


if (!pw) { console.log('못 쟀다 — playwright 없음(화면 검사 생략)'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port, BASE = `http://127.0.0.1:${port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'err-pages-'));
function png(p) { const w = 4, h = 4, raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 160)])));
  const crc = (buf) => { let c, x = 0xffffffff; for (const v of buf) { c = (x ^ v) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; x = (x >>> 8) ^ c; } return (x ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const c = Buffer.concat([Buffer.from(t), d]), l = Buffer.alloc(4), k = Buffer.alloc(4); l.writeUInt32BE(d.length); k.writeUInt32BE(crc(c)); return Buffer.concat([l, c, k]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))])); }
const PNGS = [1, 2].map((i) => { const p = path.join(TMP, `p${i}.png`); png(p); return p; });

/* 가짜 fetch — GAS(script.google.com) · /api 만 가로챈다. route 몸통(글)이 {body,status,headers} · 'net'(연결 끊김) · 'hang'(영영 안 옴)을 돌려준다.
   신호(AbortController)도 지킨다. setTimeout 은 2초 이상이면 1/10 로 줄인다(12초 · 45초 제한 · 재시도 간격을 빨리 돌리려고) */
const stub = (routeSrc, seed) => `window.__ME_PREVIEW_GUARD_TEST_OFF = true;
(function(){ try { var s = ${JSON.stringify(seed || {})}; Object.keys(s.ls || {}).forEach(function(k){ localStorage.setItem(k, s.ls[k]); }); } catch (e) {}
  var _st = window.setTimeout; window.setTimeout = function(f, ms){ var a = Array.prototype.slice.call(arguments, 2); ms = +ms || 0; if (ms >= 2000) ms = Math.round(ms / 10); return _st.apply(window, [f, ms].concat(a)); };
  window.__calls = []; var _f = window.fetch;
  var route = function(url, o, b, n){ ${routeSrc} };
  window.fetch = function(u, o){ var url = String((u && u.url) || u), b = {};
    if (url.indexOf('script.google.com') < 0 && url.indexOf('/api/') !== 0 && url.indexOf(location.origin + '/api/') !== 0) return _f.apply(this, arguments);
    try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    var n = window.__calls.push({ url: url, b: b }), x = route(url, o || {}, b, n); if (x === undefined) x = { body: { ok: true } };
    return new Promise(function(res, rej){ var sig = o && o.signal;
      if (sig) { if (sig.aborted) return rej(new DOMException('aborted', 'AbortError')); sig.addEventListener('abort', function(){ rej(new DOMException('The operation was aborted.', 'AbortError')); }); }
      if (x === 'hang') return; if (x === 'net') return rej(new TypeError('Failed to fetch'));
      _st(function(){ res(new Response(typeof x.body === 'string' ? x.body : JSON.stringify(x.body), { status: x.status || 200, headers: x.headers || { 'Content-Type': 'application/json' } })); }, x.delay || 15); }); };
})();`;
const errs = [];
async function open(url, routeSrc, { w = 390, seed = null, init = '' } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: 844 } }); const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(url.split('?')[0] + ' ' + e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.addInitScript(stub(routeSrc, seed));
  if (init) await pg.addInitScript(init);   // [ERR_PAGES_R2] 기기 쪽 실패를 꾸민다(재생 거절 · 복사 실패)
  await pg.goto(BASE + url, { waitUntil: 'load' }).catch(() => {});
  return { ctx, pg };
}
const until = async (pg, fn, arg, ms = 6000) => { try { await pg.waitForFunction(fn, arg, { timeout: ms, polling: 60 }); return true; } catch { return false; } };
const txt = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); return e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }, sel);
const lines = (pg, sel) => pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return 0; const r = document.createRange(); r.selectNodeContents(e);
  return new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top + x.height / 2))).size; }, sel);
const calls = (pg, act) => pg.evaluate((a) => window.__calls.filter((c) => c.b.action === a || (a && c.url.indexOf(a) >= 0)).length, act);
/* ★[ERR_CODE_GLUE] «(코드 …)» 괄호 안에 줄바꿈 기회가 없는가 — 보이는 글 속 «(코드»마다 그 괄호가 white-space:nowrap 인 한 요소 안에 통째로 있어야 한다.
   (390px 신청서에서 «(코드 B9 / · 7KQ2)»로 괄호 안이 갈렸다 · 코디 실측) 빈 배열 = 통과 */
const gluedBad = (pg, sel) => pg.evaluate((s) => { const root = s ? document.querySelector(s) : document.body; if (!root) return ['없음 ' + s]; const bad = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.nodeValue || ''; let i = t.indexOf('(코드');
    while (i > -1) { const el = n.parentElement, cs = el && getComputedStyle(el), close = t.indexOf(')', i);
      const shown = !!el && cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
      if (shown && !(cs.whiteSpace === 'nowrap' && close > -1)) bad.push(t.slice(Math.max(0, i - 10), close > -1 ? close + 1 : i + 14));
      i = t.indexOf('(코드', i + 1); } }
  return bad; }, sel);
const FAILCOPY = `(function(){ try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function(){ return Promise.reject(new DOMException('denied', 'NotAllowedError')); } } }); } catch (e) {}
  try { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); } catch (e) {}
  document.execCommand = function(){ return false; }; })();`;   // [COPY_FAIL_SHOW] 클립보드 거절 + execCommand 실패(false)
const run = async (name, fn) => { try { await fn(); } catch (e) { ok(name + ' — 실행 도중 멈춤', false, String(e && e.message || e).split('\n')[0]); } };

/* ══════════ ③ 화면 ══════════ */
const INFO_OK = { ok: true, state: 'ok', names: '김도현 · 정하윤', date: '2027년 1월 9일 (토)', time: '14:50', deadlineLabel: '24시간', kakao: '' };
await run('③ cancel', async () => {
  /* F3 — 취소 요청이 영영 안 오면(45초 → 4.5초) «결과 모름»: 상태를 다시 물어 취소됐으면 완료 화면 */
  const { ctx, pg } = await open('/cancel.html?token=TKN&sig=SIG', `if (b.action === 'emailCancelInfo') { var k = window.__calls.filter(function(c){ return c.b.action === 'emailCancelInfo'; }).length; return k === 1 ? { body: ${JSON.stringify(INFO_OK)} } : { body: { ok: true, state: 'cancelled', names: 'x' }, delay: 900 }; }
    if (b.action === 'emailCancel') return 'hang';`);
  await until(pg, () => !!document.getElementById('go'));
  await pg.click('#go');
  const said = await until(pg, () => /^응답이 늦어요$/.test(((document.getElementById('cErr') || {}).textContent || '').trim()) && /취소됐는지 확인 중/.test((document.getElementById('go') || {}).textContent || ''), null, 9000);   // [ERR_RECHECK_NOCODE] 다시 묻는 중간 줄엔 코드 없음(P6)
  const doneOk = await until(pg, () => /예약이 취소되었어요/.test(document.body.innerText), null, 9000);
  ok('③ cancel(F3) — 취소 요청이 늦으면(45초) «결과 모름»: 단추 «● 취소됐는지 확인 중» + «응답이 늦어요»(중간 줄 · 코드 없음 P6) → 상태를 다시 물어 취소됐으면 완료 화면(종전 «취소에 실패했어요»)', said && doneOk && (await calls(pg, 'emailCancelInfo')) >= 2, { said, doneOk, t: await txt(pg, '#card') });
  await ctx.close();
  const c2 = await open('/cancel.html?token=TKN&sig=SIG', `if (b.action === 'emailCancelInfo') return { body: ${JSON.stringify(INFO_OK)} }; if (b.action === 'emailCancel') return 'hang';`, { w: 360 });
  await until(c2.pg, () => !!document.getElementById('go'));
  await c2.pg.click('#go');
  const left = await until(c2.pg, () => /아직 취소 전이에요 · 다시 눌러 주세요 \(코드 B5\)/.test((document.getElementById('cErr') || {}).textContent || '') && !document.getElementById('go').disabled, null, 9000);
  const l0 = await lines(c2.pg, '#cErr');
  const g0 = await gluedBad(c2.pg, '#cErr');
  ok('③ cancel(F3) — 다시 물어도 아직 확정 상태면 «아직 취소 전이에요 · 다시 눌러 주세요 (코드 B5)» 한 줄(360) · 단추가 풀린다 · 코드는 한 덩어리', left && l0 === 1 && !g0.length, { left, l0, g0, t: await txt(c2.pg, '#cErr') });
  await c2.ctx.close();
  /* 무효 링크 — 서버 거절 «유효하지 않은 링크예요»는 «불러오지 못했어요» 제목이 아니라 링크 안내 + B8 · 다시 불러오기 없음 */
  const b = await open('/cancel.html?token=TKN&sig=BAD', `return { body: { ok: false, ecode: 'B0', error: '유효하지 않은 링크예요.' } };`);
  await until(b.pg, () => /링크를 열 수 없어요/.test(document.body.innerText));
  const t1 = await txt(b.pg, '#card');
  ok('③ cancel — 서버가 링크를 거절 → «링크를 열 수 없어요 · … (코드 B8)» · «불러오지 못했어요» 아님 · 다시 불러오기 없음', /링크를 열 수 없어요/.test(t1) && /\(코드 B8\)/.test(t1) && !/불러오지 못했어요/.test(t1) && !(await b.pg.$('#again')), t1);
  await b.ctx.close();
  /* 연결 끊김 — B6 + 다시 불러오기(누르면 다시 묻는다) · 360px 한 줄 */
  const c = await open('/cancel.html?token=TKN&sig=SIG', `var k = window.__calls.length; return k === 1 ? 'net' : { body: ${JSON.stringify(INFO_OK)} };`, { w: 360 });
  await until(c.pg, () => !!document.getElementById('again'));
  const t2 = await txt(c.pg, '#card'), l2 = await lines(c.pg, '#card .desc');
  await c.pg.click('#again'); const back = await until(c.pg, () => !!document.getElementById('go'));
  ok('③ cancel — 불러오기 연결 끊김 → «연결이 끊겼어요 (코드 B6)» 한 줄(360) + «다시 불러오기»(할 일은 단추가) · 누르면 회복', /연결이 끊겼어요 \(코드 B6\)/.test(t2) && !/네트워크/.test(t2) && l2 === 1 && back, { t2, l2, back });
  /* 360px — 취소 줄들(.note 11.5px · 카드 안쪽 258px)이 한 줄인가 */
  const C4 = ['결과를 못 받았어요 · 다시 눌러 주세요 (코드 B5)', '연결이 끊겼어요 · 다시 눌러 주세요 (코드 B6)', '서버가 잠깐 멈췄어요 (코드 B7)', '요청이 몰렸어요 · 다시 해 주세요 (코드 B1)'];
  const l3 = await c.pg.evaluate((C) => { const e = document.getElementById('cErr') || (() => { const d = document.createElement('div'); d.className = 'note'; d.id = 'cErr'; document.getElementById('card').appendChild(d); return d; })();
    e.style.display = ''; return C.map((t) => { e.textContent = t; const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top + x.height / 2))).size; }); }, C4);
  ok('④ cancel 360 — 취소 줄 넷(결과 모름 B5 · 연결 B6 · 서버 답 깨짐 B7 · 몰림 B1)이 한 줄씩', l3.every((x) => x === 1), JSON.stringify(l3));
  await c.ctx.close();
});

const TK = 'tok_err_pages_000000';
const D0 = new Date(); const dk = (o) => { const d = new Date(D0); d.setDate(d.getDate() + o); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const AV = { ok: true, avail: Array.from({ length: 30 }, (_, i) => dk(i + 2)), full: {}, currentDate: '', holdActive: false, slotsWeekday: ['11:30', '14:50'], slotsWeekend: ['18:20'], duration: 40,
  names: '정하윤 · 김도현', depositStr: '100,000', account: '기업 000', holder: '모먼트에디트' };
const SCHED = (extra) => `if (b.action === 'getAvailability') return { body: ${JSON.stringify(AV)} }; if (b.action === 'cardPayConfig') return { body: { ok: true, enabled: true, clientKey: 'ck', amount: 100000 } }; if (b.action === 'weddingAvailability') return { body: { ok: true, taken: {} } }; ${extra || ''}`;
const alertTxt = (pg) => pg.evaluate(() => { const e = document.getElementById('meAlert'); return e && getComputedStyle(e).display !== 'none' ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
await run('③ schedule', async () => {
  for (const [code, want, name] of [
    ['REJECT_CARD_COMPANY', /카드사에서 결제를 받지 않았어요 · 다른 카드로 해 주세요 \(코드 P4 · REJECT_CARD_COMPANY\)/, '카드사 거절 → P4 · 토스 코드'],
    ['PAY_PROCESS_ABORTED', /결제가 중간에 끊겼어요 · 돈은 나가지 않았어요 \(코드 P5\)/, '중간에 끊김 → P5'],
    ['PAY_PROCESS_CANCELED', /^결제를 취소했어요\./, '고객이 닫음 → «결제를 취소했어요»(코드 없음)']]) {
    const { ctx, pg } = await open(`/schedule.html?me_pay=0&code=${code}&message=x`, SCHED(), { seed: { ls: { me_token: TK } } });
    await until(pg, () => getComputedStyle(document.getElementById('meAlert')).display !== 'none');
    const a = await alertTxt(pg);
    ok(`③ schedule(F4) — 토스 failUrl ${name}`, want.test(a) && (code !== 'PAY_PROCESS_CANCELED' || !/코드/.test(a)), a);
    await ctx.close();
  }
  /* F5 — 승인 확인이 한 번 끊겨도 같은 주문으로 한 번 더 묻는다 → 성공 창 */
  let s = await open('/schedule.html?me_pay=1&paymentKey=pk_1&orderId=MD_1&amount=100000', SCHED(`if (b.action === 'cardConfirm') { var k = window.__calls.filter(function(c){ return c.b.action === 'cardConfirm'; }).length; return k === 1 ? 'net' : { body: { ok: true, recorded: true, approved: true, date: '2027년 1월 9일', time: '14:50' } }; }`), { seed: { ls: { me_token: TK } } });
  const shown = await until(s.pg, () => document.getElementById('modal').classList.contains('show'));
  ok('③ schedule(F5) — 승인 확인이 연결 끊김이어도 같은 주문 번호로 한 번 더 → «예약이 확정되었어요» · 같은 orderId 두 번', shown && (await s.pg.evaluate(() => window.__calls.filter((c) => c.b.action === 'cardConfirm').map((c) => c.b.orderId).join(','))) === 'MD_1,MD_1', await txt(s.pg, '#modalTitle'));
  await s.ctx.close();
  s = await open('/schedule.html?me_pay=1&paymentKey=pk_1&orderId=MD_1&amount=100000', SCHED(`if (b.action === 'cardConfirm') return 'net';`), { seed: { ls: { me_token: TK } } });
  await until(s.pg, () => getComputedStyle(document.getElementById('meAlert')).display !== 'none');
  let a = await alertTxt(s.pg);
  ok('③ schedule(F5) — 두 번 다 끊기면 «연결이 끊겼어요 · 카카오톡으로 알려 주세요 (코드 P6)»(결과 모름 · 다시 확인해 드림)', /연결이 끊겼어요 · 카카오톡으로 알려 주세요 \(코드 P6\)/.test(a) && /결제가 됐는지 확인해 드릴게요/.test(a), a);
  await s.ctx.close();
  s = await open('/schedule.html?me_pay=1&m=x', SCHED(), { seed: { ls: { me_token: TK } } });
  await until(s.pg, () => getComputedStyle(document.getElementById('meAlert')).display !== 'none');
  a = await alertTxt(s.pg);
  ok('③ schedule(F5) — 성공 주소인데 결제 정보가 빠지면 말없이 끝나지 않는다 → «결제 정보를 받지 못했어요 · … (코드 P0)»', /결제 정보를 받지 못했어요 · 다시 결제해 주세요 \(코드 P0\)/.test(a), a);
  await s.ctx.close();
  /* F2 — 첫 불러오기가 서버 답이 깨지면(HTML) B7 + 다시 불러오기 */
  s = await open('/schedule.html', `if (b.action === 'getAvailability') return { body: '<html>Service invoked too many times</html>', headers: { 'Content-Type': 'text/html' } };`, { seed: { ls: { me_token: TK } } });
  await until(s.pg, () => /코드 B/.test(document.body.innerText));
  const tb = await txt(s.pg, 'main');
  ok('③ schedule(F2) — 일정 불러오기 서버 답이 깨짐 → «일정을 불러오지 못했어요» + «서버가 잠깐 멈췄어요 (코드 B7)» + 다시 불러오기(종전 «불러오기 실패 · 새로고침 해주세요»)', /일정을 불러오지 못했어요/.test(tb) && /서버가 잠깐 멈췄어요 \(코드 B7\)/.test(tb) && !!(await s.pg.$('#schedRetry')), tb);
  await s.ctx.close();
  /* ④ 360 — 신청 실패 줄(#summary) 한 줄 */
  s = await open('/schedule.html', SCHED(), { w: 360, seed: { ls: { me_token: TK } } });
  await until(s.pg, () => !!document.querySelector('#calGrid button.day'));
  await s.pg.evaluate(() => { const e = document.getElementById('summary'); e.textContent = '연결이 끊겼어요 · 다시 눌러 주세요 (코드 B6)'; });
  const ls = await lines(s.pg, '#summary');
  ok('④ schedule 360 — 신청 실패 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 B6)» 한 줄', ls === 1, 'lines ' + ls);
  await s.ctx.close();
});

const botLast = (pg) => pg.evaluate(() => { const m = [...document.querySelectorAll('.me-adv-msg.bot')]; return m.length ? m[m.length - 1].textContent.trim() : ''; });
const escTxt = (pg) => pg.evaluate(() => { const e = document.querySelector('.me-adv-esc-t'); return e ? e.textContent.trim() : ''; });
await run('③ AI 위젯', async () => {
  const H504 = `{ status: 504, body: '<html><body>An error occurred with your deployment · FUNCTION_INVOCATION_TIMEOUT</body></html>', headers: { 'Content-Type': 'text/html', 'x-vercel-error': 'FUNCTION_INVOCATION_TIMEOUT' } }`;
  for (const [pgUrl, label] of [['/inquiry.html', '파일판(assets/advisor-widget.js)'], ['/index.html', '홈 인라인 사본']]) {
    for (const [resp, want, nm] of [[`{ status: 429, body: { error: 'rate_limited', escalate: true } }`, /질문이 잠깐 많았어요 · 아래에서 디렉터와 이어서 상담하실 수 있어요 \(코드 A1\)$/, '429 → A1'],
      [H504, /서버가 잠깐 멈췄어요 · 아래에서 디렉터와 이어서 상담하실 수 있어요 \(코드 A7 · 504\)$/, '베르셀 504(HTML) → A7 · 504']]) {
      const { ctx, pg } = await open(pgUrl, `if (url.indexOf('/api/advisor') >= 0) return ${resp}; if (url.indexOf('/api/handoff') >= 0) return { body: { ok: true, delivered: true } };`, { w: 1280 });
      await until(pg, (u) => (u === '/inquiry.html' ? !!(window.MEAdvisor && window.MEAdvisor.ask) : !!document.getElementById('meAdvForm')), pgUrl, 8000);   // 위젯이 다 선 뒤에 묻는다(고정 시간이 아니라)
      if (pgUrl === '/inquiry.html') await pg.evaluate(() => window.MEAdvisor.ask('식사는 어떻게 되나요?'));
      else await pg.evaluate(() => { const i = document.getElementById('meAdvInput'); i.value = '식사는 어떻게 되나요?'; document.getElementById('meAdvForm').requestSubmit(); });
      await until(pg, () => /코드 A/.test([...document.querySelectorAll('.me-adv-msg.bot')].map((m) => m.textContent).join('')));
      const t = await botLast(pg);
      ok(`③ 위젯 ${label}(F6) — ${nm}`, want.test(t), t);
      await ctx.close();
    }
  }
  /* F7 — 디렉터 전달이 실패하면 «전달했어요»라 하지 않는다(503 → A3 · GAS delivered:false → A4) · 되면 «전달했어요» */
  for (const [resp, want, nm] of [[`{ status: 503, body: { error: 'handoff_unconfigured' } }`, /^자동 전달이 안 됐어요 · 카카오톡으로 남겨 주세요 \(코드 A3\)$/, '503 → A3'],
    [`{ body: { ok: true, delivered: false, why: 'gas_busy' } }`, /^자동 전달이 안 됐어요 · 카카오톡으로 남겨 주세요 \(코드 A4\)$/, 'GAS 거절(delivered:false) → A4'],
    [`{ body: { ok: true, delivered: true } }`, /디렉터에게 (바로 전달했어요|남겼어요)|문의를 디렉터에게 남겼어요/, '전달됨 → «전달했어요»']]) {
    const { ctx, pg } = await open('/inquiry.html', `if (url.indexOf('/api/advisor') >= 0) return { body: { reply: '확인이 필요해 디렉터에게 연결해 드릴게요.', escalate: true } }; if (url.indexOf('/api/handoff') >= 0) return ${resp};`, { w: 1280 });
    await until(pg, () => !!(window.MEAdvisor && window.MEAdvisor.ask), null, 8000);
    await pg.evaluate(() => window.MEAdvisor.ask('계약금 환불이 되나요?'));
    await until(pg, () => { const e = document.querySelector('.me-adv-esc-t'); return !!e && !/전달하고 있어요/.test(e.textContent); });
    const t = await escTxt(pg);
    ok(`③ 위젯(F7) — 디렉터 전달 ${nm}${/A\d/.test(nm) ? ' · «전달했어요» 없음' : ''}`, want.test(t) && (/전달됨/.test(nm) || !/전달했어요|남겼어요/.test(t)), t);
    await ctx.close();
  }
  /* F8 — 날짜 확인 AI(위젯 스케줄 갈래) 503 → A3 · 서버가 점유를 모른 채 답함 → 답 끝에 코드 */
  for (const [resp, want, nm] of [[`{ status: 503, body: { error: 'unconfigured' } }`, /AI 상담이 꺼져 있어요 · 잠시 뒤 다시 물어봐 주세요 \(코드 A3\)$/, '503 → A3'],
    [`{ body: { reply: '지금은 일정 확인 시스템 연결이 잠시 원활하지 않아요.', avail: 'unknown', availWhy: 'fail' } }`, /원활하지 않아요 \(코드 A4\)$/, '점유 모름(avail unknown) → 답 끝 A4 · 코드 앞 끝 마침표는 걷는다(ERR_NO_DOT_PAGE)']]) {
    const { ctx, pg } = await open('/inquiry.html', `if (url.indexOf('/api/schedule-advisor') >= 0) return ${resp};`, { w: 1280 });
    await until(pg, () => !!(window.MEAdvisor && window.MEAdvisor.ask), null, 8000);
    await pg.evaluate(() => window.MEAdvisor.ask('내년 10월 9일 예식 가능한가요?'));
    await until(pg, () => /코드 A/.test([...document.querySelectorAll('.me-adv-msg.bot')].map((m) => m.textContent).join('')));
    const t = await botLast(pg);
    ok(`③ 위젯 날짜 확인(F8) — ${nm}`, want.test(t), t);
    await ctx.close();
  }
});

const COUPLE = { ok: true, couple: { groomName: '김도현', brideName: '정하윤', groomNameEn: 'Kim Do Hyun', brideNameEn: 'Jeong Ha Yoon', weddingDate: '2027-12-17', weddingTime: '14:00' } };
await run('③ live', async () => {
  for (const [resp, kind] of [[`{ body: { ok: false, error: 'INTERNAL_ERROR', ecode: 'G9', eid: 'K3QZ' } }`, 'G9'], [`{ body: { ok: false, error: 'COUPLE_NOT_FOUND', ecode: 'G0' } }`, 'link'],
    [`{ body: '<html>Script error</html>', headers: { 'Content-Type': 'text/html' } }`, 'G7'],
    [`{ body: { ok: false, ecode: 'G9', eid: 'K3QZ', error: '청첩장 정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.' } }`, 'G9k'], [`{ body: { ok: false, error: 'INTERNAL_ERROR', ecode: 'G3', eid: 'K3QZ' } }`, 'G3']]) {
    const { ctx, pg } = await open('/live.html?e=evt-err-1', `if (url.indexOf('action=getCouple') >= 0) return ${resp};`);
    await until(pg, (k) => (k === 'link' ? !document.querySelector('.link-unknown-box').hidden : /\(코드 G\d/.test(document.querySelector('.live-notloaded-box .lp-message-desc').textContent)), kind, 9000);
    const st = await pg.evaluate(() => ({ nl: !document.querySelector('.live-notloaded-box').hidden, lu: !document.querySelector('.link-unknown-box').hidden,
      d: document.querySelector('.live-notloaded-box .lp-message-desc').textContent.trim(), dummy: getComputedStyle(document.querySelector('#envelope') || document.body).display }));
    if (kind === 'G9') ok('③ live(F9) — 서버 INTERNAL_ERROR 는 «링크로는 찾을 수 없습니다»가 아니라 기다림 안내 + «(코드 G9 · 사고번호)»', st.nl && !st.lu && /서버에서 오류가 났어요 · 이 화면이 계속 다시 시도하고 있어요 \(코드 G9 · K3QZ\)/.test(st.d), st);
    if (kind === 'link') ok('③ live(F9) — COUPLE_NOT_FOUND 는 링크 안내 그대로(코드 없음) · 기다림 안내 아님', st.lu && !st.nl, st);
    if (kind === 'G9k') ok('③ live [GETCOUPLE_CONTRACT] — 한글 글이어도 코드 숫자가 1~9(서버 쪽)면 링크 안내가 아니라 «서버에서 오류가 났어요 … (코드 G9 · K3QZ)»', st.nl && !st.lu && /\(코드 G9 · K3QZ\)/.test(st.d), st);
    if (kind === 'G3') ok('③ live [GETCOUPLE_CONTRACT] — 설정 · 미배포(G3)도 서버 쪽 · «연결이 끊겼어요»가 아니라 «서버에서 오류가 났어요 … (코드 G3 · K3QZ)»', st.nl && !st.lu && /서버에서 오류가 났어요 · 이 화면이 계속 다시 시도하고 있어요 \(코드 G3 · K3QZ\)/.test(st.d), st);
    if (kind === 'G7') ok('③ live(F9) — 서버 답이 깨짐(HTML)은 «연결이 불안정»이 아니라 «서버가 잠깐 멈췄어요 … (코드 G7)»', st.nl && /서버가 잠깐 멈췄어요 · 이 화면이 계속 다시 시도하고 있어요 \(코드 G7\)/.test(st.d), st);
    await ctx.close();
  }
  /* 느린 서버 — 5초 안전망(0.5초)에 표본 부부를 드러내지 않고 기다림 안내(코드 없음) */
  const s = await open('/live.html?e=evt-slow-1', `if (url.indexOf('action=getCouple') >= 0) return 'hang';`);
  await until(s.pg, () => document.body.classList.contains('couple-ready'), null, 6000);   // 안전망이 연 뒤에 본다(고정 시간이 아니라)
  const sl = await s.pg.evaluate(() => ({ ready: document.body.classList.contains('couple-ready'), nl: !document.querySelector('.live-notloaded-box').hidden, d: document.querySelector('.live-notloaded-box .lp-message-desc').textContent.trim(), env: getComputedStyle(document.getElementById('envelope')).display }));
  ok('③ live — 서버가 늦으면 5초 안전망이 «표본 부부 · 계좌»를 열지 않고 «응답을 기다리고 있어요» 안내(봉투 숨김)', sl.ready && sl.nl && /응답을 기다리고 있어요/.test(sl.d) && sl.env === 'none', sl);
  await s.ctx.close();
  /* 편지 INTERNAL_ERROR — 영문 이름을 하객에게 보이지 않는다 */
  const L = await open('/live.html?e=evt-letter-1', `if (url.indexOf('action=getCouple') >= 0) return { body: ${JSON.stringify(COUPLE)} }; if (b.action === 'guestLetter') return { body: { ok: false, error: 'INTERNAL_ERROR', ecode: 'G9', eid: 'K3QZ' } };`);
  await until(L.pg, () => document.body.classList.contains('couple-ready'));
  await L.pg.evaluate(() => { document.getElementById('lfMessage').value = '축하해요'; document.getElementById('lfGuestName').value = '하객'; document.getElementById('letterForm').requestSubmit(); });
  await until(L.pg, () => getComputedStyle(document.getElementById('letterError')).display !== 'none');
  const le = await txt(L.pg, '#letterError');
  ok('③ live 편지(F9) — INTERNAL_ERROR 는 한글 한 줄 + «(코드 G9 · K3QZ)» · 영문 오류 이름 없음', /\(코드 G9 · K3QZ\)/.test(le) && !/INTERNAL_ERROR/.test(le), le);
  await L.ctx.close();
});

await run('③ 청첩장(hydrate)', async () => {
  /* 서버가 영영 안 오면 — 5초(0.5초) 뒤 «{{GROOM_NAME}}» 같은 자리 표시를 열지 않고 기다림 한 줄 → 두 번 다 늦으면 예시 + G5 */
  const { ctx, pg } = await open('/i/cover-01.html?e=evt-hy-1', `if (url.indexOf('action=getCouple') >= 0) return 'hang';`);
  let seenRaw = false; const t0 = Date.now(); let waitSeen = false;
  while (Date.now() - t0 < 12000) {
    const s = await pg.evaluate(() => ({ ready: document.body.classList.contains('couple-ready'), raw: /\{\{[A-Z_]+\}\}/.test(document.body.innerText), wait: document.documentElement.getAttribute('data-me-wait') || '', badge: (document.getElementById('meDemoBadge') || {}).textContent || '' }));
    if (s.ready && s.raw) seenRaw = true; if (s.wait) waitSeen = true;
    if (s.badge) break; await pg.waitForTimeout(120);
  }
  const fin = await pg.evaluate(() => ({ ready: document.body.classList.contains('couple-ready'), raw: /\{\{[A-Z_]+\}\}/.test(document.body.innerText), badge: ((document.getElementById('meDemoBadge') || {}).textContent || '').replace(/\s+/g, ' ') }));
  ok('③ 청첩장(F9) — 서버가 안 오면 «{{…}}» 자리 표시를 한 번도 보이지 않는다 · 5초에 «청첩장을 불러오고 있어요» · 끝내 예시 + «(코드 G5)»', !seenRaw && waitSeen && fin.ready && !fin.raw && /\(코드 G5\)/.test(fin.badge), { seenRaw, waitSeen, fin });
  await ctx.close();
  const b = await open('/i/cover-01.html?e=evt-hy-2', `if (url.indexOf('action=getCouple') >= 0) return { body: { ok: false, error: 'INTERNAL_ERROR', ecode: 'G9', eid: 'K3QZ' } };`);
  await until(b.pg, () => !!document.getElementById('meDemoBadge'), null, 6000);
  const bd = (await txt(b.pg, '#meDemoBadge'));
  const gbd = await gluedBad(b.pg, '#meDemoBadge');
  ok('③ 청첩장(F9) — 서버 INTERNAL_ERROR 는 «주소를 다시 확인해 주세요»가 아니라 «서버에서 오류가 났어요 … (코드 G9 · K3QZ)» · 코드는 한 덩어리', /\(코드 G9 · K3QZ\)/.test(bd) && !/주소를 다시 확인/.test(bd) && (await calls(b.pg, 'action=getCouple')) === 2 && !gbd.length, { bd, gbd });
  await b.ctx.close();
  const k = await open('/i/cover-01.html?e=evt-hy-3', `if (url.indexOf('action=getCouple') >= 0) return { body: { ok: false, ecode: 'G3', eid: 'K3QZ', error: '청첩장 정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.' } };`);
  await until(k.pg, () => !!document.getElementById('meDemoBadge'), null, 6000);
  const kd = await txt(k.pg, '#meDemoBadge');
  ok('③ 청첩장 [GETCOUPLE_CONTRACT] — 한글 글 + 코드 숫자 1~9(G3)도 «주소를 다시 확인»이 아니라 «서버에서 오류가 났어요 … (코드 G3 · K3QZ)»', /\(코드 G3 · K3QZ\)/.test(kd) && !/주소를 다시 확인/.test(kd), kd);
  await k.ctx.close();
});

const GUIDE = (extra) => ({ ok: true, guide: Object.assign({ groom: '김도현', bride: '정하윤', date: '2027-12-17', seatToken: 'stok', seatFull: true, dining: { on: false }, photoShare: '' }, extra || {}) });
await run('③ guide', async () => {
  for (const [resp, want, retry, nm] of [
    [`{ body: { ok: false, ecode: 'G3', error: '아직 준비 중이에요. 두 분께 알려 주세요. (코드 G3)' } }`, /아직 준비 중이에요\. 두 분께 알려 주세요 \(코드 G3\)/, false, '설정 없음(새 GAS · G3) → 멈춤 · 다시 시도 없음 · 코드 앞 마침표 없음(ERR_NO_DOT_PAGE)'],
    [`{ body: { ok: false, error: '아직 준비 중이에요. 두 분께 알려 주세요.' } }`, /아직 준비 중이에요\. 두 분께 알려 주세요 \(코드 G3\)/, false, '설정 없음(옛 GAS · 코드 없음) → G3 붙임 · 다시 시도 없음 · 코드 앞 마침표 없음(ERR_NO_DOT_PAGE)'],
    [`{ body: { ok: false, error: '올리다 끊겼어요. 다시 눌러 주세요.' } }`, /2장이 전해지지 않았어요 · 사진을 저장하지 못했어요 \(코드 G4\)/, true, '드라이브 실패(옛 글) → G4 · 연결 탓 아님 · 다시 시도'],
    [`'net'`, /2장이 전해지지 않았어요 · 연결이 끊겼어요 \(코드 G6\)/, true, '연결 끊김 → G6 · 다시 시도']]) {
    const { ctx, pg } = await open('/guide.html?g=t_err', `if (b.action === 'guideView') return { body: ${JSON.stringify(GUIDE({ seatToken: '' }))} }; if (b.action === 'guestPhoto') return ${resp};`);
    await until(pg, () => !!document.getElementById('gpPick'));
    await pg.setInputFiles('#gpFile', PNGS);
    await until(pg, () => !window.__gpBusy && /코드/.test((document.getElementById('gpStat') || {}).textContent || ''), null, 8000);
    const t = await txt(pg, '#gpStat'), hasRetry = !!(await pg.$('#gpRetry')), n = await calls(pg, 'guestPhoto'), gb = await gluedBad(pg, '#gpStat');
    ok(`③ guide 사진(F10) — ${nm}`, want.test(t) && hasRetry === retry && (retry || n === 1) && !/연결/.test(retry && /G4/.test(nm) ? t : '') && !/\. \(코드/.test(t) && !gb.length, { t, hasRetry, n, gb });
    await ctx.close();
  }
  for (const [resp, want, nm] of [[`{ body: { ok: false, ecode: 'G0', error: '아직 배치가 없어요.' } }`, /좌석 배치를 준비하고 있어요\. ?두 분이 배치를 마치면 여기에 보여요\./, '«아직 배치가 없어요» → 준비 안내(새로고침 아님)'],
    [`{ body: { ok: false, expired: true, reason: 'past', error: '예식이 끝나 안내가 닫혔어요.' } }`, /예식이 끝나 좌석 안내가 닫혔어요/, '만료 → 닫힘 안내'],
    [`{ body: { ok: false, ecode: 'G9', eid: 'K3QZ', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요. (코드 G9 · K3QZ)' } }`, /좌석 안내를 불러오지 못했어요\. ?서버에서 오류가 났어요 · 다시 해 주세요 \(코드 G9 · K3QZ\)/, '서버 오류 → 한 줄(코드 · 사고번호 그대로) + 다시 불러오기']]) {
    const { ctx, pg } = await open('/guide.html?g=t_err', `if (b.action === 'guideView') return { body: ${JSON.stringify(GUIDE())} }; if (b.action === 'seatView') return ${resp};`);
    /* 처음 그리는 «불러오는 중» 칸도 .state 다 — 그것이 아니라 «답을 받은 뒤»의 칸을 기다린다(바쁜 기계에서 불러오는 중 칸을 읽고 빨개진 적이 있다) */
    await until(pg, () => { const s = document.querySelector('#seatMap .state'); return !!s && !/불러오는 중/.test(s.textContent || ''); }, null, 6000);
    const t = await txt(pg, '#seatMap'), rb = !!(await pg.$('#seatMapRetry'));
    ok(`③ guide 좌석(F11) — ${nm}`, want.test(t) && !/새로고침/.test(t) && rb === /다시 불러오기/.test(nm), { t, rb });
    await ctx.close();
  }
  /* 첫 불러오기 연결 끊김(두 번 다시 시도 뒤) → G6 + 다시 불러오기 */
  const g = await open('/guide.html?g=t_err', `return 'net';`);
  await until(g.pg, () => !!document.getElementById('retryBtn'), null, 9000);
  const gt = await txt(g.pg, '#root');
  ok('③ guide(F2) — 연결 끊김 → «안내를 불러오지 못했어요» + «연결이 끊겼어요 (코드 G6)» + 다시 불러오기(«네트워크 상태를 확인» 아님)', /안내를 불러오지 못했어요/.test(gt) && /연결이 끊겼어요 \(코드 G6\)/.test(gt) && !/네트워크/.test(gt), gt);
  await g.ctx.close();
});

await run('③ seat', async () => {
  const { ctx, pg } = await open('/seat.html?t=T1234567890ab', `if (b.action === 'seatView') return { body: '<html>Service invoked too many times</html>', headers: { 'Content-Type': 'text/html' } };`, { w: 360 });
  await until(pg, () => !!document.getElementById('retryBtn'), null, 9000);
  const t = await txt(pg, '#root'), l = await lines(pg, '#root .state .sm');
  ok('③ seat(F2) — 서버 답이 깨짐(HTML) → «좌석 안내를 불러오지 못했어요» + «서버가 잠깐 멈췄어요 (코드 G7)» 한 줄(360) + 다시 불러오기(종전 «네트워크 상태를 확인한 뒤»)', /좌석 안내를 불러오지 못했어요/.test(t) && /서버가 잠깐 멈췄어요 \(코드 G7\)/.test(t) && l === 1, { t, l });
  await pg.evaluate(() => { const e = document.querySelector('#root .state .sm'); e.textContent = '요청이 몰렸어요 · 다시 해 주세요 (코드 G1)'; });
  const l4 = await lines(pg, '#root .state .sm');
  ok('④ seat 360 — 서버 몰림 «요청이 몰렸어요 · 다시 해 주세요 (코드 G1)» 한 줄', l4 === 1, 'lines ' + l4);
  await ctx.close();
});

await run('③ 콘솔', async () => {
  const S0 = Buffer.from(JSON.stringify({ course: 'family', guestVoice: 'couple', up: { g0: { id: 'F-g0' } } })).toString('base64');
  const { ctx, pg } = await open(`/console.html?S=${encodeURIComponent(S0)}&rf=ME0001`, `return { body: { ok: false, error: '로그인이 필요합니다. (관리자 전용)' } };`, { w: 1280, seed: { ls: { me_admin_token: 'TOK' } } });
  await until(pg, () => { const t = (document.getElementById('rfChk') || {}).textContent || ''; return /코드 L8/.test(t) && !/받는 중/.test(t); }, null, 6000);
  const t = await txt(pg, '#rfChk');
  ok('③ 콘솔(F12) — 로그인 풀림이 «받지 못함»에 까닭(관리자 로그인이 풀렸어요 · L8)으로 · 목록을 못 받은 줄은 «파일 없음»이라 하지 않는다', /하객 입장 때\s*받지 못함 · 나레이션으로 나감 · 관리자 로그인이 풀렸어요.*\(코드 L8\)/.test(t) && /목록을 못 받았어요/.test(t) && !/파일 없음/.test(t), t);
  await ctx.close();
  const b = await open(`/console.html?S=${encodeURIComponent(S0)}`, `return { body: { ok: true } };`, { w: 1280, seed: { ls: { me_admin_token: 'TOK' } } });
  await b.pg.waitForTimeout(500);
  const t2 = await txt(b.pg, '#rfChk');
  ok('③ 콘솔(F12) — rf 코드 없이 열면 «파일 없음»이 아니라 «받지 않음 · … «당일 콘솔» 단추로 열어야 받아요»', /받지 않음 · 나레이션으로 나감 · 관리 화면 «당일 콘솔» 단추로 열어야 받아요/.test(t2) && !/파일 없음/.test(t2), t2);
  await b.ctx.close();
});

/* ══════════ ⑤ 2라운드 [ERR_PAGES_R2] ══════════ */
const pickAndSend = async (pg) => {
  await until(pg, () => !!document.querySelector('#calGrid button.day.avail'), null, 8000);
  await pg.evaluate(() => document.querySelector('#calGrid button.day.avail').click());
  await until(pg, () => !!document.querySelector('#slots button.slot:not(.full)'));
  await pg.evaluate(() => { document.querySelector('#slots button.slot:not(.full)').click(); const p = document.getElementById('depPayer'); if (p) p.value = '정하윤'; document.getElementById('submitBtn').click(); });
};
await run('⑤ schedule 신청 결과 모름(SCHED_SUBMIT_RECHECK)', async () => {
  /* 신청(submitSchedule)이 영영 안 오면(45초 → 4.5초) «결과 모름» — 일정을 다시 물어 고른 날짜가 들어가 있으면 완료 창 · 아니면 다시 누르게 · 다시 묻기도 끊기면 «결과를 못 받았어요» */
  const route = (mode) => `if (b.action === 'getAvailability') { var k = window.__calls.filter(function(c){ return c.b.action === 'getAvailability'; }).length, a = JSON.parse(${JSON.stringify(JSON.stringify(AV))});
      if (k > 1) { ${mode === 'lost' ? "return 'hang';" : ''} var p = String(window.__pick || '').split('-'); a.currentDate = ${mode === 'yes' ? "p.length === 3 ? p[0] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[2]).slice(-2) : ''" : "'2020-01-01'"}; return { body: a, delay: 1200 }; }
      return { body: a }; }
    if (b.action === 'submitSchedule') { window.__pick = b.dateKey; return 'hang'; }
    if (b.action === 'cardPayConfig') return { body: { ok: true, enabled: false } }; if (b.action === 'weddingAvailability') return { body: { ok: true, taken: {} } };`;
  for (const [mode, w, want, nm] of [['yes', 390, null, '다시 물어 고른 날짜가 들어가 있으면 → 완료 창(종전엔 «신청 중»이 끝없이 돌았다)'],
    ['no', 360, /^아직 신청 전이에요 · 다시 눌러 주세요 \(코드 B5\)$/, '다시 물어도 아직이면 → «아직 신청 전이에요 · 다시 눌러 주세요 (코드 B5)» 한 줄(360) · 단추가 풀린다'],
    ['lost', 360, /^결과를 못 받았어요 · 다시 눌러 주세요 \(코드 B5\)$/, '다시 묻기도 답이 없으면 → «결과를 못 받았어요 · 다시 눌러 주세요 (코드 B5)»']]) {
    const { ctx, pg } = await open('/schedule.html', route(mode), { w, seed: { ls: { me_token: TK } } });
    await pickAndSend(pg);
    const checking = await until(pg, () => /^응답이 늦어요$/.test((document.getElementById('summary').textContent || '').trim()) && /신청됐는지 확인 중/.test(document.getElementById('submitBtn').textContent), null, 12000);   // [ERR_RECHECK_NOCODE] 다시 묻는 중간 줄엔 코드 없음(P6)
    let res = {}, good = false;
    if (mode === 'yes') { good = await until(pg, () => document.getElementById('modal').classList.contains('show'), null, 12000); res = { modal: good }; }
    else { good = await until(pg, (re) => new RegExp(re).test((document.getElementById('summary').textContent || '').trim()) && !document.getElementById('submitBtn').disabled, want.source, 12000);
      res = { t: await txt(pg, '#summary'), l: await lines(pg, '#summary'), gb: await gluedBad(pg, '#summary') }; good = good && res.l === 1 && !res.gb.length; }
    ok(`⑤ schedule(SCHED_SUBMIT_RECHECK) — ${nm}`, checking && good && (await calls(pg, 'getAvailability')) >= 2, Object.assign({ checking }, res));
    await ctx.close();
  }
});
/* [SCHED_DBL_RESIDUE 2026-10-08 점검 R4] 신청을 두 번 눌러도 한 번만 보낸다 · 끊김(B6) 뒤 다시 눌러 되면 완료 창(실패 줄에 갇히지 않는다) */
await run('⑤ schedule 두 번 누름 · 끊김 뒤 다시 성공 [SCHED_DBL_RESIDUE]', async () => {
  const R = (mode) => `if (b.action === 'getAvailability') return { body: JSON.parse(${JSON.stringify(JSON.stringify(AV))}) };
    if (b.action === 'submitSchedule') { var k = window.__calls.filter(function(c){ return c.b.action === 'submitSchedule'; }).length; return ${mode === 'net' ? "k === 1 ? 'net' : { body: { ok: true } }" : "{ body: { ok: true }, delay: 700 }"}; }
    if (b.action === 'cardPayConfig') return { body: { ok: true, enabled: false } }; if (b.action === 'weddingAvailability') return { body: { ok: true, taken: {} } };`;
  { const { ctx, pg } = await open('/schedule.html', R('dbl'), { w: 390, seed: { ls: { me_token: TK } } });
    await pickAndSend(pg); await pg.evaluate(() => { document.getElementById('submitBtn').click(); document.getElementById('submitBtn').click(); });
    const shown = await until(pg, () => document.getElementById('modal').classList.contains('show'), null, 8000);
    ok('⑤ schedule [SCHED_DBL_RESIDUE] — 신청을 거듭 눌러도 submitSchedule 은 한 번 · 완료 창', shown && (await calls(pg, 'submitSchedule')) === 1, { shown, n: await calls(pg, 'submitSchedule') });
    await ctx.close(); }
  { const { ctx, pg } = await open('/schedule.html', R('net'), { w: 360, seed: { ls: { me_token: TK } } });
    await pickAndSend(pg);
    const e1 = await until(pg, () => /\(코드 B6\)/.test(document.getElementById('summary').textContent || '') && !document.getElementById('submitBtn').disabled, null, 8000);
    const t1 = await txt(pg, '#summary');
    await pg.evaluate(() => document.getElementById('submitBtn').click());
    const shown = await until(pg, () => document.getElementById('modal').classList.contains('show'), null, 8000);
    ok('⑤ schedule [SCHED_DBL_RESIDUE] — 끊김이면 «연결이 끊겼어요 · 다시 눌러 주세요 (코드 B6)» · 단추가 풀려 다시 누르면 완료 창', e1 && /연결이 끊겼어요 · 다시 눌러 주세요 \(코드 B6\)/.test(t1) && shown && (await calls(pg, 'submitSchedule')) === 2, { e1, t1, shown });
    await ctx.close(); }
});
await run('⑤ schedule 로그인 표 없음 · 예식 시간 조회 실패 · 계좌 복사 실패', async () => {
  let s = await open('/schedule.html', `return { body: { ok: true } };`, { w: 360 });
  await until(s.pg, () => /로그인이 필요해요/.test(document.body.innerText));
  const nt = await txt(s.pg, 'main'), ngb = await gluedBad(s.pg, 'main');
  const nl = await s.pg.evaluate(() => { const m = document.querySelector('main'); const w = document.createTreeWalker(m, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/마이페이지에서 다시 열어 주세요/.test(n.textContent)) { const e = n.parentElement.closest('.ec-code') ? n.parentElement.parentElement : n.parentElement; const r = document.createRange(); r.setStart(n, 0); const g = e.querySelector('.ec-code'); if (g) r.setEndAfter(g); else r.setEnd(n, n.textContent.length); return new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top))).size; } } return -1; });
  ok('⑤ schedule(SCHED_NO_TOKEN) — 이 탭에 로그인 표가 없으면 «마이페이지에서 다시 열어 주세요 (코드 B8)» · 코드는 한 덩어리 · 둘째 줄이 360 한 줄(종전 코드 없음)', /마이페이지에서 다시 열어 주세요 \(코드 B8\)/.test(nt) && !ngb.length && nl === 1, { nt, ngb, nl });
  await s.ctx.close();
  for (const [resp, want, nm] of [[`'net'`, /^예식 가능 시간을 확인하지 못했어요 \(코드 C6\)$/, '연결 끊김 → C6'], [`{ body: { ok: false, ecode: 'C4', error: '예식 가능 시간을 확인하지 못했어요 (코드 C4)' } }`, /^예식 가능 시간을 확인하지 못했어요 \(코드 C4\)$/, '서버 실패 → 서버 글(C4)']]) {
    s = await open('/schedule.html', SCHED(`if (b.action === 'weddingAvailability') return ${resp};`).replace("if (b.action === 'weddingAvailability') return { body: { ok: true, taken: {} } };", ''), { w: 360, seed: { ls: { me_token: TK } } });
    await until(s.pg, () => !!document.querySelector('#calGrid button.day'));
    await s.pg.evaluate(() => { const c = document.getElementById('holdChk'); c.click(); });
    const got = await until(s.pg, (re) => new RegExp(re).test(((document.getElementById('holdWtErr') || {}).textContent || '').trim()), want.source, 8000);
    const l = await lines(s.pg, '#holdWtErr'), gb = await gluedBad(s.pg, '#holdWtErr');
    ok(`⑤ schedule(HOLD_WT_WHY) — 예식 가능 시간을 못 받으면 «선택 불가»가 빈 채 말없이 두지 않는다: ${nm} · 한 줄(360) · 마이페이지와 같은 말`, got && l === 1 && !gb.length, { t: await txt(s.pg, '#holdWtErr'), l, gb });
    await s.ctx.close();
  }
  s = await open('/schedule.html', SCHED(), { w: 360, seed: { ls: { me_token: TK } }, init: FAILCOPY });
  await until(s.pg, () => !!document.querySelector('#calGrid button.day'));
  await s.pg.evaluate(() => window.copyAcct());
  const cf = await until(s.pg, () => /복사가 안 됐어요 · 길게 눌러 복사해 주세요/.test(((document.getElementById('acctCopyErr') || {}).textContent || '')));
  const bt = await txt(s.pg, '#acctCopyBtn');
  ok('⑤ schedule(COPY_FAIL_SHOW) — 복사가 안 되면 «복사됨»이 아니라 계좌 줄 아래 «복사가 안 됐어요 · 길게 눌러 복사해 주세요»', cf && bt === '복사', { bt });
  await s.ctx.close();
});
await run('⑤ live 편지 시간 제한 · 계좌 복사 실패', async () => {
  const L = await open('/live.html?e=evt-letter-2', `if (url.indexOf('action=getCouple') >= 0) return { body: ${JSON.stringify(COUPLE)} }; if (b.action === 'guestLetter') return 'hang';`);
  await until(L.pg, () => document.body.classList.contains('couple-ready'));
  await L.pg.evaluate(() => { document.getElementById('lfMessage').value = '축하해요'; document.getElementById('lfGuestName').value = '하객'; document.getElementById('letterForm').requestSubmit(); });
  const got = await until(L.pg, () => getComputedStyle(document.getElementById('letterError')).display !== 'none', null, 9000);
  const le = await txt(L.pg, '#letterError'), gb = await gluedBad(L.pg, '#letterError');
  ok('⑤ live(LETTER_TIMEOUT) — 편지가 30초 안에 답이 없으면 «보내는 중»에 갇히지 않고 «편지가 전해졌는지 확인하지 못했어요 · 한 번 더 보내 주세요 (코드 G5)»', got && /편지가 전해졌는지 확인하지 못했어요 · 한 번 더 보내 주세요 \(코드 G5\)/.test(le) && !gb.length, { le, gb });
  const w0 = await L.pg.evaluate(() => liveWaitWord(0));
  ok('⑤ live(ERR_N_HONEST) — 그리기 예외(0)는 «연결이 끊겼어요 (코드 G6)»가 아니라 «화면 오류예요 · 새로 고쳐 주세요 (코드 G0)»', w0 === '화면 오류예요 · 새로 고쳐 주세요 (코드 G0)' && /sayNotLoaded\(_ecN\(err\)\)/.test(read('live.html')), w0);
  await L.ctx.close();
  const C = await open('/live.html?e=evt-copy-1', `if (url.indexOf('action=getCouple') >= 0) return { body: ${JSON.stringify(COUPLE)} };`, { init: FAILCOPY });
  await until(C.pg, () => document.body.classList.contains('couple-ready'));
  await C.pg.evaluate(() => { const b = [...document.querySelectorAll('.env-copy')].find((x) => x.dataset.account) || document.querySelector('.env-copy'); b.dataset.account = b.dataset.account || '12345678901234'; b.closest('.env-item').classList.add('open'); b.click(); });
  const cf = await until(C.pg, () => /복사가 안 됐어요 · 길게 눌러 복사해 주세요/.test(((document.querySelector('.me-copy-fail') || {}).textContent || '')));
  const toast = await C.pg.evaluate(() => { const t = document.getElementById('toast'); return t.classList.contains('show') ? t.textContent : ''; });
  ok('⑤ live(COPY_FAIL_SHOW) — 계좌 복사가 안 되면 «Copied»·2초 «복사 실패»가 아니라 그 줄 아래 보이는 한 줄', cf && !/Copied|복사되었습니다/.test(toast), { toast });
  await C.ctx.close();
});
await run('⑤ 청첩장 계좌 복사 실패(COPY_FAIL_SHOW)', async () => {
  for (const f of ['/i/cover-01.html', '/i/cover-02.html', '/i/cover-04.html', '/i/cover-08.html', '/i-family/family-03.html']) {
    const { ctx, pg } = await open(f + '?e=test-couple', `return { body: { ok: true } };`, { init: FAILCOPY });
    await until(pg, () => document.body.classList.contains('couple-ready'), null, 8000);
    const before = await pg.evaluate(() => { const b = document.querySelector('.env-acc-copy[data-account]:not([data-account=""]),.acc-copy[data-copy]:not([data-copy=""]),.env-acc-copy[data-copy]:not([data-copy=""])');
      if (!b) return null; const it = b.closest('details,.env-acc-item,.acc-item,.env-acc'); if (it) { if (it.tagName === 'DETAILS') it.open = true; it.classList.add('open'); } window.__cb = b; const t0 = b.textContent; b.click(); return t0; });
    const cf = await until(pg, () => /복사가 안 됐어요 · 길게 눌러 복사해 주세요/.test(((document.querySelector('.me-copy-fail') || {}).textContent || '')));
    const st = await pg.evaluate(() => ({ btn: window.__cb.textContent, toast: ((document.getElementById('toast') || {}).textContent || '') }));
    ok(`⑤ 청첩장 ${f}(COPY_FAIL_SHOW) — 복사가 안 되면 «Copied»·«복사됨»이 아니라 계좌 줄 아래 «복사가 안 됐어요 · 길게 눌러 복사해 주세요»`, before !== null && cf && st.btn === before && !/복사됨/.test(st.toast), { before, st });
    await ctx.close();
  }
  const { ctx, pg } = await open('/i/cover-01.html?e=test-couple', `return { body: { ok: true } };`, { init: `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function(){ return Promise.resolve(); } } });` });
  await until(pg, () => document.body.classList.contains('couple-ready'), null, 8000);
  await pg.evaluate(() => { const b = document.querySelector('.env-acc-copy[data-account]:not([data-account=""])'); window.__cb = b; b.click(); });
  const okd = await until(pg, () => window.__cb.textContent === 'Copied');
  ok('⑤ 청첩장(COPY_FAIL_SHOW) — 복사가 되면 종전대로 «Copied» · 실패 줄 없음', okd && !(await pg.$('.me-copy-fail')));
  await ctx.close();
});
await run('⑤ guide · seat 2라운드', async () => {
  /* [GUIDE_MINE_SWAP] 전체 배치도로 그린 뒤 서버가 «내 자리만»이라 답하면 — 검색칸 없는 채로 멈춰 «연결이 끊겼어요 (코드 G6)»가 숨은 칸에 쓰이던 것 */
  let g = await open('/guide.html?g=t_mine', `if (b.action === 'guideView') return { body: ${JSON.stringify(GUIDE())} }; if (b.action === 'seatView') return b.q ? { body: { ok: true, hits: [{ no: 3, label: '테이블 3' }] } } : { body: { ok: false, mineOnly: true } };`);
  const sw = await until(g.pg, () => !!document.getElementById('q') && !document.getElementById('seatMap'), null, 8000);
  await g.pg.evaluate(() => { const q = document.getElementById('q'); q.value = '김민수'; q.dispatchEvent(new Event('input', { bubbles: true })); });
  const hit = await until(g.pg, () => /테이블 3/.test((document.getElementById('fr') || {}).textContent || ''), null, 6000);
  const gt = await txt(g.pg, '#root');
  ok('⑤ guide(GUIDE_MINE_SWAP) — «내 자리만»으로 바뀌면 좌석 칸이 «내 자리 찾기» 검색으로 바뀌고 검색이 된다(종전 칸이 비고 말 없음)', sw && hit && /내 자리 찾기/.test(gt) && !/연결이 끊겼어요/.test(gt), { sw, hit });
  await g.ctx.close();
  /* [ERR_RETRY_3] 설정 · 배포(G3 «잠시 뒤 다시 눌러 주세요») — 링크 탓 부제 · 캐시 지우기 없이 «다시 불러오기» */
  const G3 = `{ body: { ok: false, ecode: 'G3', error: '지금은 처리할 수 없어요. 잠시 뒤 다시 눌러 주세요 (코드 G3)' } }`;
  g = await open('/guide.html?g=t_g3', `if (b.action === 'guideView') return ${G3};`);
  await until(g.pg, () => !!document.getElementById('retryBtn'), null, 8000);
  const g3t = await txt(g.pg, '#root');
  ok('⑤ guide(ERR_RETRY_3) — G3 은 «링크가 만료되었거나…»가 아니라 까닭 + «다시 불러오기»', /\(코드 G3\)/.test(g3t) && !/링크가 만료/.test(g3t) && !/\. \(코드/.test(g3t), g3t);
  await g.ctx.close();
  g = await open('/guide.html?g=t_g3c', `if (b.action === 'guideView') return ${G3};`, { seed: { ls: { me_guide_t_g3c: JSON.stringify(GUIDE().guide) } } });
  await until(g.pg, () => (window.__calls || []).some((c) => c.b.action === 'guideView'), null, 6000); await g.pg.waitForTimeout(400);
  const kept = await g.pg.evaluate(() => !!localStorage.getItem('me_guide_t_g3c') && /김도현/.test(document.body.innerText));
  ok('⑤ guide(ERR_RETRY_3) — G3 이면 전에 본 안내(캐시)를 지우지 않는다(종전엔 링크 문제로 보고 지웠다)', kept);
  await g.ctx.close();
  let st = await open('/seat.html?t=T1234567890ab', `if (b.action === 'seatView') return ${G3};`, { w: 360 });
  await until(st.pg, () => !!document.getElementById('retryBtn'), null, 8000);
  const s3 = await txt(st.pg, '#root');
  ok('⑤ seat(ERR_RETRY_3) — G3 은 링크 탓 부제 없이 까닭 + «다시 불러오기»', /\(코드 G3\)/.test(s3) && !/링크가 만료/.test(s3), s3);
  await st.ctx.close();
  /* [ERR_N_HONEST] 그리기 예외(서버 답의 모양이 틀림 → TypeError)는 «연결이 끊겼어요 (코드 G6)»가 아니다 — 저절로 다시 묻지 않고 G0 · 단추는 화면을 새로 연다 */
  st = await open('/seat.html?t=T1234567890ab', `if (b.action === 'seatView') return { body: { ok: true, seat: { groom: '김도현', bride: '정하윤', date: '2027-12-17', tables: 5 } } };`, { w: 360 });
  await until(st.pg, () => !!document.getElementById('retryBtn'), null, 8000);
  const s0 = await txt(st.pg, '#root'), l0 = await lines(st.pg, '#root .state .sm'), gb0 = await gluedBad(st.pg, '#root');
  ok('⑤ seat(ERR_N_HONEST) — 그리기 예외 → «화면 오류예요 · 새로 고쳐 주세요 (코드 G0)» 한 줄(360) · 다시 묻지 않음(1번)', /화면 오류예요 · 새로 고쳐 주세요 \(코드 G0\)/.test(s0) && !/연결이 끊겼어요/.test(s0) && l0 === 1 && !gb0.length && (await calls(st.pg, 'seatView')) === 1, { s0, l0, gb0 });
  await st.ctx.close();
  ok('⑤ guide(GUIDE_DEMO_CODE) — 표본 그리기 예외도 코드(G0)와 함께', /renderDemo\(\); \}catch\(e\)\{ \$\('root'\)\.innerHTML=stateHtml\('샘플 화면을 그리지 못했어요\.',_ecNet\(e,'G',''\),0\)/.test(read('guide.html')));
});
await run('⑤ AI 위젯 · 공유 2라운드', async () => {
  /* [HANDOFF_ECODE] api/handoff 가 넘긴 GAS 까닭 코드(A3)를 그대로 — 종전엔 delivered:false 면 늘 A4 */
  let w = await open('/inquiry.html', `if (url.indexOf('/api/advisor') >= 0) return { body: { reply: '확인이 필요해 디렉터에게 연결해 드릴게요.', escalate: true } }; if (url.indexOf('/api/handoff') >= 0) return { body: { ok: true, delivered: false, why: 'gas_unauthorized', ecode: 'A3' } };`, { w: 360 });
  await until(w.pg, () => !!(window.MEAdvisor && window.MEAdvisor.ask), null, 8000);
  await w.pg.evaluate(() => window.MEAdvisor.ask('계약금 환불이 되나요?'));
  await until(w.pg, () => { const e = document.querySelector('.me-adv-esc-t'); return !!e && !/전달하고 있어요/.test(e.textContent); });
  const et = await escTxt(w.pg), egb = await gluedBad(w.pg, '.me-adv-esc-t');
  ok('⑤ 위젯(HANDOFF_ECODE) — GAS 설정 문제는 «자동 전달이 안 됐어요 · 카카오톡으로 남겨 주세요 (코드 A3)» · 코드는 한 덩어리', /^자동 전달이 안 됐어요 · 카카오톡으로 남겨 주세요 \(코드 A3\)$/.test(et) && !egb.length, { et, egb });
  await w.ctx.close();
  /* [ERR_CODE_GLUE] 위젯 답 풍선 · 홈 인라인 사본도 한 덩어리 */
  for (const pgUrl of ['/inquiry.html', '/index.html']) {
    w = await open(pgUrl, `if (url.indexOf('/api/advisor') >= 0) return { status: 429, body: { error: 'rate_limited', escalate: true } };`, { w: 360 });
    await until(w.pg, (u) => (u === '/inquiry.html' ? !!(window.MEAdvisor && window.MEAdvisor.ask) : !!document.getElementById('meAdvForm')), pgUrl, 8000);
    if (pgUrl === '/inquiry.html') await w.pg.evaluate(() => window.MEAdvisor.ask('식사는 어떻게 되나요?'));
    else await w.pg.evaluate(() => { const i = document.getElementById('meAdvInput'); i.value = '식사는 어떻게 되나요?'; document.getElementById('meAdvForm').requestSubmit(); });
    await until(w.pg, () => /코드 A1/.test([...document.querySelectorAll('.me-adv-msg.bot')].map((m) => m.textContent).join('')));
    const gb = await w.pg.evaluate(() => { const m = [...document.querySelectorAll('.me-adv-msg.bot')].pop(); const sp = m && m.querySelector('.ec-code'); return sp ? getComputedStyle(sp).whiteSpace + '|' + sp.textContent : 'none'; });
    ok(`⑤ 위젯 ${pgUrl}(ERR_CODE_GLUE) — 답 풍선의 «(코드 A1)»은 nowrap 한 덩어리 · 글자는 그대로`, gb === 'nowrap|(코드 A1)', gb);
    await w.ctx.close();
  }
  /* [SHARE_COPY_FAIL] PC 에서 공유 복사가 안 되면 말없이 지나가지 않는다 — 위젯 파일판(토스트를 만든다) · 홈(meToast) 같은 말 */
  w = await open('/inquiry.html', `return { body: {} };`, { w: 1280, init: FAILCOPY });
  await until(w.pg, () => !!document.getElementById('meAdvShare'), null, 8000);
  await w.pg.evaluate(() => document.getElementById('meAdvShare').click());
  const sf = await until(w.pg, () => /^복사가 안 됐어요 · 주소창의 주소를 직접 복사해 주세요$/.test(((document.getElementById('meAdvToast') || {}).textContent || '').trim()));
  ok('⑤ 위젯 공유(SHARE_COPY_FAIL) — 복사가 안 되면 «복사가 안 됐어요 · 주소창의 주소를 직접 복사해 주세요» 한 줄(종전 말 없음 · ✓ 표시)', sf);
  await w.ctx.close();
  w = await open('/index.html', `return { body: {} };`, { w: 360, init: FAILCOPY });
  await w.pg.waitForTimeout(300);
  await w.pg.evaluate(() => window.meShareSite(null));
  const hf = await until(w.pg, () => /^복사가 안 됐어요 · 주소창의 주소를 직접 복사해 주세요$/.test(((document.getElementById('meToast') || {}).textContent || '').trim()));
  const tw = await w.pg.evaluate(() => { const t = document.getElementById('meToast'); t.textContent = '재생이 막혔어요 · 다시 눌러 주세요 (코드 M7)'; t.classList.add('on'); const r = document.createRange(); r.selectNodeContents(t); return new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top + x.height / 2))).size; });
  ok('⑤ 홈 공유(SHARE_COPY_FAIL) — execCommand 실패를 «복사됨»이라 하지 않는다 · 위젯과 같은 말 · [TOAST_WIDTH] 360px 토스트가 180px 칸에 접히지 않는다(한 줄)', hf && tw === 1, { hf, tw });
  await w.ctx.close();
});
await run('⑤ 신청서 개인코드 복사 실패(COPY_FAIL_SHOW)', async () => {
  /* 신청 완료 화면의 «코드 복사» — execCommand 가 실패해도 «복사됐어요 ✓»라 하던 것(청첩장 · live · schedule 계좌와 같은 병) */
  const { ctx, pg } = await open('/inquiry.html', `return { body: {} };`, { w: 360, init: FAILCOPY });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { showSuccess('ME7K2Q'); document.getElementById('meCopyCode').click(); });
  const cf = await until(pg, () => /^복사가 안 됐어요 · 코드를 길게 눌러 복사해 주세요$/.test(((document.getElementById('meCopyCodeErr') || {}).textContent || '').trim()));
  const bt = await txt(pg, '#meCopyCode');
  ok('⑤ 신청서(COPY_FAIL_SHOW) — 개인코드 복사가 안 되면 «복사됐어요 ✓»가 아니라 단추 아래 «복사가 안 됐어요 · 코드를 길게 눌러 복사해 주세요»', cf && bt === '코드 복사', { bt });
  await ctx.close();
});
await run('⑤ 재생 실패(PLAY_FAIL_SAY) · 미리보기(PV_IMG_CODE)', async () => {
  const PLAYNO = (nm) => `try { Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: function(){ return undefined; } }); } catch (e) {}
    try { window.SpeechSynthesisUtterance = undefined; } catch (e) {}
    HTMLMediaElement.prototype.play = function(){ return Promise.reject(new DOMException('x', '${nm}')); };`;   // 기기 음성은 끈다(음원 길만 잰다)
  for (const [nm, want, code] of [['NotAllowedError', /^재생이 막혔어요 · 다시 눌러 주세요 \(코드 M7\)$/, 'M7'], ['NotSupportedError', /^소리를 못 열었어요 · 다시 눌러 주세요 \(코드 M6\)$/, 'M6']]) {
    let { ctx, pg } = await open('/parents.html', `return { body: {} };`, { w: 360, init: PLAYNO(nm) });
    await until(pg, () => { const b = document.getElementById('listenBtn'); return !!b && !b.hidden; }, null, 8000);
    await pg.evaluate(() => document.getElementById('listenBtn').click());
    const got = await until(pg, (re) => new RegExp(re).test(((document.getElementById('listenErr') || {}).textContent || '').trim()), want.source, 6000);
    const l = await lines(pg, '#listenErr'), gb = await gluedBad(pg, '#listenErr'), lab = await txt(pg, '#listenBtn');
    ok(`⑤ parents(PLAY_FAIL_SAY) — 재생 ${nm} → 도구 줄 아래 «… (코드 ${code})» 한 줄(360) · 단추는 «듣기»로(종전 말 없이 되돌아감)`, got && l === 1 && !gb.length && lab === '듣기', { t: await txt(pg, '#listenErr'), l, gb, lab });
    await ctx.close();
    ({ ctx, pg } = await open('/index.html', `return { body: {} };`, { w: 360, init: PLAYNO(nm) }));
    await until(pg, () => !!document.querySelector('.journal-listen:not([hidden])'), null, 8000);
    await pg.evaluate(() => document.querySelector('.journal-listen:not([hidden])').click());
    const jt = await until(pg, (re) => new RegExp(re).test(((document.getElementById('meToast') || {}).textContent || '').trim()), want.source, 6000);
    ok(`⑤ 홈 저널 낭독(PLAY_FAIL_SAY) — 재생 ${nm} → 토스트 «… (코드 ${code})»(종전 말 없이 ▶ 로 돌아감)`, jt, await txt(pg, '#meToast'));
    await ctx.close();
  }
  const { ctx, pg } = await open('/preview.html?img=/assets/preview/__none__.png&t=' + encodeURIComponent('예시'), `return { body: {} };`, { w: 360 });
  await until(pg, () => !!document.querySelector('.pv-err'), null, 6000);
  const pv = await txt(pg, '.pv-err'), pgb = await gluedBad(pg, '.pv-err');
  ok('⑤ preview(PV_IMG_CODE) — 미리보기 이미지를 못 받으면 코드와 함께(L4 · 오프라인이면 L6) · 한 덩어리', /미리보기 이미지를 불러오지 못했어요\. ?잠시 뒤 다시 열어 주세요 \(코드 L4\)/.test(pv) && !pgb.length, { pv, pgb });
  await ctx.close();
});
await run('④ 360 2라운드 — 새 실패 줄이 한 줄', async () => {
  const one = async (url, route, seed, prep, sel, texts) => { const { ctx, pg } = await open(url, route, { w: 360, seed });
    await pg.waitForTimeout(700); if (prep) await pg.evaluate(prep);
    const r = await pg.evaluate(([s, T]) => { const e = document.querySelector(s); if (!e) return ['없음 ' + s]; let p = e; while (p) { if (getComputedStyle(p).display === 'none') p.style.display = 'block'; p = p.parentElement; }
      return T.map((t) => { e.textContent = t; const rg = document.createRange(); rg.selectNodeContents(e); return new Set([...rg.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top + x.height / 2))).size; }); }, [sel, texts]);
    await ctx.close(); return r; };
  const r1 = await one('/cancel.html?token=TKN&sig=SIG', `return { body: ${JSON.stringify(INFO_OK)} };`, null, () => { if (!document.getElementById('cErr')) { const d = document.createElement('div'); d.className = 'note'; d.id = 'cErr'; document.getElementById('card').appendChild(d); } }, '#cErr', ['화면 오류예요 · 새로 고쳐 주세요 (코드 B0)']);
  const r2 = await one('/seat.html?t=T1234567890ab', `return 'hang';`, null, () => { document.getElementById('root').innerHTML = '<div class="card"><h1 class="state">좌석 안내를 불러오지 못했어요.<div class="sm" id="smx">x</div></h1></div>'; }, '#smx', ['화면 오류예요 · 새로 고쳐 주세요 (코드 G0)']);
  const r3 = await one('/live.html?e=evt-w-1', `return 'hang';`, null, null, '.live-notloaded-box .lp-message-desc', ['화면 오류예요 · 새로 고쳐 주세요 (코드 G0)']);
  const r4 = await one('/schedule.html', SCHED(), { ls: { me_token: TK } }, null, '#summary', ['화면 오류예요 · 새로 고쳐 주세요 (코드 B0)', '아직 신청 전이에요 · 다시 눌러 주세요 (코드 B5)', '결과를 못 받았어요 · 다시 눌러 주세요 (코드 B5)']);
  const all = [].concat(r1, r2, r3, r4);
  ok('④ 360 2라운드 — 화면 쪽 예외 줄(cancel B0 · seat G0 · live G0 · schedule B0) · 다시 묻는 중 줄이 한 줄씩', all.every((x) => x === 1), JSON.stringify({ r1, r2, r3, r4 }));
});

ok('③ 화면 오류(pageerror) 0', !errs.length, errs.slice(0, 3).join(' | '));
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
