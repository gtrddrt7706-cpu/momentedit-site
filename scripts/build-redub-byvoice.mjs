// 「다시 받아야 할 것」을 성우별 파일로 만든다 [REDUB_BYVOICE]
//
//   node scripts/build-redub-byvoice.mjs           무엇이 몇 줄인지만 본다
//   node scripts/build-redub-byvoice.mjs --write   타입캐스트/다시받기/ 에 쓴다
//
// ★왜 — 2026-09-11 사장님: *"빼먹은게 없을때까지 반복해서 검토"*
//   5라운드에서 나왔다. 저장소의 재더빙 명단(재더빙_붙여넣기.txt)은 22줄인데
//   실제로 다시 받아야 할 것은 103줄이다. 배역 13클립이 그 명단에 «구조적으로» 안 잡힌다 —
//   그 명단은 check-text-audio(화면 글 ↔ 소리)가 만드는데, 편지·덕담·서약은 castLive 라
//   화면 글과 짝이 아니어서 그 대조에서 빠지기 때문이다(그 판단 자체는 옳다).
//   ★그대로 두면 다음 세션이 그 파일을 믿고 열세 클립을 통째로 빠뜨린다. 실제로 오늘 그럴 뻔했다.
//
// ★여기서는 «소리»를 기준으로 센다 — manifest(녹음하기로 한 글) ↔ _recorded.json(실제로 녹음된 글).
//   화면을 끼우지 않으므로 castLive 여부와 무관하다(scripts/audit/cast-text-audio.mjs 와 같은 자).
//
// ★성우로 자른다 — 파일 하나 = 화자 하나 = 타입캐스트에서 클릭 한 번.
// ★대장 차례 그대로 낸다 — 번호순이 아니다. 조립기가 그 차례로 자리를 매긴다.
// ★폐지·합성 클립은 빼고, «이미 맞는 소리가 있는» 클립도 뺀다.
//   실제로 김호인 38줄·서진 11줄이 그렇게 빠졌다 — 안 뺐으면 49줄을 헛되이 다시 받으실 뻔했다.
//
// ★종료 코드 0 정상 · 2 원천을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const T = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const OUT = path.join(T, '다시받기');
const NAR = 'assets/audio/narration';
const pad2 = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

let man, cue, imp;
try {
  man = JSON.parse(fs.readFileSync(path.join(T, 'manifest.json'), 'utf8'));
  cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
  imp = fs.readFileSync(path.join(ROOT, 'scripts/build-typecast-import.mjs'), 'utf8');
} catch (e) { console.log('✗ 원천을 못 읽었다: ' + e.message); process.exit(2); }

const rb = /RETIRED\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(cue);
const RETIRED = new Set(rb ? [...rb[1].matchAll(/'([^']+)'\s*:\s*1/g)].map((m) => m[1]) : []);
const vb = /const DEFAULT_VOICE = \{([\s\S]*?)\n\};/.exec(imp);
const VOICE = Object.fromEntries([...(vb ? vb[1] : '').matchAll(/^\s*([가-힣|]+):\s*'([^']+)'/gm)].map((m) => [m[1], m[2]]));

const rec = {};
const recVoice = {};     // [VOICE_CHANGED] 그 클립을 «누가» 읽었나 (옛 기록엔 없다)
let unknownVoice = 0;
for (const d of ['assets/audio/cast', NAR]) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, d, '_recorded.json'), 'utf8'));
    for (const [k, v] of Object.entries(j.clips || {})) {
      rec[d + '|' + k] = typeof v === 'string' ? v : v.text;
      if (typeof v !== 'string' && v.voice) recVoice[d + '|' + k] = v.voice;   // [VOICE_CHANGED]
    }
  } catch { /* 없으면 «아직 안 받음» */ }
}

