#!/usr/bin/env node
/* ★★[ENTRY_CALL_PAUSE_1013 2026-10-13 사장님 «따뜻한 박수로 맞이해 주시면 감사하겠습니다. 이후 신랑 신부 입장까지 적절하게 쉼을 좀 주는 게 좋을 것 같아»]
   입장 «음악과 함께» 장면 — «…감사하겠습니다.» 말끝에서 «신랑 신부, 입장!» 말머리까지 1.8초(엔진 SP.call · 식순 화면 = 당일 콘솔 · 같은 날 1초 → 사장님 «1.8초로 해 보자»).
   가 엔진만(브라우저 없이 · 합성 목소리)
     1 나레이션 — 쉼이 1.8초가 된다 · 다른 문장 사이는 그대로 · 하이라이트(th)도 그만큼 뒤로 · 음악 낮춤(tdip)은 «감사하겠습니다» 끝 그대로
     2 쉼 동안 음악은 한 번 더 낮춘 크기(dip)에 머문다 · «입장!» 뒤 0.3초에 크게
     3 목소리 마디(voiceSegs) — 빈자리 한가운데서 둘로 · 마지막 조각이 rel 자리에 · 길이 합 = V
     4 걸어서 튼 소리(voiceStart · 가짜 소리판으로 섞어 잰다) — 말끝 → «입장» 말머리 1.8초 · 끊는 자리 딸깍 없음 · 이어 듣기(from)도 같은 자리
     5 늘리기만 — 녹음 쉼이 이미 1.8초가 넘으면 그대로 · 두 분 목소리(나레이션 아님) · 문장 수가 안 맞아 «입장!»을 못 짚으면 손대지 않는다
   나 실제 녹음(브라우저 · 05_entry-A ~ 10_entry-F) — 여섯 다 쉼 1.8초 · 오프라인으로 걸어 튼 소리에서도 1.8초 · 딸깍 없음
   종료 코드 0 통과(나는 브라우저가 없으면 건너뜀 표시) · 1 실패.  ES_MOD = 돌연변이 확인용(그 판의 entry-scene.js 로 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const ES_PATH = process.env.ES_MOD || path.join(ROOT, 'assets', 'entry-scene.js'), SRC = fs.readFileSync(ES_PATH, 'utf8');
const sb = { window: {} }; vm.createContext(sb); vm.runInContext(SRC, sb);
const ES = sb.window.EntryScene;
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const r2 = (v) => Math.round(v * 1000) / 1000;
if (!ES || typeof ES.prepVoice !== 'function') { console.log('FAIL 엔진을 읽지 못했다'); process.exit(1); }
const CALL = 1.8;
ok(`0 쉼 값 = ${CALL}초(SP.call · 10/13 사장님 «1.8초로 해 보자») — 나레이션만 들을 때는 녹음 그대로 0.6초(10/10 PACE_D)`, ES.SP && ES.SP.call === CALL, ES.SP);
if (typeof ES.voiceSegs !== 'function' || typeof ES.voiceStart !== 'function') { ok('0 엔진에 voiceSegs · voiceStart 가 있다', false); console.log(`entry-call-pause: FAIL ${fail}`); process.exit(1); }

/* 합성 목소리 — 말(잡음 섞인 소리 · 끊김 없음)과 빈자리(방 소리 1e-4) */
const SR = 16000;
function voice(parts) { const n = Math.round(parts.reduce((s, p) => s + p[1], 0) * SR), x = new Float32Array(n); let i = 0, seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
  for (const [kind, sec] of parts) { const m = Math.round(sec * SR); for (let j = 0; j < m && i < n; j++, i++) { const t = j / SR; x[i] = kind === 's' ? 0.3 * (0.65 + 0.35 * Math.sin(2 * Math.PI * 3 * t)) * (Math.sin(2 * Math.PI * 180 * t) * 0.7 + rnd() * 0.6) : rnd() * 2e-4; } }
  return { numberOfChannels: 1, sampleRate: SR, length: n, duration: n / SR, getChannelData: () => x, _x: x }; }
