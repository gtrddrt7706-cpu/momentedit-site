#!/usr/bin/env node
/* ★★[UP_FILE_HOWTO_1128 · UP_KEEP_LINE_1128 · WALK_WHY_1128 · MU_FILE_NAME_1128 · INAPP_FILE_1128 2026-11-28 대표님 «추천대로»(입장곡 가사 빼기 방 작은 일)]
   진짜 식순 화면(order-preview.html) ② 입장 «입장 음악» — 곡 올리기 칸 작은 일 다섯을 손가락처럼 누른다.
   A 안내 창 1번 = 파일 구하는 법(카톡 · 드라이브는 저장부터 · 아이폰은 ‹파일에 저장› · 음악 앱 곡은 안 됨) · 요약 = «올린 곡은 스튜디오가 당일 진행에만 쓰고, 예식 뒤 30일에 지워요.»
   B 안드로이드 카톡 앱 안 → «곡 파일 올리기» = 앱 안 안내 창(곡 파일 제목 · 브라우저로 열기 · 주소 복사 · 여기서 해 볼게요) · 파일 창 없음 → «여기서 해 볼게요» → 파일 창 → 다음엔 바로 파일 창 · 녹음 쪽 허락(ok)은 그대로
   C 안드로이드 인스타 앱 안 → 같은 창 · 단추 «크롬으로 열기» / 아이폰 카톡 · PC → 창 없이 바로 파일 창
   D 걷는 중에 끝나는 자리(직접 적기 2:10) → «걷는 중에 곡이 끝나요 · 커진 뒤 N초만 남아요» · N = 곡 길이 − 그 자리(내림)
   E 스튜디오로 보내는 이름 = 곡 제목 - 가수 + 원래 확장자(꼬리표가 없으면 파일 이름) — 입장 초는 넣지 않는다
   시험 곡은 여기서 만든다(합성음 · 저장소에 음원을 두지 않는다 · 임시 파일 이름은 영문 — 이 환경의 파일 넣기가 한글 경로를 못 읽는다 · 화면은 한글 이름 곡도 푼다). 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
function testSong() { const sr = 22050, n = sr * 150, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= 40 ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05; const v = a * (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  const f = path.join(os.tmpdir(), 'entry-upload-test-AUD-0001.wav'); fs.writeFileSync(f, b); return f; }
const SONG = testSong();
const UA = {
  galaxyKakao: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36;KAKAOTALK 2410710',
  galaxyInsta: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Instagram 309.0.0.40.113 Android',
  iphoneKakao: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5',
  pc: ''
};
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
async function open(W, ua) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000, ...(ua ? { userAgent: ua } : {}) }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500); await clickNext(pg); await pg.waitForTimeout(1500);
  await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(800);
  return { ctx, pg, errs };
}
const guideText = (pg) => pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return d ? { s1: (d.querySelector('.mk-rd-steps li p') || {}).textContent || '', sum: (d.querySelector('.mk-rd-sum') || {}).textContent || '' } : null; });
const panel = (pg) => pg.evaluate(() => { const d = document.getElementById('mkInApp'); return d ? { t: (d.querySelector('#mkInAppT') || {}).textContent, btns: [...d.querySelectorAll('button')].map((b) => b.textContent).join('|') } : null; });
const pick = async (pg, fk) => { const fc = pg.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null); await pg.click(`[data-fk="${fk || 'muupopen'}"]`); return fc; };
try {
  // A · B · D · E — 갤럭시 카톡 앱 안(390)
  { const { ctx, pg, errs } = await open(390, UA.galaxyKakao);
    await pg.click('[data-fk="musrc:up"]'); await pg.waitForTimeout(500);
    const G = await guideText(pg);
    ok('A 안내 창 1번 = 파일 구하는 법(안드로이드: 휴대폰에 저장 · 음악 앱 곡은 안 됨) [UP_FILE_HOWTO_1128]', !!G && /카톡\u00a0·\u00a0드라이브로 받은 곡은 먼저 휴대폰에 저장해 주세요\u00a0· 음악 앱 안의 곡은 올릴 수 없어요/.test(G.s1) && !/‹파일에 저장›/.test(G.s1), G);
    ok('A 안내 창 요약 = «올린 곡은 스튜디오가 당일 진행에만 쓰고, 예식 뒤 30일에 지워요.» [UP_KEEP_LINE_1128]', !!G && /올린 곡은 스튜디오가 당일 진행에만 쓰고, 예식 뒤 30일에 지워요\./.test(G.sum) && !/—/.test(G.s1 + G.sum), G);
    await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(400);
    let ch = await pick(pg); await pg.waitForTimeout(300); const P1 = await panel(pg);
    ok('B 갤럭시 카톡 앱 안 «곡 파일 올리기» → 앱 안 안내 창(곡 파일 제목 · 브라우저로 열기 · 주소 복사 · 여기서 해 볼게요) · 파일 창 없음 [INAPP_FILE_1128]', !ch && !!P1 && P1.t === '이 앱 안에서는 곡 파일을 못 고를 수 있어요' && /^브라우저로 열기\|주소 복사\|여기서 해 볼게요/.test(P1.btns), { ch: !!ch, P1 });
    const fc = pg.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null); await pg.click('#mkInApp [data-fk="inapphere"]'); ch = await fc;
    const st = await pg.evaluate(() => ({ gone: !document.getElementById('mkInApp'), okFile: INAPP_MIC.okFile, okMic: INAPP_MIC.ok }));
    ok('B «여기서 해 볼게요» → 창이 닫히고 파일 창 · 파일 쪽만 기억(녹음 쪽 허락은 그대로)', !!ch && st.gone && st.okFile === true && st.okMic === false, { ch: !!ch, st });
    if (ch) await ch.setFiles(SONG); else await pg.setInputFiles('#muUpFile', SONG);
    await pg.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 }); await pg.waitForTimeout(300);
    const ch2 = await pick(pg, 'muupagain');
    ok('B 다음 «다른 곡 올리기»는 창 없이 바로 파일 창', !!ch2 && !(await panel(pg)), { ch2: !!ch2 });
    if (ch2) await pg.keyboard.press('Escape');
    // D — 직접 적기 2:10 → 곡 길이 150초 · 커진 뒤 20초 안팎
    await pg.fill('#muOwn', '2:10'); await pg.click('[data-fk="muownset"]'); await pg.waitForTimeout(500);
    const D = await pg.evaluate(() => { const u = EntryMusic._t.ups(), c = u.own; return { note: (document.querySelector('.ls-mu .mu-hks .mu-row.on .mu-a') || {}).textContent, after: c && c.after, rec: (document.querySelector('.ls-mu .mu-hks .mu-row .mu-a') || {}).textContent }; });
    const N = Math.floor(D.after || 0);
    ok(`D 걷는 중에 끝나는 자리 → «걷는 중에 곡이 끝나요 · 커진 뒤 ${N}초만 남아요»(파일에서 잰 값) · 이어지는 자리는 그대로 [WALK_WHY_1128]`, D.note === `직접 적은 자리 · 걷는 중에 곡이 끝나요 · 커진 뒤 ${N}초만 남아요` && N >= 15 && N <= 25 && /걷는 동안 곡이 이어져요$/.test(D.rec || ''), D);
    // E — 보내는 이름
    const E = await pg.evaluate(() => { const f = new File([new Uint8Array(4)], 'AUD-20261128-WA0003.mp3', { type: 'audio/mpeg' }); const u = EntryMusic._t.ups(), keep = u.meta; const out = {};
      u.meta = { t: 'Until I Found You', a: 'Stephen Sanchez' }; out.tag = EntryMusic._t.svName(f);
      u.meta = { t: 'A/B: 곡?', a: '' }; out.bad = EntryMusic._t.svName(f);
      u.meta = keep; out.raw = EntryMusic._t.svName(new File([new Uint8Array(4)], '우리 곡.M4A')); return out; });
    ok('E 스튜디오로 보내는 이름 = 곡 제목 - 가수 + 원래 확장자 · 드라이브에 못 쓰는 글자는 걷음 · 입장 초 없음 [MU_FILE_NAME_1128]', E.tag === 'Until I Found You - Stephen Sanchez.mp3' && E.bad === 'A B 곡.mp3' && /\.m4a$/.test(E.raw) && !/\d:\d\d/.test(E.tag), E);
    ok('A~E 쪽 오류 없음', errs.length === 0, errs);
    await ctx.close(); }
  // C — 갤럭시 인스타 앱 안(390) · 단추 «크롬으로 열기»
  { const { ctx, pg, errs } = await open(390, UA.galaxyInsta);
    await pg.click('[data-fk="musrc:up"]'); await pg.waitForTimeout(500); await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(400);
    const ch = await pick(pg); await pg.waitForTimeout(300); const P = await panel(pg);
    ok('C 갤럭시 인스타 앱 안 → 같은 창 · 단추 «크롬으로 열기»(intent) · 파일 창 없음', !ch && !!P && P.t === '이 앱 안에서는 곡 파일을 못 고를 수 있어요' && /^크롬으로 열기\|주소 복사\|여기서 해 볼게요/.test(P.btns), { ch: !!ch, P });
    ok('C 쪽 오류 없음', errs.length === 0, errs); await ctx.close(); }
  // C — 아이폰 카톡(390) · PC(1280): 창 없이 바로 파일 창 · 아이폰 안내는 ‹파일에 저장›
  for (const [nm, W, ua] of [['아이폰 카톡', 390, UA.iphoneKakao], ['PC', 1280, UA.pc]]) {
    const { ctx, pg, errs } = await open(W, ua);
    await pg.click('[data-fk="musrc:up"]'); await pg.waitForTimeout(500); const G = await guideText(pg); await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(400);
    const ch = await pick(pg);
    ok(`C ${nm} → 앱 안 창 없이 바로 파일 창`, !!ch && !(await panel(pg)), { ch: !!ch });
    if (nm === '아이폰 카톡') ok('A 아이폰 안내 = «먼저 ‹파일에 저장›해 주세요»', !!G && /먼저 ‹파일에 저장›해 주세요/.test(G.s1), G);
    ok(`C ${nm} 쪽 오류 없음`, errs.length === 0, errs); await ctx.close(); }
  // 녹음 쪽(INAPP_MIC) 제목은 그대로 — 같은 창을 쓰는 다른 자리가 깨지지 않았는가
  { const { ctx, pg } = await open(390, UA.galaxyKakao);
    const M = await pg.evaluate(() => { INAPP_MIC.kind = 'file'; _micAsk(function () {}); const d = document.getElementById('mkInApp'); return { t: d && d.querySelector('#mkInAppT').textContent, kind: INAPP_MIC.kind }; });
    ok('녹음 칸이 부르면 제목은 «이 앱 안에서는 녹음이 안 될 수 있어요»(kind 가 mic 으로 돌아온다) [INAPP_MIC]', M.t === '이 앱 안에서는 녹음이 안 될 수 있어요' && M.kind === 'mic', M);
    await ctx.close(); }
} catch (e) { console.log('못 쟀다 — ' + (e && e.stack || e)); fail = fail || 0; await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `entry-upload-1128: FAIL ${fail}` : 'entry-upload-1128: ok'); process.exit(fail ? 1 : 0);
