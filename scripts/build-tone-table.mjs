#!/usr/bin/env node
/* 어조 문안 표를 **문서에서 뽑는다** [TONE_TABLE]
 *
 * ★왜 생성기인가 — 옮겨 적을 것이 서른여덟 벌이다. 손으로 옮기면 반드시 한 글자가 틀리고,
 *   그 한 글자는 당일 스피커에서만 드러난다. 그래서 원천 문서(`21_B_제안.md` §3)에서 뽑고,
 *   기본 모드는 **대조**다 — 문서와 데이터가 갈라지면 그 자리에서 붉어진다.
 *
 * ★표에는 **현행이 안 들어간다.** 이것이 이 설계의 핵심이다.
 *   자리마다 현행이 앉은 결 칸이 다르다(`NARV` 현행은 담백 · 입장 A 현행은 서정 · B 는 담백).
 *   그래서 「현행을 어느 결 칸에 넣을까」를 풀려고 하면 반드시 어딘가가 어긋난다.
 *   대신 **없으면 현행**으로 읽는다 — 표에는 새로 쓴 것만 담고, 빈 칸은 곧 현행이라는 뜻이다.
 *   `S.tone` 자체가 없으면 전 자리가 빈 칸이니 **전부 현행**이 된다(52 §7 이 요구한 폴백).
 *   덤으로 표의 크기가 곧 새 클립 수다 — 38 이 아니면 뭔가 빠진 것이다.
 *
 * 쓰기: node scripts/build-tone-table.mjs           → 대조(0 같음 / 1 다름 / 2 못 잼)
 *       node scripts/build-tone-table.mjs --emit    → 리터럴만 찍는다(붙여 넣을 때)
 *       node scripts/build-tone-table.mjs --write   → ritual-data.js 의 표를 갈아 끼운다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'docs/plans/대본개정/21_B_제안.md');
const DATA = path.join(ROOT, 'assets/ritual-data.js');
const BEGIN = '/* [TONE_TABLE:BEGIN] 생성물 — 손으로 고치지 말 것. 원천은 21_B_제안.md §3 */';
const END = '/* [TONE_TABLE:END] */';

/* ★결 이름은 **허용 목록**으로 받는다. 문서의 굵은 줄에는 문안 아닌 것도 있다
   (「낭독자(DECLWHO) 의견」·「닫는 말 대안」). 여기 없는 것은 통째로 안 본다 —
   그물을 넓히면 해설이 문안으로 들어온다(check-munan-copy 가 이미 한 번 밟은 함정). */
const GROUPS = {
  '3-1': { name: 'entry', keys: ['A', 'B', 'C', 'D', 'E', 'F'] },
  '3-2': { name: 'declare', keys: ['1', '2', 'family'] },
  '3-3': { name: 'letter', keys: ['parent', 'each', 'both'] },
  '3-4': { name: 'tribute', keys: ['flower', 'bow', 'hug'] },
  '3-5': { name: 'toast', keys: ['toast', 'cake', 'both'] },
};
const TONE = { 담백: 'plain', 서정: 'lyric', 다정: 'warm' };

function extract() {
  if (!fs.existsSync(SRC)) return { err: `원천이 없다: ${SRC}` };
  const out = {}; let g = null, key = null, tone = null, n = 0;
  for (const raw of fs.readFileSync(SRC, 'utf8').split('\n')) {
    const l = raw.trim();
    const h = l.match(/^###\s+(3-\d)\./);
    if (h) { g = GROUPS[h[1]] || null; key = tone = null; continue; }
    if (/^##\s/.test(l)) { g = null; key = tone = null; continue; }      // §3 밖으로 나가면 끈다
    if (!g) continue;
    const b = l.match(/^\*\*(.+?)\*\*/);
    if (b) {
      const t = TONE[b[1]];
      if (t) { tone = t; continue; }
      // 갈래 머리 — 괄호 안 영문키가 있으면 그것, 없으면 첫 토큰
      const p = b[1].match(/\(([A-Za-z]+)\)/);
      const cand = p ? p[1] : b[1].split(/\s+/)[0];
      key = g.keys.includes(cand) ? cand : null;                          // 허용 목록 밖 = 무시
      tone = null; continue;
    }
    if (!/^>\s/.test(l) || !key || !tone) continue;
    const body = l.replace(/^>\s*/, '').trim();
    if (!body) continue;
    ((out[g.name] ||= {})[key] ||= {});
    // 「둘 다」 처럼 한 결에 인용이 둘이면 배열로 쌓는다(첫째 커팅 · 둘째 축배)
    const slot = out[g.name][key];
    if (slot[tone] === undefined) slot[tone] = body;
    else slot[tone] = [].concat(slot[tone], body);
    n++;
  }
  return { out, n };
}

const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
function render(o) {
  const L = [BEGIN, 'var TONE={'];
  for (const g of Object.keys(o)) {
    L.push(' ' + g + ':{');
    for (const k of Object.keys(o[g])) {
      const v = o[g][k];
      const parts = Object.keys(v).map((t) => t + ':' + (Array.isArray(v[t]) ? '[' + v[t].map(q).join(',') + ']' : q(v[t])));
      L.push('  ' + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k)) + ':{' + parts.join(', ') + '},');
    }
    L.push(' },');
  }
  L.push('};', END);
  return L.join('\n');
}

const { out, n, err } = extract();
if (err) { console.log('못 잼: ' + err); process.exit(2); }

// 표의 크기 = 새로 나는 클립 수. 52 §3 이 +38 이라고 적었다.
let clips = 0;
for (const g of Object.keys(out)) for (const k of Object.keys(out[g]))
  for (const t of Object.keys(out[g][k])) clips += Array.isArray(out[g][k][t]) ? out[g][k][t].length : 1;

const lit = render(out);
if (process.argv.includes('--emit')) { console.log(lit); process.exit(0); }

const src = fs.readFileSync(DATA, 'utf8');
const i = src.indexOf(BEGIN), j = src.indexOf(END);
if (process.argv.includes('--write')) {
  const next = (i >= 0 && j > i)
    ? src.slice(0, i) + lit + src.slice(j + END.length)
    : (console.log('못 잼: ritual-data.js 에 TONE_TABLE 표식이 없다 — 자리를 먼저 만들 것'), process.exit(2));
  fs.writeFileSync(DATA, next);
  console.log(`썼다 — 문안 ${n}벌 · 클립 ${clips}개`);
  process.exit(0);
}

if (i < 0 || j <= i) { console.log('못 잼: ritual-data.js 에 TONE_TABLE 표식이 없다'); process.exit(2); }
const have = src.slice(i, j + END.length);
const same = have.trim() === lit.trim();
console.log(`문안 ${n}벌 · 클립 ${clips}개 (52 §3 기준 38)`);
console.log((same ? 'ok   ' : 'FAIL ') + '문서(21_B §3)와 ritual-data.js 의 TONE 이 같다');
if (clips !== 38) console.log(`FAIL 클립 수가 38 이 아니다 — 문서에서 빠졌거나 더 들어왔다 (지금 ${clips})`);
if (!same) console.log('   → node scripts/build-tone-table.mjs --write 로 다시 뽑을 것');
process.exit((same && clips === 38) ? 0 : 1);
