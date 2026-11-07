#!/usr/bin/env node
/* ★[LISTEN_CHANGED_1107 2026-11-07 사장님 «바뀐 나레이션 부분만 전부 · 누락 없이»] 실청 전용 «바뀐 나레이션만» 판(listen-changed-1107.html) — 병합 전 지운다.
   바뀜 목록은 손으로 고르지 않는다: scripts/listen-changed-diff.cjs 가 main 엔진과 이 가지 엔진을 같은 조합(새 코스 모든 순간 조합 × 선택 21가지 + 예시 칩 하나씩 · 옛 코스 셋)으로 돌려
   클립 순서 · 글이 다른 조각을 모은 것(assets/audio/preview/changed-1107/diff.json) · 같은 바뀜은 한 줄 · «나오는 조합 n개».
   쓰기: node scripts/listen-changed-diff.cjs <main 체크아웃> . assets/audio/preview/changed-1107/diff.json && node scripts/build-listen-changed.mjs --base-rev 394bf80c */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const BASE_REV = arg('--base-rev', '394bf80c');   // «지금» 소리 = 이 가지 앞(#1636 빠르기 판) — main 소리는 빠르기 전이라 쓰지 않는다
const OUT = 'assets/audio/preview/changed-1107', D = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'diff.json'), 'utf8'));
const NAR = path.join(ROOT, 'assets/audio/narration'), TMP = fs.mkdtempSync(path.join(ROOT, '..', 'lc-'));
const fileOf = (no) => { const f = fs.readdirSync(NAR).find((x) => x.startsWith(no + '_') && x.endsWith('.mp3')); return f ? path.join(NAR, f) : null; };
const oldOf = (no) => { const f = fileOf(no); if (!f) return null; const rel = path.relative(ROOT, f); const o = path.join(TMP, 'old-' + no + '.mp3');
  try { fs.writeFileSync(o, execFileSync('git', ['show', BASE_REV + ':' + rel], { cwd: ROOT, maxBuffer: 1 << 26 })); return o; } catch (e) { return f; } };
const sil = path.join(TMP, 's1.wav'); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '1.0', sil]);
function cat(out, files) { const a = [], fl = []; files.forEach((f, i) => { a.push('-i', f); fl.push(`[${i}:a]aresample=44100,aformat=channel_layouts=mono[a${i}]`); });
  const cc = files.map((_, i) => `[a${i}]`).join(''); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a, '-filter_complex', fl.join(';') + ';' + cc + `concat=n=${files.length}:v=0:a=1[o]`, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '128k', path.join(ROOT, out)]); }
