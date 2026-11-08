#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 4층 · 대본 11/09 00:35] 자리별 쉼 · 구호 안 쉼을 mp3 에서 «들리는 무음»(−30 dB · 10ms 창)으로 잰다
   자리: 조립 기록(SEAT_LOG)의 쉼 가운데를 품는 무음 길이 = 대본 표 «새 목표» ±0.03초
   구호: 그 문장 구간 안에서 «신랑 신부 · 양가 ○○님» 뒤 자리(글자 비율)에 가장 가까운 무음 = 0.38 ±0.03초
   쓰기: node scripts/audit/layer-seats.mjs --seat-log <SEAT_LOG> [--dir <mp3 폴더>] [--adj <나갈 json>] · 종료 0 통과 · 1 밖 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { quietRuns, pcm } from '../lib/cps.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const DIR = arg('--dir') || path.join(ROOT, 'assets/audio/narration');
const LOG = fs.readFileSync(arg('--seat-log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const R4 = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/층4_쉼.json'), 'utf8'));
const TSV = Object.fromEntries(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/쉼자리표_대본값_1108.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')).filter((r) => r[4] && r[4].trim()).map((r) => [r[0] + '#' + r[1], +r[4]]));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const TEXT = Object.fromEntries(man.clips.flatMap((c) => c.sents.map((s) => [String(c.no).padStart(2, '0') + '_' + c.file + '#' + s.i, s.text])));
const cache = {}; const runsOf = (k) => cache[k] || (cache[k] = quietRuns(pcm(path.join(DIR, k + '.mp3')), -30, 0.01));
const rows = [], adj = { seat: {}, call: {} };
for (const x of LOG.filter((x) => x.seat != null && TSV[x.key + '#' + x.seat] != null)) { if (!fs.existsSync(path.join(DIR, x.key + '.mp3'))) continue;
  const { runs } = runsOf(x.key), mid = (x.t0 + x.t1) / 2, r = runs.find((q) => q.a <= mid && q.b >= mid), got = r ? +(r.b - r.a).toFixed(3) : 0, want = TSV[x.key + '#' + x.seat];
  const ok = Math.abs(got - want) <= 0.03 + 1e-9; rows.push({ kind: '자리', id: x.key + '#' + x.seat, want, got, ok }); if (!ok) adj.seat[x.key + '#' + x.seat] = +(want - got).toFixed(3); }
for (const id of R4.calls) { const [key, i] = id.split('#'), s = LOG.find((x) => x.key === key && x.s === +i); if (!s || !fs.existsSync(path.join(DIR, key + '.mp3'))) continue;
  const txt = TEXT[id], m = [...txt.matchAll(/신랑 신부|양가 [가-힣]+님/g)].pop(), hc = (t) => (t.match(/[가-힣]/g) || []).length, ratio = m ? hc(txt.slice(0, m.index + m[0].length)) / hc(txt) : 1;
  const { runs } = runsOf(key), inside = runs.filter((r) => r.a >= s.a - 0.01 && r.b <= s.b + 0.01), talk = inside.filter((r) => r.b - r.a >= 0.12);   // 부르는 말 뒤 틈 = 0.12초 넘는 무음(«맞절» 안 ㅈ 막힘 같은 짧은 골은 뺀다)
  const h = s.a + ((inside.find((r) => r.a <= s.a + 0.01) || { b: s.a }).b - s.a), e = (inside.filter((r) => r.b >= s.b - 0.01).pop() || { a: s.b }).a, at = h + ratio * (e - h);
  const c = talk.filter((r) => r.a > h + 0.01 && r.b < e - 0.01).map((r) => ({ ...r, d: Math.abs((r.a + r.b) / 2 - at) })).sort((p, q) => p.d - q.d)[0];
  const got = c && c.d < 0.6 ? +(c.b - c.a).toFixed(3) : null, want = R4.call, ok = got != null && Math.abs(got - want) <= 0.03 + 1e-9;
  rows.push({ kind: '구호', id, want, got, ok }); if (got != null && !ok) adj.call[id] = +(want - got).toFixed(3); }
if (arg('--adj')) fs.writeFileSync(arg('--adj'), JSON.stringify(adj));
const bad = rows.filter((x) => !x.ok);
console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-seats — 자리 ${rows.filter((x) => x.kind === '자리').length} · 구호 ${rows.filter((x) => x.kind === '구호').length} · ±0.03 밖 ${bad.length}`);
for (const x of bad) console.log('  밖', x.kind, x.id, '목표', x.want, '실제', x.got);
if (process.argv.includes('--all')) for (const x of rows) console.log(' ', x.kind, x.id, x.want, x.got);
process.exit(bad.length ? 1 : 0);
