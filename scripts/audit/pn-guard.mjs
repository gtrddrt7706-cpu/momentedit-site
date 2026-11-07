#!/usr/bin/env node
/* ★[PN_GUARD_1107 2026-11-07 대본 · GPT 이음매 회귀 P_최종 v2] 이미 고친 둘을 지키는 검사(장부 «구현 대기» → 검사로 고정)
   P-N01 ④ 완성 저장(단독 화면) — 이 기기에 실제로 쓴 것을 읽어 확인한 뒤에만 «저장됨»([B2_NA_08]) · 저장 공간이 막히면 «저장하지 못했어요» 한 줄
   P-N04 ③ 글로 한눈에 보기 · 전체 대본 — «단체 사진을 마쳤습니다»는 한 번(촬영 후 안내 줄 · [B2_NA_47] · AFTER_IN_SCRIPT_1102)
   PN_OP = 깨 보기용 다른 order-preview 판 · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'); const OP = process.env.PN_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
await new Promise((x) => srv.listen(0, '127.0.0.1', x)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
async function page() { const ctx = await br.newContext({ viewport: { width: 390, height: 900 } }); const pg = await ctx.newPage();
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(900); return pg; }
const pg = await page();
const n4 = await pg.evaluate(() => { const r = {}; for (const ex of ['brief', 'jeongseok', 'record', 'family']) { S = RitualOpen.applyExample({ course: 'open' }, ex); courseStarted = true; try { buildSteps(); } catch (e) {}
  const t = scriptTextOpen(), b = String(_svBody()).replace(/<[^>]+>/g, ' '); r[ex] = [(t.match(/단체 사진을 마쳤습니다/g) || []).length, (b.match(/단체 사진을 마쳤습니다/g) || []).length]; } return r; });
ok('P-N04 «단체 사진을 마쳤습니다» 한 번(전체 대본 · 글로 한눈에 보기 · 예시 넷)', Object.values(n4).every((v) => v[0] === 1 && v[1] === 1), n4);
const n1 = await pg.evaluate(() => { S = RitualOpen.applyExample({ course: 'open' }, 'brief'); courseStarted = true; var out = {};
  var set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
  try { _doneSaved = false; _saveErr = ''; doSave(); out.bad = { saved: _doneSaved, err: _saveErr }; } finally { Storage.prototype.setItem = set; }
  _doneSaved = false; _saveErr = ''; _persistBad = false; doSave(); out.good = { saved: _doneSaved, err: _saveErr }; out.FAIL = SAVE_LOCAL_FAIL; return out; });
ok('P-N01 저장 공간이 막히면 «저장됨»이 아니다 · «저장하지 못했어요» 한 줄', n1.bad.saved === false && n1.bad.err === n1.FAIL && /저장하지 못했어요/.test(n1.FAIL), n1.bad);
ok('P-N01 정상 저장은 «저장됨»', n1.good.saved === true && !n1.good.err, n1.good);
await br.close(); srv.close();
console.log(fail ? `PN GUARD FAIL ${fail}` : 'PN GUARD OK'); process.exit(fail ? 1 : 0);
