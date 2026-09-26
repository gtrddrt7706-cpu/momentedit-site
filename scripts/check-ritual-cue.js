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
// [ROUND_MID 2026-09-12] 인사 사진 «가운데» 안내 1개 추가(86_narr-round-mid) → 86.
//   그 구간 라이브가 1020초(17분)인데 그동안 스피커에서 한 마디도 안 나갔다(flow-shape.js 실측).
// [TOAST_NONE 2026-09-20 사장님 확정 「친구부분멘트 아예 삭제」] 축사 없음 안내 1개(87_narr-toast-none) → 87.
//   배역 15_toast(하객대표 7문장)를 폐지하고 그 자리를 «왜 없는지» 한 줄로 닫는다.
//   ★맨 끝에 붙였다 — 위 ENTRY_OUT_TONE 이 실제로 당한 그 사고를 안 되풀이한다.
//   ★79_narr-entry-out-B 도 같은 커밋에서 폐지했지만 **FILES 에는 남는다** — RETIRED 로만 끈다.
//     그래서 이 숫자는 86 → 87 «늘기만» 한다. 폐지가 숫자를 줄이면 뒤 번호가 밀린다.
// [MEAL_GUIDE 2026-09-23] 식사 자리 안내 1개(88_guide-meal) → 88. ★맨 끝에 붙였다(코워크 표의 «87» 은 이미 쓰는 번호다).
const N_FILES = 109;   // [CLOSE_BOW 2026-09-26] 108 narr-close-bow · [GROUP_PHOTO 2026-09-26] 109 fx-free 가 맨 끝에 붙었다
/* ★[PAD3 2026-09-25] 번호는 «인덱스+1» 그대로여야 한다 — 두 자리로 자르면 100 이 «00», 107 이 «07» 이 된다(실제로 그랬다). */
{
  const bad3 = C.FILES.filter((f, i) => C.noOf(f) !== String(i + 1).padStart(2, '0'));
  if (bad3.length) { console.log(`REVERT? cue: [PAD3] 번호가 인덱스+1 과 다르다 — ${bad3.slice(0, 3).map((f) => f + '→' + C.noOf(f)).join(' · ')}`); process.exitCode = 1; }
  else console.log(`ok cue: [PAD3] 번호 ${C.FILES.length}개 모두 인덱스+1 (마지막 ${C.noOf(C.FILES[C.FILES.length - 1])})`);
}   // [OPEN_COURSE 2026-09-25] 새 코스 새 줄 11개(89~99)
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
/* ★[WELCOME_OUT_DROP 2026-09-20] 12(welcome-out) 를 큐에서 빼자 **수동 누름이 13 으로 옮겨갔다.**
   자리가 사라진 게 아니다 — 11(welcome-in) 뒤에 «두 분이 직접 인사»하는 사람 구간이 있고,
   그게 끝나면 디렉터가 다음 큐를 누른다. 종전엔 12 가 그 자리였고 이제 13(vow-in)이다.
   ★수동 큐 **수는 그대로 14개**다. 줄어든 게 아니라 한 칸 밀린 것이다 —
     수만 보고 「설계대로」라고 넘기지 말 것(위 67~74행이 같은 함정을 적어 뒀다). */
/* ★★[CLAP_GO · LOOK_HOLD · CLOSE_BOW 2026-09-26 사장님 · 코워크 회신5] 26큐 → 27큐 · 수동 14 → 17.
   늘어난 셋은 전부 **사람 순간 뒤**다 — 설계대로다(누름이 새로 생긴 게 아니라 «시계로 밀던 것»이 «보고 누르는 것»이 됐다):
     11 welcome-in  : 입장 뒤 첫 모습(바라보기 6초 · 맞절 8초) — 종전엔 52 뒤 2초 만에 저절로 나갔다(4-1)
     27 letter-parent: 선언 뒤 박수 — 종전엔 8초 고정 대기 뒤 저절로(3-1)
     26 narr-close   : 끝 선언 · 목례 · 마지막 박수 뒤(4-2) · 그 앞 108(끝 선언)은 56 뒤 체인 */
