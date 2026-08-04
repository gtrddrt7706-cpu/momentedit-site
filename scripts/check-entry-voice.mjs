#!/usr/bin/env node
// [ENTRY_VOICE] 화면에 적힌 사람이 **실제로 그 목소리로 들리는가** (2026-08-05)
//
// 왜 이 검사가 있나
//   check-entry-alt.mjs 는 글자를 본다 — 원천·화면·성우 대본·조립표가 같은 말을 하는지.
//   그런데 그 넷이 전부 초록인 채로 **소리만 한 사람**일 수 있다. 실제로 그랬다:
//   화면·대본·표가 "신랑 한 문장, 신부 한 문장"이라 말하는 동안 여섯 클립 전부 신부 목소리였다.
//   붙여넣기를 한 사람 자리로만 돌리거나, 받은 wav 를 잘못된 순서로 모으면 그대로 재발한다.
//   ★글자 검사는 그걸 **원리적으로** 못 잡는다 — 소리를 열어 봐야만 아는 사실이다.
//
// 무엇을 보나
//   1. 문장 사이 무음으로 클립을 나눈다 → 조각 수가 manifest 문장 수와 같아야 한다
//      (다르면 순서가 밀렸거나 문장이 빠진 것 — 그 상태로는 화자 대조 자체가 무의미하다)
//   2. 조각마다 기본 주파수(F0) 중앙값을 잰다
//   3. 역할별로 모아 중앙값을 낸 뒤, **두 역할이 충분히 갈리는지**(≥40Hz)와
//      **모든 조각이 자기 역할 쪽에 붙는지**를 본다
//
// ★남자 몇 Hz · 여자 몇 Hz 를 적어 넣지 않는다 — 성우가 바뀌는 날 검사만 낡은 사람을 지킨다.
//   받은 소리에서 두 무리를 스스로 만들어 놓고, 각 조각이 제 무리에 붙는지만 본다(자가 보정).
//
// ★소리가 아직 없으면 조용히 건너뛴다 — 붙여넣기 전에는 잴 것이 없고, 없는 것을 실패로
//   울리면 사람이 검사를 안 믿게 된다. 있는데 어긋난 것만 실패다.
//
// 실행: node scripts/check-entry-voice.mjs   (merge-guard.sh 가 호출)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (p) => path.join(ROOT, p);
const SR = 16000;
const MIN_SPLIT = 40;      // 두 역할 중앙값이 이만큼은 갈려야 "두 사람"이라 부른다(Hz)

let fail = 0;
const ok = (m, cond, extra) => {
  console.log((cond ? 'ok ' : 'FAIL ') + m);
  if (!cond) { fail = 1; if (extra) String(extra).split('\n').forEach((l) => console.log('   ' + l)); }
};
const has = (c) => spawnSync(c, ['-version'], { stdio: 'ignore' }).status === 0;
if (!has('ffmpeg')) { console.log('skip check-entry-voice (ffmpeg 없음)'); process.exit(0); }

