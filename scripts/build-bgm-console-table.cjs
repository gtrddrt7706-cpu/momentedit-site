#!/usr/bin/env node
/* [BGM_CONSOLE1_1023] 당일 콘솔 음악 재기 표 — 새 코스 예시 넷(정석 · 기록 · 가족 · 간결) × 기본 칩으로 RitualCue.build(S, {mode:'console'}) 를 돌려
   큐마다 순간 · slug · 클립 길이(assets/audio/narration 실측) · live.est · 크기 · fire · 사이 · 음악 칸(BgmSlots.slotOfKey)을 적고,
   음악 칸마다 «실제로 흐르는 시간»(클립 + 사람 구간 + 이어 나가는 사이 + wait)을 ref.sec(곡 길이 가정)과 나란히 둔다.
   docs/handoff/BGM_CONSOLE_1023.md 의 <!-- TABLE:START --> ~ <!-- TABLE:END --> 사이만 다시 쓴다(위 판정 · 제안 글은 사람이 쓴다).
   쓰는 법: node scripts/build-bgm-console-table.cjs [--check]   (ffmpeg 가 PATH 에 있거나 FFMPEG=경로) · 동작 변화 없음(읽기만) */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const R0 = path.join(__dirname, '..'); const C = require(R0 + '/assets/ritual-cue.js'), O = require(R0 + '/assets/ritual-open.js'), B = require(R0 + '/assets/bgm-slots.js');
const FF = process.env.FFMPEG || 'ffmpeg'; const P = C.PARAM; const NM = { standard: '정석', record: '기록', family: '가족', brief: '간결' };
const DOC = path.join(R0, 'docs/handoff/BGM_CONSOLE_1023.md');
const cache = {}; function dur(f) { if (cache[f] !== undefined) return cache[f]; const p = path.join(R0, 'assets/audio/narration', f + '.mp3'); let d = null;
  if (fs.existsSync(p)) { const r = cp.spawnSync(FF, ['-hide_banner', '-i', p], { encoding: 'utf8' }); const m = String(r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/); if (m) d = +m[1] * 3600 + +m[2] * 60 + +m[3]; }
  return (cache[f] = d); }
