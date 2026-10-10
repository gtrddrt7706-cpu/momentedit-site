// ★[AFTER_HOURS_KST 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-13] 식순 AI 상담의 «답변 시간 밖» 판정 — 답변 시간은 평일 10시 - 18시(KST).
//   종전엔 18시 ~ 9시만 밤으로 봐서 금요일 20시에 «내일 영업시간에»라 했고, 토 · 일 낮과 평일 9 ~ 10시에는 «바로 전달했어요»라 했다.
//   ① api/ritual-advisor.js replyWindowKST 를 표본 시각으로 잰다(열림 · 다음 답변 시작 «오전 10시부터 · 내일 오전 10시부터 · 월요일 오전 10시부터»)
//   ② 응답이 night(= 답변 시간 밖) · replyAt(다음 답변 시작)을 이 함수에서 싣는다
//   ③ 위젯(assets/advisor-widget.js)이 같은 규칙의 사본(function replyWindowKST)을 품었으면 같은 표본으로 잰다 — 아직 없으면 «건너뜀» 한 줄(실패로 세지 않는다)
//   AH_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다. 종료 코드 0 = 통과 · 1 = 실패
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.AH_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const K = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 9, mi);   // 한국 시각 → 절대 시각
// 2027-10-18 = 월요일 (2027-10-23 토요일 기준)
const V = [
  ['월 09:59', K(2027, 10, 18, 9, 59), false, '오전 10시부터'],
  ['월 10:00', K(2027, 10, 18, 10, 0), true, ''],
  ['수 09:00', K(2027, 10, 20, 9, 0), false, '오전 10시부터'],
  ['화 00:30', K(2027, 10, 19, 0, 30), false, '오전 10시부터'],
  ['금 17:59', K(2027, 10, 22, 17, 59), true, ''],
  ['월 18:00', K(2027, 10, 18, 18, 0), false, '내일 오전 10시부터'],
  ['목 23:30', K(2027, 10, 21, 23, 30), false, '내일 오전 10시부터'],
  ['금 18:00', K(2027, 10, 22, 18, 0), false, '월요일 오전 10시부터'],
  ['금 20:00', K(2027, 10, 22, 20, 0), false, '월요일 오전 10시부터'],
  ['토 13:00', K(2027, 10, 23, 13, 0), false, '월요일 오전 10시부터'],
  ['일 13:00', K(2027, 10, 24, 13, 0), false, '내일 오전 10시부터'],
  ['일 23:59', K(2027, 10, 24, 23, 59), false, '내일 오전 10시부터'],
];
const same = (fn) => V.filter(([, t, open, next]) => { let r = null; try { r = fn(t); } catch (e) { r = { err: e.message }; } return !(r && r.open === open && r.next === next); }).map(([n]) => n);

// ① 서버 함수
const srcPath = path.join(ROOT, 'api', 'ritual-advisor.js'); const src = fs.readFileSync(srcPath, 'utf8');
let srvFn = null; try { srvFn = require(srcPath).replyWindowKST; } catch (e) { console.log('불러오기 오류', e.message); }
ok('① api/ritual-advisor.js 가 replyWindowKST 를 내보낸다', typeof srvFn === 'function');
if (typeof srvFn === 'function') { const bad = same(srvFn); ok(`① 표본 ${V.length}개 — 평일 10시 - 18시만 열림 · 다음 답변 시작 문구 [AFTER_HOURS_KST]`, !bad.length, bad.join(', ')); }
// ② 응답에 싣기
ok('② 응답의 night 는 replyWindowKST 로 정하고 replyAt 을 함께 싣는다', /const rw = replyWindowKST\(Date\.now\(\)\)/.test(src) && /const night = !rw\.open/.test(src) && /replyAt: rw\.next/.test(src));
// ③ 위젯 사본
const wsrc = fs.readFileSync(path.join(ROOT, 'assets', 'advisor-widget.js'), 'utf8');
const at = wsrc.indexOf('function replyWindowKST(');
if (at < 0) console.log('건너뜀 ③ 위젯은 아직 옛 규칙(nightNowKST 18시 ~ 9시) — 위젯에 function replyWindowKST() 를 두면 이 검사가 같은 표본으로 잰다');
else {
  let i = wsrc.indexOf('{', at), depth = 0, end = -1;
  for (; i < wsrc.length; i++) { if (wsrc[i] === '{') depth++; else if (wsrc[i] === '}') { depth--; if (!depth) { end = i + 1; break; } } }
  const body = wsrc.slice(at, end);
  const bad = same((t) => { const FD = class extends Date { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
    return vm.runInNewContext(body + '\nreplyWindowKST();', { Date: FD }); });
  ok(`③ 위젯 replyWindowKST 도 같은 표본 ${V.length}개 [AFTER_HOURS_KST]`, end > 0 && !bad.length, bad.join(', '));
  ok('③ 위젯 밤 안내가 «내일 영업시간에»로 굳어 있지 않다(다음 답변 시작을 말한다)', !/내일 영업시간에 이어서 답해드려요/.test(wsrc));
}
console.log(fail ? `\nAFTER HOURS FAIL ${fail}` : '\nAFTER HOURS OK'); process.exit(fail ? 1 : 0);
