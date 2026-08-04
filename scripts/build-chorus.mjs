// [VOW_CHORUS 2026-08-04] 합창 클립 만들기 — 두 목소리를 겹쳐 한 파일로
//
//   node scripts/build-chorus.mjs           # manifest 의 mix 클립 전부
//   node scripts/build-chorus.mjs --dry     # 만들지 않고 잴 것만 재서 보고
//   node scripts/build-chorus.mjs --clip 26_vow-both
//
// ★왜 미리 겹쳐 두나
//   재생기(order-preview.html `_srcs()`)는 배열을 **순차** 재생한다. 동시에 두 파일을 트는 길이
//   없다. 그래서 "함께 말한다"는 재생 시점이 아니라 파일을 만드는 시점에 결정해야 한다.
//   ★그리고 이 라이브러리는 "한 클립 = 한 목소리"가 원칙이다(기획서 §2-A). 한 파일 안에서
//     두 사람을 번갈아 말하게 만들지 않는다. 따로 받아서 겹치면 그 원칙을 깨지 않는다 —
//     결과 파일은 '두 분이 함께'라는 하나의 목소리다.
//
// ★무엇이 어려운가 — 두 TTS 는 같은 문장을 다른 속도로 읽는다
//   그냥 포개면 앞뒤가 벌어져 에코처럼 들린다. 그래서 문장 단위로 맞춘다:
//   ①무음으로 잘라 문장 토막을 낸다  ②토막마다 긴 쪽에 짧은 쪽 속도를 맞춘다(atempo)
//   ③manifest 가 적어 둔 여백으로 같은 타임라인에 다시 깐다  ④그제서야 겹친다.
//   ★토막 수가 다르면 문장 단위 정렬을 포기하고 통짜로 맞춘다. 조용히 틀리게 만들지 않고
//     화면에 "통짜 정렬로 물러섰다"고 적는다 — 폴백이 조용하면 버그가 기능처럼 보인다.
//
// ★소리의 최종 판정은 사람 귀 몫이다
//   이 세션은 소리를 못 듣는다. 여기서 하는 건 재고 맞추는 일까지다.
//   그래서 마지막에 잰 값(길이·어긋난 정도·속도 보정률)을 전부 찍는다 — 무엇을 듣고
//   판단해야 하는지 사람이 알 수 있게. 어긋남이 크게 남으면 경고를 띄운다.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MF = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');
const man = JSON.parse(fs.readFileSync(MF, 'utf8'));

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const ONLY = arg('--clip', '');

// ── 손잡이. 바꾸려면 여기만 본다.
const SIL_DB = '-50dB';          // 무음 판정 — 조립기(assemble-narration)와 같은 자를 쓴다
const SIL_MIN = 0.12;            // 이보다 짧은 무음은 문장 사이가 아니라 말 속의 숨이다
const TEMPO_LO = 0.86, TEMPO_HI = 1.16;   // 이 밖으로 나가면 목소리가 변한다 — 안 늘리고 남는 만큼 무음으로 둔다
// ★[CHORUS_STAGGER] 두 사람이 완벽히 같은 순간에 입을 여는 일은 없다. 0으로 두면 사람이 아니라
//   합성처럼 들린다(플랜저 소리가 난다). 40ms 는 실제 합창의 어긋남 범위 안쪽이다.
const STAGGER = Number(arg('--stagger', '0.04'));
const MIXVOL = 0.72;             // 둘을 더하면 넘친다. 미리 낮춰 두고 리미터로 뚜껑을 덮는다

const CAST_DIR = 'assets/audio/cast';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'chorus-'));
const idOf = (c) => `${c.no}_${c.file}`;
const mp3Of = (id) => path.join(root, CAST_DIR, `${id}.mp3`);

