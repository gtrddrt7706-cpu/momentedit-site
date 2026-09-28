#!/usr/bin/env node
/* ★[VC_SCREEN 2026-09-28 코워크 0928 6-1 · 8장] AI 로 두 분 목소리 만들기 — 화면 흐름 시험(가짜 서버 · 390 · 1280).
   보는 것: 셋째 칸 «AI로 두 분 목소리 만들기»(voiceClone 켜짐) · 동의 문구(8-4) · 체크 전 막힘 · 1분 읽기 글 둘 + 서버 확인 문장 · 파일 올리기 없음 ·
     합쳐 20초 안이면 만들기 전에 멈춤 · 두 글을 0.4초 쉼으로 이어 한 파일 · 그 사람이 읽는 «빈 줄»만 AI(녹음 줄은 그대로) · 입장 인사는 문장마다 읽는 사람 ·
     AI 줄 도구(빠르기 · 다시 만들기 · N번 남음 · 이 줄은 직접 녹음할게요) · 녹음 줄을 AI 로 → [되돌리기] · 빠르기만 바꾸면 retempo
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음) */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-screen-'));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(1400);
  // 가짜 서버 — _vc · 파일 보내기(mypage 대신) · 부른 순서를 남긴다
  await pg.evaluate(() => {
    window.__calls = []; window.__phr = 0;
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t)); } return _recWav(x, sr); };
    window.__tone = tone;
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    const st = { groom: { consent: false, ready: false, left: 3 }, bride: { consent: false, ready: false, left: 3 } };
    window._vc = function (op, d) { window.__calls.push(op + (d && d.key ? ':' + d.key : '') + (d && d.who ? ':' + d.who : '') + (d && d.lines ? ':L' + d.lines.length : '') + (d && d.sec ? ':s' + d.sec : ''));
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: st.groom, bride: st.bride, per: {} });
      if (op === 'consent') { st[d.who].consent = true; return Promise.resolve({ ok: true }); }
      if (op === 'phrase') return Promise.resolve({ ok: true, phrase: '오늘은 구월 이십팔일, 파란 우산과 노란 연필.' });
      if (op === 'enroll') { st[d.who].ready = true; st[d.who].made = '2026-09-28 10:00'; st[d.who].left = 2; return Promise.resolve({ ok: true, who: d.who, tries: 1 }); }
      if (op === 'make' && window.__makeFail) return Promise.resolve({ ok: false, bad: true, error: '(시험) 이 줄은 만들지 못했어요' });   // [VC_LINE_ERR]
      if (op === 'make') { const n = d.lines ? d.lines.length : 1; return Promise.all(Array.from({ length: n }, () => b64(tone(1.2)))).then((a) => ({ ok: true, key: d.key, left: 4, parts: a.map((x, i) => ({ who: d.lines ? d.lines[i][0] : (d.one || 'groom'), mime: 'audio/wav', data: x })) })); }
      return Promise.resolve({ ok: false });
    };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; window.__calls.push('upload:' + k); setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-09-28 10:00' }), 50); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.guestVoice = 'couple'; S.entryVoice = 'couple'; opSync(); mkGo('guest');
  });
  await pg.waitForTimeout(500);
  const chips = await pg.evaluate(() => [...document.querySelectorAll('[data-fk^="lsc:guestVoice"]')].map((e) => e.textContent).join('|'));
  ok(W + ' 6-1 AI 칸이 첫 칸으로 보인다(voiceClone 켜짐 · 직접 녹음은 옛 초안에만 [VP_NO_DIRECT])', /^AI 목소리\|스튜디오 나레이션/.test(chips), chips);
  await pg.click('[data-fk="lsc:guestVoice:ai"]'); await pg.waitForTimeout(600);
  ok(W + ' AI 칸을 고르면 두 분 목소리 + 빈 줄 기본 AI · 사람 카드 둘', await pg.evaluate(() => S.guestVoice === 'couple' && S.vfill.guest === 'ai' && document.querySelectorAll('.mk-aisec [data-fk^="mkvcok:"]').length === 2), await pg.evaluate(() => JSON.stringify({ gv: S.guestVoice, vf: S.vfill, n: document.querySelectorAll('.mk-aisec [data-fk^="mkvcok:"]').length })));
  /* ★[VC_LIMIT_UI] 목소리 만들기를 다 쓴 분(left 0 · 아직 못 만듦)은 카드에 [1분 읽기 시작]이 없고 한 줄로 알린다 */
  const lim = await pg.evaluate(() => { const o = VC.st.bride; VC.st.bride = { consent: true, ready: false, left: 0 }; render(); const r = { btn: !!document.querySelector('[data-fk="mkvcread:bride"]'), t: document.querySelector('.mk-aisec').textContent }; VC.st.bride = o; render(); return r; });
  ok(W + ' 다 쓴 분 — [1분 읽기 시작] 없음 · «목소리 만들기를 다 썼어요» [VC_LIMIT_UI]', !lim.btn && /만들기를 다 썼어요 · 나레이션으로 나와요/.test(lim.t), JSON.stringify(lim).slice(0, 200));
  /* ★[VP_ONLY_PICKED] 고른 칸의 것만 — AI: 빈 줄에 [녹음] [파일] 없음 · 복사 · 녹음 도움말 없음 · «○○ 목소리를 만들면 저절로» / 직접 녹음: AI 칸 · [AI로 만들기] 없음 / 나레이션: 준비 칸 없음 */
  const vp = await pg.evaluate(() => { const q = (s) => document.querySelectorAll(s).length, t = () => (document.querySelector('.mk-voice') || {}).textContent || '', out = {};
    out.ai = { rec: q('.mk-vcards [data-fk^="mkrec:"]'), up: q('.mk-vcards [data-fk^="mkup:"]'), copy: q('[data-fk="mkupcopy"]'), help: /녹음 도움말/.test(t()), hint: q('.mk-vaiw'), sec: q('.mk-aisec'), flow: q('.mk-flowsec'), play: q('.mk-vcards [data-fk^="mkvpl:"]') };   /* [VP_ONE_LIST] 흐름 목록 없음 · ▶ 는 줄 카드에 */
    lsChip('guestVoice', 'couple'); render(); out.direct = { rec: q('.mk-vcards [data-fk^="mkrec:"]'), ai: q('.mk-aisec') + q('[data-fk^="mkai:"]'), copy: q('[data-fk="mkupcopy"]') };
    lsChip('guestVoice', 'nar'); render(); out.nar = { voice: q('.mk-voice') };
    lsChip('guestVoice', 'ai'); render(); const o = VC.st.groom; VC.st.groom = { consent: true, ready: false, left: 0 }; render(); out.spent = { g0rec: q('[data-fk="mkrec:g0"]'), g1rec: q('[data-fk="mkrec:g1"]'), nar: /다 써서 이 줄은 스튜디오 나레이션으로 나와요/.test(document.querySelector('.mk-vcards').textContent) };   /* ★[VP_NO_EXIT] 다 쓴 분 줄도 녹음 칸 없음 · 나레이션 한 줄 */ VC.st.groom = o; render(); return out; });
  ok(W + ' 고른 칸의 것만 — AI 는 빈 줄에 녹음 · 파일 없음(«만들면 저절로») · 직접 녹음은 AI 칸 없음 · 나레이션은 준비 칸 없음 · 다 쓴 분 줄은 나레이션 한 줄(녹음 칸 없음) [VP_ONLY_PICKED · VP_NO_EXIT]',
    vp.ai.rec === 0 && vp.ai.up === 0 && !vp.ai.copy && !vp.ai.help && vp.ai.hint === 4 && vp.ai.sec === 1 && vp.ai.flow === 0 && vp.ai.play === 3 && vp.direct.rec === 4 && vp.direct.ai === 0 && vp.direct.copy === 1 && vp.nar.voice === 0 && vp.spent.g0rec === 0 && vp.spent.g1rec === 0 && vp.spent.nar, JSON.stringify(vp));
  await pg.click('[data-fk="mkvcok:groom"]'); await pg.waitForTimeout(300);
  const cp = await pg.evaluate(() => (document.getElementById('mkRecDlg') || {}).innerText || '');   // ★[REC_DLG] 동의 · 1분 읽기는 작은 창에서
  ok(W + ' 8-4 동의 — 제목 · 본인이 직접 · 어디에 · 무엇을 · 언제 지우나요 · 안 해도 돼요 · 체크 문구', /님 목소리로 AI 목소리를 만들어요/.test(cp) && /본인이 직접 눌러 주세요/.test(cp) && /언제 지우나요\s*읽은 녹음과 AI 목소리는 예식 다음 날/.test(cp) && /안 해도 돼요/.test(cp) && /제 목소리로 AI 목소리를 만드는 것에 동의해요/.test(cp), cp);
  ok(W + ' 체크 전에는 [동의하고 읽으러 가기]가 막혀 있다', await pg.evaluate(() => document.getElementById('vcAgree').disabled));
  await pg.click('#vcSelf'); await pg.click('#vcAgree'); await pg.waitForTimeout(500);
  const rp1 = await pg.evaluate(() => (document.getElementById('mkRecDlg') || {}).innerText || '');
  await pg.evaluate(() => { VC.read.take[1] = { wav: __tone(6), dur: 6 }; mkVcStep(2); }); await pg.waitForTimeout(200);
  const rp = rp1 + ' || ' + await pg.evaluate(() => (document.getElementById('mkRecDlg') || {}).innerText || '');
  ok(W + ' 8-2 E — 한 번에 한 글(글 1 → 글 2) · 둘째 글 끝에 서버 확인 문장 · 파일 올리기 없음 안내 [REC_DLG]', /글 1/.test(rp1) && !/느티나무/.test(rp1) && /글 2/.test(rp) && /여러분도 그런 곳이 하나쯤 있으신가요\? 오늘은 구월 이십팔일, 파란 우산과 노란 연필\./.test(rp) && /파일은 올릴 수 없어요/.test(rp) && !(await pg.evaluate(() => !!document.querySelector('#mkRecDlg [data-fk^="mkup"],#mkRecDlg [data-fk="mkrecfile"]'))), rp.slice(0, 300));
  await full(pg, W, 's3-read');
  // 두 글이 짧으면(합쳐 20초 안) 만들기 전에 멈춘다
  await pg.evaluate(() => { VC.read.take[1] = { wav: __tone(6), dur: 6 }; VC.read.take[2] = { wav: __tone(7), dur: 7 }; render(); }); await pg.waitForTimeout(200);
  await pg.click('[data-fk="mkvcmake"]'); await pg.waitForTimeout(600);
  ok(W + ' 합쳐 20초 안 → 창 안에 «조금 더 천천히, 끝까지 읽어 주세요» · [글 2 다시 읽기] · 서버를 안 부른다 [REC_DLG]', await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return !!d && /조금 더 천천히, 끝까지 읽어 주세요/.test(d.textContent) && /글 2 다시 읽기/.test(d.textContent) && !__calls.some((c) => /^enroll/.test(c)); }));
  await pg.evaluate(() => { S.up = S.up || {}; S.up.g2 = { n: '녹음', id: 'Fg2old', src: 'rec', at: '' }; VC.read.take[1] = { wav: __tone(12), dur: 12 }; VC.read.take[2] = { wav: __tone(13), dur: 13 }; VC.read.short = false; VC.read.err = ''; render(); }); await pg.waitForTimeout(200);
  await pg.click('[data-fk="mkvcmake"]'); await pg.waitForTimeout(4000);
  const calls = await pg.evaluate(() => __calls.join(' '));
  ok(W + ' 만들기 → 두 글을 0.4초 쉼으로 이어 한 파일(25초 넘음)', /enroll:groom:s2[5-9]/.test(calls), calls);
  const up = await pg.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(S.up || {}).map(([k, v]) => [k, v && v.src ? v.src + (v.by ? '/' + (Array.isArray(v.by) ? v.by.join('+') : v.by) : '') : String(v)]))));
  ok(W + ' 8-2 4) 신랑이 읽는 빈 줄(1번)만 AI · 녹음 있는 3번(g2)은 그대로 · 신부 줄(2 · 4번)은 비어 있음', /"g0":"ai\/groom"/.test(up) && /"g2":"rec"/.test(up) && !/"g1":"ai/.test(up) && !/"g3":"ai/.test(up), up + ' ' + calls);
  ok(W + ' 입장 인사(두 분이 번갈아)도 만들고 문장마다 읽는 사람을 넘긴다 · «입장 인사도 같은 목소리로 만들었어요»', /make:entry:L\d/.test(calls) && /"entry":"ai/.test(up) && /입장 인사도 같은 목소리로 만들었어요/.test(await pg.evaluate(() => (document.querySelector('.mk-aisec') || {}).textContent || '')), calls);
  const dn = await pg.evaluate(() => (document.getElementById('mkRecDlg') || {}).innerText || '');
  ok(W + ' 만든 뒤 창이 «만들기» 걸음에서 «목소리를 만들었어요» · 채운 줄 수 · [확인] [REC_DLG]', /목소리를 만들었어요/.test(dn) && /2줄을 이 목소리로 채웠어요/.test(dn) && /확인/.test(dn), dn.slice(0, 200));
  await pg.click('[data-fk="mkvcdone"]'); await pg.waitForTimeout(300);
  const tools = await pg.evaluate(() => { const c = [...document.querySelectorAll('.mk-vcards .mk-vr')].find((li) => li.querySelector('[data-fk="mkairedo:g0"]')); return c ? c.textContent : ''; });
  ok(W + ' 8-2 5) AI 줄 — 빠르기 셋 · 다시 만들기 · N번 남음 (직접 녹음 단추는 뺐다 [VP_NO_DIRECT])', /천천히/.test(tools) && /조금 빠르게/.test(tools) && /다시 만들기 · 4번 남음/.test(tools) && !/이 줄은 직접 녹음할게요/.test(tools), tools);
  ok(W + ' 배지 «AI로 만들었어요» · 녹음 줄엔 [AI로 만들기](그 줄만)', await pg.evaluate(() => /AI로 만들었어요/.test(document.querySelector('.mk-vcards').textContent) && !!document.querySelector('[data-fk="mkai:g2"]')));
  await pg.click('[data-fk="mkai:g2"]'); await pg.waitForTimeout(2500);
  ok(W + ' 녹음 줄을 AI로 → 녹음은 [되돌리기]로 남는다', await pg.evaluate(() => S.up.g2.src === 'ai' && S.upPrev && S.upPrev.g2 && S.upPrev.g2.src === 'rec' && !!document.querySelector('[data-fk="mkaiback:g2"]')));
  await pg.click('[data-fk="mkaiback:g2"]'); await pg.waitForTimeout(300);
  ok(W + ' [되돌리기] → 녹음으로 돌아간다', await pg.evaluate(() => S.up.g2.src === 'rec'));
  await pg.click('[data-fk="mkaitempo:g0:0.9"]'); await pg.waitForTimeout(2500);
  ok(W + ' 빠르기만 바꾸면 retempo 로(줄 한도에 안 셈)', await pg.evaluate(() => S.up.g0.tempo === '0.9' && __calls.filter((c) => c === 'make:g0').length >= 2));
  await pg.evaluate(() => { const v = document.querySelector('[data-fk="mkairedo:g0"]'); v && v.scrollIntoView({ block: 'center' }); }); await full(pg, W, 's3-lines');
  /* ★[VC_LINE_ERR] 줄 만들기가 실패하면 «보내는 중»에 멈추지 않고 그 줄 아래에 까닭 */
  await pg.evaluate(() => { window.__makeFail = true; }); await pg.click('[data-fk="mkairedo:g0"]'); await pg.waitForTimeout(800);
  const le = await pg.evaluate(() => { const li = document.querySelector('[data-fk="mkairedo:g0"]') && document.querySelector('[data-fk="mkairedo:g0"]').closest('li'); return { busy: !!MK_UP.g0, err: li ? ((li.querySelector('.mk-exw') || {}).textContent || '') : '' }; });
  await pg.evaluate(() => { window.__makeFail = false; });
  ok(W + ' 줄 만들기 실패 → «보내는 중»에 멈추지 않고 그 줄 아래 까닭 [VC_LINE_ERR]', !le.busy && /만들지 못했어요/.test(le.err), JSON.stringify(le));
  ok(W + ' AI 줄에 «이 줄은 직접 녹음할게요» 단추가 없다 [VP_NO_DIRECT]', await pg.evaluate(() => !document.querySelector('[data-fk^="mkaiself:"]')));
  ok(W + ' pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
async function full(pg, W, name) { const h = await pg.evaluate(() => document.documentElement.scrollHeight); await pg.setViewportSize({ width: W, height: Math.min(h, 7000) }); await pg.waitForTimeout(250); await pg.screenshot({ path: `${OUT}/${name}-${W}.png` }); await pg.setViewportSize({ width: W, height: 844 }); }
await br.close(); srv.close(); console.log(log.join('\n')); console.log(fail ? 'FAIL ' + fail : 'S3 OK'); process.exit(fail ? 1 : 0);
