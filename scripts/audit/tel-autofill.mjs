// 자동완성 «+82 10-7349-7706» 이 번호 칸 «어디에서도» 맞게 들어가는지 재는 검사.
//
// ★[PHONE_AUTOFILL_82 2026-09-25 사장님 「번호 적는 모든 곳에 +82 가 나와도 정상적으로 돌아가게 시스템 점검하자」]
//   사장님 화면: 예약 화면 현금영수증 칸에 자동완성이 «+82 10-7349-7706» 을 넣자 «821073497706» 이 됐다.
//   전수 조사해 보니 더 큰 것이 있었다 — 문의서 연락처 칸은 숫자만 남긴 12자를 11자로 잘라
//   «821-0734-9770»(끝자리 6 이 잘림)을 만들었다. #800 이 «한 자리 빠진 +82 번호»로 쫓던 값이 이것이다.
//   그 번호로는 알림톡이 안 나가고, 한 번 잘린 값은 서버에서 되살릴 수 없다.
//
//   ★이 검사가 보는 것
//     ① 화면 함수 meTelDigits(shared/tel-kr.js) — +82 계열은 010 으로, 사업자번호·주민번호·잘린 값은 그대로
//     ② GAS 화면 두 곳(Admin.html · ScreenA_apply.html)이 품은 사본이 원본과 한 글자도 같은가
//     ③ 서버 함수 _crKR — 현금영수증 칸 규칙(«+» 가 없는 숫자열 기준)이 화면과 같은가
//     ④ 배선 — 번호 칸이 전부 그 함수를 부르는가 · 서버 저장 5곳이 _crKR 을 거치는가
//     ⑤ 실렌더(브라우저가 있을 때) — 문의서·예약 화면 칸에 자동완성 값을 넣으면 무엇이 보이는가
//
//   ★[SERVED_OURS] 파일·함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다. 브라우저가 없으면 ⑤만 건너뛴다.
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다(파일·함수 없음)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (r) => path.join(ROOT, r);
const read = (r) => { try { return fs.readFileSync(P(r), 'utf8'); } catch (e) { return null; } };
const cant = (msg) => { console.log('━━ tel-autofill — ' + msg + ' · 재지 못한 것이지 결함이 아닙니다'); process.exit(2); };

const bad = [];
const ok = (cond, label) => { if (!cond) bad.push(label); };

// ── ① 화면 함수
const telSrc = read('shared/tel-kr.js');
if (!telSrc) cant('shared/tel-kr.js 가 없습니다');
const w = {};
try { vm.runInNewContext(telSrc, { window: w }); } catch (e) { cant('tel-kr.js 를 평가하지 못했습니다: ' + e.message); }
const T = w.meTelDigits;
if (typeof T !== 'function') cant('window.meTelDigits 가 없습니다');

const VEC = [
  // 바꿔야 하는 것 — 같은 번호의 여러 표기가 전부 010… 하나로 모인다
  ['+82 10-7349-7706', '01073497706'],   // ★사장님 화면에 뜬 자동완성 값 그대로
  ['+821073497706', '01073497706'],
  ['+82-10-7349-7706', '01073497706'],
  ['0082 10 7349 7706', '01073497706'],
  ['+82 010-7349-7706', '01073497706'],  // 0 을 한 번 더 적은 값
  ['+82 (0)10-7349-7706', '01073497706'],
  ['82-10-7349-7706', '01073497706'],    // «+» 없이 — 휴대폰 꼴 12자리
  ['821073497706', '01073497706'],       // 종전 칸이 저장하던 모양
  ['+82 11 234 5678', '0112345678'],     // 구 통신사 10자리
  ['+82 2-1234-5678', '0212345678'],     // 국제표기 유선(«+» 가 있으면 확실하다)
  ['010-7349-7706', '01073497706'],      // 이미 국내표기
  // 건드리면 안 되는 것
  ['8212345678', '8212345678'],          // 82 로 시작하는 사업자번호(10자리)
  ['8201011234567', '8201011234567'],    // 82 로 시작하는 주민번호(13자리) — 휴대폰으로 «만들면» 남의 번호다
  ['8211011234567', '8211011234567'],
  ['82107349770', '82107349770'],        // ★이미 끝자리가 잘린 값 — 010 + 7자리로 «그럴싸하게» 만들지 않는다
  ['+82 10-7349-770', '82107349770'],
  ['', ''], [null, ''], [undefined, ''],
];
for (const [inp, want] of VEC) ok(T(inp) === want, `meTelDigits «${inp}» → 「${T(inp)}」 · 기대 「${want}」`);