const tok = (t) => { const p = String(t || '').split('§'); return { no: p[0], text: p[1] || '', live: p[2] === 'L', k: p[p.length - 1] }; };
const seq = (toks, old) => { const fs_ = []; toks.forEach((t, i) => { const x = tok(t); const f = old ? oldOf(x.no) : fileOf(x.no); if (f) { if (fs_.length) fs_.push(sil); fs_.push(f); } if (x.live) fs_.push(sil); }); return fs_; };
/* 줄 이름 · 판 표시 · 갈래(대본 18:45 칸 순서) — 바뀜 열쇠(엔진 번호)로만 붙인다 */
const NAME = {
  '160 → 160 (글)': ['이음매', 'J01 입장 → 맞절 · 맞절 여는 말 첫 문장 «다음은 여러 하객과 가족 앞에서 …» → «이어서 신랑 신부의 맞절이 있겠습니다.»(132#0)', '기본 판'],
  '160+244+11 → 160+350': ['이음매', 'J01 + J06 맞절 → 감사 인사 · 244 «…향해 서시겠습니다» + 11 → 350(215#1 → 1.0초 → 260#2)', '기본 판'],
  '244+11 → 350': ['이음매', 'J06 · 맞절 예시 칩을 고른 날도 감사 인사 첫머리 350', '맞절 예시 칩 · 감사 인사 기본 판'],
  '11 → 350': ['이음매', 'J06 · 옛 코스 감사 인사 첫머리 11 → 350', '옛 코스 기본 판'],
  '160+244 → 160': ['이음매', 'J06 · 감사 인사 예시 208 앞 244 빼기(«이제 신랑 신부 · 하객 여러분» 겹침)', '감사 인사 예시 2번 칩(다정하게)'],
  '243 →  [다음 entry]': ['이음매', 'J02 화촉 → 입장 · 입장 예시 F 앞 243 빼기(«오늘 … 주인공» 겹침)', '입장 예시 F 칩'],
  '244 →  [다음 table]': ['이음매', 'J43 · J70 · J73 → 테이블 인사 · 앞 244 빼기(곧 테이블로 걷는다 · 닫는 인사 · 축배 앞은 그대로)', '테이블 인사 모든 판'],
  '331 → 329': ['식사 안내', '5분 전 · 예약 시각 있음 · 하객 안내를 끈 날 «현장 디렉터에게 여쭤 주세요» → «하객 안내에서 확인해 주세요»', '기본 판'],
  '332 → 330': ['식사 안내', '5분 전 · 예약 시각 없음 · 같은 바꿈', '기본 판'],
  '336 → 334': ['식사 안내', '5분 전 · 온라인 · 예약 시각 있음 · 같은 바꿈', '기본 판'],
  '337 → 335': ['식사 안내', '5분 전 · 온라인 · 예약 시각 없음 · 같은 바꿈', '기본 판'],
  /* ★[W5M_FIX_1107 대본 22:25] 5분 전 = 본식 전 — «장소와 예약 시각은 …»(무엇의 장소인지 없음) · «오늘 찍으신 · 담으신 사진»(아직 안 찍음) → 식사 날 351 · 352(03#0 + 321#4 ± 314#1) · 없는 날 03 · 314 */
  '329 → 351': ['식사 안내', 'W5M 329 · 5분 전 · 식사 · 예약 시각 있음 → 351 «식사 장소 확인과 사진 올리기는 …»', '식사 · 하객 안내'],
  '330 → 351': ['식사 안내', 'W5M 330 · 5분 전 · 식사 · 예약 시각 없음 → 351', '식사 · 하객 안내'],
  '331 → 351': ['식사 안내', 'W5M · 5분 전 · 식사 · 하객 안내를 끈 날(main 은 디렉터 판 331) → 351', '식사 · 하객 안내 끔'],
  '332 → 351': ['식사 안내', 'W5M · 5분 전 · 식사 · 하객 안내를 끈 날(main 332) → 351', '식사 · 하객 안내 끔'],
  '333 → 03': ['식사 안내', 'W5M 333 · 5분 전 · 식사 없는 날 · 사진 문장 빼기 → 03 «시작 오 분 전입니다.»', '식사 없음'],
  '338 → 314': ['식사 안내', 'W5M 338 · 5분 전 · 식사 없는 날 · 온라인 · 사진 문장 빼기 → 314', '식사 없음 · 온라인'],
  '336 → 352': ['식사 안내', 'W5M · 5분 전 · 식사 · 온라인 · 하객 안내를 끈 날(main 336) → 352', '식사 · 온라인 · 하객 안내 끔'],
  '337 → 352': ['식사 안내', 'W5M · 5분 전 · 식사 · 온라인 · 하객 안내를 끈 날(main 337) → 352', '식사 · 온라인 · 하객 안내 끔'],
  '334 → 352': ['식사 안내', 'W5M 334 · 5분 전 · 식사 · 온라인 · 예약 시각 있음 → 352', '식사 · 온라인 · 하객 안내'],
  '335 → 352': ['식사 안내', 'W5M 335 · 5분 전 · 식사 · 온라인 · 예약 시각 없음 → 352', '식사 · 온라인 · 하객 안내'] };