const man = JSON.parse(fs.readFileSync(R('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
// 겹친 역할('신랑|신부')이면서 합성이 아닌 클립 — 한 클립 안에서 화자가 갈리는 자리
const targets = man.clips.filter((c) => !c.mix && String(c.role).includes('|'));
if (!targets.length) { console.log('skip check-entry-voice (문장별 화자가 갈리는 클립 없음)'); process.exit(0); }

const mp3 = (c) => R(`assets/audio/cast/${c.no}_${c.file}.mp3`);
const live = targets.filter((c) => fs.existsSync(mp3(c)));
if (!live.length) { console.log(`skip check-entry-voice (${targets.length}클립 음원 아직 없음 — 재더빙 대기)`); process.exit(0); }

// ── 소리 읽기
const pcm = (file, ss, to) => {
  const a = ['-v', 'quiet'];
  if (ss != null) a.push('-ss', String(ss));
  if (to != null) a.push('-to', String(to));
  a.push('-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-');
  const r = spawnSync('ffmpeg', a, { maxBuffer: 1 << 28 });
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
};

// ── F0: 40ms 프레임 자기상관 중앙값 (70~400Hz · 무성·비주기 구간은 버린다)
const f0 = (x) => {
  const n = Math.round(0.04 * SR), h = Math.round(0.02 * SR);
  const lo = Math.floor(SR / 400), hi = Math.floor(SR / 70);
  const out = [];
  for (let i = 0; i + n < x.length; i += h) {
    let s = 0, m = 0;
    for (let j = 0; j < n; j++) { s += x[i + j] * x[i + j]; m += x[i + j]; }
    if (Math.sqrt(s / n) < 0.01) continue;                       // 너무 조용하면 말이 아니다
    m /= n;
    let a0 = 0; for (let j = 0; j < n; j++) { const v = x[i + j] - m; a0 += v * v; }
    let best = 0, bk = 0;
    for (let k = lo; k < hi && k < n; k++) {
      let a = 0;
      for (let j = 0; j + k < n; j++) a += (x[i + j] - m) * (x[i + j + k] - m);
      if (a > best) { best = a; bk = k; }
    }
    if (!bk || best < 0.3 * a0) continue;                        // 주기성이 약하면 모음이 아니다
    out.push(SR / bk);
  }
  if (out.length < 8) return null;
  out.sort((a, b) => a - b);
  return out[out.length >> 1];
};

// ── 문장 경계
// ★문턱값 하나로 자르지 않는다. 조립기가 넣은 문장 사이 무음은 0.55초쯤이지만, 성우가 쉼표에서
//   쉬는 0.3초짜리 숨도 같은 '무음'이다. 둘 사이에 선을 그으려고 숫자를 손으로 정하면
//   성우가 바뀌거나 문장이 길어지는 날 그 숫자만 낡는다(실제로 0.27초로 잡았더니 6클립 중 2개가
//   쉼표를 문장 경계로 셌다 — 18_entry-A 0.310초 · 23_entry-F 0.291초).
// ★그래서 **이미 아는 문장 수**를 쓴다 — manifest 가 몇 문장인지 말해 준다.
//   무음을 낮은 문턱으로 전부 주워 놓고, 작은 것부터 이어 붙여 구간 수가 문장 수와 같아질 때 멈춘다.
//   그리고 '경계로 남은 가장 작은 무음'이 '이어 붙인 가장 큰 무음'보다 뚜렷이 큰지 확인한다 —
//   안 뚜렷하면 조용히 찍지 말고 애매하다고 말한다(찍은 답으로 초록을 내면 검사가 거짓말을 한다).
const gapSent = ((man.gap || {}).sent) || 0.45;
const segs = (file, want) => {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', file,
    '-af', 'silencedetect=noise=-40dB:d=0.15', '-f', 'null', '-'], { encoding: 'utf8' });
  const log = (r.stderr || '') + (r.stdout || '');
  const dur = Number((/^\s*Duration:\s*(\d+):(\d+):([\d.]+)/m.exec(log) || []).slice(1)
    .reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0)) || null;
  const starts = [...log.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((x) => Number(x[1]));
  const ends = [...log.matchAll(/silence_end:\s*([\d.]+)/g)].map((x) => Number(x[1]));
  // 무음을 빼고 남는 말 구간들 (앞뒤 여백은 자연히 빠진다)
  // ★이음매의 크기는 '총 길이'가 아니라 **가장 긴 한 덩어리 무음**으로 잰다.
  //   우리가 넣은 문장 사이 무음은 끊김 없는 한 덩어리(0.55초)다. 반면 성우가 쉼표에서 쉬면
  //   0.2초 숨 · 아주 짧은 소리 · 0.3초 숨 처럼 여러 덩어리로 온다 — 총 길이만 보면 0.53초라
  //   진짜 경계(0.57초)와 구분이 안 된다(23_entry-F 실제 사례). 덩어리로 보면 0.29 대 0.57로 갈린다.
  let seg = [], gaps = [];
  let cur = 0, pend = 0;
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = (ends[i] != null && !Number.isNaN(ends[i])) ? ends[i] : s;
    if (s > cur + 0.15) { if (seg.length) gaps.push(pend); seg.push([cur, s]); pend = e - s; }
    else pend = Math.max(pend, e - s);        // 숨과 숨 사이의 찰나 — 무음으로 흡수하되 덩어리 크기는 최대값
    cur = e;
  }
  if (dur && dur > cur + 0.15) { if (seg.length) gaps.push(pend); seg.push([cur, dur]); }
  if (seg.length < want) return { err: `말 구간이 ${seg.length}개뿐입니다 — 문장 ${want}개를 채우지 못합니다(문장이 빠졌거나 붙어 있습니다)` };

  // 작은 무음부터 이어 붙여 구간 수를 문장 수에 맞춘다
  const merged = [];
  while (seg.length > want) {
    let k = 0, min = Infinity;
    gaps.forEach((g, i) => { if (g < min) { min = g; k = i; } });
    merged.push(min);
    seg = seg.slice(0, k).concat([[seg[k][0], seg[k + 1][1]]], seg.slice(k + 2));
    gaps = gaps.slice(0, k).concat(gaps.slice(k + 1));
  }
  const kept = gaps.length ? Math.min(...gaps) : Infinity;
  const big = merged.length ? Math.max(...merged) : 0;
  if (seg.length > 1 && kept < big + 0.12) {
    return { err: `문장 경계가 애매합니다 — 경계로 삼은 무음 ${kept.toFixed(2)}초가 문장 안 숨 ${big.toFixed(2)}초와 구분되지 않습니다` };
  }
  return { seg, kept, big };
};

