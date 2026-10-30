#!/usr/bin/env node
/* ★★[VC_DECISIONS_1030 2026-10-30 사장님 «추천대로» · AI 두 분 목소리 3차 점검의 «대표 결정» 아홉] 원문 조각을 vm 으로 떼어 결정마다 장면을 잰다.
   ① [VC_DEC_1030_1] 나눠 읽는 줄에 목소리 없는 분 문장 → 다른 분 목소리로 만들지 않고 V0 «신부 목소리가 아직 없어요» · 화면 줄 글도 그 분을 짚는다 (10/08 WHO_MISS 를 뒤집음)
   ② [VC_DEC_1030_2] 동의 «무엇을 보내나요» = «녹음과 AI가 읽을 안내 글을 타입캐스트에 보내요» · 동의 판 1003 → 1030 · 처리방침 링크 · 처리방침 같은 말
   ③ [VC_DEC_1030_3] 두 분 목소리 쪽 «만들지 않은 줄은 당일 스튜디오 나레이션으로 나와요» 한 번만(다 쓴 카드 · 예식 뒤에는 없음)
   ④ [VC_DEC_1030_4] 예식일 없음 → 마지막 활동 + 90일 · 고객 행이 정말 없으면 바로 · 행 읽기 실패 · 코드 칸 못 읽음이면 아무것도 안 함 · 미리보기는 목록만
   ⑤ [VC_DEC_1030_5] 예식 3일 전까지 스튜디오 ✓ 없는 AI 줄 → 아침 보고 빨간 줄 · 콘솔 «스튜디오 확인 안 함»
   ⑥ [VC_DEC_1030_6] 예식당 3만 자 · 이번 달 70% 넘으면 관리자 메일 한 달 한 통
   ⑦ [VC_DEC_1030_7] 예식 7일 전 줄 소리가 다 저장되면 업체 모델만 지움(파일 · 읽은 녹음 그대로) · 카드 한 줄 · 동의 «언제 지우나요» · 다시 녹음하면 걷힘
   ⑧ [VC_DEC_1030_8] 콘솔이 받은 두 분 소리를 IndexedDB 에 예식 다음 날까지 · 연결이 끊기면 같은 파일로 · «모두 받아 둠» · 다음 날 지움
   ⑨ [VC_DEC_1030_9] 디렉터 글 카드 = 두 분이 고친 글(두 분 소리가 물린 줄만 · 고객 미리 듣기 아님) · 글은 adminDetail 로(주소에 싣지 않음)
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다. 종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const GS = R('automation/platform/80_production.gs'), AI = R('automation/platform/96_ai_cost.gs'), OP = R('order-preview.html'), CS = R('console.html'), PV = R('privacy.html');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = (n) => new Promise((r) => setTimeout(r, n || 0));

/* ───────── 서버 세계(80_production 조각 · 가짜 업체 · 드라이브 · 속성 · 고객 표) ───────── */
const FN = ['_vcCacheGet', '_vcTtsReq', '_voiceStudio', '_vcWedOver_', '_vcSpent', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcRdOldTrash_', '_vcSave', '_vcFetch', '_vcErr', '_vcWhy', '_vcGate', '_vcAlert', '_vcCharLog', '_vcTts', '_vcAiFolder', '_vcHash', '_vcCached', '_vcTempo', '_vcPause', '_vcKoNum', '_vcNewPhrase', '_vcDelVoice', '_vcDelMark', '_vcHold', '_vcReadTrash', '_vcPendOf', '_vcPracticeTrash', '_vcJobPub', '_vcJobStart', '_vcEnrollAfter', 'handleVoiceClone', '_vcChunks', '_vcPub', '_vcPurgeNow', 'purgeVoiceClones', '_vcCodeSet_', '_vcTs_', '_vcLastAct_', '_vcAiTrashAll_', '_vcVoiceKeys_', '_vcModelOffDue_', '_vcModelOff_', '_vcMonthCap_', '_vcMonthWarn_', '_vcSlots', '_vcOrphanSweep_', 'vcStudioCheckDue_'];
const srvCode = (src) => [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n');
{ const miss = FN.filter((f) => !grabIn(GS, f)); if (miss.length) { console.log('FAIL 원문 조각을 못 떼었다 — ' + miss.join(', ')); process.exit(1); } }
const NOW = Date.parse('2026-10-30T03:00:00Z'), TODAY = '2026-10-30';   // 한국 낮 12시
const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
const ymd = (ms) => kst(ms).slice(0, 10);
function world(o, src) {
  o = o || {};
  const props = Object.assign({ TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', PRACTICE_READ: 'on' }, o.props || {}), calls = [], mails = [], lines = [], files = {}, cache = {};
  let seq = 0;
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [7, 7, 7] }) });
  const mkFile = (id, name) => ({ getId: () => id, getName: () => name, isTrashed: () => !!files[id].trash, setTrashed: (t) => { files[id].trash = t; }, getBlob: () => ({ getBytes: () => [1], getContentType: () => 'audio/mpeg' }) });
  const addFile = (name) => { const id = 'F' + (++seq); files[id] = { name, trash: false }; files[id].f = mkFile(id, name); return id; };
  const folder = () => ({ getFoldersByName: () => { const f = folder(); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder(),
    createFile: (b) => files[addFile(b.name)].f,
    getFilesByName: (n) => { const l = Object.values(files).filter((x) => x.name === n).map((x) => x.f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; },
    getFiles: () => { const l = Object.values(files).map((x) => x.f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; } });
  const cust = o.cust || {};   // 코드 → { wed, stage, S, names } · 'THROW' = 읽기 실패
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => Object.assign({}, props), deleteProperty: (k) => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetchAll(reqs) { return reqs.map((r) => this.fetch(r.url, r)); },
      fetch: (url, q) => { const p = url.replace('https://api.typecast.ai', ''), m = (q.method || 'get').toUpperCase(); calls.push(m + ' ' + p);
        if (m === 'DELETE') return res(204, ''); if (/text-to-speech/.test(p)) return res(200, 'mp3'); if (m === 'GET' && /custom-voices$/.test(p)) return res(200, []); return res(404, {}); } },
    DriveApp: { getFileById: (id) => { if (!files[id]) throw new Error('not found'); return files[id].f; } },
    Utilities: { formatDate: (d, tz, f) => { const s = kst(new Date(d).getTime()); return f === 'yyyy-MM-dd' ? s.slice(0, 10) : f === 'yyyy-MM' ? s.slice(0, 7) : f === 'M' ? String(+s.slice(5, 7)) : f === 'd' ? String(+s.slice(8, 10)) : s; },
      base64Encode: (b) => 'B64:' + b.length, base64Decode: () => [1, 2], newBlob: (b, m, n) => ({ name: n }), sleep: () => {},
      computeDigest: (a, s) => Array.from(Buffer.from(String(s))), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'), DigestAlgorithm: {}, Charset: {} },
    resolveSession: (t) => (t === 'T' ? { ok: true, row: { get: (h) => (h === '개인코드' ? 'ME0001' : h === '신부이름' ? '' : h === '신랑이름' ? '' : '') } } : { ok: false, reason: 'x' }), _sessionMsg: () => '다시 로그인',
    fmtKST: (d) => kst(d instanceof Date ? d.getTime() : Date.now()), _rfFolderFor: () => folder(),
    findCustomerByCode: (c) => { const x = cust[c]; if (x === 'THROW') throw new Error('sheet'); if (!x) return null; return { get: (h) => (h === '예식일' ? (x.wed || '') : h === '현재단계' ? (x.stage || '예식준비') : '') }; },
    _prodLoad: (row) => { for (const c in cust) { const x = cust[c]; if (x && x !== 'THROW' && row && row.get('예식일') === (x.wed || '')) return { ritualDraft: x.S ? { S: x.S } : null }; } return {}; },
    customerNames: () => '신랑 · 신부',
    getCustomersSheet: () => { if (o.sheetFail) throw new Error('sheet'); const codes = (o.codes || Object.keys(cust).filter((c) => cust[c] && cust[c] !== 'THROW')); return { getLastRow: () => codes.length + 1, getRange: () => ({ getValues: () => codes.map((c) => [c]) }) }; },
    buildHeaderIndex: () => ({ 개인코드: 1 }), P: { DATA_START_ROW: 2 },
    _gsr_: () => {}, _trigIn_: () => {}, _requireAdmin: () => ({ ok: true }), _rfMailFlush: () => {},
    _ymdOf: (v) => v, _nfAdminLineEmail: (t) => lines.push(t), _nfAdminEmail: (s, h) => { mails.push([s, h]); return true; }, handleAiCostLog: () => {}, Logger: { log() {} }, console: { warn() {}, log() {} },
    JSON, Math, String, Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW + (o.shift || 0)); } static now() { return NOW + (o.shift || 0); } }, Array, Buffer, encodeURIComponent, decodeURIComponent, Object, Number, RegExp, Error, isFinite,
  };
  vm.createContext(sb); vm.runInContext(srvCode(src || GS), sb);
  const call = (body) => JSON.parse(JSON.stringify(vm.runInContext('handleVoiceClone(' + JSON.stringify(Object.assign({ token: 'T' }, body)) + ')', sb)));
  return { props, calls, mails, lines, files, call, sb, addFile, st: (c) => JSON.parse(props['VC_' + (c || 'ME0001')] || '{}') };
}
const V = (who, o) => Object.assign({ consent: { at: kst(NOW - 40 * 864e5), v: '1003' }, voiceId: 'uc_' + who, made: kst(NOW - 3 * 864e5), tries: 1 }, o || {});

