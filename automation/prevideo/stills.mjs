// 정지 화면 몇 장 — 검토용(node stills.mjs 120 900 2000)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const BX = process.env.REMOTION_BROWSER || null; // 없으면 Remotion 이 받아 둔 브라우저를 쓴다
const ID = process.env.COMP || 'Editorial';
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id: ID, browserExecutable: BX });
console.log('total', comp.durationInFrames, (comp.durationInFrames / 30).toFixed(1) + 's');
for (const f of frames) {
  await renderStill({ serveUrl, composition: comp, frame: f, output: `out/${ID}_${String(f).padStart(5, '0')}.png`, browserExecutable: BX, logLevel: 'error' });
  console.log('ok', f);
}
