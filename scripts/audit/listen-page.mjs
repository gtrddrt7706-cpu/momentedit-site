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
// ★[VIDEO_IN_1003 2026-10-03] 장면 영상 16편이 들어왔다(VIDEO_READY 16 · assets/video/moments/). 그래서
//   ① opt.videos 는 목록을 «그 이름들로 바꾼다»(더하지 않는다) — 두 편 · 빈 목록 · 17편 검사가 들어온 판과 섞이지 않고 제 뜻대로 잰다.
//   ② 영상이 없는 판(3-7)은 videos: [] 로 그 상태를 만들어 그대로 잰다(빈 상자 금지 검사는 살아 있다).
//   ③ 들어온 판 그대로는 «V» 블록이 잰다 — 목록 = 디스크 · 세 파일 · 칸 그림이 실제로 뜬다 · ② 쪽 영상과 AI 이름표.
//   ③·④ 자동 재생은 ffmpeg 로 2초짜리 시험 영상을 만들어(헤드리스는 H.264 를 못 푼다) 같은 주소로 준다. ffmpeg 이 없으면 «못 쟀다»로 찍고 종료코드 2.
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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = (TV && /\/assets\/video\/moments\/.+\.mp4$/.test(u)) ? TV : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p === TV ? 'video/webm' : (TYPES[path.extname(p)] || 'application/octet-stream') }); r.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(w, opt) {
  opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000, reducedMotion: opt.reduce ? 'reduce' : 'no-preference' });   // [MK_STRIP_MOUSE] 폰 폭은 터치로 연다 — 진행 줄은 «손가락이냐 마우스냐»로 갈린다
  const pg = await ctx.newPage();
  const errs = [], ext = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (!/fonts\.g(oogleapis|static)\.com/.test(u)) ext.push(u.slice(0, 80)); return rt.fulfill({ status: 200, body: '' }); });
  if (opt.videos) await pg.addInitScript((vs) => { window.__LISTEN_TEST_VIDEOS = vs; }, opt.videos);
  /* [VID_PLAY_ALL] 헤드리스는 H.264 를 못 푼다 — 영상 play() 를 «불렸는가»로 잰다(소리 play 는 그대로) */
  if (opt.stubPlay) await pg.addInitScript(() => { window.__vplays = []; const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (this.tagName !== 'VIDEO') { const sr = this.getAttribute('src') || this.src || ''; if (sr && !/^data:/.test(sr)) (window.__aplays = window.__aplays || []).push(sr.split('/').pop()); return o.apply(this, arguments); } if (!this.__vid) this.__vid = ++window.__vidSeq || (window.__vidSeq = 1); window.__vplays.push({ f: (this.getAttribute('src') || '').split('/').pop(), id: this.__vid, w: this.closest('#pvM') ? 'sheet' : this.closest('#lsFull') ? 'full' : this.closest('.mk-vid') ? 'make' : 'other' }); return Promise.resolve(); }; });
  if (opt.draft) await pg.addInitScript((d) => { try { localStorage.setItem('me_order', JSON.stringify(d)); } catch (e) {} }, opt.draft);
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  if (opt.videos) await pg.evaluate(() => { RitualOpen.VIDEO_READY.length = 0; (window.__LISTEN_TEST_VIDEOS || []).forEach((k) => RitualOpen.VIDEO_READY.push(k)); });   /* [VIDEO_IN_1003] 바꾼다 · 더하지 않는다 */
  return { ctx, pg, errs, ext };
}
/* [PICK_V2 2026-09-26] PC(폭 1000 이상)의 ① 은 아래 단추 줄을 숨긴다 — «다음 · 하나씩 만들기»는 흐름 띠(.pk-go)에 있다 */
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
  ok(`${w} ① 칸 열넷(케이크 커팅 · 축배 따로 · CAKE_TOAST_SPLIT) · 칸마다 16:9 그림 자리 [TILE_PICK]`, await pg.evaluate(() => { const t = [...document.querySelectorAll('.pk-tile')]; return t.length === 14 && t.every((c) => c.querySelector('.pk-media')); }));
  ok(`${w} ① 빈 채 아래 막대는 숫자 없이 «입장 · 닫는 인사만으로도 …»([R1-33]) [BAR_SUM]`, await pg.evaluate(() => { const c = document.getElementById('opCta'); return !!c && /입장 · 닫는 인사만으로도 다음으로 갈 수 있어요/.test(c.textContent) && !/\d/.test(c.textContent); }));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  ok(`${w} ① 담으면 아래 막대 «본식 · 단체 사진» 시간 둘 · 개수 없음 [BAR_SUM]`, await pg.evaluate(() => { const t = (document.getElementById('opCta') || {}).textContent || ''; return /본식\s약\s?\d+~\d+분\s·\s단체\s사진\s약\s?\d+~\d+분/.test(t) && !/담은 순간|고른 순간/.test(t); }));
  await pg.click('[data-fk="pto:declare"]'); await pg.waitForTimeout(500);
  /* ★[STEP_NONUM_OP 2026-10-03 사장님] 종전 «② 하나씩 만들기에서 고를 것 · …» → 번호 없이 «하나씩 만들기에서 골라요 · …» */
  ok(`${w} ① 창 «하나씩 만들기에서 골라요 · …» 줄 없음 [PV_CHOOSE_OFF] · 설명과 남는 사진은 한 문장(따로 줄 없음) [PV_ONE_SHOT]`, await pg.evaluate(() => { const c = document.getElementById('pvCh'), sh = document.getElementById('pvShot'), one = (document.getElementById('pvQ') || {}).textContent || '', po = document.getElementById('pvOne'); return (!c || (c.hidden && !c.textContent)) && (!sh || (sh.hidden && !sh.textContent)) && one === _n2(PV_DESC.declare) && /박수 치는/.test(one) && !/«/.test(one) && (!po || po.hidden); }));   /* [PV_DESC_TOP] 설명은 큰 자리(pvQ)로 · 멘트 인용 없음 */
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  ok(`${w} ① 소제목에 동그라미 번호 없음 · 남는 장면이라는 말 없음`, await pg.evaluate(() => ![...document.querySelectorAll('.pk-h,.pk-act-h,.pk-fp-h h3')].some((h) => /[①②③]/.test(h.textContent)) && !/남는 장면/.test(document.getElementById('stage').textContent)));
  ok(`${w} ① 고객 화면에 «판» 없음`, await pg.evaluate(() => !/판 바꿈|고를 수 있는 판|그 판으로/.test(document.getElementById('stage').textContent)));
  await clickNext(pg); await pg.waitForTimeout(1500);
  ok(`${w} [STEP_BASELINE 4-e] 걸음 표시 — 지난 걸음과 지금 걸음의 글줄이 같다`, await pg.evaluate(() => { const ys = [...document.querySelectorAll('.op-steps li')].map((li) => { const tw = document.createTreeWalker(li, NodeFilter.SHOW_TEXT); let t = tw.nextNode(); while (t && !t.textContent.trim()) t = tw.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return Math.round(r.getBoundingClientRect().top); }); return ys.length === 4 && Math.max(...ys) - Math.min(...ys) <= 1; }));
  ok(`${w} ② 제목 «하나씩 만들기» · 걸음 표시`, await pg.evaluate(() => document.getElementById('stepHead').textContent === '하나씩 만들기' && /하나씩 만들기/.test(document.querySelector('.op-steps li.on').textContent)));
  const pages = await pg.evaluate(() => _mkPages());
  ok(`${w} ② 쪽 = 예식 흐름 · 하객 맞이 · 식전 영상 · 담은 순간 · 닫는 인사 · 한눈에 보기 [FLOW_MAKE · MK_INTRO]`, pages[0] === '_intro' && pages[1] === 'guest' && pages[2] === 'prevideo' && pages[pages.length - 2] === '_close' && pages[pages.length - 1] === '_sum', pages.join(','));
  /* [MK_INTRO] 첫 쪽 = 예식 흐름 · «이 흐름으로 시작하기»
     ★[COURSE_FLOW 2026-10-03 사장님] 종전 «할 일 꼬리표(고르기 · 두 분이 할 말)가 있다» → 이제 «없다»(꼬리표 · 펼침 · 고를 것 · 만들러 가기 · 목소리 접이 · 7일 전 한 줄 금지) */
  const ii = await pg.evaluate(() => ({ at: _mkState().at, h: document.getElementById('mkHead').textContent, rows: document.querySelectorAll('.mk-intro .cf-r').length, tag: document.querySelectorAll('.mk-itag,.mk-irow,.mk-idet,.mk-igo,#mkVMap,.mk-legend').length, txt: document.querySelector('.mk-intro').textContent, next: document.getElementById('next').textContent }));
  ok(`${w} ② 첫 쪽 «예식 흐름» — 순간마다 한 줄 · 꼬리표 · 펼침 · 목소리 접이 없음 · «이 흐름으로 시작하기 · 하객 맞이 안내» [MK_INTRO · COURSE_FLOW]`, ii.at === '_intro' && ii.h === '예식 흐름' && ii.rows === pages.length - 2 && ii.tag === 0 && !/두 분이 할 말|고를 것|만들러 가기|비워 둔 칸은|한눈에 봐요/.test(ii.txt) && /^이 흐름으로 시작하기 · 하객 맞이 안내$/.test(ii.next.replace(/\u00a0/g, ' ')), JSON.stringify({ ...ii, txt: ii.txt.slice(0, 120) }));
  ok(`${w} ② 예식 흐름 쪽엔 진행 줄이 없다 — 목록이 곧 길잡이 [MK_MIN]`, await pg.evaluate(() => !document.getElementById('mkStrip') && document.querySelectorAll('.mk-intro .cf-r').length > 3));
  ok(`${w} ② 들어가자마자 소리 없음(자동 재생 없음)`, await pg.evaluate(() => !LP.q.length && (!LP.el || LP.el.paused)));
  await clickNext(pg); await pg.waitForTimeout(400);
  ok(`${w} ② «시작하기» → 하객 맞이 쪽 · 지금 쪽 aria-current`, await pg.evaluate(() => STEPS[idx].k === 'listen' && _mkState().at === 'guest' && !!document.querySelector('#mkStrip .mk-it.cur[aria-current="step"]')));
  ok(`${w} ② 진행 순서 줄 = 쪽마다 단추 하나(고른 순서 쪽 제외) · «미완료 N» 단추 없음 · ⓘ(예식 흐름 다시 보기)는 따로 [MK_TODO_PASSED · VOICE_MAP]`, await pg.evaluate((n) => document.querySelectorAll('#mkStrip .mk-it:not(.mk-add):not(.mk-vi)').length === n && !document.querySelector('[data-fk="mktodo"]'), pages.length - 1));
  await clickNext(pg); await pg.waitForTimeout(400);
  ok(`${w} ② «다음»은 다음 순간으로(걸음은 그대로)`, await pg.evaluate((p2) => STEPS[idx].k === 'listen' && _mkState().at === p2, pages[2]));
  ok(`${w} ② 표시는 지나온 쪽에만 — 지금 · 앞으로 올 쪽은 비어 있다 [MK_TODO_PASSED]`, await pg.evaluate(() => { const its = [...document.querySelectorAll('#mkStrip .mk-it:not(.mk-add):not(.mk-vi)')], ci = its.findIndex((b) => b.classList.contains('cur')); return ci === 1 && /done|todo/.test(its[0].className) && its.slice(ci).every((b) => !/ (done|todo)/.test(b.className)); }));
  await pg.click('#prev'); await pg.waitForTimeout(400);
  ok(`${w} ② «이전»은 앞 순간으로`, await pg.evaluate(() => STEPS[idx].k === 'listen' && _mkState().at === 'guest'));
  /* [MK_PICK_TOP] 고르기가 먼저 · 그 아래 «고른 대로 들어 보기» · 흐름은 그 뒤 */
  /* ★[MK_FORM_ONE 2026-10-03 사장님] 종전 «고를 것이 있는 쪽 = 칩이 곧 듣기 → «이 순간 들어 보기» 없음»(MK_MIN) → 칩은 소리를 안 낸다([CHIP_NO_AUTOPLAY]) ·
     나레이션 두 줄 이상인 쪽은 모두 «이 순간 들어 보기» 하나(고르기 아래 · 흐름 머리) — 판정을 뒤집었다 */
  ok(`${w} ② 고를 것이 있는 쪽도 «이 순간 들어 보기» 하나 — 고르기 → 들어 보기 → 흐름 · «고른 대로 들어 보기» 없음 [MK_PICK_TOP · MK_FORM_ONE]`, await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = true; const _t0 = S.touched; S.touched = Object.assign({}, S.touched, { guestVoice: 1 }); render();   /* [VP_ASK_FIRST 2026-10-06] 안내 목소리를 안 고르면 흐름 대신 «먼저 골라 주세요» — 이 판정은 고른 판에서 */   /* ★[VP_NO_DIRECT] 하객 맞이의 고르는 칸(AI · 나레이션)은 AI 가 켜진 예식에만 — 이 판정은 그 판에서 */ const a = document.querySelector('.mk-pick .ls-vars'), p = document.querySelectorAll('[data-fk="mkplay"]'), sec = document.querySelector('.mk-flowsec'); const F = Node.DOCUMENT_POSITION_FOLLOWING; return !!a && p.length === 1 && !!sec && !!(a.compareDocumentPosition(p[0]) & F) && !!p[0].closest('.mk-flowsec') && !/고른 대로 들어 보기/.test(document.getElementById('stage').textContent) && ((RitualOpen.FEATURE.voiceClone = false), (S.touched = _t0), render(), true); }));
  ok(`${w} ② 하객 맞이 — 두 분 목소리 줄은 줄 카드 하나로(흐름 목록 없음) · «두 분이 녹음하실 글(예시)» 되풀이 없음 · «아직 안 보냈어요» 없음 [MK_MIN · VP_ONE_LIST]`, await pg.evaluate(() => { if (S.guestVoice !== 'couple') { S.guestVoice = 'couple'; opSync(); render(); } const f = (document.querySelector('.mk-voice') || {}).textContent || ''; return !document.querySelector('.mk-flow') && !!document.querySelector('.mk-vcards')   /* ★[MK_FORM_ONE 2026-10-03] 흐름 칸은 «이 순간 들어 보기» 머리만 남는다 — 목록(.mk-flow)이 없는지로 본다(종전 칸째 없음) */ && !/아직 안 보냈어요/.test(f) && (f.match(/두 분이 녹음하실 글\(예시\)/g) || []).length <= 1; }));
  /* [NAV_FOLD 2026-10-03 사장님] 진행 줄은 접힌 채 시작한다 — 줄의 모양 · 자리 · 흐림을 재는 아래 셋은 펼쳐서 잰다(접힌 줄은 크기 0 이라 «보인다»가 거저 참이 된다) */
  await pg.evaluate(() => mkFold(true)); await pg.waitForTimeout(200);
  ok(`${w} ② 진행 줄 = 글자 탭 — 번호 · 테두리 없음 · 읽어 주는 이름에는 번호 [MK_STRIP_TEXT]`, await pg.evaluate(() => { const its = [...document.querySelectorAll('#mkStrip .mk-it:not(.mk-add):not(.mk-vi)')]; return its.length > 3 && !document.querySelector('#mkStrip .mk-n') && its.every((b) => !/^\s*\d/.test(b.textContent) && getComputedStyle(b).borderTopWidth === '0px') && its.some((b) => /^\d+ /.test(b.getAttribute('aria-label') || '')); }));
  ok(`${w} ② 지금 칸이 진행 줄 안에 보인다 [MK_STRIP_KEEP]`, await pg.evaluate(() => { const sc = document.querySelector('#mkStrip .mk-sc'), c = sc.querySelector('.mk-it.cur'), a = sc.getBoundingClientRect(), b = c.getBoundingClientRect(); return b.width > 0 && a.width > 0 && b.left >= a.left - 1 && b.right <= a.right + 1; }));   /* [NAV_FOLD] 크기 0(접힘)이면 실패로 */
  ok(`${w} ② 진행 줄 — 모바일은 양끝 흐림(넘기기) · PC 는 줄바꿈(흐림 없음) [MK_STRIP_FADE · MK_STRIP_WRAP]`, await pg.evaluate((w) => { const c = getComputedStyle(document.querySelector('#mkStrip .mk-sc')); const m = /gradient/.test(c.maskImage || c.webkitMaskImage || ''); return w >= 1000 ? (!m && c.flexWrap === 'wrap') : (m && c.flexWrap === 'nowrap'); }, w));
  // 서약 쪽 — 흐름 · 참고 예시 · 두 칸
  await pg.evaluate(() => mkGo('vow')); await pg.waitForTimeout(500);
  ok(`${w} ② 서약 쪽 — 참고 예시가 있으면 «서약 예시 보기» 접이를 또 두지 않는다 · 들어 보기 단추는 흐름 머리에 [MK_MIN]`, await pg.evaluate(() => !!document.querySelector('.mk-ref') && !/서약 예시 보기/.test(document.getElementById('stage').textContent) && !!document.querySelector('.mk-flow').closest('.mk-sec').querySelector('.mk-sech [data-fk="mkplay"]')));
  ok(`${w} ② 서약 쪽 머리 = 번호 · 이름 · 흐름에 기본 «두 분 번갈아» 한 줄 · «각자 차례로»면 «신랑 차례 · 신부 차례» [VOW_HOW]`, await pg.evaluate(() => { const f = () => document.querySelector('.mk-flow').textContent; const a = /혼인 서약/.test(document.getElementById('mkHead').textContent) && /두 분 번갈아/.test(f()) && !/신랑 차례/.test(f()) && /마지막 두 문장은 하객분들 쪽으로/.test(document.querySelector('.mk-say').textContent) && !/번갈아 읽고/.test(document.querySelector('.mk-say').textContent); S.vowHow = 'each'; render(); const b = /신랑 차례/.test(f()) && /신부 차례/.test(f()); delete S.vowHow; render(); return a && b; }));
  const rf = await pg.evaluate(() => ({ n: document.querySelectorAll('.mk-ref .mk-rc').length, sets: _lRefSets('vow').length, names: [...document.querySelectorAll('.mk-ref .mk-rc b')].map((x) => x.textContent), pv: [...document.querySelectorAll('.mk-ref .mk-rc span')].map((x) => x.textContent), b: (document.querySelector('.mk-ref .mk-rsel .sr-only') || {}).textContent || '', bVis: !!document.querySelector('.mk-ref .lf-refb'),   /* [R8-14] 배지는 화면 읽기에만 */ note: (document.querySelector('.mk-ref .lf-refn') || {}).textContent || '', play: document.querySelectorAll('.mk-ref button:not(.mk-rc):not(.mk-rstart)').length, len: (document.querySelector('.mk-ref .mk-rl') || {}).textContent || '', mood: /담백|다정|유머|격식|솔직|그리움|장면 하나|짧게/.test([...document.querySelectorAll('.mk-ref .mk-rc b, .mk-ref .lf-refb, .mk-ref .mk-rsel .sr-only')].map((x) => x.textContent).join('|')) }));
  ok(`${w} ② 참고 예시 칩 = 고른 네 벌(서약 4 · REF_BEST4) · 이름 «예시 N» · 배지 «참고 예시 N»(화면 읽기에만 · R8-14) · 무드 이름 없음 · 칩 아래 첫 마디 · 글로만 · «N자 · 약 N초»([R1-46]) · 두 분 순간 머리말은 «당일엔 …» 없이([R1-21]) [EX_MORE · REF_NO_KYEOL · CAST_TEXT_ONLY]`, rf.n === rf.sets && rf.sets === 4 && rf.names[0] === '예시 1' && rf.b === '참고 예시 1' && !rf.bVis && !rf.mood && rf.pv.every((t) => t.length > 3 && t.length <= 21 && !/^하윤아/.test(t)) && /^누르면 아래 칸에 바로 들어가요 · /.test(rf.note) /* [R4-04] → [CUE_FORM 2026-10-06] 카드가 곧 채우기 */ && !/당일엔/.test(rf.note) && /예시 속 이름은 가상 인물이에요/.test(rf.note) && rf.play === 0 && rf.len === '' /* [CUE_FORM] 예시 글은 미리보기가 아니라 아래 칸에 들어간다 */, JSON.stringify(rf));
  await pg.click('[data-fk="mkrc:vow:1"]'); await pg.waitForTimeout(250);
  await pg.click('[data-fk="mkplay"]'); await pg.waitForTimeout(500);
  const dbg = await pg.evaluate(() => ({ g: (S.tx || {})['vow.g'], set: _lRefSets('vow')[1].map((p) => p.who + ':' + p.txt.slice(0, 12)), cur: LP.cur, q: LP.q.map((s) => [String(s.txt || '').slice(0, 12), !!s.src, !!s.talk, !!s.talk2]) }));
  ok(`${w} ② 예시 2 카드 → 두 분 칸에 바로 들어간다 · «이 순간 들어 보기»는 소리 없이 흐른다 [CUE_FORM]`, await pg.evaluate(() => { const set = _lRefSets('vow')[1], g = (set.filter((p) => p.who === '신랑')[0] || {}).txt; return LP.cur === 'vow' && S.tx['vow.g'] === g && LP.q.length > 0 && LP.q.every((s) => !(s.talk2 && s.src)); }), JSON.stringify(dbg));   /* 글을 적은 순간의 ② 듣기는 두 분 차례를 안내 한 줄로 짚고 넘어간다(TALK_BRIDGE · 종전 그대로) */
  ok(`${w} ② 재생 중 — 아래 재생 바 없이 지금 줄 ▶ 가 멈춤 [MINI_OFF_ROWS]`, await pg.evaluate(() => getComputedStyle(document.getElementById('lsMini')).display === 'none' && document.querySelectorAll('.mk-pl[data-ml].on').length === 1));
  await pg.evaluate(() => lsStop());
  await pg.fill('#mkt_vow_g', '나는 약속'); await pg.fill('#mkt_vow_b', '나도 약속'); await pg.waitForTimeout(200);
  ok(`${w} ② 신랑 칸 · 신부 칸 따로 · 옛 한 칸(vowText)은 두 칸을 이어 붙인다 · 칸마다 고친 시각 [TX_MERGE]`, await pg.evaluate(() => S.tx['vow.g'] === '나는 약속' && S.tx['vow.b'] === '나도 약속' && S.vowText === '신랑 · 나는 약속\n\n신부 · 나도 약속' && S.fAt['tx.vow.g'] > 0 && S.fAt['tx.vow.b'] > 0));
  ok(`${w} ② 글자수 · 소리 내어 읽는 초`, await pg.evaluate(() => /5자 · 약 1초/.test(document.getElementById('mkc_vow_g').textContent)));
  // ② 고르기 칩 — radiogroup · 고른 칩이 눈에 보인다 [CHIP_CHECKED] (녹음 기록과 상관없이 · [REC_STATE_FREE] 두 분 차례는 소리가 없다)
  await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(400);
  await pg.evaluate(() => { const b = document.querySelector('.mk-pg [data-fk^="lsc:candleWho"]'); b && b.click(); try { lsStop(); } catch (e) {} }); await pg.waitForTimeout(300);   // [CHIP_UNPICKED] 안 고른 기본은 비어 보인다 — 한 번 고른 뒤에 잰다
  ok(`${w} ② 칩 = radiogroup · radio · 누를 곳 44px · 고른 칩은 바탕이 다르다 [CHIP_CHECKED]`, await pg.evaluate(() => { const on = document.querySelector('.mk-pg .op-chip[aria-checked="true"]'), off = document.querySelector('.mk-pg .op-chip[aria-checked="false"]'); return !!on && !!off && on.getAttribute('role') === 'radio' && !!on.closest('[role=radiogroup]') && on.getBoundingClientRect().height >= 44 && getComputedStyle(on).backgroundColor !== getComputedStyle(off).backgroundColor; }));
  // 빼기 = 흐리게 남기고 다시 넣기 [DROP_DIM]
  await pg.evaluate(() => mkGo('bless')); await pg.waitForTimeout(400);
  /* ★[MK_NO_DROP_LINK 2026-10-03 사장님] 순간 쪽 «이 순간 빼기» 단추는 걷었다(빼기는 예식 흐름 ✓/＋) — 뺀 쪽 모양은 옛 초안 길(mkDrop)로 연다 */
  ok(`${w} ② 순간 쪽에 «이 순간 빼기» 없음 [MK_NO_DROP_LINK]`, await pg.evaluate(() => !document.querySelector('[data-fk="mkdrop"]') && !/이 순간 빼기/.test(document.querySelector('.mk-pg').textContent)));
  await pg.evaluate(() => mkDrop('bless')); await pg.waitForTimeout(400);
  ok(`${w} ② 빼기 → 쪽은 제자리에 흐리게 · «다시 넣기» [DROP_DIM]`, await pg.evaluate(() => !RitualOpen.onOf(S, 'bless') && _mkPages().indexOf('bless') > -1 && !!document.querySelector('.mk-pg.off') && !!document.querySelector('[data-fk="mkundrop"]')));
  await pg.click('[data-fk="mkundrop"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 다시 넣기 → 다시 담긴다`, await pg.evaluate(() => RitualOpen.onOf(S, 'bless') && !document.querySelector('.mk-pg.off')));
  ok(`${w} ② 가로 넘침 0`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // 한눈에 보기 → ③ 연습하기
  await pg.evaluate(() => mkGo('_sum')); await pg.waitForTimeout(400);
  ok(`${w} ② 마지막 쪽 = 한눈에 보기 · 아래 단추 «다음 · 연습하기»(번호 없음 · STEP_NONUM_OP)`, await pg.evaluate(() => /한눈에 보기/.test(document.getElementById('mkHead').textContent) && document.getElementById('next').textContent.trim() === '다음 · 연습하기'));
  await clickNext(pg); await pg.waitForTimeout(700);
  ok(`${w} ③ 연습하기 — «처음부터 끝까지» · 고른 순간 목록(담은 순간마다 하나) · «빠르게 훑기» · «한 부분만 보기» · «내 목소리로 연습» 없음 [PRACTICE_STEP · PR_JUMP · PR_FAST_OFF · PR_SEC_OFF · PR_VOICE_OFF]`, await pg.evaluate(() => STEPS[idx].k === 'practice' && !!document.querySelector('[data-fk="prall"]') && document.querySelectorAll('[data-fk^="prj:"]').length === _lRows().length && !document.querySelector('[data-fk="prfast"]') && !document.querySelectorAll('[data-fk^="pra:"]').length && !document.querySelector('.pr-voice')));
  /* [PR_JUMP] 목록에서 누르면 크게 보기가 그 순간부터 · 앞 순간도 줄에 있다(⏮) */
  { const k3 = await pg.evaluate(() => _lRows()[3]); await pg.click('[data-fk="prj:' + k3 + '"]'); await pg.waitForTimeout(900);
    const j = await pg.evaluate(() => ({ big: LP.big, cur: (LP.q[LP.i] || {}).k, first: (LP.q[0] || {}).k, all: LP.all }));
    ok(`${w} ③ 고른 순간 목록 — «${k3}»을 누르면 크게 보기가 그 순간부터 · 전체 줄(앞 순간도 ⏮ 로) [PR_JUMP]`, j.big && j.cur === k3 && j.first !== k3 && j.all, JSON.stringify(j));
    await pg.evaluate(() => { lsStop(); }); await pg.waitForTimeout(500); }
  /* [PR_SIMPLE 2026-10-05] 장면 카드 하나 + 순간 목록 하나 · 줄마다 누가 말하나(나레이션 · 당일 직접 · 미리 준비) · 통계 줄 · «어떻게 볼까요» · 지도 접이 없음 */
  { const v = await pg.evaluate(() => ({ map: !!document.querySelector('[data-fk="prvmap"]'), how: /어떻게 볼까요|말하는 차례 \d/.test(document.querySelector('.op.pr').textContent), tags: [...document.querySelectorAll('.pr-row')].every((b) => !!b.querySelector('.vk')), heroImg: !!document.querySelector('.pr-hero .pr-hm img'), vids: RitualOpen.VIDEO_READY.length }));
    ok(`${w} ③ 장면 카드 · 순간 목록(줄마다 갈래) · 통계 줄 · 지도 접이 없음 · 장면 그림(영상 ${v.vids}) [PR_SIMPLE]`, !v.map && !v.how && v.tags && (v.heroImg || !v.vids), JSON.stringify(v)); }
  /* [PR_WIDE] PC 는 좌우로 넓게 — 장면 카드와 목록이 나란히 · 폰은 위아래 */
  { const g = await pg.evaluate(() => { const a = document.querySelector('.pr-lead').getBoundingClientRect(), b = document.querySelector('.pr-pick').getBoundingClientRect(); return { side: b.left > a.right, wrap: Math.round(document.querySelector('.wrap').getBoundingClientRect().width), pr2: document.body.classList.contains('pr2') }; });
    ok(`${w} ③ ${w >= 1000 ? 'PC 좌우 두 단(넓은 폭)' : '폰 한 단'} [PR_WIDE]`, g.pr2 && (w >= 1000 ? g.side && g.wrap > 900 : !g.side), JSON.stringify(g)); }
  /* [PR_RAIL] 처음부터 끝까지 크게 보기 — PC 는 오른쪽에 예식 순서(지금 순간 표시 · 누르면 그 순간부터) · 폰은 숨김 */
  { await pg.click('[data-fk="prall"]'); await pg.waitForTimeout(800);
    const r0 = await pg.evaluate(() => { const r = document.querySelector('#lsFull .lf-rail'); const ks = []; LP.q.forEach((x) => { if (ks.indexOf(x.k) < 0) ks.push(x.k); }); return { vis: !!r && getComputedStyle(r).display !== 'none', n: r ? r.querySelectorAll('.lf-rr').length : 0, ks: ks.length, cur: (r && r.querySelector('[aria-current="step"]') || {}).getAttribute ? r.querySelector('[aria-current="step"]').getAttribute('data-fk') : '', k: (LP.q[LP.i] || {}).k }; });
    if (w >= 1000) {
      ok(`${w} ③ 크게 보기 오른쪽 예식 순서 — 순간마다 한 줄 · 지금 순간 표시 [PR_RAIL]`, r0.vis && r0.n === r0.ks && r0.cur === 'lfk:' + r0.k, JSON.stringify(r0));
      const k5 = await pg.evaluate(() => _lRows()[5]); await pg.click('[data-fk="lfk:' + k5 + '"]'); await pg.waitForTimeout(600);
      const r1 = await pg.evaluate(() => ({ k: (LP.q[LP.i] || {}).k, paused: LP.paused, cur: (document.querySelector('#lsFull [aria-current="step"]') || {}).textContent, foc: (document.activeElement && document.activeElement.getAttribute('data-fk')) || '' }));
      ok(`${w} ③ 예식 순서에서 «${k5}»을 누르면 그 순간부터 흐른다 · 포커스 그 자리 [PR_RAIL]`, r1.k === k5 && !r1.paused && r1.foc === 'lfk:' + k5, JSON.stringify(r1));
    } else ok(`${w} ③ 폰 크게 보기에는 예식 순서 목록이 안 보인다 [PR_RAIL]`, !r0.vis, JSON.stringify(r0));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop()); await pg.waitForTimeout(300); }
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
    /* [R4-05] «채우기»는 글 칸 밖 할 일(부탁 · 보낼 것)이 남은 줄에도 붙는다 — 신랑 칸 포커스는 «글 비어 있음» 줄만 */
    const txEmpty = await pg.evaluate((f) => { const b = document.querySelector(`[data-fk="${f}"]`), e = b && b.closest('.sumrow') && b.closest('.sumrow').querySelector('.sr-empty'); return !!e && e.textContent === '글 비어 있음'; }, fk);
    await pg.click(`[data-fk="${fk}"]`); await pg.waitForTimeout(500);
    /* [FLOW_MAKE 2026-09-27] «변경» · «채우기» 모두 ② 의 그 순간 한 쪽으로 간다 — 글이 비었으면 신랑 칸 · 아니면 그 쪽 머리에 포커스 */
    const r = await pg.evaluate((f) => ({ k: STEPS[idx].k, er: editReturn, at: _mkState().at, want: f.split(':')[1], foc: document.activeElement ? document.activeElement.id : '' }), fk);
    const good = r.k === 'listen' && r.er && (r.at === r.want || (r.at === 'guest' && _noPage(r.want))) && (lab === '채우기' && txEmpty ? /^mkt_.+_g$/.test(r.foc) : /^(mkHead|mkt_.+_g)$/.test(r.foc));
    if (good) moved++; else miss.push(fk + ':' + lab + ':' + JSON.stringify(r));
    await pg.click('#prev'); await pg.waitForTimeout(400);   // 취소
  }
  ok(`2-2 ④ «변경» · «채우기» ${keys.length}개가 전부 ② 의 그 순간으로 간다(머리 · 빈 글이면 신랑 칸 포커스) [FLOW_MAKE]`, keys.length > 0 && moved === keys.length, miss.join(' | '));
  ok('2-2 취소하면 ④로 돌아오고 고른 것이 그대로', await pg.evaluate((s0) => STEPS[idx].k === 'done' && !editReturn && JSON.stringify(S) === s0, snap0));
  // 걸음 표시로 옮기면 수정이 끝난다
  await pg.click(`[data-fk="${keys.find((f) => /candle|ring|declare|toast/.test(f)) || keys[0]}"]`); await pg.waitForTimeout(500);
  ok('2-2 수정 중 아래 단추 = «취소 / 요약으로 돌아가기» [RIT_BACK_WORD]', await pg.evaluate(() => editReturn && /요약으로 돌아가기/.test(document.getElementById('next').textContent)));
  /* ★[STEP_COMPACT 2026-10-03 사장님] 순간 쪽 걸음 표시는 접힌 모양 — 걸음 이동은 «모든 순간 보기» 첫 줄(같은 opStepNav · 수정 끝내기 그대로) */
  await pg.evaluate(() => opStepNav('pick'));   /* [STEP_LAB_TOP] 순간 쪽엔 걸음 단추가 없다 — 같은 opStepNav 를 바로 부른다(수정 끝내기 규칙을 잰다) */ await pg.waitForTimeout(500);
  ok('2-2 걸음 표시로 옮기면 수정 끝 · 아래 단추가 제 이름 · ① 요약 다시 보임', await pg.evaluate(() => !editReturn && STEPS[idx].k === 'pick' && !/요약으로 돌아가기/.test(document.getElementById('next').textContent) && /이전/.test(document.getElementById('prev').textContent) && !!document.getElementById('opCta')));
  ok('2-2 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// [코워크 회신3 3장] ①②③④ 가 같은 말을 한다 — DONE_UNIFY · SCRIPT_ENGINE · LAB_FIX · PREP_DUE · HEAD_ONE · NO_EMPTY_BOX · STUDIO_PREP
{
  const { ctx, pg, errs } = await open(390, { videos: [] });   /* [VIDEO_IN_1003] 3-7 은 «영상이 없는 판»의 검사 — 그 판을 만들어 잰다 */
  await toPick(pg);
  ok('3-5 ① 머리 = 네 걸음 표시 하나(옛 눈썹 · 막대 · 순서 n/N 숨김) · 처음부터 다시 만들기는 걸음 아래', await pg.evaluate(() => document.body.classList.contains('op4') && getComputedStyle(document.getElementById('pnow')).display === 'none' && getComputedStyle(document.querySelector('.prog-bar')).display === 'none'));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  // [HEAD_PILLS 2026-09-27 사장님] 걸음 아래 밑줄 글 → 머리 알약 넷(안내 보기 · 다시 만들기 · 저장 · 나가기)
  /* [TOP_MENU 2026-10-03 사장님] 두 줄은 «⋯» 안 — 창을 열고 같은 것을 잰다 */
  await pg.click('[data-fk="obmore"]'); await pg.waitForTimeout(150);
  ok('3-5 담은 뒤 머리 «⋯» 안에 «처음부터 다시 만들기»·«안내 다시 보기» · 걸음 아래 옛 글 없음 [HEAD_PILLS · TOP_MENU]', await pg.evaluate(() => { const v = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }; return v('obMore') && v('obRestart') && v('obGuide') && !document.querySelector('.op-reset [data-fk="opreset"]'); }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
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
  ok('3-4 ② 반지 쪽 = 챙길 것([R1-30] «당일 가져오기» 되풀이 없음) · 부모님께 인사 쪽 = 카드 선택 칸 · 케이크 · 축배 쪽 = 와인 부탁 · 챙길 것 없음 [WINE_POUR_OFF]', /반지 두 개[^·]*· 평소 끼던 반지여도 괜찮아요/.test(tRing) && !/당일 가져오기/.test(tRing) && /적어 두시면 카드로 드려요 · 비워 두셔도 돼요/.test(tTrib) && !/와인 한 병씩|와인 두 병|한 잔에 (붓|모아)/.test(tToast), tTrib.slice(0, 200));
  ok('② 한눈에 보기 — 한 항목은 한 번(녹음 줄 · 부탁 줄 되풀이 없음) · 미완료 배지 목록 없음 [MK_SUM_ONE]', !/미완료\s*하객 맞이/.test(tSum) && (tSum.match(/양가 어머님께서 불을 밝혀 주세요/g) || []).length <= 1 && (tSum.match(/시작 10분 전/g) || []).length === 0, tSum.slice(0, 300));
  const mo = await pg.evaluate(() => { const one = (t) => ((t.match(/담은 순간 (\d+)/) || [])[1]) || ''; const r = {}; mkGo('_intro'); r.intro = one(document.getElementById('stage').textContent); mkGo('_sum'); r.sum = one(document.getElementById('stage').textContent); r.fn = String(_opMoments()); return r; });
  ok('② 예식 흐름 · 한눈에 보기의 «담은 순간 N»이 같은 셈 [MOMENTS_ONE]', mo.intro === mo.fn && mo.sum === mo.fn && +mo.fn > 0, JSON.stringify(mo));
  ok('3-4 한눈에 보기 = 미완료 · 부모님께 부탁드릴 것 · 보낼 것 · 당일 챙길 것 · 도와주실 분 · D-7 없음 [MK_HELPERS]', /미완료 \d+/.test(tSum) && /부모님께 부탁드릴 것/.test(tSum) && !/부모님께 부탁드릴 것 \d/.test(tSum) && /보낼 것/.test(tSum) && /당일 챙길 것/.test(tSum) && /도와주실 분/.test(tSum) && !/D-7|D-14/.test(tSum), tSum.slice(0, 300));
  /* [TRIB_CARD_OPT 사장님 «칸은 두되 선택»] 부모님께 드릴 말 칸은 미완료 셈에 안 든다 · 적으면 대본(카드 인쇄)에 · 비우면 대본에 없다 */
  await pg.evaluate(() => mkGo('tribute')); await pg.waitForTimeout(300);
  const tb = await pg.evaluate(() => { const u0 = mkUndone(); const t = document.getElementById('mkt_tribute_g'); t.value = '엄마 아빠 고마워요'; t.dispatchEvent(new Event('input')); const sc = scriptText(); t.value = ''; t.dispatchEvent(new Event('input')); return { has: !!t, same: mkUndone() === u0, inScript: /카드로 인쇄/.test(sc) && /엄마 아빠 고마워요/.test(sc), gone: !/엄마 아빠 고마워요/.test(scriptText()) }; });
  ok('사장님 · 부모님께 드릴 말 선택 칸 — 미완료 셈 밖 · 적으면 대본에 · 비우면 없음', tb.has && tb.same && tb.inScript && tb.gone, JSON.stringify(tb));
  ok('3-4 도와주실 분 문구([RING_STAGE] 반지 건넬 분 없음) · [GOODS_CHOICE] 기본은 직접 준비 → 케이크 · 꽃이 «챙길 것»에 · «저희가 준비해요» 없음', !/반지를 건넬/.test(w.t) && !/반지를 담은 날/.test(w.t) && /축의금을 받으실 때만/.test(w.t) && !/저희가 준비해요/.test(w.t) && /케이크/.test(w.t) && /부모님께 드릴 꽃/.test(w.t) && !/당일 가져오기/.test(w.t) && (w.t.match(/크기 · 도착 시각은 상담 때 안내해 드려요/g) || []).length === 1, JSON.stringify([/반지 교환을 담았을 때/.test(w.t), /축의금을 받으실 때만/.test(w.t), /저희가 준비해요/.test(w.t), /부모님께 드릴 꽃 · 케이크|케이크 · 부모님께 드릴 꽃/.test(w.t)]) + ' … ' + w.t.slice(-250));
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'done') { idx = i; render(); } }); await pg.waitForTimeout(900);
  const d = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, rows: [...document.querySelectorAll('.sumrow')].map((r) => r.querySelector('.sr-n').textContent.trim() + ' ' + r.querySelector('.sr-l').textContent.trim()), want: _lRows().map((k) => _lNo(k) + ' ' + _lName(k) + (k === RitualOpen.peakOf(S) ? ' ★' : '')) }))   /* [R2-33] ★ 은 이름 뒤 */;
  ok('3-1 ④ 순서 요약 = ② 줄 머리(번호 · 이름 · ★)', JSON.stringify(d.rows) === JSON.stringify(d.want), JSON.stringify(d.rows) + ' vs ' + JSON.stringify(d.want));
  ok('④ 준비할 것 = 한 줄 + «② 한눈에 보기에서 보기» · 목록을 또 늘어놓지 않는다 · 담은 순간 = ② 와 같은 셈 [DONE_PREP_ONE · MOMENTS_ONE]', !/쓸 글/.test(d.t) && /두\s분\s\d+가지/.test(d.t) && new RegExp('담은 순간 ' + mo.fn + ' ').test(d.t), d.t.slice(0, 400));
  ok('3-1 ④ «담은 순간 N · 본식 · 단체 사진» [I1_HEAD] · 옛 준비 말(D-14 · 덕담 1~2분) 없음 · ② 한눈에 보기에서 보기', /담은 순간 \d+ · 본식 약\s\d+~\d+분 · 단체 사진 약\s\d+~\d+분/.test(d.t) && !/D-14 ?부모님께 덕담|1~2분|D-7/.test(d.t) && /한눈에 보기로 이동하기/.test(d.t) && !/②\s?한눈에 보기/.test(d.t), d.t.slice(0, 300));   /* [STEP_NONUM_OP 2026-10-03] 종전 «② 한눈에 보기로 이동하기» → 번호 없이 */
  /* ★[GOODS_CHOICE 2026-09-25 사장님 · 코워크 회신4 5-1] 케이크 · 꽃 — ② 칩(담았을 때만 · 큰절이면 꽃 없음) · 맡기면 ③ 「저희가 준비해요 · 별도 비용」 · 초안에 실림 */
  const gd = await pg.evaluate(() => {
    const R = RitualOpen, T = JSON.parse(JSON.stringify(S)), keep = S, out = {};
    out.chips = _lGroups('cake').map((g) => g.key).concat(_lGroups('tribute').map((g) => g.key));   // [CAKE_TOAST_SPLIT] 케이크 준비는 케이크 쪽
    S.cakeBy = 'studio'; S.flowerBy = 'studio'; out.w = _mkSum(); out.sm = _ordPayload(false).summary.goods; out.bring = R.prepList(S).filter((q) => q.cat === 'bring').map((q) => q.what).join('|');
    S.tribute = 'bowGroom'; out.bow = _lGroups('tribute').map((g) => g.key); out.bowGoods = R.goodsOf(S).map((g) => g.what);
    delete S.on.cake; S.on.toast = 1; S.toast = R.toastMode(S); out.toastOnly = R.goodsOf(S).filter((g) => g.key === 'cakeBy').length;   // [CAKE_TOAST_SPLIT] 축배만 = 케이크 칸을 뺀 것
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
  ok('2-2 안내 2/2 = 네 걸음(번호 넷) · 예식까지 세 줄([R1-32] «언제든 · 연습» 줄 걷음 · 순서 확정 예식 14일 전 · 글 마감 예식 7일 전 · 진행은 저희가) · «미리 알아두면» 상자 없음 [INTRO_JOURNEY]', await pg.evaluate(() => { const t = document.getElementById('stage').textContent; const rows = [...document.querySelectorAll('.daymap.jr .seqr')].map((r) => r.textContent); return document.querySelectorAll('.ipt .n').length === 4 && rows.length === 3 && /14일\s전/.test(rows[0]) && /순서 확정/.test(rows[0]) && /7일\s전/.test(rows[1]) && /글 마감/.test(rows[1]) && /진행은 저희가/.test(rows[2]) && /나레이션과 디렉터가 맡아요/.test(rows[2]) && !/미리 알아두면/.test(t) && !/미리듣기로 이어들으며/.test(t); }));
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
  ok('2-10 ③ 끝 화면 = [다시 보기] [다음 · 완성] 둘 · 큰 ↻ 없음 [FLOW_MAKE · STEP_NONUM_OP]', await pg.evaluate(() => { const f = document.getElementById('lsFull'); const n = f.querySelector('[data-fk="lfnextstep"]'); return !!f.querySelector('[data-fk="lfagain"]') && !!n && n.textContent.trim() === '다음 · 완성' && !f.querySelector('[data-fk="lfdone"]') && !f.querySelector('[data-fk="lftog"]'); }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); await pg.evaluate(() => lsStop());
  // 3장 radiogroup 방향키 — ② 화촉 쪽 «고르기»
  await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(400);
  const c0 = await pg.evaluate(() => S.candleWho || RitualOpen.DEF.candleWho);
  await pg.focus('.mk-pg [role=radio][tabindex="0"]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(500);   // [CHIP_UNPICKED] 탭 자리 = 고른 칩(안 골랐으면 첫 칩) · ★[LP_WAIT_FIX 2026-09-28] 기다림이 주석 안에 들어가 있어 결과를 바로 읽었다(main 에서도 빨강이던 한 건)
  ok('3장 칩 묶음은 방향키로 옮기며 고른다 · 포커스도 따라간다', await pg.evaluate((c) => (S.candleWho || '') !== c && document.activeElement.getAttribute('role') === 'radio' && document.activeElement.getAttribute('aria-checked') === 'true', c0));
  ok('3장 고른 칩만 Tab 으로 들어간다(roving)', await pg.evaluate(() => [...document.querySelectorAll('.mk-pg [role=radio]')].filter((r) => r.closest('[role=radiogroup]')).every((r) => r.tabIndex === (r.getAttribute('aria-checked') === 'true' ? 0 : -1))));
  await pg.evaluate(() => mkGo('ring')); await pg.waitForTimeout(400);
  await pg.evaluate(() => mkDrop('ring')); await pg.waitForTimeout(400);   /* [MK_NO_DROP_LINK] 단추가 없어 옛 초안 길로 */
  ok('3장 빼기 뒤 포커스 = «다시 넣기» [DROP_DIM]', await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'mkundrop'));
  await pg.click('[data-fk="mkundrop"]'); await pg.waitForTimeout(400);
  /* ★[MK_NO_DROP_LINK 2026-10-03] 종전 «다시 넣은 뒤 포커스 = «이 순간 빼기»(같은 자리)» → 그 단추가 없어졌다 · 쪽 제목으로 */
  ok('3장 다시 넣은 뒤 포커스 = 쪽 제목 [MK_NO_DROP_LINK]', await pg.evaluate(() => document.activeElement && document.activeElement.id === 'mkHead'));
  // 보낼 길 — ② 식전 영상 쪽
  await pg.evaluate(() => { if (!RitualOpen.onOf(S, 'prevideo')) { S.on.prevideo = 1; opSync(); } mkGo('prevideo'); }); await pg.waitForTimeout(400);
  const w = await pg.evaluate(() => ({ t: document.getElementById('stage').textContent, send: document.querySelectorAll('.send-how a[href^="https://pf.kakao.com"], .send-how a[href^="mailto:"]').length }));
  /* ★[PREVIDEO_FREE 2026-10-02 사장님 «링크 칸 하나만»] 카톡 · 메일 보내기 · 길이 · 장수 규정은 걷었다 — 링크 칸 하나 · 규정 글 없음 */
  ok('2-4 · 2-8 ② 식전 영상 쪽 = 링크 칸 하나 · 카톡 · 메일 · 3분 · 30~40장 없음 [PREVIDEO_FREE]', w.send === 0 && !/30~40장|3분 안|25MB/.test(w.t) && /MYBOX/.test(await pg.evaluate(() => (document.querySelector('#stage input[aria-label="식전 영상 링크"]') || {}).placeholder || '')), w.send + ' ' + w.t.slice(0, 200));
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
    /* [AI_LABEL_OFF 2026-10-03 사장님 «ai 그 문구도 지워»] 종전 «AI 둘» → «AI 0» */
    ok(`① 칸에는 영상 없음 · 첫 장면 작은 판 둘 · 칸 구석 «AI» 없음 (reduce=${reduce}) [AI_LABEL_OFF]`, tl.vids === 0 && tl.imgs.length === 2 && tl.imgs.every((u) => /-640\.webp$/.test(u)) && tl.ai === 0, JSON.stringify(tl));
    await pg.click('[data-fk="pto:candle"]'); await pg.waitForTimeout(1200);
    const st = await pg.evaluate(() => { const v = document.querySelector('#pvM video'); return v ? { playing: !v.paused, muted: v.muted, ai: !!document.querySelector('#pvM .pv-ai') } : null; });
    /* [AI_LABEL_OFF 2026-10-03 사장님 «굳이 없어도 될 거 같아 · 그림이니까»] 종전 «긴 AI 이름표가 있다» → 이제 «없다»(창 그림 위 글 금지) */
    if (!reduce) ok('① 창: 영상은 소리 없이 돈다 · 그림 위 AI 이름표 없음 [PREVIEW_SHEET · AI_LABEL_OFF]', !!st && st.muted && st.playing && !st.ai, JSON.stringify(st));
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
  ok('9-1 연습 중 머리 «연습 · n / N» · 칩도 «이 순간 바꾸기» 단추도 없다 [PRACTICE_NO_CHOOSE]', /^연습 · /.test(a.mode) && a.chips === 0 && !a.btn, JSON.stringify(a));
  /* ★[PRACTICE_NO_CHOOSE 2026-10-05 사장님 «연습 공간에서 이 부분은 삭제»] 9-2 ~ 9-5(연습 중 «이 순간 바꾸기» → 고르는 중 · 칩 · 다 골랐어요)는 단추를 걷어 잴 것이 없다 — 칩은 ② 순간 쪽에서 잰다(make-shell · listen-page 앞 절) */
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
  ok('9-9 참고 예시 표 144줄(EX_MORE) · 폐지 클립(27 · 15) 없음 · 서로의 부모님께 판 · 축하의 말 1분 = 조각 둘 × 고른 네 벌 · 덕담 없으면 부모님 예시(고른 넷 + 한 분이 하실 때) 다섯 벌 더 [REF_TABLE · EX_MORE · REF_BEST4]', rt.rows === 144 && rt.retired === 0 && /505_tribute-cross-groom/.test(rt.cross) && rt.sp1 === '2,2,2,2' && rt.sp3off === 9, JSON.stringify(rt));
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
  /* ★[VOICE_UP_FROM 2026-09-28] 임베드는 서버 날짜 문을 따른다 — 닫혀 있으면(옛 마이페이지 · 처리방침 전) 녹음 칸 없이 종전 방식, 열리면(시행일 · 시험 예식) 새 칸 */
  const vg = await pg.evaluate(() => ({ closedRec: document.querySelectorAll('[data-fk^="mkrec:"]').length, closedSent: !!document.querySelector('[data-fk="mkupsent"]'), prep: (RitualOpen.prepOf('guest', S)[0] || [])[1] || '' }));
  ok('RF 날짜 문 닫힘 — 녹음 칸 없음 · 카톡 · 메일로 보냈어요 · 준비 목록은 종전 글 [VOICE_UP_FROM]', vg.closedRec === 0 && vg.closedSent && /대본을 드려요/.test(vg.prep), JSON.stringify(vg));
  await pg.evaluate(() => { RitualOpen.FEATURE.upLive = true; render(); }); await pg.waitForTimeout(300);
  const v0 = await pg.evaluate(() => ({ rows: document.querySelectorAll('.mk-vr').length, oldChk: [...document.querySelectorAll('.mk-pg .upchk')].filter((l) => !l.closest('.mk-valt')).length, alt: !!document.querySelector('.mk-valt:not([open])'), dup: /대본을 드려요/.test(document.querySelector('.mk-pg').textContent), todo: _mkTasks('guest').filter((x) => !x.done).length }));
  ok('RF ② 하객 맞이 — 녹음 카드 한 장 · 녹음마다 한 줄(넷) · 옛 체크 칸 없음 · «올리기가 어렵다면»은 접힘 · 겹치는 «대본을 드려요» 줄 없음 [RITUAL_FILE]', v0.rows === 4 && v0.oldChk === 0 && v0.alt && !v0.dup && v0.todo === 4, JSON.stringify(v0));
  /* ★[REC_TRIM 2026-09-28 코워크 0928 6-2] 못 여는 파일은 받은 그대로 보내지 않는다 — «이 파일은 열 수 없어요 …» 한 줄 · 아무것도 안 보낸다 */
  const [fc0] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g0"]')]);
  await fc0.setFiles({ name: '입장.m4a', mimeType: 'audio/mp4', buffer: Buffer.from('ID3testaudio') });
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'err', null, { timeout: 8000 }).catch(() => {});
  const v0e = await pg.evaluate(() => ({ msg: (document.querySelector('.mk-recp') || {}).textContent || '', sent: window.__sent.length }));
  ok('RF 못 여는 파일 → «이 파일은 열 수 없어요. m4a · mp3 · wav 로 올려 주세요» · 보내지 않음 [REC_TRIM]', /이 파일은 열 수 없어요\. m4a · mp3 · wav 로 올려 주세요/.test(v0e.msg) && v0e.sent === 0, JSON.stringify(v0e));
  await pg.evaluate(() => { MK_REC = null; render(); });
  /* 1.5초짜리 16bit 모노 WAV(말소리 흉내: 켜졌다 꺼지는 톤) — 브라우저가 풀 수 있는 파일 */
  const wav = (() => { const sr = 24000, n = Math.round(sr * 1.5), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) { const t = i / sr, env = (t > 0.2 && t < 1.3) ? (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t)) : 0; b.writeInt16LE(Math.round(9000 * env * Math.sin(2 * Math.PI * 220 * t)), 44 + i * 2); } return b; })();
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g0"]')]);
  await fc.setFiles({ name: '입장.wav', mimeType: 'audio/wav', buffer: wav });
  /* [REC_UPLOAD] 파일도 먼저 다듬어 들어 보기 → [이걸로 쓰기] */
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 8000 }).catch(() => {});
  const v1r = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, raw: !!(MK_REC && MK_REC.raw), dur: MK_REC && MK_REC.dur }));
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(500);
  const v1 = await pg.evaluate(() => ({ sent: window.__sent.map((d) => d.key + ':' + d.mime + ':' + d.name + ':' + /^data:audio\/wav;base64,/.test(d.data)), busy: /보내는 중/.test(document.querySelector('.mk-voice').textContent) }));
  ok('RF 올리기 → 다듬어 들어 보기 → 마이페이지로 파일(키 · wav · 이름 · base64)이 넘어가고 «보내는 중…» [REC_UPLOAD]', v1r.ph === 'review' && !v1r.raw && v1r.dur > 1 && v1r.dur < 1.5 && v1.sent.join() === 'g0:audio/wav:하객 입장 때 · 입장.wav:true' && v1.busy, JSON.stringify({ v1r, v1 }));
  await pg.evaluate(() => _mkUpDone({ key: 'g0', ok: true, name: '입장.m4a', id: 'F1', at: '2026-09-27 17:40' })); await pg.waitForTimeout(300);
  const v2 = await pg.evaluate(() => ({ st: document.querySelector('.mk-vr').textContent, up: S.up.g0, fAt: !!(S.fAt && S.fAt['up.g0']), todo: _mkTasks('guest').filter((x) => !x.done).length, btn: !!document.querySelector('[data-fk="mkupdel:g0"]') && !!document.querySelector('[data-fk="mkupplay:g0"]') }));
  ok('RF 도착 → «파일 올렸어요» · [들어 보기] [지우기] · 그 줄은 완료(남은 셋은 미완료) · 칸마다 시각(두 기기) [REC_UPLOAD]', /파일 올렸어요/.test(v2.st) && v2.up && v2.up.id === 'F1' && v2.fAt && v2.todo === 3 && v2.btn, JSON.stringify(v2));
  await pg.evaluate(() => _mkUpDone({ key: 'g1', ok: false, error: '한 개에 20MB 까지 올릴 수 있어요.' })); await pg.waitForTimeout(300);
  ok('RF 실패는 사유를 한 줄로 · 그 줄은 미완료 그대로', await pg.evaluate(() => /20MB/.test((document.querySelector('.mk-toast') || {}).textContent || '') && !S.up.g1));
  await pg.evaluate(() => { document.querySelectorAll('.mk-valt').forEach((d) => { d.open = true; }); }); await pg.click('.mk-valt .upchk');   // [REC_UPLOAD] 접이가 둘(녹음 도움말 · 올리기가 어렵다면) await pg.waitForTimeout(300);
  ok('RF «카톡 · 메일로 보냈어요» → 올리지 않은 줄만 보냄 처리 · 올린 줄은 그대로', await pg.evaluate(() => S.up.g0.id === 'F1' && S.up.g1 === 'sent' && S.up.g3 === 'sent' && _mkTasks('guest').every((x) => x.done)));
  ok('RF pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
  // 그냥 연 미리보기(임베드 아님)는 올리지 않고 카톡 · 메일 길을 말한다
  const c2 = await br.newContext({ viewport: { width: 390, height: 900 } }); const p2 = await c2.newPage();
  await p2.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await p2.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await p2.waitForTimeout(700);
  await clickNext(p2); await p2.waitForTimeout(400); await clickNext(p2); await p2.waitForTimeout(500); await p2.click('[data-fk="opx:family"]'); await p2.waitForTimeout(300); await clickNext(p2); await p2.waitForTimeout(1200);
  await p2.evaluate(() => { S.guestVoice = 'couple'; mkGo('guest'); }); await p2.waitForTimeout(300);
  const [fc3] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('[data-fk="mkup:g0"]')]); await fc3.setFiles({ name: 'a.wav', mimeType: 'audio/wav', buffer: wav });   // [REC_TRIM] 못 여는 파일은 이제 안 보낸다 — 풀리는 파일로
  await p2.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 8000 }).catch(() => {}); await p2.click('[data-fk="mkrecuse"]'); await p2.waitForTimeout(300);
  ok('RF 그냥 연 미리보기 — 이 기기에서만 그 자리에 들어가고 «마이페이지에서 열면 저희에게 보내져요» 한 줄 [REC_UPLOAD]', await p2.evaluate(() => /마이페이지에서 열면 저희에게 보내져요/.test((document.querySelector('.mk-toast') || {}).textContent || '') && !!(S.up.g0 && S.up.g0.local)));
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

