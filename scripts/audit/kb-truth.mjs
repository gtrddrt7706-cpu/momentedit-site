/* ★[KB_TRUTH 2026-08-17 사용자 지시 "주기적으로 핵심정보등을 스스로 학습하게하는건어때?"]
   핵심정보 «자동 재검증» — KB(api/_kb.js)가 고객에게 말하는 사실이 **실제 코드와 맞는지** 대조한다.

   ★«스스로 학습»을 사실 재작성으로 만들지 않은 이유:
     AI 가 제 답을 근거로 사실을 고쳐 쓰면, 틀린 값이 조용히 «최신 사실»이 되어 전 직원에 박힌다.
     가격이 그렇게 틀리면 그대로 청구 사고다. 그래서 방향을 뒤집었다 —
     **고쳐 쓰는 것이 아니라, 어긋났는지 매번 확인한다.** 어긋나면 사람에게 알린다.

   ★이 검사가 잡는 것: 코드는 바뀌었는데 KB 만 옛말을 하는 표류.
     (실제 사고: 곡 선정 칸을 지운 뒤에도 KB 가 열사흘 동안 «마이페이지에서 입력»이라 말했다 — MUSIC_GONE)

   사용: node scripts/audit/kb-truth.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const require_ = createRequire(import.meta.url);
const KB = require_(path.join(SITE, 'api/_kb.js'));
const read = (p) => { try { return fs.readFileSync(path.join(SITE, p), 'utf8'); } catch (e) { return ''; } };

let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

/* ★★[KB_TRUTH_STRICT] 값 대조는 **선언 줄에서 뽑아 숫자로** 한다 — «KB 어딘가에 그 숫자가 있나»(includes)는
   다른 줄의 같은 숫자에 걸려 통과한다. 2026-08-21 확장 때 또 그렇게 짰다가 반증에서 걸렸다:
   추가보정 20,000 → 30,000 으로 틀리게 해도 통과했다(KB 다른 곳에 «20,000»이 또 있었다).
   ★새 항목을 추가할 때 반드시 kbNum(선언라벨) 을 쓸 것. includes 로 짜지 말 것. */
const kbLineOf = (label) => { const m = KB.match(new RegExp('- ' + label + '[^\n]*')); return m ? m[0] : ''; };
const kbNum = (label, unit) => {
  const line = kbLineOf(label); if (!line) return { line: '', v: null };
  const m = line.match(new RegExp('([\\d,\\.]+)\\s*' + (unit || '')));
  return { line, v: m ? Number(String(m[1]).replace(/,/g, '')) : null };
};
const journey = read('automation/platform/70_journey.gs');
const prod = read('automation/platform/80_production.gs');
const invites = ['i/cover-01.html', 'i/cover-02.html', 'i/cover-07.html', 'i-family/family-01.html'].map(read).join('\n');
const mypage = read('mypage.html');

console.log('\n[가격 — KB 가 말하는 값이 코드의 값과 같은가]');
{
  const m = journey.match(/'시그니처':\s*\{\s*평일:\s*(\d+),\s*주말:\s*(\d+)\s*\}/);
  ok(!!m, '코드에서 시그니처 가격을 찾았다', m ? '' : '패턴 불일치 — 검사를 고칠 것');
  if (m) {
    const weekday = Number(m[1]) / 10000, weekend = Number(m[2]) / 10000;
    /* ★★[KB_TRUTH_STRICT 2026-08-17 자체 반증에서 잡음] «KB 어딘가에 그 숫자가 있으면 통과»로 짰더니
       가격을 330→350만으로 틀리게 고쳐도 **검사가 통과했다** — KB 다른 줄(가격 판정 순서)에
       «330만원»이 또 있었기 때문이다. 있는지 없는지가 아니라 **선언 줄의 값**을 뽑아 숫자로 견준다.
       ★includes 로 되돌리지 말 것 — 그러면 이 검사는 다시 통과만 하는 장식이 된다. */
    const kbLine = (label) => { const mm = KB.match(new RegExp('- ' + label + '[^\n]*')); return mm ? mm[0] : ''; };
    const kbWon = (line) => { const mm = String(line).match(/(\d+(?:\.\d+)?)\s*만원/); return mm ? Number(mm[1]) : null; };
    const wkEndLine = kbLine('주말·공휴일 올인원 패키지'), wkDayLine = kbLine('평일결혼식 올인원 패키지');
    ok(kbWon(wkEndLine) === weekend, `주말가 ${weekend}만원이 KB 선언과 일치`, 'KB 선언: ' + (wkEndLine || '(줄 없음)'));
    ok(kbWon(wkDayLine) === weekday, `평일가 ${weekday}만원이 KB 선언과 일치`, 'KB 선언: ' + (wkDayLine || '(줄 없음)'));
  }
}

