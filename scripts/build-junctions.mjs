#!/usr/bin/env node
/* ★★[JUNCTION_LIST_1102 2026-11-02 사장님 «85가지 이음매를 GPT 보고 스텝바이스텝으로 검사하라고 · 직접 보면서 하나하나 · 식순 전체를 보고 흐름과 완성도를 높이는 쪽으로 한 줄 한 줄»]
   이음매(한 순간이 끝나는 말 ↔ 다음 순간을 여는 말이 붙는 자리) 전수 목록을 공개 파일 하나로 뽑는다 — GPT 검토가 읽는 판.
   ① 만들 수 있는 코스 전부(개수 규칙 EVENT_COUNT_CAP 안 · 식전 영상 넣고 빼기 포함)를 엔진(ritual-cue build)으로 돌려 실제 나가는 순간 차례에서 이음매를 모은다(손으로 순서를 적지 않는다)
   ② 이음매마다 대표 코스 하나의 붙는 줄(앞 순간 끝 2줄 · 뒤 순간 처음 2줄 · 사람 구간 · 쉼) · 음악 칸(bgm-slots) · 바로 보는 주소(order-preview ?on= · ?mk=)
   ③ 자주 나오는 정도는 추정(자료집 23곳 포함률 · 예시 코스에서 시작 70%) — 정답이 아니라 검토 차례를 정하는 값
   ④ 많이 고를 코스 20가지의 처음부터 끝까지(식순 전체 흐름 검토용)
   손으로 고치지 않는다 — 엔진 글이 바뀌면 다시 만든다(node scripts/build-junctions.mjs) */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'docs/handoff/junctions.md');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const B = require(path.join(ROOT, 'assets/bgm-slots.js'));
const SITE = 'https://www.momentedit.kr/order-preview.html';

const PICK = ['candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'toast', 'table'];
const ALL = ['prevideo', ...PICK];
const fits = (on) => { const c = O.countOf({ course: 'open', on }); return c.n <= c.max && c.long <= c.longMax; };
const NAME = (k) => ({ guest: '하객 맞이', _close: '닫는 인사', _photo: '단체 사진', _goodbye: '마무리' }[k] || (O.CARDS[k] && O.CARDS[k].n) || k);
const BODY_END = { _photo: 1, _final: 1, _goodbye: 1 };

// 실제 차례 — 엔진이 내는 큐의 순간(k) 차례
function stateOf(on) { const S = O.sampleS(); S.on = { ...on }; S.ring = on.ring ? 'on' : 'off'; S.bless = on.bless ? 'on' : 'off'; S.growth = on.prevideo ? 'on' : 'off'; S.vow = 'ok'; if (on.toast) S.toast = O.toastMode(S); return S; }
function cuesOf(on) { const S = stateOf(on); const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); return Array.isArray(r) ? r : (r.cues || []); }
function seqOf(cues) { const q = []; cues.forEach((c) => { const k = c.k; if (!k || BODY_END[k]) return; if (q[q.length - 1] !== k) q.push(k); }); return q; }

// 자주 나오는 정도(추정) — 자료집 23곳 포함률 · 우리 고유 순간은 예시 넷 비율 · 편지 5%
const P = { prevideo: 0.35, candle: 1, welcome: 0.75, vow: 0.91, ring: 0.39, declare: 0.91, bless: 0.26, free: 0.59, song: 0.85, letter: 0.05, tribute: 1, toast: 0.25, table: 0.25 };
const keyOf = (on) => ALL.filter((k) => on[k]).join(',');
function fix(on) { on = { ...on }; while (!fits(on)) { const c = PICK.filter((k) => on[k]).sort((a, b) => P[a] - P[b] || PICK.indexOf(b) - PICK.indexOf(a)); delete on[c[0]]; } return on; }
const prob = {}; const add = (on, p) => { const s = keyOf(fix(on)); prob[s] = (prob[s] || 0) + p; };
for (let m = 0; m < 1 << ALL.length; m++) { let p = 0.3; const on = {}; ALL.forEach((k, i) => { const b = (m >> i) & 1; p *= b ? P[k] : 1 - P[k]; if (b) on[k] = 1; }); if (p > 0) add(on, p); }
const EX = O.EXAMPLES.map((e) => { const t = O.applyExample({ course: 'open' }, e.k); const on = {}; Object.keys(t.on || {}).forEach((k) => { if (t.on[k] && !(O.RETIRED && O.RETIRED[k])) on[k] = 1; }); return on; });
const flip = (o, k) => { if (o[k]) delete o[k]; else o[k] = 1; };
EX.forEach((e) => { const w = 0.7 / EX.length; add(e, w * 0.5);
  ALL.forEach((k) => { const o = { ...e }; flip(o, k); add(o, (w * 0.35) / ALL.length); });
  for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) { const o = { ...e }; flip(o, ALL[i]); flip(o, ALL[j]); add(o, (w * 0.15) / ((ALL.length * (ALL.length - 1)) / 2)); } });

