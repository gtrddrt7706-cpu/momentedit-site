#!/usr/bin/env node
// ★★[REBIND_FIRST_1023 2026-10-23 검토 148 덧] 받지 않아도 되는 녹음을 사장님께 시키지 않는다.
//
//   node scripts/audit/sent-lib-rebind.mjs        # 0 = 통과 · 1 = 실패
//
// 왜 — 검토 144 에서 나레이션 문장을 빼거나 자리를 옮긴 뒤 문장 창고를 `--prune --write` 로만 정리했다.
//   «자리만 옮기면 다시 쓸 수 있는 소리»(예: 60 의 셋째 문장 «자리를 지켜 주시기 바랍니다.»가 #2 → #0)까지
//   주인 없는 자리로 보고 42개를 지웠고, 남은 소리만으로 붙일 수 있던 클립까지 녹음 목록(다음판_1023)에 올라
//   19클립 · 37문장을 다시 받으라고 했다. 창고에는 `--rebind`(글이 같은 자리끼리 맞추기)가 이미 있었다.
//   순서는 `--rebind --write` → `--prune --write` → 붙일 수 있는 클립은 `--stage` + 조립.
//
// 보는 것
//   ① 자리만 옮기면 맞는 소리가 0 개다(sent-lib --rebind 미리보기 «옮길 소리 0개»)
//   ② 창고 소리만으로 다 채워지는데 받은 소리(_recorded.json)의 글이 지금 글과 다른 클립이 0 개다
//      (= 녹음 없이 다시 붙일 수 있는데 «녹음 대기»로 남은 클립) · 쉬는 클립(RETIRED)은 세지 않는다
//   ③ 스스로 깨 보기 — 창고 대장을 한 자리 옮겨 둔 사본에서 ① 이, 받은 글을 바꾼 사본에서 ② 가 빨강이어야 한다
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = (r) => path.join(ROOT, r);
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const pad2 = (n) => String(n).padStart(2, '0');
const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const C = require(P('assets/ritual-cue.js'));
const recOf = (f) => { try { return JSON.parse(fs.readFileSync(P(f), 'utf8')).clips || {}; } catch { return {}; } };

/* ② 의 판정 — idx(창고 대장) · rec(받은 글) 를 받아 «녹음 없이 붙일 수 있는데 대기인 클립»을 돌려준다 */
function stuck(idx, recN, recC) {
  const out = [];
  for (const c of man.clips) {
    if (c.mix || (C.RETIRED && C.RETIRED[c.file])) continue;
    const key = pad2(c.no) + '_' + c.file;
    const full = c.sents.every((s) => { const e = idx.slots[key + '#' + s.i]; return e && e.text === s.text && fs.existsSync(P(`assets/audio/_src/${key}/${s.i}.flac`)); });
    if (!full) continue;
    const r = (String(c.dir || '').includes('cast') ? recC : recN)[key];
    const rt = String((r && (r.text || r)) || '').trim();
    if (rt !== c.sents.map((s) => s.text).join(' ').trim()) out.push(key);
  }
  return out;
}

const IDX = JSON.parse(fs.readFileSync(P('assets/audio/_src/_index.json'), 'utf8'));
const RN = recOf('assets/audio/narration/_recorded.json'), RC = recOf('assets/audio/cast/_recorded.json');

// ①
let pre = '';
try { pre = execFileSync('node', [P('scripts/sent-lib.mjs'), '--rebind'], { encoding: 'utf8', cwd: ROOT }); }
catch (e) { pre = String(e.stdout || '') + String(e.stderr || ''); }
const m = /옮길 소리 (\d+)개/.exec(pre);
const moves = m ? +m[1] : (/옮길 소리가 없|없습니다/.test(pre) ? 0 : -1);
ok(`① 자리만 옮기면 맞는 창고 소리 0개(sent-lib --rebind 미리보기) — 지금 ${moves < 0 ? '못 읽음' : moves}`, moves === 0,
  moves > 0 ? 'node scripts/sent-lib.mjs --rebind --write 를 먼저 돌리세요(--prune 은 그 뒤)' : pre.split('\n').slice(0, 3).join(' / '));

// ②
const s0 = stuck(IDX, RN, RC);
ok(`② 창고 소리만으로 붙일 수 있는데 녹음 대기인 클립 0개 — 지금 ${s0.length}`, s0.length === 0,
  s0.slice(0, 8).join(' ') + (s0.length ? ' · node scripts/sent-lib.mjs --stage <폴더> --clip =' + s0.join(',=') + ' 뒤 assemble-narration' : ''));

// ③ 깨 보기
{
  const any = man.clips.find((c) => !c.mix && !(C.RETIRED && C.RETIRED[c.file]) && c.sents.length && RN[pad2(c.no) + '_' + c.file]
    && c.sents.every((s) => { const e = IDX.slots[pad2(c.no) + '_' + c.file + '#' + s.i]; return e && e.text === s.text; }));
  if (!any) ok('③ 깨 보기 — 다 채워진 클립을 못 찾았다', false);
  else {
    const key = pad2(any.no) + '_' + any.file;
    const RN2 = { ...RN, [key]: { text: '(깨 보기) 다른 글' } };
    ok(`③ 깨 보기 — 받은 글이 다르면 ② 가 잡는다(${key})`, stuck(IDX, RN2, RC).includes(key));
  }
}

console.log(fail ? `✗ REBIND_FIRST 실패 ${fail}건` : 'ok sent-lib-rebind — 자리만 옮길 소리 0 · 녹음 없이 붙일 수 있는 대기 클립 0 [REBIND_FIRST_1023]');
process.exit(fail ? 1 : 0);
