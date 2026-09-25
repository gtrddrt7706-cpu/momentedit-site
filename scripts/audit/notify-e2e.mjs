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
import { readFileSync } from 'node:fs';

const W = { props: new Map(), fetches: [], mails: [], logs: [], hist: [], night: false, http: 200, cust: null, tplList: [] };
const sb = makeSandbox();
sb.PropertiesService = { getScriptProperties: () => ({
  getProperty: (k) => (W.props.has(k) ? W.props.get(k) : null), setProperty: (k, v) => { W.props.set(k, String(v)); },
  deleteProperty: (k) => { W.props.delete(k); }, getProperties: () => Object.fromEntries(W.props) }) };
sb.UrlFetchApp = { fetch: (url, opt) => { let body = null; try { body = JSON.parse((opt && opt.payload) || 'null'); } catch (e) {}
  if (/\/kakao\/v2\/templates/.test(url)) return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ templateList: W.tplList }) };   // importKakaoTemplates 가 읽는 솔라피 목록
  W.fetches.push({ url, body });
  return { getResponseCode: () => W.http, getContentText: () => (W.http === 200 ? '{"messageId":"M1","statusCode":"2000"}' : '{"errorCode":"ValidationError"}') }; } };
const mail = { sendEmail: (...a) => { const o = typeof a[0] === 'object' ? a[0] : { to: a[0], subject: a[1], body: a[2], htmlBody: (a[3] || {}).htmlBody };
  W.mails.push({ to: String(o.to || ''), subject: String(o.subject || ''), body: String(o.body || ''), html: String(o.htmlBody || '') }); } };