/* ───────── ① 나눠 읽는 줄 ───────── */
{ const run = (src) => { const W = world({ cust: { ME0001: { wed: '2026-12-12' } }, props: { VC_ME0001: JSON.stringify({ groom: V('groom') }) } }, src);
    const t0 = W.calls.filter((k) => /text-to-speech/.test(k)).length;
    const r = W.call({ op: 'make', key: 'entry', text: '가 나', lines: [['groom', '신랑 문장이에요'], ['bride', '신부 문장이에요']], tempo: '1', pause: 150 });
    const r2 = W.call({ op: 'make', key: 'entry', text: '가', lines: [['bride', '신부 문장만']], tempo: '1', pause: 150 });
    return { r, r2, tts: W.calls.filter((k) => /text-to-speech/.test(k)).length - t0, spent: (W.st().make || {}).chars || 0 }; };
  const a = run();
  ok('① [VC_DEC_1030_1] 나눠 읽는 줄 · 신부 목소리 없음 → 줄 전체 거절(V0 · «신부 목소리가 아직 없어요» · novoice) · 업체 안 부름 · 글자 안 셈', !a.r.ok && a.r.ecode === 'V0' && a.r.novoice === 'bride' && a.r.error === '신부 목소리가 아직 없어요' && !a.r2.ok && a.r2.novoice === 'bride' && a.tts === 0 && a.spent === 0, a);
  const b = brk(GS, [["      if (_nvw) return { ok: false, ecode: 'V0', novoice: _nvw, error: WHO[_nvw] + ' 목소리가 아직 없어요' }; }", '      }']]); const rb = b ? run(b) : null;
  ok('깨 보기 ① — 옛 꼴(WHO_MISS · 있는 목소리로 만듦)이면 빨강', !!rb && rb.r.ok && rb.tts > 0, rb);
  /* 화면 줄 글 — 나눠 읽는 줄은 서버가 짚은 분 · 한 분 줄은 종전 문구 */
  const say = (src, lw, w, st) => { const sb = { MK: {}, VC: { st: st || { groom: { ready: true }, bride: {} } }, render: () => {}, _vcLineWho: () => lw, _vcName: (x) => (x === 'groom' ? '민수' : '지은') };
    vm.createContext(sb); vm.runInContext(grabIn(src, '_vcNoVoice'), sb); sb._vcNoVoice('entry', w); return sb.MK.lineErr.entry; };
  const s1 = say(OP, 'both', 'bride'), s2 = say(OP, 'both', 'groom'), s3 = say(OP, 'both', undefined, { groom: {}, bride: {} }), s4 = say(OP, 'bride', undefined);
  ok('① 화면 — 나눠 읽는 줄은 «신부 · 신랑 · 두 분 목소리가 아직 없어요» · 한 분 줄은 «지은 님 AI 목소리를 아직 만들지 않았어요»', /^신부 목소리가 아직 없어요/.test(s1) && /^신랑 목소리가 아직 없어요/.test(s2) && /^두 분 목소리가 아직 없어요/.test(s3) && /^지은 님 AI 목소리를 아직 만들지 않았어요/.test(s4), [s1, s2, s3, s4]);
  ok('① 화면 — 서버 거절(novoice)을 받으면 그 분을 짚어 줄 글을 남긴다(줄은 «안 됨» 그대로)', /_vcNoVoice\(key,d\.novoice\); \} throw 0; \}/.test(OP));
  ok('① 옛 결정 주석에 날짜 적은 바뀜 표시(서버 · 화면)', /2026-10-30 사장님 «추천대로»로 바뀜 \[VC_DEC_1030_1\]/.test(GS) && /2026-10-30 사장님 «추천대로»로 바뀜 \[VC_DEC_1030_1\]/.test(OP)); }

