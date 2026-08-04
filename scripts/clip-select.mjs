// 클립 부분집합 고르기 (CLIP_SUBSET · 2026-08-04)
//
// 왜 파일이 따로인가 — 부분 재더빙은 두 걸음이다.
//   ① repatch-clip.mjs 가 「그 대목만」 붙여넣기 txt를 만들고
//   ② assemble-narration.mjs 가 「그 대목만」 받은 음원으로 다시 붙인다.
// 두 걸음이 고르는 클립이 한 개라도 다르면 개수가 어긋나 조립이 멈추거나,
// 더 나쁘게는 개수만 맞고 순서가 밀린다. 그러니 고르는 규칙은 한 곳에만 적는다.
// ★판별과 생성이 같은 자를 써야 한다.
//
// 규칙 — 쉼표로 여럿, 각 조각은 셋 중 하나로 맞는다:
//   정확한 파일명(entry-D) · 클립 id(G2-D) · 앞글자(entry- → entry-A..F)
//   ※ 'entry'는 배역 파트의 entry까지 함께 잡는다. 나레이션만 원하면 'entry-'.
export const selectClips = (clips, spec) => {
  const pats = String(spec || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!pats.length) return [];
  return clips.filter((c) => pats.some((p) => c.file === p || c.id === p || c.file.startsWith(p)));
};

// ── 문장 자리 고르기 (SENT_PATCH · 2026-08-04)
//
// 왜 클립 말고 문장인가 — 사용자 질문: *"문장중 신랑신부 입장 이 문장만 할수는 없는거야?"*
//   "신랑 신부, 입장!"은 entry-A..F **6클립 전부의 마지막 문장**이고 텍스트가 완전히 같다.
//   클립 단위로 다시 받으면 23문장을 다시 뽑아야 하지만, 자리만 짚으면 **1문장**이면 된다.
//   나머지 문장은 처음 받은 원본 wav를 그대로 쓰고, 그 한 자리만 갈아 끼워 다시 붙인다.
//   ★이미 만든 mp3를 잘라 붙이지 않는다 — 정규화·페이드가 걸린 결과물이라 다시 인코딩하면
//     소리가 상하고, 문장 경계를 무음탐지로 '추정'해야 한다. 추정한 자리는 언젠가 틀린다.
//
// ★구분자가 쉼표가 아니다 — 대사 안에 쉼표가 들어 있다("신랑 신부, 입장!").
//   여럿을 고를 때는 `|` 로 나눈다. (--clip 은 파일명이라 쉼표로 나눠도 안전하다)
//
// 규칙 — 똑같은 문장이 있으면 그것만. 없을 때만 부분 문자열로 찾는다.
//   ★정확 일치를 먼저 보는 이유: 짧은 문장을 부분 문자열로 찾으면 그 말이 들어간 **다른 문장**까지
//     함께 잡힌다. 잡힌 자리는 전부 갈아 끼워지므로, 넓게 잡히는 쪽이 조용히 더 위험하다.
export const selectSents = (clips, spec) => {
  const pats = String(spec || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!pats.length) return [];
  const flat = [];
  for (const c of clips) c.sents.forEach((s, i) => flat.push({ clip: c, i, text: s.text }));
  const hit = [];
  for (const p of pats) {
    const exact = flat.filter((x) => x.text === p);
    for (const x of (exact.length ? exact : flat.filter((x) => x.text.includes(p))))
      if (!hit.includes(x)) hit.push(x);
  }
  return hit.sort((a, b) => flat.indexOf(a) - flat.indexOf(b));
};
