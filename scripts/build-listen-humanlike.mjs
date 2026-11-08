#!/usr/bin/env node
/* ★[HUMANLIKE_1108 2026-11-08 사장님 «사람처럼 들리는 게 목표야» · 대본 11:40] «사람처럼 들리기» 실청 시험판 — 엔진 반영 금지(사장님 승인 뒤) · 미리보기 가지 전용
   대상 3순간 기본 판(하객 맞이 10분 전 · 5분 전 · 1분 전 / 성혼 선언 / 부모님께 인사) · 새 녹음 0
   ① 문장별 빠르기 곱(순간 단계 × 0.96 위에): 안내 ×1.015 · 기본 ×1.000 · 감정·핵심 ×0.985 · 구호 ×1.000 — 한 순간 안 이웃 문장 차이 3% 넘으면 3% 로 당긴다
   ② 흐름 쉼 흔들림: 문장 사이 쉼만 ±0.10초 안 · 고정 씨앗(같은 자리 = 늘 같은 값) · 특수(0.6 · 3 · 4초)와 구호 앞은 그대로
   조립은 assemble-narration 그대로(HL_PLAN 훅) · 순간 안 줄 사이는 엔진 큐 순서 · 사람 구간은 1초로 줄임
   쓰기: node scripts/build-listen-humanlike.mjs → listen-humanlike-1108.html + assets/audio/preview/humanlike-1108/ */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = 'assets/audio/preview/humanlike-1108', OUTA = path.join(ROOT, OUT);
const NAR = path.join(ROOT, 'assets/audio/narration');
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const TMP = fs.mkdtempSync(path.join(ROOT, '..', 'hl-'));
fs.mkdirSync(path.join(OUTA, 'hl'), { recursive: true });

/* 엔진 기본 판(새 코스 · 선언 · 부모님께 인사 켬)에서 세 순간의 큐 */
const S = C.norm(Object.assign(O.sampleS(), { course: 'open' })); S.on = Object.assign({}, S.on, { declare: 1, tribute: 1 });
const cues = C.build(C.norm(S), { mode: 'console' }).cues;
const MOM = [
  { id: 'guest', name: '하객 맞이 · 10분 전 · 5분 전 · 1분 전', pick: (c) => c.k === 'guest' && c.atMin != null && c.atMin < 0 && c.file },
  { id: 'declare', name: '성혼 선언', pick: (c) => c.k === 'declare' && c.file },
  { id: 'tribute', name: '부모님께 인사', pick: (c) => c.k === 'tribute' && c.file } ];
MOM.forEach((m) => { m.cues = cues.filter(m.pick); });

/* ① 역할 — 문장 글로 가른다(표에 그대로 보인다) · ② 쉼은 문장 사이(클립 안)만 · 줄 사이(큐)는 엔진 그대로 */
const ROLE = { guide: ['안내', 1.015], base: ['기본', 1.000], heart: ['감정 · 핵심', 0.985], cheer: ['구호', 1.000] };
const roleOf = (t) => /인사!$|맞절!?$|입장!?$/.test(t) ? 'cheer'
  : /감사|고맙|부모님|축하/.test(t) && !/이동하겠습니다|향해 서도록|자리로 돌아가셔도/.test(t) ? 'heart'
  : /앉아|휴대폰|무음|시작하겠습니다|진행되고|오 분 전|이동하겠습니다|향해 서도록|자리로 돌아가셔도|확인/.test(t) ? 'guide' : 'base';
