#!/usr/bin/env node
/* ★★[VC_ENROLL_SIM 2026-10-08 사장님 «두 분 목소리 만들기에서 녹음 후에 목소리 만들기 오류가 자주 · 모든 경우의 수 병렬로 직접 시뮬레이션 · 개선이 없을 때까지 라운드별로»]
   목소리 만들기(enroll)를 끝에서 끝까지 — 식순 빌더(진짜 order-preview.html) → 마이페이지 중계(mypage.html 원문 조각) →
   GAS(80_production · 95_notify · doPost 원문 조각을 vm 으로) → 타입캐스트(가짜 답).
   ★원문을 떼어 쓴다(사본 금지) — 화면 · 중계 · 서버 코드를 고치면 이 시험이 바로 그 판을 돈다.
   시간은 SCALE 배 빠르게: 화면 · 중계 타이머(setTimeout · setInterval · Date.now)와 서버 지연을 같은 비율로 줄인다 —
   아이폰 60초 끊김 · 마이페이지 90초 · 빌더 95초 대기 · 느린 업체 · 서버가 끊긴 뒤에도 끝까지 만드는 것을 그대로 재현한다.
   ★서버는 «업체가 답하기 전»(검증 · 작업표 시작)과 «답한 뒤»(_vcEnrollAfter · 저장 · 앞 목소리 지우기)를 나눠, 뒤쪽을 업체가 끝나는 시각에 돌린다 —
     그 사이에 끼어드는 다른 요청(다시 누름 · 다른 탭 · 상태 묻기)이 진짜 순서로 섞인다.
   old: true = GAS 를 새로 배포하기 전(작업표 VC_ENROLL_JOB 이 없는 서버) — 화면이 옛 서버에서도 «만들어졌나»를 가려내는지 본다.
   경우마다 «끝 모습»(목소리 준비 · 오류 글 · 코드)과 서버 상태(업체 복제 횟수 · 새는 목소리)를 본다.
   ONLY=정규식 · PAR=동시 개수(기본 6) · SCALE=배속(기본 10) · VERBOSE=1 · 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SCALE = +(process.env.SCALE || 10), PAR = +(process.env.PAR || (process.env.CI ? 3 : 6)), ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null, VERBOSE = !!process.env.VERBOSE;

/* ── 서버: GAS 원문 조각 ── */
const GS = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
const NT = fs.readFileSync(path.join(ROOT, 'automation/platform/95_notify.gs'), 'utf8');
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const FN = ['_vcCacheGet', '_vcTtsReq', '_voiceStudio', '_vcSpent', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcFetch', '_vcErr', '_vcWhy', '_vcGate', 'vcLastErrors', '_vcAlert', '_vcCharLog', '_vcTts', '_vcAiFolder', '_vcHash', '_vcCached', '_vcTempo', '_vcPause', '_vcKoNum', '_vcNewPhrase', '_vcDelVoice', '_vcDelMark', '_vcJobPub', '_vcJobStart', '_vcEnrollAfter', 'handleVoiceClone', '_vcPub', '_vcSlots'];
const NFN = ['_errArea', '_errId', '_errStamp'];
const miss = FN.filter((f) => !grabIn(GS, f)).concat(NFN.filter((f) => !grabIn(NT, f)));
if (miss.length) { console.log('FAIL 원문 조각을 못 떼었다 — ' + miss.join(', ')); process.exit(1); }
const ERR_AREA_SRC = (() => { const i = NT.indexOf('var ERR_AREA = {'); let d = 0; for (let k = NT.indexOf('{', i); k < NT.length; k++) { if (NT[k] === '{') d++; else if (NT[k] === '}') { d--; if (!d) return NT.slice(i, k + 1) + ';'; } } return ''; })();
const SRV = [lineIn(GS, /var RF_KEYS[^\n]*/), lineIn(GS, /var VC_BASE[^\n]*/), lineIn(GS, /var VC_DOWN[^\n]*/), lineIn(GS, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(GS, f)))
  .concat([lineIn(NT, /var ERR_SKIP[^\n]*/), ERR_AREA_SRC, lineIn(NT, /var ERR_BUSY_RE[^\n]*/)]).concat(NFN.map((f) => grabIn(NT, f))).join('\n');
/* doPost 의 잡기(catch) — 원문에서 «_intended» 판정 줄을 떼어 그대로 쓴다 */
const CB = fs.readFileSync(path.join(ROOT, 'automation/consultation/consultation-booking.gs'), 'utf8');
const INTENDED = lineIn(CB, /var _intended = [^\n]*\n[^\n]*\n/); if (!INTENDED) { console.log('FAIL doPost 잡기 판정 줄을 못 떼었다'); process.exit(1); }

function world(sc) {
  const props = { TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', PRACTICE_READ: 'on' }, calls = [], files = {}, cache = {}, rec = [], alive = new Set();
  let seq = 0, lockN = 0;
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [7, 7, 7] }) });
  const mkFile = (id, name) => ({ getId: () => id, getName: () => name, isTrashed: () => !!files[id].trash, setTrashed: (t) => { files[id].trash = t; }, getBlob: () => ({ getBytes: () => [1], getContentType: () => 'audio/mpeg' }) });
  const folder = () => ({ getFoldersByName: () => { const f = folder(); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder(),
    createFile: (b) => { const id = 'F' + (++seq); files[id] = { name: b.name, trash: false }; files[id].f = mkFile(id, b.name); return files[id].f; },
    getFilesByName: () => ({ hasNext: () => false }), getFiles: () => ({ hasNext: () => false }) });
  const clone = (n) => { const c = typeof sc.clone === 'function' ? sc.clone(n) : sc.clone; return c || [201, { voice_id: 'uc_' + n, status: 'completed' }]; };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => Object.assign({}, props), deleteProperty: (k) => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { lockN++; if (sc.lockFail && sc.lockFail(lockN, calls)) throw new Error('Lock timeout'); }, tryLock: () => true, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetchAll(reqs) { return reqs.map((r) => this.fetch(r.url, r)); },
      fetch: (url, q) => { const p = url.replace('https://api.typecast.ai', ''), m = (q.method || 'get').toUpperCase(), key = m + ' ' + p.replace(/\/uc_[^/]+$/, '/{id}'); calls.push(key);
        if (/instant-clone/.test(p)) { const r = clone(calls.filter((k) => /instant-clone/.test(k)).length); if ((r[0] === 201 || r[0] === 200) && r[1] && r[1].voice_id) alive.add(r[1].voice_id); return res(r[0], r[1]); }
        if (m === 'DELETE') { alive.delete(decodeURIComponent(p.split('/').pop())); return res(204, ''); }
        return res(200, 'mp3'); } },
    DriveApp: { getFileById: (id) => (files[id] ? files[id].f : (() => { throw new Error('no file'); })()) },
    Utilities: { formatDate: (d, tz, f) => { const t = new Date(d || Date.now()); const s = t.toISOString(); return f === 'yyyy-MM-dd' ? s.slice(0, 10) : f === 'yyyy-MM' ? s.slice(0, 7) : f === 'M' ? String(t.getMonth() + 1) : f === 'd' ? String(t.getDate()) : s; },
      base64Encode: (b) => 'B64:' + b.length, base64Decode: () => [1, 2], newBlob: (b, m, n) => ({ name: n, setName(x) { this.name = x; return this; } }), sleep: () => {},
      computeDigest: (a, s) => Array.from(Buffer.from(String(s))), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'), DigestAlgorithm: {}, Charset: {} },
    resolveSession: (t) => (t === 'T' ? { ok: true, row: { get: () => 'ME0001' } } : { ok: false, reason: 'expired' }), _sessionMsg: () => '로그인이 풀렸어요. 다시 로그인해 주세요.',
    fmtKST: () => new Date().toISOString().replace('T', ' ').slice(0, 19), _rfFolderFor: () => folder(), findCustomerByCode: () => ({ get: (h) => (h === '예식일' ? '2026-12-12' : '예식준비') }),
    _gsr_: () => {}, _trigIn_: () => {},   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안
    _ymdOf: (v) => v, _nfAdminLineEmail: () => {}, _nfAdminEmail: () => {}, handleAiCostLog: () => {}, Logger: { log() {} }, console: { warn() {}, log() {} },
    _errRecord: (act, ec, text, why, eid) => { rec.push([ec, String(text || '').slice(0, 60), String(why || '').slice(0, 60), eid]); }, __ERR_ACT: 'voiceClone', __ERR_TOK: '', __ERR_ON: true,
    JSON, Math, String, Date, Array, Buffer, encodeURIComponent, decodeURIComponent, Object, Number, RegExp, Error,
  };
  vm.createContext(sb); vm.runInContext(SRV + '\nfunction _errRecord(a,b,c,d,e){ return __rec(a,b,c,d,e); }', Object.assign(sb, { __rec: sb._errRecord }));
  /* 옛 GAS(작업표 없음) — 작업표 시작 · 공개를 끈다. 겹침 거절도 없다(옛 서버 그대로) */
  if (sc.old) { sb._vcJobStart = () => null; sb._vcJobPub = () => null; }
  const realAfter = sb._vcEnrollAfter;
  /* doPost 흉내 — 실패면 _errStamp(95_notify 원문) · 예외면 doPost 잡기(원문 판정 줄) */
  const caught = (err) => { const _em = String((err && err.message) || ''); let _intended = false; eval(INTENDED.replace(/^var /, '')); const o = { ok: false, error: _intended ? _em : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' };
    if (!_intended) { o.eid = 'SIM' + (++seq); o.ecode = 'V' + (/is not defined|is not a function/.test(_em) ? 3 : 9); o._why = _em; } return o; };
  const fin = (out) => { if (out && out.ok === false) out = sb._errStamp(out); if (out && out._why !== undefined) delete out._why; if (sc.old && out && out.ok) delete out.jobs; return JSON.parse(JSON.stringify(out)); };
  /* begin = 업체가 답하기 전까지(진짜로 그 시각에) · commit = 업체가 답한 뒤(_vcEnrollAfter 원문을 그 시각에) */
  const begin = (body) => { let out, err = null, after = null;
    sb._vcEnrollAfter = function (c, x, xe) { after = [c, x, xe]; return { __after: 1 }; };
    try { out = sb.handleVoiceClone(JSON.parse(JSON.stringify(body))); } catch (e) { err = e; } finally { sb._vcEnrollAfter = realAfter; }
    return { commit: () => { if (err) return fin(caught(err)); if (after) { try { out = realAfter.apply(null, after); } catch (e) { return fin(caught(e)); } } return fin(out); } }; };
  const call = (body) => begin(body).commit();
  const st = () => JSON.parse(props.VC_ME0001 || '{}');
  return { props, calls, files, rec, call, begin, st, alive, clones: () => calls.filter((k) => /instant-clone/.test(k)).length,
    leak: () => { const s = st(), used = [s.groom && s.groom.voiceId, s.bride && s.bride.voiceId].filter(Boolean); return [...alive].filter((v) => used.indexOf(v) < 0).length; } };
}

