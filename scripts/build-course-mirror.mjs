// ★[COURSE_MIRROR] order-preview.html 의 `var COURSES={…}` 사본을 원천에서 다시 뽑는다 [2026-08-09]
//
//   node scripts/build-course-mirror.mjs          # 어긋나면 알려만 준다(EXIT 1)
//   node scripts/build-course-mirror.mjs --write  # 다시 뽑아 넣는다
//
// 왜 만드나 — 파일 주석은 "프로그램으로 뽑은 사본이다 · 손으로 옮겨 적지 않는다 ·
//   고칠 일이 생기면 원천을 먼저 고치고 **다시 뽑아 넣는다**" 라고 말하는데,
//   **다시 뽑는 도구가 없었다.** 그래서 원천만 고치고 사본은 그대로인 일이 실제로 났다:
//   약속 코스 기본에 축배를 넣었는데 빌더의 seq 는 옛것이라 화면에 축배 단계가 안 생겼다
//   (엔진 블록엔 있고 빌더 단계엔 없다 — 렌더해 보고서야 알았다).
//   ★검사만 있고 도구가 없으면 사람은 결국 손으로 옮겨 적는다. 도구를 함께 둔다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const D = createRequire(path.join(root, 'package.json'))(path.join(root, 'assets/ritual-data.js'));
const F = path.join(root, 'order-preview.html');

const want = 'var COURSES=' + JSON.stringify(D.COURSES, null, 1) + ';';
const s = fs.readFileSync(F, 'utf8');
const i = s.indexOf('var COURSES={');
if (i < 0) { console.error('✗ order-preview.html 에서 `var COURSES={` 를 못 찾았습니다'); process.exit(1); }
const m = /^\};/m.exec(s.slice(i));
if (!m) { console.error('✗ COURSES 블록의 끝(`};`)을 못 찾았습니다'); process.exit(1); }
const got = s.slice(i, i + m.index + m[0].length);

if (got === want) { console.log('ok COURSES 사본이 원천과 같다'); process.exit(0); }
if (!process.argv.includes('--write')) {
  console.error('✗ COURSES 사본이 원천과 갈렸습니다 — node scripts/build-course-mirror.mjs --write');
  const a = got.split('\n'), b = want.split('\n');
  for (let k = 0, shown = 0; k < Math.max(a.length, b.length) && shown < 6; k++) {
    if (a[k] === b[k]) continue;
    console.error(`   ${k + 1}행  사본: ${(a[k] || '(없음)').trim().slice(0, 60)}`);
    console.error(`         원천: ${(b[k] || '(없음)').trim().slice(0, 60)}`);
    shown++;
  }
  process.exit(1);
}
fs.writeFileSync(F, s.slice(0, i) + want + s.slice(i + m.index + m[0].length), 'utf8');
console.log('✓ COURSES 사본을 원천에서 다시 뽑았습니다');
