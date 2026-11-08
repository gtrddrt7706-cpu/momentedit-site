#!/usr/bin/env node
/* ★★[NARR_RESET_SPEC_1108 사장님 11/08 «처음부터 다시 셋팅 · 놓치지 말고» · 대본 13:48 · 13:53] 문장별 역할표 — 설계 · 준비(엔진 반영은 사장님 사다리 확정 뒤)
   문장 → 목소리 · 글자 수 · 역할(기본 · 구호 · 안내 · 정보 안내 · 느린 말) · 원본 글자/초(문장 안 쉼 뺌) · 목표 글자/초 · 맞춤 배속
   - 표준 글자/초 = 목소리마다 «원본 중앙값 × 0.97»(우성 약 6.44 · 진희 · 배역 각자) [A]
   - 역할 목표: 기본 · 구호 · 정보 안내 = 표준 · 안내 = 표준 × 1.015 · 느린 말 = 표준 × (사장님 값 ÷ 0.97 · 추천 0.95 · 정하기 전 0.97)
   - 7글자 이하 짧은 문장은 맞춤에서 뺀다(녹음대로) [B] · 글자/초는 말소리만(쉼표 · 숨 · 강조 쉼 = −34 dBFS 0.12초 이상 무음은 뺀다) [C]
   - 편지 통낭독 43(배역 낭독 · 통파일)은 대상 아님 [D] · 원본 문장이 창고에 없는 클립(식중 영상 351 ~ 355)은 «원본 없음»
   규칙(역할 가르기)은 assets/audio/_src/tempo.json standard.rules 와 같은 자리(구호 → 정보 안내 → 안내 → 느린 말 → 기본 · 첫 일치)
   쓰기: node scripts/build-sent-roles.mjs → assets/audio/_src/_roles.json(엔진 · 검사가 읽는 표) + docs/plans/식순연구/문장역할_1108.md(대본 검토용) */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module'; import { spawnSync } from 'node:child_process';
import { loadTempo, stdOn } from './lib/tempo.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = loadTempo(ROOT); if (!stdOn(T)) { console.error('standard.on 이 꺼져 있다'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const IDX = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_index.json'), 'utf8')).slots || {};
const RET = createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {};
const S = T.standard, RU = S.rules || {};
const SLOW = S.emotionPending ? 0.97 : +S.roles.emotion, SLOW_REC = 0.95;
const NAME = { base: '기본', cheer: '구호', guide: '안내', info: '정보 안내', slow: '느린 말', short: '짧은 문장(녹음대로)' };
const chars = (t) => (String(t).match(/[가-힣A-Za-z0-9]/g) || []).length;
const INFO = RU.info || '분|시각|장소|청첩장|하객 안내|식사|사진|진행되고|촬영|올리|확인|안내에서|화면과 소리';
const roleOf = (t) => { t = String(t).trim(); if (chars(t) <= 7) return 'short';
  if (RU.cheer && new RegExp(RU.cheer).test(t)) return 'cheer';
  const g = RU.guide && new RegExp(RU.guide).test(t), inf = new RegExp(INFO).test(t);
  if (inf && (g || /니다\.$|주세요\.$/.test(t)) && /안내|확인|올리|장소|시각|분|촬영|진행/.test(t)) return 'info';
  if (g) return 'guide';
  if (RU.emotion && new RegExp(RU.emotion).test(t)) return 'slow';
  return 'base'; };
/* 말소리 길이 — −34 dBFS · 0.12초 이상 무음(가장자리 · 문장 안 쉼)을 뺀다 */
const speechSec = (f) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-34dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' });
  const e = r.stderr || ''; const d = +((e.match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).reduce((a, x, i) => a + (+x) * [3600, 60, 1][i], 0));
  let sil = 0; for (const m of e.matchAll(/silence_duration: ([\d.]+)/g)) sil += +m[1];
  const st = [...e.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), en = [...e.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  if (st.length > en.length) sil += d - st[st.length - 1];   // 끝까지 무음
  return Math.max(0.05, d - sil); };
const rows = [];
for (const c of man.clips) { if ((c.dir || 'assets/audio/narration') !== 'assets/audio/narration' || RET[c.file]) continue;
  const v = (man.voice || {})[String(c.role).split('|')[0]] || String(c.role); const key = `${String(c.no).padStart(2, '0')}_${c.file}`;
  c.sents.forEach((s, i) => { const id = `${key}#${i}`, n = chars(s.text);
    if (c.file === 'parents-letter') { rows.push({ id, voice: v, text: s.text, n, role: 'skip', note: '편지 통낭독(배역 낭독 · 통파일) — 대상 아님' }); return; }
    const f = path.join(ROOT, 'assets/audio/_src', key, i + '.flac');
    if (!IDX[id] || !fs.existsSync(f)) { rows.push({ id, voice: v, text: s.text, n, role: roleOf(s.text), note: '원본 문장 없음' }); return; }
    const sp = speechSec(f); rows.push({ id, voice: v, text: s.text, n, role: roleOf(s.text), src: +(n / sp).toFixed(2) }); }); }
