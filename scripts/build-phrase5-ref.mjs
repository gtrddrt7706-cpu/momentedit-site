#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 5층 · 대본 11/09 19:55] 구절 쉼 자리표(_layers/구절쉼자리표_v2_1109.tsv 195곳) → 층5_자리.json
   대본 시각은 «1층 mp3»(98a4a91^ · 대본이 받아쓰기로 잰 판) 기준 — 그 시각을 ①지금 1층 mp3(같은 재료표로 다시 만든 판 · 141 · 148 은 테이크가 바뀌어 창 맞춤으로 옮긴다)
   ②그 문장의 1층 깔린 파일(조립 전 · loudnorm 없음)로 옮겨 그 자리 무음을 고르고, 문장 안 에너지 누적 비율 f · 무음 문턱 · 자리 본(±0.3초 로그 크기)을 적는다
   5층 만들기(build-layers --layer 5)는 4층까지 만든 깔린 문장에서 f 근처를 자리 본으로 다시 찾는다(빠르기 비 0.88 ~ 1.18 · 5ms)
   쓰기: KEEP_IN=<1층 깔린 폴더> SEAT_LOG=<1층 기록> node scripts/build-layers.mjs --layer 1 --clip <자리표 클립> --out <1층 mp3 폴더>
         node scripts/build-phrase5-ref.mjs --l1-out <1층 mp3 폴더> --l1-seat <1층 기록> --l1-in <1층 깔린 폴더> [--l4-in <4층 깔린 폴더>(맞춤 확인)] [--write] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
import { pcm } from './lib/cps.mjs'; import * as P5 from './lib/phrase5.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), P = (...a) => path.join(ROOT, ...a);
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const REF = '98a4a91^';   // 대본이 시각을 잰 1층 mp3(2층 커밋 바로 앞)
/* 손으로 정한 자리 — 4층까지의 원천이 1층과 다른 녹음이라 자리 본이 안 맞는 곳(글자 비율로 고른다) */
const BY_TEXT = { '148_narr-open-ex2#1/마음으로': '3층부터 새 녹음(148_s1_REC_148_1_1109) — 1층 테이크와 다른 소리 · 글자 비율 0.65 근처 무음(−30 dB)',
  '211_narr-candle-out-ex2#0/위해': '3층부터 새 녹음(REC_FAST19_1110) — 1층 소리로 못 찾아 글자 비율(말소리 앞뒤 사이) 근처 무음(−30 dB)', '256_tribute-hug#0/부모님께서는': '3층부터 새 녹음(REC_FAST19_1110) — 1층 소리로 못 찾아 글자 비율(말소리 앞뒤 사이) 근처 무음(−30 dB)' };
