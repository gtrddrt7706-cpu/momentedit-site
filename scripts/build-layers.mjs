#!/usr/bin/env node
/* ★★[LAYER_PLAN_1108 사장님 11/08 «기본부터 층층이 · 층마다 검토»] 나레이션을 층 번호까지 누적으로 _src 원본에서 다시 만든다.
   기준표 = assets/audio/_src/_layers/층설정표_1108.json(대본 · docs d2a99ee 사본 · 바꾸면 대본 표가 먼저) — 결과 mp3 를 다시 손질하지 않는다
   0층 = 지금 조립기 그대로(main 소리) · 1층 = 내용 바꾸기(162 맨 앞 «신랑 신부,» A3 · 160 · 350 · 356 · 357 새 _src 는 창고에 그대로)
   2층 이상은 조립기(assemble-narration --layer)에 넣은 만큼만 — 아직 없는 층을 달라면 멈춘다(LAYER_DONE)
   쓰기: node scripts/build-layers.mjs --layer <0~6> [--clip =키,…] [--out <폴더>] [--list] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module'; import { applyTempo } from './lib/tempo.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), P = (...a) => path.join(ROOT, ...a);
const arg = (k, d = '') => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
export const LAYER_DONE = 2;   // 조립기에 들어간 마지막 층 — 층을 넣는 커밋에서 같이 올린다
const L = Number(arg('--layer', '0'));
/* 문장 빠르기(원래 녹음 대비 합계) — 2층 말빠르기 0.97 · 3층 강약은 그 층 커밋에서 · 편지 43 은 창고가 없어 여기 안 온다 */
function speedOf(layer, id) { return layer >= 2 ? 0.97 : 1; }
const LOG = process.env.LAYER_LOG || '';   // 문장마다 { id, fac, talkIn, quietIn, inSec, outSec } — 비율 검사(layer-speed)
const durOf = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
const SIL = { silence: { db: -34, win_sec: 0.01, min_sec: 0.25 } };   // 0.25초 넘는 문장 안 쉼은 길이 그대로(SPEED3 와 같은 자)
const logOne = (o) => { if (LOG) fs.appendFileSync(LOG, JSON.stringify(o) + '\n'); };
if (!(L >= 0 && L <= LAYER_DONE)) { console.error(`✗ --layer ${arg('--layer')} — 지금 만들 수 있는 층은 0 ~ ${LAYER_DONE}`); process.exit(2); }
const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const idx = JSON.parse(fs.readFileSync(P('assets/audio/_src/_index.json'), 'utf8')).slots;
const RET = createRequire(import.meta.url)(P('assets/ritual-cue.js')).RETIRED || {};
const st = JSON.parse(fs.readFileSync(P('assets/audio/clip-status.json'), 'utf8')).clips || {};
const pad2 = (n) => String(n).padStart(2, '0');
/* 만들 클립 = 실제로 트는 클립 중 나레이션 폴더 · 우성/진희 · 문장 자리가 창고에 다 있고 글이 같은 것(편지 43 은 창고가 없다 — 층에서 따로) */
const USED = new Set(JSON.parse(fs.readFileSync(P('docs/plans/식순연구/층_씀목록_1108.json'), 'utf8')).filter((x) => x.use).map((x) => x.k).concat(['350_narr-welcome-in-face', '356_guest-w5-meal', '357_guest-w5-meal-online']));   // + 1층 새 클립(#1636)   // 실제로 트는 클립(scripts/audit/layer-used.mjs · 사장님 11/08 20:20 «안 쓰는 건 버려»)
export function layerClips() {
  return man.clips.filter((c) => { const key = pad2(c.no) + '_' + c.file, v = (man.voice || {})[String(c.role).split('|')[0]]; if (!USED.has(key)) return false;
    if (c.mix || (c.dir || 'assets/audio/narration') !== 'assets/audio/narration' || (v !== '우성' && v !== '진희')) return false;
    return c.sents.every((s) => { const e = idx[key + '#' + s.i]; return e && e.text === s.text && fs.existsSync(P('assets/audio/_src', key, s.i + '.flac')); }); })
    .map((c) => '=' + pad2(c.no) + '_' + c.file); }
