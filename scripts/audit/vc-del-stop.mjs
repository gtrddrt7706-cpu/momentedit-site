#!/usr/bin/env node
/* ★★[VC_DEL_STOP 2026-10-09 점검 E-4 · E-3 · E-8] «지우기»가 이긴다 · 한 분 줄은 그 분 목소리로만 · 줄 파일 «지우기»는 뒤에 올린 것을 두지 않는다 — 원문(80_production.gs) 조각을 vm 으로 돌려 잰다.
   E-4 [VC_DEL_STOP]   다시 녹음(목소리 만드는 중)에 «지우기»(다른 탭 · 기기)가 오면 새 목소리를 업체에서 지우고 저장하지 않는다(업체가 답하기 전 · 저장 직전 둘 다) ·
                       다른 분 지우기 · 지운 뒤 새로 만들기는 막지 않는다 · 잠금 실패에도 · 업체 지우기 실패는 retry
   E-3 [VC_ONE_OWN]    한 분이 읽는 줄(one)은 그 분 목소리가 없으면 다른 분 목소리로 만들지 않고 거절(V0) · 나눠 읽는 줄(lines)은 종전대로(WHO_MISS)
   E-8 [RF_DEL_ALL_T0] 줄 파일 «지우기»(all)는 지운 파일보다 뒤에 만든 파일 · 스튜디오 파일은 두고 옛 사본만 쓴다 · 지운 파일을 못 찾으면 쓸지 않는다
   ★업체가 1~2분 걸리는 만들기는 «답하기 전»(handleVoiceClone)과 «답한 뒤»(_vcEnrollAfter)를 나눠, 그 사이에 다른 요청을 진짜 순서로 끼운다(vc-enroll-sim 과 같은 틀).
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

/* ── E-4 [VC_DEL_STOP] ── */
const ENR = (W, who, jid) => W.begin({ token: 'T', op: 'enroll', who, jid, sec: 50, data: 'data:audio/wav;base64,AAAA' });
const prep = (W, who) => { W.call({ token: 'T', op: 'consent', who, agree: true }); W.call({ token: 'T', op: 'phrase', who }); };
const liveReads = (W) => Object.values(W.files).filter((f) => !f.trash && /^읽은 녹음/.test(f.name)).length;
const allReads = (W) => Object.values(W.files).filter((f) => /^읽은 녹음/.test(f.name)).length;   // 휴지통에 간 것까지 — 업체가 답하기 전에 지우기가 왔으면 새 녹음을 아예 만들지 않는다
// ① 다시 녹음 중 지우기(업체가 답하기 전) — 저장 안 함 · 업체에 남은 목소리 0 · 작업표 «취소» · 새 읽은 녹음 없음
{ const W = world({}); prep(W, 'groom'); W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
  const reads0 = liveReads(W), all0 = allReads(W), a = ENR(W, 'groom', 'A1'); const d = W.call({ token: 'T', op: 'delete', who: 'groom' }); const ra = a.commit(); const s = W.call({ token: 'T', op: 'status' });
  ok('E-4 ① 다시 녹음 중 지우기 → 지우기 답 ok · 만들기 답 V0 · voiceId 비움 · 업체 0 · 작업표 cancel · 확인 문장 씀', d.ok && !ra.ok && ra.ecode === 'V0' && /지웠어요/.test(ra.error) && !W.st().groom.voiceId && !s.groom.ready && W.alive.size === 0 && s.groom.job && s.groom.job.end && s.groom.job.kind === 'cancel' && W.st().groom.phrase === null, JSON.stringify({ d, ra, st: W.st(), alive: [...W.alive] }));
  ok('E-4 ① 새 읽은 녹음 파일을 남기지 않는다 · 업체가 답하기 전에 온 지우기면 아예 만들지 않는다(앞 확인)', liveReads(W) <= reads0 && allReads(W) === all0, 'reads ' + liveReads(W) + ' / ' + reads0 + ' · 만든 수 ' + allReads(W) + ' / ' + all0); }