/* 걸림을 손으로 확인한 자리 — 까닭(11/10) · 이 자리는 걸림으로 세지 않고 만들기도 멈추지 않는다 */
const CHECKED = {
  '141_narr-tribute-name#0/부모님께': '테이크가 바뀌어 대본 판 창 맞춤 0.936 — 대본 판에서 «섭섭하고,» 무음 ~ 말 끝 사이 비율 0.574 를 4층에 대면 4.85초 = 자리 본이 고른 4.83 ~ 4.88(0.05)',
  '148_narr-open-ex2#0/속에서도': '테이크가 바뀌어 대본 판 창 맞춤 0.911 — 4층 자리 본 1.70 ~ 1.78 = 글자 비율 1.68 근처 같은 무음',
  '148_narr-open-ex2#0/여러분께': '테이크가 바뀌어 대본 판 창 맞춤 0.943 — 대본 판 «속에서도» ~ 말 끝 비율 0.600 을 4층에 대면 6.34초 = 자리 본이 고른 6.33 ~ 6.38(0.055)',
  '241_tribute-call-say-ex3#0/담아서': '같은 소리 · 깔린 파일 문턱(이득 차)으로 무음이 0.165 로 잡힘(대본 0.21) — 4층 같은 자리 0.18 · 글자 비율도 같은 무음',
  '06_entry-B#4/신부가': '4층 자리 본 맞춤 0.734(옆 무음 모양이 3층 빠르기로 달라짐) — 글자 비율 0.655 가 같은 무음 6.29 ~ 6.58 을 고름 · 길이 0.29 ≈ 1층 0.275',
};
const rows = fs.readFileSync(P('assets/audio/_src/_layers/구절쉼자리표_v2_1109.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const seat = fs.readFileSync(arg('--l1-seat'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.s != null);
const stF = (dir, key, s) => { const f = fs.readdirSync(dir).find((x) => new RegExp('^\\d{4}_' + key.replace(/[-]/g, '\\-') + '_' + s + '(_JOINED_)?\\.flac$').test(x)); return f && path.join(dir, f); };
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'p5ref-')), cache = {};
const E = (f, a, b) => { const k = f + '|' + a + '|' + b; return cache[k] || (cache[k] = P5.env(pcm(f, a, b))); };
const gitMp3 = (key) => { const f = path.join(TMP, key + '.mp3'); if (!fs.existsSync(f)) fs.writeFileSync(f, execFileSync('git', ['show', `${REF}:assets/audio/narration/${key}.mp3`], { cwd: ROOT, maxBuffer: 1 << 26 })); return f; };
const hc = (t) => (t.match(/[가-힣]/g) || []).length;
const places = [], bad = [];
rows.forEach((r, n) => { const [key, s, kind, w1, w2, tStr, orig, want, why, text] = r, id = key + '#' + s, t = +tStr;
  if (!fs.existsSync(P('assets/audio/_src', key))) return;   // [CAKE_FILES_OFF_1110] 지운 클립(107 «위하여» 자리) — 표 줄 번호는 그대로
  const base = { n: n + 1, id, key, s: +s, kind, w1, w2, want: +want, orig: +orig, ...(CHECKED[id + '/' + w1] ? { checked: CHECKED[id + '/' + w1] } : {}) };
  if (BY_TEXT[id + '/' + w1]) { const i = text.indexOf(w1 + ' ' + w2), f = hc(text.slice(0, i + w1.length)) / hc(text); places.push({ ...base, how: 'text', f: +f.toFixed(4), thrDb: -30, why: BY_TEXT[id + '/' + w1] }); return; }
  const sp = seat.find((x) => x.key === key && x.s === +s), f1 = stF(arg('--l1-in'), key, s), mp3 = path.join(arg('--l1-out'), key + '.mp3');
  if (!sp || !f1) { bad.push(`${id} ${w1} — 1층 ${!sp ? '기록' : '깔린 파일'} 없음`); return; }
  /* ①대본 판 → 지금 1층 판(같은 소리면 0) */
  const eg = E(gitMp3(key)), eo = E(mp3), m1 = P5.lagOf(eg, eo, t, -0.6, 0.6), t1 = t + m1.lag;
  /* ②mp3 문장 → 깔린 파일(앞 무음 깎기 · 이득) */
  const seg = E(mp3, sp.a, sp.b), st = E(f1), tau = t1 - sp.a, { lag, r: corr } = P5.lagOf(seg, st, tau, -0.2, 1.5);
  const rat = []; for (let i = 0; i < seg.length; i++) { const j = i + Math.round(lag / P5.WS); if (j >= 0 && j < st.length && P5.db(seg[i]) > -25) rat.push(P5.db(seg[i]) - P5.db(st[j])); } rat.sort((a, b) => a - b);
  const g = rat[rat.length >> 1] || 0, thrDb = +(-30 - g).toFixed(1), d = P5.dipNear(st, tau + lag, Math.pow(10, thrDb / 20), 0.05), mid = (d.a + d.b) / 2;
  const p = { ...base, f: +P5.fracAt(P5.cum(st), mid).toFixed(4), thrDb, l1len: d.len, l1kind: d.kind, tpl: P5.tmpl(st, mid), moved: +m1.lag.toFixed(3) };
  if (!p.checked && (corr < 0.95 || m1.r < 0.95)) bad.push(`${id} ${w1} — 창 맞춤 낮음(대본 판 ${m1.r.toFixed(3)} · 깔린 ${corr.toFixed(3)})`);
  if (!p.checked && Math.abs(d.len - +orig) > 0.04) bad.push(`${id} ${w1} — 고른 무음 ${d.len} · 대본 원래 무음 ${orig}`);
  places.push(p); });
/* 4층 깔린 문장에서 다시 찾기(만들기와 같은 길) — 맞춤 r · 고른 무음 */
if (arg('--l4-in')) for (const p of places) { const f4 = stF(arg('--l4-in'), p.key, p.s); if (!f4) { bad.push(`${p.id} ${p.w1} — 4층 깔린 파일 없음`); continue; }
  const e = E(f4), x = P5.locate(e, p); p.l4 = { r: x.r, mid: x.m, len: x.d.len, kind: x.d.kind };
  if (p.how !== 'text' && !p.checked && x.r < 0.85) bad.push(`${p.id} ${p.w1} — 4층 자리 본 맞춤 ${x.r}`); }
fs.rmSync(TMP, { recursive: true, force: true });
const out = { _왜: '[LAYER_PLAN_1108 · 5층] 구절쉼자리표_v2_1109.tsv 195곳 · 자리 = 1층 깔린 문장의 그 무음(에너지 누적 비율 f · 문턱 thrDb · 자리 본 tpl) · 만든 법 scripts/build-phrase5-ref.mjs · adj = mp3 에서 다시 잰 뒤 한 번 바로잡은 값(초)', adj: {}, places };
const old = fs.existsSync(P('assets/audio/_src/_layers/층5_자리.json')) ? JSON.parse(fs.readFileSync(P('assets/audio/_src/_layers/층5_자리.json'), 'utf8')) : null; if (old) out.adj = old.adj || {};
if (process.argv.includes('--write')) fs.writeFileSync(P('assets/audio/_src/_layers/층5_자리.json'), JSON.stringify(out, null, 0).replace(/,"places":\[/, ',\n"places":[\n').replace(/\},\{"n"/g, '},\n{"n"') + '\n');
console.log(`${bad.length ? 'FAIL' : 'ok  '} phrase5-ref — 자리 ${places.length}(표 ${rows.length}) · 글자 비율 ${places.filter((p) => p.how === 'text').length} · 걸림 ${bad.length}`);
for (const b of bad) console.log('  ', b);
process.exit(bad.length ? 1 : 0);
