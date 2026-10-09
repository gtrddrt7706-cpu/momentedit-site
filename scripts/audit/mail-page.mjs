#!/usr/bin/env node
/* ★[MAIL_PAGE_CHECK 2026-10-09 점검] 메일 단추 확인 화면 · 결과 화면이 고객 글을 안전하게 그리는가 — 행동으로 잰다(브라우저 없이)
   ① [HTML_ESC_NAMES] 승인 · 수락 · 취소 결과 글: 이름 · 시간에 꺾쇠를 넣어 돌려도 결과 글(_LAST_INFO.body)에 꺾쇠가 그대로 남지 않는다
   ② [HTML_ESC_NAMES] 정적: infoPage( 의 둘째 인자에서 고객 글(coupleNames · row.get · time · nt · names)이 esc( · prettyDate( 밖에 있으면 빨강
   ③ [MAIL_SHOW_SAFE · MAIL_RETRY · MAIL_FAIL_KIND · MAIL_BOX_STEADY] 확인 화면 스크립트를 가짜 화면에서 돌린다
      — 서버 글은 줄바꿈 · 굵게만 만들고 다른 꺾쇠는 만들지 않는다 · 끝난 결과는 단추 자리를 남긴 채 감춘다 · 다시 누를 수 있는 실패는 단추를 되살린다
      — 단추가 서버에 닿지 못하면 5 시간 초과 · 6 연결 끊김 · 7 그 밖으로 가른다(B 상담 예약 · P 입금)
   종료: 0 통과 · 1 빨강 · 2 재지 못함 */
import fs from 'node:fs';
import vm from 'node:vm';
import { loadGas, makeSandbox } from './gas-lint.mjs';

const bad = [];
const { sandbox: G, errors } = loadGas(makeSandbox());
if (errors.length) { console.log('━━ mail-page — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file); process.exit(2); }
for (const n of ['actApprove', 'actAccept', 'infoPage', '_mailConfirmPage_', 'serveAdminCancelD']) {
  if (typeof G[n] !== 'function') { console.log('━━ mail-page — ' + n + ' 가 없다 · 재지 못했습니다'); process.exit(2); }
}

// ── ① 결과 글 escape (행동)
const EVIL = '<img src=x onerror=alert(1)>';
const mkRow = (f) => ({ num: 2, get: (h) => (h in f ? f[h] : '') });
const base = { '선택날짜': '2026-11-01', '선택시간': EVIL, '성함(신랑)': EVIL, '성함(신부)': '<b>bride</b>', '토큰': 'tok1', '이메일': 'a@b.c', '연락처': '010', '개인코드': '' };
for (const k of ['writeCell', 'syncCalendarEvent', '_bustAvailCache', 'sendConfirmEmail_', 'sendStudioBriefEmail', 'setCustomerStage', 'notifyKakao', 'notifyStudio', 'lockBusySignal', '_nfAdminLineEmail', '_releaseWeddingHoldOnCancel']) G[k] = () => {};
G._slotTaken = () => false;
G.findCustomerByCode = () => null;
G._SRV = true;   // 메일 단추 · 관리 화면이 부르는 서버 길 안
const raw = (body) => /<img|<b>bride/i.test(String(body || ''));
function result(label, fn) {
  G._LAST_INFO = null;
  try { fn(); } catch (e) { bad.push(label + ': 던졌다 — ' + (e && e.message)); return; }
  const b = G._LAST_INFO && G._LAST_INFO.body;
  if (!G._LAST_INFO) bad.push(label + ': 결과 글이 없다');
  else if (raw(b)) bad.push(label + ': 고객 글의 꺾쇠가 결과 글에 그대로 남았다 — ' + String(b).slice(0, 80));
  else if (!/&lt;img/.test(b)) bad.push(label + ': 결과 글에 고객 이름이 안 보인다(escape 된 꼴) — ' + String(b).slice(0, 80));
}
const ST = G.ST || {};
let cur = null; G.findRowByToken = () => cur;
cur = mkRow(Object.assign({}, base, { '상태': '시간선택완료' })); result('승인 완료', () => G.actApprove({}, {}, cur));
cur = mkRow(Object.assign({}, base, { '상태': ST.APPROVED || '승인완료' })); result('승인 · 이미 확정', () => G.actApprove({}, {}, cur));
G._slotTaken = () => true;
cur = mkRow(Object.assign({}, base, { '상태': '시간선택완료' })); result('승인 · 마감된 슬롯', () => G.actApprove({}, {}, cur));
G._slotTaken = () => false;
cur = mkRow(Object.assign({}, base, { '상태': ST.CONFIRMED || '확정' })); result('수락 · 이미 확정', () => G.actAccept({}, {}, cur));
cur = mkRow(Object.assign({}, base, { '상태': ST.CANCELLED || '취소' })); result('관리자 취소 · 이미 취소', () => G.serveAdminCancelD('tok1', cur));
// 수락 성공은 시간만 고객 글(이름은 결과에 안 나온다)
cur = mkRow(Object.assign({}, base, { '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '2026-11-02', '변경제안시간': EVIL }));
G._LAST_INFO = null;
try { G.actAccept({}, {}, cur); } catch (e) { bad.push('수락 확정: 던졌다 — ' + (e && e.message)); }
if (!G._LAST_INFO || raw(G._LAST_INFO.body) || !/&lt;img/.test(G._LAST_INFO.body)) bad.push('수락 확정: 제안 시간의 꺾쇠가 escape 되지 않았다 — ' + String(G._LAST_INFO && G._LAST_INFO.body).slice(0, 80));

// ── ② 정적: infoPage 둘째 인자
const SRC_FILES = ['automation/consultation/consultation-booking.gs', 'automation/admin/admin.gs', 'automation/platform/80_production.gs', 'automation/platform/87_letter.gs', 'automation/platform/98_pay_card.gs'];
function argsOf(src, at) {   // at = '(' 위치 → 최상위 인자 글자들
  const out = []; let depth = 0, q = null, start = at + 1;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) { out.push(src.slice(start, i)); return out; } }
    else if (c === ',' && depth === 1) { out.push(src.slice(start, i)); start = i + 1; }
  }
  return out;
}
function stripStrings(t) { return t.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, "''"); }
function stripCalls(t, names) {   // esc( … ) 같은 안전한 감싸개를 통째로 지운다(괄호 짝을 센다)
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of names) {
      const i = t.indexOf(n + '(');
      if (i < 0) continue;
      let d = 0, j = i + n.length;
      for (; j < t.length; j++) { if (t[j] === '(') d++; else if (t[j] === ')') { d--; if (d === 0) break; } }
      t = t.slice(0, i) + 'SAFE' + t.slice(j + 1); changed = true;
    }
  }
  return t;
}
let calls = 0;
for (const f of SRC_FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const re = /\b(?:infoPage|_mailConfirmPage_)\(/g; let m;
  while ((m = re.exec(src))) {
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 10), m.index))) continue;
    const a = argsOf(src, m.index + m[0].length - 1);
    if (a.length < 2) continue;
    calls++;
    const body = stripCalls(stripStrings(a[1]), ['esc', 'prettyDate', 'safeAttr', 'formatWon']);
    const hit = body.match(/coupleNames\(|row\.get\(|\b(time|nt|nd|names|dateKey|memo|acct)\b/);
    if (hit) bad.push(`정적: ${f}:${src.slice(0, m.index).split('\n').length} infoPage 본문에 고객 글(${hit[0]})이 esc( 밖에 있다`);
  }
}
if (calls < 20) bad.push('정적: infoPage 호출을 ' + calls + '개만 찾았다(모양이 바뀌었다)');