// ② 처음 만들기 중 지우기(목소리 없음) — 그래도 멈춘다
{ const W = world({}); prep(W, 'bride'); const a = ENR(W, 'bride', 'B1'); const d = W.call({ token: 'T', op: 'delete', who: 'bride' }); const ra = a.commit();
  ok('E-4 ② 처음 만들기 중 지우기 → 저장 안 함 · 업체 0', d.ok && !ra.ok && !W.st().bride.voiceId && W.alive.size === 0, JSON.stringify({ d, ra, alive: [...W.alive] })); }
// ③ 저장하려는 사이 지우기(업체가 답한 뒤 · 앞 목소리 지우는 중) — 잠근 채 다시 읽어 멈춘다
{ let W; W = world({ onDel: null }); prep(W, 'groom'); W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
  const a = ENR(W, 'groom', 'A1'); let d = null; W.sc = null;
  // 앞 목소리(uc_1)를 업체에서 지우는 그 순간 다른 탭의 «지우기»가 들어온다
  W.hook.onDel = () => { d = W.call({ token: 'T', op: 'delete', who: 'groom' }); };
  const ra = a.commit();
  ok('E-4 ③ 저장 직전 지우기 → 저장 안 함 · 업체 0 · 새 읽은 녹음 휴지통 · 작업표 cancel', d && d.ok && !ra.ok && ra.ecode === 'V0' && !W.st().groom.voiceId && W.alive.size === 0 && liveReads(W) === 0 && W.st().groom.job.kind === 'cancel', JSON.stringify({ d, ra, st: W.st(), alive: [...W.alive], reads: liveReads(W) })); }
// ④ 지우기 없이 다시 녹음 — 종전대로 새 목소리 · 앞 목소리는 업체에서 지움(돌연변이 아님 확인)
{ const W = world({}); prep(W, 'groom'); W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
  const ra = ENR(W, 'groom', 'A1').commit();
  ok('E-4 ④ 지우기 없이 다시 녹음 → 새 목소리 저장 · 앞 목소리 업체에서 지움 · renewed', ra.ok && ra.renewed && W.st().groom.voiceId === 'uc_2' && W.alive.size === 1 && W.alive.has('uc_2'), JSON.stringify({ ra, st: W.st(), alive: [...W.alive] })); }
// ⑤ 다른 분 지우기는 이 분 만들기를 멈추지 않는다
{ const W = world({}); prep(W, 'groom'); prep(W, 'bride'); W.call({ token: 'T', op: 'enroll', who: 'bride', jid: 'B0', sec: 50, data: 'data:audio/wav;base64,AAAA' });
  const a = ENR(W, 'groom', 'G1'); const d = W.call({ token: 'T', op: 'delete', who: 'bride' }); const ra = a.commit();
  ok('E-4 ⑤ 신부 지우기 중 신랑 만들기 → 신랑 목소리 저장 · 신부만 지움', d.ok && ra.ok && W.st().groom.voiceId === 'uc_2' && !W.st().bride.voiceId && W.alive.size === 1, JSON.stringify({ d, ra, st: W.st(), alive: [...W.alive] })); }
// ⑥ 지운 뒤 새로 만들기 — 멈추지 않는다
{ const W = world({}); prep(W, 'groom'); W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' }); W.call({ token: 'T', op: 'delete', who: 'groom' });
  W.call({ token: 'T', op: 'phrase', who: 'groom' }); const w0 = Date.now(); while (Date.now() === w0) {}   // 지운 때와 다른 밀리초에 시작
  const ra = ENR(W, 'groom', 'A2').commit();
  ok('E-4 ⑥ 지운 뒤 다시 만들기 → 새 목소리 저장', ra.ok && W.st().groom.voiceId === 'uc_2' && W.alive.size === 1, JSON.stringify({ ra, st: W.st(), alive: [...W.alive] })); }
// ⑦ «두 분 모두 지우기»(who: all) 중 만들기 — 멈춘다
{ const W = world({}); prep(W, 'groom'); prep(W, 'bride'); W.call({ token: 'T', op: 'enroll', who: 'bride', jid: 'B0', sec: 50, data: 'data:audio/wav;base64,AAAA' });
  const a = ENR(W, 'groom', 'G1'); const d = W.call({ token: 'T', op: 'delete', who: 'all' }); const ra = a.commit();
  ok('E-4 ⑦ 모두 지우기 중 만들기 → 둘 다 비움 · 업체 0', d.ok && !ra.ok && !W.st().groom.voiceId && !W.st().bride.voiceId && W.alive.size === 0, JSON.stringify({ d, ra, st: W.st(), alive: [...W.alive] })); }
