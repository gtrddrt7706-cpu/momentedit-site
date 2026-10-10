#!/usr/bin/env node
/* ★★[R7_SERVER 2026-10-09 고객 여정 A~Z 점검 2라운드 · 서버] 고친 자리를 «동작»으로 잰다(브라우저 없이 · 원문 조각을 vm 으로).
   E2-9  [CT_RESEND_LOCK]  계약서 재발송 요청 — 읽고 적기는 잠금 안에서 · 잠금을 못 잡으면 C1 «다른 처리가 진행 중이에요» · 아무것도 안 적고 안 알린다
   A2-15 [RITUAL_CAP_OWN · PROD_CAP_WORDS]  식순 12,000자 상한은 옛 한 칸(tx 로 다시 짓는 사본)을 빼고 잰다 · 거절 글은 «글이 너무 길어요 · ○○ 글을 조금 줄여 주세요 (코드 S0)»(비교 안 되는 숫자 없음)
   D2-4  [PHONE_LEN_SRV]   연락처 느슨한 받침 — 국내 0… 9~11자리 · +82 는 0 으로 같게 · 그 밖 + 국제 8~15자리 · 신청(B0) · 계약 요청 신랑 · 신부(C0)
   E2-3 · E2-4 화면 [RF_DEL_TQ · RF_DEL_KEEP · RF_AIBACK_DROP]  빌더가 줄 파일 지우기에 누른 때(t) · 되돌리기로 쓸 녹음(keep)을 싣고 · 버린 AI 테이크는 서버 · 중계가 keep 을 알 때만 지운다
   목소리 쪽(E2-2 · E2-5 · E2-6 · E2-10 · E2-11 · 줄 파일 지우기 서버)은 vc-del-stop.mjs 가 잰다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const grabWin = (src, name) => { const i = src.indexOf('window.' + name + '=function('); if (i < 0) return '';   // window.이름=function(…){…} — 빌더의 공개 단추 함수
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1) + ';'; } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
let bad = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + d)); if (!c) bad++; };
const runIn = (src, sb) => { vm.createContext(sb); try { vm.runInContext(src, sb); } catch (e) { return String(e && e.message || e); } return ''; };

/* ── E2-9 [CT_RESEND_LOCK] ── */
const JN = rd('automation/platform/70_journey.gs');
function resendWorld(lockFail) {
  const props = {}, sent = [], log = []; let held = 0;
  const sb = { _gsr_() {}, Date, String, JSON, Math,
    resolveSession: () => ({ ok: true, row: { get: (h) => (h === '개인코드' ? 'ME0001' : h === '계약상태' ? '발송' : h === '예식일' ? '2026-12-12' : '') } }), _sessionMsg: () => '',
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => { log.push('get' + (held ? ' 잠금 안' : ' 잠금 밖')); return k in props ? props[k] : null; }, setProperty: (k, v) => { log.push('set' + (held ? ' 잠금 안' : ' 잠금 밖')); props[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { if (lockFail) throw new Error('Lock timeout'); held++; }, tryLock: () => !lockFail, releaseLock: () => { held = Math.max(0, held - 1); } }) },
    fmtKST: () => '2026-10-09 12:00', _recordHandler: () => {}, notifyStudio: () => sent.push('studio'), notifyKakao: () => sent.push('kakao'), _ymdOf: (v) => v };
  const err = runIn(grabIn(JN, 'handleRequestContractResend'), sb);
  return { sb, props, sent, log, err, held: () => held };
}
{ const W = resendWorld(true); const r = W.err ? { err: W.err } : W.sb.handleRequestContractResend({ token: 'T' });
  ok('E2-9 ① 잠금을 못 잡으면 C1 «다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요» · 요청 시각을 안 적고 · 알림 0', r.ok === false && r.ecode === 'C1' && r.error === '다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요' && !W.props.CTRESEND_ME0001 && W.sent.length === 0, JSON.stringify({ r, props: W.props, sent: W.sent })); }
{ const W = resendWorld(false); const r1 = W.err ? { err: W.err } : W.sb.handleRequestContractResend({ token: 'T' }); const r2 = W.err ? {} : W.sb.handleRequestContractResend({ token: 'T' });
  ok('E2-9 ② 잠금 안에서 읽고 적는다 · 알림은 한 번 · 다시 누르면 «이미 요청함» · 잠금을 풀고 끝', r1.ok && !r1.already && r2.ok && r2.already && W.sent.length === 2 && W.log.filter((x) => /^set/.test(x)).length === 1 && W.log.every((x) => / 잠금 안$/.test(x)) && W.held() === 0, JSON.stringify({ r1, r2, sent: W.sent, log: W.log })); }

