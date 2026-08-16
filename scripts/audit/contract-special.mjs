// [CONTRACT_SPECIAL 2026-08-16] 계약서 특약 칸 — «있으면 서고, 없으면 아예 안 나오는지»를 실렌더로 본다.
//   왜 필요한가: 홈페이지가 「보정 +10장」을 약속하는데 계약서에 근거가 없어 증명이 안 되던 자리다.
//   ★빈 칸이 그려지면 「특약 없음」이 문서에 인쇄된다 — 그것도 사고다. 두 방향을 다 잰다.
import { spawn } from 'node:child_process';
import { launchBrowser } from '/home/user/momentedit-site/scripts/audit/_browser.mjs';
const eng=await launchBrowser(); if(!eng) process.exit(0);
const srv=spawn('python3',['-m','http.server','8211','--directory','/home/user/momentedit-site'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1400));
let bad=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+d}`); if(!c)bad++;};
try{
  const {page,errors}=await eng.newPage({port:8211});
  await page.goto('http://localhost:8211/contract/v1-1.html',{waitUntil:'load'});
  await new Promise(r=>setTimeout(r,700));
  const fill=(d)=>page.evaluate(async(dd)=>{
    window.postMessage({type:'momentedit:contractFill',data:dd},location.origin);
    await new Promise(r=>setTimeout(r,250));
    const b=document.getElementById('specialBox');
    return { hidden:b.hidden, txt:(b.innerText||'').replace(/\s+/g,' ').trim().slice(0,130),
      items:b.querySelectorAll('li').length, body:/특약사항/.test(document.body.innerText) };
  },d);
  const a=await fill({ total:2500000, weddingDate:'2026-10-26' });
  ok(a.hidden===true,'특약 없으면 칸이 안 나온다', 'hidden='+a.hidden);
  ok(a.body===false,'본문에도 「특약사항」 글자 없음');
  const b=await fill({ total:2500000, weddingDate:'2026-10-26',
    special:{ title:'Archive Opening Honor', period:'2027 상반기 한정',
      items:['보정 셀렉트 컷 10장에 더하여 10장을 추가로 제공한다(합계 20장). 추가 제공분의 보정 기준·전달 시기는 포함분과 같다.'] } });
  ok(b.hidden===false,'특약 있으면 칸이 선다');
  ok(b.items===1,`항목 ${b.items}개`);
  ok(/합계 20장/.test(b.txt),'원문이 그대로 찍힌다', b.txt.slice(0,70));
  const real=errors.filter(e=>!/favicon|net::ERR|404/.test(e));
  ok(real.length===0,'JS 오류 0',real[0]);
  await page.close(); await eng.close();
} finally { srv.kill(); }
console.log(bad?`실패 ${bad}건`:'전부 통과'); process.exit(bad?1:0);
