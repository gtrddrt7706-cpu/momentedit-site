#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 5층 · 대본 11/09 19:55] 구절 쉼을 mp3 에서 «들리는 무음»(−30 dB · 5ms 창 · 대본 표 «원래 무음»과 같은 자)으로 잰다 = 표 «넣을 쉼» ±0.03초
   자리: 5층 만들기 기록(LAYER_LOG 의 phrase · at = 깔린 문장 시각) → 깔린 문장(KEEP_IN)과 mp3 문장 구간(SEAT_LOG)을 창 맞춤해 mp3 시각으로 옮긴다
   쓰기: node scripts/audit/layer-phrase.mjs --log <LAYER_LOG> --seat-log <SEAT_LOG> --in <KEEP_IN> [--dir <mp3 폴더>] [--adj <나갈 json>] [--all] · 종료 0 통과 · 1 밖 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pcm } from '../lib/cps.mjs'; import * as P5 from '../lib/phrase5.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const DIR = arg('--dir') || path.join(ROOT, 'assets/audio/narration'), IN = arg('--in');
const rd = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const LOG = rd(arg('--log')).filter((x) => x.phrase != null), SEAT = rd(arg('--seat-log')).filter((x) => x.s != null);
const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/층5_자리.json'), 'utf8'));
const stF = (key, s) => { const f = fs.readdirSync(IN).find((x) => new RegExp('^\\d{4}_' + key.replace(/[-]/g, '\\-') + '_' + s + '(_JOINED_)?\\.flac$').test(x)); return f && path.join(IN, f); };
const cache = {}; const E = (f, a, b) => { const k = f + '|' + a + '|' + b; return cache[k] || (cache[k] = P5.env(pcm(f, a, b))); };
const rows = [], adj = {}, thr = Math.pow(10, -30 / 20);
for (const p of J.places) { const x = [...LOG].reverse().find((q) => q.phrase === p.n); if (!x) { rows.push({ p, miss: '만들기 기록 없음' }); continue; }
  const sp = [...SEAT].reverse().find((q) => q.key === p.key && q.s === p.s), st = stF(p.key, p.s), mp3 = path.join(DIR, p.key + '.mp3');
  if (!sp || !st || !fs.existsSync(mp3)) { rows.push({ p, miss: '구간 · 깔린 파일 · mp3 없음' }); continue; }
  const seg = E(mp3, sp.a, sp.b), ste = E(st), { lag, r } = P5.lagOf(ste, seg, x.at, -1.5, 0.3), t = x.at + lag;   // seg = st + lag(앞 무음 깎기)
  const run = P5.runs(seg, thr).find((q) => !q.head && !q.tail && q.a <= t + 0.01 && q.b >= t - 0.01), got = run ? +(run.b - run.a).toFixed(3) : 0;
  const ok = Math.abs(got - p.want) <= 0.03 + 1e-9; rows.push({ p, want: p.want, got, ok, r: +r.toFixed(3), kind: x.kind, at: +(sp.a + t).toFixed(3) }); if (!ok) adj[p.n] = +((J.adj[p.n] || 0) + (p.want - got)).toFixed(3); }
if (arg('--adj')) fs.writeFileSync(arg('--adj'), JSON.stringify(adj));
const bad = rows.filter((x) => x.miss || !x.ok);
console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-phrase — 자리 ${rows.length}(표 ${J.places.length}) · ±0.03 밖 ${bad.filter((x) => !x.miss).length} · 못 잼 ${bad.filter((x) => x.miss).length} · 창 맞춤 최저 ${Math.min(...rows.filter((x) => x.r != null).map((x) => x.r))}`);
for (const x of bad) console.log('  밖', x.p.n, x.p.id, x.p.w1 + '/' + x.p.w2, x.miss || `목표 ${x.want} 실제 ${x.got} · ${x.kind} · mp3 ${x.at}초`);
if (process.argv.includes('--all')) for (const x of rows) console.log(' ', x.p.n, x.p.id, x.p.w1, x.want, x.got, x.at);
process.exit(bad.length ? 1 : 0);
