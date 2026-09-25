// 알림톡이 «끝까지» 나가는지 — 실제 95_notify 코드를 그대로 돌려 알림 종류마다 무엇이 나가는지 본다.
//
// ★[TPL_SILENT 2026-09-25 사장님 「알림톡 나가지 않고 있어요 · 저 알람 추적해서 문제점 찾아봐 · 직접 시뮬 돌려보고」]
//   연락처 쪽(phone-kr-norm · contact-lifecycle-sim)은 이미 검사가 있었다. 빠져 있던 것은
//   «알림 종류마다 알림톡이 실제로 나가는가»였다. 켜진 고객 알림 19종 × 여러 장면을 실제 코드로 돌리니
//   템플릿 ID 가 없을 때(반려·미등록) 알림톡은 시도조차 없이 이메일로만 대체되고 **관리자에게 아무 말이 없었다.**
//   고객 이메일까지 비면 고객도 관리자도 아무것도 못 받았다. 이 검사가 그 구멍을 지킨다.
//
//   ★함수를 베껴 쓰지 않는다 — gas-lint 의 샌드박스에 GAS 파일 전부를 그대로 싣고, 바깥(솔라피·메일·저장값)만 흉내 낸다.
//   ★[SERVED_OURS] 로드에 실패하거나 함수가 없으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { makeSandbox, loadGas } from './gas-lint.mjs';

const W = { props: new Map(), fetches: [], mails: [], logs: [], hist: [], night: false, http: 200, cust: null };
const sb = makeSandbox();
sb.PropertiesService = { getScriptProperties: () => ({
  getProperty: (k) => (W.props.has(k) ? W.props.get(k) : null), setProperty: (k, v) => { W.props.set(k, String(v)); },
  deleteProperty: (k) => { W.props.delete(k); }, getProperties: () => Object.fromEntries(W.props) }) };
sb.UrlFetchApp = { fetch: (url, opt) => { let body = null; try { body = JSON.parse((opt && opt.payload) || 'null'); } catch (e) {}
  W.fetches.push({ url, body });
  return { getResponseCode: () => W.http, getContentText: () => (W.http === 200 ? '{"messageId":"M1","statusCode":"2000"}' : '{"errorCode":"ValidationError"}') }; } };
