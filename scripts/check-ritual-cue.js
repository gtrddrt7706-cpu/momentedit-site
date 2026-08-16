#!/usr/bin/env node
/**
 * check-ritual-cue.js — 큐 엔진(assets/ritual-cue.js) 회귀 검사
 * [CUE_GUARD_V1]
 *
 * 이 파일이 지키는 것:
 *  1) §3-A 전수 판정표 — 「약속」 코스가 수동 13 / 자동 8 / 시각고정 3 이고 번호가 정확히 그것
 *  2) CUE_FIRE_RULE  — "앞 큐에 live(사람 구간)가 있으면 manual, 없으면 chain"
 *  3) EXTRA_MIRROR   — ritual-cue.js가 들고 있는 문안 사본이 build-dubbing-script.mjs 원본과 verbatim 동일
 *  4) 전 코스 × 확장축 전 조합이 예외 없이 build 되고 필수 필드가 채워진다
 *  5) FILES 78개 · 중복 없음 · 번호(인덱스+1)와 파일명이 어긋나지 않는다
 *
 * merge-guard.sh 가 호출한다. 실패하면 exit 1.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const D = require(path.join(ROOT, 'assets/ritual-data.js'));

let fail = 0;
const ok = (m) => console.log('ok  cue: ' + m);
const no = (m) => { console.log('REVERT? cue: ' + m); fail = 1; };

/* ── 1. FILES 무결성 ───────────────────────────────────────── */
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
//   veil 슬러그 3개(veil-mother/father/close)가 빠져 54 → 51이 됐다.
// [AFTER_PARTY 2026-08-08] 예식 뒤 30분 클립 16개 추가(전환 6 + 골라 트는 판 10) → 59 → 75.
// [TOAST_SCENE 2026-08-09] 축배·케이크 장면화로 2개 추가(toast-both-b · narr-cake-out) → 77.
// [PHOTO_COUNT 2026-08-09] 단체촬영 셔터 신호 1개 추가(fx-count) → 78.
//   ★목록 끝에 붙였다 — 번호가 인덱스+1이라 중간에 끼우면 기존 음원이 전부 개명된다.
// [ENTRY_OUT_TONE 2026-08-11] 도착 직후 닫는 말을 입장 느낌 B~F 로 나눠 5개 추가 → 83.
//   ★이번에 실제로 당했다 — 처음엔 'narr-cake-out' **옆에** 끼웠다. 읽기 좋으라고 그랬는데,
//     그 뒤에 있던 fx-count 가 78 → 83 으로 밀리고 이미 녹음된 78_fx-count.mp3 가 제 번호를 잃었다.
//     새 클립이 78 을 가져가 **한 번호에 두 소리**가 됐다. 위 두 줄이 경고하던 바로 그 사고다.
//   ★「목록 끝」은 「비슷한 것 옆」이 아니라 **파일의 마지막 줄**이다. 다음 사람도 여기서 읽고 가길.
// [PHOTO_ASK 2026-08-16] 사진 부탁 2개 추가(84_narr-photo-ask · 85_narr-photo-send) → 85.
//   ★맨 끝에 붙였다 — 위 ENTRY_OUT_TONE 이 실제로 당한 그 사고를 안 되풀이한다.
const N_FILES = 85;
if (C.FILES.length !== N_FILES) no(`FILES ${N_FILES}개가 아니다 (${C.FILES.length})`);
else if (new Set(C.FILES).size !== N_FILES) no('FILES에 중복 슬러그가 있다');
else ok(`FILES ${N_FILES}개 · 중복 없음`);

// 번호는 인덱스+1. fileOf/noOf가 이 규칙에서 벗어나면 클립 파일명이 통째로 어긋난다.
{
  const s = C.FILES[15];                       // 16번 = narr-ring-out
  if (C.noOf(s) !== '16' || C.fileOf(s) !== '16_narr-ring-out') {
    no(`번호 매핑 어긋남: ${s} → ${C.noOf(s)} / ${C.fileOf(s)}`);
  } else ok('번호 매핑 (인덱스+1)');
}

