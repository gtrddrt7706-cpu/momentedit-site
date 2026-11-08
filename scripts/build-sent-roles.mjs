#!/usr/bin/env node
/* ★[SPEED97_1108 대본 13:40] 문장 역할표 — tempo.json standard.rules 가 우성 · 진희 문장을 어떻게 가르는지(안내 0.985 · 기본 · 구호 0.970 · 감정 사장님 선택)
   손으로 고르지 않는다 — 조립(assemble-narration)과 검사(tempo-check)가 쓰는 그 함수(sentRole)로 뽑는다. 규칙을 고치면 이걸 다시 돌린다.
   쓰기: node scripts/build-sent-roles.mjs → docs/plans/식순연구/문장역할_1108.md */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { loadTempo, sentRole, stdOn } from './lib/tempo.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = loadTempo(ROOT); if (!stdOn(T)) { console.error('standard.on 이 꺼져 있다'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const RET = createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {};
const NAME = { guide: '안내', base: '기본', cheer: '구호', emotion: '감정 · 엄숙' };
const rows = [], cnt = { 진희: {}, 우성: {} };
for (const c of man.clips) { if ((c.dir || 'assets/audio/narration') !== 'assets/audio/narration' || RET[c.file] || c.file === 'parents-letter') continue;   // 편지 통낭독 = 통파일(문장별 없음)
  const v = (man.voice || {})[String(c.role).split('|')[0]]; if (v !== '진희' && v !== '우성') continue;
  c.sents.forEach((s, i) => { const r = sentRole(T, s.text, v); cnt[v][r] = (cnt[v][r] || 0) + 1; if (v === '우성' && r !== 'base') rows.push([`${String(c.no).padStart(2, '0')}_${c.file}#${i}`, NAME[r], T.standard.roles[r], s.text]); }); }
const pct = (x) => (x * 100).toFixed(1) + '%';
const md = `# 문장 역할표 · SPEED97_1108

> 생성물 — \`node scripts/build-sent-roles.mjs\` · 규칙 = \`assets/audio/_src/tempo.json\` standard.rules · 조립 · 검사와 같은 함수(sentRole)
> 사장님 11/08 «97%는 표준»: 기본 · 구호 ${pct(T.standard.roles.base)} · 안내 ${pct(T.standard.roles.guide)} · 감정 · 엄숙 ${pct(T.standard.roles.emotion)}${T.standard.emotionPending ? '(사장님 «느린 말 고르기» 뒤에 정함 · 지금은 표준과 같음)' : ''}

## 셈
- 진희(안내 목소리 · 클립 전체 안내): ${Object.entries(cnt.진희).map(([k, n]) => NAME[k] + ' ' + n).join(' · ')}문장
- 우성(문장마다 규칙): ${Object.entries(cnt.우성).map(([k, n]) => NAME[k] + ' ' + n).join(' · ')}문장 (쓰는 클립만 · 폐지 클립 제외)

## 우성 문장 중 기본이 아닌 것 ${rows.length}
| 자리 | 역할 | 배속 | 문장 |
|---|---|---|---|
${rows.map((r) => `| ${r[0]} | ${r[1]} | ${pct(r[2])} | ${r[3].replace(/\|/g, '\\|')} |`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs/plans/식순연구/문장역할_1108.md'), md);
console.log(`✓ 문장역할_1108.md · 진희 ${JSON.stringify(cnt.진희)} · 우성 ${JSON.stringify(cnt.우성)}`);