const byVoice = new Map();
const pending = {};
let clips = 0;
for (const c of man.clips) {                       // ★대장 차례 그대로 — 정렬하지 않는다
  if (c.mix || RETIRED.has(c.file)) continue;
  const key = pad2(c.no) + '_' + c.file;
  const said = rec[(c.dir || NAR) + '|' + key];
  /* ★★[VOICE_CHANGED 2026-09-13] 글이 같아도 «읽은 사람»이 바뀌었으면 다시 받아야 한다.
     [VOICE_LETTER_NARR] 로 편지를 김호인 → 우성으로 바꾸다 드러났다. 그 클립은 마침 글도
     바뀌어 있어 살았지만, 글이 그대로인 49클립이었으면 파일 어디에도 안 나오고 옛 소리로 나갔다.
     ★성우는 «녹음한 그 자리»에 박는다 — assemble-narration 이 _recorded.json 에 voice 를 남긴다.
       배정 스냅샷을 따로 두는 안은 버렸다. 뽑을 때마다 덮어써서 두 번 돌리면 잊는다(직접 겪었다).
     ★voice 가 없는 옛 기록(문자열만)은 «모른다»로 둔다 — 모르는 것을 «바뀌었다»로도
       «그대로다»로도 단정하지 않는다. 아래에서 그 수를 세어 알린다([CANT_LOOK]). */
  const recV = recVoice[(c.dir || NAR) + '|' + key];
  const nowV = VOICE[String(c.role).split('|')[0]];
  if (recV === undefined) unknownVoice++;
  const voiceMoved = recV !== undefined && nowV !== undefined && recV !== nowV;
  if (said !== undefined && norm(said) === norm(c.sents.map((s) => s.text).join(' ')) && !voiceMoved) continue;
  clips++;
  for (const s of c.sents) {
    const v = VOICE[s.role || c.role];
    /* ★★[VOICE_PENDING 2026-09-12] 성우가 아직 없는 역할에서 «죽지 않는다» — 건너뛰고 끝에 알린다.
       실제로 당했다. [27] 시어머님을 새로 만든 순간 이 줄이 process.exit(2) 로 멈추면서
       «이미 성우가 정해진 다른 17클립까지» 파일이 안 나왔다. 사장님은 성우를 고르기 전에도
       나머지를 녹음하실 수 있어야 한다. 한 자리가 비었다고 전체를 볼모로 잡지 않는다.
       ★대신 조용히 넘어가지도 않는다 — 마지막에 «성우 미정» 목록으로 찍고, 그 줄은 어떤
         성우 파일에도 안 들어간다. 성우가 정해지면 그날 다시 돌리면 된다. */
    if (!v) { (pending[s.role || c.role] ||= []).push(`${key} ${s.i}`); continue; }
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v).push({ clip: key, i: s.i, text: s.text });
  }
}
const rows = [...byVoice.entries()].sort((a, b) => b[1].length - a[1].length);
if (unknownVoice) console.log(`★옛 기록 ${unknownVoice}클립은 «누가 읽었는지»가 안 적혀 있습니다 — 성우를 바꿔도 여기서는 못 잡습니다.\n   다시 받는 순간 assemble-narration 이 성우를 박아 두므로, 그 뒤로는 잡힙니다.`);
console.log(`다시 받아야 할 클립 ${clips}개 · 문장 ${rows.reduce((a, [, l]) => a + l.length, 0)}개`);
if (Object.keys(pending).length) {
  console.log('★성우 미정 — 아래 줄은 어떤 파일에도 안 들어갔다. 성우를 고른 뒤 다시 돌리세요:');
  for (const [role, xs] of Object.entries(pending)) console.log(`   ${role}  ${xs.length}줄  (${xs.join(' · ')})`);
}
for (const [v, l] of rows) console.log(`  ${v.padEnd(6)} ${String(l.length).padStart(4)}줄  ${new Set(l.map((x) => x.clip)).size}클립`);
if (!clips) console.log('REDUB NONE — 다시 받을 것이 없다');
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const order = {};
rows.forEach(([v, l], n) => {
  fs.writeFileSync(path.join(OUT, `${n + 1}_${v}.txt`), l.map((x) => x.text).join('\n') + '\n');
  order[v] = l.map((x, k) => ({ n: k + 1, clip: x.clip, i: x.i, text: x.text }));
});
fs.writeFileSync(path.join(OUT, '_순서.json'), JSON.stringify(order, null, 1));

/* ★★[NAME_PREFIX 2026-09-11 사장님 "대본 자동으로 성우이름까지 적용될수있게해서 파일만들어"]
   한 파일에 전부 담되 줄마다 «화자: 대사» 로 적는다. 타입캐스트가 그 이름으로 화자를 배정하므로
   성우를 일곱 번 고를 일이 없어진다.
   ★대장 차례 그대로다 — 성우별로 묶지 않는다. 묶으면 조립기가 자리를 못 찾는다.
   ★★[PASTE_WRONG_FILE] 성우별 낱개 파일에는 이름을 «붙이지 않는다».
     그 파일은 화자를 이미 고른 뒤 붙여넣는 것이라, 이름이 붙어 있으면 그대로 읽힌다.
     실제로 예전에 주석이 달린 파일을 붙여넣어 머리말이 소리로 나온 적이 있다. 두 꼴을 섞지 말 것. */