/* ── 2. §3-A 전수 판정표 ──────────────────────────────────── */
// ★번호는 FILES 순서에서 파생된다(인덱스+1) — 클립을 중간에 끼우면 그 뒤가 통째로 +1 밀린다.
//   2026-08-01 narr-bless-end-long(25번) 삽입으로 25 이상이 한 칸씩 이동했다. 판정 자체는 그대로다.
//   슬러그를 함께 적어 둔다 — 다음에 밀릴 때 "무엇이 무엇이 됐는지"를 다시 추적하지 않게.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
//   veil 슬러그 3개가 36번 자리에서 빠져 36번 이상이 통째로 -3 밀렸다(48→45 · 50→47 · 47→44).
//   판정 자체는 그대로다 — 담백 코스에 베일이 없었으므로 수동 10 / 자동 10도 변하지 않는다.
// [LEAD_OUT 2026-08-07] 입장에 닫는 말(52 narr-entry-out)이 생겼다.
//   ★수동 큐 **수는 그대로 10개**다 — 11(welcome-in)이 수동에서 자동으로 내려오고 52가 그 자리에 온다.
//     닫는 말은 사람의 시간 뒤에 붙고, 디렉터의 누름은 이미 거기 있었다. 현장 조작 횟수 변화 0.
//     이 숫자가 늘어나면 그건 설계가 깨진 것이다 — 그때 이 검사가 먼저 화를 낸다.
// [THREE_COURSES · EVENT_BUDGET 2026-08-07] 담백에서 첫인사·덕담·와인/케이크가 팔레트로 내려갔다.
//   21큐 → 17큐. ★수동이 10에서 8로 준 것은 설계대로다 — 사라진 세 순간이 각각
//   '사람의 시간'을 갖고 있었고, 그 뒤에 붙던 수동 누름이 함께 사라졌다(12 welcome-out · 24 bless-end,
//   그리고 valley 는 담백에서 빠지며 판정표에 없던 큐가 통째로 빠졌다).
//   ★이 표는 **얼어붙은 스냅샷**이다. 규칙 자체(앞에 live 가 있으면 manual)는 아래 3번이 전 조합으로 지킨다.
//     여기 숫자가 흔들리면 "코스 모양이 바뀌었다"는 뜻이고, 의도한 변경인지 사람이 봐야 한다.
// [AFTER_PARTY 2026-08-08] 뒤에 전환 6큐가 붙어 17 → 22큐. 수동 8 → 11.
//   늘어난 수동 셋(60·61·63)은 **사람의 시간 뒤**다 — 전체컷 뒤 · 불러 모으는 구도 뒤 · 인사 라운드 뒤.
//   디렉터가 어차피 그 자리에 서 있는 순간이라 조작이 새로 생긴 게 아니다.
//   65(마지막 닫는 말)는 연출 촬영 뒤라 같은 이유. 45(배웅)는 종전대로.
// [GATHER_WAIT 2026-08-08] 44(전체 하객컷)가 chain 에서 manual 로 내려왔다 — 폐식 클립이
//   "모두 앞으로 나와 주세요"로 바뀌면서 사람이 모이는 시간(live)이 생겼기 때문이다.
//   수동 11 → 12. ★조작이 는 게 아니라, 30초 타이머로 자동으로 나가던 것이 사람 판단으로 바뀐 것이다.
/* [TOAST_DEFAULT 2026-08-09] 「약속」 기본에 축배가 들어왔다 → 22큐 → 24큐.
   늘어난 둘: 40 toast-toast(chain · 문안 뒤 사람 구간) · 56 narr-toast-out(manual · 받아 닫는 말).
   ★숫자만 맞추지 말 것 — 어느 큐가 어떤 방식으로 발사되는지가 이 표의 값이다. */