/* [W5M_FIX_1107] 대본이 짚은 여섯(329 · 330 · 333 · 334 · 335 · 338) 중 기계 비교 표본에 안 걸린 쌍은 손으로 더한다(앞뒤 줄 없이 그 클립만) */
const W5M_PAIRS = [['329', '351'], ['330', '351'], ['333', '03'], ['334', '352'], ['335', '352'], ['338', '314']];
const REC = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')), RECC = REC.clips || REC;
const recText = (no) => { const k = Object.keys(RECC).find((x) => x.startsWith(no + '_')); return k ? String(RECC[k].text || '') : ''; };
W5M_PAIRS.forEach(([a, b]) => { const key = a + ' → ' + b; if (!D.groups.some((g) => g.key === key)) D.groups.push({ key, n: 0, prev: null, next: null, ha: [a + '§' + recText(a)], hb: [b + '§' + recText(b)] }); });
const rows = { '식중 영상': [], '이음매': [], '식사 안내': [], '그 밖의 바뀜': [] };
D.groups.forEach((g, i) => { const nm = NAME[g.key] || ['그 밖의 바뀜', g.key, '—'];
  const del = !g.hb.length, ctxA = [g.prev].filter(Boolean).concat(g.ha, del && g.next ? [g.next] : []), ctxB = [g.prev].filter(Boolean).concat(g.hb, del && g.next ? [g.next] : []);
  const k = 'g' + i; cat(`${OUT}/${k}-now.mp3`, seq(ctxA, true)); cat(`${OUT}/${k}-new.mp3`, seq(ctxB, false));
  rows[nm[0]].push({ k, what: nm[1], lab: nm[2], n: g.n, a: g.ha.map((t) => tok(t).no + ' ' + tok(t).text).join(' / '), b: g.hb.map((t) => tok(t).no + ' ' + tok(t).text).join(' / ') || '(없음)' }); });
/* ① 식중 영상 — 새 클립 5(음성 쉼 미리듣기 · 엔진 자리는 묶음 F) · 지금 = 58 + 129 */
const MV = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/preview/midvideo/midvideo.json'), 'utf8'));
cat(`${OUT}/mv-now.mp3`, [fileOf('58'), sil, fileOf('129')]);
MV.clips.forEach((c, i) => rows['식중 영상'].push({ k: 'mv' + i, now: /^④|^⑤/.test(c.label) ? '' : `${OUT}/mv-now.mp3`, newf: c.file, what: c.label + ' · ' + c.text, lab: i < 3 ? (i === 0 ? '여는 말 예시 1(기본)' : '여는 말 예시 ' + (i + 1)) : '받는 말', n: null, a: /^④|^⑤/.test(c.label) ? '(지금은 받는 말 없음 · 디렉터 GO)' : '58 + 129(임시)', b: c.text }));
const total = Object.values(rows).reduce((s, r) => s + r.length, 0);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sec = (t, r, note) => `<section><h2>${t} <small>${r.length}</small></h2>${note ? `<p class="nt">${note}</p>` : ''}${r.length ? r.map((x) => `<div class="row"><p class="w"><b>${esc(x.lab)}</b> ${esc(x.what)}${x.n ? ` <span class="nt">· 이 바뀜이 나오는 조합 ${x.n.toLocaleString()}개</span>` : ''}</p>`
  + `<p class="t">지금: ${esc(x.a)}</p><p class="t">바뀐 뒤: ${esc(x.b)}</p><p class="bt">${(x.now !== '' ? `<button type="button" data-src="${x.now || OUT + '/' + x.k + '-now.mp3'}">지금</button>` : '<span class="nt">지금: 없음</span>')} <button type="button" class="nw" data-src="${x.newf || OUT + '/' + x.k + '-new.mp3'}">바뀐 뒤</button></p></div>`).join('') : '<p class="nt">0개</p>'}</section>`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>바뀐 나레이션만 · 실청</title>
