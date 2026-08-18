#!/usr/bin/env node
/* 나레이션 합격 기준을 **손이 아니라 기계가** 잰다 [NARR_RULE]
 *
 * ★왜 만드나 — 2026-08-14 대본 개정 R2 에서 **사람이 손으로 센 것이 두 번 틀렸다.**
 *   두 번 다 기준보다 자가 빡빡한 쪽이었고, 그래서 멀쩡한 현행 문안이 붉었다.
 *     1차: 시간어에 `이제·지금`을 계상(기준은 잠시·곧) · N1 을 문장 아닌 문안 단위로 셈 ·
 *          요청 사전이 물음형을 놓쳐 **자기가 새로 쓴 문안이 자기 표를 통과**
 *     2차: 문장을 갈라 3인칭→2인칭으로 가는 구조를 위반으로 셈 — 그건 위반이 아니라 설계다
 *   기준을 고쳐 놓고 자를 사람 손에 남겨 두면 세 번째가 온다. 그래서 문서 밖으로 꺼낸다.
 *
 * 기준 원문: docs/plans/대본개정/00_기획.md §3 (R3 개정본). 여기는 그 **사본**이다 —
 *   자와 기준이 어긋나면 고칠 것은 늘 자다. 기준을 자에 맞추지 말 것.
 *
 * ★이 자가 일부러 **안** 보는 것 (넓히면 멀쩡한 것이 죽는다)
 *   - N2 는 **한 문장 안의 혼용**만 본다. 문장을 갈라 3인칭→2인칭으로 가는 것은 VOICE_2ND 의 설계다
 *     (감정은 하객에게, 동작은 두 분에게). 현행 기준선 `NARV.vow[0]` 이 정확히 그 구조다.
 *   - N4 시간어는 **잠시·곧**뿐이다. `이제·지금`은 대기를 만들지 않는 전환사다.
 *   - ★N7 은 **물음을 재지 않는다.** 재는 것은 ①실시간 관찰 주장과 ②현장의 **답에 반응**하는 말이다.
 *     R3 이 적은 「답을 기다리는 물음은 위반」은 **너무 넓었다** — 그 그물에 `DECLWHO.ask`
 *     (하객이 「네, 그러겠습니다」로 함께 답하는, 승인된 낭독자 갈래)가 통째로 걸린다.
 *     미리 만든 음성이 물어도 되는 이유: **답을 듣고 무언가 하지 않기 때문**이다. 디렉터의
 *     다음 누름이 장면을 넘긴다. 어기는 것은 「그 대답 잘 들었습니다」처럼 답을 받아 쓰는 말이다.
 *     ★이것이 이 라운드의 **세 번째** 과잉이고, 처음으로 자가 아니라 **기준 쪽이 넓었다.**
 *   - N3·N5 는 기계가 못 잰다(감정 설명의 경계 · 듣고 3초). 사전 밖은 사람이 본다 —
 *     이 검사가 초록인 것은 **사전 안에서 초록**이라는 뜻이다. 커버리지가 아니다.
 *
 * 쓰기: node scripts/check-narr-rule.mjs           → 종료 코드 0 통과 / 1 위반
 *       node scripts/check-narr-rule.mjs --report  → 전 문안 실측표(판정 안 함)
 *       node scripts/check-narr-rule.mjs --doc <파일> → **아직 안 들어온 제안 문안**을 같은 자로
 *         (대본개정 문서의 제안 줄만 골라 잰다. 고르기 전에 재라고 만든 입구다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const REPORT = process.argv.includes('--report');

/* ───────── 무엇을 재나 — 당일 스피커로 나가는 말만.
   고객 예시(EXVOW·EXLETTER·EXWEL·ENTRY[].self)는 **다른 기준(C1~C5)** 이라 여기 안 넣는다.
   라벨(d·nm)·연출 안내(how·prep·cue)도 스피커로 안 나간다. */
const NAR_KEYS = new Set(['nar', 'end', 'endLong']);
const WHOLE = new Set(['NARR', 'VOWBOTH', 'NARR_CONSOLE_ONLY']);   // 통째로 나레이션인 가지
const SKIP_TOP = new Set(['EXVOW', 'EXLETTER', 'EXWEL', 'MIN', 'DAY', 'ENTRY_ALT', 'PHOTOCUE']);