/* [WELCOME_DEFAULT 2026-08-14] 「약속」 기본에 첫인사가 들어왔다 → 24큐 → 26큐.
   늘어난 둘: 11 narr-welcome-in(chain · 입장 닫는 말 뒤 바로) · 12 narr-welcome-out(manual · 두 분이
   말을 마치는 때를 사람만 안다). ★수동이 13 → 14 로 하나 늘었다 — 이건 설계대로다.
   첫인사는 '사람의 시간'이고, 사람의 시간 뒤에는 언제나 수동 누름이 붙는다(위 LEAD_OUT 주석과 같은 규칙).
   ★두 큐 다 예전부터 엔진에 있었다 — 담백에서 첫인사가 팔레트로 내려가며 빠져 있었을 뿐이다
     (THREE_COURSES 주석의 '12 welcome-out' 이 그것). 되돌아온 것이지 새로 생긴 것이 아니다. */
const A3_MANUAL = ['01', '05', '52', '12', '14', '16', '20', '56', '44', '60', '61', '63', '65', '47'];
//                  guest-1 entry-A entry-out welcome-out vow-out ring-out letter-end toast-out photo(전체컷) photo-split round-open final-warn photo-out goodbye
const A3_CLOCK = ['02', '03', '04'];
//                 guest-2-10min · guest-3-5min · guest-4-1min
const A3_CHAIN = ['11', '13', '15', '30', '27', '40', '26', '64', '45'];
//                 welcome-in vow-in ring-in declare-1-solemn letter-parent toast close final-call farewell
{
  const r = C.build({ course: 'damback' }, { mode: 'console' });   // 코스 기본 그대로 — 덕담은 이제 팔레트라 켜서 재지 않는다
  const got = (f) => r.cues.filter((c) => c.fire === f).map((c) => c.no).sort().join(',');
  const want = (a) => a.slice().sort().join(',');

  if (r.cues.length !== 26) no(`§3-A: 26큐가 아니다 (${r.cues.length})`);
  else if (got('manual') !== want(A3_MANUAL)) no(`§3-A 수동 큐 불일치\n    got  ${got('manual')}\n    want ${want(A3_MANUAL)}`);
  else if (got('clock') !== want(A3_CLOCK)) no(`§3-A 시각고정 큐 불일치 (${got('clock')})`);
  else if (got('chain') !== want(A3_CHAIN)) no(`§3-A 체인 큐 불일치\n    got  ${got('chain')}\n    want ${want(A3_CHAIN)}`);
  else ok(`§3-A 26큐 전수 판정표 (수동 ${A3_MANUAL.length} / 자동 ${A3_CHAIN.length} / 시각고정 ${A3_CLOCK.length})`);

  // 반지 마무리 → 성혼 선언 사이 '페이드 8초 + 침묵 3초' 시간 고정 (대본 153~159행)
  const ro = r.cues.find((c) => c.slug === 'narr-ring-out');
  const okFix = ro && ro.post && ro.post.length === 2 &&
    ro.post[0].ms === C.PARAM.declare.preFadeMs && ro.post[1].wait === C.PARAM.declare.silenceMs;
  if (!okFix) no('반지→선언 시간 고정(페이드 8초+침묵 3초)이 사라졌다');
  else ok('반지→선언 시간 고정');
}