sb.MailApp = mail; sb.GmailApp = mail;
sb.Logger = { log: (s) => { W.logs.push(String(s)); } };
const { errors } = loadGas(sb);
if (errors.length) { console.log('━━ notify-e2e — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
const G = sb;
for (const fn of ['notifyKakao', '_kakaoSend', '_nfTplSilent', 'notifySetupCheck', 'notifyFailYesterday', 'importKakaoTemplates', 'setKakaoTemplates', '_nfCustomerMsg']) {
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

console.log('━━ ⑧ 솔라피에서 승인 템플릿을 불러오면 켜진 고객 알림이 전부 이어진다 · 기존 매핑은 지우지 않는다 [TPL_KEEP]');
{ const tl = (n, st, id) => ({ name: 'T' + String(n).padStart(2, '0') + ' 시험', templateId: id || ('KA01TP_T' + n), status: st || 'APPROVED' });
  cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); W.tplList = Array.from({ length: 30 }, (_, i) => tl(i + 1));
  G.importKakaoTemplates();
  let got = {}; try { got = JSON.parse(W.props.get('KAKAO_TEMPLATES') || '{}'); } catch (e) {}
  const miss = EV.filter((e) => !got[e]);
  say(!miss.length, `T01~T30 이 전부 승인이면 켜진 고객 알림 ${EV.length}종 전부 매핑(번호가 빠진 알림 없음)`, miss.join(', '));
  cfg({ KAKAO_TEMPLATES: JSON.stringify({ 'cust.consultDone': 'OLD17', 'cust.handMade': 'HAND' }) }); fresh();
  W.tplList = [tl(1, 'APPROVED', 'NEW01'), tl(17, 'REJECTED', 'REJ17'), tl(20, 'INSPECTING', 'WAIT20'), tl(21, 'APPROVED', 'NEW21')];
  G.importKakaoTemplates();
  got = {}; try { got = JSON.parse(W.props.get('KAKAO_TEMPLATES') || '{}'); } catch (e) {}
  say(got['cust.consultDone'] === 'OLD17' && got['cust.handMade'] === 'HAND', '목록에 안 잡힌 기존 매핑(반려된 새 판 · 이름이 T## 가 아닌 것)은 그대로 둔다', JSON.stringify(got));
  say(got['cust.consultConfirmed'] === 'NEW01' && got['cust.resultRetouch'] === 'NEW21' && !got['cust.resultOriginal'], '승인된 것만 더하고 · 검수 중인 것은 넣지 않는다', JSON.stringify(got));
  const L = W.logs.join('\n');
  say(/아직 템플릿이 없는 고객 알림/.test(L) && L.indexOf('cust.resultOriginal') >= 0, '저장 뒤 아직 빠진 알림을 이름으로 알려 준다', L.slice(-300)); }

console.log('━━ ⑨ setKakaoTemplates 를 칸이 빈 채로 눌러도 매핑이 지워지지 않는다 [TPL_KEEP]');
{ const before = tplAll(); cfg({ KAKAO_TEMPLATES: before }); fresh(); G.setKakaoTemplates();
  say(W.props.get('KAKAO_TEMPLATES') === before, `매핑 ${EV.length}건 그대로`, String(W.props.get('KAKAO_TEMPLATES')).slice(0, 120)); }

console.log('━━ ⑩ 대체 메일 — 주소는 버튼으로 · 본문에 글자 주소가 찍히지 않는다 [MAIL_FOCUS_URL]');
{ const bad = [], generic = [], lost = [];
  for (const ev of EV.filter((e) => ELSEWHERE.indexOf(e) < 0)) {
    cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); send(ev, cust('010-1234-5678', COUPLE));
    const m = W.mails.find((x) => x.to === COUPLE); if (!m) { bad.push(ev + '(메일 없음)'); continue; }
    const vis = m.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    if (/momentedit\.kr\/mypage/i.test(vis)) bad.push(ev);
    if (/안내드립니다$/.test(m.subject) && !/일정을 안내드립니다$/.test(m.subject)) generic.push(ev);
    const txt = (G._nfCustomerMsg(ev, '김희준·이미쿠', { amount: 1100000, dday: 10, date: '2026-10-26', time: '13:20' }) || {}).text || '';
    const f = (txt.match(/\?focus=([a-z]+)\s*$/i) || [])[1];
    if (f && m.html.indexOf('href="https://momentedit.kr/mypage.html?focus=' + f + '"') < 0) lost.push(ev + '→' + f);
  }
  say(!bad.length, '본문에 «momentedit.kr/mypage…» 글자가 없다', bad.join(', '));
  say(!lost.length, '버튼이 그 카드로 바로 간다(?focus= 유지)', lost.join(', '));
  say(!generic.length, '제목이 «안내드립니다» 하나로 뭉개진 알림이 없다', generic.join(', ')); }

console.log('━━ ⑪ 신청 문안의 변수 = 코드가 넣는 변수 · 켜진 알림은 전부 문안이 있다 [TPL_KEEP]');
//   ★솔라피는 템플릿의 #{…} 를 코드가 보낸 값으로 채운다. 문안에서 이름을 하나 바꿔 신청하면 승인이 나도 발송이 거절된다.
//     문안 파일이 곧 «콘솔에 붙여넣을 원본»이라 여기서 코드와 맞춘다(2026-09-25 T20~T22 를 쓰며 만든 검사).
//   ★단위 스위트(automation/tests/notify-msg.test.js ⑦)도 변수를 대조하지만 «블록 수»를 고정해 센다 —
//     새 알림을 켜고 문안을 안 쓰면 그쪽은 모른다. 여기는 «켜진 알림마다» 문안이 있는지를 본다.
//     실제로 그랬다: 켜진 19종 중 셋(원본·보정본·환불 계좌)은 문안 자체가 없었다.
{ let doc = '';
  try { doc = readFileSync(new URL('../../automation/알림톡_템플릿_신청문안.md', import.meta.url), 'utf8'); } catch (e) {}
  say(doc.length > 1000, '신청 문안 파일을 읽었다', 'automation/알림톡_템플릿_신청문안.md 없음');
  const lines = doc.split('\n'), seen = new Set(), wrong = [];
  const sample = { date: '2026-10-26', time: '13:20', slot: '12:20', dday: 10, kind: '중도금', amount: 300000, reason: '사유', left: 2, expires: '2026-12-01', title: '스타벅스 커피 2잔', expiry: '2026-12-31' };
  for (let i = 0; i < lines.length; i++) {
    if (!/^### T\d+ · /.test(lines[i])) continue;
    const evs = (lines[i].match(/`cust\.[A-Za-z]+`/g) || []).map((x) => x.slice(1, -1));
    let j = i + 1; while (j < lines.length && !/^```/.test(lines[j]) && !/^### /.test(lines[j])) j++;
    if (j >= lines.length || !/^```/.test(lines[j])) continue;
    let k = j + 1; const body = []; while (k < lines.length && !/^```/.test(lines[k])) body.push(lines[k++]);
    const dv = [...new Set((body.join('\n').match(/#\{[^}]+\}/g) || []))].sort();
    for (const ev of evs) { seen.add(ev);
      const m = G._nfCustomerMsg(ev, '김희준·이미쿠', sample); if (!m) { wrong.push(ev + ' 코드에 문구 없음'); continue; }
      const cv = Object.keys(m.vars || {}).sort();
      if (dv.join(',') !== cv.join(',')) wrong.push(`${ev} 문안 ${dv.join(' ')} ≠ 코드 ${cv.join(' ')}`); }
  }
  say(!wrong.length, '문안마다 #{…} 가 코드가 보내는 변수와 같다', wrong.join(' | '));
  const noDoc = EV.filter((e) => !seen.has(e));
  say(!noDoc.length, `켜진 고객 알림 ${EV.length}종 전부 신청 문안이 있다`, noDoc.join(', ')); }

console.log('━━ ⑫ 알림톡이 못 나가면 까닭과 상관없이 고객 메일로 · 아침 재시도는 아무것도 안 닿았을 때만 [KAKAO_FAIL_MAIL]');
{ const ev = EV.find((e) => ELSEWHERE.indexOf(e) < 0);
  const run = (over, phone, email) => { cfg(Object.assign({ KAKAO_TEMPLATES: tplAll() }, over || {})); fresh(); const r = send(ev, cust(phone || '010-1234-5678', email === undefined ? COUPLE : email)); return r; };
  let r = run({ SOLAPI_API_KEY: '' });
  say(r === 'mail' && kakao().length === 0 && toCouple() === 1 && toAdmin() === 1, '솔라피 키 누락 — 알림톡 없이 고객 메일 1통 · 관리자 1통 · 반환 mail', `${r} · 카톡 ${kakao().length} · 고객 ${toCouple()} · 관리자 ${toAdmin()}`);
  r = run({}, '02-123-4567');
  say(r === 'mail' && kakao().length === 0 && toCouple() === 1 && toAdmin() === 1, '연락처 형식 이상 — 고객 메일 1통(종전 0통) · 관리자 1통', `${r} · 카톡 ${kakao().length} · 고객 ${toCouple()} · 관리자 ${toAdmin()}`);
  r = run({}, '02-123-4567', '');
  say(r === false && toCouple() === 0 && toAdmin() === 1, '연락처 이상 + 메일도 없음 — 반환 false(아침에 다시) · 관리자 1통', `${r} · 관리자 ${toAdmin()}`);
  r = run({ KAKAO_TEMPLATES: '{}' });
  say(r === 'mail', '템플릿 없음 — 메일이 나갔으면 반환 mail(종전 false 라 아침마다 같은 메일이 또 나갔다)', String(r));
  cfg({ KAKAO_TEMPLATES: '{}' }); fresh(); W.night = true; send(ev, cust('010-1234-5678', COUPLE)); W.night = false;
  G.flushHeldNotifies(); const d1 = toCouple(); const q1 = JSON.parse(W.props.get('NOTIFY_HOLD') || '[]').length;
  W.mails = []; G.flushHeldNotifies(); G.flushHeldNotifies(); const d23 = toCouple();
  say(d1 === 1 && q1 === 0 && d23 === 0, '밤 보류 → 아침 메일 1통 · 큐 비움 · 다음 날들 0통', `첫날 ${d1} · 남은 큐 ${q1} · 이후 ${d23}`);
  const sheets = {}; const mk = () => { const rows = []; return { rows, appendRow: (x) => rows.push(x.slice()), getLastRow: () => rows.length, setFrozenRows() {},
    getRange: (a, b, na, nb) => ({ getValues: () => Array.from({ length: na || 1 }, (_, i) => Array.from({ length: nb || 1 }, (_, j) => (rows[a - 1 + i] || [])[b - 1 + j])), setValue: (v) => { rows[a - 1][b - 1] = v; } }) }; };
  G.SpreadsheetApp = { getActive: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mk()) }) };
  const rep = (sc, msg, email) => { cfg({ KAKAO_TEMPLATES: tplAll() }); fresh(); W.cust = cust('010-1234-5678', email === undefined ? COUPLE : email);
    sheets['알림톡추적'] = mk(); sheets['알림톡추적'].appendRow(['messageId', '시각', 'code', 'event', 'text', '상태']);
    sheets['알림톡추적'].appendRow(['MID', new Date(), 'ME-SIM', ev, '[모먼트에디트] 김희준·이미쿠님, 안내 momentedit.kr/mypage.html', '발송']);
    G.handleSolapiReport([{ messageId: 'MID', statusCode: sc, statusMessage: msg }]); return sheets['알림톡추적'].rows[1][5]; };
  const cases = [['3104', '카카오톡 미사용자', '이메일', 1], ['3999', '', '이메일', 1], ['3050', '비정상 번호', '이메일', 1], ['4000', '수신완료', '완료', 0], ['3000', '이통사 접수 예정', '확인', 0], ['', '성공', '완료', 0]];
  const badRep = [];
  for (const [sc, msg, want, mails] of cases) { const st = rep(sc, msg); if (st !== want || toCouple() !== mails) badRep.push(`${sc || '-'}«${msg}» → ${st} · 메일 ${toCouple()}`); }
  say(!badRep.length, '전달결과 리포트 — 목록 밖 실패 코드도 메일 · 성공·진행 중은 메일 없음 · «비정상»은 성공 아님', badRep.join(' | '));
  const st = rep('3104', '카카오톡 미사용자', '');
  say(st === '이메일' && toCouple() === 0 && toAdmin() === 1 && W.hist.some((h) => /카톡 전달 실패/.test(h)), '전달 실패 + 메일도 없음 — 처리이력 한 줄 + 관리자 1통', `${st} · 관리자 ${toAdmin()} · 이력 ${W.hist.join(' | ')}`); }

console.log(rc ? '━━ notify-e2e — 틀린 곳이 있습니다' : '━━ notify-e2e — 전부 통과');
process.exit(rc);
