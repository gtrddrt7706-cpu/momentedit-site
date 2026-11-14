#!/usr/bin/env node
/* ★★[MID_VIDEO_1106 2026-11-06 사장님 «식중 영상은 선택으로» · 대본 체크리스트 7 · 8 · 9 · 12 · 13 · 16] 식중 영상(선택) — 식전영상 몫을 잰다
   방식: 식순 «준비한 순서 · 영상» 자리(성혼 선언 · 덕담 뒤 · 축가 앞)를 식중 영상으로 쓴다 · 새 칸 · 새 녹음 없음 · 축사와 택1 · 기한 예식 7일 전
   ① 켜고 끄기 — 원천은 식순 초안 하나(S.on.free + S.freeWhat 'video') · 마이페이지는 그 칸을 연다(식순을 따로 쓰지 않는다) · 꺼져 있으면 «넣기 · 선택»(할 일 아님)
   ② 상태 넷 — 미제출(올리기 · 기한) · 제출(스튜디오 확인 중 · 확인 필요) · 확정 · 영상 없이 진행(기한 지남) — 예식 준비 줄 · 첫 화면 · 확인서가 같은 말
   ③ 서버 — «개인코드#mid» 줄 · 링크뿐(사진 · 곡 · 분위기를 받지 않는다) · 동의 · 유튜브 거절 · 식전 줄과 서로 안 섞인다 · 식순이 켜고 끈다(on · len) · 6개월 지우기(_pgPrevideo_ · 영구 삭제)가 «#mid»도 지운다
   ④ 기한 안내 — 예식 14일 · 7일 전 한 번씩 · 확정했거나 식순에 없으면 안 보낸다 · 기한날 아직 안 보냈으면 관리자 한 줄 · 못 보냈으면 다음 날 다시
   ⑤ 길 — buildProductionState midvideo · setupAllTriggers · 알림 이벤트 · 관리자 화면 줄
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadGas } from './gas-lint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const my = read('mypage.html'), gs = read('automation/platform/89_prevideo.gs'), pr = read('automation/platform/80_production.gs'),
  jr = read('automation/platform/70_journey.gs'), nt = read('automation/platform/95_notify.gs'), adm = read('admin.html');
if (!my || !gs || !pr || !jr || !nt || !adm) { console.log('━━ midvideo — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
let bad = 0, n = 0;
const ok = (c, m, d) => { n++; if (!c) { bad++; console.log('FAIL ' + m + (d === undefined ? '' : ' → ' + String(d).slice(0, 300))); } };
const fnSrc = (src, name) => { const a = src.indexOf('function ' + name + '('); if (a < 0) return ''; const b = src.indexOf('\nfunction ', a + 10); return src.slice(a, b < 0 ? undefined : b); };

console.log('━━ ① 켜고 끄기 · ② 상태 넷 (마이페이지 함수를 그대로 돌린다)');
const need = ['_mvcOn', '_mvcLen', '_mvcRow', '_pvcMd'];
const srcs = need.map((x) => fnSrc(my, x));
if (srcs.some((x) => !x)) { console.log('━━ midvideo — 마이페이지 함수(' + need.filter((x, i) => !srcs[i]).join(' · ') + ')를 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const C = vm.createContext({ LEFT: null });
vm.runInContext('function _kstDdayOf(d){ return LEFT; }\n' + srcs.join('\n'), C);
const rd = (on, what, len) => ({ ritualDraft: { _v: 3, S: { on: on ? { free: 1 } : {}, freeWhat: what, freeLen: len } } });
ok(C._mvcOn(rd(true, 'video')) === true, '식순 «준비한 순서 · 영상» → 켬');
ok(C._mvcOn(rd(true, 'speech')) === false, '준비한 순서가 축사 → 끔(축사와 택1)');
ok(C._mvcOn(rd(false, 'video')) === false, '준비한 순서를 빼면 → 끔');
ok(C._mvcOn({}) === null, '식순이 아직 없으면 → 모름(null)');
ok(C._mvcLen(rd(true, 'video', '5')) === 5 && C._mvcLen(rd(true, 'video', '99')) === 3, '길이 = 식순 길이 칸(1~10분 · 모르면 3분)');
const row = (v, on, left) => { C.LEFT = left; return C._mvcRow(v, on); };
let r = row({ st: '' }, false, 20);
ok(r === null, '식순에 없음 → 줄 없음(고르지 않은 분께는 안 보임 · [VIDEO_NAME_1114] · 11/07 «넣기 · 선택» 걷음)', JSON.stringify(r));
r = row({ st: '' }, null, 20);
ok(r === null, '식순이 아직 없음 → 줄 없음 [VIDEO_NAME_1114]', JSON.stringify(r));
r = row({ st: 'done' }, false, 20);
ok(r.label === '보기' && r.tag === '식순 확인', '확정한 뒤 식순에서 빼면 «식순 확인»(«넣기»로 덮지 않는다 · 검토 1604-3)', JSON.stringify(r));
r = row({ st: '', due: '2020-05-01' }, false, -2);
ok(r === null, '식순에 없고 받은 것도 없으면 기한이 지나도 줄 없음 [VIDEO_NAME_1114]', JSON.stringify(r));
r = row({ st: '', due: '2099-05-01' }, true, 10);
ok(r.done === false && r.label === '시작하기' && r.tag === '5월 1일까지', '미제출 → «시작하기»(식전 영상 줄과 같은 말 · [VIDEO_NAME_1114]) · 14일 안이면 기한', JSON.stringify(r));
r = row({ st: 'draft', due: '2099-05-01', d: { link: 'https://x' } }, true, 10);
ok(r.label === '이어하기', '링크를 적다 두면 «이어하기»(식전 영상 줄과 같음)', JSON.stringify(r));
r = row({ st: 'checking', due: '2099-05-01' }, true, 10);
ok(r.done === false && r.tag === '스튜디오 확인 중', '제출 → «스튜디오 확인 중»', JSON.stringify(r));
r = row({ st: 'review', due: '2099-05-01' }, true, 10);
ok(r.done === false && r.label === '영상 확인' && r.tag === '확인 필요', '미리보기 도착 → «영상 확인 · 확인 필요»', JSON.stringify(r));
r = row({ st: 'done', due: '2099-05-01' }, true, -3);
ok(r.done === true && r.st === '완료', '확정 → 완료(기한이 지나도)', JSON.stringify(r));
r = row({ st: 'draft', due: '2099-05-01' }, true, -1);
ok(r.done === true && r.tag === '영상 없이 진행', '기한 지남 · 미확정 → «영상 없이 진행»', JSON.stringify(r));
r = row({ st: 'review', due: '2099-05-01' }, true, -1);
ok(r.tag === '확인 필요', '기한 전에 보낸 미리보기는 기한 뒤에도 «확인 필요»(서버가 확정을 받는다)', JSON.stringify(r));
/* ★[VIDEO_NAME_1114 · GPT 1-08] 식전 줄은 늘 식전으로 판정 — 마지막에 연 식중 화면(식순에서 뺀 상태)이 남긴 PVCFLOW 를 읽어 식전 줄에 «식순 확인»이 붙던 것 */
{ const need2 = ['_pvcRow', '_pvcClash', '_pvcRitOn', '_pvcNewD', '_pvcMd'], s2 = need2.map((x) => fnSrc(my, x));
  if (s2.every(Boolean)) { const C2 = vm.createContext({ window: { _lastProd: { ritualDraft: { _v: 3, S: { on: { prevideo: 1 } } } } }, PVCFLOW: { kind: 'mid', on: false } });
    vm.runInContext('function _kstDdayOf(d){ return 20; }\n' + s2.join('\n'), C2);
    const r2 = C2._pvcRow({ st: 'done', conf: { at: 'x' }, due: '2099-01-01' });
    ok(r2 && r2.tag !== '식순 확인', '식중 화면을 연 뒤에도 식전 줄은 식전으로 판정(«식순 확인»이 옮겨 붙지 않는다) [VIDEO_NAME_1114]', JSON.stringify(r2)); }
  else ok(false, '_pvcRow 판정 함수들을 못 찾았다', need2.filter((x, i) => !s2[i]).join(' · ')); }
