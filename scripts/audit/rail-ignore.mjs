#!/usr/bin/env node
/* ★★[RAIL_IGNORE_1019 2026-10-19 사장님 «지금 버튼 레일 비켜서 만든거 같은데 우측버튼레일은 신경쓰지마 무시하고 폭넓게 다시만들기»]
   식순 화면(order-preview.html)은 오른쪽 아이콘 레일(상담 말풍선 · #meAdvStack) 자리를 비우지 않는다 — 말풍선이 칩 · 카드 위에 얹혀도 괜찮다.
   같은 결정이 10/04 에 있었다([RAIL_IGNORE_FULL] «무시하고 전체로» · «식순 파트 전부 · 겹침 상관없음»).
   그런데 10/19 검토 반영 셋(칩 줄 · 예시 카드 · ④ 단추 · 순서 요약)이 다시 오른쪽 36px 를 비켜 세웠고, 사장님이 같은 말을 두 번 하셨다.
   까닭 — 10/04 는 «그때 있던 규칙»만 0 으로 덮었다. 새로 생긴 자리를 막는 장치가 없었다.
   그래서 모양으로 잰다(주석 · 이름과 상관없이):
     ① 오른쪽 «한쪽만» 28px 넘게 비우는 padding-right · margin-right(같은 칸 왼쪽이 같은 값이면 양옆 여백이라 괜찮다) · 네 값 줄임꼴(padding:0 36px 0 12px)도 같다
     ② 칸 폭에서 레일 몫을 빼는 계산(clientWidth-(…))
     ③ 레일 · 말풍선을 까닭으로 폭을 좁히는 max-width
   종료 코드 0 통과 · 1 실패 · 스스로 깨 보기(가짜 셋은 빨강 · 양옆 여백은 초록)가 어긋나도 1 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = 'order-preview.html';
const MIN = 28;

const px = (v) => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim()); return m ? +m[1] : null; };
const lineOf = (src, i) => src.slice(0, i).split('\n').length;
const lineText = (src, i) => src.slice(src.lastIndexOf('\n', i) + 1, (src.indexOf('\n', i) + 1 || src.length + 1) - 1);
const RAIL_WORD = /(말풍선|레일|RAIL_LOCKED|meAdvStack)/;
/* [RIGHT_PAD_OK] 레일과 상관없는 오른쪽 여백(그 칸 안 ✓ · 단추 자리)은 그 줄에 까닭과 함께 적어 둔다 — 레일 · 말풍선을 까닭으로 적으면 그래도 빨강 */
const okLine = (src, i) => { const t = lineText(src, i); return /\[RIGHT_PAD_OK/.test(t) && !RAIL_WORD.test(t.replace(/\[RIGHT_PAD_OK[^\]]*\]/, '')); };

/* 한 칸({ … })의 글 — 같은 칸 안 왼쪽 값과 견준다 */
function blockAt(src, i) {
  const a = src.lastIndexOf('{', i), b = src.indexOf('}', i);
  return a < 0 || b < 0 ? '' : src.slice(a + 1, b);
}

export function scan(src) {
  const bad = [];
  // ① 한쪽 여백
  for (const m of src.matchAll(/(padding|margin)-right\s*:\s*(-?\d+(?:\.\d+)?)px/g)) {
    const v = +m[2]; if (v < MIN || okLine(src, m.index)) continue;
    const blk = blockAt(src, m.index);
    const left = new RegExp(m[1] + '-left\\s*:\\s*' + m[2] + 'px').test(blk);
    if (!left) bad.push(`${FILE}:${lineOf(src, m.index)} ${m[0]} — 오른쪽만 ${v}px 비운다`);
  }
  for (const m of src.matchAll(/(?<![-\w])(padding|margin)\s*:\s*([^;}"'\\]+)/g)) {
    const vs = m[2].trim().split(/\s+/); if (vs.length !== 4 || okLine(src, m.index)) continue;
    const r = px(vs[1]), l = px(vs[3]);
    if (r !== null && r >= MIN && r !== l) bad.push(`${FILE}:${lineOf(src, m.index)} ${m[0].trim()} — 오른쪽만 ${r}px 비운다`);
  }
  // ② 칸 폭에서 레일 몫 빼기
  for (const m of src.matchAll(/clientWidth\s*-\s*\(/g)) bad.push(`${FILE}:${lineOf(src, m.index)} ${src.slice(m.index, m.index + 40)}… — 칸 폭에서 오른쪽 몫을 뺀다`);
  // ③ 레일 · 말풍선 까닭으로 폭 좁히기
  src.split('\n').forEach((ln, i) => {
    if (/RAIL_IGNORE/.test(ln)) return;
    if (/(말풍선|아이콘 레일|RAIL_LOCKED|meAdvStack)/.test(ln) && /max-width\s*:\s*\d+px/.test(ln) && /[{;]\s*max-width/.test(ln)) bad.push(`${FILE}:${i + 1} 레일 · 말풍선 자리를 까닭으로 폭을 좁힌다`);
  });
  return bad;
}

const direct = !!process.argv[1] && /rail-ignore\.mjs$/.test(process.argv[1]);
if (direct) {
  let src; try { src = fs.readFileSync(path.join(ROOT, FILE), 'utf8'); } catch (e) { console.log('FAIL 못 읽었다 — ' + e.message); process.exit(1); }
  const bad = scan(src);
  for (const b of bad) console.log('FAIL ' + b);
  /* 스스로 깨 보기 — 지난 세 꼴은 빨강 · 양옆 여백은 초록이어야 한다 */
  const probes = [
    ['칩 줄 오른쪽 36px', '@media (max-width:460px){.ls-cg .cg-c.cg-even{padding-right:36px}}', true],
    ['네 값 줄임꼴', '.pk-exs .pk-ex{padding:10px 48px 10px 12px}', true],
    ['칸 폭에서 빼기', 'var W=c.clientWidth-(nar&&!dl?36:0);', true],
    ['말풍선 까닭 폭 좁히기', '.mk-tdots{max-width:264px;margin:0 auto}   /* 상담 말풍선 자리를 비운다 */', true],
    ['양옆 여백(괜찮다)', '.lf-in.lf-wide{padding-left:32px;padding-right:32px}', false],
    ['칸 안 ✓ 자리(괜찮다)', '.mu-pick{padding:8px 34px 8px 2px}   /* [RIGHT_PAD_OK] 고른 곡 ✓ 자리 */', false],
    ['✓ 자리라 적고 레일 까닭', '.x{padding-right:36px}   /* [RIGHT_PAD_OK] 상담 말풍선 자리 */', true],
  ];
  let dead = 0;
  for (const [nm, t, want] of probes) { const got = scan(t).length > 0; if (got !== want) { dead++; console.log(`FAIL 깨 보기 «${nm}» — ${want ? '빨강이 안 됐다' : '초록이어야 하는데 빨강'}`); } }
  console.log(bad.length || dead ? `✗ RAIL_IGNORE_1019 실패 ${bad.length + dead}건` : `ok rail-ignore — ${FILE} 오른쪽 한쪽 비우기 0 · 폭 빼기 0 · 레일 까닭 좁히기 0 · 깨 보기 ${probes.length}개 맞음`);
  process.exit(bad.length || dead ? 1 : 0);
}