const mail = { sendEmail: (...a) => { const o = typeof a[0] === 'object' ? a[0] : { to: a[0], subject: a[1] }; W.mails.push({ to: String(o.to || ''), subject: String(o.subject || '') }); } };
sb.MailApp = mail; sb.GmailApp = mail;
sb.Logger = { log: (s) => { W.logs.push(String(s)); } };
const { errors } = loadGas(sb);
if (errors.length) { console.log('━━ notify-e2e — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
const G = sb;
for (const fn of ['notifyKakao', '_kakaoSend', '_nfTplSilent', 'notifySetupCheck', 'notifyFailYesterday']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ notify-e2e — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}
if (!G.NOTIFY_EVENTS) { console.log('━━ notify-e2e — NOTIFY_EVENTS 가 없습니다 · 재지 못했습니다'); process.exit(2); }
G.findCustomerByCode = () => W.cust;
G._recordHandler = (code, t) => { W.hist.push(String(t)); };
G._nfIsNight = () => W.night;

let rc = 0;
const say = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 220)}`); if (!c) rc = 1; };
const EV = Object.keys(G.NOTIFY_EVENTS).filter((k) => G.NOTIFY_EVENTS[k].to === 'customer' && !G.NOTIFY_EVENTS[k].off);
const ELSEWHERE = ['cust.consultDone', 'cust.resultDelivered'];   // 메일은 admin.gs 처리에서 따로 나간다
const COUPLE = 'couple@example.com';
const cfg = (over) => { W.props = new Map(Object.entries(Object.assign({ NOTIFY_ENABLED: 'true', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's',
  SOLAPI_SENDER: '0212345678', SOLAPI_PF_ID: 'KA01PF', ADMIN_EMAIL: 'contact@momentedit.kr' }, over || {}))); };
const fresh = () => { W.fetches = []; W.mails = []; W.logs = []; W.hist = []; W.night = false; W.http = 200; };
const cust = (phone, email) => { const o = { 개인코드: 'ME-SIM', 신랑이름: '김희준', 신부이름: '이미쿠', 연락처: phone, 이메일: email, 상품타입: '시그니처' };
  return { num: 2, get: (h) => (h in o ? o[h] : '') }; };
const tplAll = () => JSON.stringify(Object.fromEntries(EV.map((e) => [e, 'TPL_' + e])));
const send = (ev, c) => { W.cust = c; return G.notifyKakao(ev, 'ME-SIM', { amount: 1100000, dday: 10, date: '2026-10-26', time: '13:20' }); };
const kakao = () => W.fetches.filter((f) => f.body && f.body.message && f.body.message.kakaoOptions);
const toCouple = () => W.mails.filter((m) => m.to === COUPLE).length;
const toAdmin = () => W.mails.filter((m) => m.to !== COUPLE).length;
const tplHist = () => W.hist.filter((h) => /카톡 못 보냄/.test(h));

console.log(`━━ notify-e2e — 켜진 고객 알림 ${EV.length}종`);
if (EV.length < 10) { console.log('━━ notify-e2e — 켜진 고객 알림이 너무 적다(표를 못 읽었다) · 재지 못했습니다'); process.exit(2); }

console.log('━━ ① 정상(템플릿·채널 있음) — 알림톡 한 건, 다른 소리 없음');
{ const bad = [];
  for (const ev of EV) { cfg({ KAKAO_TEMPLATES: tplAll() }); fresh(); send(ev, cust('010-1234-5678', COUPLE));
    const k = kakao(); if (k.length !== 1 || k[0].body.message.kakaoOptions.templateId !== 'TPL_' + ev || toCouple() || toAdmin() || tplHist().length) bad.push(ev); }
  say(!bad.length, `${EV.length}종 전부 알림톡 1건 · 메일·경고 없음`, bad.join(', ')); }

console.log('━━ ② 템플릿 없음 — 흔적을 남기고 관리자에게 알린다 [TPL_SILENT]');
{ cfg({ KAKAO_TEMPLATES: '{}' });
  const bad = []; let firstAdmin = -1, laterAdmin = 0;
  EV.forEach((ev, i) => { fresh(); send(ev, cust('010-1234-5678', COUPLE));
    const expectMail = ELSEWHERE.indexOf(ev) < 0 ? 1 : 0;
    const h = tplHist();
    if (kakao().length !== 0 || toCouple() !== expectMail || h.length !== 1 || h[0].indexOf(ev) < 0 || !/템플릿 미등록/.test(h[0])) bad.push(ev);
    if (i === 0) firstAdmin = toAdmin(); else laterAdmin += toAdmin(); });
  say(!bad.length, '카톡은 시도하지 않고 · 고객 메일로 대체 · 고객 상세 처리이력에 한 줄', bad.join(', '));
  say(firstAdmin === 1 && laterAdmin === 0, '관리자 메일은 하루 한 통(쏟아지지 않게)', `첫 건 ${firstAdmin} · 나머지 ${laterAdmin}`); }

console.log('━━ ③ 템플릿 없음 + 고객 이메일도 없음 — «아무것도 못 받은» 고객은 따로 알린다');
{ cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); send(EV[0], cust('010-1234-5678', COUPLE));   // 오늘 첫 알림 메일을 먼저 소진
  fresh(); const ev = EV.find((e) => ELSEWHERE.indexOf(e) < 0); send(ev, cust('010-1234-5678', ''));
  const h = tplHist();
  say(h.length === 1 && /아무것도 못 받음/.test(h[0]), '처리이력: 「이메일도 없어 아무것도 못 받음」', h.join(' | '));
  say(toAdmin() === 1 && toCouple() === 0, '하루 한 통 표식을 이미 썼어도 이 고객은 관리자에게 따로 알린다', `관리자 ${toAdmin()} · 고객 ${toCouple()}`); }

console.log('━━ ④ 카카오 채널(SOLAPI_PF_ID) 없음 — 까닭을 채널로 적는다');
{ cfg({ KAKAO_TEMPLATES: tplAll(), SOLAPI_PF_ID: '' }); fresh(); send(EV[0], cust('010-1234-5678', COUPLE));
  const h = tplHist(); say(kakao().length === 0 && h.length === 1 && /SOLAPI_PF_ID/.test(h[0]), '처리이력에 「카카오 채널(SOLAPI_PF_ID) 미설정」', h.join(' | ')); }

console.log('━━ ⑤ 다른 까닭에는 끼어들지 않는다');
{ cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); send(EV[0], cust('821 0734 9770', COUPLE));
  say(tplHist().length === 0 && toAdmin() === 1, '번호가 망가지면 연락처 경고 한 통만(템플릿 경고 없음 · CONTACT_SILENT)', W.hist.join(' | '));
  cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); W.night = true; const r = send(EV[0], cust('010-1234-5678', COUPLE));
  say(r === 'held' && tplHist().length === 0 && toAdmin() === 0, '밤에는 보류만(아침에 보낼 때 판정)', String(r));
  cfg({ KAKAO_TEMPLATES: tplAll() }); fresh(); W.http = 400; send(EV[0], cust('010-1234-5678', COUPLE));
  say(tplHist().length === 0 && W.hist.some((h) => /발송 실패/.test(h)), '솔라피가 거절하면 «발송 실패»로(템플릿 경고 아님)', W.hist.join(' | ')); }

console.log('━━ ⑥ 설정 점검이 빠진 알림을 이름으로 보여 준다 [TPL_COVER]');
{ const part = Object.fromEntries(EV.slice(0, 3).map((e) => [e, 'TPL_' + e]));
  cfg({ KAKAO_TEMPLATES: JSON.stringify(part) }); fresh(); G.notifySetupCheck();
  const L = W.logs.join('\n');
  say(new RegExp('켜진 고객 알림 ' + EV.length + '종 · 알림톡 템플릿 있음 3 · 없음 ' + (EV.length - 3)).test(L), '「있음 3 · 없음 N」 한 줄', L.slice(0, 300));
  say(EV.slice(3).every((e) => L.indexOf('· ' + e) >= 0) && EV.slice(0, 3).every((e) => L.indexOf('· ' + e) < 0), '빠진 알림만 이름으로 나열', '');
  say(!/SMS로 발송/.test(L), '「SMS로 발송」 같은 옛말이 없다(고객 문자는 2026-06-29 부터 안 쓴다)', ''); }

console.log('━━ ⑦ 하루 한 번 표식은 7일 지나면 치운다');
{ cfg({}); fresh();
  const today = G.Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  ['NF_NOTPL_20200101', 'NF_NOTPL_NONE_ME-X_20200101', 'NF_BADPHONE_ME-X_20200101', 'NF_NOTPL_' + today, 'NF_BADPHONE_ME-X_' + today].forEach((k) => W.props.set(k, '1'));
  G.notifyFailYesterday();
  say(!W.props.has('NF_NOTPL_20200101') && !W.props.has('NF_NOTPL_NONE_ME-X_20200101') && !W.props.has('NF_BADPHONE_ME-X_20200101'), '옛 표식 셋 삭제', [...W.props.keys()].join(','));
  say(W.props.has('NF_NOTPL_' + today) && W.props.has('NF_BADPHONE_ME-X_' + today), '오늘 표식은 남긴다', ''); }

console.log(rc ? '━━ notify-e2e — 틀린 곳이 있습니다' : '━━ notify-e2e — 전부 통과');
process.exit(rc);
