/* ★[COPY_RULE 2026-08-26 사용자 지시 "한번더 병렬로 시뮬레이션 디테일점검"]
   고객 노출 문구 규칙 전수(정적) — 전각 줄표 금지 · 장식 이모지 금지 · 시간 약속 금지 · 근거 없는 안심 금지.

   ── 왜 렌더 검사만으로는 부족한가
   렌더 검사는 «그 상태에서 보이는 것»만 본다. 아직 아무도 밟아 보지 않은 분기의 문구는
   화면에 뜬 적이 없어 영영 안 걸린다. 그래서 소스에 박힌 문장을 통째로 훑는다.
   둘은 서로를 메운다 — 렌더는 «조합»을 보고, 이것은 «전수»를 본다.

   ── 자를 두 번 좁혔다 (첫 판 붉음 4건 중 진짜는 1건이었다)
   ·✓ ✕ ❌ 같은 기호는 장식이 아니라 상태를 읽게 하는 것 — 규칙이 막는 것은 장식이지 기호가 아니다.
   ·Logger·관리자 메일·이벤트 표의 desc 는 «고객이 보는 말»이 아니다. 관리자 메일은 _noEmoji 가
     이모지를 자동으로 걷어내기까지 한다. 그걸 함께 붉히면 소음에 진짜 한 건이 묻힌다.
   → .gs 는 고객 문장이 사는 두 구역만 본다(_nfCustomerMsg · nextActionFor).
   ★구역을 «찾았는지»를 먼저 확인한다 — 못 찾으면 0건이 나오고, 그 0건은 «깨끗»이 아니라 «못 잼»이다.
     실제로 첫 배선에서 구역 끝 표시가 시작점을 다시 잡아 0자가 됐고, 그 확인 줄이 그것을 잡았다.

   사용: node scripts/audit/copy-rule.mjs
*/
import fs from 'node:fs';
const F=['mypage.html','guide.html','seat.html','live.html','index.html','inquiry.html','schedule.html','order-preview.html','parents.html','privacy.html','cancel.html'];
let fail=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||d===undefined?'':' — '+String(d).slice(0,220)}`); if(!c)fail++;};
/* 화면에 실제로 나가는 문자열만 추린다 — 주석·코드는 뺀다(주석의 줄표는 규칙 대상이 아니다) */
function customerStrings(src){
  let s=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/[^\n]*/g,'$1');   // 주석 제거
  const out=[];
  /* ★[내부 문자열 제외] Logger·이벤트 표의 desc·진단 출력은 «고객이 보는 말»이 아니다.
     여기서 걸면 규칙과 무관한 붉음이 계속 나고, 그 소음에 진짜 한 건이 묻힌다(첫 판이 그랬다). */
  s=s.replace(/Logger\.log\([\s\S]{0,400}?\);/g,'').replace(/desc:\s*'[^']*'/g,'');
  const re=/'([^'\\\n]{6,240})'|"([^"\\\n]{6,240})"/g; let m;
  while((m=re.exec(s))){ const v=m[1]||m[2]||'';
    if(!/[가-힣]/.test(v)) continue;                       // 한글이 없으면 화면 문구가 아니다
    if(/^[a-z_]+$/i.test(v)) continue;
    out.push(v); }
  return out;
}
console.log('\n═══ 고객 화면 소스 문구 전수 ═══');
let dash=[], emoji=[], promise=[], vague=[];
/* 허용 목록 — 감정 정점 1곳(🤍) · 기능 아이콘(🍽🍃🔊🎵) · 상태 신호(✓ ⚠ ★ 🔴 🟡 ❌).
   ★✓·❌ 는 «장식»이 아니라 상태를 읽게 하는 기호다. 규칙이 막는 것은 장식이지 기호가 아니다. */
const EMOJI_OK=/🤍|🍽|🍃|🔊|🎵|⚠|★|🔴|🟡|✓|✔|✕|✖|❌|✅|›|»/;
for(const f of F){
  let src=''; try{ src=fs.readFileSync('/home/user/momentedit-site/'+f,'utf8'); }catch(e){ continue; }
  for(const v of customerStrings(src)){
    if(v.indexOf('—')>=0) dash.push(f+' :: '+v);
    const e=v.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
    if(e && !e.every(x=>EMOJI_OK.test(x))) emoji.push(f+' :: '+v);
    if(/\d+\s*(분|초)\s*(이면|만에|안에)\s*(완성|끝|가능)/.test(v)) promise.push(f+' :: '+v);
    if(/통째로 빼셔도|저희가 다 채워|무엇이든 다 해|전부 알아서/.test(v)) vague.push(f+' :: '+v);
  }
}
ok(dash.length===0,'전각 줄표(—) 없음',dash.slice(0,3).join(' | '));
ok(emoji.length===0,'허용 밖 장식 이모지 없음',emoji.slice(0,3).join(' | '));
ok(promise.length===0,'가벼운 시간 약속 없음(«3분이면 완성» 류)',promise.slice(0,3).join(' | '));
ok(vague.length===0,'근거 없는 포괄 안심 없음',vague.slice(0,3).join(' | '));

console.log('\n═══ 서버가 «고객에게» 보내는 문구(.gs) ═══');
/* ★[대상 좁히기] .gs 전체를 훑으면 Logger·관리자 메일·이벤트 설명이 함께 걸린다.
   그 셋은 규칙 대상이 아니고(관리자 메일은 _noEmoji 가 이모지를 자동으로 걷어낸다),
   그 소음에 진짜 한 건이 묻힌다 — 첫 판이 정확히 그랬다(붉음 4건 중 진짜는 1건).
   고객 문장이 사는 곳은 둘뿐이다: 알림 문구(_nfCustomerMsg)와 «지금 할 일»(nextActionFor). */
{
  const pick = (file, from, to) => {
    let src=''; try{ src=fs.readFileSync('/home/user/momentedit-site/'+file,'utf8'); }catch(e){ return ''; }
    const i=src.indexOf(from); if(i<0) return '';
    /* ★끝 표시는 «시작점 다음»부터 찾는다 — 그냥 indexOf(to,i) 하면 시작 자신을 다시 잡아
       구역이 0자가 되고, 검사는 «훑었다»면서 아무것도 안 본다(사문). 그 사문을 위 ok 가 잡았다. */
    const j=to?src.indexOf(to,i+from.length):-1; return src.slice(i, j>0?j:src.length);
  };
  const zones=[
    ['95_notify · 고객 알림 문구', pick('automation/platform/95_notify.gs','function _nfCustomerMsg','function _nfAdmin')],
    ['00_config · 지금 할 일',     pick('automation/platform/00_platform-config.gs','function nextActionFor','function ')],
  ];
  let gd=[], ge=[], n=0;
  for(const [nm,src] of zones){
    ok(!!src, nm+' · 구역을 찾았다(못 찾으면 검사가 사문이 된다)', String(src.length));
    for(const v of customerStrings(src)){ n++;
      if(v.indexOf('—')>=0) gd.push(nm+' :: '+v);
      const e=v.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
      if(e && !e.every(x=>EMOJI_OK.test(x))) ge.push(nm+' :: '+v);
    }
  }
  ok(n>20,'고객 문장을 실제로 훑었다(0건이면 «못 잼»이지 «깨끗»이 아니다)',String(n));
  ok(gd.length===0,'고객 알림·안내 문구에 전각 줄표 없음',gd.slice(0,3).join(' | '));
  ok(ge.length===0,'고객 알림·안내 문구에 허용 밖 이모지 없음',ge.slice(0,3).join(' | '));
}
console.log(`\n결과 — ${fail?'발견 '+fail+'건':'발견 0건'}`);
process.exit(fail?1:0);