function dur(f) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  return Number(String(r.stdout).trim()) || 0;
}
// 무음 구간을 찾아 「소리 나는 토막」의 시작·끝 목록으로 바꾼다
//
// ★[CHORUS_SEGN 2026-08-04] 문장 수(n)를 받으면 그 개수로 맞춘다.
//   왜 — 처음 받은 실제 더빙에서 신부 클립의 "지켜봐 주세요." 안에 0.128초 숨이 있었다.
//   SIL_MIN(0.12)이 그보다 낮아 그 숨을 문장 경계로 오인했고, 토막이 2 vs 3 이 되어
//   문장 단위 정렬을 통째로 포기했다(통짜 폴백 → 한쪽이 ×0.86 으로 늘어나 목소리가 변했다).
//   ★고치는 방향은 문턱을 올리는 게 아니다. 문턱은 목소리·감정마다 달라서 다음 녹음에서 또 틀린다.
//     소리에서 문장 경계를 **추정**하지 말고, manifest 가 **이미 아는 문장 수**를 쓴다.
//     짧은 무음부터 도로 이어 붙여, 가장 긴 n-1 개만 문장 경계로 남긴다.
//   ※ n 을 안 주면(또는 토막이 n 보다 적으면) 예전대로 잰 그대로 돌려준다 — 없는 경계를
//     만들어 내지는 않는다. 그건 다시 추정이다.
function segments(f, n) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', `silencedetect=n=${SIL_DB}:d=${SIL_MIN}`, '-f', 'null', '-'], { encoding: 'utf8' });
  const log = String(r.stderr || '');
  const sil = [];
  const re = /silence_start:\s*(-?[\d.]+)[\s\S]*?silence_end:\s*([\d.]+)/g;
  let m; while ((m = re.exec(log))) sil.push([Math.max(0, +m[1]), +m[2]]);
  const total = dur(f);
  const segs = []; let at = 0;
  for (const [a, b] of sil) { if (a - at > 0.05) segs.push([at, a]); at = b; }
  if (total - at > 0.05) segs.push([at, total]);
  // [CHORUS_SEGN] 아는 문장 수까지 줄인다 — 짧은 틈부터 도로 잇는다
  let merged = 0;
  while (n > 0 && segs.length > n) {
    let k = 0, best = Infinity;
    for (let i = 0; i + 1 < segs.length; i++) {
      const gap = segs[i + 1][0] - segs[i][1];
      if (gap < best) { best = gap; k = i; }
    }
    segs.splice(k, 2, [segs[k][0], segs[k + 1][1]]);
    merged++;
  }
  return { segs, total, merged, want: n || 0 };
}
function cut(f, a, b, out) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', f,
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', out]);
}
function stretch(src, out, factor) {
  const f = Math.min(TEMPO_HI, Math.max(TEMPO_LO, factor));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', `atempo=${f.toFixed(5)}`,
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', out]);
  return f;
}
function silence(sec, out) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i',
    `anullsrc=r=48000:cl=mono:d=${Math.max(0.001, sec).toFixed(3)}`, '-c:a', 'pcm_s16le', out]);
}
function concat(files, out, tag) {
  const lst = path.join(TMP, `l${tag}.txt`);
  fs.writeFileSync(lst, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out]);
}

const targets = man.clips.filter((c) => c.mix && (!ONLY || idOf(c) === ONLY));
if (!targets.length) { console.error(`✗ 만들 합창 클립이 없습니다${ONLY ? ` (--clip ${ONLY})` : ''}`); process.exit(1); }

