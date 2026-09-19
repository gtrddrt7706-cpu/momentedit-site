/* 하객 정원·추가금을 말하는 모든 원천이 한 값을 말하는가  [GUEST30_NOFEE]
 *   node scripts/audit/guest-cap-truth.mjs
 *
 * ★왜 — 2026-09-19 점검 실측. 「하객 30명까지 추가금 없음」(대표 지시)을 여섯 파일에 전파했는데,
 *   전파가 «고객 화면»에서 멈췄다. 뒤에 남아 있던 것 넷:
 *     ①95_notify  admin.finalConfirm — 26~30명이면 관리자 메일에 「추가 0원 잔금 합산 청구」(실측 5건).
 *       운영자가 그 줄을 보고 없는 요금을 잔금에 더할 수 있었다.
 *     ②80_production _cLine — 처리이력·관리자 메일에 같은 「추가 0원」.
 *     ③advisor-kb.js price-total — 「25명까지」인데 **두 줄 아래** price-headcount 는 「30명까지는 동일」.
 *       한 묶음 안에서 수가 갈려 있었다.
 *     ④advisor-kb.js guest-ratio — 「합산 25명 이내」. 총원 상한이 25로 읽힌다(실제 30).
 *   넷 다 **값이 틀린 게 아니라 값을 말하는 자리를 빠뜨린 것**이다. 그래서 자리 목록을 검사로 고정한다.
 *
 * ★deploy-contracts.mjs 와 무엇이 다른가 — 그쪽은 «GAS 상수와 배포된 사이트 문장»을 본다(값 계약).
 *   이쪽은 «그 값을 말로 풀어 쓴 자리»를 본다. 상수는 맞는데 문장이 옛 정책인 상태가 ①②③④였다.
 *
 * 종료코드: 0 통과 · 1 어긋남
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 정원은 GAS 리터럴 하나에서만 읽는다 — 숫자를 검사 안에 또 적으면 그게 다음 판의 어긋남이 된다 */
const prod = read('automation/platform/80_production.gs');
const fc = prod.match(/var FINAL_CONFIRM = \{\s*착석:\s*(\d+),\s*최대:\s*(\d+),\s*초과단가:\s*(\d+)\s*\}/);
if (!fc) { console.log('❌ 80_production.gs 에서 FINAL_CONFIRM 리터럴을 못 읽었다 — 원천이 바뀌었으면 이 검사도 함께 고칠 것'); process.exit(1); }
const SEAT = +fc[1], MAX = +fc[2], UNIT = +fc[3];
console.log(`기준(80_production.gs) — 착석 ${SEAT} · 최대 ${MAX} · 초과단가 ${UNIT}`);

const bad = [], ok = [];
const stripGs = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

/* ── ① 돈 문장은 «단가가 0이 아닐 때»만 켜져야 한다 ─────────────────────── */
if (UNIT === 0) {
  const MONEY = [
    ['automation/platform/95_notify.gs', '_nfAdminText · admin.finalConfirm'],
    ['automation/platform/80_production.gs', 'handleSaveProductionTrack · _cLine'],
    ['mypage.html', '고객 화면 인원 안내'],
  ];
  for (const [f, where] of MONEY) {
    const src = f.endsWith('.gs') ? stripGs(read(f)) : read(f);
    /* standing 만 보고 돈 문장을 켜면 26~30명에서 «추가 0원»이 찍힌다 — fee 로 갈랐는지 본다 */
    const guarded = /Number\(x\.fee\) > 0|Number\(_fd\.extraFee\) \|\| 0\) > 0|_sf>0|_fee>0|amount>0/.test(src);
    if (!guarded) bad.push(`${f} (${where}) — 초과단가가 0인데 금액 문장을 fee 로 가르지 않는다. 「추가 0원」이 찍힌다`);
    else ok.push(`${f} 금액 문장 fee 분기`);
  }
}

/* ── ② 정원을 말하는 고정 답변이 «총원 상한»을 25로 말하지 않는가 ─────────── */
const kbFile = 'assets/advisor-kb.js';
const kb = read(kbFile);
/* 「합산 25명 이내」류 — '착석'이 안 붙은 채 25를 총원 상한처럼 말하는 꼴 */
/* ★착석 < 최대 일 때만 걸리는 규칙이다. 전원 착석(SEAT===MAX)이면 「합산 30명 이내」가 정답이라
   그대로 두면 검사가 정답을 틀렸다고 말한다 — 2026-09-19 에 실제로 그렇게 자기모순을 냈다. */