/* 나레이션 모양: 앞 0.4 · 문장 3 (1.25 · 1.25 · 0.6 쉼) · «신랑 신부,» 0.9 · 쉼표 숨 0.45 · «입장!» 0.7 · 뒤 0.45 */
const NAR = (pre) => voice([['q', 0.4], ['s', 3.0], ['q', 1.25], ['s', 3.2], ['q', 1.25], ['s', 2.6], ['q', pre], ['s', 0.9], ['q', 0.45], ['s', 0.7], ['q', 0.45]]);
const spoken = (V0, b) => { const x = b._x, P = V0.pieces, k = P.length - 2, i0 = (s) => Math.round(s * SR);
  const pe = ES.edgeTrimIdx(x, i0(P[k].a), i0(P[k].a + P[k].d), SR, 'end')[1] / SR, ls = ES.edgeTrimIdx(x, i0(P[k + 1].a), i0(P[k + 1].a + P[k + 1].d), SR, 'start')[0] / SR; return { pe, ls, was: ls - pe }; };
/* 장면에서 파일 자리 f 가 몇 초에 나오나(목소리 시작 = 0) */
const sceneAt = (segs, f) => { for (let i = segs.length - 1; i >= 0; i--) if (f >= segs[i].a - 1e-9) return segs[i].t + (f - segs[i].a); return f - segs[0].a; };
const song = (dur) => ({ dur, gain: 1, buf: null });

