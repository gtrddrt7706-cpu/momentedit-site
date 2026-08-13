// 미리듣기가 걸어온 데까지만 들려주는가 — 그리고 그 자르기가 실제 예식엔 안 닿는가 [PREVIEW_UPTO]
//
// ★왜 이 검사가 생겼나
//   2026-08-12 사용자 제보: *"식순 부분 완성하지않았는데도불구하고(중간에 저장후나가기)
//   미리듣기부분은 폐식까지 나오는걸 확인할수있다"* — 화면은 「고르신 순서 그대로」라고
//   말하는데 실제로는 두 분이 본 적 없는 뒷부분까지 흘렀다. 적힌 것과 들리는 것이 달랐다.
//   고침은 S.seen(방문한 단계 키)을 미리듣기에 실어 그 뒤를 자르는 것이었다.
//
// ★왜 **지금** 코드로 남기나 (목록 ★17)
//   그때 다섯 갈래를 실측했는데, 그 실측은 **임시 스크립트**였고 저장소에 안 남았다.
//   ★17 이 「말로 답하지 말고 코드로 남긴다」인데 그 교훈이 우리 자신에게 먼저 적용된다.
//   여기가 다시 깨져도 화면은 멀쩡하다 — 소리만 달라진다. 조용히 낡는 자리라 그물이 필요하다.
//
// ★이 검사가 지키는 것 다섯
//   ① **실제 예식(live)은 절대 안 잘린다** — 가장 중요한 안전선.
//      자르기가 preview 밖으로 새면 그날 식장에서 폐식이 안 나온다. 되돌릴 수 없는 사고다.
//   ② 걸어온 데까지만 — 서약까지 걸었으면 서약에서 끊기고, 뒤에 몇 개가 남았는지 센다
//   ③ 끝까지 걸었으면(빈 seen) 안 자른다 — 자를 데가 없다
//   ④ 모르는 키가 섞여도 안 자르고 안 죽는다 — 코스를 바꾸면 옛 키가 남는다
//   ⑤ ★주소에 고객이 쓴 글이 안 실린다 — 서약문·편지·첫인사·올린 파일 이름.
//      KEYS 는 '담을 것을 세는' 화이트리스트다. 뒤집히면 새 글칸이 기본값으로 새어 나간다.
//
// ★게이트가 돌린다 — 브라우저가 필요 없다. 엔진도 링크 조립기도 파일 그대로 실행한다.
//   node scripts/check-preview-upto.mjs
//
// ★종료 코드 [CANT_LOOK]  0 통과 · 1 재서 틀림 · 2 재지 못함

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);

let C;
try { C = require_(path.join(ROOT, 'assets/ritual-cue.js')); }
catch (e) { console.log('· 큐 엔진을 못 읽었습니다 — ' + e.message); process.exit(2); }
if (typeof C.build !== 'function') { console.log('· 큐 엔진에 build 가 없습니다'); process.exit(2); }

/* 링크 조립기는 브라우저 파일이다 — window 만 놓고 **파일 그대로** 돌린다.
   KEYS 를 여기 옮겨 적지 않는다. 옮겨 적으면 원본이 바뀌는 날 이 사본만 옛 목록을 지킨다. */
let L;
try {
  const sand = { window: {}, btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
                 unescape, encodeURIComponent, decodeURIComponent, escape, JSON };
  vm.createContext(sand);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8'), sand);
  L = sand.window.RitualPreviewLink;
} catch (e) { console.log('· 미리듣기 링크 조립기를 못 돌렸습니다 — ' + e.message); process.exit(2); }
if (!L || typeof L.url !== 'function') { console.log('· RitualPreviewLink 가 안 섰습니다'); process.exit(2); }

const bad = [];
const CRS = 'damback';

/* 기준값 — 코스가 늘거나 순서가 바뀌면 이 수도 바뀐다. 그래서 **박지 않고 그때그때 잰다.**
   (COUNT_ROTS: 적어 두는 순간 사본이 되고 사본은 늙는다) */
const full = C.build({ course: CRS }, { mode: 'preview' });
const live = C.build({ course: CRS }, { mode: 'live' });