/* ── 3. CUE_FIRE_RULE 불변 (전 조합) ───────────────────────── */
/* ── 4. 전 조합 build 스모크 ───────────────────────────────── */
const AX = {
  /* ★[AXIS_FROM_SOURCE 2026-08-07] 코스 축은 원천에서 읽는다 — 손으로 적힌 5종이었다.
     실사고: 기록형(record)을 COURSES 에 넣었는데 이 줄을 못 고쳐, 전수 검사가 그 코스를
     통째로 건너뛰었다(초록인데 안 본 것). 목록을 두 군데 적으면 한쪽만 낡는다. */
  course: Object.keys(D.COURSES),
  entry: ['A', 'B', 'C', 'D', 'E', 'F'],
  declareWho: ['narr', 'ask', 'family', 'chorus'],
  declare: ['1', '2'],
  letter: ['parent', 'each', 'both'],
  bless: ['on', 'off'],
  valley: ['none', 'wine', 'cake'],
  guestVoice: ['nar', 'couple'],
  digital: [true, false]
};
const DOING_OK = new Set(['say', 'move', 'sing']);
{
  let n = 0, ruleBad = 0, fieldBad = 0, doingBad = 0, firstErr = '', firstDoing = '';
  for (const course of AX.course)
    for (const entry of AX.entry)
      for (const declareWho of AX.declareWho)
        for (const declare of AX.declare)
          for (const letter of AX.letter)
            for (const bless of AX.bless)
              for (const valley of AX.valley)
                for (const guestVoice of AX.guestVoice)
                  for (const digital of AX.digital) {
                    n++;
                    const S = { course, entry, declareWho, declare, letter, bless, valley, guestVoice, digital };
                    let r;
                    try {
                      r = C.build(S, { mode: 'console' });
                    } catch (e) {
                      fieldBad++; if (!firstErr) firstErr = `build 예외 ${JSON.stringify(S)} — ${e.message}`;
                      continue;
                    }
                    if (!r.cues.length) { fieldBad++; if (!firstErr) firstErr = `빈 큐 ${JSON.stringify(S)}`; continue; }
                    for (let i = 0; i < r.cues.length; i++) {
                      const c = r.cues[i], prev = r.cues[i - 1];
                      // 필수 필드. slug은 chorus(녹음 클립 없음)만 예외로 비어도 된다.
                      if (!c.name || !c.fire || typeof c.est !== 'number') {
                        fieldBad++; if (!firstErr) firstErr = `필드 누락 ${c.slug || c.name} ${JSON.stringify(S)}`;
                      }
                      if (!c.slug && c.k !== 'declare') {
                        fieldBad++; if (!firstErr) firstErr = `슬러그 없음 ${c.name} ${JSON.stringify(S)}`;
                      }
                      // ★LIVE_DOING — 사람이 직접 채우는 자리는 '무엇을 하는지'를 반드시 밝힌다.
                      //   빠지면 화면이 입장·반지 교환 같은 동작 자리에까지 "직접 말하는 시간입니다"를 띄운다.
                      if (c.live && c.live.self && !DOING_OK.has(c.live.doing)) {
                        doingBad++;
                        if (!firstDoing) firstDoing = `${c.no || '—'} ${c.slug || c.name}: doing=${c.live.doing || '없음'} · "${c.live.t}"`;
                      }
                      // CUE_FIRE_RULE — 규칙이 계산하는 자리에만 적용한다.
                      //   식전 4큐(guest) · 입장(entry)은 엔진이 fire를 직접 박는 자리다.
                      //   앞 큐의 live로는 표현되지 않는 대기(신부 준비 완료 등)라서 규칙 밖이고,
                      //   그 자리들이 옳은지는 위 §3-A 22큐 판정표 검사가 이미 고정하고 있다.
                      //   (식전 안내 2클립은 guest 뒤에 붙지만 규칙이 계산하는 자리다)
                      // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
                      const pinned = (i === 0 || c.k === 'entry' ||
                        (c.k === 'guest' && c.blockN !== '식전 안내'));
                      if (pinned) {
                        if (c.fire === 'chain') {
                          ruleBad++;
                          if (!firstErr) firstErr = `고정 자리가 체인이 됐다 ${c.no || '—'} ${c.slug || c.name} ${JSON.stringify(S)}`;
                        }
                      } else {
                        const want = (prev && prev.live) ? 'manual' : 'chain';
                        if (c.fire !== want) {
                          ruleBad++;
                          if (!firstErr) firstErr = `FIRE_RULE 위반 ${c.no || '—'} ${c.slug || c.name}: ${c.fire} (want ${want}) ${JSON.stringify(S)}`;
                        }
                      }
                    }
                  }
  if (fieldBad) no(`전 조합 필드 검사 실패 ${fieldBad}건 — ${firstErr}`);
  else ok(`전 조합 build ${n}종 무예외 · 필수 필드 채움`);
  if (ruleBad) no(`CUE_FIRE_RULE 위반 ${ruleBad}건 — ${firstErr}`);
  else ok(`CUE_FIRE_RULE 불변 (${n}종 전수)`);
  if (doingBad) no(`LIVE_DOING 누락 ${doingBad}건 — ${firstDoing}\n    → live.self를 붙였으면 doing: 'say'|'move'|'sing' 도 같이 적어야 한다.`);
  else ok(`LIVE_DOING 전수 표기 (${n}종)`);
}

