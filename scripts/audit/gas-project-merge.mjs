// 두 GAS 프로젝트를 «한 프로젝트로 합칠 때» 조용히 죽는 이름을 미리 찍는 검사.
//
// ★[GAS_MERGE_COLLIDE 2026-09-25 사장님 「지금 부부폼 이쪽을 한쪽으로 통합하는 작업을 하고 있는데
//                                        너가 체크한 문제를 혹시 전달하려면 메시지 만들어」]
//   GAS 는 **한 프로젝트 안 모든 .gs 가 전역 하나를 공유**한다. 같은 이름의 함수가 둘이면
//   오류도 경고도 없이 «나중 것»이 이긴다. 합치는 순간 어느 쪽이 이길지는 파일 순서가 정한다.
//   그래서 «합쳤더니 되던 게 안 된다»가 나고, 원인이 코드 어디에도 안 보인다.
//
//   ★제일 위험한 것은 doGet·doPost 다 — 웹앱 진입점이라, 지면 그 프로젝트의 웹훅이 통째로 죽는다.
//     (guest-letter-webhook 의 doPost 는 하객 편지를 받는 자리다)
//
//   이 검사는 «합치지 마라»가 아니다. **합칠 때 무엇을 먼저 정리해야 하는지**를 목록으로 준다.
//   부딪히는 이름이 늘면 빨개지고, 줄이면(이름을 바꾸거나 하나로 합치면) 저절로 초록이 된다.
//   기준선을 박아 두는 이유 — 0 을 요구하면 «지금 당장 고칠 수 없는 빨강»이 되어 아무도 안 본다.
//
//   ★[SERVED_OURS] 파일을 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다(충돌이 늘었다) · 2 재지 못했다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// 「Moment Edit Letter System」 프로젝트 (GAS 편집기의 파일 3개)
const LETTER = {
  formtocouple: 'automation/form-to-couple.gs',
  guestletterwebhook: 'automation/guest-letter-webhook.gs',
  가족청첩장빌드: 'automation/가족청첩장빌드.gs',
};
// 플랫폼 프로젝트 (R3n9Mr) — 합칠 상대
const PLATFORM = [
  'automation/admin/admin.gs',
  'automation/consultation/consultation-booking.gs',
  ...fs.existsSync(path.join(ROOT, 'automation/platform'))
    ? fs.readdirSync(path.join(ROOT, 'automation/platform')).filter(f => f.endsWith('.gs')).map(f => 'automation/platform/' + f)
    : [],
];

const read = (rel) => {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};
for (const rel of [...Object.values(LETTER), ...PLATFORM]) {
  if (read(rel) === null) {
    console.log(`━━ gas-project-merge — ${rel} 이 없습니다 · 재지 못한 것이지 결함이 아닙니다`);
    process.exit(2);
  }
}

const fnsOf = (src) => new Set([...src.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)].map(m => m[1]));
const bodyOf = (src, name) => {
  const re = new RegExp('^function\\s+' + name.replace(/[$]/g, '\\$') + '\\s*\\([^\\n]*\\n(?:.*?\\n)*?\\}\\n', 'm');
  const m = src.match(re);
  return m ? m[0].trim() : null;
};

const platFns = new Map();
for (const rel of PLATFORM) for (const f of fnsOf(read(rel))) if (!platFns.has(f)) platFns.set(f, rel);

// ★진입점은 따로 센다 — 지면 그 프로젝트가 통째로 죽는다
const ENTRY = new Set(['doGet', 'doPost']);
const rows = [];
for (const [proj, rel] of Object.entries(LETTER)) {
  const src = read(rel);
  for (const f of [...fnsOf(src)].sort()) {
    if (!platFns.has(f)) continue;
    const other = platFns.get(f);
    const same = bodyOf(src, f) === bodyOf(read(other), f);
    rows.push({ proj, rel, fn: f, other, same, entry: ENTRY.has(f) });
  }
}

// 기준선 — 지금 있는 충돌. 늘면 빨강, 줄면 «줄었다»고 말하고 통과(그리고 줄여 달라고 적는다).
const BASE = { total: 6, differ: 5, entry: 2 };

const differ = rows.filter(r => !r.same);
const entries = rows.filter(r => r.entry);

console.log('━━ GAS 프로젝트 통합 — 합치면 조용히 겹치는 이름\n');
if (!rows.length) console.log('  겹치는 이름 없음');
for (const r of rows) {
  const mark = r.entry ? '★★진입점' : (r.same ? '  같음(무해)' : '  ★다름');
  console.log(`  ${mark}  ${r.fn.padEnd(20)} ${r.proj}  ↔  ${path.basename(r.other)}`);
}
console.log(`\n  합계 ${rows.length}건 · 구현이 다른 것 ${differ.length}건 · 진입점 ${entries.length}건`);

const bad = [];
if (rows.length > BASE.total) bad.push(`겹치는 이름이 ${BASE.total} → ${rows.length} 로 늘었다`);
if (differ.length > BASE.differ) bad.push(`구현이 다른 충돌이 ${BASE.differ} → ${differ.length} 로 늘었다`);
if (entries.length > BASE.entry) bad.push(`★진입점(doGet·doPost) 충돌이 ${BASE.entry} → ${entries.length} 로 늘었다`);

if (rows.length < BASE.total || differ.length < BASE.differ || entries.length < BASE.entry) {
  console.log(`\n  ✔ 기준선(${BASE.total}/${BASE.differ}/${BASE.entry})보다 줄었다 — 이 파일 위쪽 BASE 를 지금 값으로 내려 잠가 둘 것.`);
}

if (bad.length) {
  console.log('\n━━ gas-project-merge — 빨강 ' + bad.length + '건');
  for (const b of bad) console.log('   · ' + b);
  console.log('\n   합치기 전에 정리하는 법 — 셋 중 하나:');
  console.log('     ① 한쪽 이름을 바꾼다 (예: buildHeaderIndex → fcBuildHeaderIndex) · 가장 안전');
  console.log('     ② 두 구현을 하나로 합친다 · 부르는 쪽을 전부 훑어야 한다');
  console.log('     ③ 진입점(doGet·doPost)은 «합쳐서 분기»하는 수밖에 없다 — 이름을 못 바꾼다');
  process.exit(1);
}
console.log('\n━━ gas-project-merge OK — 충돌이 기준선 이내입니다 (합치기 전 정리 목록은 위 표)');
process.exit(0);
