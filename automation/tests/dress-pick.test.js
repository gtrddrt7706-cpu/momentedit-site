/**
 * Moment Edit · «시착 준비» 서버 검증 [DRESS_PICK 2026-10-23 코워크 설계 명세 8장] — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   저장 길(세션 · 시그니처 · 신청접수 ~ 상담확정 [DRESS_APPLY_OPEN] · 상담일 −2일 23:59 마감(날짜가 없으면 마감 없음 [DRESS_NO_DATE]) · 0~2벌(0 = 비우기 [DRESS_CLEAR]) · 남길 말 200자 · 한 시간 30번) ·
 *   칸이 없으면 맨 뒤에 한 번 붙이기 · 읽기(_dressState_ · 깨진 값은 null) · 스튜디오 한 줄 · 확정 메일 한 줄(스위치 · 시그니처 · 의상 · 0벌만 [DRESS_CONFIRM_ZERO]) ·
 *   신청 접수 메일 한 줄(40_signup sendSignupEmail_ · [DRESS_SIGNUP_MAIL]) ·
 *   아침 보고 «내일 상담 · 준비할 드레스»(같은 날 겹침 · 남긴 말).
 * 실행: node automation/tests/dress-pick.test.js
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { loadGas } from '../../scripts/audit/gas-lint.mjs';

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const ymd = (days) => new Date(Date.now() + 9 * 3600e3 + days * 864e5).toISOString().slice(0, 10);

/* 가짜 시트 — 상담예약(머리줄 · 2행 한 줄) · 고객은 행 객체만 */
const HEAD0 = vm.runInContext('HEADERS', sb).filter((h) => h !== '시착준비');   // const 라 전역 속성이 아니다 — 문맥 안에서 읽는다   // 운영 시트처럼 «시착준비» 칸이 아직 없는 상태에서 시작
let SH, CUST, CACHE, MAIL, FETCH;
const fresh = (o) => {
  o = o || {};
  SH = { H: HEAD0.slice(), R: {} };
  const rowArr = SH.H.map((h) => ({ '상태': o.status || '확정', '선택날짜': o.date != null ? o.date : ymd(o.days == null ? 5 : o.days), '선택시간': '14:50', '개인코드': 'C1', '성함(신랑)': '정희준', '성함(신부)': '미쿠', '의상': o.attire || '대여 희망 · 2벌', '이메일': 'a@b.c', '토큰': 'tk' }[h] || ''));
  SH.R[2] = rowArr;
  CUST = { '개인코드': 'C1', '상품타입': o.product || '시그니처', '현재단계': o.stage || '상담확정' };
  CACHE = {}; MAIL = []; FETCH = o.fetch || null;
};
const sheet = {
  getLastColumn: () => SH.H.length,
  getLastRow: () => 2,
  getRange: (r, c, nr, nc) => ({
    getValues: () => (r === 1 ? [SH.H.slice(c - 1, c - 1 + (nc || 1))] : [(SH.R[r] || []).slice(c - 1, c - 1 + (nc || 1))]),
    setValue: (v) => { if (r === 1) SH.H[c - 1] = v; else { SH.R[r] = SH.R[r] || []; SH.R[r][c - 1] = v; } }
  })
};
sb.getSheet = () => sheet;
const custRow = () => ({ get: (k) => (CUST[k] !== undefined ? CUST[k] : '') });
sb.resolveSession = (t) => (t === 't1' ? { ok: true, row: custRow() } : { ok: false, reason: 'invalid' });
sb._sessionMsg = () => '로그인이 필요해요';
let NO_ROW = false;   // 상담 행이 없다(신청 때 행 생성이 실패한 경우)
sb.findRowByPersonalCode = () => { if (NO_ROW) return null; const colOf = sb.buildHeaderIndex(sheet); return sb.rowFromValues(colOf, SH.R[2], 2); };
sb.findCustomerByCode = () => custRow();
sb.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
sb.CacheService = { getScriptCache: () => ({ get: (k) => (k in CACHE ? CACHE[k] : null), put: (k, v) => { CACHE[k] = String(v); }, remove: (k) => { delete CACHE[k]; } }) };
sb.UrlFetchApp = { fetch: () => { if (!FETCH) throw new Error('offline'); return { getResponseCode: () => 200, getContentText: () => FETCH }; } };
sb.GmailApp = { sendEmail: (to, subj, body, opt) => MAIL.push({ to, subj, html: (opt && opt.htmlBody) || '' }) };
sb.Utilities = Object.assign({}, sb.Utilities, {
  formatDate: (d, tz, f) => { const s = new Date(new Date(d).getTime() + 9 * 3600e3).toISOString(); if (f === 'yyyyMMddHH') return s.slice(0, 13).replace(/[-T]/g, ''); return s.replace('T', ' ').slice(0, f && f.indexOf('HH') > -1 ? 16 : 10); }
});
const cell = () => { const c = SH.H.indexOf('시착준비'); return c < 0 ? '' : (SH.R[2][c] || ''); };
const save = (o) => sb.handleSaveDressPick(Object.assign({ token: 't1', picks: ['S01', 'S02'], names: ['표본 01', '표본 02'], ans: { len: 'ankle', fit: 'body', pref: ['low'] }, memo: '어깨가 드러나지 않는 쪽이면 좋겠어요' }, o || {}));

