#!/usr/bin/env node
/* ★[PAIR_ARIA_N06 2026-11-19 NIGHT20 #06 R3] 고르기 «축사 · 축가» 칸의 읽어 주는 이름 — 다른 칸과 같은 «○○ 담기» + aria-pressed.
   종전 «축가 빼기»(상태에 따라 말이 바뀜)와 «눌림»이 겹쳤다. 두 칸 조립 줄을 정적으로 잰다 · --selftest 로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const PAIR = "aria-label=\"'+esc(on?PN[w]+' 담기':'축사 또는 축가 담기')+'\"", ONE = "aria-label=\"'+esc(nm)+' 담기\"";
const judge = (s) => s.includes(PAIR) && s.includes(ONE) && !/aria-label="'\+esc\(on\?PN\[w\]\+' 빼기'/.test(s);
if (process.argv.includes('--selftest')) { const b = !judge(OP.replace(PAIR, "aria-label=\"'+esc(on?PN[w]+' 빼기':'축사 또는 축가 고르기')+'\"")); console.log((b ? 'ok   ' : 'FAIL ') + 'selftest 옛 «빼기»로 되돌리면 빨강'); process.exit(b ? 0 : 1); }
const ok = judge(OP); console.log((ok ? 'ok   ' : 'FAIL ') + '[PAIR_ARIA_N06] 축사 · 축가 칸도 «담기» + 눌림'); process.exit(ok ? 0 : 1);
