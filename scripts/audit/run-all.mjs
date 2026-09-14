/* ★[AUDIT_RUN_ALL 2026-09-13 점검] 감사 전수 러너 — **목록을 손으로 관리하지 않는다.**
 *
 * ── 왜 만드나 (실측이 근거다)
 *   감사 파일 84개 중 merge-guard 가 «실행»하는 것은 30개, nightly-screen 이 12개.
 *   합쳐도 42개가 **아무도 안 돌린다.** nightly-screen 은 2026-08-11 에 바로 이 구멍을 메우려고
 *   만들었는데(그 머리말이 «51개 중 22개만 돈다»고 적고 있다), 그 뒤로 목록 밖에서 42개가 다시 쌓였다.
 *   구멍이 다시 열린 이유는 하나다 — **두 목록이 다 손으로 적은 것**이라서.
 *
 *   그 대가를 이미 치르고 있었다(2026-09-13 실측):
 *     · deliv-matrix  — #708 에서 문구를 고칠 때 같이 낡았다. 게이트는 초록이었다
 *     · pay-front-check — 같은 커밋에서 같은 이유로 낡았다
 *     · admin-ux      — 박아 둔 날짜가 과거가 되어 며칠째 붉었다(아무도 안 봤다)
 *     · guest-photo-sim — 게이트가 돌리는 검사인데, 시계를 돌려 보니 **2026-10-06 부터** 붉어진다
 *
 * ── 무엇을 하나
 *   scripts/audit/*.mjs 를 **스스로 찾아서** 전부 돌린다. 새 감사를 만들면 다음 밤부터 자동으로 돈다.
 *   빠지는 길은 아래 SKIP 한 곳뿐이고, 거기엔 반드시 «왜»를 적는다.
 *
 * ── 종료코드 [CANT_LOOK] 규칙을 그대로 지킨다
 *   0 통과 · 1 재서 틀림 · 2 재지 못함. «못 잼»을 «통과»로 세지 않는다.
 *   이 러너는 **1 이 하나라도 있을 때만** 1 로 끝난다(2 는 세어서 보고만 한다).
 *
 * 쓰기: node scripts/audit/run-all.mjs            전부
 *       node scripts/audit/run-all.mjs --list     무엇을 돌릴지만 보기
 *       AUDIT_JOBS=4 node scripts/audit/run-all.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

/* ★빠지는 유일한 길 — 반드시 «왜»와 함께. 여기 없는 파일은 전부 돈다. */
const SKIP = {
  'page-probe.mjs':  '검사가 아니라 «화면을 찍어 보는» 도구다 — 인자(파일명)를 받아야 돈다',
  'typo-ramp.mjs':   '설계상 보고 전용이라 늘 1 로 끝난다(그 파일 50행이 «판단은 사람 몫»이라고 적고 있다). 게이트에 넣으면 영원한 빨강이 된다',
  'munan-applied.mjs': '보고 전용이다 — 그 파일 20행이 «없음은 틀림이 아니라 사람이 봐야 할 자리»라고 «스스로» 적고 있고, merge-guard 6501행도 fail 을 안 올리고 note 로만 낸다. 그런데 여기서만 «재서 틀림»으로 세어 run-all 이 첫날부터 영원한 빨강이었다 (2026-09-13 점검 실측 · 55문장 25자리). 같은 검사에 두 기준을 두지 않는다 — 게이트 쪽 판정을 따른다',
  'run-all.mjs':     '이 러너 자신',
};

/* ★느린 것에만 시간을 더 준다 — 느린 게 결함이 아닌 경우가 있다.
     stage-reach 는 여정 상태공간을 너비우선으로 연다(약 290초). 멈춘 게 아니다. */
const SLOW = { 'stage-reach.mjs': 600 };
const TIMEOUT = Number(process.env.AUDIT_TIMEOUT || 300);
const JOBS = Number(process.env.AUDIT_JOBS || 4);   // 포트를 박아 쓰는 감사가 있어 과하게 안 올린다

const files = fs.readdirSync(HERE)
  .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
  .filter(f => !(f in SKIP))
  .sort();

if (process.argv.includes('--list')) {
  console.log(`돌릴 감사 ${files.length}개`);
  files.forEach(f => console.log('  ' + f));
  console.log(`\n빼는 것 ${Object.keys(SKIP).length}개`);
  for (const [f, why] of Object.entries(SKIP)) console.log(`  ${f} — ${why}`);
  process.exit(0);
}

/* ★[RUN_ALL_VERIFY] 고아가 0인지만 빠르게 잰다(감사를 돌리지 않는다 · merge-guard 가 이걸 부른다).
   ①디렉터리의 모든 감사가 «돌 목록»이나 «SKIP» 둘 중 하나에 있고 ②SKIP 마다 «왜»가 적혀 있어야 한다.
   이 두 가지가 서면 «만들어 놓고 아무도 안 부르는 검사»가 구조적으로 생길 수 없다. */