// ⑧ 지우기가 잠금을 못 잡아도 — 다시 읽은 상태에 쓰고 만들기를 멈춘다
{ const W = world({ lockFail: (n) => n === 4 }); prep(W, 'groom'); const a = ENR(W, 'groom', 'G1'); const d = W.call({ token: 'T', op: 'delete', who: 'groom' }); const ra = a.commit();
  ok('E-4 ⑧ 잠금 실패에도 지우기가 이긴다', d.ok && !ra.ok && !W.st().groom.voiceId && W.alive.size === 0, JSON.stringify({ d, ra, st: W.st(), alive: [...W.alive] })); }
// ⑨ 업체 지우기가 실패하면(500) retry 목록에 남는다(만들기 멈춤 쪽)
{ const W = world({ delCode: 500 }); prep(W, 'groom'); const a = ENR(W, 'groom', 'G1'); W.call({ token: 'T', op: 'delete', who: 'groom' }); const ra = a.commit();
  ok('E-4 ⑨ 새 목소리 업체 지우기 실패 → retry 에 남김(매일 정리가 다시)', !ra.ok && (W.st().retry || []).indexOf('uc_1') > -1, JSON.stringify(W.st())); }

/* ── E-3 [VC_ONE_OWN] ── */
{ const W = world({}); W.call({ token: 'T', op: 'consent', who: 'groom', agree: true }); W.call({ token: 'T', op: 'phrase', who: 'groom' });
W.call({ token: 'T', op: 'enroll', who: 'groom', jid: 'A0', sec: 50, data: 'data:audio/wav;base64,AAAA' });
const t0 = W.calls.filter((k) => /text-to-speech/.test(k)).length;
const r1 = W.call({ token: 'T', op: 'make', key: 'g1', text: '신부가 읽는 줄이에요', one: 'bride', tempo: '1', pause: 150 });
const t1 = W.calls.filter((k) => /text-to-speech/.test(k)).length;
ok('E-3 ① 신부 줄(one: bride) · 신부 목소리 없음 → 신랑 목소리로 만들지 않고 거절(V0 · 이름 · 업체 안 부름)', !r1.ok && r1.ecode === 'V0' && /님 AI 목소리를 아직 만들지 않았어요$/.test(r1.error || '') && t1 === t0, JSON.stringify(r1) + ' tts ' + t0 + '→' + t1);
const r2 = W.call({ token: 'T', op: 'make', key: 'g0', text: '신랑이 읽는 줄이에요', one: 'groom', tempo: '1', pause: 150 });
ok('E-3 ② 신랑 줄(one: groom) · 신랑 목소리 있음 → 만든다', r2.ok && r2.parts && r2.parts.length === 1 && r2.parts[0].who === 'groom', JSON.stringify(r2).slice(0, 200));
const r3 = W.call({ token: 'T', op: 'make', key: 'entry', text: '가 나', one: '', lines: [['groom', '신랑 문장'], ['bride', '신부 문장']], tempo: '1', pause: 150 });
ok('E-3 ③ 나눠 읽는 줄(lines) · 신부 목소리 없음 → 종전대로 있는 목소리로 만든다(WHO_MISS)', r3.ok && r3.parts && r3.parts.length === 2, JSON.stringify(r3).slice(0, 200));
const r4 = W.call({ token: 'T', op: 'make', key: 'g2', text: '두 분이 읽는 줄', tempo: '1', pause: 150 });
ok('E-3 ④ 읽는 분 지정 없음(one 없음) → 있는 목소리로 만든다(종전 그대로)', r4.ok, JSON.stringify(r4).slice(0, 200));
}