/* 목소리 표준 = 원본 중앙값 × 0.97 (7글자 이하 · 원본 없음 · 대상 아님 제외) */
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : 0; };
const VOICE = {}; for (const v of [...new Set(rows.map((r) => r.voice))]) { const a = rows.filter((r) => r.voice === v && r.src && r.role !== 'short' && r.role !== 'skip').map((r) => r.src); if (a.length) VOICE[v] = { n: a.length, median: +med(a).toFixed(2), standard: +(med(a) * 0.97).toFixed(2) }; }
const mult = { base: 1, cheer: 1, info: 1, guide: 1.015, slow: SLOW / 0.97 };
rows.forEach((r) => { const V = VOICE[r.voice]; if (!V || !r.src || r.role === 'short' || r.role === 'skip') return; r.target = +(V.standard * mult[r.role]).toFixed(2); r.speed = +(r.src / r.target).toFixed(4); });
/* 실제 배속으로 바꾸면: 배속 < 1 = 늘림(느리게) · 원본보다 빠르게 해야 하는 문장(speed > 1)도 있다 */
const out = { _왜: '[NARR_RESET_SPEC_1108] 문장별 역할 · 목표 글자/초 — 생성물(scripts/build-sent-roles.mjs) · 엔진 반영은 사장님 사다리 확정 뒤 · speed = 원본 글자/초 ÷ 목표(조립이 말소리에 입힐 배속 · 1 보다 작으면 늘림)',
  slow: { now: SLOW, recommend: SLOW_REC, pending: !!S.emotionPending }, voice: VOICE, roles: NAME, rows };
fs.writeFileSync(path.join(ROOT, 'assets/audio/_src/_roles.json'), JSON.stringify(out, null, 1) + '\n');
const cnt = {}; rows.forEach((r) => { cnt[r.voice] = cnt[r.voice] || {}; cnt[r.voice][r.role] = (cnt[r.voice][r.role] || 0) + 1; });
const sp = rows.filter((r) => r.speed), q = (p) => { const a = sp.map((r) => r.speed).sort((x, y) => x - y); return a[Math.floor((a.length - 1) * p)]; };
const md = `# 문장 역할표 · NARR_RESET_SPEC_1108

> 생성물 — \`node scripts/build-sent-roles.mjs\` → \`assets/audio/_src/_roles.json\`(엔진 · 검사용) · 이 문서는 대본 검토용
> 표준 글자/초 = 목소리마다 원본 중앙값 × 0.97 · 안내 +1.5% · 정보 안내 · 기본 · 구호 = 표준 · 느린 말 = ${S.emotionPending ? '사장님 값 대기(지금 97.0% · 추천 95.0%)' : (SLOW * 100).toFixed(1) + '%'} · 7글자 이하 = 녹음대로 · 글자/초는 말소리만(문장 안 쉼 뺌)

## 목소리 표준
| 목소리 | 문장 | 원본 중앙 글자/초 | 표준(× 0.97) |
|---|---|---|---|
${Object.entries(VOICE).map(([v, x]) => `| ${v} | ${x.n} | ${x.median} | ${x.standard} |`).join('\n')}

## 역할 셈
${Object.entries(cnt).map(([v, x]) => `- ${v}: ${Object.entries(x).map(([k, n]) => (NAME[k] || '대상 아님') + ' ' + n).join(' · ')}`).join('\n')}

## 맞춤 배속 분포(원본 → 목표)
- ${sp.length}문장 · 10% ${q(0.1)} · 중앙 ${q(0.5)} · 90% ${q(0.9)} · 가장 늘림 ${q(0)} · 가장 줄임 ${q(1)}

## 문장 전부
| 자리 | 목소리 | 역할 | 글자 | 원본 글자/초 | 목표 | 배속 | 문장 |
|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.id} | ${r.voice} | ${NAME[r.role] || '대상 아님'} | ${r.n} | ${r.src ?? '-'} | ${r.target ?? '-'} | ${r.speed ?? (r.note || '-')} | ${String(r.text).replace(/\|/g, '\\|')} |`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs/plans/식순연구/문장역할_1108.md'), md);
console.log(`✓ _roles.json · 문장 ${rows.length} · 목소리 ${JSON.stringify(VOICE)} · 역할 ${JSON.stringify(cnt)} · 배속 10/50/90% ${q(0.1)} / ${q(0.5)} / ${q(0.9)} · 범위 ${q(0)} ~ ${q(1)}`);
