#!/usr/bin/env node
/* ★[LF_MORE_N06 2026-11-19 NIGHT20 #06 R3 · 안 A] 크게 보기 — 글이 아래 막대 밑으로 이어질 때만 막대 위를 옅게 흐린다.
   _lfMore 를 떼어 «남은 높이 있음 · 없음» 두 판을 실제로 돌리고 · _lFull 이 부르는지 · CSS 가 .lf-more 에만 걸리는지 잰다. --selftest 로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const judge = (s) => { const a = s.indexOf('function _lfMore(f){'); if (a < 0) return 'no fn'; const fn = s.slice(a, s.indexOf('\n', a));
  const mk = (sh, st, ch) => { const cls = new Set(); return { scrollHeight: sh, scrollTop: st, clientHeight: ch, classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) }, addEventListener() {}, cls }; };
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fn + '\nthis.f=_lfMore;', ctx);
  const x = mk(942, 0, 844); ctx.f(x); if (!x.cls.has('lf-more')) return '넘칠 때 안 걸림'; const y = mk(942, 98, 844); ctx.f(y); if (y.cls.has('lf-more')) return '끝까지 내려도 남음'; const z = mk(800, 0, 844); ctx.f(z); if (z.cls.has('lf-more')) return '짧은 글에도 걸림';
  if (!/_lfMore\(f\); setTimeout\(function\(\)\{ _lfMore\(f\); \},350\);/.test(s)) return '_lFull 에서 안 부름';
  if (!s.includes(".ls-full.lf-more .lf-ctl::before{")) return 'CSS'; return ''; };
if (process.argv.includes('--selftest')) { const b = judge(OP.replace(".ls-full.lf-more .lf-ctl::before{", ".ls-full .lf-ctl::before{")) !== '' && judge(OP.replace("(f.scrollHeight-f.scrollTop-f.clientHeight)>4", "true")) !== ''; console.log((b ? 'ok   ' : 'FAIL ') + 'selftest 늘 흐리기 · 조건 지우기 → 빨강'); process.exit(b ? 0 : 1); }
const r = judge(OP); console.log((r ? 'FAIL ' : 'ok   ') + '[LF_MORE_N06] 아래가 더 있을 때만 막대 위 흐림' + (r ? ' → ' + r : '')); process.exit(r ? 1 : 0);
