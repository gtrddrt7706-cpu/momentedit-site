#!/usr/bin/env node
/* ★★[VC_R2_SERVER 2026-10-09 고객 여정 A~Z 점검 2라운드 · AI 녹음 서버 몫] 원문(80_production.gs) 조각을 vm 으로 돌려 잰다(vc-del-stop 과 같은 틀).
   B2-8 [PHRASE_KEEP]  화면이 미리 받아 두는 확인 문장(keep)은 30분 안이면 지금 문장 그대로 · «다시 받기»는 늘 새로 · 새로 뽑을 때 바로 앞 문장(prev)을 남긴다
   B2-8 [PHRASE_SHOWN] 읽은 녹음 기록의 확인 문장 = 화면이 보여 준 문장(지금 · 바로 앞 문장일 때만) · 서버가 준 적 없는 문장은 기록하지 않는다
   B2-5 [VC_CANCEL_PUB] 지우기가 «취소»를 적은 만들기는 업체가 답하기 전이어도 상태에 «끝 · 취소»로 나간다(지운 쪽 화면이 «만드는 중…»을 이어받지 않게)
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const GS = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
const NT = fs.readFileSync(path.join(ROOT, 'automation/platform/95_notify.gs'), 'utf8');
const CB = fs.readFileSync(path.join(ROOT, 'automation/consultation/consultation-booking.gs'), 'utf8');
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const FN = ['_vcCacheGet', '_vcTtsReq', '_voiceStudio', '_vcSpent', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcFetch', '_vcErr', '_vcWhy', '_vcGate', 'vcLastErrors', '_vcAlert', '_vcCharLog', '_vcTts', '_vcAiFolder', '_vcHash', '_vcCached', '_vcTempo', '_vcPause', '_vcKoNum', '_vcNewPhrase', '_vcDelVoice', '_vcDelMark', '_vcJobPub', '_vcJobStart', '_vcEnrollAfter', 'handleVoiceClone', '_vcChunks', '_vcPub', '_vcSlots'];
const NFN = ['_errArea', '_errId', '_errStamp'];
const miss = FN.filter((f) => !grabIn(GS, f)).concat(NFN.filter((f) => !grabIn(NT, f)));
if (miss.length) { console.log('FAIL 원문 조각을 못 떼었다 — ' + miss.join(', ')); process.exit(1); }
const ERR_AREA_SRC = (() => { const i = NT.indexOf('var ERR_AREA = {'); let d = 0; for (let k = NT.indexOf('{', i); k < NT.length; k++) { if (NT[k] === '{') d++; else if (NT[k] === '}') { d--; if (!d) return NT.slice(i, k + 1) + ';'; } } return ''; })();
const SRV = [lineIn(GS, /var RF_KEYS[^\n]*/), lineIn(GS, /var VC_BASE[^\n]*/), lineIn(GS, /var VC_DOWN[^\n]*/), lineIn(GS, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(GS, f)))
  .concat([lineIn(NT, /var ERR_SKIP[^\n]*/), ERR_AREA_SRC, lineIn(NT, /var ERR_BUSY_RE[^\n]*/)]).concat(NFN.map((f) => grabIn(NT, f))).join('\n');
const INTENDED = lineIn(CB, /var _intended = [^\n]*\n[^\n]*\n/); if (!INTENDED) { console.log('FAIL doPost 잡기 판정 줄을 못 떼었다'); process.exit(1); }
let bad = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + d)); if (!c) bad++; };

function world(sc) {   // 가짜 업체(복제 · 지우기 · TTS) · 드라이브 · 속성 · 잠금 — onDel: 업체 지우기 순간 끼울 일 · delCode: 업체 지우기 답 · lockFail(n): n번째 잠금 실패
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
        if (m === 'DELETE') { const vid = decodeURIComponent(p.split('/').pop()); if (sc.onDel) { const h = sc.onDel; sc.onDel = null; h(vid); } alive.delete(vid); return res(sc.delCode || 204, ''); }
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
  return { hook: sc, props, calls, files, rec, call, begin, st, alive, clones: () => calls.filter((k) => /instant-clone/.test(k)).length,
    leak: () => { const s = st(), used = [s.groom && s.groom.voiceId, s.bride && s.bride.voiceId].filter(Boolean); return [...alive].filter((v) => used.indexOf(v) < 0).length; } };
}

const J = (o) => JSON.stringify(o);
const consent = (W, who) => W.call({ token: 'T', op: 'consent', who, agree: true });
const phrase = (W, who, keep) => W.call(Object.assign({ token: 'T', op: 'phrase', who }, keep ? { keep: 1 } : {}));
const enroll = (W, who, jid, ph) => W.call(Object.assign({ token: 'T', op: 'enroll', who, jid, sec: 50, data: 'data:audio/wav;base64,AAAA' }, ph === undefined ? {} : { phrase: ph }));