/* ── 4-B. 말/동작 분류 고정 ────────────────────────────────── */
// 입장·반지 교환에 "직접 말하는 시간"이 뜨던 실사고(2026-07-31)를 다시 못 내게 못 박는다.
{
  const WANT = {
    'entry-A': 'move', 'narr-ring-in': 'move', 'ringwarm-family': 'move',
    'narr-welcome-in': 'say', 'narr-vow-in': 'say', 'letter-parent': 'say', 'narr-bless-mid': 'say',
    /* [WINE_RETIRED 2026-08-16] narr-valley-wine 제외 — 사이 순서 폐지로 어떤 조합에서도 안 나온다. */
    'tribute-in': 'move', 'narr-song': 'sing'
  };
  const seen = {};
  for (const course of AX.course)
    for (const bless of ['on', 'off'])
      for (const valley of AX.valley)
        for (const tribute of ['flower'])
          C.build({ course, bless, valley, tribute, ringwarm: 'family', song: 'live', extra: { song: 1, valley: 1 } }, { mode: 'console' })
            .cues.forEach((c) => { if (c.live && WANT[c.slug]) seen[c.slug] = c.live.doing; });
  const bad = Object.keys(WANT).filter((s) => seen[s] && seen[s] !== WANT[s]);
  const gone = Object.keys(WANT).filter((s) => !seen[s]);
  if (bad.length) no(`말/동작 분류가 뒤집혔다: ${bad.map((s) => `${s} ${seen[s]}≠${WANT[s]}`).join(' · ')}`);
  else if (gone.length > 3) no(`분류 고정 대상 큐가 사라졌다 (${gone.join(', ')}) — 검사가 헛돌고 있다`);
  else ok(`말/동작 분류 고정 (${Object.keys(WANT).length - gone.length}개 대조)`);
}

/* ── 5. preview 모드 — 사람이 안 눌러도 끝까지 간다 ────────── */
{
  const p = C.build({ course: 'damback', bless: 'on' }, { mode: 'preview' });
  const stuck = p.cues.filter((c, i) => i > 0 && c.fire !== 'chain');
  if (stuck.length) no(`preview에 자동이 아닌 큐가 있다 (${stuck.map((c) => c.no).join(',')}) — 미리듣기가 멈춘다`);
  else if (!p.cues[0] || p.cues[0].fire !== 'manual') no('preview 첫 큐가 manual이 아니다 — 브라우저 자동재생 정책에 막힌다');
  else if (!p.cues.some((c) => c.manualInConsole)) no('preview가 manualInConsole 표식을 잃었다');
  else ok('preview 모드 (첫 큐만 수동 · 나머지 자동 · 수동 표식 보존)');

  const over = p.cues.filter((c) => c.live && c.live.est > C.PARAM.previewLiveCap);
  if (over.length) no(`preview 사람 구간이 ${C.PARAM.previewLiveCap}초를 넘는다 (${over.length}건)`);
  else ok(`preview 사람 구간 ${C.PARAM.previewLiveCap}초 압축`);

  // 침묵·페이드가 안 줄면 폐식 뒤 30초 대기 같은 자리에서 미리듣기가 끊긴 것처럼 보인다.
  const slow = p.cues.filter((c) => (c.post || []).some((s) => (s.wait || 0) > C.PARAM.previewWaitMs || (s.ms || 0) > C.PARAM.previewWaitMs));
  if (slow.length) no(`preview 뒤처리 대기가 ${C.PARAM.previewWaitMs}ms를 넘는다 (${slow.map((c) => c.no).join(',')})`);
  else ok(`preview 뒤처리 ${C.PARAM.previewWaitMs}ms 압축`);

  // console 모드는 반대로 원래 길이를 지켜야 한다(리허설의 목적이 타이밍 체감이라서).
  const cc = C.build({ course: 'damback', bless: 'on' }, { mode: 'console' });
  const shrunk = cc.cues.some((c) => (c.post || []).some((s) => s.fullWait || s.fullMs));
  if (shrunk) no('console 모드까지 압축됐다 — 현장 타이밍이 어긋난다');
  else ok('console 모드 원래 길이 유지');
}