console.log('── 시착 준비(서버) ──');

// 1) 저장 — 칸이 없으면 맨 뒤에 한 번 붙이고 JSON 으로
fresh();
let r = save();
ok(r.ok === true, '1-1 확정된 상담 · 상담확정 · 5일 전 = 저장된다', r);
ok(SH.H[SH.H.length - 1] === '시착준비' && SH.H.length === HEAD0.length + 1, '1-2 «시착준비» 칸은 맨 뒤에 한 번 붙는다', SH.H.slice(-2));
let v = JSON.parse(cell() || '{}');
ok(JSON.stringify(v.picks) === '["S01","S02"]' && v.names[0] === '표본 01' && v.ans.len === 'ankle' && v.ans.fit === 'body' && v.ans.pref.join() === 'low', '1-3 저장 형식 {picks, names, ans, memo, at}', v);
ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v.at) && r.at === v.at, '1-4 at = 한국 시각 «YYYY-MM-DD HH:mm»', v.at);
r = save({ picks: ['S03'] });
ok(r.ok && SH.H.filter((h) => h === '시착준비').length === 1 && JSON.parse(cell()).picks.join() === 'S03', '1-5 다시 저장해도 칸은 하나 · 값만 바뀐다');

// 2) 입력 다듬기 — 밖에서 온 값
fresh();
r = save({ picks: ['S01', 'S01', '<x>', 'S02', 'S04'], names: ['표본<01>', '\u0001표본 02'], ans: { len: 'giant', fit: 'waist', pref: ['low', 'low', 'body', 'arms'] }, memo: 'x'.repeat(260) });
v = JSON.parse(cell());
ok(v.picks.join() === 'S01,S02', '2-1 같은 id · 이상한 id 는 빼고 두 벌까지', v.picks);
ok(v.names[0] === '표본01' && v.names[1] === '표본 02', '2-2 이름의 꺾쇠 · 제어 문자는 걷는다', v.names);
ok(v.ans.len === '' && v.ans.fit === 'waist' && v.ans.pref.join() === 'low,arms', '2-3 답은 정한 값만(모르는 값은 빈칸 · 겹친 값은 하나)', v.ans);
ok(v.memo.length === 200, '2-4 남길 말 200자', v.memo.length);
// [DRESS_CLEAR] 0벌 = 비우기(저장해 둔 두 벌을 다 뺀 뒤의 «저장») — 칸을 비우고 saved:null · 칸이 없으면 새로 붙이지 않는다
r = save({ picks: [] });
ok(r.ok === true && r.saved === null && cell() === '', '2-5 0벌 = 비우기(저장된 두 벌을 지운다)', r);
ok(sb._dressParse_(cell()) === null, '2-5b 비운 뒤 읽으면 저장본 없음(null)', cell());
fresh();
r = save({ picks: [] });
ok(r.ok === true && SH.H.indexOf('시착준비') < 0, '2-5c 한 번도 저장하지 않았으면 칸을 붙이지 않는다', SH.H.slice(-1));
fresh({ days: 1 });
SH.H.push('시착준비'); SH.R[2][SH.H.length - 1] = JSON.stringify({ picks: ['S01'], names: ['표본 01'], ans: {}, memo: '', at: 'x' });
r = save({ picks: [] });
ok(r.ok === true && r.saved === null && cell() === '', '2-5d [DRESS_NO_DEADLINE] 상담 하루 전에도 비울 수 있다(마감 없음)', r);
fresh();
r = save({ token: 'nope' });
ok(r.ok === false && r.reason === 'invalid', '2-6 로그인이 풀렸으면 reason 을 넘긴다(화면이 로그인으로)', r);

