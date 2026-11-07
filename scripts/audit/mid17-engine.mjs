#!/usr/bin/env node
/* ★[기록 · merge-guard 에서 뺌 · MID17_NAR_1107] 11/07 14:21 임시판(58 → 129) 검사 — «사장님 결정»이 아니었다(129 는 식전 영상 문장 · 반려) · 새 판 검사는 mid17-nar.mjs
   ★★[MID17_ENGINE 2026-11-07 임시 · 식중 영상 · 계획 docs/handoff/midvideo-17.md 줄 3 · 4 · 6] 엔진 58 + 129 · 전체 대본 · 연습
   ① 엔진(node) — 식중 영상(준비한 순서 · 영상 갈래) 날 큐 = 58 여는 말(사람 순간 없음) → 129 «한 장면씩 …»(사슬 1.25초 · 영상 사람 순간 60 × 분 + 8 · [재생 안 됨]) ·
       같은 날 식전 영상 소개가 129(스튜디오 판 · pvEx 2)면 58 하나에 영상 · 두 분 목소리 판 식전 소개(90 자리)는 129 가 아니라 두 줄 ·
       블록 «식중 영상» · 큐 이름 «식중 영상 시작 · n분» · 축사 · 선물 · 기타 · 옛 코스 그대로 · 디지털 참석 날도 같은 큐 · 130 · 261 은 이 자리에 없다 · 새 녹음 0(두 슬러그 다 소리 파일이 있다)
   ② 화면(Playwright 390 · 360) — 미리 듣기 · 연습 줄(58 «시작할 때» → 129 «이어서» → «식중 영상이 흐르는 자리») · 연습 카드 «여기서 식중 영상이 흘러요 · 약 n분 · 연습에서는 넘겨요» ·
       전체 대본(scriptTextOpen) 식중 영상 자리 = 58 · 129 줄 → (영상 약 n분) · 129 겹친 날 58 만 · 축사 날은 129 · «식중 영상» 없음 · 연습 재생 목록(_prQ)에 58 · 129 소리 두 줄 · pageerror 0
   --selftest — 옛 동작(58 하나에 영상 · 겹친 날 두 줄 · 블록 «준비한 순서» · 대본에 129 없음)을 빨강으로 읽는지 본다
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음 — 엔진 검사는 돈다) */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const SELF = process.argv.includes('--selftest');
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500)}`); if (!c) fail++; return !!c; };

const S58 = 'narr-free-in', S129 = 'narr-prevideo-in-ex3';
const base = (x) => Object.assign({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'video', freeLen: '4' }, x || {});
const frees = (S, mode) => C.build(C.norm(JSON.parse(JSON.stringify(S))), { mode: mode || 'console' }).cues.filter((c) => c.k === 'free');

/* ── 판정(검사 · 깨 보기가 같은 함수를 쓴다) ── */
function twoLine(fs_, len) {   // 식중 영상 날 = 58 → 129 → 영상
  const [a, b] = fs_;
  return fs_.length === 2 && a.slug === S58 && !a.live && !a.rescue && a.blockN === '식중 영상' && a.name === '식중 영상 시작 · ' + len + '분'
    && b.slug === S129 && b.blockN === '식중 영상' && b.fire === 'chain' && b.gapMs === 1250 && b.duck === a.duck
    && !!b.live && b.live.est === 60 * len + 8 && b.live.doing === 'watch' && !!b.rescue && b.rescue.slug === '';
}
function oneLine(fs_, len) {   // 식전 영상 소개가 129 인 날 = 58 하나에 영상
  const [a] = fs_;
  return fs_.length === 1 && a.slug === S58 && a.blockN === '식중 영상' && a.name === '식중 영상 시작 · ' + len + '분' && !!a.live && a.live.est === 60 * len + 8 && !!a.rescue;
}
function scriptOk(sec, len, two) {   // 전체 대본의 식중 영상 자리(머리 줄 ~ 다음 빈 줄)
  const i58 = sec.indexOf('다음은 오늘 예식에서 두 사람이 가장 마음을 쏟아 준비한 순서입니다.'), i129 = sec.indexOf('한 장면씩 여러분의 마음에도 남겨 보시길 바랍니다.'), iv = sec.indexOf('(여기서 식중 영상이 흘러요 · 약 ' + len + '분)');
  return i58 > -1 && iv > i58 && (two ? (i129 > i58 && iv > i129) : i129 < 0) && !/미리 듣기에서는 넘겨요|연습에서는 넘겨요/.test(sec);
}

/* ── ① 엔진 ── */
function engine(src) {
  const r = {};
  r.video = src.frees(base());
  r.video1 = src.frees(base({ freeLen: '1' }));
  r.video10 = src.frees(base({ freeLen: '10' }));
  r.pv129 = src.frees(base({ on: { prevideo: 1, bless: 1, free: 1, song: 1 }, pvEx: 2 }));
  r.pv128 = src.frees(base({ on: { prevideo: 1, bless: 1, free: 1, song: 1 }, pvEx: 1 }));
  r.pv90 = src.frees(base({ on: { prevideo: 1, bless: 1, free: 1, song: 1 }, pvEx: 0 }));
  r.pvOwn = src.frees(base({ on: { prevideo: 1, bless: 1, free: 1, song: 1 }, pvEx: 2, pvVoice: 'couple' }));
  r.ex2NoPv = src.frees(base({ pvEx: 2 }));   // 식전 영상을 안 담은 날의 pvEx 는 아무것도 아니다
  r.digital = src.frees(base({ digital: true }));
  r.digital129 = src.frees(base({ digital: true, on: { prevideo: 1, bless: 1, free: 1, song: 1 }, pvEx: 2 }));
  r.preview = src.frees(base(), 'preview');
  r.speech = src.frees(base({ freeWhat: 'speech' }));
  r.gift = src.frees(base({ freeWhat: 'gift' }));
  r.etc = src.frees(base({ freeWhat: 'etc', freeEtc: '형제 깜짝 영상편지' }));
  r.old = src.frees({ course: 'record', extra: { free: 1 } });   // 옛 코스(기록 · 자유 한 칸을 고른 옛 초안)
  return r;
}
function judgeEngine(r) {
  let bad = 0; const t = (m, c, d) => { if (!ok(m, c, d)) bad++; };
  const brief = (fs_) => fs_.map((c) => [c.slug, c.blockN, c.name, c.fire, c.gapMs, c.live && c.live.est, !!c.rescue]);
  t('식중 영상 날 = 58(사람 순간 없음) → 129(사슬 1.25초 · 크기 같음 · 영상 60 × 4 + 8 · [재생 안 됨]) · 블록 «식중 영상» · 이름 «식중 영상 시작 · 4분»', twoLine(r.video, 4), brief(r.video));
  t('길이 1 · 10분도 같은 꼴(영상 68 · 608초)', twoLine(r.video1, 1) && twoLine(r.video10, 10), [brief(r.video1), brief(r.video10)]);
  t('같은 날 식전 영상 소개가 129(pvEx 2 · 스튜디오 판) = 58 하나에 영상(같은 말 두 번 금지)', oneLine(r.pv129, 4), brief(r.pv129));
  t('식전 영상 소개가 128 · 90 인 날 · 두 분 목소리 판(90 자리) · 식전 영상을 안 담은 날의 pvEx 2 = 두 줄', twoLine(r.pv128, 4) && twoLine(r.pv90, 4) && twoLine(r.pvOwn, 4) && twoLine(r.ex2NoPv, 4), [brief(r.pv128), brief(r.pvOwn), brief(r.ex2NoPv)]);
  t('디지털 참석 날도 같은 큐(두 줄 · 129 겹친 날 한 줄)', twoLine(r.digital, 4) && oneLine(r.digital129, 4), [brief(r.digital), brief(r.digital129)]);
  t('미리 듣기 빌드도 58 → 129(사슬 1.25초)', r.preview.length === 2 && r.preview[0].slug === S58 && r.preview[1].slug === S129 && r.preview[1].gapMs === 1250, brief(r.preview));
  t('축사 갈래는 그대로(103 여는 말 · 블록 «축사» · 129 없음)', r.speech.length >= 1 && r.speech[0].slug === 'narr-free-in-speech' && r.speech.every((c) => c.blockN === '축사' && c.slug !== S129), brief(r.speech));
  t('선물 · 기타(옛 초안)는 그대로(58 하나 · 블록 «준비한 순서» · 129 없음)', [r.gift, r.etc].every((fs_) => fs_.length === 1 && fs_[0].slug === S58 && fs_[0].blockN === '준비한 순서' && /^준비한 순서 시작 · /.test(fs_[0].name) && !!fs_[0].live), [brief(r.gift), brief(r.etc)]);
  t('옛 코스 자유 한 칸 그대로(58 · 59 · 블록 «자유 한 칸»)', r.old.length === 2 && r.old[0].slug === S58 && r.old[1].slug === 'narr-free-out' && r.old.every((c) => c.blockN === '자유 한 칸'), brief(r.old));
  const all = [].concat(r.video, r.pv129, r.pv128, r.pvOwn, r.digital, r.speech, r.gift, r.etc);
  t('이 자리에 130(시선 명령 [B2_GEUL_01]) · 261(식전 영상 받는 말)은 없다', all.every((c) => !/^narr-prevideo-in-ex4$|^narr-prevideo-out$/.test(c.slug || '')), all.map((c) => c.slug));
  return bad;
}
const live = { frees };
if (!SELF) {
  judgeEngine(engine(live));
  const files = C.FILES || [];
  const has = (sl) => fs.existsSync(path.join(ROOT, 'assets/audio/narration', `${C.noOf ? C.noOf(sl) : ''}_${sl}.mp3`)) || fs.readdirSync(path.join(ROOT, 'assets/audio/narration')).some((f) => new RegExp(`^\\d+_${sl}\\.mp3$`).test(f));
  ok('새 녹음 0 — 58 · 129 소리 파일이 있다', has(S58) && has(S129), [has(S58), has(S129), files.length]);
}

/* ── ② 화면 ── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
async function screen(width) {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  const port = +(process.env.PORT || 0);
  await new Promise((r) => srv.listen(port, '127.0.0.1', r)); const p0 = srv.address().port;
  const br = await pw.chromium.launch();
  try {
    const pg = await br.newPage({ viewport: { width, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + p0) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${p0}/order-preview.html`, { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 900));
    const out = await pg.evaluate(async () => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms)), o = {};
      const sec = (txt) => { const L = txt.split('\n'), i = L.findIndex((l) => /^\d+\. (식중 영상|준비한 순서|축사)/.test(l)); if (i < 0) return ''; const j = L.indexOf('', i); return L.slice(i, j < 0 ? L.length : j).join('\n'); };
      const put = (x) => { R.applyExample(S, 'standard'); S.on = S.on || {}; Object.assign(S, x.s || {}); Object.keys(x.on || {}).forEach((k) => { S.on[k] = x.on[k]; }); try { opSync(); } catch (e) {} buildSteps(); };
      const step = (k) => { idx = STEPS.findIndex((x) => x.k === k); render(); };
      const row = (x) => ({ lab: x.lab, slab: x.slab, txt: x.txt, src: !!x.src, skip: !!x.skip, slug: x.slug || '' });
      const run = async (name, x) => { put(x); step('listen'); await w(200); const r = {}; r.listen = _lSteps(ENG, ['free']).map(row); step('practice'); await w(200); r.practice = _lSteps(ENG, ['free']).map(row);
        r.prq = _prQ(['free']).filter((y) => y.src).map((y) => y.slug || y.file || ''); r.script = sec(scriptTextOpen()); o[name] = r; };
      await run('video', { on: { free: 1 }, s: { freeWhat: 'video', freeLen: '4', pvEx: 0 } });
      await run('pv129', { on: { free: 1, prevideo: 1 }, s: { freeWhat: 'video', freeLen: '4', pvEx: 2, pvVoice: 'nar' } });
      await run('speech', { on: { free: 1 }, s: { freeWhat: 'speech', freeLen: '3' } });
      return o; });
    return { out, errs };
  } finally { await br.close(); srv.close(); }
}
function judgeScreen(o, errs, width) {
  let bad = 0; const t = (m, c, d) => { if (!ok(`${width} ${m}`, c, d)) bad++; };
  const v = o.video, p = o.pv129, s = o.speech;
  const nar = (L) => L.filter((x) => !x.skip);
  t('미리 듣기 줄 = 58 «시작할 때» → 129 «이어서» → «식중 영상이 흐르는 자리»(… 미리 듣기에서는 넘겨요)', nar(v.listen).length === 2 && v.listen[0].slab === '여는 말' && v.listen[0].lab === '시작할 때' && v.listen[0].src && v.listen[1].lab === '이어서' && /^한 장면씩/.test(v.listen[1].txt) && v.listen[1].src
    && v.listen[2] && v.listen[2].skip && v.listen[2].lab === '식중 영상이 흐르는 자리' && v.listen[2].txt === '여기서 식중 영상이 흘러요 · 약 4분 · 미리 듣기에서는 넘겨요', v.listen);
  t('연습 카드 «여기서 식중 영상이 흘러요 · 약 4분 · 연습에서는 넘겨요» · 58 · 129 소리 두 줄 다 연습 재생 목록에', v.practice.some((x) => x.skip && x.lab === '식중 영상이 흐르는 자리' && x.txt === '여기서 식중 영상이 흘러요 · 약 4분 · 연습에서는 넘겨요') && v.prq.length === 2 && v.prq[0] === 'narr-free-in' && v.prq[1] === 'narr-prevideo-in-ex3', [v.practice, v.prq]);
  t('전체 대본 식중 영상 자리 = 58 → 129 → (여기서 식중 영상이 흘러요 · 약 4분)', scriptOk(v.script, 4, true), v.script);
  t('식전 영상 소개가 129 인 날 — 줄 · 연습 · 대본에 58 만(영상 카드는 그대로)', scriptOk(p.script, 4, false) && nar(p.listen).length === 1 && p.prq.length === 1 && p.listen.some((x) => x.skip && x.lab === '식중 영상이 흐르는 자리'), [p.script, p.prq]);
  t('축사 날 — 129 · «식중 영상» 없음(축사 줄과 겹치지 않는다)', !/한 장면씩|식중 영상/.test(s.script + JSON.stringify(s.listen)) && /축사/.test(s.script), s.script);
  t('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  return bad;
}

if (SELF) {
  /* 깨 보기 — 옛 동작을 그대로 만들어 판정에 넣는다(빨강이어야 산 검사다) */
  const quiet = (fn) => { const lg = console.log; console.log = () => {}; try { return fn(); } finally { console.log = lg; } };
  const merge = (fs_) => { if (fs_.length !== 2 || fs_[1].slug !== S129) return fs_; const a = Object.assign({}, fs_[0], { live: fs_[1].live, rescue: fs_[1].rescue }); return [a]; };   // 옛 꼴: 58 하나에 영상
  const oldBlock = (fs_) => fs_.map((c) => Object.assign({}, c, { blockN: c.blockN === '식중 영상' ? '준비한 순서' : c.blockN }));
  const both = (fs_, S) => (fs_.length === 1 && fs_[0].slug === S58 && S.freeWhat === 'video') ? [Object.assign({}, fs_[0], { live: null, rescue: null }), Object.assign({}, fs_[0], { slug: S129, fire: 'chain', gapMs: 1250 })] : fs_;
  const fakes = [
    ['58 하나에 영상(옛 엔진)', { frees: (S, m) => merge(frees(S, m)) }],
    ['블록 «준비한 순서»(옛 이름)', { frees: (S, m) => oldBlock(frees(S, m)) }],
    ['식전 129 겹친 날에도 두 줄', { frees: (S, m) => both(frees(S, m), S) }],
    ['사슬 쉼 2초(기본값)', { frees: (S, m) => frees(S, m).map((c) => c.slug === S129 ? Object.assign({}, c, { gapMs: 0 }) : c) }],
  ];
  let dead = 0;
  for (const [nm, src] of fakes) { const b = quiet(() => judgeEngine(engine(src))); fail = 0; if (!b) { dead++; console.log('FAIL 깨 보기 «' + nm + '» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «' + nm + '» → 빨강 ' + b); }
  const okNow = quiet(() => judgeEngine(engine(live))); fail = 0;
  if (okNow) { dead++; console.log('FAIL 깨 보기 — 지금 엔진이 빨강이다(' + okNow + ')'); }
  const sec = '4. 식중 영상\n나레이션(여는 말): 다음은 오늘 예식에서 두 사람이 가장 마음을 쏟아 준비한 순서입니다.\n(여기서 준비한 영상이 흘러요 · 약 4분)';
  if (scriptOk(sec, 4, true)) { dead++; console.log('FAIL 깨 보기 «대본에 129 없음 · 옛 카드 글» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «대본에 129 없음 · 옛 카드 글» → 빨강');
  const sec2 = sec.replace('(여기서 준비한 영상이 흘러요 · 약 4분)', '나레이션(식중 영상 소개): 한 장면씩 여러분의 마음에도 남겨 보시길 바랍니다. 영상 함께 감상하시겠습니다.\n(여기서 식중 영상이 흘러요 · 약 4분)');
  if (scriptOk(sec2, 4, false)) { dead++; console.log('FAIL 깨 보기 «129 겹친 날 대본에 129» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «129 겹친 날 대본에 129» → 빨강');
  if (!scriptOk(sec2, 4, true)) { dead++; console.log('FAIL 깨 보기 — 맞는 대본을 빨강으로 읽었다'); }
  console.log(dead ? `\nMID17_ENGINE selftest FAIL ${dead}` : '\nMID17_ENGINE selftest OK');
  process.exit(dead ? 1 : 0);
}

if (!pw) { console.log('못 쟀다 — playwright 없음(화면 검사 건너뜀)'); console.log(fail ? `\nMID17_ENGINE FAIL ${fail}` : '\nMID17_ENGINE OK(엔진만)'); process.exit(fail ? 1 : 2); }
for (const wd of [390, 360]) {
  try { const { out, errs } = await screen(wd); judgeScreen(out, errs, wd); }
  catch (e) { ok(`${wd} 화면 예외`, false, e && e.message); }
}
console.log(fail ? `\nMID17_ENGINE FAIL ${fail}` : '\nMID17_ENGINE OK');
process.exit(fail ? 1 : 0);
