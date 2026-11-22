#!/usr/bin/env node
/* ★[NARR_GO_1122 ②] 나레이션 파일 길이표(REC_SEC) — assets/ritual-cue.js 의 «// [REC_SEC_DATA]» 한 줄을 파일에서 잰 값으로 다시 쓴다.
   10분 전 «약 N 분» 판 고르기(guestMinOf · guestShort)가 이 표로 본식 길이를 잰다 · 소리를 바꾸는 커밋에서 같이 돌린다(scripts/audit/rec-sec.mjs 가 막는다)
   쓰기: node scripts/rec-sec.mjs --write   (없이 돌리면 다를 때 목록만) */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/audio/narration'), CUE = path.join(ROOT, 'assets/ritual-cue.js');
export function measure() { const o = {}; for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3')).sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b))) {
  const d = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(DIR, f)]).toString(); o[f.replace(/\.mp3$/, '')] = Math.round(d * 10) / 10; } return o; }
export const LINE = /( *var REC_SEC = )\{[^\n]*\}(;   \/\/ \[REC_SEC_DATA\])/;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = fs.readFileSync(CUE, 'utf8'); if (!LINE.test(src)) { console.error('✗ ritual-cue.js 에 [REC_SEC_DATA] 줄이 없다'); process.exit(2); }
  const m = measure(), out = src.replace(LINE, (_, a, b) => a + JSON.stringify(m) + b);
  if (process.argv.includes('--write')) { fs.writeFileSync(CUE, out); console.log('REC_SEC ' + Object.keys(m).length + '개 썼다'); }
  else console.log(out === src ? 'REC_SEC 그대로' : 'REC_SEC 다름 — --write');
}