/* ───────── ② 동의 ───────── */
{ const vtxt = (src) => { const i = src.indexOf('var VC_TXT={'), j = src.indexOf("VC_CONSENT_V='", i); const sb = { _josa: (t, a, b) => b }; vm.createContext(sb); vm.runInContext(src.slice(i, src.indexOf(';', j) + 1).replace(/^var /, 'this.') .replace(/\}, VC_CONSENT_V=/, '}; this.VC_CONSENT_V='), sb); return sb; };
  let x; try { x = vtxt(OP); } catch (e) { x = { err: String(e) }; }
  ok('② [VC_DEC_1030_2] «무엇을 보내나요 · 녹음과 AI가 읽을 안내 글을 타입캐스트에 보내요» · 동의 판 1003 → 1030', !x.err && x.VC_TXT.what === '무엇을 보내나요 · 녹음과 AI가 읽을 안내 글을 타입캐스트에 보내요' && x.VC_CONSENT_V === '1030', x.err || [x.VC_TXT.what, x.VC_CONSENT_V]);
  const pan = (src) => { const sb = { VC: {}, VC_TXT: x.VC_TXT, _vcName: () => '민수', esc: (s) => String(s) }; vm.createContext(sb); vm.runInContext(grabIn(src, '_vcConsentPanel'), sb); return sb._vcConsentPanel('groom'); };
  const h = pan(OP);
  ok('② 동의 창에 처리방침 링크(privacy.html · 두 분 목소리 줄 · 새 창)', /class="pk-link" href="\/privacy\.html#voice-clone" target="_blank" rel="noopener"[^>]*>개인정보 처리방침 보기</.test(h) && /무엇을 보내나요/.test(h), h.slice(0, 300));
  const priv = (PV.match(/<div class="spec-row" id="voice-clone">[\s\S]*?<\/div>/) || [''])[0], tc = (PV.match(/AI 목소리 생성<\/span>\s*<span class="spec-val">[^<]*/) || [''])[0];
  ok('② 처리방침도 같은 말 — 수집 항목에 «읽을 안내 글» · 위탁(타입캐스트)에 «읽은 녹음, 읽을 안내 글»', /그 목소리로 읽을 안내 글/.test(priv) && /타입캐스트/.test(tc) && /읽은 녹음, 읽을 안내 글/.test(tc), [priv.slice(0, 120), tc.slice(0, 160)]);
  const b = brk(OP, [["  what:'무엇을 보내나요 · 녹음과 AI가 읽을 안내 글을 타입캐스트에 보내요',", "  what:'무엇을 보내나요 · 곧 읽으실 녹음을 음성 업체(타입캐스트)에 보내 목소리를 만들어요',"]]); let xb = null; try { xb = b ? vtxt(b) : null; } catch (e) {}
  ok('깨 보기 ② — 옛 글이면 빨강', !!xb && xb.VC_TXT.what !== '무엇을 보내나요 · 녹음과 AI가 읽을 안내 글을 타입캐스트에 보내요'); }

/* ───────── ③ 두 분 목소리 쪽 한 줄 ───────── */
{ const LINE = '만들지 않은 줄은 당일 스튜디오 나레이션으로 나와요';
  const page = (src, st) => { const sb = { VC: { st }, S: {}, _vcStatus: () => {}, _vcStFresh: () => {}, _vcUseIntro: () => '', _vcErrBox: () => '', _vcWaitBox: () => '', VS_ICO: '', _vcPeople: () => '<ul class="mk-vlist"></ul>' };
    vm.createContext(sb); vm.runInContext(grabIn(src, '_mkVoicePage'), sb); return sb._mkVoicePage(); };
  const n = (h) => h.split(LINE).length - 1;
  const a = page(OP, { groom: { ready: true, left: 19 }, bride: { left: 20 } }), b = page(OP, { groom: { ready: true, left: 19 }, bride: { ready: true, left: 19 } }), c = page(OP, { groom: { left: 0 }, bride: { left: 20 } }), d = page(OP, { over: true, groom: {}, bride: {} });
  ok('③ [VC_DEC_1030_3] 두 분 목소리 쪽에 «만들지 않은 줄은 당일 스튜디오 나레이션으로 나와요» 한 번(한 분 · 두 분 다 만든 판)', n(a) === 1 && n(b) === 1, [n(a), n(b)]);
  ok('③ 카드가 «만들기를 다 썼어요 · 나레이션으로 나와요»라고 하는 판 · 예식이 끝난 판에는 없다(같은 말 두 번 · 할 일 없음)', n(c) === 0 && n(d) === 0, [n(c), n(d)]);
  ok('③ 파일 전체에 그 글은 한 곳(되풀이 없음)', OP.split(LINE).length - 1 === 1);
  const br = brk(OP, [["h+='<p class=\"mk-note mk-vnar\">" + LINE + "</p>';", "h+='';"]]); const ab = br ? page(br, { groom: { ready: true, left: 19 }, bride: { left: 20 } }) : null;
  ok('깨 보기 ③ — 줄이 없으면 빨강', ab != null && n(ab) === 0); }

