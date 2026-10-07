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
t(!!fr && !!pv && iso(fr) === iso(pv), `VOICE_UP.from(${iso(fr)}) = 처리방침 맨 위 개정 시행일자(${iso(pv)})`);
t(!!fr && !!dl && iso(fr) === iso(dl), `VOICE_UP.from(${iso(fr)}) = 처리방침 «AI 목소리 생성» 위탁 줄 «부터»(${iso(dl)})`);
const row = (priv.match(/id="voice-clone"[\s\S]{0,900}?<span class="spec-val">([^<]*)/) || [])[1] || '';
t(/음성 파일/.test(row) && /AI 목소리/.test(row) && /동의/.test(row), '처리방침 수집 항목 «두 분 목소리» 줄 — 음성 파일 · AI 목소리 · 동의');
const keep = (priv.match(/<span class="spec-key">두 분 목소리<\/span>\s*<span class="spec-val">([^<]*(?:<strong>[^<]*<\/strong>[^<]*)*)<\/span><!-- \[VOICE_OPEN_1008\] 서버 purge/) || [])[1] || '';
t(/다음 날/.test(keep) && /30일/.test(keep), '처리방침 보관 기간 «두 분 목소리» 줄 — AI 목소리 예식 다음 날 · 음성 파일 30일');
const when = (op.match(/when:'([^']*)'/) || [])[1] || '';
t(/예식 다음 날/.test(when) && /30일/.test(when), `동의 화면 «언제 지우나요»도 같은 값 — ${when.slice(0, 60)}…`);
t(priv.indexOf('2026년 10월 8일') > -1 && /개정 공고일자<\/span>\s*<span class="spec-val">2026년 10월 8일/.test(priv), '처리방침 개정 공고일자 2026년 10월 8일');
t((gs.match(/VOICE_OPEN_1008/g) || []).length >= 2, '80_production 에 표식 VOICE_OPEN_1008 (deployCheck 가 붙여넣기를 본다)');
console.log(fail ? `\nVOICE OPEN FAIL ${fail}` : '\nVOICE OPEN OK — 두 분 목소리 전체 오픈 날짜가 서버 · 처리방침 · 위탁 줄에서 같다'); process.exit(fail ? 1 : 0);
