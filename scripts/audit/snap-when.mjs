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
/* ★[SNAP_PICK_V2 2026-09-26] 안내의 분은 이제 화면 글자가 아니라 목록 파일(assets/snap-refs.js)에서 그려진다 —
   ★★[SNAP_55 2026-09-26 사장님 «이동5분은 없어도돼 캔들존으로 포함» · «55분 촬영으로 뭉뚱그려서»] 이제는
   «도착 N분 › 캔들존 · 화이트존 촬영 N분 › 입장 준비 N분 › 본식» — 두 공간은 한 칸(R.shoot = 캔들존 + 옮기기 + 화이트존).
   목록의 분을 진행표와 대조하는 것은 그대로다(공간별 분·시각·장면 목록은 scripts/audit/snap-plan.mjs 가 더 자세히 본다) */
const refs = read('assets/snap-refs.js');
if (!refs) { console.log('━━ snap-when — assets/snap-refs.js 가 없습니다 · 재지 못했습니다'); process.exit(2); }
const num = (re) => { const x = refs.match(re); return x ? +x[1] : NaN; };
const arrive = num(/arrive:\s*(\d+)/), move = num(/move:\s*(\d+)/), prep = num(/prep:\s*(\d+)/);
const zmin = [...refs.matchAll(/key: '(?:candle|white)'[^}]*?min: (\d+)/g)].map((x) => +x[1]);
const total = zmin.reduce((a, b) => a + b, 0) + move + prep;
if (arrive !== +a[1]) bad.push(`스냅 기획 안내의 도착 분(${arrive})이 진행표(${a[1]}분)와 다르다 — assets/snap-refs.js 의 arrive 를 고칠 것`);
if (zmin.length !== 2 || total !== +m[1]) bad.push(`스냅 기획 안내의 분 합계(${total})가 진행표 «단독 스냅 촬영»(${m[1]}분)과 다르다 — 진행표가 바뀌었으면 assets/snap-refs.js 의 캔들존·화이트존 min · move · prep 를 같은 값으로 고칠 것`);
if (!/function _spWhen\(D, R, due\)[\s\S]{0,600}R\.arrive[\s\S]{0,200}R\.shoot[\s\S]{0,120}R\.prep/.test(my)) bad.push('스냅 기획 안내가 목록 파일의 분(도착 · 두 공간 촬영 R.shoot · 입장 준비)으로 그려지지 않는다(_spWhen · SNAP_55)');
if (!/R\.shoot = R\.zones\.reduce\(function \(a, z\) \{ return a \+ z\.min; \}, 0\) \+ R\.move;/.test(refs)) bad.push('R.shoot 이 «캔들존 + 옮기기 + 화이트존»이 아니다(assets/snap-refs.js · SNAP_55)');
if (/data-sppl/.test(my)) bad.push('«누가 함께» 칩(data-sppl)이 돌아왔다 — 2026-09-25 사장님 지시로 삭제한 질문');
if (/>누가 함께 담기나요 <span/.test(my)) bad.push('«누가 함께 담기나요» 섹션 제목이 돌아왔다');
if (/placeholder="꼭 챙길 분/.test(my)) bad.push('«꼭 챙길 분» 입력칸이 돌아왔다');
if (bad.length) { console.log('━━ snap-when — 빨강 ' + bad.length + '건'); bad.forEach((b) => console.log('   · ' + b)); process.exit(1); }
console.log(`━━ snap-when OK — 안내 «도착 ${a[1]}분 › 단독 스냅 ${m[1]}분»(목록 합계 ${total}) = 진행표 · 삭제한 질문 0건`);
process.exit(0);