/* ── A2-15 [RITUAL_CAP_OWN · PROD_CAP_WORDS] ── */
const PR = rd('automation/platform/80_production.gs'), NT = rd('automation/platform/95_notify.gs');
const ERR_AREA_SRC = (() => { const i = NT.indexOf('var ERR_AREA = {'); if (i < 0) return ''; let d = 0; for (let k = NT.indexOf('{', i); k < NT.length; k++) { if (NT[k] === '{') d++; else if (NT[k] === '}') { d--; if (!d) return NT.slice(i, k + 1) + ';'; } } return ''; })();
const capSrc = [lineIn(PR, /var PROD_CAP = [^\n]*/), lineIn(PR, /var TX_MERGE_LEG = [^\n]*/), lineIn(PR, /var TRACK_LABEL_KO = [^\n]*/), ERR_AREA_SRC, grabIn(NT, '_errArea'),
  grabIn(PR, '_prodTooLong_'), grabIn(PR, '_ritualCapLen_'), grabIn(PR, '_ritualLegLen_'), grabIn(PR, '_prodTrackPack'), grabIn(PR, '_prodPack')].join('\n');
const C = { JSON, Math, Object, String, _gsr_() {}, __ERR_ACT: 'saveProductionTrack', PROD_META_KEYS: ['base'], PROD_META_COL: '제작_meta', PROD_TRACK_COL: { ritual: '제작_ritual', dining: '제작_dining' }, _prodNewCols: () => [] };
const capErr = runIn(capSrc, C);
const L = (n) => '가'.repeat(n);
const two = (n) => ({ _v: 3, S: { tx: { 'letter.g': L(n), 'letter.b': L(n) }, letterText: '신랑 · ' + L(n) + '\n\n신부 · ' + L(n) }, summary: {} });
const has = (f) => typeof C[f] === 'function';
ok('A2-15 ⓪ 도우미가 있다(_prodTooLong_ · _ritualCapLen_ · _ritualLegLen_)', !capErr && has('_prodTooLong_') && has('_ritualCapLen_') && has('_ritualLegLen_'), capErr || 'missing');
if (has('_ritualCapLen_') && has('_prodPack')) {
  const d5 = two(5000), j5 = JSON.stringify(d5).length, c5 = C._ritualCapLen_(d5), pk5 = C._prodPack({ ritualDraft: d5 }, { track: 'ritual' });
  ok('A2-15 ① 편지 둘 각 5,000자 — 잰 길이는 옛 칸(letterText)을 뺀 값 · 저장된다 · 저장 꼴은 옛 칸까지 그대로', j5 > 20000 && c5 < 12000 && j5 - c5 > 10000 && !pk5.err && /letterText/.test(pk5.cols['제작_ritual'] || ''), JSON.stringify({ j5, c5, err: pk5.err }));
  const d6 = two(6100), pk6 = C._prodPack({ ritualDraft: d6 }, { track: 'ritual' });
  ok('A2-15 ② 편지 둘 각 6,100자 — 거절 «글이 너무 길어요 · 서약 · 편지 글을 조금 줄여 주세요 (코드 S0)»', pk6.err === '글이 너무 길어요 · 서약 · 편지 글을 조금 줄여 주세요 (코드 S0)', pk6.err);
  const old = { _v: 3, S: { letterText: L(13000) } }, pkO = C._prodPack({ ritualDraft: old }, { track: 'ritual' });
  ok('A2-15 ③ tx 에 짝이 없는 옛 칸(옛 빌더 초안)은 그 글이 원본이라 센다 — 13,000자면 거절', C._ritualCapLen_(old) > 12000 && !!pkO.err, JSON.stringify({ len: C._ritualCapLen_(old), err: pkO.err }));
  const dn = { memo: L(12500) }, pkD = C._prodPack({ diningDraft: dn }, { track: 'dining' });
  ok('A2-15 ④ 다른 칸 상한 글도 숫자 없이(«현재 약 · 최대 N자» 없음) — 애프터 웨딩', pkD.err === '글이 너무 길어요 · 애프터 웨딩 글을 조금 줄여 주세요 (코드 S0)' && !/\d{3}/.test(pkD.err.replace(/\(코드 [A-Z]\d\)/, '')), pkD.err);
  C.__ERR_ACT = 'snapRefUpload'; const pkU = C._prodPack({ diningDraft: dn }, { track: 'dining' }); C.__ERR_ACT = 'saveProductionTrack';
  ok('A2-15 ⑤ 코드 글자는 부른 동작의 자리(올리기 → U0)', /\(코드 U0\)$/.test(pkU.err || ''), pkU.err);
  const big = two(9000), pkP = C._prodPack({ ritualDraft: two(5000), _prev: { track: 'ritual', at: 'x', draft: big } }, { track: 'ritual' });
  ok('A2-15 ⑥ 직전본(_prev)이 셀 한도를 밀면 백업만 뺀다 — 고객 글은 저장(셀 45,000 안)', !pkP.err && (pkP.cols['제작_ritual'] || '').length < 45000 && !/"_p":/.test(pkP.cols['제작_ritual'] || ''), JSON.stringify({ err: pkP.err, len: (pkP.cols['제작_ritual'] || '').length }));
}
{ const h = grabIn(PR, 'handleSaveProductionTrack');
  ok('A2-15 ⑦ 저장 앞 조기 검사도 같은 자(_ritualCapLen_) · 옛 숫자 글 없음', /_ritualCapLen_\(\(body && body\.draft\) \|\| \{\}\)/.test(h) && /_dcN > 12000/.test(h) && !/현재 약 ' \+/.test(h) && !/최대 12,000자/.test(h), 'handleSaveProductionTrack 조기 검사 모양'); }
ok('A2-15 ⑧ 80_production 어디에도 «현재 약 N자 · 최대» 거절 글이 남지 않았다', !/현재 약 ' \+/.test(PR), (PR.match(/[^\n]*현재 약 ' \+[^\n]*/) || [''])[0].slice(0, 120));

