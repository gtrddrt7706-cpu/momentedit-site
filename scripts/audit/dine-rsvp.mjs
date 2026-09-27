#!/usr/bin/env node
/* [DINE_RSVP_AUDIT] 하객 안내 식사 답 [DINING_RSVP] · 식사 여부 먼저 [MEAL_ASK_FIRST] — 정적 검사(2026-09-27 · 최종 판)
 *
 * ① 값이 한 벌인가 — 서버 DINE_RSVP(restoDue · restoDueDefault · guestGap · maxN · nameMax · from) = guide.html · shared/hydrate.js · mypage.html
 *    이름키 규칙(서버 _drKey = mypage _drKey) · 지우는 날(서버 GUIDE_EXPIRE_DAYS 30 = 하객 알림 «예식 30일 뒤»)
 *    두 분 마무리 끝(mypage _DN_FIN = assets/sequence-modal.js SLOTS end) · 표본 마감 = 표본 예식일 − (기본 3 + 4)
 * ② [DINE_RSVP_SWITCH] 기능 스위치와 처리방침이 같은 말을 하는가 · 스위치 전 고객 변화 0
 *    · 꺼짐(from 이 2099년 이후 = 사장님이 날짜를 아직 안 정함): 처리방침 · 상담 답이 이 기능을 말하지 않는다 ·
 *      새 고객 화면·메일의 들머리가 전부 스위치(live · 서버 rsvp · 기억)를 먼저 본다 · 종전 글(단추 글 · 안내문 · 예시)은 그대로 남아 있다
 *    · 켜짐: from = privacy.html 개정 시행일 · 처리방침에 id="dine-rsvp" 줄 · 상담 답이 새 글
 *    ★켜는 PR 에서 privacy 시행일을 바꾸면 snap-plan 의 «SNAP_V2.from = 시행일» 검사도 고쳐야 한다(docs/plans/DINE_RSVP_privacy_draft.md).
 * ③ 글 — 최종 판의 문장이 그대로 있다(« · »로 잇던 두 절은 마이페이지에서 마침표 두 덩어리 [DOT_SPLIT_0926]) ·
 *    새 고객 글에 «—» · 장식 이모지가 없다(문자열만 잰다 · 주석은 안 잰다) · 진사는 둥근 점으로만
 * ④ 배선 — doPost 세 줄 · setupAllTriggers 한 줄 · guideinfo 화이트리스트 · _prodUiStrip(dineRsvp · restoDue) · 부르는 줄(식사 칸 안)
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(원천 없음)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const gs = read('automation/platform/89_dine_rsvp.gs'), prod = read('automation/platform/80_production.gs'), jr = read('automation/platform/70_journey.gs'),
  cb = read('automation/consultation/consultation-booking.gs'), gd = read('guide.html'), my = read('mypage.html'), hy = read('shared/hydrate.js'),
  pv = read('privacy.html'), kb = read('assets/advisor-kb.js'), sq = read('assets/sequence-modal.js');
if (!gs || !prod || !jr || !cb || !gd || !my || !hy || !pv || !kb || !sq) { console.log('━━ dine-rsvp — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const bad = [], okn = [];
const t = (c, m, d) => (c ? okn : bad).push(m + (c || d === undefined ? '' : '  →  ' + JSON.stringify(d)));
const fnSrc = (src, head) => { const i = src.indexOf(head); if (i < 0) return ''; let d = 0; const j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
/* 문자열 조각만 뽑는다 — 주석(// · /* *\/)은 건너뛴다(주석엔 «—»가 흔하다 · 고객이 읽는 글이 아니다) */
function strings(code) {
  const out = []; let i = 0;
  while (i < code.length) {
    const c = code[i], n = code[i + 1];
    if (c === '/' && n === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? code.length : e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { let j = i + 1, s = ''; while (j < code.length && code[j] !== c) { if (code[j] === '\\') { s += code[j + 1]; j += 2; continue; } s += code[j]; j++; } out.push(s); i = j + 1; continue; }
    i++;
  }
  return out;
}
const ymd = (s) => { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };

// ① 값
const m = gs.match(/var DINE_RSVP = \{ from: '(\d{4})-(\d{2})-(\d{2})', restoDue: \[([\d, ]+)\], restoDueDefault: (\d+), guestGap: (\d+), maxN: (\d+), nameMax: (\d+), maxRows: (\d+) \};/);
const rt = gs.match(/var DINE_RSVP_RATE = \{ min: (\d+), hour: (\d+) \};/);
t(!!m && !!rt, '서버 DINE_RSVP · DINE_RSVP_RATE 를 읽었다');
if (!m || !rt) { bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
const FROM = `${m[1]}-${m[2]}-${m[3]}`, RLIST = m[4].split(',').map((x) => +x.trim()), RDEF = +m[5], GAP = +m[6], MAXN = +m[7], NMAX = +m[8];
t(JSON.stringify(RLIST) === '[7,5,3,1]' && RDEF === 3 && GAP === 4 && MAXN === 6 && NMAX === 20 && +m[9] === 150 && +rt[1] === 20 && +rt[2] === 120,
  `서버 값 — 식당 마감 ${RLIST.join('·')} · 기본 ${RDEF} · 하객은 ${GAP}일 앞 · 인원 1~${MAXN} · 이름 ${NMAX}자 · ${m[9]}줄 · 1분 ${rt[1]} · 1시간 ${rt[2]}(최종 판 7-1 · 7-3 · 7-5)`);
t(/function _dineRsvpDue\(wedYmd, restoN\) \{[\s\S]{0,300}return _drShift\(wedYmd, n \+ DINE_RSVP\.guestGap\);/.test(gs), '하객 마감 계산은 서버 한 곳 — 예식일 − (식당 마감 + guestGap)');
const gF = (gd.match(/var DR_FROM='(\d{4}-\d{2}-\d{2})';/) || [])[1], gN = gd.match(/var DR_MAX_N=(\d+), DR_NAME_MAX=(\d+);/);
t(gF === FROM, `guide.html DR_FROM(${gF}) = 서버 from(${FROM})`);
t(!!gN && +gN[1] === MAXN && +gN[2] === NMAX, `guide.html 인원 ${gN && gN[1]} · 이름 ${gN && gN[2]}자 = 서버`);
const hF = (hy.match(/var DR_FROM = '(\d{4}-\d{2}-\d{2})';/) || [])[1];
t(hF === FROM, `shared/hydrate.js DR_FROM(${hF}) = 서버 from`);
const demo = gd.match(/groom:'이서준', bride:'정하윤', date:'(\d{4}-\d{2}-\d{2})'[\s\S]{0,700}?rsvpDue:'(\d{4}-\d{2}-\d{2})'/);
t(!!demo && (ymd(demo[1]) - ymd(demo[2])) / 864e5 === RDEF + GAP, `표본 마감 = 표본 예식일 − (기본 ${RDEF} + ${GAP})`, demo && demo.slice(1));
const kS = (gs.match(/function _drKey\(s\) \{ return String\(s == null \? '' : s\)\.replace\((\/[^/]+\/g), ''\)\.toLowerCase\(\); \}/) || [])[1];
const kM = (my.match(/function _drKey\(s\)\{ return String\(s==null\?'':s\)\.replace\((\/[^/]+\/g),''\)\.toLowerCase\(\); \}/) || [])[1];
t(!!kS && kS === kM, '이름키 규칙 — 서버 _drKey = mypage _drKey(공백 · 전각 공백 · 가운뎃점 빼고 소문자)', { kS, kM });
t(/var GUIDE_EXPIRE_DAYS = 30;/.test(prod) && /예식 30일 뒤 지워요/.test(gd) && /예식 30일 뒤 지워져요/.test(my) && /var keep = \(typeof GUIDE_EXPIRE_DAYS !== 'undefined'\) \? GUIDE_EXPIRE_DAYS : 30;/.test(gs), '지우는 날 — 서버 GUIDE_EXPIRE_DAYS 30 = 매일 지우기 = 하객 알림 «예식 30일 뒤» = 두 분 화면');
const fin = (my.match(/var _DN_FIN=\{'10:00':'(\d\d:\d\d)','13:20':'(\d\d:\d\d)','16:40':'(\d\d:\d\d)'\};/) || []).slice(1);
const sqEnd = [...sq.matchAll(/end: '(\d\d:\d\d)'/g)].map((x) => x[1]);
t(fin.length === 3 && JSON.stringify(fin) === JSON.stringify(sqEnd), `두 분 마무리 끝 _DN_FIN(${fin.join('·')}) = sequence-modal SLOTS end(${sqEnd.join('·')})`);
t(/var _DN_ARR=\{'10:00':'11:50','13:20':'15:00','16:40':'18:10'\};/.test(my), '예약 시간 예시 = 통화 문구 도착 시각(_DN_ARR 11:50 · 15:00 · 18:10)');
t(/list=s\.restoDue\|\|\[7,5,3,1\]/.test(my) && /\(Number\(s\.restoDueDefault\)\|\|3\)/.test(my) && /gap=Number\(s\.guestGap\)\|\|4/.test(my), '마이페이지는 서버 값(restoDue · restoDueDefault · guestGap)을 쓰고 폴백도 서버와 같다');
t(/restoDue: DINE_RSVP\.restoDue\.slice\(\), restoDueDefault: DINE_RSVP\.restoDueDefault, guestGap: DINE_RSVP\.guestGap/.test(gs), '서버가 부부 화면에 식당 마감 목록 · 기본값 · guestGap 을 준다');

// ② 스위치 · 처리방침 · 스위치 전 고객 변화 0
const OFF = +m[1] >= 2099;
const pvDate = (pv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/) || []).slice(1, 4).join('-');
const pvRow = /<div class="spec-row" id="dine-rsvp">/.test(pv), pvClaim = /식사 참석 답|식사 답/.test(pv);
const KB_NEW = '참석 안내는 모바일 청첩장과 디지털 참석으로 도와드립니다. 예식 뒤 하객분들과 식사 자리가 있으면 하객 안내 페이지에서 식사를 함께하실지 답을 받아, 두 분이 마이페이지에서 인원을 보실 수 있습니다. 예식 참석 회신은 상담에서 안내드립니다.';
const kbItem = (kb.match(/\{ id: 'invite-rsvp',[^\n]*\}/) || [''])[0];
if (OFF) {
  t(!pvRow && !pvClaim, '[꺼짐] 처리방침이 식사 답을 말하지 않는다(실제 동작과 같다)');
  t(kbItem && kbItem.indexOf('식사를 함께하실지') === -1 && /escalate: true/.test(kbItem), '[꺼짐] 상담 답(invite-rsvp)이 식사 답을 말하지 않는다 · escalate 그대로');
} else {
  t(pvDate === FROM, `[켜짐] from(${FROM}) = 처리방침 개정 시행일(${pvDate})`);
  t(pvRow && /<div class="spec-row" id="dine-rsvp">[\s\S]{0,400}식사 참석 답/.test(pv), '[켜짐] 처리방침 1조 «다.» 줄 id="dine-rsvp"(식사 참석 답)');
  t(kbItem.indexOf(KB_NEW) > -1 && /escalate: true/.test(kbItem), '[켜짐] 상담 답(invite-rsvp) 새 글 · escalate 그대로');
}
/* 들머리마다 스위치를 먼저 보는가 — [파일, 함수 머리, 그 안에 있어야 하는 가드, 이름] */
const GATES = [
  [gd, 'function dineRsvpHtml(dn){', /if\(!dn \|\| dn\.rsvp!==true\) return '';/, '하객 답 칸 — 서버 rsvp:true 일 때만'],
  [gd, 'function dineRsvpHtml(dn){', /if\(DR\.wed && drKstToday\(\)>=DR\.wed\) return '';/, '하객 답 칸 — 예식 당일부터 숨김'],
  [gd, 'function drGoneHtml(){', /if\(DEMO \|\| !drMemRead\(\)\) return '';/, '하객 «식사가 없어졌어요» 줄 — 보낸 답(스위치 뒤에만 생김)이 있을 때만'],
  [gd, 'function drDemoOn(){', /return !prod \|\| drKstToday\(\)>=DR_FROM;/, '표본(?g=demo) — 운영 주소에선 스위치 날짜부터'],
  [hy, 'function _drDemoOn() {', /return t >= DR_FROM;/, '오프라인 청첩장 표본 단추 글 — 운영 주소에선 스위치 날짜부터'],
  [my, 'function _invMealShow(m){', /if\(!s \|\| !s\.live\) return false;/, '청첩장 1단계 물음'],
  [my, 'function _drBlockHtml(p){', /if\(!s \|\| !s\.live\) return '';/, '하객 안내 패널 «식사 답»'],
  [my, 'function _guideMakeCond(){', /if\(s && s\.live\) return GUIDE_MAKE_COND_MEAL;/, '완성 화면 · 패널 안내문(새 조건)'],
  [my, 'function _ritPrepFold(rd, base, dd, p){', /if\(_drs && _drs\.live && dd && dd\.dining_on==='Y'\)\{/, '준비 목록 두 줄'],
  [my, 'function _dnArrNow(){', /if\(!_drLiveNow\(\)\) return '';/, '2/2 예약 시간 예시 · «이 시각으로 넣기» · 이른 시각 줄'],
  [my, 'function _dnRdueHtml(d){', /if\(!_drLiveNow\(\) \|\|/, '2/2 식당에 최종 인원 알릴 날'],
  [my, 'function _drTellAfter(){', /if\(!s \|\| !s\.live \|\| !prod\.guideToken\) return;/, '바뀔 때 알리기'],
  [gs, 'function _dineRsvpState(cust, d) {', /st\.open = st\.live && st\.meal && !st\.off && st\.before;/, '서버 «받는 중»(guideView rsvp · byEvent · 칩)'],
  [gs, 'function handleDineRsvp(body) {', /if \(!\(st\.live && st\.meal && !st\.off\)\) return/, '하객 답 저장'],
  [gs, 'function dineRsvpDaily() {', /if \(_dineRsvpLive\(\)\) \{/, '매일 메일(늦은 답 · 식당 마감 전날)'],
];
const ungated = GATES.filter(([src, head, re]) => !re.test(fnSrc(src, head))).map((g) => g[3]);
t(!ungated.length, `[스위치 전 고객 변화 0] 새 고객 화면 · 메일 들머리 ${GATES.length}곳이 스위치를 먼저 본다`, ungated);
t(/_dineRsvpLive\(\)\s*\n\s*&& String\(\(\(\(body && body\.draft\) \|\| \{\}\)\.dining_on\) \|\| ''\)\.trim\(\) === 'Y'\)/.test(prod), '[스위치 전 고객 변화 0] 링크 발급 넓히기도 스위치 뒤');
t(/\+ \(_drLiveNow\(\) \? ' 최종 인원은 언제까지 알려 드리면 될까요\? 먼저 도착하는 분들이 조금 일찍 앉아 계셔도 될까요\?' : ''\)/.test(my), '[스위치 전 고객 변화 0] 통화 문구 두 문장도 스위치 뒤');
t(/var rsvp=!!\(p\.dineRsvp && p\.dineRsvp\.open\);/.test(my), '[스위치 전 고객 변화 0] 칩은 서버 open(스위치 포함)으로');
t(/_paintGuideCta\('\/g\/' \+ encodeURIComponent\(d\.g\), false, d\.rsvp === true\)/.test(hy), '[스위치 전 고객 변화 0] 청첩장 단추 글은 서버 rsvp:true 일 때만');
/* 스위치 전 그대로 보이는 종전 글이 살아 있는가 */
const KEEP = [[hy, '예식 당일의 식사 안내와 자리 찾기를<br>한 곳에 모아 두었어요.'], [my, "var GUIDE_MAKE_COND='<b>애프터&nbsp;웨딩&#8288;(식사)&#8288;·&#8288;좌석 배치</b> 중 하나라도 내용을 채워 완료하면';"],
  [my, "'예: 오후 1시 30분'"], [prod, "if (colOf['안내공유토큰'] && ['dining', 'seat'].indexOf(track) !== -1 && body && body.done && !_guideToken) {"]];
const lost = KEEP.filter(([src, s]) => src.indexOf(s) === -1).map((k) => k[1].slice(0, 40));
t(!lost.length, '[스위치 전 고객 변화 0] 종전 글 · 종전 발급 규칙이 그대로 있다(스위치 전엔 이것이 보인다)', lost);
t((gd.match(/privacy\.html#dine-rsvp/g) || []).length === 1 && fnSrc(gd, 'function drInner(){').indexOf('/privacy.html#dine-rsvp') > -1 && /target="_blank" rel="noopener"/.test(fnSrc(gd, 'function drInner(){')), '«자세히»(#dine-rsvp · 새 탭)는 답 칸 안 한 곳뿐 — 스위치 전엔 그려지지 않는다');

// ③ 글 — 최종 판 그대로
const COPY = [
  [gd, '식사 자리도 함께하시나요?'], [gd, '</b>까지 알려 주세요</p>'], [gd, '>함께할게요<'], [gd, '>예식만 함께할게요<'], [gd, '몇 분이 오시나요?'],
  [gd, '가족이 함께 오시면 한 분만 보내 주세요 · 아이도 한 분으로 세어 주세요'], [gd, '보내시는 분 이름'], [gd, 'placeholder="이름"'],
  [gd, '이름 · 답 · 인원은 두 분의 식사 준비에만 쓰고, 예식 30일 뒤 지워요. 원하지 않으시면 두 분께 직접 알려 주세요. '], [gd, "'동의하고 보내기'"],
  [gd, '알려 주셔서 고맙습니다. 바뀌면 다시 눌러 주세요.'], [gd, '보내 주신 답'], [gd, '보내지 못했어요. 연결을 확인하고 다시 눌러 주세요.'],
  [gd, '예식이 끝난 뒤 함께하는 식사 자리예요. 장소와 시간은 두 분이 정하시면 여기에 적혀요.'], [gd, '보내 주신 식사 답이 있어요 · 지금은 식사 안내가 없어요. 두 분께 여쭤 주세요.'],
  [gd, '표본이라 답이 전해지지 않아요'], [gd, '실제로는 보내는 순간 두 분의 마이페이지에 이름과 인원이 모여요.'],
  [hy, '식사 자리도 함께하시는지 알려 주세요.'], [hy, '예식 당일의 식사 안내와 자리 찾기도 여기에 있어요.'],
  [my, '예식 뒤 하객분들과 함께하는 식사 자리가 있나요?'], [my, "b('Y','있어요')+b('N','없어요')+b('U','아직 몰라요')"],
  [my, "'하객 안내에서 식사 참석을 먼저 여쭤요.','식당은 답을 기다리지 말고 대략 인원으로 먼저 예약해 두세요.'"], [my, "'애프터 웨딩은 «안 함»으로 둘게요.','나중에 바꿀 수 있어요.'"],
  [my, "'식사를 정하시면 하객 안내에 식사 답 칸이 생겨요.','그때 하객 안내 링크를 한 번 더 보내 주세요.'"],
  [my, "' 최종 인원은 언제까지 알려 드리면 될까요? 먼저 도착하는 분들이 조금 일찍 앉아 계셔도 될까요?'"],
  [my, '식당에 최종 인원 알릴 날'], [my, "(n===1?'하루 전':(n+'일 전'))"], [my, '예약할 때 식당에 물어보고 골라 주세요.'], [my, "'하객 화면에는 '+(g.getUTCMonth()+1)+'월 '+g.getUTCDate()+'일까지 알려 달라고 보여요.'"],
  [my, "'하객 마감은 이보다 나흘 앞이에요.'"], [my, '이 시각으로 넣기'], [my, '두 분이 마무리(옷 갈아입기)를 마치고 함께 도착할 수 있는 시각이에요'],
  [my, "'에 마무리가 끝나요.</span><span class=\"ln-bal\">이 시각이면 두 분이 늦게 도착할 수 있어요.</span>'"], [my, "'예: '+_dnSayClock(_dnArrNow())"],
  [my, "'<p class=\"drb-h\">식사 답</p>'"], [my, "'하객 안내의 식사 안내 아래에서 답을 받아요.'"], [my, "'까지 알려 달라고 적혀 있어요.'"],
  [my, "'아직 들어온 답이 없어요.','하객 안내 링크를 보내면 여기에 모여요.'"], [my, "'<div class=\"drb-all\"><span class=\"k\">식당에 알릴 인원</span><span class=\"v\">함께 '+(d.yes||0)+'분 + 두 분 = <b>'+((d.yes||0)+2)+'분</b>"],
  [my, '양가 가족도 함께하시면 «직접 넣기»로 더해 주세요'], [my, "'명단 보기'"], [my, '직접 넣음'], [my, '좌석에 없는 이름'], [my, " 님의 답을 지울까요?'"],
  [my, "'직접 넣기'"], [my, "'링크를 안 쓰시는 어른께 직접 여쭌 답을 넣어요.','같은 이름이면 바뀌어요.'"], [my, "'좌석에서 답이 없는 이름'"],
  [my, '가족이 한 번에 답했으면 여기 남아 있을 수 있어요'], [my, '하객 안내에서 식사 답 받기'], [my, "'하객 화면에서 답 칸이 사라져요.','받은 답은 그대로 있어요.'"],
  [my, "'예식 뒤 하객분들과 식사 자리가 있으면 청첩장 1단계나 애프터 웨딩에서 알려 주세요.','그때부터 하객 안내에서 식사 답을 받아요.'"],
  [my, "_drLn('예식 30일 뒤 지워져요')"], [my, "'식당 예약하기'"], [my, "'대략 인원으로 · 청첩장을 보낼 즈음'"], [my, "'식당에 최종 인원 알리기'"], [my, "' · 하객 안내에서 받은 답을 보고'"],
  [my, "'식사 안내 · 답 받는 중'"], [my, "'식사 답 받는 중 · 장소 미정'"],
  [my, "'식사를 함께한다고 답한 '+n+'분께 바뀐 내용을 직접 알려 주세요', '하객 안내에는 바로 바뀌어 보여요.'"],
  [my, "'이제 하객 안내에서 식사 답을 받아요', '청첩장을 이미 보내셨다면 하객 안내 링크를 한 번 더 보내 주세요.'"], [my, "yes:'하객 안내 링크 보내기'"],
  [gs, "notOpen: '지금은 식사 답을 받지 않아요.'"], [gs, "dayOf: '오늘은 두 분께 직접 알려 주세요.'"], [gs, "noName: '이름을 적어 주세요.'"],
  [gs, "longName: '이름은 20자까지 적을 수 있어요.'"], [gs, "rate: '잠시 뒤에 다시 보내 주세요.'"], [gs, "full: '답이 많이 모였어요. 두 분께 직접 알려 주세요.'"],
  [gs, "busy: '지금은 붐벼요. 잠시 뒤 다시 눌러 주세요.'"], [gs, "'[Moment Edit] 식사 답이 새로 들어왔어요'"], [gs, "'하객 마감(' + _drMd(st.due) + ')이 지난 뒤 들어온 식사 답이에요'"],
  [gs, '식당 예약 인원을 한 번 더 확인해 주세요.'], [gs, "(fresh ? '새로' : '바뀜')"], [gs, "'[Moment Edit] 내일까지 식당에 최종 인원을 알려 주세요'"],
  [gs, "'은 식당에 최종 인원을 알리는 날이에요'"], [gs, "'분이에요. 양가 가족이 함께하시면 더해 주세요.'"]
];
const missC = COPY.filter(([src, s]) => src.indexOf(s) === -1).map(([, s]) => s);
t(!missC.length, `최종 판 글 ${COPY.length}줄이 그대로 있다`, missC);
const NEWFN = [[my, 'function _drLn(a, b){'], [gd, 'function dineRsvpHtml(dn){'], [gd, 'function drInner(){'], [gd, 'function drSend(btn){'], [gd, 'function drGoneHtml(){'],
  [my, 'function _drBlockHtml(p){'], [my, 'function _drbBodyHtml(p){'], [my, 'function _invMealHtml(m){'], [my, 'function _drbDel(key, name){'], [my, 'function _drbAdd(){'], [my, 'function _drbToggle(){'],
  [my, 'function _drTellAfter(){'], [my, 'function _drTellShow(title, body){'], [my, 'function _dnEarlyHtml(v){'], [my, 'function _dnRtimeExtra(d){'], [my, 'function _dnRdueNote(n){'], [my, 'function _dnRdueHtml(d){'],
  [gs, 'function _drMail(code, pl, yes, no) {']];
const lit = [];
NEWFN.forEach(([src, h]) => { const f = fnSrc(src, h); if (!f) bad.push('함수를 못 찾음 ' + h); lit.push(...strings(f)); });
lit.push(...strings((gs.match(/var DINE_RSVP_MSG = \{[\s\S]*?\};/) || [''])[0]));
lit.push(...strings((gd.match(/rsvp:\{ k:'Sample'[^}]*\}/) || [''])[0]));
lit.push(...strings((hy.match(/\+ \(rsvp\n[\s\S]*?\)\n/) || [''])[0]));
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;
const dash = lit.filter((s) => s.indexOf('—') > -1), emo = lit.filter((s) => EMOJI.test(s));
t(lit.length > 80 && !dash.length, `새 고객 글(문자열 ${lit.length}개)에 «—» 없음`, dash);
t(!emo.length, '새 고객 글에 장식 이모지 없음', emo);
{ const cssG = (gd.match(/\.dn-wait\{[\s\S]*?\.dr-edit\{[^}]*\}/) || [''])[0], cssM = (my.match(/\.inv-meal\{[\s\S]*?\.dn-rdue-n\{[^}]*\}/) || [''])[0] + (my.match(/\.drb\{[\s\S]*?\.rit-prep \.rit-prep-go\{[^}]*\}/) || [''])[0];
  const wide = [...(cssG + cssM).matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((r) => /background:var\(--seal/.test(r[2]) && !/border-radius:50%/.test(r[2])).map((r) => r[1].trim());
  t(cssG.length > 500 && cssM.length > 1000 && !wide.length, '진사(--seal) 배경은 둥근 점으로만 — 넓게 칠하지 않는다', wide); }

// ④ 배선
t(/case 'dineRsvp':\s+return jsonOut\(handleDineRsvp\(body\)\);/.test(cb) && /case 'dineRsvpList':\s+return jsonOut\(handleDineRsvpList\(body\)\);/.test(cb) && /case 'dineRsvpEdit':\s+return jsonOut\(handleDineRsvpEdit\(body\)\);/.test(cb), 'doPost — case 세 줄');
t(/\{ fn: 'dineRsvpDaily',\s+hour: 19,/.test(jr), 'setupAllTriggers — dineRsvpDaily 매일 19시');
t(/if \(Object\.prototype\.hasOwnProperty\.call\(gir, 'dineRsvp'\)\) \{ if \(String\(gir\.dineRsvp\) === 'off'\) body\.draft\.dineRsvp = 'off'; \}/.test(prod), 'guideinfo 화이트리스트에 dineRsvp(끌 때만 키)');
t(/if \(track === 'guideinfo'\) delete o\.dineRsvp;/.test(prod) && /if \(track === 'dining'\) delete o\.restoDue;/.test(prod), '_prodUiStrip — dineRsvp · restoDue 는 확인서 비교에서 뺀다');
t(/rsvp: !!\(_drs && _drs\.open\), rsvpDue: \(_drs && _drs\.open\) \? _drs\.due : ''/.test(prod), 'handleGuideView dining 에 rsvp · rsvpDue');
t(/return _g2 \? \{ ok: true, g: _g2, rsvp: _r2 \} : \{ ok: false \};/.test(prod) && /_g2 \+ '\|' \+ \(_r2 \? '1' : '0'\)/.test(prod), 'byEvent 가 rsvp 를 함께(캐시에도)');
const hd = fnSrc(gs, 'function handleDineRsvp(body) {');
t(hd.indexOf('if (!st.before)') > -1 && hd.indexOf('if (!st.before)') < hd.indexOf('if (!(st.live && st.meal && !st.off))'), '서버 검사 순서 — 예식 당일을 «받는 중»보다 먼저(최종 판 7-1)');
const dn = fnSrc(gd, 'function diningHtml(dn){');
t((dn.match(/dineRsvpHtml\(dn\)/g) || []).length === 2 && /h\+=dineRsvpHtml\(dn\);[^\n]*\n\s*if\(restos\.length\) h\+='<div class="subh">함께 들르기 좋은 곳<\/div>';/.test(dn), '식사 칸 안 — 부르는 줄은 카드 쪽 · 카드 없음 쪽 한 줄씩 · «함께 들르기 좋은 곳» 위');
t(/\+_invMealHtml\(m\)/.test(my) && /_invMealWire\(box, collectNames\);/.test(my), '청첩장 1단계 — 물음 · 배선');
t(/\+_drBlockHtml\(p\)/.test(my) && /_drbWire\(p\);/.test(my) && /if\(f==='dine'\)\{ setTimeout\(function\(\)\{ try\{ _drOpenPanel\(\); \}catch\(e\)\{\} \}, 250\); return; \}/.test(my), '하객 안내 패널 — «식사 답» · 패널을 열 때 불러오기 · ?focus=dine');
t(/emailBtn\('https:\/\/momentedit\.kr\/mypage\.html\?focus=dine'/.test(gs), '메일 단추 → ?focus=dine(패널로 바로)');
t(/_ritPrepFold\(rd, base, dd, p\)/.test(my) && /if\(n!==3&&n!==7&&n!==5&&n!==1\)/.test(my), '준비 목록 두 줄 — 상태를 받는다 · dueTxt 가 5 · 1 도 읽는다');
t((my.match(/row\('애프터 웨딩', _dSt, 'mp_diningStart', dLabel, null, \{tag:_dTag\}\)/g) || []).length === 1, '[TRK_NO_SUB] 애프터 웨딩 줄은 이름 · 상태 · 단추만(설명 · 셈 없음)');
t(/\.then\(function\(r\)\{ if\(r && r\.ok && TRKFLOW\.track==='dining'\)\{ try\{ _drTellAfter\(\); \}catch\(e\)\{\} \} return r; \}\);/.test(my), '바뀔 때 알리기 — 애프터 웨딩 저장 뒤 한 번');

if (bad.length) { console.log('━━ dine-rsvp — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ dine-rsvp OK — ${okn.length}항목 · 스위치 ${OFF ? '꺼짐(' + FROM + ') · 고객 변화 0' : '켜짐(' + FROM + ')'} · 값 한 벌 · 처리방침 · 글 · 배선`);
process.exit(0);
