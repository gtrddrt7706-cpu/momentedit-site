#!/usr/bin/env node
/* ★★[LAYER_PLAN_1108 사장님 11/08 «기본부터 층층이 · 층마다 검토»] 나레이션을 층 번호까지 누적으로 _src 원본에서 다시 만든다.
   기준표 = assets/audio/_src/_layers/층설정표_1108.json(대본 · docs d2a99ee 사본 · 바꾸면 대본 표가 먼저) — 결과 mp3 를 다시 손질하지 않는다
   0층 = 지금 조립기 그대로(main 소리) · 1층 = 내용 바꾸기(162 맨 앞 «신랑 신부,» A3 · 160 · 350 · 356 · 357 새 _src 는 창고에 그대로)
   2층 이상은 조립기(assemble-narration --layer)에 넣은 만큼만 — 아직 없는 층을 달라면 멈춘다(LAYER_DONE)
   쓰기: node scripts/build-layers.mjs --layer <0~6> [--clip =키,…] [--out <폴더>] [--list] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), P = (...a) => path.join(ROOT, ...a);
const arg = (k, d = '') => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
export const LAYER_DONE = 0;   // 조립기에 들어간 마지막 층 — 층을 넣는 커밋에서 같이 올린다
const L = Number(arg('--layer', '0'));
if (!(L >= 0 && L <= LAYER_DONE)) { console.error(`✗ --layer ${arg('--layer')} — 지금 만들 수 있는 층은 0 ~ ${LAYER_DONE}`); process.exit(2); }
const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const idx = JSON.parse(fs.readFileSync(P('assets/audio/_src/_index.json'), 'utf8')).slots;
const RET = createRequire(import.meta.url)(P('assets/ritual-cue.js')).RETIRED || {};
const st = JSON.parse(fs.readFileSync(P('assets/audio/clip-status.json'), 'utf8')).clips || {};
const pad2 = (n) => String(n).padStart(2, '0');
/* 만들 클립 = 나레이션 폴더 · 우성/진희 · 쓰는 클립 · 문장 자리가 창고에 다 있고 글이 같은 것(편지 43 은 창고가 없다 — 층에서 따로) */
export function layerClips() {
  return man.clips.filter((c) => { const key = pad2(c.no) + '_' + c.file, v = (man.voice || {})[String(c.role).split('|')[0]];
    if (c.mix || (c.dir || 'assets/audio/narration') !== 'assets/audio/narration' || (v !== '우성' && v !== '진희')) return false;
    if (RET[c.file] || (st['narration/' + key] && st['narration/' + key].s === 'retired')) return false;
    return c.sents.every((s) => { const e = idx[key + '#' + s.i]; return e && e.text === s.text && fs.existsSync(P('assets/audio/_src', key, s.i + '.flac')); }); })
    .map((c) => '=' + pad2(c.no) + '_' + c.file); }
const list = arg('--clip') || layerClips().join(',');
if (process.argv.includes('--list')) { console.log(list); process.exit(0); }
const SCR = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', `layer${L}-`)), D = path.join(SCR, 'in');
execFileSync('node', [P('scripts/sent-lib.mjs'), '--stage', D, '--clip', list], { stdio: ['ignore', 'ignore', 'inherit'] });
/* 1층 · 162 맨 앞 «신랑 신부,» → A3(대본 README · 사장님 17:57) — 창고 원본에서 한 번만 */
if (L >= 1) { const f = fs.readdirSync(D).find((x) => /_162_narr-entry-bow-ex4_0[._]/.test(x));
  if (f) { const o = path.join(SCR, 'sp162.flac'); console.log('[LAYER 1] 162 A3 ' + execFileSync('node', [P('scripts/splice-162-1108.mjs'), P('assets/audio/_src/162_narr-entry-bow-ex4/0.flac'), P('assets/audio/_src/_layers/162_vocative_A3_raw.wav'), o]).toString().trim());
    fs.copyFileSync(o, path.join(D, f)); } }
execFileSync('node', [P('scripts/assemble-narration.mjs'), '--in', D, '--clip', list, '--layer', String(L), ...(arg('--out') ? ['--out', arg('--out')] : [])], { stdio: 'inherit' });
fs.rmSync(SCR, { recursive: true, force: true });