// 3) 단계 · 상담 상태 · 상품 — ★[DRESS_APPLY_OPEN 명세 2] 신청접수 ~ 상담확정 · 취소면 거절 · ★[DRESS_NO_DATE] 날짜가 없으면 마감 없음
fresh({ stage: '신청접수', status: '신청접수', date: '' });
r = save();
ok(r.ok === true && JSON.parse(cell()).picks.join() === 'S01,S02', '3-1 신청접수(일정 선택 전 · 날짜 없음)에서 저장된다 — 마감 없음', r);
fresh({ stage: '신청접수', status: '신청접수', days: 1 });
ok(save().ok === true, '3-1b 신청접수면 시트에 날짜가 남아 있어도 «날짜 없음»으로 본다(일정 선택 전)');
fresh({ stage: '신청접수', status: '시간선택완료', days: 5 });
ok(save().ok === true, '3-1c 시간선택완료(디렉터 확인 대기 · 상담일 5일 전) = 저장된다');
fresh({ stage: '신청접수', status: '시간선택완료', days: 1 });
r = save();
ok(r.ok === true && JSON.parse(cell()).picks.join() === 'S01,S02', '3-1d [DRESS_NO_DEADLINE] 시간선택완료 · 고른 날 하루 전이어도 저장된다', r);
fresh({ stage: '신청접수', status: '변경제안', days: 1 });
ok(save().ok === true, '3-1e 변경제안(새 시간 수락 전) = 날짜 없음 · 마감 없음 — 옛 날짜(내일)에 묶이지 않는다');
fresh({ stage: '신청접수', status: '취소', date: '' });
r = save();
ok(r.ok === false && r.error === '지금은 바꿀 수 없어요' && cell() === '', '3-1f 상담 예약이 취소면 거절', r);
fresh({ stage: '노쇼' });
r = save();
ok(r.ok === false && r.error === '지금은 바꿀 수 없어요', '3-1g 노쇼(종료 고객)는 거절', r);
fresh({ stage: '취소', status: '취소' });
ok(save().ok === false, '3-1h 취소 단계(종료 고객)는 거절');
ok(JSON.stringify(sb.DRESS_PICK.stages) === '["신청접수","상담확정"]', '3-1i 받는 단계 = 신청접수 · 상담확정(마이페이지 DRESS_STAGES 와 같은 목록 — dress-refs.mjs 가 대조)');
fresh({ stage: '상담완료' });
r = save();
ok(r.ok === false && r.error === '지금은 바꿀 수 없어요', '3-2 상담완료부터는 거절(시착 동의 카드가 이어받는다)', r);
fresh({ product: '웨딩스냅' });
r = save();
ok(r.ok === false && r.error === '지금은 바꿀 수 없어요', '3-3 웨딩스냅은 이번 범위 밖', r);

// 4) 마감 — 상담일 −2일 23:59(한국 날짜)까지
fresh({ days: 2 });
ok(save().ok === true, '4-1 상담 이틀 전(오늘이 D-2)까지는 저장된다');
fresh({ days: 1 });
r = save();
ok(r.ok === true && JSON.parse(cell()).picks.join() === 'S01,S02', '4-2 [DRESS_NO_DEADLINE] 하루 전(D-1)도 저장된다', r);
fresh({ days: -23 });
r = save();
ok(r.ok === true && JSON.parse(cell()).picks.join() === 'S01,S02', '4-2b [DRESS_NO_DEADLINE] 상담일이 지났어도(상담확정 · 23일 전 날짜) 저장된다 — 사장님 시험 계정(9/30)과 같은 꼴', r);
ok(sb.DRESS_PICK.untilDays === 2, '4-3 서버 마감 2일 = 화면(dress-refs changeUntilDays) 값');

