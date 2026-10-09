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
    Object.defineProperty(e, 'textContent', { get() { return this.children.length ? this.children.map((c) => (c.nodeType === 3 ? c.data : (c.textContent || ''))).join('') : this._text; },
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
{ // [MAIL_SAME_WORDS] 실패 뒤 다시 누르면 처음 화면(제목 · 설명 · 막대색)에서 «처리 중»
  const A = page('approve');
  if (A) { A.click(); A.fail('Failed to fetch'); A.click();
    if (A.E.t.textContent !== '예약을 승인할까요?' || A.E.d.textContent !== 'X 님' || A.E.bar.style.background !== '#3A2D22') bad.push('화면: 실패 뒤 다시 누르면 앞의 실패 글이 «처리 중» 아래 그대로 남는다 — ' + A.E.t.textContent + ' / ' + A.E.d.textContent); } }
{ // [MAIL_VIEWPORT] GAS 화면 넷은 viewport 를 addMetaTag 로(HTML 안 meta 는 무시된다 · 없으면 폰에서 데스크톱 폭으로 줄어 보인다)
  const vp = (label, fn) => { metas = []; try { fn(); } catch (e) { bad.push('화면 viewport · ' + label + ': 던졌다 — ' + e.message); return; } if (!metas.some((m) => /^viewport=width=device-width/.test(m))) bad.push('화면 viewport · ' + label + ': addMetaTag(viewport) 가 없다 — 폰에서 글자가 아주 작게 보인다'); };
  vp('확인 화면', () => G._mailConfirmPage_('t', 'd', 'go', { action: 'approve' }));
  vp('결과 화면', () => G.infoPage('t', 'b', true));
  const cr = mkRow(Object.assign({}, base, { '상태': '확정', '예약금': '' }));
  vp('고객 취소 화면', () => { const keepW = G.withinCancelDeadline; G.withinCancelDeadline = () => true; try { G.serveCancelD('tok1', cr); } finally { G.withinCancelDeadline = keepW; } });
  vp('관리자 취소 화면', () => G.serveAdminCancelD('tok1', mkRow(Object.assign({}, base, { '상태': '확정' })))); }
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
    if (ln.length !== 2) bad.push('⑥ 관리자 알림: 같은 제목 · 다른 고객의 실패가 묻히거나 같은 고객이 두 번 간다 — ' + ln.length + '통(2 여야)'); }
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
      [R6({ '상태': '시간선택완료' }), 'accept', '처리할 제안이 없습니다'], [R6({ '상태': ST.CANCELLED || '취소' }), 'approve', '취소된 예약입니다'], [R6({ '상태': '시간선택완료' }), 'approve', '(단추 화면)'],
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
  // PASTE_GAP — 붙이는 도중(consultation-booking 이 옛 판 · _infoText_ 없음)에도 관리 화면 승인의 실패 글이 멈추지 않는다
  { const keepIT = G._infoText_, keepFR = G.findRowByPersonalCode; G._infoText_ = undefined; G.findRowByPersonalCode = () => ({ num: 2 });
    G.LockService = { getScriptLock: badLock }; G.row = () => pk; G._AUTHED = true; G.actApprove = keep.actApprove;
    let r; try { r = G.adminApprove('ME0001'); } catch (e) { r = { threw: e.message }; }
    if (!(r && r.ok === false && !r.threw && /다른 처리가 진행 중/.test(r.error || ''))) bad.push('⑥ 관리 화면 승인: consultation-booking 이 옛 판이면 실패 글에서 멈춘다(붙이는 도중) — ' + JSON.stringify(r));
    G._infoText_ = keepIT; G.findRowByPersonalCode = keepFR; G._AUTHED = false; G.LockService = { getScriptLock: okLock }; }
  // ENTRY_ARGS_SRV — 화면(google.script.run)에서 부른 신청서는 개인코드를 받지 않고 · doPost 길(가입)에서는 받는다 · 칸은 글자만
  { G.makeToken = () => 'newtok'; G.parseDetail = () => ({});
    const form = { groom: '가', bride: '나', phone: '010', email: 'a@b.co', memo: '', detail: '', hp: '' };
    G._IN_POST = false; reset6(); try { G.submitApplication(form, 'ME9999'); } catch (e) { bad.push('⑥ 신청서: 던졌다 — ' + e.message); }
    if ('개인코드' in wrote) bad.push('⑥ 신청서: 화면에서 부른 신청이 개인코드를 받아 남의 예약에 묶인다');
    G._IN_POST = true; reset6(); try { G.submitApplication(form, 'ME9999'); } catch (e) { bad.push('⑥ 신청서(가입 길): 던졌다 — ' + e.message); }
    if (wrote['개인코드'] !== 'ME9999') bad.push('⑥ 신청서: 가입 길(doPost)에서 개인코드를 못 받는다(마이페이지가 예약을 못 찾는다)');
    // 편집기 시험 도구(소유자 · 90_test-utils 의 _testSignup)는 doPost 밖에서도 개인코드를 넘긴다 — 소유자 실행으로 이미 정해졌으면 받는다
    G._OWNER_RUN = true; G._IN_POST = false; reset6(); try { G.submitApplication(form, 'ME7777'); } catch (e) { bad.push('⑥ 신청서(편집기 시험 도구): 던졌다 — ' + e.message); }
    if (wrote['개인코드'] !== 'ME7777') bad.push('⑥ 신청서: 편집기 시험 도구(소유자 실행)의 개인코드를 지운다(시험 고객이 예약과 안 묶인다)');
    G._OWNER_RUN = null; G._IN_POST = false; reset6(); let msg = '';
    try { G.submitApplication({ groom: { toString: 1 }, bride: '나', phone: '010', email: 'a@b.co' }); } catch (e) { msg = e.message; }
    if (!/성함을 입력해 주세요/.test(msg)) bad.push('⑥ 신청서: 글자가 아닌 칸이 그대로 들어간다(입력 확인 글이어야) — ' + msg);
    G._IN_POST = keep._IN_POST; }
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G._SRV = true; G._AUTHED = false;
}

if (bad.length) { console.log('━━ mail-page — 빨강 ' + bad.length + '건 [MAIL_PAGE_CHECK]'); for (const b of bad.slice(0, 30)) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ mail-page — 통과 · 결과 글 escape 6 · 정적 ' + calls + '곳 · 확인 화면 행동(그리기 · 단추 자리 · 되살리기 · 5/6/7) · 단추 주소 화면 6 · 화면 B 서버 값 · 단추 처리(잠금 · 다시 읽기 · flush · 부르는 곳 · 앞선 오류 · 3) · 라운드 4(입구 인자 · 알림 한 통 · 처리이력 · 상태 먼저 · 결제 알림 글) [MAIL_PAGE_CHECK]');