/* ── D2-4 [PHONE_LEN_SRV] ── */
const PC = rd('automation/platform/00_platform-config.gs'), SG = rd('automation/platform/40_signup.gs'), AD = rd('automation/admin/admin.gs');
const P = { _gsr_() {}, String, Logger: { log() {} } };
const phErr = runIn([grabIn(PC, '_phoneKR'), grabIn(PC, '_phoneLenOk_'), grabIn(SG, 'handleSignup')].join('\n'), P);
ok('D2-4 ⓪ _phoneLenOk_ 가 있다', !phErr && typeof P._phoneLenOk_ === 'function', phErr || 'missing');
if (typeof P._phoneLenOk_ === 'function') {
  const cases = [['010-1234-5678', 1], ['02-123-4567', 1], ['031-123-4567', 1], ['070-1234-5678', 1], ['0505-123-4567', 1], ['+82 10-1234-5678', 1], ['+82 010-1234-5678', 1], ['0082 10 1234 5678', 1], ['+82 2-123-4567', 1], ['8210 1234 5678', 1],
    ['+1 415 555 0100', 1], ['+44 20 7946 0958', 1], ['', 0], ['010-123', 0], ['010-1234-56789', 0], ['1012345678', 0], ['821 0734 9770', 0], ['+82 10-1234-567890', 0], ['+1 234', 0], ['+1234567890123456', 0], ['abc', 0]];
  const miss = cases.filter(([v, e]) => !!P._phoneLenOk_(v) !== !!e).map(([v]) => v);
  ok('D2-4 ① 국내 9~11 · +82 는 0 으로 같게 · 그 밖 + 8~15 · «+» 없는 82 는 되살린 꼴 · 21가지', !miss.length, JSON.stringify(miss));
}
{ const sg = (phone) => { try { P.handleSignup({ groom: '김신랑', bride: '이신부', email: 'a@b.co', phone }); return ''; } catch (e) { return String(e && e.message); } };
  const b1 = sg('010-123'), b2 = sg('010-1234-56789'), g1 = sg('010-1234-5678'), g2 = sg('+1 415 555 0100');
  ok('D2-4 ② 신청 — 짧거나 긴 번호는 «연락처를 다시 확인해 주세요.»(B0) · 맞는 번호는 다음 칸(비밀번호)으로', b1 === '연락처를 다시 확인해 주세요.' && b2 === b1 && g1 === '예약 조회용 비밀번호를 입력해 주세요.' && g2 === g1, JSON.stringify({ b1, b2, g1, g2 })); }
{ const K = { _gsr_() {}, String, Date, JSON, Math, Object, Number, Utilities: { formatDate: () => '2026-10-09' }, WEDDING_SLOT: { SLOTS: ['09:00', '12:20', '15:40'] },
    resolveSession: () => ({ ok: true, row: { get: (h) => (h === '개인코드' ? 'ME0001' : '') } }), _sessionMsg: () => '', lockBusySignal() {},
    LockService: { getScriptLock: () => ({ waitLock: () => { throw new Error('Lock timeout'); }, releaseLock() {} }) } };
  const kErr = runIn([grabIn(PC, '_phoneKR'), grabIn(PC, '_phoneLenOk_'), grabIn(PC, '_crKR'), grabIn(AD, '_kstYmd'), grabIn(AD, '_ymdNum'), grabIn(JN, '_birthBad'), grabIn(JN, '_crNum'), lineIn(JN, /var CR_BAD_MSG[^\n]*/), grabIn(JN, '_crOk'), grabIn(JN, '_crReject'), grabIn(JN, 'handleRequestContract')].join('\n'), K);
  const rc = (gp, bp) => { try { return K.handleRequestContract({ token: 'T', info: { weddingDate: '2027-05-01', weddingTime: '12:20', groomBirth: '1995-03-03', brideBirth: '1996-04-04', groomAddr: '서울', brideAddr: '서울', consent: true, groomPhone: gp, bridePhone: bp } }); } catch (e) { return { thrown: String(e && e.message) }; } };
  const g = rc('010-12', ''), b = rc('', '+82 10-1234-567890'), o = rc('010-1234-5678', '+1 415 555 0100'), e = rc('', '');
  ok('D2-4 ③ 계약 요청(입력 정보 수정) — 신랑 · 신부 연락처 길이 거절(C0 · 누구 칸인지) · 맞거나 빈 칸은 다음 단계(잠금)로', !kErr && g.error === '신랑 연락처를 다시 확인해 주세요.' && b.error === '신부 연락처를 다시 확인해 주세요.' && /서버 혼잡/.test(o.error || '') && /서버 혼잡/.test(e.error || ''), JSON.stringify({ kErr, g, b, o, e })); }

