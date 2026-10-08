// ★[FLOW_PLAIN · FLOW_NONAMES · SHORT_TOAST · NOTE_UNDER 2026-10-07 사장님 «그래프가 찐빵 · 그래프 밑 글씨가 빽빽 · 단체 사진 문구는 아래 팝업으로 잠깐» → «전부 추천대로»] (1280 · 390)
//   ①그림 밑 순간 이름 줄 없음(글자는 정점 이름 하나) · PC 그림 높이 120 ②단체 사진 문구는 판 · 막대 · 띠 어디에도 상자로 없다
//   ★[FLOW_MOOD 2026-10-08 사장님 «닫는 인사도 포인트 · 입장도 넣고» → «추천대로»] ①⑤의 «글자는 정점 이름 하나»를 넓혔다 — 글자는 모두 곡선 위 이름표(.flow-name · 정점 + 입장 · 닫는 인사 · 테이블 인사 · 넷까지)이고 서로 안 겹친다. «그림 밑 이름 줄»은 여전히 없다
//   ③담아서 단체 사진이 부족해지는 순간 아래 알림 한 번 · 4초 뒤 사라짐 · 더 줄면 다시 한 번
//   ④단추가 있는 알림(앉아서 듣는 순간이 셋)은 PC 에서 그림 바로 아래 · 오른쪽 칸 아님 ⑤④ 완성 그림도 이름 줄 없음
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
/* [FLOW_MOOD] 곡선 글자 재기 — 글자 수 · 이름표(.flow-name) 수 · 서로 겹친 짝 수 */
const NAMES = `(sv) => { const ts = [...sv.querySelectorAll('text')], bs = ts.map((t) => t.getBoundingClientRect()); let ov = 0;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) ov++; }
  return { texts: ts.length, named: ts.filter((t) => t.classList.contains('flow-name')).length, overlap: ov }; }`;
const NAMES_OK = (o, min) => !!o && o.texts >= min && o.texts <= 4 && o.named === o.texts && o.overlap === 0;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const next = async (pg) => { await pg.waitForTimeout(450); await pg.evaluate(() => document.getElementById('next').click()); };
const toPick = async (pg) => { await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700); await next(pg); await wait(350); await next(pg); await wait(450); };
const SHOT = process.env.SHOT || '';
try { for (const w of [1280, 390]) { const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); await toPick(pg);
  await pg.click('[data-fk="opx:family"]'); await wait(500);
  const a = await pg.evaluate((src) => { const sv = document.querySelector('#pkFlow .pk-fg svg'); return Object.assign(sv ? (0, eval)(src)(sv) : { texts: -1 }, { h: sv ? Math.round(sv.getBoundingClientRect().height) : 0 }); }, NAMES);
  ok(`${w} ① 그림 밑 이름 줄 없음(글자 = 곡선 위 이름표 · 넷까지 · 안 겹침)${w >= 1000 ? ' · 높이 120' : ''}`, NAMES_OK(a, 1) && (w < 1000 || a.h === 120), JSON.stringify(a));
  await pg.evaluate(() => opTgl('free')); await wait(250);
  const b = await pg.evaluate(() => { const u = document.getElementById('pkUndo'); return { pa: RitualOpen.span(S).pa, toast: u && !u.hidden ? u.textContent : '', box: /천천히 진행되면|단체 사진이 약/.test(((document.querySelector('#pkFlow') || {}).textContent || '') + ((document.getElementById('pkSlim') || {}).textContent || '') + ((document.querySelector('.cta-al') || {}).textContent || '')) }; });
  ok(`${w} ③ 순간을 담아 단체 사진이 짧아져도 아래 알림 없음(알아서 하게 두기 · SHORT_TOAST_OFF 2026-10-09)`, !/단체 사진이 약|시간이 모자라요|순간을 하나 덜면/.test(b.toast), JSON.stringify(b));
  ok(`${w} ② 단체 사진 문구가 판 · 막대 · 띠에 상자로 없다`, !b.box, JSON.stringify(b));
  if (SHOT) await pg.screenshot({ path: SHOT + '-toast-' + w + '.png' });
  await wait(4300); const c = await pg.evaluate(() => { const u = document.getElementById('pkUndo'); return !u || u.hidden; });
  ok(`${w} ③ 4초 뒤 사라짐`, c, String(c));
  await pg.evaluate(() => opTgl('letter')); await wait(250);
  const d = await pg.evaluate(() => { const u = document.getElementById('pkUndo'); return u && !u.hidden ? u.textContent : ''; });
  ok(`${w} ③ 더 줄어도 알림 없음(SHORT_TOAST_OFF)`, !/단체 사진이 약|시간이 모자라요|순간을 하나 덜면/.test(d), d);
  await pg.evaluate(() => { S.on = {}; ['bless', 'vow', 'tribute'].forEach((k) => { S.on[k] = 1; }); opSync(); }); await wait(500);
  const e = await pg.evaluate(() => { const n = document.querySelector('#pkFlow .op-note'), sv = document.querySelector('#pkFlow .pk-fg svg'), sd = document.querySelector('#pkFlow .pk-side'); if (!n) return null; const nr = n.getBoundingClientRect(), gr = sv && sv.getBoundingClientRect(), sr = sd.getBoundingClientRect(); return { inSide: !!n.closest('.pk-side'), below: gr ? Math.round(nr.top - gr.bottom) : null, leftOfSide: nr.right <= sr.left + 1, t: n.textContent.slice(0, 24) }; });
  ok(`${w} ④ 단추 알림은 판에 남는다${w >= 1000 ? ' · PC 는 그림 바로 아래(오른쪽 칸 아님)' : ''}`, e && !e.inSide && (w < 1000 || (e.leftOfSide && e.below >= 0 && e.below <= 40)), JSON.stringify(e));
  if (SHOT && w >= 1000) { await pg.evaluate(() => document.querySelector('#pkFlow').scrollIntoView({ block: 'center' })); await wait(300); await (await pg.$('#pkFlow')).screenshot({ path: SHOT + '-note-' + w + '.png' });
    await pg.evaluate(() => { S.on = {}; RitualOpen.applyExample(S, 'family'); opSync(); }); await wait(500); await (await pg.$('#pkFlow')).screenshot({ path: SHOT + '-plain-' + w + '.png' }); }
  const f = await pg.evaluate((src) => { idx = STEPS.length - 1; render(); return new Promise((r) => setTimeout(() => { const sv = document.querySelector('.done-flow [data-fg="done"] svg'); r(sv ? (0, eval)(src)(sv) : { texts: -1 }); }, 500)); }, NAMES);
  ok(`${w} ⑤ 완성 그림도 이름 줄 없음`, NAMES_OK(f, 0), JSON.stringify(f));
  ok(`${w} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nFLOW PLAIN FAIL ${fail}` : '\nFLOW PLAIN OK'); process.exit(fail ? 1 : 0);