/* ───────── ④ 예식일 없음 · 행 없음 ───────── */
{ const mk = (src, o) => { const old = kst(NOW - 100 * 864e5), fresh = kst(NOW - 10 * 864e5);
    const st = (at) => JSON.stringify({ groom: V('groom', { made: at, consent: { at } }) });
    const props = { VC_NODATE1: st(old), VC_NODATE2: st(fresh), VC_GONE1: st(fresh), VC_THROW1: st(old), VC_HALF1: st(old) };
    const cust = { NODATE1: { wed: '' }, NODATE2: { wed: '' }, THROW1: 'THROW' };   // GONE1 · HALF1 은 행 없음(HALF1 은 코드 칸에는 있음)
    const W = world(Object.assign({ props, cust, codes: ['NODATE1', 'NODATE2', 'HALF1', 'X9'] }, o || {}), src);
    const done = vm.runInContext('purgeVoiceClones(' + (o && o.dry ? 'true' : '') + ')', W.sb);
    const v = (c) => ((W.st(c).groom || {}).voiceId || ''); return { done: Array.from(done), n1: v('NODATE1'), n2: v('NODATE2'), g1: v('GONE1'), t1: v('THROW1'), h1: v('HALF1'), dels: W.calls.filter((k) => /^DELETE/.test(k)).length }; };
  const a = mk(GS);
  ok('④ [VC_DEC_1030_4] 예식일 없음 · 마지막 활동 100일 전 → 지움 · 10일 전 → 둠 · 고객 행이 정말 없음(코드 칸 읽기 성공 · 없음) → 지움', !a.n1 && a.n2 === 'uc_groom' && !a.g1 && a.dels === 2, a);
  ok('④ 행 읽기 실패(예외) · 행을 못 찾았는데 코드 칸에는 있음 → 아무것도 안 지움', a.t1 === 'uc_groom' && a.h1 === 'uc_groom', a);
  const f = mk(GS, { sheetFail: true });
  ok('④ 코드 칸 전체 읽기가 실패하면 «행 없음»으로 지우지 않는다(예식일 없음 90일은 그대로)', f.g1 === 'uc_groom' && !f.n1, f);
  const d = mk(GS, { dry: true });
  ok('④ 미리보기(previewVoiceClones = purgeVoiceClones(true))는 대상만 — 무엇도 안 지움 · 두 갈래가 목록에', d.n1 === 'uc_groom' && d.g1 === 'uc_groom' && d.dels === 0 && d.done.some((x) => /NODATE1\(예식일 없음 · 마지막 활동 90일 지남\)/.test(x)) && d.done.some((x) => /GONE1\(고객 행 없음\)/.test(x)), d.done);
  ok('④ previewVoiceClones 는 purgeVoiceClones(true)', /function previewVoiceClones\(\) \{ _requireAdmin\(\); return purgeVoiceClones\(true\); \}/.test(GS));
  const b1 = brk(GS, [['    if (!why && !wy) {', '    if (false) {']]); const ab = b1 ? mk(b1) : null;
  ok('깨 보기 ④-1 — 옛 꼴(예식일 없으면 건드리지 않음)이면 빨강', !!ab && ab.n1 === 'uc_groom' && ab.g1 === 'uc_groom', ab);
  const b2 = brk(GS, [['    if (!rdOk) return;\n', ''], ['    var absent = !cust && !!codes && !codes[String(code).toUpperCase()];', '    var absent = !cust;']]); const ab2 = b2 ? mk(b2) : null;
  ok('깨 보기 ④-2 — 읽기 실패를 «행 없음»으로 읽으면 빨강', !!ab2 && (!ab2.t1 || !ab2.h1), ab2); }