const corpus = [];
(function walk(node, trail, whole) {
  if (typeof node === 'string') { if (whole) corpus.push({ id: trail, s: node }); return; }
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    const t = trail ? `${trail}.${k}` : k;
    if (!trail && SKIP_TOP.has(k)) continue;
    if (!trail && WHOLE.has(k)) { walk(node[k], t, true); continue; }
    if (typeof node[k] === 'string') { if (whole || NAR_KEYS.has(k)) corpus.push({ id: t, s: node[k] }); continue; }
    walk(node[k], t, whole);
  }
})(D, '', false);

/* ───────── 문장 쪼개기 — 마침표·물음표·느낌표. 종결부호가 없으면 통째로 한 문장. */
const sentences = (s) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

/* ───────── 요청 사전 — ★물음형을 반드시 포함한다(R2 에서 이걸 빠뜨려 자기 문안이 통과했다).
   「~하시면 됩니다」·「~하셔도 됩니다」는 허락이지 요청이 아니라 넣지 않는다. */
const REQ = /(주세요|주십시오|주시기 바랍니다|주시겠습니까|부탁드립니다|주시면 감사하겠습니다|바랍니다|해 주시길|주시고|주시며)/;
/* 두 분에게 하는 말인지 — 이 말이 문장에 있으면 그 요청의 대상은 두 분이다. */
const TO_COUPLE = /(두 분|신랑|신부)/;
/* 2인칭 명령형(하객 요청체가 아닌, 눈앞의 상대에게 바로 시키는 꼴) */
const IMPER2 = /(주세요|보세요|하세요|서세요|주십시오|바라보아 주세요)/;
/* 시간을 재는 말 — ★이제·지금은 전환사라 안 센다(00_기획 §3 R3 개정) */
const TIMEW = /(잠시|곧)/g;
/* N7 — 현장을 실시간으로 보고 있다는 주장 */
const LIVE = /(저도 지금|지금 보니|방금 보|보시다시피|들리시죠|지금 막 |방금 들어오신|손을 들어 주신)/;
/* N7 — ★현장의 **답에 반응**하는 말. 물음 자체가 아니라 이쪽이 위반이다(아래 R4 주석 참고). */
const ANSWERED = /(그 대답|방금 답해|답해 주신|대답을 들었|대답, 잘 들|대답해 주셔서|그렇게 답해)/;
/* N8 — 수행문은 한 꼴로 고정한다.
   ★재는 것은 **수행문**(두 사람을 부부로 만드는 그 문장)이지 그 뒤의 되짚음이 아니다.
     그래서 ①선언 문안(DECLARE·DECLWHO) 안이거나 ②「신랑 신부」를 불러 선언하는 꼴일 때만 잰다.
     `NARR.declareFamilyOut`(가족이 이미 수행문을 읽은 **뒤**의 닫는 말)은 여기 안 걸린다 —
     걸리게 만들면 30초 안에 같은 선언이 두 번 나오게 된다. 경로가 아니라 **문장의 꼴**로 가른다. */
/* ★★[PERF_CANON_2 2026-08-17 사용자 지시] 표준형에서 **호명(「신랑 신부,」)을 뺐다.**
   > *"신랑 신부, 이제 두 사람은 부부입니다. 이부분이 조금 어색해 자연스럽게 바꾸자"*
   ★규칙을 없앤 것이 아니라 **표준형을 옮긴 것**이다. N8 의 취지(수행문은 한 꼴로 고정한다)는 그대로다 —
     다섯 자리(DECLARE.1·2 · DECLWHO.chorus·ask·family)가 여전히 **같은 한 문장**을 써야 한다.
   ★왜 호명을 뺐나 — 바로 앞 문장이 이미 두 사람 얘기다. 거기서 다시 부르면 낭독이 끊기고
     사회자 대본투가 된다(리서치: 「신랑 ○○○ 군은…」이 업계 표준형이고, 우리는 거기서 벗어난다).
   ★검사를 초록으로 만들려고 고친 것이 아니다 — 표준이 바뀌었으니 표준을 적은 자리를 고친 것이다.
     그 증거로 다섯 자리가 여전히 전수 대조된다(하나만 옛 꼴로 남으면 여기서 붉는다). */
