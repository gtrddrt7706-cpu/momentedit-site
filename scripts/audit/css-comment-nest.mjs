#!/usr/bin/env node
/* CSS 주석 중첩 감지 — 푸시 전에 「규칙이 통째로 사라지는」 사고를 잡는다.
 *
 * 왜 필요한가 (2026-09-06 실사고)
 *   CSS 주석은 중첩되지 않는다. 여는 표시 안에서 한 번 더 열어도 파서는 무시하고,
 *   «첫 번째» 닫는 표시에서 바깥 주석까지 함께 끝낸다. 그 뒤의 설명문은 CSS 로 읽히고,
 *   파서는 오류에서 회복하려고 다음 { } 블록 하나를 통째로 삼킨다.
 *   실제로 index.html 의 .journal-listen 규칙이 그렇게 사라져, 저널 재생 버튼이
 *   26px 골드 원 대신 브라우저 기본 네모 버튼으로 배포됐다. 화면은 «대체로» 멀쩡해
 *   눈으로도, 링크 검사로도, 접근성 감사로도 안 잡혔다 — 규칙 하나만 조용히 없어졌다.
 *
 * 무엇을 보나
 *   .html 의 <style> 블록과 .css 파일에서, 주석이 열린 상태에서 다시 열리는 자리를 찾는다.
 *   순수 텍스트 검사라 브라우저·네트워크가 필요 없다(포트 충돌·오프라인 무관).
 *
 * 종료 코드  0 = 깨끗함 · 1 = 중첩 발견(고칠 것)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const SKIP = new Set(['node_modules', '.git', '_deploy-patch', 'dist', 'build']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|css)$/i.test(e.name)) out.push(p);
  }
  return out;
}

/** 주석이 열린 상태에서 다시 열리는 위치(오프셋)들 */
function nestedOpens(text) {
  const hits = [];
  let i = 0, open = false;
  while (i < text.length - 1) {
    const two = text[i] + text[i + 1];
    if (!open && two === '/*') { open = true; i += 2; continue; }
    if (open && two === '/*') { hits.push(i); i += 2; continue; }
    if (open && two === '*/') { open = false; i += 2; continue; }
    i += 1;
  }
  return hits;
}

const files = walk(ROOT);
let bad = 0;

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const blocks = f.endsWith('.css')
    ? [[0, t]]
    : [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => [m.index + m[0].indexOf(m[1]), m[1]]);
  for (const [off, block] of blocks) {
    for (const h of nestedOpens(block)) {
      const pos = off + h;
      const line = t.slice(0, pos).split('\n').length;
      const snippet = t.slice(pos, pos + 90).split('\n')[0];
      console.log(`  ${path.relative(ROOT, f)}:${line}  ${snippet}`);
      bad++;
    }
  }
}

if (bad) {
  console.log(`\n[CSS_COMMENT_NEST] 주석 안에서 주석을 다시 열었습니다 — ${bad}건.`);
  console.log('  CSS 주석은 중첩되지 않습니다. 안쪽을 닫는 순간 바깥 주석도 끝나고,');
  console.log('  그 뒤 설명문이 CSS 로 읽혀 바로 다음 규칙 하나가 통째로 사라집니다.');
  console.log('  고치는 법: 안쪽 주석 표시를 지우고 설명을 바깥 주석 본문에 그대로 이어 쓰세요.');
  process.exit(1);
}

console.log(`css-comment-nest: 깨끗함 (${files.length}개 파일)`);