/* ★[VIDEO_NAME_1114 · GPT 1-20 · 2-25] 옛 초안의 영상 갈래 장면 이름 = «식중 영상»(이름만 맞춘 판 · 장면 목록만 실린 10/12 판 둘 다) · 선물 · 축사 갈래는 그대로 */
{ const a = my.indexOf('var PHOTO_SCENE=['), b = my.indexOf('];', a);
  const src3 = (a > -1 && b > a ? my.slice(a, b + 2) : '') + '\n' + fnSrc(my, '_flowFix') + '\n' + fnSrc(my, 'photoSceneList');
  if (a > -1 && fnSrc(my, 'photoSceneList') && fnSrc(my, '_flowFix')) { const C3 = vm.createContext({}); vm.runInContext(src3, C3);
    const nm = (rd) => ((C3.photoSceneList(rd) || []).map((x) => x.n));
    const v1 = nm({ S: { freeWhat: 'video' }, summary: { flow: ['준비한 순서'] } }), v2 = nm({ S: { freeWhat: 'video' }, summary: { open: true, scenes: [{ n: '준비한 순서', s: '함께 보며 웃는 하객들' }] } }),
      g1 = nm({ S: { freeWhat: 'gift' }, summary: { open: true, scenes: [{ n: '준비한 순서', s: 'x' }] } });
    ok(v1.indexOf('식중 영상') > -1 && v2.indexOf('식중 영상') > -1 && g1.indexOf('준비한 순서') > -1, '옛 초안 영상 갈래 장면 이름 «식중 영상»(두 저장 판) · 선물 갈래는 그대로 [VIDEO_NAME_1114]', JSON.stringify({ v1, v2, g1 })); }
  else ok(false, 'photoSceneList · PHOTO_SCENE 를 못 찾았다'); }
