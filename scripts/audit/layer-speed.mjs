#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 2층 · 3층] 문장 빠르기 — 조립 기록(LAYER_LOG)으로 정확히: 실제 = 말소리 들어감 ÷ (말소리 들어감 + 늘어난 길이) · 목표 = 그 문장 fac · ±0.5%
   원래 녹음 대비 합계 = fac(창고 원본) · 새 테이크는 fac ÷ 원래 빠르기 맞춤(match) · 받은 소리 대비 5% 넘으면 상한(cap) 표시
   쓰기: node scripts/audit/layer-speed.mjs --log <기록> [--md <표>] · 종료 0 통과 · 1 실패 */
import fs from 'node:fs';
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const L = fs.readFileSync(arg('--log'), 'utf8').trim().split('\n').map((x) => JSON.parse(x));
const rows = L.map((x) => { const got = x.talkIn / (x.talkIn + (x.outSec - x.inSec)), ok = Math.abs(got - x.fac) <= 0.005 * x.fac && Math.abs(x.fac - 1) <= 0.05 + 1e-9; return { ...x, got: +got.toFixed(4), ok }; });
const bad = rows.filter((x) => !x.ok), caps = rows.filter((x) => x.cap), clips = new Set(rows.map((x) => x.id.split('#')[0]));
const md = `| 문장 | 목표 | 실제 | 상한 | 판정 |\n|---|---|---|---|---|\n` + rows.filter((x) => !x.ok || x.cap || x.take).map((x) => `| ${x.id} | ${x.fac}${x.take ? ' (테이크 · 원래 맞춤 포함 ' + x.want + ')' : ''} | ${x.got} | ${x.cap ? '5% 상한' : ''} | ${x.ok ? 'ok' : '실패'} |`).join('\n');
if (arg('--md')) fs.writeFileSync(arg('--md'), md + '\n');
const r = rows.map((x) => x.got / x.fac).sort((a, b) => a - b);
console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-speed — 클립 ${clips.size} · 문장 ${rows.length} · 목표 ±0.5% 밖 ${bad.length} · 5% 상한 ${caps.length}${caps.length ? '(' + caps.map((x) => x.id).join(' · ') + ')' : ''} · 실제/목표 ${r[0].toFixed(4)} ~ ${r[r.length - 1].toFixed(4)}`);
for (const x of bad) console.log('  실패', x.id, x.fac, x.got);
process.exit(bad.length ? 1 : 0);
