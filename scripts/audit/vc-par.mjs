// ★[VC_PAR 2026-10-05 사장님 «왜 못 만드는 거지 · 이런 에러가 자주 있으면 안 되는데»] 80_production.gs 의 줄 만들기(make)를 GAS 없이 흉내 내어 잰다.
//   ①저장본이 없는 줄은 한꺼번에(fetchAll 한 번) ②요청 모양 = 종전 _vcTts 와 같다 ③저장 이름 = 종전 _vcCached 와 같다(이미 만든 소리가 맞는다)
//   ④두 번째는 저장본(업체에 안 묻는다) ⑤429 는 그 줄만 한 번 더 ⑥500 은 VCERR_ 기록 · 실패 ⑦60초 넘으면 VCSLOW_ 기록 ⑧순서는 줄 순서 그대로
//   종료 코드 0 = 통과 · 1 = 실패
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import crypto from 'node:crypto';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const src = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
function make() {
  const props = {}, files = new Map(), log = { fetchAll: [], fetch: [] };
  let plan = () => 200, now = 1e12;
  const bytesOf = (s) => Array.from(Buffer.from('MP3:' + s));
  const resp = (code, body) => ({ getResponseCode: () => code, getBlob: () => ({ getBytes: () => body }), getContentText: () => (code === 200 ? '' : JSON.stringify({ detail: 'err ' + code })) });
  const answer = (req) => { const j = JSON.parse(req.payload); const c = plan(j.text, req); return resp(c, bytesOf(j.text)); };
  const folder = { getFilesByName: (nm) => { const a = files.has(nm) ? [files.get(nm)] : []; let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; },
    createFile: (b) => { files.set(b.name, { isTrashed: () => false, getBlob: () => ({ getBytes: () => b.bytes }) }); } };
  const ctx = {
    console: { warn() {}, log() {} }, Logger: { log() {} }, JSON, Math, Array, Object, String, Number, Boolean, RegExp, Error, isFinite, parseInt, parseFloat,
    Date: Object.assign(function (...a) { return new Date(...a); }, { now: () => now }),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => ({ ...props }) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ put() {}, get: () => null }) },
    UrlFetchApp: { fetchAll: (reqs) => { log.fetchAll.push(reqs); return reqs.map(answer); }, fetch: (url, o) => { log.fetch.push({ url, o }); return answer(o); } },
    Utilities: { base64Encode: (b) => Buffer.from(b).toString('base64'), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'),
      computeDigest: (_a, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 },
      newBlob: (bytes, mime, name) => ({ bytes, name }), sleep() {}, formatDate: () => '2026-10' },
    resolveSession: () => ({ ok: true, row: { get: () => 'TST1' } }), _sessionMsg: () => '', fmtKST: () => '2026-10-05 21:00', handleAiCostLog() {},
  };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx._rfFolderFor = () => ({ getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder });
  ctx._voiceStudio = () => true;
  Object.assign(props, { VOICE_CLONE: 'on', PRACTICE_READ: 'on', TYPECAST_API_KEY: 'k', VC_TST1: JSON.stringify({ groom: { voiceId: 'vg' }, bride: { voiceId: 'vb' } }) });
  return { ctx, props, files, log, set plan(f) { plan = f; }, tick(ms) { now += ms; }, setNow(f) { ctx.__now = f; vm.runInContext('Date.now = function () { return __now(); };', ctx); } };
}
const L3 = [['groom', '저희 두 사람은 오늘까지 각자의 길을 걸어왔습니다.'], ['bride', '이제 그 두 길을 여기서 하나로 잇습니다.'], ['groom', '박수로 환영해 주세요.']];
const body = (lines) => ({ token: 't', op: 'make', key: 'entry', text: lines.map((l) => l[1]).join(' '), lines, tempo: 1, pause: 350 });
{ const H = make(); const r = H.ctx.handleVoiceClone(body(L3));
  ok('① 저장본 없는 세 줄 → fetchAll 한 번에 세 요청 · 하나씩 fetch 없음', r.ok && H.log.fetchAll.length === 1 && H.log.fetchAll[0].length === 3 && H.log.fetch.length === 0, JSON.stringify({ ok: r.ok, err: r.error, fa: H.log.fetchAll.map((x) => x.length), f: H.log.fetch.length }));
  const dec = (r.parts || []).map((p) => Buffer.from(p.data, 'base64').toString().slice(4));
  ok('⑧ 돌려준 소리 순서 = 줄 순서 · 읽는 분도 줄대로', JSON.stringify(dec) === JSON.stringify(L3.map((l) => l[1])) && r.parts.map((p) => p.who).join() === 'groom,bride,groom', JSON.stringify(dec));
  // ② 요청 모양 = 종전 _vcTts
  let old = null; H.ctx.UrlFetchApp.fetch = (url, o) => { old = { url, o }; return { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => [1] }) }; };
  H.ctx._vcTts(H.ctx._vcCfg('TST1'), 'vg', L3[0][1], 1, 350);
  const nw = H.log.fetchAll[0][0];
  ok('② 요청 모양 = 종전 _vcTts(주소 · 머리 · 본문)', old && old.url === nw.url && old.o.payload === nw.payload && old.o.contentType === nw.contentType && old.o.headers['X-API-KEY'] === nw.headers['X-API-KEY'] && nw.muteHttpExceptions === true, JSON.stringify({ a: old && old.o.payload, b: nw.payload }));
  // ③ 저장 이름 = 종전 _vcCached
  const nm0 = [...H.files.keys()][0]; const H2 = make(); H2.ctx._vcCached('TST1', 'AI 소리', 'vg', L3[0][1], 1, H2.ctx._vcCfg('TST1'), 350);
  ok('③ 저장 이름 = 종전 _vcCached(이미 만든 소리가 그대로 맞는다)', H2.files.has(nm0), nm0 + ' / ' + [...H2.files.keys()][0]);
  // ④ 두 번째는 저장본
  const n0 = H.log.fetchAll.length; H.ctx.UrlFetchApp.fetchAll = (reqs) => { H.log.fetchAll.push(reqs); return []; };
  const r2 = H.ctx.handleVoiceClone(body(L3));
  ok('④ 같은 글 두 번째 — 업체에 안 묻는다 · 같은 소리', r2.ok && H.log.fetchAll.length === n0 && JSON.stringify(r2.parts) === JSON.stringify(r.parts));
  const st = JSON.parse(H.props.VC_TST1); ok('   새로 만든 글자 수만 예산에(두 번째는 안 센다)', st.make && st.make.chars === L3.reduce((a, l) => a + l[1].length, 0) && st.make.total === 1, JSON.stringify(st.make)); }
{ const H = make(); let n = 0; H.plan = (t) => (t === L3[1][1] && n++ === 0 ? 429 : 200);
  const r = H.ctx.handleVoiceClone(body(L3));
  ok('⑤ 한 줄이 429 → 그 줄만 한 번 더(fetch 1) · 성공', r.ok && H.log.fetch.length === 1 && r.parts.length === 3, JSON.stringify({ ok: r.ok, f: H.log.fetch.length })); }
{ const H = make(); H.plan = (t) => (t === L3[2][1] ? 500 : 200);
  const r = H.ctx.handleVoiceClone(body(L3)); const w = JSON.parse(H.props.VCERR_TST1 || '{}');
  ok('⑥ 한 줄이 500 → 실패(down) · VCERR_ 에 make · HTTP 500 기록', !r.ok && r.down && w.op === 'make' && w.http === 500, JSON.stringify({ r, w })); }
{ const H = make(); let t = 1e12; H.setNow(() => (t += 70000));
  const r = H.ctx.handleVoiceClone(body(L3)); const w = JSON.parse(H.props.VCSLOW_TST1 || 'null');
  ok('⑦ 60초 넘은 만들기 → VCSLOW_ 기록(초 · 줄 수만 · 글 없음)', r.ok && w && w.sec > 60 && w.lines === 3 && !/길을|환영/.test(H.props.VCSLOW_TST1), H.props.VCSLOW_TST1);
  const lg = []; H.ctx.Logger.log = (s) => lg.push(s); H.ctx.vcLastErrors();
  ok('   vcLastErrors 가 느린 만들기도 함께 찍는다', /느린 만들기 \d+초 · 3줄/.test(lg.join('\n')), lg.join(' | ')); }
