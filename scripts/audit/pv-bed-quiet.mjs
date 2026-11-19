#!/usr/bin/env node
/* ★[PV_BED_NOTE_N06 2026-11-19 NIGHT20 #06 R3] 음악까지 미리듣기 — 예시 음악(@PV · PREVIEW_BED) 파일이 없을 때 빨간 «곡 파일을 열지 못했어요.»를 세우지 않는다.
   console.html bedPlay 의 실패 갈래 — @PV 몫이 일반 실패 줄보다 먼저 있는지 · 그 몫이 정한 말만 하는지 정적으로 잰다.
   --selftest : 그 갈래를 지우면 빨강이 되는지 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const C = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
const PV = "      if (!ok && sid === '@PV') {";
const GEN = "      if (!ok) { try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {} (BED.bad = BED.bad || {})[sid] = 1; if (_ofl) { _ofl(sid); return; } bedUnhush();";
const WANT = "bedErr('미리 듣기는 음악 없이 흘러요'); var _be = $('#bedErr'); if (_be) _be.classList.add('bed-note'); bedLater(); return; }";
const judge = (s) => { const a = s.indexOf(PV), g = s.indexOf(GEN); if (a < 0 || g < 0 || a > g) return false; const line = s.slice(a, s.indexOf('\n', a)); return line.includes(WANT) && !line.includes('열지 못했어요'); };
if (process.argv.includes('--selftest')) { const s2 = C.split('\n').filter((l) => !l.startsWith(PV)).join('\n'); const r = judge(s2) === false; console.log((r ? 'ok   ' : 'FAIL ') + 'selftest @PV 갈래를 지우면 빨강'); process.exit(r ? 0 : 1); }
const ok = judge(C); console.log((ok ? 'ok   ' : 'FAIL ') + '[PV_BED_NOTE_N06] 예시 음악이 없을 때 빨간 고장 줄 대신 회색 안내 한 줄'); process.exit(ok ? 0 : 1);

