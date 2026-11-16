#!/usr/bin/env node
/* ★★[MID17_ENGINE 2026-11-07 사장님 결정 · 식중 영상 · 계획 docs/handoff/midvideo-17.md 줄 3 · 4 · 6] 엔진 · 전체 대본 · 연습
   ★★[SPEECH_SONG_1115 2026-11-15 대표님] 식중 영상 = 따로 넣고 빼는 순간 'midvid'(S.on.midvid · 길이 S.midLen) — 축사 · 축가와 함께 담는다 · 차례 덕담 → 축사 → 축가 → 식중 영상 → 편지.
     옛 기대(축사 칸 free 의 영상 갈래 · 큐 열쇠 free · 축가 앞)는 은퇴 · 옛 초안 free + video 는 norm(midMigrate)이 midvid 로 옮긴다.
   ★★[NARR_ROLE_1115 2026-11-15 대본 · 릴스 방 교통정리 2차 · d262d560] 식중 영상 큐 = 353 «두 사람이 준비한 영상 한 편, 함께 보시겠습니다.»(영상 사람 순간 · [재생 안 됨]) → 355 박수.
     옛 기대(58 여는 말 → 129 «한 장면씩 …» 사슬 1.25초 · 식전 소개가 129 인 날 58 하나)는 은퇴 — 이제 식전 영상 소개 판과 상관없이 같은 두 줄 · S.midTone story = 352 → 355 · thanks = 351 → 354(바로 뒤가 «부모님께» 편지면 353 · 355)
   ① 엔진(node) — 큐 꼴 · 길이 1 · 4 · 10분 · 식전 소개 판 · 디지털 · 미리 듣기 빌드 · 옛 초안 옮기기 · 차례(축사 · 축가 뒤 · 편지 앞) · 축사와 함께 · 축사 · 선물 · 기타 · 옛 코스 그대로 · 새 녹음 0
   ② 화면(Playwright 390 · 360) — 미리 듣기 · 연습 줄(353 «시작할 때» → «식중 영상이 흐르는 자리» → 355 «끝나면») · 연습 카드 «여기서 식중 영상이 흘러요 · 약 n분 · 연습에서는 넘겨요» ·
       전체 대본 식중 영상 자리 = 353 → (영상 약 n분) → 355 · 연습 재생 목록(_prQ)에 353 · 355 · 축사 날은 «식중 영상» 없음 · pageerror 0
   --selftest — 옛 동작(큐 열쇠 free · 58 → 129 · 박수 줄 없음 · 블록 «준비한 순서» · 옛 초안을 안 옮김 · 축가 앞 자리)을 빨강으로 읽는지 본다
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음 — 엔진 검사는 돈다) */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const SELF = process.argv.includes('--selftest');
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500)}`); if (!c) fail++; return !!c; };

const TONE = O.MID_TONE || {};
const IN = (TONE.plain || [])[0] || 'midvideo-in-plain', OUT = (TONE.plain || [])[1] || 'midvideo-out-story';
const base = (x) => Object.assign({ course: 'open', on: { bless: 1, song: 1, midvid: 1, letter: 1 }, midLen: '4' }, x || {});
const buildAll = (S, mode) => C.build(C.norm(JSON.parse(JSON.stringify(S))), { mode: mode || 'console' }).cues;
const mids = (S, mode) => buildAll(S, mode).filter((c) => c.k === 'midvid');

/* ── 판정(검사 · 깨 보기가 같은 함수를 쓴다) ── */
function twoLine(fs_, len, pair) {   // 식중 영상 = 여는 말(영상 사람 순간 · [재생 안 됨]) → 맺는 말(박수)
  const [a, b] = fs_, p = pair || [IN, OUT];
  return fs_.length === 2 && a.k === 'midvid' && a.slug === p[0] && a.blockN === '식중 영상' && a.name === '식중 영상 시작 · ' + len + '분'
    && !!a.live && a.live.est === 60 * len + 8 && a.live.doing === 'watch' && !!a.rescue && a.rescue.slug === ''
    && b.k === 'midvid' && b.slug === p[1] && b.blockN === '식중 영상' && b.name === '식중 영상 마무리' && b.fire === 'manual' && !!b.live && !b.rescue && b.hint === '영상이 끝나면';
}
function scriptOk(sec, len) {   // 전체 대본의 식중 영상 자리(머리 줄 ~ 다음 빈 줄)
  const i0 = sec.indexOf('두 사람이 준비한 영상 한 편, 함께 보시겠습니다.'), iv = sec.indexOf('(여기서 식중 영상이 흘러요 · 약 ' + len + '분)'), i1 = sec.indexOf('영상을 준비한 두 사람에게 따뜻한 박수 부탁드립니다.');
  return /^\d+\. 식중 영상/.test(sec) && i0 > -1 && iv > i0 && i1 > iv && !/한 장면씩|미리 듣기에서는 넘겨요|연습에서는 넘겨요/.test(sec);
}
const order = (cs) => { const ks = []; cs.forEach((c) => { if (ks[ks.length - 1] !== c.k) ks.push(c.k); }); return ks; };

/* ── ① 엔진 ── */
function engine(src) {
  const r = {};
  r.video = src.mids(base());
  r.video1 = src.mids(base({ midLen: '1' }));
  r.video10 = src.mids(base({ midLen: '10' }));
  r.pv = [0, 1, 2].map((e) => src.mids(base({ on: { prevideo: 1, bless: 1, song: 1, midvid: 1, letter: 1 }, pvEx: e })));
  r.pvOwn = src.mids(base({ on: { prevideo: 1, bless: 1, song: 1, midvid: 1, letter: 1 }, pvEx: 2, pvVoice: 'couple' }));
  r.digital = src.mids(base({ digital: true }));
  r.preview = src.mids(base(), 'preview');
  r.story = src.mids(base({ midTone: 'story' }));
  r.thanks = src.mids(base({ midTone: 'thanks' }));
  r.thanksParent = src.mids(base({ midTone: 'thanks', letter: 'parent' }));
  r.oldDraft = src.all({ course: 'open', on: { bless: 1, free: 1, song: 1, letter: 1 }, freeWhat: 'video', freeLen: '4' });   // 옛 초안(축사 칸의 영상 갈래 · 축가)
  r.newDraft = src.all({ course: 'open', on: { bless: 1, song: 1, midvid: 1, letter: 1 }, midLen: '4' });
  r.oldBoth = src.all({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'speech' });   // 옛 초안(축사 + 축가 둘 다)
  r.withSpeech = src.all({ course: 'open', on: { bless: 1, free: 1, midvid: 1, letter: 1 }, freeWhat: 'speech', freeLen: '2', midLen: '3' });
  r.withSong = src.all({ course: 'open', on: { bless: 1, song: 1, midvid: 1, letter: 1 }, midLen: '3' });
  r.speech = src.all({ course: 'open', on: { bless: 1, free: 1, letter: 1 }, freeWhat: 'speech', freeLen: '3' }).filter((c) => c.k === 'free');
  r.gift = src.all({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'gift' }).filter((c) => c.k === 'free');
  r.etc = src.all({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'etc', freeEtc: '형제 깜짝 영상편지' }).filter((c) => c.k === 'free');
  r.stage = src.all({ course: 'open', on: { bless: 1, free: 1, letter: 1 }, freeWhat: 'stage', freeLen: '4' }).filter((c) => c.k === 'free');   // [NO_SHOW_1116] 옛 무대 초안 → 축사
  r.giftSong = src.all({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'gift' }).filter((c) => c.k === 'song');
  r.old = src.all({ course: 'record', extra: { free: 1 } }).filter((c) => c.k === 'free');   // 옛 코스(기록 · 자유 한 칸을 고른 옛 초안)
  return r;
}
function judgeEngine(r) {
  let bad = 0; const t = (m, c, d) => { if (!ok(m, c, d)) bad++; };
  const brief = (fs_) => fs_.map((c) => [c.k, c.slug, c.blockN, c.name, c.fire, c.live && c.live.est, !!c.rescue]);
  const js = (fs_) => JSON.stringify(fs_.map((c) => Object.assign({}, c, { idx: undefined })));
  t('[SPEECH_SONG_1115 · NARR_ROLE_1115] 식중 영상 = 큐 열쇠 midvid · ' + IN + '(여는 말 · 영상 60 × 4 + 8 · [재생 안 됨]) → ' + OUT + '(박수 · «영상이 끝나면») · 블록 «식중 영상» · 이름 «식중 영상 시작 · 4분»', twoLine(r.video, 4), brief(r.video));
  t('길이 1 · 10분도 같은 꼴(영상 68 · 608초)', twoLine(r.video1, 1) && twoLine(r.video10, 10), [brief(r.video1), brief(r.video10)]);
  t('[NARR_ROLE_1115] 식전 영상 소개 판(pvEx 0 · 1 · 2 · 두 분 목소리)과 상관없이 같은 두 줄(옛 «129 겹친 날 58 하나» 은퇴)', r.pv.every((x) => twoLine(x, 4) && js(x) === js(r.pv[0])) && twoLine(r.pvOwn, 4), r.pv.map(brief));
  t('디지털 참석 날도 같은 큐', js(r.digital) === js(r.video), [brief(r.digital)]);
  t('미리 듣기 빌드도 같은 두 줄', r.preview.length === 2 && r.preview[0].slug === IN && r.preview[1].slug === OUT, brief(r.preview));
  t('[NARR_ROLE_1115] 결(S.midTone) — story = 352 → 355 · thanks = 351 → 354 · thanks 인데 바로 뒤가 «부모님께» 편지면 353 → 355(같은 말 두 번 금지)', twoLine(r.story, 4, TONE.story) && twoLine(r.thanks, 4, TONE.thanks) && twoLine(r.thanksParent, 4, TONE.plain), [brief(r.story), brief(r.thanks), brief(r.thanksParent)]);
  t('[SPEECH_SONG_1115] 옛 초안(free + video + 축가) — norm 이 식중 영상(midvid)으로 옮긴다 · 새 초안과 한 글자도 같은 큐 · free 큐 없음', js(r.oldDraft) === js(r.newDraft) && !r.oldDraft.some((c) => c.k === 'free') && r.oldDraft.some((c) => c.k === 'song'), [order(r.oldDraft), order(r.newDraft)]);
  t('[SPEECH_SONG_1115] 옛 초안(축사 + 축가 둘 다) — 축가만 남는다(free 큐 없음)', !r.oldBoth.some((c) => c.k === 'free') && r.oldBoth.some((c) => c.k === 'song'), order(r.oldBoth));
  { const a = order(r.withSpeech), b = order(r.withSong);
    t('[SPEECH_SONG_1115] 차례 = 덕담 → 축사(또는 축가) → 식중 영상 → 편지 · 식중 영상은 축사와도 축가와도 함께 큐가 선다', a.indexOf('bless') > -1 && a.indexOf('bless') < a.indexOf('free') && a.indexOf('free') < a.indexOf('midvid') && a.indexOf('midvid') < a.indexOf('letter') && b.indexOf('song') > -1 && b.indexOf('song') < b.indexOf('midvid') && b.indexOf('midvid') < b.indexOf('letter') && a.indexOf('song') < 0 && b.indexOf('free') < 0, [a, b]); }
  t('축사는 그대로(103 여는 말 · 블록 «축사» · 식중 영상 큐 없음)', r.speech.length >= 1 && r.speech[0].slug === 'narr-free-in-speech' && r.speech.every((c) => c.blockN === '축사' && c.slug !== IN), brief(r.speech));
  /* ★[SHOW_PAIR_1116 · RULES_SLIM ⑧] 옛 기대 «선물 · 기타(옛 초안)는 그대로 · 축가와 함께(58 · 블록 «준비한 순서»)» → 선물 · 기타는 상담 메모 · 옛 초안은 꺼진다(축가는 그대로) · 새 갈래 축하 공연 = 58 하나 · 블록 «축하 공연» */
  /* ★[NO_SHOW_1116 · RULES_SLIM ⑧] 옛 기대(SHOW_PAIR_1116) «축하 공연 = 58 하나 · 블록 «축하 공연»» → 대표님 «공연은 빼자» · 옛 무대 초안 = 축사(103 · 블록 «축사») */
  t('[SHOW_PAIR_1116 · NO_SHOW_1116] 선물 · 기타(옛 초안)는 꺼진다(free 큐 0 · 함께 담긴 축가는 그대로) · 옛 무대 초안 = 축사(여는 말 103 · 블록 «축사» · 사람 구간)', !r.gift.length && !r.etc.length && r.giftSong.length > 0 && r.stage.length >= 1 && r.stage[0].slug === 'narr-free-in-speech' && r.stage.every((c) => c.blockN === '축사') && r.stage.some((c) => !!c.live), [brief(r.gift), brief(r.etc), brief(r.stage)]);
  t('옛 코스 자유 한 칸 그대로(58 · 59 · 블록 «자유 한 칸»)', r.old.length === 2 && r.old[0].slug === 'narr-free-in' && r.old[1].slug === 'narr-free-out' && r.old.every((c) => c.blockN === '자유 한 칸'), brief(r.old));
  const all = [].concat(r.video, r.pv[2], r.pvOwn, r.digital, r.story, r.thanks);
  t('이 자리에 129(식전 영상 소개) · 130(시선 명령 [B2_GEUL_01]) · 261(식전 영상 받는 말)은 없다', all.every((c) => !/^narr-prevideo-in-ex[34]$|^narr-prevideo-out$/.test(c.slug || '')), all.map((c) => c.slug));
  return bad;
}
const live = { mids, all: (S, m) => buildAll(S, m) };
if (!SELF) {
  judgeEngine(engine(live));
  const has = (sl) => fs.readdirSync(path.join(ROOT, 'assets/audio/narration')).some((f) => new RegExp(`^\\d+_${sl}\\.mp3$`).test(f));
  const need = [].concat(...Object.values(TONE));
  ok('새 녹음 0 — 식중 영상 줄(' + need.join(' · ') + ') 소리 파일이 있다', need.length === 6 && need.every(has), need.map((s) => s + ':' + has(s)));
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
      /* [SPEECH_SONG_1115] 축사 · 축가는 pairSet 으로(둘 중 하나) · 식중 영상은 따로 */
      const put = (x) => { R.applyExample(S, 'standard'); S.on = S.on || {}; Object.assign(S, x.s || {}); Object.keys(x.on || {}).forEach((k) => { if (x.on[k]) S.on[k] = 1; else delete S.on[k]; }); if (x.pair) R.pairSet(S, x.pair); try { opSync(); } catch (e) {} buildSteps(); };
      const step = (k) => { idx = STEPS.findIndex((x) => x.k === k); render(); };
      const row = (x) => ({ lab: x.lab, slab: x.slab, txt: x.txt, src: !!x.src, skip: !!x.skip, slug: x.slug || '' });
      const run = async (name, x, ks) => { put(x); step('listen'); await w(200); const r = {}; r.listen = _lSteps(ENG, ks).map(row); step('practice'); await w(200); r.practice = _lSteps(ENG, ks).map(row);
        r.prq = _prQ(ks).filter((y) => y.src).map((y) => y.slug || y.file || ''); r.script = sec(scriptTextOpen()); o[name] = r; };
      await run('video', { on: { midvid: 1, letter: 1 }, s: { midLen: '4', pvEx: 0 } }, ['midvid']);
      await run('pv129', { on: { midvid: 1, prevideo: 1 }, s: { midLen: '4', pvEx: 2, pvVoice: 'nar' } }, ['midvid']);
      await run('speech', { on: { midvid: 0 }, s: { freeWhat: 'speech', freeLen: '3' }, pair: 'free' }, ['free']);
      return o; });
    return { out, errs };
  } finally { await br.close(); srv.close(); }
}
function judgeScreen(o, errs, width) {
  let bad = 0; const t = (m, c, d) => { if (!ok(`${width} ${m}`, c, d)) bad++; };
  const v = o.video, p = o.pv129, s = o.speech;
  const nar = (L) => L.filter((x) => !x.skip && x.src);
  t('미리 듣기 줄 = ' + IN + ' «시작할 때» → «식중 영상이 흐르는 자리»(… 미리 듣기에서는 넘겨요) → ' + OUT + ' «끝나면»', nar(v.listen).length === 2 && v.listen[0].slug === IN && v.listen[0].lab === '시작할 때' && v.listen[0].slab === '여는 말'
    && v.listen[1] && v.listen[1].skip && v.listen[1].lab === '식중 영상이 흐르는 자리' && v.listen[1].txt === '여기서 식중 영상이 흘러요 · 약 4분 · 미리 듣기에서는 넘겨요' && v.listen[2] && v.listen[2].slug === OUT && v.listen[2].slab === '맺는 말', v.listen);
  t('연습 카드 «여기서 식중 영상이 흘러요 · 약 4분 · 연습에서는 넘겨요» · ' + IN + ' · ' + OUT + ' 소리 두 줄 다 연습 재생 목록에', v.practice.some((x) => x.skip && x.lab === '식중 영상이 흐르는 자리' && x.txt === '여기서 식중 영상이 흘러요 · 약 4분 · 연습에서는 넘겨요') && JSON.stringify(v.prq) === JSON.stringify([IN, OUT]), [v.practice, v.prq]);
  t('전체 대본 식중 영상 자리 = 여는 말 → (여기서 식중 영상이 흘러요 · 약 4분) → 맺는 말(박수)', scriptOk(v.script, 4), v.script);
  t('[NARR_ROLE_1115] 식전 영상 소개가 129 인 날도 같은 줄 · 연습 · 대본(옛 «129 겹친 날 58 만» 은퇴)', scriptOk(p.script, 4) && JSON.stringify(p.prq) === JSON.stringify(v.prq) && JSON.stringify(p.listen) === JSON.stringify(v.listen), [p.script, p.prq]);
  t('축사 날 — «식중 영상» 없음(축사 줄과 겹치지 않는다)', !/식중 영상|함께 보시겠습니다/.test(s.script + JSON.stringify(s.listen)) && /^\d+\. 축사/.test(s.script) && s.listen[0] && s.listen[0].slug === 'narr-free-in-speech', s.script);
  t('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  return bad;
}

if (SELF) {
  /* 깨 보기 — 옛 동작을 그대로 만들어 판정에 넣는다(빨강이어야 산 검사다) */
  const quiet = (fn) => { const lg = console.log; console.log = () => {}; try { return fn(); } finally { console.log = lg; } };
  const asFree = (cs) => cs.map((c) => c.k === 'midvid' ? Object.assign({}, c, { k: 'free' }) : c);
  const fakes = [
    ['큐 열쇠 free(옛 축사 칸 갈래)', { mids: (S, m) => mids(S, m).map((c) => Object.assign({}, c, { k: 'free' })), all: (S, m) => asFree(buildAll(S, m)) }],
    ['58 → 129(옛 큐 · 박수 줄 없음)', { mids: (S, m) => { const a = mids(S, m); return a.length === 2 ? [Object.assign({}, a[0], { slug: 'narr-free-in', live: null, rescue: null }), Object.assign({}, a[0], { slug: 'narr-prevideo-in-ex3', fire: 'chain', gapMs: 1250 })] : a; }, all: buildAll }],
    ['블록 «준비한 순서»(옛 이름)', { mids: (S, m) => mids(S, m).map((c) => Object.assign({}, c, { blockN: '준비한 순서' })), all: buildAll }],
    ['옛 초안을 안 옮김(free 영상 큐가 남음)', { mids, all: (S, m) => (S.freeWhat === 'video' ? asFree(buildAll(Object.assign({}, S, { on: Object.assign({}, S.on, { free: 0, midvid: 1 }) }), m)) : buildAll(S, m)) }],
    ['축가 앞 자리(옛 차례)', { mids, all: (S, m) => { const cs = buildAll(S, m), mv = cs.filter((c) => c.k === 'midvid'), rest = cs.filter((c) => c.k !== 'midvid'), i = rest.findIndex((c) => c.k === 'song'); return i < 0 ? cs : rest.slice(0, i).concat(mv, rest.slice(i)); } }],
    ['축사 + 축가 둘 다 남김', { mids, all: (S, m) => { const cs = buildAll(S, m); if (S.on && S.on.free && S.on.song && S.freeWhat === 'speech') { const sp = buildAll({ course: 'open', on: { free: 1 }, freeWhat: 'speech' }, m).filter((c) => c.k === 'free'); return sp.concat(cs); } return cs; } }],
  ];
  let dead = 0;
  for (const [nm, src] of fakes) { const b = quiet(() => judgeEngine(engine(src))); fail = 0; if (!b) { dead++; console.log('FAIL 깨 보기 «' + nm + '» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «' + nm + '» → 빨강 ' + b); }
  const okNow = quiet(() => judgeEngine(engine(live))); fail = 0;
  if (okNow) { dead++; console.log('FAIL 깨 보기 — 지금 엔진이 빨강이다(' + okNow + ')'); }
  const good = '7. 식중 영상\n나레이션(여는 말): 두 사람이 준비한 영상 한 편, 함께 보시겠습니다.\n(여기서 식중 영상이 흘러요 · 약 4분)\n나레이션(맺는 말): 영상을 준비한 두 사람에게 따뜻한 박수 부탁드립니다.';
  if (!scriptOk(good, 4)) { dead++; console.log('FAIL 깨 보기 — 맞는 대본을 빨강으로 읽었다'); }
  const oldSec = '4. 식중 영상\n나레이션(여는 말): 다음은 오늘 예식에서 두 사람이 가장 마음을 쏟아 준비한 순서입니다.\n나레이션(식중 영상 소개): 한 장면씩 여러분의 마음에도 남겨 보시길 바랍니다.\n(여기서 식중 영상이 흘러요 · 약 4분)';
  if (scriptOk(oldSec, 4)) { dead++; console.log('FAIL 깨 보기 «옛 대본(58 · 129 · 박수 없음)» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «옛 대본(58 · 129 · 박수 없음)» → 빨강');
  if (scriptOk(good.replace(/\n나레이션\(맺는 말\)[^\n]*/, ''), 4)) { dead++; console.log('FAIL 깨 보기 «대본에 박수 줄 없음» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «대본에 박수 줄 없음» → 빨강');
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
