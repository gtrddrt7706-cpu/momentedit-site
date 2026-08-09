// ★[DONE_UNDO_TRACKS] 주석의 '닿는 트랙' 목록이 실제 판정과 같은지 [2026-08-09]
//
//   node scripts/check-done-undo-tracks.mjs
//
// 왜 — 이 목록을 **두 번 틀렸다.**
//   1차 "트랙 공통 규칙이라 다른 트랙에도 적용된다"        → final·seat 에 안 닿았다
//   2차 "실제로 닿는 곳: ritual · dining · guideinfo · snap" → guideinfo 는 안 닿고 invitation 이 닿았다
// 두 번 다 코드는 멀쩡했고 **설명만 틀렸다.** 그런데 다음 사람은 코드가 아니라 설명을 읽는다.
// 틀린 설명은 코드보다 오래 산다 — 그래서 사람이 아니라 검사가 지킨다.
//
// 어떻게 — 짐작하지 않는다.
//   ① 판정식(_emptyDraft)을 80_production.gs 에서 **정규식으로 그대로 떼어** 온다(옮겨 적지 않는다).
//   ② 트랙별로 '비우기를 보냈을 때 정규화를 거친 뒤의 draft 모양'을 통과시켜 실제 결과를 구한다.
//   ③ 주석에 적힌 두 목록을 파싱해 ②와 대조한다. 다르면 exit 1.
//
// ★NORMALIZED 는 손으로 적은 표다 — handleSaveProductionTrack 앞부분의 정규화 블록이
//   `body.draft` 를 통째로 다시 쓰기 때문에, 그 결과 모양은 코드를 읽어야만 안다.
//   **정규화를 고치면 이 표도 같은 커밋에서 고칠 것.** 그러라고 여기 근거를 붙여 둔다.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(root, 'automation/platform/80_production.gs');
const src = fs.readFileSync(SRC, 'utf8');

// ① 판정식을 파일에서 그대로 떼어 온다
const m = src.match(/var _emptyDraft = \(function \(\) \{[\s\S]*?\}\)\(\);/);
if (!m) {
  console.error('✗ _emptyDraft 판정식을 80_production.gs 에서 찾지 못했습니다.');
  console.error('  이름이 바뀌었다면 이 검사도 같은 커밋에서 고쳐 주세요 — 조용히 통과시키지 않습니다.');
  process.exit(1);
}
const isEmpty = new Function('body', 'return ' + m[0].replace(/^var _emptyDraft = /, '').replace(/;$/, ''));

// ② 트랙별 — '비우기'가 정규화를 거친 뒤의 draft 모양 (근거는 handleSaveProductionTrack 앞부분)
const NORMALIZED = {
  ritual: { S: {} },                                   // 정규화 블록 없음 — 빌더가 보낸 그대로
  dining: {},                                          // 정규화 블록 없음
  invitation: {},                                      // 정규화 블록 없음
  snap: {                                              // 전부 빈 문자열·빈 배열로만 채워진다
    people: [], mustPeople: '', aboutNote: '', moodCandle: [], moodWhite: [], moodNote: '',
    refs: [], mustHaves: [], toneStyle: '', comfort: '', propsNote: '', directorNote: '',
  },
  guideinfo: { seatMode: 'all', reserveTime: '', reserveName: '' },   // seatMode 가 늘 채워진다
  seat: { tables: [], note: '', _step: 0 },                           // _step 숫자 0
  final: { headcount: '', standing: 0, extraFee: 0 },                 // standing·extraFee 숫자 0
};

const reach = [], block = [];
for (const [t, d] of Object.entries(NORMALIZED)) (isEmpty({ draft: d }) ? reach : block).push(t);

// ③ 주석의 두 목록을 파싱해 대조
const grab = (label) => {
  const r = new RegExp(`${label}\\s*:\\s*([^\\n]*)`).exec(src);
  if (!r) return null;
  return [...r[1].matchAll(/\b(ritual|dining|invitation|snap|guideinfo|seat|final)\b/g)].map((x) => x[1]);
};
const said = { 닿는다: grab('닿는다'), '안 닿는다': grab('안 닿는다') };

let bad = 0;
const cmp = (label, want, got) => {
  if (!got) { console.error(`✗ 주석에서 '${label}' 목록을 찾지 못했습니다 — 목록을 지우지 말고 갱신해 주세요.`); bad++; return; }
  const a = [...want].sort().join(','), b = [...new Set(got)].sort().join(',');
  if (a === b) { console.log(`ok ${label} — ${want.join(' · ')}`); return; }
  console.error(`✗ ${label} 목록이 실제와 다릅니다\n    주석: ${b}\n    실제: ${a}`);
  bad++;
};
cmp('닿는다', reach, said['닿는다']);
cmp('안 닿는다', block, said['안 닿는다']);

if (bad) {
  console.error('\n★코드가 아니라 **주석**이 틀렸을 가능성이 높습니다(두 번 그랬습니다).');
  console.error('  판정식이나 정규화를 바꿨다면 NORMALIZED 표와 주석을 같은 커밋에서 함께 고쳐 주세요.');
  process.exit(1);
}
console.log('DONE_UNDO 트랙 목록 OK');
