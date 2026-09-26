// [SAMPLE_CUT 2026-09-26 코워크 최종판 4장] 대표 한 줄 멈춤 자리 — 부모 클립의 «둘째 문장 끝»을 무음에서 찾아 _recorded.json 에 적는다.
//
//   node scripts/sample-cut.mjs            # 보기만(무엇을 적을지 찍는다)
//   node scripts/sample-cut.mjs --write    # 적는다(assemble-narration 이 mp3 를 만든 뒤 스스로 부른다 · 손으로 고치지 않는다)
//   node scripts/sample-cut.mjs --check    # 게이트: 녹음 글 = 지금 글인 대표 클립마다 멈춤 자리가 있고 검사를 통과하는가 — 걸리면 경고(종료 0)
//
// 찾는 법(최종판 4장 그대로)
//   처음 · 끝 무음은 빼고, 녹음된 글이 N 문장이면 가장 긴 무음 N−1 개를 문장 끝으로 본다 → 시간 순 둘째가 멈춤 자리.
//   검사: 고른 N−1 개가 모두 0.35초 이상이고, 남은 무음(쉼표 쉼)보다 모두 길어야 한다 — 쉼표 쉼이 긴 줄이 문장 한가운데서 잘리지 않게.
//   (저장소 녹음에서 문장 끝은 0.51~0.55초 · 쉼표 쉼은 0.22초 아래였다 · 코워크 실측 0.58 · 0.83초)
// 멈춤 자리(cut2Ms) = 그 무음이 시작하고 min(0.25초, 무음 길이 × 0.6) 뒤 — 빌더가 그 앞 0.25초에 걸쳐 소리를 줄이므로
//   줄이는 동안이 무음 안에 든다(마지막 낱말 꼬리를 깎지 않는다).
// 검사에 걸리면 cut2Ms 를 지운다 — 그 줄은 글 + 진행 막대로 흐른다(녹음 전처럼 · order-preview _pvLine).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const DIR = path.join(ROOT, 'assets/audio/narration');
const RECF = path.join(DIR, '_recorded.json');
const WRITE = process.argv.includes('--write'), CHECK = process.argv.includes('--check');
const MIN_END = 0.35;

const norm = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, '');
const sentences = (t) => (String(t || '').match(/[^.?!]+[.?!]+/g) || [String(t || '')]).map((x) => x.trim()).filter(Boolean);
const recText = (v) => v == null ? null : (typeof v === 'string' ? v : String(v.text || ''));

function hasTool(t) { const r = spawnSync(t, ['-version'], { encoding: 'utf8' }); return !r.error && r.status === 0; }
function durOf(f) { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }); return parseFloat(r.stdout); }
function silences(f, d) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'], { encoding: 'utf8' });
  const seg = []; let cur = null;
  for (const m of (r.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
    if (m[1] === 'start') cur = parseFloat(m[2]); else if (cur !== null) { seg.push([cur, parseFloat(m[2])]); cur = null; }
  }
  if (cur !== null) seg.push([cur, d]);
  return seg;
}

/* 한 녹음의 멈춤 자리 — { ms } 또는 { why } */
export function cutOf(file, text, cut) {
  const f = path.join(DIR, file + '.mp3');
  if (!fs.existsSync(f)) return { why: 'mp3 없음' };
  const d = durOf(f); if (!(d > 0)) return { why: '길이를 못 쟀다' };
  const n = sentences(text).length;
  if (n <= cut) return { ms: Math.round(d * 1000), whole: true };   // 문장이 cut 개 이하 — 통째가 곧 대표 한 줄
  const inner = silences(f, d).filter((s) => s[0] > 0.03 && s[1] < d - 0.1).map((s) => ({ a: s[0], b: s[1], len: s[1] - s[0] }));
  if (inner.length < n - 1) return { why: `문장 ${n}개인데 안쪽 무음이 ${inner.length}곳뿐` };
  const byLen = inner.slice().sort((x, y) => y.len - x.len), ends = byLen.slice(0, n - 1), rest = byLen.slice(n - 1);
  const short = ends.filter((s) => s.len < MIN_END);
  if (short.length) return { why: `문장 끝 무음이 ${MIN_END}초보다 짧다(${short.map((s) => s.len.toFixed(2)).join(' · ')}초)` };
  const minEnd = Math.min(...ends.map((s) => s.len)), maxRest = rest.length ? Math.max(...rest.map((s) => s.len)) : 0;
  if (!(minEnd > maxRest)) return { why: `쉼표 쉼(${maxRest.toFixed(2)}초)이 문장 끝(${minEnd.toFixed(2)}초)만큼 길다 — 문장 한가운데서 잘릴 수 있다` };
  const s = ends.sort((x, y) => x.a - y.a)[cut - 1];
  return { ms: Math.round((s.a + Math.min(0.25, s.len * 0.6)) * 1000), at: s.a, len: s.len, n, gap: [minEnd, maxRest] };
}