if (process.argv.includes('--verify')) {
  const all = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && !f.startsWith('_'));
  const covered = new Set([...files, ...Object.keys(SKIP)]);
  const orphan = all.filter(f => !covered.has(f));
  const noWhy = Object.entries(SKIP).filter(([, w]) => !String(w || '').trim()).map(([f]) => f);
  const ghost = Object.keys(SKIP).filter(f => !all.includes(f));
  let bad = 0;
  if (orphan.length) { console.log(`❌ 아무도 안 돌리는 감사 ${orphan.length}개: ${orphan.join(' ')}`); bad = 1; }
  if (noWhy.length)  { console.log(`❌ 이유 없이 뺀 감사 ${noWhy.length}개: ${noWhy.join(' ')}`); bad = 1; }
  if (ghost.length)  { console.log(`❌ SKIP 에만 있고 파일은 없는 것 ${ghost.length}개: ${ghost.join(' ')} — 지운 감사는 SKIP 에서도 지운다`); bad = 1; }
  if (!bad) console.log(`ok run-all: 감사 ${all.length}개 전부 돈다(돌림 ${files.length} · 이유 붙여 뺌 ${Object.keys(SKIP).length}) — 고아 0`);
  process.exit(bad);
}

const run = (f) => new Promise((res) => {
  const secs = SLOW[f] || TIMEOUT;
  const t0 = Date.now();
  const p = spawn('node', [path.join(HERE, f)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { out += d; });
  const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} }, secs * 1000);
  p.on('close', (code, sig) => {
    clearTimeout(timer);
    res({ f, code: sig ? 124 : code, secs: Math.round((Date.now() - t0) / 1000), out });
  });
});

const results = [];
for (let i = 0; i < files.length; i += JOBS) {
  results.push(...await Promise.all(files.slice(i, i + JOBS).map(run)));
}

/* ★[RUN_ALL_SUMMARY] GitHub 요약표를 이 러너가 직접 쓴다 — 워크플로 yml 에 검사 이름을 다시 적지 않기 위해서다.
   손으로 적은 목록이 벌어지는 것이 이 러너를 만든 이유인데, 요약만 손으로 적으면 같은 병이 요약에 남는다. */
const GHS = process.env.GITHUB_STEP_SUMMARY;
if (GHS) {
  const mean = (c) => c === 0 ? '통과' : c === 1 ? '✗ 재서 틀림' : c === 2 ? '★재지 못함 (환경 · 화면 결함 아님)'
    : `✗ 검사가 제 결론에 닿지 못했습니다 (종료 ${c} · 127 파일없음 124 시간초과 137 메모리 139 충돌)`;
  const rows = ['', `### 감사 전수 (run-all) — ${results.length}개`, '', '| 검사 | 종료 코드 | 뜻 | 초 |', '|---|---|---|---|']
    .concat(results.slice().sort((a, b) => (a.code === 0) - (b.code === 0) || a.f.localeCompare(b.f))
      .map(r => `| \`${r.f}\` | ${r.code} | ${mean(r.code)} | ${r.secs} |`));
  try { fs.appendFileSync(GHS, rows.join('\n') + '\n'); } catch {}
}

const bad  = results.filter(r => r.code === 1);
const cant = results.filter(r => r.code === 2);
const dead = results.filter(r => r.code !== 0 && r.code !== 1 && r.code !== 2);
const okn  = results.filter(r => r.code === 0).length;

console.log(`\n[AUDIT_RUN_ALL] 감사 ${results.length}개 — 통과 ${okn} · 틀림 ${bad.length} · 못 잼 ${cant.length} · 안 끝남 ${dead.length}`);
for (const r of cant) console.log(`  · 못 잼   ${r.f} (${r.secs}초) — ${(r.out.trim().split('\n').pop() || '').slice(0, 90)}`);
for (const r of dead) console.log(`  ⏱ 안 끝남 ${r.f} (${r.secs}초 · 종료 ${r.code})`);
for (const r of bad) {
  console.log(`\n❌ ${r.f} (${r.secs}초)`);
  const lines = r.out.split('\n').filter(l => /❌|✗|FAIL|REVERT|불일치|실패/.test(l));
  (lines.length ? lines : r.out.split('\n').slice(-6)).slice(0, 8).forEach(l => console.log('    ' + l.trim().slice(0, 160)));
}
if (!bad.length && !dead.length) console.log('  ✅ 틀린 검사 없음');
process.exit(bad.length || dead.length ? 1 : 0);
