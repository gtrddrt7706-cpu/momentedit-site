#!/usr/bin/env node
/* ★★[LISTEN_SEAM_1107 2026-11-07 대본 «junctions.md 85개 == 탭 85칸»] 실청 비교 판(listen-speed-1107.html)의 «이음매 듣기» 탭이
   docs/handoff/junctions.md 의 이음매(J 번호 · 앞 → 뒤 순간)와 한 칸도 어긋나지 않는지 잰다 — 탭 목록은 손으로 적지 않고 생성기(build-junctions --json)에서 온다.
   ① md 이음매 수 == 탭 칸 수 ② J 번호 · 이름이 차례까지 같다 ③ 칸마다 갈래 1개 이상 · 줄마다 소리 파일이 저장소에 있다(소리 없는 사진 줄 빼고)
   ④ 깨 보기 — 탭에서 한 칸을 빼거나 이름을 바꾸면 ① · ② 가 빨강
   비교 판은 실청 전용이라 병합 전에 지운다 — 판이 없으면 «잴 판 없음»으로 통과(0). 종료 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PAGE = path.join(ROOT, 'listen-speed-1107.html');
if (!fs.existsSync(PAGE)) { console.log('ok seam-listen — 잴 판 없음(실청 전용 비교 판이 지워졌다) [LISTEN_SEAM_1107]'); process.exit(0); }
const md = fs.readFileSync(path.join(ROOT, 'docs/handoff/junctions.md'), 'utf8');
const MD = [...md.matchAll(/^### (J\d+) · (.+?) → (.+?) · 100쌍 중/gm)].map((m) => [m[1], m[2], m[3]]);
const html = fs.readFileSync(PAGE, 'utf8'); const m = /var D = (\{.*?\});\n/s.exec(html);
if (!m) { console.log('FAIL seam-listen — 판에서 데이터(var D)를 못 찾았다'); process.exit(1); }
const D = JSON.parse(m[1]); const JN = ((D.cmp || {}).jn || []).map((j) => [j.id, j.an, j.bn]);
function judge(mdL, tabL, jn) { const bad = [];
  if (mdL.length !== tabL.length) bad.push(`① 수가 다르다 — junctions.md ${mdL.length} · 탭 ${tabL.length}`);
  mdL.forEach((x, i) => { const y = tabL[i]; if (!y || x.join('|') !== y.join('|')) bad.push(`② ${i + 1}번째 — md ${x.join(' ')} · 탭 ${y ? y.join(' ') : '없음'}`); });
  (jn || []).forEach((j) => { if (!j.br || !j.br.length) bad.push(`③ ${j.id} 갈래 0`);
    (j.br || []).forEach((b) => b.left.concat(b.right).forEach((l) => { if (l.t && (!l.f || !fs.existsSync(path.join(ROOT, l.f)))) bad.push(`③ ${j.id} ${l.slug} 소리 파일 없음`); })); });
  return bad; }
const bad = judge(MD, JN, D.cmp.jn);
const br1 = judge(MD, JN.slice(1), []).length > 0, br2 = judge(MD, JN.map((x, i) => (i === 3 ? [x[0], x[1] + '!', x[2]] : x)), []).length > 0;
if (!br1 || !br2) bad.push('④ 깨 보기가 빨강이 안 된다(죽은 검사)');
if (bad.length) { console.log('FAIL seam-listen [LISTEN_SEAM_1107]\n  ' + bad.slice(0, 12).join('\n  ')); process.exit(1); }
console.log(`ok seam-listen — 이음매 ${MD.length} == 탭 ${JN.length} · 번호 · 이름 차례 같음 · 갈래 ${D.cmp.jn.reduce((a, j) => a + j.br.length, 0)} · 깨 보기 둘 맞음 [LISTEN_SEAM_1107]`);
