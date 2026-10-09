#!/usr/bin/env node
/* ★★[TOAST_MIN 2026-10-09 사장님 «안내 문구 팝업 부분은 최대한 요약해서 미니멀하게 안내해야 해»]
   떠 있는 알림(브라운 알약)의 안내 글은 한 줄 20자 안 · «·» 한 번까지.
   대상 — 식순 화면(order-preview) · 마이페이지 · 홈 · AI 상담 위젯에서 알림 함수에 바로 넘기는 글,
          그리고 알림 글을 담아 두는 곳(NOTE_TOAST · AI_OFF_* · _mpNextToast · _playOffWho · _refToast).
   빼는 것 — 실패 문구(«(코드 X#)»가 붙는 글 · [ERR_CODES] 가 따로 본다) · 화면 안 글(.mk-toast 등 · 떠 있는 알림이 아니다).
   글자 수는 «» ‹› 「」 를 뺀 보이는 글자(띄어쓰기 포함).
   ★스스로 깨 본다 — 긴 가짜 알림을 넣은 사본에서 빨강이 나와야 하고, 찾은 알림이 너무 적으면(읽기가 깨진 것) 빨강이다. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MAX = 20;
const FILES = ['order-preview.html', 'mypage.html', 'index.html', 'assets/advisor-widget.js'];
const FNS = ['_lsToast', '_noteToast', 'toast', '_miniToast', 'mpToast', 'meToast'];
const MIN_FOUND = 40;   // 지금 약 50 — 읽기가 깨져 0 이 되면 조용히 통과하지 않게

const HANGUL = /[가-힣]/;
const vis = (t) => t.replace(/[«»‹›「」]/g, '').trim();

/* 문자열 글자(작은따옴표 · 큰따옴표)를 꺼낸다 — 템플릿 글자는 이 파일들에서 알림 글로 쓰지 않는다 */
function literals(src) {
  const out = []; const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g; let m;
  while ((m = re.exec(src))) out.push(m[1] != null ? m[1] : m[2]);
  return out;
}
/* 여는 괄호 다음부터 짝이 맞는 닫는 괄호까지(따옴표 안 괄호는 건너뛴다) */
function callArgs(s, i) {
  let d = 1, q = null;
  for (let j = i; j < s.length && j < i + 4000; j++) {
    const c = s[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(') d++;
    else if (c === ')') { d--; if (!d) return s.slice(i, j); }
  }
  return '';
}
/* 첫 인자만(쉼표 · 괄호 깊이 · 따옴표를 본다) */
function firstArg(a) {
  let d = 0, q = null;
  for (let j = 0; j < a.length; j++) {
    const c = a[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === ',' && !d) return a.slice(0, j);
  }
  return a;
}
function block(s, startRe) {
  const m = startRe.exec(s); if (!m) return '';
  const k = s.indexOf('{', m.index + m[0].length - 1); if (k < 0) return '';
  let d = 0, q = null;
  for (let j = k; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) return s.slice(k, j + 1); }
  }
  return '';
}

export function scan(file, s) {
  const found = [];
  const add = (where, t) => { if (!HANGUL.test(t) || /\(코드 /.test(t)) return; found.push({ file, where, t }); };
  const callRe = new RegExp('(^|[^A-Za-z0-9_$.])(?:window\\.)?(' + FNS.join('|') + ')\\(', 'g'); let m;
  while ((m = callRe.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 12), m.index + m[1].length);
    if (/function\s*$/.test(before)) continue;   // 정의 줄
    const args = callArgs(s, m.index + m[0].length);
    const line = s.slice(0, m.index).split('\n').length;
    for (const t of literals(firstArg(args))) add(m[2] + ':' + line, t);
  }
  const nt = /var NOTE_TOAST=\{([^}]*)\}/.exec(s); if (nt) for (const t of literals(nt[1])) add('NOTE_TOAST', t);
  const off = /var AI_OFF_NEED='([^']*)', AI_OFF_PREP='([^']*)'/.exec(s); if (off) { add('AI_OFF_NEED', off[1]); add('AI_OFF_PREP', off[2]); }
  for (const nm of ['_playOffWho', '_refToast']) { const b = block(s, new RegExp('function ' + nm + '\\(')); for (const t of literals(b)) add(nm, t); }
  const nx = /_mpNextToast=([^;]*);/g; while ((m = nx.exec(s))) for (const t of literals(m[1])) add('_mpNextToast', t);
  const wm = /var msg = '([^']*)';/.exec(file.endsWith('advisor-widget.js') ? s : ''); if (wm) add('shareFail', wm[1]);
  return found;
}
export function judge(list) {
  return list.map((x) => { const v = vis(x.t), dots = (v.match(/·/g) || []).length; return Object.assign({}, x, { n: v.length, dots, bad: v.length > MAX || dots > 1 }); });
}

const direct = !!process.argv[1] && /toast-min\.mjs$/.test(process.argv[1]);   // 다른 점검이 scan · judge 만 가져다 쓸 때는 돌지 않는다
if (direct) {
  let fail = 0;
  const all = [];
  for (const f of FILES) { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.log('FAIL 파일 없음 ' + f); fail++; continue; } all.push(...judge(scan(f, fs.readFileSync(p, 'utf8')))); }
  /* 같은 글이 여러 자리에서 나오면 한 번만 찍는다 */
  const seen = new Set();
  for (const x of all) { const k = x.file + '|' + x.t; if (seen.has(k)) continue; seen.add(k); if (x.bad) { fail++; console.log(`FAIL ${x.file} ${x.where} — ${x.n}자 · «·» ${x.dots}번 «${x.t}»`); } }
  if (all.length < MIN_FOUND) { fail++; console.log(`FAIL 알림 글을 ${all.length}개밖에 못 찾았다(기준 ${MIN_FOUND}) — 읽기가 깨졌는지 본다`); }
  /* 스스로 깨 보기 — 긴 알림 · 점 두 번 · 코드 붙은 실패 문구(빼야 한다) */
  const probe = judge(scan('probe.html', "toast('아주 긴 안내 문구가 스무 자를 훌쩍 넘어 버립니다'); _lsToast('하나 · 둘 · 셋'); _miniToast('저장하지 못했어요 · 다시 눌러 주세요 (코드 S6)');"));
  const pb = probe.filter((x) => x.bad).length, pc = probe.filter((x) => /코드/.test(x.t)).length;
  if (pb !== 2 || pc !== 0) { fail++; console.log(`FAIL 스스로 깨 보기 — 긴 알림 2개를 잡아야 하는데 ${pb}개 · 코드 문구는 빼야 하는데 ${pc}개`); }
  const n = seen.size;
  console.log(fail ? `✗ TOAST_MIN 실패 ${fail}건` : `ok toast-min — 알림 글 ${n}개 · 전부 ${MAX}자 안 · «·» 한 번까지`);
  process.exit(fail ? 1 : 0);
}
