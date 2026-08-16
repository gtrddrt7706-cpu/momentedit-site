// [AUDIO_PATH_REAL 2026-08-16 CC 적대검증 ⑤] 소리를 우는 «모든» 경로가 실물에 닿아 있는가.
//
// ★왜 필요한가 — 코워크 물음 ⑤ "mp3 를 우는 코드 경로가 정말 이 넷뿐인가".
//   훑어보니 엔진 밖에서 **이름을 박아 부르는** 자리가 있었고, 그중 하나가 없는 파일이었다:
//     console.html 의 PREVIEW_BED = '/assets/narration/preview-bed.mp3'
//   실측: 404 · MediaError code 4 · 그런데 화면은 아무 말도 안 한다(error 핸들러가 고지줄을 지운다).
//   미리듣기에 배경 음악이 **처음부터 없었고**, 어느 검사도 그걸 몰랐다.
//   ★엔진이 만드는 이름(cue.file·cast)은 check-listen-cover 가 본다. 여기는 **손으로 박은 이름**만 본다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 없는 파일이 있다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES = ['console.html', 'parents.html', 'order-preview.html', 'mypage.html', 'guide.html', 'index.html'];
const RE = /['"](\/assets\/[^'"]+\.mp3)['"]/g;

let bad = 0, seen = 0;
for (const p of PAGES) {
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(RE)) {
    const rel = m[1].replace(/^\//, '');
    seen++;
    if (fs.existsSync(path.join(ROOT, rel))) console.log(`ok ${p} → ${rel}`);
    else { console.error(`✗ ${p} 가 없는 소리를 운다 → ${rel}`); bad++; }
  }
}
console.log(bad ? `\n손으로 박은 소리 ${seen}개 중 ${bad}개가 없다` : `\n손으로 박은 소리 ${seen}개 전부 실물이 있다`);
process.exit(bad ? 1 : 0);
