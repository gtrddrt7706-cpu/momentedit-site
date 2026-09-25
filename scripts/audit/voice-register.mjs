/* [VOICE_REGISTER] 한 성우의 «말투 층»이 클립마다 흔들리지 않는가 (2026-09-23)
 *
 * ★왜 — `check-speech-level.mjs` 는 **낭독 배역**(편지·덕담)만 본다. 한 클립 «안»의
 *   평대↔존대 왕복을 잡는 자다. 그런데 이번에 난 사고는 그 자가 안 보는 자리였다:
 *   진희(안내)가 **클립마다** 합쇼체와 해요체를 오갔다.
 *
 * ★실측(2026-09-23 · 코워크 10차 반영 직후)
 *     진희 12클립 — 합쇼체 8 · **섞임 4**(03a · 04a · 45 · 50)
 *   03a 는 「오 분 전이에요 / 자리를 잡아 주세요」였고 01a·02a 는 합쇼체였다.
 *   같은 목소리가 이십 분 안에서 층을 오간다 — 하객이 «이 예식의 격»을 가늠하는 바로 그 목소리다.
 *
 * ★사장님 결정이 이미 있었다 — 「진희는 A안 «격 있고 따뜻하게»(호텔 웨딩 사회자 느낌 · 합쇼체)」.
 *   결정이 있는데도 흔들린 이유는 그 결정을 **지키는 검사가 없었기** 때문이다([DECISION_GUARD]).
 *
 * ★무엇을 재고 무엇을 안 재나
 *   · 재는 것 — «한 성우 안에서 층이 섞이는가». 섞인 클립 수를 센다.
 *   · 안 재는 것 — «어느 층이 옳은가». 그건 사람이 정한다. 아래 표가 그 결정을 적는 자리다.
 *   · 견본 목소리(신랑·신부·부모님)는 **안 본다** — 그분들 말은 그날 그분들이 쓴다.
 *     실제로 어머님 덕담은 하객에게 존대하다 끝에 아이에게 평대로 가는 것이 설계다.
 *
 *   node scripts/audit/voice-register.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

/* ★어느 목소리를 «한 층으로» 지킬지 — 사람이 정한 결정을 여기 적는다.
   ★★[NOT_WOOSUNG] 처음에 우성(진행)도 넣었다가 **뺐다.** 재 보니 28클립이 걸렸는데,
     그건 흔들림이 아니라 **진행자의 정상 말투**였다 — 알릴 때는 「~합니다」,
     부탁할 때는 「~해 주세요」. 한국어 사회자가 원래 그렇게 말한다.
     ★진희는 다르다 — 부탁도 합쇼체로 한다(「자리에 앉아 주시면 됩니다」). 재 보고 알았다.
   ★틀린 규칙을 검사로 박으면 사람이 옳게 써도 검사가 되돌린다([TIME_STAIR]).
     그래서 «사장님이 층을 정한 목소리»만 본다. 우성의 층을 정하시면 그때 한 줄 더한다.
   ★견본(신랑·신부·부모님)은 애초에 안 본다 — 그날 그분들이 쓰는 말이다. */
const ONE_LEVEL = { 진희: '합쇼체' };

const HAP = /(습니다|입니다|십시오|ㅂ니다)[.!?]?$/;
const HAE = /(어요|아요|에요|예요|해요|세요|려요|워요|죠)[.!?]?$/;

const byVoice = new Map();
for (const c of man.clips) {
  const v = c.voice || (man.voice || {})[c.role];
  if (!v || !ONE_LEVEL[v]) continue;
  if (!c.sents || !c.sents.length) continue;
  let hap = 0, hae = 0;
  for (const s of c.sents) {
    const t = (s.text || '').trim();
    if (HAP.test(t)) hap++; else if (HAE.test(t)) hae++;
  }
  if (!byVoice.has(v)) byVoice.set(v, []);
  byVoice.get(v).push({ id: c.no + '_' + c.file, hap, hae });
}

let bad = 0;
console.log('[VOICE_REGISTER] 사회자 목소리의 말투 층이 한 겹인가\n');
for (const [v, rows] of byVoice) {
  const want = ONE_LEVEL[v];
  const mixed = rows.filter((r) => r.hap && r.hae);
  const wrong = rows.filter((r) => !r.hap && r.hae && want === '합쇼체');
  console.log(`  ${v} — 클립 ${rows.length} · 섞인 클립 ${mixed.length} · 통째로 다른 층 ${wrong.length}  (정한 층: ${want})`);
  for (const r of [...mixed, ...wrong]) console.log(`     ✗ ${r.id}  합쇼 ${r.hap} · 해요 ${r.hae}`);
  bad += mixed.length + wrong.length;
}
if (bad) {
  console.log(`\n✗ 층이 흔들리는 클립 ${bad}개 — 같은 목소리가 한 예식 안에서 격을 오갑니다.`);
  console.log('   고치거나, 층을 바꾸기로 정했으면 이 파일의 ONE_LEVEL 을 같은 커밋에서 고치세요.');
  process.exit(1);
}
console.log('\nok 사회자 목소리의 말투 층이 한 겹입니다.');