<style>:root{--ink:#2b2522;--light:#7a706a;--line:#e5ddd5;--seal:#6B2A24;--bg:#faf8f5}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,sans-serif}main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:20px;margin:8px 0}h2{font-size:17px;margin:22px 0 8px}h2 small{color:var(--light);font-weight:400}.sum{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:#fff}.nt{color:var(--light);font-size:13px}.row{border-top:1px solid var(--line);padding:10px 0}.w,.t{margin:2px 0}.t{font-size:13px;color:var(--light)}button{min-height:40px;padding:0 14px;margin:6px 6px 0 0;border:1px solid var(--line);border-radius:999px;background:#fff;font:inherit}button.nw{border-color:var(--seal);color:var(--seal)}button.on{background:var(--seal);color:#fff}#bar{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);z-index:2}</style></head><body><main>
<h1>바뀐 나레이션만 · 지금 / 바뀐 뒤</h1>
<div class="sum"><p><b>바뀐 곳 ${total}개</b> · 식중 영상 ${rows['식중 영상'].length} · 이음매 ${rows['이음매'].length} · 식사 안내 ${rows['식사 안내'].length} · 그 밖 ${rows['그 밖의 바뀜'].length}</p>
<p>기계 비교 조합 ${D.N.toLocaleString()}개 중 바뀐 조합 ${D.M.toLocaleString()}개 <span class="nt">(main 엔진 ↔ 이 가지 엔진 · 새 코스 모든 순간 조합 × 선택 21가지 + 예시 칩 하나씩 · 옛 코스 셋 · 맞절 첫 문장이 거의 모든 예식에 들어가 바뀐 조합이 많다)</span></p>
<p class="nt">빠르기 4%(단계 × 0.96)는 모든 나레이션 공통 · 이미 결정 — 따로 넣지 않았어요. 소리는 엔진 빠르기 그대로 · 사람 구간은 1초로 줄였어요.</p></div>
<div id="bar"><button type="button" id="all">전체 듣기 · 바뀐 뒤</button> <span class="nt" id="st"></span></div>
${sec('① 식중 영상', rows['식중 영상'], '새 녹음 5 · 엔진 자리는 묶음 F(PR #1635) · 지금은 58 + 129 로 임시')}
${sec('② 이음매', rows['이음매'], '감사 인사 예시 215 · 입장 예시 E · 부모님께 인사 예시 3 · 4 · 6 은 기계 비교에서 바뀜 0 — 이 가지 앞부터 이미 이음말 없이 나가요')}
${sec('③ 식사 안내', rows['식사 안내'], '디렉터 판 중 지금 식순에서 나가던 것은 5분 전 넷뿐 — 10분 전(302 · 303 · 307 · 308 · 312 · 313) · 촬영 뒤(322) · 글로만 나가는 oResv · oPlace 는 이미 쓰지 않는 판이라 «지금 / 바뀐 뒤» 모두 나가지 않아요(바뀜 0)')}
${sec('④ 그 밖의 바뀜', rows['그 밖의 바뀜'], '')}
<script>var A=null,Q=[],qi=0;function play(src,b){ if(A){A.pause();} document.querySelectorAll('button.on').forEach(function(x){x.classList.remove('on');}); A=new Audio(src); if(b) b.classList.add('on'); A.play(); return A; }
document.addEventListener('click',function(e){ var b=e.target.closest('button[data-src]'); if(!b) return; Q=[]; play(b.getAttribute('data-src'),b); });
document.getElementById('all').onclick=function(){ Q=[].slice.call(document.querySelectorAll('button.nw')); qi=0; next(); };
function next(){ if(qi>=Q.length){ document.getElementById('st').textContent='끝'; return; } var b=Q[qi]; document.getElementById('st').textContent=(qi+1)+' / '+Q.length; b.scrollIntoView({block:'center'}); var a=play(b.getAttribute('data-src'),b); a.onended=function(){ qi++; setTimeout(next,700); }; }</script>
</main></body></html>`;
fs.writeFileSync(path.join(ROOT, 'listen-changed-1107.html'), html); fs.rmSync(TMP, { recursive: true, force: true });
console.log(`✓ listen-changed-1107.html · 바뀐 곳 ${total} · 식중 영상 ${rows['식중 영상'].length} · 이음매 ${rows['이음매'].length} · 식사 안내 ${rows['식사 안내'].length} · 그 밖 ${rows['그 밖의 바뀜'].length} · 조합 ${D.N} 중 ${D.M}`);
