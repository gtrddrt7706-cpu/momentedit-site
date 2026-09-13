// 저널 낭독 대본 ↔ 음원 동기 검사  [JOURNAL_AUDIO_SYNC]
//   node scripts/audit/journal-audio-sync.mjs
//
// ★왜 필요한가 — journal-script-check 가 막지 못하는 나머지 절반이다.
//   그쪽은 «대본 ↔ 화면 글»을 맞댄다. 둘 다 글이라 둘 다 고치면 초록이 된다.
//   그런데 소리는 같이 안 바뀐다. 대본을 다듬은 날 화면은 새 문장을 보여주는데
//   재생 버튼을 누른 사람은 옛 문장을 듣는다 — 화면을 아무리 들여다봐도 안 보인다.
//   실제로 2026-09-12 에 그렇게 됐다: 저널 Nº02 맺음 한 줄을 줄였고, 게이트는 전부 초록이었고,
//   assets/audio/essay/2_honeymoon.mp3 는 옛 문장을 그대로 말하고 있었다.
//
// ★어떻게 재나 — 음원을 들을 수는 없다(나는 소리를 못 듣는다). 대신 «출처»를 잰다.
//   음원은 build-journal-audio.py 가 대본 한 줄당 wav 하나로 조립한다. 그러니 조립할 때 쓴
//   대본의 sha256 을 audio-state.json 에 남겨 두면, 그 뒤 대본이 바뀌었는지는 기계가 안다.
//
// ★빨강과 경고를 나눈다 — 재녹음은 사람이 해야 하고(타입캐스트) 하루 이틀 걸린다.
//   그 사이 main 을 붉게 두면 «고칠 수 없는 빨강»이 된다(CLAUDE.md 규칙).
//   그래서 pending_rerecord 에 «지금 대본의 해시»를 적어 둔 어긋남은 경고로만 알린다.
//   적어 두지 않은 어긋남 — 즉 대본을 고치고 아무 말도 안 한 경우 — 만 FAIL 이다.
//   ★pending 의 expect_sha256 은 «지금 대본»과 같아야 한다. 대본을 또 고치면 그 순간
//     pending 이 낡아 다시 FAIL 이 된다. 오래된 면죄부가 쌓이지 않게 하려는 것이다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const STATE = path.join(ROOT, 'docs/plans/저널낭독/audio-state.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bad = [];
const warn = [];
let scanned = 0;

if (!fs.existsSync(STATE)) {
  console.error('FAIL audio-state.json 이 없다 — 음원이 어느 판 대본으로 만들어졌는지 아무도 모른다');
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));

// 조립기가 아는 편이 상태 파일에도 다 있어야 한다 — 편을 늘리고 여기 안 적으면 그 편은 검사 밖이 된다
const PY = fs.readFileSync(path.join(ROOT, 'scripts/build-journal-audio.py'), 'utf8');
const inPy = [...PY.matchAll(/^\s*'(\d+)':\s*\('([^']+)',\s*'([^']+)'\)/gm)].map((m) => ({ part: m[1], script: m[2], mp3: m[3] }));
if (!inPy.length) bad.push('build-journal-audio.py 의 SCRIPTS 표를 못 읽었다 — 검사가 헛돈다(파서 확인)');
for (const p of inPy) {
  const s = state.parts[p.part];
  if (!s) { bad.push(`${p.part}편이 조립기엔 있는데 audio-state.json 엔 없다`); continue; }
  if (s.script !== p.script || s.mp3 !== p.mp3) bad.push(`${p.part}편 경로가 조립기와 다르다 — 상태:${s.script}/${s.mp3} 조립기:${p.script}/${p.mp3}`);
}

for (const [part, s] of Object.entries(state.parts)) {
  const scriptPath = path.join(ROOT, s.script);
  const mp3Path = path.join(ROOT, s.mp3);
  if (!fs.existsSync(scriptPath)) { bad.push(`${part}편 대본이 없다 — ${s.script}`); continue; }
  if (!fs.existsSync(mp3Path)) { bad.push(`${part}편 음원이 없다 — ${s.mp3}`); continue; }
  scanned++;

  const now = sha(scriptPath);
  if (now === s.script_sha256) continue;                       // 음원이 최신이다

  const pend = s.pending_rerecord;
  if (pend && pend.expect_sha256 === now) {
    warn.push(`${part}편 재녹음 대기(${pend.since}) — ${pend.why}`);
  } else if (pend) {
    bad.push(`${part}편 대본이 또 바뀌었다 — pending 의 expect_sha256(${pend.expect_sha256.slice(0, 12)}…)이 현재(${now.slice(0, 12)}…)와 다르다. audio-state.json 의 pending 을 지금 대본으로 갱신할 것`);
  } else {
    bad.push(`${part}편 대본을 고치고 음원을 안 고쳤다 — 화면은 새 문장, 스피커는 옛 문장이 된다. 재녹음하거나 audio-state.json 에 pending_rerecord 를 적을 것`);
  }
}

if (!scanned) bad.push('잰 편이 0이다 — 검사가 아무것도 안 봤다(안 쟀는데 초록이 되는 것을 막는다)');

// 자기반증 — 대본을 한 글자 바꾸면 반드시 걸려야 한다. 안 걸리면 이 검사 자체가 헛것이다
{
  const probe = Object.values(state.parts)[0];
  const t = fs.readFileSync(path.join(ROOT, probe.script));
  const tampered = crypto.createHash('sha256').update(Buffer.concat([t, Buffer.from('.')])).digest('hex');
  if (tampered === probe.script_sha256) bad.push('자기반증 실패 — 대본을 바꿔도 해시가 같다(해시 계산이 깨졌다)');
}

for (const w of warn) console.log(`· 경고 ${w}`);
for (const b of bad) console.error(`FAIL ${b}`);
console.log(`결과 — ${scanned}편 검사 · 어긋남 ${bad.length}건 · 재녹음 대기 ${warn.length}건`);
process.exit(bad.length ? 1 : 0);
