// 고객용 미리듣기 스킨 실렌더 검증 [GUEST_SKIN_RENDER]
//   1) 저장소 루트에서 정적 서버를 띄운다:  python3 -m http.server 8765
//   2) node scripts/check-guest-skin.mjs         → 6조합 × 390/1280 (푸시 전엔 이걸 돌린다)
//      node scripts/check-guest-skin.mjs quick   → 2조합 × 390 · 배지 전수 단정은 건너뜀
//
// ★merge-guard 는 이걸 자동으로 돌리지 않는다 — 브라우저와 로컬 서버가 필요해서다.
//   화면(console.html · ritual-story.js · ritual-cue.js)을 고쳤으면 푸시 전에 손으로 한 번 돌린다.
//
// ★왜 조합을 쓸어야 하나
//   디렉터 문구 누출은 '어느 화면에 무엇이 뜨느냐'의 문제다. 코스·옵션이 바뀌면 뜨는 큐가 통째로
//   바뀌므로, 한 조합만 보고 "누출 0"이라 말하면 나머지를 안 본 것이다.
//   특히 own:(두 분 목소리) 경로는 기본 S 로는 단 한 큐도 타지 않는다.
//
// ★가상시계 — 13분짜리 미리듣기를 실시간으로 기다릴 수 없다. Date.now 와 타이머 지연을
//   같은 배수 K 로 묶어 빠르게 돌린다(둘을 따로 건드리면 시계와 타이머가 서로 어긋난다).
//
// ★수집이 0인 검사는 '통과'가 아니라 '안 본 것'이다 — 스냅 수를 항상 찍고, 너무 적으면 실패시킨다.
//   (2026-08-02 실사고: MutationObserver 를 body 없이 붙여 터졌는데 "누출 0"이 떴다)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
/* ★★[PW_FIND 2026-08-09] playwright 를 찾는 자리를 넓힌다 — 옛 판은 한 곳(`/home/claude/.npm-global/...`)을
   박아 두어, 그 경로가 아닌 세션에서는 **조용히 SKIP 하고 exit 0** 이었다.
   실측: 이 검사가 지키는 GUEST_CTL_EMPTY(고객 화면에 디렉터 도구가 새는지)가
   다른 세션에서는 한 번도 돌지 않은 채 초록이었다. merge-guard 도 이 파일은 실행하지 않는다(브라우저 필요).
   → 검사가 있다는 것과 검사가 돈다는 것은 다르다. `npm root -g` 로 실제 자리를 묻는다.
   ★그래도 없으면 '안 쟀다'고 밝히고 넘어간다 — SYL_RATE 와 같은 모양이다.
     '없으면 통과'가 아니라 '없으면 안 쟀다고 말하기'. */
let chromium;
{
  let g = '';
  try { g = (await import('node:child_process')).execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* npm 이 없을 수도 */ }
  const tries = [process.env.PW, 'playwright', 'playwright-core',
    g && `${g}/playwright/index.js`, '/home/claude/.npm-global/lib/node_modules/playwright/index.js',
    '/usr/lib/node_modules/playwright/index.js'].filter(Boolean);
  for (const t of tries) {
    try { chromium = require(t).chromium; break; } catch { /* 다음 */ }
    try { const m = await import(t); chromium = (m.default ?? m).chromium; if (chromium) break; } catch { /* 다음 */ }
  }
  if (!chromium) {
    console.log('· playwright 를 못 찾아 이 검사는 이번에 아무것도 재지 않았습니다 (npm i -g playwright)');
    process.exit(0);
  }
}

const K = 40;
const CLOCK = `(() => {
  const K = ${K}, realNow = Date.now.bind(Date), t0 = realNow();
  Date.now = () => t0 + (realNow() - t0) * K;
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (f, d) => st(f, Math.max(0, (d||0)/K));
  window.setInterval = (f, d) => si(f, Math.max(4, (d||0)/K));
})();`;