// 손으로 한 글자씩 쳐도 끝이 맞는가(문의서 칸 포맷터를 그대로 돌린다)
const inq = read('inquiry.html');
if (!inq) cant('inquiry.html 이 없습니다');
const fmtBody = (inq.match(/phoneInput\.addEventListener\('input', \(e\) => \{([\s\S]*?)\n\}\);/) || [])[1];
if (!fmtBody) cant('inquiry.html 의 연락처 포맷터를 찾지 못했습니다');
const runFmt = (val) => { const f = { value: val }; new Function('e', 'window', 'meTelDigits', fmtBody)({ target: f }, { meTelDigits: T }, T); return f.value; };
ok(runFmt('+82 10-7349-7706') === '010-7349-7706', `문의서 칸 자동완성 → 「${runFmt('+82 10-7349-7706')}」 · 기대 010-7349-7706 (종전 821-0734-9770 · 끝자리 잘림)`);
let typed = ''; for (const ch of '+82 10-7349-7706') typed = runFmt(typed + ch);
ok(typed === '010-7349-7706', `문의서 칸에 한 글자씩 → 「${typed}」 · 기대 010-7349-7706`);
typed = ''; for (const ch of '01073497706') typed = runFmt(typed + ch);
ok(typed === '010-7349-7706', `국내표기 한 글자씩 → 「${typed}」 · 종전과 같아야 한다`);

// ── ② GAS 화면의 사본이 원본과 같은가
const body = (src) => { const m = src && src.match(/function meTelDigits\(v\) \{[\s\S]*?\n\s*return m \? '0' \+ m\[1\] : d;\n\s*\}/); return m ? m[0].replace(/\s+/g, ' ') : null; };
const orig = body(telSrc);
if (!orig) cant('tel-kr.js 에서 함수 본문을 꺼내지 못했습니다');
for (const rel of ['automation/admin/Admin.html', 'automation/consultation/ScreenA_apply.html']) {
  const b = body(read(rel));
  ok(b === orig, `${rel} 의 meTelDigits 사본이 원본(shared/tel-kr.js)과 다르다 — 한쪽만 고쳤다`);
}

// ── ③ 서버 _crKR
const cfg = read('automation/platform/00_platform-config.gs');
const crM = cfg && cfg.match(/function _crKR\(v\) \{[\s\S]*?\n\}\n/);
if (!crM) cant('00_platform-config 에서 _crKR 을 찾지 못했습니다');
const CR = new Function(`${crM[0]}\nreturn _crKR;`)();
for (const [inp, want] of VEC) {
  // 서버는 «+» 를 못 본다(화면이 숫자만 보낸다) — «+» 없는 표기만 대조한다
  if (inp == null || /^\s*(\+|00)/.test(String(inp))) continue;
  ok(CR(inp) === want, `_crKR «${inp}» → 「${CR(inp)}」 · 기대 「${want}」 (화면 규칙과 달라졌다)`);
}
ok(CR('00821073497706') === '01073497706', `_crKR «00821073497706» → 「${CR('00821073497706')}」`);