/* ★① 실제 예식은 안 잘린다 — seen 을 잔뜩 실어도 live 는 온전해야 한다 */
const liveSeen = C.build({ course: CRS, seen: ['guest', 'entry', 'vow'] }, { mode: 'live' });
if (liveSeen.upto !== null && liveSeen.upto !== undefined)
  bad.push(`실제 예식(live)이 잘렸다 — upto=${liveSeen.upto}. 식장에서 폐식이 안 나온다 [PREVIEW_UPTO]`);
if (liveSeen.cues.length !== live.cues.length)
  bad.push(`실제 예식(live) 큐 수가 seen 때문에 달라졌다(${live.cues.length}→${liveSeen.cues.length}) [PREVIEW_UPTO]`);

/* ★② 걸어온 데까지 — 서약까지 걷고 멈춘 초안 */
const cut = C.build({ course: CRS, seen: ['intro', 'intro2', 'course', 'tune', 'guest', 'entry', 'vow'] }, { mode: 'preview' });
if (!cut.upto) bad.push('서약까지만 걸었는데 안 잘렸다 — 안 본 뒷부분까지 들린다(사용자 제보 그 화면) [PREVIEW_UPTO]');
if (cut.upto !== 'vow') bad.push(`끊긴 자리가 서약이 아니다(upto=${cut.upto}) [PREVIEW_UPTO]`);
if (!cut.uptoName) bad.push('끊긴 자리 이름(uptoName)이 비었다 — 화면이 「어디까지」를 말할 수 없다 [PREVIEW_UPTO]');
if (cut.cues.length >= full.cues.length)
  bad.push(`자르고도 큐가 안 줄었다(${full.cues.length}→${cut.cues.length}) [PREVIEW_UPTO]`);
if (cut.uptoAfter !== full.cues.length - cut.cues.length)
  bad.push(`남은 수가 실제와 다르다(uptoAfter=${cut.uptoAfter} · 실제 ${full.cues.length - cut.cues.length}) — 화면이 틀린 수를 말한다 [PREVIEW_UPTO]`);
/* ★자른 뒤 마지막 큐가 정말 서약인가 — 수만 맞고 엉뚱한 데서 끊길 수 있다 */
const last = cut.cues[cut.cues.length - 1];
if (!last || last.k !== 'vow') bad.push(`마지막 큐가 서약이 아니다(${last && last.k}) — 수만 맞고 자리가 틀렸다 [PREVIEW_UPTO]`);

/* ★③-b [UPTO_CLOSE_FIXED 2026-08-13 점검 발견] 고를 것을 **전부 본** 고객은 안 자른다 —
   폐식(_close)은 방문 단계가 아니라 S.seen 에 실릴 길이 없다. 이걸 「안 본 것」으로 세면
   글 적기까지 걷고 저장 후 나간 고객의 미리듣기가 폐식 한 큐 때문에 잘리고,
   화면은 「그 뒤는 아직 정하기 전」이라는 거짓말을 한다(실측: 18큐 중 폐식만 빠진 17큐). */
const allVisitable = full.cues.map((c) => c.k).filter((k, i, a) => k && k !== '_close' && a.indexOf(k) === i);
const walkedAll = C.build({ course: CRS, seen: allVisitable.concat(['intro', 'intro2', 'course', 'tune', 'write']) }, { mode: 'preview' });
if (walkedAll.upto) bad.push(`고를 것을 전부 봤는데 잘렸다(upto=${walkedAll.upto}) — 폐식을 「안 본 것」으로 셌다 [UPTO_CLOSE_FIXED]`);
if (!walkedAll.cues.some((c) => c.k === '_close')) bad.push('고를 것을 전부 봤는데 폐식이 빠졌다 [UPTO_CLOSE_FIXED]');

/* ★③ 끝까지 걸었으면 안 자른다 · ★④ 모르는 키가 섞여도 안 죽는다 */
const empty = C.build({ course: CRS, seen: [] }, { mode: 'preview' });
if (empty.upto) bad.push(`끝까지 걸었는데(빈 seen) 잘렸다 — 완성본이 짧게 들린다 [PREVIEW_UPTO]`);
if (empty.cues.length !== full.cues.length) bad.push(`빈 seen 이 큐 수를 바꿨다(${full.cues.length}→${empty.cues.length}) [PREVIEW_UPTO]`);
let odd = null;
try { odd = C.build({ course: CRS, seen: ['옛코스에만있던키', 'zzz'] }, { mode: 'preview' }); }
catch (e) { bad.push(`모르는 키가 섞이자 엔진이 죽었다 — ${String(e).slice(0, 60)} [PREVIEW_UPTO]`); }
if (odd && odd.upto) bad.push(`아는 자리가 하나도 없는데 잘랐다(upto=${odd.upto}) — 아무것도 안 들린다 [PREVIEW_UPTO]`);
if (odd && odd.cues.length !== full.cues.length) bad.push(`모르는 키가 큐 수를 바꿨다(${odd.cues.length}) [PREVIEW_UPTO]`);