/* ★★[GROUP_PHOTO · NO_TABLE_ROUND 2026-09-26 사장님 결정 · 코워크 회신 9/26 2-5] 27큐 → 24큐 · 수동 17 → 16.
     빠진 셋: 61 round-open(테이블 인사) · 63 final-warn · 64 final-call(마지막 한 장 — 첫 전체 사진에 합침).
     45 farewell 은 체인 → 수동 — 앞 65(자유 사진)에 사람 구간이 생겨 디렉터가 «자유 사진이 끝나면» 누른다. */
const A3_MANUAL = ['01', '05', '52', '11', '13', '14', '16', '27', '20', '56', '26', '44', '60', '65', '45', '47'];
//                  guest-1 entry-A entry-out vow-in vow-out ring-out letter-end toast-out photo(전체컷) photo-split round-open final-warn photo-out goodbye
const A3_CLOCK = ['02', '03', '04'];
//                 guest-2-10min · guest-3-5min · guest-4-1min
/* ★[WELCOME_OUT_DROP] 13(vow-in)이 체인에서 «수동»으로 올라갔다 — 12 가 빠진 자리를 이어받았다.
   ★[TOAST_NONE] 87(narr-toast-none)이 체인으로 들어왔다 — 편지 뒤에 이어 붙어 축배를 연다.
     사람이 누를 자리가 아니다. 편지가 끝나면 바로 「오늘은 축사를 따로 두지 않았습니다」가 흐르고
     이어서 축배가 시작된다. 그 사이에 누름을 두면 «왜 멈췄지» 하는 빈 자리가 생긴다. */
