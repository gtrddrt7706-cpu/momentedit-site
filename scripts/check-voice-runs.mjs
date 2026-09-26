/* [VOICE_RUNS] 한 목소리가 «한 클립만» 끼어드는 자리를 찾는다 (2026-09-20)
 *
 * ★왜 — 코워크가 눈으로 찾았고, 기계가 셀 수 있는데 아무도 안 세고 있었다
 *   44(단체촬영 개시)가 안내 목소리로 한 문장 나왔다가 **여섯 클립 뒤에** 돌아왔다.
 *     18 26 진행 · 19 **44 안내** · 20~24 진행 다섯 · 25 45 안내
 *   그룹 설계의 충돌이었다 — 44 는 「폐식 후 브릿지(N*)」라 안내인데
 *   이웃 60~65 는 「예식 뒤 30분(G13)」이라 진행이다. 둘 다 «예식 뒤»인데 역할이 갈린다.
 *
 * ★소리로 이어 들으면 바로 튀는데, 글로만 보면 안 보인다. 저장소의 어떤 검사도
 *   «큐 차례»와 «역할»을 함께 보지 않았다. 순서표([CUE_ORDER_TEXT])가 생겨서 이제 된다.
 *
 * ★무엇을 빨강으로 보나 — «길이 1짜리 덩어리». 두 클립 이상이면 전환으로 들린다.
 *   ★단 **맨 앞과 맨 뒤**는 봐준다. 거기서 한 클립짜리는 여는 말·닫는 말일 수 있다.
 *
 *   node scripts/check-voice-runs.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
const man = require_(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'));
const D = require_(path.join(ROOT, 'assets/ritual-data.js'));

const ROLE = new Map(man.clips.map((c) => [c.no + '_' + c.file, c.role]));
const SETS = [['기본', { course: 'damback' }], ['가족+덕담', { course: 'family', bless: 'on' }],
              ['기록', { course: 'record' }], ['축하', { course: 'festive' }]];

let bad = 0, seen = 0;
for (const [name, S] of SETS) {
  let b; try { b = Cue.build(S); } catch { continue; }
  const seq = b.cues.map((c) => String(c.file || '')).filter(Boolean)
                    .map((f) => ({ f, r: ROLE.get(f) || '?' }));
  const runs = [];
  for (const x of seq) {
    if (runs.length && runs[runs.length - 1].r === x.r) { runs[runs.length - 1].n++; runs[runs.length - 1].fs.push(x.f); }
    else runs.push({ r: x.r, n: 1, at: seq.indexOf(x) + 1, fs: [x.f] });
  }
  seen++;
  runs.forEach((x, i) => {
    if (x.n !== 1) return;
    if (i === 0 || i === runs.length - 1) return;   // 맨 앞·맨 뒤는 봐준다
    /* ★[THANKS_VOICE_WAIVED 2026-09-26 PHOTO_THANKS] 감사 인사(45 · 110)는 코워크 명세가 진희(예식 밖 안내 목소리)로 정했고 사장님이 그 목소리로 녹음했다.
       자리는 전체 사진(사람 구간 6분 남짓) 바로 뒤 · 뒤에도 목례와 가실 분이 일어나는 사람 구간이 있어 앞뒤 진행 목소리와 «이어» 들리지 않는다.
       ★이 두 클립만 봐준다 — 다른 자리가 혼자 끼어들면 종전대로 빨강. 목소리를 진행(우성)으로 바꿀지는 코워크 제안으로 올렸다. */
    if (x.fs.length === 1 && /^(45_end-1a-farewell|110_end-1c-thanks-nomeal)$/.test(x.fs[0])) { console.log(`ok ${name} — ${x.fs[0]} (${x.r}) 혼자지만 봐준다 [THANKS_VOICE_WAIVED]`); return; }
    bad++;
    console.log(`✗ ${name} — ${x.at}번째 ${x.fs[0]} (${x.r}) 가 혼자 끼어든다`);
    console.log(`    앞 ${runs[i-1].r} ${runs[i-1].n}개 · 뒤 ${runs[i+1].r} ${runs[i+1].n}개`);
  });
}
if (!seen) { console.log('✗ 큐를 한 설정도 못 세웠다'); process.exit(1); }
if (bad) { console.log(`\n✗ 혼자 끼어드는 목소리 ${bad}건 — 소리로 이어 들으면 튄다`); process.exit(1); }
console.log(`VOICE RUNS OK (설정 ${seen}개 · 혼자 끼어드는 목소리 0)`);
