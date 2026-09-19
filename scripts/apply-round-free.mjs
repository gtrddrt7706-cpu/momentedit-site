// 인사 돌기를 «자유롭게» 돌려준다 [ROUND_FREE]
//
//   node scripts/apply-round-free.mjs [--write]
//
// ★2026-09-19 사장님 지시 원문:
//   *"자리를 돌며 인사드리는 시간 그시간을 처음여는 멘트만 넣고 자유롭게 할수있도록 하자
//     중간20남았다 이런거 빼고 사진요청멘트남기고"*
//
// 세 가지를 한다.
//
// ① narr-round-open 5문장 → 3문장
//    뺀 것 ㉮「자리마다 차례로 찾아뵙겠습니다」 — 동선을 «차례로»라고 규정한다.
//           그날 두 분이 어느 자리부터 갈지는 그 자리에서 정해진다. 녹음이 미리 정하면 안 된다.
//         ㉯「이십 분쯤 걸리니 편히 계시면 됩니다」 — 사장님이 지목하신 「중간 20 남았다 이런 거」.
//           시간을 말하는 순간 그 시간이 약속이 되고, 두 분은 그 약속에 쫓긴다.
//    ★남긴 것 「앉으신 채로 편히 맞아 주시면 됩니다」 — 이것은 진행을 규정하는 말이 아니라
//      하객이 «매번 일어서야 하나»를 망설이지 않게 푸는 말이다. 자유를 좁히지 않고 넓힌다.
//      사장님이 빼라고 지목하신 것은 «시간·순서 통보»이지 하객 안심 문구가 아니다.
//    ★남긴 것 「사진이 필요하시면 작가님을 부르셔도 좋습니다」 — 사장님이 «남기고»라고 명시하셨다.
//
// ② narr-round-mid(86) 폐지 — RETIRED 에 올린다
//    「두 분이 절반쯤 인사를 나누셨습니다 …」 한 클립 3문장. 사장님이 말씀하신 그 「중간」이다.
//    ★파일·문안·번호는 지우지 않는다(SONG_RETIRED 와 같은 처방) — 지우면 번호가 밀린다.
//    ★ROUND_MID(2026-09-12)의 근거(17분간 무음 · 이탈 방지)는 여전히 옳은 관찰이다.
//      다만 사장님이 «자유롭게»를 골랐다. 되살리지 말 것 — 되살리려면 이 지시부터 뒤집어야 한다.
//
// ③ console.html 의 보조 클립 목록에서 폐지한 것을 거른다
//    ★따라 나온 것이다. ②를 RETIRED 로 처리하며 보니, 보조 클립 버튼이 RETIRED 를 안 본다.
//      2026-09-06 에 사장님이 폐지하신 대기·재개 브릿지 둘이 아직 «눌리는 버튼»으로 남아 있었다.
//      제거 지시 보존 규칙이 화면 한 곳에서만 지켜지지 않고 있었던 것이다.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const W = process.argv.includes('--write');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const DATA = 'assets/ritual-data.js';
const CUE = 'assets/ritual-cue.js';
const CON = 'console.html';

const OLD_OPEN = '여기까지 앞만 보고 온 두 사람이, 이제 여러분 곁으로 찾아뵙겠습니다. 자리마다 차례로 찾아뵙겠습니다. 앉으신 채로 편히 맞아 주시면 됩니다. 사진이 필요하시면 작가님을 부르셔도 좋습니다. 이십 분쯤 걸리니 편히 계시면 됩니다.';
const NEW_OPEN = '여기까지 앞만 보고 온 두 사람이, 이제 여러분 곁으로 찾아뵙겠습니다. 앉으신 채로 편히 맞아 주시면 됩니다. 사진이 필요하시면 작가님을 부르셔도 좋습니다.';

const MARK_OPEN = ` /* ★★[ROUND_FREE 2026-09-19 사장님 지시 *"처음 여는 멘트만 넣고 자유롭게 할 수 있도록 … 중간 20 남았다 이런 거 빼고 사진 요청 멘트 남기고"*]
    ★되살리지 말 것 — 여기서 뺀 두 문장은 «유실»이 아니라 결정이다.
      ㉮「자리마다 차례로 찾아뵙겠습니다」 동선을 미리 정한다. 그날 순서는 그 자리에서 정해진다.
      ㉯「이십 분쯤 걸리니 편히 계시면 됩니다」 시간을 말하면 그 시간이 약속이 되고 두 분이 쫓긴다.
    ★ROUND_LEN 의 「필요한 것 셋(①앉아 있어도 되나 ②얼마나 ③떠도 되나)」 중 ②③을 사장님이 접으셨다.
      ①만 남았다 — 그게 「앉으신 채로 편히 맞아 주시면 됩니다」다. */`;