// 5) 한 사람이 천 번 누르면 — 한 시간 30번
fresh();
let last = null;
for (let i = 0; i < 31; i++) last = save();
ok(last.ok === false && /^잠시 후 다시 시도해 주세요/.test(last.error), '5-1 31번째는 «잠시 후»(몰림 코드)', last);

// 6) 읽기 — 마이페이지 판정값 · 깨진 값
fresh();
save();
let st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st && st.attire === '대여 희망 · 2벌' && st.open === true && st.saved && st.saved.picks.join() === 'S01,S02' && st.ymd === ymd(5), '6-1 _dressState_ = 의상 · 상담일 · 열림 · 저장값', st);
ok(sb._dressParse_('{깨짐') === null && sb._dressParse_('') === null && sb._dressParse_('{"picks":"S01"}') === null, '6-2 깨졌거나 모양이 다르면 null');
fresh({ days: 1 });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.open === true, '6-3 [DRESS_NO_DEADLINE] 상담 하루 전에도 open:true(카드가 숨지 않는다)', st);
fresh({ days: -23 });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.open === true && st.ymd === ymd(-23), '6-3b [DRESS_NO_DEADLINE] 상담일이 지났어도 open:true', st);
fresh({ stage: '신청접수', status: '신청접수', days: 1 });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.ymd === '' && st.open === true, '6-3b [DRESS_NO_DATE] 신청접수 = ymd 빈칸 · open:true(카드가 마감 줄 없이 열린다)', st);
fresh({ stage: '신청접수', status: '변경제안', days: 1 });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.ymd === '' && st.open === true, '6-3c [DRESS_NO_DATE] 변경제안 = 날짜 없음 · 열림', st);
fresh({ stage: '신청접수', status: '시간선택완료', days: 6 });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.ymd === ymd(6) && st.open === true, '6-3d 시간선택완료 = 고른 날짜가 상담일(마감 날 글이 나온다)', st);
fresh({ status: '확정', date: '날짜 모름' });
st = sb._dressState_(sb.findRowByPersonalCode('C1'));
ok(st.ymd === '' && st.open === true, '6-3e [DRESS_NO_DEADLINE] 확정인데 날짜를 못 읽어도 열림', st);
ok(sb._dressOpen_('') === true && sb._dressOpen_(null) === true && sb._dressOpen_(ymd(2)) === true && sb._dressOpen_(ymd(1)) === true && sb._dressOpen_(ymd(-30)) === true, '6-3f [DRESS_NO_DEADLINE] _dressOpen_ = 늘 열림(빈 날짜 · 못 읽음 · D-1 · 지난 날짜)');
const gms = fs.readFileSync(new URL('../platform/60_mypage.gs', import.meta.url), 'utf8');
ok(/dress:\s*\(typeof _dressState_ === 'function'\) \? _dressState_\(cr\) : null/.test(gms), '6-4 buildConsultState 가 같은 상담 행(cr)으로 싣는다(다시 찾지 않는다 · GMS_MEMO)');

// 7) 스튜디오 한 줄
ok(sb._dressBriefLine_(JSON.stringify({ picks: ['S01', 'S02'], names: ['표본 01', ''], memo: '줄\n바꿈' })) === '표본 01 (S01) · (S02) · 남긴 말: 줄 바꿈', '7-1 «이름 (id) · … · 남긴 말» 한 줄');
ok(sb._dressBriefLine_('') === '', '7-2 고른 게 없으면 빈 줄');

