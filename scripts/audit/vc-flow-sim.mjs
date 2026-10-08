#!/usr/bin/env node
/* ★[VC_FLOW_SIM 2026-09-28 코워크 0928 8장] handleVoiceClone · purgeVoiceClones 흉내 시험 — GAS · 타입캐스트 없이 순서와 판정만 본다.
   ★원문을 그대로 떼어 쓴다(사본 금지). 이 환경의 프록시가 api.typecast.ai 를 막아 실호출은 GAS 에서(vcSelfTest) 한다.
   보는 것: 확인 문장(서버가 뽑음 · 동의 먼저) · 다시 만들 때 새 목소리 먼저 → 된 뒤 앞 목소리 지우기 · 실패하면 앞 목소리 그대로 ·
     업체 지우기 실패는 retry 목록 · 같은 글 · 목소리 · 빠르기는 다시 만들지 않음(한도에 안 셈) · 빠르기만 바꾸면 줄 한도에 안 셈 ·
     422 문구 · 스위치 off/studio/on · [VC_BUDGET] 예식당 글자 예산 하나(줄 5번 · 예식 50번 · 연습 2만 자는 걷었다) · 예식 다음 날 지우기(전날은 안 지움 · 취소는 바로)
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(new URL('../../automation/platform/80_production.gs', import.meta.url), 'utf8');
const grab = (name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const line = (re) => (src.match(re) || [''])[0];
const FN = ['_vcCacheGet', '_vcTtsReq', '_voiceStudio', '_vcSpent', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcFetch', '_vcErr', '_vcWhy', '_vcGate', 'vcLastErrors', '_vcAlert', '_vcCharLog', '_vcTts', '_vcAiFolder', '_vcHash', '_vcCached', '_vcTempo', '_vcPause', '_vcKoNum', '_vcNewPhrase', '_vcDelVoice', '_vcJobPub', '_vcJobStart', '_vcEnrollAfter', 'handleVoiceClone', '_vcChunks', '_vcPub', '_vcPurgeNow', 'purgeVoiceClones', '_vcSlots'];
const code = [line(/var RF_KEYS[^\n]*/), line(/var VC_BASE[^\n]*/), line(/var VC_DOWN[^\n]*/), line(/var VC_COLOR[^\n]*/)].concat(FN.map(grab)).join('\n');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const miss = FN.filter((f) => !grab(f)); if (miss.length) { console.log('FAIL 원문 조각을 못 떼었다 — ' + miss.join(', ')); process.exit(1); }

