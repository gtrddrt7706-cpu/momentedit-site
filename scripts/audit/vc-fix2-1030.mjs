#!/usr/bin/env node
/* ★[VC_FIX2_1030 2026-10-30 GPT 2차 점검] 두 분 AI 목소리 서버(80_production.gs) — 지우기 · 저장 · 잠금 · 글자 예산 아홉 가지를 흉내로 잰다.
   ★원문을 그대로 떼어 쓴다(사본 금지) · GAS · 타입캐스트 · 드라이브는 가짜.
   ① [VC_READ_DEL]   한 분 목소리를 지우면 그 분이 읽은 녹음도 휴지통
   ② [VC_DEL_PEND]   업체가 지웠다고 답하지 않으면 «지웠어요»가 아니라 pend · 상태 deleting · retry 유지 → 다음 날 지워지면 풀림
   ③ [VC_PURGE_TRUE] 목소리 파일 모두 지우기 — AI 정리가 예외면 D4 · 지운 날(RFGONE) 안 적음
   ④ [VC_READ_DEL · VC_PURGE_TRUE] 예식 다음 날 지우기 — 읽은 녹음 휴지통이 실패하면 id 를 남기고 purged 를 적지 않는다 → 다음 날 다시
   ⑤ [VC_SAVE_FIRST] 다시 만들기 — 저장이 막히면 앞 목소리는 그대로(업체에도 상태에도) · 새 목소리는 업체에서 지움
   ⑥ [VC_JOB_BUSY]   작업표 잠금을 못 잡으면 업체에 묻지 않고 V1
   ⑦ [VC_SAVE_BUSY]  저장 잠금을 못 잡으면 쓰지 않고 V1(다른 분 확인 문장을 덮지 않는다)
   ⑧ [VC_CNT_ZERO]   처음 생기는 세는 칸도 0 에서 더한다(80 + 80 = 160)
   ⑨ [VC_HOLD]       한도 근처 동시 두 건 — 앞 건이 미리 센 글자를 뒤 건이 본다 · 못 만든 글자는 돌려준다
   깨 보기: 고친 줄을 옛 꼴로 되돌린 원문으로 같은 장면을 다시 돌려 그 장면이 빨개지는지 본다(되돌림마다 하나).
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import vm from 'node:vm';
const SRC0 = fs.readFileSync(new URL('../../automation/platform/80_production.gs', import.meta.url), 'utf8');
const FN = ['_vcCacheGet', '_vcTtsReq', '_voiceStudio', '_vcSpent', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcHold', '_vcFetch', '_vcErr', '_vcWhy', '_vcGate', '_vcAlert', '_vcCharLog', '_vcTts', '_vcAiFolder', '_vcHash', '_vcCached', '_vcTempo', '_vcPause', '_vcKoNum', '_vcNewPhrase', '_vcDelVoice', '_vcDelMark', '_vcReadTrash', '_vcPendOf', '_vcPracticeTrash', '_vcJobPub', '_vcJobStart', '_vcEnrollAfter', 'handleVoiceClone', '_vcChunks', '_vcPub', '_vcPurgeNow', 'purgeVoiceClones', '_vcSlots', 'handleRitualFilePurgeMine'];
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
{ const miss = FN.filter((f) => !grabIn(SRC0, f)); if (miss.length) { console.log('FAIL 원문 조각을 못 떼었다 — ' + miss.join(', ')); process.exit(1); } }

function world(src, o) {
  o = o || {};
  const code = [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n');
  const props = Object.assign({ TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', PRACTICE_READ: 'on', TYPECAST_VOICE_M: 'tc_m', TYPECAST_VOICE_F: 'tc_f' }, o.props || {}), calls = [], files = {}, cache = {}, alive = new Set();
  const ctl = { lockFail: () => false, driveFail: false, delCode: 204, onFetchAll: null, today: o.today || '2026-10-20', lockN: 0 };
  let seq = 0, vn = 0;
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [7, 7, 7] }) });
  const mkFile = (id) => ({ getId: () => id, getName: () => files[id].name, isTrashed: () => !!files[id].trash,
    setTrashed: (t) => { if (ctl.driveFail) throw new Error('Service error: Drive'); files[id].trash = t; }, getBlob: () => ({ getBytes: () => [1], getContentType: () => 'audio/mpeg' }) });
  const folder = () => ({ getFoldersByName: () => { const f = folder(); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder(),
    createFile: (b) => { const id = 'F' + (++seq); files[id] = { name: b.name, trash: false }; files[id].f = mkFile(id); return files[id].f; },
    getFilesByName: (n) => { const l = Object.keys(files).filter((k) => files[k].name === n).map((k) => files[k].f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; },
    getFiles: () => { const l = Object.keys(files).map((k) => files[k].f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; },
    setTrashed: () => {} });
  const fetch1 = (url, q) => { const p = url.replace('https://api.typecast.ai', ''), m = String(q.method || 'get').toUpperCase(); calls.push(m + ' ' + p);
    if (/instant-clone/.test(p)) { const v = 'uc_' + (++vn); alive.add(v); return res(201, { voice_id: v }); }
    if (m === 'DELETE') { const v = decodeURIComponent(p.split('/').pop()); if (ctl.delCode === 204 || ctl.delCode === 404) alive.delete(v); return res(ctl.delCode, ''); }
    if (/text-to-speech/.test(p)) return res(ctl.ttsCode || 200, 'mp3');
    if (p === '/v1/custom-voices') return res(200, [...alive]);
    if (p === '/v1/users/me/subscription') return res(200, { plan: 'x', limits: { custom_voice_slot: 50 } });
    return res(404, {}); };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { ctl.lockN++; if (ctl.lockFail(ctl.lockN, calls)) throw new Error('Lock timeout'); }, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetch: fetch1, fetchAll: (reqs) => { if (ctl.onFetchAll) { const h = ctl.onFetchAll; ctl.onFetchAll = null; h(); } return reqs.map((r) => fetch1(r.url, r)); } },
    DriveApp: { getFileById: (id) => { if (!files[id]) throw new Error('No item with the given ID could be found'); return files[id].f; }, getFolderById: () => folder() },
    Utilities: { formatDate: (d, tz, f) => (f === 'yyyy-MM-dd' ? ctl.today : f === 'yyyy-MM' ? ctl.today.slice(0, 7) : f === 'M' ? String(+ctl.today.slice(5, 7)) : f === 'd' ? String(+ctl.today.slice(8, 10)) : ctl.today),
      base64Encode: (b) => 'B64:' + b.length, base64Decode: () => [1, 2], newBlob: (b, m, n) => ({ name: n }), sleep: () => {},
      computeDigest: (a, s) => Array.from(Buffer.from(String(s))), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'), DigestAlgorithm: {}, Charset: {} },
    resolveSession: (t) => (t === 'T' ? { ok: true, row: { get: () => 'ME0001' } } : { ok: false, reason: 'x' }), _sessionMsg: () => '다시 로그인',
    fmtKST: () => ctl.today + ' 10:00', _rfFolderFor: () => folder(), findCustomerByCode: () => ({ get: (h) => (h === '예식일' ? (o.wed || '2026-10-10') : (o.stage || '예식준비')) }),
    _gsr_: () => {}, _trigIn_: () => {}, _requireAdmin: () => ({ ok: true }), _rfMailFlush: () => {},
    _ymdOf: (v) => v, _nfAdminLineEmail: () => {}, handleAiCostLog: () => {}, Logger: { log() {} }, JSON, Math, String, Date, Array, Buffer, encodeURIComponent, decodeURIComponent, Object, Number, RegExp, Error,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  const call = (body) => JSON.parse(JSON.stringify(sb.handleVoiceClone(Object.assign({ token: 'T' }, body)) || null));
  const st = () => JSON.parse(props.VC_ME0001 || '{}');
  const enroll = (who) => { call({ op: 'consent', who, agree: true }); call({ op: 'phrase', who }); return call({ op: 'enroll', who, sec: 60, data: 'data:audio/wav;base64,AAAA' }); };
  const reads = () => Object.keys(files).filter((k) => /^읽은 녹음/.test(files[k].name) && !files[k].trash);
  return { sb, props, calls, files, alive, ctl, call, st, enroll, reads };
}

/* 장면 — 각 장면은 { 이름: 참/거짓 } 하나를 돌려준다(되돌린 원문에서도 같은 장면을 돈다) */
const SC = {
  readDel(src) { const W = world(src); W.enroll('groom'); W.enroll('bride'); const r0 = W.reads().length; const d = W.call({ op: 'delete', who: 'groom' });
    const s = W.st(); return { pass: d.ok && r0 === 2 && W.reads().length === 1 && !(s.groom.read && s.groom.read.id) && !!(s.bride.read && s.bride.read.id), d: JSON.stringify({ d, r0, r1: W.reads().length, g: s.groom.read }) }; },
  delPend(src) { const W = world(src); W.enroll('groom'); W.ctl.delCode = 500; const d = W.call({ op: 'delete', who: 'groom' }); const s1 = W.call({ op: 'status' });
    W.ctl.delCode = 204; W.ctl.today = '2026-10-21'; W.sb.purgeVoiceClones(); const s2 = W.call({ op: 'status' });
    return { pass: d.ok && d.pend === true && s1.groom.deleting === true && !s1.groom.ready && (W.st().retry || []).length === 0 && s2.groom.deleting === false && W.alive.size === 0, d: JSON.stringify({ d, s1: s1.groom, s2: s2.groom, retry: W.st().retry, alive: [...W.alive] }) }; },
  purgeThrow(src) { const W = world(src); W.enroll('groom'); W.sb._vcCfg_ = () => { throw new Error('boom'); };
    const r = W.sb.handleRitualFilePurgeMine({ token: 'T' }); return { pass: !r.ok && r.ecode === 'D4' && !W.props.RFGONE_ME0001, d: JSON.stringify({ r, gone: W.props.RFGONE_ME0001 }) }; },
  purgeReadFail(src) { const W = world(src, { wed: '2026-10-10' }); W.enroll('groom'); W.ctl.driveFail = true; W.ctl.today = '2026-10-11'; W.sb.purgeVoiceClones();
    const s1 = W.st(); W.ctl.driveFail = false; W.ctl.today = '2026-10-12'; W.sb.purgeVoiceClones(); const s2 = W.st();
    return { pass: !!(s1.groom.read && s1.groom.read.id) && !s1.purged && !!s1.purgePend && !(s2.groom.read && s2.groom.read.id) && !!s2.purged && !s2.purgePend && W.reads().length === 0,
      d: JSON.stringify({ s1: { read: s1.groom.read, purged: s1.purged, pend: s1.purgePend }, s2: { read: s2.groom.read, purged: s2.purged, pend: s2.purgePend } }) }; },
  saveFirst(src) { const W = world(src); W.enroll('groom'); const v0 = W.st().groom.voiceId; W.call({ op: 'phrase', who: 'groom' });
    W.ctl.lockFail = (n, calls) => calls.filter((c) => /instant-clone/.test(c)).length >= 2;   // 두 번째 복제가 끝난 뒤 잠금은 모두 실패(저장 막힘)
    const r = W.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' }); W.ctl.lockFail = () => false; const s = W.st();
    return { pass: !r.ok && r.ecode === 'V1' && s.groom.voiceId === v0 && W.alive.has(v0) && W.alive.size === 1 && !!(s.groom.phrase && s.groom.phrase.t), d: JSON.stringify({ r, v0, now: s.groom.voiceId, alive: [...W.alive] }) }; },
  jobBusy(src) { const W = world(src); W.call({ op: 'consent', who: 'groom', agree: true }); W.call({ op: 'phrase', who: 'groom' }); W.ctl.lockFail = () => true;
    const r = W.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' }); W.ctl.lockFail = () => false;
    return { pass: !r.ok && r.ecode === 'V1' && !W.calls.some((c) => /instant-clone/.test(c)) && W.alive.size === 0, d: JSON.stringify({ r, calls: W.calls }) }; },
  saveBusy(src) { const W = world(src); W.call({ op: 'consent', who: 'groom', agree: true }); W.call({ op: 'consent', who: 'bride', agree: true }); W.call({ op: 'phrase', who: 'bride' });
    const b0 = W.st().bride.phrase.t; W.ctl.lockFail = () => true; const r = W.call({ op: 'phrase', who: 'groom' }); W.ctl.lockFail = () => false; const s = W.st();
    return { pass: !r.ok && r.ecode === 'V1' && !(s.groom.phrase) && s.bride.phrase && s.bride.phrase.t === b0, d: JSON.stringify({ r, s }) }; },
  cntZero(src) { const W = world(src); const M = (f, b, m) => vm.runInContext('_vcM3(' + JSON.stringify(f) + ',' + JSON.stringify(b) + ',' + JSON.stringify(m) + ')', W.sb);
    const a = M({ practice: 80 }, {}, { practice: 80 }), c = M({ make: { total: 1, chars: 80, per: { g0: 1 } } }, {}, { make: { total: 1, chars: 80, per: { g0: 1 } } });
    const t = M({ groom: { job: { at: 5 } } }, { groom: {} }, { groom: { job: { at: 7 } } });   // 세는 칸이 아닌 숫자(시각)는 종전대로 바뀐 쪽
    return { pass: a.practice === 160 && c.make.total === 2 && c.make.chars === 160 && c.make.per.g0 === 2 && t.groom.job.at === 7, d: JSON.stringify({ a, c: c.make, t }) }; },
  hold(src) { const W = world(src); W.enroll('groom'); const s0 = W.st(); s0.practice = 199950; W.props.VC_ME0001 = JSON.stringify(s0);
    let r2 = null; W.ctl.onFetchAll = () => { r2 = W.call({ op: 'make', key: 'g1', text: '두 번째 줄 글이에요 · 사십 자쯤 되도록 길게 써 둔 글입니다 하나', one: 'groom' }); };
    const r1 = W.call({ op: 'make', key: 'g0', text: '첫 번째 줄 글이에요 · 사십 자쯤 되도록 길게 써 둔 글입니다 하나', one: 'groom' });
    const spent = (s) => (s.practice || 0) + ((s.make && s.make.chars) || 0), sp1 = spent(W.st());
    /* 못 만든 글자는 돌려준다 — 업체 실패(500) 뒤 쓴 글자가 그대로 */
    const s1 = W.st(); s1.practice = 1000; W.props.VC_ME0001 = JSON.stringify(s1); const before = spent(W.st()); W.ctl.ttsCode = 500;
    const r3 = W.call({ op: 'make', key: 'g2', text: '실패할 새 글', one: 'groom' }); W.ctl.ttsCode = 0; const after = spent(W.st());
    return { pass: r1.ok && r2 && !r2.ok && r2.limit && sp1 <= 200000 && !r3.ok && after === before, d: JSON.stringify({ r1: r1.ok, r2, sp1, r3: r3.ok, before, after }) }; },
};
/* 되돌림 — 고친 줄을 옛 꼴로(장면 하나에 하나) */
const BREAK = {
  readDel: [["      if (!_vcReadTrash(p, at)) out.rpend.push(w); });", '      });']],
  delPend: [["return { ok: true, gone: dm.gone, stop: dm.stop, pend: pend }; }", 'return { ok: true, gone: dm.gone, stop: dm.stop }; }']],
  purgeThrow: [["try { _vpn = _vcPurgeNow(code); } catch (e) { return { ok: false, ecode: 'D4',", "try { _vpn = _vcPurgeNow(code); } catch (e) { } if (0) { return { ok: false, ecode: 'D4',"]],
  purgeReadFail: [["{ p.read.del = p.read.del || at; return false; }", '{}']],
  saveFirst: [["    var okr = { ok: true, who: who, tries: pp.tries, renewed: !!(prev || now) }; mark(okr);\n    var sv;", "    olds.forEach(function (v) { _vcDelVoice(c.cfg, st, v); });\n    var okr = { ok: true, who: who, tries: pp.tries, renewed: !!(prev || now) }; mark(okr);\n    var sv;"]],
  jobBusy: [['catch (e) { return { lock: true }; }', 'catch (e) { return null; }']],
  saveBusy: [["var lock = LockService.getScriptLock(); try { lock.waitLock(10000); } catch (e) { return 'busy'; }\n  try { var f1", "var lock = LockService.getScriptLock(); try { lock.waitLock(10000); } catch (e) { var f0 = _vcSt(code); if (guard && guard(f0)) return 'stop'; _vcPut(code, _vcM3(f0, base, mine)); return; }\n  try { var f1"]],
  cntZero: [["(typeof b === 'number' || (isCnt && b == null))", "typeof b === 'number'"]],
  hold: [["var hm = todo.length ? _vcHold(code, need, 'make') : 'ok';", "var hm = (todo.length && _vcSpent(st) + need > VC_LIM.budget) ? 'limit' : 'ok';"]],
};
const NAME = { readDel: '① [VC_READ_DEL] 한 분 목소리 지우기 → 그 분 읽은 녹음도 휴지통 · 다른 분 녹음은 그대로',
  delPend: '② [VC_DEL_PEND] 업체 지우기 실패 → pend · 상태 deleting · 다음 날 지워지면 풀림',
  purgeThrow: '③ [VC_PURGE_TRUE] 모두 지우기 중 AI 정리 예외 → D4 · 지운 날 안 적음',
  purgeReadFail: '④ [VC_PURGE_TRUE] 예식 다음 날 · 읽은 녹음 휴지통 실패 → id 남김 · purged 안 적음 → 다음 날 다시 지우고 purged',
  saveFirst: '⑤ [VC_SAVE_FIRST] 다시 만들기 저장이 막힘 → V1 · 앞 목소리 그대로(상태 · 업체) · 새 목소리는 업체에서 지움 · 확인 문장 그대로',
  jobBusy: '⑥ [VC_JOB_BUSY] 작업표 잠금 실패 → V1 · 업체 복제 0',
  saveBusy: '⑦ [VC_SAVE_BUSY] 저장 잠금 실패 → V1 · 쓰지 않음 · 다른 분 확인 문장 그대로',
  cntZero: '⑧ [VC_CNT_ZERO] 처음 생기는 세는 칸 80 + 80 = 160 · 시각 숫자는 종전대로',
  hold: '⑨ [VC_HOLD] 한도 근처 동시 두 건 → 뒤 건은 «다 썼어요» · 업체 실패 글자는 돌려줌' };
for (const k of Object.keys(SC)) {
  let r; try { r = SC[k](SRC0); } catch (e) { r = { pass: false, d: 'throw ' + (e && e.stack || e).toString().slice(0, 300) }; }
  ok(NAME[k], r.pass, r.d);
  /* 깨 보기 */
  let src = SRC0, miss = ''; for (const [a, b] of BREAK[k]) { if (src.split(a).length !== 2) { miss = a.slice(0, 60); break; } src = src.replace(a, b); }
  if (miss) { ok('깨 보기 ' + k + ' — 되돌릴 줄을 원문에서 하나만 찾아야 한다', false, miss); continue; }
  let rb; try { rb = SC[k](src); } catch (e) { rb = { pass: false }; }
  ok('깨 보기 ' + k + ' — 옛 꼴로 되돌리면 빨강', !rb.pass);
}
console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FIX2 1030 OK'); process.exit(fail ? 1 : 0);
