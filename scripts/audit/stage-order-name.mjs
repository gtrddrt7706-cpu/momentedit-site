// [STAGE_ORDER_BY_NAME 2026-09-26 코워크 회신8-2] sent-lib --stage 로 깐 폴더는 이름 차례로 순서가 증명된다 — 길이 상관이 낮아도 멈추지 않는다.
//
//   node scripts/audit/stage-order-name.mjs
//   ASSEMBLE_SRC=<옛 assemble-narration.mjs> node scripts/audit/stage-order-name.mjs   # 고치기 전 판이 멎는지(재현 증거)
//
// 가짜 소리로 2_진행_전반 을 깐다 — 문장마다 예상 길이(음절 ÷ 5초) · 단, «신랑 신부, 입장!»(입장 여섯 자리)만 3.4초(사장님이 고른 1.4초 판 실측).
//   ① 이름 차례 = 대장 차례 → 순서 검증을 통과(길이 상관은 참고로만 찍힘)
//   ② 이름 두 개를 서로 바꾼 폴더 → 종전대로 r < 0.85 에서 멈춤(안전망은 그대로)
// ★저장소 밖 임시 폴더에서 돈다 — 조립 결과(--out)와 _recorded.json 도 그 안에만 생긴다.
// 종료 코드 0 통과 · 1 실패 · 2 재지 못함
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.log('못 쟀다 — ffmpeg 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'stageorder-'));
const cp = (rel, src) => { const d = path.join(T, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.cpSync(src || path.join(ROOT, rel), d, { recursive: true }); };
cp('scripts/assemble-narration.mjs', process.env.ASSEMBLE_SRC || undefined);
cp('scripts/clip-select.mjs'); cp('docs/plans/식순연구/타입캐스트/manifest.json');
const man = JSON.parse(fs.readFileSync(path.join(T, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const part = man.parts.find((p) => /진행_전반/.test(p.file));
const flat = []; for (const c of man.clips.filter((c) => c.part === part.file)) for (const s of c.sents) flat.push({ id: String(c.no).padStart(2, '0') + '_' + c.file + '_' + s.i, text: s.text });
const src = path.join(T, 'src'); fs.mkdirSync(src);
flat.forEach((x, k) => {
  const syl = (x.text.match(/[가-힣]/g) || []).length, sec = x.text === '신랑 신부, 입장!' ? 3.4 : Math.max(0.6, syl / 5);
  x.f = path.join(src, k + '.flac');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${300 + k}:duration=${sec.toFixed(2)}`, '-ar', '44100', '-ac', '1', x.f]);
});
function lay(dir, order) { fs.mkdirSync(dir, { recursive: true }); order.forEach((x, n) => fs.copyFileSync(x.f, path.join(dir, String(n + 1).padStart(4, '0') + '_' + x.id + '.flac'))); }
const run = (inDir, out) => spawnSync('node', [path.join(T, 'scripts/assemble-narration.mjs'), '--in', inDir, '--part', part.file.split('_')[0], '--out', out], { encoding: 'utf8', cwd: T, timeout: 600000 });

const good = path.join(T, 'good'); lay(good, flat);
const r1 = run(good, path.join(T, 'out1')), o1 = r1.stdout + r1.stderr;
const line1 = (o1.match(/순서 검증 · [^\n]*/) || [''])[0];
ok(`① 이름 차례 = 대장 차례 → 멈추지 않는다(${flat.length}자리 · 입장 여섯 자리 3.4초) [STAGE_ORDER_BY_NAME]`, !/순서가 어긋난 것으로 보입니다/.test(o1) && /이름 차례 = 대장 차례/.test(o1), line1 || o1.slice(-300));
/* 이름을 둘 바꿔 깐다 — 두 파일의 소리는 제자리인데 이름만 틀린 폴더(또는 소리가 바뀐 폴더)는 증명이 안 된다 */
const sw = flat.slice(); const i = sw.findIndex((x) => /entry-A_3$/.test(x.id)); [sw[i], sw[i + 1]] = [sw[i + 1], sw[i]];
const bad = path.join(T, 'bad'); lay(bad, sw);
const r2 = run(bad, path.join(T, 'out2')), o2 = r2.stdout + r2.stderr;
ok('② 이름 차례가 대장과 다르면 종전대로 r < 0.85 에서 멈춘다(안전망 그대로)', r2.status === 1 && /순서가 어긋난 것으로 보입니다/.test(o2), (o2.match(/순서 검증 · [^\n]*/) || [''])[0] + ' · exit ' + r2.status);
fs.rmSync(T, { recursive: true, force: true });
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