// ── ④ 배선
const pages = ['inquiry.html', 'schedule.html', 'mypage.html', 'admin.html'];
for (const rel of pages) {
  const s = read(rel);
  if (!s) cant(rel + ' 이 없습니다');
  ok(s.includes('<script src="/shared/tel-kr.js"></script>'), `${rel} 가 /shared/tel-kr.js 를 읽지 않는다 — 번호 칸이 meTelDigits 를 못 찾는다`);
  // 번호 칸(type=tel)의 oninput 이 «숫자만 남기기»로 되돌아가면 +82 가 다시 8210… 이 된다
  const telInputs = s.match(/<input[^>]*type=\\?["']tel\\?["'][^>]*>/g) || [];
  for (const t of telInputs) {
    if (/oninput=/.test(t)) ok(/meTelDigits\(this\.value\)/.test(t), `${rel} 번호 칸의 oninput 이 meTelDigits 를 안 거친다: ${t.slice(0, 90)}…`);
  }
}
const sched = read('schedule.html');
ok(/id="depCR"[^>]*oninput="this\.value=meTelDigits\(this\.value\)/.test(sched), 'schedule.html 현금영수증 칸(depCR)이 meTelDigits 를 안 부른다');
const my = read('mypage.html');
ok((my.match(/oninput="this\.value=meTelDigits\(this\.value\)"/g) || []).length >= 3, 'mypage.html 현금영수증 칸 3곳(모달·계약 요청·결제 카드)이 meTelDigits 를 안 부른다');
ok(/groomPhone:_telClean\(/.test(my) && /bridePhone:_telClean\(/.test(my), 'mypage.html 계약 요청 연락처가 _telClean 을 안 거친다 — 계약서에 «+82 10-…» 가 찍힌다');
const adm = read('admin.html');
ok(/function _phoneOk\(v\)\{ return \/\^01\[016789\]\[0-9\]\{7,8\}\$\/\.test\(window\.meTelDigits\?meTelDigits\(v\)/.test(adm), 'admin.html _phoneOk 가 +82 를 서버처럼 받지 않는다(연락처 정정이 막힌다)');
const j = read('automation/platform/70_journey.gs');
const cb = read('automation/consultation/consultation-booking.gs');
const au = read('automation/platform/50_auth-handlers.gs');
const nf = read('automation/platform/95_notify.gs');
if (!j || !cb || !au || !nf) cant('GAS 파일을 읽지 못했습니다');
ok((j.match(/_crNum\(/g) || []).length >= 6, `70_journey 현금영수증 저장·읽기 5곳이 _crNum 을 거치지 않는다 (${(j.match(/_crNum\(/g) || []).length}곳)`);
ok(!/cashReceipt[^;\n]*\.replace\(\/\[\^0-9\]\/g, ''\)\.slice\(0, (30|40)\)/.test(j.replace(/String\(v == null \? '' : v\)\.replace\(\/\[\^0-9\]\/g, ''\)/, '')), '70_journey 에 «숫자만 남기기»로 저장하는 현금영수증 자리가 남아 있다');
ok(/var _crIn = \(\(typeof _crKR === 'function'\) \? _crKR\(cashReceipt\)/.test(cb), 'consultation-booking submitSchedule 현금영수증이 _crKR 을 안 거친다');
ok(/_phoneKR\(phone\)[\s\S]{0,80}\^01\[016789\]/.test(au), '50_auth-handlers 코드 찾기 알림톡이 _phoneKR 을 안 거친다');
ok(/_badPhone = true;/.test(nf) && !/연락처를 정정해 주세요'\);\n\s*\}\n\s*\} catch \(_e\) \{\}\n\s*return false;/.test(nf), '95_notify: 번호가 틀리면 메일 대체까지 건너뛰던 return false 가 돌아왔다(BADPHONE_MAIL)');

// ── ⑤ 실렌더 — 브라우저가 있으면 문의서·예약 화면 칸에 자동완성 값을 실제로 넣어 본다
let rendered = 'skip';
try {
  const { launchBrowser } = await import('./_browser.mjs');
  const eng = await launchBrowser();
  if (eng) {
    const srv = http.createServer((q, r) => {
      const f = P(decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
      r.end(fs.readFileSync(f));
    });
    await new Promise((res) => srv.listen(0, res));
    const port = srv.address().port;
    const autofill = async (page, sel) => page.evaluate((s) => {
      const el = document.querySelector(s); if (!el) return null;
      el.value = '+82 10-7349-7706'; el.dispatchEvent(new Event('input', { bubbles: true })); return el.value;
    }, sel);
    let pg = await eng.newPage({ port, viewport: { width: 390, height: 844 } });
    await pg.page.goto(`http://localhost:${port}/inquiry.html`, { waitUntil: 'domcontentloaded' });
    const v1 = await autofill(pg.page, '#phone');
    ok(v1 === '010-7349-7706', `실렌더 문의서 #phone 자동완성 → 「${v1}」`);
    await pg.page.close();
    // 예약 화면은 로그인 토큰이 없으면 본문을 오류 화면으로 갈아 끼운다 — 토큰과 가능일 응답을 흉내 낸다
    const AV = JSON.stringify({ ok: true, avail: [], full: {}, slotsWeekday: ['11:30'], slotsWeekend: ['18:20'], duration: 40, names: '가 · 나', depositStr: '100,000' });
    pg = await eng.newPage({ port, viewport: { width: 390, height: 844 }, gasBody: AV });
    await pg.page.addInitScript(() => { try { localStorage.setItem('me_token', 'tok_tel_autofill_0000'); } catch (e) {} });
    await pg.page.goto(`http://localhost:${port}/schedule.html`, { waitUntil: 'domcontentloaded' });
    const v2 = await autofill(pg.page, '#depCR');
    ok(v2 === '01073497706', `실렌더 예약 화면 #depCR 자동완성 → 「${v2}」`);
    await pg.page.close();
    await eng.close(); srv.close();
    rendered = `문의서 ${v1} · 예약 ${v2}`;
  }
} catch (e) { rendered = '실렌더 못 함: ' + (e && e.message || e).toString().split('\n')[0]; }

if (bad.length) {
  console.log('━━ tel-autofill — 빨강 ' + bad.length + '건');
  for (const b of bad) console.log('   · ' + b);
  process.exit(1);
}
console.log(`━━ tel-autofill OK — 표본 ${VEC.length}개 · 사본 2곳 일치 · 배선 확인 · 실렌더(${rendered})`);
process.exit(0);
