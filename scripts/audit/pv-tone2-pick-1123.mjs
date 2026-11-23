#!/usr/bin/env node
/* ★★[PV_TONE2_PICK_1123 대표님 11/23 22:18 «A로 하는데, 지금 대본이 먼저니까 …» · 대본 PV_TONE2_PICK_1123] 영상 뒤 화촉 263 + 151 = 문단 한 테이크 A 가 톤 기준 · 사이트 반영은 대본 확정까지 보류
   ① 고른 테이크가 창고에 있다(A = 263 + 151 한 문단 · 243 = 판 1) — 대본 글이 그대로면 이 소리를 그대로 쓴다
   ② 녹음 기본값이 문서에 있다: 붙어 이어지는 줄은 문단 한 테이크 · 톤은 A(141 E 보다 조금 차분 · 문장 사이 높이 · 밝기 차이 최소)
   ③ 반영 보류 중 — 엔진 263 · 151 글이 테이크 글과 같으면(아직 대본 그대로) 지금 소리를 몰래 바꾸지 않았는지(녹음 기록에 PV_TONE2 없음)
   종료 0 초록 · 1 빨강 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); const P = (p) => path.join(ROOT, p);
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const D = 'assets/audio/_src/_takes/PV_TONE2_1123/';
ok(fs.existsSync(P(D + 'a__candle-263-151-para.flac')), '① 문단 A 테이크(263 + 151 한 번에)가 창고에');
ok(fs.existsSync(P(D + 'p1__243-plain.flac')), '① 243 판 1 테이크가 창고에');
const R = fs.readFileSync(P('docs/handoff/녹음/README.md'), 'utf8');
ok(/PV_TONE2_PICK_1123/.test(R) && /문단 한 테이크/.test(R) && /톤 기준\s*=\s*A/.test(R), '② 녹음 README 에 기본값(문단 한 테이크 · 톤 A)');
ok(/PV_TONE2_PICK_1123/.test(fs.readFileSync(P('docs/rules/나레이션.md'), 'utf8')), '② 나레이션 규칙에 결정 블록');
const rec = JSON.parse(fs.readFileSync(P('assets/audio/narration/_recorded.json'), 'utf8')).clips;
const sp = (k) => String((Object.entries(rec).find(([n]) => n.startsWith(k + '_')) || [, {}])[1].splice || '');
ok(!/PV_TONE2/.test(sp('263')) && !/PV_TONE2/.test(sp('151')), '③ 반영 보류 · 263 · 151 소리는 아직 그대로(대본 확정 뒤 넣으면 이 줄을 «넣음» 기대로 바꾼다)');
console.log(bad ? `✗ PV_TONE2_PICK_1123 실패 ${bad}건` : '✓ PV_TONE2_PICK_1123 맞음'); process.exit(bad ? 1 : 0);
