// 쪼개져 내려온 문장을 도로 한 문장으로 붙인다 [SPLIT_JOIN · 2026-08-09]
//
//   node scripts/join-split-sentences.mjs --in ~/Downloads/타입캐스트 [--out <폴더>]
//
// ★왜 필요한가 — 실제로 두 번 당했다
//   우리 대장(manifest)은 `신랑 신부, 입장!` 을 **한 문장**으로 센다.
//   그런데 타입캐스트는 이 문장을 쉼표에서 끊어 **두 파일**로 내려보낸다
//   (편집기에 `신랑 신부,[0.3s] 입장.` 처럼 쉼표 뒤 쉼 표시가 붙는 문장이 그렇다).
//   입장 6클립을 받으면 23개가 아니라 29개가 되고, 조립기는 개수가 안 맞아 멈춘다.
//   ★멈추는 건 옳다 — 개수만 맞춰 조용히 붙이면 문장이 한 칸씩 밀린 채 완성된다.
//   그래도 사람이 매번 손으로 이어 붙일 일은 아니다. 그래서 이 스크립트가 대신 한다.
//
// 어떻게 판별하나 — **파일 이름에 문장이 그대로 들어 있다.**
//   `audio_3_신랑_신부_.wav` + `audio_4__입장_.wav` → 이어 붙이면 `신랑 신부, 입장!` 이 된다.
//   대장의 어떤 문장과 **글자까지** 맞을 때만 붙인다. 안 맞으면 손대지 않는다.
//   ★추측으로 붙이지 않는다 — 틀리게 붙은 문장은 소리로만 드러나고, 그때는 이미 늦다.
//
// 무엇을 하나
//   ① --in 폴더의 wav 를 이름 속 번호 순서로 읽고
//   ② 이웃한 두 개의 이름을 이어 봤을 때 대장의 한 문장과 맞으면 하나로 잇고(가장자리 무음 정리 + 0.28초)
//   ③ 나머지는 그대로 복사해 --out 폴더에 `audio_N_*.wav` 로 다시 번호를 매긴다.
//   그 폴더를 그대로 assemble-narration.mjs 에 넘기면 된다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg('--in', '');
/* ★[JOIN_GAP] 이어 붙일 때 넣는 쉼. 0.28초로 시작했다가 **0.7초**로 늘렸다 —
   사용자 실청: *"너무 빨라 신랑신부 하고 입장이"*.
   왜 짧게 들렸나: 타입캐스트는 블록마다 앞뒤로 0.2~0.4초씩 자체 여백을 붙여 내보낸다.
   편집기에서 들은 쉼은 설정한 0.3초 + 그 여백이라 0.6~0.8초였는데,
   조립기가 가장자리 여백을 깎으면서(TRIM_VENDOR_EDGE) 설정값만 남았다.
   ★그 깎기는 전체가 늘어지던 것을 잡은 규칙이라 유지한다. 대신 **여기서 되돌려 준다.** */
const JOINGAP = arg('--gap', '0.7');
const OUT = arg('--out', '') || path.join(path.dirname(IN.replace(/\/$/, '')), path.basename(IN.replace(/\/$/, '')) + '_joined');
if (!IN || !fs.existsSync(IN)) { console.error('✗ --in <타입캐스트에서 받은 폴더> 가 필요합니다.'); process.exit(1); }

