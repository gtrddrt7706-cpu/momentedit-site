#!/usr/bin/env node
/* ★[SAY_LONG_N06 2026-11-19 NIGHT20 #06 R3 · 안 B] 폰 — 소리 내어 읽는 글(.say)이 110자를 넘으면 한 단계 작게(20~24px).
   글 칸 조립 줄이 «say + 110자 넘으면 long»을 붙이는지 · 그 크기가 폰(600px 이하)에만 걸리는지 정적으로 잰다. --selftest 로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const A = "' say'+((st.txt||'').length>110?' long':'')", B = "@media (max-width:600px){ .lf-in.pr .lf-txt.say.long{font-size:clamp(20px,5.4vw,24px)} }";
const judge = (s) => s.includes(A) && s.includes(B);
if (process.argv.includes('--selftest')) { const b = !judge(OP.replace(A, "' say'")) && !judge(OP.replace(B, '')); console.log((b ? 'ok   ' : 'FAIL ') + 'selftest 표시 · 크기 줄을 지우면 빨강'); process.exit(b ? 0 : 1); }
const ok = judge(OP); console.log((ok ? 'ok   ' : 'FAIL ') + '[SAY_LONG_N06] 폰 긴 읽기 글 한 단계 작게'); process.exit(ok ? 0 : 1);
