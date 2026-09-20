/* [CUE_ORDER_TEXT] 「식장에서 실제로 나가는 차례 + 지금 저장소 문면」 한 장 (2026-09-20)
 *
 * ★★왜 — 코워크가 «순서»를 손으로 지어내고 있었다
 *   그쪽에는 역할별로 묶인 파일뿐이라 식순을 받은 적이 없다. 그래서 그 위에 세운 판정
 *   (26 자기부정 · 04a 재배열 · 58/76 겹침 · 38 순서 · 65/63 「한 장」 두 번)이 전부 흔들린다.
 *   실제로 둘은 **사실과 반대**였다 — 63→65 순서와 22번 위치.
 *
 * ★순서는 «대장»이 아니라 **큐 엔진이 부르는 차례**로 뽑는다. 대장과 화면을 맞대면 늘 맞는데,
 *   둘 다 같은 생성기에서 나오기 때문이다(이 저장소가 세 번 앓은 병 · [ENGINE_CALLS] 참고).
 *
 * ★설정마다 차례가 다르다 — 갈래를 여럿 돌려 «이 클립이 몇 번째로 나오나»를 함께 적는다.
 *   한 설정만 뽑아 보내면 그것이 또 «유일한 순서»로 굳는다.
 *
 *   node scripts/audit/cue-order-text.mjs > 92클립_지금문면_큐순서.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

/* ★★배역 클립은 큐의 `file` 로 안 붙는다 — 나레이션을 «대신하는» 자리라 castMainOf 로 붙는다.
 *   그래서 차례만으로 세면 절반이 「안 불림」이 된다. 「엔진이 부르는가」는 [ENGINE_CALLS] 에 묻는다 —
 *   저장소에 그 계산을 한 군데만 두기로 한 규칙이다. */
const { want: ENGINE, retired: RETIRED } = (await import('../lib/engine-calls.mjs')).engineCalls();

/* ★대표 설정 넷은 «읽기 쉬운 차례»를 주고, 그 뒤 전 축을 돌려 «안 빠지게» 한다.
 *   ★처음엔 넷만 돌렸더니 109 중 35개만 불렸다 — 엔진이 실제로 부르는 것은 87이다.
 *     넷만 보내면 나머지 52가 「안 나오는 자리」로 읽혀, 지어낸 순서보다 더 나쁜 오해가 된다. */
const D_ = require_(path.join(ROOT, 'assets/ritual-data.js'));
const SETS = [
  ['기본',        { course: 'damback' }],
  ['가족코스+덕담', { course: 'family', bless: 'on' }],
  ['편지 두 곳',   { course: 'damback', letter: 'both' }],
  ['축배+케이크',  { course: 'damback', toast: 'both' }],
];
/* 한 축씩 흔들어 «어디쯤 나오나»를 채운다(두 축 곱은 engine-calls 가 맡는다 — 여긴 순서 표시용) */
const AX = {
  course: Object.keys(D_.COURSES), entry: ['A','B','C','D','E','F'],
  entryVoice: ['nar','couple'], guestVoice: ['nar','couple'],
  declareWho: Object.keys(D_.DECLWHO), declare: ['1','2'],
  letter: Object.keys(D_.LETTER), valley: ['none','wine','cake','both'],
  ringwarm: ['family','all'], tribute: Object.keys(D_.TRIBUTE.modes),
  toast: Object.keys(D_.TOAST), bless: ['on','off'], blessProxy: [false,true],
  ring: ['on','off'], song: ['family','live','off'], digital: [false,true],
  photoShare: [false,true],
};
for (const k of Object.keys(AX)) for (const v of AX[k])
  SETS.push(['·' + k + '=' + v, { course: 'damback', [k]: v }]);

const order = new Map();            // id → { first, sets:Map<setName, idx> }
for (const [name, S] of SETS) {
  let b; try { b = Cue.build(S); } catch (e) { continue; }
  b.cues.forEach((c, i) => {
    const id = String(c.file || ''); if (!id) return;
    if (!order.has(id)) order.set(id, { first: Infinity, sets: new Map() });
    const o = order.get(id);
    o.sets.set(name, i + 1);
    o.first = Math.min(o.first, i + 1);
  });
}

const text = new Map();             // "no_slug" → [문장]
const meta = new Map();
for (const c of man.clips) {
  const id = c.no + '_' + c.file;
  text.set(id, c.sents.map(s => s.text));
  meta.set(id, { role: c.role, layer: String(c.dir).split('/').pop(), label: c.label || '' });
}

const out = [];
out.push('# 92클립 · 지금 저장소 문면 + 큐 순서  (자동 생성 · ' + new Date().toISOString().slice(0, 10) + ')');
out.push('#');
out.push('# ★손으로 적지 않는다 — node scripts/audit/cue-order-text.mjs > 이 파일');
out.push('# ★순서는 큐 엔진이 실제로 부르는 차례다(대장이 아니다).');
out.push('# ★설정마다 차례가 다르다. 「차례」 칸은 설정별 자리를 함께 적는다 — 한 줄만 보고 «유일한 순서»로 굳히지 말 것.');
out.push('#   돌린 설정: ' + SETS.map(s => s[0]).join(' · '));
out.push('#');
out.push('# 차례\t식장에서\t번호_슬러그\t층\t역할\t문장번호\t지금 문면');

const ids = [...text.keys()].sort((a, b) => {
  const oa = order.get(a), ob = order.get(b);
  const fa = oa ? oa.first : 9999, fb = ob ? ob.first : 9999;
  return fa - fb || a.localeCompare(b);
});
let called = 0, uncalled = 0;
for (const id of ids) {
  const o = order.get(id), m = meta.get(id);
  let pos;
  if (o) {
    called++;
    const named = [...o.sets].filter(([n]) => !n.startsWith('·')).map(([n, i]) => n + ':' + i);
    const others = [...new Set([...o.sets].filter(([n]) => n.startsWith('·')).map(([, i]) => i))]
      .sort((a, b) => a - b);
    pos = named.length ? named.join(' ') : '다른 설정에서만';
    if (others.length) pos += ' | 다른 설정: ' + others.join(',') + '번째';
  }
  else { uncalled++; pos = '(이 설정들에선 안 불림)'; }
  const live = ENGINE.has(id) ? '난다' : (RETIRED.includes(id) ? '폐지' : '안 남');
  text.get(id).forEach((t, i) => out.push([pos, live, id, m.layer, m.role, '#' + i, t].join('\t')));
}
out.push('#');
const liveN = ids.filter(i => ENGINE.has(i)).length;
out.push('# 클립 ' + ids.length + ' — 차례가 잡힌 것 ' + called + ' · 못 잡은 것 ' + uncalled);
out.push('# 「식장에서」 칸이 진짜 답이다 — 난다 ' + liveN + ' · 폐지 ' + RETIRED.length);
out.push('# ※ 차례를 못 잡았어도 「난다」면 식장에서 나는 소리다(배역 클립은 나레이션을 대신해 붙어');
out.push('#   큐의 파일 이름으로는 안 잡힌다). 「안 남」일 때만 안 나간다.');
process.stdout.write(out.join('\n') + '\n');
process.stderr.write('[CUE_ORDER_TEXT] 클립 ' + ids.length + ' · 줄 ' + out.length + '\n');
