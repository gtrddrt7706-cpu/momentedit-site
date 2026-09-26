/* [EVENT_SCRIPT] 녹음 대본을 «이벤트별»로 묶어 본다 (2026-09-21 사장님 지시)
 *
 * > 사장님: 「정리를 성우별로 하지 말고 이벤트별로 나눠보자」
 *
 * ★왜 — 성우별은 «녹음»에 맞는 자이고, 이벤트별은 «판단»에 맞는 자다.
 *   성우별로 보면 한 이벤트의 흐름이 일곱 파일에 흩어져 아무도 그 흐름을 못 본다.
 *   진희(안내) 문제가 그렇게 숨었다 — 시각 안내 셋(10분·5분·1분)이 «계단»이어야 하는데
 *   평평해진 것을, 그 셋을 나란히 놓고서야 봤다.
 *
 * ★묶는 자 — 큐 엔진의 `blockN`. 저장소가 이미 갖고 있는 구분이라 손으로 안 짓는다.
 *   ★그리고 그 블록이 **누구 목소리로 나가는지**를 줄마다 단다. 목소리가 바뀌는 자리가
 *     이벤트 안에서 보여야 한다([VOICE_RUNS] 가 세는 것을 사람도 읽게).
 *
 * ★설정마다 나오는 블록이 다르다 — 여럿 돌려 합친다. 한 설정만 보면 덕담·헌정이 통째로 빠진다.
 *
 *   node scripts/audit/event-script.mjs > 이벤트별_대본.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const { want: ENGINE } = (await import('../lib/engine-calls.mjs')).engineCalls();
const Story = require_(path.join(ROOT, 'assets/ritual-story.js'));

const VOICE = man.voice || {};   // ★[VOICE_GROOM_3 2026-09-26] 손으로 적은 표(편지 김호인 · 신랑 이겸 — 낡음) 대신 대장 성우표 한 곳에서
const SENTS = new Map(), META = new Map();
for (const c of man.clips) {
  const id = c.no + '_' + c.file;
  SENTS.set(id, c.sents.map((s) => s.text));
  META.set(id, { role: c.role, label: c.label || '' });
}

/* 설정을 여럿 돌려 «블록 → 클립 차례»를 모은다 */
/* ★갈래 축을 «전부» 흔든다 — 안 흔들면 입장 A 만 나오고 B~F 가 통째로 빠진다.
   ★한 예식에는 그중 하나만 나가지만, 대본을 볼 때는 **고를 수 있는 것이 다 보여야** 한다. */
const D_ = require_(path.join(ROOT, 'assets/ritual-data.js'));
const SETS = [{ course: 'damback' }, { course: 'family', bless: 'on' }, { course: 'record' },
              { course: 'festive' }, { course: 'gamdong' }, { course: 'minimal' },
              { digital: true }, { photoShare: true }, { meal: true }, { free: 'on' }, { ring: 'off' },
              { song: 'live' }, { ringwarm: 'all' }, { blessProxy: true }];
const AX = { entry: ['A','B','C','D','E','F'], entryVoice: ['nar','couple'], guestVoice: ['nar','couple'],
             declare: ['1','2'], declareWho: Object.keys(D_.DECLWHO), letter: Object.keys(D_.LETTER),
             tribute: Object.keys((D_.TRIBUTE || {}).modes || {}), toast: Object.keys(D_.TOAST),
             valley: ['none','wine','cake','both'], bless: ['on','off'] };
for (const k of Object.keys(AX)) for (const v of AX[k]) SETS.push({ course: 'damback', [k]: v });
const order = [], byBlock = new Map();
for (const S of SETS) {
  let b; try { b = Cue.build(S); } catch { continue; }
  b.cues.forEach((c) => {
    if (!c.blockN) return;
    if (!byBlock.has(c.blockN)) { byBlock.set(c.blockN, []); order.push(c.blockN); }
    const arr = byBlock.get(c.blockN);
    const put = (id) => { const k = String(id || ''); if (k && !arr.includes(k)) arr.push(k); };
    put(c.file);
    /* ★★배역은 큐의 file 로 안 붙는다 — 나레이션을 «대신하거나»(castMain)
       사람 구간 안에서 «흐른다»(castLive). 처음엔 이걸 빼먹어 109 중 47 만 잡혔다.
       신랑·신부·부모님이 통째로 빠졌는데, 이벤트별로 볼 때 제일 보고 싶은 자리가 거기다. */
    for (const x of Story.castMainOf(c)) put(x.id);
    for (const x of Story.castLiveOf(c)) put(x.id);
  });
}

const out = [];
out.push('# 이벤트별 대본 — 식순 차례대로  (자동 생성 · 2026-09-21)');
out.push('#');
out.push('# ★손으로 적지 않는다 — node scripts/audit/event-script.mjs > 이 파일');
out.push('# ★묶는 자는 큐 엔진의 블록 이름이다(저장소가 이미 갖고 있는 구분).');
out.push('# ★설정 열 가지를 돌려 합쳤다 — 한 설정만 보면 덕담·헌정·온라인이 통째로 빠진다.');
out.push('# ★갈래가 여럿인 자리(입장 A~F 등)는 **전부** 싣는다. 한 예식에는 그중 하나만 나간다.');
out.push('');

let nClip = 0, nSent = 0;
for (const blk of order) {
  const ids = byBlock.get(blk);
  const rows = [];
  for (const id of ids) {
    const ss = SENTS.get(id); if (!ss) continue;
    const m = META.get(id);
    rows.push({ id, v: VOICE[m.role] || m.role, label: m.label, ss, live: ENGINE.has(id) });
  }
  if (!rows.length) continue;
  const sn = rows.reduce((s, r) => s + r.ss.length, 0);
  nClip += rows.length; nSent += sn;
  const voices = [...new Set(rows.map((r) => r.v))];
  out.push('━'.repeat(72));
  out.push(`■ ${blk}   — 클립 ${rows.length} · 문장 ${sn} · 목소리 ${voices.join(', ')}`);
  out.push('━'.repeat(72));
  for (const r of rows) {
    out.push(`  [${r.id}]  ${r.v}${r.label ? ' · ' + r.label : ''}${r.live ? '' : '   ※ 이 설정들에선 안 남'}`);
    r.ss.forEach((t) => out.push(`      ${t}`));
    out.push('');
  }
}
out.push('━'.repeat(72));
out.push(`# 블록 ${order.length} · 클립 ${nClip} · 문장 ${nSent}`);
out.push('# ※ 한 클립이 여러 블록에 나오지 않는다 — 처음 불린 블록에만 싣는다.');
process.stdout.write(out.join('\n') + '\n');
process.stderr.write(`[EVENT_SCRIPT] 블록 ${order.length} · 클립 ${nClip} · 문장 ${nSent}\n`);
