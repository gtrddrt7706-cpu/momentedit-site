#!/usr/bin/env node
/* ★[FNS_FULL 2026-09-05] deploy-marks.json 에 «파일별 최상위 함수 전체 목록»을 채운다.
 *
 * 왜 필요했나 — 실측(2026-09-05):
 *   점검이 파일마다 «센티넬 함수 1개 + 표식 몇 개»만 보다 보니, 그 지점보다 아래는 안 봤다.
 *   90_test-utils 는 343줄 중 19줄(6%)까지만, 40_signup 7%, 50_auth-handlers 8%, 10_customers-setup 9%.
 *   → 붙여넣다 뒷부분이 잘려도 「누락 0건」이 나왔다. 사용자가 물은 «누락 없는지»의 사각지대가 여기였다.
 *
 * 무엇을 하나 — 각 .gs 의 `^function 이름(` 을 전부 모아 fns 에 넣는다.
 *   GAS 쪽 deployCheck 가 이름마다 typeof 로 확인하니, 파일 «어느 줄이 잘려도» 그 아래 함수가 사라져 잡힌다.
 *   ★목록은 사이트(deploy-marks.json)에 있으므로 99_deployCheck.gs 를 다시 붙여넣을 필요는 없다.
 *
 * 쓰는 법
 *   node scripts/gen-deploy-fns.mjs          → deploy-marks.json 갱신
 *   node scripts/gen-deploy-fns.mjs --check  → 낡았으면 종료코드 1 (감사·CI 용)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = {};
for (const f of fs.readdirSync(path.join(ROOT, 'automation/platform')))
  if (f.endsWith('.gs')) SRC[f.replace(/\.gs$/, '')] = 'automation/platform/' + f;
SRC['admin'] = 'automation/admin/admin.gs';
SRC['consultation-booking'] = 'automation/consultation/consultation-booking.gs';

/* 99_deployCheck 자신은 뺀다 — 점검 도구라 «올렸는지»의 대상이 아니고,
   이 파일이 돌고 있다는 사실 자체가 존재 증명이다. */
delete SRC['99_deployCheck'];

const fns = {};
for (const [name, rel] of Object.entries(SRC)) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const list = [...src.matchAll(/^function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm)].map(m => m[1]);
  if (list.length) fns[name] = list;
}

/* 같은 이름이 두 파일에 있으면 GAS 는 전역 하나뿐이라 한쪽이 조용히 덮인다 — 생성 단계에서 막는다. */
const seen = new Map(); const dup = [];
for (const [file, list] of Object.entries(fns))
  for (const fn of list) { if (seen.has(fn)) dup.push(`${fn} (${seen.get(fn)} · ${file})`); else seen.set(fn, file); }
if (dup.length) { console.error('★이름이 겹치는 함수 — GAS 전역이 하나라 한쪽이 덮입니다:\n  ' + dup.join('\n  ')); process.exit(2); }

const total = Object.values(fns).reduce((a, b) => a + b.length, 0);
const P = path.join(ROOT, 'deploy-marks.json');
const cur = JSON.parse(fs.readFileSync(P, 'utf8'));
const same = JSON.stringify(cur.fns || null) === JSON.stringify(fns);

if (process.argv.includes('--check')) {
  if (same) { console.log(`✅ 함수 목록 최신 — ${Object.keys(fns).length}개 파일 · ${total}개 함수`); process.exit(0); }
  console.error('★deploy-marks.json 의 함수 목록이 낡았습니다 → node scripts/gen-deploy-fns.mjs 로 갱신하세요');
  const before = cur.fns || {};
  for (const f of new Set([...Object.keys(before), ...Object.keys(fns)])) {
    const a = new Set(before[f] || []), b = new Set(fns[f] || []);
    const add = [...b].filter(x => !a.has(x)), del = [...a].filter(x => !b.has(x));
    if (add.length || del.length) console.error(`  ${f}: +${add.join(',') || '-'} / -${del.join(',') || '-'}`);
  }
  process.exit(1);
}

cur.fns = fns;
fs.writeFileSync(P, JSON.stringify(cur, null, 1) + '\n');
console.log(`✅ 갱신 — ${Object.keys(fns).length}개 파일 · ${total}개 함수 · ${(fs.statSync(P).size / 1024).toFixed(1)}KB`);
