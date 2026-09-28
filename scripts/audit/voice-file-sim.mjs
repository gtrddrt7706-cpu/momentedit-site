#!/usr/bin/env node
/* ★[VOICE_KEEP_SIM 2026-09-28 코워크 0928 8-6] api/voice-file.js 흉내 시험 — 네트워크 없이 판정만.
   보는 것: POST 만 · 토큰은 본문에서만(주소에 없음) · GAS 에 ritualFileGet 으로 묻는다 · attachment 로 돌려준다(카톡 앱 안 내려받기) ·
     파일 이름 · 확장자 · 못 받으면 404 한 줄 · 4.3MB 넘으면 413 · 콘솔에 토큰 · 소리를 찍지 않는다
   종료 코드 0 = 통과 · 1 = 실패 */
import { createRequire } from 'node:module'; import { Readable } from 'node:stream';
const require = createRequire(import.meta.url);
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const logs = []; const _log = console.log; const _err = console.error; const _warn = console.warn;
const handler = require('../../api/voice-file.js');
function req(method, body) { const r = Readable.from([Buffer.from(body || '')]); r.method = method; r.headers = { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '1.2.3.' + Math.floor(Math.random() * 250) }; r.socket = { remoteAddress: '1.2.3.4' }; return r; }
function res() { const h = {}; return { statusCode: 200, headers: h, body: null, setHeader(k, v) { h[k.toLowerCase()] = v; }, end(b) { this.body = b; } }; }
async function run(method, form, gas) {
  let sent = null; global.fetch = async (url, o) => { sent = { url, o }; return { json: async () => gas }; };
  console.log = (...a) => logs.push(a.join(' ')); console.error = console.log; console.warn = console.log;
  const r = res(); await handler(req(method, new URLSearchParams(form || {}).toString()), r);
  console.log = _log; console.error = _err; console.warn = _warn; return { r, sent };
}
const WAV = Buffer.from('RIFF0000WAVEfmt ').toString('base64');
let x = await run('GET', {}, null);
ok('GET 은 받지 않는다(405) — 토큰을 주소에 싣지 않는다', x.r.statusCode === 405 && !x.sent);
x = await run('POST', { token: 'TOKEN_SECRET_1', id: 'FILEID_abcdef0123', name: '두 분 목소리 하객 입장 때' }, { ok: true, mime: 'audio/wav', data: WAV });
const q = x.sent ? JSON.parse(x.sent.o.body) : {};
ok('GAS 에 ritualFileGet · 토큰 · 파일 id 를 본문으로 묻는다', q.action === 'ritualFileGet' && q.token === 'TOKEN_SECRET_1' && q.id === 'FILEID_abcdef0123' && !/TOKEN_SECRET_1/.test(x.sent.url), JSON.stringify(q));
ok('attachment 로 돌려준다 · 이름 · .wav · 저장 안 함(no-store)', x.r.statusCode === 200 && /^attachment;/.test(x.r.headers['content-disposition']) && /%EB%91%90/.test(x.r.headers['content-disposition']) && /\.wav/.test(decodeURIComponent(x.r.headers['content-disposition'])) && x.r.headers['cache-control'] === 'no-store' && Buffer.isBuffer(x.r.body), JSON.stringify(x.r.headers));
x = await run('POST', { token: 'T2', id: 'FILEID_abcdef0123' }, { ok: true, mime: 'audio/mpeg', data: WAV });
ok('mp3 면 .mp3', /\.mp3/.test(decodeURIComponent(x.r.headers['content-disposition'] || '')));
x = await run('POST', { token: 'T3', id: 'FILEID_abcdef0123' }, { ok: false, error: '파일을 찾을 수 없어요.' });
ok('못 받으면 404 · 서버 한 줄 그대로', x.r.statusCode === 404 && /파일을 찾을 수 없어요/.test(String(x.r.body)));
x = await run('POST', { token: 'T4', id: '../../etc' }, null);
ok('이상한 id 는 GAS 를 부르지 않고 400', x.r.statusCode === 400 && !x.sent);
x = await run('POST', { token: 'T5', id: 'FILEID_abcdef0123' }, { ok: true, mime: 'audio/wav', data: Buffer.alloc(4.5 * 1024 * 1024).toString('base64') });
ok('4.3MB 넘으면 413 · 안내 한 줄', x.r.statusCode === 413 && /저희에게 말씀해 주시면/.test(String(x.r.body)));
ok('토큰 · 소리를 콘솔에 찍지 않는다', !logs.some((l) => /TOKEN_SECRET_1|RIFF/.test(l)), logs.join(' | '));
_log(fail ? `\n★ 실패 ${fail}건` : '\nVOICE FILE SIM OK'); process.exit(fail ? 1 : 0);