// 만들 수 있는 코스 전부
const courses = [];
for (let m = 0; m < 1 << ALL.length; m++) { const on = {}; ALL.forEach((k, i) => { if ((m >> i) & 1) on[k] = 1; }); if (fits(on)) courses.push(on); }
const J = new Map();   // 'a>b' → { a, b, p, n, rep, repP }
courses.forEach((on) => {
  const key = keyOf(on), p = prob[key] || 0, seq = seqOf(cuesOf(on));
  for (let i = 0; i < seq.length - 1; i++) {
    const id = seq[i] + '>' + seq[i + 1]; let j = J.get(id); if (!j) { j = { a: seq[i], b: seq[i + 1], p: 0, n: 0, rep: null, repP: -1 }; J.set(id, j); }
    j.p += p; j.n++;
    const sz = Object.keys(on).length;
    if (p > j.repP || (p === j.repP && j.rep && sz < Object.keys(j.rep).length)) { j.rep = on; j.repP = p; }
  }
});
const list = [...J.values()].sort((x, y) => y.p - x.p || x.a.localeCompare(y.a));

const link = (on, mk) => `${SITE}?on=${ALL.filter((k) => on[k]).join(',') || '-'}${mk ? '&mk=' + mk : ''}`;
const NOSLOT = { prevideo: '영상 자체 소리', song: '축가 MR(부르는 분이 보낸 반주)' };   // 음악 칸이 없는 순간 — 그 자리 소리가 따로 있다
const slotId = (k) => { const s = B.slotOfKey ? B.slotOfKey(k) : null; return s ? s.id : (NOSLOT[k] ? (k === 'song' ? 'MR' : '영상') : '-'); };
const slotTxt = (k) => { const s = B.slotOfKey ? B.slotOfKey(k) : null; return s ? `${s.id}${s.one ? ' «' + s.one + '»' : s.short ? ' «' + s.short + '»(음악 없이 · 음악과 함께 고름)' : ''}` : (NOSLOT[k] || '(음악 칸 없음)'); };
const liveOf = (c) => (c.live && c.live.t ? `[사람 구간${+c.live.est >= 60 ? ' · 약 ' + Math.round(c.live.est / 60) + '분' : +c.live.est > 0 ? ' · ' + c.live.est + '초' : ''}] ${c.live.t}` : '');
/* ★[JUNCTION_SILENT_TX05 2026-11-06 이음매 TX05] 소리 없는 사진 행동(actId)도 싣는다 — 녹음 번호 · 가짜 나레이션 없이 «소리 없음 · 무엇 · 현장 진행 · 약 N분»(N = 엔진 live.est) · actId · 예상 초 · 끝내기 홀드를 함께 */
const SILENT = { 'photo-all': '전체 단체 사진', 'photo-family': '가족 사진', 'photo-free': '추가 촬영' };
const silentLine = (c) => { const n = SILENT[c.actId], est = Math.round(+((c.live && c.live.est) || 0)); const how = c.actId === 'photo-free' ? '남는 시간만큼' : '현장 진행 · 약 ' + Math.max(1, Math.round(est / 60)) + '분';
  return `[-] (${c.actId} · 예상 ${est}초${c.endHold ? ' · 끝내기까지 홀드' : ''})\n      소리 없음 · ${n} · ${how}`; };
