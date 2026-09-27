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
  /* ★[FLOW_MAKE · PRACTICE_STEP 2026-09-27 코워크 설계 · 사장님 결정] 새 코스 = ① 고르기 · ② 하나씩 만들기 · ③ 연습하기 · ④ 완성.
     옛 ② 목록(ls-row · 줄 열기 · 목록 칩)과 옛 ③ 준비하기(글 칸 모음)는 걷었다 — 그 검사는 이 블록이 새 화면으로 대신한다. */
  ok(`${w} 새 코스 STEPS = 네 걸음(② 하나씩 만들기 · ③ 연습하기)`, (await pg.evaluate(() => STEPS.map((s) => s.k).join(','))) === 'intro,intro2,pick,listen,practice,done');
  ok(`${w} ① 에 걸음 표시(① 고르기가 지금)`, await pg.evaluate(() => { const o = document.querySelector('.op-steps li.on'); return !!o && /고르기/.test(o.textContent); }));
  /* [PICK_V2 2026-09-26 코워크 최종판 3장] ① 은 예시 → 감동 흐름 → 네 막 칸 → 아래 막대. 판 칩 · 카드 · 자동 재생 영상은 없다. */
  ok(`${w} ① 칸에 판 칩이 없다(② 로 옮김)`, await pg.evaluate(() => document.querySelectorAll('.pk .op-chip').length === 0));
  ok(`${w} ① 칸 열셋 · 칸마다 16:9 그림 자리 [TILE_PICK]`, await pg.evaluate(() => { const t = [...document.querySelectorAll('.pk-tile')]; return t.length === 13 && t.every((c) => c.querySelector('.pk-media')); }));
  ok(`${w} ① 빈 채 아래 막대는 숫자 없이 «예시로 시작하거나 …» [BAR_SUM]`, await pg.evaluate(() => { const c = document.getElementById('opCta'); return !!c && /예시로 시작하거나 아래에서 담아 보세요/.test(c.textContent) && !/\d/.test(c.textContent); }));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  ok(`${w} ① 담으면 아래 막대 «본식 · 단체 사진» 시간 둘 · 개수 없음 [BAR_SUM]`, await pg.evaluate(() => { const t = (document.getElementById('opCta') || {}).textContent || ''; return /본식\s약\s?\d+~\d+분\s·\s단체\s사진\s약\s?\d+~\d+분/.test(t) && !/담은 순간|고른 순간/.test(t); }));
  await pg.click('[data-fk="pto:declare"]'); await pg.waitForTimeout(500);
  ok(`${w} ① 창 «② 에서 고를 것 · 누가 · 말투» · 남는 사진`, await pg.evaluate(() => /고를 것 · 누가 · 말투$/.test((document.getElementById('pvCh') || {}).textContent || '') && /남는 사진/.test((document.getElementById('pvShot') || {}).textContent || '')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(`${w} ① 소제목에 동그라미 번호 없음 · 남는 장면이라는 말 없음`, await pg.evaluate(() => ![...document.querySelectorAll('.pk-h,.pk-act-h,.pk-fp-h h3')].some((h) => /[①②③]/.test(h.textContent)) && !/남는 장면/.test(document.getElementById('stage').textContent)));
  ok(`${w} ① 고객 화면에 «판» 없음`, await pg.evaluate(() => !/판 바꿈|고를 수 있는 판|그 판으로/.test(document.getElementById('stage').textContent)));
  await clickNext(pg); await pg.waitForTimeout(1500);
  ok(`${w} [STEP_BASELINE 4-e] 걸음 표시 — 지난 걸음과 지금 걸음의 글줄이 같다`, await pg.evaluate(() => { const ys = [...document.querySelectorAll('.op-steps li')].map((li) => { const tw = document.createTreeWalker(li, NodeFilter.SHOW_TEXT); let t = tw.nextNode(); while (t && !t.textContent.trim()) t = tw.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return Math.round(r.getBoundingClientRect().top); }); return ys.length === 4 && Math.max(...ys) - Math.min(...ys) <= 1; }));
  ok(`${w} ② 제목 «하나씩 만들기» · 걸음 표시`, await pg.evaluate(() => document.getElementById('stepHead').textContent === '하나씩 만들기' && /하나씩 만들기/.test(document.querySelector('.op-steps li.on').textContent)));
  const pages = await pg.evaluate(() => _mkPages());
  ok(`${w} ② 쪽 = 고른 순서 · 하객 맞이 · 식전 영상 · 담은 순간 · 닫는 인사 · 한눈에 보기 [FLOW_MAKE · MK_INTRO]`, pages[0] === '_intro' && pages[1] === 'guest' && pages[2] === 'prevideo' && pages[pages.length - 2] === '_close' && pages[pages.length - 1] === '_sum', pages.join(','));
  /* [MK_INTRO] 첫 쪽 = ① 에서 고른 순서 모아 보기 · 쪽마다 할 일 꼬리표 · «시작하기» */
  const ii = await pg.evaluate(() => ({ at: _mkState().at, h: document.getElementById('mkHead').textContent, rows: document.querySelectorAll('.mk-ilist .mk-irow').length, tag: [...document.querySelectorAll('.mk-itag')].map((x) => x.textContent).join('|'), next: document.getElementById('next').textContent }));
  ok(`${w} ② 첫 쪽 «고른 순서» — 순간마다 한 줄 · 할 일 꼬리표(고르기 · 두 분이 할 말) · «시작하기 · 하객 맞이 안내» [MK_INTRO]`, ii.at === '_intro' && ii.h === '고른 순서' && ii.rows === pages.length - 2 && /두 분이 할 말/.test(ii.tag) && /고르기/.test(ii.tag) && /^시작하기 · 하객 맞이 안내$/.test(ii.next.replace(/\u00a0/g, ' ')), JSON.stringify(ii));
  ok(`${w} ② 진행 순서 줄 = 쪽마다 단추 하나(고른 순서 쪽 제외) · «미완료 N» 단추 없음 [MK_TODO_PASSED]`, await pg.evaluate((n) => document.querySelectorAll('#mkStrip .mk-it:not(.mk-add)').length === n && !document.querySelector('[data-fk="mktodo"]'), pages.length - 1));
  ok(`${w} ② 들어가자마자 소리 없음(자동 재생 없음)`, await pg.evaluate(() => !LP.q.length && (!LP.el || LP.el.paused)));
  await clickNext(pg); await pg.waitForTimeout(400);
  ok(`${w} ② «시작하기» → 하객 맞이 쪽 · 지금 쪽 aria-current`, await pg.evaluate(() => STEPS[idx].k === 'listen' && _mkState().at === 'guest' && !!document.querySelector('#mkStrip .mk-it.cur[aria-current="step"]')));
  await clickNext(pg); await pg.waitForTimeout(400);
  ok(`${w} ② «다음»은 다음 순간으로(걸음은 그대로)`, await pg.evaluate((p2) => STEPS[idx].k === 'listen' && _mkState().at === p2, pages[2]));
  ok(`${w} ② 표시는 지나온 쪽에만 — 지금 · 앞으로 올 쪽은 비어 있다 [MK_TODO_PASSED]`, await pg.evaluate(() => { const its = [...document.querySelectorAll('#mkStrip .mk-it:not(.mk-add)')], ci = its.findIndex((b) => b.classList.contains('cur')); return ci === 1 && /done|todo/.test(its[0].className) && its.slice(ci).every((b) => !/ (done|todo)/.test(b.className)); }));
  await pg.click('#prev'); await pg.waitForTimeout(400);
  ok(`${w} ② «이전»은 앞 순간으로`, await pg.evaluate(() => STEPS[idx].k === 'listen' && _mkState().at === 'guest'));
  /* [MK_PICK_TOP] 고르기가 먼저 · 그 아래 «고른 대로 들어 보기» · 흐름은 그 뒤 */
  ok(`${w} ② 고르기 → «고른 대로 들어 보기» → 흐름 차례 [MK_PICK_TOP]`, await pg.evaluate(() => { const a = document.querySelector('.mk-pick .ls-vars'), b = document.querySelector('[data-fk="mkplay"]'), c = document.querySelector('.mk-flow'); const F = Node.DOCUMENT_POSITION_FOLLOWING; return !!a && !!b && !!c && !!(a.compareDocumentPosition(b) & F) && !!(b.compareDocumentPosition(c) & F) && /고른 대로 들어 보기/.test(b.textContent); }));
  ok(`${w} ② 진행 줄 양끝 흐림(끝이 뚝 잘리지 않게) [MK_STRIP_FADE]`, await pg.evaluate(() => { const c = getComputedStyle(document.querySelector('#mkStrip .mk-sc')); return /gradient/.test(c.maskImage || c.webkitMaskImage || ''); }));
  // 서약 쪽 — 흐름 · 참고 예시 · 두 칸
  await pg.evaluate(() => mkGo('vow')); await pg.waitForTimeout(500);
  ok(`${w} ② 서약 쪽 머리 = 번호 · 이름 · 흐름에 «신랑 차례 · 신부 차례»`, await pg.evaluate(() => /혼인 서약/.test(document.getElementById('mkHead').textContent) && /신랑 차례/.test(document.querySelector('.mk-flow').textContent) && /신부 차례/.test(document.querySelector('.mk-flow').textContent)));
  const rf = await pg.evaluate(() => ({ n: document.querySelectorAll('.mk-ref .mk-rx').length, b: [...document.querySelectorAll('.mk-ref .lf-refb')].map((x) => x.textContent), d: (document.querySelector('.mk-ref .mk-rd') || {}).textContent || '', note: (document.querySelector('.mk-ref .lf-refn') || {}).textContent || '', play: document.querySelectorAll('.mk-ref button').length, len: (document.querySelector('.mk-ref .mk-rl') || {}).textContent || '' }));
  ok(`${w} ② 참고 예시 세 벌 · 배지는 «참고 예시 N» 까지(결 없음 · REF_NO_KYEOL) · 글로만(듣기 단추 · 목소리 문장 없음) · «N자 · 소리 내어 읽으면 약 N초» [MK_REF · CAST_TEXT_ONLY]`, rf.n === 3 && rf.b.join('|') === '참고 예시 1|참고 예시 2|참고 예시 3' && rf.d === '당일엔 두 분이 직접 말해요' && /예시 속 이름은 가상 인물이에요/.test(rf.note) && rf.play === 0 && /^\d+자 · 소리 내어 읽으면 약\s\d+초$/.test(rf.len), JSON.stringify(rf));
  await pg.click('.mk-rx:nth-of-type(2) summary').catch(() => {}); await pg.evaluate(() => { const d = document.querySelectorAll('.mk-rx')[1]; d.open = true; }); await pg.waitForTimeout(200);
  await pg.click('[data-fk="mkplay"]'); await pg.waitForTimeout(500);
  ok(`${w} ② 펼친 예시(2)가 «이 순간 들어 보기»의 두 분 차례 글이 된다 · 소리 없음`, await pg.evaluate(() => LP.cur === 'vow' && LP.q.filter((s) => s.talk2).every((s) => s.refN === 1 && !s.src)));
  ok(`${w} ② 재생 중 작은 플레이어`, await pg.evaluate(() => getComputedStyle(document.getElementById('lsMini')).display === 'flex'));
  await pg.evaluate(() => lsStop());
  await pg.fill('#mkt_vow_g', '나는 약속'); await pg.fill('#mkt_vow_b', '나도 약속'); await pg.waitForTimeout(200);
  ok(`${w} ② 신랑 칸 · 신부 칸 따로 · 옛 한 칸(vowText)은 두 칸을 이어 붙인다 · 칸마다 고친 시각 [TX_MERGE]`, await pg.evaluate(() => S.tx['vow.g'] === '나는 약속' && S.tx['vow.b'] === '나도 약속' && S.vowText === '신랑 · 나는 약속\n\n신부 · 나도 약속' && S.fAt['tx.vow.g'] > 0 && S.fAt['tx.vow.b'] > 0));
  ok(`${w} ② 글자수 · 소리 내어 읽는 초`, await pg.evaluate(() => /5자 · 소리 내어 읽으면 약 1초/.test(document.getElementById('mkc_vow_g').textContent)));
  // ② 고르기 칩 — radiogroup · 고른 칩이 눈에 보인다 [CHIP_CHECKED] (녹음 기록과 상관없이 · [REC_STATE_FREE] 두 분 차례는 소리가 없다)
  await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(400);
  ok(`${w} ② 칩 = radiogroup · radio · 누를 곳 44px · 고른 칩은 바탕이 다르다 [CHIP_CHECKED]`, await pg.evaluate(() => { const on = document.querySelector('.mk-pg .op-chip[aria-checked="true"]'), off = document.querySelector('.mk-pg .op-chip[aria-checked="false"]'); return !!on && !!off && on.getAttribute('role') === 'radio' && !!on.closest('[role=radiogroup]') && on.getBoundingClientRect().height >= 44 && getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor; }));
  // 빼기 = 흐리게 남기고 다시 넣기 [DROP_DIM]
  await pg.evaluate(() => mkGo('bless')); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkdrop"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 빼기 → 쪽은 제자리에 흐리게 · «다시 넣기» [DROP_DIM]`, await pg.evaluate(() => !RitualOpen.onOf(S, 'bless') && _mkPages().indexOf('bless') > -1 && !!document.querySelector('.mk-pg.off') && !!document.querySelector('[data-fk="mkundrop"]')));
  await pg.click('[data-fk="mkundrop"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 다시 넣기 → 다시 담긴다`, await pg.evaluate(() => RitualOpen.onOf(S, 'bless') && !document.querySelector('.mk-pg.off')));
  ok(`${w} ② 가로 넘침 0`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // 한눈에 보기 → ③ 연습하기
  await pg.evaluate(() => mkGo('_sum')); await pg.waitForTimeout(400);
  ok(`${w} ② 마지막 쪽 = 한눈에 보기 · 아래 단추 «다음 · ③ 연습하기»`, await pg.evaluate(() => /한눈에 보기/.test(document.getElementById('mkHead').textContent) && /③ 연습하기/.test(document.getElementById('next').textContent)));
  await clickNext(pg); await pg.waitForTimeout(700);
  ok(`${w} ③ 연습하기 — «처음부터 끝까지» · 막 단추 · 빠르게 훑기 [PRACTICE_STEP]`, await pg.evaluate(() => STEPS[idx].k === 'practice' && !!document.querySelector('[data-fk="prall"]') && document.querySelectorAll('[data-fk^="pra:"]').length > 0 && !!document.querySelector('[data-fk="prfast"]')));
  // 크게 보기 · Esc
  await pg.click('[data-fk="prall"]'); await pg.waitForTimeout(700);
  ok(`${w} ③ «처음부터 끝까지» → 크게 보기 · 식전 표시 · 본식부터 단추 · 뒤는 inert`, await pg.evaluate(() => { const f = document.getElementById('lsFull'); return !f.hidden && /식전/.test(f.querySelector('.lf-h').textContent) && !!f.querySelector('[data-fk="lfskip"]') && f.querySelector('.lf-txt').textContent.length > 10 && document.querySelector('.wrap').hasAttribute('inert'); }));
  await pg.click('[data-fk="lfskip"]'); await pg.waitForTimeout(400);
  ok(`${w} ③ 본식부터 보기 → «연습 · 1 / N»(PRACTICE_CHOOSE 머리 이름)`, await pg.evaluate(() => /^연습 · 1 \/ \d+$/.test(document.querySelector('#lsFull .lf-h span').textContent.trim())));
  ok(`${w} ③ 크게 보기의 자막 = 엔진 큐 문안`, await pg.evaluate(() => { const st = LP.q[LP.i]; return st && document.querySelector('.lf-txt').textContent === st.txt; }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  ok(`${w} ③ Esc 로 크게 보기가 닫힌다(작게 · 뒤 잠금 풀림)`, await pg.evaluate(() => document.getElementById('lsFull').hidden && !document.querySelector('.wrap').hasAttribute('inert')));
  await pg.evaluate(() => lsStop());
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
  // ① 녹음 기록 그대로: 소리 나는 줄이 있으면 전부 «녹음된 글 = 자막»이어야 한다
  const chk = () => pg.evaluate(() => { const st = _lSteps(ENG, _lRows()); const nz = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, ''); const bad = st.filter((x) => x.src && nz(_lRecText(x.file)) !== nz(x.txt)); return { sound: st.filter((x) => x.src).length, bad: bad.map((x) => x.file) }; });
  let r = await chk();
  ok('2-1 녹음 그대로 — 소리 나는 줄 중 자막과 다른 줄 0', r.bad.length === 0, JSON.stringify(r));
  ok('2-1 9/26 녹음이 들어온 뒤 — 가족 예시 ② 에 소리 나는 줄이 있다 [REC_STATE_FREE]', r.sound > 0, JSON.stringify(r));
  /* [REC_STATE_FREE] 아래 ②③ 은 «두 줄만 재녹음»을 흉내 낸다 — 먼저 녹음 기록을 비워 출발점을 «전부 녹음 전»으로 맞춘다 */
  await pg.evaluate(() => { for (const k in LREC) delete LREC[k]; render(); }); await pg.waitForTimeout(300);
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
  const pagesNow = await pg.evaluate(() => _mkPages()); const _noPage = (k) => pagesNow.indexOf(k) < 0;
  for (const fk of keys) {
    await toDone();
    const lab = await pg.evaluate((f) => { const b = document.querySelector(`[data-fk="${f}"]`); return b ? b.textContent : ''; }, fk);
    await pg.click(`[data-fk="${fk}"]`); await pg.waitForTimeout(500);
    /* [FLOW_MAKE 2026-09-27] «변경» · «채우기» 모두 ② 의 그 순간 한 쪽으로 간다 — 글이 비었으면 신랑 칸 · 아니면 그 쪽 머리에 포커스 */
    const r = await pg.evaluate((f) => ({ k: STEPS[idx].k, er: editReturn, at: _mkState().at, want: f.split(':')[1], foc: document.activeElement ? document.activeElement.id : '' }), fk);
    const good = r.k === 'listen' && r.er && (r.at === r.want || (r.at === 'guest' && _noPage(r.want))) && (lab === '채우기' ? /^mkt_.+_g$/.test(r.foc) : /^(mkHead|mkt_.+_g)$/.test(r.foc));
    if (good) moved++; else miss.push(fk + ':' + lab + ':' + JSON.stringify(r));
    await pg.click('#prev'); await pg.waitForTimeout(400);   // 취소
  }
  ok(`2-2 ④ «변경» · «채우기» ${keys.length}개가 전부 ② 의 그 순간으로 간다(머리 · 빈 글이면 신랑 칸 포커스) [FLOW_MAKE]`, keys.length > 0 && moved === keys.length, miss.join(' | '));
  ok('2-2 취소하면 ④로 돌아오고 고른 것이 그대로', await pg.evaluate((s0) => STEPS[idx].k === 'done' && !editReturn && JSON.stringify(S) === s0, snap0));
  // 걸음 표시로 옮기면 수정이 끝난다
  await pg.click(`[data-fk="${keys.find((f) => /candle|ring|declare|toast/.test(f)) || keys[0]}"]`); await pg.waitForTimeout(500);
  ok('2-2 수정 중 아래 단추 = «취소 / 요약으로 돌아가기» [RIT_BACK_WORD]', await pg.evaluate(() => editReturn && /요약으로 돌아가기/.test(document.getElementById('next').textContent)));
  await pg.click('[data-fk="ops:pick"]'); await pg.waitForTimeout(500);
  ok('2-2 걸음 표시로 옮기면 수정 끝 · 아래 단추가 제 이름 · ① 요약 다시 보임', await pg.evaluate(() => !editReturn && STEPS[idx].k === 'pick' && !/요약으로 돌아가기/.test(document.getElementById('next').textContent) && /이전/.test(document.getElementById('prev').textContent) && !!document.getElementById('opCta')));
  ok('2-2 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [코워크 회신3 3장] ①②③④ 가 같은 말을 한다 — DONE_UNIFY · SCRIPT_ENGINE · LAB_FIX · PREP_DUE · HEAD_ONE · NO_EMPTY_BOX · STUDIO_PREP
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg);
  ok('3-5 ① 머리 = 네 걸음 표시 하나(옛 눈썹 · 막대 · 순서 n/N 숨김) · 처음부터 다시 만들기는 걸음 아래', await pg.evaluate(() => document.body.classList.contains('op4') && getComputedStyle(document.getElementById('pnow')).display === 'none' && getComputedStyle(document.querySelector('.prog-bar')).display === 'none'));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  // [HEAD_PILLS 2026-09-27 사장님] 걸음 아래 밑줄 글 → 머리 알약 넷(안내 보기 · 다시 만들기 · 저장 · 나가기)
  ok('3-5 담은 뒤 머리 알약 «처음부터 다시 만들기»·«안내 다시 보기» · 걸음 아래 옛 글 없음', await pg.evaluate(() => { const v = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }; return v('obRestart') && v('obGuide') && !document.querySelector('.op-reset [data-fk="opreset"]'); }));
  await clickNext(pg); await pg.waitForTimeout(1500);
  ok('3-7 영상이 없으면 ② 쪽에 큰 빈 상자가 없다', await pg.evaluate(() => !RitualOpen.VIDEO_READY.length && !document.querySelector('.mk-vid')));
  const labs = await pg.evaluate(() => _lSteps(ENG, _lRows()).map((x) => x.lab).join('|'));
  ok('3-3 ② 이름표에 엔진 이름이 안 보인다(편지 뒤 자리 · 축사 없음 안내 · 둘 다 · 폐식 · 꽃 헌정)', !/편지 뒤 자리|축사 없음 안내|(^|\|)둘 다(\||$)|폐식|꽃 헌정/.test(labs), labs);
  ok('3-3 가족 예시 덕담은 서약 바로 앞 → «서약의 문을 여는» 갈래(편지 뒤 갈래 아님)', await pg.evaluate(() => ENG.RitualCue.build(S, { mode: 'preview' }).cues.some((c) => c.slug === 'narr-bless-open')));
  await pg.evaluate(() => lsPlayAll()); await pg.waitForTimeout(700);
  ok('3-7 크게 보기에도 빈 상자 없음 · 글이 위로', await pg.evaluate(() => !document.querySelector('#lsFull .lv')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  /* ★[FLOW_MAKE 2026-09-27] 옛 ③ 준비하기(글 칸 모음)는 걷었다 — 준비할 것은 ② 의 그 순간 쪽(부탁 · 보낼 · 챙길)과 마지막 «한눈에 보기»가 말한다 */
  const pgT = async (k) => { await pg.evaluate((x) => mkGo(x), k); await pg.waitForTimeout(350); return pg.evaluate(() => document.getElementById('stage').textContent.replace(/\u00a0/g, ' ')); };
  const tRing = await pgT('ring'), tTrib = await pgT('tribute'), tToast = await pgT('toast'), tSum = await pgT('_sum');
  const w = { t: tSum };
  ok('3-4 ② 반지 쪽 = 당일 가져오기 · 부모님께 인사 쪽 = 카드 선택 칸 · 케이크 · 축배 쪽 = 양가 와인 당일', /반지 두 개[^·]*· 평소 끼던 반지여도 괜찮아요 · 당일 가져오기/.test(tRing) && /적어 두시면 카드로 드려요 · 비워 두셔도 돼요/.test(tTrib) && /양가에서 와인 한 병씩 · 당일 가져오기/.test(tToast), tTrib.slice(0, 200));
  ok('3-4 한눈에 보기 = 미완료 · 부모님께 부탁드릴 것 · 보낼 것 · 당일 챙길 것 · 도와주실 분 · D-7 없음 [MK_HELPERS]', /미완료 \d+/.test(tSum) && /부모님께 부탁드릴 것 \d+/.test(tSum) && /보낼 것/.test(tSum) && /당일 챙길 것/.test(tSum) && /도와주실 분/.test(tSum) && !/D-7|D-14/.test(tSum), tSum.slice(0, 300));
  /* [TRIB_CARD_OPT 사장님 «칸은 두되 선택»] 부모님께 드릴 말 칸은 미완료 셈에 안 든다 · 적으면 대본(카드 인쇄)에 · 비우면 대본에 없다 */
  await pg.evaluate(() => mkGo('tribute')); await pg.waitForTimeout(300);
  const tb = await pg.evaluate(() => { const u0 = mkUndone(); const t = document.getElementById('mkt_tribute_g'); t.value = '엄마 아빠 고마워요'; t.dispatchEvent(new Event('input')); const sc = scriptText(); t.value = ''; t.dispatchEvent(new Event('input')); return { has: !!t, same: mkUndone() === u0, inScript: /카드로 인쇄/.test(sc) && /엄마 아빠 고마워요/.test(sc), gone: !/엄마 아빠 고마워요/.test(scriptText()) }; });
  ok('사장님 · 부모님께 드릴 말 선택 칸 — 미완료 셈 밖 · 적으면 대본에 · 비우면 없음', tb.has && tb.same && tb.inScript && tb.gone, JSON.stringify(tb));
  ok('3-4 도와주실 분 문구 · [GOODS_CHOICE] 기본은 직접 준비 → 케이크 · 꽃이 «챙길 것»에 · «저희가 준비해요» 없음', /반지 교환을 담았을 때/.test(w.t) && !/반지를 담은 날/.test(w.t) && /축의금을 받으실 때만/.test(w.t) && !/저희가 준비해요/.test(w.t) && /케이크 · 크기 · 도착 시각은 상담 때 안내해 드려요 · 당일 가져오기/.test(w.t) && /부모님께 드릴 꽃 · 크기 · 도착 시각은 상담 때 안내해 드려요 · 당일 가져오기/.test(w.t), JSON.stringify([/반지 교환을 담았을 때/.test(w.t), /축의금을 받으실 때만/.test(w.t), /저희가 준비해요/.test(w.t), /부모님께 드릴 꽃 · 케이크|케이크 · 부모님께 드릴 꽃/.test(w.t)]) + ' … ' + w.t.slice(-250));
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'done') { idx = i; render(); } }); await pg.waitForTimeout(900);
  const d = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, rows: [...document.querySelectorAll('.sumrow')].map((r) => r.querySelector('.sr-n').textContent.trim() + ' ' + r.querySelector('.sr-l').textContent.trim()), want: _lRows().map((k) => _lNo(k) + ' ' + (k === RitualOpen.peakOf(S) ? '★ ' : '') + _lName(k)) }));
  ok('3-1 ④ 순서 요약 = ② 줄 머리(번호 · 이름 · ★)', JSON.stringify(d.rows) === JSON.stringify(d.want), JSON.stringify(d.rows) + ' vs ' + JSON.stringify(d.want));
  ok('3-1 ④ «담은 순간 N · 본식 · 단체 사진» [I1_HEAD] · 옛 준비 말(D-14 · 덕담 1~2분) 없음 · ② 한눈에 보기에서 보기', /담은 순간 \d+ · 본식 약\s\d+~\d+분 · 단체 사진 약\s\d+~\d+분/.test(d.t) && !/D-14 ?부모님께 덕담|1~2분|D-7/.test(d.t) && /②\s한눈에 보기에서 보기/.test(d.t), d.t.slice(0, 300));
  /* ★[GOODS_CHOICE 2026-09-25 사장님 · 코워크 회신4 5-1] 케이크 · 꽃 — ② 칩(담았을 때만 · 큰절이면 꽃 없음) · 맡기면 ③ 「저희가 준비해요 · 별도 비용」 · 초안에 실림 */
  const gd = await pg.evaluate(() => {
    const R = RitualOpen, T = JSON.parse(JSON.stringify(S)), keep = S, out = {};
    out.chips = _lGroups('toast').map((g) => g.key).concat(_lGroups('tribute').map((g) => g.key));
    S.cakeBy = 'studio'; S.flowerBy = 'studio'; out.w = _mkSum(); out.sm = _ordPayload(false).summary.goods; out.bring = R.prepList(S).filter((q) => q.cat === 'bring').map((q) => q.what).join('|');
    S.tribute = 'bowGroom'; out.bow = _lGroups('tribute').map((g) => g.key); out.bowGoods = R.goodsOf(S).map((g) => g.what);
    S.toast = 'toast'; out.toastOnly = R.goodsOf(S).length;
    S = keep; Object.keys(T).forEach((k) => { S[k] = T[k]; }); delete S.cakeBy; delete S.flowerBy;
    return out;
  });
  ok('5-1 ② 칩 «케이크 준비» · «꽃 준비»가 그 순간에만 · 신랑 큰절이면 꽃 칩 없음 · 축배만이면 케이크 없음', gd.chips.includes('cakeBy') && gd.chips.includes('flowerBy') && !gd.bow.includes('flowerBy') && gd.bowGoods.join() === '케이크' && gd.toastOnly === 0, JSON.stringify(gd.chips) + JSON.stringify(gd.bow) + gd.toastOnly);
  ok('5-1 맡기면 ③ «저희가 준비해요 · 별도 비용» · 챙길 것에서 빠짐 · 초안 summary.goods 에 실림', /저희가 준비해요/.test(gd.w) && /별도 비용 · 금액은 상담 때 안내해 드려요/.test(gd.w) && !/케이크 · 크기/.test(gd.bring) && JSON.stringify(gd.sm) === JSON.stringify([{ what: '케이크', by: 'studio' }, { what: '부모님께 드릴 꽃', by: 'studio' }]), JSON.stringify(gd.sm) + ' ' + gd.bring);
  const sc = await pg.evaluate(() => scriptText());
  /* [RIT_NO_CUE_COPY 2026-09-27 4부 20] 고객용 복사 · 파일 저장에는 «큐:»(현장 지시) 줄이 없다 — 케이크 · 축배 큐(GLASS_READY)는 엔진 · 콘솔이 그대로 지닌다 */
  ok('3-2 대본 = 엔진 순서(«큐:» 줄 없음 [RIT_NO_CUE_COPY] · 편지 낭독 중 잔 없음 · 번호 ② 와 같음)', !/^큐: /m.test(sc) && !/편지 낭독 중 하객 잔/.test(sc) && /\n1\. 화촉/.test(sc) && !/폐식·단체촬영/.test(sc) && !/D-7/.test(sc), sc.slice(0, 500));
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
  await p2.evaluate(() => lsPlayAll()); await p2.waitForTimeout(600);
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
  /* [INTRO_JOURNEY 2026-09-27 사장님] «미리 알아두면 좋아요» 상자를 빼고 «여기서 네 걸음 → 그다음 예식까지(연습 · 순서 확정 · 글 마감 · 당일)» */
  ok('2-2 안내 2/2 = 네 걸음(번호 넷) · 예식까지 네 줄(연습 · 순서 확정 예식 14일 전 · 글 마감 예식 7일 전 · 진행은 저희가) · «미리 알아두면» 상자 없음 [INTRO_JOURNEY]', await pg.evaluate(() => { const t = document.getElementById('stage').textContent; const rows = [...document.querySelectorAll('.daymap.jr .seqr')].map((r) => r.textContent); return document.querySelectorAll('.ipt .n').length === 4 && rows.length === 4 && /연습/.test(rows[0]) && /③\s연습하기/.test(rows[0]) && /14일\s전/.test(rows[1]) && /순서 확정/.test(rows[1]) && /7일\s전/.test(rows[2]) && /글 마감/.test(rows[2]) && /진행은 저희가/.test(rows[3]) && !/미리 알아두면/.test(t) && !/미리듣기로 이어들으며/.test(t); }));
  await clickNext(pg); await pg.waitForTimeout(500);
  await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(400);
  const h0 = await pg.evaluate(() => history.length);
  /* [FLOW_MAKE] ① → ② 첫 쪽 → ② 다음 쪽 → 이전 둘 = ① 로 · 휴대폰 뒤로가 ② 로 가지 않는다 */
  await clickNext(pg); await pg.waitForTimeout(1300); await clickNext(pg); await pg.waitForTimeout(700);
  await pg.click('#prev'); await pg.waitForTimeout(500); await pg.click('#prev'); await pg.waitForTimeout(500);
  const h1 = await pg.evaluate(() => ({ n: history.length, k: STEPS[idx].k }));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok('2-3 «이전»은 뒤로 가기와 같은 길 — ①→② 두 쪽→이전 둘 뒤 휴대폰 뒤로가 앞 걸음으로 가지 않는다', h1.k === 'pick' && await pg.evaluate(() => STEPS[idx].k !== 'listen' && STEPS[idx].k !== 'practice'), JSON.stringify({ h0, h1 }));
  await pg.goForward(); await pg.waitForTimeout(500);
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } }); await pg.waitForTimeout(1200);
  const labs = await pg.evaluate(() => _lSteps(ENG, _lRows()).map((x) => x.lab).join('|'));
  ok('2-6 이름표(박수를 청하는 말 · 하객 입장 때 · 여는 말) · «성우» 없음', /박수를 청하는 말/.test(labs) && /하객 입장 때/.test(labs) && !/하객이 박수로 답하는|입장 직후|성우/.test(labs), labs);
  ok('2-6 선언 칩 «나레이션 · 엄숙하게»', await pg.evaluate(() => RitualOpen.CHIPS.declare[0][1] === '나레이션 · 엄숙하게'));
  // 크게 보기 · 끝 화면(③ 연습하기에서)
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'practice') { idx = i; render(); } }); await pg.waitForTimeout(800);
  await pg.click('[data-fk="prall"]'); await pg.waitForTimeout(700);
  ok('3장 크게 보기 동안 상담 말풍선도 잠긴다(inert)', await pg.evaluate(() => { const b = document.getElementById('meAdvStack'); return !b || b.hasAttribute('inert'); }));
  await pg.evaluate(() => { LP.i = LP.q.length; _lShow(); }); await pg.waitForTimeout(300);
  ok('2-10 ③ 끝 화면 = [다시 보기] [다음 · ④ 완성] 둘 · 큰 ↻ 없음 [FLOW_MAKE]', await pg.evaluate(() => { const f = document.getElementById('lsFull'); const n = f.querySelector('[data-fk="lfnextstep"]'); return !!f.querySelector('[data-fk="lfagain"]') && !!n && /④\s완성/.test(n.textContent) && !f.querySelector('[data-fk="lfdone"]') && !f.querySelector('[data-fk="lftog"]'); }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  // 3장 radiogroup 방향키 — ② 화촉 쪽 «고르기»
  await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(400);
  const c0 = await pg.evaluate(() => S.candleWho || RitualOpen.DEF.candleWho);
  await pg.focus('.mk-pg [role=radio][aria-checked="true"]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(500);
  ok('3장 칩 묶음은 방향키로 옮기며 고른다 · 포커스도 따라간다', await pg.evaluate((c) => (S.candleWho || '') !== c && document.activeElement.getAttribute('role') === 'radio' && document.activeElement.getAttribute('aria-checked') === 'true', c0));
  ok('3장 고른 칩만 Tab 으로 들어간다(roving)', await pg.evaluate(() => [...document.querySelectorAll('.mk-pg [role=radio]')].filter((r) => r.closest('[role=radiogroup]')).every((r) => r.tabIndex === (r.getAttribute('aria-checked') === 'true' ? 0 : -1))));
  await pg.evaluate(() => mkGo('ring')); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkdrop"]'); await pg.waitForTimeout(400);
  ok('3장 빼기 뒤 포커스 = «다시 넣기» [DROP_DIM]', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'mkundrop'));
  await pg.click('[data-fk="mkundrop"]'); await pg.waitForTimeout(400);
  ok('3장 다시 넣은 뒤 포커스 = «이 순간 빼기»(같은 자리)', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'mkdrop'));
  // 보낼 길 — ② 식전 영상 쪽
  await pg.evaluate(() => { if (!RitualOpen.onOf(S, 'prevideo')) { S.on.prevideo = 1; opSync(); } mkGo('prevideo'); }); await pg.waitForTimeout(400);
  const w = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, send: document.querySelectorAll('.send-how a[href^="https://pf.kakao.com"], .send-how a[href^="mailto:"]').length }));
  ok('2-4 · 2-8 ② 식전 영상 쪽 보낼 길(카톡 · 메일)이 늘 보인다 · 쉬운 말', w.send >= 2 && /파일은 여기서 올라가지 않아요/.test(w.t) && /휴대폰으로 가로로 찍은 영상/.test(w.t) && !/가로 mp4/.test(w.t), w.send + ' ' + w.t.slice(0, 200));
  await pg.evaluate(() => mkGo('vow')); await pg.waitForTimeout(400);
  const warn = await pg.evaluate(() => { const t = document.getElementById('mkt_vow_g'); t.value = 'ㄱ'.repeat(300); t.dispatchEvent(new Event('input', { bubbles: true })); const a = getComputedStyle(document.getElementById('mkc_vow_g')).color; t.value = 'ㄱ'.repeat(400); t.dispatchEvent(new Event('input', { bubbles: true })); const b = getComputedStyle(document.getElementById('mkc_vow_g')).color; t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); return [a, b]; });
  ok('2-5 서약 한 분 300자는 경고색 아님 · 400자(한 분 기준 넘음)는 경고색', warn[0] !== warn[1], JSON.stringify(warn));
  ok('추가전달 2 · 3장 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [DETAIL_0925 C1 · C2 · G] 글자 대비(본문 4.5 · 큰 글 3) · 누를 곳 44px 실측 — ① · ② · 크게 보기 · ③ 를 390 · 1280 에서
const MEASURE = "window.__measure = function (root) {\n  root = root || document.body;\n  function rgb(s){ var m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p=m[1].split(',').map(parseFloat); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }\n  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }).reduce(function(s,v,i){ return s+v*[0.2126,0.7152,0.0722][i]; },0); }\n  function bgOf(el){ var stack=[]; for(var e=el;e;e=e.parentElement){ var c=rgb(getComputedStyle(e).backgroundColor); if(c&&c.a>0){ stack.push(c); if(c.a>=1) break; } } var b={r:250,g:250,b:248}; for(var i=stack.length-1;i>=0;i--){ var c=stack[i]; b={r:c.r*c.a+b.r*(1-c.a),g:c.g*c.a+b.g*(1-c.a),b:c.b*c.a+b.b*(1-c.a)}; } return b; }\n  function vis(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var cs=getComputedStyle(el); return cs.visibility!=='hidden' && cs.display!=='none' && !el.closest('[hidden],[aria-hidden=true]'); }\n  var bad=[], seen=new Set();\n  var w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT);\n  while(w.nextNode()){ var t=w.currentNode; if(!t.textContent.trim()) continue; var el=t.parentElement; if(!el||seen.has(el)||!vis(el)) continue; if(el.closest('.sr-only,svg,video,.lv-ai')) {} seen.add(el);\n    var cs=getComputedStyle(el), c=rgb(cs.color); if(!c) continue; var op=1; for(var e=el;e;e=e.parentElement) op*=parseFloat(getComputedStyle(e).opacity); var bg=bgOf(el); var fg={r:c.r*c.a*op+bg.r*(1-c.a*op),g:c.g*c.a*op+bg.g*(1-c.a*op),b:c.b*c.a*op+bg.b*(1-c.a*op)};\n    var L1=lum(fg),L2=lum(bg), ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); var fs=parseFloat(cs.fontSize), big=fs>=24||(fs>=18.66&&parseInt(cs.fontWeight)>=700); var need=big?3:4.5;\n    if(ratio<need && !el.closest('.sr-only')) bad.push({t:t.textContent.trim().slice(0,24), cls:el.className&&el.className.baseVal===undefined?String(el.className).slice(0,30):el.tagName, ratio:+ratio.toFixed(2), color:cs.color}); }\n  var small=[];\n  root.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=radio],[role=button]').forEach(function(el){ if(!vis(el)) return; if(el.closest('[inert]')) return; var r=el.getBoundingClientRect(); if(el.tagName==='A' && getComputedStyle(el).display==='inline') return; if((el.type==='checkbox'||el.type==='radio') && el.closest('label') && el.closest('label').getBoundingClientRect().height>=43.5) return; /* [FLOW_MAKE] 체크 칸은 감싼 label(44px)이 누를 곳이다 */ if(r.height<44-0.5 || r.width<24) small.push({t:(el.textContent||el.getAttribute('aria-label')||el.type||'').trim().slice(0,20), cls:String(el.className).slice(0,28), h:Math.round(r.height), w:Math.round(r.width)}); });\n  return {bad:bad, small:small};\n};";
for (const w of [390, 1280]) {
  const { ctx, pg } = await open(w);
  await pg.evaluate(MEASURE);
  const m = async (sel) => pg.evaluate((q) => window.__measure(q ? document.querySelector(q) : document.body), sel || null);
  const rep = (r) => JSON.stringify({ 대비: r.bad.slice(0, 3), 작은곳: r.small.slice(0, 3) });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  let r = await m(); ok(`${w} C ① 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await clickNext(pg); await pg.waitForTimeout(1200);
  /* [FLOW_MAKE] ② 는 쪽마다 잰다 — 화촉(칩) · 서약(참고 예시 · 두 칸) · 케이크 · 축배(부탁 · 보낼 · 챙길) · 한눈에 보기 */
  for (const k of ['candle', 'vow', 'toast', '_sum']) {
    await pg.evaluate((x) => mkGo(x), k); await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    r = await m(); ok(`${w} C ② ${k} 쪽 대비 미달 0 · 44px 미만 0(접힘 모두 연 채)`, !r.bad.length && !r.small.length, rep(r));
  }
  await clickNext(pg); await pg.waitForTimeout(700);
  r = await m(); ok(`${w} C ③ 연습하기 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await pg.click('[data-fk="prall"]'); await pg.waitForTimeout(700);
  r = await m('#lsFull'); ok(`${w} C 크게 보기 대비 미달 0 · 44px 미만 0`, !r.bad.length && !r.small.length, rep(r));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  await ctx.close();
}
// [DETAIL_0925 A1 · G] 뒤로 가기 워크스루 — ① → ② → 크게 보기 → 뒤로 셋 · 새로고침 뒤 고른 것이 남는가
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg); await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(400);
  const picked0 = await pg.evaluate(() => RitualOpen.picked(S).join(','));
  await clickNext(pg); await pg.waitForTimeout(900);
  await pg.evaluate(() => lsPlayAll()); await pg.waitForTimeout(600);
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


// ★[CHIP_NO_REPLAY · CHIP_STAY · PRACTICE_CHOOSE · REF_EXAMPLE 2026-09-27 사장님] 크게 보기 — 듣기와 고르기를 가른다 · 사람이 말하는 자리 = 참고 예시
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg);
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => opToListen()); await pg.waitForTimeout(900);
  await pg.evaluate(() => lsPlayAll()); await pg.waitForTimeout(600);
  await pg.evaluate(() => { let g = 0; while (LP.cur !== 'entry' && g++ < 20) lsJump(1); }); await pg.waitForTimeout(300);
  const a = await pg.evaluate(() => ({ mode: (document.querySelector('#lsFull .lf-mode') || {}).textContent || '', chips: document.querySelectorAll('#lsFull .op-chip').length, btn: !!document.querySelector('#lsFull [data-fk="lfchoose"]') }));
  ok('9-1 연습 중 머리 «연습 · n / N» · 칩은 «이 순간 바꾸기» 안에 접힘 [PRACTICE_CHOOSE]', /^연습 · /.test(a.mode) && a.chips === 0 && a.btn, JSON.stringify(a));
  await pg.click('#lsFull [data-fk="lfchoose"]'); await pg.waitForTimeout(300);
  const b = await pg.evaluate(() => ({ p: LP.paused, c: LP.choose, tok: LP.tok, mode: document.querySelector('#lsFull .lf-mode').textContent, chips: document.querySelectorAll('#lsFull .op-chip').length }));
  ok('9-2 «이 순간 바꾸기» → 멈춤 · «고르는 중» · 칩 펼침', b.p && b.c === 'entry' && /^고르는 중/.test(b.mode) && b.chips > 0, JSON.stringify(b));
  const cur = await pg.evaluate(() => document.querySelector('#lsFull .op-chip[aria-checked="true"]').getAttribute('data-fk'));
  await pg.click(`#lsFull [data-fk="${cur}"]`); await pg.waitForTimeout(250);
  await pg.click('#lsFull [data-fk="lfc:entryScene:bow"]'); await pg.waitForTimeout(250);
  const c = await pg.evaluate(() => ({ tok: LP.tok, p: LP.paused }));
  ok('9-3 이미 고른 칩 · 소리 같은 칩(첫 모습)은 다시 틀지 않는다 [CHIP_NO_REPLAY]', c.tok === b.tok && c.p, JSON.stringify({ b: b.tok, c }));
  const other = await pg.evaluate(() => [...document.querySelectorAll('#lsFull .op-chip[data-fk^="lfc:entry:"]')].find((x) => x.getAttribute('aria-checked') !== 'true').getAttribute('data-fk'));
  await pg.click(`#lsFull [data-fk="${other}"]`); await pg.waitForTimeout(300);
  const d = await pg.evaluate(() => { const r = { tok: LP.tok, stay: LP.stay, chips: document.querySelectorAll('#lsFull .op-chip').length }; let g = 0; while (!LP.paused && LP.cur === 'entry' && g++ < 30) _lNext(); r.after = { cur: LP.cur, p: LP.paused, hint: LP.hint, say: (document.querySelector('#lsFull .lf-state') || {}).textContent || '' }; return r; });
  ok('9-4 소리 바뀌는 칩 → 그 순간만 다시 · 끝나면 다음으로 안 넘어가고 멈춰 선다 [CHIP_STAY]', d.tok > c.tok && d.stay === 'entry' && d.chips > 0 && d.after.cur === 'entry' && d.after.p && d.after.hint === 'heard' && /한 번 들려 드렸어요/.test(d.after.say), JSON.stringify(d));
  await pg.click('#lsFull [data-fk="lfchoosedone"]'); await pg.waitForTimeout(300);
  ok('9-5 «다 골랐어요 · 이어서 듣기» → 다시 흐르고 칩은 접힌다', await pg.evaluate(() => !LP.paused && LP.choose === null && document.querySelectorAll('#lsFull .op-chip').length === 0));
  /* ★★[CAST_TEXT_ONLY 2026-09-27 사장님] 두 분 · 가족 차례 = 소리 없이 글 + 막대 — 대역 목소리(06~14 · 24~26)는 어디서도 안 튼다
     [REF_EXAMPLE] 사람이 말하는 자리는 참고 예시(글)로 · [REF_TABLE] 표에서 고른 판의 벌 */
  const e = await pg.evaluate(() => { const mute = ENG.RitualStory.CAST_MUTE; return { q: LP.q.filter((x) => x.talk2 && x.k === 'welcome').length, steps: _lSteps(ENG, _lRows()).filter((x) => x.ref || x.talk2).length, noSrc: LP.q.filter((x) => x.talk2).every((x) => !x.src && x.pending && x.txt.length > 5 && x.ms > 0), mute: Object.keys(mute).length, castPlay: LP.q.filter((x) => x.src && /\/assets\/audio\/cast\/(0[6-9]|1[0-4]|2[4-6])_/.test(x.src)).length }; });
  ok('9-6 첫인사 = 두 분 차례 둘(신랑 · 신부) · 소리 없이 글 + 막대 · 대본 목록(④ 복사)에는 안 들어간다 · 대역 목소리 0 [CAST_TEXT_ONLY]', e.q === 2 && e.steps === 0 && e.noSrc && e.mute === 12 && e.castPlay === 0, JSON.stringify(e));
  await pg.evaluate(() => { let g = 0; while (!(LP.q[LP.i] && LP.q[LP.i].ref) && g++ < 40) { LP.i++; _lShow(); } }); await pg.waitForTimeout(300);
  const f = await pg.evaluate(() => ({ badge: (document.querySelector('#lsFull .lf-ref') || {}).textContent || '', lab: (document.querySelector('#lsFull .lf-lab') || {}).textContent || '' }));
  ok('9-7 참고 예시 화면 — «참고 예시 N» 표(결 없음) · «당일엔 … 직접» · 목소리 문장 없음 · 이름표는 «신랑 차례» [CAST_TEXT_ONLY]', /참고 예시/.test(f.badge) && /당일엔 .*직접/.test(f.badge) && !/목소리/.test(f.badge) && /차례$/.test(f.lab) && !/참고 예시/.test(f.lab), JSON.stringify(f));
  /* 두 분이 적은 글이면 그 글 · 막대 = 글자수 ÷ 5 올림(206자 → 42초 · 53자 → 11초) · «현장에서»면 «떠오르는 대로 말해 보세요» */
  const tw = await pg.evaluate(() => { const keep = JSON.stringify(S); S.tx = { 'welcome.g': 'ㄱ'.repeat(206), 'welcome.b': '' }; S.mkc = { 'welcome.b': 1 }; const q = _lRefExpand(_lSteps(ENG, ['welcome'])).filter((x) => x.talk2); S = JSON.parse(keep); return q.map((x) => ({ who: x.who, mine: !!x.mine, site: !!x.site, s: x.ms / 1000, t: x.txt.slice(0, 20) })); });
  ok('9-7b 두 분 차례 — 적은 글 206자 → 42초 · «현장에서» → «떠오르는 대로 말해 보세요» [CAST_TEXT_ONLY]', tw.length === 2 && tw[0].mine && tw[0].s === 42 && tw[1].site && /떠오르는 대로 말해 보세요/.test(tw[1].t), JSON.stringify(tw));
  const rt = await pg.evaluate(() => { const ids = RITUAL_REF.rows.map((r) => r.id); const set = (k, patch) => { const keep = JSON.stringify(S); Object.assign(S, patch.S || {}); if (patch.on) S.on = Object.assign({}, S.on, patch.on); const r = _lRefSets(k); S = JSON.parse(keep); return r; };
    return { rows: RITUAL_REF.rows.length, retired: ids.filter((f) => /^(27_tribute-reply|15_toast)$/.test(f)).length,
      cross: set('tribute', { S: { tributeSay: 'one', letter: 'parent' }, on: { tribute: 1, letter: 1 } }).map((x) => x.map((p) => p.id).join('+')).join(' | '),
      sp1: set('free', { S: { freeWhat: 'speech', freeLen: '1' }, on: { free: 1, bless: 1 } }).map((x) => x.length).join(','),
      sp3off: set('free', { S: { freeWhat: 'speech', freeLen: '3', bless: 'off' }, on: { free: 1, bless: 0 } }).length }; });
  ok('9-9 참고 예시 표 70줄 · 폐지 클립(27 · 15) 없음 · 서로의 부모님께 판 · 축하의 말 1분 = 조각 둘 · 덕담 없으면 부모님 예시 셋 더 [REF_TABLE]', rt.rows === 70 && rt.retired === 0 && /505_tribute-cross-groom/.test(rt.cross) && rt.sp1 === '2,2,2' && rt.sp3off === 6, JSON.stringify(rt));
  ok('9-8 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ★★[RITUAL_FILE 2026-09-27 사장님] ② 하객 맞이 쪽 — 두 분 목소리 녹음 올리기 카드(임베드 · 마이페이지에서 연 빌더)
{
  const ctx = await br.newContext({ viewport: { width: 390, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window.__sent = []; const o = window.postMessage.bind(window); window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { window.__sent.push(m.data); return; } return o(m, t); }; });
  await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500);
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { S.guestVoice = 'couple'; mkGo('guest'); }); await pg.waitForTimeout(400);
  const v0 = await pg.evaluate(() => ({ rows: document.querySelectorAll('.mk-vr').length, oldChk: [...document.querySelectorAll('.mk-pg .upchk')].filter((l) => !l.closest('.mk-valt')).length, alt: !!document.querySelector('.mk-valt:not([open])'), dup: /대본을 드려요/.test(document.querySelector('.mk-pg').textContent), todo: _mkTasks('guest').filter((x) => !x.done).length }));
  ok('RF ② 하객 맞이 — 녹음 카드 한 장 · 녹음마다 한 줄(넷) · 옛 체크 칸 없음 · «올리기가 어렵다면»은 접힘 · 겹치는 «대본을 드려요» 줄 없음 [RITUAL_FILE]', v0.rows === 4 && v0.oldChk === 0 && v0.alt && !v0.dup && v0.todo === 4, JSON.stringify(v0));
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g0"]')]);
  await fc.setFiles({ name: '입장.m4a', mimeType: 'audio/mp4', buffer: Buffer.from('ID3testaudio') }); await pg.waitForTimeout(500);
  const v1 = await pg.evaluate(() => ({ sent: window.__sent.map((d) => d.key + ':' + d.mime + ':' + d.name + ':' + /^data:audio\/mp4;base64,/.test(d.data)), busy: /보내는 중/.test(document.querySelector('.mk-vr').textContent) }));
  ok('RF 올리기 → 마이페이지로 파일(키 · 형식 · 이름 · base64)이 넘어가고 «보내는 중…»', v1.sent.join() === 'g0:audio/mp4:입장.m4a:true' && v1.busy, JSON.stringify(v1));
  await pg.evaluate(() => _mkUpDone({ key: 'g0', ok: true, name: '입장.m4a', id: 'F1', at: '2026-09-27 17:40' })); await pg.waitForTimeout(300);
  const v2 = await pg.evaluate(() => ({ st: document.querySelector('.mk-vr').textContent, up: S.up.g0, fAt: !!(S.fAt && S.fAt['up.g0']), todo: _mkTasks('guest').filter((x) => !x.done).length, btn: document.querySelector('[data-fk="mkup:g0"]').textContent }));
  ok('RF 도착 → «보냈어요 · 입장.m4a» · 다시 올리기 · 그 줄은 완료(남은 셋은 미완료) · 칸마다 시각(두 기기)', /보냈어요 · 입장\.m4a/.test(v2.st) && v2.up && v2.up.id === 'F1' && v2.fAt && v2.todo === 3 && v2.btn === '다시 올리기', JSON.stringify(v2));
  await pg.evaluate(() => _mkUpDone({ key: 'g1', ok: false, error: '한 개에 20MB 까지 올릴 수 있어요.' })); await pg.waitForTimeout(300);
  ok('RF 실패는 사유를 한 줄로 · 그 줄은 미완료 그대로', await pg.evaluate(() => /20MB/.test((document.querySelector('.mk-toast') || {}).textContent || '') && !S.up.g1));
  await pg.evaluate(() => { document.querySelector('.mk-valt').open = true; }); await pg.click('.mk-valt .upchk'); await pg.waitForTimeout(300);
  ok('RF «카톡 · 메일로 보냈어요» → 올리지 않은 줄만 보냄 처리 · 올린 줄은 그대로', await pg.evaluate(() => S.up.g0.id === 'F1' && S.up.g1 === 'sent' && S.up.g3 === 'sent' && _mkTasks('guest').every((x) => x.done)));
  ok('RF pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
  // 그냥 연 미리보기(임베드 아님)는 올리지 않고 카톡 · 메일 길을 말한다
  const c2 = await br.newContext({ viewport: { width: 390, height: 900 } }); const p2 = await c2.newPage();
  await p2.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await p2.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await p2.waitForTimeout(700);
  await clickNext(p2); await p2.waitForTimeout(400); await clickNext(p2); await p2.waitForTimeout(500); await p2.click('[data-fk="opx:family"]'); await p2.waitForTimeout(300); await clickNext(p2); await p2.waitForTimeout(1200);
  await p2.evaluate(() => { S.guestVoice = 'couple'; mkGo('guest'); }); await p2.waitForTimeout(300); await p2.click('[data-fk="mkup:g0"]'); await p2.waitForTimeout(300);
  ok('RF 그냥 연 미리보기 — 파일 창 대신 «마이페이지에서 열면 … 카톡 · 메일» 한 줄', await p2.evaluate(() => /마이페이지에서 열면 여기서 바로 보낼 수 있어요/.test((document.querySelector('.mk-toast') || {}).textContent || '')));
  await c2.close();
}
/* ★[TOAST_FILE_ONE 2026-09-27] 영상 이름 한 원천 — 화면이 찾는 이름은 모두 파일 규격 17편(scripts/video/encode-moment.sh) 안에 있어야 한다.
   종전 ② 잔 들기 줄이 'toast-raise'(그런 파일 없음)를 찾아, 17편이 다 들어오면 «케이크와 축배»는 케이크 영상 · «축배만 + 붓기»는 붓기 영상이 나왔다(실측).
   영상이 한 편도 없는 지금은 안 보이는 결함이라, 파일이 들어오기 전에 여기서 막는다. ffmpeg 없이 잰다(src 만 본다). */
{
  const NAMES = ['guest', 'prevideo', 'candle', 'entry', 'entry-look', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'cake', 'toast-pour', 'toast', 'close'];
  const { ctx, pg } = await open(390, { videos: NAMES });
  const r = await pg.evaluate((NAMES) => {
    const R = RitualOpen, name = (h) => ((h.match(/moments\/([^"]+)\.mp4"/) || [])[1] || '(없음)'), out = { raise: {}, bad: [] };
    const miss = (tag, n) => { if (NAMES.indexOf(n) < 0) out.bad.push(tag + '→' + n); };
    for (const [t, w] of [['both', 'mix'], ['toast', 'mix'], ['toast', 'family'], ['toast', 'none']]) {
      S.toast = t; S.wine = w;
      ['toast-both-b', 'toast-both-pour-b'].forEach((sl) => { out.raise[t + '/' + w + '/' + sl] = name(_lVid('toast', { big: true, name: _lSceneName({ k: 'toast', slug: sl }) })); });
      R.ORDER.concat(['_close']).forEach((k) => R.videoKeys(k, S).forEach((n) => miss('videoKeys:' + k, n)));
    }
    [['toast', 'toast-both'], ['toast', 'toast-pour-mix'], ['toast', 'toast-pour-family'], ['entry', 'entry-out'], ['tribute', 'narr-bow-groom'], ['_close', '']]
      .concat(R.ORDER.map((k) => [k, ''])).forEach(([k, sl]) => miss('scene:' + k + '/' + sl, _lSceneName({ k: k, slug: sl })));
    return out;
  }, NAMES);
  ok('10-1 ② 잔 들기 줄 = toast.mp4 — 케이크와 축배 · 축배만(두 와인 · 양가 · 붓지 않음) [TOAST_FILE_ONE]', Object.values(r.raise).every((n) => n === 'toast'), JSON.stringify(r.raise));
  ok('10-2 화면이 찾는 영상 이름은 모두 규격 17편 안 [TOAST_FILE_ONE]', r.bad.length === 0, r.bad.join(' | '));
  await ctx.close();
}

await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : cant ? '\n결과 — 실패 0 · 재지 못한 줄 있음' : '\n결과 — 전부 통과');
process.exit(fail ? 1 : cant ? 2 : 0);
