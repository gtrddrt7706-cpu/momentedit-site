#!/usr/bin/env node
/* ★[SPEED3_1108 대본 16:14 5)] 실청 «지금 / 바뀐 뒤» — listen-order 꼴(순간 차례 · 클립 한 번씩 · 중복 없음) · 실청 전용(승인 뒤 병합 전에 지운다)
   지금 = 라이브 main 소리(같은 글일 때) · main 에 없거나 글이 다른 클립은 같은 원본 · 같은 조립 · 1.0 판(preview/speed3-1108/now) / 바뀐 뒤 = 이 가지(말소리만 ×0.97)
   쓰기: node scripts/build-listen-speed3.mjs --base <1.0 판 폴더> → listen-speed3-1108.html */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const BASE = arg('--base'), LIVE = 'https://www.momentedit.kr/', NOW = 'assets/audio/preview/speed3-1108/now';
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/tempo.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips;
const mainRec = JSON.parse(execFileSync('git', ['show', 'origin/main:assets/audio/narration/_recorded.json'], { cwd: ROOT, maxBuffer: 1 << 26 }).toString()).clips;
const RET = createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {};
const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/clip-status.json'), 'utf8')).clips || {};
const ORDER = ['guest', 'open', 'prevideo', 'candle', 'entry', 'matjeol', 'welcome', 'thanks', 'vow', 'ring', 'declare', 'bless', 'midvideo', 'midvideo-thanks', 'midvideo-story', 'speech', 'song', 'letter', 'tribute', 'table', 'toast', 'close', 'etc', 'keep'];
const NAME = { guest: '하객 맞이 · 안내(진희)', open: '여는 멘트', prevideo: '식전 영상 소개', candle: '화촉', entry: '입장', matjeol: '맞절', welcome: '감사 인사', thanks: '감사 인사 여는 말', vow: '혼인 서약', ring: '반지 교환', declare: '성혼 선언', bless: '부모님 덕담', midvideo: '식중 영상', 'midvideo-thanks': '식중 영상', 'midvideo-story': '식중 영상', speech: '축사', song: '축가', letter: '편지 낭독', tribute: '부모님께 인사', table: '테이블 인사', toast: '축배', close: '닫는 인사', etc: '그 밖(사진 · 효과 · 이음)', keep: '그 밖' };
const txt = (r) => (r && typeof r === 'object' ? r.text : r) || '';
const groups = {}; let nNow = 0, nLive = 0;
fs.mkdirSync(path.join(ROOT, NOW), { recursive: true });
for (const c of man.clips) { const key = `${String(c.no).padStart(2, '0')}_${c.file}`, v = (man.voice || {})[String(c.role).split('|')[0]];
  if ((c.dir || 'assets/audio/narration') !== 'assets/audio/narration' || (v !== '우성' && v !== '진희') || c.file === 'parents-letter') continue;
  if (RET[c.file] || (st['narration/' + key] && st['narration/' + key].s === 'retired') || !fs.existsSync(path.join(ROOT, 'assets/audio/narration', key + '.mp3'))) continue;
  const mo = v === '진희' ? 'guest' : ((T.woosung || {})[key] || 'etc');
  let now; if (mainRec[key] && txt(mainRec[key]).replace(/\s/g, '') === txt(rec[key]).replace(/\s/g, '')) { now = LIVE + 'assets/audio/narration/' + key + '.mp3'; nLive++; }
  else if (BASE && fs.existsSync(path.join(BASE, key + '.mp3'))) { fs.copyFileSync(path.join(BASE, key + '.mp3'), path.join(ROOT, NOW, key + '.mp3')); now = NOW + '/' + key + '.mp3'; nNow++; }
  else continue;   // 1.0 판이 없다(원본 문장 없음 — 식중 영상)
  (groups[mo] = groups[mo] || []).push({ key, v, text: txt(rec[key]), now, nw: 'assets/audio/narration/' + key + '.mp3' }); }