// 1 · 2 · 3 — 나레이션(녹음 쉼 0.6초)
try { const b = NAR(0.6), V0 = ES.prepVoice(b, 4, true), P = V0.pieces, n = P.length, sp = spoken(V0, b), c = V0.cut || {}, segs = ES.voiceSegs(V0);
  const now = sceneAt(segs, sp.ls) - sceneAt(segs, sp.pe);
  ok(`1 나레이션 «입장!» 앞 쉼 — 녹음 ${r2(sp.was)}초 → 장면 ${r2(now)}초(=${CALL}) · 늘린 초 ${r2(c.add || 0)}`, n === 4 && !!V0.cut && Math.abs(now - CALL) < 0.005 && Math.abs(c.add - (CALL - sp.was)) < 1e-6, { n, cut: V0.cut, was: sp.was, now });
  const g0 = P.slice(0, n - 1).map((p, i) => r2(P[i + 1].a - (p.a + p.d)));
  ok(`1 다른 문장 사이 쉼은 그대로(${g0.slice(0, n - 2).join(' · ')}초) · 마지막 쉼만 +${r2(c.add || 0)}초`, V0.gaps.slice(0, n - 2).every((g, i) => Math.abs(g - g0[i]) < 1e-9) && Math.abs(V0.gaps[n - 2] - (g0[n - 2] + c.add)) < 1e-3, { gaps: V0.gaps, g0 });
  const PL = ES.plan(V0, song(150), 40), V = PL.V, penEnd = PL.rel[n - 2] + P[n - 2].d;
  ok(`1 하이라이트(th)가 늘린 만큼 뒤로 · 음악 낮춤(tdip)은 «감사하겠습니다» 끝 그대로`, Math.abs(PL.th - (PL.tv + V + ES.SP.breath)) < 1e-9 && Math.abs(V - (segs[1].t + segs[1].d)) < 1e-9 && Math.abs(PL.tdip - (PL.tv + penEnd)) < 1e-9 && Math.abs(penEnd - (P[n - 2].a + P[n - 2].d - P[0].a)) < 1e-9, { th: PL.th, tv: PL.tv, V, tdip: PL.tdip, penEnd });
  const T = ES.BED_TRIM, Ld = ES.SP.under - ES.SP.dip + T, mid = PL.tv + (sceneAt(segs, sp.pe) + sceneAt(segs, sp.ls)) / 2, gm = ES.envDb(PL, mid), gl = ES.envDb(PL, PL.tv + sceneAt(segs, sp.ls) - 0.05), gh = ES.envDb(PL, PL.th + 0.2);
  ok(`2 쉼 한가운데 음악은 한 번 더 낮춘 크기(${gm.toFixed(1)} = ${Ld}dB) · «신랑» 직전도(${gl.toFixed(1)}) · «입장!» 뒤 크게(${gh.toFixed(1)}dB)`, Math.abs(gm - Ld) < 0.05 && Math.abs(gl - Ld) < 0.05 && Math.abs(gh - T) < 0.05, { gm, gl, gh, Ld });
  const relCall = PL.rel[n - 1], segCall = segs[1].t + (P[n - 1].a - segs[1].a);
  ok(`3 마디 둘 — 빈자리 한가운데(${r2(c.at)}초)에서 끊는다 · 마지막 조각이 rel 자리(${r2(relCall)}초)에 · 앞 마디 끝에 페이드아웃 · 뒤 마디 처음에 페이드인`,
    segs.length === 2 && c.at > P[n - 2].a + P[n - 2].d - 1e-9 && c.at < P[n - 1].a + 1e-9 && Math.abs(segCall - relCall) < 1e-9 && segs[0].fo === 1 && segs[1].fi === 1 && !segs[0].fi && !segs[1].fo, { segs, relCall, segCall });

  // 4 — 가짜 소리판으로 걸어 섞어 잰다(자리 · 페이드 · 이어 듣기)
  function fakeAC() { const log = []; const mkParam = () => { const ev = []; return { ev, value: 1, setValueAtTime(v, t) { ev.push(['s', v, t]); }, linearRampToValueAtTime(v, t) { ev.push(['r', v, t]); } }; };
    return { log, createBufferSource() { const s = { buffer: null, conn: null, connect(g) { s.conn = g; }, start(at, off, d) { log.push({ s, at, off, d }); } }; return s; }, createGain() { const g = { gain: mkParam(), connect() {} }; return g; } }; }
  const gAt = (ev, t) => { let v = 1, pt = -1e9, pv = 1; for (const [k, val, at] of ev) { if (at <= t) { if (k === 's') { v = val; pt = at; pv = val; } else { v = val; pt = at; pv = val; } } else { if (k === 'r') { return pv + (val - pv) * (t - pt) / Math.max(1e-9, at - pt); } break; } } return v; };
  function render(from, len) { const a = fakeAC(), x = b._x, out = new Float32Array(Math.round(len * SR)); ES.voiceStart(a, V0, {}, 0, 0, from);
    for (const L of a.log) { const g = L.s.conn.gain.ev; for (let i = 0; i < Math.round(L.d * SR); i++) { const t = L.at + i / SR, j = Math.round((L.off + i / SR) * SR), o = Math.round(t * SR); if (o >= 0 && o < out.length && j < x.length) out[o] += x[j] * gAt(g, t); } }
    return { out, n: a.log.length, log: a.log }; }
  const rms = (y, t0, t1) => { let q = 0, m = 0; for (let i = Math.max(0, Math.round(t0 * SR)); i < Math.min(y.length, Math.round(t1 * SR)); i++) { q += y[i] * y[i]; m++; } return m ? Math.sqrt(q / m) : 0; };
  const R0 = render(0, V + 0.5), y = R0.out, tp = sceneAt(segs, sp.pe), tl = sceneAt(segs, sp.ls);
  const quiet = rms(y, tp + 0.05, tl - 0.05), loud = rms(y, tl + 0.05, tl + 0.3), oldCall = tl - c.add, oldQ = rms(y, oldCall + 0.05, oldCall + 0.3);
  ok(`4 섞어 튼 소리 — 마디 ${R0.n}개 · 쉼 ${r2(tl - tp)}초 동안 조용(${quiet.toExponential(1)}) · «신랑»이 그 뒤에 나온다(${loud.toFixed(3)}) · 종전 자리(${r2(oldCall)}초)는 아직 조용(${oldQ.toExponential(1)})`,
    R0.n === 2 && Math.abs(tl - tp - CALL) < 0.005 && quiet < 1e-3 && loud > 0.05 && oldQ < 1e-3, { n: R0.n, quiet, loud, oldQ });
  let jump = 0; for (const t of [segs[0].d, segs[1].t]) { for (let i = Math.round((t - 0.005) * SR); i < Math.round((t + 0.005) * SR); i++) jump = Math.max(jump, Math.abs(y[i] || 0)); }
  ok(`4 끊는 자리 앞뒤 5ms 가 조용하다(딸깍 없음 · 최대 ${jump.toExponential(1)})`, jump < 2e-3, { jump });
  const F = PL.rel[n - 1] - 0.5, R1 = render(F, 2.5), y1 = R1.out, t1 = tl - F;
  ok(`4 이어 듣기(마지막 조각 0.5초 앞에서) — 마디 ${R1.n}개 · «신랑»이 ${r2(t1)}초에(장면과 같은 자리)`, R1.n === 1 && rms(y1, 0, t1 - 0.05) < 1e-3 && rms(y1, t1 + 0.05, t1 + 0.3) > 0.05, { n: R1.n, t1 });
} catch (e) { ok('1~4 잴 수 없었다(마디가 모자라거나 엔진이 다르다) — ' + (e && e.message || e), false); }
// 5 — 늘리기만 · 나레이션만 · 짚을 수 있을 때만
{ const b = NAR(2.0), V0 = ES.prepVoice(b, 4, true), sp = spoken(V0, b);
  ok(`5 녹음 쉼이 이미 ${CALL}초가 넘으면(${r2(sp.was)}초) 그대로 — 줄이지 않는다`, !V0.cut && ES.voiceSegs(V0).length === 1, V0.cut); }
{ const b = NAR(0.6), V0 = ES.prepVoice(b, 4, false);
  ok('5 두 분 목소리(나레이션 아님)는 손대지 않는다 — 마디 하나', !V0.cut && ES.voiceSegs(V0).length === 1, V0.cut); }
{ const b = NAR(0.6), V0 = ES.prepVoice(b, 5, true);
  ok('5 문장 수가 안 맞아 «입장!»을 한 줄로 못 묶으면 손대지 않는다', !V0.cut && ES.voiceSegs(V0).length === 1, { cut: V0.cut, n: V0.pieces.length }); }

