// ★[VOICE_OPEN_1008 2026-10-08 사장님 «전체로 오픈해»] 두 분 목소리 전체 오픈 — 결정이 세 곳에서 같은 날짜를 말하는지(스냅 SNAP_V2_FROM 과 같은 결)
//   ① 80_production VOICE_UP.from(서버 날짜 문) ② privacy.html 맨 위 «개정 시행일자» ③ privacy.html «AI 목소리 생성» 위탁 줄의 «부터»
//   ④ 처리방침에 «두 분 목소리» 수집 항목 · 보관 기간 줄이 있다(동의 화면이 약속한 «예식 다음 날» · «30일»과 같은 값) ⑤ 2099 로 되돌아가지 않았다
//   브라우저 없이 돈다(CI 게이트). 종료 코드 0 = 통과 · 1 = 어긋남
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const gs = read('automation/platform/80_production.gs'), priv = read('privacy.html'), op = read('order-preview.html');
let fail = 0; const t = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++; };
const fr = gs.match(/var VOICE_UP = \{ from: '(\d{4})-(\d{2})-(\d{2})' \}/);
const pv = priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/);
const dl = priv.match(/AI 목소리 생성<\/span>[\s\S]{0,600}?(\d{4})년 (\d{1,2})월 (\d{1,2})일부터/);
const iso = (m) => m ? `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}` : '못 읽음';
t(!!fr && fr[1] !== '2099', `서버 날짜 문 VOICE_UP.from = ${iso(fr)} (2099 가 아니다 — 전체 오픈)`);
/* ★[PRIVACY_REV_1031 2026-10-31 사장님 승인] 처리방침은 10/8 뒤로도 개정된다(10/31 두 분 목소리 보관 기간 구체화 · VC_DECISIONS_1030).
   맨 위 «개정 시행일자»는 «가장 최근 개정»이라 VOICE_UP.from 과 같을 까닭이 없다 — 그 날 이후면 된다(스냅 SNAP_V2_FROM 이 10/8 에 같은 길로 풀었다).
   서버 날짜 문과 같아야 하는 것은 «부터» 날짜(위탁 줄 · 아래 줄)와 개정 이력의 «두 분 목소리 항목 추가» 날짜다 — 그 둘은 그대로 VOICE_UP.from 과 같아야 한다.
   맨 위 날짜 = 개정 이력 «개정 공고일자» = «시행일자» 첫 날짜(맨 위만 고치고 이력을 잊는 일 · 그 반대를 막는다). */
const ko = (m) => m ? `${+m[1]}년 ${+m[2]}월 ${+m[3]}일` : '못 읽음';
t(!!fr && !!pv && iso(pv) >= iso(fr), `VOICE_UP.from(${iso(fr)}) ≤ 처리방침 맨 위 개정 시행일자(${iso(pv)}) [PRIVACY_REV_1031]`);
t(!!fr && priv.indexOf(`${ko(fr)} (두 분 목소리 항목 추가`) > -1, `개정 이력에 «${ko(fr)} (두 분 목소리 항목 추가 …)» — 처음 연 날이 이력에 남아 있다 [PRIVACY_REV_1031]`);
const ph = priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2}) \(공고 (\d{4})\.(\d{2})\.(\d{2})\)/);
const pg = priv.match(/개정 공고일자<\/span>\s*<span class="spec-val">(\d{4})년 (\d{1,2})월 (\d{1,2})일<\/span>/);
const ps = priv.match(/시행일자<\/span>\s*<span class="spec-val">(\d{4})년 (\d{1,2})월 (\d{1,2})일 \(/);
t(!!ph && !!pg && iso(ph.slice(3)) === iso(pg) && !!ps && iso(pv) === iso(ps), `맨 위(시행 ${iso(pv)} · 공고 ${ph ? iso(ph.slice(3)) : '못 읽음'}) = 개정 이력(공고 ${iso(pg)} · 시행 ${iso(ps)}) [PRIVACY_REV_1031]`);
t(!!fr && !!dl && iso(fr) === iso(dl), `VOICE_UP.from(${iso(fr)}) = 처리방침 «AI 목소리 생성» 위탁 줄 «부터»(${iso(dl)})`);
const row = (priv.match(/id="voice-clone"[\s\S]{0,900}?<span class="spec-val">([^<]*)/) || [])[1] || '';
t(/음성 파일/.test(row) && /AI 목소리/.test(row) && /동의/.test(row), '처리방침 수집 항목 «두 분 목소리» 줄 — 음성 파일 · AI 목소리 · 동의');
const keep = (priv.match(/<span class="spec-key">두 분 목소리<\/span>\s*<span class="spec-val">([^<]*(?:<strong>[^<]*<\/strong>[^<]*)*)<\/span><!-- \[VOICE_OPEN_1008\] 서버 purge/) || [])[1] || '';
t(/다음 날/.test(keep) && /30일/.test(keep), '처리방침 보관 기간 «두 분 목소리» 줄 — AI 목소리 예식 다음 날 · 음성 파일 30일');
const when = (op.match(/when:'([^']*)'/) || [])[1] || '';
t(/예식 다음 날/.test(when) && /30일/.test(when), `동의 화면 «언제 지우나요»도 같은 값 — ${when.slice(0, 60)}…`);
t(priv.indexOf('2026년 10월 8일') > -1, '처리방침에 «2026년 10월 8일»(두 분 목소리 연 날)이 남아 있다 · 개정 공고일자는 위 [PRIVACY_REV_1031] 줄이 맨 위와 맞춘다');
t((gs.match(/VOICE_OPEN_1008/g) || []).length >= 2, '80_production 에 표식 VOICE_OPEN_1008 (deployCheck 가 붙여넣기를 본다)');
console.log(fail ? `\nVOICE OPEN FAIL ${fail}` : '\nVOICE OPEN OK — 두 분 목소리 전체 오픈 날짜가 서버 · 처리방침 · 위탁 줄에서 같다'); process.exit(fail ? 1 : 0);