console.log('\n[결제 정책 — 고객이 가장 자주 묻는 숫자들]');
{
  /* ★[KB_TRUTH_WIDE 2026-08-21 사용자 지시 "추천대로 진행"] 검증 목록을 4개 → 여기까지 넓힌다.
     ★왜 넓히나: 자동 탐지(AUTO_DISAGREE)는 «답이 갈릴 때»만 잡는다.
       다섯 직원이 **똑같이 틀리면** 조용히 넘어간다 — 그 사각을 메우는 것이 이 대조다.
       KB 가 코드와 다른 말을 하면, 갈리든 안 갈리든 여기서 잡힌다.
     ★근거가 코드에 없는 주장은 **여기서 검사하지 않는다** — 없는 대조를 지어내면 그게 또 거짓이 된다. */
  const num = (re, src) => { const m = String(src).match(re); return m ? Number(m[1]) : null; };

  const 예약금 = num(/예약금:\s*(\d+)/, journey);
  const kbDep = kbNum('상담 예약금', '원');
  ok(예약금 != null, '코드에서 예약금을 찾았다', String(예약금));
  ok(kbDep.v === 예약금, `예약금 ${(예약금 || 0).toLocaleString()}원이 KB 선언과 일치`, 'KB 선언: ' + (kbDep.line || '(줄 없음 — 라벨 확인)'));

  const 계약금율 = num(/계약금율:\s*([\d.]+)/, journey), 중도금율 = num(/중도금율:\s*([\d.]+)/, journey);
  ok(계약금율 === 0.1 && 중도금율 === 0.4, '계약금 10% · 중도금 40%(코드)', 'code=' + 계약금율 + '/' + 중도금율);
  ok(KB.includes('10%') && KB.includes('40%'), 'KB 도 같은 비율을 말한다', '');

  const 잔금일 = num(/잔금일수전:\s*(\d+)/, journey), 중도금일 = num(/중도금일수전:\s*(\d+)/, journey);
  ok(new RegExp(`예식[^.]{0,6}${잔금일}일 전`).test(KB) || KB.includes(`D-${잔금일}`), `잔금 기한 D-${잔금일} 이 KB 와 일치`, 'KB 에 없음');
  ok(new RegExp(`예식[^.]{0,6}${중도금일}일 전`).test(KB) || KB.includes(`D-${중도금일}`), `중도금 기한 D-${중도금일} 이 KB 와 일치`, 'KB 에 없음');

  const 서명기한 = num(/서명기한시간:\s*(\d+)/, journey);
  const kbSign = kbNum('★\\[KB_TRUTH_WIDE 2026-08-21\\] 계약서 서명 기한', '시간');
  ok(kbSign.v === 서명기한, `계약서 서명 기한 ${서명기한}시간이 KB 선언과 일치`, 'KB 선언: ' + (kbSign.line || '(줄 없음)').slice(0, 60));
}

