#!/usr/bin/env node
/* ★★[ENTRY_MUSIC_1012 2026-10-12 사장님 «마이페이지 식순 입장 부분에 올려 보자 · 일단 전부 올려 · 지금 오픈 전이니깐»]
   진짜 식순 화면(order-preview.html) ② 입장 쪽 «입장 음악» 줄 — 1단계(두 분이 고른 곡 올리기 · 크게 올라오는 자리 · 직접 적기 · 안내 창)를 390 · 1280 에서 손가락처럼 누른다.
   1 줄 — 고르기 칸 맨 아래 · 이름표 «입장 음악» · 줄 끝 «올리기 안내 보기» · 빈 카드(설명 · «곡 파일 올리기» · MP3 · M4A)
   2 처음 «곡 파일 올리기» → 안내 창(빌더 창 #mkRecDlg · 단계 넷 · 아래 단추 «알겠어요» 하나 [GUIDE_OK]) · 창이 열린 동안 파일 창 없음 · «알겠어요» → 닫히고 그 단추로 초점
   3 올리기(시험 곡 · 150초 · 40초부터 크게) → 후보에 0:40 «추천» · 고름 · S.mu 저장(곡 · 자리) · 링크 한 줄 «맞추기 · 다른 곡 올리기 · 빼기» [UP_LINKS_ONE]
   4 자리 ▶ = 앞뒤 들어 보기(■ 로 바뀜 · 다시 누르면 멈춤 · aria-pressed true/false [PRESSED_BOOL])
   5 직접 적기 «105» → 1:05 · 맨 아래 줄 · 고름 · S.mu.typed 65 [HOOK_TYPE]
   6 적는 칸 = ▶ 알약과 같은 크기 · 같은 금빛 테 [OWN_PILL_SAME] · 가로 넘침 없음
   7 새로고침 → 이 기기에 둔 곡으로 다시 풀고 고른 자리(1:05) 그대로
   8 빼기 → S.mu 없음 · 빈 카드
   9 안내 창이 «음악과 함께 듣기»를 말한다(나레이션 판 = «멘트부터 입장까지») · 쪽 오류 없음
   ★★[ENTRY_SCENE_1012] 2단계 «음악과 함께 듣기»
   10 올리면 고르기 칸 바로 아래 장면 칸(16px) · 그래프 그림 · 알약 «음악과 함께 듣기 약 N초» · 계획 = 목소리 끝 + 0.3초가 고른 자리(곡은 그만큼 앞에서 · 목소리보다 4초 먼저)
   11 누르면 그 자리에서 목소리 · 곡이 함께 · «멈추기» · aria-pressed true · 장면 줄 «기다려요» 칸이 진하게
   12 다시 누르면 그 자리에 멈춤 «이어 듣기»(초점 그대로) → 누르면 멈춘 자리부터
   13 그래프를 누르면 그 자리부터(문이 열린 뒤 = «걸어 들어와요» 칸)
   14 소리 하나 — 자리 ▶ 를 누르면 장면은 멈추고(이어 듣기) · 빌더가 제 소리를 틀어도(_stopMk) 멈춘다
   15 자리를 바꾸면(직접 적기 1:05) 멈춘 자리를 걷고 새 자리로 다시 짠다
   16 새로고침 뒤에도 장면 칸이 다시 선다(이 기기에 둔 곡)
   17 두 분 AI 목소리를 아직 안 만들었으면 — 그래프 없이 흐린 알약(aria-disabled) · 눌러도 틀지 않고 빌더 알림
   18 빼기 → 장면 칸도 없어진다
   시험 곡은 여기서 만든다(저작권 없는 합성음 · 저장소에 음원을 두지 않는다).  종료 코드 0 통과 · 1 실패 · 2 재지 못함
   EM_OP · EM_MOD = 돌연변이 확인용 — 그 판의 order-preview · entry-music.js 로 잰다 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.EM_OP || '', MOD = process.env.EM_MOD || '';   // 돌연변이 확인용 — 그 판의 order-preview · entry-music.js 로 잰다
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : (MOD && u === '/assets/entry-music.js') ? MOD : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 시험 곡 — 150초 · 0~40초 작게 · 40초부터 크게(0.5초 박) · WAV 16bit 22050Hz 모노 */
function testSong() { const sr = 22050, n = sr * 150, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= 40 ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05; const v = a * (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  const f = path.join(os.tmpdir(), 'entry-music-test-song.wav'); fs.writeFileSync(f, b); return f; }
const SONG = testSong();
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
try {
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
    let fileWins = 0; pg.on('filechooser', () => { fileWins++; });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
    await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500); await clickNext(pg); await pg.waitForTimeout(1500);
    await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(800);
    const vp = await pg.evaluate(() => !!document.querySelector('[data-fk="lsc:entryVoice:nar"]'));
    if (vp) { await pg.click('[data-fk="lsc:entryVoice:nar"]'); await pg.waitForTimeout(600); }
    // 1
    const R1 = await pg.evaluate(() => { const r = document.querySelector('.mk-pick .ls-vars > .ls-mu'), last = r && r === r.parentElement.lastElementChild; return { row: !!r, last, gl: r && (r.querySelector('.gl') || {}).textContent, link: r && (r.querySelector('.cg-links [data-fk="muguide"]') || {}).textContent, cs: r && (r.querySelector('.mu-cs') || {}).textContent, go: r && (r.querySelector('[data-fk="muupopen"]') || {}).textContent, hint: r && (r.querySelector('.mu-uphint') || {}).textContent, input: document.querySelectorAll('body > #muUpFile').length, acc: (document.getElementById('muUpFile') || {}).accept }; });
    ok(`${W} 1 입장 음악 줄 — 고르기 칸 맨 아래 · 이름표 · 줄 끝 «올리기 안내 보기» · 빈 카드 · 파일 칸은 화면 밖 하나(확장자만)`, R1.row && R1.last && R1.gl === '입장 음악' && R1.link === '올리기 안내 보기' && /크게 올라오는 자리를 찾아/.test(R1.cs || '') && /곡 파일 올리기/.test(R1.go || '') && R1.hint === 'MP3 · M4A' && R1.input === 1 && R1.acc === '.mp3,.m4a,.aac,.wav,.flac', R1);
    // 2
    await pg.click('[data-fk="muupopen"]'); await pg.waitForTimeout(500);
    const R2 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { open: !!d, t: d && (d.querySelector('#mkDlgT') || {}).textContent, steps: d ? [...d.querySelectorAll('.mk-rd-steps p > b')].map((b) => b.textContent).join('|') : '', btns: d ? [...d.querySelectorAll('.mk-dlg-go')].map((b) => b.textContent).join('|') : '', focus: document.activeElement && document.activeElement.getAttribute('data-fk'), scene: !!(d && /음악과 함께 듣기/.test(d.textContent)), nar: !!(d && /멘트부터 입장까지/.test(d.textContent) && /입장!»?이 끝나는 순간/.test(d.textContent)), seen: (S.tipSeen || {}).mu }; });
    ok(`${W} 2 처음 «곡 파일 올리기» → 안내 창(빌더 창 · 단계 넷 · 아래 단추 «알겠어요» 하나 [GUIDE_OK]) · 파일 창 없음`, R2.open && R2.t === '내 곡을 올리면 이렇게 돼요' && R2.steps === '곡 파일을 올려요|크게 올라오는 자리를 찾아 드려요|들어 보고 골라요|원하는 자리가 없으면 직접 적어요' && R2.btns === '알겠어요' && R2.focus === 'muguideok' && R2.seen === 1 && fileWins === 0, { ...R2, fileWins });
    ok(`${W} 9 안내 창이 «음악과 함께 듣기»를 말한다 · 나레이션 판은 «멘트부터 입장까지»`, R2.scene === true && R2.nar === true, R2);
    await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(400);
    const R2b = await pg.evaluate(() => ({ open: !!document.getElementById('mkRecDlg'), focus: document.activeElement && document.activeElement.getAttribute('data-fk') }));
    ok(`${W} 2b «알겠어요» → 창만 닫힘 · 파일 창 없음 · 초점은 «곡 파일 올리기»`, !R2b.open && R2b.focus === 'muupopen' && fileWins === 0, { ...R2b, fileWins });
    const fc = pg.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null); await pg.click('[data-fk="muupopen"]'); const ch = await fc;
    ok(`${W} 2c 두 번째 «곡 파일 올리기» → 바로 파일 창`, !!ch, { ch: !!ch });
    // 3
    if (ch) await ch.setFiles(SONG); else await pg.setInputFiles('#muUpFile', SONG);
    await pg.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 }); await pg.waitForTimeout(300);
    const R3 = await pg.evaluate(() => { const u = EntryMusic._t.ups(); return { rec: u.cands.filter((c) => c.rec).map((c) => c.t), pick: u.pick, mu: S.mu, on: [...document.querySelectorAll('.ls-mu .mu-hks .mu-row.on .mu-t')].map((x) => x.textContent).join(), note: (document.querySelector('.ls-mu .mu-hks .mu-row.on .mu-a') || {}).textContent, links: [...document.querySelectorAll('.ls-mu .mu-upft button')].map((b) => b.textContent).join('|'), ly: (() => { const bs = [...document.querySelectorAll('.ls-mu .mu-upft button')].map((b) => Math.round(b.getBoundingClientRect().top)); return Math.max(...bs) - Math.min(...bs); })() }; });
    ok(`${W} 3 올리기 → 0:40 «추천» 고름 · S.mu(곡 · 자리) · 링크 한 줄 «맞추기 · 다른 곡 올리기 · 빼기» [UP_LINKS_ONE]`, R3.rec.length === 1 && Math.abs(R3.rec[0] - 40) < 0.3 && R3.on === '0:40' && /^추천 · /.test(R3.note || '') && R3.mu && R3.mu.src === 'up' && Math.abs(R3.mu.hook - 40) < 0.3 && R3.mu.dur === 150 && R3.links === '맞추기|다른 곡 올리기|빼기' && R3.ly <= 1, R3);
    // 10 — 음악과 함께 듣기
    await pg.waitForFunction(() => EntryMusic._t.scene().plan, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(300);
    const scene = () => pg.evaluate(() => { const b = document.querySelector('.em-scene [data-fk="emscene"]'), s = EntryMusic._t.scene(), sc = document.querySelector('.em-scene .lg-scene'); return Object.assign(s, { pill: b ? b.textContent.replace(/\s+/g, ' ').trim() : null, pressed: b && b.getAttribute('aria-pressed'), off: !!(b && b.classList.contains('off')), dis: b && b.getAttribute('aria-disabled'), at: sc && sc.getAttribute('data-at'), focus: document.activeElement && document.activeElement.getAttribute('data-fk'), graph: !!document.querySelector('.em-scene .em-graph'), has: !!document.querySelector('.em-scene') }); });
    const S10 = await pg.evaluate(() => { const sc = document.querySelector('.em-scene'), mu = document.querySelector('.ls-mu'), pick = mu && mu.closest('.mk-pick'), cv = sc && sc.querySelector('.em-graph canvas'); let ink = 0; if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++; }
      const b = sc && sc.querySelector('[data-fk="emscene"]'), s = EntryMusic._t.scene(); return { after: !!(sc && pick && pick.nextElementSibling === sc), gap: sc && mu ? Math.round(sc.getBoundingClientRect().top - mu.getBoundingClientRect().bottom) : null, ink, pill: b && b.textContent.replace(/\s+/g, ' ').trim(), pressed: b && b.getAttribute('aria-pressed'), plan: s.plan, pieces: s.pieces, scn: (sc && sc.querySelector('.lg-scene').textContent) || '', lbl: (sc && sc.querySelector('.em-graph').getAttribute('aria-label')) || '', over: document.documentElement.scrollWidth > innerWidth }; });
    const P = S10.plan || {};
    ok(`${W} 10 올리면 고르기 칸 바로 아래 장면(16px) · 그래프 · 알약 «음악과 함께 듣기 약 N초» · 목소리 끝 + 0.3초 = 고른 자리 · 곡이 목소리보다 4초 먼저`, S10.after && S10.gap === 16 && S10.ink > 500 && S10.pressed === 'false' && /^음악과 함께 듣기 약 (\d+분 )?\d+초$/.test(S10.pill || '') && S10.plan && Math.abs(P.th - (P.tv + P.V + 0.3)) < 0.01 && Math.abs(P.H - 40) < 0.3 && P.tm === 0 && P.tv === 4 && Math.abs(P.off - (P.H - P.V - 0.3 - 4)) < 0.01 && S10.pieces >= 3 && /문\s앞에서\s기다려요/.test(S10.scn) && /도착/.test(S10.scn) && /«입장!»이 끝나면/.test(S10.lbl) && !S10.over, S10);
    // 11
    await pg.click('[data-fk="emscene"]'); await pg.waitForTimeout(1800);
    const S11 = await scene();
    ok(`${W} 11 누르면 그 자리에서 목소리 · 곡이 함께 · «멈추기» · aria-pressed true · 장면 줄 «기다려요» 칸이 진하게`, S11.run && S11.x > 0.8 && S11.pill === '멈추기' && S11.pressed === 'true' && S11.at === 'greet', S11);
    // 12
    await pg.click('[data-fk="emscene"]'); await pg.waitForTimeout(300); const S12a = await scene();
    await pg.click('[data-fk="emscene"]'); await pg.waitForTimeout(600); const S12b = await scene();
    ok(`${W} 12 다시 누르면 그 자리에 멈춤 «이어 듣기»(초점 그대로) → 누르면 멈춘 자리부터`, !S12a.run && S12a.pause > 0.8 && S12a.pill === '이어 듣기' && S12a.focus === 'emscene' && S12b.run && S12b.x >= S12a.pause - 0.05 && S12b.x < S12a.pause + 1.5, { S12a, S12b });
    // 13
    const gbox = await pg.evaluate(() => { const r = document.querySelector('.em-graph canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await pg.mouse.click(gbox.x + gbox.w * ((P.th + 1) / P.tend), gbox.y + gbox.h / 2); await pg.waitForTimeout(500); const S13 = await scene();
    ok(`${W} 13 그래프를 누르면 그 자리부터 — 문이 열린 뒤 = «걸어 들어와요» 칸`, S13.run && Math.abs(S13.x - (P.th + 1)) < 1.2 && S13.at === 'walk', S13);
    // 14
    await pg.click('[data-fk="muhkp:0"]'); await pg.waitForTimeout(250); const S14a = Object.assign(await scene(), { prev: await pg.evaluate(() => EntryMusic._t.prev()) });
    await pg.click('[data-fk="muhkp:0"]'); await pg.waitForTimeout(150); await pg.click('[data-fk="emscene"]'); await pg.waitForTimeout(500);
    await pg.evaluate(() => _stopMk()); await pg.waitForTimeout(150); const S14b = await scene();
    ok(`${W} 14 소리 하나 — 자리 ▶ 를 누르면 장면은 멈추고(이어 듣기) · 빌더가 제 소리를 틀어도(_stopMk) 멈춘다`, S14a.prev === 'up#0' && !S14a.run && S14a.pause > 0 && S14a.pill === '이어 듣기' && !S14b.run && S14b.pause > 0 && S14b.pill === '이어 듣기', { S14a, S14b });
    // 4
    await pg.click('[data-fk="muhkp:0"]'); await pg.waitForTimeout(250);
    const R4a = await pg.evaluate(() => ({ prev: EntryMusic._t.prev(), p: document.querySelector('[data-fk="muhkp:0"]').getAttribute('aria-pressed'), song: document.querySelector('[data-fk="muprev"]').getAttribute('aria-pressed') }));
    await pg.click('[data-fk="muhkp:0"]'); await pg.waitForTimeout(200);
    const R4b = await pg.evaluate(() => ({ prev: EntryMusic._t.prev(), p: document.querySelector('[data-fk="muhkp:0"]').getAttribute('aria-pressed') }));
    ok(`${W} 4 자리 ▶ = 앞뒤 들어 보기 → ■ · 다시 누르면 멈춤 · aria-pressed true/false [PRESSED_BOOL]`, R4a.prev === 'up#0' && R4a.p === 'true' && R4a.song === 'false' && R4b.prev === null && R4b.p === 'false', { R4a, R4b });
    // 5
    await pg.fill('#muOwn', '105'); await pg.click('[data-fk="muownset"]'); await pg.waitForTimeout(400);
    const R5 = await pg.evaluate(() => { const rows = [...document.querySelectorAll('.ls-mu .mu-hks .mu-row')]; return { last: rows.length && rows[rows.length - 1].querySelector('.mu-t').textContent, on: [...document.querySelectorAll('.ls-mu .mu-hks .mu-row.on .mu-t')].map((x) => x.textContent).join(), mu: S.mu, val: document.getElementById('muOwn').value }; });
    ok(`${W} 5 직접 적기 105 → 1:05 · 맨 아래 줄 · 고름 · S.mu.typed 65 [HOOK_TYPE]`, R5.last === '1:05' && R5.on === '1:05' && R5.mu.typed === 65 && R5.mu.hook >= 64.75 && R5.mu.hook <= 66 && R5.val === '1:05', R5);
    const S15 = await scene();
    ok(`${W} 15 자리를 바꾸면(1:05) 멈춘 자리를 걷고 새 자리로 다시 짠다 — «음악과 함께 듣기 약 N초»`, !S15.run && S15.pause === null && S15.plan && Math.abs(S15.plan.H - R5.mu.hook) < 0.01 && /^음악과 함께 듣기 약 /.test(S15.pill || ''), S15);
    // 6
    const R6 = await pg.evaluate(() => { const pl = document.querySelector('.ls-mu .mu-hks .mu-row .mu-pl'), b = pl.getBoundingClientRect(), cs = getComputedStyle(pl, '::before'), inp = document.getElementById('muOwn'), ib = inp.getBoundingClientRect();
      return { pw: Math.round(b.width - parseFloat(cs.left) - parseFloat(cs.right)), ph: Math.round(b.height - parseFloat(cs.top) - parseFloat(cs.bottom)), iw: Math.round(ib.width), ih: Math.round(ib.height), dx: Math.round(ib.left - b.left), pbd: (/rgb\([^)]*\)/.exec(cs.boxShadow) || [''])[0], ibd: getComputedStyle(inp).borderTopColor, fs: getComputedStyle(inp).fontSize, over: document.documentElement.scrollWidth > innerWidth }; });
    ok(`${W} 6 적는 칸 = ▶ 알약과 같은 크기 · 같은 금빛 테 · 16px [OWN_PILL_SAME] · 가로 넘침 없음`, R6.iw === R6.pw && R6.ih === R6.ph && R6.dx === 0 && R6.ibd === R6.pbd && R6.fs === '16px' && !R6.over, R6);
    // 7
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1200);
    const at = await pg.evaluate(() => _mkState().at); if (at !== 'entry') { await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') idx = i; mkGo('entry'); }); await pg.waitForTimeout(800); }
    await pg.waitForFunction(() => window.EntryMusic && EntryMusic._t.restore() === 2, null, { timeout: 30000 }).catch(() => {}); await pg.waitForTimeout(500);
    const R7 = await pg.evaluate(() => { const u = EntryMusic._t.ups(); return { ok: !!(u && u.Sg), on: [...document.querySelectorAll('.ls-mu .mu-hks .mu-row.on .mu-t')].map((x) => x.textContent).join(), val: (document.getElementById('muOwn') || {}).value, mu: S.mu }; });
    ok(`${W} 7 새로고침 → 이 기기에 둔 곡으로 다시 풀고 고른 자리(1:05) 그대로`, R7.ok && R7.on === '1:05' && R7.val === '1:05' && R7.mu && R7.mu.typed === 65, R7);
    await pg.waitForFunction(() => EntryMusic._t.scene().plan, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(300); const S16 = await scene();
    ok(`${W} 16 새로고침 뒤에도 장면 칸이 다시 선다(이 기기에 둔 곡 · 1:05)`, S16.has && S16.graph && S16.plan && Math.abs(S16.plan.H - R7.mu.hook) < 0.06 && /^음악과 함께 듣기 약 /.test(S16.pill || ''), S16);
    // 17 — 두 분 AI 목소리를 아직 안 만들었을 때
    await pg.evaluate(() => { RitualOpen.FEATURE = RitualOpen.FEATURE || {}; RitualOpen.FEATURE.voiceClone = true; render(); }); await pg.waitForTimeout(400);
    const aiChip = await pg.evaluate(() => !!document.querySelector('[data-fk="lsc:entryVoice:ai"]'));
    if (aiChip) { await pg.click('[data-fk="lsc:entryVoice:ai"]'); await pg.waitForTimeout(700); for (let i = 0; i < 3; i++) { if (await pg.evaluate(() => !!document.getElementById('mkRecDlg'))) { await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(400); } } }
    const S17a = await scene(); await pg.click('[data-fk="emscene"]', { force: true }); await pg.waitForTimeout(500);
    const S17b = Object.assign(await scene(), { toast: await pg.evaluate(() => { const t = document.getElementById('lsToast'); return t && !t.hidden ? t.textContent : ''; }) });
    ok(`${W} 17 두 분 AI 목소리를 아직 안 만들었으면 — 그래프 없이 흐린 알약 · 눌러도 틀지 않고 빌더 알림`, aiChip && S17a.has && !S17a.graph && S17a.off && S17a.dis === 'true' && !S17b.run && !S17b.pend && !!S17b.toast, { aiChip, S17a, S17b });
    // 8
    await pg.click('[data-fk="muupdel"]'); await pg.waitForTimeout(400);
    const R8 = await pg.evaluate(() => ({ mu: S.mu || null, empty: !!document.querySelector('.ls-mu [data-fk="muupopen"]'), rows: document.querySelectorAll('.ls-mu .mu-row').length }));
    ok(`${W} 8 빼기 → S.mu 없음 · 빈 카드`, R8.mu === null && R8.empty && R8.rows === 0, R8);
    ok(`${W} 18 빼기 → 장면 칸도 없어진다`, !(await pg.evaluate(() => !!document.querySelector('.em-scene'))), {});
    ok(`${W} 9b 쪽 오류 없음`, errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { console.log('FAIL 잴 수 없었다 — ' + (e && e.message)); fail++; }
await br.close(); srv.close();
console.log(fail ? `entry-music: FAIL ${fail}` : 'entry-music: ok'); process.exit(fail ? 1 : 0);
