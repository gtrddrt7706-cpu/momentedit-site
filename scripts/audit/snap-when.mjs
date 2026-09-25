// 스냅 기획 «언제의 스냅인지» 안내가 진행표 원천과 같은 분을 말하는지 — 그리고 삭제한 질문이 돌아오지 않았는지.
//
// ★[SNAP_COUPLE_ONLY 2026-09-25 사장님 「스냅 기획은 본식 전 스냅 · 누르면 어떤 시간인지 설명 · ‘누가 함께 담기나요’는 맞지 않는 질문 — 부부 웨딩스냅」]
//   안내의 분(단독 스냅 · N분)은 assets/sequence-modal.js ROWS «단독 스냅 촬영»의 사본이다.
//   같은 날 그 원천이 45 → 50(SNAP_50)으로 바뀌었다 — 사본은 원천이 바뀔 때 조용히 틀린다. 그래서 잰다.
//   ★[SERVED_OURS] 원천·화면을 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const seq = read('assets/sequence-modal.js'), my = read('mypage.html');
if (!seq || !my) { console.log('━━ snap-when — 원천 또는 mypage.html 이 없습니다 · 재지 못했습니다'); process.exit(2); }
const m = seq.match(/\['단독 스냅 촬영',\s*'(\d+)분'/), a = seq.match(/\['신랑·신부 도착',\s*'(\d+)분'/);
if (!m || !a) { console.log('━━ snap-when — 진행표에서 «단독 스냅 촬영»·«신랑·신부 도착» 줄을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const bad = [];
if (!my.includes(`>단독 스냅 · ${m[1]}분<`)) bad.push(`스냅 기획 안내의 분이 진행표(${m[1]}분)와 다르다`);
if (!my.includes(`>도착 · ${a[1]}분<`)) bad.push(`스냅 기획 안내의 도착 분이 진행표(${a[1]}분)와 다르다`);
if (/data-sppl/.test(my)) bad.push('«누가 함께» 칩(data-sppl)이 돌아왔다 — 2026-09-25 사장님 지시로 삭제한 질문');
if (/>누가 함께 담기나요 <span/.test(my)) bad.push('«누가 함께 담기나요» 섹션 제목이 돌아왔다');
if (/placeholder="꼭 챙길 분/.test(my)) bad.push('«꼭 챙길 분» 입력칸이 돌아왔다');
if (bad.length) { console.log('━━ snap-when — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ snap-when OK — 안내 «도착 ${a[1]}분 › 단독 스냅 ${m[1]}분» = 진행표 · 삭제한 질문 0건`);
process.exit(0);
