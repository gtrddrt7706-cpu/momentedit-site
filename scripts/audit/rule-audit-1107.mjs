#!/usr/bin/env node
/* ★[RULE_AUDIT_1107 2026-11-07 대본 규칙 감사 · 서버 몸] 다섯 가지를 «행동으로» 잰다.
 *   ① [NOTICE_REACHED_1107] 결과물 보관 만료 통지는 메일이 실제로 나갔을 때만 «보관만료통지» — 주소 없음 · 보내기 실패면 표시 없이 관리자 메일 · 다음 날 다시
 *   ② [GUEST_WITH_NOTICE_1107] 통지 메일에 하객 사진 한 줄(폴더가 있을 때만) — 정리 쪽 «통지 뒤 7일»은 purge-policy.mjs 가 잰다
 *   ③ [HOUR_BUCKET_1107] 시간당 셈 열쇠가 시각 칸(…_yyyyMMddHH) — 칸이 바뀌면 0 부터
 *   ④ [ADVISOR_CUT_1107] AI 상담 답이 토큰 한도(max_tokens)에서 끊기면 마지막 온전한 문장까지 + 상담사 연결 · 반쪽 표식 지움 · 끊기지 않은 답은 그대로
 *   ⑤ [GP_FILL_ALERT_1107] 하객 사진 80% · 가득 관리자 메일 문장이 원문에 있다(행동은 guest-photo-sim 이 저장 길을 잰다)
 *   깨 보기: ① 실패해도 찍는 옛 꼴 · ④ stop_reason 을 안 보는 옛 꼴로 바꾸면 빨강
 * 종료: 0 통과 · 1 빨강 · 2 재지 못함
 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' → ' + JSON.stringify(d))); if (!c) fail++; };
const grab = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } return ''; };
const J = rd('automation/platform/70_journey.gs');
const PGLINE = (J.match(/var PG = \{[^\n]*\};/) || [''])[0];
const SRC1 = [grab(J, 'sendArchiveExpiryNotices'), grab(J, '_pgAddMonths_'), PGLINE].join('\n');
if (!/sendArchiveExpiryNotices/.test(SRC1) || !PGLINE) { console.log('━━ rule-audit-1107 — 70_journey 에서 함수 · PG 를 못 찾았다 · 재지 못함'); process.exit(2); }

const ymd = (d) => d.toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400e3);
function runNotice(src, rows, today, sendImpl) {
  const H = ['개인코드', '이메일', '결과물상태', '동의기록', '하객사진폴더ID'], colOf = {}; H.forEach((h, i) => { colOf[h] = i + 1; });
  const mails = [], admin = [];
  const ctx = {
    getCustomersSheet: () => ({ getLastRow: () => rows.length + 1, getLastColumn: () => H.length, getRange: () => ({ getValues: () => rows.map((r) => H.map((h) => r[h] || '')) }) }),
    buildHeaderIndex: () => colOf, P: { DATA_START_ROW: 2 }, _kstYmd: () => today, _dayDiff: dayDiff,
    _parseJsonSafe: (v) => { try { return JSON.parse(v || '{}') || {}; } catch { return {}; } },
    notifyKakao: () => {}, GmailApp: { sendEmail: (to, sub, body) => { sendImpl(to); mails.push({ to, sub, body }); } },
    _stampConsentKey: (s, c, num, fn) => { const r = rows[num - 2], rec = JSON.parse(r.동의기록 || '{}'); fn(rec); r.동의기록 = JSON.stringify(rec); },
    _recordHandler: () => {}, fmtKST: () => today + ' 11:00', _nfAdminLineEmail: (t) => admin.push(t), _trigIn_: () => {}, console
  };
  vm.createContext(ctx); vm.runInContext(src, ctx); ctx.sendArchiveExpiryNotices();
  return { mails, admin };
}
const T = '2026-11-01';   // 전달 2026-05-05 → 만료 2026-11-05 · 4일 남음
const mk = (o) => Object.assign({ 결과물상태: '전달완료', 동의기록: JSON.stringify({ 결과물전달일: '2026-05-05 10:00' }) }, o);
const notified = (r) => !!JSON.parse(r.동의기록).보관만료통지;
function scenario(src) {
  const rows = [mk({ 개인코드: 'N1', 이메일: 'a@x.kr', 하객사진폴더ID: 'GPF' }), mk({ 개인코드: 'N2', 이메일: '' }), mk({ 개인코드: 'N3', 이메일: 'bad@x.kr' }), mk({ 개인코드: 'N4', 이메일: 'b@x.kr' })];
  const r = runNotice(src, rows, T, (to) => { if (to === 'bad@x.kr') throw new Error('Service invoked too many times'); });
  return { rows, ...r };
}
{
  const { rows, mails, admin } = scenario(SRC1);
  ok('① 메일이 나간 예식만 «보관만료통지»(N1 · N4) · 주소 없음(N2) · 실패(N3)는 표시 없음', notified(rows[0]) && notified(rows[3]) && !notified(rows[1]) && !notified(rows[2]), rows.map((r) => [r.개인코드, notified(r)]));
  ok('① 실패 · 주소 없음은 관리자 메일(개인코드 · 까닭 · «삭제하지 않아요»)', admin.length === 2 && admin.some((t) => /N2 · 메일 주소 없음/.test(t)) && admin.some((t) => /N3 · Service invoked/.test(t)) && admin.every((t) => /삭제하지 않아요/.test(t)), admin);
  ok('② 하객 사진 폴더가 있는 예식 메일에만 «하객분들이 올려 주신 사진도 이때 함께 지워져요.»', /하객분들이 올려 주신 사진도 이때 함께 지워져요\./.test((mails.find((m) => m.to === 'a@x.kr') || {}).body || '') && !/하객분들/.test((mails.find((m) => m.to === 'b@x.kr') || {}).body || ''), mails.map((m) => m.to));
  ok('② 안내 문구는 그대로(«이용계약서 제12조 제3항에 따른 안내입니다.» · 보관 기간 문장)', mails.every((m) => /이용계약서 제12조 제3항에 따른 안내입니다\./.test(m.body) && /보관 기간\(전달일부터 6개월\)/.test(m.body)));
  // 다음 날 — 표시 없는 N2 · N3 는 다시 대상(이번엔 성공)
  rows[1].이메일 = 'c@x.kr';
  const r2 = runNotice(SRC1, rows, '2026-11-02', () => {});
  ok('① 다음 날 다시 — 표시 없던 N2 · N3 만 다시 보내고 찍는다 · 이미 찍힌 N1 · N4 는 다시 안 보냄', r2.mails.length === 2 && notified(rows[1]) && notified(rows[2]), r2.mails.map((m) => m.to));
}
{ // 깨 보기 — 실패를 삼키고 늘 찍는 옛 꼴
  const MUT = SRC1.replace(/if \(sent\) \{/, 'if (true) {');
  if (MUT === SRC1) { console.log('━━ rule-audit-1107 — 깨 보기 자리를 못 찾았다 · 재지 못함'); process.exit(2); }
  const { rows } = scenario(MUT);
  ok('① 깨 보기: 실패해도 찍는 옛 꼴이면 위 검사가 빨강이 된다', notified(rows[1]) || notified(rows[2]));
}

// ③ 시각 칸 열쇠
{
  const P = rd('automation/platform/80_production.gs'), V = rd('automation/platform/89_prevideo.gs');
  const hk = grab(P, '_hourKey_');
  const ctx = { Utilities: { formatDate: (d, tz, f) => { const k = new Date(d.getTime() + 9 * 3600e3); return f.replace('yyyy', k.getUTCFullYear()).replace('MM', String(k.getUTCMonth() + 1).padStart(2, '0')).replace('dd', String(k.getUTCDate()).padStart(2, '0')).replace('HH', String(k.getUTCHours()).padStart(2, '0')); } } };
  vm.createContext(ctx); vm.runInContext(hk, ctx);
  ok('③ _hourKey_ = 이름_yyyyMMddHH(한국 시각)', /^BEDQ_ME01_\d{10}$/.test(ctx._hourKey_('BEDQ_ME01')), ctx._hourKey_('BEDQ_ME01'));
  ok('③ 구간곡 · 추천곡 · 식전 영상 사진 셈이 시각 칸 열쇠를 쓴다 · 옛 고정 열쇠 없음', /_hourKey_\('BEDQ_' \+ code\)/.test(P) && /_hourKey_\('RECQ_' \+ code\)/.test(P) && /_hourKey_\('pvUp_' \+ code\)/.test(V) && !/qk = 'BEDQ_' \+ code,/.test(P) && !/qk = 'RECQ_' \+ code,/.test(P));
  ok('③ 상한 상향 — 구간곡 300 · 추천곡 200', /BED_HOUR_MAX = 300/.test(P) && /REC_HOUR_MAX = 200/.test(P));
}

// ④ AI 상담 잘림
async function ask(stop, text, srcPath) {
  const mod = srcPath ? srcPath : path.join(ROOT, 'api/advisor.js');
  delete require.cache[require.resolve(mod)];
  process.env.ANTHROPIC_API_KEY = 'test';
  global.fetch = async (url) => (String(url).indexOf('anthropic') !== -1
    ? { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }], stop_reason: stop, usage: {} }), text: async () => '' }
    : { ok: true, status: 200, json: async () => ({}), text: async () => '' });
  const handler = require(mod);
  const { Readable } = await import('node:stream');
  const req = Readable.from([JSON.stringify({ messages: [{ role: 'user', content: '환불 규정 자세히 알려 주세요' }], page: '메인', test: true })]);
  req.method = 'POST'; req.headers = { 'x-real-ip': '10.0.0.' + Math.floor(Math.random() * 250) }; req.socket = {};
  let out = '', code = 200; const res = { statusCode: 200, setHeader() {}, end(b) { out = b; code = this.statusCode; } };
  await handler(req, res);
  try { return JSON.parse(out); } catch { return { raw: out, code }; }
}
const LONG = '예식 150일 전까지는 위약금 없이 해제할 수 있어요. 그 뒤로는 시기별 위약금이 붙어요. 자세한 표는 계약서 9조에 있어요. 다만 예식일을 바꾸신 적이 있으면 그때 구';
const r1 = await ask('max_tokens', LONG + '[[ESCA');
ok('④ max_tokens 에서 끊긴 답 → 마지막 온전한 문장까지 · 반쪽 표식 없음 · 상담사 연결', r1.reply === '예식 150일 전까지는 위약금 없이 해제할 수 있어요. 그 뒤로는 시기별 위약금이 붙어요. 자세한 표는 계약서 9조에 있어요.' && r1.escalate === true && r1.toBooking === false, r1);
const r2 = await ask('end_turn', '예식 150일 전까지는 위약금 없이 해제할 수 있어요.');
ok('④ 끊기지 않은 답은 그대로 · 상담사 연결 없음', r2.reply === '예식 150일 전까지는 위약금 없이 해제할 수 있어요.' && r2.escalate === false, r2);
ok('④ MAX_TOKENS 1000', /const MAX_TOKENS = 1000;/.test(rd('api/advisor.js')));
{ // 깨 보기 — stop_reason 을 안 보는 옛 꼴
  const tmp = path.join(path.dirname(new URL(import.meta.url).pathname), '.rule-audit-advisor-mut.cjs');
  fs.writeFileSync(tmp, rd('api/advisor.js').replace("data.stop_reason === 'max_tokens'", "false").replace(/require\('\.\/_/g, "require('" + path.join(ROOT, 'api') + "/_"));
  let r3; try { r3 = await ask('max_tokens', LONG + '[[ESCA', tmp); } finally { fs.unlinkSync(tmp); }
  ok('④ 깨 보기: 끊김을 안 보는 옛 꼴이면 반쪽 문장이 남아 위 검사가 빨강이 된다', r3 && r3.reply !== r1.reply, r3);
}

// ⑤
ok('⑤ 하객 사진 80% · 가득 관리자 메일 문장(예식당 칸마다 한 번 · GPALERT_<토큰>)', /\[GP_FILL_ALERT_1107/.test(rd('automation/platform/80_production.gs')) && /'GPALERT_' \+ token/.test(rd('automation/platform/80_production.gs')) && /Math\.ceil\(GP_MAX_FILES \* 0\.8\)/.test(rd('automation/platform/80_production.gs')));

console.log(fail ? `━━ rule-audit-1107 — 빨강 ${fail}건 [RULE_AUDIT_1107]` : '━━ rule-audit-1107 — 통과 · ① 닿았을 때만 통지 · 실패 알림 · 다음 날 다시 · ② 하객 사진 한 줄 · ③ 시각 칸 · ④ 잘린 답 · ⑤ 가득 알림 · 깨 보기 둘 [RULE_AUDIT_1107]');
process.exit(fail ? 1 : 0);