/* 대표 한 줄 가운데 «앞 cut 문장에서 멈추는» 순간들 — 원천(ritual-open SAMPLE) · 파일 이름은 엔진(fileOf)에서 */
function targets() {
  const out = [];
  Object.keys(O.SAMPLE).forEach((k) => { const sm = O.sampleOf(k, {}); if (!sm || !sm.cut) return; const file = C.fileOf(sm.slug); if (file) out.push({ k, slug: sm.slug, file, cut: sm.cut }); });
  return out;
}
/* 지금 엔진 글(TEXT_AUDIO_MATCH 비교용) — 대표 한 줄을 들을 때와 같은 S */
function engineText(slug) {
  const r = C.build(C.norm(O.sampleS({})), { mode: 'preview' }); const cs = Array.isArray(r) ? r : r.cues;
  const c = cs.find((x) => x.slug === slug); return c ? c.text : null;
}

const main = () => {
  if (!hasTool('ffmpeg') || !hasTool('ffprobe')) { console.log('못 쟀다 — ffmpeg · ffprobe 없음'); process.exit(CHECK ? 0 : 2); }
  const rec = JSON.parse(fs.readFileSync(RECF, 'utf8')); rec.clips = rec.clips || {};
  let changed = 0, warn = 0, live = 0;
  for (const t of targets()) {
    const v = rec.clips[t.file], txt = recText(v);
    if (txt == null) { console.log(`- (${t.file}) 녹음 없음 — 대표 한 줄은 글로`); continue; }
    const match = norm(txt) === norm(engineText(t.slug));
    const r = cutOf(t.file, txt, t.cut);
    const cur = (v && typeof v === 'object') ? v.cut2Ms : undefined;
    if (r.ms) console.log(`${match ? 'ok ' : '·  '} (${t.file}) 멈춤 ${r.ms}ms${r.whole ? '(통째)' : ` · 문장 ${r.n} · 끝 무음 ≥${r.gap[0].toFixed(2)}초 > 쉼표 ≤${r.gap[1].toFixed(2)}초`}${match ? '' : ' · 녹음 글이 지금 글과 달라 소리는 안 난다(재녹음 대기)'}`);
    else console.log(`${match ? 'WARN' : '·   '} (${t.file}) 멈춤 자리 없음 — ${r.why}${match ? ' · 이 줄은 글로 흐른다' : ''}`);
    if (match) { live++; if (!r.ms || cur !== r.ms) warn++; }
    if (WRITE) {
      const o = (v && typeof v === 'object') ? Object.assign({}, v) : { text: txt };
      if (r.ms) o.cut2Ms = r.ms; else delete o.cut2Ms;
      const same = JSON.stringify(o) === JSON.stringify(v);
      if (!same) { rec.clips[t.file] = o; changed++; }
    }
  }
  if (WRITE && changed) {
    rec._언제 = `${new Date().toISOString().slice(0, 10)} · sample-cut 이 멈춤 자리 ${changed}곳 갱신`;
    fs.writeFileSync(RECF, JSON.stringify(rec, null, 1) + '\n');
    console.log(`↳ ${path.relative(ROOT, RECF)} 갱신 (${changed}곳)`);
  }
  if (CHECK) {
    if (!live) console.log('SAMPLE_CUT 녹음 글 = 지금 글인 대표 클립 0 — 검사할 멈춤 자리 없음(재녹음 뒤 assemble 이 적는다)');
    else if (warn) console.log(`SAMPLE_CUT 경고 ${warn}곳 — 멈춤 자리가 없거나 낡았다 · node scripts/sample-cut.mjs --write (그 줄은 그동안 글로 흐른다)`);
    else console.log(`SAMPLE_CUT OK — 소리 나는 대표 클립 ${live}곳 모두 멈춤 자리 있음`);
  }
};
if (import.meta.url === `file://${process.argv[1]}`) main();
