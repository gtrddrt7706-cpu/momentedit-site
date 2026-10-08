#!/usr/bin/env node
/* ★★[ERR_CODES · ERR_CODE_GAS 2026-10-07 사장님 «스크린샷이나 고객이 알려 주는 오류 코드로 관리자가 어떤 문제인지 알 수 있게 · 전부 개선»]
   오류 코드 장치가 한 몸으로 도는지 잰다(브라우저 없이).
   ① 코드 표(assets/err-codes.js) — 숫자 0~9 마다 «무슨 일 · 할 일» · M(기기)은 자기 뜻이 있는 번호만 · explain 이 그대로 풀어 준다
   ② 서버(95_notify ERR_AREA)의 자리 글자가 표에 다 있다 · 라우터(doPost · jsonOut)가 도장을 거친다 · 관리자 화면이 표 · adminErrLog 를 쓴다
   ③ 고객 면 · 서버 · api 에 박힌 «(코드 X#)» · ecode:'X#' · «'(코드 V'+n+')'» 같은 조립이 표에 있는 글자 · 숫자다
   ④ 서버 도장(_errStamp)을 가짜 GAS 로 돌린다 — 로그인 까닭 → 8 · 잠금 문구 → 1 · 핸들러 ecode 그대로 · 0 은 글에 안 붙인다 · 영문 글엔 안 붙인다 ·
      두 번 붙이지 않는다 · 내부 까닭(_why)은 지운다 · 사고번호는 코드 옆에 · 관리자 · 기록용 호출은 도장 없음 · 모르는 동작 글자 X
   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

/* ① 코드 표 */
const ctx1 = { window: {} }; vm.createContext(ctx1); vm.runInContext(rd('assets/err-codes.js'), ctx1);
const E = ctx1.window.ME_ERR;
ok('① 코드 표가 읽힌다(window.ME_ERR · area · kind · note · explain)', !!(E && E.area && E.kind && E.note && typeof E.explain === 'function'));
const kindsOk = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => Array.isArray(E.kind[n]) && E.kind[n].length === 2 && E.kind[n].every((t) => typeof t === 'string' && t.length > 4));
ok('① 숫자 0~9 마다 [무슨 일, 할 일]', kindsOk);
const mNotes = Object.keys(E.note).filter((k) => k[0] === 'M');
ok('① M(기기) 번호는 자기 뜻이 있다([무슨 일, 할 일]) · 1~7', mNotes.length >= 7 && mNotes.every((k) => Array.isArray(E.note[k]) && E.note[k].length === 2), mNotes.join(','));
const ex = E.explain('s6'), exM = E.explain('M1'), exBad = E.explain('M9'), exNo = E.explain('Q1');
ok('① explain — «s6» 저장 · 연결 끊김 / M1 마이크 허락 / M9 · Q1 은 모름(null)', ex && ex.code === 'S6' && /연결/.test(ex.what) && /저장/.test(ex.area) && exM && /마이크/.test(exM.what) && exBad === null && exNo === null, JSON.stringify([ex, exM, exBad, exNo]));
const allTxt = JSON.stringify(E.area) + JSON.stringify(E.kind) + JSON.stringify(E.note);
ok('① 표 글에 전각 줄표 · 장식 이모지 없음', !/[—\u{1F300}-\u{1FAFF}]/u.test(allTxt));

/* ② 서버 · 라우터 · 관리자 연결 */
const nf = rd('automation/platform/95_notify.gs'), cb = rd('automation/consultation/consultation-booking.gs'), adm = rd('admin.html'), admGs = rd('automation/admin/admin.gs');
const areaSrc = (nf.match(/var ERR_AREA = \{([\s\S]*?)\n\};/) || [])[1] || '';
const gasLetters = [...areaSrc.matchAll(/^\s*([A-Z]):/gm)].map((m) => m[1]);
ok('② 서버 자리 글자(ERR_AREA)가 표에 다 있다', gasLetters.length >= 10 && gasLetters.every((l) => E.area[l]), gasLetters.join(''));
ok('② 라우터 — doPost 가 동작을 쥐고(__ERR_ON) jsonOut 이 _errStamp 를 거친다 · 내부 까닭은 안 나간다', /__ERR_ON = true; __ERR_ACT = action;/.test(cb) && /if \(__ERR_ON && obj && obj\.ok === false && typeof _errStamp === 'function'\)/.test(cb) && /delete obj\._why/.test(cb));
ok('② 라우터 변수는 라우터 파일에 있다(95_notify 를 안 붙인 판에서도 jsonOut 이 죽지 않게)', /^var __ERR_ON = false, __ERR_ACT = '', __ERR_TOK = '';/m.test(cb) && !/^var __ERR_ON/m.test(nf));
ok('② 관리자 — 표를 읽고(err-codes.js) · 검색창 코드 찾기(_errSearch) · 고객 상세 최근 실패(adminErrLog) · adminCall 에 등록', /src="\/assets\/err-codes\.js"/.test(adm) && /function _errSearch\(q\)/.test(adm) && /gas\('adminErrLog',code,8\)/.test(adm) && /adminErrLog: adminErrLog,/.test(admGs));