function world(o) {
  o = o || {};
  const props = Object.assign({ TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', PRACTICE_READ: 'on' }, o.props || {}), calls = [], mails = [], files = {}, cache = {};
  let seq = 0, today = o.today || '2026-09-28';
  const api = o.api || {};
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [7, 7, 7] }) });
  const mkFile = (id, name, parent) => ({ getId: () => id, getName: () => name, isTrashed: () => !!files[id].trash, setTrashed: (t) => { files[id].trash = t; }, getBlob: () => ({ getBytes: () => [1], getContentType: () => 'audio/mpeg' }), _p: parent });
  const folder = (nm) => ({ getFoldersByName: () => { const f = folder('AI'); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder('AI'),
    createFile: (b) => { const id = 'F' + (++seq); files[id] = { name: b.name, trash: false, f: mkFile(id, b.name, nm) }; return files[id].f; },
    getFilesByName: (n) => { const l = Object.values(files).filter((x) => x.name === n).map((x) => x.f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; },
    getFiles: () => { const l = Object.values(files).map((x) => x.f); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; } });
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, getProperties: () => Object.assign({}, props) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },   /* [VC_STATE_MERGE] */
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetchAll(reqs) { return reqs.map((r) => this.fetch(r.url, r)); },   // [VC_PAR 2026-10-05] 줄 만들기는 한꺼번에(fetchAll) — 같은 세계의 fetch 로 하나씩 답한다(아래에서 fetch 를 바꿔 끼우면 그대로 따라간다)
      fetch: (url, q) => { const p = url.replace('https://api.typecast.ai', ''), key = q.method.toUpperCase() + ' ' + p.replace(/\/uc_[^/]+$/, '/{id}'); calls.push(q.method.toUpperCase() + ' ' + p);
      let r = api[key]; if (typeof r === 'function') r = r(calls.length); return r ? res(r[0], r[1]) : res(404, {}); } },
    DriveApp: { getFileById: (id) => files[id].f },
    Utilities: { formatDate: (d, tz, f) => (f === 'yyyy-MM-dd' ? today : f === 'yyyy-MM' ? today.slice(0, 7) : f === 'M' ? String(+today.slice(5, 7)) : f === 'd' ? String(+today.slice(8, 10)) : today),
      base64Encode: (b) => 'B64:' + b.length, base64Decode: () => [1, 2], newBlob: (b, m, n) => ({ name: n }), sleep: () => {},
      computeDigest: (a, s) => Array.from(Buffer.from(s)), base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'), DigestAlgorithm: {}, Charset: {} },
    resolveSession: (t) => (t === 'T' ? { ok: true, row: { get: () => 'ME0001' } } : { ok: false, reason: 'x' }), _sessionMsg: () => '다시 로그인',
    fmtKST: () => today + ' 10:00', _rfFolderFor: () => folder('ME0001'), findCustomerByCode: () => ({ get: (h) => (h === '예식일' ? (o.wed || '2026-10-10') : (o.stage || '예식준비')) }),
    _requireAdmin: () => ({ ok: true }),   // [B19_LOCK 2026-10-09] 편집기 도구는 _requireAdmin 으로 잠겼다 — 이 흉내는 소유자가 편집기에서 돌리는 것
    _ymdOf: (v) => v, _nfAdminLineEmail: (t) => mails.push(t), handleAiCostLog: () => {}, Logger: { log() {} }, JSON, Math, String, Date, Array, Buffer, encodeURIComponent, Object,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  const call = (body) => JSON.parse(JSON.stringify(vm.runInContext('handleVoiceClone(' + JSON.stringify(Object.assign({ token: 'T' }, body)) + ')', sb)));
  return { props, calls, mails, files, call, sb, setToday: (d) => { today = d; }, st: () => JSON.parse(props.VC_ME0001 || '{}') };
}
const CLONE = (id, c) => ['POST /v1/custom-voices/instant-clone', [c || 201, { voice_id: id, status: 'completed' }]];

// 1 · 동의 → 확인 문장 → 1분 읽기 → 목소리
let w = world({ api: Object.fromEntries([CLONE('uc_a')]) });
ok('확인 문장은 동의가 먼저', /동의가 먼저/.test(w.call({ op: 'phrase', who: 'groom' }).error || ''));
ok('동의 · 읽기 전에 만들기 → 거절(동의 먼저)', /동의가 먼저/.test(w.call({ op: 'enroll', who: 'groom', data: 'data:audio/wav;base64,AAAA' }).error || ''));
w.call({ op: 'consent', who: 'groom', agree: true });
ok('확인 문장 없이 만들기 → «확인 문장을 먼저»', /확인 문장을 먼저/.test(w.call({ op: 'enroll', who: 'groom', data: 'data:audio/wav;base64,AAAA' }).error || ''));
const ph = w.call({ op: 'phrase', who: 'groom' }).phrase || '';
ok('확인 문장 = 오늘 날짜(구월 이십팔일) + 색 · 물건 둘 · 조사 과/와 [VOICE_CLONE_0928]', /^오늘은 구월 이십팔일, \S+ \S+[과와] \S+ \S+\.$/.test(ph), ph);
ok('두 글 합쳐 20초 안 → 만들기 전에 멈춤', /끝까지 읽어 주세요/.test(w.call({ op: 'enroll', who: 'groom', sec: 12, data: 'data:audio/wav;base64,AAAA' }).error || '') && !w.calls.length);
let r = w.call({ op: 'enroll', who: 'groom', sec: 62, data: 'data:audio/wav;base64,AAAA' });
ok('201 로 목소리 만듦 · 읽은 녹음은 AI 폴더에 · 확인 문장 함께 남김', r.ok && w.st().groom.voiceId === 'uc_a' && w.st().groom.read && w.st().groom.read.phrase === ph && Object.values(w.files).some((f) => /^읽은 녹음 · 신랑/.test(f.name)), JSON.stringify(r));