/* ★★[DUP_ONCE 2026-09-13 사장님 「중복되는 문구가 왜많지? 녹음은 하나만 하고 그녹음본을 입히면되잖아」]
   같은 성우가 «글자까지 같은 말»을 여러 클립에서 한다. 한 번만 받아 나머지 자리에 그 소리를 넣는다.

   ★그런데 «전부» 합치면 안 된다. 가르는 자는 하나다 — «같은 예식에서 둘 다 나가는가».
     · 안 나간다(갈래가 다르다) → 하객은 한 날에 하나만 듣는다. 같은 소리를 써도 아무도 모른다.
     · 둘 다 나간다            → 같은 사람이 몇 분 사이에 똑같은 소리를 두 번 낸다. 티가 난다.
   실측(324조합 전수 · 2026-09-13): 합쳐도 되는 줄 32 · 따로 받아야 하는 줄 1.
     ★그 하나가 신랑 「하윤아.」 다 — 08_vow-groom(서약)과 11_letter-each(편지)가 한 날에 둘 다 나간다.
       서약을 열고 몇 분 뒤 편지를 여는 말이라, 같은 소리면 편지가 서약의 되풀이로 들린다.
   ★첫 판은 q.file 만 보아 이것을 «안 겹친다»고 답했다. 배역 클립은 castIds(q).live 에 있다.
     나레이션만 세면 서약·편지·덕담이 통째로 안 보인다 — 반드시 둘 다 봐야 한다.

   ★조립기는 손대지 않는다. 받은 소리를 되돌릴 때 _전체_순서.json 의 `also` 자리에 같은 파일을
     복사해 넣어 «문장 하나에 파일 하나»를 그대로 유지한다. 가장 위험한 단계(조립)에 새 길을 내지 않는다. */