/* ───────── ⑤ 스튜디오 확인 ───────── */
{ const S = { guestVoice: 'couple', entryVoice: 'couple', up: { g0: { id: 'A1', src: 'ai' }, g1: { id: 'A2', src: 'ai' }, g3: { id: 'A3', src: 'rec' }, entry: { id: 'A4', src: 'ai' } } };
  const run = (wed, okMap) => { const W = world({ cust: { ME0001: { wed, S } }, props: { VC_ME0001: JSON.stringify({ groom: V('groom') }), RFOK_ME0001: JSON.stringify(okMap || {}) } }); return Array.from(vm.runInContext('vcStudioCheckDue_()', W.sb)); };
  const a = run(ymd(NOW + 2 * 864e5), { g0: { by: 'x' } }), b = run(ymd(NOW + 5 * 864e5), {}), c = run(ymd(NOW + 1 * 864e5), { g0: 1, g1: 1, entry: 1 }), d = run(ymd(NOW - 864e5), {});
  ok('⑤ [VC_DEC_1030_5] 예식 2일 전 · ✓ 없는 AI 줄(시작 10분 전 · 입장 인사)만 한 줄 · 녹음 줄은 세지 않음', a.length === 1 && /시작 10분 전 · 입장 인사 확인 안 함/.test(a[0]) && !/하객 입장 때/.test(a[0]), a);
  ok('⑤ 예식 5일 전 · 다 ✓ · 예식이 지남 → 없음', !b.length && !c.length && !d.length, [b, c, d]);
  ok('⑤ 아침 보고(aiMorningReport)가 빨간 줄(true)로 싣는다', /function aiMorningReport/.test(AI) && /vcStudioCheckDue_\(\)[\s\S]{0,200}rows\.push\(\['스튜디오 확인 안 한 두 분 목소리 \(' \+ _vsc\.length \+ '건\)', [^\n]*, true\]\)/.test(grabIn(AI, 'aiMorningReport')));
  /* 콘솔 — 받아 둔 AI 줄 가운데 ✓ 없는 줄 */
  const pnt = (src, okm) => { const box = { innerHTML: '' }, sec = { hidden: false };
    const sb = { $: (q) => (q === '#rfSec' ? sec : box), document: { getElementById: () => null }, GUEST: false, S: { up: { g0: { id: 'A', src: 'ai' }, g1: { id: 'B', src: 'rec' } } }, RF_ST: { g0: 'ok', g1: 'ok' }, RF_WHY: {}, RF_SKIP: '', RF_LAB: { g0: '하객 입장 때', g1: '시작 10분 전' }, RF_FRESH: {},
      rfKeys: () => ['g0', 'g1'], esdWant: () => false, esc: (s) => s, ecWrap: (s) => s, RF_CACHED: {}, RF_FROM: {}, rfFreshApply: () => {}, rfPrefetch: () => {} };
    vm.createContext(sb); vm.runInContext(['rfKindLab', 'rfOkSet', 'rfUnchecked', 'rfPaint'].map((f) => grabIn(src, f)).join('\n') + '\nvar RF_OKMAP = {}, RF_OKSET = false, RF_WED = "";', sb); if (okm) sb.rfOkSet({ okMap: okm, wedding: TODAY }); sb.rfPaint(); return box.innerHTML; };
  const p1 = pnt(CS, {}), p2 = pnt(CS, { g0: 1 }), p3 = pnt(CS, null);
  ok('⑤ 콘솔 — ✓ 없는 AI 줄만 «스튜디오 확인 안 함» · 녹음 줄 · ✓ 줄 · 목록을 못 받은 판은 말하지 않음', (p1.match(/스튜디오 확인 안 함/g) || []).length === 1 && /AI 목소리 · 받아 둠 <span class="rfchk">· 스튜디오 확인 안 함<\/span>/.test(p1) && !/스튜디오 확인 안 함/.test(p2) && !/스튜디오 확인 안 함/.test(p3), [p1.slice(0, 300), p2.slice(0, 80), p3.slice(0, 80)]);
  ok('⑤ 콘솔 큐 칩도 같은 표시', /pill\('vk', RF_OWN\[q\.slug\] \? rfKindLab\(key\) \+ \(rfUnchecked\(key\) \? ' · 스튜디오 확인 안 함' : ''\)/.test(CS));
  const br = brk(CS, [["(rfUnchecked(k) ? ' <span class=\"rfchk\">· 스튜디오 확인 안 함</span>' : '')", "''"]]); const pb = br ? pnt(br, {}) : null;
  ok('깨 보기 ⑤ — 표시가 없으면 빨강', pb != null && !/스튜디오 확인 안 함/.test(pb)); }

/* ───────── ⑥ 예산 · 달 70% ───────── */
{ const lim = (src) => { const sb = {}; vm.createContext(sb); vm.runInContext(lineIn(src, /var VC_BASE[^\n]*/).replace(/^var /, 'this.').replace(/, VC_MODEL = /, '; this.VC_MODEL = ').replace(/, VC_LIM = /, '; this.VC_LIM = '), sb); return sb.VC_LIM; };
  const L = lim(GS);
  ok('⑥ [VC_DEC_1030_6] 예식당 글자 예산 3만 자(종전 20만)', L.budget === 30000, L);
  const W = world({ cust: { ME0001: { wed: '2026-12-12' } }, props: { VC_ME0001: JSON.stringify({ groom: V('groom') }), VC_MONTH_CHARS: '1000' } });
  const H = W.sb; H.handleAiCostLog = () => {};
  vm.runInContext('_vcCharLog(600)', H); const m1 = W.mails.length; vm.runInContext('_vcCharLog(200)', H); const m2 = W.mails.length; vm.runInContext('_vcCharLog(200)', H); const m3 = W.mails.length;
  ok('⑥ 이번 달 70% 를 넘는 순간 관리자 메일 한 통(_nfAdminEmail) · 같은 달 다시 안 감 · 이모지 없음', m1 === 0 && m2 === 1 && m3 === 1 && /70% 넘음/.test(W.mails[0][0]) && !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(W.mails[0][0] + W.mails[0][1]), [m1, m2, m3, W.mails[0]]);
  const W2 = world({ props: { VC_ME0001: JSON.stringify({ groom: V('groom') }), VC_ME0001x: '', VC_MONTH_CHARS: '' } }); vm.runInContext('_vcCharLog(150000)', W2.sb);
  ok('⑥ 기준을 따로 안 정하면 20만 자의 70%(14만 자)', W2.mails.length === 1, W2.mails.length);
  const b = brk(GS, [["if (!(tot >= cap * 0.7) || p.getProperty(wk)) return false;", "if (!(tot >= cap * 0.7)) return false;"]]); const Wb = world({ props: { VC_MONTH_CHARS: '1000' } }, b);
  vm.runInContext('_vcCharLog(800); _vcCharLog(100)', Wb.sb);
  ok('깨 보기 ⑥ — 한 달 한 번 막이가 없으면 빨강', Wb.mails.length === 2, Wb.mails.length); }

/* ───────── ⑦ 7일 전 모델 지우기 ───────── */
{ const S = { guestVoice: 'couple', entryVoice: 'couple', up: { g0: { id: 'A1', src: 'ai' }, g1: { id: 'A2', src: 'ai' }, g3: { id: 'A3', src: 'ai' }, entry: { id: 'A4', src: 'ai' } } };
  const run = (src, o) => { o = o || {}; const W = world({ cust: { ME0001: { wed: o.wed || ymd(NOW + 5 * 864e5), S: o.S || S } }, props: { VC_ME0001: JSON.stringify({ groom: V('groom', o.g), bride: V('bride', { read: { id: 'R1', at: kst(NOW - 3 * 864e5) } }) }) } }, src);
    const done = Array.from(vm.runInContext('purgeVoiceClones(' + (o.dry ? 'true' : '') + ')', W.sb)); const st = W.st();
    return { done, g: st.groom, b: st.bride, retry: st.retry || [], dels: W.calls.filter((k) => /^DELETE/.test(k)), pub: JSON.parse(JSON.stringify(vm.runInContext('_vcPub(' + JSON.stringify(st.bride) + ', "ME0001", ' + JSON.stringify(st) + ')', W.sb))) }; };
  const a = run();
  ok('⑦ [VC_DEC_1030_7] 예식 5일 전 · 두 분 줄 소리가 다 저장 → 업체 모델 둘 다 지움(DELETE 2) · voiceId 비움 · modelOff · 읽은 녹음은 그대로 · retry 비움', !a.g.voiceId && !a.b.voiceId && !!a.g.modelOff && !!a.b.modelOff && a.dels.length === 2 && a.b.read && a.b.read.id === 'R1' && !a.retry.length && a.done.some((x) => /7일 전/.test(x)), a);
  ok('⑦ 상태(_vcPub)는 ready false · modelOff 날짜(카드가 «다시 녹음»을 말한다)', a.pub.ready === false && !!a.pub.modelOff, a.pub);
  const n1 = run(null, { wed: ymd(NOW + 10 * 864e5) }), n2 = run(null, { S: Object.assign({}, S, { up: Object.assign({}, S.up, { entry: null }) }) }), n3 = run(null, { g: { made: kst(NOW - 3600e3) } }), n4 = run(null, { S: Object.assign({}, S, { up: Object.fromEntries(Object.entries(S.up).map(([k, v]) => [k, Object.assign({}, v, { src: 'rec' })])) }) }), n5 = run(null, { dry: true });
  ok('⑦ 예식 10일 전 · 줄 하나 빔 · AI 줄 없음 → 안 지움', n1.g.voiceId && n2.g.voiceId && n4.g.voiceId && !n1.dels.length && !n2.dels.length && !n4.dels.length, [n1.dels, n2.dels, n4.dels]);
  ok('⑦ 막 다시 만든 목소리(한 시간 전)는 다음 날로 · 다른 분(사흘 전)만 지움', n3.g.voiceId === 'uc_groom' && !n3.b.voiceId && n3.dels.length === 1, n3.dels);
  ok('⑦ 미리보기는 목록만(지우지 않음)', n5.g.voiceId && !n5.dels.length && n5.done.some((x) => /목소리 모델 groom · bride/.test(x)), n5.done);
  /* 다시 녹음하면 modelOff 가 걷힌다(_vcPub 는 voiceId 가 있으면 modelOff 를 싣지 않는다 · 만들기 성공은 지운다) */
  const W = world({}); const pub = JSON.parse(JSON.stringify(vm.runInContext('_vcPub({ voiceId: "uc_new", modelOff: "x" }, "ME0001", {})', W.sb)));
  ok('⑦ 새 목소리가 생기면 «모델을 지웠어요»를 싣지 않는다 · 만들기 성공은 modelOff 를 지운다', pub.ready && pub.modelOff === '' && /pp\.voiceId = nv; pp\.made = fmtKST\(new Date\(\)\); pp\.phrase = null; delete pp\.modelOff;/.test(GS), pub);
  ok('⑦ 카드 한 줄 «목소리 모델은 지웠어요 · 다시 만들려면 다시 녹음해요» · 상태 갈래에 modelOff', /var VC_MODEL_OFF_W='목소리 모델은 지웠어요 · 다시 만들려면 다시 녹음해요';/.test(OP) && /p\.modelOff\?VC_MODEL_OFF_W:/.test(OP));
  ok('⑦ 동의 «언제 지우나요» · 처리방침이 7일 전을 말한다', /언제 지우나요 · AI 목소리는 예식 7일 전 안내 소리가 다 만들어지면, 늦어도 예식 다음 날 지워요/.test(OP) && /예식 7일 전 안내 소리가 다 만들어지면 그때, 늦어도 예식 <strong>다음 날<\/strong>/.test(PV));
  ok('⑦ 칸 세기 — 모델 지우기는 매일 지우기 안에서 칸을 세기(VC_SLOTS 캐시 지우기) 전에 돈다', (() => { const p = grabIn(GS, 'purgeVoiceClones'); return p.indexOf('_vcModelOff_(code, mo)') > -1 && p.indexOf('_vcModelOff_(code, mo)') < p.indexOf("remove('VC_SLOTS')"); })());
  const b = brk(GS, [['      var mo = wy ? _vcModelOffDue_(code, cust, st, today, wy) : null;', '      var mo = null;']]); const ab = b ? run(b) : null;
  ok('깨 보기 ⑦ — 옛 꼴(예식 다음 날까지 둠)이면 빨강', !!ab && ab.g.voiceId === 'uc_groom' && !ab.dels.length, ab && ab.dels); }

/* ───────── ⑧ 콘솔 IndexedDB ───────── */
class FixDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }   /* [TEST_CLOCK_1030] */
function fakeIDB() { const dbs = {};
  const later = (f) => setTimeout(f, 0);
  return { dbs, open(name) { const req = {}; later(() => { const fresh = !dbs[name]; if (fresh) dbs[name] = {}; const S0 = dbs[name];
    const db = { createObjectStore(n) { S0[n] = new Map(); }, transaction(n) { const st = S0[n]; if (!st) throw new Error('no store'); const tx = {}; let ops = 0, fin = false; const end = () => { if (--ops === 0 && !fin) { fin = true; later(() => tx.oncomplete && tx.oncomplete()); } };
      tx.objectStore = () => ({ put(v, k) { ops++; st.set(k, v); later(end); },
        get(k) { ops++; const r = {}; later(() => { r.result = st.has(k) ? st.get(k) : undefined; r.onsuccess && r.onsuccess(); end(); }); return r; },
        openCursor() { ops++; const r = {}, ks = Array.from(st.keys()); let i = 0; const step = () => later(() => { if (i < ks.length) { const k = ks[i++]; r.result = { key: k, value: st.get(k), delete() { st.delete(k); }, continue() { step(); } }; r.onsuccess && r.onsuccess(); } else { r.result = null; r.onsuccess && r.onsuccess(); end(); } }); step(); return r; } });
      return tx; } };
    req.result = db; if (fresh && req.onupgradeneeded) req.onupgradeneeded(); req.onsuccess && req.onsuccess(); }); return req; } }; }
{ const FNS = ['rfOkSet', 'ownDb', 'ownKey', 'ownToday', 'ownDead', 'rfOwnPut', 'rfOwnGet', 'rfOwnFall', 'rfOwnSweep', 'rfKindLab', 'rfUnchecked', 'rfPaint'];
  const mk = (src, idb) => { const box = { innerHTML: '' }, sec = { hidden: false }, IDB = idb || fakeIDB();
    class B { constructor(a, o) { this.a = a; this.type = (o || {}).type; } }
    const sb = { indexedDB: IDB, Blob: B, URL: { createObjectURL: (b) => 'blob:' + (b.a ? 'own' : '?') }, QS: { get: () => 'AB12CD' }, GUEST: false, S: { up: { g0: { id: 'A', src: 'ai' } } }, CLIPS: { 'guest-1-arrival': '/n/01.mp3' }, RF_ORIG: {}, RF_OWN: {}, RF_ST: {}, RF_WHY: {}, RF_GEN: { g0: 3 }, RF_SKIP: '', RF_LAB: { g0: '하객 입장 때' }, RF_FRESH: {},
      rfSlugOf: () => 'guest-1-arrival', rfKeys: () => ['g0'], esdWant: () => false, esdPrepVoice: () => {}, render: () => {}, esc: (s) => s, ecWrap: (s) => s, $: (q) => (q === '#rfSec' ? sec : box), document: { getElementById: () => null }, rfFreshApply: () => {}, rfPrefetch: () => {}, Date: FixDate, setTimeout };   /* ★[TEST_CLOCK_1030] 콘솔 ownToday 도 검사의 NOW(10/30 KST 낮)로 — 종전엔 실제 시계를 읽어 한국 자정(10/31)이 지나자 ⑧ 셋이 빨강이 됐다(main · CI) */
    vm.createContext(sb); vm.runInContext(FNS.map((f) => grabIn(src, f)).join('\n') + '\nvar RF_OKMAP = {}, RF_OKSET = false, RF_WED = "", RF_CACHED = {}, RF_FROM = {};', sb); return { sb, box, IDB }; };
  { const miss = FNS.filter((f) => !grabIn(CS, f)); if (miss.length) ok('⑧ 원문 조각을 못 떼었다 — ' + miss.join(', '), false); }
  const sc = async (src) => { const W = mk(src); const s = W.sb; const wed = ymd(NOW + 864e5 * 0); s.rfOkSet({ okMap: {}, wedding: wed }); s.RF_ST.g0 = 'ok'; s.rfOwnPut('g0', 'A', 'audio/wav', new Uint8Array([1, 2]));
    await flush(5); await flush(5); s.rfPaint(); const all = W.box.innerHTML;
    /* 탭을 새로 열고(메모리 비움) 인터넷이 끊겨 받기 실패 → 같은 id 면 기기 것으로 */
    const W2 = mk(src, W.IDB); const s2 = W2.sb; s2.RF_ST.g0 = 'fail'; s2.RF_WHY.g0 = '연결이 끊겼어요 (코드 L6)'; const r1 = await s2.rfOwnFall('g0', 'A', 3); s2.rfPaint();
    const W3 = mk(src, W.IDB); W3.sb.RF_ST.g0 = 'fail'; const r2 = await W3.sb.rfOwnFall('g0', 'B', 3);   // 다른 파일(id)이면 쓰지 않는다
    const W4 = mk(src, W.IDB); W4.sb.RF_ST.g0 = 'fail'; const r3 = await W4.sb.rfOwnFall('g0', 'A', 2);   // 그 사이 새 요청이 나갔다
    return { all, r1, st1: s2.RF_ST.g0, clip: s2.CLIPS['guest-1-arrival'], own: s2.RF_OWN['guest-1-arrival'], paint: W2.box.innerHTML, r2, r3, idb: W.IDB }; };
  let a; try { a = await sc(CS); } catch (e) { a = { err: String(e && e.stack || e).slice(0, 300) }; }
  ok('⑧ [VC_DEC_1030_8] 받은 두 분 소리를 IndexedDB(me_couple_audio)에 두고 다 받으면 «모두 받아 둠»', !a.err && /모두 받아 둠 · 이 기기에 예식 다음 날까지/.test(a.all) && !!(a.idb.dbs.me_couple_audio && a.idb.dbs.me_couple_audio.a.get('AB12CD|g0')), a.err || a.all.slice(0, 200));
  ok('⑧ 인터넷이 끊겨 못 받으면 같은 파일(id)을 기기에서 꺼내 그 자리 두 분 소리로 · 다른 id · 옛 요청이면 안 씀', !a.err && a.r1 === true && a.st1 === 'ok' && a.clip === 'blob:own' && a.own === 1 && /기기에 받아 둔 소리/.test(a.paint) && a.r2 === false && a.r3 === false, a.err || [a.r1, a.st1, a.clip, a.r2, a.r3]);
  ok('⑧ 받기 실패(연결 · __rfNet)에서 기기 것을 찾는다 · 받기 성공에서 기기에 둔다', /RF_ST\[k\] = 'fail'; rfPaint\(\); if \(e && e\.__rfNet && typeof rfOwnFall === 'function'\) rfOwnFall\(k, id, gen\);/.test(CS) && /if \(typeof rfOwnPut === 'function'\) rfOwnPut\(k, id, d\.mime, u\);/.test(CS));
  const sweep = async (src) => { const W = mk(src); const st = new Map([['AB12CD|g0', { id: 'A', blob: {}, exp: ymd(NOW - 864e5) }], ['AB12CD|g1', { id: 'B', blob: {}, exp: ymd(NOW) }], ['ZZ|g0', { id: 'C', blob: {}, exp: '' }]]); W.IDB.dbs.me_couple_audio = { a: st }; await W.sb.rfOwnSweep(); return Array.from(st.keys()); };
  let k; try { k = await sweep(CS); } catch (e) { k = ['ERR ' + e]; }
  ok('⑧ 예식 다음 날부터(어제 예식) · 지울 날 모름은 지운다 · 오늘 예식은 둔다', k.length === 1 && k[0] === 'AB12CD|g1', k);
  ok('⑧ 예식일을 모르면 두지 않는다 · 열 때 지우기(고객 미리 듣기 아님)', /if \(!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(wed\) \|\| ownToday\(\) > wed\) return;/.test(CS) && /try \{ if \(!GUEST\) \{ rfOwnSweep\(\); rfOwnTxtLoad\(\); \} \} catch \(e\) \{\}/.test(CS));
  const b = brk(CS, [["function ownDead(r){ return !r || ", "function ownDead(r){ return false; return !r || "]]); let kb; try { kb = b ? await sweep(b) : null; } catch (e) { kb = null; }
  ok('깨 보기 ⑧ — 지울 날 판정이 없으면 빨강', !!kb && kb.length === 3, kb); }