// ★addInitScript 는 document.body 보다 먼저 돈다 — body 를 그냥 잡으면 터지고,
//   그러면 수집이 0인 채로 "누출 0"이 나온다(수집 0은 통과가 아니라 안 본 것이다).
const SNAP = `(() => {
  window.__snaps = []; window.__pills = [];
  const start = () => {
    const grab = () => {
      const r = document.querySelector('#run');
      if (!r || !r.classList.contains('on')) return;
      const t = r.innerText.replace(/[ \\t]+\\n/g,'\\n').trim();
      const a = window.__snaps;
      if (!a.length || a[a.length-1] !== t) a.push(t);
      document.querySelectorAll('#nTag .pill').forEach(p => {
        const s = p.textContent.trim();
        if (s && window.__pills.indexOf(s) < 0) window.__pills.push(s);
      });
    };
    new MutationObserver(grab).observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true});
    setInterval(grab, 25);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();`;

// 이름 · 정규식. 이름은 사람이 읽는 말, 정규식은 기계가 보는 말.
const FORBID = [
  ['전각 줄표(문구 규칙)','—'],
  ['디렉터','디렉터'],['핸드마이크','핸드마이크'],['막히면','막히면'],['녹음 없음','녹음 없음'],
  ['문안 자동 교체','문안 자동 교체'],['문안 카드','문안 카드'],['길어짐 대응','길어짐 대응'],
  // ★fireLabel() 출력만 잡는다 — 이 셋은 뒤에 반드시 ' · '가 붙는다(console.html up()).
  //   낱말 자체를 막으면 "이어서 함께 건배해요" 같은 멀쩡한 장면 지문이 걸려, 검사가 늑대를 부른다.
  ['발사방식 손으로','손으로 ·'],['발사방식 이어서','이어서 ·'],['발사방식 시각에','시각에 ·'],
  // 디렉터 배지(console.html:875)만. 고객 선택지 라벨 '두 분 목소리로 녹음'은 정상 문구다
  ['디렉터 배지 두 분 목소리','^두 분 목소리$'],
  ['클립번호 N번','[0-9]+번'],['큐','큐'],['대기 클립','대기 클립'],['전체 정지','전체 정지'],['되돌','되돌'],
  ['지금 바로','지금 바로'],['기다리지 않고','기다리지 않고'],
  // 장면 레이어가 큐를 못 찾으면 화면이 비거나 키 원문이 새어 나온다
  ['화살표(내부 동선 표기)','→'],
];

/* ★PREVIEW_BED — 배경 음악 고지 줄이 '한 번이라도' 섰는지 본다.
   끝나면 음악이 pause 되면서 줄도 내려가므로, 마지막 한 장면만 보면 늘 false 로 읽힌다. */
const BED = `(() => {
  window.__bedOn = false;
  const wire = () => {
    const el = document.querySelector('#gBed');
    if (!el) return false;
    const see = () => { if (el.classList.contains('on')) window.__bedOn = true; };
    new MutationObserver(see).observe(el, { attributes: true, attributeFilter: ['class'] });
    see();
    return true;
  };
  if (!wire()) document.addEventListener('DOMContentLoaded', wire);
})();`;

/* ★기대값을 파일 존재로 정한다 — 곡을 놓는 날 검사가 저절로 반대편을 보게 된다.
   (곡이 없는 지금은 "소리가 없으면 그 줄도 서지 않는다"를 지킨다 — 안 나는 소리를 설명하면 거짓말이다) */
const BED_FILE = fs.existsSync(path.join(ROOT, 'assets', 'narration', 'preview-bed.mp3'));

const SNAPDIR = process.env.GUEST_SNAP_DIR || '/tmp/guest-skin';
fs.mkdirSync(SNAPDIR, { recursive: true });
const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
const BASE = 'http://localhost:8765/console.html?mode=preview&embed=1';