// 화면 글 · 길
const blk = my.slice(my.indexOf('var PVC_ON='), my.indexOf('function renderSnap(p)'));
const mstart = fnSrc(my, '_mvcStart');
ok(/식순에서 넣기/.test(mstart) && /식순에서 빼기/.test(mstart) && /data-mvcrit/.test(mstart), '첫 화면 — 식순에 없으면 «식순에서 넣기» · 있으면 «식순에서 빼기»(둘 다 식순 칸을 연다)');
ok(/넣지 않으면 식순은 그대로예요/.test(mstart), '«넣지 않으면 식순은 그대로예요»(꺼져 있으면 아무것도 안 바뀐다)');
ok(/축사와 같은 칸이라 둘 중 하나만 고를 수 있어요/.test(mstart), '축사와 택1을 한 줄로');
ok(/제작 비용은 두 분 부담이에요 · 쿠폰 · 기본 템플릿은 식전 영상에만/.test(mstart), '제작 비용 · 쿠폰 범위(식전 영상 1편에만)');
ok(/_pvcDueLine\(/.test(mstart) && /기한까지 확정하지 않으면 영상 없이 진행해요/.test(mstart), '기한 줄 · 없으면 영상 없이');
ok(/식순에 정한 길이/.test(mstart) && /식순에 정한 길이/.test(fnSrc(my, '_pvcUpload')), '켜진 뒤 — 식순 길이(시간 예산과 같은 값)를 올리기 화면에도');
ok(/openRitualBuilder\([^)]*\{at:'midvideo'\}\)/.test(fnSrc(my, '_mvcToRitual')), '«식순에서 넣기 · 빼기» = 식순 화면을 at:midvideo 로 연다(마이페이지가 식순을 따로 쓰지 않는다)');
ok(!/saveProductionTrack[^\n]*track:'ritual'[^\n]*free/.test(blk), '식중 영상 코드가 식순 초안을 직접 저장하지 않는다');
{ const cf = fnSrc(my, '_pvcConfirm');
  ok(/\(done\|\|_mOff\)\?_pvcBar\(''/.test(cf), '식순에서 뺀 식중 영상 — 확정 단추 없음(재검토 1604)');
  ok(/PVCFLOW\.kind==='mid' && PVCFLOW\.on!==true\) return ''/.test(fnSrc(my, '_pvcOldLine')), '«기존 확정본으로 진행해요» — 식순에서 뺀 식중 영상엔 안 나온다(재검토 1604)');
  ok(/F\.kind==='mid' && F\.on!==true\) h\+=/.test(fnSrc(my, '_pvcLocked')), '기한 지남 화면 — 식순에서 뺀 식중 영상은 «없이 진행해요»(확정본 «진행해요» 아님 · 재검토 1604)');
  ok(/_pvcNeed\(_pvcClash\(F\.st, F\.conf\)\)/.test(fnSrc(my, '_pvcSent')), '링크를 받았어요 화면에도 식순 어긋남 한 줄(재검토 1604)');
  ok(/var _mOff=\(F\.kind==='mid'&&F\.on!==true\)/.test(cf) && /_mOff\?'식순에 이 영상이 없어요\.'/.test(cf) && /_mOff\?'':/.test(cf), '식순에서 뺀 식중 영상 — 확인 화면이 «진행해요 · 상영해요»를 말하지 않는다(검토 1604-3)'); }