const cueLine = (c) => { if (!c.text && SILENT[c.actId]) return silentLine(c); const g = +c.gapMs > 0 ? ` (앞 줄 뒤 쉼 ${(c.gapMs / 1000).toFixed(1)}초)` : ''; return `[${c.no || '-'}] ${c.slug || ''}${g}\n      ${c.text || '(소리 없음)'}${liveOf(c) ? '\n      ' + liveOf(c) : ''}`; };

const L = [];
L.push('# 이음매 전수 목록 · 검토용 [JUNCTION_LIST_1102]', '');
L.push('자동으로 만든 파일이에요(`node scripts/build-junctions.mjs`) · 손으로 고치지 않아요.');
L.push(`만들 수 있는 코스 ${courses.length.toLocaleString()}가지(본식 순간 6개 · 긴 순간 3개 규칙 안 · 식전 영상 넣고 빼기 포함)를 엔진으로 전부 돌려, 실제로 붙는 순간 차례에서 모은 이음매가 **${list.length}개**예요.`);
L.push('이음매 = 한 순간이 끝나는 말과 다음 순간을 여는 말이 붙는 자리 · 이음말(bridge-…)은 다음 순간 쪽에 들어 있어요.', '');
L.push('## 읽는 법', '');
L.push('- **100쌍 중** = 100쌍 가운데 이 이음매를 듣게 될 쌍 수(추정 · 자료집 23곳 포함률 + 예시 코스에서 시작하는 비율 70%). 검토 차례를 정하는 값이지 정답이 아니에요.');
L.push('- **바로 보기** = 그 이음매가 들어 있는 대표 코스를 그대로 담아 뒤 순간 쪽을 여는 주소(로그인 없음 · `?on=` 담을 순간 · `?mk=` 열 순간 · `mk=_sum` 이면 «한눈에 보기»).');
L.push('- **음악** = 앞 순간과 뒤 순간의 음악 칸(S1 ~ S10). 같으면 같은 곡이 이어지고, 다르면 곡이 바뀌어요.');
L.push('- 줄 앞 대괄호 숫자는 소리 번호 · 그 뒤는 slug 예요. 검토를 적을 때 둘 다 적어 주세요.');
L.push('- «[사람 구간]» 줄이 끼면 그 앞뒤 소리는 붙어 들리지 않아요(사람이 말하거나 움직이는 동안).');
L.push('- 순간 안 칩(예시 멘트 · 읽는 목소리 · 덕담 인원 · 축사 길이 · 테이블 수)은 기본값이에요. 화면에서 칩을 바꾸면 줄이 바뀌어요.');
L.push('- 시간(«약 n분» · «예상 n초» · 쉼)은 엔진의 계획 값이에요. 현장에서 잰 값도, 100쌍에서 실제로 일어난 비율도 아니에요. «소리 없음» 줄은 녹음 없이 현장이 진행하는 자리예요(전체 단체 사진 → 촬영 후 안내 → 가족 사진 → 추가 촬영).', '');
L.push('## 1. 이음매 목록 (자주 나오는 순)', '');
L.push('| 번호 | 이음매 | 100쌍 중 | 이 이음매가 있는 코스 수 | 음악 |', '|---|---|---|---|---|');
list.forEach((j, i) => { const sa = slotId(j.a), sb = slotId(j.b); L.push(`| J${String(i + 1).padStart(2, '0')} | ${NAME(j.a)} → ${NAME(j.b)} | ${(j.p * 100).toFixed(j.p >= 0.1 ? 0 : 1)} | ${j.n} | ${sa === sb && sa !== '-' ? sa + ' 이어짐' : sa + ' → ' + sb} |`); });
L.push('', '## 2. 이음매마다 붙는 줄', '');
list.forEach((j, i) => {
  const cues = cuesOf(j.rep); const ia = []; const ib = [];
  cues.forEach((c, x) => { if (c.k === j.a) ia.push(x); });
  const after = ia.length ? ia[ia.length - 1] : -1; for (let x = after + 1; x < cues.length && ib.length < 2; x++) { if (cues[x].k === j.b) ib.push(x); else break; }
  L.push(`### J${String(i + 1).padStart(2, '0')} · ${NAME(j.a)} → ${NAME(j.b)} · 100쌍 중 ${(j.p * 100).toFixed(1)}`);
  L.push(`- 대표 코스: ${['하객 맞이', ...seqOf(cues).filter((k) => k !== 'guest').map(NAME)].join(' → ')}`);
  L.push(`- 바로 보기: ${link(j.rep, j.b === 'guest' ? '' : j.b)}`);
  L.push(`- 음악: ${slotTxt(j.a)} → ${slotTxt(j.b)}`);
  L.push('```');
  ia.slice(-2).forEach((x) => L.push('  ' + cueLine(cues[x])));
  L.push('  ──── 이음매 ────');
  ib.forEach((x) => L.push('  ' + cueLine(cues[x])));
  L.push('```', '');
});
L.push('## 3. 많이 고를 코스 20가지 · 처음부터 끝까지', '');
L.push('식순 전체 흐름(같은 말 반복 · 감정 곡선 · 음악 바뀌는 횟수 · 길이)을 보는 판이에요.', '');
Object.entries(prob).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, p], i) => {
  const on = {}; k.split(',').filter(Boolean).forEach((x) => { on[x] = 1; }); const cues = cuesOf(on);
  L.push(`### 코스 ${i + 1} · 100쌍 중 ${(p * 100).toFixed(1)} · ${seqOf(cues).map(NAME).join(' → ')}`);
  L.push(`- 바로 보기(한눈에 보기): ${link(on, '_sum')}`);
  L.push('```'); cues.forEach((c) => { if (!BODY_END[c.k] || c.text || SILENT[c.actId]) L.push('  ' + (c.k ? NAME(c.k) + ' · ' : '') + cueLine(c)); }); L.push('```', '');
});
fs.writeFileSync(OUT, L.join('\n') + '\n');
/* ★★[LISTEN_SEAM_1107 2026-11-07 사장님 «이음매 = 어떤 이벤트를 고르든 순간과 순간을 잇는 멘트가 매끄럽게» · 대본 «junctions.md 85개 그대로가 목록»]
   --json <경로> — 실청판 «이음매 듣기» 탭이 읽는 판. 목록 · 번호 · 대표 코스는 위 md 와 같은 값(같은 list)이고, 여기서 더하는 것은 둘:
   ① 줄마다 소리 파일 · 쉼(gapMs) · 사람 구간(live) · 부르는 방식(fire)
   ② 갈래 — 대표 코스에 한 가지씩만 바꿔(식사 · 누가 선언 · 식중 영상 · 두 분 목소리 · 화촉 · 편지 · 인사 · 축배 · 입장 판 · 서약 · 축가) 엔진을 다시 돌려,
      이음매 줄(앞 2줄 · 뒤 줄)이 달라지는 것만 갈래로 남긴다 · 같은 소리면 하나로 묶고 어떤 고름에서 나오는지 적는다. 예시 멘트 칩은 기본값 그대로(md 와 같은 약속). */