/* ── E2-3 · E2-4 화면 [RF_DEL_TQ · RF_DEL_KEEP · RF_AIBACK_DROP] — 빌더(order-preview.html) ── */
const OP = rd('order-preview.html');
function builder(st) {
  const msgs = [], dels = [];
  const B = { S: { up: {}, upPrev: {} }, VC: { stLast: st || null }, RF_DELQ: {}, MK: { lineErr: {} }, MK_FAILED: {}, EMBED: true, RF_URL: {}, Date, JSON, Object, Array, String, Math, URL: { revokeObjectURL() {} },
    _rfDel: (id) => dels.push(id), _fAt() {}, _persist() {}, render() {}, _rfDelDone() {}, parent: { postMessage: (m) => msgs.push(JSON.parse(JSON.stringify(m))) } };
  B.window = { location: { origin: 'https://x' } };
  const err = runIn([grabIn(OP, '_rfDelSend'), grabIn(OP, '_mkUpDrop'), grabIn(OP, '_rfKeepOk'), grabIn(OP, '_mkUpDelGo'), grabWin(OP, 'mkAiBack')].join('\n'), B);
  return { B, msgs, dels, err };
}
const R0 = { id: 'R_FILE_0000001', src: 'rec' }, N0 = { id: 'N_FILE_0000002', src: 'ai' };
{ const W = builder({ ok: true, rfkeep: 1, rk: 1 }); W.B.S.up.g1 = N0; W.B.S.upPrev.g1 = R0; if (!W.err) W.B._mkUpDrop('g1'); const m = (W.msgs[0] || {}).data || {};
  ok('E2-4 화면 ① 줄 AI 내려놓기(_mkUpDrop) — «되돌리기»로 쓸 녹음을 keep 으로 · all 없음', !W.err && m.id === N0.id && m.all === 0 && JSON.stringify(m.keep) === JSON.stringify([R0.id]) && W.B.S.up.g1 === 0 && !!W.B.S.upPrev.g1, JSON.stringify({ err: W.err, m })); }
{ const W = builder({ ok: true, rfkeep: 1, rk: 1 }); W.B.S.up.g1 = N0; W.B.S.upPrev.g1 = R0; if (!W.err) W.B.window.mkAiBack('g1'); const m = (W.msgs[0] || {}).data || {};
  ok('E2-3 화면 ② «되돌리기» — 버린 AI 테이크를 지운다(keep = 되돌린 녹음) · 줄은 녹음으로', !W.err && W.msgs.length === 1 && m.id === N0.id && m.all === 0 && JSON.stringify(m.keep) === JSON.stringify([R0.id]) && W.B.S.up.g1 === R0 && !W.B.S.upPrev.g1 && W.dels.indexOf(N0.id) > -1, JSON.stringify({ err: W.err, msgs: W.msgs })); }
{ const W1 = builder({ ok: true, rfkeep: 1 }), W2 = builder({ ok: true, rk: 1 }), W3 = builder(null);
  [W1, W2, W3].forEach((W) => { W.B.S.up.g1 = N0; W.B.S.upPrev.g1 = R0; if (!W.err) W.B.window.mkAiBack('g1'); });
  ok('E2-3 화면 ③ 서버(rfkeep) · 중계(rk) 가운데 하나라도 keep 을 모르면 «되돌리기»는 지우기를 보내지 않는다(되돌린 녹음까지 쓸어 가지 않게) · 줄은 녹음으로', [W1, W2, W3].every((W) => !W.err && W.msgs.length === 0 && W.B.S.up.g1 === R0), JSON.stringify([W1.msgs, W2.msgs, W3.msgs, W1.err])); }
{ const W = builder({ ok: true, rfkeep: 1, rk: 1 }); W.B.S.up.g1 = N0; W.B.S.upPrev.g1 = R0; const t0 = Date.now(); if (!W.err) W.B._mkUpDelGo('g1'); const m = (W.msgs[0] || {}).data || {};
  ok('E2-3 화면 ④ 줄 «지우기» — all 과 누른 때(t)를 싣는다 · 되돌리기 표(upPrev)를 걷는다(휴지통 파일을 가리키지 않게)', !W.err && m.id === N0.id && m.all === 1 && m.t >= t0 && m.t <= Date.now() && W.B.S.up.g1 === 0 && !W.B.S.upPrev.g1, JSON.stringify({ err: W.err, m, prev: W.B.S.upPrev })); }
{ const W = builder({ ok: true, rfkeep: 1, rk: 1 }); if (!W.err) { W.B._rfDelSend('g1', N0.id, null, 0, [R0.id]); W.B._rfDelSend('g1', N0.id, null); }
  const m2 = (W.msgs[1] || {}).data || {};
  ok('E2-4 화면 ⑤ 3초 뒤 다시 묻기도 같은 keep(빠지면 다시 묻기가 녹음을 쓸어 간다)', !W.err && W.msgs.length === 2 && JSON.stringify(m2.keep) === JSON.stringify([R0.id]) && m2.all === 0, JSON.stringify(W.msgs)); }
{ const MP = rd('mypage.html');
  ok('E2-3 · E2-4 마이페이지 중계 — 지우기는 t · keep 을 서버로 · 목소리 답에 rk:1(빌더가 keep 을 넘기는 중계인지 안다)', /t:\(_isDel&&\+d\.data\.t>0\)\?\+d\.data\.t:0, keep:\(_isDel&&Array\.isArray\(d\.data\.keep\)\)\?d\.data\.keep\.slice\(0,8\)\.map\(String\):\[\]/.test(MP) && /type:'momentedit:voiceCloneDone', rid:d\.data\.rid, rk:1\}/.test(MP), 'mypage.html 중계 두 줄'); }

console.log(bad ? '━━ r7-server — 빨강 ' + bad + '건 [R7_SERVER]' : '━━ r7-server — 통과 · 재발송 잠금 · 식순 상한(옛 칸 빼고 · 숫자 없는 글) · 연락처 받침 · 줄 파일 지우기 화면(누른 때 · keep · 버린 AI 테이크) [R7_SERVER]');
process.exit(bad ? 1 : 0);