/* ── 6. EXTRA_MIRROR — 문안 사본이 원본과 갈라지지 않았는가 ── */
{
  const src = fs.readFileSync(path.join(ROOT, 'scripts/build-dubbing-script.mjs'), 'utf8');
  const miss = Object.keys(C.EXTRA).filter((k) => typeof C.EXTRA[k] !== 'string' || src.indexOf(C.EXTRA[k]) < 0);
  if (miss.length) {
    no(`EXTRA_MIRROR 갈라짐 — build-dubbing-script.mjs에 없는 문안: ${miss.join(', ')}\n` +
      '    → 대본 문안을 고쳤으면 assets/ritual-cue.js의 EXTRA도 같이 고쳐야 한다(원본은 대본 생성기).');
  } else ok(`EXTRA_MIRROR ${Object.keys(C.EXTRA).length}건 verbatim 일치`);
}

/* ── 7. 코스별 큐 수가 0이거나 폭주하지 않는가 ─────────────── */
{
  const bad = [];
  for (const course of AX.course) {
    const m = C.build({ course }, { mode: 'console' }).meta;
    if (m.total < 10 || m.total > 40) bad.push(`${course}=${m.total}`);
    if (m.manual < 5 || m.manual > 20) bad.push(`${course} manual=${m.manual}`);
  }
  if (bad.length) no(`코스별 큐 수 이상 (${bad.join(' ')})`);
  else ok(`코스 ${AX.course.length}종 큐 수 정상 범위`);
}

/* ★★[ROUND_FIT] 「다 함께」 사람 구간 합이 그 코스에 남은 시간을 넘지 않는가.
   2026-08-09 실측으로 이 검사를 만들었다 — DAY_PLAN 으로 다 함께가 36~44 → 30~39분이 됐는데
   엔진의 라운드 est 는 20분으로 박혀 있어 digital 조합에서 **39.5분**이 나왔다.
   화면(마이페이지)에서는 상한을 내려 밀도의 함정을 막아 놓고 엔진에서는 그대로 빠져 있었다.
   ★검사가 없으면 이런 건 당일에야 드러난다 — 라운드가 끝나기 전에 배웅 시간이 오는 식으로. */
{
  const IN = ['narr-close', 'end-0-photo', 'narr-photo-split', 'narr-round-open',
    'narr-online-in', 'narr-final-warn', 'narr-final-call', 'narr-photo-out'];
  const SUM = D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell;
  const over = [], thin = [];
  for (const k of Object.keys(D.COURSES).filter((x) => !D.COURSES[x].hidden)) {
    for (const dg of [true, false]) {
      const S = C.norm({ course: k }); S.digital = dg;
      const r = C.build(S); const cues = Array.isArray(r) ? r : (r.cues || []);
      const t = cues.filter((c) => IN.includes(c.slug));
      const live = t.reduce((a, c) => a + ((c.live && c.live.est) || 0), 0) / 60;
      const budget = SUM - D.MIN.base[k];
      const rc = t.find((c) => c.slug === 'narr-online-in') || t.find((c) => c.slug === 'narr-round-open');
      const round = (((rc && rc.live && rc.live.est) || 0) - (dg ? 120 : 0)) / 60;
      if (live > budget) over.push(`${k}/digital=${dg} 사람 ${live.toFixed(1)}분 > 예산 ${budget}분`);
      if (round < 10) thin.push(`${k}/digital=${dg} 라운드 ${round.toFixed(1)}분`);
    }
  }
  if (over.length) no(`다 함께가 남은 시간을 넘는다 — ${over.join(' · ')}`);
  else if (thin.length) no(`라운드가 10분 아래다(인사가 성립하지 않는다) — ${thin.join(' · ')}`);
  else ok(`다 함께 전 조합이 예산 안 (합 ${SUM}분 기준)`);
}

