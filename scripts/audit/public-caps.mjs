// ★★[PUBLIC_CAPS 2026-10-09 라운드 8] 밖에서 누를 수 있는 동작의 횟수 상한을 진짜 .gs 로 잰다(공개 저장소라 규칙만 적는다 · PUB_RULES_ONLY).
//   ① [LOGIN_TRY_CAP] 고객 로그인 — 같은 아이디는 15분에 10번 틀리면 막는다 · 없는 아이디도 똑같이 센다 · 맞히면 셈을 지운다
//   ② [LOGIN_TRY_CAP] 관리자 로그인 — 같은 규칙 · 막히는 순간 관리자 알림 한 번
//   ③ [SIGNUP_ADDR_CAP] 같은 이메일로 새 신청은 한 시간에 3번
//   ④ [SLOT_NOTICE_CAP] 같은 예약의 «시간 선택» 관리자 알림(카톡 · 메일)은 한 시간에 3번
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { openWorld, kstAheadWeekday } from './_gasworld.mjs';

let rc = 0;
const say = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 220)}`); if (!c) rc = 1; };

let G, world;
try { ({ G, world } = openWorld()); }
catch (e) { console.log('━━ public-caps — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleLogin', 'adminLogin', 'handleSignup', 'submitSchedule', '_loginLocked_', 'hashPassword']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ public-caps — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}
const cm = new Map();
G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k), removeAll: () => cm.clear() }) };
G.Utilities = Object.assign({}, G.Utilities, { sleep() {} });
G._SRV = true;
const notices = [];
G.notifyStudio = (s, b) => { notices.push(String(s) + ' | ' + String(b)); };
const thr = (f) => { try { f(); return ''; } catch (e) { return String(e && e.message || e); } };

console.log('━━ public-caps — ① 고객 로그인 시도 상한');
{
  const HASH = G.hashPassword('Right1234!');
  world({ '비번해시': HASH });
  const LOCK = G.LOGIN_LOCK_MSG;
  const wrong = [];
  for (let i = 0; i < 10; i++) wrong.push(thr(() => G.handleLogin({ code: 'ME-TEST', pw: 'nope' + i })));
  say(wrong.every((t) => /올바르지 않습니다/.test(t)), '열 번까지는 «올바르지 않습니다»(무엇이 틀렸는지 가르지 않는다)', wrong[9]);
  const locked = thr(() => G.handleLogin({ code: 'ME-TEST', pw: 'Right1234!' }));
  say(locked === LOCK, '열 번 틀린 뒤에는 맞는 비밀번호도 15분 막는다', locked);
  const keepFC = G.findCustomerByCode; let looked = 0;
  G.findCustomerByCode = (c) => (String(c) === 'ME-NONE' ? (looked++, null) : keepFC(c));   // world() 는 어느 코드에도 같은 줄을 돌려준다 — 없는 아이디 길을 실제로 타게 한다
  const ghost = []; for (let i = 0; i < 11; i++) ghost.push(thr(() => G.handleLogin({ code: 'ME-NONE', pw: 'x' })));
  G.findCustomerByCode = keepFC;
  say(looked === 10 && ghost.slice(0, 10).every((t) => /올바르지 않습니다/.test(t)) && ghost[10] === LOCK, '없는 아이디도 똑같이 센다(있는지 드러내지 않는다)', looked + ' · ' + ghost[10]);
  cm.clear(); world({ '비번해시': HASH });
  for (let i = 0; i < 9; i++) thr(() => G.handleLogin({ code: 'ME-TEST', pw: 'nope' }));
  let ok; try { ok = G.handleLogin({ code: 'ME-TEST', pw: 'Right1234!' }); } catch (e) { ok = { error: e.message }; }
  const after = []; for (let i = 0; i < 9; i++) after.push(thr(() => G.handleLogin({ code: 'ME-TEST', pw: 'nope' })));
  say(ok && ok.ok === true && after.every((t) => t !== LOCK), '맞히면 셈을 지운다(앞서 아홉 번 틀린 고객이 다시 실수해도 바로 막히지 않는다)', JSON.stringify(ok));
}

console.log('━━ public-caps — ② 관리자 로그인 시도 상한');
{
  cm.clear(); notices.length = 0; G.notifyStudio = (s, b) => { notices.push(String(s) + ' | ' + String(b)); };   // world() 가 알림을 제 기록으로 바꿔 둔다 — 여기서 다시 잡는다
  const AH = G.hashPassword('AdminPass9!');
  G._findAdminRow = (k, id) => (String(id) === 'boss' ? { num: 2, get: (h) => (h === '비번해시' ? AH : h === '이름' ? '사장' : '') } : null);
  G._adminSheet = () => ({ getRange: () => ({ setValue() {} }) });
  const keepBHI = G.buildHeaderIndex; G.buildHeaderIndex = () => ({ '로그인토큰': 1, '토큰만료': 2 });
  const rs = []; for (let i = 0; i < 10; i++) rs.push(G.adminLogin('boss', 'bad' + i));
  const r11 = G.adminLogin('boss', 'AdminPass9!');
  say(rs.every((r) => r && r.ok === false && /올바르지 않습니다/.test(r.error)) && r11 && r11.ok === false && r11.error === G.LOGIN_LOCK_MSG, '열 번 틀리면 그 아이디는 맞는 비밀번호도 15분 막는다', JSON.stringify(r11));
  say(notices.filter((n) => /관리자 로그인 실패가 많아요/.test(n)).length === 1 && !notices.some((n) => /bad\d/.test(n)), '막히는 순간 관리자 알림 한 번(넣은 비밀번호는 싣지 않는다)', notices.join(' / '));
  cm.clear(); const r0 = G.adminLogin('boss', 'AdminPass9!');
  say(r0 && r0.ok === true, '막히지 않은 때는 그대로 들어간다', JSON.stringify(r0));
  G.buildHeaderIndex = keepBHI;
}

console.log('━━ public-caps — ③ 같은 이메일 새 신청 상한');
{
  cm.clear();
  const errs = [];
  for (let i = 0; i < 4; i++) errs.push(thr(() => G.handleSignup({ groom: '신랑' + i, bride: '신부' + i, phone: '01012345678', email: 'Same@Ex.com', pw: 'Pass1234!', pw2: 'Pass1234!' })));
  say(!/신청이 많았어요/.test(errs.slice(0, 3).join(' ')) && /같은 이메일로 신청이 많았어요/.test(errs[3]), '한 시간에 세 번까지 · 넷째는 막는다(대소문자 같은 주소)', JSON.stringify(errs));
  const other = thr(() => G.handleSignup({ groom: '갑', bride: '을', phone: '01012345678', email: 'other@ex.com', pw: 'Pass1234!', pw2: 'Pass1234!' }));
  say(!/신청이 많았어요/.test(other), '다른 주소는 그대로', other);
}

console.log('━━ public-caps — ④ «시간 선택» 관리자 알림 상한');
{
  cm.clear();
  const DAY = kstAheadWeekday(12);
  const w = world({}, { 상태: '신청접수', 선택날짜: '', 선택시간: '', 신청일시: new Date() });
  G.findRowByToken = () => ({ num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  let kak = 0, mails = 0;
  const keepNK = G.notifyKakao, keepAM = G.sendAdminNotifyEmail;
  G.notifyKakao = (ev) => { if (ev === 'admin.slotPicked') kak++; };
  G.sendAdminNotifyEmail = () => { mails++; };
  G._IN_POST = true;
  for (let i = 0; i < 5; i++) { try { G.submitSchedule('ctok', DAY, '14:50', [], '', null, '', '', 'bank'); } catch (e) {} }
  say(kak === 3 && mails === 3, '같은 예약을 다섯 번 보내도 관리자 알림 · 메일은 세 번', kak + ' / ' + mails);
  G.notifyKakao = keepNK; G.sendAdminNotifyEmail = keepAM; G._IN_POST = false;
}

console.log(rc ? '━━ public-caps — 빨강 · 밖에서 누를 수 있는 동작에 상한이 빠졌다 [PUBLIC_CAPS]' : '━━ public-caps — 통과 [PUBLIC_CAPS]');
process.exit(rc);
