// 서버가 «안 됐다»를 return 으로 돌려주는데 화면이 그걸 «성공»으로 읽는 자리를 찾는다.
//
// ★★[OK_FALSE_GUARD] 2026-09-20 점검 라운드 6 — 브라우저로 재현한 실제 사고에서 나왔다.
//
//   google.script.run 은 «throw 하면 failureHandler · return 하면 successHandler» 다.
//   그래서 서버가 오류를 `return { ok:false }` 로 돌려주면 그것도 **성공 핸들러로 간다.**
//   화면이 반환값을 안 보면 «실패한 요청»에 «접수되었습니다»를 띄운다.
//
//   실제로 그랬다 — ScreenB_schedule 의 successHandler 가 `function(){...}` 로 인자를
//   아예 안 받고 있었고, submitSchedule 은 락 안의 두 갈래를 return 으로 돌려준다
//   (「방금 마감되었어요」 슬롯 선점 · 「서버 혼잡」 락 15초 초과).
//   재현: 서버가 「방금 마감되었어요」를 돌려준 상태에서 화면은
//         「신청이 접수되었습니다 · 9월 21일(월) · 11:30」 확정 모달을 띄웠다.
//         시트 기록·관리자 알림은 그 return «아래»에 있어 아무것도 일어나지 않는다.
//         고객은 오지 않을 연락을 기다린다. 하필 둘이 같은 시간을 고른 순간에 터진다.
//
//   ★지금은 ScreenA(submitApplication)·ScreenC(submitProposal) 가 throw 만 해서 안전하다.
//     그 «안전»은 우연이다 — 서버에 return 한 줄만 늘면 그 화면도 같은 병이 된다.
//     그래서 사람이 기억하는 대신 여기서 대조한다.
//
//   무엇을 보나: 화면이 google.script.run 으로 부르는 함수를 뽑아, 그 .gs 함수가
//   `return { ok: false` 를 하나라도 가지면 → 그 화면의 successHandler 가
//   «인자를 받고» «ok===false 를 보는지» 요구한다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다(파일을 못 읽음)
//   사람이 손으로 잴 때: node scripts/audit/okfalse-handled.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'automation', 'consultation');
const GS = path.join(SRC, 'consultation-booking.gs');
if (!fs.existsSync(GS)) { console.log('못 잼: consultation-booking.gs 가 없다'); process.exit(2); }
const gs = fs.readFileSync(GS, 'utf8');

const screens = fs.readdirSync(SRC).filter((f) => /^Screen.*\.html$/.test(f));
if (!screens.length) { console.log('못 잼: Screen*.html 을 하나도 못 찾았다'); process.exit(2); }

// .gs 함수 이름을 «먼저» 전부 뽑는다.
// ★처음엔 google.script.run 체인을 정규식 하나로 통째로 집어 «끝 메서드»를 서버 함수로 봤는데,
//   게으른 수량자가 체인 «중간»의 `.getElementById(...);` 에서 끊겨 그걸 서버 함수로 잡았다.
//   그래서 .gs 에서 못 찾고 전부 건너뛰어 checked=0 이 됐다. 이름 목록을 먼저 만들고
//   그 이름으로 화면을 뒤지면 끊길 자리가 없다.
const FN_BODY = new Map();
{
  const re = /^function\s+(\w+)\s*\([^)]*\)\s*\{/gm;
  let m;
  while ((m = re.exec(gs))) {
    const from = m.index + m[0].length;
    const rest = gs.slice(from);
    const end = rest.search(/^\}/m);
    FN_BODY.set(m[1], end === -1 ? rest : rest.slice(0, end));
  }
}
if (!FN_BODY.size) { console.log('못 잼: .gs 에서 함수를 하나도 못 뽑았다'); process.exit(2); }

let bad = 0, checked = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);
console.log('━━ okfalse-handled ━━ 서버의 return {ok:false} 를 화면이 읽는가 [OK_FALSE_GUARD]');

for (const f of screens) {
  const h = fs.readFileSync(path.join(SRC, f), 'utf8');
  for (const [fn, body] of FN_BODY) {
    const call = new RegExp('\\.' + fn + '\\s*\\(');
    const at = h.search(call);
    if (at === -1) continue;
    // 그 호출이 google.script.run 체인 안인가 — 바로 앞쪽에서 가장 가까운 run 을 찾는다
    const before = h.slice(0, at);
    const runAt = before.lastIndexOf('google.script.run');
    if (runAt === -1 || at - runAt > 8000) continue;
    const chain = h.slice(runAt, at);
    const retFalse = (body.match(/return\s*\{\s*ok:\s*false/g) || []).length;
    checked++;
    if (!retFalse) { ok(`${f} → ${fn}() — throw 만 한다 (return {ok:false} 0개)`); continue; }
    const sh = chain.match(/withSuccessHandler\(\s*function\s*\(\s*(\w*)\s*\)/);
    const arg = sh && sh[1];
    if (!arg) {
      no(`${f} → ${fn}() 는 {ok:false} 를 ${retFalse}개 돌려주는데 successHandler 가 «인자를 안 받는다». `
        + `google.script.run 은 return 을 성공으로 넘기므로, 실패한 요청에 성공 화면이 뜬다 [OK_FALSE_GUARD]`);
      continue;
    }
    const reads = new RegExp('\\b' + arg + '\\b[\\s\\S]{0,120}?\\.ok\\s*===?\\s*false').test(chain);
    if (!reads) {
      no(`${f} → ${fn}() 는 {ok:false} 를 ${retFalse}개 돌려주는데 successHandler 가 인자 '${arg}' 를 `
        + `받기만 하고 ok===false 를 «보지 않는다» [OK_FALSE_GUARD]`);
    } else {
      ok(`${f} → ${fn}() — {ok:false} ${retFalse}개를 화면이 읽는다`);
    }
  }
}

if (!checked) { console.log('   못 잼: google.script.run 체인을 하나도 못 찾았다 — 통과가 아니다'); process.exit(2); }
console.log(bad ? `   ✗ ${bad}건` : `   ✓ 체인 ${checked}개 모두 정상`);
process.exit(bad ? 1 : 0);