const PERF_CANON = '이제 두 사람은 부부입니다';
const PERF_SNIFF = /부부(입니다|가 되었습니다|가 됩니다)/;
const isDeclare = (id) => /^(DECLARE|DECLWHO)\./.test(id);

/* ───────── ★판정은 **한 곳**에서만 한다.
   종전엔 본문 루프와 자가진단이 같은 규칙을 두 벌 들고 있었다. 그 둘이 갈라지면
   자가진단이 초록인데 본문이 틀린다 — 이 저장소가 여러 번 밟은 「이중 원천」 함정 그대로다.
   반환값은 위반 목록이고, 부르는 쪽(원천 검사·문서 검사·자가진단)이 다 이걸 쓴다. */
export function judge(id, s) {
  const out = [];
  const sent = sentences(s);
  const hit = (rule, why) => out.push({ rule, id, why });
  let reqGuest = 0, reqCouple = 0;

  sent.forEach((x) => {
    /* N1 — 문장 단위: 한 문장에 요청 동작 둘 이상 */
    const n = (x.match(new RegExp(REQ.source, 'g')) || []).length;
    if (n >= 2) hit('N1', `한 문장에 요청 ${n}개 · 「${x.slice(0, 34)}…」`);
    if (n >= 1) { if (TO_COUPLE.test(x)) reqCouple++; else reqGuest++; }

    /* N2 — ★한 문장 안의 혼용만. 3인칭 「두 사람」을 부르며 같은 문장에서 2인칭으로 시키는 꼴.
       같은 문장에 「두 분」이 있으면 부름은 그쪽이 받는다(혼용이 아니다).
       「두 사람에게 큰 박수 부탁드립니다」류는 하객 요청이라 IMPER2 에 안 걸린다. */
    if (/두 사람/.test(x) && !/두 분/.test(x) && IMPER2.test(x)) {
      hit('N2', `한 문장 안 3인칭+2인칭 혼용 · 「${x.slice(0, 34)}…」`);
    }

    /* N7 — ★물음 자체는 안 잰다. 재는 것은 **답에 반응하는 말**이다(R4 개정 · 위 머리말). */
    if (ANSWERED.test(x)) hit('N7', `현장의 답에 반응한다 · 「${x.slice(0, 34)}…」`);

    /* N8 — 수행문 고정 (선언 문안 안 · 또는 「신랑 신부」를 불러 선언하는 꼴)
       ★두 가지를 **갈라서** 말한다. 이름이 틀리면 고치는 사람이 엉뚱한 데를 고친다:
         ㉠ 문안에 표준형이 아예 없다      → 수행문 자체가 다른 꼴이다
         ㉡ 표준형은 있는데 다른 선언이 또  → 되풀이다. 상표가 두 번 찍히면 한 번도 안 찍힌 것과 같다
       ㉡ 은 실제로 B 의 성혼 담백 벌이 밟았다 — 여는 문장이 「…부부가 되었습니다」로 먼저
          선언해 버리고, 바로 다음 문장이 표준 수행문이었다. 현행 `DECLARE.1` 이 같은 자리에서
          「서로의 평생이 되었습니다」를 쓰는 것이 그 회피다. */
    if (PERF_SNIFF.test(x) && (isDeclare(id) || /신랑 신부/.test(x)) && !x.includes(PERF_CANON)) {
      hit('N8', s.includes(PERF_CANON)
        ? `수행문 앞뒤에서 같은 선언을 되풀이한다 · 「${x}」 (표준형은 같은 문안 안에 이미 있다)`
        : `수행문이 표준형과 다르다 · 「${x}」 / 표준 「${PERF_CANON}」`);
    }
  });

  /* N1 보강 — 한 문안이 요구하는 동작은 **대상마다** 둘까지 */
  if (reqGuest > 2) hit('N1', `한 문안에 하객 요청 ${reqGuest}개 (상한 2)`);
  if (reqCouple > 2) hit('N1', `한 문안에 두 분 요청 ${reqCouple}개 (상한 2)`);

  /* N4 — 시간어는 한 문안에 한 번 */
  const tw = (s.match(TIMEW) || []).length;
  if (tw > 1) hit('N4', `시간어 ${tw}회 (상한 1) · ${(s.match(TIMEW) || []).join('·')}`);

  /* N7 — 실시간 관찰 주장 */
  if (LIVE.test(s)) hit('N7', `현장을 실시간으로 본다고 말한다 · 「${s.match(LIVE)[0]}」`);

  out.stat = { len: s.length, sent: sent.length, reqGuest, reqCouple, tw };
  return out;
}