if (SEAT < MAX) {
  const capWrong = new RegExp(`합산\\s*${SEAT}명\\s*(이내|까지)(?!\\s*착석)`, 'g');
  const hits = [...kb.matchAll(capWrong)].map((m) => m[0]);
  if (hits.length) bad.push(`${kbFile} — 「${hits[0]}」: 총원 상한은 ${MAX}명이다(착석 ${SEAT} + 스탠딩 ${MAX - SEAT}). '착석'을 안 붙이면 ${SEAT}명이 상한으로 읽힌다`);
  else ok.push(`${kbFile} 총원 상한 표기`);
} else {
  /* 전원 착석 — 이제 상한보다 작은 수를 «상한처럼» 말하는 자리가 없어야 한다 */
  const smaller = [...kb.matchAll(/합산\s*(\d+)명\s*(이내|까지)/g)].filter((m) => Number(m[1]) < MAX);
  if (smaller.length) bad.push(`${kbFile} — 「${smaller[0][0]}」: 상한은 ${MAX}명인데 더 작은 수를 상한처럼 말한다`);
  else ok.push(`${kbFile} 총원 상한 표기(전원 착석 ${MAX}명)`);
}

/* ── ③ 같은 파일이 두 수를 말하면 둘 다 근거가 있어야 한다 ───────────────── */
for (const [f, must] of [[kbFile, `${MAX}명`], ['api/_kb.js', '추가 요금 없음']]) {
  const src = read(f);
  if (!src.includes(must)) bad.push(`${f} — 「${must}」가 없다. 하객 ${MAX}명·추가금 없음을 말하는 자리가 사라졌다`);
  else ok.push(`${f} 「${must}」 생존`);
}

/* ── ④ 계약서(서명본)가 같은 값을 말하는가 ──────────────────────────────── */
const ct = read('contract/v1-1.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
if (!ct.includes(`총 ${MAX}명까지`)) bad.push(`contract/v1-1.html — 「총 ${MAX}명까지」가 없다`);
else if (UNIT === 0 && /1인당\s*50,000원/.test(ct)) bad.push('contract/v1-1.html — 초과단가가 0인데 「1인당 50,000원」이 살아 있다');
else ok.push('contract/v1-1.html 정원·추가금');

/* ── ⑤ [SEATED30] 서른 분 «전원 착석» — 스탠딩은 폐지된 개념이다 ──────────────
   2026-09-13 대표 지시(검토38) 「서른 분까지 앉아서 식을 볼 수 있게 할 거야」가 대장에 MUST 로
   두 줄 있었는데 코드에 안 내려왔고, 그 사이 2026-09-19 에 내가 계약서·챗봇에 스탠딩을 **다시 썼다**
   (제거 지시 보존 규칙 위반). 근거는 우리 좌석 편집기다 — 6테이블×5석 = 30석을 이미 그리고 있었다.
   그래서 ①정원이 전원 착석인가 ②고객이 읽는 글에 스탠딩이 되살아났는가 를 함께 본다. */
if (SEAT !== MAX) bad.push(`80_production.gs — 착석 ${SEAT} ≠ 최대 ${MAX}. 정책은 「서른 분 전원 착석」이다(2026-09-13 검토38)`);
else ok.push(`전원 착석(착석 ${SEAT} = 최대 ${MAX})`);
{
  const seatSrc = read('mypage.html').match(/var MP_FINAL_POLICY = \{[^}]*\}/);
  if (!seatSrc) bad.push('mypage.html — MP_FINAL_POLICY 를 못 찾았다');
  else if (!new RegExp(`seats\\s*:\\s*${MAX}\\b`).test(seatSrc[0]))
    bad.push(`mypage.html — MP_FINAL_POLICY.seats 가 ${MAX} 이 아니다(서버 동기화 전 화면이 옛 정책을 말한다): ${seatSrc[0]}`);
  else ok.push('mypage.html MP_FINAL_POLICY.seats');
}
/* 고객이 읽는 글에서 스탠딩이 되살아나는지 — 주석은 뺀다(부활 금지 근거가 거기 적혀 있다) */
for (const f of ['contract/v1-1.html', 'assets/advisor-kb.js', 'api/_kb.js', 'inquiry.html', 'automation/consultation/ScreenA_apply.html']) {
  const raw = read(f);
  const body = raw.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  if (/스탠딩/.test(body)) bad.push(`${f} — 고객이 읽는 글에 「스탠딩」이 되살아났다(2026-09-13 검토38 로 폐지된 개념)`);
  else ok.push(`${f} 스탠딩 부활 없음`);
}

for (const s of ok) console.log('  ok ' + s);
if (!bad.length) { console.log(`\n[GUEST30_NOFEE] 자리 ${ok.length}곳 — 어긋남 0`); process.exit(0); }
console.log(`\n[GUEST30_NOFEE] 어긋남 ${bad.length}건`);
for (const b of bad) console.log('  ❌ ' + b);
process.exit(1);