// 8) 확정 메일 한 줄 — 스위치(사이트 원천) · 시그니처 · 의상
const SRC = fs.readFileSync(new URL('../../assets/dress-refs.js', import.meta.url), 'utf8');
/* ★[DRESS_SAMPLE_PROD 2026-10-23 사장님 «지금뜨게해»] 원천 스위치가 켜졌다 — 꺼짐 동작은 꺼진 사본(OFF)으로, 켜짐은 켜진 사본(LIVE_ON)으로 잰다 */
const LIVE_ON = SRC.replace(/live:\s*(true|false)\s*,(\s*\/\/\s*\[DRESS_LIVE\])/, 'live: true,$2');
const OFF = SRC.replace(/live:\s*(true|false)\s*,(\s*\/\/\s*\[DRESS_LIVE\])/, 'live: false,$2');
ok(OFF !== LIVE_ON && /live:\s*true\s*,\s*\/\/\s*\[DRESS_LIVE\]/.test(LIVE_ON), '8-0 원천의 스위치 줄을 찾았다(«live: …, // [DRESS_LIVE]»)');
ok(SRC === LIVE_ON, '8-0b [DRESS_SAMPLE_PROD] 지금 원천 스위치는 켜져 있다(사장님 «지금뜨게해») — 서버도 이 원천을 읽어 켜짐으로 본다');
const line = '상담 전에 드레스를';   // ★[DRESS_NO_DEADLINE] «두 벌을 미리 고르실 수» → «미리 둘러보실 수»
const confirm = () => { MAIL = []; sb.sendConfirmEmail_('a@b.c', '정희준 · 미쿠', ymd(5), '14:50', false, 'tk', sb.findRowByPersonalCode('C1')); return MAIL[0] ? MAIL[0].html : ''; };
fresh({ fetch: OFF });
ok(confirm().indexOf(line) < 0, '8-1 스위치가 꺼져 있으면 메일에 싣지 않는다 — 주석 속 «live:true» 글자에 속지 않는다');
fresh({ fetch: LIVE_ON });
let html = confirm();
ok(html.indexOf(line) > -1 && html.indexOf('momentedit.kr/mypage.html') > -1, '8-2 켜지면 «상담 전에 드레스를 마이페이지에서 미리 둘러보실 수 있습니다» + 마이페이지 링크');
fresh({ fetch: LIVE_ON, attire: '자체 준비' });
ok(confirm().indexOf(line) < 0, '8-3 의상 «자체 준비»면 싣지 않는다');
fresh({ fetch: LIVE_ON, product: '웨딩스냅' });
ok(confirm().indexOf(line) < 0, '8-4 웨딩스냅이면 싣지 않는다');
fresh({ fetch: null });
ok(confirm().indexOf(line) < 0 && CACHE.DRESS_LIVE === '0', '8-5 원천을 못 읽으면 꺼짐으로 본다(짧게 기억)');
fresh({ fetch: LIVE_ON });
MAIL = []; sb.sendConfirmEmail_('a@b.c', '정희준 · 미쿠', ymd(5), '14:50', false, 'tk');
ok(MAIL.length === 1 && MAIL[0].html.indexOf(line) < 0, '8-6 상담 행을 안 넘기는 옛 호출도 메일은 그대로 나간다(한 줄만 빠진다)');
fresh({ fetch: LIVE_ON });
save();
ok(confirm().indexOf(line) < 0, '8-7 [DRESS_CONFIRM_ZERO] 이미 한 벌이라도 골랐으면 확정 메일에 그 줄을 싣지 않는다(신청 직후부터 고를 수 있다)');
fresh({ fetch: LIVE_ON });
save(); save({ picks: [] });
ok(confirm().indexOf(line) > -1, '8-8 다 빼서 비웠으면(0벌) 다시 싣는다');