ok(/\n    _pvRow,   _mvRow,/.test(my) && my.indexOf("row('식중 영상'") > -1 && my.indexOf("$('mp_mvcStart')") > -1, '예식 준비 줄 — 식전 영상 바로 뒤 · 단추 연결');
ok(/body\.kind='mid'/.test(fnSrc(my, '_pvcSave')) && /d\.production\[_pvcKey\(\)\]/.test(fnSrc(my, '_pvcRecheck')), '저장 · 다시 확인이 식중 줄(kind mid · midvideo)을 쓴다');
ok(/_mvAct/.test(my) && /head = '식중 영상을 확인해 주세요';/.test(my) && /식중 영상 준비가 남아 있어요\./.test(my), '첫 화면(NOW) — 식중 영상 확인 · 준비 남음(M01 과 같은 방식)');
ok((my.match(/\+_cfPvLine\(p\)\+_cfMvLine\(p\)/g) || []).length === 2 && /data-cfmvc/.test(fnSrc(my, 'wireProdConfirm')), '예식 확인서 두 갈래에 식중 영상 한 줄 · 열기 단추');
ok((blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').match(/'[^'\n]*—[^'\n]*'/g) || []).length === 0, '화면 글에 전각 줄표(—) 없음');

console.log('━━ ③ 서버(진짜 89_prevideo 함수 · 시트 · 드라이브만 가로챈다)');
const { sandbox: G, errors } = loadGas();
if (errors.length) { console.log('━━ midvideo — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
for (const fn of ['handlePvSave', '_pvPublic', '_pvKey_', '_mvOn_', 'sendVideoDueNotices']) if (typeof G[fn] !== 'function') { console.log('━━ midvideo — ' + fn + ' 이 없습니다 · 재지 못했습니다'); process.exit(2); }
const kst = new Date(Date.now() + 9 * 3600e3), ymd = (x) => new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) + x * 864e5).toISOString().slice(0, 10);
const J = (o) => JSON.parse(JSON.stringify(o));
let store = {}, mails = [], folders = [], WED = ymd(40), RIT = { on: { free: 1 }, freeWhat: 'video', freeLen: '4' };
const cust = () => ({ get: (h) => (h === '예식일' ? WED : (h === '개인코드' ? 'T1' : '')) });
{ const real = G._pvAdminMail_, sent = [], cache = new Map(); const CS = G.CacheService, AE = G._nfAdminLineEmail;
  G.CacheService = { getScriptCache: () => ({ get: (k) => cache.get(k) || null, put: (k, v) => cache.set(k, v) }) }; G._nfAdminLineEmail = (l) => sent.push(l);
  real('T1', '식중 영상 도착 · T1'); real('T1', '식중 영상 도착 · T1'); real('T1', '준비한 식전 영상 도착 · T1');
  ok(sent.length === 2, '관리자 메일 10분 한 통 제한 — 같은 코드 · 같은 영상은 한 통 · 식전 · 식중은 서로 안 막는다(검토 1604-1)', JSON.stringify(sent));
  G.CacheService = CS; G._nfAdminLineEmail = AE; }
G._pvSheet_ = () => ({});
G._pvRow_ = (sh, code) => (store[code] ? { num: 2, d: J(store[code].d), m: J(store[code].m) } : null);
G._pvWrite_ = (sh, row, code, d, m) => { store[code] = { d: J(d), m: J(m) }; };
G._pvSess_ = () => ({ code: 'T1', cust: cust() });
G._pvFolder_ = (m, code, c, kind) => { folders.push(kind || 'pre'); m.folder = 'F_' + (kind || 'pre'); return m.folder; };
G._pvAdminMail_ = (c, line) => { mails.push(line); };
G._pvSeePreview_ = () => false;
G._recordHandler = () => {};
G._prodLoad = () => ({ ritualDraft: { _v: 3, S: RIT } });
const save = (op, draft, extra) => G.handlePvSave(Object.assign({ token: 't', op, draft, kind: 'mid' }, extra || {}));
// ★처리방침 문 — midFrom 이 비어 있으면 식중 영상은 꺼짐(줄 · 받기)
{ const mf = G.PV_UP.midFrom; G.PV_UP.midFrom = '';
  const rr = save('save', { link: 'https://drive.google.com/x' });
  ok(rr && rr.ok === false && rr.closed === true && G._pvPublic('T1', cust(), 'mid').up === false && G._pvPublic('T1', cust()).up === true, 'midFrom 이 비면 식중만 꺼짐(받지 않음 · 줄 안 보임) · 식전은 그대로(검토 1604-5)', JSON.stringify(rr));
  G.PV_UP.midFrom = '2026-01-01'; void mf; }
store = { T1: { d: { mode: 'make', style: 'editorial' }, m: { st: 'draft' } } };
r = save('save', { mode: 'make', style: 'retro', song: 'mujin', photos: [{ id: 'P1', sec: 'days' }], link: 'https://drive.google.com/x' });
ok(r && r.ok && store['T1#mid'] && store['T1#mid'].d.mode === 'upload' && !store['T1#mid'].d.photos.length && !store['T1#mid'].d.style && !store['T1#mid'].d.song, '«개인코드#mid» 줄 · 링크뿐(사진 · 곡 · 분위기는 버린다)', JSON.stringify(store['T1#mid']));
ok(store.T1.d.style === 'editorial' && store.T1.m.st === 'draft', '식전 줄은 그대로(서로 안 섞인다)', JSON.stringify(store.T1));
ok(r.pv && r.pv.kind === 'mid' && r.pv.on === true && r.pv.len === 4 && r.pv.due === ymd(33), '돌려주는 상태 — kind mid · 식순 켬 · 길이 4분 · 기한 예식 7일 전', JSON.stringify(r.pv));
r = save('submit', { link: 'https://drive.google.com/x' });
ok(r && r.ok === false && r.consent === false && /식중 영상 동의가 필요해요/.test(r.error || ''), '동의 없이 보내기 → 거절(«식중 영상 동의»)', JSON.stringify(r));
{ const R0 = RIT, S0 = J(store); RIT = { on: { free: 1 }, freeWhat: 'speech' };
  store['T1#mid'] = { d: { mode: 'upload', link: 'https://drive.google.com/x' }, m: { st: 'review', prev: { id: 'MVX' }, consent: { at: 'x' } } };
  const rc = save('confirm', null);
  ok(rc && rc.ok === false && /«식중 영상»을 먼저 담아 주세요/.test(rc.error || '') && store['T1#mid'].m.st === 'review', '식순에서 뺀 식중 영상은 서버도 확정하지 않는다(재검토 1604)', JSON.stringify(rc));
  store = S0; RIT = R0; }
{ const R0 = RIT; RIT = { on: { free: 1 }, freeWhat: 'speech' };
  const rr = save('submit', { link: 'https://drive.google.com/x' }, { pvConsent: 1 });
  ok(rr && rr.ok === false && /«식중 영상»을 먼저 담아 주세요/.test(rr.error || ''), '식순이 영상이 아니면 서버도 보내기를 막는다', JSON.stringify(rr)); RIT = R0; }
r = save('submit', { link: 'https://youtu.be/x' }, { pvConsent: 1 });
ok(r && r.ok === false && /유튜브/.test(r.error || ''), '유튜브 링크 → 거절', JSON.stringify(r));
mails = []; folders = [];
r = save('submit', { link: 'https://drive.google.com/file/d/x/view' }, { pvConsent: 1 });
ok(r && r.ok && store['T1#mid'].m.st === 'checking' && folders[0] === 'mid' && mails.length === 1 && /^식중 영상 도착/.test(mails[0]), '보내기 → 스튜디오 확인 중 · 식중 폴더 · 관리자 메일 «식중 영상 도착»', JSON.stringify({ st: store['T1#mid'].m.st, folders, mails }));
store['T1#mid'].m.st = 'review'; store['T1#mid'].m.prev = { id: 'MV1', at: 'x' }; mails = [];
r = save('confirm', null);
ok(r && r.ok && store['T1#mid'].m.st === 'done' && /^식중 영상 확정/.test(mails[0] || ''), '확인 필요 → 확정 · 관리자 메일 «식중 영상 확정»', JSON.stringify({ r, mails }));
RIT = { on: { free: 1 }, freeWhat: 'speech', freeLen: '3' };
ok(G._pvPublic('T1', cust(), 'mid').on === false, '식순 준비한 순서가 축사로 바뀌면 on=false(택1)');
G._prodLoad = () => ({});
ok(G._pvPublic('T1', cust(), 'mid').on === null, '식순이 없으면 on=null');
ok(G._pvPublic('T1', cust()).kind === 'pre' && !('on' in G._pvPublic('T1', cust())), '식전(kind 없음)은 예전 그대로');
WED = ymd(3); store = { 'T1#mid': { d: { mode: 'upload' }, m: {} } };
r = save('save', { link: 'https://drive.google.com/y' });
ok(r && r.ok === false && r.locked === true, '기한(예식 7일 전)이 지나면 식중도 저장 거절', JSON.stringify(r));
// 6개월 지우기 — «#mid» 줄도 같은 예식일 · 같은 영구 삭제(70_journey _pgPrevideo_ · PURGE_POLICY_1106)
if (typeof G._pgPrevideo_ !== 'function') { console.log('━━ midvideo — _pgPrevideo_ 가 없습니다 · 재지 못했습니다'); process.exit(2); }
{ const seen = []; const rows = [['T9', '확정', '', '{}', JSON.stringify({ folder: 'FA' }), ''], ['T9#mid', '확정', '', '{}', JSON.stringify({ folder: 'FB' }), '']];
  const sh = { getLastRow: () => 3, getRange: (r1) => ({ getValues: () => rows, setValues: () => seen.push('mark:' + r1) }) };
  const PS = G._pvSheet_, FC = G.findCustomerByCode, PG0 = G._pgGone_;
  G._pvSheet_ = () => sh; G.findCustomerByCode = (c) => { seen.push('find:' + c); return { get: (h) => (h === '예식일' ? ymd(-200) : '') }; };
  G._pgGone_ = (id, live) => { seen.push('del:' + id); return 'ok'; };
  const o = G._pgPrevideo_(true, ymd(0));
  ok(o.target === 2 && o.done === 2 && seen.filter((x) => x === 'find:T9').length === 2 && seen.indexOf('del:FB') > -1 && seen.indexOf('mark:3') > -1, '6개월 지우기 — «#mid» 줄도 바탕 코드로 예식일을 찾아 영구 삭제 · «지움»', JSON.stringify({ o, seen }));
  seen.length = 0; G._pgGone_ = () => 'fail:x';
  const o2 = G._pgPrevideo_(true, ymd(0));
  ok(o2.fail === 2 && !seen.some((x) => /^mark:/.test(x)), '지우지 못하면 «지움»을 적지 않는다(다음 날 다시)', JSON.stringify({ o2, seen }));
  G._pvSheet_ = PS; G.findCustomerByCode = FC; G._pgGone_ = PG0; }

/* ★[PVNORM_KIND_1107] handlePvSave 안의 _pvNorm_ 은 모두 kind 를 넘긴다 — #1618(B2_FIX_MA_59) 이 넣은 «다른 기기 사진 지키기» 줄 하나가 kind 없이 들어왔다
   (지금은 식중 초안에 사진이 없어 닿지 않지만, 빠지면 식중 줄이 식전처럼 사진 · 곡 · 분위기를 받을 수 있다)
   주석(블록 주석 · 줄 끝 //)을 지우고 센다 — 고친 줄이 주석에 먹혀도 «kind 있음»으로 세지 않게(검토 1622 권함 · CODE_IN_COMMENT) */
{ const hs = fnSrc(gs, 'handlePvSave').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'), calls = hs.match(/_pvNorm_\((?:[^()]|\([^()]*\))*\)/g) || [], noKind = calls.filter((c) => !/,\s*kind\)$/.test(c));
  ok(calls.length >= 5 && noKind.length === 0, 'handlePvSave 의 _pvNorm_ 은 모두 kind 를 넘긴다(식중 줄은 링크만) [PVNORM_KIND_1107]', calls.length + '곳 · kind 없음: ' + noKind.join(' | ')); }

console.log('━━ ④ 기한 안내(예식 14일 · 7일 전)');
{ const H = ['개인코드', '계약상태', '현재단계', '상품타입', '예식일'], col = {}; H.forEach((h, i) => { col[h] = i + 1; });
  let CUST = [], sent = [], admin = [], RET = true;
  G.getCustomersSheet = () => ({ getLastRow: () => 1 + CUST.length, getLastColumn: () => H.length, getRange: () => ({ getValues: () => CUST.map((o) => H.map((h) => o[h])) }) });
  G.buildHeaderIndex = () => col; G.P = Object.assign({}, G.P || {}, { DATA_START_ROW: 2 });
  G.findCustomerByCode = (c) => { const o = CUST.filter((x) => x['개인코드'] === c)[0]; return o ? { get: (h) => o[h] || '' } : null; };
  G.notifyKakao = (ev, code, x) => { sent.push([ev, code, x && x.what, x && x.dday]); return RET; };
  G._nfAdminLineEmail = (line) => { admin.push(line); };
  G.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  const C1 = (code, days) => ({ 개인코드: code, 계약상태: '서명완료', 현재단계: '제작중', 상품타입: '시그니처', 예식일: ymd(days) });
  const RD = { T1: { on: { free: 1, prevideo: 1 }, freeWhat: 'video' }, T2: { on: { prevideo: 1 }, freeWhat: 'speech' }, T3: { on: { free: 1 }, freeWhat: 'video' } };
  G._prodLoad = (c) => ({ ritualDraft: { _v: 3, S: RD[c.get('개인코드')] || {} } });
  CUST = [C1('T1', 14), C1('T2', 14), C1('T3', 20)]; store = { 'T2#mid': { d: {}, m: {} } };
  G.sendVideoDueNotices();
  ok(sent.length === 2 && sent[0][1] === 'T1' && sent[0][2] === '식전 영상 · 식중 영상' && sent[1][1] === 'T2' && sent[1][2] === '식전 영상', '14일 전 — 식순에 담은 것만(식전 · 식중 / 식전) · 20일 남은 예식은 아직', JSON.stringify(sent));
  ok(store.T1 && store.T1.m.rem && store.T1.m.rem.d14 && store['T1#mid'] && store['T1#mid'].m.rem.d14, '보낸 날을 줄마다 적는다(rem.d14)', JSON.stringify(store));
  sent = []; G.sendVideoDueNotices();
  ok(sent.length === 0, '같은 단계는 한 번만', JSON.stringify(sent));
  CUST = [C1('T1', 7)]; store['T1#mid'].m.st = 'done'; sent = []; admin = [];
  G.sendVideoDueNotices();
  ok(sent.length === 1 && sent[0][2] === '식전 영상' && sent[0][3] === 7, '7일 전(기한날) — 확정한 식중은 빼고 식전만', JSON.stringify(sent));
  ok(admin.length === 1 && /T1 · 식전 영상/.test(admin[0]) && !/식중/.test(admin[0]), '기한날 아직 안 보낸 영상 → 관리자 한 줄', JSON.stringify(admin));
  CUST = [C1('T3', 7)]; store = {}; RET = false; sent = [];
  G.sendVideoDueNotices();
  ok(sent.length === 1 && !(store['T3#mid'] && store['T3#mid'].m.rem), '못 보냈으면(false) 적지 않는다 — 다음 날 다시', JSON.stringify(store));
  RET = 'mail'; sent = []; store = {}; G.sendVideoDueNotices();
  ok(sent.length === 1 && store['T3#mid'] && store['T3#mid'].m.rem && store['T3#mid'].m.rem.d7, '템플릿이 없어 메일로 대신 보냈으면(mail) 보낸 것 — 매일 다시 안 간다(검토 1604-2)', JSON.stringify(store));
  for (const st of ['making', 'checking', 'review', 'editing']) { store = { 'T3#mid': { d: {}, m: { st } } }; RET = true; sent = []; G.sendVideoDueNotices();
    ok(sent.length === 0, '«' + st + '» 는 안내하지 않는다(«영상 없이»가 사실이 아니다 · 검토 1604-4)', JSON.stringify(sent)); }
  store = {}; RET = 'off'; sent = []; G.sendVideoDueNotices();
  ok(!(store['T3#mid'] && store['T3#mid'].m.rem), '발송이 꺼져 있으면(off) 보낸 것으로 치지 않는다', JSON.stringify(store));
  RET = true; CUST = [Object.assign(C1('T3', 7), { 상품타입: '웨딩스냅' })]; sent = []; G.sendVideoDueNotices();
  ok(sent.length === 0, '웨딩스냅은 보내지 않는다'); }

console.log('━━ ⑤ 길');
{ const priv = read('privacy.html') || '', mf = (gs.match(/midFrom: '([^']*)'/) || [])[1];
  if (mf) { const top = (priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/) || []).slice(1, 4).join('-');
    ok(/식중 영상/.test(priv) && top >= mf, '식중 영상을 켰으면(midFrom ' + mf + ') 처리방침에 «식중 영상»이 있고 개정 시행일이 그 날 이후', top);
    /* ★[MID_OPEN_1114] 문을 연 날 = 처리방침에 «식중 영상»을 넣은 개정의 시행일(같은 날) — 처리방침보다 먼저 받지 않는다 · 수집 줄(#midvideo) · 동의 판이 그 줄을 가리킨다 */
    const [y, m, d] = mf.split('-').map(Number), ko = y + '년 ' + m + '월 ' + d + '일';
    ok(priv.indexOf(ko + ' (식중 영상 항목 추가') > -1, '개정 이력에 «' + ko + ' (식중 영상 항목 추가 …)» — midFrom 과 같은 날 [MID_OPEN_1114]');
    ok(/id="midvideo"[\s\S]{0,400}?식중 영상/.test(priv), '처리방침 수집 항목에 «식중 영상» 줄(#midvideo) [MID_OPEN_1114]');
    /* ★[MID_OPEN_1114 · GPT 3-29] 이 개정이 맨 위(가장 최근)인 동안은 날짜 다섯이 한 날 — 맨 위 시행 · 공고 · 개정 공고일자 · 시행일자 첫 날 · midFrom.
       승인일로 옮길 때 한 곳만 놓쳐도 빨강(다음 개정이 위에 오면 이력 한 줄 = midFrom 만 본다) */
    const yk = (t) => { const q = String(t || '').match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/); return q ? q[1] + '-' + ('0' + q[2]).slice(-2) + '-' + ('0' + q[3]).slice(-2) : ''; };
    const dot = (t) => (String(t || '').match(/(\d{4})\.(\d{2})\.(\d{2})/) || []).slice(1, 4).join('-');
    const hero = (priv.match(/개정 시행일자 · ([\d.]+) \(공고 ([\d.]+)\)/) || []), pub = (priv.match(/개정 공고일자<\/span>\s*<span class="spec-val">([^<]+)</) || [])[1], eff = (priv.match(/시행일자<\/span>\s*<span class="spec-val">([^<]+)</) || [])[1] || '';
    if (/^\d{4}년 \d{1,2}월 \d{1,2}일 \(식중 영상 항목 추가/.test(eff)) {
      const five = { 맨위시행: dot(hero[1]), 맨위공고: dot(hero[2]), 공고일자: yk(pub), 시행일자: yk(eff), midFrom: mf };
      ok(Object.values(five).every((v) => v === mf), '식중 영상 개정이 맨 위인 동안 날짜 다섯이 같은 날(맨 위 시행 · 공고 · 개정 공고일자 · 시행일자 · midFrom) [MID_OPEN_1114]', JSON.stringify(five)); }
    ok(/privacy\.html#'\+\(PVCFLOW\.kind==='mid'\?'midvideo':'prevideo'\)/.test(fnSrc(my, '_pvcAgree')), '식중 동의 판의 처리방침 링크 = #midvideo [MID_OPEN_1114]'); }
  else ok(mf === '', '식중 영상 꺼짐(midFrom 비어 있음) — 처리방침에 «식중 영상»을 넣은 날 midFrom 을 적어 켠다'); }
ok(/midvideo: \(typeof _pvPublic === 'function'\) \? _pvPublic\(.*?, r, 'mid'\)/.test(pr), 'buildProductionState 가 midvideo 를 싣는다');
ok(/fn: 'sendVideoDueNotices',\s+hour: 10/.test(jr), 'setupAllTriggers — 매일 10시 기한 안내');
ok(/'cust\.videoDue':\s+\{ to: 'customer'/.test(nt) && /case 'cust\.videoDue':/.test(nt) && /'cust\.videoDue':\s+\{ subj:/.test(nt), '알림 이벤트 cust.videoDue — 표 · 글 · 메일 제목');
{ const msg = G._nfCustomerMsg('cust.videoDue', '하윤·민준', { what: '식중 영상', due: '2099-05-01' });
  ok(msg && /식중 영상 확정 기한은 5월 1일 23:59\(예식 7일 전\)이에요/.test(msg.text) && /영상 없이 진행해요/.test(msg.text) && msg.text.indexOf('—') < 0, '안내 글 — 무엇 · 기한 · 없으면 영상 없이 · 전각 줄표 없음', msg && msg.text); }
ok(/function _admVideoLines\(prod, d\)/.test(adm) && /h\+=_admVideoLines\(prod, d\);/.test(adm) && /웨딩스냅/.test(fnSrc(adm, '_admVideoLines')) && /식순에서 뺌 · 틀지 않음/.test(fnSrc(adm, '_admVideoLines')) && /_chipLink\('받은 링크'/.test(adm), '관리자 화면 — 예식별 식전 · 식중 상태 · 기한 · 받은 링크(안전한 주소만)');

if (bad) { console.log(`━━ midvideo — 빨강 ${bad}건 / ${n}`); process.exit(1); }
console.log(`━━ midvideo OK — ${n}항목 · 켜고 끄기 · 상태 넷 · 서버 · 기한 안내 · 길 [MID_VIDEO_1106]`);
process.exit(0);
