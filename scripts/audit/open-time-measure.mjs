// [OPEN_TIME_MEASURE 2026-09-25 코워크 P3 · 사장님 답 «코드가 합니다»] 시간표(ritual-open.js TIME)의 «대본(성우)» 초를
//   실제 녹음(assets/audio/narration/*.mp3) 길이로 잰다.
//
//   node scripts/audit/open-time-measure.mjs            # 재고 차이만 보여 준다(아무것도 안 바꾼다)
//
// ★왜 지금은 덮어쓰지 않나(구현 보고 2 · 명세와 다르게 한 것):
//   ①새 줄(89~107)은 아직 녹음이 없다 — 재지 못한 칸을 추정 그대로 두면 표가 «반은 실측 · 반은 추정»이 된다.
//   ②재녹음 대기 명단(재더빙_리드보강.txt)에 있는 클립은 소리가 지금 문안과 다르다 — 옛 소리를 재면 틀린 숫자다.
//   ③부록 A 로 셈한 예시 시간(기록 11:33~16:31 …)이 받아들일 기준이다 — 덮는 순간 기준이 움직인다.
//   그래서 이 도구는 **잰 값과 표의 값을 나란히** 찍고, 칸마다 «잴 수 있나»를 말한다.
//   녹음이 다 들어오면 그때 표를 덮는다(코워크가 예시 시간을 다시 확인하는 날과 같은 날).
//
// ★종료 코드 [CANT_LOOK] 0 = 잼 · 2 = 재지 못함(ffprobe 없음) — 차이는 실패가 아니다(보고다).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));

try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch (e) { console.log('못 쟀다 — ffprobe 없음'); process.exit(2); }
const DIR = path.join(ROOT, 'assets/audio/narration');
const redub = new Set();
try {
  const t = fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/재더빙_리드보강.txt'), 'utf8');
  for (const m of t.matchAll(/^\[\d+\]\s+(\S+)/gm)) redub.add(m[1]);
} catch (e) { /* 명단이 없으면 전부 «맞는 소리»로 친다 — 아래 표에 그렇게 적힌다 */ }
const dur = (slug) => {
  const f = path.join(DIR, C.fileOf(slug) + '.mp3');
  if (!fs.existsSync(f)) return null;
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
  return +(+out).toFixed(1);
};

// 순간 하나만 담은 판에서 그 순간의 나레이션 큐(사람 구간 제외)를 모은다 — 판은 예시와 같은 기본값
const CASES = [
  ['candle', {}], ['entry', { entry: 'A' }], ['welcome', {}], ['bless', {}], ['vow', {}], ['ring', {}],
  ['declare', { declare: '1' }], ['tribute', { tributeSay: 'one' }], ['letter', { letter: 'each' }], ['toast', { toast: 'both', wine: 'none' }], ['free', { freeWhat: 'video' }]
];
let rows = 0;
console.log('순간        표(대본)  잰 값   칸 상태');
for (const [k, set] of CASES) {
  const S = Object.assign({ course: 'open', on: {} }, set); if (!O.ALWAYS[k]) S.on[k] = 1;
  const cues = C.build(S, { mode: 'console' }).cues.filter((c) => c.k === k && c.slug);
  const part = O.partsOf(k, S)[0];
  let sum = 0, miss = [], stale = [];
  cues.forEach((c) => { const d = dur(c.slug); if (d == null) miss.push(c.no); else sum += d; if (redub.has(c.slug)) stale.push(c.no); });
  const state = miss.length ? `녹음 없음(${miss.join('·')})` : stale.length ? `재녹음 대기(${stale.join('·')}) — 옛 소리` : '잴 수 있음';
  console.log(`${k.padEnd(10)} ${String(part).padStart(7)}초 ${miss.length ? '    —' : String(sum.toFixed(1)).padStart(6) + '초'}  ${state}`);
  rows++;
}
console.log(`\n${rows}칸을 쟀다 · 표는 바꾸지 않았다(위 ★ 참고). 녹음이 다 들어오면 «잴 수 있음» 칸만 TIME 첫 값으로 옮긴다.`);
