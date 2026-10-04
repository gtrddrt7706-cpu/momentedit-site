#!/usr/bin/env node
/* ★[VOICE_SETUP 2026-10-02 사장님 «② 머리글 나레이션 자세히 → 창 · AI/스튜디오 고르기부터» · «② 들어갈 때 창으로 먼저 · 한 번 셋팅 → 하객 맞이 · 입장 · 식전 영상 한꺼번에» · «각 순간에서 비교해 듣기» · «휴대폰 녹음 가이드 · 모션»]
   화면 흐름 시험(가짜 서버 · 390 · 1280). 보는 것: ② 처음 들어오면 창이 먼저(AI 를 쓸 수 있는 예식만) · 고르는 판 둘 · AI → 세 자리 칩이 한꺼번에 AI ·
     사람 줄(1분 읽기) · 녹음 길잡이(휴대폰 그림 · 움직임 줄이기면 멈춤) · 이미 만든 목소리로 빈 줄을 바로 채운다 · [다 됐어요]로 닫힘 · 두 번째부터는 저절로 안 뜬다 ·
     ② 진행 줄 아래 «나레이션 자세히» → 고르기부터 · 스튜디오 → 세 자리 나레이션 · 닫힘 · AI 줄 카드에 «스튜디오 나레이션과 비교해 듣기» → 나레이션 파일
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음) */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
const SHOT = process.env.VS_SHOT || '';
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch, reducedMotion: 'no-preference' }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    window.__calls = []; window.__aud = [];
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) { window.__calls.push(op + (d && d.key ? ':' + d.key : ''));
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: false, ready: false, left: 3 }, per: {} });
      if (op === 'make') return b64(tone(1)).then((x) => ({ ok: true, key: d.key, left: 4, parts: (d.lines || [[d.one || 'groom']]).map((l) => ({ who: l[0], mime: 'audio/mpeg', data: x })) }));
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; window.__calls.push('upload:' + k); setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-02 10:00' }), 50); return; } return o(m, t); };
    const A = window.Audio; window.Audio = function (u) { window.__aud.push(String(u)); const a = new A(); a.play = () => Promise.resolve(); return a; };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.on.prevideo = 1; opSync();
  });
  await nx(); await pg.waitForTimeout(1400);
  /* ★[VOICE_ONCE 2026-10-03 사장님] 종전 «② 처음 들어오면 창이 먼저(S.vsAsked)» → 저절로 뜨지 않는다 — 예식 흐름 다음 «두 분 목소리 만들기» 쪽이 그 일을 한다.
     창 자체(고르기 · AI 사람 줄 · 동의로 이어짐)는 그대로라 «나레이션 자세히»(mkVsOpen)로 열어 아래를 잰다 */
  ok(W + ' ② 처음 들어와도 창이 저절로 뜨지 않는다 [VOICE_ONCE]', await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  await pg.evaluate(() => mkVsOpen()); await pg.waitForTimeout(400);
  const d0 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { open: !!d, t: d ? d.querySelector('.mk-dlg-t').textContent : '', opts: d ? [...d.querySelectorAll('[data-fk^="mkvs:"]')].map((b) => b.querySelector('b').textContent).join('|') : '' }; });
  ok(W + ' «나레이션 자세히» 창 — «안내 목소리 정하기» · [AI 두 분 목소리 | 스튜디오 나레이션]', d0.open && d0.t === '안내 목소리 정하기' && d0.opts === 'AI 두 분 목소리|스튜디오 나레이션', JSON.stringify(d0));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/vs-pick-${W}.png` });
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  const d1 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { t: d ? d.querySelector('.mk-dlg-t').textContent : '', gv: S.guestVoice, ev: S.entryVoice, pv: S.pvVoice, vf: JSON.stringify(S.vfill), rows: d ? d.querySelectorAll('.mk-vpcs li').length : 0, read: d ? d.querySelectorAll('[data-fk="mkvcok:bride"]').length + '/' + d.querySelectorAll('[data-fk="mkvcok:groom"]').length : '', g: d ? { re: !!d.querySelector('[data-fk="mkvcre:groom"]'), del: !!d.querySelector('.mk-vpc [data-fk="mkvcdel:groom"].mk-vdel'), delInLeft: !!d.querySelector('.mk-vsub [data-fk="mkvcdel:groom"]'), st: ((d.querySelector('.mk-vpc .mk-vs') || {}).textContent || '') } : null,   /* ★[VC_CARD_ONE 2026-10-04] 창도 목소리 쪽 카드 한 벌(.mk-vpcs) — 종전 .mk-vsp · mkvsread */ svg: !!(d && d.querySelector('.mk-vsg svg .wv')), anim: d && d.querySelector('.mk-vsg .wv') ? getComputedStyle(d.querySelector('.mk-vsg .wv')).animationName : '', made: __calls.filter((c) => /^make:/.test(c)).length }; });
  ok(W + ' AI → 세 자리가 한꺼번에 AI · 사람 줄 둘(만든 분은 ✓ · 안 만든 분만 [1분 읽기 시작]) · 녹음 길잡이 그림이 움직인다 · 만든 목소리로 빈 줄을 바로 채운다', d1.t === 'AI 두 분 목소리 만들기' && d1.gv === 'couple' && d1.ev === 'couple' && d1.pv === 'couple' && d1.vf === '{"guest":"ai","entry":"ai","prevideo":"ai"}' && d1.rows === 2 && d1.read === '1/0' && d1.g.re && d1.g.del && d1.g.delInLeft && /^목소리 생성/.test(d1.g.st) /* [VC_CARD_V2] 다시 녹음 · 지우기 = 카드 맨 아래 작은 글 · «목소리 생성» */ && d1.svg && d1.anim === 'mkVsWave' && d1.made > 0, JSON.stringify(d1));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/vs-ai-${W}.png` });
  await pg.click('[data-fk="mkvcok:bride"]'); await pg.waitForTimeout(300);   /* [VC_CARD_ONE] 같은 카드의 «목소리 만들기 시작» */
  const d2 = await pg.evaluate(() => (document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '');
  await pg.click('[data-fk="mkdlgx"]'); await pg.waitForTimeout(300);
  const d3 = await pg.evaluate(() => (document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '');
  ok(W + ' [1분 읽기 시작] → 동의 창 · 닫으면 이 창으로 돌아온다', /님 목소리 만들기/.test(d2) && d3 === 'AI 두 분 목소리 만들기', JSON.stringify({ d2, d3 }));
  await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400);
  ok(W + ' [다 됐어요] → 창이 닫힌다', await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  await pg.evaluate(() => { VS.seen = false; mkGo('entry'); }); await pg.waitForTimeout(400);
  ok(W + ' 두 번째부터는 저절로 안 뜬다(S.vsAsked)', await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  /* ★[VS_LINK_IN_ROW 2026-10-03 사장님] 종전 «② 진행 줄 아래 «안내 목소리 · AI 두 분 목소리 · 나레이션 자세히» 한 줄» → 그 줄은 없다 · «나레이션 자세히»는 목소리 준비 칩 줄 오른쪽 끝 */
  const pill = await pg.evaluate(() => { const l = document.querySelector('[data-fk="mkvsopen"]'); return { bar: !!document.querySelector('.mk-vsbar'), inRow: !!(l && l.closest('.ls-cg.cg-vp')), t: l && l.textContent, h: l ? Math.round(l.getBoundingClientRect().height) : 0, pills: !!document.getElementById('obVoice') }; });
  ok(W + ' ② 입장 — 한 줄(안내 목소리 · …) 없음 · «나레이션 자세히»는 목소리 준비 칩 줄 안(누를 곳 44 · 머리 알약 줄에는 없음) [VS_LINK_IN_ROW]', !pill.bar && pill.inRow && pill.t === '나레이션 자세히' && pill.h >= 44 && !pill.pills, JSON.stringify(pill));
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(1800);
  if (SHOT) { await pg.evaluate(() => { try { lsStop(); } catch (e) {} window.scrollTo(0, 0); }); await pg.waitForTimeout(300); await pg.screenshot({ path: `${SHOT}/vs-guest-${W}.png` }); }
  /* ★[AI_NOTE_OFF 2026-10-03 사장님] 종전 «AI 줄 카드에 «스튜디오 나레이션과 비교해 듣기» → 나레이션 파일» → 이제 «그 한 줄(글은 두 분 말로 … · 비교해 듣기) · 줄마다 «만들면 저절로 채워져요» 없음» */
  const cmp = await pg.evaluate(() => ({ btn: document.querySelectorAll('[data-fk^="mknar:"],[data-fk^="mknarall:"]').length, t: document.querySelector('.mk-pg').textContent }));
  ok(W + ' AI 줄 카드 — «글은 두 분 말로 고쳐도 돼요 · 스튜디오 나레이션과 비교해 듣기» 없음 · «목소리를 만들면 이 줄이 저절로 채워져요» 없음 [AI_NOTE_OFF]', cmp.btn === 0 && !/비교해 듣기|두 분 말로 고쳐도 돼요|저절로 채워져요/.test(cmp.t), JSON.stringify({ btn: cmp.btn }));
  /* ★[LINE_EDIT] AI 자리의 줄 글을 두 분이 고친다 — 글칸 · 시작 1분 전은 앞 두 문장 고정 · 고치면 «다시 만들어 주세요» → 새 글로 만든다 */
  const le0 = await pg.evaluate(() => { const ta = document.querySelector('[data-fk="mkvt:g0"]'), fx = document.querySelector('.mk-vtfix'), t3 = document.querySelector('[data-fk="mkvt:g3"]');
    return { ta: !!ta, v: ta ? ta.value : '', fix: fx ? fx.textContent : '', t3: t3 ? t3.value : '', vtx: document.querySelectorAll('.mk-vcards .mk-vtx:not(.mk-vtfix)').length }; });
  /* ★[G3_OPEN 2026-10-03 사장님 «고정 유지 하지 마»] 종전 «시작 1분 전은 앞 두 문장 고정 · 그 뒤만 칸» → 이제 «글 전체가 한 칸(기본 글 그대로 보임) · 고정 문장 없음» */
  ok(W + ' AI 자리 줄 카드 — 글이 고칠 수 있는 칸 · 시작 1분 전도 글 전체가 한 칸(«미리 준비한 안내 음성» 포함) · 고정 문장 없음 [LINE_EDIT · G3_OPEN]', le0.ta && /^저희 두 사람의 결혼식에/.test(le0.v) && !le0.fix && /^곧 저희 예식이 시작됩니다\. 오늘 예식은 미리 준비한 안내 음성으로/.test(le0.t3) && le0.t3 === (await pg.evaluate(() => GUEST[3][2])) && le0.vtx === 0, JSON.stringify(le0).slice(0, 300));
  await pg.evaluate(() => mkGuestWho(3, 'g')); await pg.waitForTimeout(1500);   // 시작 1분 전을 신랑(목소리 있음)으로
  await pg.fill('[data-fk="mkvt:g3"]', '조금 뒤에 뵙겠습니다.'); await pg.evaluate(() => render()); await pg.waitForTimeout(300);
  const le1 = await pg.evaluate(() => ({ need: _recNeed('g3'), btn: (document.querySelector('[data-fk="mkai:g3"]') || {}).textContent || '', play: !!document.querySelector('[data-fk="mkvpl:g3"]:not([disabled])'), st: ((document.querySelector('[data-fk="mkvt:g3"]') || {}).closest ? document.querySelector('[data-fk="mkvt:g3"]').closest('.mk-vc').textContent : ''), reset: !!document.querySelector('[data-fk="mkvtreset:g3"]') }));
  /* [G3_OPEN] 종전 «읽을 글 = 고정 두 문장 + 고친 글» → «읽을 글 = 고친 글 그대로» · «안내 음성»이 빠지면 막지 않는 권함 한 줄 */
  const rem1 = await pg.evaluate(() => { const r = document.getElementById('mkG3Rem'); return r ? { shown: !r.hidden, t: r.textContent, cls: r.className } : null; });
  ok(W + ' 글을 고치면 읽을 글 = 고친 글 그대로 · «글을 고쳤어요 · ▶ 를 누르면 새로 만들어요» · [새 글로 다시 만들기] 없음 · ▶ 있음 · [처음 글로] · «안내 음성»이 빠지면 권함 한 줄(mk-note) [G3_OPEN]', le1.need === '조금 뒤에 뵙겠습니다.' && le1.btn === '목소리 만들기' /* [AI_PILL] 머리 단추가 스르륵 */ && le1.play && /글을 고쳤어요/.test(le1.st) /* ★[TEXT_PLAY_MAKE 2026-10-04] 종전 «[새 글로 다시 만들기]» 단추 → ▶ */ && le1.reset && !!rem1 && rem1.shown && rem1.t === '하객께 미리 준비한 안내 음성이라는 걸 알리는 말을 남겨 두시면 좋아요' && /mk-note/.test(rem1.cls), JSON.stringify({ le1, rem1 }).slice(0, 400));
  await pg.fill('[data-fk="mkvt:g3"]', '곧 시작합니다. 오늘은 미리 준비한 안내 음성으로 진행돼요. 조금 뒤에 뵙겠습니다.'); await pg.waitForTimeout(150);
  const rem2 = await pg.evaluate(() => ({ hidden: document.getElementById('mkG3Rem').hidden, need: _recNeed('g3') }));
  ok(W + ' «안내 음성»을 되살리면 권함 한 줄이 바로 사라진다(다시 그리지 않아도) [G3_OPEN]', rem2.hidden && /안내 음성/.test(rem2.need), JSON.stringify(rem2));
  await pg.fill('[data-fk="mkvt:g3"]', '조금 뒤에 뵙겠습니다.'); await pg.evaluate(() => render()); await pg.waitForTimeout(200);
  await pg.click('[data-fk="mkvpl:g3"]'); await pg.waitForTimeout(1500);   /* [TEXT_PLAY_MAKE] ▶ = 그 줄을 먼저 만들고 튼다 */
  ok(W + ' 고친 줄의 ▶ → 새 글로 만든 뒤 튼다(«글을 고치고 ▶») [TEXT_PLAY_MAKE]', await pg.evaluate(() => { const v = S.up.g3; return !!(v && v.src === 'ai' && v.tx === _txSig(_recNeed('g3'))) && !_aiNeed('g3'); }));   /* [AI_PILL] 만든 뒤엔 단추가 필요 없다(«✓ 완료» 뒤 사라짐) */
  await pg.click('[data-fk="mkvtreset:g3"]'); await pg.waitForTimeout(300);
  /* ★[TEXT_PLAY_MAKE 2026-10-04] 종전 «다시 만들어 주세요» 단추(mkai) → 상태 «▶ 를 누르면 새로 만들어요» · ▶ 가 만든다 */
  ok(W + ' [처음 글로] → 처음 글 · «▶ 를 누르면 새로 만들어요»', await pg.evaluate(() => _recNeed('g3') === GUEST[3][2] && _txStale('g3') && !!document.querySelector('.mk-aip.on[data-fk="mkai:g3"]') /* [AI_PILL] */ && !!document.querySelector('[data-fk="mkvpl:g3"]')));
  /* ★[G3_OPEN] 옛 초안 옮기기 — S.vtext.g3 에 «앞 두 문장 뒤»만 있던 초안 → 글 전체(앞 두 문장 + 뒤) · 그 글로 만든 AI 소리는 «다시 만들어 주세요»가 안 뜬다 · 두 번 불러도 한 번만 */
  const mg = await pg.evaluate(() => { const head = _g3Split()[0], tail = '조금 뒤에 뵙겠습니다.', keep = { vt: JSON.stringify(S.vtext || {}), up: S.up.g3, open: S.g3Open };
    S.vtext = S.vtext || {}; S.vtext.g3 = tail; S.up.g3 = { src: 'ai', id: 'local:m', tx: _txSig(head + ' ' + tail), by: _vcLineWho('g3') }; delete S.g3Open;
    _g3Open(); const a = { v: S.vtext.g3, stale: _txStale('g3'), open: S.g3Open }; _g3Open(); a.v2 = S.vtext.g3; a.head = head;
    S.vtext = JSON.parse(keep.vt); S.up.g3 = keep.up; S.g3Open = keep.open; return a; });
  ok(W + ' 옛 «뒤만» 초안 → 글 전체(앞 두 문장 + 뒤) · 만든 AI 소리는 그대로 맞음(stale 아님) · 두 번 불러도 한 번만 [G3_OPEN]', mg.v === mg.head + ' 조금 뒤에 뵙겠습니다.' && /미리 준비한 안내 음성/.test(mg.v) && !mg.stale && mg.open === 1 && mg.v2 === mg.v, JSON.stringify(mg).slice(0, 300));
  await pg.click('[data-fk="mkvsopen"]'); await pg.waitForTimeout(400);
  const d4 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { t: d ? d.querySelector('.mk-dlg-t').textContent : '', ai: d ? d.querySelector('[data-fk="mkvs:ai"]').getAttribute('aria-pressed') : '' }; });
  ok(W + ' «나레이션 자세히»를 누르면 고르기부터 · 지금 값(AI)이 눌린 모양', d4.t === '안내 목소리 정하기' && d4.ai === 'true', JSON.stringify(d4));
  await pg.click('[data-fk="mkvs:nar"]'); await pg.waitForTimeout(400);
  const d5 = await pg.evaluate(() => ({ dlg: !!document.getElementById('mkRecDlg'), v: [S.guestVoice, S.entryVoice, S.pvVoice].join(','), vf: JSON.stringify(S.vfill || {}) }));
  ok(W + ' 스튜디오 → 세 자리 나레이션 · 창 닫힘', !d5.dlg && d5.v === 'nar,nar,nar' && d5.vf === '{}', JSON.stringify(d5));
  await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = false; render(); });
  ok(W + ' AI 를 못 쓰는 예식엔 «나레이션 자세히»도 없다 [VS_LINK_IN_ROW]', await pg.evaluate(() => !document.querySelector('.mk-vsbar') && !document.querySelector('[data-fk="mkvsopen"]')));
  /* ★[VS_CHIP_ONCE → VS_CHIP_OFF 2026-10-04 사장님] 칩을 처음 눌러도 창이 저절로 뜨지 않는다 — 고른 것만 바뀐다 */
  await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = true; delete S.vsChip; mkGo('guest'); render(); }); await pg.waitForTimeout(500);
  await pg.click('[data-fk="lsc:guestVoice:ai"]'); await pg.waitForTimeout(500);
  ok(W + ' 칩을 처음 눌러도 창이 안 뜬다 · 고른 것만 AI [VS_CHIP_OFF]', await pg.evaluate(() => !document.getElementById('mkRecDlg') && S.guestVoice === 'couple'));
  await pg.click('[data-fk="lsc:guestVoice:nar"]'); await pg.waitForTimeout(400);
  ok(W + ' 두 번째 칩도 창이 안 뜬다', await pg.evaluate(() => !document.getElementById('mkRecDlg') && S.guestVoice === 'nar'));
  /* ★[PLAY_ONE] 들을 줄이 하나뿐이면 «이 순간 들어 보기» 없음 · 여럿이면 있음 */
  await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = false; S.on.welcome = 1; mkGo('welcome'); }); await pg.waitForTimeout(500);
  const p1 = await pg.evaluate(() => !!document.querySelector('.mk-pg [data-fk="mkplay"]'));
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(500);
  const p2 = await pg.evaluate(() => !!document.querySelector('.mk-pg [data-fk="mkplay"]'));
  ok(W + ' 줄 하나(첫인사)엔 «이 순간 들어 보기» 없음 · 여럿(하객 맞이)엔 있음 [PLAY_ONE]', !p1 && p2, JSON.stringify({ p1, p2 }));
  /* ★★[VT_KEEP_SWITCH 2026-10-03 사장님 «AI 두 분 목소리로 글을 적다가 스튜디오 나레이션으로 바꿨다가 다시 AI 로 오면 적은 글이 그대로»]
     하객 맞이 g1 · 식전 영상 소개글 · 입장 멘트 — 적고(칸에서 나가지 않은 채) 바로 스튜디오 → 다시 AI. 글이 한 글자도 같고 · 기본 글로 바뀌지 않고 · S.vtext 키가 줄지 않는다 */
  await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.on.prevideo = 1; opSync(); });
  const vk = {};
  for (const [k, key, sel] of [['guest', 'guestVoice', '[data-fk="mkvt:g1"]'], ['prevideo', 'pvVoice', '#mkPvTa'], ['entry', 'entryVoice', '[data-fk="mkvt:entry"]']]) {
    await pg.evaluate((k) => { mkGo(k); render(); }, k); await pg.waitForTimeout(400);
    if (!(await pg.$(`[data-fk="lsc:${key}:ai"]`))) { vk[k] = 'no-ai-chip'; continue; }
    if ((await pg.getAttribute(`[data-fk="lsc:${key}:ai"]`, 'aria-checked')) !== 'true') { await pg.click(`[data-fk="lsc:${key}:ai"]`); await pg.waitForTimeout(400); }
    if (!(await pg.$(sel))) { vk[k] = 'no-box'; continue; }
    const keys0 = await pg.evaluate(() => Object.keys(S.vtext || {}));
    await pg.click(sel); await pg.keyboard.press('End'); await pg.keyboard.type(' 우리 말로 고쳤어요'); 
    const typed = await pg.$eval(sel, (e) => e.value);
    await pg.click(`[data-fk="lsc:${key}:nar"]`); await pg.waitForTimeout(350);   /* 칸에서 나가지 않은 채 바로 */
    const mid = await pg.evaluate((a) => ({ vt: JSON.stringify(S.vtext || {}), pv: S.pvText || '', up: Object.keys(S.up || {}).length, v: (document.querySelector('[data-fk="lsc:' + a.key + ':nar"]') || {}).getAttribute ? document.querySelector('[data-fk="lsc:' + a.key + ':nar"]').getAttribute('aria-checked') : '' }), { k, key });   /* v = 정말 스튜디오로 바뀌었나(칩 aria-checked · 칸에서 나올 때 다시 그려져 누르기가 삼켜지면 이 검사는 헛돈다 · 깨 보고 찾았다 [BLUR_TAP]) */
    await pg.click(`[data-fk="lsc:${key}:ai"]`); await pg.waitForTimeout(400);
    const back = await pg.$eval(sel, (e) => e.value).catch(() => '(칸 없음)');
    const keys1 = await pg.evaluate(() => Object.keys(S.vtext || {})), backV = await pg.getAttribute(`[data-fk="lsc:${key}:ai"]`, 'aria-checked').catch(() => '');
    const def = await pg.evaluate((k) => (k === 'prevideo' ? '' : _vtDef(k === 'guest' ? 'g1' : 'entry')), k);
    vk[k] = { same: back === typed, notDefault: back !== def && /우리 말로 고쳤어요$/.test(back), keysKept: keys0.every((x) => keys1.includes(x)), midKept: k === 'prevideo' ? /우리 말로 고쳤어요/.test(mid.pv) : /우리 말로 고쳤어요/.test(mid.vt), switched: mid.v === 'true' && backV === 'true', mv: mid.v, bv: backV };
  }
  ok(W + ` 적다가 스튜디오 → 다시 AI — 하객 맞이 · 식전 영상 소개글 · 입장 멘트 글이 그대로 · 기본 글로 안 바뀜 · 저장된 키가 줄지 않음 · 스튜디오인 동안에도 지워지지 않음 [VT_KEEP_SWITCH]`, Object.values(vk).every((x) => x && x.switched && x.same && x.notDefault && x.keysKept && x.midKept), JSON.stringify(vk));
  /* [VT_KEEP_SWITCH] 창(«나레이션 자세히» → 스튜디오 나레이션 → 다시 AI · 세 자리를 한꺼번에)으로 바꿔도 같다 */
  await pg.evaluate(() => { mkGo('guest'); render(); }); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkvt:g2"]'); await pg.keyboard.press('End'); await pg.keyboard.type(' 창으로 바꿔도');
  const t2 = await pg.$eval('[data-fk="mkvt:g2"]', (e) => e.value);
  await pg.evaluate(() => document.activeElement && document.activeElement.blur()); await pg.waitForTimeout(300);   /* 창 단추는 화면 위쪽 — 칸에서 먼저 나온다(칸에서 나오면 다시 그려진다) */
  await pg.click('[data-fk="mkvsopen"]'); await pg.waitForTimeout(400); await pg.click('[data-fk="mkvs:nar"]'); await pg.waitForTimeout(400);
  const midW = await pg.evaluate(() => ({ v: S.guestVoice, g2: (S.vtext || {}).g2 || '' }));
  await pg.click('[data-fk="mkvsopen"]'); await pg.waitForTimeout(400); await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(500);
  const backW = await pg.$eval('[data-fk="mkvt:g2"]', (e) => e.value).catch(() => '(칸 없음)');
  ok(W + ' 창으로 스튜디오 → 다시 AI 해도 하객 맞이 g2 글이 그대로 [VT_KEEP_SWITCH]', midW.v === 'nar' && midW.g2 === t2 && backW === t2, JSON.stringify({ midW, backW: backW.slice(-12), t2: t2.slice(-12) }));
  /* ★[LINE_NO_SEC 2026-10-03 사장님] 줄 카드 머리의 «약 n초»는 없다(AI · 직접 녹음 판 모두) — 덧말(«식전 영상이 끝난 뒤에 흘러요» · «두 분이 한 문장씩 번갈아»)은 홀로 · 빈 덧말 줄 없음 · 소개글을 적어도 머리에 초가 안 생긴다 */
  const ls = {};
  for (const [k, v] of [['guest', 'ai'], ['prevideo', 'ai'], ['entry', 'ai'], ['guest', 'couple'], ['entry', 'couple']]) {
    await pg.evaluate(([k, v]) => { const key = k === 'guest' ? 'guestVoice' : k === 'prevideo' ? 'pvVoice' : 'entryVoice'; VS.inPick = true; try { _lSet(key, v); } finally { VS.inPick = false; } VS.open = false; opSync(); mkGo(k); render(); }, [k, v]); await pg.waitForTimeout(350);
    if (k === 'prevideo') { const ta = await pg.$('#mkPvTa'); if (ta) { await ta.click(); await pg.keyboard.type('짧은 소개'); } }
    ls[k + ':' + v] = await pg.evaluate(() => ({ heads: [...document.querySelectorAll('.mk-vc .mk-vhd')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()), empty: [...document.querySelectorAll('.mk-vc .mk-vs')].filter((x) => !x.textContent.trim()).length }));
  }
  const allHeads = Object.values(ls).flatMap((x) => x.heads);
  const g3 = (ls['guest:ai'].heads.find((h) => /시작 1분 전/.test(h)) || '');
  ok(W + ` 줄 카드 머리에 «약 n초» 없음(${allHeads.length}장) · 덧말은 홀로(«${g3.replace('시작 1분 전', '').trim().slice(0, 24)}») · 빈 덧말 줄 0 [LINE_NO_SEC]`, allHeads.length >= 8 && !allHeads.some((h) => /약\s?\d+\s?초/.test(h)) && Object.values(ls).every((x) => x.empty === 0) && /^시작 1분 전\s*식전 영상이 끝난\s*뒤에\s*흘러요/.test(g3), JSON.stringify(ls).slice(0, 500));
  ok(W + ' 화면 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? `\n✗ VOICE_SETUP ${fail}건 실패` : '\n✓ VOICE_SETUP 통과');
process.exit(fail ? 1 : 0);