const together = new Set();
try {
  const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
  const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
  for (const course of ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'])
    for (const letter of ['parent', 'each', 'both'])
      for (const bless of ['on', 'off'])
        for (const tribute of ['flower', 'bow', 'hug'])
          for (const toast of ['toast', 'cake', 'both']) {
            let cues; try { cues = RC.build({ course, letter, bless, tribute, toast }, { mode: 'console' }).cues; } catch { continue; }
            const live = new Set();
            for (const q of cues) {
              if (q.file) live.add(q.file);
              for (const id of (ST.castIds(q).live || [])) if (id) live.add(String(id).replace(/^\d+_/, ''));
            }
            const f = [...live];
            for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
              together.add([f[i], f[j]].sort().join('||'));
          }
} catch (e) {
  console.log('★큐 엔진을 못 읽어 중복 합치기를 끕니다(전부 따로 받습니다):', e.message);
}
const coOccur = (a, b) => together.has([a.replace(/^\d+_/, ''), b.replace(/^\d+_/, '')].sort().join('||'));

const flat = [];
const flatOrder = [];        // [FLAT_ORDER] 줄번호 → 성우·클립·문장 자리 (+ also: 같은 소리를 넣을 다른 자리)
const seen = new Map();      // 성우|대사 → flatOrder 의 그 줄
for (const c of man.clips) {
  if (c.mix || RETIRED.has(c.file)) continue;
  const key = pad2(c.no) + '_' + c.file;
  const said = rec[(c.dir || NAR) + '|' + key];
  if (said !== undefined && norm(said) === norm(c.sents.map((s) => s.text).join(' '))) continue;
  /* ★[VOICE_PENDING] 성우 미정인 줄은 «여기서도» 뺀다 — 한 번 샜다.
     개별 파일에서만 거르고 이 전체 파일은 안 걸러서 「undefined: 대사」 네 줄이 들어갔다.
     그대로 타입캐스트에 붙이면 «undefined» 라는 화자가 생긴다. 한 곳만 막으면 다른 곳으로 샌다. */
  for (const s of c.sents) { const v = VOICE[s.role || c.role]; if (!v) continue;
    const dk = v + '|' + s.text;
    const prev = seen.get(dk);
    if (prev && !prev.at.some((x) => coOccur(x.clip, key))) {     // [DUP_ONCE] 한 날에 같이 안 나간다 → 합친다
      prev.at.push({ clip: key, i: s.i });
      continue;
    }
    flat.push(`${v}: ${s.text}`);
    const row = { n: flat.length, voice: v, text: s.text, at: [{ clip: key, i: s.i }] };
    flatOrder.push(row);
    if (!prev) seen.set(dk, row);                                 // 나뉜 줄은 첫 줄에만 붙인다
  }
}
const merged = flatOrder.reduce((a, r) => a + r.at.length - 1, 0);
fs.writeFileSync(path.join(OUT, '0_전체_화자표기.txt'), flat.join('\n') + '\n');
/* ★★[FLAT_ORDER 2026-09-13 사장님 「파일하나로만들어 … 별로의 수정없이」]
   낱개 파일에는 되돌리는 표(_순서.json)가 있는데 «한 파일» 판에는 없었다.
   한 파일로 받으면 돌아오는 wav 는 1..N 한 줄기다 — 그 번호가 어느 클립 몇 번째 문장인지
   적어 두지 않으면 되돌릴 열쇠가 «파일명에 박힌 문장» 하나뿐이 된다.
   그 이름은 잘린다(DUB_STAGE 가 앞자락만 대조하는 이유다). 잘린 이름이 겹치는 날 조용히 밀린다.
   ★그래서 같은 실행에서 번호 → 자리를 적어 둔다. 사람이 나중에 셀 수 있는 것이 아니다. */
fs.writeFileSync(path.join(OUT, '_전체_순서.json'), JSON.stringify(flatOrder, null, 1));
console.log(`  ${'전체'.padEnd(6)} ${String(flat.length).padStart(4)}줄  ← 0_전체_화자표기.txt (화자: 대사 · 한 번에 · 겹쳐서 뺀 ${merged}줄)`);
fs.writeFileSync(path.join(OUT, 'README.md'),
  ['# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)', '',
   '`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.', '',
   '★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이',
   '  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.', '',
   '파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.', '',
   '| 파일 | 성우 | 줄 | 클립 |', '|---|---|---|---|',
   ...rows.map(([v, l], n) => `| ${n + 1}_${v}.txt | ${v} | ${l.length} | ${new Set(l.map((x) => x.clip)).size} |`),
   '',
   /* ★★[BACK_CMD 2026-09-13 사장님 「그부분만 녹음다시하고 차후 그부분만 대입해서 원활하게」]
      되돌리는 «명령»까지 여기서 짓는다 — 사람이 손으로 지으면 그 자리에서 틀린다.
      ★=번호_이름 으로 찍는다([KEY_NN]). 이름만·id 만으로는 혼자 못 고른다:
        entry-C 는 07(배역)·20(나레이션) 둘, letter-each 는 11·28 둘이다.
        그냥 `--clip toast` 를 주면 toast-cake·toast-both 까지 다섯을 끌고 온다.
      ★조립기는 «클립 전체 문장»을 요구한다. 그래서 두 사람이 섞인 클립은 둘 다 받아야 조립된다 —
        아래에 그 클립을 따로 적어 둔다(안 적으면 44줄을 주고 46문장을 요구받으며 멎는다). */
   '## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)', '',
   ...rows.flatMap(([v, l]) => {
     const clips = [...new Set(l.map((x) => x.clip))];
     const mixed = clips.filter((k) => {
       const c = man.clips.find((x) => pad2(x.no) + '_' + x.file === k);
       return c && c.sents.length !== l.filter((x) => x.clip === k).length;
     });
     return ['```', `# ${v} — ${l.length}줄 · ${clips.length}클립`,
       `node scripts/assemble-narration.mjs --in <${v}_받은폴더> \\`,
       `  --clip ${clips.map((k) => '=' + k).join(',')}`, '```',
       ...(mixed.length ? [`★${mixed.join(' · ')} 은 두 사람이 한 클립에 섞여 있습니다. `
         + `${v} 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.`, ''] : [''])];
   }),
  ].join('\n') + '\n');
console.log(`\n썼다: ${path.relative(ROOT, OUT)}/ · 파일 ${rows.length + 2}개`);