// ★기본 S 로는 own: 경로가 한 큐도 안 걸린다 — 두 분 목소리 조합을 반드시 따로 돈다
const COMBOS = [
  ['A 담백 기본',   null],
  ['B 담백 두분목소리', {course:'damback', guestVoice:'couple', entryVoice:'couple'}],
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  ['C 감동 풀옵션', {course:'gamdong', entry:'D', declareWho:'family', letter:'both', bless:'on', valley:'wine', guestVoice:'couple', entryVoice:'couple', digital:true}],
  ['D 가족',        {course:'family', entry:'B', declareWho:'ask', letter:'each', bless:'on', valley:'cake'}],
  ['E 미니멀',      {course:'minimal', entry:'F', declareWho:'chorus'}],
  ['F 축하',        {course:'festive', entry:'C', letter:'both', valley:'cake', guestVoice:'couple'}],
];
const QUICK = process.argv[2] === 'quick';
const RUNS = QUICK ? COMBOS.slice(0, 2) : COMBOS;
const SIZES = QUICK ? [[390,844,'m']] : [[390,844,'m'],[1280,860,'d']];

let bad = 0;
const pillsAll = new Set();

// ★서버가 없으면 조용히 통과시키지 않는다 — 안 본 것을 통과로 세면 검사가 거짓말을 시작한다
try {
  const r = await fetch(BASE, { method: 'GET' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
} catch (e) {
  console.log(`✗ 로컬 서버에 못 붙었습니다(${String(e.message || e)}).`);
  console.log('  저장소 루트에서 `python3 -m http.server 8765` 를 띄운 뒤 다시 실행하세요.');
  process.exit(1);
}

for (const [w, h, tag] of SIZES) {
  const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--mute-audio']});
  for (const [label, S] of RUNS) {
    const url = BASE + (S ? '&S=' + encodeURIComponent(b64(S)) : '');
    const p = await b.newPage({viewport:{width:w, height:h}});
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => { if (m.type()==='error' && !/404|Failed to load resource/.test(m.text())) errs.push('console:'+m.text()); });
    await p.addInitScript(CLOCK); await p.addInitScript(SNAP); await p.addInitScript(BED);
    await p.goto(url, {waitUntil:'networkidle'});
    await p.waitForTimeout(400);
    const intro = await p.evaluate(() => document.querySelector('#gIntro').innerText.trim());
    const slug = tag + '-' + label.slice(0,1);
    if (tag === 'm') await p.screenshot({path:path.join(SNAPDIR, `${slug}-1-intro.png`)});
    await p.click('#giGo');
    await p.waitForTimeout(900);
    let ended = false;
    for (let i=0;i<140;i++){
      await p.waitForTimeout(350);
      ended = await p.evaluate(() => /다 들으셨어요/.test(document.querySelector('#nName').textContent));
      if (ended) break;
    }
    if (tag === 'm') await p.screenshot({path:path.join(SNAPDIR, `${slug}-4-end.png`)});
    const snaps = await p.evaluate(() => window.__snaps);
    const pills = await p.evaluate(() => window.__pills);
    const bedOn = await p.evaluate(() => window.__bedOn);   // ★PREVIEW_BED
    /* ★★[GUEST_CTL_EMPTY 2026-08-09] 조작부에 고객이 볼 것은 「다음 순서로」 하나뿐이다.
       왜 글자 블랙리스트로는 못 잡았나 — 위 FORBID 는 **미리 적어 둔 낱말**을 찾는다.
       2026-08-08 에 촬영 안내 판(#pcBoard)이 조작부에 새로 생겼는데, 그 판의 글자
       (「촬영 안내 골라 틀기」)는 아무 목록에도 없었다. 그래서 고객 미리듣기 맨 아래에
       **검은 막대**로 서 있는 채 검사는 전부 초록이었다(390px 실렌더로 사용자가 발견).
       ★그래서 낱말이 아니라 **구조**를 본다 — 조작부에 mBtn 말고 무엇이든 보이면 실패다.
         앞으로 디렉터 도구가 또 늘어도, 목록을 고치지 않아도 여기서 걸린다.
         '감출 것을 손으로 적는 명단'은 새로 생기는 것을 영영 못 본다. */
    const ctlLeak = await p.evaluate(() => {
      const inner = document.querySelector('.ctl .inner');
      if (!inner) return ['조작부(.ctl .inner)를 못 찾았습니다 — 화면 구조가 바뀌었습니다(통과 아님)'];
      const out = [];
      const walk = (el) => {
        for (const c of el.children) {
          if (c.id === 'mBtn') continue;
          const r = c.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;                 // 안 보이면 통과
          if (c.children.length && c.tagName !== 'DETAILS') { walk(c); continue; }   // 껍데기는 지나가고 실물만 짚는다
          out.push(c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).trim().split(/\s+/).join('.') : ''));
        }
      };
      walk(inner);
      return out;
    });
    await p.close();

    pills.forEach(x => pillsAll.add(x));
    const all = [intro, ...snaps].join('\n@@@\n');
    fs.writeFileSync(path.join(SNAPDIR, `${slug}-snaps.txt`), all);

    const hits = FORBID.filter(([,re]) => new RegExp(re, 'm').test(all)).map(([n,re]) => {
      const m = all.match(new RegExp('.{0,45}'+re+'.{0,45}', 'm'));
      return n+' → …'+(m?m[0].replace(/\n/g,'⏎'):'')+'…';
    });
    // 수집 0 = 안 본 것. 통과로 세지 않는다.
    if (snaps.length < 5) { hits.push(`수집 ${snaps.length}개 — 화면을 못 봤습니다(통과 아님)`); }
    // ★GUEST_CTL_EMPTY — 조작부에 「다음 순서로」 말고 보이는 것이 있으면 디렉터 도구가 샌 것이다
    if (ctlLeak.length) hits.push('조작부에 디렉터 도구가 보입니다 → ' + ctlLeak.join(' , '));
    // ★PREVIEW_BED — 소리와 고지가 같이 가야 한다. 어긋나면 화면이 거짓말을 한 것이다.
    if (bedOn !== BED_FILE) {
      hits.push(BED_FILE
        ? '배경 음악 파일은 있는데 고지 줄이 한 번도 안 섰습니다(고객이 곡을 당일 곡으로 오해한다)'
        : '배경 음악 파일이 없는데 고지 줄이 섰습니다(안 나는 소리를 설명하고 있다)');
    }
    if (hits.length || errs.length || !ended) bad = 1;
    console.log(`${tag}${w} ${label.padEnd(16)} 완주=${String(ended).padEnd(5)} 스냅 ${String(snaps.length).padStart(3)} 배지 ${String(pills.length).padStart(2)} JS오류 ${errs.length} ${hits.length ? '✗ LEAK '+hits.length : '✓'}`);
    if (errs.length) console.log('    ERR ' + errs.slice(0,3).join('\n    ERR '));
    hits.forEach(x => console.log('    ' + x));
  }
  await b.close();
}