const manOf = (file) => MAN.clips.find((x) => String(x.no).padStart(2, '0') + '_' + x.file === file);
const plan = { mult: {}, jit: {} }, table = [];
/* ② 고정 씨앗 의사 난수(FNV-1a → mulberry32) */
const seedOf = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const rnd = (s) => { let t = (seedOf('HUMANLIKE_1108|' + s) + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SPECIAL = [0.6, 3, 4];
MOM.forEach((m) => {
  let prev = null;
  m.cues.forEach((c) => { const mc = manOf(c.file); if (!mc) return;
    const mult = mc.sents.map((s) => { const r = roleOf(s.text); let v = ROLE[r][1], adj = '';
      if (prev != null && Math.abs(v / prev - 1) > 0.03 + 1e-9) { v = +(v > prev ? prev * 1.03 : prev / 1.03).toFixed(4); adj = '이웃 3% 로 당김'; }
      prev = v; table.push({ m: m.name, file: c.file, i: table.filter((x) => x.file === c.file).length, last: false, text: s.text, role: ROLE[r][0], mult: v, adj }); return v; });
    table[table.length - 1].last = true;
    plan.mult[c.file] = mult;
    plan.jit[c.file] = mc.sents.slice(0, -1).map((s, i) => { const raw = +(s.after + mc.sents[i + 1].before).toFixed(3);
      const nextCheer = roleOf(mc.sents[i + 1].text) === 'cheer';
      const nextDecl = /부부임을 선언|성혼을 선언|선언합니다/.test(mc.sents[i + 1].text);   // 선언 앞 기다림
      if (raw < 0.9 || SPECIAL.some((x) => Math.abs(raw - x) < 0.02) || nextCheer || nextDecl) return null;   // 그대로(문장 안 짧은 쉼 · 특수 · 구호 · 선언 앞)
      return +((rnd(c.file + '#' + i) * 2 - 1) * 0.10).toFixed(2); }); }); });
fs.writeFileSync(path.join(TMP, 'plan.json'), JSON.stringify(plan));

/* 사람처럼 클립 — 창고 문장에서 조립기 그대로(HL_PLAN) */
const files = [...new Set(MOM.flatMap((m) => m.cues.map((c) => c.file)))];
const st = path.join(TMP, 'stage'); fs.mkdirSync(st);
execFileSync('node', ['scripts/sent-lib.mjs', '--stage', st, '--clip', files.map((f) => '=' + f).join(',')], { cwd: ROOT, stdio: 'ignore' });
execFileSync('node', ['scripts/assemble-narration.mjs', '--in', st, '--clip', files.map((f) => '=' + f).join(','), '--out', path.join(OUTA, 'hl')], { cwd: ROOT, stdio: 'ignore', env: Object.assign({}, process.env, { HL_PLAN: path.join(TMP, 'plan.json'), HL_LOG: path.join(TMP, 'log.json') }) });
const LOG = JSON.parse(fs.readFileSync(path.join(TMP, 'log.json'), 'utf8'));
const gapCell = (r) => { if (r.last) return '<span class="nt">줄 끝</span>'; const g = LOG.find((x) => x.key === r.file && x.i === r.i); if (!g) return '<span class="nt">그대로</span>';
  const why = [g.jit ? '흔들림 ' + (g.jit > 0 ? '+' : '') + g.jit.toFixed(2) : '', g.len ? (g.len > 0 ? '긴 문장 +' : '짧은 문장 ') + g.len.toFixed(2) + ' (말소리 ' + g.spk.toFixed(1) + '초)' : '', Math.abs((g.after - g.before) - (g.jit + g.len)) > 0.005 ? '±0.20 자름' : ''].filter(Boolean).join(' · ');
  return g.before.toFixed(2) + ' → <b>' + g.after.toFixed(2) + '</b>초' + (why ? ' <span class="nt">' + why + '</span>' : ''); };
try { fs.rmSync(path.join(OUTA, 'hl', '_recorded.json'), { force: true }); } catch (e) {}

/* 순간 이어 붙이기 — 엔진 큐 순서 · 큐 앞 gapMs · 사람 구간 1초 */
const sil = (sec, n) => { const f = path.join(TMP, `s${n}.wav`); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(sec), f]); return f; };
const S1 = sil(1.0, 'one'), S2 = sil(2.0, 'two');
const cat = (out, list) => { const a = [], fl = []; list.forEach((f, i) => { a.push('-i', f); fl.push(`[${i}:a]aresample=48000,aformat=channel_layouts=mono[a${i}]`); });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a, '-filter_complex', fl.join(';') + ';' + list.map((_, i) => `[a${i}]`).join('') + `concat=n=${list.length}:v=0:a=1[o]`, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '160k', path.join(OUTA, out)]); };
const seqOf = (m, hl) => { const L = []; m.cues.forEach((c, i) => { if (i && c.gapMs) L.push(sil(c.gapMs / 1000, `g${m.id}${i}`)); L.push(hl ? path.join(OUTA, 'hl', c.file + '.mp3') : path.join(NAR, c.file + '.mp3')); if (c.live) L.push(S1); }); return L; };
MOM.forEach((m) => { cat(`${m.id}-now.mp3`, seqOf(m, false)); cat(`${m.id}-hl.mp3`, seqOf(m, true)); });
const all = (hl) => MOM.flatMap((m, i) => (i ? [S2] : []).concat(seqOf(m, hl)));
cat('all-now.mp3', all(false)); cat('all-hl.mp3', all(true));
fs.rmSync(TMP, { recursive: true, force: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const btn = (src, t) => `<button type="button" data-src="${OUT}/${src}">${t}</button>`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>사람처럼 들리기 · 실청</title>
<style>:root{--ink:#2b2522;--light:#7a706a;--line:#e5ddd5;--seal:#6B2A24;--bg:#faf8f5}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,sans-serif}main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:20px;margin:8px 0 4px}h2{font-size:16px;margin:24px 0 8px}.nt{color:var(--light);font-size:13px}.bt{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}button{font:inherit;min-height:44px;padding:8px 14px;border:1px solid var(--seal);background:#fff;color:var(--seal);border-radius:8px;cursor:pointer}button.on{background:var(--seal);color:#fff}.rl{list-style:none;margin:0;padding:0}.rl li{border-bottom:1px solid var(--line);padding:10px 0}.rl .h{font-size:13px;color:var(--light)}.rl .h b{color:var(--ink)}.rl .t{margin:2px 0}.rl .g{font-size:13px}</style></head><body><main>
<h1>사람처럼 들리기 · 지금 / 사람처럼</h1>
<p class="nt">시험판(HUMANLIKE_1108) · 새 녹음 0 · 문장별 빠르기 곱(안내 ×1.015 · 기본 ×1.000 · 감정·핵심 ×0.985 · 구호 ×1.000 · 이웃 문장 3% 안) · 문장 사이 쉼 ±0.10초 흔들림(고정 씨앗) + 문장 길이(앞 문장 말소리 4.5초 넘으면 +0.12초 · 1.5초 안 되면 −0.08초) · 합쳐 원래 값 ±0.20초 안 · 기다림(구호 · 선언 앞)과 특수(0.6 · 3 · 4초)는 그대로 · 사람 구간은 1초로 줄임 · 엔진에는 아직 반영하지 않았어요.</p>
<h2>3순간 이어 듣기</h2><div class="bt">${btn('all-now.mp3', '지금 3순간 이어 듣기')}${btn('all-hl.mp3', '사람처럼 3순간 이어 듣기')}</div>
${MOM.map((m) => `<h2>${esc(m.name)}</h2><p class="nt">${m.cues.map((c) => esc(c.file.split('_')[0])).join(' → ')}</p><div class="bt">${btn(m.id + '-now.mp3', '지금')}${btn(m.id + '-hl.mp3', '사람처럼')}</div>`).join('\n')}
<h2>역할 분류표</h2><p class="nt">줄마다 · 클립 · 역할 · 빠르기 곱 / 문장 / 쉼: 원래 → 사람처럼(그 문장 뒤)</p><ul class="rl">
${table.map((r) => `<li><div class="h"><b>${esc(r.file.split('_')[0])}</b> · ${esc(r.role)} · ×${r.adj ? r.mult.toFixed(4) : r.mult.toFixed(3)}${r.adj ? ' · ' + esc(r.adj) : ''}</div><div class="t">${esc(r.text)}</div><div class="g">쉼: ${gapCell(r)}</div></li>`).join('\n')}
</ul></main>
<script>(function(){var a=new Audio(),cur=null;document.querySelectorAll('button[data-src]').forEach(function(b){b.addEventListener('click',function(){if(cur===b&&!a.paused){a.pause();b.classList.remove('on');cur=null;return;}if(cur)cur.classList.remove('on');a.src=b.getAttribute('data-src');a.play();b.classList.add('on');cur=b;});});a.addEventListener('ended',function(){if(cur)cur.classList.remove('on');cur=null;});})();</script>
</body></html>
`;
fs.writeFileSync(path.join(ROOT, 'listen-humanlike-1108.html'), html);
console.log(`✓ listen-humanlike-1108.html · 순간 ${MOM.length} · 클립 ${files.length} · 문장 ${table.length} · 바뀐 쉼 ${LOG.length} · ` + LOG.map((g) => `${g.key.split('_')[0]}#${g.i} ${g.before}→${g.after}(흔들림 ${g.jit} · 길이 ${g.len} · 말 ${g.spk}초)`).join(' | '));
