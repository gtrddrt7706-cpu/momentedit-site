// ★[SYL_RATE] 음절 속도 상수가 실제 낭독과 맞는지 [2026-08-09]
//
//   node scripts/check-syl-rate.mjs            # 상수와 실측이 벌어지면 실패
//   node scripts/check-syl-rate.mjs --table    # 판정 없이 수치만
//
// 왜 — 조립기·길이 검사가 `음절/300*60` 으로 길이를 **예상**한다. 그런데 실제 낭독은
//   훨씬 빠르다(실측 406 음절/분). 예상이 실제보다 35% 길게 나온다.
//   그 예상값으로 "이 문안은 너무 길다"를 판단하면 **멀쩡한 문장을 계속 깎게 된다.**
//   실제로 갈렸다: 같은 clip 을 두고 코워크는 실측 19.5초, 코드 세션은 예상 25.8초를 적었다.
//   둘 다 맞았다 — 서로 **다른 것**을 재고 있었을 뿐이다.
//   ★같은 이름의 두 숫자는 증명을 방해한다. 그래서 이 파일이 둘의 관계를 붙들어 둔다.
// ★상수를 함부로 바꾸지 않는다 — 조립기의 무음 계산이 같은 상수를 쓰기 때문에,
//   바꾸면 이미 귀로 통과한 클립의 박자 판정까지 흔들린다.
//   여기서는 **얼마나 벌어져 있는지를 눈에 보이게** 하고, 그 폭이 커지면 알린다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const NAR = path.join(root, 'assets/audio/narration');
const man = JSON.parse(fs.readFileSync(path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const CONST = 300;                                        // 조립기·검사가 쓰는 상수(음절/분)
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
process.on('exit', (c) => { if (bad && c === 0) process.exitCode = 1; });   // [EXIT_TRAP]

const have = (() => { try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();
if (!have) {
  /* ★ffprobe 가 없는 세션이 있다(코드 세션이 그렇다). 그때는 **재지 않았다고 말하고 넘어간다** —
     '없으면 통과'가 아니라 '없으면 안 쟀다'고 밝히는 것이다. 초록으로 위장하지 않는다.
     ★[CANT_LOOK 2026-08-10] 그런데 여기서 0 으로 나가고 있었다.
       이 검사는 merge-guard 가 **실제로 돌리는** 몇 안 되는 소리 검사인데,
       게이트는 화면 글을 안 보고 종료 코드만 본다(`>/dev/null`). 위 한 줄이 아무리 정직해도
       0 은 게이트에 「쟀고 통과했다」로 읽혔다 — ffprobe 없는 환경에서 이 검사는 내내 헛돌았다.
       → 2 로 나간다. 0 통과 · 1 재서 틀림 · 2 못 잼. merge-guard 가 2 를 '건너뜀'으로 적는다. */
  console.log('· ffprobe 가 없어 실측을 못 했습니다 — 이 검사는 이번에 아무것도 재지 않았습니다');
  console.log('  ※ 종료 코드 2 = 재지 못했다(통과 아님) · 1 = 재서 틀렸다 · 0 = 쟀고 통과');
  process.exit(2);
}
/* [NAN_NOT_ZERO] 못 읽은 길이를 값으로 삼키지 않는다 — `+'N/A'` 는 NaN 이고,
   NaN 은 아래 `speech > 0` 을 조용히 false 로 만들어 그 클립을 **표본에서 지운다**.
   지워진 줄 모르고 남은 것으로 평균을 내면, 재지 못한 것이 재서 통과한 것으로 둔갑한다. */
const unread = [];
const dur = (p) => {
  const raw = execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], { encoding: 'utf8' }).trim();
  const n = +raw;
  if (!Number.isFinite(n) || n <= 0) { unread.push(`${path.basename(p)} ("${raw}")`); return null; }
  return n;
};
const syl = (s) => (String(s).match(/[가-힣]/g) || []).length;

let S = 0, T = 0, n = 0;
for (const c of man.clips) {
  const k = `${c.no}_${c.file}`, p = path.join(NAR, k + '.mp3');
  if (!fs.existsSync(p) || /parents-letter/.test(k)) continue;          // 편지는 낭독 성격이 다르다
  const s = c.sents.reduce((a, x) => a + syl(x.text), 0);
  if (s < 10) continue;
  const gaps = c.sents.slice(0, -1).reduce((a, x, i) => a + (x.after || 0) + (c.sents[i + 1].before || 0), 0);
  const d = dur(p);
  if (d === null) continue;                                            // 못 읽은 것은 unread 에 쌓였다
  const speech = d - gaps - (c.head || 0) - (c.tail || 0);
  if (speech > 0) { S += s; T += speech; n++; }
}
if (unread.length) { no(`길이를 못 읽은 mp3 ${unread.length}개: ${unread.slice(0, 5).join(' · ')}${unread.length > 5 ? ' …' : ''} — 표본에서 조용히 빠지면 안 됩니다`); }
if (!n) {
  /* [CANT_LOOK] mp3 가 아예 없는 것과 있는데 못 읽는 것은 다르다 — 앞은 '못 잼', 뒤는 '틀림'이다. */
  if (unread.length) { console.log('  ※ 종료 코드 1 = 재서 틀렸다'); process.exit(1); }
  console.log('· 잴 수 있는 클립이 없습니다 — mp3 가 하나도 없어 이번에 아무것도 재지 않았습니다');
  console.log('  ※ 종료 코드 2 = 재지 못했다(통과 아님) · 1 = 재서 틀렸다 · 0 = 쟀고 통과');
  process.exit(2);
}
const real = S / T * 60, ratio = real / CONST;
console.log(`실측 낭독 속도 ${real.toFixed(0)} 음절/분 (${n}클립) · 상수 ${CONST} · 예상이 실제보다 ${((ratio - 1) * 100).toFixed(0)}% 길게 나온다`);
if (process.argv.includes('--table')) process.exit(0);
/* 벌어진 폭이 지금 수준(1.2~1.5배)을 벗어나면 알린다 — 성우가 바뀌었거나 상수를 손댔다는 뜻이다.
   1.0 에 가까워지면 상수를 실측에 맞춘 것이니 그것도 알아야 한다(그때는 이 범위를 같이 고친다). */
if (ratio < 1.2 || ratio > 1.5) no(`상수와 실측의 폭이 ${ratio.toFixed(2)}배입니다 — 지금까지 1.2~1.5배였습니다. 성우·상수가 바뀌었다면 이 범위도 같은 커밋에서 고치세요`);
if (!bad) console.log('SYL RATE OK');
