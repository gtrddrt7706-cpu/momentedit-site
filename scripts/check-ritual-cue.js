#!/usr/bin/env node
/**
 * check-ritual-cue.js — 큐 엔진(assets/ritual-cue.js) 회귀 검사
 * [CUE_GUARD_V1]
 *
 * 이 파일이 지키는 것:
 *  1) §3-A 21큐 전수 판정표 — damback+bless=on 이 수동 10 / 자동 10 이고 수동 번호가 정확히 그 10개
 *  2) CUE_FIRE_RULE  — "앞 큐에 live(사람 구간)가 있으면 manual, 없으면 chain"
 *  3) EXTRA_MIRROR   — ritual-cue.js가 들고 있는 문안 사본이 build-dubbing-script.mjs 원본과 verbatim 동일
 *  4) 5코스 × 확장축 전 조합이 예외 없이 build 되고 필수 필드가 채워진다
 *  5) FILES 51개 · 중복 없음 · 번호(인덱스+1)와 파일명이 어긋나지 않는다
 *
 * merge-guard.sh 가 호출한다. 실패하면 exit 1.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));

let fail = 0;
const ok = (m) => console.log('ok  cue: ' + m);
const no = (m) => { console.log('REVERT? cue: ' + m); fail = 1; };

/* ── 1. FILES 무결성 ───────────────────────────────────────── */
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
//   veil 슬러그 3개(veil-mother/father/close)가 빠져 54 → 51이 됐다.
if (C.FILES.length !== 59) no(`FILES 59개가 아니다 (${C.FILES.length})`);
else if (new Set(C.FILES).size !== 59) no('FILES에 중복 슬러그가 있다');
else ok('FILES 51개 · 중복 없음');

// 번호는 인덱스+1. fileOf/noOf가 이 규칙에서 벗어나면 클립 파일명이 통째로 어긋난다.
{
  const s = C.FILES[15];                       // 16번 = narr-ring-out
  if (C.noOf(s) !== '16' || C.fileOf(s) !== '16_narr-ring-out') {
    no(`번호 매핑 어긋남: ${s} → ${C.noOf(s)} / ${C.fileOf(s)}`);
  } else ok('번호 매핑 (인덱스+1)');
}

/* ── 2. §3-A 21큐 전수 판정표 ──────────────────────────────── */
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
const A3_MANUAL = ['01', '05', '12', '14', '16', '20', '24', '45', '47', '52'];
//                  guest-1  entry-A  welcome-out  vow-out  ring-out  letter-end  bless-end  farewell  goodbye  entry-out
const A3_CLOCK = ['02', '03', '04'];
//                 guest-2-10min · guest-3-5min · guest-4-1min
const A3_CHAIN = ['11', '13', '15', '30', '27', '23', '26', '44'];
//                 welcome-in  vow-in  ring-in  declare-1-solemn  letter-parent  bless-mid  close  end-0-photo
{
  const r = C.build({ course: 'damback', bless: 'on' }, { mode: 'console' });
  const got = (f) => r.cues.filter((c) => c.fire === f).map((c) => c.no).sort().join(',');
  const want = (a) => a.slice().sort().join(',');

  if (r.cues.length !== 21) no(`§3-A: 21큐가 아니다 (${r.cues.length})`);
  else if (got('manual') !== want(A3_MANUAL)) no(`§3-A 수동 큐 불일치\n    got  ${got('manual')}\n    want ${want(A3_MANUAL)}`);
  else if (got('clock') !== want(A3_CLOCK)) no(`§3-A 시각고정 큐 불일치 (${got('clock')})`);
  else if (got('chain') !== want(A3_CHAIN)) no(`§3-A 체인 큐 불일치\n    got  ${got('chain')}\n    want ${want(A3_CHAIN)}`);
  else ok('§3-A 21큐 전수 판정표 (수동 10 / 자동 10)');

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
  course: ['damback', 'gamdong', 'family', 'minimal', 'festive'],
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
                      //   그 자리들이 옳은지는 위 §3-A 21큐 판정표 검사가 이미 고정하고 있다.
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
    'narr-valley-wine': 'move', 'tribute-in': 'move', 'narr-song': 'sing'
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
  else ok('코스 5종 큐 수 정상 범위');
}

if (fail) {
  console.log('── 큐 엔진 역전 의심: assets/ritual-cue.js 를 되돌리거나 위 항목을 고쳐라');
  process.exit(1);
}
console.log('CUE ENGINE OK');
