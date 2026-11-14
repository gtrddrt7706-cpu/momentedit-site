#!/usr/bin/env node
/* ★[CHOP_FIX_1114 · 대본 11/14 «관문 추가: 끊김 검사»] 말 가운데 넣은 디지털 무음 바로 앞에서 말이 툭 끊기는지 잰다
   왜: 5층 «구절 쉼»이 원본에 쉼이 거의 없는 자리(l1len 0.10 미만)를 0.26 ~ 0.33초 디지털 무음으로 넓히면 말소리가 덜 줄어든 채 무음으로 떨어져 끊겨 들린다(대표님 53곳 실청 · 14곳 뺌)
   재는 법(문서 저장소 handoff_1111/rerec_1113/rerecord62/chop_scan.py 와 같음):
     클립 말소리 = 첫 |x|>0.01 ~ 끝 |x|>0.01 · 기준 크기 = 그 안 |x|>0.01 샘플의 RMS(dB)
     디지털 무음 = |x| < 3e-5 가 30ms 이상 · 말 가운데 · 0.6초 미만
     무음 직전 20ms 크기(기준 대비) > −30 dB  또는  (40 ~ 80ms 앞 > −15 dB 이고 직전 20ms > −40 dB) → 끊김 의심
   허용 목록 = assets/audio/_src/_layers/끊김_허용_1114.json(대표님이 듣고 통과시킨 자리 · 클립 + 시각 ±0.05초) · 목록 밖에서 새로 생긴 것만 FAIL
   쓰기: node scripts/audit/layer-chop.mjs [--dir <mp3 폴더>] [--write-allow] · 종료 0 통과 · 1 새 끊김 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pcm } from '../lib/cps.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const DIR = arg('--dir') || path.join(ROOT, 'assets/audio/narration'), ALLOW = path.join(ROOT, 'assets/audio/_src/_layers/끊김_허용_1114.json');
const SR = 48000, TOL = 0.05;
export function scan(f) {
  const y = pcm(f); if (y.length < SR / 2) return [];
  let s = -1, e = -1; for (let i = 0; i < y.length; i++) if (Math.abs(y[i]) > 0.01) { if (s < 0) s = i; e = i; }
  if (s < 0 || e - s < 100) return [];
  let ss = 0, sn = 0; for (let i = s; i < e; i++) if (Math.abs(y[i]) > 0.01) { ss += y[i] * y[i]; sn++; }
  const ref = 20 * Math.log10(Math.sqrt(ss / sn));
  const db = (a, b) => { a = Math.max(0, a); if (b <= a) return -99; let q = 0; for (let i = a; i < b; i++) q += y[i] * y[i]; return 20 * Math.log10(Math.sqrt(q / (b - a)) + 1e-9) - ref; };
  const out = []; let i = s;
  while (i < e) {
    if (Math.abs(y[i]) < 3e-5) { let j = i; while (j < e && Math.abs(y[j]) < 3e-5) j++;
      const d = (j - i) / SR;
      if (d >= 0.03 && d < 0.6) { const pre20 = db(i - 0.02 * SR, i), far = db(i - 0.08 * SR, i - 0.04 * SR);
        if (pre20 > -30 || (far > -15 && pre20 > -40)) out.push({ t: +(i / SR).toFixed(2), d: +d.toFixed(3), pre20: +pre20.toFixed(1), far: +far.toFixed(1) }); }
      i = j; } else i++;
  }
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3')).sort(), hit = {};
  for (const f of files) { const h = scan(path.join(DIR, f)); if (h.length) hit[f.replace(/\.mp3$/, '')] = h; }
  const n = Object.values(hit).reduce((s, a) => s + a.length, 0);
  if (process.argv.includes('--write-allow')) {
    const old = fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')).pending || {} : {}, pending = {};
    for (const k of Object.keys(old)) if (hit[k]) { pending[k] = hit[k]; delete hit[k]; }
    const A = { _왜: '[CHOP_FIX_1114] 끊김 검사 허용 목록 — clips = 대표님이 실청으로 통과시킨 자리(«끊김 아닌 건 그냥 써도 된다» 11/14) · pending = 끊김이지만 다시 녹음을 기다리는 자리(285 «어머님께서는|자리로» · 새 녹음 승인 뒤 엔진에 넣으면 사라진다 · 다시 쓸 때 그대로 둔다) · 클립 → [{t 무음 시작 초, d 길이, pre20, far}] · 새 판에서 ±0.05초 안에 있으면 허용 · 이 목록 밖에서 생기면 layer-chop FAIL · 다시 쓰기: node scripts/audit/layer-chop.mjs --write-allow(대표님 실청 승인 뒤에만)', clips: hit, pending };
    fs.writeFileSync(ALLOW, JSON.stringify(A, null, 1) + '\n'); console.log(`허용 목록 씀 — 클립 ${Object.keys(hit).length} · 다시 녹음 대기 ${Object.keys(pending).length}`); process.exit(0);
  }
  const AJ = fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')) : {}, allow = AJ.clips || {}, wait = AJ.pending || {}, bad = [], waits = []; let ok = 0;
  const near = (L, h) => (L || []).some((x) => Math.abs(x.t - h.t) <= TOL);
  for (const [k, a] of Object.entries(hit)) for (const h of a) { const s = `${k} ${h.t}초 무음 ${h.d} · 직전 20ms ${h.pre20} dB · 40~80ms 앞 ${h.far} dB`; if (near(allow[k], h)) ok++; else if (near(wait[k], h)) waits.push(s); else bad.push(s); }
  console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-chop — 클립 ${files.length} · 끊김 의심 ${n}(허용 목록 안 ${ok} · 다시 녹음 대기 ${waits.length}) · 새로 생김 ${bad.length}`);
  for (const w of waits) console.log('  대기', w);
  for (const b of bad) console.log('  새', b);
  process.exit(bad.length ? 1 : 0);
}