const JI = process.argv.indexOf('--json');
if (JI > 0) {
  const JOUT = process.argv[JI + 1];
  const fileOf = (c) => { if (!c.file) return ''; for (const d of ['narration', 'cast']) { const r = `assets/audio/${d}/${c.file}.mp3`; if (fs.existsSync(path.join(ROOT, r))) return r; } return ''; };
  const lineOf = (c) => ({ no: c.no || '', slug: c.slug || '', f: fileOf(c), t: c.text || '', g: +c.gapMs || 0, fire: c.fire || '',
    live: c.live && c.live.t ? { t: c.live.t, est: +c.live.est || 0 } : null, silent: !c.text && SILENT[c.actId] ? SILENT[c.actId] : '' });
  const VAR = [['기본', () => {}]];
  [['식사 없음', {}], ['카페 · 다과', { meal: 1 }], ['식사 · 예약 없음', { meal: 1, mealFull: 1 }], ['식사 · 예약', { meal: 1, mealFull: 1, resv: 1 }]]
    .forEach(([n, o]) => VAR.push([n, (S) => { delete S.meal; delete S.mealFull; delete S.resv; Object.assign(S, o); }]));
  [['gdad', '신랑 아버님'], ['bdad', '신부 아버님'], ['gmom', '신랑 어머님'], ['bmom', '신부 어머님'], ['other', '그 밖의 분']].forEach(([t, n]) => ['yes', 'no'].forEach((y) =>
    VAR.push([`선언 ${n}${y === 'yes' ? ' · 첫 덕담도' : ' · 덕담 따로'}`, (S) => { S.declTitle = t; S.declBless = y; if (O.declBlessKey) S.declBlessKey = O.declBlessKey(S); }])));
  ['speech', 'video', 'gift', 'etc'].forEach((v) => VAR.push([`축사 자리 · ${(O.CHIPS.free.find((x) => x[0] === v) || [v, v])[1]}`, (S) => { O.setChip(S, 'free', v); }]));
  VAR.push(['두 분 목소리', (S) => { S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; }]);
  ['mothers', 'fathers', 'others'].forEach((w) => VAR.push([`화촉 ${{ mothers: '어머님', fathers: '아버님', others: '다른 두 분' }[w]}`, (S) => { S.candleWho = w; }]));
  Object.keys(O.CHIPS).filter((k) => ['letter', 'tribute', 'toast', 'entryScene'].includes(k)).forEach((k) => O.CHIPS[k].forEach(([v, n]) => VAR.push([`${{ letter: '편지', tribute: '부모님께 인사', toast: '축배', entryScene: '입장 뒤' }[k]} · ${n}`, (S) => { O.setChip(S, k, v); }])));
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((e) => VAR.push([`입장 멘트 ${e}`, (S) => { S.entry = e; }]));
  VAR.push(['서약 · 감사 서약', (S) => { S.vowKind = 'thanks'; }]);
  VAR.push(['축가 · 두 분이 직접', (S) => { S.songBy = 'self'; }]);
  const seamOf = (on, fx) => { const S = stateOf(on); try { fx(S); } catch (e) { return null; }
    const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); return Array.isArray(r) ? r : (r.cues || []); };
  const out = list.map((j, i) => {
    const id = 'J' + String(i + 1).padStart(2, '0'); const groups = new Map();
    VAR.forEach(([nm, fx]) => { const cues = seamOf(j.rep, fx); if (!cues) return; const ia = []; const ib = [];
      cues.forEach((c, x) => { if (c.k === j.a) ia.push(x); }); if (!ia.length) return;
      const after = ia[ia.length - 1]; for (let x = after + 1; x < cues.length && ib.length < 2; x++) { if (cues[x].k === j.b) ib.push(x); else break; }
      if (!ib.length) return;   // 이 고름에선 두 순간이 붙지 않는다
      const left = ia.slice(-2).map((x) => lineOf(cues[x])), right = ib.map((x) => lineOf(cues[x]));
      const sig = JSON.stringify([left, right].map((s) => s.map((l) => [l.slug, l.g, l.f, l.t])));
      const g = groups.get(sig); if (g) g.lab.push(nm); else groups.set(sig, { lab: [nm], left, right }); });
    return { id, a: j.a, b: j.b, an: NAME(j.a), bn: NAME(j.b), p: +(j.p * 100).toFixed(1), n: j.n, music: `${slotTxt(j.a)} → ${slotTxt(j.b)}`,
      url: link(j.rep, j.b === 'guest' ? '' : j.b), br: [...groups.values()] };
  });
  fs.writeFileSync(JOUT, JSON.stringify({ courses: courses.length, n: out.length, vars: VAR.length, list: out }));
  console.log(`JSON ${JOUT} · 이음매 ${out.length} · 갈래 ${out.reduce((a, x) => a + x.br.length, 0)}(고름 ${VAR.length}가지를 한 가지씩 바꿔 봄)`);
}
console.log(`OK ${path.relative(ROOT, OUT)} · 코스 ${courses.length} · 이음매 ${list.length}`);