/* ③ 박힌 코드가 표에 있다 */
const files = []; const walk = (d) => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const p = path.join(d, f), st = fs.statSync(path.join(ROOT, p)); if (st.isDirectory()) { if (!/^(node_modules|\.git|contract|docs|타입캐스트|automation\/tests|scripts)$/.test(p) && !/^\./.test(f)) walk(p); } else if (/\.(html|js|mjs|gs)$/.test(f)) files.push(p); } };
walk('.');
const bad = [], seen = new Set();
for (const f of files) { if (/^scripts\//.test(f)) continue; const s = rd(f);
  for (const m of s.matchAll(/코드 ([A-Z])(\d)(?!\d)/g)) { const c = m[1] + m[2]; seen.add(c); if (!E.explain(c)) bad.push(f + ' ' + c); }
  for (const m of s.matchAll(/ecode:\s*'([A-Z])(\d)'/g)) { const c = m[1] + m[2]; seen.add(c); if (!E.explain(c)) bad.push(f + ' ecode ' + c); }
  for (const m of s.matchAll(/\(코드 ([A-Z])'\s*\+/g)) { seen.add(m[1] + '*'); if (!E.area[m[1]]) bad.push(f + ' 조립 ' + m[1]); } }
ok(`③ 박힌 코드가 표에 다 있다(${seen.size}가지)`, !bad.length, bad.slice(0, 8).join(' | '));

/* ④ 서버 도장을 가짜 GAS 로 */
const blk = nf.slice(nf.indexOf("var ERR_LOG_SHEET = '오류기록';"));
const rec = [];
const g = {
  console, Math, JSON, String, Date, RegExp,
  __ERR_ACT: '', __ERR_TOK: '',
  Utilities: { computeDigest: () => [1, 2, 3], base64EncodeWebSafe: () => 'k'.repeat(30), formatDate: () => '2026-10-07', DigestAlgorithm: {}, Charset: {} },
  CacheService: { getScriptCache: () => ({ get: () => null, put: () => {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
  SpreadsheetApp: { getActive: () => ({ getSheetByName: () => ({ appendRow: (r) => rec.push(r), getLastRow: () => 3, deleteRows: () => {} }), insertSheet: () => ({}) }) },
  fmtKST: () => '2026-10-07 23:00', _nfAdminLineEmail: () => {}, findCustomerByToken: () => null, _findCustomerBy: () => null,
  _gsr_: () => {}   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안
};
vm.createContext(g); vm.runInContext(blk, g);
const st = (act, o) => { g.__ERR_ACT = act; return g._errStamp(JSON.parse(JSON.stringify(o))); };
const r1 = st('saveProductionTrack', { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' });
ok('④ 로그인 까닭 → S8 · 글 끝에 «(코드 S8)»', r1.ecode === 'S8' && /\(코드 S8\)$/.test(r1.error), JSON.stringify(r1));
const r2 = st('signContract', { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' });
ok('④ 잠금 대기 문구 → C1', r2.ecode === 'C1' && /\(코드 C1\)$/.test(r2.error), JSON.stringify(r2));
const r3 = st('voiceClone', { ok: false, down: true, kind: 'plan', http: 402, ecode: 'V2', _why: 'credit', error: '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요' });
ok('④ 핸들러 ecode(V2) 그대로 · 내부 까닭(_why)은 지운다 · 기록에 HTTP', r3.ecode === 'V2' && /\(코드 V2\)$/.test(r3.error) && r3._why === undefined && rec.some((x) => x[2] === 'V2' && /credit/.test(x[6]) && /HTTP 402/.test(x[7])), JSON.stringify(r3));
const r4 = st('signContract', { ok: false, error: '서명할 계약서가 없습니다. (디렉터 발송 후 진행됩니다)' });
ok('④ 그 밖(0)은 글에 안 붙이고 ecode 칸에만(C0)', r4.ecode === 'C0' && !/코드/.test(r4.error), JSON.stringify(r4));
const r5 = st('guestLetter', { ok: false, ecode: 'G9', eid: 'K7QA', error: 'INTERNAL_ERROR' });
ok('④ 영문 글(INTERNAL_ERROR)엔 안 붙인다 · ecode 는 그대로', r5.error === 'INTERNAL_ERROR' && r5.ecode === 'G9', JSON.stringify(r5));
const r6 = st('getMyState', { ok: false, ecode: 'L9', eid: 'K7QA', error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' });
ok('④ 9 는 사고번호와 함께 «(코드 L9 · K7QA)»', /\(코드 L9 · K7QA\)$/.test(r6.error), JSON.stringify(r6));
const r7 = st('ritualFile', { ok: false, ecode: 'U4', error: '파일을 저장하지 못했어요. 다시 눌러 주세요. (코드 U4)' });
ok('④ 이미 코드가 있으면 두 번 붙이지 않는다', (r7.error.match(/코드/g) || []).length === 1, JSON.stringify(r7));
const r8 = st('adminCall', { ok: false, error: '로그인이 필요합니다. (관리자 전용)', _why: 'x' });
ok('④ 관리자 · 기록용 호출은 도장 없음(까닭은 그래도 지운다)', r8.ecode === undefined && !/코드/.test(r8.error) && r8._why === undefined, JSON.stringify(r8));
ok('④ 모르는 동작 → X · 빈 동작(상담 신청 글) → B', g._errArea('somethingNew') === 'X' && g._errArea('') === 'B' && g._errArea('voiceClone') === 'V');
const r9 = st('cardConfirm', { ok: false, reason: 'weird', error: '결제 정보가 올바르지 않습니다.' });
ok('④ 로그인과 무관한 reason 은 8 이 아니다', r9.ecode === 'P0', JSON.stringify(r9));

/* ⑤ [ERR_NO_DOT · ERR_AREA_SIGNUP_B · ADMIN_EXC_WHY · ERR_STATE_QUIET 2026-10-08 점검] */
const q1 = st('signup', { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' });
ok('⑤ 신청서 보내기(signup)는 B — 같은 신청 화면의 B5 · B6 과 한 글자', q1.ecode === 'B1' && g._errArea('signup') === 'B' && g._errArea('login') === 'L', JSON.stringify(q1));
const q2 = st('getMyState', { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' });
ok('⑤ 코드 앞 끝 마침표를 걷는다 «…로그인해 주세요 (코드 L8)»', q2.error === '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요 (코드 L8)', q2.error);
const n0 = rec.length; const q3 = st('adminCall', { ok: false, ecode: 'X9', eid: 'AB23', _why: 'TypeError: x', error: '서버에서 오류가 났어요 · TypeError: x' });
ok('⑤ 관리자 동작의 예상 못 한 오류(9)는 오류기록에 남는다(사고번호로 찾게) · 9 가 아닌 관리자 실패는 여전히 안 남긴다', rec.length === n0 + 1 && /AB23/.test(q3.error) && (st('adminCall', { ok: false, error: '로그인이 필요합니다.' }), rec.length === n0 + 1), JSON.stringify(q3));
const n1 = rec.length; const q4 = st('seatView', { ok: false, mineOnly: true, error: '내 자리만 보여 드려요' });
ok('⑤ «내 자리만»은 실패가 아니다 — 오류기록에 안 남는다', rec.length === n1 && !q4.ecode, JSON.stringify(q4));
const q5 = st('ritualFileGet', { ok: false, error: '파일을 열지 못했어요.' }), q6 = st('login', { ok: false, error: '개인코드(이메일) 또는 비밀번호가 올바르지 않습니다.' });
ok('⑤ [ERR_FAILISH_4] ecode 없는 «…하지 못했어요»는 4 로 코드가 붙는다 · 입력 확인(비밀번호 틀림)은 0 · 코드 안 붙음', q5.ecode === 'L4' && q5.error === '파일을 열지 못했어요 (코드 L4)' && q6.ecode === 'L0' && !/\(코드/.test(q6.error), JSON.stringify([q5, q6]));
{ const CB = rd('automation/consultation/consultation-booking.gs'); const m = /if \(p && p\.action === 'getCouple'\) \{[^\n]*GETCOUPLE_JSON_ERR[\s\S]{0,900}?return jsonOut\(\{[^\n]*\}\);/.exec(CB);
  ok('⑤ [GETCOUPLE_CONTRACT] 청첩장 조회 예외는 error: \'INTERNAL_ERROR\' — 하객 화면이 서버 사고와 «없는 예식»을 이 글로 가른다', !!m && /error: 'INTERNAL_ERROR'/.test(m[0]) && /ecode: 'G'/.test(m[0]), m ? m[0].slice(-160) : '블록 없음'); }
const SRC_NF = rd('automation/platform/95_notify.gs');
ok('⑤ 사고번호 찾기는 시트 전체(eid 면 2행부터)', /from = eid \? 2 : Math\.max\(2, last - 2999\)/.test(SRC_NF));

console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