/* ★⑤ 주소에 고객이 쓴 글이 안 실린다 — 이 판은 값을 지어내지 않고 **진짜 글칸 이름**을 쓴다 */
const SECRET = '__비밀__낭독하지_않는_글__';
const withText = { course: CRS, seen: ['guest'], vowText: SECRET, letterText: SECRET, welcomeText: SECRET, up: { vow: SECRET } };
const u = L.url(withText, { digital: false });
if (!u) bad.push('미리듣기 주소가 안 만들어졌다 [PREVIEW_UPTO]');
else {
  if (u.indexOf(SECRET) >= 0) bad.push('★주소에 글이 그대로 보인다 — 방문기록·접속로그에 남는다 [PREVIEW_KEYS]');
  let dec = '';
  try {
    const b64 = decodeURIComponent(u.split('&S=')[1] || '');
    dec = Buffer.from(b64, 'base64').toString('binary');
    dec = decodeURIComponent(escape(dec));
  } catch (e) { bad.push('주소를 도로 못 풀었다 — 미리듣기가 못 읽는 주소다 [PREVIEW_UPTO]'); }
  if (dec) {
    if (dec.indexOf(SECRET) >= 0) bad.push('★주소를 풀면 서약문·편지가 들어 있다 — KEYS 가 뒤집혔다 [PREVIEW_KEYS]');
    let o = null; try { o = JSON.parse(dec); } catch (e) { bad.push('주소 안이 JSON 이 아니다 [PREVIEW_UPTO]'); }
    if (o) {
      ['vowText', 'letterText', 'welcomeText', 'up'].forEach((k) => {
        if (k in o) bad.push(`★주소에 글칸 '${k}' 이 실렸다 — 담을 것을 세는 목록이 뒤집혔다 [PREVIEW_KEYS]`);
      });
      if (!Array.isArray(o.seen)) bad.push('주소에 seen 이 안 실렸다 — 실어 놓고도 못 자른다(2026-08-11 entryOut 과 같은 꼴) [PREVIEW_UPTO]');
      if (!o.course) bad.push('주소에 course 가 없다 — 미리듣기가 아무것도 못 그린다 [PREVIEW_UPTO]');
    }
  }
  if (L.KEYS.indexOf('seen') < 0) bad.push("KEYS 에 'seen' 이 없다 — 엔진은 읽는데 주소에 안 실린다 [PREVIEW_KEYS]");
}

console.log(`━━ 미리듣기 자르기 [PREVIEW_UPTO]  코스 ${CRS} · 안 자른 preview ${full.cues.length}큐 · live ${live.cues.length}큐`);
console.log(`   서약까지 걸음 → ${cut.cues.length}큐에서 끊김 · 자리 「${cut.uptoName}」 · 뒤에 ${cut.uptoAfter}개 남음`);
console.log(`   live 에 seen 을 실어도 → ${liveSeen.cues.length}큐(안 잘림)  ← 식장에서 폐식이 나와야 한다`);
console.log(`   빈 seen ${empty.cues.length}큐 · 모르는 키만 ${odd ? odd.cues.length : '(죽음)'}큐 (둘 다 안 자름)`);
console.log(`   고를 것 전부 방문(폐식 빼고) → ${walkedAll.cues.length}큐 · upto=${walkedAll.upto || '없음'} (안 잘리고 폐식 포함이어야) [UPTO_CLOSE_FIXED]`);
console.log(`   주소: 글칸 vowText·letterText·welcomeText·up 실림=아니오 · seen 실림=예 · KEYS ${L.KEYS.length}개`);

if (bad.length) { bad.forEach((b) => console.log('   ✖ ' + b)); process.exit(1); }
console.log('   ✔ 걸어온 데까지만 들리고, 실제 예식은 온전하며, 글은 주소에 안 실립니다');
process.exit(0);