const RET_ANCHOR = `    'narr-song': 1, 'narr-song-out': 1 };`;
const RET_NEW = `    /* ★★[ROUND_FREE 2026-09-19 사장님 지시] 인사 «돌기» 가운데 안내 폐지 —
       *"중간 20 남았다 이런 거 빼고"*. ROUND_MID(2026-09-12)로 넣었던 한 클립 3문장이다.
       ★그때의 근거(17분간 스피커가 한 마디도 안 나간다 · 순번을 알려 주면 이탈이 준다)는
         관찰로는 여전히 옳다. 다만 사장님이 «자유롭게»를 고르셨다 — 진행 상황을 방송하는 순간
         두 분의 남은 시간이 하객 25명에게 동시에 공표되고, 그 뒤로는 그 시계에 맞춰 돌게 된다.
       ★파일·문안·번호는 그대로 둔다(SONG_RETIRED 와 같은 이유). 되살리지 말 것. */
    'narr-round-mid': 1,
    'narr-song': 1, 'narr-song-out': 1 };`;

const CON_OLD = `var HELPERS = [
  ['bridge-5-wait-setup', '준비 대기 안내', '무엇을 준비하는 중일 때'],
  ['bridge-6-resume', '다시 이어가기', '멈춘 자리에서 재개할 때'],
  ['parents-letter', '혼주 편지', '혼주께서 편지를 준비하셨을 때'],
  ['narr-bless-open', '어른 말씀 열기', '덕담을 따로 열어야 할 때']
];`;
const CON_NEW = `/* ★★[HELPER_RETIRED 2026-09-19] 폐지한 자리는 버튼으로도 남기지 않는다.
   ★어떻게 드러났나 — ROUND_FREE 로 narr-round-mid 를 RETIRED 에 올리다 이 목록을 봤더니,
     2026-09-06 에 사장님이 폐지하신 대기·재개 브릿지 둘이 **아직 눌리는 버튼**이었다.
     큐 체인은 RETIRED 를 보는데 이 목록만 안 봤다 — 폐지가 화면 한 곳에서 새고 있었다.
   ★목록을 손으로 지우지 «않는다». RETIRED 로 거른다 — 손으로 지우면 다음 폐지 때 또 샌다.
     정본은 언제나 ritual-cue.js 의 RETIRED 하나다 [ONE_SPEC]. */
var HELPERS = [
  ['bridge-5-wait-setup', '준비 대기 안내', '무엇을 준비하는 중일 때'],
  ['bridge-6-resume', '다시 이어가기', '멈춘 자리에서 재개할 때'],
  ['parents-letter', '혼주 편지', '혼주께서 편지를 준비하셨을 때'],
  ['narr-bless-open', '어른 말씀 열기', '덕담을 따로 열어야 할 때']
].filter(function(p){ return !(RitualCue.RETIRED || {})[p[0]]; });`;

const JOBS = [
  [DATA, '여는 말 5문장 → 3문장', OLD_OPEN, NEW_OPEN, 1],
  [DATA, '여는 말 근거 주석', ' roundOpen:"', MARK_OPEN + '\n roundOpen:"', 1],
  [CUE, 'narr-round-mid 폐지', RET_ANCHOR, RET_NEW, 1],
  [CON, '보조 클립에서 폐지분 거르기', CON_OLD, CON_NEW, 1],
];

let bad = 0;
const out = new Map();
for (const [f, why, from, to, n] of JOBS) {
  const src = out.get(f) ?? read(f);
  const got = src.split(from).length - 1;
  if (got === 0 && src.includes(to.trim().split('\n')[0])) { console.log(`ok ${f} — 이미 되어 있음 · ${why}`); continue; }
  if (got !== n) { console.log(`  ✗ ${f} — ${why}: ${n}곳이어야 하는데 ${got}곳`); bad++; continue; }
  out.set(f, src.split(from).join(to));
  console.log(`ok ${f} — ${why} (${n}곳)`);
}

if (bad) { console.log(`\n✗ ${bad}건 어긋남 — 아무것도 쓰지 않았습니다.`); process.exit(1); }
if (!W) { console.log('\n(미리보기) --write 로 반영'); process.exit(0); }
for (const [f, s] of out) fs.writeFileSync(path.join(ROOT, f), s);
console.log('\n반영함 — 다음: node scripts/check-narr-len.mjs --table 로 새 초 수를 재서 ROUND_LEN 주석을 고칠 것');
