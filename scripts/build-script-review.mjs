/* [SCRIPT_REVIEW] 사장님이 «처음부터 끝까지 한 번에 읽는» 대본 정리본 한 장 (2026-09-21 코워크 요청)
 *
 * > 코워크: 「사장님이 지금까지 오간 대본을 처음부터 끝까지 한 번에 읽고 한 줄씩 짚어 주시려고 합니다.
 * >          저장소가 원본이니 정리본은 그쪽에서 뽑아 주십시오. 개발용이 아니라 사장님이 읽는 문서입니다.」
 *
 * ★손으로 적지 않는다 — 저장소에서 뽑는다. 손으로 적으면 그 순간부터 저장소와 갈라지고,
 *   사장님은 «지금 나가는 말»이 아니라 «그때 내가 옮겨 적은 말»을 읽게 된다([NOT_THE_SOURCE]).
 *
 * ★이 문서가 답해야 할 것 (코워크 §1~§2)
 *   ① 실제로 나오는 차례대로   ② 고르는 자리는 그 자리에 모아서
 *   ③ 설정에 따라 끼는 것은 «(○○ 켰을 때)»   ④ 줄마다 상태   ⑤ 뺀 것은 맨 끝 목록으로
 *
 * ★★[REVIEW_STATUS] 상태 칸은 «저장소가 실제로 들고 있는 것»을 말한다. 셋뿐이다.
 *     확정   — 들어가 있고, 사장님·코워크 결정이 끝난 줄
 *     검토중 — 들어가 있지만 **사장님 검토를 기다리는** 줄(코워크 열넷째 판)
 *     잠김   — 사장님 문면이라 코워크도 나도 안 건드리는 줄(게이트가 지킨다)
 *   ★«제안(아직 안 넣음)»은 두지 않는다 — 이번 판은 전부 넣었기 때문이다. 없는 칸을 만들면
 *     사장님이 «어느 게 안 들어간 거지» 하고 찾게 된다. 안 넣은 것이 생기면 그때 칸을 만든다.
 *
 *   node scripts/build-script-review.mjs        →  script-review.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
const D = require_(path.join(ROOT, 'assets/ritual-data.js'));
const Story = require_(path.join(ROOT, 'assets/ritual-story.js'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const { want: ENGINE } = (await import('./lib/engine-calls.mjs')).engineCalls();
const DG = (await import('./lib/drop-guard.mjs')).dropGuard();

const VOICE = { 진행: '우성', 안내: '진희', 편지: '김호인', 신랑: '이겸', 신부: '서진',
                아버님: '권일', 어머님: '주하', 시어머님: '정숙' };
const SENTS = new Map(), META = new Map();
for (const c of man.clips) {
  const id = c.no + '_' + c.file;
  SENTS.set(id, c.sents.map((s) => s.text));
  META.set(id, { role: c.role, label: c.label || '', no: c.no, file: c.file });
}

/* ── ① 상태: «검토중» = 라이브(main)와 다른 **문장** ─────────────────────────
   ★★[DIFF_NOT_LIST] 처음엔 바뀐 클립을 손으로 적었다. 두 가지가 틀렸다:
     ① 클립 단위라 **사장님 문면까지 물들었다** — 04a 는 여섯 줄 중 한 줄만 바뀌었는데
        「휴대폰 소리는…」(잠긴 줄)까지 「검토중」으로 떴다. 사장님이 «이것도 바뀌었나» 하고 보신다.
     ② 손 목록은 다음 판에 **반드시 낡는다.** 적는 사람이 그때 기억하는 것만 들어간다.
   ★그래서 «지금 라이브에 나가는 판»(origin/main)과 문장을 견준다. 다르면 검토중이다.
     이 자는 스스로 갱신된다 — 병합되면 그 줄은 저절로 «확정»이 된다. */
