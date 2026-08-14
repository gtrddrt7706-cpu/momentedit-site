/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 첫인사 기본 ON · 카드 라벨 = 다듬기 분 수 [WELCOME_DEFAULT]
   2026-08-14 사용자 결정 "세 코스 전부 ON". seq 에 넣는 것만으로 켜지는 이유는 isGAdd 가 seq 를 먼저 보기 때문 —
   그 함수를 고치면 여기가 조용히 꺼진다. 카드 라벨과 다듬기 분 수를 함께 재는 이유는 기록 코스가
   실제로 1분 어긋나 있었기 때문(반지 기본 빼기를 카드가 몰랐다). */
// 첫인사 기본 ON + 카드 라벨 vs 다듬기 화면 분 수 대조 (코스마다 새 판 — 코스 전환은 확인 판을 거쳐야 해서)
import { openProbe } from './audit/page-probe.mjs';
const out = [];
for (const c of ['record','damback','family']) {
  const h = await openProbe('order-preview.html?embed=1', { width: 390, settle: 1800 });
  try {
    out.push(await h.page.evaluate(async (c) => {
      const w=(ms)=>new Promise(s=>setTimeout(s,ms));
      const card = (COURSES[c]||{}).min || '';               // 코스 카드에 적힌 라벨(원천 min)
      startCourse(c); await w(350);
      let g=0; while(STEPS[idx].k!=='tune' && g++<12) idx++; render(); await w(250);
      const seq=curSeq();
      return {c, course:S.course, on:seq.indexOf('welcome')>=0, afterEntry:seq[seq.indexOf('entry')+1]==='welcome',
              est:estMin(), card, ring:S.ring, seq:seq.join('>')};
    }, c));
  } finally { await h.close(); }
}
let bad=0;
for(const x of out){
  const ok = x.course===x.c && x.on && x.afterEntry && x.card===x.est;   // 카드 라벨과 다듬기 화면이 같은 분을 말해야 한다
  console.log(`  ${ok?'·':'✖'} ${x.c}: 코스=${x.course} 켜짐=${x.on} 입장직후=${x.afterEntry} · 카드 ${x.card} / 다듬기 ${x.est} (반지 ${x.ring})`);
  console.log(`      ${x.seq}`);
  if(!ok) bad++;
}
console.log(bad?`틀림 ${bad}건`:'첫인사 기본 ON 통과');
process.exit(bad?1:0);