/* ── B2-8 [PHRASE_KEEP] ── */
{ const W = world({}); consent(W, 'groom');
  const a = phrase(W, 'groom'), b = phrase(W, 'groom', true);
  ok('1 [PHRASE_KEEP] 30분 안 미리 받기(keep)는 지금 문장 그대로 · 새로 뽑지 않는다', a.ok && b.ok && b.phrase === a.phrase && b.kept === true, J({ a, b }));
  const s = W.st(); s.groom.phrase.ms = Date.now() - 31 * 60e3; W.props.VC_ME0001 = J(s);
  const c = phrase(W, 'groom', true), s2 = W.st();
  ok('2 [PHRASE_KEEP] 30분이 지난 문장은 미리 받기에도 새로 · 바로 앞 문장을 prev 로', c.ok && !c.kept && s2.groom.phrase.t === c.phrase && s2.groom.phrase.prev === a.phrase, J({ c, p: s2.groom.phrase }));
  const d = phrase(W, 'groom'), s3 = W.st();
  ok('3 [PHRASE_KEEP] «다시 받기»(keep 없음)는 늘 새로 뽑는다 · 뽑은 때(ms)를 적는다', d.ok && !d.kept && s3.groom.phrase.prev === c.phrase && typeof s3.groom.phrase.ms === 'number', J({ d, p: s3.groom.phrase }));
  const e = phrase(W, 'bride', true);
  ok('3b [PHRASE_KEEP] 동의 전에는 미리 받기도 거절', e.ok === false, J(e)); }

/* ── B2-8 [PHRASE_SHOWN] ── */
{ const W = world({}); consent(W, 'groom');
  const t1 = phrase(W, 'groom').phrase, t2 = phrase(W, 'groom').phrase;   // 화면은 t1 을 보여 주는 중 · 늦게 온 «다시 받기»로 서버 문장은 t2
  const r = enroll(W, 'groom', 'J1', t1), s = W.st();
  ok('4 [PHRASE_SHOWN] 화면이 보여 준 바로 앞 문장으로 읽었으면 기록도 그 문장', r.ok !== false && !!(s.groom.read && s.groom.read.phrase === t1), J({ r, read: s.groom.read, t1, t2 })); }
{ const W = world({}); consent(W, 'groom');
  const t1 = phrase(W, 'groom').phrase, r = enroll(W, 'groom', 'J1', '오늘은 서버가 준 적 없는 문장'), s = W.st();
  ok('5 [PHRASE_SHOWN] 서버가 준 적 없는 문장은 기록하지 않는다(서버 문장)', !!(s.groom.read && s.groom.read.phrase === t1), J({ r, read: s.groom.read })); }
{ const W = world({}); consent(W, 'groom');
  const t1 = phrase(W, 'groom').phrase; enroll(W, 'groom', 'J1'); const s = W.st();
  ok('6 [PHRASE_SHOWN] 문장을 안 보낸 옛 화면은 종전대로 서버 문장', !!(s.groom.read && s.groom.read.phrase === t1), J({ read: s.groom.read })); }

/* ── B2-5 [VC_CANCEL_PUB] ── */
{ const W = world({}); consent(W, 'groom'); phrase(W, 'groom');
  const run = W.begin({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' });   // 업체가 답하기 전
  const del = W.call({ token: 'T', op: 'delete', who: 'groom' });
  const s1 = W.call({ token: 'T', op: 'status' }), j1 = s1.groom && s1.groom.job;
  ok('7 [VC_CANCEL_PUB] 지우기가 취소를 적은 만들기는 업체가 답하기 전에도 «끝 · 취소»(V0)로 나간다', del.ok && !!j1 && j1.jid === 'A0' && j1.end === true && j1.ok === false && j1.kind === 'cancel' && j1.ecode === 'V0' && !!j1.error, J({ del, j1 }));
  run.commit(); const s2 = W.call({ token: 'T', op: 'status' }), j2 = s2.groom && s2.groom.job;
  ok('8 [VC_CANCEL_PUB] 업체가 답한 뒤에도 끝 · 실패 · 목소리 없음(업체에 남은 목소리 0)', !!j2 && j2.end === true && j2.ok === false && !s2.groom.ready && W.leak() === 0, J({ j2, ready: s2.groom.ready, leak: W.leak() })); }
{ const W = world({}); consent(W, 'groom'); phrase(W, 'groom');
  const run = W.begin({ token: 'T', op: 'enroll', who: 'groom', jid: 'B0', sec: 50, data: 'data:audio/wav;base64,AAAA' });
  const s1 = W.call({ token: 'T', op: 'status' }), j1 = s1.groom && s1.groom.job;
  ok('9 [VC_CANCEL_PUB] 취소가 없으면 도는 만들기는 «아직»(end:false) 그대로', !!j1 && j1.end === false && j1.kind !== 'cancel', J(j1));
  run.commit(); }

console.log(bad ? `\nVC R2 SERVER FAIL ${bad}` : '\nVC R2 SERVER OK');
process.exit(bad ? 1 : 0);
