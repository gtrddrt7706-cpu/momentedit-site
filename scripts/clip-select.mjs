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