const list = arg('--clip') || layerClips().join(',');
if (process.argv.includes('--list')) { console.log(list); process.exit(0); }
const SCR = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', `layer${L}-`)), D = path.join(SCR, 'in');
execFileSync('node', [P('scripts/sent-lib.mjs'), '--stage', D, '--clip', list], { stdio: ['ignore', 'ignore', 'inherit'] });
/* 1층 · 내용 바꾸기 — 재료표(assets/audio/_src/_layers/층1_재료.json)대로 받은 테이크에서 한 번만 · 162 는 창고 원본에 A3 를 끼운다 */
const R1 = JSON.parse(fs.readFileSync(P('assets/audio/_src/_layers/층1_재료.json'), 'utf8')).slots;
export const MATCH = Object.fromEntries(Object.entries(R1).map(([id, r]) => [id, r.match || 1]));   // 2층부터 층 빠르기와 곱해 한 번에(LAYER_PLAN_1108)
const DONE = new Set();   // 빠르기를 이미 입힌 자리(새 테이크) — 아래 일괄에서 건너뛴다
if (L >= 1) for (const [id, r] of Object.entries(R1)) { if (!r.take && !r.splice) continue; /* 맞춤만 있는 자리(160#0)는 아래 일괄에서 */ const [key, i] = id.split('#'), f = fs.readdirSync(D).find((x) => new RegExp('^\\d+_' + key.replace(/[-]/g, '\\-') + '_' + i + '(_JOINED_)?\\.flac$').test(x));
  if (!f) continue;   // 이번에 안 까는 클립
  const o = path.join(SCR, 'r1_' + key + '_' + i + '.flac');
  if (r.splice) console.log('[LAYER 1] ' + id + ' A3 ' + execFileSync('node', [P('scripts/splice-162-1108.mjs'), P('assets/audio/_src', key, i + '.flac'), P('assets/audio/_src/_layers', r.splice), o]).toString().trim());
  else { const w = path.join(SCR, 'r1_' + key + '_' + i + '.wav'), src = P('assets/audio/_src/_layers', r.take), [a, b] = r.cut || [0, null];
    /* 자를 자리 · 문장 안 쉼 줄이기 = 남길 구간 목록(테이크 시각) — 무음 가운데에서 잘라 말소리는 그대로 */
    let keep = [[a, b]]; for (const [sa, sb, to] of r.shrink || []) { const cutLen = (sb - sa) - to, m = (sa + sb) / 2; if (cutLen <= 0) continue;
      keep = keep.flatMap(([ka, kb]) => (m > ka && (kb == null || m < kb)) ? [[ka, +(m - cutLen / 2).toFixed(4)], [+(m + cutLen / 2).toFixed(4), kb]] : [[ka, kb]]); }
    const fc = keep.map(([ka, kb], j) => `[0:a]atrim=start=${ka}${kb != null ? ':end=' + kb : ''},asetpts=N/SR/TB[k${j}]`).join(';') + ';' + keep.map((_, j) => `[k${j}]`).join('') + `concat=n=${keep.length}:v=0:a=1,aresample=48000[o]`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[o]', '-ac', '1', '-c:a', 'pcm_s24le', w]);
    const want = MATCH[id] * speedOf(L, id), fac = +want.toFixed(4);   // 원래 빠르기 맞춤 × 층 빠르기 — 한 번만 · 5% 상한은 원래 녹음 대비(층 빠르기 쪽 · 대본 22:55)
    if (Math.abs(fac - 1) > 1e-4) { const t = w.replace(/\.wav$/, '_t.wav'), inSec = durOf(w), r = applyTempo(w, t, fac, SIL); logOne({ id, fac, want: +want.toFixed(4), cap: fac !== +want.toFixed(4), talkIn: r.talkIn, quietIn: r.quietIn, inSec, outSec: durOf(t), take: 1 }); fs.renameSync(t, w); }
    DONE.add(f);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', w, '-c:a', 'flac', o]);
    console.log(`[LAYER 1] ${id} ← ${r.take}${r.cut ? ' ' + JSON.stringify(keep) : ''} · 빠르기 ×${fac}`); }
  fs.copyFileSync(o, path.join(D, f)); }
/* 2층부터 · 깔린 문장 전부(새 테이크 말고) 원래 녹음에서 한 번만 빠르기 — 162 는 A3 를 끼운 문장에 */
if (L >= 2) for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.flac') && !DONE.has(x))) { const m = f.match(/^\d+_(.+)_(\d+)(?:_JOINED_)?\.flac$/), id = m[1] + '#' + m[2], r1 = R1[id], fac = +(speedOf(L, id) * (r1 && !r1.take && r1.match && L >= (r1.from || 1) ? r1.match : 1)).toFixed(4);   // 창고 원본이 새 녹음인 자리(160#0)는 main 빠르기 맞춤을 곱해 한 번
  if (Math.abs(fac - 1) < 1e-4) continue; const src = path.join(D, f), w = path.join(SCR, 'sp.wav'), t = path.join(SCR, 'sp_t.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', w]); const inSec = durOf(w), r = applyTempo(w, t, fac, SIL);
  logOne({ id, fac, ...(r1 && !r1.take && r1.match ? { take: 1, want: fac } : {}), talkIn: r.talkIn, quietIn: r.quietIn, inSec, outSec: durOf(t) }); execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', t, '-c:a', 'flac', src]); }
const LOUD = L >= 1 ? Object.entries(JSON.parse(fs.readFileSync(P('assets/audio/_src/_layers/층1_재료.json'), 'utf8')).loud || {}).map(([k, v]) => k + '=' + v.dB).join(',') : '';
const GF = P('assets/audio/_src/_layers/층2_쉼맞춤.json'), GAPS = L >= 2 && fs.existsSync(GF) ? Object.entries(JSON.parse(fs.readFileSync(GF, 'utf8')).gaps || {}).map(([k, v]) => k + '=' + v.sec).join(',') : '';
execFileSync('node', [P('scripts/assemble-narration.mjs'), '--in', D, '--clip', list, '--layer', String(L), ...(LOUD ? ['--loud-adj', LOUD] : []), ...(GAPS ? ['--gap-adj', GAPS] : []), ...(arg('--out') ? ['--out', arg('--out')] : [])], { stdio: 'inherit' });
fs.rmSync(SCR, { recursive: true, force: true });