// 10) 신청 접수 메일 한 줄 — ★[DRESS_SIGNUP_MAIL 명세 2 · 6장] 고객이 실제로 받는 접수 메일(40_signup sendSignupEmail_ «신청이 접수되었습니다 · 개인코드»)
const sline = '상담 날 입어 보실 드레스도';
const signup = (product) => { MAIL = []; sb.sendSignupEmail_('a@b.c', '정희준 · 미쿠', 'C1', 'tok123', product || '시그니처', '희망 예식 일자: 2027-05-01'); return MAIL[0] || { subj: '', html: '' }; };
fresh({ fetch: OFF, stage: '신청접수', status: '신청접수', date: '' });
let sm = signup();
ok(/신청이 접수되었습니다/.test(sm.subj) && sm.html.indexOf(sline) < 0, '10-1 스위치가 꺼져 있으면 접수 메일에 싣지 않는다 — 메일은 그대로 나간다', sm.subj);
fresh({ fetch: LIVE_ON, stage: '신청접수', status: '신청접수', date: '' });
sm = signup();
const sIdx = sm.html.indexOf(sline);
ok(sIdx > -1 && /상담 날 입어 보실 드레스도 <a href="[^"]*mypage\.html\?token=tok123" style="color:#7A5F37;font-weight:500">마이페이지<\/a>에서 미리 둘러보실 수 있습니다\./.test(sm.html), '10-2 켜지면 «상담 날 입어 보실 드레스도 마이페이지에서 미리 둘러보실 수 있습니다.» + 자동 로그인 마이페이지 링크(글자 링크 #7A5F37)');
ok(sIdx > sm.html.indexOf('버튼이 열리지 않나요?') && sIdx < sm.html.indexOf('For Parents'), '10-3 자리 = 마이페이지 묶음 끝(«버튼이 열리지 않나요?» 뒤 · «어른께 드리는 안내» 앞)');
fresh({ fetch: LIVE_ON, attire: '자체 준비', stage: '신청접수', status: '신청접수', date: '' });
ok(signup().html.indexOf(sline) < 0, '10-4 의상 «자체 준비»면 싣지 않는다');
fresh({ fetch: LIVE_ON, product: '웨딩스냅', stage: '신청접수', status: '신청접수', date: '' });
ok(signup('웨딩스냅').html.indexOf(sline) < 0, '10-5 웨딩스냅 신청이면 싣지 않는다');
fresh({ fetch: LIVE_ON, stage: '신청접수', status: '신청접수', date: '' });
NO_ROW = true; sm = signup(); NO_ROW = false;
ok(/신청이 접수되었습니다/.test(sm.subj) && sm.html.indexOf(sline) < 0, '10-6 상담 행이 없으면(신청 때 행 생성 실패) 줄 없이 메일은 나간다');

// 9) 아침 보고 — 내일 상담 · 준비할 드레스(같은 날 겹침 · 남긴 말)
const _ah = sb.adminHome;
sb.adminHome = () => ({ ok: true, todayConsults: [], queue: { urgent: [], normal: [] }, counts: { total: 0, urgent: 0 },
  dressUpcoming: [
    { code: 'C2', ymd: ymd(1), time: '18:10', names: '갑 · 을', picks: ['S01'], pickNames: ['표본 01'], memo: '', dup: ['S01'] },
    { code: 'C1', ymd: ymd(1), time: '11:30', names: '정희준 · 미쿠', picks: ['S01', 'S03'], pickNames: ['표본 01', '표본 03'], memo: '어깨\n덮는 쪽', dup: ['S01'] },
    { code: 'C3', ymd: ymd(3), time: '11:30', names: '병 · 정', picks: ['S02'], pickNames: ['표본 02'], memo: '', dup: [] }
  ] });
const brief = sb.morningBriefData_();
sb.adminHome = _ah;
ok(brief && brief.tomorrowDress.length === 2, '9-1 내일 상담만(모레 이후는 빠진다)', brief && brief.tomorrowDress);
ok(brief.tomorrowDress[0].indexOf('11:30 정희준 · 미쿠 · 표본 01 (S01) · 표본 03 (S03) · 같은 날 겹침 S01') === 0 && /\n  남긴 말: 어깨 덮는 쪽$/.test(brief.tomorrowDress[0]), '9-2 시간순 · 이름 (id) · 같은 날 겹침 · 남긴 말', brief.tomorrowDress[0]);
const rep = fs.readFileSync(new URL('../platform/96_ai_cost.gs', import.meta.url), 'utf8');
ok(/brief\.tomorrowDress && brief\.tomorrowDress\.length\) rows\.push\(\['내일 상담 · 준비할 드레스/.test(rep), '9-3 아침 보고 메일이 그 줄을 싣는다(고른 분이 있을 때만)');

console.log(`\n${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
