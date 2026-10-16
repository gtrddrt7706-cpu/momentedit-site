// ★★[SCRIPT_SYNTAX_1016 2026-10-16] 검사 스크립트 «자체»의 문법만 본다 — 한 프로세스 · 1초 안.
//
//   node --no-warnings --experimental-vm-modules scripts/audit/script-syntax.cjs        # scripts/ · scripts/audit/ 첫 층 전부
//   node --no-warnings --experimental-vm-modules scripts/audit/script-syntax.cjs a.mjs  # 고른 파일만
//
// 왜 — 검사 파일에 문법 오류가 나면 node 가 종료 코드 1 로 끝나고, merge-guard 의 그 검사 줄은
//   «○○ 기준이 깨졌습니다»로 빨개진다. 검사는 돌지도 않았는데 화면 쪽 실패로 읽힌다.
//   실사고(PR #1256): rec-upload.mjs 에 단 꼬리 // 주석이 같은 줄의 닫는 괄호를 먹었다 —
//   로컬에선 «main 에도 빨간 화면 검사»로 잘못 읽었고 CI 가 잡았다. 같은 꼴(꼬리 주석이 쉼표를 삼킴)이
//   advisor-kb 에도 있었다(EXT_SYNTAX). 여기서는 «어느 파일 · 무슨 오류»를 바로 찍는다.
//
// 읽는 법 — .mjs 는 모듈 문법(vm.SourceTextModule · 플래그가 없으면 node --check 로 대신),
//   .js · .cjs 는 CommonJS 감싸기로 읽고, 거기서 실패하면 모듈로 한 번 더 읽는다(node 22 의 모듈 알아보기와 같다).
// ★처음에 일부러 깨진 글 둘(꼬리 주석이 괄호 · 쉼표를 먹은 꼴)과 멀쩡한 모듈 하나로 자기를 시험한다 —
//   깨진 것을 못 잡으면 이 검사는 죽은 검사라 빨강으로 끝낸다.
// 종료 코드 0 = 통과 · 1 = 문법 오류(또는 자가시험 실패)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const HAS_MODULE = typeof vm.SourceTextModule === 'function';

function parseModule(src, f) {
  if (HAS_MODULE) { new vm.SourceTextModule(src, { identifier: f }); return; }
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    const line = String(r.stderr || '').split('\n').find((x) => /SyntaxError/.test(x)) || 'node --check 실패';
    const e = new SyntaxError(line.replace(/^.*SyntaxError:\s*/, '')); throw e;
  }
}
function parseScript(src, f) {
  new vm.Script('(function (exports, require, module, __filename, __dirname) {' + src + '\n})', { filename: f });
}
// 문법만 본다 — 돌리지 않는다. 오류 글을 돌려주고, 멀쩡하면 ''.
function check(f, srcIn) {
  const src = String(srcIn != null ? srcIn : fs.readFileSync(f, 'utf8')).replace(/^#!.*/, '');
  try {
    if (/\.mjs$/.test(f)) parseModule(src, f);
    else { try { parseScript(src, f); } catch (e) { if (!HAS_MODULE) throw e; parseModule(src, f); } }
    return '';
  } catch (e) { return (e && e.message) || String(e); }
}

// 자가시험 — 메모리 안 글로(파일을 만들지 않는다 · node --check 대신 쓰는 판에서도 같게 보이려면 모듈 판이 필요)
const SELF = [
  { f: 'self-tail-paren.mjs', src: 'ok(`a`, 1 && 2,   // 꼬리 주석 JSON.stringify(c1));\nconsole.log(1);\n', bad: true },
  { f: 'self-tail-comma.js', src: 'const a = {\n  b: 1   // 쉼표를 삼킨 꼬리 주석, c: 2\n  d: 3 };\n', bad: true },
  { f: 'self-good.mjs', src: 'import fs from "node:fs";\nconst x = await Promise.resolve(import.meta.url);\nexport default x;\n', bad: false },
];
const selfBad = [];
if (HAS_MODULE) for (const s of SELF) { const m = check(s.f, s.src); if (!!m !== s.bad) selfBad.push(s.f + (s.bad ? ' — 깨진 글을 못 잡았다' : ' — 멀쩡한 글을 오류로 읽었다: ' + m)); }

const args = process.argv.slice(2);
const files = args.length ? args : ['scripts', 'scripts/audit'].flatMap((d) => {
  const abs = path.join(ROOT, d);
  return fs.readdirSync(abs).filter((n) => /\.(mjs|js|cjs)$/.test(n)).map((n) => path.join(d, n));
});
const bad = [];
for (const f of files) { const m = check(path.isAbsolute(f) ? f : path.join(ROOT, f)); if (m) bad.push(f + ' — ' + m); }

for (const s of selfBad) console.log('BAD 자가시험 ' + s);
for (const b of bad) console.log('BAD ' + b);
console.log(`검사 스크립트 ${files.length}개 · 문법 오류 ${bad.length}` + (HAS_MODULE ? ' · 자가시험 ' + (SELF.length - selfBad.length) + '/' + SELF.length : ' · 모듈 판은 node --check 로 대신'));
process.exit(bad.length || selfBad.length ? 1 : 0);