/* ★★[ROUND_EXACT 2026-08-09] 위 검사는 '넘지 않는가'만 본다. 여기서는 **정확히 맞는가**를 본다.
   2패스는 "남는 시간을 전부 라운드에 준다"는 규칙이라, 결과는 부등식이 아니라 **등식**이어야 한다:
       블록 est 합 + 나레이션 말 시간(120초) == 예산
   ★왜 부등식으로는 부족한가 — 두 가지 드리프트가 '넘지 않으면서' 조용히 들어온다.
     ①캐리어 슬러그가 바뀌면 라운드가 아무 큐에도 안 실린다 → 합이 예산보다 **모자란다**.
       화면엔 아무 일도 없고, 당일에 '다 함께'가 예정보다 일찍 끝나 배웅까지 빈다.
     ②고정 자리 큐를 새로 넣고 엔진의 IN 목록에 안 넣으면 fixed 가 그만큼 작게 잡혀
       라운드가 그만큼 크게 계산된다 → 합이 예산을 **넘는다**(하한 600 이 걸린 경우와 구분이 안 된다).
   ★★위 검사의 IN 목록을 그대로 복제하지 않는다 — 그러면 손계산을 없앤 자리에 손목록이 하나 더 생겨
     엔진과 검사가 같은 실수를 함께 한다. 여기서는 **큐 순서**로 창을 잡는다:
     'narr-close'(폐식 직후)부터 '배웅' 블록 직전까지. 두 시선이 어긋나면 그때 빨개진다. */
{
  const SUM = D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell;
  const TALK = 120;                     // 엔진이 빼 두는 나레이션 말 시간(초) — 같은 값이어야 한다
  const FLOOR = 600;                    // 라운드 하한(초) · 이게 걸리면 등식이 깨지는 게 정상이다
  const bad = [];
  let combos = 0;
  for (const k of Object.keys(D.COURSES).filter((x) => !D.COURSES[x].hidden)) {
    for (const dg of [true, false]) {
      const S = C.norm({ course: k }); S.digital = dg;
      const r = C.build(S); const cues = Array.isArray(r) ? r : (r.cues || []);
      const from = cues.findIndex((c) => c.slug === 'narr-close');
      const to = cues.findIndex((c, i) => i > from && c.blockN === '배웅');
      if (from < 0 || to < 0) { bad.push(`${k}/digital=${dg} 창을 못 잡았다(narr-close ${from} · 배웅 ${to}) — 슬러그·블록 이름이 바뀌었다`); continue; }
      const win = cues.slice(from, to);
      const sum = win.reduce((a, c) => a + ((c.live && c.live.est) || 0), 0);
      const want = (SUM - D.MIN.base[k]) * 60;
      const carrier = win.find((c) => c.slug === (dg ? 'narr-online-in' : 'narr-round-open'));
      const round = (carrier && carrier.live && carrier.live.est || 0) - (dg ? TALK : 0);
      combos++;
      if (sum + TALK === want) continue;
      if (sum + TALK > want && round <= FLOOR) continue;   // 하한이 걸려 넘친 것은 위 검사가 따로 신고한다
      bad.push(`${k}/digital=${dg} 합 ${sum}+${TALK} = ${sum + TALK}초 ≠ 예산 ${want}초`
        + ` (${sum + TALK > want ? '초과' : '미달'} ${Math.abs(want - sum - TALK)}초`
        + ` · 라운드 ${round}초 · 창 ${win.length}큐)`);
    }
  }
  if (bad.length) {
    no(`2패스가 예산을 정확히 채우지 못한다 — 라운드가 실릴 큐를 못 찾았거나 고정 자리 큐가 엔진 목록 밖에 있다\n    ${bad.join('\n    ')}`);
  } else ok(`2패스가 예산을 정확히 채운다 (${combos}조합 · 합+말시간 ${TALK}초 = 예산)`);
}

