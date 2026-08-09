// ★[RECORDED_TRUTH] '실제로 녹음된 글' 기록이 폴더와 1:1인지 [2026-08-09]
//
//   node scripts/check-recorded.mjs
//
// 왜 — check-text-audio 는 이 파일을 '소리 쪽 진실'로 쓴다. 그런데
//   ① 파일 없는 항목(유령)이 있으면 없는 소리를 있다고 말하고
//   ② 기록 없는 mp3 가 있으면 그 클립은 화면 글과 대조가 안 된 채 통과한다.
// 실제로 유령 23개가 있었다(내가 씨앗을 뜰 때 배역 클립까지 narration 기록에 넣었다 ·
// 코드 세션 지적). text-audio 는 통과했다 — 유령은 조회되지 않으니 조용했다.
// 조용한 거짓말이라 검사를 따로 둔다.
import fs from 'node:fs';
import path from 'node:path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
let bad = 0;
for (const dir of ['assets/audio/narration', 'assets/audio/cast']) {
  const d = path.join(root, dir), f = path.join(d, '_recorded.json');
  if (!fs.existsSync(f)) { console.error(`✗ ${dir}/_recorded.json 이 없습니다 — 녹음된 글의 원천입니다`); bad++; continue; }
  let rec;
  try { rec = JSON.parse(fs.readFileSync(f, 'utf8')).clips || {}; }
  catch (e) { console.error(`✗ ${dir}/_recorded.json 을 읽지 못했습니다 — ${e.message}`); bad++; continue; }
  const mp3 = new Set(fs.readdirSync(d).filter((x) => x.endsWith('.mp3')).map((x) => x.slice(0, -4)));
  const ghost = Object.keys(rec).filter((k) => !mp3.has(k));
  const miss = [...mp3].filter((k) => !(k in rec));
  if (ghost.length) { console.error(`✗ ${dir} — 파일 없는 기록 ${ghost.length}개(유령): ${ghost.slice(0, 6).join(' ')}${ghost.length > 6 ? ' …' : ''}`); bad++; }
  if (miss.length) { console.error(`✗ ${dir} — 기록 없는 mp3 ${miss.length}개: ${miss.slice(0, 6).join(' ')}${miss.length > 6 ? ' …' : ''}`); bad++; }
  if (!ghost.length && !miss.length) console.log(`ok ${dir} — 기록 ${Object.keys(rec).length} = mp3 ${mp3.size} (1:1)`);
}
if (bad) { console.error('\n이 기록은 「실제로 녹음된 글」의 원천입니다. 손으로 고치지 말고 assemble-narration.mjs 로 다시 만드세요.'); process.exit(1); }
console.log('RECORDED 1:1 OK');