// ── 잰다
const rows = [];
const bad = [];
for (const c of live) {
  const f = mp3(c);
  const sg = segs(f, c.sents.length);
  if (sg.err) { bad.push(`${c.no}_${c.file}: ${sg.err}`); continue; }
  sg.seg.forEach(([a, b], i) => {
    const role = c.sents[i].role || c.role;
    const v = f0(pcm(f, a, b));
    if (v == null) { bad.push(`${c.no}_${c.file} ${i + 1}번째 문장: 음높이를 못 쟀습니다(너무 짧거나 조용함)`); return; }
    rows.push({ id: `${c.no}_${c.file}`, i: i + 1, role, v });
  });
}
ok(`입장 ${live.length}클립 · 문장 경계가 대본 문장 수와 일치`, bad.length === 0, bad.join('\n'));
if (!rows.length) { console.log('FAIL 잰 문장이 없습니다'); process.exit(1); }

const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const roles = [...new Set(rows.map((r) => r.role))];
const C = {};
roles.forEach((r) => { C[r] = med(rows.filter((x) => x.role === r).map((x) => x.v)); });
roles.forEach((r) => {
  const vs = rows.filter((x) => x.role === r).map((x) => Math.round(x.v));
  console.log(`   ${r}  ${vs.length}문장 · 중앙 ${Math.round(C[r])}Hz · 범위 ${Math.min(...vs)}~${Math.max(...vs)}Hz`);
});

// 두 무리가 갈리는가 — 안 갈리면 "한 사람이 다 읽었다"는 뜻이다(원래 사고가 정확히 이것이다)
const gapHz = roles.length === 2 ? Math.abs(C[roles[0]] - C[roles[1]]) : 0;
ok(`두 화자의 목소리가 갈림 (${roles.join(' ↔ ')} 중앙값 차 ${Math.round(gapHz)}Hz ≥ ${MIN_SPLIT})`,
  roles.length === 2 && gapHz >= MIN_SPLIT,
  '한 사람이 전부 읽었거나, 두 자리에 같은 보이스가 배정됐습니다.\n대본은 번갈아인데 소리는 한 사람 — 화면에 적힌 사람과 들리는 목소리가 다릅니다.');

// 조각마다 제 무리에 붙는가 — 순서가 한 칸 밀리면 여기서 전부 터진다
const off = rows.filter((r) => {
  const mine = Math.abs(r.v - C[r.role]);
  return roles.some((o) => o !== r.role && Math.abs(r.v - C[o]) < mine);
});
ok(`${rows.length}문장 전부 대본이 말한 화자 쪽 목소리`, off.length === 0,
  off.map((r) => `${r.id} ${r.i}번째: 대본은 ${r.role}인데 ${Math.round(r.v)}Hz — ${roles.find((o) => o !== r.role)} 쪽에 가깝습니다`).join('\n')
  + (off.length ? '\n받은 파일 순서가 밀렸을 수 있습니다. 타입캐스트에서 다시 받아 --clip R-entry- 로 조립하세요.' : ''));

process.exit(fail);
