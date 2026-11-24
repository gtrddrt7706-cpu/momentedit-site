#!/usr/bin/env node
/* ★[RAIL_EMPTY_N06 2026-11-19 야간 점검 #06] 연습 «처음부터 끝까지» 끝 화면 — 줄(LP.q)이 비면 PC 오른쪽 순간 목록(_lRail)을 그리지 않는다.
   종전엔 «예식 순서» 제목만 빈 목록 위에 홀로 섰다. _lRail 을 떼어 내 빈 줄 · 줄 있음 두 판을 실제로 돌려 본다.
   --selftest : 지킴 줄을 지운 함수가 빨강이 되는지 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const GUARD = "  if(!ks.length) return '';";
const grab = (src) => { const a = src.indexOf('function _lRail(st){'); const b = src.indexOf('\nwindow.lsGoK=', a); return a < 0 || b < 0 ? '' : src.slice(a, b); };
const run = (fnSrc, q, st) => { const ctx = { LP: { q }, _inPr: () => true, _mkNo: () => '1', _mkName: (k) => k, _fgMin: () => '', _fgMinRow: () => '', esc: (x) => String(x) }; vm.createContext(ctx); vm.runInContext(fnSrc + '\nthis.__r=_lRail;', ctx); return ctx.__r(st); };
const judge = (src) => { const f = grab(src); if (!f) return false; try { return run(f, [], undefined) === '' && /예식 순서/.test(run(f, [{ k: 'bless' }], { k: 'bless' })); } catch (e) { return false; } };
if (process.argv.includes('--selftest')) {
  const bad = judge(OP.replace(GUARD + "   /*", "   /*")) === false;
  console.log((bad ? 'ok   ' : 'FAIL ') + 'selftest 지킴 줄을 지우면 빨강'); process.exit(bad ? 0 : 1);
}
const ok = judge(OP);
console.log((ok ? 'ok   ' : 'FAIL ') + '[RAIL_EMPTY_N06] 줄이 없으면 오른쪽 목록 없음 · 줄이 있으면 «예식 순서» 목록');
process.exit(ok ? 0 : 1);