/* ───────── ⑨ 디렉터 글 카드 ───────── */
{ const FNS = ['ownTxtOf', 'ownTxtSet', 'ownTxtFor', 'rfOwnTxtLoad'];
  const mk = (src, guest) => { const sent = []; const sb = { GUEST: !!guest, S: { entry: 'B' }, RF_SLUG: { g0: 'guest-1-arrival', g1: 'guest-2-10min', g2: 'guest-3-5min', g3: 'guest-4-1min', pv: 'narr-prevideo-in' }, RF_OWN: { 'guest-1-arrival': 1, 'entry-B': 1 }, RF_EXEC: 'https://script.example/exec', QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, render: () => {},
      fetch: (u, o) => { sent.push([u, o.body]); return Promise.resolve({ json: () => ({ result: { ok: true, mirror: { production: { ritualDraft: { S: { entry: 'B', vtext: { g0: '두 분이 고친 하객 맞이 글', g1: '  ' }, vlines: { 'entry:B': [{ w: 'g', t: '신랑 줄' }, { w: 'b', t: '신부 줄' }] }, pvText: '소개글' } } } } } }) }); } };
    vm.createContext(sb); vm.runInContext(FNS.map((f) => grabIn(src, f)).join('\n') + '\nvar OWN_TXT = {};', sb); return { sb, sent }; };
  const W = mk(CS); const loaded = await W.sb.rfOwnTxtLoad(); const t = (slug) => W.sb.ownTxtFor({ slug });
  ok('⑨ [VC_DEC_1030_9] 디렉터 판 — 두 분 소리가 물린 줄은 두 분이 고친 글(하객 맞이 · 입장 인사 줄 이어서) · 소리가 안 물린 줄 · 안 고친 줄은 기본 글', loaded === true && t('guest-1-arrival') === '두 분이 고친 하객 맞이 글' && t('entry-B') === '신랑 줄 신부 줄' && t('narr-prevideo-in') === '' && t('guest-2-10min') === '', [t('guest-1-arrival'), t('entry-B'), t('narr-prevideo-in'), t('guest-2-10min')]);
  const sent = W.sent[0] || ['', '{}'], body = JSON.parse(sent[1]);
  ok('⑨ 글은 관리자 토큰 adminDetail 로 받는다 — 주소에 글을 싣지 않는다(PREVIEW_KEYS)', W.sent.length === 1 && sent[0] === 'https://script.example/exec' && body.fn === 'adminDetail' && body.action === 'adminCall' && !/고친|소개글/.test(sent[0]), sent);
  const G = mk(CS, true); const gl = await G.sb.rfOwnTxtLoad();
  ok('⑨ 고객 미리 듣기(GUEST)는 묻지도 보이지도 않는다', gl === false && !G.sent.length && G.sb.ownTxtFor({ slug: 'guest-1-arrival' }) === '');
  ok('⑨ 글 카드(디렉터 · 사람 구간이 아닐 때)가 ownTxtFor 를 먼저 본다', /tx\.className = 'txt';\n    tx\.textContent = ownTxtFor\(c\) \|\| c\.text \|\| '';/.test(CS));
  const b = brk(CS, [["function ownTxtFor(c){ return (!GUEST && c && RF_OWN[c.slug] && OWN_TXT[c.slug]) || ''; }", "function ownTxtFor(c){ return ''; }"]]); const Wb = b ? mk(b) : null; if (Wb) await Wb.sb.rfOwnTxtLoad();
  ok('깨 보기 ⑨ — 기본 글만 보이면 빨강', !!Wb && Wb.sb.ownTxtFor({ slug: 'guest-1-arrival' }) === ''); }

console.log(fail ? `✗ VC_DECISIONS_1030 실패 ${fail}건` : '✓ VC_DECISIONS_1030 — 대표 결정 아홉 통과');
process.exit(fail ? 1 : 0);
