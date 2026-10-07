#!/usr/bin/env node
/* ★★[VC_DOWN_KIND 2026-10-07 사장님 «PC 에서 '지금은 AI 목소리를 만들 수 없어요' 왜?» · «경고 문구 한 줄로 요약» · «실패 종류별로 다르게 · 스크린샷만으로 원인을 알게»]
   AI 목소리 실패를 원인마다 다른 한 줄 + 코드(V0 ~ V7)로 보이는지 잰다. 종전엔 서버 거절 · 연결 끊김 · 시간 초과가 같은 두 줄이라 원인을 가를 수 없었다.
   ① 받는 자리(_vcDone) — 서버 kind · 시간 초과 · 연결 끊김 · 서버 답이 깨짐 · 옛 서버(kind 없음) · 옛 마이페이지 글 → 맞는 코드
   ② 실패가 아닌 답(글자 문제 · 로그인 만료)은 종전 글 그대로
   ③ 맞추기 창에서 실제로 실패시키면(서버 «바쁨») 한 번 더 묻고 → V1 한 줄 · «그동안 이 줄은» 없음 (360 · 390 · 1280)
   ④ 여덟 문구가 맞추기 창 · 줄 카드에서 360px 폰도 한 줄
   ⑤ 마이페이지 중계가 셋(V5 · V6 · V7)을 가른다(글자 검사)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

/* ⑤ 마이페이지 중계 — 브라우저 없이 */
{ const my = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'); const i = my.indexOf("d.type==='momentedit:voiceClone'"), seg = i < 0 ? '' : my.slice(i, i + 3000);
  ok('⑤ 마이페이지 중계 실패 = 기다리다 멈춤 V5 · 서버 답이 깨짐 V7 · 연결 끊김 V6 (셋을 가른다 · 옛 두 줄 없음)', /\(코드 V5\)/.test(seg) && /\(코드 V6\)/.test(seg) && /\(코드 V7\)/.test(seg) && /SyntaxError/.test(seg) && !/그동안 이 줄은/.test(seg)); }

if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }

const SERVER_DOWN = '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요';   // GAS VC_DOWN 그대로
const OLD_RELAY = '지금은 AI 목소리를 만들 수 없어요 · 잠시 뒤 다시 눌러 주세요. 그동안 이 줄은 스튜디오 나레이션으로 나와요';   // 옛 마이페이지 중계 글
const ST = { ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: {}, per: {} };

async function open(w) {
  const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  /* 부모(마이페이지 + 서버) 흉내 — 빌더가 보낸 voiceClone 을 받아 voiceCloneDone 으로 돌려준다(_vc0 · _vcDone · 바꿔 읽기를 그대로 지난다) */
  await pg.evaluate((st) => { window.__res = { ok: false, down: true, error: 'x' }; window.__makes = 0;
    window.addEventListener('message', (ev) => { const m = ev.data; if (!m || m.type !== 'momentedit:voiceClone') return; const d = m.data; if (d.op === 'make') window.__makes++;
      const back = d.op === 'status' ? st : window.__res; setTimeout(() => window.postMessage(Object.assign({ type: 'momentedit:voiceCloneDone', rid: d.rid }, JSON.parse(JSON.stringify(back))), location.origin), 30); });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.on.prevideo = 1; S.vsChip = 1; opSync(); }, ST);
  await nx(); await pg.waitForTimeout(900);
  return { ctx, pg, errs };
}

