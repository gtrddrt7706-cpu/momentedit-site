// 견본 사진 — 홈페이지 사진을 public/photos 로 복사한다(저장소에 사진을 두 벌 두지 않는다)
import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const files = ['home/about.jpg', 'home/ceremony.jpg', 'home/dining.jpg', 'home/gallery-03.jpg', 'home/gallery-05.jpg', 'home/hero.jpg', 'home/snap.jpg',
  'snap-refs/c01-1.jpg', 'snap-refs/c03-2.jpg', 'snap-refs/c05-1.jpg', 'snap-refs/c08-2.jpg', 'snap-refs/w02-1.jpg', 'snap-refs/w04-2.jpg', 'snap-refs/w07-1.jpg', 'snap-refs/w10-1.jpg'];
const out = resolve(import.meta.dirname, 'public/photos');
mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(resolve(root, 'assets', f), resolve(out, basename(f)));
console.log('견본 사진', files.length, '장 →', out);
