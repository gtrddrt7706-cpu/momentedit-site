// [LISTEN_PAGE 2026-09-25 코워크 회신 4-7] ② 보고 듣기 · ① 장면 영상 — 받아들일 기준을 실브라우저로 잰다.
//
//   node scripts/audit/listen-page.mjs          # 390 · 1280 둘 다
//
// 보는 것(명세 4-7 그대로)
//   ① pageerror 0 · 서버 호출 0(글꼴 밖) · 가로 넘침 0 — 390 · 1280
//   ② 네 걸음(고르기 · 보고 듣기 · 글 적기 · 완성) · 새 코스 STEPS = intro,intro2,pick,listen,write,done
//   ③ 자동 재생: ① 칸은 첫 장면 사진만(영상 없음) · 창에서 소리 없는 영상 / ② 는 누른 뒤에만 소리 [PICK_V2]
//   ④ 움직임 줄이기에서 자동 재생 0
//   ⑤ 키보드로 줄 열기 · 칩 · 재생 · Esc 로 크게 보기 닫기
//   ⑥ 녹음 전 줄이 소리 없이 비지 않고 글로(«녹음 준비 중»)
//   ⑦ 칩을 누르면 그 판으로 바로 다시 들린다 · 빼기 · 넣기 한 줄 안내(을/를)
//   ⑧ 옛 코스(가족) 초안은 지금 화면 그대로 — 순간마다의 화면이 선다(회귀 0)
//
// ★장면 영상은 아직 한 편도 없다(VIDEO_READY 빈 목록). 그래서 ③·④ 는 ffmpeg 로 2초짜리 시험 영상을 만들어
//   가짜로 두 편(candle · vow)을 «들어온 것처럼» 끼워 잰다. ffmpeg 이 없으면 그 두 줄은 «못 쟀다»로 찍고 종료코드 2.
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0, cant = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

// 시험 영상(소리 없음 · 2초)
let TV = null;
/* ★시험 영상은 VP9(webm)로 만든다 — 헤드리스 Chromium(오픈소스 빌드)은 H.264 를 못 풀어 mp4 가 영영 안 돈다
   (첫 판에서 «하나도 안 돈다»로 거짓 실패가 났다). 실제 파일은 명세대로 mp4(H.264) — 서버가 같은 주소로 webm 을 준다. */
try { TV = path.join(os.tmpdir(), 'listen-page-test.webm'); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xEDEBE6:s=320x180:d=2', '-c:v', 'libvpx-vp9', '-b:v', '100k', '-an', TV]); }
catch (e) { TV = null; }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = (TV && /\/assets\/video\/moments\/.+\.mp4$/.test(u)) ? TV : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p === TV ? 'video/webm' : (TYPES[path.extname(p)] || 'application/octet-stream') }); r.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(w, opt) {
  opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, reducedMotion: opt.reduce ? 'reduce' : 'no-preference' });
  const pg = await ctx.newPage();
  const errs = [], ext = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (!/fonts\.g(oogleapis|static)\.com/.test(u)) ext.push(u.slice(0, 80)); return rt.fulfill({ status: 200, body: '' }); });
  if (opt.videos) await pg.addInitScript((vs) => { window.__LISTEN_TEST_VIDEOS = vs; }, opt.videos);
  if (opt.draft) await pg.addInitScript((d) => { try { localStorage.setItem('me_order', JSON.stringify(d)); } catch (e) {} }, opt.draft);
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  if (opt.videos) await pg.evaluate(() => { (window.__LISTEN_TEST_VIDEOS || []).forEach((k) => RitualOpen.VIDEO_READY.push(k)); });
  return { ctx, pg, errs, ext };
}
/* [PICK_V2 2026-09-26] PC(폭 1000 이상)의 ① 은 아래 단추 줄을 숨긴다 — «다음 · 보고 듣기»는 흐름 띠(.pk-go)에 있다 */
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
const toPick = async (pg) => { await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500); };