console.log('\n── 배경 음악 [PREVIEW_BED] — preview-bed.mp3 ' + (BED_FILE ? '있음 → 고지 줄이 서야 한다' : '없음 → 무음 · 고지 줄도 서지 않아야 한다'));
console.log('\n── 화면에 실제로 뜬 배지 ' + pillsAll.size + '종');
[...pillsAll].sort().forEach(x => console.log('   · ' + x));

// ★배지 ① 정확성 — 두 사람이 말하는 자리에서 첫 사람만 남으면 화면이 나머지를 지운다
/* ★이 단정은 '전 조합을 다 돌았을 때'만 성립한다 — quick 은 A·B(담백) 두 조합만 도는데
   담백 기본은 bless:'off' 라 부모님 덕담 큐가 아예 안 나온다. 전수 단정을 부분 실행에 걸면
   멀쩡한 화면에 대고 검사가 늑대를 부르고, 그러면 사람이 검사를 안 믿게 된다.
   그래서 quick 에서는 '안 본 것'이라고 말할 뿐 실패시키지 않는다. */
const pj = [...pillsAll].join('\n');
if (QUICK) {
  console.log('  · 배지 ① 전수 단정은 건너뜁니다(quick = A·B 담백 2조합 · 덕담·편지 큐가 안 나옴).');
  console.log('    푸시 전에는 인자 없이 한 번 돌려 6조합을 전부 확인하세요.');
} else {
  /* ★[BADGE_PAIR_MOVED 2026-08-03] 합쳐진 문구(「두 분이 직접 말해요」·「부모님이 직접
     말씀하세요」)를 여기 DOM 스윕에서 찾던 단정을 걷어냈다. 배역 15클립이 실제로 놓이고 나니
     **영영 못 찾는 단정**이 됐기 때문이다 — 그 자리에 음원이 있으면 큐가 시작되는 순간부터
     castNow 가 잡혀서, 화면은 처음부터 「신랑님이 직접 말해요」→「신부님이…」로 번갈아 뜬다.
     합쳐진 문구가 뜰 '재생 전' 창이 아예 없다. 음원이 없던 시절에만 뜨던 문구를 계속 찾으면,
     멀쩡한 화면에 대고 검사가 늑대를 부르고 사람이 검사를 안 믿게 된다.
     합쳐진 문구 자체는 사라지지 않았다 — scripts/build-course-story.mjs 의 CAST_COVER 가
     전 코스·전 자리(16/16)를 돌며 배지 6종을 뽑아 두 문구를 **전수로** 확인한다. 규칙은 거기 산다.
     여기 DOM 검사에는 화면만 답할 수 있는 것을 남긴다 — 원래 걱정이 「화면이 나머지 한 사람을
     지운다」였으니, 두 사람이 말하는 자리에서 **두 이름이 다 불렸는지**를 본다. */
  const need = [
    ['신랑 이름이 불림', /당일엔 신랑님이 직접 말해요/],
    ['신부 이름이 불림 — 두 사람 자리에서 한쪽이 지워지지 않았다', /당일엔 신부님이 직접 말해요/],
    ['아버님 이름이 불림', /당일엔 아버님이 직접 말씀하세요/],
    ['어머님 이름이 불림 — 덕담 자리에서 한쪽이 지워지지 않았다', /당일엔 어머님이 직접 말씀하세요/],
    ['녹음 자리 문구 보존(own:)', /녹음한 목소리가 나가요/],
  ];
  let miss = 0;
  need.forEach(([n, re]) => { if (!re.test(pj)) { miss = 1; console.log('  ✗ 안 뜸: ' + n); } });
  /* ★한 사람 배지(신랑님·아버님…)가 화면에 뜨는 것 자체는 정상이다 —
     그 예시 음성이 '지금 흐르는 동안'은 castNow 가 그 사람의 배지를 띄운다(누구 목소리인지 알려야 한다).
     문제는 '재생 전' 자리 배지가 첫 사람만 쓰는 경우인데, 그건 DOM 만 봐서는 둘을 못 가른다.
     그래서 그 판정은 scripts/build-course-story.mjs 의 CAST_COVER 가 전 조합에서 직접 한다. */
  if (miss) bad = 1; else console.log('  ✓ 배지 ① 문구 정확 — 두 사람 자리에서 두 이름이 다 불렸고 녹음 자리는 그대로'
    + '\n    (합쳐진 문구 「두 분이 직접 말해요」·「부모님이 직접 말씀하세요」는 build-course-story.mjs CAST_COVER 가 전수로 봅니다)');
}

console.log(bad ? '\n✗ 검증 실패' : (QUICK ? '\n✓ 빠른 확인 통과 — 전수는 아닙니다(인자 없이 한 번 더)' : '\n✓ 전 조합 실렌더 통과'));
process.exit(bad);

