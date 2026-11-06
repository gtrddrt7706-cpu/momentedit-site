#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
const R=require(path.join(root,'assets/ritual-open.js'));
const C=require(path.join(root,'assets/ritual-cue.js'));
const html=fs.readFileSync(path.join(root,'order-preview.html'),'utf8');
const handler=html.match(/^window\.mkPvNarEx=function\(n\)\{[^\n]+/m)?.[0];
assert.ok(handler,'소개 멘트 선택 핸들러');
const names=R.NAR.pvExNames;
const expected=[R.NAR.prevideoIn,...R.NAR.pvEx];
assert.equal(names.length,4);
assert.equal(expected.length,4);
function run(code){
  const S={course:'open',on:{guest:1,prevideo:1,entry:1,matjeol:1},entry:'A',pvVoice:'nar',keep:'same'};
  let writes=0,renders=0;
  const ctx=vm.createContext({window:{},RitualOpen:R,S,PV_EX:[['담백하게','예시1'],['다정하게','예시2']],
    _stopMk(){},_lpHush(){},buildSteps(){},_persist(){writes++;},render(){renders++;}});
  vm.runInContext(code,ctx);
  const rows=[];
  for(const n of [0,1,2,3,0]){
    const before=writes;ctx.window.mkPvNarEx(n);
    const cue=C.build(S).cues.find(c=>c.k==='prevideo'&&/^narr-prevideo-in(?:-ex\d+)?$/.test(c.slug));
    rows.push({n,selected:+S.pvEx||0,text:cue?.text,wrote:writes===before+1});
  }
  const before=JSON.stringify(S),w=writes,r=renders;
  ctx.window.mkPvNarEx(4);ctx.window.mkPvNarEx(-1);
  assert.equal(JSON.stringify(S),before,'범위 밖 입력은 무시');
  assert.equal(writes,w);assert.equal(renders,r);
  assert.equal(S.keep,'same');assert.equal(S.pvVoice,'nar');
  assert.equal(Object.hasOwn(S,'pvEx'),false,'기본 예시로 복귀');
  return rows;
}
const rows=run(handler);
for(const r of rows){assert.equal(r.selected,r.n,names[r.n]);assert.equal(r.text,expected[r.n],names[r.n]+' 큐 문장');assert.ok(r.wrote);console.log('ok '+names[r.n]+' · 선택값/실제 큐 문장 일치');}
assert.equal(new Set(rows.slice(0,4).map(r=>r.text)).size,4);
// 실제 원래 결함을 되살려 검사 민감도를 확인한다.
const old=handler.replace(/var _nm=\(RitualOpen\.NAR&&RitualOpen\.NAR\.pvExNames\)\|\|PV_EX; n=\+n\|\|0; if\(!_nm\[n\]\) return;/,'if(!PV_EX[n]) return;');
assert.notEqual(old,handler,'원래 가드를 재현할 수 있어야 함');
const fails=run(old).filter(r=>r.selected!==r.n||r.text!==expected[r.n]||!r.wrote);
assert.deepEqual(fails.map(r=>r.n),[2,3],'원래 결함은 잔잔하게·격식 있게에서 검출');
console.log('ok 원래 결함 검출 · 잔잔하게/격식 있게');