// 2 · 다시 만들기 — 새 목소리 먼저 · 된 뒤 앞 목소리 지우기
w.sb.UrlFetchApp.fetch; w.calls.length = 0;
w.call({ op: 'phrase', who: 'groom' });
Object.assign(w, {}); w.props.x = 1;
const w2api = w.sb.UrlFetchApp; // 같은 세계에서 응답만 바꾼다
w2api.fetch = ((orig) => (url, q) => { const p = url.replace('https://api.typecast.ai', ''); if (/instant-clone/.test(p)) { w.calls.push('POST ' + p); return { getResponseCode: () => 201, getContentText: () => '{"voice_id":"uc_b"}', getBlob: () => ({ getBytes: () => [] }) }; }
  if (q.method === 'delete') { w.calls.push('DELETE ' + p); return { getResponseCode: () => 204, getContentText: () => '', getBlob: () => ({ getBytes: () => [] }) }; } return orig(url, q); })(w2api.fetch);
r = w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' });
ok('다시 만들기 → 복제가 먼저 · 앞 목소리(uc_a) 지우기는 그 뒤 · renewed', r.ok && r.renewed && JSON.stringify(w.calls) === JSON.stringify(['POST /v1/custom-voices/instant-clone', 'DELETE /v1/custom-voices/uc_a']) && w.st().groom.voiceId === 'uc_b', JSON.stringify(w.calls));
ok('다시 읽으면 앞 읽은 녹음은 휴지통', Object.values(w.files).filter((f) => /^읽은 녹음/.test(f.name) && !f.trash).length === 1);
/* ★[VC_NO_COUNT 2026-10-03 사장님] 목소리 만들기 «한 분 3번»을 걷었다 — 네 번째 · 다섯 번째도 된다 · 안전장치 20번 · 시험 예식(VOICE_STUDIO_CODES)은 그것도 없다 */
{ const rs = []; for (let i = 0; i < 4; i++) { w.call({ op: 'phrase', who: 'groom' }); rs.push(w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' })); }
  ok('[VC_NO_COUNT] 같은 분이 세 번 넘게 다시 만들어도 막히지 않음 · status 의 left 가 0 이 아님', rs.every((x) => x.ok) && w.st().groom.tries >= 6 && w.call({ op: 'status' }).groom.left > 0, JSON.stringify(rs.map((x) => x.ok)) + ' tries ' + w.st().groom.tries);
  const st = w.st(); st.groom.tries = 20; w.props.VC_ME0001 = JSON.stringify(st); w.call({ op: 'phrase', who: 'groom' });
  const cap = w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' });
  ok('[VC_NO_COUNT] 20번째 뒤에만 안전장치 · 문구에 «직접 녹음» · «n번까지» 없음', !cap.ok && cap.limit && !/직접 녹음|번까지/.test(cap.error), JSON.stringify(cap));
  w.props.VOICE_STUDIO_CODES = 'ME0001'; w.call({ op: 'phrase', who: 'groom' });
  const sk = w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AAAA' });
  ok('[VC_NO_COUNT] 시험 예식은 20번 뒤에도 만들어짐 · left 줄지 않음', sk.ok && w.call({ op: 'status' }).groom.left === 20, JSON.stringify(sk)); }

// 3 · 다시 만들기 실패 → 앞 목소리 그대로 · 업체 지우기 실패 → retry
w = world({ api: Object.fromEntries([CLONE('uc_a')]) }); w.call({ op: 'consent', who: 'bride', agree: true }); w.call({ op: 'phrase', who: 'bride' }); w.call({ op: 'enroll', who: 'bride', sec: 60, data: 'data:audio/wav;base64,AA' });
w.sb.UrlFetchApp.fetch = (url, q) => ({ getResponseCode: () => (/instant-clone/.test(url) ? 402 : 500), getContentText: () => '{}', getBlob: () => ({ getBytes: () => [] }) });
w.call({ op: 'phrase', who: 'bride' }); r = w.call({ op: 'enroll', who: 'bride', sec: 60, data: 'data:audio/wav;base64,AA' });
ok('다시 만들기 402 → 고객 문구 하나 · 앞 목소리 그대로 · 관리자 메일', !r.ok && /잠시 뒤 다시 해 보시거나 직접 녹음/.test(r.error) && w.st().bride.voiceId === 'uc_a' && w.mails.length === 1, JSON.stringify(r));
/* ★[VC_GATE_WHY] 문 앞에서 막힌 까닭(스위치 studio 인데 시험 예식 목록에 없음 · 키 없음)도 VCERR_ 에 · 메일은 안 보낸다 */
{ const g = world({ props: { VOICE_CLONE: 'studio', VOICE_STUDIO_CODES: 'OTHER1' } }); const r1 = g.call({ op: 'phrase', who: 'bride' }); const E1 = JSON.parse(g.props.VCERR_ME0001 || '{}');
  const g2 = world({ props: { TYPECAST_API_KEY: '' } }); g2.call({ op: 'consent', who: 'bride', agree: true }); const E2 = JSON.parse(g2.props.VCERR_ME0001 || '{}');
  ok('문 앞에서 막힘 — «VOICE_STUDIO_CODES 에 코드가 없어요» · «키가 비어 있어요» · 고객 문구는 하나 · 메일 없음 [VC_GATE_WHY]', !r1.ok && /잠시 뒤 다시/.test(r1.error) && /VOICE_STUDIO_CODES 에 ME0001 가 없어요/.test(E1.msg) && /TYPECAST_API_KEY 가 비어 있어요/.test(E2.msg) && !g.mails.length && /설정/.test(g.sb.vcLastErrors()[0]), JSON.stringify({ E1, E2 })); }
/* ★[VC_WHY] 거절 까닭을 남긴다(HTTP · 업체 글) · 실패는 두 분의 3번에 세지 않는다 · 코드 · HTTP 가 다르면 메일도 따로 */
{ const t0 = w.st().bride.tries; w.sb.UrlFetchApp.fetch = (url) => ({ getResponseCode: () => (/instant-clone/.test(url) ? 400 : 500), getContentText: () => JSON.stringify({ detail: 'audio too long' }), getBlob: () => ({ getBytes: () => [] }) });
  w.call({ op: 'phrase', who: 'bride' }); const r4 = w.call({ op: 'enroll', who: 'bride', sec: 60, data: 'data:audio/wav;base64,AA' }); const E = JSON.parse(w.props.VCERR_ME0001 || '{}');
  ok('실패 까닭 — VCERR_<코드>에 HTTP · 업체 글 · 관리자 메일에 같은 까닭 · 3번에 안 셈 · 고객 문구는 하나 [VC_WHY] · 만들기 400 은 «처음부터 다시 읽어 주세요»(V0) [VC_ENROLL_BADREC]', !r4.ok && /처음부터 다시 읽어 주세요/.test(r4.error) && r4.bad && r4.ecode === 'V0' && E.http === 400 && E.op === 'enroll' && /audio too long/.test(E.msg) && w.st().bride.tries === t0 && w.mails.some((m) => /HTTP 400 · audio too long/.test(m)), JSON.stringify({ E, t0, t1: w.st().bride.tries, mails: w.mails }));
  const lg = w.sb.vcLastErrors(); ok('vcLastErrors — 예식마다 마지막 실패 한 줄 [VC_WHY]', lg.length === 1 && /ME0001 .* enroll .* HTTP 400 .* audio too long/.test(lg[0]), JSON.stringify(lg)); }
r = w.call({ op: 'delete', who: 'bride' });
ok('업체 지우기 실패(500) → retry 목록에 남김', r.ok && (w.st().retry || []).indexOf('uc_a') > -1, JSON.stringify(w.st()));

// 4 · 만들기 — 캐시 · 빠르기만 바꾸기 · 422 · 한도
w = world({ api: Object.fromEntries([CLONE('uc_g'), ['POST /v1/text-to-speech', [200, 'mp3']]]) });
w.call({ op: 'consent', who: 'groom', agree: true }); w.call({ op: 'phrase', who: 'groom' }); w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AA' });
r = w.call({ op: 'make', key: 'g0', text: '와 주셔서 고맙습니다', one: 'groom' });
const r2 = w.call({ op: 'make', key: 'g0', text: '와 주셔서 고맙습니다', one: 'groom' });
ok('같은 글 · 목소리 · 빠르기 → 다시 만들지 않음(TTS 한 번 · 한도에 안 셈)', r.ok && r2.ok && w.calls.filter((c) => /text-to-speech/.test(c)).length === 1 && w.st().make.per.g0 === 1 && w.st().make.total === 1, JSON.stringify(w.st().make));
r = w.call({ op: 'make', key: 'g0', text: '와 주셔서 고맙습니다', one: 'groom', tempo: '1.1', retempo: true });
ok('빠르기만 바꾸면 줄마다 센 수(per)에 안 셈 · 새로 만든 글자는 예산에 셈', r.ok && w.st().make.per.g0 === 1 && w.st().make.total === 2 && w.st().make.chars === '와 주셔서 고맙습니다'.length * 2, JSON.stringify(w.st().make));
/* ★[TEMPO_STEP 2026-10-03 사장님 «말 빠르기를 더 세밀하게»] 빠르기는 숫자로 — 0.7 ~ 1.3 · 0.1 걸음 · 엉뚱한 값은 1. 종전 목록('0.9' · '1' · '1.1')이면 1.2 가 조용히 1 이 됐다.
   업체에 실제로 보낸 audio_tempo 로 잰다(만들기 · 연습 읽기 둘 다) */
{ const tw = world({ api: Object.fromEntries([CLONE('uc_t'), ['POST /v1/text-to-speech', [200, 'mp3']]]) });
  tw.call({ op: 'consent', who: 'groom', agree: true }); tw.call({ op: 'phrase', who: 'groom' }); tw.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AA' });
  const seen = [], of = tw.sb.UrlFetchApp.fetch;
  const sil = []; tw.sb.UrlFetchApp.fetch = (u, q) => { if (/text-to-speech/.test(u)) { try { const o = JSON.parse(q.payload).output; seen.push(o.audio_tempo); sil.push(o.remove_silence_ms); } catch (e) { seen.push('?'); } } return of(u, q); };
  [['1.2', 0], ['1.9', 1], ['abc', 2], ['0.75', 3], ['0.4', 4], ['', 5]].forEach(([t, i]) => tw.call({ op: 'make', key: 'g' + (i % 4), text: i + '번 빠르기', one: 'groom', tempo: t })   /* 글 앞머리를 다르게 — 흉내 해시(computeDigest 스텁 = 글자 그대로)가 앞부분만 보고 겹친다 */);
  tw.call({ op: 'practice', role: 'groom', text: '연습 빠르기', tempo: '1.3' });
  /* ★[TEMPO_WIDE 2026-10-04] 범위 0.7 ~ 1.3 · 0.1 걸음 → 0.5 ~ 1.5 · 0.05 걸음(화면 −1.0 ~ +1.0) */
  ok('[TEMPO_WIDE] 빠르기 1.2 받음 · 1.9 → 1.5 · 글자 → 1 · 0.75 그대로 · 0.4 → 0.5 · 빈 값 → 1 · 연습 1.3', JSON.stringify(seen) === JSON.stringify([1.2, 1.5, 1, 0.75, 0.5, 1, 1.3]), JSON.stringify(seen));
  ok('[PAUSE_STEP] 쉼을 안 보낸 옛 화면 = remove_silence_ms 150', sil.every((x) => x === 150), JSON.stringify(sil));
  const sn = seen.length; tw.call({ op: 'make', key: 'g1', text: '쉼 시험', one: 'groom', tempo: '1', pause: 600 }); tw.call({ op: 'make', key: 'g1', text: '쉼 시험', one: 'groom', tempo: '1', pause: 600 }); tw.call({ op: 'make', key: 'g1', text: '쉼 시험', one: 'groom', tempo: '1', pause: 777 });
  ok('[PAUSE_STEP] 쉼 600 → remove_silence_ms 600 · 같은 쉼 다시 = 캐시(안 부름) · 정하지 않은 값(777) → 150 · 쉼이 다르면 열쇠가 다르다', seen.length === sn + 2 && sil[sil.length - 2] === 600 && sil[sil.length - 1] === 150, JSON.stringify(sil));
  ok('[RF_MAIL_AI] make 뒤 VCMK_<코드>_<자리> 표시(곧 올라올 AI 파일에 메일 안 보냄)', tw.sb.CacheService.getScriptCache().get('VCMK_ME0001_g1') === '1');
  const n0 = seen.length; tw.call({ op: 'make', key: 'g0', text: '0번 빠르기', one: 'groom', tempo: '1.2' });
  ok('[TEMPO_STEP] 한 번 만든 빠르기는 다시 부르지 않는다(캐시 열쇠에 빠르기)', seen.length === n0, JSON.stringify(seen)); }
for (let i = 0; i < 12; i++) r = w.call({ op: 'make', key: 'g1', text: '글 ' + i, one: 'groom' });
ok('[VC_BUDGET] 한 줄을 열두 번 다시 만들어도 막히지 않음 · «N번 남음»(left)을 보내지 않음', r.ok && r.left === undefined && w.call({ op: 'status' }).per === undefined, JSON.stringify(r));
w.props.VC_ME0001 = JSON.stringify(Object.assign(w.st(), { practice: 199990 }));
const ttsBefore = w.calls.filter((c) => /text-to-speech/.test(c)).length;
const r5 = w.call({ op: 'make', key: 'g1', text: '열한 글자를 넘는 새 글이에요', one: 'groom' });
ok('[VC_BUDGET] 예식당 20만 자를 넘으면 «이번 예식의 AI 만들기를 다 썼어요 …» · TTS 를 부르지 않음', !r5.ok && r5.limit && /이번 예식의 AI 만들기를 다 썼어요\. 지금 것을 쓰시거나 직접 녹음해 주세요/.test(r5.error) && w.calls.filter((c) => /text-to-speech/.test(c)).length === ttsBefore, JSON.stringify(r5));
w.props.VC_ME0001 = JSON.stringify(Object.assign(w.st(), { practice: 0 }));   // 예산을 되돌리고 다음 시험(422)
w.sb.UrlFetchApp.fetch = (url) => ({ getResponseCode: () => 422, getContentText: () => '{}', getBlob: () => ({ getBytes: () => [] }) });
r = w.call({ op: 'make', key: 'g2', text: '★☆', one: 'groom' });
ok('422 → «이 줄 글에 소리로 읽기 어려운 글자가 있어요 …»', !r.ok && /읽기 어려운 글자/.test(r.error), JSON.stringify(r));

// 5 · 스위치
w = world({ props: { VOICE_CLONE: 'studio' } });
ok('studio · 시험 예식 아님 → AI 거절', w.call({ op: 'status' }).on === false && !!w.call({ op: 'consent', who: 'groom', agree: true }).down);
w = world({ props: { VOICE_CLONE: 'studio', VOICE_STUDIO_CODES: 'ME0009, ME0001' } });
ok('studio · 시험 예식(VOICE_STUDIO_CODES) → 열림', w.call({ op: 'status' }).on === true && w.call({ op: 'consent', who: 'groom', agree: true }).ok);
w = world({ props: { VOICE_CLONE: 'off' } });
ok('off → 열리지 않음', w.call({ op: 'status' }).on === false);

// 6 · 연습 읽기 — [VC_BUDGET] 예식당 글자 예산(줄 만들기와 함께) · 캐시
w = world({ props: { TYPECAST_VOICE_M: 'tc_m', TYPECAST_VOICE_F: 'tc_f' }, api: Object.fromEntries([['POST /v1/text-to-speech', [200, 'mp3']]]) });
r = w.call({ op: 'practice', role: 'bride', text: '가'.repeat(1500) }); w.call({ op: 'practice', role: 'bride', text: '가'.repeat(1500) });
ok('연습 읽기 — 목소리 없으면 기본 목소리(신부 → 여) · 같은 글은 한 번만 만듦', r.ok && w.calls.length === 1 && w.st().practice === 1500, JSON.stringify(w.calls));
w.props.VC_ME0001 = JSON.stringify({ practice: 19000 });
r = w.call({ op: 'practice', role: 'groom', text: '나'.repeat(1200) });
ok('[VC_BUDGET] 연습 2만 자는 걷었다 — 2만 자를 넘어도 읽음', r.ok, JSON.stringify(r));
w.props.VC_ME0001 = JSON.stringify({ practice: 100000, make: { total: 9, per: {}, chars: 99500 } });
r = w.call({ op: 'practice', role: 'groom', text: '다'.repeat(1200) });
ok('[VC_BUDGET] 연습 + 줄 만들기 합이 20만 자를 넘으면 «이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요»', !r.ok && r.error === '이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요', JSON.stringify(r));

// 7 · 예식 다음 날 지우기
w = world({ wed: '2026-10-10', api: Object.fromEntries([CLONE('uc_z'), ['DELETE /v1/custom-voices/{id}', [204, '']]]) });
w.call({ op: 'consent', who: 'groom', agree: true }); w.call({ op: 'phrase', who: 'groom' }); w.call({ op: 'enroll', who: 'groom', sec: 60, data: 'data:audio/wav;base64,AA' });
w.setToday('2026-10-10'); vm.runInContext('purgeVoiceClones()', w.sb);
ok('예식 당일에는 지우지 않는다', w.st().groom.voiceId === 'uc_z');
w.setToday('2026-10-11'); vm.runInContext('purgeVoiceClones()', w.sb);
ok('예식 다음 날 → 업체 목소리 · 읽은 녹음 지움 · «지움» 기록', !w.st().groom.voiceId && !!w.st().groom.deleted && Object.values(w.files).filter((f) => /^읽은 녹음/.test(f.name)).every((f) => f.trash) && w.calls.some((c) => c === 'DELETE /v1/custom-voices/uc_z'), JSON.stringify(w.st()));
w = world({ wed: '2026-12-01', stage: '취소', api: Object.fromEntries([CLONE('uc_c'), ['DELETE /v1/custom-voices/{id}', [204, '']]]) });
w.call({ op: 'consent', who: 'bride', agree: true }); w.call({ op: 'phrase', who: 'bride' }); w.call({ op: 'enroll', who: 'bride', sec: 60, data: 'data:audio/wav;base64,AA' });
vm.runInContext('purgeVoiceClones()', w.sb);
ok('취소된 예식 → 날짜 전이어도 바로 지움', !w.st().bride.voiceId);

console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FLOW SIM OK'); process.exit(fail ? 1 : 0);
