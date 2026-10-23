#!/usr/bin/env node
/* ★★[ASSET_V_GUARD 2026-10-23 사장님 «영상이 안 움직이는데 · 직접 확인해봐 · 개선까지»]
   같은 이름으로 바꾼 파일은 열어 둔 화면 · 휴대폰이 옛 판을 그대로 쓴다. 그래서 식순 화면은 파일 주소 끝에 판 표시를 붙인다.
     ① <script src="/assets/X.js?v=값"> — X.js 를 바꾸면 그 값을 올린다
     ② var ASSET_V='값' — 소리 엔진 넷(ritual-data · ritual-open · ritual-cue · ritual-story)을 바꾸면 올린다
     ③ VIDEO_V = '?v=값'(ritual-open.js) — 장면 영상 폴더(assets/video/moments)를 바꾸면 올린다 [VIDEO_V]
   #1331 이 ritual-open.js 와 영상 파일을 바꾸고 ①② 를 안 올려, 그 전에 연 화면은 축사 · 축가 칸이 비고 영상이 멈춰 보였다.
   이 검사는 «파일을 바꾼 마지막 커밋 ≤ 지금 값을 넣은 커밋»(git 조상)을 잰다 — 같은 커밋이거나 값이 나중이면 통과.
   ★스스로 깨 보기: --selftest 는 값을 넣은 커밋을 «파일을 바꾼 커밋보다 옛것»으로 바꿔 넣고 빨강이 나는지 본다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(얕은 이력 · git 없음 — 결함으로 치지 않는다 · CANT_LOOK) */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); return !!c; };

let shallow = false;
try { shallow = git('rev-parse', '--is-shallow-repository') === 'true'; } catch { console.log('못 쟀다 — git 없음'); process.exit(2); }
if (shallow) { console.log('못 쟀다 — 얕은 이력(전체 이력이 있어야 커밋 차례를 본다)'); process.exit(2); }

const html = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const ro = fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8');

/* 검사할 짝: [이름, 값 문자열(그대로 찾는다), 값이 든 파일, 바뀌면 값을 올려야 하는 경로들] */
const pairs = [];
for (const m of html.matchAll(/<script src="\/assets\/([\w.-]+\.js)\?v=(\w+)">/g)) pairs.push([`${m[1]} ?v=`, `${m[1]}?v=${m[2]}`, 'order-preview.html', [`assets/${m[1]}`]]);
const av = /var ASSET_V='(\w+)';/.exec(html);
if (av) pairs.push(['ASSET_V(소리 엔진 넷)', `var ASSET_V='${av[1]}';`, 'order-preview.html', ['assets/ritual-data.js', 'assets/ritual-open.js', 'assets/ritual-cue.js', 'assets/ritual-story.js']]);
const vv = /var VIDEO_V = '(\?v=\w+)';/.exec(ro);
if (vv) pairs.push(['VIDEO_V(장면 영상)', `var VIDEO_V = '${vv[1]}';`, 'assets/ritual-open.js', ['assets/video/moments']]);

let fail = 0;
fail += !ok(`판 표시 찾음 — script ${pairs.length - (av ? 1 : 0) - (vv ? 1 : 0)}개 · ASSET_V · VIDEO_V`, av && vv && pairs.length >= 4, JSON.stringify({ av: !!av, vv: !!vv }));
fail += !ok('ritual-open.js 의 <script ?v=> 와 ASSET_V 가 같은 값', av && html.includes(`ritual-open.js?v=${av[1]}"`), av && av[1]);

const SELF = process.argv.includes('--selftest');
const isAnc = (a, b) => { try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: ROOT, stdio: 'ignore' }); return true; } catch { return false; } };
for (const [name, needle, file, watch] of pairs) {
  let since = '';
  try { since = git('log', '-1', '--format=%H', '-S', needle, '--', file); } catch {}
  const changed = (() => { try { return git('log', '-1', '--format=%H', '--', ...watch); } catch { return ''; } })();
  if (!since) { fail += !ok(`${name} — 값을 넣은 커밋을 못 찾았다`, false, needle); continue; }
  if (!changed) { ok(`${name} — 바뀐 적 없음`, true); continue; }
  let valFrom = since;
  if (SELF && name.startsWith('ASSET_V')) { try { valFrom = git('rev-parse', `${changed}~1`); } catch {} }   // 깨 보기: 값이 파일 변경보다 한 커밋 옛것인 판
  const good = isAnc(changed, valFrom);
  fail += !ok(`${name} — 파일을 바꾼 마지막 커밋(${changed.slice(0, 7)}) ≤ 값을 넣은 커밋(${valFrom.slice(0, 7)})`, good, `${watch.join(' · ')} 를 바꿨으면 ${file} 의 값을 올린다`);
}
if (SELF) { console.log(fail ? 'ok   깨 보기 — 옛 값이면 빨강' : 'FAIL 깨 보기 — 옛 값인데 통과했다(검사가 죽었다)'); process.exit(fail ? 0 : 1); }
console.log(fail ? `\n✗ ASSET_V_GUARD 실패 ${fail}건` : '\nASSET_V OK');
process.exit(fail ? 1 : 0);