/* ── 서버만: 겹친 만들기 · 작업표 · 녹음 거절 ── */
function serverOnly() { const out = [];
  { const W = world({ lockFail: (n, calls) => !calls.some((k) => /instant-clone/.test(k)) && n > 2 });   // 동의 · 문장 뒤 잠금은 모두 실패(작업표 못 씀 → 겹침 거절 없음)
    W.call({ token: 'T', op: 'consent', who: 'groom', agree: true }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
    const a = W.begin({ token: 'T', op: 'enroll', who: 'groom', jid: 'A', sec: 50, data: 'data:audio/wav;base64,AAAA' }), b = W.begin({ token: 'T', op: 'enroll', who: 'groom', jid: 'B', sec: 50, data: 'data:audio/wav;base64,AAAA' });
    const ra = a.commit(), rb = b.commit(); out.push(['겹친 두 만들기(잠금 실패) — 먼저 끝난 목소리도 지운다 · 새는 목소리 0 [VC_ENROLL_PREV]', ra.ok && rb.ok && W.leak() === 0 && W.clones() === 2, JSON.stringify({ ra: ra.ok, rb: rb.ok, leak: W.leak(), alive: [...W.alive], st: W.st().groom && W.st().groom.voiceId })]); }
  { const W = world({});
    W.call({ token: 'T', op: 'consent', who: 'groom', agree: true }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
    const a = W.begin({ token: 'T', op: 'enroll', who: 'groom', jid: 'A', sec: 50, data: 'data:audio/wav;base64,AAAA' }); const rb = W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'B', sec: 50, data: 'data:audio/wav;base64,AAAA' });
    const s1 = W.call({ token: 'T', op: 'status' }); const ra = a.commit(); const s2 = W.call({ token: 'T', op: 'status' });
    out.push(['도는 중에 또 만들기 → 겹쳐 시작하지 않고 그 표를 알려 준다 · 상태에 작업표(만드는 중 → 끝) [VC_ENROLL_ONE · VC_ENROLL_JOB]',
      !rb.ok && rb.wait && rb.jid === 'A' && W.clones() === 1 && s1.jobs === 1 && s1.groom.job && s1.groom.job.jid === 'A' && !s1.groom.job.end && ra.ok && s2.groom.job.end && s2.groom.job.ok && s2.groom.ready && W.leak() === 0,
      JSON.stringify({ rb, s1: s1.groom.job, s2: s2.groom.job, clones: W.clones() })]); }
  { const W = world({ clone: [500, { detail: 'x' }] });
    W.call({ token: 'T', op: 'consent', who: 'groom', agree: true }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
    const r = W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'C', sec: 50, data: 'data:audio/wav;base64,AAAA' }); const s = W.call({ token: 'T', op: 'status' });
    out.push(['업체 실패 → 작업표에 끝 · 실패 · 코드(V4) · 확인 문장은 그대로(다시 누르면 읽지 않고 다시) [VC_ENROLL_JOB]', !r.ok && s.groom.job && s.groom.job.end && !s.groom.job.ok && s.groom.job.ecode === 'V4' && W.st().groom.phrase && W.st().groom.phrase.t, JSON.stringify({ r, job: s.groom.job })]); }
  { const W = world({ clone: [422, { detail: 'invalid audio' }] });
    W.call({ token: 'T', op: 'consent', who: 'groom', agree: true }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
    const r = W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'D', sec: 50, data: 'data:audio/wav;base64,AAAA' }); const s = W.call({ token: 'T', op: 'status' });
    out.push(['업체가 녹음을 받지 않음(422) → «처음부터 다시 읽어 주세요» · 줄 문구(«이 줄 글에») 아님 · 작업표 kind rec [VC_ENROLL_BADREC]', !r.ok && r.bad && /처음부터 다시 읽어/.test(r.error) && !/이 줄 글/.test(r.error) && s.groom.job.kind === 'rec', JSON.stringify({ r, job: s.groom.job })]); }
  return out; }

