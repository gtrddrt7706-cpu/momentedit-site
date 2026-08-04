// 타입캐스트 핸드오프 무결성 검사 [TC_HANDOFF_GUARD]
//   사용: node scripts/check-typecast-handoff.mjs   (merge-guard.sh가 매번 돌린다)
//
// ★왜 따로 검사하나
//   핸드오프는 사람 손을 두 번 탄다 — ①타입캐스트 화면에 붙여넣기 ②받은 음원을 넘겨주기.
//   그 두 자리를 2026-08-02에 코드로 없앴는데(VOICE_PROBE · PART_AUTOMATCH), 두 자동화 모두
//   **디스크에 있는 파일과 manifest.json이 서로 맞다**는 것을 전제로 돈다.
//   전제가 조용히 깨지는 경로가 실제로 있다:
//     · 누가 0_보이스확인.txt 를 손으로 고친다 → 프로브가 엉뚱한 이름을 확인하고 통과시킨다
//     · 빌더를 고쳐 파트 문장 수가 바뀌었는데 txt만 다시 뽑고 manifest는 낡은 채로 남는다
//       → 조립기가 개수로 파트를 못 짚어 "1개짜리 파트가 없습니다"로 전부 거절한다
//     · 두 파트의 문장 수가 우연히 같아진다 → 개수로 후보를 못 좁혀 상관계수 하나에 전부 걸린다
//   전부 **음원을 다 받은 뒤에야** 드러나는 고장이다. 그때는 크레딧이 이미 나갔다.
//   그래서 붙여넣기 전에, 저장소 상태만 보고 잡을 수 있는 것은 여기서 전부 잡는다.
//
// ★이 검사가 하드 실패로 잡는 것
//   1. manifest.probe 소실 / 프로브 파일 소실
//   2. 프로브 줄 수 ≠ 자리 수 · 줄 머리 이름이 배정과 어긋남 · 이름 중복
//   3. 프로브 대사가 그 역할의 실제 대본에 없는 문장(손으로 지어낸 텍스트)
//   4. 프로브가 manifest.parts 에 섞임 (조립기가 파트로 착각한다)
//   5. 파트 txt 실제 줄 수 ≠ manifest 의 sents (PART_AUTOMATCH가 세는 바로 그 수)
//   6. manifest 의 sents ≠ 그 파트 클립 문장 수 합 (조립기 needOf 와 어긋남)
//   7. 파트별 문장 수 중복 — PART_AUTOMATCH의 전제가 깨진다
//      ※정당하게 같아졌다면 이 검사를 같은 커밋에서 고칠 것. 그냥 지우지 말고,
//        조립기가 그 두 파트를 상관계수만으로 가를 수 있는지부터 확인할 것.

import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(root, 'docs/plans/식순연구/타입캐스트');
const MF = path.join(DIR, 'manifest.json');

let fail = 0;
const ok = (m) => console.log(`ok ${m}`);
const bad = (m) => { console.log(`REVERT? ${m}`); fail = 1; };

if (!fs.existsSync(MF)) { bad(`타입캐스트/manifest.json 이 없습니다 — 조립기가 읽을 매핑이 통째로 사라졌습니다`); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MF, 'utf8'));