const prevMan = (() => {
  try {
    const raw = require_('node:child_process').execFileSync('git',
      ['show', 'origin/main:docs/plans/식순연구/타입캐스트/manifest.json'],
      { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
    const m = new Map();
    for (const c of JSON.parse(raw).clips) m.set(c.no + '_' + c.file, new Set(c.sents.map((x) => x.text)));
    return m;
  } catch { return null; }   // main 을 못 읽으면 «검토중»을 못 가른다 — 아래에서 알린다
})();

/* ── ② 잠김: 게이트가 글자로 지키는 문장 ──────────────────────────────────── */
const gate = fs.readFileSync(path.join(ROOT, 'automation/tests/merge-guard.sh'), 'utf8');
/* ★★[LOCK_NO_DOT] 게이트가 잠근 문자열에는 **마침표가 없다**(chk 는 부분일치라 끝을 안 적는다).
   그래서 `LOCKED.has(문장)` 으로 재면 **하나도 안 맞는다** — 실측으로 0건이었고,
   그 바람에 사장님 문면(「휴대폰 소리는 잠시 꺼 주시기 바랍니다.」)까지 「검토중」으로 보였다.
   ★게이트가 재는 방식 그대로 «부분일치»로 잰다.
   ★마커(ORD_FLOW_ONE 같은 영문 대문자 이름)는 문장이 아니므로 거른다 — 안 거르면
     영문 마커가 아무 문장에나 안 걸려 조용히 아무 일도 안 하거나, 더 나쁘게는 엉뚱하게 걸린다. */
const LOCKED = [];
for (const m of gate.matchAll(/^\s*chk\s+'([^']{10,})'\s+assets\/ritual-data\.js/gm)) {
  const t = m[1];
  if (!/[가-힣]/.test(t)) continue;          // 영문 마커는 문장이 아니다
  if (!/\s/.test(t)) continue;               // 낱말 하나짜리 열쇠도 아니다
  LOCKED.push(t);
}

/* ── ③ 차례: 기본 예식 한 편 + 갈래·설정을 그 자리에 ────────────────────────── */
const BASE = { course: 'damback' };
/* ★축을 좁게 잡았다가 **15개를 잃었다**(두 분 목소리 입장 6 · 덕담 중간 · 자유시간 2 · 사진 포즈 6).
   사장님이 읽는 문서에서 «나는 소리»가 빠지면 그 줄은 아무도 못 짚는다. 아래 [COVER_ALL] 이 막는다. */
const AX = { entry: ['A', 'B', 'C', 'D', 'E', 'F'], declare: ['1', '2'],
             declareWho: Object.keys(D.DECLWHO), letter: Object.keys(D.LETTER),
             tribute: Object.keys((D.TRIBUTE || {}).modes || {}), toast: Object.keys(D.TOAST),
             entryVoice: ['nar', 'couple'], guestVoice: ['nar', 'couple'], bless: ['on', 'off'],
             valley: ['none', 'wine', 'cake', 'both'], song: ['none', 'live'], ring: ['on', 'off'] };
const OPT = [['photoShare', { photoShare: true }, '사진 보내기를 켰을 때'],
             ['meal', { meal: true }, '모일 식당을 골랐을 때'],   // [MEAL_GUIDE] 88_guide-meal
             ['digital', { digital: true }, '온라인 참석을 켰을 때'],
             ['guestVoice', { guestVoice: 'couple' }, '하객 안내를 두 분 목소리로 골랐을 때'],
             ['family', { course: 'family', bless: 'on' }, '가족 코스일 때'],
             ['free', { free: 'on' }, '자유 시간을 켰을 때'],
             ['valley', { valley: 'both' }, '축배·케이크를 켰을 때']];

const blocks = [], seen = new Map();   // blockN → [{id, tag}]
/* ★★[BLOCK_ORDER] 블록 차례를 «처음 본 순서»로 두면 어긋난다 — 실측: 「식전 안내」가 **배웅 뒤**에 왔다.
   그 블록은 두 분 목소리 설정에서만 나오는데, 그 설정을 나중에 쓸었기 때문이다.
   ★그래서 «어느 설정에서 봤든, 그 예식 안에서 몇 번째였나»를 기억해 그 값으로 정렬한다.
     길이가 다른 설정끼리 견주려고 **비율**(index/total)로 잰다. */
/* ★최솟값으로 재면 «한 설정의 예외»에 끌려간다(실측: 「식전 안내」가 입장 뒤로 밀렸다).
   평균으로 잰다 — 여러 설정에서 대체로 몇 번째였나가 사람이 기대하는 차례에 가깝다. */
const POS = new Map();
const mark = (blk, r) => { const p = POS.get(blk) || { sum: 0, n: 0 }; p.sum += r; p.n++; POS.set(blk, p); };
const posOf = (blk) => { const p = POS.get(blk); return p ? p.sum / p.n : 9; };
const add = (blk, id, tag) => {
  if (!blk || !id) return;
  if (!seen.has(blk)) { seen.set(blk, []); blocks.push(blk); }
  const arr = seen.get(blk);
  if (!arr.some((x) => x.id === id)) arr.push({ id, tag });
};
const sweep = (S, tag) => {
  let b; try { b = Cue.build(S); } catch { return; }
  b.cues.forEach((c, i) => { if (c.blockN) mark(c.blockN, i / Math.max(1, b.cues.length)); });
  for (const c of b.cues) {
    add(c.blockN, c.file, tag);
    for (const x of Story.castMainOf(c)) add(c.blockN, x.id, tag);
    for (const x of Story.castLiveOf(c)) add(c.blockN, x.id, tag);
  }
};
sweep(BASE, null);                                             // 기본 한 편이 뼈대
/* ★★[COURSE_EXTRA] 코스마다 «선택 항목»(opt)이 다르고, 그것이 켜져야 나오는 블록이 있다.
   실측으로 알았다 — 「자유 한 칸」(58·59)은 `free:'on'` 으로도 `extra:{free:1}` 으로도 안 나왔다.
   실제로는 **record 코스의 opt** 라 그 코스에서 그 항목을 켜야 나온다.
   ★그래서 짐작하지 않고 `D.COURSES` 에서 읽어 켠다 — 코스 구성이 바뀌어도 따라온다. */
for (const [ck, c] of Object.entries(D.COURSES || {}))
  for (const o of (c.opt || []))
    sweep({ course: ck, extra: { [o.k]: 1 } }, ck === BASE.course ? null : `${c.name || ck} 코스에서 «${o.k}»를 켰을 때`);
for (const k of Object.keys(AX)) for (const v of AX[k]) sweep({ ...BASE, [k]: v }, null);  // 고르는 자리
for (const [, S, why] of OPT) sweep({ ...BASE, ...S }, why);   // 설정에 따라 끼는 것

/* ── ④ 부록으로 뺄 것: 배역 본문(편지·덕담·헌정·답사) ─────────────────────── */
const isCast = (id) => { const m = META.get(id); return m && VOICE[m.role] && m.role !== '진행' && m.role !== '안내'; };
const LONG = 6;   // 문장이 이만큼 넘는 배역 본문은 부록으로

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nice = (id) => {
  const m = META.get(id) || {};
  const who = VOICE[m.role] || m.role || '';
  return { label: m.label || m.file || id, who, no: m.no || '', slug: m.file || id };
};
/* ★차례가 중요하다 — «검토중»이 «잠김»을 이긴다.
   이번 판에서 바뀐 줄을 내가 같은 시간에 게이트에 잠갔기 때문에, 잠김을 먼저 보면
   **사장님이 짚어야 할 바로 그 줄이 「건드리지 마시오」로 보인다.** 코워크가 고백한 그 사고의 판박이다. */
const statusOf = (id, text) => {
  const prev = prevMan && prevMan.get(id);
  if (prev && !prev.has(text)) return ['검토중', 'review'];
  if (LOCKED.some((L) => text.includes(L))) return ['잠김', 'lock'];
  if (prevMan && !prev) return ['검토중', 'review'];   // main 에 없던 클립 = 통째로 새 것
  return ['확정', 'ok'];
};
const runtimeNote = (id) => {
  if (ENGINE.has(id)) return '';
  const g = DG.of(id);
  if (g.kind === '폐지한 자리') return null;                 // 아예 안 싣는다
  return g.kind + ' — ' + g.why;
};

/* ★★[COVER_ALL] 엔진이 부르는데 어느 블록에도 안 들어온 클립 — 그대로 두면 문서에서 «사라진다».
   콘솔에서 진행자가 고르는 판(사진 포즈 fx-*)이 여기 걸린다. 큐 배열에 없어서 축을 아무리 흔들어도 안 나온다.
   ★지어내지 않는다 — 「그 밖에, 진행자가 그때그때 고르는 말」로 모아 **문서에 싣는다.**
   ★그리고 아래에서 개수를 맞춰 본다. 안 맞으면 생성기가 멎는다(사장님께 반쪽 문서를 드리지 않는다). */
{
  const placed = new Set();
  for (const blk of blocks) for (const { id } of seen.get(blk)) placed.add(id);
  const orphan = [...ENGINE.keys()].filter((id) => !placed.has(id) && SENTS.has(id));

  /* ★먼저 «슬러그 가족»으로 제자리를 찾는다 — 맨 뒤 한 덩어리에 쌓으면 사장님이
     「나오는 순서대로」 읽으실 수 없다. entry-B 는 entry-A 옆, narr-bless-mid 는 덕담 옆이다.
     ★이 클립들은 `Cue.build` 로는 안 나온다 — 콘솔·미리보기에서 닿는 자리라 큐 배열에 없다.
       축을 아무리 흔들어도 안 나오므로, 축을 늘리는 것이 답이 아니었다(늘려 보고 알았다).
     ★줄기(stem) = 슬러그에서 꼬리 한 마디를 뗀 것. `entry-B`→`entry` · `narr-bless-mid`→`narr-bless`.
       가족이 여럿 블록에 흩어져 있으면 **가장 많이 있는 블록**으로 간다(한 곳으로 몰기). */
  const stemOf = (id) => id.replace(/^\d+_/, '').replace(/-(?:[A-F]|in|out|mid|open|end|long|[0-9])$/, '');
  const homeOf = new Map();   // stem → {block: count}
  for (const blk of blocks) for (const { id } of seen.get(blk)) {
    const st = stemOf(id); if (!homeOf.has(st)) homeOf.set(st, new Map());
    const t = homeOf.get(st); t.set(blk, (t.get(blk) || 0) + 1);
  }
  for (const id of orphan) {
    const t = homeOf.get(stemOf(id));
    const home = t && [...t.entries()].sort((a, b) => b[1] - a[1])[0][0];
    add(home || '그 밖에, 진행자가 그때그때 고르는 말', id, null);
  }
}

blocks.sort((a, b) => posOf(a) - posOf(b));

if (!prevMan) process.stderr.write('[SCRIPT_REVIEW] ⚠ origin/main 을 못 읽어 «검토중»을 못 가른다 — git fetch origin main\n');

let nC = 0, nS = 0, seq = 0;
const body = [], appendix = [], dropped = [];
for (const blk of blocks) {
  const rows = [];
  for (const { id, tag } of seen.get(blk)) {
    const sents = SENTS.get(id);
    if (!sents || !sents.length) continue;
    const rt = runtimeNote(id);
    if (rt === null) { dropped.push(id); continue; }
    const n = nice(id);
    const long = isCast(id) && sents.length > LONG;
    const card = { id, n, tag, rt, sents, long, seq: ++seq };
    (long ? appendix : rows).push(card);
    if (!long) { nC++; nS += sents.length; }
  }
  if (rows.length) body.push([blk, rows]);
}

const card = (c) => {
  const st = c.sents.map((t) => { const [s, k] = statusOf(c.id, t);
    return `<li class="s ${k}"><span class="tag">${s}</span>${esc(t)}</li>`; }).join('');
  return `<article class="clip" id="c${c.seq}">
  <h3><span class="num">${String(c.seq).padStart(2, '0')}</span> ${esc(c.n.label)}
      <span class="who">${esc(c.n.who)}</span></h3>
  ${c.tag ? `<p class="cond">(${esc(c.tag)})</p>` : ''}
  ${c.rt ? `<p class="rt">${esc(c.rt)}</p>` : ''}
  <ul>${st}</ul>
  <p class="slug">${esc(c.n.no)}_${esc(c.n.slug)}</p>
</article>`;
};

const RET = Object.keys(Cue.RETIRED || {});
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>예식 대본 정리본</title>
<style>
:root{--bg:#FBF9F5;--ink:#2B2723;--mute:#7A7269;--line:#E6DFD4;--ok:#8A9A7B;--review:#C08A3E;--lock:#8B8FA8;--card:#FFFFFF}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;line-height:1.75;word-break:keep-all}
.wrap{max-width:760px;margin:0 auto;padding:28px 16px 80px}
h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--mute);font-size:13px;margin:0 0 20px}
.legend{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13px;margin:0 0 24px}
.legend b{display:inline-block;min-width:52px}
h2{font-size:17px;margin:34px 0 12px;padding-bottom:7px;border-bottom:2px solid var(--line)}
.clip{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:0 0 12px}
.clip h3{font-size:15px;margin:0 0 6px;font-weight:600}
.num{display:inline-block;background:var(--ink);color:var(--bg);border-radius:5px;padding:1px 7px;font-size:12px;margin-right:6px}
.who{color:var(--mute);font-size:12px;font-weight:400;margin-left:4px}
.cond{margin:0 0 8px;font-size:12.5px;color:var(--review)}
.rt{margin:0 0 8px;font-size:12.5px;color:var(--mute)}
ul{margin:0;padding:0;list-style:none}
.s{padding:5px 0 5px 0;border-top:1px solid var(--line);font-size:15px}
.s:first-child{border-top:0}
.tag{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:4px;margin-right:7px;vertical-align:2px;color:#fff;white-space:nowrap}
.ok .tag{background:var(--ok)} .review .tag{background:var(--review)} .lock .tag{background:var(--lock)}
.review{background:#FFFBF3;margin:0 -16px;padding-left:16px;padding-right:16px}
.slug{margin:8px 0 0;font-size:11px;color:#B4ABA0;font-family:ui-monospace,monospace}
.tail{margin-top:40px;font-size:13px;color:var(--mute)}
.tail code{font-size:12px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1A1815;--ink:#EDE7DD;--mute:#9A9187;--line:#332F2A;--card:#221F1B}}
:root[data-theme="dark"]{--bg:#1A1815;--ink:#EDE7DD;--mute:#9A9187;--line:#332F2A;--card:#221F1B}
</style></head><body><div class="wrap">
<h1>예식 대본 정리본</h1>
<p class="sub">저장소에서 자동으로 뽑았습니다 · ${new Date().toISOString().slice(0, 10)} · 클립 ${nC} · 문장 ${nS}</p>
<div class="legend">
  <p style="margin:0 0 6px"><b><span class="tag" style="background:var(--ok)">확정</span></b> 지금 라이브에 나가는 말 그대로입니다</p>
  <p style="margin:0 0 6px"><b><span class="tag" style="background:var(--review)">검토중</span></b> <b style="min-width:0">이번에 바꾼 줄</b>입니다. 여기를 짚어 주세요</p>
  <p style="margin:0 0 10px"><b><span class="tag" style="background:var(--lock)">잠김</span></b> 사장님이 정하신 말이라 아무도 손대지 않는 줄입니다</p>
  <p style="margin:0;font-size:12.5px;color:var(--mute)">「잠김」은 «고칠 수 없다»가 아니라 «아무도 슬그머니 못 바꾼다»는 뜻입니다. 사장님이 바꾸라 하시면 바꿉니다.<br>진희(안내) 목소리는 <b>녹음을 멈춰 두었습니다</b> — 이 문서를 보시고 정해 주시면 그 기준으로 다시 씁니다.</p>
</div>
${body.map(([blk, rows]) => `<h2>${esc(blk)}</h2>\n${rows.map(card).join('\n')}`).join('\n')}
<h2>부록 · 사람이 읽는 긴 글</h2>
<p class="sub" style="margin:-6px 0 12px">편지·덕담·헌정·답사입니다. 견본 목소리로 받아 두고, 실제로는 그날 그분이 읽습니다.</p>
${appendix.map(card).join('\n')}
<h2>뺀 것</h2>
<p class="sub" style="margin:-6px 0 12px">폐지해서 식장에서 안 나는 자리 ${RET.length}개입니다. 파일과 번호는 남겨 뒤 번호가 안 밀리게 했습니다.</p>
<p style="font-size:13px;color:var(--mute)">${RET.map(esc).join(' · ')}</p>
<p class="tail">이 문서는 <code>node scripts/build-script-review.mjs</code> 로 다시 뽑습니다. 손으로 고치지 마세요 — 저장소를 고치면 여기도 따라옵니다.</p>
</div></body></html>`;

/* ★★[COVER_ALL] 마지막 자 — 나는 소리가 전부 문서에 있는가. 하나라도 빠지면 **쓰지 않는다.**
   ★낡은 파일이 남는 것이 더 나쁘다고 볼 수도 있으나, 그 반대다 — 반쪽 문서를 드리면
     사장님은 «여기 없으니 없는 말»이라고 읽으신다. 멎으면 적어도 내가 알아차린다. */
{
  const missing = [...ENGINE.keys()].filter((id) => SENTS.has(id) && !html.includes(id));
  if (missing.length) {
    process.stderr.write('[COVER_ALL] ✗ 나는 소리 ' + missing.length + '개가 문서에 없다: ' + missing.join(' · ') + '\n');
    process.exit(1);
  }
}
fs.writeFileSync(path.join(ROOT, 'script-review.html'), html);
process.stderr.write(`[SCRIPT_REVIEW] 본문 클립 ${nC} · 문장 ${nS} · 부록 ${appendix.length} · 뺀 것 ${RET.length}\n`);
