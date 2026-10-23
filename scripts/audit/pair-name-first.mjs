#!/usr/bin/env node
/* ★★[PAIR_NAME_FIRST_1023 2026-10-23 음성 섹션 «28 · 47 소리가 서로 바뀐 채 라이브에 나가고 있어요»]
   조립기(assemble-narration.mjs)가 문장 수가 같은 두 묶음을 서로 상대 파트로 짝짓지 않는가를 잰다.
   ① 코드 — 이름으로 증명된 짝을 먼저 · 이름이 반대를 말하는 짝은 맺지 않음 · 짧은 묶음은 폴더 번호가 맞을 때만
   ② 재현 — 28_letter-each(3_진행_후반 · 2문장) · 47_end-2-goodbye(1_안내 · 2문장)를 함께 깔아 임시 폴더(--out)로 붙이고,
      하나씩 따로 붙인 결과와 md5 가 같은지 본다(옛 조립기는 둘 다 다르다 · 저장소 소리는 건드리지 않는다)
      ffmpeg 가 없는 자리(CI)는 ② 를 건너뛰고 ① 만 잰다
   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASM = 'scripts/assemble-narration.mjs';
const PAIR = ['28_letter-each', '47_end-2-goodbye'];

export function scanCode(src) {
  const bad = [];
  if (!/const hit = pairs\.find\(\(x\) => x\.g === g && !usedP\.has\(x\.P\.file\) && provedByName\(g\.files, x\.P\)\)/.test(src)) bad.push(`${ASM} 이름으로 증명된 짝을 먼저 정하지 않는다(①)`);
  if (!/if \(nameIds\(x\.g\.files\)\) continue;/.test(src)) bad.push(`${ASM} 이름이 반대를 말하는 짝도 맺는다(②)`);
  if (!/x\.g\.files\.length <= PAIR_SMALL_N && x\.g\.hint !== x\.P\.n\) continue;/.test(src)) bad.push(`${ASM} 짧은 묶음을 길이 상관만으로 다른 파트에 짝짓는다(③)`);
  return bad;
}

const direct = !!process.argv[1] && /pair-name-first\.mjs$/.test(process.argv[1]);
if (direct) {
  const src = fs.readFileSync(path.join(ROOT, ASM), 'utf8');
  const bad = scanCode(src);
  let dead = 0;
  for (const [nm, from] of [['①', /const hit = pairs\.find[^\n]*\n/], ['②', /if \(nameIds\(x\.g\.files\)\) continue;/], ['③', /x\.g\.files\.length <= PAIR_SMALL_N/]])
    if (!scanCode(src.replace(from, '')).length) { dead++; console.log(`FAIL 깨 보기 «${nm} 빼기» — 빨강이 안 됐다`); }
  let replay = '';
  const hasFf = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  if (!hasFf) replay = 'skip 재현 — ffmpeg 없음(코드만 쟀다)';
  else {
    const T = fs.mkdtempSync(path.join(os.tmpdir(), 'pair-name-'));
    const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
    const run = (args) => execFileSync('node', [path.join(ROOT, ASM), ...args], { cwd: ROOT, stdio: 'pipe' });
    const stage = (dir, clips) => execFileSync('node', [path.join(ROOT, 'scripts/sent-lib.mjs'), '--stage', dir, '--clip', clips.map((c) => '=' + c).join(',')], { cwd: ROOT, stdio: 'pipe' });
    try {
      stage(path.join(T, 'both'), PAIR);
      run(['--in', path.join(T, 'both'), '--clip', PAIR.map((c) => '=' + c).join(','), '--out', path.join(T, 'out-both')]);
      for (const c of PAIR) {
        stage(path.join(T, 's-' + c), [c]);
        run(['--in', path.join(T, 's-' + c), '--clip', '=' + c, '--out', path.join(T, 'out-' + c)]);
        if (md5(path.join(T, 'out-both', c + '.mp3')) !== md5(path.join(T, 'out-' + c, c + '.mp3'))) bad.push(`${c} — 함께 붙인 소리가 따로 붙인 소리와 다르다(다른 파트 소리와 짝지어졌다)`);
      }
      replay = `재현 ${PAIR.join(' · ')} 함께 붙여도 따로 붙인 것과 같음`;
    } catch (e) { bad.push('재현을 못 돌렸다 — ' + String(e.stderr || e.message).split('\n').slice(-3).join(' ')); }
    finally { fs.rmSync(T, { recursive: true, force: true }); }
  }
  for (const b of bad) console.log('FAIL ' + b);
  if (bad.length || dead) { console.log(`✗ PAIR_NAME_FIRST_1023 실패 ${bad.length + dead}건`); process.exit(1); }
  console.log(`ok pair-name-first — 코드 ①②③ · 깨 보기 3개 맞음 · ${replay}`);
  process.exit(0);
}
