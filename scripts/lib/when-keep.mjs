/* ★[WHEN_KEEP_MARKS 2026-10-10] _recorded.json «_언제» 를 새로 쓸 때 옛 줄의 [표식]을 이어 붙인다.
   merge-guard 가 이 줄의 표식(NAR_1007 등)을 chk 한다 — 녹음을 고치는 도구(assemble · sample-cut · build-chorus · 편지)가
   저마다 덮어써 가드가 «역전 의심»으로 붉었다(#1160 · 10/10 두 번). 쓰는 곳이 여럿이라 한 함수로 묶었다. */
export function keepWhen(oldWhen, now) {
  const m = String(oldWhen || '').match(/\[[A-Z][A-Z0-9_]{3,}\]/g) || [];
  return now + (m.length ? ` · 앞선 기록 ${[...new Set(m)].join(' ')}` : '');
}