const f1 = (x) => (x == null ? '없음' : (+x).toFixed(1)), mmss = (s) => Math.floor(s / 60) + '분 ' + String(Math.round(s % 60)).padStart(2, '0') + '초';
const refS = (id) => { const r = B.slot(id).ref.sec; return r == null ? null : Array.isArray(r) ? r : [r, r]; };
let md = '', sum = {}, miss = [];
for (const ex of Object.keys(NM)) {
  const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; const cs = C.build(S, { mode: 'console' }).cues; sum[ex] = {};
  md += `### ${NM[ex]}(${ex}) · 큐 ${cs.length}\n\n| # | 순간 k | slug | 번호 | 클립 초 | live.est | live 크기 | 큐 크기 | fire | 사이 | 칸 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  cs.forEach((c, i) => {
    const clip = c.file ? dur(c.file) : null; if (c.file && clip == null) miss.push(ex + ' ' + c.file);
    const gap = c.fire === 'chain' ? (c.gapMs || P.gapMs) / 1000 : 0, wait = (c.post || []).reduce((a, q) => a + ((q && q.wait) || 0), 0) / 1000;
    const t = (clip || 0) + (c.live ? c.live.est : 0) + gap + wait; const s0 = B.slotOfKey(c.k); const sl = c.slug === 'narr-close' ? 'S8+' : (s0 ? s0.id : '-');
    const z = sum[ex][sl] || (sum[ex][sl] = { t: 0, go: 0, ks: [] }); z.t += t; if (c.fire === 'manual') z.go++; if (z.ks.indexOf(c.k) < 0) z.ks.push(c.k);
    md += `| ${i} | ${c.k} | ${c.slug} | ${c.no || ''} | ${f1(clip)} | ${c.live ? c.live.est + (c.live.applause ? ' 박수' : '') : ''} | ${c.live ? c.live.duck : ''} | ${c.duck} | ${c.fire}${c.atMin != null ? ' @' + c.atMin + '분' : ''} | ${c.fire === 'chain' ? gap + '초' : ''}${c.fadeMs ? ' · 내림 ' + c.fadeMs / 1000 + '초' : ''}${wait ? ' · wait ' + wait + '초' : ''} | ${sl} |\n`;
  });
  md += '\n';
}
let top = `### 음악 칸마다 흐르는 시간 vs ref.sec\n\n시간 = 클립 + live.est + 이어 나가는 큐 사이(gapMs · 없으면 ${P.gapMs / 1000}초) + post wait · GO = 디렉터가 «다음»을 누르는 횟수(반응 시간은 셈 밖 · 한 번에 1 ~ 3초).\n\n| 칸 | ref.sec | ${Object.values(NM).join(' | ')} |\n|---|---|---|---|---|---|\n`;
const cell = (z, r) => { if (!z) return '없음'; let f = ''; if (r) { if (z.t > r[1] + 1) f = ' · **모자람 ' + Math.round(z.t - r[1]) + '초**'; else if (z.t < r[0] * 0.6) f = ' · 남음 ' + Math.round(r[0] - z.t) + '초'; } return mmss(z.t) + ' · GO ' + z.go + f; };
for (const s of B.SLOTS) { const r = refS(s.id); top += `| ${s.id} ${s.ks.join(' · ')} | ${r ? (r[0] === r[1] ? r[0] : r[0] + '~' + r[1]) : '입장 곡'} | ${Object.keys(NM).map((e) => (s.id === 'S1' && sum[e].S1) ? '시계 창(문 열림 ~ 개식 @0) · 클립 + 박수 ' + mmss(sum[e].S1.t) : cell(sum[e][s.id], r)).join(' | ')} |\n`; }   /* S1 은 02 ~ 개식이 시각(@분)으로 나가 합으로 재지 않는다 · 2절 판정 */
top += `| S8 뒤 단체 사진(narr-close) | 칸 없음 | ${Object.keys(NM).map((e) => cell(sum[e]['S8+'], null)).join(' | ')} |\n`;
top += `| 칸 없음(식전 영상 · 축가 · 예식 뒤) | | ${Object.keys(NM).map((e) => { const z = sum[e]['-']; return z ? mmss(z.t) + ' · ' + z.ks.join(' · ') : ''; }).join(' | ')} |\n\n`;
const files = fs.readdirSync(path.join(R0, 'assets/audio/narration')).filter((f) => /^\d+_(narr-candle-in|narr-candle-bow|narr-entry-bow|narr-close-bow|narr-table-in|entry-[A-F])/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
let vv = `### 예시 칩에 따라 바뀌는 클립(같은 칸 · 길이가 다르다)\n\n| 파일 | 초 |\n|---|---|\n` + files.map((f) => `| ${f.replace('.mp3', '')} | ${f1(dur(f.replace('.mp3', '')))} |`).join('\n') + '\n\n';
const body = '<!-- TABLE:START · node scripts/build-bgm-console-table.cjs 가 만든다 · 손으로 고치지 않는다 -->\n\n' + top + vv + md + '<!-- TABLE:END -->';
if (miss.length) { console.log('FAIL 클립 파일 없음(또는 ffmpeg 없음):', miss.slice(0, 5).join(' | ')); process.exit(2); }
const doc = fs.readFileSync(DOC, 'utf8'); const a = doc.indexOf('<!-- TABLE:START'), b = doc.indexOf('<!-- TABLE:END -->');
if (a < 0 || b < 0) { console.log('FAIL 문서에 표 자리 표식이 없다'); process.exit(1); }
const next = doc.slice(0, a) + body + doc.slice(b + '<!-- TABLE:END -->'.length);
if (process.argv.includes('--check')) { if (next !== doc) { console.log('FAIL BGM_CONSOLE_1023.md 표가 지금 엔진 · 녹음과 다르다 — node scripts/build-bgm-console-table.cjs'); process.exit(1); } console.log('ok BGM_CONSOLE 표가 지금과 같다'); process.exit(0); }
fs.writeFileSync(DOC, next); console.log('ok 표를 다시 썼다 ·', Object.keys(NM).map((e) => NM[e]).join(' · '));
