#!/usr/bin/env node
/* ★★[ASSET_V_GUARD 2026-10-23 사장님 «영상이 안 움직이는데 · 직접 확인해봐 · 개선까지»]
   같은 이름으로 바꾼 파일은 열어 둔 화면 · 휴대폰이 옛 판을 그대로 쓴다. 그래서 식순 화면은 파일 주소 끝에 판 표시를 붙인다.
     ① <script src="/assets/X.js?v=값"> — X.js 를 바꾸면 그 값을 올린다
     ② var ASSET_V='값' — 소리 엔진 넷(ritual-data · ritual-open · ritual-cue · ritual-story)을 바꾸면 올린다
     ③ VIDEO_V = '?v=값'(ritual-open.js) — 장면 영상 폴더(assets/video/moments)를 바꾸면 올린다 [VIDEO_V]
   #1331 이 ritual-open.js 와 영상 파일을 바꾸고 ①② 를 안 올려, 그 전에 연 화면은 축사 · 축가 칸이 비고 영상이 멈춰 보였다.
   이 검사는 «이번 변경»(가지면 main 과 갈라진 곳부터 · main 이면 바로 앞 커밋부터)이 파일을 바꿨으면 값도 바꿨는가를 본다.
   ★스스로 깨 보기: --selftest 는 «파일은 바뀌고 값은 그대로»인 판을 만들어 빨강이 나는지 본다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(비교할 앞 판이 없다 · git 없음 — 결함으로 치지 않는다 · CANT_LOOK) */
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); return !!c; };

if (tryGit('rev-parse', 'HEAD') == null) { console.log('못 쟀다 — git 없음'); process.exit(2); }
/* 비교할 앞 판: 가지면 main 과 갈라진 곳 · main 끝(또는 main 을 못 찾음)이면 바로 앞 커밋 */
const head = git('rev-parse', 'HEAD');
const main = tryGit('rev-parse', '--verify', '-q', 'origin/main') || tryGit('rev-parse', '--verify', '-q', 'main');
let base = main ? tryGit('merge-base', 'HEAD', main) : null;
if (!base || base === head) base = tryGit('rev-parse', '--verify', '-q', 'HEAD~1');
if (!base) { console.log('못 쟀다 — 비교할 앞 판이 없다(얕은 이력)'); process.exit(2); }

const read = (rev, f) => (rev ? tryGit('show', `${rev}:${f}`) : null) || '';
const changed = (paths) => { try { execFileSync('git', ['diff', '--quiet', base, 'HEAD', '--', ...paths], { cwd: ROOT, stdio: 'ignore' }); return false; } catch { return true; } };

/* 값 읽기 — [이름, 값을 꺼내는 함수(파일 글 → 값), 값이 든 파일, 바뀌면 값을 올려야 하는 경로들] */
function pairsOf(htmlNow) {
  const out = [];
  for (const m of htmlNow.matchAll(/<script src="\/assets\/([\w.-]+\.js)\?v=(\w+)">/g)) {
    const js = m[1], re = new RegExp(`<script src="/assets/${js.replace(/\./g, '\\.')}\\?v=(\\w+)">`);
    out.push([`${js} ?v=`, (t) => (re.exec(t) || [])[1] || '', 'order-preview.html', [`assets/${js}`]]);
  }
  out.push(['ASSET_V(소리 엔진 넷)', (t) => (/var ASSET_V='(\w+)';/.exec(t) || [])[1] || '', 'order-preview.html', ['assets/ritual-data.js', 'assets/ritual-open.js', 'assets/ritual-cue.js', 'assets/ritual-story.js']]);
  out.push(['VIDEO_V(장면 영상)', (t) => (/var VIDEO_V = '(\?v=\w+)';/.exec(t) || [])[1] || '', 'assets/ritual-open.js', ['assets/video/moments']]);
  return out;
}
const decide = (fileChanged, vBase, vNow) => !fileChanged || (vNow !== '' && vNow !== vBase);

const htmlNow = read('HEAD', 'order-preview.html'), roNow = read('HEAD', 'assets/ritual-open.js');
const pairs = pairsOf(htmlNow);
let fail = 0;
fail += !ok(`판 표시 찾음 — script ${pairs.length - 2}개 · ASSET_V · VIDEO_V`, pairs.length >= 4 && /var ASSET_V='\w+';/.test(htmlNow) && /var VIDEO_V = '\?v=\w+';/.test(roNow));
const av = (/var ASSET_V='(\w+)';/.exec(htmlNow) || [])[1];
fail += !ok('ritual-open.js 의 <script ?v=> 와 ASSET_V 가 같은 값', av && htmlNow.includes(`ritual-open.js?v=${av}"`), av);

if (process.argv.includes('--selftest')) {
  const bad = !decide(true, 'x1', 'x1') && decide(true, 'x1', 'x2') && decide(false, 'x1', 'x1') && !decide(true, 'x1', '');
  console.log(bad ? 'ok   깨 보기 — 파일만 바뀌고 값이 그대로면 빨강 · 값을 올리면 통과' : 'FAIL 깨 보기 — 판정이 죽었다');
  process.exit(bad ? 0 : 1);
}

console.log(`     비교: ${base.slice(0, 7)} → ${head.slice(0, 7)}`);
for (const [name, val, file, watch] of pairs) {
  const ch = changed(watch), vb = val(read(base, file)), vn = val(file === 'order-preview.html' ? htmlNow : roNow);
  fail += !ok(`${name} — ${ch ? `파일이 바뀜 · 값 ${vb || '(없음)'} → ${vn || '(없음)'}` : '파일 그대로'}`, decide(ch, vb, vn), `${watch.join(' · ')} 를 바꿨으면 ${file} 의 값을 올린다`);
}
console.log(fail ? `\n✗ ASSET_V_GUARD 실패 ${fail}건` : '\nASSET_V OK');
process.exit(fail ? 1 : 0);