// ── 1~4. VOICE_PROBE — 붙여넣기 전에 여덟 자리를 확인하는 파일
if (!man.probe) {
  bad(`manifest.json: probe 항목이 없습니다 — 빌드에서 VOICE_PROBE가 빠졌습니다(붙여넣기 전 자리 확인 수단 소실)`);
} else {
  const pf = path.join(DIR, man.probe.file);
  if (!fs.existsSync(pf)) {
    bad(`${man.probe.file} 이 없습니다 — manifest는 있다고 하는데 파일이 없습니다`);
  } else {
    const lines = fs.readFileSync(pf, 'utf8').split('\n').filter((l) => l.trim());
    const roles = man.probe.roles;
    if (lines.length !== roles.length) {
      bad(`${man.probe.file}: ${lines.length}줄인데 확인할 자리는 ${roles.length}개입니다 — 빠진 자리는 붙여넣은 뒤에야 틀린 걸 압니다`);
    } else {
      // 줄 머리 이름이 배정과 같은가 (손으로 고친 프로브를 잡는다)
      const off = roles.map((r, i) => ({ r, i })).filter(({ r, i }) => !lines[i].startsWith(`${r.name}:`));
      if (off.length) bad(`${man.probe.file}: 줄 머리 이름이 배정과 다릅니다 — ${off.map(({ r, i }) => `${i + 1}줄 ${r.role}=${r.name}`).join(' · ')}`);
      // 대사가 그 역할의 실제 대본에 있는 문장인가 (지어낸 텍스트를 잡는다)
      const strayText = [];
      roles.forEach((r, i) => {
        const pool = new Set(man.clips.filter((c) => c.role === r.role).flatMap((c) => c.sents.map((s) => s.text)));
        const t = lines[i].slice(lines[i].indexOf(':') + 1).trim();
        if (!pool.has(t)) strayText.push(`${r.role}(${r.name})`);
      });
      if (strayText.length) bad(`${man.probe.file}: 대본에 없는 대사가 있습니다 — ${strayText.join(' · ')}. 손으로 고치지 말고 빌더로 다시 뽑으세요`);
      if (!off.length && !strayText.length) ok(`보이스 프로브 ${roles.length}자리 — 이름·대사 모두 대본과 일치`);
    }
    const names = roles.map((r) => r.name);
    if (new Set(names).size !== names.length) bad(`${man.probe.file}: 같은 이름이 두 번 나옵니다 — 한 화자로 합쳐져 자리 확인이 안 됩니다`);
  }
  if (man.parts.some((p) => p.file === man.probe.file)) {
    bad(`manifest.json: 프로브(${man.probe.file})가 parts에 섞였습니다 — 조립기가 파트로 착각해 음원을 찾습니다`);
  } else ok(`프로브가 parts와 분리됨 — 조립기가 파트로 세지 않습니다`);
}

// ── 5~6. 파트 문장 수 — PART_AUTOMATCH가 파트를 짚는 바로 그 수
for (const p of man.parts) {
  const f = path.join(DIR, p.file);
  if (!fs.existsSync(f)) { bad(`${p.file} 이 없습니다 — 붙여넣을 파일이 사라졌습니다`); continue; }
  const real = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).length;
  // ★[VOW_CHORUS 2026-08-04] 합성 클립(mix)은 붙여넣기 파일에도, 조립기에도 없다 — 세는 데서도 뺀다.
  //   26_vow-both 는 24·25 mp3 를 겹쳐 만드는 결과물이라 타입캐스트에서 받을 소리가 없다.
  //   ★대장(manifest)에는 남긴다 — 재생 표와 대조 검사가 26 을 찾아야 하기 때문이다.
  //     '세는 자'와 '만드는 자'가 같은 규칙을 쓰게 여기서도 c.mix 를 뺀다(assemble-narration.mjs 와 짝).
  const fromClips = man.clips.filter((c) => c.part === p.file && !c.mix).reduce((a, c) => a + c.sents.length, 0);
  if (real !== p.sents) bad(`${p.file}: 파일은 ${real}줄인데 manifest는 ${p.sents}문장이라고 합니다 — 조립기가 개수로 파트를 못 짚습니다`);
  else if (fromClips !== p.sents) bad(`${p.file}: manifest 안에서 어긋납니다 — parts.sents ${p.sents} ≠ clips 합 ${fromClips}. 조립기는 clips 합(needOf)으로 셉니다`);
  else ok(`${p.file} ${p.sents}문장 — 파일·parts·clips 삼자 일치`);
}

// ── 7. 개수가 파트마다 달라야 PART_AUTOMATCH가 성립한다
{
  const seen = new Map();
  for (const p of man.parts) (seen.get(p.sents) || seen.set(p.sents, []).get(p.sents)).push(p.file);
  const dup = [...seen.entries()].filter(([, v]) => v.length > 1);
  if (dup.length) {
    bad(`파트 문장 수가 겹칩니다 — ${dup.map(([n, v]) => `${n}개: ${v.join(' , ')}`).join(' / ')}`);
    console.log(`       PART_AUTOMATCH는 개수로 후보를 좁힌 뒤 길이 상관으로 확정합니다. 개수가 겹치면 상관계수 하나에 전부 걸립니다.`);
    console.log(`       정당한 변경이면 두 파트가 상관만으로 갈리는지 확인한 뒤 이 검사를 같은 커밋에서 고치세요.`);
  } else ok(`파트 문장 수 전부 다름(${man.parts.map((p) => p.sents).join(' · ')}) — 개수만으로 파트가 갈립니다`);
}

if (fail) { console.log(`\n✗ 타입캐스트 핸드오프에 어긋난 곳이 있습니다 — 붙여넣기 전에 고치세요.`); process.exit(1); }
console.log(`\n✓ 타입캐스트 핸드오프 정상 — 붙여넣기·되받기 자동화가 기대는 전제가 전부 성립합니다.`);
