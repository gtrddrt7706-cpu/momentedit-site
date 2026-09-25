// 솔라피 «메시지 리포트» 웹훅 중계(api/solapi-report.js)가 제 일을 하는가 — 진짜 모듈을 불러 가짜 요청으로 돌린다.
//
// ★[SOLAPI_RELAY 2026-09-25] GAS /exec 에 웹훅을 바로 걸었더니 처리는 됐는데 솔라피가 실패로 셌다(302 답).
//   8번이면 웹훅이 꺼진다. 중계가 «넘기고 200» 을 제대로 하는지, 넘기면 안 되는 것은 안 넘기는지 본다.
//   ★함수를 베껴 쓰지 않는다 — api/solapi-report.js 를 그대로 require 하고, 바깥(fetch·요청·응답)만 흉내 낸다.
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const require = createRequire(import.meta.url);
let relay;
try { relay = require('../../api/solapi-report.js'); } catch (e) { console.log('━━ solapi-relay — 모듈을 못 불렀습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
if (typeof relay !== 'function') { console.log('━━ solapi-relay — 내보낸 함수가 없습니다 · 재지 못했습니다'); process.exit(2); }

const HOOK = 'https://script.google.com/macros/s/TEST/exec';
let calls = [];
let gasReply = { status: 200, body: { ok: true } };
let gasThrow = null;
globalThis.fetch = async (url, opt) => {
  calls.push({ url, opt });
  if (gasThrow) { const e = new Error(gasThrow); e.name = gasThrow; throw e; }
  return { ok: gasReply.status >= 200 && gasReply.status < 300, status: gasReply.status, json: async () => gasReply.body };
};

let ip = 0;
const call = async (method, body, env) => {
  process.env.VERCEL_ENV = env === undefined ? 'production' : env;
  process.env.HANDOFF_WEBHOOK_URL = HOOK;
  calls = [];
  const req = new EventEmitter();
  req.method = method; req.headers = { 'x-real-ip': '10.0.0.' + (++ip), 'content-type': 'application/json' };
  req.destroy = () => {};
  const res = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(s) { this.body = String(s || ''); } };
  const p = relay(req, res);
  setImmediate(() => { if (body != null) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))); req.emit('end'); });
  await p;
  return res;
};

let rc = 0;
const say = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 200)}`); if (!c) rc = 1; };
const REP = [{ messageId: 'M4V1', statusCode: '4000', statusMessage: '수신완료' }];

console.log('━━ solapi-relay — 솔라피 전달결과 리포트 중계 [SOLAPI_RELAY]');
{
  const src = (await import('node:fs')).readFileSync(new URL('../../api/solapi-report.js', import.meta.url), 'utf8');
  const m = src.match(/const WAIT_MS = (\d+);/);
  say(!!m && +m[1] <= 3000, 'GAS 기다림 한도가 3초 이하다(RELAY_WAIT · 솔라피 기본 Timeout 5초 − 콜드스타트 여유)', m ? m[1] + 'ms' : '못 찾음');
}
let r = await call('GET');
say(r.statusCode === 200 && calls.length === 0, 'GET(연결 확인)은 200 · GAS 를 부르지 않는다', r.statusCode);

gasReply = { status: 200, body: { ok: true, emailed: 0 } }; gasThrow = null;
r = await call('POST', REP);
say(r.statusCode === 200 && calls.length === 1 && calls[0].url === HOOK && calls[0].opt.method === 'POST' && calls[0].opt.body === JSON.stringify(REP),
  '리포트는 받은 그대로 GAS 로 넘기고 200', `${r.statusCode} · 호출 ${calls.length}`);
r = await call('POST', { messageId: 'M4V2', statusCode: '3104' });
say(r.statusCode === 200 && calls.length === 1, '객체 한 건 리포트도 넘긴다', r.statusCode);
const WRAP = { data: [{ messageId: 'M4V3', statusCode: '4000' }, { messageId: 'M4V4', statusCode: '3104' }] };
r = await call('POST', WRAP);
say(r.statusCode === 200 && calls.length === 1 && calls[0].opt.body === JSON.stringify(WRAP.data),
  '{"data":[…]} 로 감싼 리포트는 풀어서 배열로 넘긴다(RELAY_UNWRAP · GAS doPost 가 배열만 리포트로 읽는다)', `${r.statusCode} · ${calls[0] && String(calls[0].opt.body).slice(0, 60)}`);
r = await call('POST', { data: [] });
say(r.statusCode === 400 && calls.length === 0, '빈 data 는 넘기지 않는다', r.statusCode);
r = await call('POST', { data: [{ messageId: 'M' }], action: 'adminHome' });
say(r.statusCode === 400 && calls.length === 0, 'action 이 붙은 감싼 객체도 넘기지 않는다', `${r.statusCode} · 호출 ${calls.length}`);

gasReply = { status: 200, body: { ok: false, error: 'x' } };
r = await call('POST', REP);
say(r.statusCode === 502, 'GAS 가 오류를 돌려주면 502 — 솔라피가 다시 보낸다', r.statusCode);
gasReply = { status: 500, body: null };
r = await call('POST', REP);
say(r.statusCode === 502, 'GAS 가 500 이면 502', r.statusCode);

gasReply = { status: 200, body: { ok: true } }; gasThrow = 'AbortError';
r = await call('POST', REP);
say(r.statusCode === 200 && calls.length === 1, 'GAS 가 늦으면(3초) 넘긴 것으로 치고 200 — 실패가 쌓이지 않게', r.statusCode);
gasThrow = 'TypeError';
r = await call('POST', REP);
say(r.statusCode === 502, '넘기지도 못했으면(연결 오류) 502', r.statusCode);
gasThrow = null;

r = await call('POST', { action: 'adminHome', token: 'x' });
say(r.statusCode === 400 && calls.length === 0, '리포트 모양이 아니면 넘기지 않는다(범용 프록시 아님)', `${r.statusCode} · 호출 ${calls.length}`);
r = await call('POST', { messageId: 'M', action: 'x' });
say(r.statusCode === 400 && calls.length === 0, 'action 이 붙은 객체도 넘기지 않는다', `${r.statusCode} · 호출 ${calls.length}`);
r = await call('POST', []);
say(r.statusCode === 400 && calls.length === 0, '빈 배열은 넘기지 않는다', r.statusCode);
r = await call('POST', 'not json');
say(r.statusCode === 400 && calls.length === 0, 'JSON 이 아니면 넘기지 않는다', r.statusCode);

r = await call('POST', REP, 'preview');
say(r.statusCode === 200 && calls.length === 0, '미리보기 배포에서는 운영 시트에 쓰지 않는다(PREVIEW_GUARD_API)', `${r.statusCode} · 호출 ${calls.length}`);

r = await call('POST', 'x'.repeat(1024 * 1024 + 10));
say(r.statusCode === 413 && calls.length === 0, '1MB 를 넘으면 받지 않는다', r.statusCode);

console.log(rc ? '━━ solapi-relay — 틀린 곳이 있습니다' : '━━ solapi-relay — 전부 통과');
process.exit(rc);