const MAN = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');
if (!fs.existsSync(MAN)) { console.error('✗ manifest.json 이 없습니다. node scripts/build-typecast-import.mjs 먼저 돌리세요.'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

// 대장에 있는 모든 문장을 '글자만 남긴 꼴'로 모아 둔다
const norm = (t) => String(t).normalize('NFC').replace(/[^0-9A-Za-z가-힣]/g, '');
const SENT = new Set();
for (const c of man.clips) for (const s of c.sents) SENT.add(norm(s.text));

const AUD = /\.(wav|mp3|m4a|flac)$/i;
const files = fs.readdirSync(IN).filter((f) => AUD.test(f))
  .sort((a, b) => (parseInt((a.match(/audio_(\d+)_/) || [0, 1e9])[1], 10) - parseInt((b.match(/audio_(\d+)_/) || [0, 1e9])[1], 10)));
if (!files.length) { console.error(`✗ ${IN} 에 음원이 없습니다.`); process.exit(1); }

const bodyOf = (f) => f.replace(/^audio_\d+_/, '').replace(AUD, '');
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,'
  + 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let joined = 0, n = 0, i = 0;
const log = [], orphan = [];
while (i < files.length) {
  const a = files[i], b = files[i + 1];
  const pair = b && SENT.has(norm(bodyOf(a) + bodyOf(b))) && !SENT.has(norm(bodyOf(a)));
  const dst = path.join(OUT, `audio_${n}_${bodyOf(pair ? a : a).slice(0, 40)}.wav`);
  if (pair) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-i', path.join(IN, a), '-i', path.join(IN, b),
      '-filter_complex', `[0:a]${TRIM}[a0];[1:a]${TRIM}[a1];aevalsrc=0:d=${JOINGAP}:s=48000[g];[a0][g][a1]concat=n=3:v=0:a=1[o]`,
      '-map', '[o]', '-ar', '48000', '-c:a', 'pcm_s24le', dst]);
    // ★status 만 보면 안 된다 — ffmpeg 이 아예 없으면(ENOENT) status 는 null 이라 이 검사를 그냥 지나간다.
    //   그러면 파일이 안 생긴 채 "이었음" 을 찍고 초록으로 끝난다. 잇기는 못 했는데 됐다고 말하는 것이
    //   이 도구에서 제일 나쁜 실패다(붙었다고 믿고 그대로 조립기에 넘긴다). 셋 다 본다.
    if (r.error || r.status !== 0 || !fs.existsSync(dst)) {
      console.error(`✗ 잇기 실패: ${a} + ${b}`);
      console.error(r.error && r.error.code === 'ENOENT'
        ? '  ffmpeg 이 없습니다. 설치 후 다시 실행하세요(brew install ffmpeg).'
        : `  ${String(r.error || r.stderr).slice(0, 200)}`);
      process.exit(1);
    }
    log.push(`  이었음  ${a}  +  ${b}`);
    joined++; i += 2;
  } else {
    if (!SENT.has(norm(bodyOf(a)))) orphan.push(a);   // 대장의 어떤 문장과도 안 맞는다 = 아직 조각일 수 있다
    fs.copyFileSync(path.join(IN, a), dst);
    i += 1;
  }
  n++;
}

console.log(`받은 파일 ${files.length}개 → ${n}개 (이어 붙인 자리 ${joined}곳)`);
if (log.length) console.log(log.join('\n'));
console.log(`→ ${OUT}`);
// ★안내가 원을 돌지 않게 한다 — 못 이은 조각이 남았는데 "그대로 넘기셔도 됩니다" 라고 하면,
//   조립기가 개수 불일치로 멎고 그 오류문이 다시 이 도구를 가리켜 사람이 두 안내 사이를 왕복한다.
//   대장의 어떤 문장과도 안 맞는 파일은 아직 조각일 수 있으니 그것부터 보여 주고 멈춰 세운다.
if (orphan.length) {
  console.log(`  ⚠ 대장의 문장과 안 맞는 파일 ${orphan.length}개 — 아직 쪼개진 조각이거나 대본이 바뀐 자리입니다.`);
  orphan.slice(0, 8).forEach((f) => console.log(`     ${f}`));
  if (orphan.length > 8) console.log(`     … 외 ${orphan.length - 8}개`);
  console.log('     이대로 조립기에 넘기면 개수가 안 맞아 멎습니다. 위 파일 이름을 대본과 맞춰 보세요.');
} else if (!joined) {
  console.log('  ★쪼개진 문장이 없습니다 · 원래 폴더를 그대로 조립기에 넘기셔도 됩니다.');
}
if (joined && !orphan.length) {
  console.log(`  이어서:  node scripts/assemble-narration.mjs --in ${OUT} [--clip <대목>]`);
}
