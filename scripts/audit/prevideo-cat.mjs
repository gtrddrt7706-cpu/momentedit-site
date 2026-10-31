#!/usr/bin/env node
/* ★★[PV_CAT_1031 2026-10-31 사장님 «추천대로진행» · «켜도상관없어»] 마이페이지 «식전 영상» — 결정이 화면 · 서버 · 처리방침에서 같은 말을 하는가
   ① 같은 값 — 분위기 다섯 · 곡 열둘 · 칸별 장수(4 · 10 · 6) · 5장부터 · 20장까지가 화면(mypage PVC_*)과 서버(89_prevideo PV_*)에서 같다
   ② 길이 이어져 있다 — doPost 세 길 · 실패 코드 자리(ERR_AREA · ERR_ACT) · 겹화면 목록 · 저장 · 나가기 한 벌(WIZ_ORDER) · 예식 준비 줄 · 6개월 지우기
   ③ 처리방침 — «식전 영상» 수집 줄(id=prevideo · 동의 판이 가리킨다) · 이용 목적 · 6개월 보관 · 시행일 ≤ 처리방침 개정일
   ④ 정직한 화면 — 1차에서 뺀 것(짧은 영상 · 인사 영상 · 파일로 보내기 · 알림)은 화면에도 없다 · «이 화면에서 확인할 수 있어요»
   ⑤ 서버 동작 — 진짜 89_prevideo 함수를 시트 · 드라이브만 가로채 부른다
      올린 적 없는 사진은 초안에 못 들어간다 · 동의 없이 못 보낸다 · 5장 미만 · 유튜브 거절 · 걸음(step)만 바뀌면 «만드는 중 · 확정»이 그대로([PV_SAME]) ·
      내용이 바뀌면 «작성 중 · 수정 중» · 확정은 «확인 필요»에서만 · 기한 뒤 잠금(제때 보낸 미리보기 확정만 예외) · 확정본 보기 주소
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGas } from './gas-lint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
const my = read('mypage.html'), gs = read('automation/platform/89_prevideo.gs'), cb = read('automation/consultation/consultation-booking.gs'),
  nt = read('automation/platform/95_notify.gs'), pr = read('automation/platform/80_production.gs'), priv = read('privacy.html');
if (!my || !gs || !cb || !nt || !pr || !priv) { console.log('━━ prevideo-cat — 원천 파일을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
let bad = 0, n = 0;
const ok = (c, m, d) => { n++; if (!c) { bad++; console.log('FAIL ' + m + (d === undefined ? '' : ' → ' + String(d).slice(0, 300))); } };

// ── 화면 쪽 덩어리(식전 영상 코드) — 머리 주석부터 renderSnap 앞까지
const a = my.indexOf('var PVC_ON='), b = my.indexOf('function renderSnap(p)');
if (a < 0 || b < 0 || b < a) { console.log('━━ prevideo-cat — mypage 의 식전 영상 코드를 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const blk = my.slice(a, b);
const keys = (src, re) => { const m = src.match(re); return m ? (m[1].match(/'([a-z0-9]+)'/g) || []).map((x) => x.slice(1, -1)) : null; };

console.log('━━ ① 화면 = 서버');
const svSty = keys(gs, /var PV_STYLES = \[([^\]]*)\]/), svSong = keys(gs, /var PV_SONGS = \[([^\]]*)\]/);
const clSty = (blk.match(/var PVC_STYLES=\[([\s\S]*?)\];/) || [, ''])[1].match(/k:'([a-z]+)'/g)?.map((x) => x.slice(3, -1));
const clSong = (blk.match(/var PVC_SONGS=\[([\s\S]*?)\];/) || [, ''])[1].match(/k:'([a-z0-9]+)'/g)?.map((x) => x.slice(3, -1));
ok(svSty && clSty && svSty.join() === clSty.join(), '분위기 다섯 — 같은 열쇠 · 같은 순서', (svSty || []).join() + ' / ' + (clSty || []).join());
ok(svSong && clSong && svSong.length === 12 && svSong.slice().sort().join() === clSong.slice().sort().join(), '곡 열둘 — 같은 열쇠', (svSong || []).join() + ' / ' + (clSong || []).join());
const up = gs.match(/var PV_UP = \{[^}]*min: (\d+), max: (\d+), first: (\d+), days: (\d+), today: (\d+)/);
const sec = (k) => +((blk.match(new RegExp("k:'" + k + "', n:'[^']*', max:(\\d+)")) || [])[1] || -1);
ok(!!up && +up[3] === sec('first') && +up[4] === sec('days') && +up[5] === sec('today'), '칸별 장수(처음 · 우리의 날들 · 오늘) 같다', up && up.slice(3).join() + ' / ' + [sec('first'), sec('days'), sec('today')].join());
ok(!!up && blk.indexOf('photos.length<' + up[1]) > -1 && blk.indexOf('사진은 ' + up[1] + '장부터') > -1, '«' + (up && up[1]) + '장부터» — 화면 검사 · 문구가 서버 min 과 같다');
ok(!!up && blk.indexOf('20-F.d.photos.length') > -1 && +up[2] === 20 && blk.indexOf('전체 20장까지') > -1, '«전체 20장까지» — 화면 = 서버 max');

console.log('━━ ② 길');
['pvSave', 'pvPhoto', 'pvThumbs'].forEach((x) => {
  ok(new RegExp("case '" + x + "':\\s*return jsonOut\\(handle" + x[0].toUpperCase() + x.slice(1) + '\\(body\\)\\)').test(cb), 'doPost 길 ' + x);
  ok(new RegExp("'" + x + "'").test((nt.match(/var ERR_AREA = \{[\s\S]*?\};/) || [''])[0]), 'ERR_AREA 에 ' + x + '(실패 코드 자리)');
  ok(new RegExp(x + ":'[A-Z]'").test(my), '마이페이지 ERR_ACT 에 ' + x);
});
ok(/var MP_FS_OVERLAYS=\[[^\]]*'mp_pvcOverlay'/.test(my), '겹화면 목록(MP_FS_OVERLAYS)에 mp_pvcOverlay — 빠지면 열린 채 뒤 화면이 스크롤된다');
ok(/var WIZ_ORDER=\[[^\]]*'pvc'/.test(my) && /\n  pvc:\{ on:function\(\)\{ return typeof PVCFLOW/.test(my), '저장 · 나가기 한 벌(WIZ_ADAPT · WIZ_ORDER)에 pvc');
ok(/\n    _pvRow,/.test(my) && my.indexOf("row('식전 영상'") > -1 && my.indexOf("$('mp_pvcStart')") > -1, '예식 준비 줄(_pvRow) · 단추 연결');
ok(/PVCFLOW\.active\)\) return;/.test(my), '스크롤 잠금 자가 치유(_mpLockReconcile)가 식전 영상 편집 중엔 손대지 않는다');
ok(/function purgeRitualFiles\(dry\) \{[^\n]*\n[^\n]*purgePrevideo_\(dry\)/.test(pr), '예식 6개월 뒤 지우기 — purgeRitualFiles 가 purgePrevideo_ 를 부른다');
ok(/prevideo: \(typeof _pvPublic === 'function'\)/.test(pr), 'buildProductionState 가 prevideo 를 싣는다');
ok(/keepDays: 183/.test(gs), '보관 183일(= 처리방침 «6개월 이내»)');

console.log('━━ ③ 처리방침');
const row = (priv.match(/id="prevideo"[\s\S]*?<span class="spec-val">([^<]*)/) || [, ''])[1];
ok(/올린 사진/.test(row) && /공유 링크/.test(row) && /동의한 경우에만/.test(row), '«식전 영상» 수집 줄(id=prevideo) — 사진 · 링크 · 선택 동의', row.slice(0, 80));
ok(/식전 영상 제작·상영/.test(priv), '이용 목적에 «식전 영상 제작·상영»');
ok(/식전 영상은 예식 후 <strong>6개월 이내<\/strong> 파기/.test(priv), '보관 «예식 후 6개월 이내 파기»');
const pvFrom = (gs.match(/from: '(\d{4}-\d{2}-\d{2})'/) || [])[1], top = (priv.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/) || []).slice(1, 4).join('-');
ok(!!pvFrom && !!top && top >= pvFrom, `서버 시행일(${pvFrom}) ≤ 처리방침 맨 위 개정 시행일(${top})`);
ok(blk.indexOf('privacy.html#prevideo') > -1, '동의 판의 처리방침 줄이 #prevideo 를 가리킨다');

console.log('━━ ④ 정직한 화면');
ok(blk.indexOf('알려 드려요') < 0, '«알려 드려요» 없음 — 알림은 1차에 없다');
['파일로 보내기', '인사 영상', '짧은 영상', '파일 고르기'].forEach((w) => ok(blk.replace(/\/\*[\s\S]*?\*\//g, '').indexOf(w) < 0, `1차에서 뺀 «${w}» — 화면 글에 없다`));
ok(blk.indexOf('이 화면에서 확인할 수 있어요') > -1, '«이 화면에서 확인할 수 있어요»');
ok(/var PVC_EX=\{\}/.test(blk) ? blk.indexOf('예시 영상을 만들고 있어요') > -1 : true, '예시 영상이 없으면 «예시 영상을 만들고 있어요»(그림을 예시라 부르지 않는다)');
ok((blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').match(/'[^'\n]*\u2014[^'\n]*'/g) || []).length === 0, '화면 글에 전각 줄표(—) 없음');

console.log('━━ ⑤ 서버 동작');
const { sandbox: G, errors } = loadGas();
if (errors.length) { console.log('━━ prevideo-cat — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
for (const fn of ['handlePvSave', 'handlePvPhoto', '_pvPublic', '_pvNorm_', '_pvSame_']) if (typeof G[fn] !== 'function') { console.log('━━ prevideo-cat — ' + fn + ' 이 없습니다 · 재지 못했습니다'); process.exit(2); }
const kst = new Date(Date.now() + 9 * 3600e3), ymd = (x) => new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) + x * 864e5).toISOString().slice(0, 10);
let store = {}, mails = [], WED = ymd(40);
const J = (o) => JSON.parse(JSON.stringify(o));
G._pvSheet_ = () => ({});
G._pvRow_ = (sh, code) => (store[code] ? { num: 2, d: J(store[code].d), m: J(store[code].m) } : null);
G._pvWrite_ = (sh, row, code, d, m) => { store[code] = { d: J(d), m: J(m) }; };
G._pvSess_ = () => ({ code: 'T1', cust: { get: (h) => (h === '예식일' ? WED : '') } });
G._pvFolder_ = (m) => { m.folder = 'FOLDER1'; return 'FOLDER1'; };
G._pvAdminMail_ = (c, line) => { mails.push(line); };
G._pvSeePreview_ = () => false;
G._recordHandler = () => {};
const save = (op, draft, extra) => G.handlePvSave(Object.assign({ token: 't', op, draft }, extra || {}));
const UP = (k) => Array.from({ length: k }, (_, i) => ({ id: 'P' + i, th: 'T' + i, sec: 'days', ts: 1 }));
const PH = (k) => Array.from({ length: k }, (_, i) => ({ id: 'P' + i, sec: 'days' }));
// 1 올린 적 없는 사진은 못 들어간다 · 저장 = 작성 중
store = { T1: { d: {}, m: { uploads: UP(2) } } };
let r = save('save', { mode: 'make', step: 1, style: 'editorial', photos: [{ id: 'P0', sec: 'days' }, { id: 'EVIL', sec: 'days' }, { id: 'P1', sec: 'nope' }] });
ok(r && r.ok && store.T1.m.st === 'draft' && store.T1.d.photos.length === 1 && store.T1.d.photos[0].id === 'P0', '올린 적 없는 사진 · 모르는 칸은 초안에 안 들어간다 · 저장 = 작성 중', JSON.stringify(store.T1.d.photos));
ok(r && r.pv && r.pv.st === 'draft' && r.pv.due === ymd(33), '돌려주는 상태 · 확정 기한 = 예식 7일 전', JSON.stringify(r && r.pv));
// 2 보내기 — 동의 · 5장 · 곡
store = { T1: { d: {}, m: { uploads: UP(6) } } };
r = save('submit', { mode: 'make', style: 'editorial', song: 'mujin', photos: PH(6) });
ok(r && r.ok === false && r.consent === false && !store.T1.m.st, '동의 없이 보내기 → 거절 · 아무것도 바꾸지 않음', JSON.stringify(r));
r = save('submit', { mode: 'make', style: 'editorial', song: 'mujin', photos: PH(4) }, { pvConsent: 1 });
ok(r && r.ok === false && /5장부터/.test(r.error || ''), '사진 4장 → «5장부터»', JSON.stringify(r));
mails = [];
r = save('submit', { mode: 'make', step: 2, style: 'editorial', song: 'mujin', photos: PH(6) }, { pvConsent: 1 });
ok(r && r.ok && store.T1.m.st === 'making' && store.T1.m.consent && store.T1.m.submit.n === 1 && mails.length === 1 && /FOLDER1/.test(mails[0]) && /미리보기/.test(mails[0]), '6장 · 곡 · 동의 → 만드는 중 · 동의 기록 · 관리자 메일(폴더 · «미리보기» 이름 규칙)', JSON.stringify(store.T1.m) + ' ' + mails[0]);
// 3 만드는 중 — 걸음만 바뀌면 그대로 · 내용이 바뀌면 작성 중 + 메일 [PV_SAME]
mails = [];
r = save('save', { mode: 'make', step: 0, style: 'editorial', song: 'mujin', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'making' && mails.length === 0, '[PV_SAME] 만드는 중에 화면만 옮겨 다니면(step) 그대로 «만드는 중» · 메일 없음', store.T1.m.st);
r = save('save', { mode: 'make', step: 2, style: 'editorial', song: 'oban', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'draft' && mails.length === 1, '보낸 뒤 곡을 바꾸면 «작성 중» · 관리자에게 한 줄', store.T1.m.st);
// 4 확정은 «확인 필요»에서만 · 확정 뒤 걸음만 = 확정 그대로 · 내용 = 수정 중
r = save('confirm', null);
ok(r && r.ok === false && /확정할 영상이 아직 없어요/.test(r.error || ''), '미리보기 없이 확정 → 거절', JSON.stringify(r));
store.T1.m.st = 'review'; store.T1.m.prev = { id: 'VID1', at: 'x' };
r = save('confirm', { mode: 'make', step: 3, style: 'editorial', song: 'oban', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'done' && store.T1.m.conf.prev === 'VID1' && r.pv.conf && /VID1\/preview$/.test(r.pv.conf.url || ''), '확인 필요 → 확정 · 확정본 보기 주소(conf.url)', JSON.stringify(r && r.pv));
r = save('save', { mode: 'make', step: 0, style: 'editorial', song: 'oban', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'done', '[PV_SAME] 확정 뒤 둘러보기만(step) → 그대로 «확정»', store.T1.m.st);
r = save('save', { mode: 'make', step: 0, style: 'retro', song: 'oban', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'editing', '확정 뒤 분위기를 바꾸면 «확정 · 수정 중»(확정본은 그대로)', store.T1.m.st);
r = save('save', { mode: 'make', step: 1, style: 'editorial', song: 'oban', photos: PH(6) });
ok(r && r.ok && store.T1.m.st === 'done', '되돌리면 다시 «확정»', store.T1.m.st);
// 5 준비한 영상 — 유튜브 거절 · 드라이브 받음
store = { T1: { d: {}, m: { consent: { at: 'x' } } } };
r = save('submit', { mode: 'upload', link: 'https://youtu.be/abc' });
ok(r && r.ok === false && /유튜브/.test(r.error || ''), '유튜브 링크 → 거절', JSON.stringify(r));
r = save('submit', { mode: 'upload', link: 'https://drive.google.com/file/d/x/view' });
ok(r && r.ok && store.T1.m.st === 'checking', '공유 링크 → 스튜디오 확인 중', store.T1.m.st);
// 6 기한 뒤 잠금 · 제때 보낸 미리보기 확정만 예외
WED = ymd(3);
store = { T1: { d: {}, m: {} } };
r = save('save', { mode: 'make', style: 'editorial' });
ok(r && r.ok === false && r.locked === true && !store.T1.m.st, '기한(예식 7일 전)이 지나면 저장 거절', JSON.stringify(r));
store = { T1: { d: { mode: 'make', step: 2, style: 'editorial', song: 'mujin', photos: [] }, m: { st: 'review', prev: { id: 'V2' }, submit: { day: ymd(-10) } } } };
r = save('confirm', null);
ok(r && r.ok && store.T1.m.st === 'done', '기한 전에 보낸 미리보기는 기한 뒤에도 확정할 수 있다', JSON.stringify(r));
store.T1.m = { st: 'review', prev: { id: 'V3' }, submit: { day: ymd(-1) } };
r = save('confirm', null);
ok(r && r.ok === false && r.locked, '기한 뒤에 보낸 것은 확정도 잠긴다', JSON.stringify(r));
// 7 사진 올리기 — 동의 · 칸 장수(드라이브 전에 멈춘다)
WED = ymd(40);
const dot = 'data:image/jpeg;base64,' + Buffer.from('xx').toString('base64');
store = { T1: { d: {}, m: {} } };
r = G.handlePvPhoto({ token: 't', sec: 'first', data: dot, thumb: dot });
ok(r && r.ok === false && r.consent === false, '첫 사진 — 동의 없이 → 거절', JSON.stringify(r));
store = { T1: { d: { photos: Array.from({ length: 4 }, (_, i) => ({ id: 'F' + i, sec: 'first' })) }, m: { consent: { at: 'x' }, uploads: [] } } };
r = G.handlePvPhoto({ token: 't', sec: 'first', data: dot, thumb: dot });
ok(r && r.ok === false && /4장까지/.test(r.error || ''), '«처음» 칸 4장이 차면 → 거절', JSON.stringify(r));
r = G.handlePvPhoto({ token: 't', sec: 'nope', data: dot, thumb: dot });
ok(r && r.ok === false, '모르는 칸 → 거절', JSON.stringify(r));

if (bad) { console.log(`━━ prevideo-cat — 빨강 ${bad}건 / ${n}`); process.exit(1); }
console.log(`━━ prevideo-cat OK — ${n}항목 · 화면 = 서버 · 길 · 처리방침 · 정직한 화면 · 서버 동작 [PV_CAT_1031]`);
process.exit(0);