/* ── E-8 [RF_DEL_ALL_T0] ── */
{
const RSRC = [lineIn(GS, /var RF_KEYS[^\n]*/), lineIn(GS, /var RF_ROOT_FOLDER[^\n]*/), grabIn(GS, '_rfFolderFor'), grabIn(GS, '_rfFileIn'), grabIn(GS, '_rfKeyOfName'), grabIn(GS, 'handleRitualFileDel')].join('\n');
function mkWorld() {
  const files = {}; let seq = 0, now = 1000;
  const folder = { getId: () => 'FOLDER', getFiles: () => { const ids = Object.keys(files); let i = 0; return { hasNext: () => i < ids.length, next: () => files[ids[i++]].f }; } };
  const mk = (name) => { const id = 'FILE' + String(++seq).padStart(6, '0'); const at = (now += 1000); files[id] = { name, trash: false, at };
    files[id].f = { getId: () => id, getName: () => name, isTrashed: () => files[id].trash, setTrashed: (t) => { files[id].trash = t; }, getDateCreated: () => new Date(at), getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return folder; } }; } }; return id; };
  const sb = { _gsr_: () => {}, resolveSession: () => ({ ok: true, row: { get: () => 'ME0001' } }), _sessionMsg: () => '',
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'RF_ME0001' ? 'FOLDER' : null), setProperty() {} }) },
    DriveApp: { getFolderById: () => folder, getFileById: (id) => { if (!files[id]) throw new Error('no'); return files[id].f; } }, String, Date, JSON };
  vm.createContext(sb); vm.runInContext(RSRC, sb);
  return { sb, files, mk };
}
{ const W = mkWorld(); const A = W.mk('시작 10분 전 · AI.wav'), B = W.mk('시작 10분 전 · AI.wav');
  const r = W.sb.handleRitualFileDel({ token: 'T', key: 'g1', id: A, all: 1 });
  ok('E-8 ① A 를 지우는 사이 새로 올린 B 는 남는다', W.files[A].trash && !W.files[B].trash, JSON.stringify(r)); }
{ const W = mkWorld(); const O = W.mk('시작 10분 전 · 첫 사본.wav'), S = W.mk('시작 10분 전 · 스튜디오 · 카톡.wav'), O2 = W.mk('시작 10분 전 · 다시 보내기 사본.wav'), A = W.mk('시작 10분 전 · 지금.wav'), X = W.mk('하객 입장 때 · 다른 자리.wav'), B = W.mk('시작 10분 전 · 뒤에 새로.wav');
  const r = W.sb.handleRitualFileDel({ token: 'T', key: 'g1', id: A, all: 1 });
  ok('E-8 ② all — 같은 자리 옛 사본 둘 휴지통 · 스튜디오 · 다른 자리 · 뒤에 새로 올린 것은 남는다', W.files[O].trash && W.files[O2].trash && W.files[A].trash && !W.files[S].trash && !W.files[X].trash && !W.files[B].trash && r.swept === 2, JSON.stringify({ r, t: Object.fromEntries(Object.entries(W.files).map(([k, v]) => [v.name, v.trash])) })); }
{ const W = mkWorld(); const A = W.mk('시작 10분 전 · 지금.wav'), B = W.mk('시작 10분 전 · 뒤에 새로.wav'); W.files[A].trash = true;
  const r = W.sb.handleRitualFileDel({ token: 'T', key: 'g1', id: A, all: 1 });
  ok('E-8 ③ 지운 파일이 이미 휴지통이면(기준 시각 없음) 아무것도 쓸지 않는다 · 멱등 ok', r.ok && r.gone && !W.files[B].trash && r.swept === 0, JSON.stringify(r)); }
{ const W = mkWorld(); const O = W.mk('시작 10분 전 · 옛.wav'), A = W.mk('시작 10분 전 · 지금.wav'), B = W.mk('시작 10분 전 · 뒤에 새로.wav');
  const r = W.sb.handleRitualFileDel({ token: 'T', key: 'g1', id: A });
  ok('E-8 ④ all 없이 — 옛 사본만(RF_DEL_SLOT) · 뒤 것은 둔다', W.files[O].trash && W.files[A].trash && !W.files[B].trash && r.swept === 1, JSON.stringify(r)); }
}
console.log(bad ? '━━ vc-del-stop — 빨강 ' + bad + '건 [VC_DEL_STOP]' : '━━ vc-del-stop — 통과 · 지우기가 이긴다(만드는 중 · 저장 직전 · 모두 · 잠금 실패 · retry) · 한 분 줄은 그 분 목소리로만 · 줄 파일 지우기는 뒤에 올린 것을 둔다 [VC_DEL_STOP]');
process.exit(bad ? 1 : 0);
