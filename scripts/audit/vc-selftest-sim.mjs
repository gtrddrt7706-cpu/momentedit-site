#!/usr/bin/env node
/* ★[VC_SELFTEST_SIM 2026-09-28] vcSelfTest · _vcSlots 흉내 시험 — GAS · 타입캐스트 없이 판정만 돌린다.
   ★왜: 이 환경의 프록시가 api.typecast.ai 를 막는다(CONNECT 403 · 우회하지 않는다). 실제 호출은 사장님이 GAS 편집기에서 한 번 돌린다.
     그 한 번이 헛돌지 않게 — 키 없음 · 키 틀림 · 칸 0(무료 요금제) · 복제 거절 · 성공 · 고객 폴더 파일을 여기서 먼저 본다.
   ★원문을 그대로 떼어 쓴다(사본 금지). 응답 모양은 SDK(typecast-go client.go · models.go) 원본을 따른다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(new URL('../../automation/platform/80_production.gs', import.meta.url), 'utf8');
const grab = (name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const line = (re) => (src.match(re) || [''])[0];
const code = [line(/var RF_ROOT_FOLDER[^\n]*/), line(/var VC_BASE[^\n]*/), line(/var VC_TEST_FOLDER[^\n]*/),
  grab('_voiceStudio'), grab('_vcMode'), grab('_vcCfg_'), grab('_vcFetch'), grab('_vcCharLog'), grab('_vcTts'), grab('_vcSlots'), grab('vcSelfTest')].join('\n');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
if (!/function vcSelfTest/.test(code) || !/function _vcSlots/.test(code) || !/RF_ROOT_FOLDER/.test(code)) { console.log('FAIL 원문 조각을 못 떼었다 — 이름이 바뀌었나?'); process.exit(1); }

function run(sc) {
  const calls = [], saved = [], props = { TYPECAST_API_KEY: sc.key === undefined ? 'k' : sc.key }, cache = {};
  const res = (code, body, bytes) => ({ code, r: { getResponseCode: () => code, getContentText: () => typeof body === 'string' ? body : JSON.stringify(body), getBlob: () => ({ getBytes: () => bytes || [1, 2, 3] }) } });
  const route = (m, url) => { const p = url.replace('https://api.typecast.ai', ''); calls.push(m.toUpperCase() + ' ' + p);
    const r = (sc.api || {})[m.toUpperCase() + ' ' + p.replace(/\/uc_[^/]+$/, '/{id}')]; return r ? res(r[0], r[1]) : res(404, { detail: 'nf' }); };
  const mkFile = (f) => ({ isTrashed: () => false, getMimeType: () => f.mime || 'audio/wav', getName: () => f.name, getDateCreated: () => new Date(f.at || 0),
    getParents: () => { let i = 0; const ps = f.parents || [{ name: 'ME_목소리시험' }]; return { hasNext: () => i < ps.length, next: () => { const q = ps[i++]; let j = 0; const gp = q.gp ? [q.gp] : [];
      return { getName: () => q.name, getParents: () => ({ hasNext: () => j < gp.length, next: () => ({ getName: () => gp[j++] }) }) }; } }; },
    getBlob: () => ({ getBytes: () => ({ length: f.size || 300000 }), getContentType: () => f.mime || 'audio/wav', setName() { return this; } }) });
  const files = (sc.files || []).map(mkFile); let fi = 0;
  const dir = { getFiles: () => ({ hasNext: () => fi < files.length, next: () => files[fi++] }), createFile: (b) => { saved.push(b.name); return { getUrl: () => 'https://drive/x' }; } };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetch: (url, o) => { const x = route(o.method, url); return x.r; } },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => dir }), createFolder: () => dir },
    Utilities: { formatDate: () => '09281200', base64Encode: () => 'AAA', base64Decode: () => [1], newBlob: (b, m, n) => ({ name: n }) },
    _gsr_: () => {}, _trigIn_: () => {},   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안
    _requireAdmin: () => ({ ok: true }),   // [B19_LOCK 2026-10-09] 편집기 도구는 _requireAdmin 으로 잠겼다 — 이 흉내는 소유자가 편집기에서 돌리는 것
    Logger: { log() {} }, fmtKST: () => '', _kstYmd: () => '2026-09-28', JSON, Math, String, Date, encodeURIComponent,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  const out = sc.fn === 'slots' ? JSON.stringify(vm.runInContext('_vcSlots()', sb)) : vm.runInContext('vcSelfTest()', sb);
  return { out: String(out), calls, saved };
}
const SUB = (slot) => ['GET /v1/users/me/subscription', [200, { plan: slot ? 'lite' : 'free', credits: { plan_credits: 1000, used_credits: 10 }, limits: { concurrency_limit: 1, custom_voice_slot: slot } }]];
const ME = [{ name: '사장님 목소리.wav', at: 2 }];

