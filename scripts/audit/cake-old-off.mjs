#!/usr/bin/env node
/* ★★[CAKE_OLD_OFF_1017 2026-10-17 사장님 «옛식순케이크빼»] 옛 초안도 케이크가 어디에도 안 나오나 — 브라우저 없이 잰다(CI 에서도 돈다).
   옛 초안 = 10/13 전 새 코스에 담아 둔 케이크(on.cake) · 9/27 전 축배 칸의 «케이크와 축배 · 케이크만» · 옛 코스의 «둘 다 · 케이크만 · 사이 순서 케이크».
   1 엔진 — 판마다 큐 글 · 이름 · 블록 이름 · 고른 이름 · 현장 글에 케이크 · 나이프 없음 · 케이크 클립(slug cake) 없음 · 옛 코스 «케이크만»은 축배 큐도 없음 · «둘 다»는 축배 그대로
   2 순간 표 — onOf · picked · seqOf · bodySeq 가 담아 둔 케이크를 «안 담김»으로 · 새 코스 축배 칩은 늘 «축배»
   3 옛 코스 흐름(ritual-data COURSES) · 옛 코스 TOAST 이름에 케이크 없음
   4 저장된 요약 흐름 — 마이페이지 _flowFix · 관리자 _admFlowFix 가 «축배 · 케이크» → «축배» · 옛 코스 «케이크만»은 그 줄째 뺌 · «케이크 커팅» 뺌 · 둘이 같은 답 ·
     읽는 자리(마이페이지 셋 · 관리자 둘)가 다 거친다 · 식순 화면 복원(_applySaved)이 엔진 norm 과 같은 옮기기
   화면(식순 화면 · 식순지 · AI 맥락 · 대본)은 flow-from-two.mjs 가 브라우저로 잰다.
   --selftest  되돌린 판(onOf 의 RETIRED 확인 뺌 · _flowFix 가 그대로 돌려줌)을 잡는지 본다 · CO_ROOT=<다른 판> 그 판으로 잰다
   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.CO_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');   // CO_ROOT=<다른 판> — 그 판으로 잰다(되돌린 판이 빨강인지)
const CAKE = /케이크|케익|나이프/;

function run(root, files = {}) {
  const fails = [];
  const no = (m, d) => fails.push(m + (d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 300)));
  const rd = (f) => (files[f] !== undefined ? files[f] : fs.readFileSync(path.join(root, f), 'utf8'));
  // 엔진은 임시 폴더에 세 파일을 두고 읽는다(돌연변이 판도 같은 길)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cake-old-'));
  try {
    for (const f of ['ritual-open.js', 'ritual-data.js', 'ritual-cue.js']) fs.writeFileSync(path.join(tmp, f), rd('assets/' + f));
    const O = require(path.join(tmp, 'ritual-open.js')), D = require(path.join(tmp, 'ritual-data.js')), C = require(path.join(tmp, 'ritual-cue.js'));
    const base = (o) => Object.assign({ entry: 'A', welcome: 'self', vow: 'ok', ring: 'off', declare: '1', valley: 'none', letter: 'each', bless: 'off', tribute: 'flower', toast: 'toast', song: 'family', guestVoice: 'nar', entryVoice: 'nar', off: {}, extra: {}, on: {} }, o);
    const oldCourses = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].open);
    const CASES = [
      ['새 코스 · 케이크 + 축배(10/13 전)', base({ course: 'open', ctSplit: 1, on: { vow: 1, tribute: 1, cake: 1, toast: 1 } }), 'toast'],
      ['새 코스 · 케이크만(10/13 전)', base({ course: 'open', ctSplit: 1, on: { vow: 1, tribute: 1, cake: 1 } }), 'none'],
      ['새 코스 · 9/27 전 축배 칸 «케이크와 축배»', base({ course: 'open', on: { vow: 1, toast: 1 }, toast: 'both' }), 'toast'],
      ['새 코스 · 9/27 전 축배 칸 «케이크만»', base({ course: 'open', on: { vow: 1, toast: 1 }, toast: 'cake' }), ''],
      ...oldCourses.flatMap((c) => { const hasT = (D.COURSES[c].seq || []).indexOf('toast') > -1;   /* 축배가 코스에 있는 판(damback · record · festive)만 «축배 그대로 · 케이크만은 축배째 뺌»을 잰다 */
        return [
        ['옛 코스 ' + c + ' · 둘 다', base({ course: c, toast: 'both' }), hasT ? 'toast' : 'none'],
        ['옛 코스 ' + c + ' · 2', base({ course: c, toast: '2' }), hasT ? 'toast' : 'none'],
        ['옛 코스 ' + c + ' · 케이크만', base({ course: c, toast: 'cake' }), 'none'],
        ['옛 코스 ' + c + ' · 사이 순서 케이크', base({ course: c, valley: 'cake', extra: { valley: 1 } }), ''],
      ]; }),
    ];
    if (oldCourses.length < 1 || !oldCourses.some((c) => (D.COURSES[c].seq || []).indexOf('toast') > -1)) no('1 옛 코스(축배가 든 판)를 못 찾았다(COURSES)');
    for (const [nm, S, want] of CASES) {
      let list; try { const r = C.build(JSON.parse(JSON.stringify(S))); list = r.cues || r || []; } catch (e) { no('1 ' + nm + ' 엔진 오류', e.message); continue; }
      const hit = list.filter((c) => CAKE.test([c.text, c.name, c.blockN, c.pick, c.live && (c.live.t || c.live.text)].join(' ')) || /cake/i.test(c.slug || ''));
      if (hit.length) no('1 ' + nm + ' — 케이크 큐가 남았다', hit.map((c) => (c.slug || '') + ':' + (c.blockN || c.name || '')));
      const tN = list.filter((c) => c.k === 'toast').length;
      if (want === 'toast' && !tN) no('1 ' + nm + ' — 축배 큐가 사라졌다(케이크만 걷어야 한다)');
      if (want === 'none' && tN) no('1 ' + nm + ' — 케이크만 판에 축배 큐가 생겼다', tN);
    }
    const L = { course: 'open', on: { cake: 1, toast: 1, vow: 1 } };
    if (O.onOf(L, 'cake')) no('2 onOf — 담아 둔 케이크를 «담김»으로 읽는다');
    if (O.picked(L).indexOf('cake') > -1) no('2 picked 에 케이크', O.picked(L));
    if (O.seqOf(L).indexOf('cake') > -1) no('2 seqOf 에 케이크', O.seqOf(L));
    if (O.bodySeq(L).indexOf('cake') > -1) no('2 bodySeq 에 케이크', O.bodySeq(L));
    if (O.toastMode(L) !== 'toast') no('2 toastMode 가 «축배»가 아니다', O.toastMode(L));
    if (O.chipOf('toast', { course: 'open', on: { toast: 1 }, toast: 'both' }) !== 'toast') no('2 새 코스 축배 칩이 «축배»가 아니다', O.chipOf('toast', { course: 'open', on: { toast: 1 }, toast: 'both' }));
    const cf = []; oldCourses.forEach((c) => { (D.COURSES[c].flow || []).forEach((x) => { if (CAKE.test(String(x))) cf.push(c + ':' + x); }); });
    if (cf.length) no('3 옛 코스 흐름에 케이크', cf);
    Object.keys(D.TOAST || {}).forEach((k) => { const n = (D.TOAST[k] || {}).n || ''; if (CAKE.test(n) && k === 'toast') no('3 옛 코스 TOAST.toast 이름에 케이크', n); });
  } catch (e) { no('엔진을 읽지 못했다', e.message); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  // 4 저장된 요약 흐름
  const mp = rd('mypage.html'), ad = rd('admin.html'), op = rd('order-preview.html');
  const grab = (src, nm) => { const m = src.match(new RegExp('function ' + nm + '\\(flow,S\\)\\{[^\\n]*\\n[^\\n]*\\}')); return m ? m[0] : ''; };
  const T = [
    [['화촉', '축배 · 케이크', '폐식·단체촬영'], { course: 'standard', toast: 'both' }, ['화촉', '축배', '폐식·단체촬영']],
    [['폐식', '축배 · 케이크'], { course: 'standard', toast: 'cake' }, ['폐식']],
    [['폐식', '축배·케이크'], { course: 'standard', toast: '2' }, ['폐식', '축배']],
    [['닫는 인사', '케이크 커팅', '축배'], { course: 'open' }, ['닫는 인사', '축배']],
    [['닫는 인사', '축배'], { course: 'open' }, ['닫는 인사', '축배']],
    [null, null, null],
  ];
  const ans = {};
  for (const [file, src, nm] of [['mypage.html', mp, '_flowFix'], ['admin.html', ad, '_admFlowFix']]) {
    const fsrc = grab(src, nm);
    if (!fsrc) { no('4 ' + file + ' 에서 ' + nm + ' 를 못 찾았다'); continue; }
    let f; try { f = new Function(fsrc + '; return ' + nm + ';')(); } catch (e) { no('4 ' + nm + ' 를 돌리지 못했다', e.message); continue; }
    ans[file] = T.map(([a, S, want]) => { const g = f(a && a.slice(), S); if (JSON.stringify(g) !== JSON.stringify(want)) no('4 ' + nm + '(' + JSON.stringify(a) + ', ' + JSON.stringify(S) + ')', g); return JSON.stringify(g); });
  }
  if (ans['mypage.html'] && ans['admin.html'] && ans['mypage.html'].join() !== ans['admin.html'].join()) no('4 _flowFix · _admFlowFix 가 다른 답');
  const useM = ['var flow=_flowFix(_sm.flow,', '_flow=_flowFix(', 'var _rf=_flowFix(rd.summary.flow,rd.S)'].filter((s) => mp.indexOf(s) < 0);
  if (useM.length) no('4 마이페이지 읽는 자리가 _flowFix 를 안 거친다', useM);
  const useA = ['_admFlowFix(sm.flow,S)', '_admFlowFix(sm3.flow,s3d)'].filter((s) => ad.indexOf(s) < 0);
  if (useA.length) no('4 관리자 읽는 자리가 _admFlowFix 를 안 거친다', useA);
  if (!/link:\{when:'축배', on:/.test(mp) || /old:'축배 · 케이크'/.test(mp)) no('4 마이페이지 잔 연동은 «축배» 하나(옛 이름은 _flowFix 가 옮긴다)');
  if (op.indexOf("if(S.course!=='open'){ if(S.toast==='both'||S.toast==='2') S.toast='toast'; else if(S.toast==='cake'){ S.toast='toast'; S.off=S.off||{}; S.off.toast=1; } if(S.valley==='cake') S.valley='none'; }") < 0) no('4 식순 화면 복원(_applySaved)에 옛 코스 케이크 옮기기가 없다');
  if (rd('api/_ritual-kb.js').indexOf('2026-10-17부터 전에 담아 둔 식순에서도 진행하지 않는다') < 0) no('4 AI 상담 지식 — 옛 식순에서도 진행하지 않는다는 줄이 없다');
  return fails;
}

if (process.argv.includes('--selftest')) {
  const ro = fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8');
  const mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  const m1 = ro.replace('function onOf(S, k) { return !!(ALWAYS[k] || (!RETIRED[k] && S && S.on && S.on[k])); }', 'function onOf(S, k) { return !!(ALWAYS[k] || (S && S.on && S.on[k])); }');
  const m2 = mp.replace(/function _flowFix\(flow,S\)\{ if\(!Array\.isArray\(flow\)\) return flow;/, 'function _flowFix(flow,S){ return flow;');
  const a = m1 !== ro ? run(ROOT, { 'assets/ritual-open.js': m1 }) : ['돌연변이를 못 만들었다'];
  const b = m2 !== mp ? run(ROOT, { 'mypage.html': m2 }) : ['돌연변이를 못 만들었다'];
  const okA = a.some((x) => /^2 onOf|^1 /.test(x)), okB = b.some((x) => /^4 _flowFix/.test(x));
  console.log((okA ? 'ok  ' : 'FAIL') + ' selftest — onOf 의 RETIRED 확인을 빼면 빨강 (' + a.length + '건)');
  console.log((okB ? 'ok  ' : 'FAIL') + ' selftest — _flowFix 가 흐름을 그대로 돌려주면 빨강 (' + b.length + '건)');
  process.exit(okA && okB ? 0 : 1);
}
const fails = run(ROOT);
fails.forEach((f) => console.log('FAIL ' + f));
console.log(fails.length ? `FAIL ${fails.length}건 — 옛 초안에서 케이크가 다시 나온다 [CAKE_OLD_OFF_1017]` : 'ok 옛 초안 케이크 없음 — 엔진 · 순간 표 · 옛 코스 흐름 · 저장 흐름(마이페이지 · 관리자) [CAKE_OLD_OFF_1017]');
process.exit(fails.length ? 1 : 0);