// ── ③ 확인 화면 스크립트 (가짜 화면)
let html = '';
const realHS = G.HtmlService;
let metas = [];
G.HtmlService = { createHtmlOutput: (h) => { html = h; const o = { setTitle: () => o, setXFrameOptionsMode: () => o, addMetaTag: (n, c) => { metas.push(n + '=' + c); return o; } }; return o; }, XFrameOptionsMode: { ALLOWALL: 1 } };
function page(action) {
  G._mailConfirmPage_('예약을 승인할까요?', 'X 님', '승인하기', { action, token: 't', sig: 's' });
  const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  if (!js) { bad.push('화면: 스크립트를 못 찾았다'); return null; }
  const el = (id) => {
    const e = { id, nodeName: 'DIV', children: [], style: {}, disabled: false, _text: '', focused: false,
      appendChild(c) { this.children.push(c); return c; }, focus() { this.focused = true; } };
    Object.defineProperty(e, 'rawText', { get() { return this.children.length ? this.children.map((c) => (c.nodeType === 3 ? c.data : (c.rawText || c.textContent || ''))).join('') : this._text; } });
    Object.defineProperty(e, 'textContent', { get() { return String(this.rawText).replace(/\u00a0/g, ' '); },
      set(v) { this.children = []; this._text = String(v); } });
    Object.defineProperty(e, 'innerHTML', { get() { return this.children.length ? this.textContent : this._text; }, set(v) { this.children = []; this._text = String(v); } });
    return e;
  };
  const E = { go: el('go'), t: el('t'), d: el('d'), bar: el('bar') };
  E.go._text = '승인하기'; E.t._text = '예약을 승인할까요?'; E.d._text = 'X 님';
  let ok = null, fail = null, sent = null;
  const run = { withSuccessHandler(f) { ok = f; return run; }, withFailureHandler(f) { fail = f; return run; }, mailButtonGo(p) { sent = p; } };
  const doc = { getElementById: (id) => E[id], createTextNode: (t) => ({ nodeType: 3, data: String(t) }),
    createElement: (tag) => { const x = el('x'); x.nodeName = String(tag).toUpperCase(); x.nodeType = 1; return x; } };
  vm.runInNewContext(js, { document: doc, google: { script: { run } }, String, parseInt, Number });
  return { E, click: () => E.go.onclick(), ok: (r) => ok(r), fail: (m) => fail(new Error(m)), sent: () => sent };
}
const tags = (e) => e.children.filter((c) => c.nodeType !== 3).map((c) => c.nodeName);
{ // [MAIL_SAME_WORDS] 코드 괄호는 한 줄 — 서버 글(tx)이든 화면 실패 글이든 괄호 안 띄어쓰기는 줄바꿈 안 되는 칸(U+00A0)
  const K = page('approve');
  if (K) { K.click(); K.ok({ ok: false, retry: true, title: '처리하지 못했어요', body: '잠시 후 다시 눌러 주세요 (코드 B9 · MXZC)' });
    if (!/\(코드\u00a0B9\u00a0·\u00a0MXZC\)/.test(K.E.d.rawText)) bad.push('화면: 서버 글의 코드 괄호가 줄에서 갈릴 수 있다(괄호 안 띄어쓰기) — ' + JSON.stringify(K.E.d.rawText));
    K.click(); K.fail('Failed to fetch');
    if (!/\(코드\u00a0B6\)/.test(K.E.d.rawText)) bad.push('화면: 실패 글의 코드 괄호가 줄에서 갈릴 수 있다 — ' + JSON.stringify(K.E.d.rawText)); }
  html = ''; G.infoPage('t', '잠시 후 다시 눌러 주세요 (코드 B1)', false);
  if (!/\(코드&nbsp;B1\)/.test(html)) bad.push('화면: 결과 화면(서버 HTML)의 코드 괄호가 줄에서 갈릴 수 있다'); }
{ // [MAIL_SAME_WORDS] 실패 뒤 다시 누르면 처음 화면(제목 · 설명 · 막대색)에서 «처리 중»
  const A = page('approve');
  if (A) { A.click(); A.fail('Failed to fetch'); A.click();
    if (A.E.t.textContent !== '예약을 승인할까요?' || A.E.d.textContent !== 'X 님' || A.E.bar.style.background !== '#3A2D22') bad.push('화면: 실패 뒤 다시 누르면 앞의 실패 글이 «처리 중» 아래 그대로 남는다 — ' + A.E.t.textContent + ' / ' + A.E.d.textContent); } }
{ // [MAIL_VIEWPORT] GAS 화면 넷은 viewport 를 addMetaTag 로(HTML 안 meta 는 무시된다 · 없으면 폰에서 데스크톱 폭으로 줄어 보인다)
  const vp = (label, fn) => { metas = []; try { fn(); } catch (e) { bad.push('화면 viewport · ' + label + ': 던졌다 — ' + e.message); return; } if (!metas.some((m) => /^viewport=width=device-width/.test(m))) bad.push('화면 viewport · ' + label + ': addMetaTag(viewport) 가 없다 — 폰에서 글자가 아주 작게 보인다'); };
  vp('확인 화면', () => G._mailConfirmPage_('t', 'd', 'go', { action: 'approve' }));
  if (metas.some((m) => /user-scalable=no|maximum-scale=1/.test(m))) bad.push('화면 viewport · 확인 화면: 입력칸이 없는데 확대를 막는다');
  vp('결과 화면', () => G.infoPage('t', 'b', true));
  if (metas.some((m) => /user-scalable=no|maximum-scale=1/.test(m))) bad.push('화면 viewport · 결과 화면: 입력칸이 없는데 확대를 막는다');
  const cr = mkRow(Object.assign({}, base, { '상태': '확정', '예약금': '' }));
  html = ''; vp('고객 취소 화면', () => { const keepW = G.withinCancelDeadline; G.withinCancelDeadline = () => true; try { G.serveCancelD('tok1', cr); } finally { G.withinCancelDeadline = keepW; } });
  // [MAIL_ZOOM_OK 2026-10-09 라운드 6] 취소 화면도 확대를 막지 않는다 — 칸 글자 16px 이면 폰이 저절로 확대하지 않는다 · [CANCEL_DATE_LINE] 380 아래 여백
  if (metas.some((m) => /user-scalable=no|maximum-scale=1/.test(m))) bad.push('화면 viewport · 고객 취소 화면: 확대를 막는다(손가락으로 키울 수 없다)');
  if (!/input\{[^}]*font-size:16px/.test(html)) bad.push('화면 · 고객 취소 화면: 입력칸 글자가 16px 아래라 폰이 칸을 누를 때 저절로 확대한다');
  if (!/@media \(max-width:380px\)\{\.box\{padding:42px 22px 34px\}\}/.test(html)) bad.push('화면 · 고객 취소 화면: 361~380 폭에서 날짜 · 시간이 두 줄로 갈린다(380 여백 없음)');
  html = ''; vp('관리자 취소 화면', () => G.serveAdminCancelD('tok1', mkRow(Object.assign({}, base, { '상태': '확정' }))));
  if (!/@media \(max-width:380px\)\{\.box\{padding:42px 22px 30px\}\}/.test(html)) bad.push('화면 · 관리자 취소 화면: 360 에서 날짜 · 시간이 두 줄로 갈린다(380 여백 없음)'); }
{
  const P = page('approve');
  if (P) {
    P.click();
    if (!P.sent() || P.E.go.disabled !== true) bad.push('화면: 단추를 눌렀는데 보내지 않거나 단추가 잠기지 않았다');
    P.ok({ ok: true, title: '승인 완료', body: '<img src=x onerror=alert(1)>A &lt;b&gt;<b>B</b><br>C<a href="https://x.example">L</a>' });
    const t = tags(P.E.d);
    if (t.includes('IMG') || t.some((x) => x !== 'B' && x !== 'BR')) bad.push('화면: 결과 글에서 줄바꿈 · 굵게 말고 다른 꺾쇠를 만들었다 — ' + t.join(','));
    if (!(t.includes('B') && t.includes('BR'))) bad.push('화면: 결과 글의 줄바꿈 · 굵게를 못 그렸다 — ' + t.join(','));
    if (!/A <b>/.test(P.E.d.textContent)) bad.push('화면: escape 된 글자(&lt;b&gt;)를 글자 그대로 보여 주지 않는다 — ' + P.E.d.textContent);
    if (P.E.go.style.visibility !== 'hidden' || P.E.go.style.display === 'none') bad.push('화면: 끝난 결과인데 단추 자리를 남긴 채 감추지 않았다(카드 높이가 바뀐다)');
  }
  const Q = page('approve');
  if (Q) {
    Q.click(); Q.ok({ ok: false, retry: true, title: '처리하지 못했어요', body: '잠시 후 다시 눌러 주세요. (코드 B9)' });
    if (Q.E.go.disabled !== false || Q.E.go.style.visibility !== 'visible' || Q.E.go.textContent !== '승인하기') bad.push('화면: 다시 누를 수 있는 실패(retry)인데 단추를 원래 이름으로 되살리지 않았다');
  }
  const Z = page('payconfirm');
  if (Z) { Z.click(); let zt = ''; try { Z.ok(undefined); } catch (e) { zt = ' · 던짐 ' + e.message; }
    if (zt || Z.E.t.textContent !== '결과를 받지 못했어요' || !/\(코드 P7\)/.test(Z.E.d.textContent) || Z.E.go.disabled !== false || Z.E.go.style.visibility !== 'visible') bad.push('화면: 빈 응답을 7 · 다시 누르기로 다루지 않는다(카드가 비거나 줄어든다)' + zt); }
  const cases = [['approve', 'NetworkError: Connection failure due to HTTP 0', 'B6', '연결이 끊겼어요'],
    ['approve', 'NetworkError: Connection failure due to HTTP 500', 'B7', '처리하지 못했어요'],
    ['approve', 'Exceeded maximum execution time', 'B5', '응답이 늦어요'],
    ['payconfirm', 'Failed to fetch', 'P6', '연결이 끊겼어요'],
    ['accept', 'Something else', 'B7', '처리하지 못했어요']];
  for (const [act, msg, code, title] of cases) {
    const R = page(act); if (!R) continue;
    R.click(); R.fail(msg);
    if (R.E.t.textContent !== title || !new RegExp('\\(코드 ' + code + '\\)').test(R.E.d.textContent)) bad.push(`화면: «${msg}» 가 ${code} · «${title}» 로 안 나온다 — ${R.E.t.textContent} / ${R.E.d.textContent}`);
    if (R.E.go.disabled !== false || R.E.go.style.visibility !== 'visible') bad.push(`화면: «${msg}» 뒤 단추를 되살리지 않았다`);
    if (act === 'accept' && /관리자 페이지/.test(R.E.d.textContent)) bad.push('화면: 고객 단추(수락) 실패 글에 «관리자 페이지»가 나온다');
  }
}
G.HtmlService = realHS;

// ── ④ [HTML_ESC_NAMES] 메일 단추 주소가 여는 화면 전체(확인 화면 설명 · 취소 카드 · 기한 지난 글 · 입금 확인) · 화면 B 의 서버 값 — 고객 글의 꺾쇠가 그대로 남지 않는다
{
  let out = ''; const tpl = {};
  const keepHS = G.HtmlService;
  G.HtmlService = { createHtmlOutput: (h) => { out = h; const o = { setTitle: () => o, setXFrameOptionsMode: () => o, addMetaTag: () => o }; return o; },
    createTemplateFromFile: () => Object.assign(tpl, { evaluate: () => { const o = { setTitle: () => o, setXFrameOptionsMode: () => o, addMetaTag: () => o }; return o; } }),
    XFrameOptionsMode: { ALLOWALL: 1 } };
  const keep = {}; for (const k of ['getSheet', 'buildHeaderIndex', 'findRowByToken', 'withinCancelDeadline', 'isExpired', 'getAvailability']) keep[k] = G[k];
  G.getSheet = () => ({}); G.buildHeaderIndex = () => ({}); G.isExpired = () => false; G.getAvailability = () => ({ avail: {}, full: {} });
  const ev = mkRow(Object.assign({}, base, { '상태': ST.CONFIRMED || '확정', '변경제안날짜': '2026-11-02', '변경제안시간': EVIL }));
  G.findRowByToken = () => ev;
  const page = (label, fn) => { out = ''; try { fn(); } catch (e) { bad.push('화면 ④ ' + label + ': 던졌다 — ' + (e && e.message)); return; }
    if (!out) bad.push('화면 ④ ' + label + ': 화면을 만들지 않았다');
    else if (/<img src=x onerror|<b>bride/.test(out)) bad.push('화면 ④ ' + label + ': 고객 글의 꺾쇠가 화면 HTML 에 그대로 남았다'); };
  page('승인 확인 화면', () => G.handleAction({ token: 'tok1', action: 'approve', sig: G.sign_('tok1', 'approve') }));
  page('수락 확인 화면', () => G.handleAction({ token: 'tok1', action: 'accept', sig: G.sign_('tok1', 'accept') }));
  G.withinCancelDeadline = () => true;
  page('고객 취소 화면', () => G.handleAction({ token: 'tok1', action: 'cancelreq', sig: G.sign_('tok1', 'cancelreq') }));
  G.withinCancelDeadline = () => false;
  page('취소 기한 지난 글', () => G.handleAction({ token: 'tok1', action: 'cancelreq', sig: G.sign_('tok1', 'cancelreq') }));
  page('관리자 취소 화면', () => G.handleAction({ token: 'tok1', action: 'admincancelreq', sig: G.sign_('tok1', 'admincancelreq') }));
  { const exp = String(Date.now() + 86400000), code = 'ME<IMG>1';
    page('입금 확인 화면', () => G.servePayConfirm({ code, m: 'mid', exp, sig: G.sign_(code.toUpperCase(), 'payconfirm:mid:' + exp) })); }
  // 화면 B 의 서버 값(스크립트 안 JSON) — 꺾쇠가 하나도 없어야 스크립트를 빠져나가지 못한다
  G.findRowByToken = () => mkRow(Object.assign({}, base, { '성함(신랑)': '</script><script>window.__x=1</script>', '상태': '시간선택완료' }));
  try { G.serveScheduleB('tok1'); } catch (e) { bad.push('화면 B: 던졌다 — ' + (e && e.message)); }
  if (typeof tpl.serverJson !== 'string') bad.push('화면 B: 서버 값(serverJson)을 만들지 않았다');
  else if (/</.test(tpl.serverJson)) bad.push('화면 B: 스크립트 안 서버 값에 꺾쇠가 남았다(</script> 로 빠져나갈 수 있다)');
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G.HtmlService = keepHS;
}