/* ★[POST_LIVE_DUCK 2026-08-16 · 코워크가 판정을 요청한 자리] post 로 올린 음량을 live 가 도로 내리는 모양.
   코워크 물음: *"narr-close 의 post 가 -8 로 올린 걸 live 가 1.2초 만에 -12 로 되돌린다. 의도인가 사고인가."*
   ★사고였다. 세어서 확정했다 — post 로 음량을 «올리면서» live 가 있는 큐 12개 중 11개(entry-A~F)가
     `live.duck` 을 post 목표값과 같게 **명시**한다. narr-close 하나만 명시가 없어
     ritual-cue.js 의 `if (c.live && c.live.duck === undefined) c.live.duck = c.duck` 이 조용히 채웠다.
   ★이 검사는 그 «조용한 채움»의 지문을 본다 — live.duck 이 clip duck 과 같은데 post 목표는 다른 모양.
     한 큐를 고치는 것으로는 다음에 또 난다. 자동 채움이 있는 한 이 자리는 계속 생긴다.
   ★일부러 올렸다 내리고 싶다면? runPost 는 st.ms 를 다 기다린 뒤 live 로 넘어가므로(console.html)
     그건 «2초 올렸다가 1.2초 내리는 혹»이지 음악적 몸짓이 아니다. 원한다면 post 에 wait 을 넣어
     머무는 시간을 주고 live.duck 을 명시하라 — 그러면 이 검사도 통과한다. */
{
  const seen = new Map();
  for (const co of Object.keys(D.COURSES)) for (const M of ['console', 'preview']) {
    let r; try { r = C.build({ course: co }, { mode: M }); } catch (e) { continue; }
    for (const c of r.cues) {
      const ups = (c.post || []).filter((p) => p.music === 'to');
      if (!ups.length || !c.live) continue;
      seen.set(c.slug + '|' + M, { c, target: ups[ups.length - 1].v, M });
    }
  }
  const bad = [];
  for (const { c, target, M } of seen.values()) {
    if (c.live.duck === target) continue;                       // 올린 값을 그대로 지킨다
    if (c.live.duck !== c.duck) continue;                       // 다른 값을 «일부러» 적었다면 사람의 뜻이다
    bad.push(`${c.slug}/${M} — post 가 ${target}dB 로 올리는데 live.duck 이 clip 과 같은 ${c.duck}dB 다`
      + ` (자동 채움의 지문 · live ${c.live.est || '?'}초 동안 도로 내려간다)`);
  }
  if (bad.length) no(`post 가 올린 음량을 live 가 도로 내린다 [POST_LIVE_DUCK]\n    ${bad.join('\n    ')}`);
  else ok(`post 로 올린 음량을 live 가 지킨다 (${seen.size}자리) [POST_LIVE_DUCK]`);
}

if (fail) {
  console.log('── 큐 엔진 역전 의심: assets/ritual-cue.js 를 되돌리거나 위 항목을 고쳐라');
  process.exit(1);
}
console.log('CUE ENGINE OK');