const mos = Object.keys(groups).sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const total = mos.reduce((a, m) => a + groups[m].length, 0);
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>말빠르기 −3% · 실청</title>
<style>:root{--ink:#2b2522;--light:#7a706a;--line:#e5ddd5;--seal:#6B2A24;--bg:#faf8f5}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,sans-serif}main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:20px;margin:8px 0 4px}h2{font-size:16px;margin:24px 0 6px}.nt{color:var(--light);font-size:13px}.bt{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}button{font:inherit;min-height:44px;padding:8px 14px;border:1px solid var(--seal);background:#fff;color:var(--seal);border-radius:8px;cursor:pointer}button.on{background:var(--seal);color:#fff}.row{border-bottom:1px solid var(--line);padding:8px 0}.row .k{font-size:12px;color:var(--light)}</style></head><body><main>
<h1>말빠르기 −3% · 지금 / 바뀐 뒤</h1>
<p class="nt">SPEED3_1108 · 우성 · 진희 나레이션 클립 ${total}개 · 순간 차례 · 클립마다 한 번(중복 없음) · 바뀐 뒤 = 말소리만 ×0.97(쉼 · 높낮이 그대로) · 지금 = 라이브 main 소리 ${nLive} · main 에 없거나 글이 다른 ${nNow}개는 같은 원본 1.0 판 · 편지 통낭독 · 배역 · 쓰지 않는 클립은 뺐어요.</p>
<div class="bt"><button type="button" data-q="all" data-w="now">지금 전체 이어 듣기</button><button type="button" data-q="all" data-w="nw">바뀐 뒤 전체 이어 듣기</button></div>
${mos.map((m) => `<h2>${esc(NAME[m] || m)} <span class="nt">${groups[m].length}</span></h2><div class="bt"><button type="button" data-q="${m}" data-w="now">이 순간 지금 이어 듣기</button><button type="button" data-q="${m}" data-w="nw">이 순간 바뀐 뒤 이어 듣기</button></div>
${groups[m].map((x) => `<div class="row"><div class="k">${esc(x.key)} · ${esc(x.v)}</div><div>${esc(x.text)}</div><div class="bt"><button type="button" data-src="${x.now}">지금</button><button type="button" data-src="${x.nw}">바뀐 뒤</button></div></div>`).join('\n')}`).join('\n')}
</main>
<script>(function(){var G=${JSON.stringify(Object.fromEntries(mos.map((m) => [m, groups[m].map((x) => [x.now, x.nw])])))},O=${JSON.stringify(mos)};var a=new Audio(),cur=null,q=[],qi=0;
function stop(){a.pause();if(cur)cur.classList.remove('on');cur=null;q=[];}
function next(){if(qi>=q.length){stop();return;}a.src=q[qi++];a.play().catch(function(){next();});}
a.addEventListener('ended',function(){if(q.length)next();else stop();});
document.querySelectorAll('button[data-src]').forEach(function(b){b.addEventListener('click',function(){if(cur===b){stop();return;}stop();cur=b;b.classList.add('on');a.src=b.getAttribute('data-src');a.play();});});
document.querySelectorAll('button[data-q]').forEach(function(b){b.addEventListener('click',function(){if(cur===b){stop();return;}stop();cur=b;b.classList.add('on');var w=b.getAttribute('data-w')==='now'?0:1,k=b.getAttribute('data-q'),L=[];(k==='all'?O:[k]).forEach(function(m){G[m].forEach(function(p){L.push(p[w]);});});q=L;qi=0;next();});});})();</script>
</body></html>
`;
fs.writeFileSync(path.join(ROOT, 'listen-speed3-1108.html'), html);
console.log(`✓ listen-speed3-1108.html · 순간 ${mos.length} · 클립 ${total} · 지금 = 라이브 ${nLive} · 1.0 판 ${nNow}`);
