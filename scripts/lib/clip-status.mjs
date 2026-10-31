/* ★★[CLIP_STATUS_1031 검토 175 · 고침 3 · 4] 안 나는 녹음 표시를 읽는 곳은 여기 하나다.
   원천 셋 — 두 군데에 같은 것을 적지 않는다:
     ① assets/ritual-cue.js RETIRED        나레이션 폐지 슬러그(엔진 정본)
     ② assets/ritual-story.js CAST_MUTE    안 트는 배역(06 ~ 14 · 24 · 25 · 26 · 글 예시만)
     ③ assets/audio/clip-status.json       파일 단위 표시(열쇠 «폴더/번호_이름») — retired · legacy · dormant · manual_off(수동 전용 · 당일 재생 안 함 · AUTO_ONLY_1031)
   statusOf(dir, id) → 'live' | 'retired' | 'legacy' | 'dormant' | 'manual_off' | 'muted'(= CAST_MUTE)
     dir = 'narration' | 'cast'(또는 'assets/audio/narration') · id = 'NN_슬러그'
   실청(build-listen-all · check-listen-cover) · 쉼 도구(keepgap-text · flow-gaps) · check-recorded 가 이 파일을 읽는다 [ONE_SPEC] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
export const STATUS_FILE = 'assets/audio/clip-status.json';
export const MANIFEST = 'docs/plans/식순연구/타입캐스트/manifest.json';
let _t = null, _r = null, _m = null;
export function table() { if (!_t) { try { _t = JSON.parse(fs.readFileSync(path.join(ROOT, STATUS_FILE), 'utf8')); } catch { _t = { clips: {} }; } } return _t; }
function retiredSlugs() { if (!_r) { try { _r = require(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {}; } catch { _r = {}; } } return _r; }
function castMute() { if (!_m) { try { _m = require(path.join(ROOT, 'assets/ritual-story.js')).CAST_MUTE || {}; } catch { _m = {}; } } return _m; }
export const dirOf = (d) => String(d || 'narration').replace(/\/+$/, '').split('/').pop();
export function keyOf(dir, id) { return dirOf(dir) + '/' + id; }
export function statusOf(dir, id) {
  const e = (table().clips || {})[keyOf(dir, id)]; if (e && e.s) return e.s;
  if (dirOf(dir) === 'cast') return castMute()[id] ? 'muted' : 'live';
  return retiredSlugs()[String(id).replace(/^\d+_/, '')] ? 'retired' : 'live';
}
/* 폴더를 모르는 자리(대장 열쇠 «번호_이름» · 쉼 장부)용 — narration · cast 는 파일 이름이 겹치지 않는다(실측 0) */
export function statusAny(id) {
  const T = table().clips || {}; for (const d of ['narration', 'cast']) { const e = T[d + '/' + id]; if (e && e.s) return e.s; }
  if (castMute()[id]) return 'muted';
  return fs.existsSync(path.join(ROOT, 'assets/audio/cast', id + '.mp3')) ? statusOf('cast', id) : statusOf('narration', id);
}
export const countLine = (ids) => { const by = {}; for (const id of ids) { const s = statusAny(id); by[s] = (by[s] || 0) + 1; } return Object.entries(by).map(([k, n]) => k + ' ' + n).join(' · '); };
export const LISTEN_OUT = new Set(['retired', 'legacy', 'manual_off', 'muted']);   // [AUTO_ONLY_1031] manual_off 도 뺀다            // 실청 목록에서 뺀다(dormant 는 남기되 «지금 안 남»)
export const PAUSE_OUT = new Set(['retired', 'legacy', 'dormant', 'manual_off', 'muted']);  // 쉼 도구 · 실청 기준 숫자에서 뺀다
/* 실청 기준 나레이션 — 대장(manifest)의 나레이션 클립 중 살아 있고(live) 소리 파일이 있는 것 · 사장님 실청 파일 수와 같은 자(10/31 185 → 검토 177 manual_off 9 를 빼 176) */
export function liveNarration() {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8'));
  return man.clips.filter((c) => dirOf(c.dir) === 'narration').map((c) => `${c.no}_${c.file}`)
    .filter((id) => statusOf('narration', id) === 'live' && fs.existsSync(path.join(ROOT, 'assets/audio/narration', id + '.mp3')));
}
export const LIVE_LINE = (n) => `실청 기준 나레이션 ${n}`;   // 도구마다 이 꼴로 찍는다 — scripts/audit/clip-status.mjs 가 숫자를 맞춰 본다
