// 배선된 클립의 음원이 실제로 있는가 [CAST_AUDIO_GUARD 2026-08-04]
//   사용: node scripts/check-cast-audio.mjs        (merge-guard.sh 가 매번 돌린다)
//        node scripts/check-cast-audio.mjs --list  (있는 것까지 전부 나열)
//
// ★왜 이 검사를 만들었나
//   ritual-story.js 의 CAST 에 적힌 클립은 미리듣기가 **실제로 재생하려 드는 파일**이다.
//   배선은 됐는데 mp3 가 없으면 재생기는 그 항목을 건너뛴다 — 예전엔 아무 말 없이 넘어갔다.
//   그러면 고객은 짧아진 재생을 듣고 "이 대목은 원래 이런가 보다"로 읽는다.
//   폴백이 조용하면 버그가 기능처럼 보인다. 화면 쪽은 order-preview 의 [CAST_SILENT] 가 막았고,
//   여기서는 **푸시 전에** 같은 사실을 저장소 상태만으로 잡는다.
//
// ★'아직 안 받은 클립'은 어떻게 다루나 — 명단을 여기 한 곳에만 적는다
//   더빙은 사람이 타입캐스트에서 받아 오는 일이라, 배선이 먼저고 음원이 나중인 기간이 반드시 생긴다.
//   그 기간을 '정상'으로 두면 검사가 무의미해지고, '실패'로 두면 그동안 아무것도 못 푸시한다.
//   그래서 **예정된 결원만 아래 PENDING 에 적고, 명단에 없는 결원은 하드 실패**로 잡는다.
//   ★음원을 받아 넣는 커밋에서 그 id 를 PENDING 에서 지운다. 안 지우면 아래 '이미 있는데 명단에 남음'
//     으로 걸려 실패한다 — 명단이 낡은 채로 남는 길을 닫아 뒀다.
//   ★명단을 늘려서 통과시키지 말 것. 늘리는 순간 그 클립은 무음이어도 아무도 모르게 된다.

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
const DIR = 'assets/audio/cast';
const LIST = process.argv.includes('--list');

// ── 아직 타입캐스트에서 받지 않은 클립. 받으면 같은 커밋에서 지운다.
const PENDING = {
  '18_entry-A': '입장 재더빙 대기 — 화면 글자와 맞추려고 다시 받는 중',
  '19_entry-B': '입장 재더빙 대기',
  '20_entry-C': '입장 재더빙 대기',
  '21_entry-D': '입장 재더빙 대기',
  '22_entry-E': '입장 재더빙 대기',
  '23_entry-F': '입장 재더빙 대기',
  '24_vow-both-1': '서약 합창 재료(신랑) — 재더빙 대기',
  '25_vow-both-2': '서약 합창 재료(신부) — 재더빙 대기',
  '26_vow-both': '서약 합창 결과물 — 24·25 를 받은 뒤 node scripts/build-chorus.mjs 로 만든다',
};

let fail = 0;
const ok = (m) => console.log(`ok ${m}`);
const bad = (m) => { console.log(`REVERT? ${m}`); fail = 1; };

const ids = Object.keys(ST.CAST || {});
if (!ids.length) { bad(`ritual-story.js 의 CAST 가 비었습니다 — 배역 클립 배선이 통째로 사라졌습니다`); process.exit(1); }

const have = [], gone = [];
for (const id of ids) {
  (fs.existsSync(path.join(ROOT, DIR, `${id}.mp3`)) ? have : gone).push(id);
}

// ① 명단에 없는 결원 = 하드 실패
const stray = gone.filter((id) => !PENDING[id]);
if (stray.length) {
  bad(`배선됐는데 음원이 없습니다(${stray.length}개) — 미리듣기가 그 대목을 건너뜁니다`);
  stray.forEach((id) => console.log(`       · ${DIR}/${id}.mp3`));
  console.log(`       받아 넣거나, 정말 나중에 받을 거면 이 파일 PENDING 에 이유와 함께 적으세요.`);
}

// ② 명단에 있는데 파일이 이미 있다 = 명단이 낡았다
const stale = have.filter((id) => PENDING[id]);
if (stale.length) {
  bad(`PENDING 명단이 낡았습니다(${stale.length}개) — 음원이 이미 있는데 '아직 없음'으로 적혀 있습니다`);
  stale.forEach((id) => console.log(`       · ${id} — check-cast-audio.mjs 의 PENDING 에서 지우세요`));
}

// ③ 명단에 적혔지만 CAST 에 없는 id = 배선이 사라졌는데 명단만 남았다
const orphan = Object.keys(PENDING).filter((id) => !ids.includes(id));
if (orphan.length) bad(`PENDING 에 CAST 에 없는 id 가 있습니다 — ${orphan.join(' · ')}. 배선이 사라졌으면 명단에서도 지우세요`);

if (!stray.length && !stale.length && !orphan.length) {
  ok(`배역 음원 ${have.length}/${ids.length}개 있음 · 예정된 결원 ${gone.length}개(전부 PENDING 명단과 일치)`);
}

// ── 아직 없는 것은 통과하더라도 **매번 눈에 보이게** 적는다. 잊고 넘어가는 길을 닫는다.
if (gone.length) {
  console.log(`\n[CAST_AUDIO] 아직 없는 음원 ${gone.length}개 — 지금 이 대목들은 미리듣기에서 건너뜁니다`);
  gone.forEach((id) => console.log(`  · ${id}  ${PENDING[id] || '(명단에 없음)'}`));
}
if (LIST) { console.log(`\n[CAST_AUDIO] 있는 음원 ${have.length}개`); have.forEach((id) => console.log(`  · ${id}`)); }

if (fail) { console.log(`\n✗ 배역 음원 배선과 실제 파일이 어긋납니다.`); process.exit(1); }
console.log(`\n✓ 배역 음원 배선 정상 — 없는 파일은 전부 '받는 중'으로 명시돼 있습니다.`);
