// ★★[SAY_INLINE_1123 2026-11-23 사장님 «너의 추천대로하고 전부 적용»(3안 · 흐름에서 바로)] «두 분이 할 말» 따로 상자를 걷고 글을 흐름 차례 줄 바로 아래에 (390 · 1280)
//   ① 상자가 없다 — .mk-say · 머리 «두 분이 할 말»(h4) 없음
//   ② 글칸은 흐름(.mk-flowsec .mk-flow) 안 «신랑 차례 · 신부 차례»(축배 «신랑 한마디 · 신부 한마디») 줄 아래 · 신랑 줄이 먼저 · 번갈아 서약은 «두 분 번갈아» 줄 아래 줄 편집기
//   ③ 참고 예시 칩 줄은 흐름 위(첫 흐름 줄보다 앞 · «이 순간 전체 듣기» 뒤) · 예시 이름 알림과 «n자 · 약 n초»는 한 줄(.mk-saym)
//   ④ 적고 떠나면 S.tx 에 그대로 · 칸이 가라앉고(saved) 아래 알림 한 줄 · 「현장에서 바로 할게요」를 고르면 글칸 대신 끝 신호 칸(마지막 분) · 다음 분 한 줄(먼저 하는 분)
//   ⑤ 4줄 넘는 글은 접힌다(펼치기 · 접기) · 감사문 · 서약은 «마지막 한 문장은 …» 줄 아래 끝 문장 · 390 가로 넘침 없음
//   --selftest = 글칸을 옛 상자(.mk-say)로 옮겨 놓고 이 검사가 빨개지는지 본다(죽은 검사 막기)
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const SELF = process.argv.includes('--selftest');
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
let fail = 0; const ok = (m, c, d) => { if (!SELF || !c) console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// 순간 · 판 — kind = S.tx 열쇠 머리 · lab = 차례 줄 이름 끝
const CASES = [
  { n: '감사 인사', k: 'welcome', kind: 'welcome', lab: '차례' },
  { n: '감사문', k: 'welcome', kind: 'welcome', lab: '차례', thanks: 1, both: D.THANKSBOTH },
  { n: '서약 · 각자 차례로', k: 'vow', kind: 'vow', lab: '차례', each: 1, both: 'vow' },
  { n: '서약 · 한 줄씩 번갈아', k: 'vow', kind: 'vow', alt: 1, both: 'vow' },
  { n: '편지', k: 'letter', kind: 'letter', lab: '차례' },
  { n: '부모님께 인사', k: 'tribute', kind: 'tribute', lab: '차례' },
  { n: '축배', k: 'toast', kind: 'toast', lab: '한마디' },
];
const setup = (c) => { courseStarted = true; S.course = 'open'; S.on = { welcome: 1, vow: 1, ring: 1, declare: 1, letter: 1, tribute: 1, toast: 1 };
  delete S.welcomeKind; if (c.thanks) S.welcomeKind = 'thanks'; if (c.each) S.vowHow = 'each'; else delete S.vowHow; S.tx = {}; S.mkc = {}; S.cueSig = {};
  try { opSync(); } catch (e) {} for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo(c.k); };
const BREAK = () => { const sec = document.createElement('section'); sec.className = 'mk-sec mk-say'; sec.innerHTML = '<h4>두 분이 할 말</h4>'; document.querySelector('.mk-pg').appendChild(sec);
  document.querySelectorAll('.mk-flow li.mk-sayli').forEach((li) => { sec.appendChild(li.cloneNode(true)); li.remove(); }); };
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (/script\.google\.com/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); return rt.fulfill({ status: 200, body: '' }); });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
    for (const c of CASES) {
      await pg.evaluate(setup, c); await wait(500);
      await pg.click(`[data-fk="mkrc:${c.k}:0"]`).catch(() => {}); await wait(400);
      if (SELF) await pg.evaluate(BREAK);
      const a = await pg.evaluate(({ c }) => {
        const flow = document.querySelector('.mk-pg .mk-flowsec .mk-flow'), lis = [...document.querySelectorAll('.mk-flow li.mk-sayli')];
        const g = document.getElementById(c.alt ? 'mkt_vow_g' : 'mkt_' + c.kind + '_g'), b = document.getElementById(c.alt ? 'mkt_vow_b' : 'mkt_' + c.kind + '_b');
        const liOf = (t) => t && t.closest('li.mk-sayli'), lab = (t) => { const li = liOf(t); return li ? (li.querySelector('.mk-sayh b') || {}).textContent || '' : ''; };
        const chip = document.querySelector('[data-fk^="mkrc:' + c.k + ':"]'), first = flow && flow.querySelector(':scope>li'), play = document.querySelector('.mk-pg .mk-sech-r');
        const before = (x, y) => !!(x && y && (x.compareDocumentPosition(y) & 4));
        const both = [...document.querySelectorAll('.mk-flow li.mk-sayq .mk-vwfix')].map((x) => x.textContent);
        const sayQ = document.querySelector('.mk-flow li.mk-sayq .qa');
        const meta = g && liOf(g) && liOf(g).querySelector('.mk-saym');
        return { box: document.querySelectorAll('.mk-say').length, h4: [...document.querySelectorAll('.mk-pg h4')].filter((h) => /두 분이 할 말/.test(h.textContent)).length,
          lis: lis.length, gIn: !!(g && liOf(g) && flow && flow.contains(g)), bIn: !!(b && liOf(b) && flow && flow.contains(b)), gLab: lab(g), bLab: lab(b), order: before(g, b),
          alt: !!(g && g.closest('li.mk-sayalt')), chipTop: before(chip, first), playChip: play ? before(play, chip) : true,
          meta: !!(meta && meta.querySelector('.mk-exw') && meta.querySelector('.mk-cnt')), both, bothVow: _vowBoth(), sayQ: sayQ ? sayQ.textContent : '',
          sw: document.scrollingElement.scrollWidth, cw: document.documentElement.clientWidth };
      }, { c });
      const tag = `${w} ${c.n}`;
      ok(`${tag} ① 따로 상자 없음(.mk-say ${a.box} · «두 분이 할 말» 머리 ${a.h4})`, a.box === 0 && a.h4 === 0, JSON.stringify(a));
      if (c.alt) ok(`${tag} ② 번갈아 줄 편집기가 흐름 «두 분 번갈아» 줄 아래`, a.gIn && a.alt && a.lis === 1, JSON.stringify(a));
      else ok(`${tag} ② 글칸이 흐름 «신랑 ${c.lab} · 신부 ${c.lab}» 줄 아래 · 신랑 먼저`, a.gIn && a.bIn && a.gLab === '신랑 ' + c.lab && a.bLab === '신부 ' + c.lab && a.order && a.lis === 2, JSON.stringify(a));
      ok(`${tag} ③ 참고 예시 칩 줄이 흐름 위(«이 순간 전체 듣기» 뒤) · 예시 이름 알림 + 글자 수 한 줄`, a.chipTop && a.playChip && a.meta, JSON.stringify(a));
      if (c.both) { const want = c.both === 'vow' ? a.bothVow : c.both; ok(`${tag} ⑤ «마지막 한 문장은 …» 줄 아래 끝 문장(${want.join(' ').slice(0, 20)}…)`, JSON.stringify(a.both) === JSON.stringify(want) && /^마지막 한 문장은/.test(a.sayQ), JSON.stringify(a.both)); }
      if (w === 390) ok(`${tag} ⑤ 390 가로 넘침 없음(${a.sw} ≤ ${a.cw})`, a.sw <= a.cw, '');
    }
    /* ④ 적고 떠나기 · 현장에서 바로 · ⑤ 접기 — 감사 인사 */
    await pg.evaluate(setup, CASES[0]); await wait(500);
    if (SELF) await pg.evaluate(BREAK);
    const T1 = '저희 두 사람 오늘 와 주셔서 고맙습니다.';
    await pg.click('#mkt_welcome_g').catch(() => {}); await pg.fill('#mkt_welcome_g', T1).catch(() => {}); await pg.click('#mkHead').catch(() => {}); await wait(250);
    const s1 = await pg.evaluate(() => ({ v: String((S.tx || {})['welcome.g'] || ''), leg: S.welcomeText || '', saved: !!document.querySelector('#mkt_welcome_g.saved'), toast: ((document.getElementById('lsToast') || {}).textContent || '').trim(),
      inFlow: !!(document.getElementById('mkt_welcome_g') || { closest: () => null }).closest('.mk-flow') }));
    ok(`${w} ④ 적고 떠나면 S.tx 그대로 · 옛 한 칸(welcomeText)도 · 칸이 가라앉고(saved) 알림 «${s1.toast}»(20자 안)`, s1.v === T1 && s1.leg.indexOf(T1) > -1 && s1.saved && s1.inFlow && /남겨 뒀어요|남기지 못했어요/.test(s1.toast) && s1.toast.length <= 20, JSON.stringify(s1));
    await pg.click('[data-fk="mkchk:welcome.b"]').catch(() => {}); await wait(300);
    await pg.click('[data-fk="mkchk:welcome.g"]').catch(() => {}); await wait(300);
    const s2 = await pg.evaluate(() => { const cue = document.getElementById('mkcue_welcome_b'), nx = document.querySelector('.mk-flow li.mk-sayli.site .mk-cue-first');
      return { cue: !!(cue && cue.closest('.mk-flow li.mk-sayli')), next: !!nx, ta: !!document.getElementById('mkt_welcome_b') || !!document.getElementById('mkt_welcome_g'), mkc: Object.assign({}, S.mkc), keep: String((S.tx || {})['welcome.g'] || '') }; });
    ok(`${w} ④ «현장에서 바로 할게요» — 신부(마지막) 줄은 끝 신호 칸 · 신랑 줄은 다음 분 한 줄 · 글칸은 걷히고 적은 글은 그대로`, s2.cue && s2.next && !s2.ta && s2.mkc['welcome.b'] && s2.mkc['welcome.g'] && s2.keep === T1, JSON.stringify(s2));
    await pg.click('[data-fk="mkchk:welcome.g"]').catch(() => {}); await wait(300);
    const LONG = Array.from({ length: 9 }, (_, i) => `오늘 이 자리에 함께해 주신 모든 분께 ${i + 1}번 감사드립니다.`).join(' ');
    await pg.evaluate((t) => { S.tx['welcome.g'] = t; MK.sayOpen = {}; render(); }, LONG); await wait(300);
    if (SELF) await pg.evaluate(BREAK);
    const f1 = await pg.evaluate(() => { const t = document.getElementById('mkt_welcome_g'), b = document.querySelector('.mk-sayfold[aria-controls="mkt_welcome_g"]'); return { clip: !!(t && t.classList.contains('clip')), btn: b && !b.hidden ? b.textContent : '', h: t ? t.offsetHeight : 0, sh: t ? t.scrollHeight : 0 }; });
    await pg.click('.mk-sayfold[aria-controls="mkt_welcome_g"]').catch(() => {}); await wait(200);
    const f2 = await pg.evaluate(() => { const t = document.getElementById('mkt_welcome_g'), b = document.querySelector('.mk-sayfold[aria-controls="mkt_welcome_g"]'); return { clip: !!(t && t.classList.contains('clip')), btn: b ? b.textContent : '', exp: b ? b.getAttribute('aria-expanded') : '' }; });
    ok(`${w} ⑤ 4줄 넘는 글은 접힘 «펼치기» → 누르면 펼침 «접기»`, f1.clip && f1.btn === '펼치기' && f1.h < f1.sh && !f2.clip && f2.btn === '접기' && f2.exp === 'true', JSON.stringify([f1, f2]));
    ok(`${w} 화면 오류 없음`, !errs.length, errs.join(' | ').slice(0, 300));
    await pg.close();
  }
} catch (e) { console.log('못 쟀다 — ' + e.message); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
if (SELF) { console.log(fail ? `ok  selftest — 옛 상자로 옮기자 ${fail}건 빨강(검사가 살아 있다)` : 'FAIL selftest — 옛 상자로 옮겨도 초록(죽은 검사)'); process.exit(fail ? 0 : 1); }
console.log(fail ? `FAIL ${fail}건 [SAY_INLINE_1123]` : 'ok  두 분이 할 말 = 흐름 차례 줄 아래 [SAY_INLINE_1123]');
process.exit(fail ? 1 : 0);
