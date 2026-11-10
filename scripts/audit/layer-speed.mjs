#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 2층 · 3층] 문장 빠르기 — 조립 기록(LAYER_LOG)으로 정확히: 실제 = 말소리 들어감 ÷ (말소리 들어감 + 늘어난 길이) · 목표 = 그 문장 fac · ±0.5%
   원래 녹음 대비 합계 = fac(창고 원본) · 새 테이크는 fac = 원래 빠르기 맞춤 × 층 빠르기(원래 녹음 대비 결과는 main 과 글자/초로 따로 잰다 · 대본 22:55)
   쓰기: node scripts/audit/layer-speed.mjs --log <기록> [--md <표>] · 종료 0 통과 · 1 실패 · --log 없이 = 표 범위만(merge-guard · 소리 없음) */
import fs from 'node:fs';
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
/* ★[SPEED_FINAL_1110 · 대본 11/10 23:15 배포준비_나레이션_1110 3절] 3층 빠르기 범위 0.878 ~ 1.10 — 3% 넘게 느린 256줄을 빠르게(상한 1.10) · 빠른 4문장 늦춤(가장 낮은 값 0.878)
   옛 기대 0.89 ~ 1.05(대본 11/09 19:55)는 같은 커밋에서 은퇴(RULES_SLIM_1107 ⑧) · 빠르기표_최종_1109.tsv 값이 이 범위를 벗어나면 표가 먼저 틀린 것 */
export const SPEED_MIN = 0.878, SPEED_MAX = 1.10;
const L = !arg('--log') ? [] : fs.readFileSync(arg('--log'), 'utf8').trim().split('\n').map((x) => JSON.parse(x)).filter((x) => x.fac != null);   // 4층 구호 쉼 기록(call)은 빠르기가 아니라 뺀다
const rows = L.map((x) => { const got = x.talkIn / (x.talkIn + (x.outSec - x.inSec)), ok = Math.abs(got - x.fac) <= 0.005 * x.fac && (x.take || x.from || (x.fac >= SPEED_MIN - 1e-9 && x.fac <= SPEED_MAX + 1e-9)); /* 3층 범위 SPEED_MIN ~ SPEED_MAX(아래 · [SPEED_FINAL_1110] · 옛 0.89 ~ 1.05 [대본 11/09 19:55] 은퇴) · 새 테이크는 원래 빠르기 맞춤이 들어 있어 받은 소리 대비 값이 5% 를 넘을 수 있다 — 원래 녹음 대비는 층 빠르기(대본 22:55 · main 대비 따로 잼) */ return { ...x, got: +got.toFixed(4), ok }; });
const bad = rows.filter((x) => !x.ok), caps = rows.filter((x) => x.cap), clips = new Set(rows.map((x) => x.id.split('#')[0]));
const md = `| 문장 | 목표 | 실제 | 상한 | 판정 |\n|---|---|---|---|---|\n` + rows.filter((x) => !x.ok || x.cap || x.take).map((x) => `| ${x.id} | ${x.fac}${x.take ? ' (테이크 · 원래 맞춤 포함 ' + x.want + ')' : ''} | ${x.got} | ${x.cap ? '5% 상한' : ''} | ${x.ok ? 'ok' : '실패'} |`).join('\n');
if (arg('--md')) fs.writeFileSync(arg('--md'), md + '\n');
const r = rows.map((x) => x.got / x.fac).sort((a, b) => a - b);
if (rows.length) console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-speed — 클립 ${clips.size} · 문장 ${rows.length} · 목표 ±0.5% 밖 ${bad.length} · 5% 상한 ${caps.length}${caps.length ? '(' + caps.map((x) => x.id).join(' · ') + ')' : ''} · 실제/목표 ${r[0].toFixed(4)} ~ ${r[r.length - 1].toFixed(4)}`);
for (const x of bad) console.log('  실패', x.id, x.fac, x.got);
if (process.argv.includes('--roles')) { const rc = {}; for (const x of rows) rc[x.role || '(없음 · 0.97)'] = (rc[x.role || '(없음 · 0.97)'] || 0) + 1;
  console.log('  역할별 문장 ' + JSON.stringify(rc)); console.log('  역할 없음(0.97): ' + rows.filter((x) => 'role' in x && !x.role).map((x) => x.id).join(' ')); }
/* [SPEED_FINAL_1110] 표 자체도 범위 안 — 표 «최종 배속» 칸(새 테이크 자리 포함) */
const TB = fs.readFileSync(new URL('../../assets/audio/_src/_layers/빠르기표_최종_1109.tsv', import.meta.url), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')).filter((c) => !(+c[2] >= SPEED_MIN - 1e-9 && +c[2] <= SPEED_MAX + 1e-9));
console.log(`${TB.length ? 'FAIL' : 'ok  '} layer-speed 표 — 빠르기표_최종_1109 범위 ${SPEED_MIN} ~ ${SPEED_MAX} 밖 ${TB.length}${TB.length ? ' (' + TB.map((c) => c[0] + ' ' + c[2]).join(' · ') + ')' : ''}`);
process.exit(bad.length || TB.length ? 1 : 0);