// ── ⑤ [LOCK_REREAD · MAIL_RETRY · ACCEPT_RESULT · BTN_AFTER_FAIL · BTN_FAIL_KIND] 단추 처리 행동
{
  const keep = {}; for (const k of ['LockService', 'SpreadsheetApp', 'CacheService', 'row', 'writeCell', 'sendConfirmEmail_', 'actApprove', 'actAccept', '_sessionToConsult', 'getSheet', 'buildHeaderIndex', 'findRowByPersonalCode', '_recordHandler', 'findRowByToken', '_adminConfirmMidCore', '_errRecord']) keep[k] = G[k];
  let writes = 0, mails = 0, flushed = false, flushBefore = null;
  const okLock = () => ({ waitLock() {}, tryLock: () => true, releaseLock() { flushBefore = flushed; }, hasLock: () => true });
  const badLock = () => ({ waitLock() { throw new Error('busy'); }, tryLock: () => false, releaseLock() {}, hasLock: () => false });
  const reset5 = () => { writes = 0; mails = 0; flushed = false; flushBefore = null; G._LAST_INFO = null; };
  G.writeCell = () => { writes++; }; G.sendConfirmEmail_ = () => { mails++; };
  G.SpreadsheetApp = { flush: () => { flushed = true; }, getActive: () => ({ getSheetByName: () => null }) };
  const proposed = mkRow(Object.assign({}, base, { '선택시간': '14:00', '성함(신랑)': '신랑', '성함(신부)': '신부', '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '2026-11-02', '변경제안시간': '15:00' }));
  const picked = mkRow(Object.assign({}, base, { '선택시간': '14:00', '성함(신랑)': '신랑', '성함(신부)': '신부', '상태': '시간선택완료' }));
  // 잠금을 못 잡으면 쓰지 않고 다시 누르게(retry)
  G.LockService = { getScriptLock: badLock }; G.row = () => null;
  reset5(); G.actAccept({}, {}, proposed); if (!(G._LAST_INFO && G._LAST_INFO.retry === true && G._LAST_INFO.ok === false) || writes) bad.push('단추 ⑤: 수락이 잠금을 못 잡았는데 쓰거나 · 다시 누르라는 표(retry)가 없다');
  reset5(); G.actApprove({}, {}, picked); if (!(G._LAST_INFO && G._LAST_INFO.retry === true && G._LAST_INFO.ok === false) || writes) bad.push('단추 ⑤: 승인이 잠금을 못 잡았는데 쓰거나 · 다시 누르라는 표(retry)가 없다');
  // 잠금 뒤 다시 읽기 — 그사이 확정된 예약이면 다시 확정 · 메일하지 않는다
  G.LockService = { getScriptLock: okLock };
  G.row = () => mkRow(Object.assign({}, base, { '선택시간': '14:00', '성함(신랑)': '신랑', '성함(신부)': '신부', '상태': ST.CONFIRMED || '확정', '변경제안날짜': '', '변경제안시간': '' }));
  reset5(); G.actAccept({}, {}, proposed); if (!(G._LAST_INFO && /이미 확정/.test(G._LAST_INFO.title)) || mails || writes) bad.push('단추 ⑤: 수락이 잠금 뒤 다시 읽지 않는다(그사이 확정된 예약을 또 확정 · 메일)');
  G.row = () => mkRow(Object.assign({}, base, { '선택시간': '14:00', '성함(신랑)': '신랑', '성함(신부)': '신부', '상태': ST.APPROVED || '승인완료' }));
  reset5(); G.actApprove({}, {}, picked); if (!(G._LAST_INFO && /이미 확정/.test(G._LAST_INFO.title)) || mails) bad.push('단추 ⑤: 승인이 잠금 뒤 다시 읽지 않는다(그사이 승인된 예약에 또 메일)');
  // 잠금을 풀기 전에 쓰기를 내보낸다(flush)
  G.row = () => null;
  reset5(); G.actApprove({}, {}, picked); if (flushBefore !== true) bad.push('단추 ⑤: 승인이 잠금을 풀기 전에 쓰기를 내보내지 않는다(flush)');
  reset5(); G.actAccept({}, {}, proposed); if (flushBefore !== true) bad.push('단추 ⑤: 수락이 잠금을 풀기 전에 쓰기를 내보내지 않는다(flush)');
  // 수락 · 승인을 부르는 곳 — 실패를 성공으로 돌려주지 않는다
  G.LockService = { getScriptLock: badLock };
  G.getSheet = () => ({}); G.buildHeaderIndex = () => ({}); G.row = () => proposed;
  G._sessionToConsult = () => ({ ok: true, consult: { num: 2 } });
  reset5(); { const r = G.handleAcceptProposal({ token: 't' }); if (!(r && r.ok === false && /잠시 후/.test(r.error || ''))) bad.push('단추 ⑤: 마이페이지 수락이 잠금 실패를 성공으로 돌려준다 — ' + JSON.stringify(r)); }
  let recs = 0; G._recordHandler = () => { recs++; }; G.findRowByPersonalCode = () => ({ num: 2 });
  G._AUTHED = true;
  reset5(); { const r = G.adminAcceptProposal('ME0001'); if (!(r && r.ok === false) || recs) bad.push('단추 ⑤: 관리 화면 수락이 실패를 성공으로 돌려주거나 처리이력에 «수락»을 남긴다'); }
  G.row = () => picked;
  reset5(); { const r = G.adminApprove('ME0001'); if (!(r && r.ok === false && !r.slotTaken && /잠시 후/.test(r.error || ''))) bad.push('단추 ⑤: 관리 화면 승인이 몰림을 «마감»으로 말한다 — ' + JSON.stringify(r)); }
  G._AUTHED = false;
  // [APPROVE_PARTIAL] 상태를 쓴 뒤 한 단계가 실패해도 나머지(확정 메일)는 끝까지 · 결과는 «일부 안 됨»(다시 누르기 아님)
  { const keepSC = G.syncCalendarEvent; G.syncCalendarEvent = () => { throw new Error('cal down'); };
    G.LockService = { getScriptLock: okLock }; G.row = () => picked;
    reset5(); try { G.actApprove({}, {}, picked); } catch (e) { G._LAST_INFO = { title: '던짐 ' + e.message }; }
    if (!(mails === 1 && G._LAST_INFO && G._LAST_INFO.ok === false && !G._LAST_INFO.retry && /빠진 것이 있어요/.test(G._LAST_INFO.title) && /캘린더/.test(G._LAST_INFO.body))) bad.push('단추 ⑤: 승인 뒤 캘린더가 실패하면 확정 메일까지 멈추거나 «일부 안 됨»으로 안 나온다 — ' + JSON.stringify(G._LAST_INFO));
    G.row = () => proposed;
    reset5(); try { G.actAccept({}, {}, proposed); } catch (e) { G._LAST_INFO = { title: '던짐 ' + e.message }; }
    if (!(mails === 1 && G._LAST_INFO && G._LAST_INFO.ok === true && Array.isArray(G._LAST_INFO.partial))) bad.push('단추 ⑤: 수락 뒤 캘린더가 실패하면 확정 메일까지 멈추거나 고객 결과가 실패로 나온다');
    G.row = () => picked; G._AUTHED = true; let recs2 = 0; G._recordHandler = () => { recs2++; };
    reset5(); { let r; try { r = G.adminApprove('ME0001'); } catch (e) { r = { threw: e.message }; } if (!(r && r.ok === false && r.partial && /승인은 됐어요/.test(r.error || '') && recs2 === 1)) bad.push('단추 ⑤: 관리 화면 승인이 일부 실패를 알리지 않거나 처리이력을 안 남긴다 — ' + JSON.stringify(r)); }
    G.row = () => proposed; recs2 = 0;
    reset5(); { let r; try { r = G.adminAcceptProposal('ME0001'); } catch (e) { r = { threw: e.message }; } if (!(r && r.ok === false && r.partial && /수락은 됐어요/.test(r.error || '') && recs2 === 1)) bad.push('단추 ⑤: 관리 화면 수락이 일부 실패를 알리지 않거나 처리이력을 안 남긴다 — ' + JSON.stringify(r)); }
    G._AUTHED = false; G.syncCalendarEvent = keepSC; }
  // 앞선 예상 못 한 오류 뒤의 «이미» 결과에는 확인 안내 한 줄(한 번만) · 붙여넣기 누락은 3(다시 누르게 하지 않음)
  const cm = new Map(); G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k), removeAll: () => cm.clear() }) };
  G.LockService = { getScriptLock: okLock }; G._errRecord = () => {};
  G.findRowByToken = () => picked; G._SRV = false;
  const tok = 'tok1', aSig = G.sign_(tok, 'approve');
  G.actApprove = () => { throw new Error('svc boom'); };
  const f1 = G.mailButtonGo({ action: 'approve', token: tok, sig: aSig });
  G.actApprove = () => G.infoPage('이미 확정된 예약입니다', '신랑 · 신부 님<br>(메일·캘린더는 다시 보내지 않았습니다.)', true);
  const f2 = G.mailButtonGo({ action: 'approve', token: tok, sig: aSig });
  const f3 = G.mailButtonGo({ action: 'approve', token: tok, sig: aSig });
  if (!(f1 && f1.retry && /코드 B9/.test(f1.body || ''))) bad.push('단추 ⑤: 예상 못 한 오류가 B9 · 다시 누르기로 안 나온다');
  if (!(f2 && /앞서 오류가 있었어요/.test(f2.body || ''))) bad.push('단추 ⑤: 앞선 오류 뒤 «이미» 결과에 확인 안내가 없다(근거 없는 «처리됨»)');
  if (f2 && /다시 보내지 않았습니다/.test(f2.body || '')) bad.push('단추 ⑤: 앞선 오류 뒤 «이미» 결과가 «다시 보내지 않았습니다»와 «확인해 주세요»를 함께 말한다(카드가 커진다)');
  if (f3 && /앞서 오류가 있었어요/.test(f3.body || '')) bad.push('단추 ⑤: 확인 안내가 한 번으로 끝나지 않는다');
  G.actApprove = () => { throw new ReferenceError('_foo is not defined'); };
  const f4 = G.mailButtonGo({ action: 'approve', token: tok, sig: aSig });
  if (!(f4 && /코드 B3/.test(f4.body || '') && !f4.retry)) bad.push('단추 ⑤: 붙여넣기 · 배포 누락(is not defined)이 3 으로 안 나오거나 다시 누르라고 한다 — ' + JSON.stringify(f4));
  { const exp = String(Date.now() + 86400000), sig = G.sign_('ME0001', 'payconfirm:mid:' + exp);
    G._adminConfirmMidCore = () => { throw new Error('svc boom'); };
    const p1 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
    G._adminConfirmMidCore = () => ({ ok: true, already: true });
    const p2 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
    if (!(p1 && /코드 P9/.test(p1.body || ''))) bad.push('단추 ⑤: 입금 확인의 예상 못 한 오류가 P9 로 안 나온다');
    if (!(p2 && /앞서 오류가 있었어요/.test(p2.body || '') && !/추가로 할 일이 없어요/.test(p2.body || ''))) bad.push('단추 ⑤: 입금 확인이 앞선 오류 뒤 «추가로 할 일이 없어요»라고 장담한다');
    if (flushBefore !== true) bad.push('단추 ⑤: 입금 확인이 잠금을 풀기 전에 쓰기를 내보내지 않는다(flush)'); }
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G._SRV = true; G._AUTHED = false;
}

