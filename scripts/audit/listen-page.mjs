// [LISTEN_PAGE 2026-09-25 코워크 회신 4-7] ② 보고 듣기 · ① 장면 영상 — 받아들일 기준을 실브라우저로 잰다.
//
//   node scripts/audit/listen-page.mjs          # 390 · 1280 둘 다
//
// 보는 것(명세 4-7 그대로)
//   ① pageerror 0 · 서버 호출 0(글꼴 밖) · 가로 넘침 0 — 390 · 1280
//   ② 네 걸음(고르기 · 보고 듣기 · 글 적기 · 완성) · 새 코스 STEPS = intro,intro2,pick,listen,write,done
//   ③ 자동 재생: ① 은 소리 없는 영상만 · 동시에 하나 · 누르면 멈춤 / ② 는 누른 뒤에만 소리
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
const toPick = async (pg) => { await pg.click('#next'); await pg.waitForTimeout(400); await pg.click('#next'); await pg.waitForTimeout(500); };

for (const w of [390, 1280]) {
  const { ctx, pg, errs, ext } = await open(w);
  await toPick(pg);
  ok(`${w} 새 코스 STEPS = 네 걸음`, (await pg.evaluate(() => STEPS.map((s) => s.k).join(','))) === 'intro,intro2,pick,listen,write,done');
  ok(`${w} ① 에 걸음 표시(① 고르기가 지금)`, await pg.evaluate(() => { const o = document.querySelector('.op-steps li.on'); return !!o && /고르기/.test(o.textContent); }));
  ok(`${w} ① 카드에 판 칩이 없다(② 로 옮김)`, await pg.evaluate(() => document.querySelectorAll('.op-card .op-chip').length === 0));
  ok(`${w} ① 카드마다 장면 자리`, await pg.evaluate(() => [...document.querySelectorAll('.op-card')].every((c) => c.querySelector('.lv'))));
  ok(`${w} ① 빈 채엔 아래 요약이 없다`, await pg.evaluate(() => !document.getElementById('opCta')));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  ok(`${w} ① 담으면 아래 «담은 순간 · 본식»`, await pg.evaluate(() => /담은 순간 \d+ · 본식 약 \d+~\d+분/.test((document.getElementById('opCta') || {}).textContent || '')));
  ok(`${w} ① 고른 것 한 줄(«보고 듣기»에서 바꿔요)`, await pg.evaluate(() => /고른 것 · .+«보고 듣기»에서/.test(document.getElementById('stage').textContent)));
  ok(`${w} ① 고객 화면에 «판» 없음`, await pg.evaluate(() => !/판 바꿈|고를 수 있는 판|그 판으로/.test(document.getElementById('stage').textContent)));
  await pg.click('#next'); await pg.waitForTimeout(1500);
  ok(`${w} ② 제목 · 걸음 표시`, await pg.evaluate(() => document.getElementById('stepHead').textContent === '보고 듣기' && /보고 듣기/.test(document.querySelector('.op-steps li.on').textContent)));
  const rows = await pg.evaluate(() => [...document.querySelectorAll('.ls-rows .ls-row')].map((r) => r.dataset.lk));
  ok(`${w} ② 줄 = 하객 맞이 · 식전 영상 · 담은 순간 · 닫는 인사`, rows[0] === 'guest' && rows[1] === 'prevideo' && rows[rows.length - 1] === '_close', rows.join(','));
  ok(`${w} ② 들어가자마자 소리 없음(자동 재생 없음)`, await pg.evaluate(() => !LP.q.length && (!LP.el || LP.el.paused)));
  // ⑤ 키보드로 줄 열기
  await pg.focus('[data-fk="lsm:candle"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(400);
  ok(`${w} ② 키보드 Enter 로 줄이 열린다`, await pg.evaluate(() => LS.open === 'candle' && !!document.querySelector('.ls-row.open .ls-flow')));
  ok(`${w} ② 녹음 전 줄은 «녹음 준비 중»(화촉 여는 말)`, await pg.evaluate(() => /녹음 준비 중/.test(document.querySelector('.ls-row.open .ls-flow').textContent)));
  // ⑦ 칩 → 바로 재생
  await pg.click('[data-fk="lsc:candleWho:parents"]'); await pg.waitForTimeout(500);
  ok(`${w} ② 칩을 누르면 값이 바뀌고 그 순간이 바로 들린다`, await pg.evaluate(() => S.candleWho === 'parents' && LP.q.length > 0 && LP.cur === 'candle'));
  ok(`${w} ② 녹음 전 줄은 소리 없이 글로(src 없음 · 글 있음)`, await pg.evaluate(() => { const st = LP.q[0]; return !!st && st.pending && !st.src && st.txt.length > 10; }));
  ok(`${w} ② 재생 중 작은 플레이어`, await pg.evaluate(() => getComputedStyle(document.getElementById('lsMini')).display === 'flex'));
  await pg.evaluate(() => lsStop());
  // 크게 보기 · Esc
  await pg.click('.ls-hero'); await pg.waitForTimeout(700);
  ok(`${w} ② «처음부터 보고 듣기» → 크게 보기 · 자막`, await pg.evaluate(() => { const f = document.getElementById('lsFull'); return !f.hidden && /1 \/ \d+/.test(f.textContent) && f.querySelector('.lf-txt').textContent.length > 10; }));
  ok(`${w} ② 크게 보기의 자막 = 엔진 큐 문안`, await pg.evaluate(() => { const st = LP.q[LP.i]; return st && document.querySelector('.lf-txt').textContent === st.txt; }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  ok(`${w} ② Esc 로 크게 보기가 닫힌다`, await pg.evaluate(() => document.getElementById('lsFull').hidden));
  await pg.evaluate(() => lsStop());
  // ⑦ 빼기 · 넣기 한 줄 안내
  await pg.click('[data-fk="lsm:bless"]'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsr:bless"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 빼기 안내(«부모님 덕담»을 뺐어요)`, await pg.evaluate(() => /«부모님 덕담»을 뺐어요/.test(document.querySelector('.ls-msg').textContent) && !RitualOpen.onOf(S, 'bless')));
  await pg.click('.ls-off summary'); await pg.waitForTimeout(300); await pg.click('[data-fk="lsa:bless"]'); await pg.waitForTimeout(400);
  ok(`${w} ② 넣기 안내(n번째에 넣었어요)`, await pg.evaluate(() => /«부모님 덕담»을 \d+번째에 넣었어요/.test(document.querySelector('.ls-msg').textContent) && RitualOpen.onOf(S, 'bless')));
  ok(`${w} ② 준비한 순서는 «넣지 않은 순간»에 없다`, await pg.evaluate(() => !document.querySelector('.ls-off [data-lk="free"]')));
  ok(`${w} ② 가로 넘침 0`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await pg.click('#next'); await pg.waitForTimeout(600);
  ok(`${w} ③ 글 적기 — 보낼 것 · 식전 영상 링크 · 도와주실 분`, await pg.evaluate(() => { const t = document.getElementById('stage').textContent; return /보낼 것/.test(t) && !!document.querySelector('input[aria-label="식전 영상 링크"]') && /도와주실 분/.test(t); }));
  await pg.click('#next'); await pg.waitForTimeout(600);
  ok(`${w} ④ 듣기 단추 하나 = «처음부터 끝까지 보기»`, await pg.evaluate(() => { const b = [...document.querySelectorAll('.play-acts .rehearse-btn')]; return b.length === 1 && b[0].textContent === '처음부터 끝까지 보기'; }));
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  ok(`${w} 서버 호출 0`, ext.length === 0, [...new Set(ext)].join(' '));
  await ctx.close();
}

// ③ · ④ 장면 영상(시험 영상 두 편을 «들어온 것처럼»)
if (!TV) { console.log('못 쟀다 — ffmpeg 없음(① 자동 재생 두 줄)'); cant++; }
else {
  for (const reduce of [false, true]) {
    const { ctx, pg, errs } = await open(390, { videos: ['candle', 'vow'], reduce });
    await toPick(pg); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelector('#opc_candle .lv').scrollIntoView({ block: 'center' })); await pg.waitForTimeout(1200);
    const st = await pg.evaluate(() => [...document.querySelectorAll('.op-card video')].map((v) => ({ k: v.parentNode.dataset.vk, playing: !v.paused, muted: v.muted })));
    if (!reduce) {
      ok('① 영상은 모두 소리 없음(muted)', st.length === 2 && st.every((v) => v.muted), JSON.stringify(st));
      ok('① 가운데 온 카드 하나만 돈다', st.filter((v) => v.playing).length === 1 && st.find((v) => v.k === 'candle').playing, JSON.stringify(st));
      await pg.click('#opc_candle .lv'); await pg.waitForTimeout(300);
      ok('① 누르면 멈춘다', await pg.evaluate(() => document.querySelector('#opc_candle video').paused));
      await pg.evaluate(() => window.scrollBy(0, 1)); await pg.waitForTimeout(500);
      ok('① 멈춘 카드는 스크롤해도 다시 돌지 않는다', await pg.evaluate(() => document.querySelector('#opc_candle video').paused));
    } else {
      ok('④ 움직임 줄이기에서 자동 재생 0', st.every((v) => !v.playing), JSON.stringify(st));
    }
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