for (const w of [390, 1280]) {
  const { ctx, pg, errs, ext } = await open(w);
  await toPick(pg);
  ok(`${w} 새 코스 STEPS = 네 걸음`, (await pg.evaluate(() => STEPS.map((s) => s.k).join(','))) === 'intro,intro2,pick,listen,write,done');
  ok(`${w} ① 에 걸음 표시(① 고르기가 지금)`, await pg.evaluate(() => { const o = document.querySelector('.op-steps li.on'); return !!o && /고르기/.test(o.textContent); }));
  /* [PICK_V2 2026-09-26 코워크 최종판 3장] ① 은 예시 → 감동 흐름 → 네 막 칸 → 아래 막대. 판 칩 · 카드 · 자동 재생 영상은 없다. */
  ok(`${w} ① 칸에 판 칩이 없다(② 로 옮김)`, await pg.evaluate(() => document.querySelectorAll('.pk .op-chip').length === 0));
  ok(`${w} ① 칸 열셋 · 칸마다 16:9 그림 자리 [TILE_PICK]`, await pg.evaluate(() => { const t = [...document.querySelectorAll('.pk-tile')]; return t.length === 13 && t.every((c) => c.querySelector('.pk-media')); }));
  ok(`${w} ① 빈 채 아래 막대는 숫자 없이 «예시로 시작하거나 …» [BAR_SUM]`, await pg.evaluate(() => { const c = document.getElementById('opCta'); return !!c && /예시로 시작하거나 아래에서 담아 보세요/.test(c.textContent) && !/\d/.test(c.textContent); }));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  ok(`${w} ① 담으면 아래 막대 «본식 · 단체 사진» 시간 둘 · 개수 없음 [BAR_SUM]`, await pg.evaluate(() => { const t = (document.getElementById('opCta') || {}).textContent || ''; return /본식\s약\s?\d+~\d+분\s·\s단체\s사진\s약\s?\d+~\d+분/.test(t) && !/담은 순간|고른 순간/.test(t); }));
  await pg.click('[data-fk="pto:declare"]'); await pg.waitForTimeout(500);
  ok(`${w} ① 창 «② 보고 듣기에서 고를 것 · 누가 · 말투»(② 묶음 이름과 같게 · F2) · 남는 사진`, await pg.evaluate(() => (document.getElementById('pvCh') || {}).textContent === '② 보고 듣기에서 고를 것 · 누가 · 말투' && /남는 사진/.test((document.getElementById('pvShot') || {}).textContent || '')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(`${w} ① 소제목에 동그라미 번호 없음 · 남는 장면이라는 말 없음`, await pg.evaluate(() => ![...document.querySelectorAll('.pk-h,.pk-act-h,.pk-fp-h h3')].some((h) => /[①②③]/.test(h.textContent)) && !/남는 장면/.test(document.getElementById('stage').textContent)));
  ok(`${w} ① 고객 화면에 «판» 없음`, await pg.evaluate(() => !/판 바꿈|고를 수 있는 판|그 판으로/.test(document.getElementById('stage').textContent)));
  await clickNext(pg); await pg.waitForTimeout(1500);
  ok(`${w} [STEP_BASELINE 4-e] 걸음 표시 — 지난 걸음과 지금 걸음의 글줄이 같다`, await pg.evaluate(() => { const ys = [...document.querySelectorAll('.op-steps li')].map((li) => { const tw = document.createTreeWalker(li, NodeFilter.SHOW_TEXT); let t = tw.nextNode(); while (t && !t.textContent.trim()) t = tw.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return Math.round(r.getBoundingClientRect().top); }); return ys.length === 4 && Math.max(...ys) - Math.min(...ys) <= 1; }));
  ok(`${w} ② 제목 · 걸음 표시`, await pg.evaluate(() => document.getElementById('stepHead').textContent === '보고 듣기' && /보고 듣기/.test(document.querySelector('.op-steps li.on').textContent)));
  const rows = await pg.evaluate(() => [...document.querySelectorAll('.ls-rows .ls-row')].map((r) => r.dataset.lk));
  ok(`${w} ② 줄 = 하객 맞이 · 식전 영상 · 담은 순간 · 닫는 인사`, rows[0] === 'guest' && rows[1] === 'prevideo' && rows[rows.length - 1] === '_close', rows.join(','));
  ok(`${w} ② 들어가자마자 소리 없음(자동 재생 없음)`, await pg.evaluate(() => !LP.q.length && (!LP.el || LP.el.paused)));
  // ⑤ 키보드로 줄 열기
  await pg.focus('[data-fk="lsm:candle"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(400);
  ok(`${w} ② 키보드 Enter 로 줄이 열린다`, await pg.evaluate(() => LS.open === 'candle' && !!document.querySelector('.ls-row.open .ls-flow')));
  /* [TEXT_AUDIO_MATCH 2-1] 지금 녹음은 옛 대본이라 전부 글로 흐른다 — 줄마다 꼬리표 대신 «처음부터» 아래 한 줄 */
  ok(`${w} ② 전부 녹음 전이면 한 줄만(«새 대본을 녹음하기 전이라…») · 줄 꼬리표 없음`, await pg.evaluate(() => LS.allPend && /새 대본을 녹음하기 전이라, 지금은 글로 먼저 보여 드려요/.test((document.querySelector('.ls-allpend') || {}).textContent || '') && !document.querySelector('.ls-row.open .ls-flow .ls-new')));
  ok(`${w} ② 칩 = radiogroup · radio · 누를 곳 44px`, await pg.evaluate(() => { const c = document.querySelector('.ls-row.open .op-chip'); return !!c && c.getAttribute('role') === 'radio' && c.closest('[role=radiogroup]') && c.getBoundingClientRect().height >= 44; }));
  ok(`${w} ② 고른 칩이 눈에 보인다(바탕이 다르다) [CHIP_CHECKED]`, await pg.evaluate(() => { const on = document.querySelector('.ls-row.open .op-chip[aria-checked="true"]'), off = document.querySelector('.ls-row.open .op-chip[aria-checked="false"]'); return !!on && !!off && getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor; }));
  // ⑦ 칩 → 바로 재생
  await pg.click('[data-fk="lsc:candleWho:parents"]'); await pg.waitForTimeout(500);
  ok(`${w} ② 칩을 누르면 값이 바뀌고 그 순간이 바로 들린다 · 누른 자리에 포커스`, await pg.evaluate(() => S.candleWho === 'parents' && LP.q.length > 0 && LP.cur === 'candle' && document.activeElement && document.activeElement.getAttribute('data-fk') === 'lsc:candleWho:parents'));
  ok(`${w} ② 녹음 전 줄은 소리 없이 글로(src 없음 · 글 있음)`, await pg.evaluate(() => { const st = LP.q[0]; return !!st && st.pending && !st.src && st.txt.length > 10; }));
  ok(`${w} ② 재생 중 작은 플레이어`, await pg.evaluate(() => getComputedStyle(document.getElementById('lsMini')).display === 'flex'));
  await pg.evaluate(() => lsStop());
  // 크게 보기 · Esc
  await pg.click('.ls-hero'); await pg.waitForTimeout(700);
  ok(`${w} ② «처음부터 보고 듣기» → 크게 보기 · 식전 표시 · 본식부터 단추 · 뒤는 inert`, await pg.evaluate(() => { const f = document.getElementById('lsFull'); return !f.hidden && /식전/.test(f.querySelector('.lf-h').textContent) && !!f.querySelector('[data-fk="lfskip"]') && f.querySelector('.lf-txt').textContent.length > 10 && document.querySelector('.wrap').hasAttribute('inert'); }));
  await pg.click('[data-fk="lfskip"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 본식부터 보기 → «1 / N»`, await pg.evaluate(() => /^1 \/ \d+$/.test(document.querySelector('#lsFull .lf-h span').textContent.trim())));
  ok(`${w} ② 크게 보기의 자막 = 엔진 큐 문안`, await pg.evaluate(() => { const st = LP.q[LP.i]; return st && document.querySelector('.lf-txt').textContent === st.txt; }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  ok(`${w} ② Esc 로 크게 보기가 닫힌다(작게 · 뒤 잠금 풀림)`, await pg.evaluate(() => document.getElementById('lsFull').hidden && !document.querySelector('.wrap').hasAttribute('inert')));
  await pg.evaluate(() => lsStop());
  // ⑦ 빼기 · 넣기 한 줄 안내
  await pg.click('[data-fk="lsm:bless"]'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsr:bless"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 빼기 안내(«부모님 덕담»을 뺐어요) · 되돌리기`, await pg.evaluate(() => /«부모님 덕담»을 뺐어요/.test(document.querySelector('.ls-msg').textContent) && !RitualOpen.onOf(S, 'bless') && !!document.querySelector('[data-fk="lsundo"]')));
  await pg.click('[data-fk="lsundo"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 되돌리기 → 다시 담긴다`, await pg.evaluate(() => RitualOpen.onOf(S, 'bless')));
  await pg.click('[data-fk="lsm:bless"]'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsr:bless"]'); await pg.waitForTimeout(400);
  await pg.click('.ls-off summary'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsa:bless"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 담기 안내(n번째에 담았어요)`, await pg.evaluate(() => /«부모님 덕담»을 \d+번째에 담았어요/.test(document.querySelector('.ls-msg').textContent) && RitualOpen.onOf(S, 'bless')));
  ok(`${w} ② 준비한 순서는 «담지 않은 순간»에 없다`, await pg.evaluate(() => !document.querySelector('.ls-off [data-lk="free"]')));
  ok(`${w} ② 가로 넘침 0`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await clickNext(pg); await pg.waitForTimeout(600);
  ok(`${w} ③ 준비하기 — 두 분이 준비할 것 · 부모님께 부탁드릴 것 · 보낼 것 · 식전 영상 링크 · 도와주실 분`, await pg.evaluate(() => { const t = document.getElementById('stage').textContent; return document.getElementById('stepHead').textContent === '준비하기' && /두 분이 준비할 것/.test(t) && /부모님께 부탁드릴 것/.test(t) && /보낼 것/.test(t) && !!document.querySelector('input[aria-label="식전 영상 링크"]') && /도와주실 분/.test(t) && !/사흘/.test(t); }));
  await clickNext(pg); await pg.waitForTimeout(600);
  ok(`${w} ④ 듣기 단추 하나 = «처음부터 끝까지 보기»`, await pg.evaluate(() => { const b = [...document.querySelectorAll('.play-acts .rehearse-btn')]; return b.length === 1 && b[0].textContent === '처음부터 끝까지 보기'; }));
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  ok(`${w} 서버 호출 0`, ext.length === 0, [...new Set(ext)].join(' '));
  await ctx.close();
}

// [TEXT_AUDIO_MATCH 2026-09-25 코워크 회신3 2-1] 소리는 «녹음된 글 = 자막»일 때만 — 재녹음된 줄을 흉내 내(LREC 에 지금 글을 넣어) 본다
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  await clickNext(pg); await pg.waitForTimeout(1500);
  const nz = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, '');
  // ① 녹음 기록 그대로(옛 대본): 소리 나는 줄이 있으면 전부 «녹음된 글 = 자막»이어야 한다
  const chk = () => pg.evaluate(() => { const st = _lSteps(ENG, _lRows()); const nz = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, ''); const bad = st.filter((x) => x.src && nz(_lRecText(x.file)) !== nz(x.txt)); return { sound: st.filter((x) => x.src).length, bad: bad.map((x) => x.file) }; });
  let r = await chk();
  ok('2-1 옛 녹음 그대로 — 소리 나는 줄 중 자막과 다른 줄 0', r.bad.length === 0, JSON.stringify(r));
  // ② 두 줄만 «재녹음»(녹음된 글 = 지금 글) → 그 둘만 소리 · 나머지는 글 · 줄 꼬리표가 돌아온다
  await pg.evaluate(() => { const st = _lSteps(ENG, ['ring', 'declare']).filter((x) => x.file); st.forEach((x) => { LREC[x.file] = { text: x.txt }; }); window.__fix = st.map((x) => x.file); render(); });
  await pg.waitForTimeout(300);
  r = await chk();
  const fix = await pg.evaluate(() => window.__fix);
  ok('2-1 재녹음된 줄만 소리가 난다 · 모두 자막과 같다', r.sound === fix.length && r.bad.length === 0, JSON.stringify({ r, fix }));
  ok('2-1 일부만 녹음 전이면 한 줄은 사라지고 줄마다 꼬리표', await pg.evaluate(() => !LS.allPend && !document.querySelector('.ls-allpend')));
  // ③ 녹음된 글을 한 글자라도 바꾸면 그 줄은 다시 글로(= 깨 보고 믿기: 옛 규칙이면 여기서 소리가 난다)
  await pg.evaluate(() => { const f = window.__fix[0]; LREC[f] = { text: LREC[f].text + ' 옛말' }; render(); });
  await pg.waitForTimeout(300);
  r = await chk();
  ok('2-1 녹음된 글이 다르면 소리를 내지 않는다', r.sound === fix.length - 1 && r.bad.length === 0, JSON.stringify(r));
  ok('2-1 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [EDIT_OPEN · EM30_RANGE 2026-09-25 코워크 회신3 2-2 · 2-3] ④ «변경» · «채우기»가 걸음을 옮긴다 · 취소하면 그대로 · 걸음 표시로 옮기면 수정 끝
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  const toDone = async () => { await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'done') { idx = i; render(); } }); await pg.waitForTimeout(500); };
  await toDone();
  ok('2-3 ④ 새 코스에 «30분을 살짝 넘어도» 줄 없음', await pg.evaluate(() => !/30분을 살짝 넘어도/.test(document.getElementById('stage').textContent)));
  const keys = await pg.evaluate(() => [...document.querySelectorAll('.sr-c')].map((b) => b.getAttribute('data-fk')));
  const snap0 = await pg.evaluate(() => JSON.stringify(S));
  let moved = 0; const miss = [];
  for (const fk of keys) {
    await toDone();
    const lab = await pg.evaluate((f) => { const b = document.querySelector(`[data-fk="${f}"]`); return b ? b.textContent : ''; }, fk);
    await pg.click(`[data-fk="${fk}"]`); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({ k: STEPS[idx].k, er: editReturn, open: LS.open, foc: document.activeElement ? (document.activeElement.getAttribute('aria-label') || document.activeElement.className) : '' }));
    const good = lab === '채우기' ? (r.k === 'write' && r.er && /textarea|약속|편지|첫인사/.test(r.foc)) : (r.k === 'listen' && r.er && !!r.open && /ls-main/.test(r.foc));
    if (good) moved++; else miss.push(fk + ':' + lab + ':' + JSON.stringify(r));
    await pg.click('#prev'); await pg.waitForTimeout(400);   // 취소
  }
  ok(`2-2 ④ «변경» · «채우기» ${keys.length}개가 전부 걸음을 옮긴다(② 줄 열림 · ③ 칸 포커스)`, keys.length > 0 && moved === keys.length, miss.join(' | '));
  ok('2-2 취소하면 ④로 돌아오고 고른 것이 그대로', await pg.evaluate((s0) => STEPS[idx].k === 'done' && !editReturn && JSON.stringify(S) === s0, snap0));
  // 걸음 표시로 옮기면 수정이 끝난다
  await pg.click(`[data-fk="${keys.find((f) => /candle|ring|declare|toast/.test(f)) || keys[0]}"]`); await pg.waitForTimeout(500);
  ok('2-2 수정 중 아래 단추 = «취소 / 저장 · 요약으로»', await pg.evaluate(() => editReturn && /저장 · 요약으로/.test(document.getElementById('next').textContent)));
  await pg.click('[data-fk="ops:pick"]'); await pg.waitForTimeout(500);
  ok('2-2 걸음 표시로 옮기면 수정 끝 · 아래 단추가 제 이름 · ① 요약 다시 보임', await pg.evaluate(() => !editReturn && STEPS[idx].k === 'pick' && !/저장 · 요약으로/.test(document.getElementById('next').textContent) && /이전/.test(document.getElementById('prev').textContent) && !!document.getElementById('opCta')));
  ok('2-2 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [코워크 회신3 3장] ①②③④ 가 같은 말을 한다 — DONE_UNIFY · SCRIPT_ENGINE · LAB_FIX · PREP_DUE · HEAD_ONE · NO_EMPTY_BOX · STUDIO_PREP
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg);
  ok('3-5 ① 머리 = 네 걸음 표시 하나(옛 눈썹 · 막대 · 순서 n/N 숨김) · 처음부터 다시 만들기는 걸음 아래', await pg.evaluate(() => document.body.classList.contains('op4') && getComputedStyle(document.getElementById('pnow')).display === 'none' && getComputedStyle(document.querySelector('.prog-bar')).display === 'none'));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  ok('3-5 담은 뒤 걸음 아래 «처음부터 다시 만들기»', await pg.evaluate(() => !!document.querySelector('.op-reset [data-fk="opreset"]')));
  await clickNext(pg); await pg.waitForTimeout(1500);
  ok('3-7 영상이 없으면 ② 머리에 큰 빈 상자가 없다', await pg.evaluate(() => !RitualOpen.VIDEO_READY.length && !document.querySelector('.ls-hero .lv')));
  const labs = await pg.evaluate(() => _lSteps(ENG, _lRows()).map((x) => x.lab).join('|'));
  ok('3-3 ② 이름표에 엔진 이름이 안 보인다(편지 뒤 자리 · 축사 없음 안내 · 둘 다 · 폐식 · 꽃 헌정)', !/편지 뒤 자리|축사 없음 안내|(^|\|)둘 다(\||$)|폐식|꽃 헌정/.test(labs), labs);
  ok('3-3 가족 예시 덕담은 서약 바로 앞 → «서약의 문을 여는» 갈래(편지 뒤 갈래 아님)', await pg.evaluate(() => ENG.RitualCue.build(S, { mode: 'preview' }).cues.some((c) => c.slug === 'narr-bless-open')));
  await pg.click('.ls-hero'); await pg.waitForTimeout(700);
  ok('3-7 크게 보기에도 빈 상자 없음 · 글이 위로', await pg.evaluate(() => !document.querySelector('#lsFull .lv')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  await clickNext(pg); await pg.waitForTimeout(700);
  const w = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, cats: document.querySelectorAll('#stage .wr-cat').length, cnt: (document.getElementById('wcCount') || {}).textContent || '' }));
  ok('3-4 ③ 머리 «비워 둬도 돼요 · 예식 7일 전까지 채우면 대본에 담겨요» · D-7 없음', /비워 둬도 돼요 · 예식 7일 전까지 채우면 대본에 담겨요/.test(w.t) && !/D-7|D-14/.test(w.t));
  ok('3-4 ③ 갈래 안에 갈래 꼬리표가 없다', w.cats === 0, w.cats);
  ok('3-4 반지 = 당일 가져오기 · 부모님께 드릴 말 = 당일 직접 읽어요 · 양가 와인 = 당일', /반지 두 개[^·]*· 평소 끼던 반지여도 괜찮아요 · 당일 가져오기/.test(w.t) && /부모님께 드릴 말 · 선택/.test(w.t) && /적어 두시면 카드로 인쇄해 드려요\. 비워 두시면 당일 직접 말씀하시면 돼요/.test(w.t) && /양가에서 와인 한 병씩 · 당일 가져오기/.test(w.t), w.t.slice(0, 400));
  ok('3-4 셈 줄은 무엇을 세는지 말한다(«여기에 적는 글 2개 중 0개»)', /^여기에 적는 글 \d+개 중 \d+개 적었어요\.$/.test(w.cnt), w.cnt);
  /* [TRIB_CARD_OPT 사장님 «칸은 두되 선택»] 선택 칸은 셈에 안 든다 · 적으면 대본(카드 인쇄)에 · 비우면 대본에 없다 */
  const tb = await pg.evaluate(() => { const t = document.querySelector('textarea[aria-label="부모님께 드릴 말"]'); const n0 = document.querySelectorAll('.wc-stat').length; t.value = '엄마 아빠 고마워요'; t.dispatchEvent(new Event('input')); const sc = scriptText(); t.value = ''; t.dispatchEvent(new Event('input')); return { has: !!t, n0, inScript: /부모님께 드릴 말\(두 분 작성 · 카드로 인쇄\):\n엄마 아빠 고마워요/.test(sc), gone: !/카드로 인쇄\):/.test(scriptText()) }; });
  ok('사장님 · 부모님께 드릴 말 선택 칸 — 셈 줄 밖(wc-stat 2) · 적으면 대본에 · 비우면 없음', tb.has && tb.n0 === 2 && tb.inScript && tb.gone, JSON.stringify(tb));
  ok('3-4 도와주실 분 문구 · [GOODS_CHOICE] 기본은 직접 준비 → 케이크 · 꽃이 «챙길 것»에 · «저희가 준비해요» 없음', /반지 교환을 담았을 때/.test(w.t) && !/반지를 담은 날/.test(w.t) && /축의금을 받으실 때만/.test(w.t) && !/저희가 준비해요/.test(w.t) && /케이크 · 크기 · 도착 시각은 상담 때 안내해 드려요 · 당일 가져오기/.test(w.t) && /부모님께 드릴 꽃 · 크기 · 도착 시각은 상담 때 안내해 드려요 · 당일 가져오기/.test(w.t), JSON.stringify([/반지 교환을 담았을 때/.test(w.t), /축의금을 받으실 때만/.test(w.t), /저희가 준비해요/.test(w.t), /부모님께 드릴 꽃 · 케이크|케이크 · 부모님께 드릴 꽃/.test(w.t)]) + ' … ' + w.t.slice(-250));
  await clickNext(pg); await pg.waitForTimeout(900);
  const d = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, rows: [...document.querySelectorAll('.sumrow')].map((r) => r.querySelector('.sr-n').textContent.trim() + ' ' + r.querySelector('.sr-l').textContent.trim()), want: _lRows().map((k) => _lNo(k) + ' ' + (k === RitualOpen.peakOf(S) ? '★ ' : '') + _lName(k)) }));
  ok('3-1 ④ 순서 요약 = ② 줄 머리(번호 · 이름 · ★)', JSON.stringify(d.rows) === JSON.stringify(d.want), JSON.stringify(d.rows) + ' vs ' + JSON.stringify(d.want));
  ok('3-1 ④ «담은 순간 N · 본식 · 단체 사진» [I1_HEAD] · 옛 준비 말(D-14 · 덕담 1~2분) 없음 · ③ 준비하기에서 보기', /담은 순간 \d+ · 본식 약 \d+~\d+분 · 단체 사진 약 \d+~\d+분/.test(d.t) && !/D-14 ?부모님께 덕담|1~2분|D-7/.test(d.t) && /③ 준비하기에서 보기/.test(d.t), d.t.slice(0, 300));
  /* ★[GOODS_CHOICE 2026-09-25 사장님 · 코워크 회신4 5-1] 케이크 · 꽃 — ② 칩(담았을 때만 · 큰절이면 꽃 없음) · 맡기면 ③ 「저희가 준비해요 · 별도 비용」 · 초안에 실림 */
  const gd = await pg.evaluate(() => {
    const R = RitualOpen, T = JSON.parse(JSON.stringify(S)), keep = S, out = {};
    out.chips = _lGroups('toast').map((g) => g.key).concat(_lGroups('tribute').map((g) => g.key));
    S.cakeBy = 'studio'; S.flowerBy = 'studio'; out.w = _openWrite(); out.sm = _ordPayload(false).summary.goods; out.bring = R.prepList(S).filter((q) => q.cat === 'bring').map((q) => q.what).join('|');
    S.tribute = 'bowGroom'; out.bow = _lGroups('tribute').map((g) => g.key); out.bowGoods = R.goodsOf(S).map((g) => g.what);
    S.toast = 'toast'; out.toastOnly = R.goodsOf(S).length;
    S = keep; Object.keys(T).forEach((k) => { S[k] = T[k]; }); delete S.cakeBy; delete S.flowerBy;
    return out;
  });
  ok('5-1 ② 칩 «케이크 준비» · «꽃 준비»가 그 순간에만 · 신랑 큰절이면 꽃 칩 없음 · 축배만이면 케이크 없음', gd.chips.includes('cakeBy') && gd.chips.includes('flowerBy') && !gd.bow.includes('flowerBy') && gd.bowGoods.join() === '케이크' && gd.toastOnly === 0, JSON.stringify(gd.chips) + JSON.stringify(gd.bow) + gd.toastOnly);
  ok('5-1 맡기면 ③ «저희가 준비해요 · 별도 비용» · 챙길 것에서 빠짐 · 초안 summary.goods 에 실림', /저희가 준비해요/.test(gd.w) && /별도 비용 · 금액은 상담 때 안내해 드려요/.test(gd.w) && !/케이크 · 크기/.test(gd.bring) && JSON.stringify(gd.sm) === JSON.stringify([{ what: '케이크', by: 'studio' }, { what: '부모님께 드릴 꽃', by: 'studio' }]), JSON.stringify(gd.sm) + ' ' + gd.bring);
  const sc = await pg.evaluate(() => scriptText());
  ok('3-2 대본 = 엔진 큐(케이크 · 축배 큐가 GLASS_READY · 편지 낭독 중 잔 없음 · 번호 ② 와 같음)', /큐: 커팅 · 포즈 동안/.test(sc) && !/편지 낭독 중 하객 잔/.test(sc) && /\n1\. 화촉/.test(sc) && !/폐식·단체촬영/.test(sc) && !/D-7/.test(sc), sc.slice(0, 500));
  const saved = await pg.evaluate(() => { let n = 0; const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) n++; }; try { saveScriptTxt(); } finally { HTMLAnchorElement.prototype.click = o; } return n; });
  ok('3-2 «파일로 저장»이 실제로 내려받기를 건다(SAVE_TXT_LIVE)', saved === 1, saved);
  ok('3장 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [코워크 추가전달 1-1 · 1-2 · 1-3] 운영에 있던 셋 — 파일로 저장 · «하객 박수로 답하기» · 임베드 Esc
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg);
  let opened = 0;
  for (const ex of await pg.evaluate(() => RitualOpen.EXAMPLES.map((e) => e.k))) {
    await pg.click(`[data-fk="opx:${ex}"]`); await pg.waitForTimeout(300);
    const n0 = errs.length;
    await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'done') { idx = i; render(); } }); await pg.waitForTimeout(500);
    if (errs.length === n0 && await pg.evaluate(() => STEPS[idx].k === 'done' && !!document.querySelector('.sumrow'))) opened++;
    await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'pick') { idx = i; render(); } }); await pg.waitForTimeout(300);
  }
  ok(`1-2 예시 넷 모두 ④ 가 열린다(${opened}/4) [SAVED_OK]`, opened === 4, errs.join(' | '));
  await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(400);
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(800);
  ok('1-2 «하객 박수로 답하기»가 새로고침 뒤에도 그대로(clap)', await pg.evaluate(() => S.declare === 'clap'));
  const saved = await pg.evaluate(() => { let n = 0, nm = ''; const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { n++; nm = this.download; } }; try { saveScriptTxt(); } finally { HTMLAnchorElement.prototype.click = o; } return { n, nm, first: scriptText().split('\n')[0] }; });
  ok('1-1 «파일로 저장»이 내려받기를 건다 · 파일 이름 · 첫 줄 [SAVE_TXT_LIVE]', saved.n === 1 && saved.nm === '우리예식대본.txt' && /^우리 예식 대본 · /.test(saved.first), JSON.stringify(saved));
  await ctx.close();
  // 1-3 임베드(?embed=1)에서 크게 보기 중 Esc — 크게 보기만 닫히고 빌더는 남는다
  const c2 = await br.newContext({ viewport: { width: 390, height: 900 } }); const p2 = await c2.newPage();
  await p2.route('**/*', (rt) => { const u = rt.request().url(); return u.startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }); });
  await p2.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`, { waitUntil: 'load' }); await p2.waitForTimeout(800);
  await p2.evaluate(() => { window.__exits = 0; const o = window._obExit; window._obExit = function () { window.__exits++; }; });
  await clickNext(p2); await p2.waitForTimeout(400); await clickNext(p2); await p2.waitForTimeout(500);
  await p2.click('[data-fk="opx:family"]'); await p2.waitForTimeout(300); await clickNext(p2); await p2.waitForTimeout(1300);
  await p2.click('.ls-hero'); await p2.waitForTimeout(600);
  await p2.keyboard.press('Escape'); await p2.waitForTimeout(300);
  ok('1-3 임베드 크게 보기 Esc → 크게 보기만 닫힘 · 빌더 나가기 안 불림 [EMBED_ESC_YIELD]', await p2.evaluate(() => document.getElementById('lsFull').hidden && window.__exits === 0));
  await p2.keyboard.press('Escape'); await p2.waitForTimeout(300);
  ok('1-3 떠 있는 것이 없으면 Esc 는 종전대로 나가기', await p2.evaluate(() => window.__exits === 1));
  await c2.close();
}
// [코워크 추가전달 2장 · 3장] OFF_LISTEN · INTRO_FOUR · PREV_BACK · UPLOAD_HONEST · WC_LIMIT · LAB_FIX2 · BIG_END · A11Y_*
{
  const { ctx, pg, errs } = await open(390);
  await clickNext(pg); await pg.waitForTimeout(400);
  ok('2-2 안내 2/2 = 네 걸음(번호 넷) · 준비는 ③ 한 곳에 · 순서 14일 · 글 7일', await pg.evaluate(() => { const t = document.getElementById('stage').textContent; return document.querySelectorAll('.ipt .n').length === 4 && /준비는 ③ 한 곳에/.test(t) && /순서는 예식 14일 전까지, 글은 예식 7일 전까지/.test(t) && !/미리듣기로 이어들으며/.test(t); }));
  await clickNext(pg); await pg.waitForTimeout(500);
  await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(400);
  const h0 = await pg.evaluate(() => history.length);
  await clickNext(pg); await pg.waitForTimeout(1300); await clickNext(pg); await pg.waitForTimeout(700);
  await pg.click('#prev'); await pg.waitForTimeout(500); await pg.click('#prev'); await pg.waitForTimeout(500);
  const h1 = await pg.evaluate(() => ({ n: history.length, k: STEPS[idx].k }));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok('2-3 «이전»은 뒤로 가기와 같은 길 — ①→②→③→이전 둘 뒤 휴대폰 뒤로가 앞 걸음으로 가지 않는다', h1.k === 'pick' && await pg.evaluate(() => STEPS[idx].k !== 'listen' && STEPS[idx].k !== 'write'), JSON.stringify({ h0, h1 }));
  await pg.goForward(); await pg.waitForTimeout(500);
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } }); await pg.waitForTimeout(1200);
  const labs = await pg.evaluate(() => _lSteps(ENG, _lRows()).map((x) => x.lab).join('|'));
  ok('2-6 이름표(박수를 청하는 말 · 하객 입장 때 · 여는 말) · «성우» 없음', /박수를 청하는 말/.test(labs) && /하객 입장 때/.test(labs) && !/하객이 박수로 답하는|입장 직후|성우/.test(labs), labs);
  ok('2-6 선언 칩 «나레이션 · 엄숙하게»', await pg.evaluate(() => RitualOpen.CHIPS.declare[0][1] === '나레이션 · 엄숙하게'));
  // 2-1 담지 않은 순간도 들려준다(고른 것은 그대로)
  const off = await pg.evaluate(() => _lOffRows()[0]);
  const on0 = await pg.evaluate(() => JSON.stringify(S.on));
  await pg.evaluate(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
  await pg.click(`[data-fk="lsp:${off}"]`); await pg.waitForTimeout(500);
  ok(`2-1 담지 않은 순간(${off}) ▶ → 재생 목록이 선다 · 고른 것은 그대로`, await pg.evaluate((a) => LP.q.length > 0 && LP.cur === a[0] && JSON.stringify(S.on) === a[1], [off, on0]));
  /* [PLAY_BESIDE_NUM P13] ▶ 는 번호 옆 그림 위 — 오른쪽 끝에 ▶ 가 없다 · 그림이 44px 이상 · 원은 이름보다 작다 */
  ok('P13 ② 줄 ▶ = 그림 위(오른쪽 끝 없음) · 누를 곳 44 이상 · 원 24 이하', await pg.evaluate(() => { const r = document.querySelector('.ls-row'); const b = r.querySelector('.ls-th.ls-play'); const pi = b && b.querySelector('.ls-pi'); const rb = b && b.getBoundingClientRect(), rp = pi && pi.getBoundingClientRect(); return !!b && !r.querySelector('.ls-acts .ls-play') && rb.height >= 44 && rb.width >= 44 && rp.width <= 24; }));
  await pg.click('#lsMini .lm-t'); await pg.waitForTimeout(600);
  ok('2-1 담지 않은 순간 ▶ → 작은 플레이어 제목으로 크게 보기 → 끝 화면이 아니라 그 순간 · «담지 않은 순간» 표시', await pg.evaluate(() => !document.getElementById('lsFull').hidden && !!LP.q.length && !/다 보셨어요/.test(document.getElementById('lsFull').textContent) && /담지 않은 순간/.test(document.querySelector('#lsFull .lf-h').textContent)));
  ok('3장 크게 보기 동안 상담 말풍선도 잠긴다(inert)', await pg.evaluate(() => { const b = document.getElementById('meAdvStack'); return !b || b.hasAttribute('inert'); }));
  await pg.evaluate(() => { LP.i = LP.q.length; _lShow(); }); await pg.waitForTimeout(300);
  ok('2-10 ② 끝 화면 = [다시 보기] [다음 · 준비하기] 둘 · 큰 ↻ 없음', await pg.evaluate(() => { const f = document.getElementById('lsFull'); return !!f.querySelector('[data-fk="lfagain"]') && !!f.querySelector('[data-fk="lfnextstep"]') && !f.querySelector('[data-fk="lfdone"]') && !f.querySelector('[data-fk="lftog"]'); }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  // 3장 radiogroup 방향키
  await pg.click('[data-fk="lsm:candle"]'); await pg.waitForTimeout(300);
  const c0 = await pg.evaluate(() => S.candleWho || RitualOpen.DEF.candleWho);
  await pg.focus('.ls-row.open [role=radio][aria-checked="true"]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(500);
  ok('3장 칩 묶음은 방향키로 옮기며 고른다 · 포커스도 따라간다', await pg.evaluate((c) => (S.candleWho || '') !== c && document.activeElement.getAttribute('role') === 'radio' && document.activeElement.getAttribute('aria-checked') === 'true', c0));
  ok('3장 고른 칩만 Tab 으로 들어간다(roving)', await pg.evaluate(() => [...document.querySelectorAll('.ls-row.open [role=radio]')].every((r) => r.tabIndex === (r.getAttribute('aria-checked') === 'true' ? 0 : -1))));
  await pg.click('[data-fk="lsm:ring"]'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsr:ring"]'); await pg.waitForTimeout(400);
  ok('3장 빼기 뒤 포커스 = «되돌리기» · 읽기 칸에 안내', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'lsundo' && /뺐어요/.test((document.getElementById('lsLive') || {}).textContent || '')));
  await pg.click('[data-fk="lsundo"]'); await pg.waitForTimeout(400);
  ok('3장 되돌리기 뒤 포커스 = 그 줄 머리', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'lsm:ring'));
  await clickNext(pg); await pg.waitForTimeout(700);
  const w = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, send: document.querySelectorAll('.send-how a[href^="https://pf.kakao.com"], .send-how a[href^="mailto:"]').length }));
  ok('2-4 · 2-8 ③ 보낼 길(카톡 · 메일)이 칸 안에 늘 보인다 · 쉬운 말', w.send >= 2 && /파일은 여기서 올라가지 않아요/.test(w.t) && /휴대폰으로 가로로 찍은 영상/.test(w.t) && !/가로 mp4/.test(w.t), w.send);
  ok('2-5 서약 · 편지 분량이 한 숫자(한 분 300자쯤 · 모두 600자쯤 · 한 분 400자쯤) · 비밀로 둬도 돼요 없음', /한 분 300자쯤\(모두 600자쯤\)/.test(w.t) && !/비밀로 둬도 돼요/.test(w.t) && !/두 줄이면 충분해요/.test(w.t));
  const warn = await pg.evaluate(() => { const t = document.querySelector('textarea[aria-label="서로에게 하는 약속(서약문)"]'); t.value = 'ㄱ'.repeat(600); t.dispatchEvent(new Event('input', { bubbles: true })); const a = getComputedStyle(document.getElementById('vowCnt')).color; t.value = 'ㄱ'.repeat(750); t.dispatchEvent(new Event('input', { bubbles: true })); return [a, getComputedStyle(document.getElementById('vowCnt')).color]; });
  ok('2-5 서약 600자는 경고색 아님 · 750자는 경고색', warn[0] !== warn[1], JSON.stringify(warn));
  ok('추가전달 2 · 3장 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [DETAIL_0925 C1 · C2 · G] 글자 대비(본문 4.5 · 큰 글 3) · 누를 곳 44px 실측 — ① · ② · 크게 보기 · ③ 를 390 · 1280 에서
const MEASURE = "window.__measure = function (root) {\n  root = root || document.body;\n  function rgb(s){ var m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p=m[1].split(',').map(parseFloat); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }\n  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }).reduce(function(s,v,i){ return s+v*[0.2126,0.7152,0.0722][i]; },0); }\n  function bgOf(el){ var stack=[]; for(var e=el;e;e=e.parentElement){ var c=rgb(getComputedStyle(e).backgroundColor); if(c&&c.a>0){ stack.push(c); if(c.a>=1) break; } } var b={r:250,g:250,b:248}; for(var i=stack.length-1;i>=0;i--){ var c=stack[i]; b={r:c.r*c.a+b.r*(1-c.a),g:c.g*c.a+b.g*(1-c.a),b:c.b*c.a+b.b*(1-c.a)}; } return b; }\n  function vis(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var cs=getComputedStyle(el); return cs.visibility!=='hidden' && cs.display!=='none' && !el.closest('[hidden],[aria-hidden=true]'); }\n  var bad=[], seen=new Set();\n  var w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT);\n  while(w.nextNode()){ var t=w.currentNode; if(!t.textContent.trim()) continue; var el=t.parentElement; if(!el||seen.has(el)||!vis(el)) continue; if(el.closest('.sr-only,svg,video,.lv-ai')) {} seen.add(el);\n    var cs=getComputedStyle(el), c=rgb(cs.color); if(!c) continue; var op=1; for(var e=el;e;e=e.parentElement) op*=parseFloat(getComputedStyle(e).opacity); var bg=bgOf(el); var fg={r:c.r*c.a*op+bg.r*(1-c.a*op),g:c.g*c.a*op+bg.g*(1-c.a*op),b:c.b*c.a*op+bg.b*(1-c.a*op)};\n    var L1=lum(fg),L2=lum(bg), ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); var fs=parseFloat(cs.fontSize), big=fs>=24||(fs>=18.66&&parseInt(cs.fontWeight)>=700); var need=big?3:4.5;\n    if(ratio<need && !el.closest('.sr-only')) bad.push({t:t.textContent.trim().slice(0,24), cls:el.className&&el.className.baseVal===undefined?String(el.className).slice(0,30):el.tagName, ratio:+ratio.toFixed(2), color:cs.color}); }\n  var small=[];\n  root.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=radio],[role=button]').forEach(function(el){ if(!vis(el)) return; if(el.closest('[inert]')) return; var r=el.getBoundingClientRect(); if(el.tagName==='A' && getComputedStyle(el).display==='inline') return; if(r.height<44-0.5 || r.width<24) small.push({t:(el.textContent||el.getAttribute('aria-label')||el.type||'').trim().slice(0,20), cls:String(el.className).slice(0,28), h:Math.round(r.height), w:Math.round(r.width)}); });\n  return {bad:bad, small:small};\n};";
for (const w of [390, 1280]) {
  const { ctx, pg } = await open(w);
  await pg.evaluate(MEASURE);
  const m = async (sel) => pg.evaluate((q) => window.__measure(q ? document.querySelector(q) : document.body), sel || null);
  const rep = (r) => JSON.stringify({ 대비: r.bad.slice(0, 3), 작은곳: r.small.slice(0, 3) });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  let r = await m(); ok(`${w} C ① 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await clickNext(pg); await pg.waitForTimeout(1200); await pg.click('[data-fk="lsm:candle"]'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  r = await m(); ok(`${w} C ② 대비 미달 0 · 44px 미만 0(줄 · 접힘 모두 연 채)`, !r.bad.length && !r.small.length, rep(r));
  await pg.click('.ls-hero'); await pg.waitForTimeout(700);
  r = await m('#lsFull'); ok(`${w} C 크게 보기 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  await clickNext(pg); await pg.waitForTimeout(700);
  r = await m(); ok(`${w} C ③ 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await ctx.close();
}
// [DETAIL_0925 A1 · G] 뒤로 가기 워크스루 — ① → ② → 크게 보기 → 뒤로 셋 · 새로고침 뒤 고른 것이 남는가
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg); await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(400);
  const picked0 = await pg.evaluate(() => RitualOpen.picked(S).join(','));
  await clickNext(pg); await pg.waitForTimeout(900);
  await pg.click('.ls-hero'); await pg.waitForTimeout(600);
  ok('A1 크게 보기가 열렸다', await pg.evaluate(() => !document.getElementById('lsFull').hidden));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok('A1 뒤로 1 → 크게 보기만 닫힌다(② 그대로)', await pg.evaluate(() => document.getElementById('lsFull').hidden && STEPS[idx].k === 'listen'));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok('A1 뒤로 2 → ① 고르기', await pg.evaluate(() => STEPS[idx].k === 'pick'));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok('A1 뒤로 3 → 안내(사이트를 떠나지 않는다)', await pg.evaluate(() => location.pathname.endsWith('/order-preview.html') && /intro/.test(STEPS[idx].k)));
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(700);
  ok('A1 새로고침 뒤 고른 것이 남는다', (await pg.evaluate(() => RitualOpen.picked(S).join(','))) === picked0, picked0);
  ok('A1 워크스루 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// ③ · ④ 장면 영상(시험 영상 두 편을 «들어온 것처럼»)
if (!TV) { console.log('못 쟀다 — ffmpeg 없음(① 자동 재생 두 줄)'); cant++; }
else {
  for (const reduce of [false, true]) {
    const { ctx, pg, errs } = await open(390, { videos: ['candle', 'vow'], reduce });
    await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
    /* [TILE_PICK · POSTER_SMALL 2026-09-26 코워크 최종판 3-5] 칸에서는 영상이 저절로 돌지 않는다 — 첫 장면 작은 판(640)만 · «AI» 는 그 칸에만 */
    const tl = await pg.evaluate(() => ({ vids: document.querySelectorAll('.pk-tile video').length, imgs: [...document.querySelectorAll('.pk-tile img')].map((i) => i.getAttribute('src')), ai: document.querySelectorAll('.pk-tile .pk-ai').length }));
    ok(`① 칸에는 영상 없음 · 첫 장면 작은 판 둘 · «AI» 둘 (reduce=${reduce})`, tl.vids === 0 && tl.imgs.length === 2 && tl.imgs.every((u) => /-640\.webp$/.test(u)) && tl.ai === 2, JSON.stringify(tl));
    await pg.click('[data-fk="pto:candle"]'); await pg.waitForTimeout(1200);
    const st = await pg.evaluate(() => { const v = document.querySelector('#pvM video'); return v ? { playing: !v.paused, muted: v.muted, ai: !!document.querySelector('#pvM .pv-ai') } : null; });
    if (!reduce) ok('① 창: 영상은 소리 없이 돈다 · 긴 AI 이름표 [PREVIEW_SHEET]', !!st && st.muted && st.playing && st.ai, JSON.stringify(st));
    else ok('④ 움직임 줄이기에서 창 영상 자동 재생 0', !!st && !st.playing, JSON.stringify(st));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
    ok(`① 창 Esc 로 닫힘 · 영상 멈춤 (reduce=${reduce})`, await pg.evaluate(() => document.getElementById('pvSheet').hidden && !document.querySelector('#pvM video')));
    ok(`영상 판 pageerror 0 (reduce=${reduce})`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
}

// ⑧ 옛 코스 초안 — 지금 화면 그대로
{
  const draft = { S: { course: 'family', on: {}, entry: 'E', welcome: 'self', vow: 'ok', ring: 'on', declare: '1', letter: 'parent', bless: 'off', tribute: 'flower', toast: 'both', off: {}, extra: {}, up: {}, guestVoice: 'nar', entryVoice: 'nar', declareWho: 'family' }, v: 2, idx: 3, sk: ['intro', 'intro2', 'course'], cs: true };
  const { ctx, pg, errs } = await open(390, { draft });
  const steps = await pg.evaluate(() => (window.STEPS || []).map((x) => x.k).join(','));
  ok('⑧ 옛 코스 초안 → 순간마다의 화면이 선다(보고 듣기 없음)', !/listen/.test(steps) && /course|tune|guest/.test(steps), steps);
  ok('⑧ 옛 코스 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : cant ? '\n결과 — 실패 0 · 재지 못한 줄 있음' : '\n결과 — 전부 통과');
process.exit(fail ? 1 : cant ? 2 : 0);
