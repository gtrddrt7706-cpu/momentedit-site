#!/usr/bin/env node
/* ★[BGM_VOL_ONE_1106 검토 D 2026-11-06] 당일 콘솔을 새로 열고 처음 «시작» — 배경 재생기 셋(aBgm · aBgm2 · aBgm3)이 Web Audio 로 이어진 뒤 볼륨 1 · 첫 곡이 실제로 들린다
   종전: AC 가 생기기 전 대체 경로(bedVolFb)가 쉬는 재생기를 0 으로 둬, 이어 붙인 뒤 그 재생기로 간 곡이 무음(마지막 리미터 뒤 −200 dB)
   T01 시작 5초 뒤 — 재생 중인 배경 재생기 볼륨 1 · 리미터 뒤 신호 −60 dB 위
   BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), CON = process.env.BP_CON || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': u.endsWith('.html') ? 'text/html' : u.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
try {
  const pg = await br.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; const oc = AudioNode.prototype.connect; AudioNode.prototype.connect = function (d, ...r) { const out = oc.call(this, d, ...r); try { if (d instanceof AudioDestinationNode && this instanceof DynamicsCompressorNode) { const c = this.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 4096; window.__AN = c.__an; } oc.call(this, c.__an); } } catch (e) {} return out; }; });
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' }));
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.waitForTimeout(1500);
  const SR = 22050, n = SR * 40, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 220 * i / SR)), 44 + i * 2);
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bgmvol-')); fs.writeFileSync(path.join(TMP, 'M1.wav'), b);
  await pg.setInputFiles('.sg[data-seg="M1"] .sg-song:nth-of-type(1) [data-seg-file]', path.join(TMP, 'M1.wav')); await pg.waitForTimeout(1200);
  await pg.click('#go'); await pg.waitForTimeout(5000);
  const r = await pg.evaluate(() => { const els = [...document.querySelectorAll('audio')].filter((e) => /^aBgm/.test(e.id)).map((e) => ({ id: e.id, play: !e.paused, v: e.volume }));
    let db = -200; if (window.__AN) { const td = new Float32Array(4096); window.__AN.getFloatTimeDomainData(td); let q = 0; td.forEach((x) => { q += x * x; }); db = Math.round(20 * Math.log10(Math.sqrt(q / td.length) || 1e-10) * 10) / 10; } return { els, db }; });
  const playing = r.els.filter((e) => e.play);
  ok('T01 새로 연 콘솔 첫 «시작» — 배경 재생기 볼륨 1(이어 붙인 뒤) · 첫 곡이 들린다(리미터 뒤 −60 dB 위)', playing.length > 0 && r.els.every((e) => e.v === 1) && r.db > -60, r);
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `BGM VOL FAIL ${fail}` : 'BGM VOL OK');
process.exit(fail ? 1 : 0);