// ── ⑥ [라운드 4] ENTRY_ARGS_SRV · BTN_FAIL_KIND(수락 글 · 데이터 오류는 9) · NOTICE_PER_WHO · APPROVE_PARTIAL(누름마다 알림 한 통 · 처리이력) ·
//      BTN_AFTER_FAIL(새로 끝까지 했으면 말하지 않음) · PAY_NOTICE_TRUE · LOCK_REREAD(남의 줄에 쓰지 않음) · BTN_STATE_FIRST · ACCEPT_RESULT(몰림 글 한 번 · 코드)
{
  const crypto = await import('node:crypto');
  const keep = {}; for (const k of ['LockService', 'SpreadsheetApp', 'CacheService', 'row', 'writeCell', 'sendConfirmEmail_', 'actApprove', 'actAccept', 'findRowByToken', 'syncCalendarEvent', 'notifyStudio', 'findCustomerByCode', 'getCustomersSheet', 'touchCustomer', 'buildHeaderIndex', 'getSheet', '_errRecord', '_adminConfirmMidCore', '_confirmDepositCore', '_sessionToConsult', '_nfAdminLineEmail', 'Utilities', 'PropertiesService', 'makeToken', 'parseDetail', '_IN_POST', '_LAST_INFO']) keep[k] = G[k];
  const cm = new Map(); G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k), removeAll: () => cm.clear() }) };
  const okLock = () => ({ waitLock() {}, tryLock: () => true, releaseLock() {}, hasLock: () => true });
  const badLock = () => ({ waitLock() { throw new Error('busy'); }, tryLock: () => false, releaseLock() {}, hasLock: () => false });
  G.LockService = { getScriptLock: okLock }; G.SpreadsheetApp = { flush() {}, getActive: () => ({ getSheetByName: () => null }) };
  let writes = 0, mails = 0; const wrote = {}, notices = [], hist = [], lines = [];
  G.writeCell = (sh, co, rn, h, v) => { writes++; wrote[h] = v; }; G.sendConfirmEmail_ = () => { mails++; };
  G.notifyStudio = (sub, body) => { notices.push(String(sub) + ' | ' + String(body)); };
  G.findCustomerByCode = (c) => (c ? { num: 3, get: () => '' } : null);
  G.getCustomersSheet = () => ({}); G.buildHeaderIndex = () => ({}); G.getSheet = () => ({ getLastRow: () => 5 });
  G.touchCustomer = (sh, co, n, upd) => { if (upd && upd['처리이력']) hist.push(String(upd['처리이력'])); };
  G._nfAdminLineEmail = (t) => { lines.push(String(t)); };
  const R6 = (f) => mkRow(Object.assign({}, base, { '성함(신랑)': '신랑', '성함(신부)': '신부', '선택시간': '14:00', '개인코드': 'ME0001' }, f));
  const reset6 = () => { writes = 0; mails = 0; notices.length = 0; hist.length = 0; lines.length = 0; for (const k of Object.keys(wrote)) delete wrote[k]; G._LAST_INFO = null; };
  // APPROVE_PARTIAL — 캘린더 · 확정 메일이 함께 실패해도 관리자 알림은 한 통(받는 곳 · 오류 포함) · 고객 처리이력 한 줄
  G.syncCalendarEvent = () => { throw new Error('cal down'); };
  G.sendConfirmEmail_ = () => { mails++; throw new Error('mail down'); };
  const pk = R6({ '상태': '시간선택완료' }); G.row = () => pk;
  reset6(); try { G.actApprove({}, {}, pk); } catch (e) { bad.push('⑥ 승인 일부 실패: 던졌다 — ' + e.message); }
  if (notices.length !== 1 || !/안 된 것: 캘린더, 확정 메일/.test(notices[0] || '') || !/확정 메일 받는 곳/.test(notices[0] || '')) bad.push('⑥ 승인 일부 실패: 관리자 알림이 한 통(빠진 것 · 받는 곳 · 오류)이 아니다 — ' + notices.length + '통');
  if (!hist.some((h) => /승인 · 안 된 것: 캘린더, 확정 메일 \(코드 B4\)/.test(h))) bad.push('⑥ 승인 일부 실패: 고객 처리이력에 «안 된 것»이 남지 않는다');
  const pp = R6({ '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '2026-11-02', '변경제안시간': '15:00' }); G.row = () => pp;
  reset6(); try { G.actAccept({}, {}, pp); } catch (e) { bad.push('⑥ 수락 일부 실패: 던졌다 — ' + e.message); }
  if (notices.length !== 1 || !/직접 연락해 주세요/.test(notices[0] || '')) bad.push('⑥ 수락 일부 실패: 관리자 알림이 한 통이 아니거나 «연락드릴게요» 약속을 알리지 않는다 — ' + notices.length + '통');
  if (!hist.some((h) => /변경 수락\(고객\) · 안 된 것/.test(h))) bad.push('⑥ 수락 일부 실패: 고객 처리이력에 «변경 수락(고객) · 안 된 것»이 없다');
  G.sendConfirmEmail_ = () => { mails++; }; G.syncCalendarEvent = keep.syncCalendarEvent;
  // 예약금 알림 — 고객을 못 읽어도 보낸다
  G.findCustomerByCode = () => { throw new Error('sheet busy'); };
  reset6(); G.row = () => pp; try { G.actAccept({}, {}, pp); } catch (e) {}
  if (!lines.some((t) => /예약금 입금확인 비어 있음/.test(t))) bad.push('⑥ 수락: 고객을 못 읽으면 예약금 입금확인 알림이 빠진다');
  G.findCustomerByCode = (c) => (c ? { num: 3, get: () => '' } : null);
  // LOCK_REREAD — 잠금 뒤 그 줄이 다른 예약이 됐고 토큰으로도 못 찾으면 쓰지 않는다
  G.row = () => R6({ '상태': '시간선택완료', '토큰': 'other' }); G.findRowByToken = () => null;
  reset6(); G.actApprove({}, {}, R6({ '상태': '시간선택완료', '토큰': 'tok1' }));
  if (!(G._LAST_INFO && G._LAST_INFO.title === '예약을 찾을 수 없습니다' && writes === 0 && mails === 0)) bad.push('⑥ 다시 읽기: 줄이 바뀐 예약에 승인을 쓴다 — writes ' + writes + ' · ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.title));
  G.findRowByToken = keep.findRowByToken;
  // NOTICE_PER_WHO — 같은 제목이라도 다른 사람의 실패는 따로 · 같은 사람은 한 번
  { // 진짜 notifyStudio 는 맨 위에서 흉내로 바꿔 두었다 — 새 샌드박스에서 잰다(CONFIG.SEND_ADMIN_MAIL 은 코드에서 false)
    const { sandbox: H } = loadGas(makeSandbox()); const ln = [], hc = new Map(); H._SRV = true;
    H.CacheService = { getScriptCache: () => ({ get: (k) => (hc.has(k) ? hc.get(k) : null), put: (k, v) => hc.set(k, String(v)), remove: (k) => hc.delete(k) }) };
    H._nfAdminLineEmail = (t) => { ln.push(String(t)); };
    H.Utilities = Object.assign({}, H.Utilities, { computeDigest: (a, t) => Array.from(crypto.createHash('md5').update(String(t)).digest()), base64EncodeWebSafe: (b) => Buffer.from(b.map((x) => x & 255)).toString('base64url'), formatDate: () => '2026-10-09', DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' } });
    H.notifyStudio('[상담] ⚠️오류 · 캘린더 일정 생성 실패', '가 · 나 · 2026-11-01 14:00\nerr');
    H.notifyStudio('[상담] ⚠️오류 · 캘린더 일정 생성 실패', '다 · 라 · 2026-11-02 15:00\nerr');
    H.notifyStudio('[상담] ⚠️오류 · 캘린더 일정 생성 실패', '가 · 나 · 2026-11-01 14:00\nerr');
    if (ln.length !== 2) bad.push('⑥ 관리자 알림: 같은 제목 · 다른 고객의 실패가 묻히거나 같은 고객이 두 번 간다 — ' + ln.length + '통(2 여야)');
    const HP = H.PropertiesService.getScriptProperties(); HP.deleteProperty('NS_OVERFLOW');
    for (let i = 0; i < 8; i++) H.notifyStudio('[플랫폼] ⚠️오류 · 신청 접수 메일 발송 실패', (i === 7 ? '<b>x</b>' : '이름' + i) + ' · x\nerr');
    // [NOTICE_OVERFLOW 라운드 6] 다섯 통 + «멈춰요» 한 통 · 그 뒤는 메일 대신 아침 보고에 모은다(같은 제목의 진짜 실패가 조용히 사라지지 않게)
    if (ln.length !== 2 + 6 || !/아침 보고에 모아 드려요 \/ 같은 알림 메일은 여기서 멈춰요$/.test(ln[ln.length - 1] || '')) bad.push('⑥ 관리자 알림: 같은 제목이 한 시간에 여섯 통을 넘거나 «멈춰요» 한 통이 없다 — ' + (ln.length - 2) + '통');
    let ov = null; try { ov = JSON.parse(HP.getProperty('NS_OVERFLOW') || 'null'); } catch (e) {}
    if (!(ov && Array.isArray(ov.a) && ov.a.length === 2 && /이름6/.test(ov.a[0][2]))) bad.push('⑥ 관리자 알림: 상한을 넘은 실패가 아침 보고 모음에 안 들어간다(조용히 사라진다) — ' + JSON.stringify(ov));
    const mh = []; H._nfAdminEmail = (sj, h) => { mh.push(String(h)); return true; };
    for (const f of ['aiDailyDigest', 'aiDailySafetyCheck', 'aiHandoffNightTake', 'notifyFailYesterday', '_solapiBalance', 'morningBriefData_', 'monthBusinessData_', 'aiCostSummary24h_']) H[f] = () => null;
    H.aiHandoffStatus = () => ({ pending: 0, overdue: 0 });
    try { H.aiMorningReport(false); } catch (e) { bad.push('⑥ 아침 보고: 던졌다 — ' + e.message); }
    const mhtml = mh[0] || '';
    if (!(/메일로 못 보낸 실패 알림 \(2건\)/.test(mhtml) && /이름6/.test(mhtml))) bad.push('⑥ 아침 보고: 메일로 못 보낸 실패 알림을 싣지 않는다 — ' + mhtml.slice(0, 160));
    // [MORNING_ESC] 고객 글(이름 · 질문)은 글로만 — 메일 HTML 로 들어가지 않는다
    if (!/&lt;b&gt;x&lt;\/b&gt;/.test(mhtml) || /<b>x<\/b>/.test(mhtml)) bad.push('⑥ 아침 보고: 고객 글이 escape 없이 메일 HTML 로 들어간다');
    if (HP.getProperty('NS_OVERFLOW')) bad.push('⑥ 아침 보고: 읽은 모음을 지우지 않는다(다음 날 또 나온다)');
    // [MAIL_SENT_TRUE 라운드 7] 메일이 못 나가면 모음을 지우지 않는다 · 보내는 사이 새로 쌓인 줄은 남긴다
    HP.setProperty('NS_OVERFLOW', JSON.stringify({ a: [['10-09 09:00', '제목', '가']] })); H._nfAdminEmail = () => false;
    try { H.aiMorningReport(false); } catch (e) {}
    if (!HP.getProperty('NS_OVERFLOW')) bad.push('⑥ 아침 보고: 메일이 못 나갔는데 모음을 지운다(그 줄들이 사라진다)');
    H._nfAdminEmail = () => { HP.setProperty('NS_OVERFLOW', JSON.stringify({ a: [['10-09 09:00', '제목', '가'], ['10-09 09:01', '제목', '새 줄']] })); return true; };
    try { H.aiMorningReport(false); } catch (e) {}
    let rest = null; try { rest = JSON.parse(HP.getProperty('NS_OVERFLOW') || 'null'); } catch (e) {}
    if (!(rest && rest.a && rest.a.length === 1 && rest.a[0][2] === '새 줄')) bad.push('⑥ 아침 보고: 보내는 사이 새로 쌓인 줄까지 지운다 — ' + JSON.stringify(rest));
    // [라운드 8] 옛 95_notify(아무것도 돌려주지 않음)면 종전처럼 지운다 — 붙여넣는 사이 같은 줄이 매일 다시 나오지 않게
    HP.setProperty('NS_OVERFLOW', JSON.stringify({ a: [['10-09 09:00', '제목', '옛']] })); H._nfAdminEmail = () => undefined;
    try { H.aiMorningReport(false); } catch (e) {}
    if (HP.getProperty('NS_OVERFLOW')) bad.push('⑥ 아침 보고: 옛 95_notify 와 붙여 쓰는 동안 같은 넘침 줄이 매일 다시 나온다');
    // 20줄이 차면 «더 있었다» 표시 한 번 · 딱 20건이면 «넘음»이라 하지 않는다
    HP.deleteProperty('NS_OVERFLOW'); for (let i = 0; i < 20; i++) H._nsOverflow_('제목', '사람' + i);
    let o20 = null; try { o20 = JSON.parse(HP.getProperty('NS_OVERFLOW') || 'null'); } catch (e) {}
    mh.length = 0; H._nfAdminEmail = (sj, h) => { mh.push(String(h)); return true; }; try { H.aiMorningReport(true); } catch (e) {}
    const t20 = mh[0] || '';
    H._nsOverflow_('제목', '사람20'); H._nsOverflow_('제목', '사람21');
    let o22 = null; try { o22 = JSON.parse(HP.getProperty('NS_OVERFLOW') || 'null'); } catch (e) {}
    mh.length = 0; try { H.aiMorningReport(false); } catch (e) {}
    const t22 = mh[0] || '';
    if (!(o20 && o20.a.length === 20 && !o20.more && /\(20건\)/.test(t20) && !/넘음/.test(t20) && o22 && o22.a.length === 20 && o22.more === true && /20건 넘음/.test(t22))) bad.push('⑥ 아침 보고: 딱 20건을 «넘음»이라 하거나 넘친 것을 표시하지 않는다');
    HP.deleteProperty('NS_OVERFLOW');
    // [NOTICE_HEAD_FIRST 라운드 7] 알림 한 줄은 «제목: 본문» · 줄바꿈은 « · » — 메일 제목 칸(20px)은 «:» 앞 알림 제목
    if (!/^\[상담\] 오류 · 캘린더 일정 생성 실패: 가 · 나 · 2026-11-01 14:00 · err$/.test(ln[0] || '')) bad.push('⑥ 관리자 알림: 한 줄 모양이 «제목: 본문»이 아니다(메일 제목 칸이 시각 «14» 에서 잘린다) — ' + (ln[0] || ''));
    { const { sandbox: J } = loadGas(makeSandbox()); J._SRV = true; const jc = new Map(); let hd = null;
      J.CacheService = { getScriptCache: () => ({ get: (k) => (jc.has(k) ? jc.get(k) : null), put: (k, v) => jc.set(k, String(v)), remove: (k) => jc.delete(k) }) };
      J._nfAdminEmail = (sj, inner, o) => { hd = o && o.head; return true; };
      J.notifyStudio('[상담] 승인 뒤 일부 실패', '가 · 나 님 · 2026-11-01 14:00\n안 된 것: 캘린더\n승인은 처리됐습니다 · 이것만 직접 해 주세요.');
      if (hd !== '승인 뒤 일부 실패') bad.push('⑥ 관리자 알림: 메일 제목 칸이 알림 제목이 아니다 — ' + JSON.stringify(hd));
      // [MAIL_SENT_TRUE 라운드 7] 진짜 _nfAdminEmail 은 보냈으면 true · 못 보냈으면 false(아침 보고가 그것을 보고 모음을 지운다)
      const { sandbox: K } = loadGas(makeSandbox()); K._SRV = true;
      K.GmailApp = { sendEmail: () => {} }; const s1 = K._nfAdminEmail('t', 'b', { raw: true });
      K.GmailApp = { sendEmail: () => { throw new Error('Service invoked too many times'); } }; const s2 = K._nfAdminEmail('t', 'b', { raw: true });
      if (s1 !== true || s2 !== false) bad.push('⑥ 관리자 메일: 보냈는지를 돌려주지 않는다(못 보낸 날도 아침 보고 모음이 지워진다) — ' + s1 + ' / ' + s2);
      // [NOTICE_ALL_CAP 라운드 8] «오류 · 실패»는 제목 첫 토막만 본다(고객 이름이 든 신규 신청 제목은 실패 알림이 아니다) · 제목과 상관없이 시간당 스무 통
      const { sandbox: Q } = loadGas(makeSandbox()); Q._SRV = true; const qc = new Map(), ql = [];
      Q.CacheService = { getScriptCache: () => ({ get: (k) => (qc.has(k) ? qc.get(k) : null), put: (k, v) => qc.set(k, String(v)), remove: (k) => qc.delete(k) }) };
      Q._nfAdminLineEmail = (t) => { ql.push(String(t)); };
      const QP = Q.PropertiesService.getScriptProperties(); QP.deleteProperty('NS_OVERFLOW');
      Q.notifyStudio('[플랫폼] 신규 신청 · 오류님·실패님 (시그니처)', '개인코드: ME0001');
      const nameMail = ql.length;
      for (let i = 0; i < 25; i++) Q.notifyStudio('[상담] ⚠️오류 · 시험 ' + i, '사람' + i + ' · x\nerr');
      let qo = null; try { qo = JSON.parse(QP.getProperty('NS_OVERFLOW') || 'null'); } catch (e) {}
      if (nameMail !== 0) bad.push('⑥ 관리자 알림: 고객 이름에 «오류 · 실패»가 들면 신규 신청마다 실패 알림 메일이 간다');
      if (!(ql.length === 21 && /실패 알림 메일은 여기서 멈춰요$/.test(ql[20] || '') && qo && qo.a && qo.a.length === 4)) bad.push('⑥ 관리자 알림: 제목이 다 달라도 한 시간에 스무 통 + «멈춰요» 한 통 · 나머지는 모음이 아니다 — ' + ql.length + '통 · 모음 ' + (qo && qo.a ? qo.a.length : 0));
      QP.deleteProperty('NS_OVERFLOW'); }
    // [MAIL_SENT_TRUE 라운드 7] 밤사이 인계 수도 메일이 나간 뒤에 센 만큼만 뺀다(못 보내면 남는다 · 그사이 생긴 것은 남긴다)
    HP.setProperty('AI_HANDOFF_NIGHT_PENDING', '3'); H.aiHandoffNightTake = () => { throw new Error('부르면 안 된다(보내기 전에 지운다)'); };
    H._nfAdminEmail = () => false; try { H.aiMorningReport(false); } catch (e) {}
    const n1 = HP.getProperty('AI_HANDOFF_NIGHT_PENDING');
    H._nfAdminEmail = () => { HP.setProperty('AI_HANDOFF_NIGHT_PENDING', '4'); return true; }; try { H.aiMorningReport(false); } catch (e) {}
    const n2 = HP.getProperty('AI_HANDOFF_NIGHT_PENDING');
    if (n1 !== '3' || n2 !== '1') bad.push('⑥ 아침 보고: 밤사이 인계 수를 보내기 전에 지우거나 그사이 생긴 것까지 지운다 — ' + n1 + ' / ' + n2);
    HP.deleteProperty('AI_HANDOFF_NIGHT_PENDING'); }
  // BTN_FAIL_KIND — 고객 단추(수락)의 3 에는 «관리자 페이지»가 없다 · 데이터 오류(x.y is not a function)는 9 · 다시 누르기
  const tok = 'tok1'; G.findRowByToken = () => pk; G._SRV = false; G._errRecord = () => {};
  G.actAccept = () => { throw new ReferenceError('getSheet is not defined'); };
  { const r = G.mailButtonGo({ action: 'accept', token: tok, sig: G.sign_(tok, 'accept') });
    if (!(r && /코드 B3/.test(r.body || '') && /contact@momentedit\.kr/.test(r.body || '') && !/관리자 페이지/.test(r.body || '') && !r.retry)) bad.push('⑥ 수락 단추: 붙여넣기 누락(3)에 고객 글이 아니다 — ' + JSON.stringify(r)); }
  G.actApprove = () => { throw new TypeError('row.get is not a function'); };
  { const r = G.mailButtonGo({ action: 'approve', token: tok, sig: G.sign_(tok, 'approve') });
    if (!(r && /코드 B9/.test(r.body || '') && r.retry)) bad.push('⑥ 승인 단추: 데이터 오류(x.y is not a function)를 붙여넣기 누락(3)으로 가른다 — ' + JSON.stringify(r)); }
  // BTN_AFTER_FAIL — 앞선 오류 뒤 «새로 끝까지» 한 결과에는 말하지 않고 표만 지운다
  G.actApprove = () => G.infoPage('승인 완료', '신랑 · 신부 님께 예약 확정 메일을 보냈습니다.', true);
  { const r1 = G.mailButtonGo({ action: 'approve', token: tok, sig: G.sign_(tok, 'approve') });
    G.actApprove = () => G.infoPage('이미 확정된 예약입니다', '신랑 · 신부 님<br>(메일·캘린더는 다시 보내지 않았습니다.)', true);
    const r2 = G.mailButtonGo({ action: 'approve', token: tok, sig: G.sign_(tok, 'approve') });
    if (r1 && /앞서 오류가 있었어요/.test(r1.body || '')) bad.push('⑥ 승인 단추: 앞선 오류 뒤 새로 끝까지 한 결과에 «확인해 주세요»가 붙는다(서로 어긋난 글)');
    if (r2 && /앞서 오류가 있었어요/.test(r2.body || '')) bad.push('⑥ 승인 단추: 새로 끝까지 한 뒤에도 앞선 오류 표가 남아 다음 «이미»에 붙는다'); }
  // PAY_NOTICE_TRUE — 중도금 확인은 «고객 알림이 따로 가지 않아요» · 계약금 확인은 «카톡 알림이 자동으로 가요»
  { const exp = String(Date.now() + 86400000);
    G.findCustomerByCode = keep.findCustomerByCode; G._adminConfirmMidCore = () => ({ ok: true });
    const m1 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig: G.sign_('ME0001', 'payconfirm:mid:' + exp) });
    if (!(m1 && m1.ok && /고객 알림이 따로 가지 않아요/.test(m1.body || '') && !/카톡 알림이 자동/.test(m1.body || ''))) bad.push('⑥ 입금 확인: 중도금 확인 결과가 «고객에게 안내가 나갔다»고 한다 — ' + JSON.stringify(m1));
    G._confirmDepositCore = () => ({ ok: true });
    const d1 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'deposit', exp, sig: G.sign_('ME0001', 'payconfirm:deposit:' + exp) });
    if (!(d1 && d1.ok && /카톡 알림이 자동으로 가요/.test(d1.body || ''))) bad.push('⑥ 입금 확인: 계약금 확인 결과에 고객 알림 안내가 없다 — ' + JSON.stringify(d1)); }
  // BTN_STATE_FIRST — 이미 끝났거나 취소된 예약의 승인 · 수락 링크는 단추 대신 지금 상태
  { const st = (row, action) => { G.findRowByToken = () => row; G._LAST_INFO = null; try { G.handleAction({ token: tok, action, sig: G.sign_(tok, action) }); } catch (e) { return '던짐 ' + e.message; } return G._LAST_INFO ? G._LAST_INFO.title : '(단추 화면)'; };
    const want = [[R6({ '상태': ST.APPROVED || '승인완료' }), 'approve', '이미 확정된 예약입니다'], [R6({ '상태': ST.CONFIRMED || '확정' }), 'accept', '이미 확정된 예약입니다'],
      [R6({ '상태': '시간선택완료' }), 'accept', '처리할 제안이 없습니다'], [R6({ '상태': ST.CANCELLED || '취소' }), 'approve', '이미 취소된 예약입니다'], [R6({ '상태': ST.CANCELLED || '취소' }), 'accept', '이미 취소된 예약입니다'], [R6({ '상태': '시간선택완료' }), 'approve', '(단추 화면)'],
      [R6({ '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '2026-11-02', '변경제안시간': '15:00' }), 'accept', '(단추 화면)'],
      [R6({ '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '', '변경제안시간': '' }), 'accept', '제안된 시간이 없습니다']];
    for (const [row, action, title] of want) { const got = st(row, action); if (got !== title) bad.push(`⑥ 링크 열기: ${action} · ${row.get('상태')} → «${got}»(«${title}» 이어야)`); }
    { const hs = G.HtmlService; G.HtmlService = { createHtmlOutput: (h) => { html = h; const o = { setTitle: () => o, setXFrameOptionsMode: () => o, addMetaTag: () => o }; return o; }, XFrameOptionsMode: { ALLOWALL: 1 } };
      html = ''; st(R6({ '상태': '시간선택완료' }), 'approve'); G.HtmlService = hs; }
    if (!/신부 님<br>/.test(html)) bad.push('⑥ 링크 열기: 이름 · 날짜가 한 줄에 «·»로 이어져 줄 끝에 «·»가 매달린다(님<br>날짜)'); }
  // ACCEPT_RESULT — 마이페이지 수락이 몰림이면 «잠시 후 다시» 한 번 · 기록 코드 = 고객이 보는 코드(B1)
  { G.LockService = { getScriptLock: badLock }; G._sessionToConsult = () => ({ ok: true, consult: { num: 2 } }); G.row = () => pp; G.actAccept = keep.actAccept;
    const r = G.handleAcceptProposal({ token: 't' });
    if (!(r && r.ok === false && (String(r.error).match(/잠시 후 다시/g) || []).length === 1 && r.ecode === 'B1')) bad.push('⑥ 마이페이지 수락: 몰림 글이 «잠시 후 다시»를 두 번 말하거나 기록 코드가 B1 이 아니다 — ' + JSON.stringify(r));
    G.LockService = { getScriptLock: okLock }; }
  // ACCEPT_SLOT_NOTICE — 고객이 누른 수락이 마감에 걸리면 스튜디오에 알린다(«다시 제안드릴게요»를 받친다) · 관리 화면에서 누른 것은 그 화면이 말한다(알림 없음 · 관리자 말)
  { G._slotTaken = () => true; G.LockService = { getScriptLock: okLock }; G.row = () => pp; G.actAccept = keep.actAccept;
    reset6(); G._CURRENT_ADMIN = ''; G.actAccept({}, {}, pp);
    if (!(G._LAST_INFO && /마감/.test(G._LAST_INFO.title) && notices.some((n) => /변경 수락 실패 · 제안 시간 마감/.test(n)))) bad.push('⑥ 수락 마감: 고객에게 «다시 제안드릴게요»라고 하는데 스튜디오 알림이 없다 — ' + notices.length);
    reset6(); G._CURRENT_ADMIN = '관리자'; G.findRowByPersonalCode = () => ({ num: 2 }); G._AUTHED = true;
    let r; try { r = G.adminAcceptProposal('ME0001'); } catch (e) { r = { threw: e.message }; }
    if (!(r && r.slotTaken && /변경 제안을 다시 보내 주세요/.test(r.error || '') && !notices.length)) bad.push('⑥ 관리 화면 수락 마감: 관리자 말(변경 제안 다시)이 아니거나 스스로에게 알림을 보낸다 — ' + JSON.stringify(r));
    G._CURRENT_ADMIN = ''; G._AUTHED = false; G._slotTaken = () => false; G.findRowByPersonalCode = keep.findRowByPersonalCode; }
  // 수락 결과는 사실 한 번(«바뀐 일정으로 확정됐어요») · 메일이 못 갔으면 «보내지 못했어요»(다시 보내는 장치가 없으니 «늦어질 수 있어요» 아님)
  { G.row = () => pp; G.sendConfirmEmail_ = () => { throw new Error('mail down'); }; reset6(); G.actAccept({}, {}, pp);
    if (!(G._LAST_INFO && G._LAST_INFO.title === '바뀐 일정으로 확정됐어요' && /확정 메일을 보내지 못했어요 · 스튜디오에서 따로 연락드릴게요/.test(G._LAST_INFO.body))) bad.push('⑥ 수락 결과: 제목 · 메일 실패 줄이 새 말이 아니다 — ' + JSON.stringify(G._LAST_INFO));
    G.sendConfirmEmail_ = () => { mails++; }; }
  // 관리자 단추(승인 · 입금)의 3 은 «붙여넣기 · 배포 확인(99_deployCheck)» · 입금 안쪽 몰림은 다시 누르기(P1) · 까닭 없는 실패는 P4
  { G._SRV = false; G.findRowByToken = () => pk; G.actApprove = () => { throw new ReferenceError('getSheet is not defined'); };
    const r3 = G.mailButtonGo({ action: 'approve', token: 'tok1', sig: G.sign_('tok1', 'approve') });
    if (!(r3 && /99_deployCheck/.test(r3.body || '') && /코드 B3/.test(r3.body || '') && !/관리자 페이지에서 처리/.test(r3.body || ''))) bad.push('⑥ 승인 단추 3: 관리자에게 «관리자 페이지에서 처리»(같은 함수가 빠졌을 공산)를 말한다 — ' + JSON.stringify(r3));
    const exp = String(Date.now() + 86400000), sg = G.sign_('ME0001', 'payconfirm:mid:' + exp);
    G._adminConfirmMidCore = () => ({ ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' });
    const b1 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig: sg });
    if (!(b1 && b1.retry && /코드 P1/.test(b1.body || ''))) bad.push('⑥ 입금 확인: 안쪽 잠금 몰림이 다시 누르기(P1)가 아니다 — ' + JSON.stringify(b1));
    G._adminConfirmMidCore = () => ({ ok: false, error: '' });
    const b4 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig: sg });
    if (!(b4 && !b4.retry && /코드 P4/.test(b4.body || ''))) bad.push('⑥ 입금 확인: 까닭 없는 실패에 코드가 없다(P4) — ' + JSON.stringify(b4));
    G.actApprove = keep.actApprove; G._adminConfirmMidCore = keep._adminConfirmMidCore; G.findRowByToken = keep.findRowByToken; G._SRV = true; }
  // [CAL_RESULT] 캘린더 결과는 true · false · null — false 는 «안 된 것»(오류 글 포함) · 결과 글의 «캘린더에도 등록»은 true 일 때만
  { G.LockService = { getScriptLock: okLock }; G.row = () => pk; G.actApprove = keep.actApprove;
    G.syncCalendarEvent = () => { G._CAL_ERR = 'cal quota'; return false; }; reset6(); G.actApprove({}, {}, pk);
    if (!(G._LAST_INFO && Array.isArray(G._LAST_INFO.partial) && G._LAST_INFO.partial.includes('캘린더') && /캘린더 오류: cal quota/.test(notices[0] || ''))) bad.push('⑥ 캘린더: 만들기 실패(false)가 «안 된 것»에 안 들어가거나 알림에 오류 글이 없다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.partial));
    G.syncCalendarEvent = () => null; reset6(); G.actApprove({}, {}, pk);
    if (!(G._LAST_INFO && G._LAST_INFO.ok && !/캘린더에도/.test(G._LAST_INFO.body))) bad.push('⑥ 캘린더: 캘린더를 안 쓰는데(설정 없음) «캘린더에도 등록»이라고 한다');
    G.syncCalendarEvent = () => true; reset6(); G.actApprove({}, {}, pk);
    if (!(G._LAST_INFO && G._LAST_INFO.ok && /캘린더에도/.test(G._LAST_INFO.body))) bad.push('⑥ 캘린더: 등록됐는데 «캘린더에도 등록» 줄이 없다');
    G.syncCalendarEvent = keep.syncCalendarEvent;
    // 진짜 syncCalendarEvent 는 맨 위에서 흉내로 바꿔 두었다 — 새 샌드박스에서 잰다(CONFIG.CALENDAR_ID 는 코드에서 설정돼 있다)
    const { sandbox: C } = loadGas(makeSandbox()); C._SRV = true; let ns = 0; C.notifyStudio = () => { ns++; }; C.getCalendar = () => null;
    let rv; try { rv = C.syncCalendarEvent({}, {}, 2, '2026-11-01', '14:00', '가 · 나', '010', true); } catch (e) { rv = 'threw ' + e.message; }
    if (rv !== false || ns !== 0) bad.push('⑥ 캘린더: 설정된 캘린더를 못 열었는데 false 가 아니거나(조용히 됨) quiet 인데 따로 알린다 — ' + rv + ' · ' + ns);
    C.getCalendar = () => ({ getEventById: () => null, createEvent: () => { throw new Error('quota'); } }); C.row = () => ({ get: () => '' }); ns = 0;
    try { rv = C.syncCalendarEvent({}, {}, 2, '2026-11-01', '14:00', '가 · 나', '010', false); } catch (e) { rv = 'threw ' + e.message; }
    if (rv !== false || ns !== 1 || !/quota/.test(String(C._CAL_ERR))) bad.push('⑥ 캘린더: 만들기 실패가 false · 오류 글 · (quiet 아니면) 알림 한 통이 아니다 — ' + rv + ' · ' + ns + ' · ' + C._CAL_ERR);
    // [CANCEL_RESULT 라운드 7] 지울 때 캘린더를 못 열면 false + 알림 한 통(어느 취소 길이든 — 마이페이지 · 메일 · 시트 취소는 화면이 말하지 않는다)
    C.getCalendar = () => null; C.row = () => ({ get: (h) => (h === '캘린더이벤트ID' ? 'EV1' : '') }); ns = 0;
    let dv2; try { dv2 = C.deleteCalendarEvent({}, {}, 2, '가 · 나'); } catch (e) { dv2 = 'threw ' + e.message; }
    if (dv2 !== false || ns !== 1) bad.push('⑥ 취소: 캘린더를 못 열었는데 조용히 넘어간다(false · 알림 한 통이 아니다) — ' + dv2 + ' · ' + ns); }
  // [NOTICE_HEAD_FIRST 라운드 6] 알림 메일은 앞 300자만 싣는다 — 할 일 줄이 오류 글보다 앞 · 긴 오류 글에도 «직접 안내»가 잘리지 않는다
  { G.LockService = { getScriptLock: okLock }; G.row = () => pk; G.actApprove = keep.actApprove;
    G.syncCalendarEvent = () => { G._CAL_ERR = 'Q'.repeat(400); return false; }; G.sendConfirmEmail_ = () => { throw new Error('M'.repeat(400)); };
    reset6(); G.actApprove({}, {}, pk);
    const nb = String(notices[0] || '').split(' | ').slice(1).join(' | '), flat = nb.replace(/\s+/g, ' ').slice(0, 300);
    if (!(/이것만 직접 해 주세요/.test(flat) && /고객에게 직접 안내해 주세요/.test(flat) && nb.indexOf('이것만 직접') < nb.indexOf('캘린더 오류'))) bad.push('⑥ 승인 일부 실패 알림: 긴 오류 글에 할 일 줄이 300자 밖으로 밀린다 — ' + flat.slice(0, 120));
    G.syncCalendarEvent = keep.syncCalendarEvent; G.sendConfirmEmail_ = () => { mails++; }; }
  // [CANCEL_RESULT 라운드 6] 취소 결과는 된 것만 — 캘린더를 못 지웠거나 안내 메일이 실패했으면 «빠진 것이 있어요»(B4) · 처리이력 · 관리 화면도 같은 창
  { const cx = R6({ '상태': '확정', '캘린더이벤트ID': '' }); G.row = () => cx; const keepAC = G.actCancel, keepFC = G.findCustomerByCode; G.findCustomerByCode = (c) => (c ? { num: 3, get: () => '' } : null);
    G.actCancel = () => ({ cal: false, mail: true }); reset6(); G.doAdminCancel({}, {}, cx);
    if (!(G._LAST_INFO && G._LAST_INFO.title === '빠진 것이 있어요' && /안 된 것: 캘린더&nbsp;일정&nbsp;삭제/.test(G._LAST_INFO.body) && /코드 B4/.test(G._LAST_INFO.body) && hist.length === 1 && Array.isArray(G._LAST_INFO.partial))) bad.push('⑥ 관리자 취소: 캘린더를 못 지웠는데 «삭제되고 · 발송되었습니다»라고 하거나 처리이력이 없다 — ' + JSON.stringify(G._LAST_INFO));
    G.actCancel = () => ({ cal: true, mail: true }); reset6(); G.doAdminCancel({}, {}, cx);
    if (!(G._LAST_INFO && G._LAST_INFO.ok && /캘린더 일정이 삭제되고 고객에게 안내 메일이 발송되었습니다/.test(G._LAST_INFO.body) && !/예약이 취소되었습니다/.test(G._LAST_INFO.body) && /신랑 · 신부 님<br>/.test(G._LAST_INFO.body))) bad.push('⑥ 관리자 취소: 다 됐는데 결과 글이 다르거나 본문이 제목을 되풀이한다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
    G.actCancel = () => ({ cal: true, mail: 'off' }); reset6(); G.doAdminCancel({}, {}, cx);
    if (!(G._LAST_INFO && G._LAST_INFO.ok && /캘린더 일정이 삭제되었습니다/.test(G._LAST_INFO.body) && !/메일/.test(G._LAST_INFO.body))) bad.push('⑥ 관리자 취소: 안내 메일 스위치가 꺼져 있는데 메일 이야기를 한다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
    html = ''; { const hs0 = G.HtmlService; G.HtmlService = { createHtmlOutput: (h) => { html = h; const o = { setTitle: () => o, setXFrameOptionsMode: () => o, addMetaTag: () => o }; return o; }, XFrameOptionsMode: { ALLOWALL: 1 } };
      G.serveAdminCancelD('tok1', R6({ '상태': '확정' })); G.HtmlService = hs0; }
    if (/안내 메일이 발송됩니다/.test(html) || !/취소하면 캘린더 일정이 삭제됩니다/.test(html)) bad.push('⑥ 관리자 취소 화면: 안내 메일 스위치가 꺼져 있는데 «메일이 발송됩니다»를 약속한다');
    { const pp2 = R6({ '상태': ST.CANCELLED || '취소' }); G._sessionToConsult = () => ({ ok: true, consult: { num: 2 } }); G.row = () => pp2; G.actAccept = keep.actAccept;
      let ra2; try { ra2 = G.handleAcceptProposal({ token: 't' }); } catch (e) { ra2 = { threw: e.message }; }
      if (!(ra2 && ra2.ok === false && ra2.error === '이미 취소된 예약입니다 · 다시 예약을 원하시면 새로 신청해 주세요')) bad.push('⑥ 마이페이지 수락: 취소된 예약에 이름 · 날짜까지 늘어놓은 긴 글 — ' + JSON.stringify(ra2)); G.row = () => cx; }
    G.actCancel = () => ({ cal: false, mail: null }); reset6(); G.doAdminCancel({}, {}, cx);
    if (!(G._LAST_INFO && G._LAST_INFO.title === '빠진 것이 있어요' && /이메일이 없어 안내 메일은 보내지 않았어요/.test(G._LAST_INFO.body) && /\(코드 B4\)$/.test(G._LAST_INFO.body) && G._LAST_INFO.noMail === true)) bad.push('⑥ 관리자 취소: 빠진 것이 있는데 이메일이 없다는 줄이 빠진다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
    G.actCancel = () => ({ cal: null, mail: null }); reset6(); G.doAdminCancel({}, {}, cx);
    if (!(G._LAST_INFO && G._LAST_INFO.ok && !/삭제|발송되었습니다/.test(G._LAST_INFO.body) && /이메일이 없어 안내 메일은 보내지 않았습니다/.test(G._LAST_INFO.body))) bad.push('⑥ 관리자 취소: 캘린더 · 메일을 안 썼는데 «삭제되고 · 발송되었습니다»라고 한다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
    G.actCancel = () => ({ cal: true, mail: false }); G.findRowByPersonalCode = () => ({ num: 2 }); G._AUTHED = true; let rc = 0; const keepRH = G._recordHandler; G._recordHandler = () => { rc++; };
    let ra; try { ra = G.adminCancel('ME0001', ''); } catch (e) { ra = { threw: e.message }; }
    if (!(ra && ra.ok === false && ra.partial === true && ra.error === '취소는 됐어요 · 안 된 것: 취소\u00a0안내\u00a0메일 · 이것만 직접 해 주세요 (코드 B4)' && rc === 1)) bad.push('⑥ 관리 화면 취소: 빠진 것을 «✓ 처리됨»으로 덮는다 — ' + JSON.stringify(ra));
    G._recordHandler = keepRH; G._AUTHED = false; G.findRowByPersonalCode = keep.findRowByPersonalCode; G.actCancel = keepAC; G.findCustomerByCode = keepFC;
    // 진짜 actCancel 은 된 것을 돌려준다(캘린더 못 지움 · 메일 실패)
    const kp = {}; for (const k of ['deleteCalendarEvent', 'sendCancelEmail_', '_maybeRefundAcctReq', '_bustAvailCache', 'setCustomerStage', '_releaseWeddingHoldOnCancel']) kp[k] = G[k];
    G.deleteCalendarEvent = () => false; G.sendCancelEmail_ = () => { throw new Error('mail down'); }; G._maybeRefundAcctReq = () => {}; G._bustAvailCache = () => {}; G.setCustomerStage = () => {}; G._releaseWeddingHoldOnCancel = () => {};
    let rr; try { rr = G.actCancel({}, {}, R6({ '상태': '확정', '이메일': 'a@b.c' })); } catch (e) { rr = { threw: e.message }; }
    // [CANCEL_RESULT 라운드 8] 취소 안내 메일 스위치(CONFIG.SEND_CANCEL_MAIL)가 꺼져 있으면 «보냄»도 «못 보냄»도 아니다('off')
    if (!(rr && rr.cal === false && rr.mail === 'off')) bad.push('⑥ 취소: 안내 메일 스위치가 꺼져 있는데 메일을 보냈다고 센다 — ' + JSON.stringify(rr));
    vm.runInContext('CONFIG.SEND_CANCEL_MAIL = true', G);
    try { rr = G.actCancel({}, {}, R6({ '상태': '확정', '이메일': 'a@b.c' })); } catch (e) { rr = { threw: e.message }; }
    vm.runInContext('CONFIG.SEND_CANCEL_MAIL = false', G);
    if (!(rr && rr.cal === false && rr.mail === false)) bad.push('⑥ 취소: actCancel 이 된 것(캘린더 · 메일)을 돌려주지 않는다 — ' + JSON.stringify(rr));
    for (const k of Object.keys(kp)) G[k] = kp[k];
    let dv; try { dv = G.deleteCalendarEvent({}, {}, 2, 'x'); } catch (e) { dv = 'threw ' + e.message; }
    if (dv !== null) bad.push('⑥ 취소: 지울 캘린더 일정이 없는데 «못 지움(false)»으로 센다 — ' + dv);
    // [CANCEL_SAME_WORDS] «이미 취소» 화면은 같은 제목 · 본문은 누구 · 언제(제목을 되풀이하지 않는다)
    const cc = R6({ '상태': ST.CANCELLED || '취소', '선택날짜': '2026-11-01' });
    const pages = [['관리자 취소 화면', () => G.serveAdminCancelD('tok1', cc)], ['관리자 취소 누름', () => G.doAdminCancel({}, {}, cc)], ['고객 취소 화면', () => G.serveCancelD('tok1', cc)], ['고객 취소 누름', () => G.doCustomerCancel({}, {}, cc, {})]];
    for (const [lb, fn] of pages) { G._LAST_INFO = null; try { fn(); } catch (e) { bad.push('⑥ ' + lb + ': 던졌다 — ' + e.message); continue; }
      if (!(G._LAST_INFO && G._LAST_INFO.title === '이미 취소된 예약입니다' && G._LAST_INFO.ok === true && /신랑 · 신부 님<br>/.test(G._LAST_INFO.body) && /14:00/.test(G._LAST_INFO.body) && !/이미 취소/.test(G._LAST_INFO.body) && (/관리자/.test(lb) || /다시 예약을 원하시면 새로 신청해 주세요/.test(G._LAST_INFO.body)))) bad.push('⑥ ' + lb + ': «이미 취소» 화면이 다른 제목이거나 본문이 제목을 되풀이한다 — ' + JSON.stringify(G._LAST_INFO)); }
    { const cz = R6({ '상태': ST.CANCELLED || '취소' }); G.row = () => cz; reset6(); G.actApprove({}, {}, cz); const a1 = G._LAST_INFO; reset6(); G.actAccept({}, {}, cz); const a2 = G._LAST_INFO;
      if (!(a1 && a1.title === '이미 취소된 예약입니다' && a1.ok === false && /승인할 수 없어요/.test(a1.body) && a2 && a2.title === '이미 취소된 예약입니다' && a2.ok === false && /신랑 · 신부 님/.test(a2.body))) bad.push('⑥ 취소된 예약 승인 · 수락: 같은 상태인데 다른 제목이거나 누구 · 언제가 없다 — ' + JSON.stringify([a1 && a1.title, a2 && a2.title])); }
    // [ERR_ID_RECORDED 라운드 7] 링크 오류 화면은 사고번호가 없어도 «(코드 X9)»는 남긴다
    { const keepSA = G.serveApplyA, keepEI = G._errId, keepER = G._errRecord; G.serveApplyA = () => { throw new Error('boom'); }; G._errId = () => ''; G._errRecord = () => {}; G._LAST_INFO = null;
      try { G.doGet({ parameter: {} }); } catch (e) {}
      if (!(G._LAST_INFO && /\(코드 X9\)$/.test(G._LAST_INFO.body))) bad.push('⑥ 링크 오류 화면: 사고번호가 없으면 코드까지 빠진다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
      G.serveApplyA = keepSA; G._errId = keepEI; G._errRecord = keepER; }
    // [MISS_NOWRAP] 승인 일부 실패 화면도 항목 안은 붙는 칸
    G.syncCalendarEvent = () => false; G.sendConfirmEmail_ = () => { throw new Error('x'); }; G.row = () => pk; reset6(); G.actApprove({}, {}, pk);
    if (!(G._LAST_INFO && /확정&nbsp;메일/.test(G._LAST_INFO.body) && /마이페이지&nbsp;단계|캘린더/.test(G._LAST_INFO.body))) bad.push('⑥ 승인 일부 실패 화면: «확정 메일»이 줄 끝에서 갈릴 수 있다 — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.body));
    G.syncCalendarEvent = keep.syncCalendarEvent; G.sendConfirmEmail_ = () => { mails++; }; }
  // [BTN_STATE_FIRST] 변경 제안을 보낸 예약은 승인하지 않는다(관리 화면과 같은 규칙) · 링크도 단추 대신 상태
  { const pr = R6({ '상태': ST.PROPOSED || '변경제안', '변경제안날짜': '2026-11-02', '변경제안시간': '15:00' }); G.row = () => pr; reset6(); G.actApprove({}, {}, pr);
    if (!(G._LAST_INFO && G._LAST_INFO.title === '변경 제안을 보낸 예약입니다' && writes === 0)) bad.push('⑥ 승인: 변경 제안을 보낸 예약을 메일 단추로 승인한다(제안이 떠 버린다) — ' + JSON.stringify(G._LAST_INFO && G._LAST_INFO.title) + ' · writes ' + writes);
    G.findRowByToken = () => pr; G._LAST_INFO = null; try { G.handleAction({ token: 'tok1', action: 'approve', sig: G.sign_('tok1', 'approve') }); } catch (e) {}
    if (!(G._LAST_INFO && G._LAST_INFO.title === '변경 제안을 보낸 예약입니다')) bad.push('⑥ 링크 열기: 변경 제안 중인 예약의 승인 링크가 살아 있는 단추를 보인다');
    // 다시 연 «이미 확정» 링크에도 앞선 오류 안내(지우지 않는다)
    const ap = R6({ '상태': ST.APPROVED || '승인완료' }); G.findRowByToken = () => ap; cm.set('BTNFAIL_B_tok1', '1'); G._LAST_INFO = null;
    try { G.handleAction({ token: 'tok1', action: 'approve', sig: G.sign_('tok1', 'approve') }); } catch (e) {}
    if (!(G._LAST_INFO && /앞서 오류가 있었어요/.test(G._LAST_INFO.body) && cm.has('BTNFAIL_B_tok1'))) bad.push('⑥ 링크 다시 열기: 앞선 오류 뒤 «이미 확정»에 안내가 없거나 열기만 해도 표가 사라진다(메일 검사기가 먼저 열면 못 본다)');
    cm.delete('BTNFAIL_B_tok1'); G.findRowByToken = keep.findRowByToken; }
  // [ACCEPT_RESULT] 관리 화면 승인은 이번 누름의 결과를 먼저 믿는다(잠금 대기 중 줄이 밀려도 «마감»이나 거짓 «승인»이 되지 않게)
  { const keepFR = G.findRowByPersonalCode; G.findRowByPersonalCode = () => ({ num: 2 }); G._AUTHED = true; let rc = 0; G._recordHandler = () => { rc++; };
    G.row = () => R6({ '상태': '시간선택완료' }); G.actApprove = () => G.infoPage('승인 완료', 'x', true);
    let r1; try { r1 = G.adminApprove('ME0001'); } catch (e) { r1 = { threw: e.message }; }
    if (!(r1 && r1.ok === true && rc === 1)) bad.push('⑥ 관리 화면 승인: 승인됐는데 줄이 밀려 «마감»으로 말한다 — ' + JSON.stringify(r1));
    let n0 = 0; G.row = () => { n0++; return n0 === 1 ? R6({ '상태': '시간선택완료' }) : R6({ '상태': ST.APPROVED || '승인완료' }); }; rc = 0;
    G.actApprove = () => G.infoPage('예약을 찾을 수 없습니다', '예약 정보가 바뀌었어요. 관리자 페이지에서 확인해 주세요.', false);
    let r2; try { r2 = G.adminApprove('ME0001'); } catch (e) { r2 = { threw: e.message }; }
    if (!(r2 && r2.ok === false && r2.error === '예약 정보가 바뀌었어요 · 새로고침해 주세요' && rc === 0)) bad.push('⑥ 관리 화면 승인: 예약을 못 찾았는데 «승인»으로 남기거나 관리자에게 «관리자 페이지에서 확인»을 말한다 — ' + JSON.stringify(r2));   // [ADM_GONE_WORDS]
    const keepAc = G.actAccept; G.row = () => R6({ '상태': ST.PROPOSED || '변경제안' }); G.actAccept = () => G.infoPage('예약을 찾을 수 없습니다', '예약 정보가 바뀌었어요<br>contact@momentedit.kr 로 문의해 주세요', false); rc = 0;
    let r3; try { r3 = G.adminAcceptProposal('ME0001'); } catch (e) { r3 = { threw: e.message }; }
    if (!(r3 && r3.ok === false && r3.error === '예약 정보가 바뀌었어요 · 새로고침해 주세요' && rc === 0)) bad.push('⑥ 관리 화면 수락: 예약을 못 찾았는데 관리자에게 «문의 메일»을 말한다 — ' + JSON.stringify(r3));
    G.actAccept = keepAc;
    // [ADM_GONE_WORDS 라운드 7] 개인코드로 예약을 못 찾을 때도 같은 말(승인 · 수락 · 취소 · 변경 제안)
    { const kfr = G.findRowByPersonalCode; G.findRowByPersonalCode = () => null; const said = [];
      for (const f of ['adminApprove', 'adminAcceptProposal', 'adminCancel', 'adminProposeTime']) { let r; try { r = G[f]('ME0404', '2026-11-01', '14:00'); } catch (e) { r = { threw: e.message }; } said.push(r && r.error); }
      if (!said.every((t) => t === '예약 정보가 바뀌었어요 · 새로고침해 주세요')) bad.push('⑥ 관리 화면: 예약을 못 찾은 같은 상태에 말이 둘이다 — ' + JSON.stringify(said));
      G.findRowByPersonalCode = kfr; }
    // [CANCEL_SAME_WORDS 라운드 8] 관리 화면이 «취소된 예약»을 말할 때는 한 말(승인 · 수락 · 변경 제안 · 잠금 뒤에 알게 된 때)
    { const kfr2 = G.findRowByPersonalCode, kac = G.actAccept, kap = G.actApprove; G.findRowByPersonalCode = () => ({ num: 2 }); G.row = () => R6({ '상태': ST.CANCELLED || '취소' });
      const MSG = '이미 취소된 예약이에요 · 다시 진행하려면 고객이 새로 신청해야 해요', said = [];
      for (const f of ['adminApprove', 'adminAcceptProposal', 'adminProposeTime']) { let r; try { r = G[f]('ME0001', '2026-11-01', '14:00'); } catch (e) { r = { threw: e.message }; } said.push(r && r.error); }
      G.row = () => R6({ '상태': '시간선택완료' }); G.actApprove = () => G.infoPage('이미 취소된 예약입니다', 'x', false);
      let r2; try { r2 = G.adminApprove('ME0001'); } catch (e) { r2 = { threw: e.message }; } said.push(r2 && r2.error);
      if (!said.every((t) => t === MSG)) bad.push('⑥ 관리 화면: 취소된 예약을 말이 여럿이거나 고객용 «새로 신청해 주세요»로 말한다 — ' + JSON.stringify(said));
      G.findRowByPersonalCode = kfr2; G.actAccept = kac; G.actApprove = kap; }
    // [INFO_TEXT_SEP] 한 줄 글은 줄바꿈을 « · »로(문장 끝 뒤는 띄어쓰기) — 두 문장이 붙지 않게
    const it1 = G._infoText_({ title: '예약을 찾을 수 없습니다', body: '예약 정보가 바뀌었어요<br>contact@momentedit.kr 로 문의해 주세요' }), it2 = G._infoText_({ title: 't', body: '끝났습니다.<br><br>다음 줄' });
    if (it1 !== '예약을 찾을 수 없습니다 · 예약 정보가 바뀌었어요 · contact@momentedit.kr 로 문의해 주세요' || it2 !== 't · 끝났습니다. 다음 줄') bad.push('⑥ 한 줄 글: 줄바꿈 자리가 붙거나 « · »가 겹친다 — ' + it1 + ' / ' + it2);
    G.actApprove = keep.actApprove; G.findRowByPersonalCode = keepFR; G._AUTHED = false; G._recordHandler = () => {}; }
  // [ENTRY_ARGS_SRV] 주소 값(doGet)은 글자만 — 화면에서 바로 부르며 객체를 넘겨도 던지지 않는다(오류기록이 쌓이지 않게)
  { let rec = 0; const keepER = G._errRecord; G._errRecord = () => { rec++; }; let th = '';
    try { G.doGet({ parameter: { page: 'schedule', token: { toString: 1 } } }); G.doGet({ parameter: { action: { toString: 1 }, token: 'x' } }); } catch (e) { th = e.message; }
    if (th || rec) bad.push('⑥ 링크 주소: 글자가 아닌 값에 던지거나 오류기록을 남긴다 — ' + (th || rec + '줄'));
    G._errRecord = keepER; G._SRV = true; }
  // PASTE_GAP — 붙이는 도중(consultation-booking 이 옛 판 · _infoText_ 없음)에도 관리 화면 승인의 실패 글이 멈추지 않는다
  { const keepIT = G._infoText_, keepFR = G.findRowByPersonalCode; G._infoText_ = undefined; G.findRowByPersonalCode = () => ({ num: 2 });
    G.LockService = { getScriptLock: badLock }; G.row = () => pk; G._AUTHED = true; G.actApprove = keep.actApprove;
    let r; try { r = G.adminApprove('ME0001'); } catch (e) { r = { threw: e.message }; }
    if (!(r && r.ok === false && !r.threw && /다른 처리가 진행 중/.test(r.error || ''))) bad.push('⑥ 관리 화면 승인: consultation-booking 이 옛 판이면 실패 글에서 멈춘다(붙이는 도중) — ' + JSON.stringify(r));
    G._infoText_ = keepIT; G.findRowByPersonalCode = keepFR; G._AUTHED = false; G.LockService = { getScriptLock: okLock }; }
  // ENTRY_ARGS_SRV — 화면(google.script.run)에서 부른 신청서는 개인코드를 받지 않고 · doPost 길(가입)에서는 받는다 · 칸은 글자만
  { G.makeToken = () => 'newtok'; G.parseDetail = () => ({});
    const form = { groom: '가', bride: '나', phone: '010', email: 'a@b.co', memo: '', detail: '', hp: '' };
    /* [APPLY_A_RETIRE 2026-10-09] 옛 화면 A(google.script.run)의 제출은 받지 않는다 — 새 신청서 안내를 던지고(옛 화면이 그 글을 보여 준다) 아무것도 쓰지 않는다 */
    G._IN_POST = false; reset6(); let movedMsg = ''; try { G.submitApplication(form, 'ME9999'); } catch (e) { movedMsg = e.message; }
    if (!/신청은 momentedit\.kr 신청서에서 받아요 · https:\/\/www\.momentedit\.kr\/inquiry\.html/.test(movedMsg) || writes || Object.keys(wrote).length) bad.push('⑥ 신청서: 옛 화면 A 의 제출을 받거나 새 신청서를 알려 주지 않는다 [APPLY_A_RETIRE] — ' + JSON.stringify({ movedMsg, writes, wrote }));
    if ('개인코드' in wrote) bad.push('⑥ 신청서: 화면에서 부른 신청이 개인코드를 받아 남의 예약에 묶인다');
    { const keepSA = G._LAST_INFO; G.serveApplyA(); const li = G._LAST_INFO; G._LAST_INFO = keepSA;
      if (!(li && li.title === '신청서가 옮겨졌어요' && /href="https:\/\/www\.momentedit\.kr\/inquiry\.html"/.test(li.body) && /신청서 열기/.test(li.body))) bad.push('⑥ 화면 A 주소: 새 신청서 안내 한 장이 아니다 [APPLY_A_RETIRE] — ' + JSON.stringify(li)); }
    G._IN_POST = true; reset6(); try { G.submitApplication(form, 'ME9999'); } catch (e) { bad.push('⑥ 신청서(가입 길): 던졌다 — ' + e.message); }
    if (wrote['개인코드'] !== 'ME9999') bad.push('⑥ 신청서: 가입 길(doPost)에서 개인코드를 못 받는다(마이페이지가 예약을 못 찾는다)');
    // 편집기 시험 도구(소유자 · 90_test-utils 의 _testSignup)는 doPost 밖에서도 개인코드를 넘긴다 — 소유자 실행으로 이미 정해졌으면 받는다
    G._OWNER_RUN = true; G._IN_POST = false; reset6(); try { G.submitApplication(form, 'ME7777'); } catch (e) { bad.push('⑥ 신청서(편집기 시험 도구): 던졌다 — ' + e.message); }
    if (wrote['개인코드'] !== 'ME7777') bad.push('⑥ 신청서: 편집기 시험 도구(소유자 실행)의 개인코드를 지운다(시험 고객이 예약과 안 묶인다)');
    G._OWNER_RUN = null; G._IN_POST = true; reset6(); let msg = '';   // [APPLY_A_RETIRE] 입력 확인은 받는 길(doPost 가입)에서 본다 — 화면 A 길은 위에서 안내로 끝난다
    try { G.submitApplication({ groom: { toString: 1 }, bride: '나', phone: '010', email: 'a@b.co' }); } catch (e) { msg = e.message; }
    if (!/성함을 입력해 주세요/.test(msg)) bad.push('⑥ 신청서: 글자가 아닌 칸이 그대로 들어간다(입력 확인 글이어야) — ' + msg);
    G._IN_POST = keep._IN_POST; }
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G._SRV = true; G._AUTHED = false;
}

if (bad.length) { console.log('━━ mail-page — 빨강 ' + bad.length + '건 [MAIL_PAGE_CHECK]'); for (const b of bad.slice(0, 30)) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ mail-page — 통과 · 결과 글 escape 6 · 정적 ' + calls + '곳 · 확인 화면 행동(그리기 · 단추 자리 · 되살리기 · 5/6/7) · 단추 주소 화면 6 · 화면 B 서버 값 · 단추 처리(잠금 · 다시 읽기 · flush · 부르는 곳 · 앞선 오류 · 3) · 라운드 4(입구 인자 · 알림 한 통 · 처리이력 · 상태 먼저 · 결제 알림 글) [MAIL_PAGE_CHECK]');