// 나 — 실제 녹음 여섯(브라우저)
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let br = null; if (pw) { try { br = await pw.chromium.launch(); } catch (e) { br = null; } }
if (!br) console.log('skip 나 실제 녹음 — 브라우저가 없어 재지 못함(가는 엔진만 쟀다)');
else {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg' };
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/__blank') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<!doctype html><title>t</title>'); return; } const p = u === '/assets/entry-scene.js' ? ES_PATH : path.join(ROOT, u);
    fs.readFile(p, (e, buf) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(buf); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  try {
    const pg = await br.newPage(); await pg.goto(`http://127.0.0.1:${port}/__blank`);
    for (const s of ['assets/ritual-data.js', 'assets/rec-process.js', 'assets/entry-scene.js']) await pg.addScriptTag({ url: `http://127.0.0.1:${port}/${s}` });
    const res = await pg.evaluate(async () => { const ES = window.EntryScene, files = { A: '05_entry-A', B: '06_entry-B', C: '07_entry-C', D: '08_entry-D', E: '09_entry-E', F: '10_entry-F' }, out = {};
      /* ★[SOURCE_FIRST_1016] 문장 수는 «그 녹음에 실제로 든 글»(_recorded.json)로 센다 — 입장 멘트가 자료 글로 바뀌어 다시 받는 중이면 지금 글과 옛 녹음의 문장 수가 달라
         «입장!»을 엉뚱한 마디에서 찾았다(B · D). 화면은 녹음 글 ≠ 지금 글이면 그 녹음을 틀지 않는다(_lHasSound) · 이 검사는 엔진이 실제 녹음의 쉼을 다루는지를 잰다 */
      const recJ = await (await fetch('/assets/audio/narration/_recorded.json')).json().catch(() => ({ clips: {} })), recT = (f) => { const v = (recJ.clips || {})[f]; return v == null ? '' : (typeof v === 'string' ? v : String(v.text || '')); };
      for (const k of Object.keys(files)) {
        const ab = await (await fetch('/assets/audio/narration/' + files[k] + '.mp3')).arrayBuffer(), dc = new OfflineAudioContext(1, 1, 24000), b = await dc.decodeAudioData(ab);
        const n = ES.sentN(recT(files[k]) || ENTRY[k].nar), V0 = ES.prepVoice(b, n, true), P = V0.pieces, x = ES.mono(b), sr = b.sampleRate, q = P.length - 2, I = (s) => Math.round(s * sr);
        const pe = ES.edgeTrimIdx(x, I(P[q].a), I(P[q].a + P[q].d), sr, 'end')[1] / sr, ls = ES.edgeTrimIdx(x, I(P[q + 1].a), I(P[q + 1].a + P[q + 1].d), sr, 'start')[0] / sr, segs = ES.voiceSegs(V0);
        const at = (f) => { for (let i = segs.length - 1; i >= 0; i--) if (f >= segs[i].a - 1e-9) return segs[i].t + (f - segs[i].a); return f - segs[0].a; };
        const PL = ES.plan(V0, { dur: 200, gain: 1, buf: null }, 60), len = PL.V + 0.5, oc = new OfflineAudioContext(1, Math.ceil(len * 24000), 24000);
        ES.voiceStart(oc, V0, oc.destination, 0, 0, 0); const y = (await oc.startRendering()).getChannelData(0), R = 24000;
        const rms = (t0, t1) => { let s = 0, m = 0; for (let i = Math.max(0, Math.round(t0 * R)); i < Math.min(y.length, Math.round(t1 * R)); i++) { s += y[i] * y[i]; m++; } return m ? Math.sqrt(s / m) : 0; };
        let jump = 0; if (segs.length === 2) for (const t of [segs[0].d, segs[1].t]) for (let i = Math.round((t - 0.005) * R); i < Math.round((t + 0.005) * R); i++) jump = Math.max(jump, Math.abs(y[i] || 0));
        const tp = at(pe), tl = at(ls), peak = rms(tl, tl + 0.3);
        out[k] = { n, pieces: P.length, was: +(ls - pe).toFixed(3), now: +(tl - tp).toFixed(3), segs: segs.length, quiet: rms(tp + 0.06, tl - 0.06), loud: peak, jump, dB: +(20 * Math.log10(Math.max(1e-9, rms(tp + 0.06, tl - 0.06)) / Math.max(1e-9, peak))).toFixed(1) };
      }
      return out; });
    for (const [k, v] of Object.entries(res)) {
      const want = Math.max(CALL, v.was);
      ok(`나 ${k} 녹음 쉼 ${v.was}초 → 장면 ${v.now}초 · 마디 ${v.segs} · 쉼은 «입장» 소리보다 ${-v.dB}dB 조용 · 끊는 자리 최대 ${v.jump.toExponential(1)}`,
        v.pieces === v.n && Math.abs(v.now - want) < 0.01 && (v.was >= CALL ? v.segs === 1 : v.segs === 2) && v.dB < -25 && v.jump < 0.01, v);
    }
  } catch (e) { ok('나 잴 수 없었다 — ' + (e && e.message || e).split('\n')[0], false); }
  await br.close(); srv.close();
}
console.log(fail ? `entry-call-pause: FAIL ${fail}` : 'entry-call-pause: ok');
process.exit(fail ? 1 : 0);