let made = 0, missing = 0, warned = 0;
for (const c of targets) {
  const id = idOf(c);
  const srcs = c.mix.map((s) => {
    const sc = man.clips.find((x) => idOf(x) === s || x.file === s);
    return { id: sc ? idOf(sc) : s, clip: sc, f: mp3Of(sc ? idOf(sc) : s) };
  });
  console.log(`\n── ${id}  ← ${srcs.map((s) => s.id).join(' + ')}`);
  const gone = srcs.filter((s) => !fs.existsSync(s.f));
  if (gone.length) {
    console.log(`   · 재료 없음: ${gone.map((s) => path.relative(root, s.f)).join(' · ')}`);
    console.log(`     → 타입캐스트에서 받아 조립부터 하세요: node scripts/assemble-narration.mjs --in <폴더> --clip ${c.mix.join(',')}`);
    missing++; continue;
  }

  // [CHORUS_SEGN] 두 재료는 같은 문장을 읽은 것이다 — manifest 가 아는 문장 수를 둘 다에 준다
  const want = (c.sents || []).length;
  const A = segments(srcs[0].f, want), B = segments(srcs[1].f, want);
  console.log(`   · 길이  ${srcs[0].id} ${A.total.toFixed(2)}초 (토막 ${A.segs.length})  |  ${srcs[1].id} ${B.total.toFixed(2)}초 (토막 ${B.segs.length})`);
  // [CHORUS_SEGN] 되돌린 자리를 숨기지 않는다 — 말 속 숨을 문장 경계로 오인했던 자리다
  for (const [s2, r] of [[srcs[0], A], [srcs[1], B]])
    if (r.merged) console.log(`   · [CHORUS_SEGN] ${s2.id} 말 속 숨 ${r.merged}군데를 문장 경계에서 뺐습니다 (아는 문장 ${r.want}개에 맞춤)`);

  const lanes = [[], []];        // 두 트랙의 조각 목록
  const tempos = [[], []];
  // ★[CHORUS_LAG 2026-08-04] 문장마다 '속도를 맞추고도 남은 말 길이 차'. 이게 사람이 실제로 듣는 어긋남이다.
  //   아래 '트랙 총길이 차'는 문장 단위 정렬에선 구조적으로 0이 된다(짧은 쪽을 무음으로 채워 맞추니까).
  //   그 0을 '잘 맞았다'로 읽으면, 한쪽이 먼저 끝나고 다른 쪽이 계속 말하는 상태를 놓친다.
  const lags = [];
  let plan;
  if (A.segs.length === B.segs.length && A.segs.length > 0) {
    plan = `문장 단위 정렬 (토막 ${A.segs.length}개)`;
    // ★[CHORUS_SEGN] 둘이 같기만 하면 통과시키면, **둘 다 똑같이 틀린** 경우가 조용히 지나간다.
    //   (문장 2개인데 양쪽 다 토막 1개로 잡히는 식 — 두 문장이 한 덩어리로 붙어 버린다)
    //   아는 문장 수와 다르면 맞춰 놓고도 반드시 말한다. 폴백이 조용하면 버그가 기능처럼 보인다.
    if (want && A.segs.length !== want) {
      plan += ` ★그런데 대본은 ${want}문장입니다 — 두 재료가 똑같이 ${A.segs.length}덩어리로 잡혔습니다. 문장이 붙었는지 꼭 들어 보세요`;
      warned++;
    }
    // 여백은 manifest 가 적어 둔 값을 그대로 쓴다 — 조립기가 두 재료에 같은 값을 넣었으므로 같다
    const gapAt = (i) => {
      const s = c.sents[i];
      const n = c.sents[i + 1];
      return s && n ? +(( s.after || 0) + (n.before || 0)).toFixed(3) : 0.45;
    };
    const head = +(c.head || 0.18).toFixed(3);
    for (let L = 0; L < 2; L++) { const h = path.join(TMP, `h${L}.wav`); silence(head, h); lanes[L].push(h); }
    for (let i = 0; i < A.segs.length; i++) {
      const pa = path.join(TMP, `a${i}.wav`), pb = path.join(TMP, `b${i}.wav`);
      cut(srcs[0].f, A.segs[i][0], A.segs[i][1], pa);
      cut(srcs[1].f, B.segs[i][0], B.segs[i][1], pb);
      const da = dur(pa), db = dur(pb);
      // ★[CHORUS_MEET 2026-08-04] 목표 길이는 '긴 쪽'이 아니라 **가운데**(기하평균)다.
      //   긴 쪽에 맞추면 긴 쪽은 손대지 않고 짧은 쪽만 혼자 늘어난다 — 한 사람의 보정 여유만
      //   쓰고 다른 사람 몫은 통째로 버리는 셈이다. 실제로 서약 합창에서 신랑 0.84초 대
      //   신부 1.64초일 때, 긴 쪽 기준은 0.67초가 남았고 가운데 기준은 0.44초로 줄었다.
      //   ★품질에서도 이쪽이 낫다 — 한 사람을 크게 비트는 대신 두 사람을 조금씩만 비튼다
      //     (보정률이 배율 r 에서 √r 로 준다). 그리고 그게 실제 합창이 맞춰지는 방식이다.
      const target = Math.sqrt(Math.max(da, 0.001) * Math.max(db, 0.001));
      const qa = path.join(TMP, `A${i}.wav`), qb = path.join(TMP, `B${i}.wav`);
      tempos[0].push(stretch(pa, qa, da / target));
      tempos[1].push(stretch(pb, qb, db / target));
      const ea = dur(qa), eb = dur(qb), end = Math.max(ea, eb);
      lags.push(Math.abs(ea - eb));   // [CHORUS_LAG] 무음으로 덮기 전의 진짜 차이
      // 늘리다 만 만큼은 무음으로 채워 두 트랙의 다음 문장 시작점을 같게 만든다
      for (const [L, e, q] of [[0, ea, qa], [1, eb, qb]]) {
        lanes[L].push(q);
        if (end - e > 0.005) { const pad = path.join(TMP, `p${L}_${i}.wav`); silence(end - e, pad); lanes[L].push(pad); }
      }
      const g = i + 1 < A.segs.length ? gapAt(i) : 0;
      if (g > 0) for (let L = 0; L < 2; L++) { const gp = path.join(TMP, `g${L}_${i}.wav`); silence(g, gp); lanes[L].push(gp); }
    }
  } else {
    plan = `★통짜 정렬로 물러섬 — 토막 수가 다르다(${A.segs.length} vs ${B.segs.length}). 문장별로 못 맞춘다`;
    warned++;
    const target = Math.max(A.total, B.total);
    for (let L = 0; L < 2; L++) {
      const q = path.join(TMP, `w${L}.wav`);
      const src = path.join(TMP, `r${L}.wav`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', srcs[L].f, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', src]);
      tempos[L].push(stretch(src, q, (L ? B.total : A.total) / target));
      lanes[L].push(q);
    }
  }
  console.log(`   · ${plan}`);

  const t0 = path.join(TMP, 't0.wav'), t1 = path.join(TMP, 't1.wav');
  concat(lanes[0], t0, '0'); concat(lanes[1], t1, '1');
  const d0 = dur(t0), d1 = dur(t1);
  const drift = Math.abs(d0 - d1);
  const rng = (a) => a.length ? `${Math.min(...a).toFixed(3)}~${Math.max(...a).toFixed(3)}` : '—';
  console.log(`   · 정렬 후  ${d0.toFixed(2)}초 · ${d1.toFixed(2)}초  (트랙 총길이 차 ${drift.toFixed(3)}초)`);
  if (lags.length) {
    const sum = lags.reduce((x, y) => x + y, 0), mx = Math.max(...lags);
    console.log(`   · [CHORUS_LAG] 말이 어긋난 양  문장별 최대 ${mx.toFixed(3)}초 · 합 ${sum.toFixed(3)}초  ← 사람이 실제로 듣는 건 이 값이다`);
    if (mx > 0.30) { console.log(`   ★ 한 문장이 ${mx.toFixed(2)}초 어긋납니다 — 한쪽이 먼저 끝나고 다른 쪽이 계속 말합니다.`);
                     console.log(`     속도 한계(${TEMPO_LO}~${TEMPO_HI}) 밖이라 더는 못 맞춥니다. 두 성우의 낭독 속도를 맞춰 다시 받는 편이 낫습니다.`); warned++; }
  }
  console.log(`   · 속도 보정  ${srcs[0].id} ×${rng(tempos[0])}  |  ${srcs[1].id} ×${rng(tempos[1])}`);
  if (drift > 0.25) { console.log(`   ★ 어긋남이 0.25초를 넘습니다 — 겹쳐 들릴 수 있어요. 합창 문장을 더 짧게 줄이는 편이 낫습니다.`); warned++; }
  if (tempos.some((t) => t.some((x) => x <= TEMPO_LO + 1e-6 || x >= TEMPO_HI - 1e-6))) {
    console.log(`   ★ 속도 보정이 한계(${TEMPO_LO}~${TEMPO_HI})에 닿았습니다 — 두 재료의 낭독 속도 차가 큽니다. 목소리가 변했는지 꼭 들어 보세요.`); warned++;
  }

  if (DRY) { console.log('   · --dry 라 만들지 않았습니다'); continue; }
  const dst = mp3Of(id);
  const total = Math.max(d0, d1) + STAGGER;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', t0, '-i', t1,
    '-filter_complex',
    `[1:a]adelay=${Math.round(STAGGER * 1000)}|${Math.round(STAGGER * 1000)}[b];` +
    `[0:a][b]amix=inputs=2:duration=longest:normalize=0,volume=${MIXVOL},alimiter=limit=0.95,` +
    `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.015,afade=t=out:st=${Math.max(0, total - 0.04).toFixed(3)}:d=0.04[out]`,
    '-map', '[out]', '-ar', '48000', '-b:a', '192k', dst]);
  console.log(`   ✓ ${path.relative(root, dst)}  ${dur(dst).toFixed(2)}초  (엇박 ${(STAGGER * 1000).toFixed(0)}ms)`);
  made++;
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${made}개 생성 · 재료 없음 ${missing} · 살펴볼 것 ${warned}`);
console.log('★소리의 최종 판정은 사람 귀 몫입니다 — 두 목소리가 한 사람처럼 붙어 들리는지 꼭 들어 보세요.');
if (missing) process.exit(1);