let W8 = null;
for (const w of [360, 390, 1280]) {
  const { ctx, pg, errs } = await open(w);
  if (!W8) {
    /* ① · ② 받는 자리 — 첫 폭에서 한 번 */
    const m = await pg.evaluate(async ([SERVER_DOWN, OLD_RELAY]) => {
      const map = (d) => new Promise((res) => { const rid = 900000 + (++window.__mapN || (window.__mapN = 1)); VC.cb[rid] = res; _vcDone(Object.assign({ rid }, d)); }).then((r) => r.error);
      return { w8: VC_DOWN_W.map((x, n) => _vcDownWord(n)),
        old: await map({ ok: false, down: true, error: SERVER_DOWN }),
        busy: await map({ ok: false, down: true, kind: 'busy', http: 429, error: SERVER_DOWN }),
        plan: await map({ ok: false, down: true, kind: 'plan', http: 402, error: SERVER_DOWN }),
        gate: await map({ ok: false, down: true, kind: 'gate', error: SERVER_DOWN }),
        fail: await map({ ok: false, down: true, kind: 'fail', http: 400, error: SERVER_DOWN }),
        relayTo: await map({ ok: false, down: true, timeout: true, error: OLD_RELAY }),
        relayNet: await map({ ok: false, down: true, timeout: false, error: OLD_RELAY }),
        net: await map({ ok: false, down: true, net: 1, error: '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6)' }),
        bad: await map({ ok: false, down: true, net: 'bad', error: '서버가 잠깐 멈췄어요 · 다시 눌러 주세요 (코드 V7)' }),
        unread: await map({ ok: false, bad: true, error: '이 줄 글에 소리로 읽기 어려운 글자가 있어요. 글을 고치거나 직접 녹음해 주세요' }),
        sess: await map({ ok: false, reason: 'expired', error: '로그인이 만료되었어요. 다시 로그인해 주세요.' }),
        word: _vcErrWord(SERVER_DOWN) }; }, [SERVER_DOWN, OLD_RELAY]);
    W8 = m.w8;
    const codes = m.w8.map((t) => (t.match(/\(코드 (V\d)\)$/) || [])[1]).join(',');
    ok('① 코드 여덟(V0 ~ V7) · 문구가 서로 다르다 · 장식 이모지 · 전각 줄표 없음', codes === 'V0,V1,V2,V3,V4,V5,V6,V7' && new Set(m.w8.map((t) => t.replace(/ \(코드 V\d\)$/, ''))).size >= 7 && !m.w8.some((t) => /[—\u{1F300}-\u{1FAFF}]/u.test(t)), codes);
    ok('① 옛 서버(kind 없음) → V0 · 바꿔 읽기 표도 V0', /\(코드 V0\)$/.test(m.old) && /\(코드 V0\)$/.test(m.word), m.old + ' | ' + m.word);
    ok('① 서버 kind → 바쁨 V1 · 요금제 V2 · 막힘 V3 · 그 밖 V4', /V1\)$/.test(m.busy) && /V2\)$/.test(m.plan) && /V3\)$/.test(m.gate) && /V4\)$/.test(m.fail), [m.busy, m.plan, m.gate, m.fail].join(' | '));
    ok('① 옛 마이페이지 글 — 시간 초과면 V5 · 아니면 연결 V6', /V5\)$/.test(m.relayTo) && /V6\)$/.test(m.relayNet), m.relayTo + ' | ' + m.relayNet);
    ok('① 새 마이페이지 — 연결 V6 · 서버 답이 깨짐 V7', /V6\)$/.test(m.net) && /V7\)$/.test(m.bad), m.net + ' | ' + m.bad);
    ok('② 실패가 아닌 답은 종전 글 — 글자 문제(바꿔 읽기) · 로그인 만료(그대로) · 코드 없음', /글을 고쳐 다시 만들어 주세요/.test(m.unread) && m.sess === '로그인이 만료되었어요. 다시 로그인해 주세요.' && !/코드 V/.test(m.unread + m.sess), m.unread + ' | ' + m.sess);
    ok('①② 어느 답에도 «그동안 이 줄은» · «직접 녹음» 없음', !/그동안 이 줄은|직접 녹음/.test(JSON.stringify(m)), '');
  }
  /* ③ 맞추기 창 — 서버 «바쁨»으로 실제 실패 */
  await pg.evaluate(() => { window.__res = { ok: false, down: true, kind: 'busy', http: 429, error: '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요' }; window.__makes = 0; mkVcTune('groom'); });
  await pg.waitForTimeout(4200);
  const t = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'), p = d && d.querySelector('.mk-exw'); if (!p) return { none: true, makes: window.__makes };
    const b = p.getBoundingClientRect(), lh = parseFloat(getComputedStyle(p).lineHeight); return { text: p.textContent, lines: Math.round(b.height / lh), makes: window.__makes, old: /그동안 이 줄은/.test(d.textContent), sw: document.documentElement.scrollWidth <= innerWidth }; });
  if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, `tune-${w}.png`) });
  ok(`${w} ③ 맞추기 창 실패(서버 바쁨) → 한 번 더 묻고(2번) «요청이 몰렸어요 · … (코드 V1)» 한 줄 · «그동안 이 줄은» 없음 · 가로 넘침 없음`, !t.none && t.makes === 2 && /^요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 \(코드 V1\)$/.test(t.text) && t.lines === 1 && !t.old && t.sw, JSON.stringify(t));
  /* ④ 여덟 문구 — 맞추기 창 · 줄 카드 한 줄 */
  if (W8 && w !== 1280) {
    const f1 = await pg.evaluate((C) => C.map((x) => { VC.tune.loading = 0; VC.tune.err = x; render(); const p = document.querySelector('#mkRecDlg .mk-exw'); if (!p) return 0; return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)); }), W8);
    ok(`${w} ④ 여덟 문구가 맞추기 창에서 한 줄`, f1.every((n) => n === 1), JSON.stringify(f1));
    await pg.evaluate(() => { mkDlgClose(); VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; mkGo('guest'); }); await pg.waitForTimeout(500);
    const f2 = await pg.evaluate((C) => C.map((x) => { MK.lineErr = { g0: x }; render(); const p = document.querySelector('.mk-pg .mk-exw[role="alert"]'); if (!p) return 0; return Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)); }), W8);
    ok(`${w} ④ 여덟 문구가 줄 카드에서 한 줄`, f2.every((n) => n === 1), JSON.stringify(f2));
  }
  /* ⑥ 확인 문장 단계 — 종전엔 까닭과 상관없이 «연결이 잠깐 끊겼어요» · 이제 받은 까닭(코드) 한 줄 + «확인 문장 다시 받기» */
  if (w === 390) {
    await pg.evaluate(() => { mkDlgClose(); window.__res = { ok: false, down: true, kind: 'gate', error: '지금은 AI 목소리를 만들 수 없어요. 잠시 뒤 다시 해 보시거나 직접 녹음으로 준비해 주세요' }; VC.pre = {}; mkVcRead('groom'); });
    await pg.waitForTimeout(3600);
    await pg.evaluate(() => { VC.read.take[1] = { wav: new Blob(), dur: 16 }; mkVcStep(2); }); await pg.waitForTimeout(3800);
    const ph = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'), p = d && d.querySelector('.mk-exw[role="alert"]'); if (!p) return { none: true, t: d ? d.innerText.slice(0, 200) : '' };
      const b = p.getBoundingClientRect(); return { text: p.textContent, lines: Math.round(b.height / parseFloat(getComputedStyle(p).lineHeight)), again: !!d.querySelector('[data-fk="mkvcphrase"]'), old: /연결이 잠깐 끊겼어요/.test(d.innerText) }; });
    ok(`${w} ⑥ 확인 문장 단계 실패(스위치로 막힘) → «AI 목소리가 꺼져 있어요 · 문의해 주세요 (코드 V3)» 한 줄 · 다시 받기 단추 · «연결이 잠깐 끊겼어요» 없음`, !ph.none && ph.text === 'AI 목소리가 꺼져 있어요 · 문의해 주세요 (코드 V3)' && ph.lines === 1 && ph.again && !ph.old, JSON.stringify(ph));
    if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, `phrase-${w}.png`) });
    await pg.evaluate(() => { VC.read = null; mkDlgClose(); });
  }
  ok(`${w} 화면 오류 0`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `\nFAIL ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