// [PT_VOICE_FALLBACK] 연습 읽기 — 신랑 목소리 없음 · 스튜디오 기본 없음 → 신부 AI 목소리로 · 둘 다 없으면 VCERR_ 기록
{ const H = make(); H.props.VC_TST1 = JSON.stringify({ bride: { voiceId: 'vb' } }); let used = '';
  H.ctx.UrlFetchApp.fetch = (url, o) => { used = JSON.parse(o.payload).voice_id; return { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => [1, 2] }) }; };
  const r = H.ctx.handleVoiceClone({ token: 't', op: 'practice', role: 'groom', who: 'groom', text: '하윤아 고마워' });
  ok('⑨ 신랑 목소리 · 스튜디오 기본 없음 → 신부 AI 목소리로 읽는다 [PT_VOICE_FALLBACK]', r.ok && used === 'vb', JSON.stringify({ r: r.ok, err: r.error, used }));
  const H2 = make(); H2.props.VC_TST1 = JSON.stringify({});
  const r2 = H2.ctx.handleVoiceClone({ token: 't', op: 'practice', role: 'groom', who: 'groom', text: '하윤아 고마워' }); const w = JSON.parse(H2.props.VCERR_TST1 || '{}');
  ok('⑩ 읽을 목소리가 하나도 없으면 실패 · 까닭을 VCERR_ 에(practice · 읽을 목소리 없음)', !r2.ok && w.op === 'practice' && /읽을 목소리 없음/.test(w.msg || ''), JSON.stringify({ r2, w })); }
console.log(fail ? `\nVC PAR FAIL ${fail}` : '\nVC PAR OK'); process.exit(fail ? 1 : 0);
