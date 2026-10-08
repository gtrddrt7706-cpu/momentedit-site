globalThis._gsr_ = globalThis._gsr_ || function () {}; globalThis._trigIn_ = globalThis._trigIn_ || function () {};   // [GSR_GATE 2026-10-09] 공개 함수 첫 줄 문 — 이 흉내는 서버 길 안(떼어 낸 함수가 전역에서 찾는다)
import fs from 'fs';
const src=fs.readFileSync('automation/platform/80_production.gs','utf8');
const a=src.indexOf('var TX_MERGE_LEG'), b=src.indexOf('// 확인 해제 판정용 비교 문자열');
const f=new Function(src.slice(a,b)+';return {_ritualTxMerge,_txRest};')();
let bad=0; const ok=(c,m)=>{ if(!c){bad++;console.log('FAIL',m);} else console.log('ok',m); };
const base={_v:3,S:{course:'open',on:{vow:1},mk:{at:'vow',seen:{guest:1},drop:{}},tx:{},mkc:{},fAt:{}},summary:{count:5}};
const clone=o=>JSON.parse(JSON.stringify(o));
// 신랑 폰: vow.g 저장(서버)
const srv=clone(base); srv.S.tx['vow.g']='나는 약속'; srv.S.fAt['tx.vow.g']=1000; srv.S.mk.at='guest';
// 신부 폰: vow.b 만 고침(서버본 모름)
const inc=clone(base); inc.S.tx['vow.b']='나도 약속'; inc.S.fAt['tx.vow.b']=2000; inc.S.mk.at='vow'; inc.summary={count:5,x:1};
let r=f._ritualTxMerge(srv,inc);
ok(r.sameRest,'글만 다르면 충돌 아님');
ok(r.draft.S.tx['vow.g']==='나는 약속'&&r.draft.S.tx['vow.b']==='나도 약속','두 칸 합침');
ok(r.draft.S.vowText==='신랑 · 나는 약속\n\n신부 · 나도 약속','옛 한 칸 재구성');
ok(r.pull&&r.pull.tx['vow.g']==='나는 약속'&&r.pull.fAt['tx.vow.g']===1000,'pull 에 신랑 칸');
ok(r.draft.S.fAt['tx.vow.g']===1000&&r.draft.S.fAt['tx.vow.b']===2000,'시각 합침');
// 같은 칸 — 더 나중이 이긴다
const inc2=clone(base); inc2.S.tx['vow.g']='옛 글'; inc2.S.fAt['tx.vow.g']=500;
r=f._ritualTxMerge(srv,inc2); ok(r.draft.S.tx['vow.g']==='나는 약속','같은 칸: 서버가 더 나중이면 서버');
const inc3=clone(base); inc3.S.tx['vow.g']='새 글'; inc3.S.fAt['tx.vow.g']=3000;
r=f._ritualTxMerge(srv,inc3); ok(r.draft.S.tx['vow.g']==='새 글'&&!r.pull,'같은 칸: 새 쪽이 더 나중이면 새 글 · pull 없음');
// 체크 풀기(0) 가 서버의 1 을 이긴다
const s4=clone(base); s4.S.mkc['vow.g']=1; s4.S.fAt['mkc.vow.g']=100;
const i4=clone(base); i4.S.mkc['vow.g']=0; i4.S.fAt['mkc.vow.g']=200;
r=f._ritualTxMerge(s4,i4); ok(r.draft.S.mkc['vow.g']===0,'체크 풀기 유지');
// 칩이 다르면 sameRest false
const i5=clone(inc); i5.S.on.ring=1; r=f._ritualTxMerge(srv,i5); ok(!r.sameRest,'고른 순간이 다르면 충돌 유지');
// 빈 S(처음부터 다시) → 합치지 않음
ok(f._ritualTxMerge(srv,{_v:3,S:{},summary:{}})===null,'비우기는 합치지 않는다');
// 옛 빌더(fAt 없음) → null
const i7=clone(base); delete i7.S.fAt; ok(f._ritualTxMerge(srv,i7)===null,'옛 빌더는 종전 동작');
// 키 순서만 다른 것은 같은 것
const i8={_v:3,summary:{},S:{mk:{drop:{},seen:{},at:'x'},on:{vow:1},course:'open',tx:{'vow.b':'a'},fAt:{'tx.vow.b':5},mkc:{}}};
r=f._ritualTxMerge(srv,i8); ok(r.sameRest,'키 순서 무관');
// [RITUAL_FILE] 올린 녹음 표시(S.up)도 칸마다 — 신랑 폰이 g0 을, 신부 폰이 g1 을 올려도 둘 다 남는다
const s9=clone(base); s9.S.up={g0:{n:'a.m4a'}}; s9.S.fAt['up.g0']=100;
const i9=clone(base); i9.S.up={g1:{n:'b.m4a'}}; i9.S.fAt['up.g1']=200;
r=f._ritualTxMerge(s9,i9); ok(r.sameRest&&r.draft.S.up.g0.n==='a.m4a'&&r.draft.S.up.g1.n==='b.m4a'&&r.pull&&r.pull.up.g0,'녹음 표시 칸별 합치기 · pull');
process.exit(bad?1:0);
