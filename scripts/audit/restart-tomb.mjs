// [RESTART_TX_TOMB 2026-10-03 · R3-01] «모두 비우기» 뒤 지운 글이 서버에서 되살아나지 않는가.
// 1) 진짜 서버 합치기 _ritualTxMerge 를 80_production.gs 에서 그대로 꺼내 돌린다(읽기만 · tx-merge.mjs 와 같은 꺼내기).
// 2) 진짜 화면 코드 opRestart 의 비우기 블록을 order-preview.html 에서 그대로 꺼내 돌린다.
// 3) 깨 보기 — 종전 비우기(S=_S0 통째)로 같은 길을 돌리면 지운 서약이 되살아나야 한다(검사가 살아 있는지).
globalThis._gsr_ = globalThis._gsr_ || function () {}; globalThis._trigIn_ = globalThis._trigIn_ || function () {};   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안(떼어 낸 함수가 전역에서 찾는다)
import fs from 'fs';
const gs = fs.readFileSync('automation/platform/80_production.gs', 'utf8');
const a = gs.indexOf('var TX_MERGE_LEG'), b = gs.indexOf('// 확인 해제 판정용 비교 문자열');
if (a < 0 || b < 0) { console.log('FAIL _ritualTxMerge 를 80_production.gs 에서 못 찾았다'); process.exit(1); }
const { _ritualTxMerge } = new Function(gs.slice(a, b) + ';return {_ritualTxMerge};')();

const html = fs.readFileSync('order-preview.html', 'utf8');
const s0m = html.match(/var S=(\{course:'open'[\s\S]*?\});/);
const _S0 = s0m ? JSON.stringify(new Function('return ' + s0m[1])()) : null;
const t0 = html.indexOf('[RESTART_TX_TOMB');
const bs = html.indexOf('var _now=Date.now(), _old=S, _fa={};', t0), be = html.indexOf('_opPrev=null;', bs);
if (!_S0 || t0 < 0 || bs < 0 || be < 0) { console.log('FAIL opRestart 비우기 블록([RESTART_TX_TOMB])을 order-preview.html 에서 못 찾았다'); process.exit(1); }
const block = html.slice(bs, be);
const restartNew = new Function('S', '_S0', '_hasUp', '_upKeep', block + ';return S;');
const restartOld = (S, _S0, _hasUp, _upKeep) => { S = JSON.parse(_S0); if (_hasUp) S.up = _upKeep; return S; };   // 종전 판(R3-01 이전)

let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok', m); };
const clone = o => JSON.parse(JSON.stringify(o));

function run(restart) {
  // 서버에 저장돼 있던 옛 판 — 신랑 서약 · 덕담 원고 · 체크 · 녹음
  const oldS = Object.assign(JSON.parse(_S0), {
    on: { vow: 1, bless: 1 },
    tx: { 'vow.g': '평생 곁에 있을게요', 'bless.p': '받은 덕담 원고' },
    mkc: { 'welcome.g': 'site' },
    up: { g0: { n: '녹음.m4a', id: 'drv1' } },
    fAt: { 'tx.vow.g': 1000, 'tx.bless.p': 1100, 'mkc.welcome.g': 1200, 'up.g0': 1300 },
  });
  const server = { _v: 3, S: clone(oldS), summary: {} };
  // 이 기기: «모두 비우기»
  const upKeep = clone(oldS.up);
  let S = restart(clone(oldS), _S0, true, upKeep);
  // 비운 뒤 순간을 다시 담고 첫인사 한 칸에 한 글자 — mkTx 와 같은 일(S.tx[id]=… · _fAt)
  S.on = { welcome: 1 };
  if (!S.tx) S.tx = {}; S.tx['welcome.g'] = '안'; if (!S.fAt) S.fAt = {}; S.fAt['tx.welcome.g'] = Date.now() + 5;
  return { r: _ritualTxMerge(server, { _v: 3, S, summary: {} }), S };
}

const { r, S } = run(restartNew);
ok(r && r.draft, '합치기가 돈다(fAt 가 비어 있지 않음)');
ok(r && r.draft.S.tx['vow.g'] === '', "지운 서약 S.tx['vow.g'] === '' (서버 값이 되살아나지 않는다)");
ok(r && r.draft.S.tx['bless.p'] === '', '지운 덕담 원고도 빈 값');
ok(r && r.draft.S.mkc['welcome.g'] === 0, '지운 체크는 0');
ok(r && r.draft.S.tx['welcome.g'] === '안', '비운 뒤 쓴 첫인사는 남는다');
ok(r && (!r.pull || (!('vow.g' in r.pull.tx) && !('bless.p' in r.pull.tx) && !('welcome.g' in r.pull.mkc))), 'pull 로 지운 칸이 돌아오지 않는다');
ok(r && r.pull === null, 'pull === null (서버가 돌려줄 것이 없다)');
ok(r && r.draft.S.up.g0 && r.draft.S.up.g0.id === 'drv1' && r.draft.S.fAt['up.g0'] === 1300, '녹음(S.up)은 남기고 그 시각도 옛 시각 그대로([RESTART_KEEP_REC])');
ok(S.vowText === '' && S.welcomeText === '', '옛 한 칸 글(vowText · welcomeText)도 빈 판');

// 깨 보기 — 종전 비우기는 되살아나야 한다(안 되살아나면 이 검사가 죽은 것)
const old = run(restartOld).r;
ok(old && old.draft.S.tx['vow.g'] === '평생 곁에 있을게요' && old.pull && old.pull.tx['vow.g'], '깨 보기: 종전 비우기는 지운 서약을 되살린다(검사가 살아 있음)');

process.exit(bad ? 1 : 0);
