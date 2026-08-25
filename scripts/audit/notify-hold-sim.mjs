/* ★[HOLD_NO_LOSS 2026-08-22 알림 전수점검] 밤사이 보류 큐 — **중간에 죽어도 남은 건이 살아남는가.**
   진짜 flushHeldNotifies 를 파일에서 떼어(사본 금지) 샌드박스에서 돌린다.
   종전 구조는 큐를 먼저 지우고 그 다음 보냈다 — 6분 한도·쿠터·예외로 끊기면 남은 건이 **영구 소실**됐고
   아무 기록도 안 남았다. 리마인더가 «보내기 전에 발송함 플래그»를 찍는 구조와 겹치면 영영 안 나간다.
   ★검사 셋: ①정상이면 큐가 빈다 ②중간에 죽으면 못 보낸 것이 큐에 남는다 ③실패한 건은 재시도로 남는다
   사용: node scripts/audit/notify-hold-sim.mjs */
import fs from 'node:fs';
const src=fs.readFileSync('/home/user/momentedit-site/automation/platform/95_notify.gs','utf8');
const i=src.indexOf('function flushHeldNotifies');
let d=0,j=src.indexOf('{',i),end=i;
for(let k=j;k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(d===0){end=k+1;break;}} }
const code=src.slice(i,end);

const run=(items, failAt, throwAt)=>{
  let store={ NOTIFY_HOLD: JSON.stringify(items) };
  const sent=[]; let n=0;
  const sandbox={
    Logger:{log:()=>{}},
    LockService:{ getScriptLock:()=>({ waitLock:()=>{}, releaseLock:()=>{} }) },
    PropertiesService:{ getScriptProperties:()=>({
      getProperty:(k)=>store[k]||null, setProperty:(k,v)=>{store[k]=v;}, deleteProperty:(k)=>{delete store[k];} }) },
    _notifyEnabled:()=>true,
    _nfAdminLineEmail:(t)=>sent.push('ADMIN:'+t.slice(0,40)),
    _kakaoSend:(to,e,c)=>{ n++; if(n===throwAt) throw new Error('6분 한도'); if(failAt&&failAt.includes(n)) return false; sent.push(c); return true; },
  };
  const fn=new Function(...Object.keys(sandbox), code+'; return flushHeldNotifies;')(...Object.values(sandbox));
  let crashed=false;
  try{ fn(); }catch(e){ crashed=true; }
  return { sent, crashed, 남은큐: JSON.parse(store.NOTIFY_HOLD||'[]').map(x=>x.c) };
};
const items=[{e:'ev',c:'A'},{e:'ev',c:'B'},{e:'ev',c:'C'},{e:'ev',c:'D'}];
let fail=0;
const ok=(c,m,d)=>{ console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+d}`); if(!c) fail++; };

const a=run(items);
ok(a.sent.length===4 && a.남은큐.length===0, '정상이면 전부 보내고 큐가 빈다', JSON.stringify(a));

const b=run(items,null,3);
ok(b.남은큐.length>0, '중간에 죽어도 못 보낸 건이 큐에 남는다 [HOLD_NO_LOSS]', JSON.stringify(b));
ok(!b.sent.includes('C') && b.남은큐.includes('C'), '죽은 그 건이 정확히 큐에 남는다', JSON.stringify(b));

const c=run(items,[2]);
ok(c.남은큐.includes('B'), '실패한 건은 큐에 남아 다음 아침에 재시도된다', JSON.stringify(c));
ok(c.sent.includes('C') && c.sent.includes('D'), '한 건 실패가 뒤 건을 막지 않는다', JSON.stringify(c));

console.log(`\n결과 — ${fail?('문제 '+fail+'건'):'문제 0건'}`);
process.exit(fail?1:0);
