// [NARR_PLAY_LOOP] 나레이션 청취 플레이 검사 (2026-10-10 사장님 «중복 없이 · 내가 또 체크하지 않게»)
// ① 한 번 들은 줄은 다음 플레이에 다시 없다(예시 · 갈래 포함) ② [지적 N] 은 장부에 있는 번호만
// ③ 장부의 «녹음 대기 · 사장님 확인» 줄은 숨지 않는다 — 몇 건인지 늘 찍는다
import fs from 'fs'; import path from 'path';
const D = 'docs/plans/식순연구', P = path.join(D, '플레이'), L = path.join(D, '지적장부_나레이션.md');
let bad = 0; const seen = new Map();
const ledger = fs.readFileSync(L, 'utf8'); const ids = new Set([...ledger.matchAll(/^\|\s*([\d-]+)\s*\|/gm)].map(m => m[1]));
if (!ids.size) { console.log('FAIL narr-play: 장부에서 지적 번호를 한 줄도 못 읽었다'); bad++; }
for (const f of fs.readdirSync(P).filter(f => /^플레이\d+\.txt$/.test(f)).sort()) {
  for (const l of fs.readFileSync(path.join(P, f), 'utf8').split('\n')) {
    const m = l.match(/^\d+:\d\d\s+(.*)$/); if (!m) continue;
    let t = m[1]; const tg = t.match(/^\[지적 ([\d-]+)\]\s*/);
    if (tg) { if (!ids.has(tg[1])) { console.log(`FAIL narr-play: ${f} [지적 ${tg[1]}] 이 장부에 없다`); bad++; } t = t.slice(tg[0].length); }
    t = t.trim(); if (seen.has(t)) { console.log(`FAIL narr-play: 중복 — ${f} 와 ${seen.get(t)} «${t.slice(0, 40)}»`); bad++; } else seen.set(t, f);
  }
}
const open = ledger.split('\n').filter(l => /^\|\s*[\d-]+\s*\|/.test(l) && /녹음 대기|사장님 확인/.test(l)).length;
console.log(bad ? `narr-play: 빨강 ${bad}` : `ok narr-play: 플레이 줄 ${seen.size}개 중복 0 · 장부 미결 ${open}건`);
process.exit(bad ? 1 : 0);