const A3_CHAIN = ['15', '30', '87', '40', '108'];
//                 welcome-in ring-in declare-1-solemn letter-parent toast-none toast close final-call farewell
{
  const r = C.build({ course: 'damback' }, { mode: 'console' });   // 코스 기본 그대로 — 덕담은 이제 팔레트라 켜서 재지 않는다
  const got = (f) => r.cues.filter((c) => c.fire === f).map((c) => c.no).sort().join(',');
  const want = (a) => a.slice().sort().join(',');

  if (r.cues.length !== 24) no(`§3-A: 24큐가 아니다 (${r.cues.length})`);
  else if (got('manual') !== want(A3_MANUAL)) no(`§3-A 수동 큐 불일치\n    got  ${got('manual')}\n    want ${want(A3_MANUAL)}`);
  else if (got('clock') !== want(A3_CLOCK)) no(`§3-A 시각고정 큐 불일치 (${got('clock')})`);
  else if (got('chain') !== want(A3_CHAIN)) no(`§3-A 체인 큐 불일치\n    got  ${got('chain')}\n    want ${want(A3_CHAIN)}`);
  else ok(`§3-A 27큐 전수 판정표 (수동 ${A3_MANUAL.length} / 자동 ${A3_CHAIN.length} / 시각고정 ${A3_CLOCK.length})`);

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
                      // [PREVIDEO_AT_4 2026-09-25] 식전 영상은 본식 시작 4분 전 시각고정(clock) — 03 과 04 사이에 엔진이 직접 박는다.
                      const pinned = (i === 0 || c.k === 'entry' || c.k === 'prevideo' ||
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
  /* ★★[EXTRA_SOURCE 2026-09-12] 이 검사의 목적은 «두 사본이 갈라지지 않는 것»이다.
     그런데 사본을 아예 «없애면» 갈라질 수가 없다 — 그게 더 나은 상태다. 실제로 두 번 당했다:
       [ASK_SOURCE] 응답형 선언 셋 · [TIC_CUT] end-2-goodbye — 둘 다 원천을 고쳤는데
       생성기의 하드코딩 사본이 옛 글을 들고 manifest 를 먹어, 글에서만 고쳐지고 소리엔 그대로였다.
     그래서 생성기가 RC.EXTRA['키'] 로 «읽게» 바꿨다. 그 줄이 있으면 사본이 없는 것이므로 통과다.
     ★문자열을 손으로 적어 둔 키는 종전대로 verbatim 대조한다 — 사본이 남아 있는 한 검사는 유효하다.
     ★이 완화를 «전부 통과»로 넓히지 말 것. 참조하는 키만 면제된다. */
  /* 생성기 «소스»에 문자열이 있으면 사본이 남아 있는 것이니 종전대로 대조하고,
     없으면 생성기가 만든 «산출물»(더빙_녹음_대본_최종.txt)에 그 문안이 실제로 실렸는지 본다.
     참조 형태를 하나씩 열거하면(RC.EXTRA · D.DECLWHO · D.NARR …) 새 경로가 생길 때마다 샌다.
     산출물을 보면 경로와 무관하게 «소리로 나갈 글이 같은가»를 바로 판정한다. 그게 원래 의도다. */
  let out = '';
  try { out = fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/더빙_녹음_대본_최종.txt'), 'utf8'); } catch (e) { out = ''; }
  const miss = Object.keys(C.EXTRA).filter((k) => {
    /* ★★[RETIRED_EXTRA 2026-09-21] 폐지한 클립은 녹음 대본에 «안 실리는 것이 맞다».
       [ASK_RETIRED] 로 declare-ask-a·c 를 끄자 이 검사가 「생성기에 없는 문안」으로 잡았다 —
       **옳게 고쳤는데 검사가 옛 상태를 요구하는** 자리였다.
       ★문안은 EXTRA 에 남긴다(관례 · 되살릴 근거). 남았다고 녹음까지 해야 하는 것은 아니다.
       ★RETIRED 가 아닌 키는 종전대로 «사본이 같은가»를 본다 — 이 완화를 넓히지 말 것. */
    if ((C.RETIRED || {})[k]) return false;
    const v = C.EXTRA[k];
    if (typeof v !== 'string') return true;
    if (src.indexOf(v) >= 0) return false;          // 사본이 있고 같다
    if (out && out.indexOf(v) >= 0) return false;   // 사본은 없지만 산출물에 실렸다
    return true;
  });
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

/* ★★[ROUND_FIT · ROUND_EXACT · PHOTO_GO2GO 2026-09-26 코워크 최종판 2-5] 단체 사진 창이 «40 − 본식 넉넉 합»을 정확히 채우는가.
   ★옛 두 검사(ROUND_FIT · ROUND_EXACT)는 옛 코스 여섯만 돌았다 — 옛 코스가 모두 숨은(hidden) 뒤로는 **0조합**을 돌고 초록을 냈다
     (2026-09-26 실측 «2패스가 예산을 정확히 채운다 (0조합 …)»). 그래서 새 코스(open)의 예시 넷으로 다시 세운다.
   ★창 = (26, narr-close) 말이 끝난 뒤(«하객이 앞으로 모임»)부터 배웅 GO 직전까지 — 말(c.est)과 사람 구간(live.est)을 모두 센다.
     (108) · (26) 의 말 · 목례 · 박수는 본식(닫는 인사 TIME)에 들어 있어 세지 않는다.
   ★등식이어야 한다 — 자유 사진이 최소(120초)에 걸리지 않은 조합은 «창 합 = 예산»이 한 초도 어긋나면 안 된다.
     최소에 걸린 조합은 넘는 것이 맞다(그날은 뒤에 고른 구도부터 준다 · 마이페이지가 k 로 미리 알린다). */
{
  const SUM = D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell;
  const O = require('../assets/ritual-open.js');
  const bad = [], thin = [];
  let combos = 0, fits = 0;
  for (const ex of O.EXAMPLES) for (const dg of [false, true]) for (const pn of [undefined, 1, 2, 3, 5]) for (const pw of [undefined, 0, 1, 2]) {
    const S = O.applyExample({ course: 'open' }, ex.k); S.course = 'open'; S.digital = dg;
    if (pn !== undefined) S.photoN = pn; if (pw !== undefined) S.photoWishN = pw;
    const r = C.build(C.norm(S)); const cues = Array.isArray(r) ? r : (r.cues || []);
    const from = cues.findIndex((c) => c.slug === 'narr-close');
    const to = cues.findIndex((c, i) => i > from && c.blockN === '배웅');
    const tag = `${ex.k}/온라인=${dg ? 1 : 0}/구도=${pn === undefined ? '?' : pn}/요청=${pw === undefined ? '?' : pw}`;
    if (from < 0 || to < 0) { bad.push(`${tag} 창을 못 잡았다(narr-close ${from} · 배웅 ${to}) — 슬러그 · 블록 이름이 바뀌었다`); continue; }
    const win = cues.slice(from + 1, to);
    const sum = ((cues[from].live && cues[from].live.est) || 0) + win.reduce((a, c) => a + (c.est || 0) + ((c.live && c.live.est) || 0), 0);
    const want = (SUM - Math.round(O.bodySec(S)[1] / 60)) * 60;
    const out = cues.find((c) => c.slug === 'narr-photo-out');
    const goFree = out && out.live && out.live.goFree;
    combos++;
    if (!out || !goFree) { bad.push(`${tag} 자유 사진 큐(65, narr-photo-out)가 남는 시간을 못 받았다`); continue; }
    win.forEach((c) => { if (c.live && c.live.est < 10) thin.push(`${tag} ${c.slug} 사람 구간 ${c.live.est}초`); });
    if (goFree > 120) { fits++; if (sum !== want) bad.push(`${tag} 창 ${sum}초 ≠ 예산 ${want}초(${sum > want ? '초과' : '미달'} ${Math.abs(sum - want)}초)`); }
    else if (sum < want) bad.push(`${tag} 자유 사진이 최소인데 창 ${sum}초가 예산 ${want}초보다 짧다`);
  }
  if (bad.length) no(`단체 사진 창이 예산과 어긋난다 [PHOTO_GO2GO]\n    ${bad.slice(0, 8).join('\n    ')}`);
  else if (thin.length) no(`사진 구간 사람 시간이 10초 아래다(목표보다 말이 길다) — ${thin.slice(0, 4).join(' · ')}`);
  else ok(`단체 사진 창 = 40 − 본식 넉넉 합 (${combos}조합 · 등식 ${fits} · 나머지는 자유 사진 최소 120초) [PHOTO_GO2GO]`);
}

/* ★★[WISH_COUNT · PHOTO_GO2GO 2026-09-26 코워크 최종판 2-6] 엔진의 사진 목표와 마이페이지 상수가 같은 셈인가.
   마이페이지는 ritual-cue.js 를 읽지 않는다 — 숫자로 둔다. 그래서 둘을 여기서 맞댄다(SLOT_CLOCK 과 같은 방식).
     전체 하객 = PHOTO_ALL(6) + 요청 수 · 가족 구도 = PHOTO_PER(3) × 구도 · 온라인 = PHOTO_ONLINE(2) · 자유 사진 최소 = PHOTO_PRE(2)
   그리고 모를 때의 가정(요청 둘 · 구도 둘)이 ritual-open.js SHORT_MIN(16 = 8 + 6 + 2)과 같은가. */
{
  const O = require('../assets/ritual-open.js');
  const mp = fs.readFileSync(path.join(__dirname, '..', 'mypage.html'), 'utf8');
  const m = mp.match(/var PHOTO_DAY=(\d+), PHOTO_PRE=(\d+), PHOTO_ALL=(\d+), PHOTO_PER=(\d+), PHOTO_ONLINE=(\d+);/);
  const bad = [];
  if (!m) bad.push('mypage.html 에서 «var PHOTO_DAY=…, PHOTO_ONLINE=…;» 줄을 못 찾았다');
  else {
    const [, DAYM, PRE, ALL, PER, ONL] = m.map(Number);
    const SUM = D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell;
    if (DAYM !== SUM) bad.push(`PHOTO_DAY ${DAYM} ≠ DAY 합 ${SUM}`);
    const goal = (S) => { const r = C.build(C.norm(S)); const cs = Array.isArray(r) ? r : r.cues; const by = {}; cs.forEach((c) => { by[c.slug] = c; });
      const g = (by['narr-close'] && by['narr-close'].live && by['narr-close'].live.est) || 0;
      const t = (k, pre) => by[k] ? (pre || 0) + by[k].est + by[k].live.est : 0;
      return { all: t('end-0-photo', g), per: t('narr-photo-split'), onl: t('narr-online-in'), free: by['narr-photo-out'].live.goFree }; };
    const base = O.applyExample({ course: 'open' }, 'brief'); base.course = 'open';
    for (const w of [0, 1, 2]) { const q = goal(Object.assign({}, base, { photoWishN: w, photoN: 1 })); if (q.all !== (ALL + w) * 60) bad.push(`요청 ${w}: 엔진 전체 하객 ${q.all}초 ≠ 마이페이지 (${ALL} + ${w})분`); }
    for (const n of [1, 2, 3]) { const q = goal(Object.assign({}, base, { photoWishN: 0, photoN: n })); if (q.per !== PER * 60 * n) bad.push(`구도 ${n}: 엔진 ${q.per}초 ≠ 마이페이지 ${PER}분 × ${n}`); }
    { const q = goal(Object.assign({}, base, { digital: true, photoWishN: 0, photoN: 1 })); if (q.onl !== ONL * 60) bad.push(`온라인 인사: 엔진 ${q.onl}초 ≠ 마이페이지 ${ONL}분`); }
    { const fam = O.applyExample({ course: 'open' }, 'family'); fam.course = 'open'; const q = goal(Object.assign(fam, { photoWishN: 2, photoN: 5 })); if (q.free !== PRE * 60) bad.push(`자유 사진 최소: 엔진 ${q.free}초 ≠ 마이페이지 두 분 숨 고르기 ${PRE}분`); }
    { const q = goal(Object.assign({}, base)); const unk = q.all + q.per; if (unk + PRE * 60 !== O.SHORT_MIN * 60) bad.push(`모를 때 가정: 전체 ${q.all} + 구도 ${q.per} + 숨 고르기 ${PRE * 60} = ${unk + PRE * 60}초 ≠ SHORT_MIN ${O.SHORT_MIN}분`); }
  }
  if (bad.length) no(`엔진 사진 목표와 마이페이지 · SHORT_MIN 이 갈렸다 [WISH_COUNT]\n    ${bad.join('\n    ')}`);
  else ok(`엔진 사진 목표 = 마이페이지 상수 · 모를 때 가정 = SHORT_MIN [WISH_COUNT]`);
}

/* ★★[PHOTO_CAP_40 · WISH_COUNT · NO_ZERO_SHOT 2026-09-26 코워크 최종판 2-6] 마이페이지 단체 사진 표 — 예시 넷 + 가장 긴 조합 × 요청 0 · 2.
   마이페이지의 photoCapOf · photoCapLine 을 **그 파일에서 꺼내** 돌린다(손으로 옮긴 사본을 재지 않는다 · RULE_MEASURED).
   가장 긴 조합 = 전부 + 준비한 순서 3분 + 인사 1분쯤씩 + 편지 부모님께. 경계에 선 칸(약속 요청 0 · 가장 긴 조합)은
   엔진 초가 바뀌면 움직일 수 있다 — 그때는 코워크 표와 함께 이 표를 고친다(최종판 «구현 뒤 게이트 값이 기준»). */
{
  const O = require('../assets/ritual-open.js');
  const mp = fs.readFileSync(path.join(__dirname, '..', 'mypage.html'), 'utf8');
  const bad = [];
  const pick = (re, nm) => { const m = mp.match(re); if (!m) bad.push(`mypage.html 에서 ${nm} 를 못 찾았다`); return m ? m[0] : ''; };
  const src = [pick(/var PHOTO_WISH_MAX=2;[^\n]*/, 'PHOTO_WISH_MAX'), 'function wishClean(){ return []; } var PHOTOFLOW={};',
    pick(/var PHOTO_MAX=5;[^\n]*/, 'PHOTO_MAX'), pick(/var PHOTO_DAY=\d+[^\n]*/, 'PHOTO_DAY'),
    pick(/function photoCapOf\(rd, dig, wishN\)\{[\s\S]*?\n\}/, 'photoCapOf(rd, dig, wishN)'), pick(/function photoCapLine\(c\)\{[\s\S]*?\n\}/, 'photoCapLine')].join('\n');
  if (!bad.length) {
    const F = new Function(src + '\nreturn { cap: photoCapOf, line: photoCapLine };')();
    const longest = Object.assign(O.applyExample({}, 'family'), { freeWhat: 'video', freeLen: '3', tributeSay: 'long', letter: 'parent' });
    longest.on = {}; ['candle', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'toast'].forEach((k) => { longest.on[k] = 1; });
    const WANT = [   // [이름, S, 단체 사진 a~b, 요청 0 k/max, 요청 2 k/max] — 최종판 2-6 표 그대로
      ['기록', O.applyExample({}, 'record'), '23~28', '5/5', '4/5'], ['약속', O.applyExample({}, 'promise'), '20~26', '4/5', '3/5'],
      ['가족', O.applyExample({}, 'family'), '16~23', '2/5', '2/4'], ['간결', O.applyExample({}, 'brief'), '28~32', '5/5', '5/5'],
      ['가장 긴 조합', longest, '9~17', '0/3', '0/2']];
    WANT.forEach(([nm, S, ab, w0, w2]) => {
      const sec = O.bodySec(S), r0 = F.cap({ summary: { sec } }, false, 0), r2 = F.cap({ summary: { sec } }, false, 2);
      const got = [`${r0.a}~${r0.b}`, `${r0.k}/${r0.max}`, `${r2.k}/${r2.max}`];
      if (got.join(' ') !== [ab, w0, w2].join(' ')) bad.push(`${nm}: ${got.join(' · ')} ≠ 표 ${ab} · ${w0} · ${w2}`);
    });
    /* 문장 세 갈래 — k = max · k < max · k = 0 · k = max = 0(짧은 사진 시간을 일부러 만든다) */
    const L = (sec, w) => F.line(F.cap({ summary: { sec } }, false, w));
    const lines = [[O.bodySec(O.applyExample({}, 'record')), 0, '전체 하객과 구도 5개가 알맞아요.'],
      [O.bodySec(O.applyExample({}, 'family')), 0, '전체 하객과 구도 2개가 알맞고, 제시간에 진행되면 5개까지 돼요.'],
      [O.bodySec(longest), 0, '전체 하객 사진이 알맞고, 제시간에 진행되면 구도 3개까지 돼요.'],
      [[30 * 60, 35 * 60], 0, '전체 하객 사진이 알맞아요. 순간을 하나 덜면 가족 구도를 담을 수 있어요.']];
    lines.forEach(([sec, w, want]) => { const g = L(sec, w); if (g !== want) bad.push(`문장: «${g}» ≠ «${want}»`); if (/구도 0개/.test(g)) bad.push(`«구도 0개»가 나왔다: ${g}`); });
    for (let b = 360; b <= 45 * 60; b += 30) for (const w of [0, 1, 2]) { const g = L([b - 300, b], w); if (/구도 0개/.test(g)) { bad.push(`본식 ${b}초 · 요청 ${w}: «구도 0개»`); break; } }
  }
  if (bad.length) no(`마이페이지 단체 사진 표가 최종판 2-6 과 다르다 [PHOTO_CAP_40]\n    ${bad.join('\n    ')}`);
  else ok('마이페이지 단체 사진 표 = 최종판 2-6(예시 넷 + 가장 긴 조합 × 요청 0 · 2) · 문장 네 갈래 · «구도 0개» 없음 [NO_ZERO_SHOT]');
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

/* ── [CLAP_GO 2026-09-26 사장님 · 코워크 회신5 3-1] 박수를 청한 줄 뒤는 디렉터 GO ─────────────
   문안에 «박수를 청하는 말»이 있는데 바로 뒤 큐가 저절로(chain) 나가면 빨강 — 박수가 2초 뒤 여는 말에 묻힌다
   (9/26 전: 24 덕담 마무리 → 서약 · 39 인사 마무리 → 다음 · 104 준비한 순서 맺는 말 → 다음).
   박수 자리는 셋뿐이다([CLAP_FEW] 입장 · 성혼 선언 · 닫는 인사) — 문안이 다시 바뀌어도 이 그물이 되살아나지 못하게 막는다.
   콘솔 모드 · 옛 코스 전 축 + 새 코스(예시 넷 × 선언 · 인사 · 축배 · 붓기 · 준비한 순서 · 첫 모습 판) 전수. */
{
  const O = require(path.join(ROOT, 'assets/ritual-open.js'));
  const CLAP_ASK = /박수(를|로)?\s*(부탁|보내|청|축하)|박수 부탁|큰 박수|박수를 보내|박수로 (답|축하|맞아)|함께 축하해 주세요/;
  const bad = []; let n = 0;
  const check = (S, tag) => {
    const r = C.build(S, { mode: 'console' }); n++;
    for (let i = 0; i < r.cues.length - 1; i++) {
      const c = r.cues[i], nx = r.cues[i + 1];
      if (CLAP_ASK.test(c.text || '') && nx.fire === 'chain') bad.push(`${c.no || '—'} ${c.slug} → ${nx.slug} (chain) · ${tag}`);
    }
  };
  for (const course of AX.course) for (const entry of AX.entry) for (const declareWho of AX.declareWho) for (const declare of AX.declare)
    for (const letter of AX.letter) for (const bless of AX.bless) check({ course, entry, declareWho, declare, letter, bless }, course);
  for (const ex of ['record', 'promise', 'family', 'all'])
    for (const dc of ['solemn', 'warm', 'clap', 'family'])
      for (const tr of ['one', 'long', 'none']) for (const how of ['flower', 'bowGroom'])
        for (const ts of ['both', 'toast', 'cake']) for (const wn of ['mix', 'family', 'none'])
          for (const fr of ['video', 'stage', 'gift', 'speech']) for (const sc of ['look', 'bow']) {
            const S = { course: 'open', on: {} }; O.applyExample(S, ex);
            S.on.free = 1; S.on.bless = 1;
            O.setChip(S, 'declare', dc); O.setChip(S, 'tribute', tr); O.setChip(S, 'toast', ts); O.setChip(S, 'wine', wn); O.setChip(S, 'free', fr);
            S.tribute = how; S.entryScene = sc;
            check(S, `open ${ex}/${dc}/${tr}/${how}/${ts}/${wn}/${fr}/${sc}`);
          }
  const uniq = [...new Set(bad.map((b) => b.split(' · ')[0]))];
  if (bad.length) no(`박수를 청한 줄 뒤가 저절로 나간다 ${bad.length}건 [CLAP_GO]\n    ${uniq.slice(0, 8).join('\n    ')}\n    예) ${bad[0]}`);
  else ok(`박수를 청한 줄 뒤는 늘 디렉터 GO (${n}조합) [CLAP_GO]`);
}

if (fail) {
  console.log('── 큐 엔진 역전 의심: assets/ritual-cue.js 를 되돌리거나 위 항목을 고쳐라');
  process.exit(1);
}
console.log('CUE ENGINE OK');