console.log('\n[결과물 — 추가 보정 단가·포함 컷]');
{
  const m = prod.match(/RESULT\s*=\s*\{\s*포함보정컷:\s*(\d+),\s*추가보정단가:\s*(\d+)/);
  ok(!!m, '코드에서 결과물 상수를 찾았다', m ? '' : '패턴 불일치 — 검사를 고칠 것');
  if (m) {
    const 포함 = Number(m[1]), 단가 = Number(m[2]);
    const kbEx = kbNum('추가 보정', '원');
    ok(kbEx.v === 단가, `추가 보정 ${단가.toLocaleString()}원이 KB 선언과 일치`, 'KB 선언: ' + (kbEx.line || '(줄 없음)'));
    void 포함;   // 포함 컷은 KB 선언 줄이 따로 없다 — 없는 대조를 지어내지 않는다(있게 되면 여기 추가)
  }
}

console.log('\n[스탠딩 초과 요금 — 잔금에 합산되는 돈]');
{
  const m = prod.match(/FINAL_CONFIRM\s*=\s*\{\s*착석:\s*(\d+),\s*최대:\s*(\d+),\s*초과단가:\s*(\d+)/);
  ok(!!m, '코드에서 인원·초과단가를 찾았다', m ? '' : '패턴 불일치');
  if (m) {
    const 최대 = Number(m[2]), 단가 = Number(m[3]);
    ok(KB.includes(`${최대}명`), `최대 ${최대}명이 KB 에 있다`, 'KB 에 없음');
    const kbStand = kbNum('스탠딩', '원');
    if (kbStand.line) ok(kbStand.v === 단가, `스탠딩 초과 ${단가.toLocaleString()}원이 KB 선언과 일치`, 'KB 선언: ' + kbStand.line);
    else console.log('  · 스탠딩 초과 요금 선언 줄이 KB 에 없다(대조 건너뜀 — 넣으면 자동으로 검사된다)');
  }
}

console.log('\n[하객 수 — 상품 정체성의 핵심 숫자]');
{
  const m = prod.match(/FINAL_CONFIRM\s*=\s*\{[^}]*착석:\s*(\d+)[^}]*최대:\s*(\d+)/);
  ok(!!m, '코드에서 인원 정책을 찾았다', m ? '' : '패턴 불일치');
  if (m) ok(KB.includes(`${m[1]}명`), `착석 ${m[1]}명이 KB 와 일치`, 'KB 에 없음');
}

console.log('\n[청첩장 사진 — 2026-08-17 사고의 그 사실]');
{
  const hasUpload = /type=["']file["']|FileReader/.test(invites + mypage.slice(mypage.indexOf('invStepMethod') || 0, (mypage.indexOf('invStepConfirm') || 0) + 4000));
  ok(!hasUpload, '청첩장 계열에 사진 업로드 경로가 없다(코드 실측)', hasUpload ? '업로드 경로가 생겼다 — KB 를 고칠 것' : '');
  ok(/사진이 들어가는 자리가 처음부터 없다/.test(KB), 'KB 가 그 사실을 말하고 있다 [INV_NO_PHOTO]', 'KB 에서 사라졌다 — 다시 지어낸다');
  ok(!hasUpload === /사진이 들어가는 자리가 처음부터 없다/.test(KB), '코드와 KB 가 같은 말을 한다', '어긋남 — 둘 중 하나가 낡았다');
}

console.log('\n[폐지된 기능을 KB 가 아직 말하고 있지 않은가]');
{
  const musicGone = !/음악|곡 선정/.test(mypage);
  ok(musicGone, '마이페이지에 음악·곡 선정 칸이 없다(폐지 유지)', '');
  if (musicGone) ok(!/마이페이지[^.]{0,20}(음악|곡)[^.]{0,10}입력/.test(KB), 'KB 도 «음악을 입력한다»고 말하지 않는다 [MUSIC_GONE]', 'KB 가 없는 칸을 안내하고 있다');
}

console.log(`\n결과 — ${fail ? ('어긋남 ' + fail + '건 · KB 또는 코드 중 하나가 낡았습니다') : '어긋남 0건 (KB 가 코드와 같은 말을 합니다)'}`);
process.exit(fail ? 1 : 0);