/* ── 마이페이지 중계: mypage.html 원문 조각 ── */
const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const RELAY = (() => { const s = "if(d.type==='momentedit:voiceClone' && d.data && d.data.op){"; const i = MP.indexOf(s); if (i < 0) return '';
  let d = 0; for (let k = i + s.length - 1; k < MP.length; k++) { if (MP[k] === '{') d++; else if (MP[k] === '}') { d--; if (!d) return MP.slice(i, k + 1); } } return ''; })();
if (!RELAY || !/fetch\(EXEC_URL/.test(RELAY)) { console.log('FAIL 마이페이지 중계 조각을 못 떼었다'); process.exit(1); }
const PARENT = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="fr" src="/order-preview.html?embed=1&t=1" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>
<script>var fr=document.getElementById('fr'), EXEC_URL=location.origin+'/__gas/exec'; window.__TOK='T'; function getToken(){ return window.__TOK; }
window.addEventListener('message',function(ev){ var d=ev.data; if(!d||typeof d!=='object') return;
  if(d.type==='momentedit:orderReady'){ fr.contentWindow.postMessage({type:'momentedit:orderFill',draft:null,reload:false,done:false,cust:{groom:'테스트 A',bride:'테스트 B',weddingDate:'2026-12-12',dday:60,pastD14:false,name:'테스트',code:'ME0001',phone:'',aiToken:''},digital:false,photoShare:false,meal:false,voice:{up:true,clone:true,read:true},at:''},location.origin); return; }
  if(d.type==='momentedit:orderDraft'){ fr.contentWindow.postMessage({type:'momentedit:orderDraftSaved'},location.origin); return; }
  ${RELAY}
});<\/script>`;

/* 짧은 WAV(1초 · 24kHz) — make · practice 답(맞추기 창 예시)에 쓴다 */
const WAV = (() => { const sr = 24000, n = sr, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * 200 * i / sr)), 44 + i * 2); return b.toString('base64'); })();

const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/__sim/parent.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(PARENT); return; }
  const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port, BASE = 'http://127.0.0.1:' + port;

/* ── 경우의 수 ── ms = 서버가 그 요청을 끝내는 시각(실제 초 단위 · 배속 전) · cut = 그 시각에 연결이 끊김(아이폰 60초) · 배열이면 n 번째 요청마다
   want: ok(목소리 준비 · 오류 글 없이) · err(오류 글 · msg 맞음) · err-seen(창을 닫았어도 실패를 알림) · redo: 오류 뒤 글 1 부터 · by: 이 초 안에 오류를 알려야 */
const REC = /이 녹음으로는 목소리를 만들지 못했어요/;
const SC = [
  { id: 'ok-fast', ms: [4000], want: 'ok', slow: false },
  { id: 'ok-55s', ms: [55000], want: 'ok', slow: true },   // 40초를 넘기면 «조금 오래 걸리고 있어요»(창이 바뀌는 15초 사이를 본다)
  { id: 'ios-cut-70s', ms: [70000], cut: [60000], want: 'ok' },
  { id: 'ios-cut-140s', ms: [140000], cut: [60000], want: 'ok' },
  { id: 'ios-cut-300s', ms: [300000], cut: [60000], want: 'ok' },
  { id: 'pc-100s', ms: [100000], w: 1280, want: 'ok' },
  { id: 'pc-200s', ms: [200000], w: 1280, want: 'ok' },
  { id: 'ios-cut-fail', ms: [70000], cut: [60000], clone: [500, {}], want: 'err', msg: /V4/, by: 200000, enrolls: 2 },   // 서버가 정말 실패(작업표) → 한 번 더 조용히 → 또 실패면 그때 오류(ENROLL_SAFE)
  { id: 'ios-cut-fail-once', ms: [70000], cut: [60000], clone: (n) => (n === 1 ? [500, {}] : null), want: 'ok', enrolls: 2, clones: 2 },   // 한 번만 실패 → 다시 누르지 않고 끝까지
  { id: 'tc-500-once', ms: [5000], clone: (n) => (n === 1 ? [500, {}] : null), want: 'ok', enrolls: 2 },
  { id: 'crash-early', old: true, ms: [40000, 8000], crash: [true, false], want: 'ok', enrolls: 2, clones: 1 },   // 옛 서버 · 40초에 서버가 죽음(일 없음) → 두 번 물어 안 생김 → 한 번 더 조용히(VC_SIM «서버가 죽음»)
  { id: 'crash-early-new', ms: [40000, 8000], crash: [true, false], want: 'ok', enrolls: 2, clones: 1 },   // 새 서버 · 작업표가 없다 = 닿지 않음 → 한 번 더 조용히
  { id: 'ios-cut-422', ms: [70000], cut: [60000], clone: [422, { detail: 'invalid audio' }], want: 'err', msg: REC, redo: true, by: 110000 },
  { id: 'old-ios-cut-70s', old: true, ms: [70000], cut: [60000], want: 'ok' },
  { id: 'old-pc-200s', old: true, ms: [200000], w: 1280, want: 'ok' },
  { id: 'old-ios-cut-fail', old: true, ms: [70000], cut: [60000], clone: [500, {}], want: 'err', msg: /V9/ },
  { id: 'old-late-retry', old: true, ms: [250000, 6000], cut: [60000, 0], retry: 262000, want: 'ok', clones: 1 },
  { id: 'tc-422', ms: [8000], clone: [422, { detail: 'invalid audio' }], want: 'err', msg: REC, nomsg: /글자|이 줄/, redo: true },
  { id: 'tc-400-long', ms: [8000], clone: [400, { detail: 'audio too long' }], want: 'err', msg: REC, redo: true },
  { id: 'old-tc-422', old: true, ms: [8000], clone: [422, { detail: 'invalid audio' }], want: 'err', msg: REC, nomsg: /글자|이 줄/, redo: true },
  { id: 'tc-402', ms: [5000], clone: [402, {}], want: 'err', msg: /V2/ },
  { id: 'tc-429', ms: [5000], clone: [429, {}], want: 'err', msg: /V1/ },
  { id: 'tc-500', ms: [5000], clone: [500, {}], want: 'err', msg: /V4/ },
  { id: 'gas-html', ms: [5000], html: [true], want: 'ok' },
  { id: 'gas-html-early', ms: [3000], noRun: [true], want: 'err', msg: /V7/, by: 70000, enrolls: 2 },   // 서버가 일하지 않고 오류 화면(할당량 · 권한) → 작업표 없음 = 닿지 않음 → 한 번 더 조용히 → 또면 그때 V7
  { id: 'lock-fail-start', ms: [10000], lockFail: (n, calls) => !calls.some((k) => /instant-clone/.test(k)) && n > 2, want: 'ok' },
  { id: 'lock-fail-save', ms: [10000], lockFail: (n, calls) => calls.some((k) => /instant-clone/.test(k)), want: 'ok' },
  { id: 'session', ms: [3000], tok: 'X', want: 'err', msg: /로그인/ },
  { id: 'offline', offline: true, want: 'err', msg: /V6/, by: 150000 },
  { id: 'old-offline', old: true, offline: true, want: 'err', msg: /V6/, by: 150000 },
  { id: 'dbl-click', ms: [8000], dbl: true, want: 'ok', enrolls: 1 },
  { id: 'close-ok', ms: [20000], close: true, want: 'ok' },
  { id: 'close-fail', ms: [8000], clone: [500, {}], close: true, want: 'err-seen' },
  { id: 'close-reopen', ms: [70000], cut: [60000], close: true, reopenAt: 20000, want: 'ok', enrolls: 1 },
  { id: 'retry-during', ms: [70000, 6000], cut: [60000, 0], retry: 'err', want: 'ok', clones: 1 },
  { id: 'retry-after', ms: [70000, 6000], cut: [60000, 0], retry: 76000, want: 'ok', clones: 1 },
  { id: 'status-down-after-ok', ms: [5000], statusDownAfterEnroll: 2, want: 'ok' },
  { id: 'reload-mid', ms: [90000], cut: [60000], reloadAt: 15000, want: 'ok', enrolls: 1 },
  { id: 'two-tabs', ms: [90000, 6000], cut: [60000, 0], tab2: 'ready', tab2At: 20000, want: 'ok', clones: 1 },   // 다른 탭도 글을 다 읽어 두었다가 첫 만들기가 도는 중에 누름 → 서버가 겹침을 거절 · 그 표의 끝을 본다
  { id: 'both-people', ms: [70000, 8000], cut: [60000, 0], bride: 10000, want: 'ok', clones: 2 },   // 신랑 만드는 중에 신부도 — 한 분 작업표가 다른 분 저장에 지워지지 않는다
  { id: 'renew-cut', renew: true, ms: [4000, 70000], cut: [0, 60000], want: 'ok', clones: 2 },   // 다시 녹음(앞 목소리 있음)이 끊겨도 «만든 수»로 가린다 · 앞 목소리는 지운다
  { id: 'old-renew-cut', old: true, renew: true, ms: [4000, 70000], cut: [0, 60000], want: 'ok', clones: 2 },
  { id: 'poll-flaky', ms: [80000], cut: [60000], downAt: [62000, 2], want: 'ok' },   // 끊긴 뒤 상태 묻기도 두 번 끊김
  { id: 'cut-probe-fail', ms: [80000], cut: [60000], cutDown: 1, want: 'ok' },   // 끊긴 순간 중계의 확인도 끊김(V6) → 그래도 서버가 만든 것을 찾는다
  { id: 'session-mid', ms: [80000], cut: [60000], tokAt: 62000, want: 'err', msg: /로그인/, by: 110000 },   // 기다리는 사이 로그인이 풀림 → 그 말로
  { id: 'tab2-adopt', ms: [90000], cut: [60000], tab2: 'late', tab2At: 20000, want: 'ok', enrolls: 1 },   // 만드는 중에 다른 탭(새 기기)을 열면 카드가 «만드는 중» · 눌러도 동의부터가 아니라 그 창
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let br;
async function run(sc) {
  const W = world(sc), out = { id: sc.id, enrolls: 0, timeline: [], errs: [] };
  let statusDown = 0, offline = false, pending = 0;   // pending = 서버가 아직 끝내지 않은 만들기(끝 모습을 재기 전에 기다린다 — 화면이 먼저 끝나도 서버는 계속 만든다)
  const mkCtx = async () => { const ctx = await br.newContext({ viewport: { width: sc.w || 390, height: 844 }, hasTouch: (sc.w || 390) < 1000 });
  ctx.setDefaultTimeout(60000);   // 여러 경우를 한꺼번에 돌리면 화면 준비(흐름 눌러 가기)가 느려진다 — 준비 단계가 30초에 걸려 «시험이 멈췄다»가 나던 것(제품 결함 아님 · 혼자 돌리면 통과)
  await ctx.addInitScript((S) => { const st = window.setTimeout, si = window.setInterval, rn = Date.now.bind(Date), b0 = rn();
    window.setTimeout = function (f, d, ...a) { return st.call(window, f, (+d || 0) / S, ...a); };
    window.setInterval = function (f, d, ...a) { return si.call(window, f, Math.max(4, (+d || 0) / S), ...a); };
    Date.now = () => b0 + (rn() - b0) * S; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; }, SCALE);
  await ctx.route('**/favicon.ico*', (route) => (offline ? route.abort('internetdisconnected') : route.continue()).catch(() => {}));   // ★[VC_GAS_DOWN 2026-10-08] 기기가 끊기면 이 사이트도 안 닿는다 — 마이페이지 중계가 같은 출처에 한 번 더 물어 V6(연결) · V9(서버)를 가른다
  await ctx.route('**/__gas/exec', async (route) => {
    let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch {}
    if (offline) return route.abort('internetdisconnected').catch(() => {});
    const f = (o, ms) => sleep((ms || 300) / SCALE).then(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) })).catch(() => {});
    if (body.action !== 'voiceClone') return f({ ok: true });
    const op = body.op;
    if (op === 'make') return f({ ok: true, key: body.key, left: 4, parts: (Array.isArray(body.lines) ? body.lines : [[body.one || 'groom']]).map((l) => ({ who: l[0] || 'groom', mime: 'audio/wav', data: WAV })) }, 1500);
    if (op === 'practice') return f({ ok: true, mime: 'audio/wav', data: WAV }, 1500);
    if (op === 'status' && statusDown > 0) { statusDown--; return route.abort('connectionreset').catch(() => {}); }
    if (op !== 'enroll') return f(W.call(body), 400);
    const n = out.enrolls++, at = (a, d) => (Array.isArray(a) ? (a[n] !== undefined ? a[n] : a[a.length - 1]) : (a !== undefined ? a : d));
    const ms = at(sc.ms, 5000), cut = at(sc.cut, 0), html = at(sc.html, false), noRun = at(sc.noRun, false), crash = at(sc.crash, false);
    out.timeline.push('enroll#' + (n + 1));
    if (noRun) return sleep(ms / SCALE).then(() => route.fulfill({ status: 500, contentType: 'text/html', body: '<html><body>Google Apps Script quota</body></html>' })).catch(() => {});
    if (crash) return sleep(ms / SCALE).then(() => { out.timeline.push('crash@' + ms / 1000 + 's'); return route.abort('connectionreset'); }).catch(() => {});   // 서버가 처리하다 죽음 — 일을 하지 않았다(업체 호출 전)
    let done = false;
    if (cut && cut < ms) setTimeout(() => { if (!done) { done = true; if (sc.cutDown) statusDown = sc.cutDown; route.abort('connectionreset').catch(() => {}); out.timeline.push('cut@' + cut / 1000 + 's'); } }, cut / SCALE);
    const job = W.begin(body); pending++;   /* 업체 호출 전까지 — 검증 · 작업표 시작 */
    await sleep(ms / SCALE);
    const o = job.commit(); pending--;   /* 업체가 답한 뒤 — 저장 · 앞 목소리 지우기 · 작업표 끝 */ if (sc.statusDownAfterEnroll && o.ok) statusDown = sc.statusDownAfterEnroll; out.timeline.push('srv#' + (n + 1) + (o.ok ? ':ok' : ':' + (o.ecode || (o.wait ? 'wait' : 'x'))));
    if (done) return; done = true;
    if (html) return route.fulfill({ status: 500, contentType: 'text/html', body: '<html><body>Google Apps Script error</body></html>' }).catch(() => {});
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) }).catch(() => {});
  });
  return ctx; };   // 다른 기기(두 번째 탭)도 같은 서버 · 같은 시간 배속 — 저장소는 따로(그 기기 화면은 처음부터)
  const ctx = await mkCtx();
  /* 화면 하나를 «두 분 목소리» 쪽까지 */
  const frameOf = async (pg) => { let fr = null; for (let i = 0; i < 100 && !fr; i++) { await sleep(100); fr = pg.frames().find((x) => /order-preview\.html/.test(x.url())); }
    await fr.waitForFunction(() => typeof VC !== 'undefined' && typeof mkGo === 'function' && typeof RitualOpen !== 'undefined' && RitualOpen.FEATURE && RitualOpen.FEATURE.voiceClone, null, { timeout: 15000 });
    const nx = async () => { if (await fr.isVisible('#next')) await fr.click('#next'); else await fr.click('.pk-go'); await sleep(250); };
    await nx(); await nx(); await fr.click('[data-fk="opx:family"]'); await sleep(150); await nx(); await sleep(400);
    await fr.evaluate(() => { S.vsChip = 1; S.vsAsked = 1; S.tipSeen = { keep: 1, nar: 1 }; S.guestVoice = 'couple'; opSync(); mkGo('guest'); }); await sleep(300);
    await fr.click('[data-fk="lsc:guestVoice:ai"]'); await sleep(300);
    await fr.evaluate(() => { const d = document.getElementById('mkRecDlg'); if (d) mkDlgClose(); mkGo('_voice'); });
    await fr.waitForSelector('[data-fk="mkvcok:groom"]', { timeout: 15000 }); return fr; };
  const open = async (pg) => { pg.on('pageerror', (e) => out.errs.push(e.message)); await pg.goto(BASE + '/__sim/parent.html'); await pg.evaluate(() => { try { localStorage.removeItem('me_order'); } catch (e) {} }); await pg.reload(); return frameOf(pg); };
  /* 동의 → 글 1 · 글 2 → «이 녹음으로 목소리 만들기» 단추까지 */
  const startEnroll = async (fr, who) => { who = who || 'groom'; await fr.click('[data-fk="mkvcok:' + who + '"],[data-fk="mkvcre:' + who + '"]'); await fr.waitForSelector('#vcSelf', { timeout: 5000 }); await fr.click('#vcSelf'); await fr.click('#vcAgree');
    await fr.waitForFunction(() => VC.read && VC.read.step === 1 && VC.read.phrase, null, { timeout: 15000 });
    await fr.evaluate(() => { const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
      VC.read.take[1] = { wav: tone(26), dur: 26 }; mkVcStep(2); VC.read.take[2] = { wav: tone(27), dur: 27 }; render(); });
    await fr.waitForSelector('[data-fk="mkvcmake"]', { timeout: 5000 }); };
  const pg = await ctx.newPage(); let f = await open(pg);
  if (sc.renew) { await startEnroll(f); await f.click('[data-fk="mkvcmake"]'); await f.waitForFunction(() => VC.tune && !VC.loading, null, { timeout: 30000 }); await sleep(300); await f.evaluate(() => { _dlgShut(); }); await f.waitForSelector('[data-fk="mkvcre:groom"]', { timeout: 15000 }); out.timeline.push('첫 목소리 만듦 → 다시 녹음'); }
  await startEnroll(f);
  let tab2 = null, t2 = null, ctx2 = null; if (sc.tab2 === 'ready') { ctx2 = await mkCtx(); tab2 = await ctx2.newPage(); t2 = await open(tab2); await startEnroll(t2); }   // 두 번째 탭도 글 두 개를 다 읽어 둔다
  if (sc.tok) await pg.evaluate((t) => { window.__TOK = t; }, sc.tok);
  const triesBefore = (W.st().groom && W.st().groom.tries) || 0;   // 이번 만들기 전 서버의 «만든 수» — 화면이 «준비됐어요»로 갈 때 이것이 늘어 있어야 한다
  if (sc.offline) offline = true;   // 누르기 전에 — 누른 뒤에 끊으면 만들기 요청이 먼저 나가는 경합이 있었다(시험 쪽 · 13가지를 한꺼번에 돌릴 때)
  const t0 = Date.now(); await f.click('[data-fk="mkvcmake"]');
  if (sc.dbl) { await f.click('[data-fk="mkvcmake"]', { timeout: 300 }).catch(() => {}); await f.evaluate(() => { try { mkVcEnroll(); } catch (e) {} }); }
  if (sc.close) { await sleep(300); await f.evaluate(() => mkDlgClose()); }
  const look = (fr) => fr.evaluate(() => { const d = document.getElementById('mkRecDlg'), R = VC.read, tt = document.querySelector('.mk-toast'); return { ph: R && R.ph, step: R && R.step, err: (R && R.err) || '', enr: !!(VC.enr && VC.enr.groom), panel: !!VC.panel, tune: !!document.querySelector('[data-fk="mkvcuse"]') || !!VC.tune || (R && R.ph === 'tune'), dlg: d ? d.innerText.replace(/\s+/g, ' ').slice(0, 160) : '', toast: (tt && tt.textContent) || MK.toast || MK.dlgMsg || '', ready: !!(VC.st && VC.st.groom && VC.st.groom.ready), readyB: !!(VC.st && VC.st.bride && VC.st.bride.ready), card: ((document.querySelector('.mk-vpc') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 80) }; });
  const maxReal = (Math.max(...[].concat(sc.ms || [5000])) + (sc.old ? 300000 : 120000)) / SCALE + 6000;
  let last = null, firstErr = '', retried = false, seenErr = false, reopened = null, reloaded = false, tab2Done = false, errAt = 0, brideGo = false, downGo = false, tokGo = false, slowSeen = false;
  while (Date.now() - t0 < maxReal) {
    await sleep(150); const now = (Date.now() - t0) * SCALE; let s; try { s = await look(f); } catch { continue; }
    const key = [s.ph, s.tune, s.err, s.toast, s.enr].join('|'); if (key !== last) { out.timeline.push((now / 1000).toFixed(0) + 's ' + (s.tune ? 'TUNE' : s.ph || '-') + (s.enr ? '+' : '') + (s.err ? ' «' + s.err.replace(/\n/g, ' ') + '»' : '') + (s.toast ? ' t«' + s.toast + '»' : '')); last = key; }
    if ((s.err && !s.enr) || (sc.close && s.toast && !s.enr)) { if (!seenErr) errAt = now; seenErr = true; if (!firstErr) firstErr = s.err || s.toast; }
    if (sc.retry && !retried && ((sc.retry === 'err' && s.err) || (typeof sc.retry === 'number' && now >= sc.retry))) { retried = true; const b = await f.$('[data-fk="mkvcmake"]'); if (b) { await b.click().catch(() => {}); out.timeline.push('retry'); } else out.timeline.push('retry: 단추 없음'); }
    if (sc.reopenAt && !reopened && now >= sc.reopenAt) { await f.click('[data-fk="mkvcok:groom"]').catch(() => {}); await sleep(200); reopened = await look(f); out.timeline.push('reopen ' + reopened.ph + (reopened.panel ? ' +동의창' : '') + ' «' + reopened.dlg.slice(0, 40) + '»'); }
    if (sc.reloadAt && !reloaded && now >= sc.reloadAt) { reloaded = true; await pg.evaluate(() => { try { localStorage.removeItem('me_order'); } catch (e) {} document.getElementById('fr').src = '/order-preview.html?embed=1&t=' + Date.now(); }); await sleep(300); f = await frameOf(pg); await sleep(500); const c = await look(f); out.timeline.push('reload · 카드 «' + c.card.slice(0, 40) + '»'); out.reloadCard = c.card;
      if (/만드는 중/.test(c.card)) { await f.click('[data-fk="mkvcok:groom"]').catch(() => {}); await sleep(200); const r2 = await look(f); out.reloadOpen = r2; out.timeline.push('reload · 카드 누름 → ' + r2.ph + (r2.panel ? ' +동의창' : '')); } }
    if (sc.tab2At && !tab2Done && now >= sc.tab2At) { tab2Done = true;
      if (sc.tab2 === 'ready') { await t2.click('[data-fk="mkvcmake"]'); out.timeline.push('tab2 만들기'); }
      else { ctx2 = await mkCtx(); tab2 = await ctx2.newPage(); t2 = await open(tab2); await sleep(500); const c2 = await look(t2); out.tab2Card = c2.card; out.timeline.push('tab2 카드 «' + c2.card.slice(0, 40) + '»');
        if (/만드는 중/.test(c2.card)) { await t2.click('[data-fk="mkvcok:groom"]').catch(() => {}); await sleep(200); out.tab2Open = await look(t2); out.timeline.push('tab2 카드 누름 → ' + out.tab2Open.ph + (out.tab2Open.panel ? ' +동의창' : '')); } } }
    if (/조금 오래 걸리고 있어요/.test(s.dlg)) slowSeen = true;
    if (s.tune && out.tuneTries === undefined) out.tuneTries = (W.st().groom && W.st().groom.tries) || 0;   // 화면이 처음 «준비됐어요»로 간 순간 서버의 만든 수
    if (sc.downAt && !downGo && now >= sc.downAt[0]) { downGo = true; statusDown = sc.downAt[1]; out.timeline.push('상태 묻기 ' + sc.downAt[1] + '번 끊김'); }
    if (sc.tokAt && !tokGo && now >= sc.tokAt) { tokGo = true; await pg.evaluate(() => { window.__TOK = 'X'; }); out.timeline.push('로그인 풀림'); }
    if (sc.bride && !brideGo && now >= sc.bride) { brideGo = true; await f.evaluate(() => { _dlgShut(); }); await sleep(200); await startEnroll(f, 'bride'); await f.click('[data-fk="mkvcmake"]'); out.timeline.push('신부 만들기'); }
    if (sc.want === 'err' && s.err && !s.enr) break;
    if (sc.want === 'err-seen' && seenErr) break;
    if (sc.bride && !(brideGo && s.tune && s.readyB && s.ready)) continue;
    if (s.tune && !sc.close && !(sc.tab2At && !tab2Done)) { if (!t2) break; const s2 = await look(t2).catch(() => ({})); if (s2.tune || (s2.err && !s2.enr)) { out.tab2 = s2; break; } }
    if (sc.close && (s.tune || s.ready) && (!sc.reopenAt || reopened)) break;
  }
  const fin = await look(f).catch(() => ({}));
  for (let i = 0; i < 400 && pending > 0; i++) await sleep(50);   // 서버 쪽 만들기가 다 끝난 뒤에 업체 칸 · 저장을 잰다
  out.fin = fin; out.firstErr = firstErr; out.seenErr = seenErr; out.errAt = errAt; out.clones = W.clones(); out.st = W.st(); out.rec = W.rec; out.leak = W.leak();
  // 판정
  const why = [];
  if (sc.want === 'ok') { if (!(fin.tune || (sc.close && (fin.ready || /목소리 생성/.test(fin.card || ''))))) why.push('목소리가 준비되지 않았다 · 끝 «' + (fin.err || fin.dlg || fin.toast || '').slice(0, 80) + '»'); if (seenErr && !sc.retry) why.push('중간에 오류 글을 보였다 «' + firstErr.slice(0, 70) + '»'); }
  if (sc.want === 'err') { if (fin.tune) why.push('오류여야 하는데 준비로 갔다'); if (!fin.err && !fin.toast) why.push('오류 글이 없다'); else { const t = fin.err || fin.toast; if (sc.msg && !sc.msg.test(t)) why.push('글이 기대와 다르다 «' + t.slice(0, 80) + '»'); if (sc.nomsg && sc.nomsg.test(t)) why.push('틀린 안내 «' + t.slice(0, 80) + '»'); }
    if (sc.redo && fin.step !== 1) why.push('녹음 거절인데 글 1 부터가 아니다(걸음 ' + fin.step + ')');
    if (sc.by && errAt > sc.by) why.push('오류를 너무 늦게 알렸다(' + Math.round(errAt / 1000) + '초 · 기대 ' + sc.by / 1000 + '초 안)'); }
  if (sc.want === 'ok' && !sc.bride && !sc.tab2 && out.tuneTries !== undefined && !(out.tuneTries > triesBefore)) why.push('서버가 다 만들기 전에 «준비됐어요»로 갔다(만든 수 ' + triesBefore + ' → ' + out.tuneTries + ') · 다시 녹음이면 옛 목소리로 맞추기를 듣는다');
  if (sc.slow === true && !slowSeen) why.push('40초가 넘었는데 «조금 오래 걸리고 있어요»가 안 나왔다');
  if (sc.slow === false && slowSeen) why.push('금방 끝났는데 «조금 오래 걸리고 있어요»가 나왔다');
  if (sc.bride && !(out.st.groom && out.st.groom.voiceId && out.st.bride && out.st.bride.voiceId)) why.push('두 분 중 한 분 목소리가 저장되지 않았다 · ' + JSON.stringify({ g: out.st.groom && out.st.groom.voiceId, b: out.st.bride && out.st.bride.voiceId }));
  if (sc.want === 'err-seen' && !seenErr) why.push('창을 닫은 뒤 실패를 알리지 않았다 · 카드 «' + (fin.card || '') + '»');
  if (sc.reopenAt && (!reopened || reopened.panel || reopened.ph !== 'busy')) why.push('만드는 중에 카드를 누르니 «만드는 중» 창이 아니다 · ' + JSON.stringify(reopened && { ph: reopened.ph, panel: reopened.panel }));
  if (sc.reloadAt && !/만드는 중/.test(out.reloadCard || '')) why.push('새로 연 화면이 «만드는 중»을 잇지 않았다 · 카드 «' + (out.reloadCard || '') + '»');
  if (sc.reloadAt && out.reloadOpen && (out.reloadOpen.panel || out.reloadOpen.ph !== 'busy')) why.push('새로 연 화면에서 카드를 누르니 처음부터(동의 창)였다');
  if (sc.tab2At && !(out.tab2 && out.tab2.tune)) why.push('두 번째 탭이 목소리 준비로 가지 않았다 · ' + JSON.stringify(out.tab2 || {}).slice(0, 120));
  if (sc.tab2 === 'late' && !/만드는 중/.test(out.tab2Card || '')) why.push('만드는 중에 연 다른 탭 카드가 «만드는 중»이 아니다 · «' + (out.tab2Card || '') + '»');
  if (sc.tab2 === 'late' && out.tab2Open && (out.tab2Open.panel || out.tab2Open.ph !== 'busy')) why.push('다른 탭에서 «만드는 중» 카드를 누르니 처음부터(동의 창)였다');
  if (sc.enrolls !== undefined && out.enrolls !== sc.enrolls) why.push('만들기 요청 ' + out.enrolls + '번(기대 ' + sc.enrolls + ')');
  if (sc.clones !== undefined && out.clones !== sc.clones) why.push('업체 복제 ' + out.clones + '번(기대 ' + sc.clones + ')');
  if (out.leak) why.push('새는 목소리 ' + out.leak + '개(업체 칸에 남음)');
  if (out.errs.length) why.push('pageerror ' + out.errs[0].slice(0, 80));
  out.why = why; await ctx.close(); if (ctx2) await ctx2.close(); return out;
}

let fail = 0;
/* ★[FN_NAME_ONE 2026-10-08 VC_SIM 과 합친 뒤 실측] 새 함수 _vcSnap(w)가 줄 만들기 사진 _vcSnap(key,o)(EX_RACE)와 이름이 같아 뒤 선언이 덮었다 —
   «보내기 전 만든 수»가 엉뚱한 값이 돼, 다시 녹음이 끊기면 서버가 끝내기 전에 옛 목소리로 «만들었어요»가 됐다. 오류 없이 조용히 틀린다 → 이름을 센다 */
for (const f of ['order-preview.html', 'mypage.html']) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'), c = {};
  for (const m of src.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) c[m[1]] = (c[m[1]] || 0) + 1;
  for (const m of src.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=\s*function/gm)) c['window.' + m[1]] = (c['window.' + m[1]] || 0) + 1;
  const dup = Object.entries(c).filter(([, v]) => v > 1).map(([k, v]) => k + '×' + v); console.log((dup.length ? 'FAIL ' : 'ok   ') + f + ' 최상위 함수 이름 ' + Object.keys(c).length + '개가 하나씩 [FN_NAME_ONE]' + (dup.length ? ' → 겹침 ' + dup.join(', ') : '')); if (dup.length) fail++; }
const SO = serverOnly();
for (const [m, c, d] of SO) { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + d)); if (!c) fail++; }
/* 브라우저가 없으면(CI merge-guard) 서버 쪽만 판정하고 끝낸다 — 서버 실패는 1, 통과면 «화면은 재지 못함»(2) */
const noBrowser = (why) => { srv.close(); console.log(fail ? 'FAIL 서버 ' + fail + ' / ' + SO.length + ' · 화면은 재지 못함(' + why + ')' : '서버 ' + SO.length + '가지 통과 · 화면은 재지 못함(' + why + ')'); process.exit(fail ? 1 : 2); };
if (!pw || process.env.NO_BROWSER) noBrowser(pw ? 'NO_BROWSER' : 'playwright 없음');   // NO_BROWSER=1 = CI merge-guard 와 같은 판정을 여기서 재 본다
try { br = await pw.chromium.launch(); } catch { try { br = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { noBrowser('브라우저 없음'); } }
const list = SC.filter((s) => !ONLY || ONLY.test(s.id)), results = []; let qi = 0;
await Promise.all(Array.from({ length: Math.min(PAR, list.length) }, async () => { while (qi < list.length) { const sc = list[qi++]; try { results.push(await run(sc)); } catch (e) { results.push({ id: sc.id, why: ['시험이 멈췄다 · ' + String(e && e.message || e).split('\n')[0].slice(0, 120)], timeline: [] }); } } }));
await br.close(); srv.close();
results.sort((a, b) => list.findIndex((s) => s.id === a.id) - list.findIndex((s) => s.id === b.id));
for (const r of results) { const ok = !r.why.length; if (!ok) fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + r.id.padEnd(22) + (ok ? '' : ' → ' + r.why.join(' / ')) + (r.clones !== undefined ? '  [복제 ' + r.clones + ' · 요청 ' + r.enrolls + (r.leak ? ' · 새는 ' + r.leak : '') + ']' : ''));
  if (VERBOSE || !ok) console.log('       ' + (r.timeline || []).join(' → ').slice(0, 1100)); }
console.log(fail ? 'FAIL ' + fail + ' / ' + (results.length + SO.length) : 'VC ENROLL SIM OK · 화면 ' + results.length + '가지 · 서버 ' + SO.length + '가지');
process.exit(fail ? 1 : 0);