const bad = [];
const rows = [];
for (const { id, s } of corpus) {
  const v = judge(id, s);
  bad.push(...v);
  rows.push({ id, ...v.stat });
}

/* ───────── ★`--doc <파일>` — **아직 안 들어온 후보**를 같은 자로 잰다.
   R4 까지 이 자는 저장소에 이미 들어온 문안만 봤다. 그런데 고르는 일은 **들어오기 전**에 한다 —
   B 가 낸 36벌을 손으로 세면 R2 에서 두 번 틀린 그 자리로 정확히 되돌아간다.
   제안 문안을 가려내는 규칙은 `check-munan-copy.mjs` 와 **같은 모양**이다:
     ① `**숫자.** 본문`                      — 고객 예시(서약·편지) 제안
     ② `**담백|서정|다정**` 줄 바로 아래 `> 본문` — 나레이션 제안
   ★고객 예시(①)는 나레이션이 아니라 **기준이 다르다**(C1~C5). 세되 판정에서 뺀다 —
     여기 넣으면 「서약 예시가 N1 위반」 같은 헛말이 나온다. */
const DOCI = process.argv.indexOf('--doc');
if (DOCI >= 0) {
  const f = process.argv[DOCI + 1];
  if (!f || !fs.existsSync(f)) { console.log(`못 잼: --doc 파일이 없다 (${f || '경로 없음'})`); process.exit(2); }
  let tone = null, sect = '';
  const cands = [];
  fs.readFileSync(f, 'utf8').split('\n').forEach((raw) => {
    const l = raw.trim();
    const h = l.match(/^#{2,4}\s+(.+)$/); if (h) { sect = h[1].replace(/\s+/g, ' ').slice(0, 40); tone = null; return; }
    const t = l.match(/^\*\*(담백|서정|다정|눈물|유머\+진심|짧게)\*\*$/); if (t) { tone = t[1]; return; }
    if (l && !/^>/.test(l) && !/^\*\*\d+\.\*\*/.test(l)) tone = null;
    const m1 = l.match(/^\*\*(\d+)\.\*\*\s+(.+)$/);
    if (m1) { cands.push({ kind: '예시', id: `${sect} #${m1[1]}`, s: m1[2] }); return; }
    if (/^>\s/.test(l) && tone) cands.push({ kind: '나레이션', id: `${sect} · ${tone}`, s: l.replace(/^>\s*/, '') });
  });
  const nar = cands.filter((c) => c.kind === '나레이션');
  console.log(`${path.basename(f)} — 제안 ${cands.length}벌 (나레이션 ${nar.length} · 고객 예시 ${cands.length - nar.length})`);
  console.log('★고객 예시는 기준이 달라(C1~C5) 판정에서 뺀다 — 나레이션만 잰다.\n');
  let n = 0;
  for (const c of nar) {
    const v = judge('DOC.' + c.id, c.s);
    if (!v.length) continue;
    n++;
    console.log(`✗ ${c.id}\n   「${c.s.slice(0, 60)}…」`);
    for (const x of v) console.log(`   ${x.rule} — ${x.why}`);
  }
  console.log(n ? `\n나레이션 ${nar.length}벌 중 ${n}벌이 기준에 걸린다 — 나머지는 취향으로 가른다.`
    : `\n나레이션 ${nar.length}벌 전부 기준 통과 — 전부 취향으로 가른다.`);
  process.exit(0);
}

if (REPORT) {
  console.log(`문안 ${rows.length}벌 실측 (판정 없음)`);
  console.log('문안'.padEnd(34) + '자'.padStart(5) + '문장'.padStart(5) + '하객요청'.padStart(7)
    + '두분요청'.padStart(7) + '시간어'.padStart(6));
  for (const r of rows.sort((a, b) => b.reqGuest + b.tw - (a.reqGuest + a.tw))) {
    console.log(r.id.padEnd(34) + String(r.len).padStart(5) + String(r.sent).padStart(5)
      + String(r.reqGuest).padStart(7) + String(r.reqCouple).padStart(7) + String(r.tw).padStart(6));
  }
  process.exit(0);
}

/* ───────── 자가진단 — 자가 정말 잡는지 먼저 본다.
   ★검사가 아무것도 못 잡는 상태로 초록이면 그건 통과가 아니라 **눈을 감은 것**이다. */
const SELFTEST = [
  ['N1', 'DECLARE.__t', '모두 자리에서 일어나 주시고, 큰 박수도 부탁드립니다.'],
  ['N1', 'X.__t', '일어나 주세요. 앞으로 나와 주시기 바랍니다. 박수 부탁드립니다.'],   // 문안당 상한 2
  ['N2', 'X.__t', '이제 두 사람이 걸어갑니다. 두 사람, 천천히 다가가 주세요.'],
  ['N4', 'X.__t', '잠시 후 시작합니다. 곧 두 사람이 들어옵니다.'],
  ['N7', 'X.__t', '저도 지금 처음 봅니다.'],
  ['N7', 'X.__t', '방금 답해 주신 그 마음으로 이어 가겠습니다.'],
  ['N8', 'DECLARE.__t', '신랑 신부, 이제 두 사람은 부부가 되었습니다.'],   // 옛 호명 꼴 = 이제 위반이다
  ['N8', 'DECLARE.__t', '오늘, 신랑 신부는 모든 분을 증인으로 부부가 되었습니다. 신랑 신부, 이제 두 사람은 부부입니다.'],   // 되풀이
];
/* ★반례도 함께 건다 — 잡아야 할 것만 보는 자는 절반만 재는 자다.
   아래 넷은 **걸리면 안 되는** 것들이고, 넷 다 R2·R3·R4 에서 실제로 잘못 붉었던 꼴이다. */
const SELFPASS = [
  ['N2', 'X.__t', '지금 두 사람 사이에 오갈 말이 있습니다. 두 분, 서로를 마주 보아 주세요.'],   // 문장 분리는 설계다
  ['N4', 'X.__t', '이제 두 사람이 들어옵니다. 지금 문이 열립니다.'],                              // 이제·지금은 시간어가 아니다
  ['N7', 'X.__t', '곁에서 힘이 되어 주시겠습니까?'],                                              // 물음 자체는 위반이 아니다
  ['N8', 'NARR.__t', '선언은 가족의 목소리로 남았습니다. 이제 두 사람은 부부입니다.'],            // 되짚음은 수행문이 아니다
];
/* ★자가진단도 본문과 **같은 `judge`** 를 부른다 — 규칙을 두 벌 들고 있으면
   자가진단만 초록인 날이 온다(이중 원천 함정). 부르는 자리만 다르고 자는 하나다. */
const ruled = (id, s) => judge(id, s).map((v) => v.rule);
const selfFail = [];
for (const [rule, id, s] of SELFTEST) if (!ruled(id, s).includes(rule)) selfFail.push(`${rule} 미검출(잡아야 하는데 놓침) · 「${s}」`);
for (const [rule, id, s] of SELFPASS) if (ruled(id, s).includes(rule)) selfFail.push(`${rule} 오검출(멀쩡한데 붉힘) · 「${s}」`);

const byRule = {};
for (const b of bad) (byRule[b.rule] ||= []).push(b);

console.log(`나레이션 문안 ${corpus.length}벌 · 기준 N1·N2·N4·N7·N8 (00_기획 §3)`);
for (const r of ['N1', 'N2', 'N4', 'N7', 'N8']) {
  const v = byRule[r] || [];
  console.log((v.length ? 'FAIL ' : 'ok   ') + r + ` 위반 ${v.length}건`);
  for (const x of v) console.log(`       ${x.id} — ${x.why}`);
}
if (selfFail.length) { console.log('FAIL 자가진단 — 자가 아무것도 못 잡는다'); selfFail.forEach((x) => console.log('       ' + x)); }
else console.log(`ok   자가진단 ${SELFTEST.length}종 검출 + 반례 ${SELFPASS.length}종 통과 (자가 눈을 뜨고 있고, 멀쩡한 것은 안 붉힌다)`);

console.log('☐ 이 자가 안 보는 것 — N3(감정 설명)·N5(듣고 3초)·N6(그 자리의 사실). 초록은 커버리지가 아니다.');

const rc = (bad.length || selfFail.length) ? 1 : 0;
console.log(rc ? 'NARR RULE FAIL' : 'NARR RULE OK');
process.exit(rc);
