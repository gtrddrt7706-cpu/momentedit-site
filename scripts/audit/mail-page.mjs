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
  const re = /\binfoPage\(/g; let m;
  while ((m = re.exec(src))) {
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 10), m.index))) continue;
    const a = argsOf(src, m.index + 'infoPage'.length);
    if (a.length < 2) continue;
    calls++;
    const body = stripCalls(stripStrings(a[1]), ['esc', 'prettyDate', 'safeAttr', 'formatWon']);
    const hit = body.match(/coupleNames\(|row\.get\(|\b(time|nt|nd|names)\b/);
    if (hit) bad.push(`정적: ${f}:${src.slice(0, m.index).split('\n').length} infoPage 본문에 고객 글(${hit[0]})이 esc( 밖에 있다`);
  }
}
if (calls < 20) bad.push('정적: infoPage 호출을 ' + calls + '개만 찾았다(모양이 바뀌었다)');

// ── ③ 확인 화면 스크립트 (가짜 화면)
let html = '';
const realHS = G.HtmlService;
G.HtmlService = { createHtmlOutput: (h) => { html = h; const o = { setTitle: () => o, setXFrameOptionsMode: () => o }; return o; }, XFrameOptionsMode: { ALLOWALL: 1 } };
function page(action) {
  G._mailConfirmPage_('예약을 승인할까요?', 'X 님', '승인하기', { action, token: 't', sig: 's' });
  const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  if (!js) { bad.push('화면: 스크립트를 못 찾았다'); return null; }
  const el = (id) => {
    const e = { id, nodeName: 'DIV', children: [], style: {}, disabled: false, _text: '', focused: false,
      appendChild(c) { this.children.push(c); return c; }, focus() { this.focused = true; } };
    Object.defineProperty(e, 'textContent', { get() { return this.children.length ? this.children.map((c) => (c.nodeType === 3 ? c.data : (c.textContent || ''))).join('') : this._text; },
      set(v) { this.children = []; this._text = String(v); } });
    return e;
  };
  const E = { go: el('go'), t: el('t'), d: el('d'), bar: el('bar') };
  E.go._text = '승인하기';
  let ok = null, fail = null, sent = null;
  const run = { withSuccessHandler(f) { ok = f; return run; }, withFailureHandler(f) { fail = f; return run; }, mailButtonGo(p) { sent = p; } };
  const doc = { getElementById: (id) => E[id], createTextNode: (t) => ({ nodeType: 3, data: String(t) }),
    createElement: (tag) => { const x = el('x'); x.nodeName = String(tag).toUpperCase(); x.nodeType = 1; return x; } };
  vm.runInNewContext(js, { document: doc, google: { script: { run } }, String, parseInt, Number });
  return { E, click: () => E.go.onclick(), ok: (r) => ok(r), fail: (m) => fail(new Error(m)), sent: () => sent };
}
const tags = (e) => e.children.filter((c) => c.nodeType !== 3).map((c) => c.nodeName);
{
  const P = page('approve');
  if (P) {
    P.click();
    if (!P.sent() || P.E.go.disabled !== true) bad.push('화면: 단추를 눌렀는데 보내지 않거나 단추가 잠기지 않았다');
    P.ok({ ok: true, title: '승인 완료', body: '<img src=x onerror=alert(1)>A &lt;b&gt;<b>B</b><br>C' });
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

if (bad.length) { console.log('━━ mail-page — 빨강 ' + bad.length + '건 [MAIL_PAGE_CHECK]'); for (const b of bad.slice(0, 30)) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ mail-page — 통과 · 결과 글 escape 6 · infoPage 정적 ' + calls + '곳 · 확인 화면 행동(그리기 · 단추 자리 · 되살리기 · 5/6/7) [MAIL_PAGE_CHECK]');
