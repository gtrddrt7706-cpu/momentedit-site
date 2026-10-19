#!/usr/bin/env node
/* ★★[ENTRY_BGM_1019 2026-10-19 사장님 «처음도입부분을 좀더 길게 늘리고 서서히 0에서 볼륨을 높였다가 멘트 직전에 낮출것이고 모든 bgm전부(입장)» ·
     «도착 까지 시간을 좀더 늘릴거야 행진이후 1분이상»] 입장 «음악과 함께 듣기» — 입장 멘트 6판(A ~ F) × 추천 곡 8곡 = 48 조합
   BGM 섹션 설계 명세 1(10/19)의 받아들일 기준을 실제 녹음 · 실제 곡 목록으로 잰다(엔진 assets/entry-scene.js 그대로 · 식순 화면과 당일 콘솔이 같은 식).
   1 음악 먼저 tv = lead(10) · 늦게 tm = 0 · 문 열린 뒤 «도착»까지 tend − th = after + 잦아듦(64)
   2 장면 0초 음량 0 · fade(6)초까지 줄곧 커짐 · fade ~ tv − duck 머묾 · tv − duck(1.5)부터 멘트까지 낮아짐
   3 짧은 판(목록 pf · p0 ~ p1) 안 — 곡 전체 받기 0(entry-music.js scCovers 와 같은 식)
   4 판이 감당하는 멘트 길이 3 ~ 45초(docs make_clips.py V_MIN · V_MAX) 전부 판 안 · 카드 ▶(문 열림 12초 앞부터 1분)도 판 안 — 엔진 SP 와 판을 자른 값이 갈라지면 빨강
   목소리 = assets/audio/narration/05 ~ 10_entry-A ~ F(엔진 prepVoice · 문장 수 = assets/ritual-data.js ENTRY.nar) · 곡 = 문서 저장소 songs.json(DOCS · 곡 파일은 쓰지 않는다)
   DOCS = momentedit-docs 경로(기본: 사이트 옆) · ES_MOD = 돌연변이 확인용 엔진 · 종료 코드 0 통과 · 1 실패 · 2 못 쟀다(브라우저 · 문서 저장소 없음) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DOCS = process.env.DOCS || path.join(ROOT, '..', 'momentedit-docs');
const SJ = path.join(DOCS, 'operations', 'rec-songs', 'files', 'songs.json');
const ESRC = process.env.ES_MOD || path.join(ROOT, 'assets', 'entry-scene.js');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
// 엔진(노드) — 4 판이 감당하는 멘트 길이 전부
const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(ESRC, 'utf8'), sb); const ES = sb.window.EntryScene;
if (!ES || typeof ES.plan !== 'function') { console.log('FAIL 엔진을 읽지 못했다'); process.exit(1); }
const SP = ES.SP, WANT = { lead: 10, fade: 6, duck: 1.5, after: 60, OUTF: 4, prev: 2.5 };
ok(`0 엔진 값 — lead ${SP.lead} · fade ${SP.fade} · duck ${SP.duck} · after ${SP.after} · 잦아듦 ${ES.OUTF} · 미리 듣기 첫소리 ${ES.PREV_FADE}`,
  SP.lead === WANT.lead && SP.fade === WANT.fade && SP.duck === WANT.duck && SP.after === WANT.after && ES.OUTF === WANT.OUTF && ES.PREV_FADE === WANT.prev, { SP, OUTF: ES.OUTF, PREV_FADE: ES.PREV_FADE });
if (!fs.existsSync(SJ)) { console.log('못 쟀다 — 문서 저장소 곡 목록이 없다(' + SJ + ') · DOCS=<momentedit-docs 경로>'); process.exit(fail ? 1 : 2); }   // 엔진 값(0)은 문서 저장소 없이도 잰다(CI)
const SONGS = JSON.parse(fs.readFileSync(SJ, 'utf8')).songs.filter((s) => s && s.k && s.hook0 != null);
const voice = (V, n = 3) => { const d = (V - 0.4 * (n - 1)) / n, pieces = [], gaps = []; for (let i = 0; i < n; i++) { pieces.push({ a: i * (d + 0.4), d }); if (i < n - 1) gaps.push(0.4); } return { pieces, gaps }; };
const covers = (s, V0) => { const PL = ES.plan(V0, { dur: s.len, gain: 1 }, +s.hook0, { hooks: s.hooks }), a = PL.off, b = PL.off + (PL.tend - PL.tm); return { a, b, H: PL.H, in: a >= s.p0 - 0.02 && b <= s.p1 + 0.02 }; };   // entry-music.js scCovers
{ const out = [];
  for (const s of SONGS) { if (!s.pf) { out.push(s.k + ' 짧은 판 없음'); continue; }
    for (let V = 3; V <= 45 + 1e-9; V += 0.1) { const c = covers(s, voice(V)); if (!c.in) { out.push(`${s.k} 멘트 ${V.toFixed(1)}초 → 문 열림 ${c.H} · 필요 ${c.a.toFixed(2)} ~ ${c.b.toFixed(2)} / 판 ${s.p0} ~ ${s.p1}`); break; } }
    const x0 = Math.max(0, +s.hook0 - 12), x1 = Math.min(s.len, +s.hook0 + 48);
    if (!(x0 >= s.p0 - 0.02 && x1 <= s.p1 + 0.02)) out.push(`${s.k} 카드 ▶ ${x0.toFixed(2)} ~ ${x1.toFixed(2)} / 판 ${s.p0} ~ ${s.p1}`); }
  ok(`4 멘트 3 ~ 45초 전부 · 카드 ▶(12초 앞부터 1분) — 짧은 판 ${SONGS.filter((s) => s.pf).length}곡 안`, out.length === 0, out); }
// 브라우저 — 실제 녹음 6판을 엔진으로 풀어(문장 조각 · «입장!» 앞 쉼까지) 곡 8곡과 짠다
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — 브라우저(playwright) 없음'); process.exit(fail ? 1 : 2); }
const rd = { window: {} }; vm.createContext(rd); vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'ritual-data.js'), 'utf8') + ';this.__E=typeof ENTRY!=="undefined"?ENTRY:null;', rd);
const ENTRY = rd.__E; if (!ENTRY) { console.log('FAIL ritual-data.js 에서 ENTRY 를 읽지 못했다'); process.exit(1); }
const VER = 'ABCDEF'.split('').map((k, i) => ({ k, d: ENTRY[k].d, txt: ENTRY[k].nar, file: '/assets/audio/narration/' + String(5 + i).padStart(2, '0') + '_entry-' + k + '.mp3' }));
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<!doctype html><title>b</title><script src="/assets/rec-process.js"></script><script src="/__es.js"></script>'); return; }
  const p = u === '/__es.js' ? ESRC : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': /\.js$/.test(p) ? 'text/javascript' : 'audio/mpeg' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const pg = await br.newPage(); await pg.goto(`http://127.0.0.1:${port}/`); await pg.waitForFunction(() => !!window.EntryScene);
const R = await pg.evaluate(async ({ VER, SONGS }) => {
  const ES = window.EntryScene, SP = ES.SP, dec = new OfflineAudioContext(1, 1, 48000), dB = (g) => (g <= 0 ? -120 : 20 * Math.log10(g));
  const out = [];
  for (const v of VER) {
    const ab = await (await fetch(v.file)).arrayBuffer(), b = await dec.decodeAudioData(ab), V0 = ES.prepVoice(b, ES.sentN(v.txt), true);   // 식순 화면 vPrep 그대로(OfflineAudioContext 48000)
    for (const s of SONGS) {
      const Sg = s.pf ? { dur: Math.max(s.len, s.p1), gain: 1, o: s.p0, end: s.p1 } : { dur: s.len, gain: 1 };   // 식순 화면 recBuild(짧은 판) 그대로
      const PL = ES.plan(V0, Sg, +s.hook0, { hooks: s.hooks }), F = ES.plan(V0, { dur: s.len, gain: 1 }, +s.hook0, { hooks: s.hooks });
      const a = F.off, bb = F.off + (F.tend - F.tm), inClip = !!s.pf && a >= s.p0 - 0.02 && bb <= s.p1 + 0.02;
      const g = (x) => ES.envGain(PL, x); let up = true; for (let x = 0.01; x <= SP.fade + 1e-9; x += 0.01) if (!(g(x) >= g(x - 0.01) - 1e-12)) up = false;
      const hold = Math.abs(dB(g(SP.fade + 0.05)) - dB(g(PL.tv - SP.duck - 0.05))) < 0.1, dn = []; for (let x = PL.tv - SP.duck + 0.02; x <= PL.tv - 0.02 + 1e-9; x += 0.02) dn.push(g(x));
      let down = dn.length > 3; for (let i = 1; i < dn.length; i++) if (!(dn[i] < dn[i - 1])) down = false;
      out.push({ v: v.k, k: s.k, t: s.t, V: +(PL.V.toFixed(2)), H: PL.H, H0: PL.H0, tv: PL.tv, tm: PL.tm, arr: +((PL.tend - PL.th).toFixed(3)), g0: g(0), up, hold, down,
        dduck: +(dB(g(PL.tv - SP.duck + 0.05)) - dB(g(PL.tv - 0.02))).toFixed(1), need: [+(a.toFixed(2)), +(bb.toFixed(2))], clip: s.pf ? [s.p0, s.p1] : null, inClip, cut: !!V0.cut });
    } }
  return out; }, { VER, SONGS });
await br.close(); srv.close();
const T = (r) => `${r.v}·${r.k}`;
console.log('판·곡   멘트   문 열림(고른 자리)  tv  tm  도착   필요 구간           짧은 판');
for (const r of R) console.log(`${T(r).padEnd(6)} ${String(r.V).padStart(5)}초  ${String(r.H).padStart(6)}${r.H !== r.H0 ? '(' + r.H0 + ')' : '        '}  ${String(r.tv).padStart(3)} ${String(+r.tm.toFixed(2)).padStart(3)}  ${String(r.arr).padStart(4)}  ${String(r.need[0]).padStart(6)} ~ ${String(r.need[1]).padStart(6)}  ${r.clip ? r.clip.join(' ~ ') : '-'} ${r.inClip ? '안' : '밖'}`);
const n = R.length, bad = (f) => R.filter((r) => !f(r)).map(T);
ok(`1 ${n} 조합 — 음악 먼저 tv = ${SP.lead}`, n === VER.length * SONGS.length && bad((r) => r.tv === SP.lead).length === 0, bad((r) => r.tv === SP.lead));
ok(`1 늦게 들어오는 조합 0(tm = 0)`, bad((r) => r.tm === 0).length === 0, bad((r) => r.tm === 0));
ok(`1 문 열린 뒤 «도착»까지 ${SP.after + ES.OUTF}초(곡이 모자라 잘리는 조합 0)`, bad((r) => Math.abs(r.arr - (SP.after + ES.OUTF)) < 1e-6).length === 0, bad((r) => Math.abs(r.arr - (SP.after + ES.OUTF)) < 1e-6));
ok(`2 장면 0초 음량 0 · ${SP.fade}초까지 줄곧 커짐 · ${SP.fade} ~ ${SP.lead - SP.duck}초 머묾 · 멘트 ${SP.duck}초 전부터 낮아짐`, bad((r) => r.g0 === 0 && r.up && r.hold && r.down && r.dduck > 3).length === 0, R.filter((r) => !(r.g0 === 0 && r.up && r.hold && r.down && r.dduck > 3)).map((r) => [T(r), r.g0, r.up, r.hold, r.down, r.dduck]));
ok(`3 ${n} 조합 모두 짧은 판 안(곡 전체 받기 ${bad((r) => r.inClip).length})`, bad((r) => r.inClip).length === 0, bad((r) => r.inClip));
ok(`3 «입장!» 앞 쉼 조각이 선 판 ${VER.filter((v) => R.find((r) => r.v === v.k && r.cut)).length}/${VER.length}(나레이션 모두 «신랑 신부, 입장!»으로 끝난다 · SP.call)`, VER.every((v) => R.find((r) => r.v === v.k && r.cut)), R.filter((r) => !r.cut).map(T));
const moved = R.filter((r) => r.H !== r.H0).map((r) => `${T(r)} ${r.H0}→${r.H}`);
console.log(`뒤 자리로 간 조합(${moved.length}): ${moved.join(' · ') || '없음'}`);
console.log(fail ? `entry-bgm: FAIL ${fail}` : 'entry-bgm: ok');
process.exit(fail ? 1 : 0);
