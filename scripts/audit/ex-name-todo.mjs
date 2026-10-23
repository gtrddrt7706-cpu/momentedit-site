#!/usr/bin/env node
/* ★[EX_NAME_TODO_1023 GPT 검토 ① · 음성 섹션 전달] 예시 속 이름(EX_NAMES)이 남은 글칸은 «다 됐어요»가 아니다.
   종전 — 글칸 아래 «예시 속 이름 «서준»이 남아 있어요» 경고는 떴는데 순간 목록은 ✓ · 한눈에 보기 «두 분이 할 말»에도 안 나왔다.
   잰다(PC 1280 · 실제 빌더): 서약 신랑 칸에 예시 이름 → 그 칸 미완료 · 넘길 때 묻는 글 · 한눈에 보기 줄이 «예시 속 이름이 남아 있어요»
   이름을 두 분 이야기로 바꾸면 → 다 됨 · 빈 칸은 종전대로 «칸이 비어 있어요»
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
const pg = await br.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(450); };
await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
const look = (g, b) => pg.evaluate(([g, b]) => {
  S.on.vow = 1; S.tx = S.tx || {}; S.tx['vow.g'] = g; S.tx['vow.b'] = b; S.txLn = {}; if (S.mkc) { delete S.mkc['vow.g']; delete S.mkc['vow.b']; }
  const t = _mkTasks('vow').filter((x) => x.kind === 'tx'); const sum = document.createElement('div'); sum.innerHTML = _mkSum();
  const row = [...sum.querySelectorAll('.mk-vr')].find((li) => /혼인 서약/.test(li.textContent));
  return { done: t.map((x) => x.done), leave: _mkLeaveMsg('vow'), row: row ? row.textContent : '' };
}, [g, b]);
const withName = await look('서준아, 오늘부터 매일 아침 당신 편이 될게요.', '나는 당신의 가장 가까운 친구가 될게요.');
ok('예시 이름이 남은 신랑 칸 — 미완료 · 이름 없는 신부 칸은 다 됨', withName.done[0] === false && withName.done[1] === true, JSON.stringify(withName.done));
ok('넘길 때 묻는 글 — «신랑 칸에 예시 속 이름이 남아 있어요»', /신랑 칸에 예시 속 이름이 남아 있어요/.test(withName.leave), withName.leave);
ok('한눈에 보기 «두 분이 할 말» 줄에도 나온다', /신랑 칸에 예시 속 이름이 남아 있어요/.test(withName.row), withName.row);
const mine = await look('민호야, 오늘부터 매일 아침 당신 편이 될게요.', '나는 당신의 가장 가까운 친구가 될게요.');
ok('두 분 이야기로 바꾸면 다 됨', mine.done.every(Boolean) && !mine.leave, JSON.stringify(mine));
const empty = await look('', '나는 당신의 가장 가까운 친구가 될게요.');
ok('빈 칸은 종전대로 «신랑 칸이 비어 있어요»', /신랑 칸이 비어 있어요/.test(empty.leave) && !/예시 속 이름/.test(empty.leave), empty.leave);
ok('화면 오류 없음', !errs.length, errs.slice(0, 2).join(' | '));
await br.close(); srv.close();
console.log(fail ? `✗ EX_NAME_TODO_1023 실패 ${fail}건` : 'ok ex-name-todo — 예시 이름이 남은 칸은 미완료 · 묻는 글 · 한눈에 보기 줄까지');
process.exit(fail ? 1 : 0);
