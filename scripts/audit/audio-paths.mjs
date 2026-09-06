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

/* ★[AUDIO_KNOWN_GAP 2026-09-06] «알고 있는 결손»은 게이트를 붉히지 않는다 — 대신 매번 말한다.
 *   console.html 의 PREVIEW_BED 는 처음부터 실물이 없다(위 머리말 · 2026-08-16 기록).
 *   파일을 만드는 일은 사용자 몫이라(음원 선택) 여기서 고칠 수 없다.
 *   ★그렇다고 검사를 안 돌리면 «새로» 사라진 소리도 함께 묻힌다 — 실제로 merge-guard 는
 *     이 감사의 «마커만» 세고 실행하지는 않아서, 결손이 3주 넘게 게이트를 그냥 통과했다.
 *   ★자정(自淨): 아래 파일이 «생기면» 이번엔 그걸 알려 준다. 목록이 낡은 채 남지 않게. */
const KNOWN_GAP = {
  'assets/narration/preview-bed.mp3':
    '고객 미리듣기 배경음악 · 음원 선택이 사용자 몫이라 대기(나중에할일_체크리스트.md)',
};

let bad = 0, seen = 0, known = 0, stale = [];
for (const p of PAGES) {
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(RE)) {
    const rel = m[1].replace(/^\//, '');
    seen++;
    const there = fs.existsSync(path.join(ROOT, rel));
    if (there) {
      console.log(`ok ${p} → ${rel}`);
      if (KNOWN_GAP[rel]) stale.push(rel);            // 생겼다 — 목록에서 빼라고 알린다
    } else if (KNOWN_GAP[rel]) {
      console.log(`· ${p} → ${rel} 없음(알고 있는 결손) — ${KNOWN_GAP[rel]}`);
      known++;
    } else { console.error(`✗ ${p} 가 없는 소리를 운다 → ${rel}`); bad++; }
  }
}
stale.forEach((r) => console.error(`✗ ${r} 가 이제 있다 — KNOWN_GAP 에서 빼라(목록이 낡으면 다음 결손을 놓친다)`));
console.log(bad || stale.length
  ? `\n손으로 박은 소리 ${seen}개 중 ${bad}개가 없다${stale.length ? ` · 낡은 예외 ${stale.length}개` : ''}`
  : `\n손으로 박은 소리 ${seen}개 — 없는 것 0개${known ? ` (알고 있는 결손 ${known}개는 따로 셈)` : ''}`);
process.exit(bad || stale.length ? 1 : 0);