/* ★[MK_VID_CHIP 2026-09-27] ② 케이크 · 축배 쪽 영상은 고른 판대로 — «케이크만» cake · «축배만 + 붓지 않음» toast · «케이크와 축배» cake(첫 장면) */
{
  const NAMES = ['guest', 'prevideo', 'candle', 'entry', 'entry-look', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'cake', 'toast-pour', 'toast', 'close'];
  const { ctx, pg, errs } = await open(390, { videos: NAMES });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  const v = await pg.evaluate(() => { const nm = () => { const el = document.querySelector('.mk-vid video'); return el ? ((el.getAttribute('src') || '').match(/moments\/([^/]+)\.mp4$/) || [])[1] : '(없음)'; }; const out = {};
    for (const [t, pg2] of [['cake', 'cake'], ['toast', 'toast'], ['both', 'cake'], ['both2', 'toast']]) { if (t === 'cake') { S.on.cake = 1; delete S.on.toast; } else if (t === 'toast') { delete S.on.cake; S.on.toast = 1; } else { S.on.cake = 1; S.on.toast = 1; } opSync(); mkGo(pg2); render(); out[t] = nm(); }   // [CAKE_TOAST_SPLIT] 쪽마다 제 영상
    return out; });
  ok('11-1 ② 케이크 커팅 쪽 영상 = cake · 축배 쪽 영상 = toast(둘 다 담아도 쪽마다 제 영상) [MK_VID_CHIP · CAKE_TOAST_SPLIT]', v.cake === 'cake' && v.toast === 'toast' && v.both === 'cake' && v.both2 === 'toast', JSON.stringify(v));
  ok('11-1 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★[PC_GO_LABEL 2026-09-27] PC ① 흐름 띠 · 얇은 띠 단추 = «다음 · 하나씩 만들기»(#902 뒤 ② 이름 · 폰 #nav 와 같게) */
{
  const { ctx, pg } = await open(1280);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  const g = await pg.evaluate(() => [...document.querySelectorAll('[onclick="opToListen()"]')].map((b) => b.textContent.replace(/\u00a0/g, ' ')));
  ok('11-2 PC ① 다음 단추 글 = «다음 · 하나씩 만들기» · 화면에 «보고 듣기» 없음 [PC_GO_LABEL]', g.length > 0 && g.every((t) => t === '다음 · 하나씩 만들기') && !(await pg.evaluate(() => /보고 듣기/.test(document.body.innerText))), JSON.stringify(g));
  await pg.screenshot({ path: path.join(os.tmpdir(), 'pc-go-1280.png') });
  await ctx.close();
}
/* [ONEMIN_HOME 2026-09-27 → ONEMIN_FIRST 2026-10-05] 1분 전 안내 — 어느 경우든 하객 맞이 쪽 · 사라지지 않는다 */
{
  const { ctx, pg, errs } = await open(390);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => { const has = (k) => _lSteps(ENG, [k]).some((x) => /1분 전/.test((x.lab || '') + (x.txt || ''))); const out = {};
    S.on.prevideo = 1; opSync(); out.onPre = has('prevideo'); out.onGuest = has('guest'); mkGo('guest'); render(); out.note = /1분\s전\s안내는\s식전\s영상이\s끝난\s뒤에\s흘러요/.test(document.querySelector('.mk-flow').textContent);
    delete S.on.prevideo; opSync(); out.offGuest = has('guest'); out.all = _lSteps(ENG, _lRows()).some((x) => /1분 전/.test((x.lab || '') + (x.txt || ''))); return out; });
  /* ★[ONEMIN_FIRST 2026-10-05 사장님] 차례가 «1분 전 공지 → 식전 영상»으로 바뀌었다 — 1분 전은 식전 영상을 담아도 하객 맞이 쪽 · «영상 뒤에 흘러요» 줄 없음 */
  ok('12-1 1분 전 안내 — 식전 영상을 담아도 안 담아도 하객 맞이 쪽 · «영상이 끝난 뒤에 흘러요» 줄 없음 · 연습에서 안 사라짐 [ONEMIN_FIRST]', !r.onPre && r.onGuest && !r.note && r.offGuest && r.all, JSON.stringify(r));
  /* [MK_COPY_RIGHT] 녹음 카드 — «읽을 글 복사하기»는 제목 줄 오른쪽 · 누르면 그 아래 «복사됐어요» */
  await pg.evaluate(() => { S.guestVoice = 'couple'; mkGo('guest'); render(); window.__clip = ''; navigator.clipboard.writeText = (t) => { window.__clip = t; return Promise.resolve(); }; }); await pg.waitForTimeout(300);
  const c0 = await pg.evaluate(() => { const b = document.querySelector('[data-fk="mkupcopy"]'), h = document.getElementById('mkVoiceH'); return { same: !!b && Math.abs(b.getBoundingClientRect().top - h.getBoundingClientRect().top) < 30, right: !!b && b.getBoundingClientRect().left > h.getBoundingClientRect().right }; });
  await pg.click('[data-fk="mkupcopy"]'); await pg.waitForTimeout(300);
  const c1 = await pg.evaluate(() => ({ msg: (document.querySelector('.mk-copied') || {}).textContent || '', clip: window.__clip }));
  ok('12-2 «읽을 글 복사하기» = 제목 줄 오른쪽 · 누르면 아래 «복사됐어요» · 네 녹음 글이 들어간다 [MK_COPY_RIGHT]', c0.same && c0.right && /^복사됐어요/.test(c1.msg) && (c1.clip.match(/^\[/gm) || []).length === 4, JSON.stringify({ c0, msg: c1.msg, n: (c1.clip.match(/^\[/gm) || []).length }));
  ok('12 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★[MK_STRIP_WRAP 2026-09-27] PC 진행 줄 — 줄바꿈으로 전부 보인다(오른쪽 잘림 0) · 모바일은 한 줄 넘기기 */
{
  for (const w of [1280, 390]) {
    const { ctx, pg } = await open(w);
    await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200); await clickNext(pg); await pg.waitForTimeout(400);
    await pg.evaluate(() => mkFold(true)); await pg.waitForTimeout(200);   /* [NAV_FOLD] 펼쳐서 잰다 */
    const r = await pg.evaluate(() => { const sc = document.querySelector('#mkStrip .mk-sc'), b = sc.getBoundingClientRect(), its = [...sc.querySelectorAll('.mk-it')]; const tops = new Set(its.map((x) => Math.round(x.getBoundingClientRect().top)));
      return { cut: its.filter((x) => x.getBoundingClientRect().right > b.right + 1).length, lines: tops.size, scroll: sc.scrollWidth > sc.clientWidth + 1 }; });
    if (w >= 1000) ok(`${w} ② 진행 줄 — 줄바꿈 · 잘린 칸 0 · 두 줄 안팎 [MK_STRIP_WRAP]`, r.cut === 0 && r.lines >= 1 && r.lines <= 3 && !r.scroll, JSON.stringify(r));
    else ok(`${w} ② 진행 줄 — 한 줄 넘기기(줄바꿈 없음) [MK_STRIP_WRAP]`, r.lines === 1 && r.scroll, JSON.stringify(r));
    await ctx.close();
  }
}
/* ★[EX_MORE 2026-09-27 코워크 · 사장님] 참고 예시 144줄 — 칩(줄바꿈 · 가로 스크롤 없음) · 상황 이름 · 무드 이름 없음 · 부모님이 하실 때 · 이 예시로 시작하기 뒤 이름 경고 */
{
  const { ctx, pg, errs } = await open(360);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  const e = await pg.evaluate(() => { const o = { rows: RITUAL_REF.rows.length };
    S.on.tribute = 1; S.tributeSay = 'long'; opSync(); mkGo('tribute'); render();
    o.long0 = document.querySelectorAll('.mk-ref .mk-rc').length; o.sitBtn = document.querySelectorAll('.mk-ref .mk-rmore [data-fk^="mkrsit:tribute:"]').length;   // [REF_ROW4 2026-10-06] 카드는 고른 넷 · 상황 예시는 카드 줄 아래 글 단추
    const cs = [...document.querySelectorAll('.mk-ref .mk-rc')]; o.long = cs.length; o.lines = new Set(cs.map((c) => Math.round(c.getBoundingClientRect().top))).size; o.hs = document.documentElement.scrollWidth > innerWidth;
    o.n7 = (document.querySelector('[data-fk="mkrsit:tribute:5"]') || {}).textContent || ''; mkRefPick('tribute', 5, 1); o.linkOn = !!document.querySelector('[data-fk="mkrsit:tribute:5"].on'); o.long1 = document.querySelectorAll('.mk-ref .mk-rc').length; o.b7 = (document.querySelector('.mk-ref .mk-rsel .sr-only') || {}).textContent || '';   /* [R8-14] 배지는 화면 읽기에만 */ o.help = /먼저 떠나신 분께 드리는 글이에요/.test(document.querySelector('.mk-ref').textContent);
    o.mood = /담백|다정|유머|격식|솔직하게|그리움|장면 하나|짧게/.test([...document.querySelectorAll('.mk-ref .mk-rc b, .mk-ref .lf-refb, .mk-ref .mk-rsel .sr-only')].map((x) => x.textContent).join('|'));
    S.on.free = 1; S.freeWhat = 'speech'; S.freeLen = '3'; delete S.on.bless; opSync(); mkGo('free'); render();
    o.free0 = document.querySelectorAll('.mk-ref .mk-rc').length; o.par = !!document.querySelector('.mk-rmore [data-fk="mkrpar:free"]');
    mkRefPar('free'); o.free1 = document.querySelectorAll('.mk-ref .mk-rc').length; o.parLink = !!document.querySelector('.mk-rmore [data-fk^="mkrsit:free:"]');
    S.tx = S.tx || {}; delete S.tx['vow.g']; delete S.tx['vow.b']; mkGo('vow'); render(); mkRefPick('vow', 3, 1); mkRefStart('vow');
    o.filled = !!String(S.tx['vow.g'] || '').trim() && !!String(S.tx['vow.b'] || '').trim(); o.warn = (document.getElementById('mkw_vow_g') || {}).textContent || '';
    o.startGone = !document.querySelector('[data-fk="mkrstart:vow"]'); return o; });
  ok('13 [EX_MORE · REF_BEST4 · REF_ROW4] 참고 예시 144줄 · 카드는 고른 네 벌(360 에서 2×2) · 상황 예시 셋은 카드 줄 아래 글 단추 · 누르면 그 예시가 골라지고 카드는 그대로 넷(가로 스크롤 없음)', e.rows === 144 && e.long0 === 4 && e.sitBtn === 3 && e.long === 4 && e.lines === 2 && e.linkOn && e.long1 === 4 && !e.hs, JSON.stringify(e));
  ok('13 상황 이름 — «예시 6 · 먼저 떠나신 분께» · 배지 «참고 예시 6 · 먼저 떠나신 분께» · 도움말 한 줄 · 무드 이름은 칩 · 배지 어디에도 없음 [REF_NO_KYEOL · REF_BEST4]', e.n7 === '먼저 떠나신 분께 예시' && e.b7 === '참고 예시 6 · 먼저 떠나신 분께' && e.help && !e.mood, JSON.stringify(e));
  ok('13 덕담 없는 식순의 축하의 말 — 고른 네 벌 + 글 단추 «부모님이 하실 때 예시 ›» → 누르면 덕담 고른 넷이 둘째 카드 줄 · «한 분이 하실 때»는 글 단추 [REF_BEST4 · REF_ROW4]', e.free0 === 4 && e.par && e.free1 === 8 && e.parLink, JSON.stringify(e));
  ok('13 «이 예시로 시작하기» — 빈 두 칸을 채우고 단추는 사라진다 · 예시 속 이름이 남으면 한 줄 알림 [EX_NAMES]', e.filled && e.startGone && /예시 속 이름 «.+»이 남아 있어요/.test(e.warn), JSON.stringify(e));
  ok('13 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★[VIDEO_IN_1003 2026-10-03] 들어온 판 그대로 — 목록을 손대지 않고 연다(opt.videos 없음) */
{
  const DIR = path.join(ROOT, 'assets/video/moments');
  const disk = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
  const { ctx, pg, errs } = await open(390);
  const ready = await pg.evaluate(() => RitualOpen.VIDEO_READY.slice());
  const lack = ready.filter((n) => !['.mp4', '.webp', '-640.webp'].every((x) => disk.includes(n + x)));
  const stray = disk.filter((f) => !ready.some((n) => f === n + '.mp4' || f === n + '.webp' || f === n + '-640.webp'));
  ok(`V-1 목록 ${ready.length}편 = 디스크 — 이름마다 mp4 · webp · 640.webp 셋 · 목록 밖 파일 0 [VIDEO_IN_1003]`, ready.length === 16 && lack.length === 0 && stray.length === 0 && disk.length === ready.length * 3, JSON.stringify({ lack, stray }));
  const keys = await pg.evaluate(() => { const R = RitualOpen, o = {}; R.ORDER.concat(['_close']).forEach((k) => { o[k] = R.videoKeys(k, S).filter((n) => !R.videoOf(n)); }); return o; });
  const asked = await pg.evaluate(() => { const R = RitualOpen, a = {}; R.ORDER.concat(['_close']).forEach((k) => R.videoKeys(k, S).forEach((n) => { a[n] = 1; })); return Object.keys(a); });
  ok('V-2 들어온 16편은 모두 화면이 찾는 이름(안 쓰는 파일 0)', ready.every((n) => asked.includes(n)), JSON.stringify(ready.filter((n) => !asked.includes(n))));
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(900);
  const tl = await pg.evaluate(async () => { const im = [...document.querySelectorAll('.pk-tile img')]; await Promise.all(im.map((i) => (i.decode ? i.decode().catch(() => 0) : 0)));
    return { n: im.length, ok: im.filter((i) => i.naturalWidth === 640 && /-640\.webp$/.test(i.getAttribute('src'))).length, ai: document.querySelectorAll('.pk-tile .pk-ai').length, vids: document.querySelectorAll('.pk-tile video').length, note: !!document.querySelector('.pk-ainote'), aiTxt: /AI로 만든|(^|\s)AI(\s|$)/.test([...document.querySelectorAll('.pk-tile .pk-media')].map((m) => m.textContent).join(' ')) }; });
  /* [AI_LABEL_OFF 2026-10-03 사장님 «ai 그 문구도 지워»] 종전 «칸마다 AI · 한 줄 안내» → «AI 0 · 한 줄 없음» */
  ok('V-3 ① 칸 그림 = 실제 640 판이 뜬다(빈 그림 0) · 칸 구석 «AI» 0 · 칸에 영상 0 · «AI로 만든» 한 줄 없음 [AI_LABEL_OFF]', tl.n >= 8 && tl.ok === tl.n && tl.ai === 0 && tl.vids === 0 && !tl.note && !tl.aiTxt, JSON.stringify(tl));
  await clickNext(pg); await pg.waitForTimeout(1200); await pg.evaluate(() => { mkGo('ring'); render(); }); await pg.waitForTimeout(500);
  const mk = await pg.evaluate(() => { const v = document.querySelector('.mk-vid video'), b = document.querySelector('.mk-vid'); return { src: v ? v.getAttribute('src') : '', poster: v ? v.getAttribute('poster') : '', ai: b ? (/AI로 만든 장면/.test(b.textContent) || !!b.querySelector('.lv-ai')) : false }; });
  /* [AI_LABEL_OFF 2026-10-03 사장님] 종전 «이름표가 있다» → «없다» */
  ok('V-4 ② 반지 쪽 = ring.mp4 · 첫 장면 ring.webp · 그림 위 «AI로 만든 장면» 이름표 없음 [AI_LABEL_OFF]', /moments\/ring\.mp4$/.test(mk.src) && /moments\/ring\.webp$/.test(mk.poster) && !mk.ai, JSON.stringify(mk));
  /* ★[THUMB_PICK 2026-10-03] ① 칸 그림만 고른 장면(candle 마지막 · entry 6.0초 · toast 2.0초 사장님 · tribute 8.0초 사장님 · prevideo 6.0초 사장님) — 나머지는 첫 장면.
     창 · 영상 첫 장면(.webp)과 64×36 회색으로 견준다. 실측: 고른 넷 3.6~18.8 · 나머지 0.3~0.4(같은 장면의 압축 차) — 넷째 값 없이 다시 구우면 여기서 빨강 */
  const PICK = ['candle', 'entry', 'toast', 'tribute', 'prevideo'];
  const dif = await pg.evaluate(async (ready) => {
    const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
    const gray = (img) => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data, g = []; for (let i = 0; i < d.length; i += 4) g.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); return g; };
    const o = {}; for (const n of ready) { try { const a = gray(await load('/assets/video/moments/' + n + '-640.webp')), b = gray(await load('/assets/video/moments/' + n + '.webp')); o[n] = +(a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length).toFixed(1); } catch (e) { o[n] = -1; } }
    return o; }, ready);
  const badPick = Object.keys(dif).filter((n) => (PICK.includes(n) ? !(dif[n] > 2) : !(dif[n] >= 0 && dif[n] < 1.5)));
  ok('V-5 ① 칸 그림 고르기 — candle · entry · toast · tribute · prevideo 는 첫 장면과 다른 장면 · 나머지는 첫 장면 [THUMB_PICK]', badPick.length === 0 && PICK.every((n) => n in dif), JSON.stringify(dif));
  ok('V pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★★[VID_PLAY_ALL 2026-10-03 사장님 «축배 등등 재생이 안 되는 영상이 있다»] 영상이 있는 «모든» 순간에서 영상이 실제로 불리는가 — ① 창 · ② · 크게 보기.
   실측(고치기 전): ① 창에서 케이크(대표 줄 없음) · 축배(대표 slug 가 WINE_POUR_OFF 뒤 없는 줄)는 열어도 «다시 듣기»를 눌러도 play 0 [PV_VID_NOLINE · SAMPLE_TOAST_LIVE] ·
   ② 는 16편 모두 틀 곳이 없었다 [MK_VID_PLAY] · 크게 보기는 줄마다 새 <video> 로 갈아 끼워 처음으로 돌아갔다 [LF_VID_KEEP]. */
{
  const { ctx, pg, errs } = await open(390, { stubPlay: true });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  await pg.evaluate(() => Promise.all([engine(), _lrec()]));
  const r = await pg.evaluate(async () => {
    const R = RitualOpen, wait = (ms) => new Promise((z) => setTimeout(z, ms)), out = { sheet: [], again: [], full: [], keep: [], make: [], makeKey: [], makeSound: [], label: [], line: [] };
    const ks = Object.keys(R.CARDS).filter((k) => R.firstVideo(k, S));
    for (const k of ks) {
      const want = R.firstVideo(k, S).mp4.split('/').pop();
      window.__vplays = []; opPv(k); await wait(350);
      if (!window.__vplays.some((p) => p.w === 'sheet' && p.f === want)) out.sheet.push(k);
      if (!_pvLine(k) && k !== 'cake') out.line.push(k);   /* 대표 줄이 있어야 하는 순간(케이크만 대표 줄이 없다) */
      if (document.querySelector('#pvSheet .pv-ai') || /AI로 만든 장면/.test(document.getElementById('pvM').textContent)) out.label.push('sheet:' + k);
      { const vd = document.querySelector('#pvM video'); if (vd) { window.__vplays = []; vd.click(); vd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(60);
        if (window.__vplays.length || vd.hasAttribute('tabindex') || vd.getAttribute('aria-hidden') !== 'true' || getComputedStyle(vd).cursor === 'pointer' || vd.hasAttribute('controls')) out.sheetTap = (out.sheetTap || []).concat(k); } }   /* [VID_AUTO_ONLY] ① 창 영상도 누르는 기능 없음 */
      window.__vplays = []; _pvPlay(); await wait(150);
      if (!window.__vplays.some((p) => p.w === 'sheet' && p.f === want)) out.again.push(k);
      opPvClose(); await wait(250);
    }
    for (const k of ks.concat(['_close']).filter((x, i, a) => a.indexOf(x) === i)) {
      window.__vplays = []; lsBig(k); await wait(700);
      const v = document.querySelector('#lsFull video');
      if (!v || !window.__vplays.some((p) => p.w === 'full')) out.full.push(k);
      if (v && (v.loop || v.hasAttribute('loop'))) out.fullLoop = (out.fullLoop || []).concat(k);
      if (v) { const a = v; _lPaint(); _lPaint(); await wait(80); if (document.querySelector('#lsFull video') !== a) out.keep.push(k); }
      if (document.querySelector('#lsFull .lv-ai') || /AI로 만든 장면/.test((document.querySelector('#lsFull .lv') || {}).textContent || '')) out.label.push('full:' + k);
      lsStop(); await wait(150);
    }
    R.PICKABLE.forEach((k) => { S.on[k] = 1; }); opSync(); idx = STEPS.findIndex((x) => x.k === 'listen'); render(); await wait(300);
    out.once = []; out.keep2 = []; out.loop = [];
    for (const k of ks.filter((k) => k !== '_close')) {
      window.__vplays = []; mkGo(k); render(); await wait(120);
      const v = document.querySelector('.mk-vid video');
      /* [LVID_ONCE] 쪽이 보이면 한 번(두 번 그려도 한 번) · loop 없음 · 같은 순간을 다시 그리면 같은 요소(처음으로 안 돌아감) */
      if (window.__vplays.filter((p) => p.w === 'make').length !== 1) out.once.push(k + ':' + window.__vplays.filter((p) => p.w === 'make').length);
      if (v && (v.loop || v.hasAttribute('loop'))) out.loop.push(k);
      if (v) { window.__vplays = []; render(); await wait(60); if (document.querySelector('.mk-vid video') !== v || window.__vplays.some((p) => p.w === 'make')) out.keep2.push(k); }
      if (!v || (v.getAttribute('data-vk') && v.getAttribute('data-vk') !== k)) { out.make.push(k + ':없음'); continue; }
      if (!v.getAttribute('data-vk') && (v.getAttribute('src') || '').split('/').pop() !== R.firstVideo(k, S).mp4.split('/').pop()) { out.make.push(k + ':다른 영상'); continue; }
      /* [VID_AUTO_ONLY 2026-10-03 사장님 «정지/재생 뜨는데 그 기능도 삭제»] 종전 «누르면 돈다 · tabindex 0» → «누르기 · Enter 아무 일 없음 · tabindex 없음 · 손가락 커서 없음 · 꾸밈(aria-hidden)» */
      if (v.hasAttribute('tabindex') || v.getAttribute('aria-hidden') !== 'true' || getComputedStyle(v).cursor === 'pointer' || v.hasAttribute('onclick') || v.hasAttribute('controls')) out.makeKey.push(k + ':모양');
      window.__vplays = []; v.click(); await wait(50);
      if (window.__vplays.some((p) => p.w === 'make')) out.make.push(k);
      window.__vplays = []; v.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(50);
      if (window.__vplays.some((p) => p.w === 'make')) out.makeKey.push(k);
      if (document.querySelector('.mk-vid .lv-ai') || /AI로 만든 장면/.test(document.querySelector('.mk-vid').textContent)) out.label.push('make:' + k);
      window.__vplays = []; lsPlay(k); await wait(500);
      if (window.__vplays.some((p) => p.w === 'make')) out.makeSound.push(k);   /* [VID_AUTO_ONLY] 소리를 틀어도 그림은 다시 안 돈다 */
      lsStop(); await wait(100);
    }
    out.n = ks.length;
    return out;
  });
  ok(`P-1 ① 창 — 영상 있는 ${r.n}순간 모두 열면 영상이 돈다(대표 줄이 없어도) [PV_VID_NOLINE]`, r.n >= 13 && r.sheet.length === 0, r.sheet.join(','));
  ok('P-2 ① 창 «다시 듣기 · 처음부터» 누르면 다시 돈다 · 모든 순간', r.again.length === 0, r.again.join(','));
  ok('P-2b ① 창 영상 — 눌러도 · Enter 도 아무 일 없음 · tabindex · 손가락 커서 · controls 없음 · 꾸밈(«다시 듣기»만 다시 튼다) [VID_AUTO_ONLY 2026-10-03 사장님]', !(r.sheetTap || []).length, JSON.stringify(r.sheetTap || []));
  ok('P-3 ① 창 대표 줄 — 케이크 밖 모든 순간이 엔진에서 찾힌다(축배 76 · 죽은 slug 0) [SAMPLE_TOAST_LIVE]', r.line.length === 0, r.line.join(','));
  ok('P-4 크게 보기 — 모든 순간에서 영상이 불린다 · 다시 그려도 같은 영상 요소(처음으로 안 돌아감) [LF_VID_KEEP]', r.full.length === 0 && r.keep.length === 0, JSON.stringify({ full: r.full, keep: r.keep }));
  /* [VID_AUTO_ONLY 2026-10-03 사장님] P-5 · P-6 은 «누르면 돈다 · 소리를 틀면 돈다» → «아무 일 없음»으로 뒤집었다(칩 · 들어 보기가 끝난 영상을 다시 틀던 원인) */
  ok('P-5 ② 하나씩 만들기 — 그림을 눌러도(Enter 도) 아무 일 없음 · tabindex 없음 · 손가락 커서 없음 · 꾸밈 [VID_AUTO_ONLY]', r.make.length === 0 && r.makeKey.length === 0, JSON.stringify({ make: r.make, key: r.makeKey }));
  ok('P-6 ② 그 순간 소리를 틀어도(들어 보기 · 칩) 그림은 다시 안 돈다 [VID_AUTO_ONLY]', r.makeSound.length === 0, r.makeSound.join(','));
  ok('P-8 ② 쪽이 보이면 영상이 꼭 한 번 돈다 · loop 없음 · 같은 쪽을 다시 그려도 다시 안 틀고 같은 요소 [LVID_ONCE 2026-10-03 사장님]', r.once.length === 0 && r.loop.length === 0 && r.keep2.length === 0, JSON.stringify({ once: r.once, loop: r.loop, keep: r.keep2 }));
  ok('P-9 크게 보기 영상도 loop 없음(한 번 · 끝 장면에 머문다) [LVID_ONCE]', !(r.fullLoop || []).length, JSON.stringify(r.fullLoop || []));
  ok('P-7 그림 위 «AI로 만든 장면» 이름표 0 — ① 창 · ② · 크게 보기 [AI_LABEL_OFF 2026-10-03 사장님]', r.label.length === 0, r.label.join(','));
  ok('P pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* [LVID_ONCE 2026-10-03 사장님] 움직임 줄이기 — ② 쪽이 보여도 영상이 저절로 안 돈다 · [VID_AUTO_ONLY] 눌러도 안 돈다(첫 장면 사진만) */
{
  const { ctx, pg, errs } = await open(390, { stubPlay: true, reduce: true });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  const r = await pg.evaluate(async () => { const wait = (ms) => new Promise((z) => setTimeout(z, ms)), auto = [], tap = [];
    for (const k of ['candle', 'vow', 'ring', 'toast']) { if (!S.on[k]) { S.on[k] = 1; opSync(); } window.__vplays = []; mkGo(k); render(); await wait(120);
      if (window.__vplays.some((p) => p.w === 'make')) auto.push(k);
      const v = document.querySelector('.mk-vid video'); window.__vplays = []; if (v) v.click(); await wait(40); if (window.__vplays.some((p) => p.w === 'make')) tap.push(k); }
    return { auto, tap }; });
  ok('P-10 움직임 줄이기 — ② 쪽 영상이 저절로 안 돈다 · 눌러도 안 돈다(첫 장면 사진) [LVID_ONCE · VID_AUTO_ONLY]', r.auto.length === 0 && r.tap.length === 0, JSON.stringify(r));
  ok('P-10 pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★★[NAV_FOLD 2026-10-03 사장님 «하나씩 만들기 윗부분은 접혀져 있는 상태로 시작 · 카테고리가 많아 지저분»] 접힌 한 줄 — 390 · 1280 */
for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200); await clickNext(pg); await pg.waitForTimeout(500);
  const st = () => pg.evaluate(() => { const n = document.getElementById('mkStrip'), sc = n && n.querySelector('.mk-sc'), b = n && n.querySelector('.mk-fbtn'), r = b && b.getBoundingClientRect();
    const mo = _mkPages().filter((k) => k !== '_intro' && k !== '_sum' && !_mkOff(k)), at0 = _mkState().at, no = _mkNo(at0), pre = mo.filter((k) => _mkNo(k) === '식전');
    const head = (document.querySelector('#mkHead .mk-hn') || {}).textContent || '';   /* 쪽 제목 번호와 같은 셈이어야 한다 */
    return { has: !!n, hidden: !!(sc && sc.hidden), h: sc ? Math.round(sc.getBoundingClientRect().height) : -1, ex: b && b.getAttribute('aria-expanded'), ctl: b && b.getAttribute('aria-controls'), ctlOk: !!(b && (b.getAttribute('aria-controls') || '').split(/\s+/).map((id) => document.getElementById(id)).indexOf(sc) > -1),   /* [STEP_COMPACT 2026-10-03] 펼침은 걸음 줄(mkStp) + 순간 줄(mkScP) 둘을 연다 */
      lab: b && b.textContent.trim(), pos: ((n.querySelector('.mk-pos') || {}).textContent || '').replace(/^하나씩 만들기 · /, ''), pstep: ((n.querySelector('.mk-pos') || {}).textContent || '').indexOf('하나씩 만들기 · ') === 0,   /* [STEP_COMPACT] 머리 «하나씩 만들기 ·»(잘리면 빠진다)는 떼고 잰다 */ at: at0, want: no === '식전' ? '식전 ' + (pre.indexOf(at0) + 1) + ' / ' + pre.length : '본식 ' + no + ' / ' + RitualOpen.bodySeq(S).length, headOk: no === '식전' || head === no, tap: r ? Math.round(r.height) : 0, navH: Math.round(n.getBoundingClientRect().height),
      glyph: /[▾▴▼▲]/.test(n.querySelector('.mk-fold').textContent), arrows: !!n.querySelector('.mk-fold [data-fk="lmprev"],.mk-fold [aria-label*="앞 순간"]') }; });
  const a = await st();
  ok(`NF-1 ${w} ② 진행 줄은 접힌 채 시작 — 한 줄(«${a.pos}») · «모든 순간 보기» · aria-expanded=false · aria-controls 가 줄을 가리킨다 · 화살표 · ▾ 글자 없음 [NAV_FOLD]`,
    a.has && a.hidden && a.h === 0 && a.ex === 'false' && a.ctlOk && a.lab === '모든 순간 보기' && a.pos.indexOf(a.want) === 0 && a.headOk && a.tap >= 44 && a.navH <= 64 && !a.glyph && !a.arrows, JSON.stringify(a));
  await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(300);
  const b = await st();
  const one = await pg.evaluate(() => { const sc = document.querySelector('#mkStrip .mk-sc'), its = [...sc.querySelectorAll('.mk-it')]; return { lines: new Set(its.map((x) => Math.round(x.getBoundingClientRect().top))).size, scroll: sc.scrollWidth > sc.clientWidth + 1, focus: document.activeElement && document.activeElement.getAttribute('data-fk') }; });
  ok(`NF-2 ${w} 누르면 펼침 — aria-expanded=true · «접기» · 종전 줄 그대로(${w < 600 ? '한 줄 넘기기' : '줄바꿈'}) · 초점은 단추에`, !b.hidden && b.h > 30 && b.ex === 'true' && b.lab === '접기' && one.focus === 'mkfold' && (w < 600 ? (one.lines === 1 && one.scroll) : !one.scroll), JSON.stringify({ b, one }));
  await pg.click('[data-fk="mkg:ring"]'); await pg.waitForTimeout(600);
  const c = await st();
  ok(`NF-3 ${w} 순간을 고르면 그 쪽으로 가고 다시 접힌다 · 접힌 줄 번호 = 쪽 제목 번호(«${c.pos}»)`, c.at === 'ring' && c.hidden && c.ex === 'false' && c.pos.indexOf(c.want) === 0 && c.headOk && /^본식/.test(c.pos), JSON.stringify(c));
  await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(200); await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
  const d = await st();
  ok(`NF-4 ${w} 펼친 줄에서 Esc — 접히기만 한다(빌더 나가기 아님)`, d.hidden && d.ex === 'false' && STEPS_K(await pg.evaluate(() => STEPS[idx].k)) && (await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk'))) === 'mkfold', JSON.stringify(d));
  await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { idx = STEPS.findIndex((x) => x.k === 'done'); render(); }); await pg.waitForTimeout(300);
  await pg.evaluate(() => opGoStep('listen')); await pg.waitForTimeout(500);
  const e = await st();
  ok(`NF-5 ${w} ② 에 다시 들어오면(④ 에서 와도) 접힌 채`, e.hidden && e.ex === 'false', JSON.stringify(e));
  /* 미완료 — 지나온 미완료 순간이 있으면 접힌 줄에 «미완료 순간 n»(진사 글자 · 점 없음) · 줄의 진사 칸 수와 같다 */
  const t = await pg.evaluate(() => { if (_mkState().at === 'vow') mkGo('ring'); S.on.vow = 1; opSync(); S.tx = S.tx || {}; delete S.tx['vow.g']; delete S.tx['vow.b']; _mkState().seen.vow = 1; render();   /* 혼인 서약을 지나왔고 비어 있다 → 미완료 하나는 반드시 있다 */
    const n = document.querySelectorAll('#mkStrip .mk-it.todo').length, el = document.querySelector('#mkStrip .mk-left'), m = el ? el.textContent.match(/미완료 순간 (\d+)/) : null;
    return { n, shown: m ? +m[1] : 0, col: el ? getComputedStyle(el).color : '', dot: el ? getComputedStyle(el, '::after').content : '' }; });
  ok(`NF-6 ${w} 미완료 수 = 줄의 진사 칸 수(1 이상으로 만들어 잰다) · 진사 글자 · 점 없음 [TODO_NODOT]`, t.n >= 1 && t.shown === t.n && ((/rgb\(107, 42, 36\)/.test(t.col) && /none|normal/.test(t.dot))), JSON.stringify(t));
  ok(`NF ${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await pg.screenshot({ path: path.join(os.tmpdir(), `navfold-${w}.png`) });
  await ctx.close();
}
function STEPS_K(k) { return k === 'listen'; }
/* ★★[COURSE_FLOW 2026-10-03 사장님 «담은 이벤트가 실제로 어떤 순서로 진행되는지 러닝타임 순으로 한눈에 · 이벤트를 뺄 수 있게 · 여기서 최종 코스 확정 · 뺀 이벤트는 옅은 투명으로»] ② 첫 쪽 = 예식 흐름 */
for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1500);
  const rd = () => pg.evaluate(() => { const R = RitualOpen, rows = [...document.querySelectorAll('.mk-intro .cf-r')];
    return { at: _mkState().at, keys: rows.map((r) => r.getAttribute('data-k')), off: rows.filter((r) => r.classList.contains('off')).map((r) => r.getAttribute('data-k')),
      /* ★[FLOW_TIMELINE 2026-10-03 사장님] 번호 칸 · «약 n분» 칸을 걷었다 — 종전 «번호» 검사는 «시작 시각»(본식 처음부터 몇 분째)으로 옮겼다 */
      no: Object.fromEntries(rows.map((r) => [r.getAttribute('data-k'), (r.querySelector('.cf-t') || {}).textContent])),
      offOk: (() => { let acc = 0, ok = true; rows.forEach((r) => { if (r.classList.contains('off') || !r.dataset.lo) return; if (Math.abs(+r.dataset.at - acc) > 0.01 || (r.querySelector('.cf-t') || {}).textContent !== Math.round(acc / 60) + '분') ok = false; acc += +r.dataset.mid; }); return ok; })(),
      bar: (() => { const c = document.querySelector('.mk-intro .op-bar .c'), sp2 = R.span(S); return c ? { w: parseFloat(c.style.width), want: sp2.midMin / R.DAYMIN * 100, lab: document.querySelector('.mk-intro .op-bar').getAttribute('aria-label') } : null; })(),
      /* [FLOW_MARK 2026-10-03 사장님] 글 단추 → ① 칸과 같은 표 — in = 단추 · aria-pressed=true · ✓ · 먹빛 / out = aria-pressed=false · ＋ / fix = 단추 아닌 옅은 ✓(«늘 있는 순간») */
      btn: Object.fromEntries(rows.map((r) => { const m = r.querySelector('.cf-mk, .cf-fix'), g = m && m.querySelector('i') ? m.querySelector('i').textContent : '', ap = m && m.getAttribute('aria-pressed');   /* [UI_ONE] 늘 있는 순간 = «늘 있어요» 표 */
        const st = !m ? '' : m.tagName !== 'BUTTON' ? (m.getAttribute('aria-label') === '늘 있는 순간' && m.classList.contains('cf-fix') && m.textContent === '늘 있어요' ? 'fix' : 'fix?') : (ap === 'true' && g === '✓' && m.classList.contains('on') && /담김 · 누르면 빼기$/.test(m.getAttribute('aria-label'))) ? 'in' : (ap === 'false' && g === '+' && !m.classList.contains('on') && /빠짐 · 누르면 다시 담기$/.test(m.getAttribute('aria-label'))) ? 'out' : 'bad';
        return [r.getAttribute('data-k'), st]; })),
      lo: rows.filter((r) => r.dataset.lo).reduce((a, r) => a + +r.dataset.lo, 0), hi: rows.filter((r) => r.dataset.hi).reduce((a, r) => a + +r.dataset.hi, 0), sec: R.bodySec(S), sp: R.span(S),
      allOn: rows.every((r) => r.dataset.k === '_close' || R.onOf(S, r.dataset.k)), always: Object.keys(R.ALWAYS).concat(['_close']),
      sum: (document.querySelector('[data-fk="mkflowsum"]') || {}).textContent, n: String(_opMoments()), pages: _mkPages(), on: Object.keys(S.on || {}).filter((k) => S.on[k]),
      eng: (() => { const r = ENG.RitualCue.build(S, { mode: 'preview' }), cs = Array.isArray(r) ? r : r.cues, o = []; cs.forEach((c) => { const k = c.k || (/^narr-close|^end-|^bridge-b6|fx-free/.test(c.slug) ? '_close' : ''); if (k && o.indexOf(k) < 0) o.push(k); }); return o; })(),
      op: (() => { const e = document.querySelector('.mk-intro .cf-r.off .cf-nm') || (rows[0] && rows[0].querySelector('.cf-nm')); return e ? getComputedStyle(e).opacity : ''; })() };   /* 없는 칸은 빈 값 — 옛 판에서 던지지 않고 빨강으로 읽히게 */ });
  const a = await rd();
  const engOrd = a.eng.filter((k) => a.keys.indexOf(k) > -1);
  ok(`CF-1 ${w} 줄 차례 = 엔진이 트는 차례(${a.keys.join(' ')}) · 식전 · 본식 두 묶음 · ①에서 안 담은 순간 없음`, a.at === '_intro' && JSON.stringify(a.keys.filter((k) => engOrd.indexOf(k) > -1)) === JSON.stringify(engOrd) && engOrd.length >= a.keys.length - 1 && a.keys[a.keys.length - 1] === '_close' && a.allOn && (await pg.evaluate(() => document.querySelectorAll('.mk-intro .cf-g').length)) === 2, JSON.stringify({ keys: a.keys, eng: a.eng }));
  ok(`CF-2 ${w} 줄 길이의 합 = 본식 합(대본 ${a.sec[0]} · 넉넉 ${a.sec[1]}초) · 머리 한 줄 = «본식 ${a.sp.body} · 단체 사진 ${a.sp.photo} · 담은 순간 ${a.n}»`, Math.abs(a.lo - a.sec[0]) < 0.01 && Math.abs(a.hi - a.sec[1]) < 0.01 && a.sum.replace(/\u00a0/g, ' ') === '본식 ' + a.sp.body + ' · 단체 사진 ' + a.sp.photo + ' · 담은 순간 ' + a.n, JSON.stringify({ lo: a.lo, hi: a.hi, sec: a.sec, sum: a.sum }));
  ok(`CF-3 ${w} 늘 있는 순간(하객 맞이 · 입장 · 닫는 인사)은 «늘 있어요» 표(단추 아님 · UI_ONE) · 나머지는 먹빛 ✓ 단추(aria-pressed=true) [FLOW_MARK]`, a.btn.guest === 'fix' && a.btn.entry === 'fix' && a.btn._close === 'fix' && a.keys.filter((k) => a.always.indexOf(k) < 0).every((k) => a.btn[k] === 'in'), JSON.stringify(a.btn));
  const decNo0 = a.no.declare;
  ok(`CF-14 ${w} 위 막대 = ① [BAR_SUM] 과 같은 숫자 — 본식 ${a.bar && a.bar.w.toFixed(1)}% = 본식 가운데 ÷ ${await pg.evaluate(() => RitualOpen.DAYMIN)}분 · 이름에 «본식 ${a.sp.body} · 단체 사진 ${a.sp.photo}» [FLOW_TIMELINE]`, !!a.bar && Math.abs(a.bar.w - a.bar.want) < 0.02 && a.bar.lab.indexOf('본식 ' + a.sp.body + ' · 단체 사진 ' + a.sp.photo) > -1, JSON.stringify(a.bar));
  ok(`CF-15 ${w} 시작 시각 = 앞 순간들 가운데 길이의 합(«${a.no.candle} · ${a.no.entry} · ${a.no.welcome} …») · 식전은 «예식 전» [FLOW_TIMELINE · LEN_ONE]`, a.offOk && a.no.candle === '0분' && a.no.guest === '예식 전' && a.no.prevideo === '예식 전', JSON.stringify(a.no));
  await pg.click('[data-fk="mkflow:ring"]'); await pg.waitForTimeout(400);
  const live = await pg.evaluate(() => (document.getElementById('lsLive') || {}).textContent || '');
  const b = await rd();
  ok(`CF-4 ${w} ✓ 누르면 — 줄은 그 자리에 옅게(${b.op}) · 표는 ＋(aria-pressed=false) · 시작 시각 빠짐 · 뒤 시작 시각이 당겨짐(선언 ${decNo0} → ${b.no.declare}) · 막대 본식이 줄어듦 · 합과 머리 한 줄이 바로 바뀜 · ① 상태도 뺌 · 소리 내어 알림`,
    JSON.stringify(b.keys) === JSON.stringify(a.keys) && b.off.join() === 'ring' && Math.abs(+b.op - 0.4) < 0.01 && b.btn.ring === 'out' && b.no.ring === '' && b.offOk && b.no.declare !== decNo0 && b.bar.w < a.bar.w && Math.abs(b.bar.w - b.bar.want) < 0.02
      && Math.abs(b.lo - b.sec[0]) < 0.01 && b.sec[0] < a.sec[0] && b.sum.replace(/\u00a0/g, ' ') === '본식 ' + b.sp.body + ' · 단체 사진 ' + b.sp.photo + ' · 담은 순간 ' + b.n
      && b.on.indexOf('ring') < 0 && b.pages.indexOf('ring') < 0 && +b.n === +a.n - 1 && /반지 교환을 뺐어요 · 본식/.test(live),
    JSON.stringify({ off: b.off, op: b.op, no: b.no, sum: b.sum, on: b.on, live }));
  await pg.click('[data-fk="mkflow:prevideo"]'); await pg.waitForTimeout(400);
  const c = await rd();
  ok(`CF-5 ${w} 식전 영상도 빼면 옅게 · 본식 합은 그대로(식전은 본식 시간에 안 든다)`, c.off.sort().join() === 'prevideo,ring' && Math.abs(c.sec[0] - b.sec[0]) < 0.01, JSON.stringify({ off: c.off, sec: c.sec }));
  await pg.click('[data-fk="mkflow:ring"]'); await pg.waitForTimeout(400); await pg.click('[data-fk="mkflow:prevideo"]'); await pg.waitForTimeout(400);
  const d = await rd();
  ok(`CF-6 ${w} ＋ 누르면 다시 담김 — 시작 시각 · 합 · 머리 한 줄 · ① 상태가 처음 그대로 · 초점은 누른 단추에`, d.off.length === 0 && JSON.stringify(d.no) === JSON.stringify(a.no) && d.sum === a.sum && d.on.indexOf('ring') > -1 && d.on.indexOf('prevideo') > -1 && (await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk'))) === 'mkflow:prevideo', JSON.stringify({ off: d.off, sum: d.sum }));
  /* ★[FLOW_KEEP_STEP 2026-10-03 점검] 종전 «흐름 쪽을 떠났다 돌아오면 뺀 줄이 사라진다» → 이제 «② 안에서 오가면(다음 → 이전) 그대로 · ② 걸음을 떠나면(③ 연습하기) 사라진다» */
  const dur0 = await pg.evaluate(() => document.querySelector('.cf-r[data-k="ring"]').dataset.mid);   /* [FLOW_TIMELINE] «약 n분» 칸은 걷었다 — 줄의 가운데 길이(data-mid)로 잰다 */
  await pg.click('[data-fk="mkflow:ring"]'); await pg.waitForTimeout(300);
  const dur1 = await pg.evaluate(() => document.querySelector('.cf-r[data-k="ring"]').dataset.mid);
  const hollow = await pg.evaluate(() => { const r = document.querySelector('.cf-r[data-k="ring"]'), a = getComputedStyle(r.querySelector('.cf-dot'), '::after'); return { bg: a.backgroundColor, bw: a.borderTopWidth, t: (r.querySelector('.cf-t') || {}).textContent, op: getComputedStyle(r.querySelector('.cf-nm')).opacity }; });
  ok(`CF-16 ${w} 뺀 줄 — 빈 점(속 빈 동그라미) · 시작 시각 없음 · 옅게 [FLOW_TIMELINE]`, hollow.bg === 'rgb(250, 250, 248)' && hollow.bw === '1px' && hollow.t === '' && Math.abs(+hollow.op - 0.4) < 0.01, JSON.stringify(hollow));
  ok(`CF-11 ${w} 뺀 줄의 길이 = 담았을 때 길이(${dur0} → ${dur1}) [LEN_AS_ON]`, dur0 === dur1, JSON.stringify({ dur0, dur1 }));
  await clickNext(pg); await pg.waitForTimeout(500); await pg.click('#prev'); await pg.waitForTimeout(500);
  const e = await rd();
  ok(`CF-7 ${w} 뺀 뒤 «다음» → «이전» — 뺀 줄은 그 자리에 옅게 · ＋ 그대로 [FLOW_KEEP_STEP]`, e.at === '_intro' && e.keys.indexOf('ring') > -1 && e.off.join() === 'ring' && e.btn.ring === 'out', JSON.stringify({ at: e.at, off: e.off, btn: e.btn.ring }));
  await pg.evaluate(() => { opGoStep('practice'); }); await pg.waitForTimeout(500); await pg.evaluate(() => { opGoStep('listen'); mkGo('_intro'); }); await pg.waitForTimeout(500);
  const e2 = await rd();
  ok(`CF-7b ${w} ② 걸음을 떠났다(③) 돌아오면 뺀 순간은 줄에서 사라진다(①에서 안 담은 것처럼)`, e2.keys.indexOf('ring') < 0 && e2.off.length === 0, JSON.stringify(e2.keys));
  await pg.evaluate(() => { opTgl('ring'); mkGo('_intro'); }); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkflow:prevideo"]'); await pg.waitForTimeout(300);
  const sayPre = await pg.evaluate(() => (document.getElementById('lsLive') || {}).textContent || '');
  await pg.click('[data-fk="mkflow:prevideo"]'); await pg.waitForTimeout(300);
  ok(`CF-12 ${w} 식전 영상을 빼면 알림은 «식전 영상을 뺐어요»에서 끝난다(본식 · 담은 순간 수 없음) [PRE_SAY]`, sayPre.trim() === '식전 영상을 뺐어요', sayPre);
  /* ★[LEN_ONE 2026-10-03 점검] 한 순간의 길이는 한 자 — 예식 흐름 줄 = 그 순간 쪽 머리(«… 약 n분») */
  const lens = await pg.evaluate(async () => { const wait = (ms) => new Promise((z) => setTimeout(z, ms)), flow = {}, page = {};
    document.querySelectorAll('.mk-intro .cf-r').forEach((r) => { if (r.dataset.mid) flow[r.dataset.k] = RitualOpen.secTxt(+r.dataset.mid); });   /* [FLOW_TIMELINE] 시작 시각의 바탕 값(data-mid) = 순간 쪽 머리 */
    for (const k of Object.keys(flow)) { if (k === 'guest' || !(k === '_close' || RitualOpen.onOf(S, k))) continue; mkGo(k); await wait(80); page[k] = ((document.querySelector('.mk-one .mk-sec-t') || {}).textContent || '').trim(); }
    mkGo('_intro'); await wait(150); return { flow, page }; });
  const nb = (x) => String(x || '').replace(/\u00a0/g, ' '); const bad = Object.keys(lens.page).filter((k) => nb(lens.page[k]) !== nb(lens.flow[k]));   /* 화면 글은 RIT_WRAP 이 NBSP 로 묶는다 */
  ok(`CF-10 ${w} 시작 시각의 바탕 길이 = 그 순간 쪽 머리 길이 · ${Object.keys(lens.page).length}순간 [LEN_ONE]`, Object.keys(lens.page).length >= 10 && bad.length === 0, JSON.stringify(bad.map((k) => k + ':' + lens.flow[k] + '≠' + lens.page[k])));
  /* 모양 — 줄 높이 52 이상 · 단추 44 · 선은 머리카락 선만(상자 · 카드 없음) · 390 에서는 레일과 안 겹친다[RAIL_LOCKED] */
  const g = await pg.evaluate(() => { const rows = [...document.querySelectorAll('.mk-intro .cf-r')], bs = [...document.querySelectorAll('.mk-intro button.cf-mk')], rail = document.querySelector('#meAdvStack .me-fab, .me-fab'), rr = rail ? rail.getBoundingClientRect() : null;
    return { minH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)), tap: Math.min(...bs.map((b) => b.getBoundingClientRect().height)), maxR: Math.max(...bs.map((b) => b.getBoundingClientRect().right), ...[...document.querySelectorAll('.mk-intro .cf-d')].map((x) => x.getBoundingClientRect().right)), badge: [...new Set([...document.querySelectorAll('.mk-intro .cf-mk i')].map((x) => Math.round(x.getBoundingClientRect().width)))], railL: rr ? rr.left : 9999,
      boxes: rows.filter((r) => { const c = getComputedStyle(r); return c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.borderTopWidth !== '0px' || c.borderRadius !== '0px' || c.boxShadow !== 'none'; }).length, fw: Math.max(...[...document.querySelectorAll('.mk-intro *')].map((x) => +getComputedStyle(x).fontWeight)),
      fs: [...new Set([...document.querySelectorAll('.mk-intro .cf-r *, .mk-intro .cf-g, .mk-intro .mk-one')].map((x) => getComputedStyle(x).fontSize))].sort(), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
  ok(`CF-8 ${w} 줄 ${Math.round(g.minH)}px(≥52) · 단추 ${Math.round(g.tap)}px(≥44) · 상자 · 카드 없음 · 굵기 ≤600 · 글자 RIT_TYPE5 안(${g.fs.join(' ')}) · 가로 넘침 없음${w < 1000 ? ' · 폰도 끝까지(레일 겹침 허용 · RAIL_IGNORE_FULL)' : ''}`,
    g.minH >= 52 && g.tap >= 44 && g.badge.every((b) => b >= 24 && b <= 28) && g.boxes === 0 && g.fw <= 600 && g.fs.every((f) => ['11px', '12.5px', '14px', '16px', '20px'].includes(f)) && g.sw <= g.cw /* [RAIL_IGNORE_FULL 2026-10-04 사장님 «겹침 상관없음»] 레일 비킴 조건은 걷었다 */, JSON.stringify(g));
  const t = await pg.evaluate(() => { mkFlowTgl('entry'); mkFlowTgl('_close'); mkFlowTgl('guest'); return { e: RitualOpen.onOf(S, 'entry'), g: RitualOpen.onOf(S, 'guest') }; });
  ok(`CF-9 ${w} 늘 있는 순간은 뺄 수 없다(단추 없음 · 함수도 무시)`, t.e && t.g, JSON.stringify(t));
  /* [FLOW_MARK · FLOW_NO_STAR · FLOW_NO_VSBAR 2026-10-03 사장님] 예식 흐름 쪽엔 «빼기» · «다시 담기» 글 · ★ · 안내 목소리 줄이 없다 — 순간 쪽엔 목소리 줄이 그대로 */
  await pg.click('[data-fk="mkflow:ring"]'); await pg.waitForTimeout(300);
  const nx = await pg.evaluate(async () => { const it = document.querySelector('.mk-intro'), txt = it.innerText, rowsT = [...it.querySelectorAll('.cf-r')].map((r) => r.textContent).join(' '), o = { voice: /나레이션|당일 직접|두 분 목소리/.test(rowsT), cols: it.querySelectorAll('.cf-n,.cf-d,.cf-v').length, lw: Math.round(it.querySelector('.cf-l').getBoundingClientRect().width), word: /빼기|다시 담기/.test(txt), star: !!it.querySelector('.cf-r .op-star') || /★/.test([...it.querySelectorAll('.cf-r')].map((r) => r.textContent).join('')), vs: !!document.querySelector('.mk-vsbar') };
    o.ringBtn = !!document.querySelector('button[data-fk="mkflow:ring"][aria-pressed="false"]'); opTgl('ring'); mkGo('vow'); await new Promise((z) => setTimeout(z, 200)); o.vsMoment = !!document.querySelector('.mk-vsbar') === !!_vsOk(); o.vsOpen = !_vsOk() || !!document.querySelector('[data-fk="mkvsopen"]'); o.peakHead = RitualOpen.peakOf(S); mkGo(o.peakHead); await new Promise((z) => setTimeout(z, 150)); o.starHead = !!document.querySelector('#mkHead .op-star'); mkGo('_intro'); await new Promise((z) => setTimeout(z, 150)); return o; });
  ok(`CF-13 ${w} 예식 흐름 쪽 — 목소리 낱말(나레이션 · 당일 직접 · 두 분 목소리) · 번호 칸 · «약 n분» 칸 없음 [FLOW_NO_VOICE · FLOW_TIMELINE] · ${w >= 1000 ? '목록 폭 ≤ 560 · ' : ''}«빼기» · «다시 담기» 글 없음(뺀 줄이 있어도) · 줄에 ★ 없음 · 안내 목소리 줄 없음 / 순간 쪽엔 목소리 줄 · «나레이션 자세히» 그대로 · 순간 쪽 머리 ★ 그대로 [FLOW_MARK · FLOW_NO_STAR · FLOW_NO_VSBAR]`, nx.ringBtn && !nx.voice && nx.cols === 0 && (w < 1000 || nx.lw <= 560) && !nx.word && !nx.star && !nx.vs && nx.vsMoment && nx.vsOpen && nx.starHead, JSON.stringify(nx));
  ok(`CF ${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★★[VID_AUTO_ONLY 2026-10-03 사장님 «서는 분 칩을 누르면 영상이 다시 자동 재생 · 다른 곳들도 체크» · «자동 재생되고 1회 재생되면 끝»]
   ② 장면 영상이 도는 길은 «그 쪽에 들어올 때 한 번»뿐 — 칩 · 줄 ▶ · 들어 보기 · 글 적기 · 진행 줄 접기 · 그림 누르기 · Enter 는 횟수를 늘리지 않는다 */
for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w, { stubPlay: true });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1500);
  const n = (f) => pg.evaluate((f) => window.__vplays.filter((p) => p.w === 'make' && p.f === f).length, f);
  const clickAll = async (sel) => { const els = await pg.$$(sel); for (const e of els) { if (await e.isVisible()) { await e.click(); await pg.waitForTimeout(250); } } return els.length; };
  await pg.evaluate(() => { window.__vplays = []; mkGo('candle'); }); await pg.waitForTimeout(500);
  const c0 = await n('candle.mp4');
  const used = {};
  used.chips = await clickAll('[data-fk^="lsc:candleWho:"]');
  used.line = await clickAll('.mk-pl'); await pg.evaluate(() => lsStop());
  used.play = await clickAll('[data-fk="mkplay"],[data-fk="mkvnowplay"]'); await pg.evaluate(() => lsStop());
  await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(200); await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(200);
  await pg.click('.mk-vid video', { force: true }).catch(() => {}); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const v = document.querySelector('.mk-vid video'); if (v) v.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); await pg.waitForTimeout(150);
  const ta = await pg.$('.mk-pg textarea'); if (ta) { await ta.type('가나다'); await pg.waitForTimeout(300); used.ta = 1; }
  const c1 = await n('candle.mp4');
  await pg.evaluate(() => { mkGo('entry'); }); await pg.waitForTimeout(500);
  const e0 = await n('entry.mp4');
  used.entryChips = await clickAll('[data-fk^="lsc:entry:"]'); await pg.evaluate(() => lsStop());
  const e1 = await n('entry.mp4');
  await pg.click('#prev'); await pg.waitForTimeout(500);
  const c2 = await n('candle.mp4');
  ok(`P-11 ${w} ② 화촉 — 들어올 때 한 번(${c0}) · 서는 분 칩 ${used.chips} · 줄 ▶ ${used.line} · 들어 보기 ${used.play} · 진행 줄 접기 · 그림 누르기 · Enter · 글 적기 ${used.ta ? 1 : 0} 뒤에도 ${c1} [VID_AUTO_ONLY]`, c0 === 1 && c1 === 1 && used.chips >= 2 && used.line >= 1, JSON.stringify({ c0, c1, used }));
  ok(`P-12 ${w} ② 입장 — 들어올 때 한 번(${e0}) · 입장 멘트 칩 ${used.entryChips} 뒤에도 ${e1} · «이전»으로 화촉에 다시 들어오면 새로 한 번(${c2})`, e0 === 1 && e1 === 1 && used.entryChips >= 2 && c2 === 2, JSON.stringify({ e0, e1, c2 }));
  /* 글 적기 · 들어 보기가 있는 쪽(서약 · 첫인사)에서도 */
  const more = {};
  for (const k of ['vow', 'welcome', 'ring']) {
    await pg.evaluate((k) => { mkGo(k); }, k); await pg.waitForTimeout(500);
    const f = await pg.evaluate(() => (document.querySelector('.mk-vid video') || {}).getAttribute ? document.querySelector('.mk-vid video').getAttribute('src').split('/').pop() : '');
    const a0 = await n(f); const u = { play: await clickAll('[data-fk="mkplay"],[data-fk="mkvnowplay"]') }; await pg.evaluate(() => lsStop());
    const tas = await pg.$$('.mk-pg textarea'); u.ta = 0; for (const t of tas) { if (await t.isVisible()) { await t.type('가나'); u.ta++; await pg.waitForTimeout(200); } }
    u.line = await clickAll('.mk-pl'); await pg.evaluate(() => lsStop());
    more[k] = { a0, a1: await n(f), ...u };
  }
  ok(`P-13 ${w} ② 서약 · 첫인사 · 반지 — 글 적기 · 들어 보기 · 줄 ▶ 뒤에도 한 번 그대로(${JSON.stringify(more)}) [VID_AUTO_ONLY]`, Object.values(more).every((x) => x.a0 === 1 && x.a1 === 1) && Object.values(more).some((x) => x.ta > 0) && Object.values(more).some((x) => x.play > 0), JSON.stringify(more));
  ok(`P ${w} VID_AUTO_ONLY pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★★[TOP_MENU 2026-10-03 사장님 «추천대로 개선해서 적용해 보자»] 머리 줄 = «⋯» · 저장 · 나가기 — 두 줄(안내 다시 보기 · 처음부터 다시 만들기)은 «⋯» 안 */
for (const [w, emb] of [[390, false], [390, true], [1280, true]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html${emb ? '?embed=1' : ''}`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1200);
  const row = await pg.evaluate(() => { const sl = document.getElementById('obExitSlot'), vis = [...sl.querySelectorAll(':scope > *, :scope > #obMoreWrap > .ob-more')].filter((e) => e.offsetParent && !e.closest('.ob-menu') && e.id !== 'obMoreWrap'), r = sl.getBoundingClientRect(), b = document.getElementById('obMore');
    return { ids: vis.map((e) => e.id || e.className), tops: [...new Set(vis.map((e) => Math.round(e.getBoundingClientRect().top)))].length, right: Math.round(r.right), vw: innerWidth, left: Math.round(Math.min(...vis.map((e) => e.getBoundingClientRect().left))), tap: Math.round(b.getBoundingClientRect().height), hp: b.getAttribute('aria-haspopup'), ex: b.getAttribute('aria-expanded'), menuHidden: document.getElementById('obMenu').hidden, guideVis: !!document.getElementById('obGuide').offsetParent }; });
  ok(`TM-1 ${w}${emb ? ' 마이페이지' : ''} 머리 줄 ${row.ids.join(' · ')} — 한 줄 · 화면 안 · «⋯» 44px · aria-haspopup=menu · 닫힌 채(두 줄 안 보임)`, row.tops === 1 && row.right <= row.vw && row.left >= 0 && row.tap >= 44 && row.hp === 'menu' && row.ex === 'false' && row.menuHidden && !row.guideVis && (!emb || (row.ids.includes('obSave') && row.ids.includes('obExit'))), JSON.stringify(row));
  await pg.click('[data-fk="obmore"]'); await pg.waitForTimeout(150);
  const m = await pg.evaluate(() => { const mn = document.getElementById('obMenu'), its = [...mn.querySelectorAll('[role="menuitem"]')], c = getComputedStyle(mn), b = mn.getBoundingClientRect();
    return { open: !mn.hidden, ex: document.getElementById('obMore').getAttribute('aria-expanded'), names: its.map((x) => x.textContent.trim()), focus: document.activeElement && document.activeElement.id, h: its.map((x) => Math.round(x.getBoundingClientRect().height)), full: its.every((x) => Math.abs(x.getBoundingClientRect().width - b.width + 2) <= 2), shadow: c.boxShadow, blur: c.backdropFilter || 'none', bg: c.backgroundColor, inView: b.left >= 0 && b.right <= innerWidth }; });
  ok(`TM-2 ${w} «⋯» 누르면 작은 창 — 제 이름 그대로(${m.names.join(' · ')}) · 줄 44px · 폭 가득 · 크림 바탕 · 그림자 · 흐림 없음 · 첫 줄로 초점 · 화면 안`, m.open && m.ex === 'true' && m.names.join('|') === '안내 다시 보기|처음부터 다시 만들기' && m.h.every((x) => x >= 44) && m.full && m.shadow === 'none' && m.blur === 'none' && m.bg === 'rgb(250, 250, 248)' && m.focus === 'obGuide' && m.inView, JSON.stringify(m));
  await pg.keyboard.press('ArrowDown'); const ad = await pg.evaluate(() => document.activeElement.id);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  const e = await pg.evaluate(() => ({ hidden: document.getElementById('obMenu').hidden, ex: document.getElementById('obMore').getAttribute('aria-expanded'), focus: document.activeElement.id, step: STEPS[idx].k }));
  ok(`TM-3 ${w} 화살표로 다음 줄(${ad}) · Esc — 창만 닫히고(빌더 나가기 아님) 초점은 «⋯»`, ad === 'obRestart' && e.hidden && e.ex === 'false' && e.focus === 'obMore' && e.step === 'listen', JSON.stringify(e));
  await pg.click('[data-fk="obmore"]'); await pg.waitForTimeout(150); await pg.mouse.click(Math.round(w / 2), 700); await pg.waitForTimeout(150);
  ok(`TM-4 ${w} 밖을 누르면 닫힌다`, await pg.evaluate(() => document.getElementById('obMenu').hidden && document.getElementById('obMore').getAttribute('aria-expanded') === 'false'));
  await pg.click('[data-fk="obmore"]'); await pg.waitForTimeout(150); await pg.click('[data-fk="obrestart"]'); await pg.waitForTimeout(400);
  const rs = await pg.evaluate(() => ({ ask: !!document.querySelector('.ord-ask'), t: (document.querySelector('.ord-ask') || {}).textContent || '', on: RitualOpen.picked(S).length }));
  await pg.click('.ord-ask button:has-text("취소")').catch(() => {}); await pg.waitForTimeout(300);
  const rs2 = await pg.evaluate(() => RitualOpen.picked(S).length);
  ok(`TM-5 ${w} «처음부터 다시 만들기» — 종전 확인 창 그대로(«고른 것을 모두 비울까요?») · 취소면 그대로`, rs.ask && /고른 것을 모두 비울까요/.test(rs.t) && rs.on > 0 && rs2 === rs.on, JSON.stringify({ ...rs, t: rs.t.slice(0, 40), rs2 }));
  await pg.click('[data-fk="obmore"]'); await pg.waitForTimeout(150); await pg.click('[data-fk="obguide"]'); await pg.waitForTimeout(500);
  ok(`TM-6 ${w} «안내 다시 보기» — 종전처럼 안내 첫 쪽으로`, await pg.evaluate(() => STEPS[idx].k === 'intro'));
  ok(`TM ${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
/* ★[VP_CHIP_SILENT 2026-10-03 사장님 «여기 눌렀을 때 음성이 재생되게 하지 말자»] «어떻게 준비할까요» 칩은 고르기만 — 소리 0 · 흐르던 소리는 멈춘다. 내용 칩(화촉 서는 분)은 종전대로 «칩 = 듣기» */
for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w, { stubPlay: true });
  await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await clickNext(pg); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { S.vsAsked = 1; S.vsChip = 1; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.upLive = true; S.on.prevideo = 1; opSync(); });
  const res = {};
  for (const [k, key] of [['guest', 'guestVoice'], ['prevideo', 'pvVoice'], ['entry', 'entryVoice']]) {
    await pg.evaluate((k) => { mkGo(k); render(); }, k); await pg.waitForTimeout(400);
    const ids = await pg.evaluate((key) => [...document.querySelectorAll(`[data-fk^="lsc:${key}:"]`)].map((b) => b.getAttribute('data-fk')), key);
    res[k] = { chips: ids.length, plays: 0, stopped: true };
    for (const id of ids) { await pg.evaluate(() => { lsPlay(LS.open); }); await pg.waitForTimeout(300); await pg.evaluate(() => { window.__aplays = []; });
      await pg.click(`[data-fk="${id}"]`); await pg.waitForTimeout(450);
      const r = await pg.evaluate(() => ({ n: (window.__aplays || []).length, q: LP.q.length })); res[k].plays += r.n; if (r.q) res[k].stopped = false; }
  }
  await pg.evaluate(() => { lsStop(); mkGo('candle'); render(); window.__aplays = []; }); await pg.waitForTimeout(400);
  const cw = await pg.evaluate(() => [...document.querySelectorAll('[data-fk^="lsc:candleWho:"]')].map((b) => b.getAttribute('data-fk')).find((f) => !document.querySelector(`[data-fk="${f}"]`).getAttribute('aria-checked') || document.querySelector(`[data-fk="${f}"]`).getAttribute('aria-checked') === 'false'));
  if (cw) { await pg.click(`[data-fk="${cw}"]`); await pg.waitForTimeout(700); }
  const candle = await pg.evaluate(() => (window.__aplays || []).length);
  ok(`VPS-1 ${w} «어떻게 준비할까요» 칩(하객 맞이 ${res.guest.chips} · 식전 영상 ${res.prevideo.chips} · 입장 ${res.entry.chips}) — 눌러도 소리 0 · 흐르던 소리는 멈춤 [VP_CHIP_SILENT → CHIP_NO_AUTOPLAY]`, Object.values(res).every((x) => x.chips >= 2 && x.plays === 0 && x.stopped), JSON.stringify(res));
  /* ★[CHIP_NO_AUTOPLAY 2026-10-03 사장님 «전부»] 종전 VPS-2 «내용 칩(화촉 서는 분)은 종전대로 누르면 들린다» → 내용 칩도 고르기만(소리 0) — 판정을 뒤집었다 */
  ok(`VPS-2 ${w} 내용 칩(화촉 서는 분)도 눌러도 소리 0 [CHIP_NO_AUTOPLAY]`, !!cw && candle === 0, JSON.stringify({ cw, candle }));
  ok(`VPS ${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : cant ? '\n결과 — 실패 0 · 재지 못한 줄 있음' : '\n결과 — 전부 통과');
process.exit(fail ? 1 : cant ? 2 : 0);