// ① 키 없음 — 아무것도 부르지 않는다
let r = run({ key: '' });
ok('키 없음 → 스크립트 속성 안내 · API 호출 0', /TYPECAST_API_KEY 를 넣고/.test(r.out) && r.calls.length === 0, r.out);
// ② 키 틀림
r = run({ api: { 'GET /v1/users/me/subscription': [401, { detail: 'bad key' }] } });
ok('키 틀림(401) → «키가 맞지 않아요» · 복제 안 부름', /키가 맞지 않아요\(HTTP 401\)/.test(r.out) && !r.calls.some((c) => /instant-clone/.test(c)), r.out);
// ③ 무료 요금제 · 칸 0 · 복제 402
r = run({ files: ME, api: Object.fromEntries([SUB(0), ['POST /v1/custom-voices/instant-clone', [402, { detail: 'Payment Required' }]]]) });
ok('칸 0 → 요금제 free · 칸 0 경고', /요금제 free/.test(r.out) && /목소리 칸이 0/.test(r.out), r.out);
ok('칸 0 + 복제 402 → «이 요금제로는 인스턴트 복제를 할 수 없어요» 결론', /결론: 이 요금제\(키\)로는 인스턴트 복제를 할 수 없어요/.test(r.out) && !r.saved.length, r.out);
// ④ 시험 녹음 없음
r = run({ api: Object.fromEntries([SUB(5)]) });
ok('시험 녹음 없음 → 폴더 안내 · 복제 안 부름', /시험 녹음 없음/.test(r.out) && !r.calls.some((c) => /instant-clone/.test(c)), r.out);
// ⑤ 고객 폴더 파일 거절 [VC_OURS_ONLY]
r = run({ files: [{ name: '신랑 녹음.wav', parents: [{ name: 'ME-0001', gp: 'ME_예식준비파일' }] }], api: Object.fromEntries([SUB(5)]) });
ok('고객 폴더(ME_예식준비파일/코드) 파일 → 거절 · 복제 안 부름 [VC_OURS_ONLY]', /우리 목소리만/.test(r.out) && !r.calls.some((c) => /instant-clone/.test(c)), r.out);
// ⑥ 성공 — 복제 → 읽기 → 저장 → 지우기 → 목록
r = run({ files: [{ name: '예전.wav', at: 1 }, ...ME, { name: '시험 결과 09-27.mp3', mime: 'audio/mpeg', at: 9 }],
  api: Object.fromEntries([SUB(5), ['POST /v1/custom-voices/instant-clone', [200, { voice_id: 'uc_abc', name: 'ME-selftest', model: 'ssfm-v30' }]],
    ['POST /v1/text-to-speech', [200, 'mp3']], ['DELETE /v1/custom-voices/{id}', [204, '']], ['GET /v1/custom-voices', [200, []]]]) });
ok('성공 → 가장 최근 «우리» 녹음을 쓴다(지난 시험 결과 mp3 는 건너뜀)', /시험 녹음: 사장님 목소리\.wav/.test(r.out), r.out);
ok('성공 → 복제 · 읽기 · 지우기 순서', JSON.stringify(r.calls.filter((c) => !/^GET/.test(c))) === JSON.stringify(['POST /v1/custom-voices/instant-clone', 'POST /v1/text-to-speech', 'DELETE /v1/custom-voices/uc_abc']), JSON.stringify(r.calls));
ok('성공 → 결과 mp3 를 폴더에 저장 · 칸 0 / 5', r.saved.length === 1 && /^시험 결과/.test(r.saved[0]) && /⑥ 지금 쓰는 칸 0 \/ 5/.test(r.out), r.out);
// ⑥-2 [VC_FOLD_0928] 0928 확정 — 복제는 201 로 바로 끝난다(타입캐스트 문서 · Create Instant Clone)
r = run({ files: ME, api: Object.fromEntries([SUB(5), ['POST /v1/custom-voices/instant-clone', [201, { voice_id: 'uc_new', status: 'completed' }]], ['POST /v1/text-to-speech', [200, 'mp3']], ['DELETE /v1/custom-voices/{id}', [204, '']], ['GET /v1/custom-voices', [200, []]]]) });
ok('201 로 끝난 복제도 성공으로 읽는다 [VC_FOLD_0928]', /③ 복제 OK · voice_id uc_new/.test(r.out) && r.saved.length === 1, r.out);
// ⑦ soft-delete 로 목록에 남으면 알린다
r = run({ files: ME, api: Object.fromEntries([SUB(5), ['POST /v1/custom-voices/instant-clone', [200, { voice_id: 'uc_abc' }]], ['POST /v1/text-to-speech', [200, 'mp3']],
  ['DELETE /v1/custom-voices/{id}', [200, '']], ['GET /v1/custom-voices', [200, [{ voice_id: 'uc_abc' }]]]]) });
ok('지운 목소리가 목록에 남으면 «soft-delete» 표시', /soft-delete/.test(r.out), r.out);
// ⑧ 칸 표시(_vcSlots)
r = run({ fn: 'slots', api: Object.fromEntries([SUB(5), ['GET /v1/custom-voices', [200, [{ voice_id: 'uc_1' }, { voice_id: 'uc_2' }]]]]) });
ok('_vcSlots → 쓰는 칸 2 / 전체 5 · 요금제 lite', /"used":2/.test(r.out) && /"total":5/.test(r.out) && /"plan":"lite"/.test(r.out), r.out);
r = run({ fn: 'slots', key: '' });
ok('_vcSlots 키 없음 → null(관리 화면에 줄이 안 생긴다)', r.out === 'null' && r.calls.length === 0, r.out);

console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC SELFTEST SIM OK'); process.exit(fail ? 1 : 0);
