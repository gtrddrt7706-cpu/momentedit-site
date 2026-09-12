// 17분 동안 아무도 말하지 않는다 [ROUND_MID]
//
//   node scripts/apply-round-mid.mjs [--write]
//
// ★왜 — 2026-09-12 사장님: *"진행 흐름을 파악하고 개선점은 없는지 … 완성도를 높여보자"*
//   흐름을 시간축으로 펼쳐 재 보니(scripts/audit/flow-shape.js) 이게 나왔다:
//     narr-round-open  「이십 분쯤 걸리니 편히 계시면 됩니다」
//     ● 라이브 1020초 — 두 분이 자리마다 인사 (17분)
//     narr-final-warn  「잠시 뒤, 마지막으로 다 함께 한 장을 남기겠습니다」
//   그 17분 동안 스피커에서 «한 마디도 안 나간다». 하루에서 사람의 시간이 가장 긴 자리다.
//
// ★★[이 저장소는 이미 그 원리를 알고 있었다 — 4분짜리에만 적용했다]
//   ritual-cue.js 의 narr-photo-split 큐에 이렇게 적혀 있다:
//     note: '★뒤 문장이 대기를 「알려진 대기」로 바꾼다 — 순번을 알려 주면 이탈이 준다(하버드)'
//   그 원리를 «4분» 구간에는 쓰고 «17분» 구간에는 안 썼다. 거꾸로다.
//   ritual-data.js 의 roundOpen 주석도 같은 것을 이미 적어 뒀다 —
//     「안내는 시작에 한 번뿐이라, 하객은 세 가지를 모른 채 앉아 있었다:
//       ①일어나야 하나 앉아 있어야 하나 ②얼마나 걸리나 ③자리를 떠도 되나
//       셋 다 물어볼 사람이 없다(사회자가 없다)」
//   그때는 «첫 문장»을 고쳐서 풀었다. 그런데 17분 뒤에는 그 답이 이미 잊힌다.
//
// ★★[한 줄을 «가운데»에 둔다 — 여는 말을 늘리지 않는다]
//   여는 말에 정보를 더 넣는 길도 있지만, 20초짜리 안내가 길어지면 그 자체가 지루해지고
//   (roundOpen 은 이미 31.5초에서 20.1초로 줄인 이력이 있다 · ROUND_LEN) 17분 뒤엔 어차피 잊힌다.
//   필요한 것은 «그 시점에» 다시 말해 주는 것이다.
//
// ★★[언제 트나 — 시간이 아니라 사람이 정한다]
//   「절반」이 몇 분인지는 그날 자리 수와 이야기 길이로 달라진다. 녹음은 그걸 모른다.
//   그래서 체인에 넣지 않고 «디렉터가 골라 트는» 자리에 둔다(NARR_CONSOLE_ONLY).
//   PHOTOCUE 가 같은 이유로 판이지 체인이 아니다 — 「예식은 흐름이고 촬영은 작업이다」.
//
// ★★[문안 — 이탈을 막지 않고 «다시 만나게» 한다]
//   17분이면 화장실에 가고 싶은 사람이 생긴다. 막으면 참고 앉아 있게 되고, 그냥 풀면
//   두 분이 그 자리에 갔을 때 사람이 없다. 그래서 비우는 것을 허용하되 다시 찾아뵙는다고 말한다.
//   ★순번을 단정하지 않는다 — 「절반쯤」이지 「절반」이 아니다. 녹음이 셀 수 없는 것은 단정하지 않는다.
//   ★감정을 말하지 않는다. 세 문장 다 «무엇이 일어나는지»만 말한다.
//
// ★비용 — 우성 1클립 재녹음(신규). 번호는 맨 끝에 붙는다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const DATA = path.join(ROOT, 'assets/ritual-data.js');
const CUE = path.join(ROOT, 'assets/ritual-cue.js');

const TEXT = '두 분이 절반쯤 돌았습니다. 아직 만나지 못한 자리도 차례로 찾아뵙습니다. 잠깐 자리를 비우셔야 하면, 다녀오신 뒤에 다시 찾아뵙겠습니다.';

const E = [
  [DATA, '문안 추가', ' onlineIn:',
   ` /* ★★[ROUND_MID 2026-09-12] 인사 사진 17분 «가운데»에 디렉터가 트는 한 줄.
    그 구간은 하루에서 사람의 시간이 가장 길고(1020초), 그동안 스피커에서 한 마디도 안 나간다.
    ★이 저장소는 이미 그 원리를 알고 있었다 — narr-photo-split 큐 note 의
      「순번을 알려 주면 이탈이 준다(하버드)」. 그걸 4분 구간에만 쓰고 17분 구간엔 안 썼다.
    ★여는 말(roundOpen)을 늘리지 «않는» 이유 — 그건 이미 31.5초에서 20.1초로 줄인 이력이 있고
      (ROUND_LEN), 17분 뒤엔 어차피 잊힌다. 필요한 것은 그 시점에 다시 말하는 것이다.
    ★체인이 아니라 «골라 트는» 자리다 — 「절반」이 몇 분인지는 그날 자리 수로 달라진다.
      녹음은 그걸 모르므로 사람이 정한다. 그래서 「절반쯤」이지 「절반」이 아니다.
    ★이탈을 막지 않는다 — 막으면 참고 앉아 있고, 그냥 풀면 두 분이 갔을 때 사람이 없다. */
 roundMid:"${TEXT}",
 onlineIn:`],
  [DATA, '콘솔 전용 목록', "var NARR_CONSOLE_ONLY=['photoSplit','roundOpen',",
   "var NARR_CONSOLE_ONLY=['photoSplit','roundOpen','roundMid',"],
  [CUE, 'FILES 끝에 등록', "'narr-photo-ask', 'narr-photo-send'",
   "'narr-photo-ask', 'narr-photo-send',\n    /* [ROUND_MID 2026-09-12] 인사 사진 가운데 안내 — ★맨 끝에 붙인다(중간에 끼우면 앞 번호가 전부 밀린다) */\n    'narr-round-mid'"],
];

let bad = 0;
const cache = new Map();
const read = (f) => (cache.has(f) ? cache.get(f) : (cache.set(f, fs.readFileSync(f, 'utf8')), cache.get(f)));
for (const [f, why, from] of E) {
  const n = read(f).split(from).length - 1;
  console.log(`  ${n === 1 ? '·' : '✗'} ${why.padEnd(16)} ${path.basename(f)} ${n}곳`);
  if (n !== 1) bad++;
}
if (read(DATA).includes('roundMid:')) { console.log('  ✗ 이미 들어 있다'); bad++; }
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log(`\n새 문안:\n  ${TEXT}\n\n(안 씀 · --write 로 실제 반영)`); process.exit(0); }
for (const [f, , from, to] of E) cache.set(f, read(f).split(from).join(to));
for (const [f, s] of cache) fs.writeFileSync(f, s);
console.log('\n반영함 · narr-round-mid 추가 (FILES 맨 끝 · 콘솔 전용)');
