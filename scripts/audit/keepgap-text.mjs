#!/usr/bin/env node
/* ★★[KEEPGAP_TEXT_1031 2026-10-31 사장님 [대본 공지 · 규칙 하나]] 음성 쉼(keepGap)이 붙은 문장을 글 PR 이 건드리면 빨강.
   COMMA_ROLL_1031(#1458)로 문장 안 쉼표 쉼 60자리 · 55클립을 넓혔다(PAUSE_PREF_1030 57자리 · 입장 구호 ENTRY_GAP_KEEP 도 같은 표시).
   그 쉼은 소리 파일 안에 있다 — 글이 바뀌면 새로 받는 소리에는 그 쉼이 없으니 «음성 쉼 다시 받기»가 필요하다.
   흐름 쉼 표 열쇠 검사(FLOW_KEY_FRESH_1030)와 같은 꼴:
     장부 docs/plans/식순연구/음성쉼_1031.json — keep(표시가 살아 있는 문장 · 클립 · 글) · redo(글이 바뀌어 다시 받을 문장)
     ① keep 의 문장이 대장(타입캐스트/manifest.json · 엔진 글)에서 사라졌다 → FAIL «음성 쉼 다시 받기 필요 · 클립 id»
        → 그 PR 에서 `--ack` 로 redo 로 옮기고 [대본 공지]에 «음성 쉼 다시 받기 필요 · 클립 id»를 적는다
     ② 글은 그대로인데 창고(_src/_index.json)에서 keepGap 표시만 빠졌다 → FAIL(소리를 옮기다 표시를 버린 것 · KEEPGAP_CARRY_1023 과 같은 병)
     ③ 창고에 새 keepGap 이 생겼는데 장부에 없다 → FAIL(`--write` 로 더한다 · 더하기만 한다)
     redo 는 알리기만 한다(다시 받아 표시가 붙으면 `--write` 가 keep 으로 되돌린다)
   node scripts/audit/keepgap-text.mjs [--write | --ack]   종료 코드 0 통과 · 1 실패 · 스스로 깨 보기가 어긋나도 1 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEDGER = 'docs/plans/식순연구/음성쉼_1031.json';
const MANI = 'docs/plans/식순연구/타입캐스트/manifest.json';
const IDX = 'assets/audio/_src/_index.json';
const clipOf = (id) => String(id).split('#')[0];
const short = (t) => (String(t).length > 26 ? String(t).slice(0, 26) + '…' : String(t));

export function scan(ledger, mani, idx) {
  const sents = new Map(mani.clips.map((c) => [`${c.no}_${c.file}`, new Set(c.sents.map((s) => s.text))]));
  const marked = new Map();   // clip|text → 창고 자리(keepGap)
  for (const [id, e] of Object.entries(idx.slots || {})) if (e && e.keepGap) marked.set(clipOf(id) + '|' + e.text, id);
  const inEngine = (x) => !!(sents.get(x.clip) && sents.get(x.clip).has(x.text));
  const textGone = [], flagGone = [], back = [];
  const known = new Set();
  for (const x of ledger.keep || []) {
    known.add(x.clip + '|' + x.text);
    if (!inEngine(x)) textGone.push(x);
    else if (!marked.has(x.clip + '|' + x.text)) flagGone.push(x);
  }
  for (const x of ledger.redo || []) { known.add(x.clip + '|' + x.text); if (inEngine(x) && marked.has(x.clip + '|' + x.text)) back.push(x); }
  const fresh = [];
  for (const [k, id] of marked) if (!known.has(k)) { const [clip, ...t] = k.split('|'); fresh.push({ clip, text: t.join('|'), id }); }
  return { textGone, flagGone, fresh, back };
}

const direct = !!process.argv[1] && /keepgap-text\.mjs$/.test(process.argv[1]);
if (direct) {
  const WRITE = process.argv.includes('--write'), ACK = process.argv.includes('--ack');
  let ledger, mani, idx;
  try {
    mani = JSON.parse(fs.readFileSync(path.join(ROOT, MANI), 'utf8'));
    idx = JSON.parse(fs.readFileSync(path.join(ROOT, IDX), 'utf8'));
    ledger = fs.existsSync(path.join(ROOT, LEDGER)) ? JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER), 'utf8')) : { keep: [], redo: [] };
  } catch (e) { console.log('FAIL 못 읽었다 — ' + e.message); process.exit(1); }
  ledger.keep = ledger.keep || []; ledger.redo = ledger.redo || [];
  /* ★[CLIP_STATUS_1031 검토 175] 안 나는 녹음(retired · legacy · dormant · 안 트는 배역 CAST_MUTE)의 음성 쉼은 재지 않는다 — 장부 줄은 그대로(표시만) · 쓰기(--write · --ack)도 그 줄을 건드리지 않는다 */
  const { statusAny, PAUSE_OUT, countLine, liveNarration, LIVE_LINE } = await import('../lib/clip-status.mjs');
  console.log(LIVE_LINE(liveNarration().length));
  const _isOut = (clip) => PAUSE_OUT.has(statusAny(clip));
  const scanLive = (lg, mn, ix) => { const q = scan({ keep: (lg.keep || []).filter((x) => !_isOut(x.clip)), redo: (lg.redo || []).filter((x) => !_isOut(x.clip)) }, mn, ix);
    return { ...q, fresh: q.fresh.filter((x) => !_isOut(x.clip)) }; };
  const _outClips = [...new Set([...ledger.keep, ...ledger.redo].map((x) => x.clip).filter(_isOut))];
  if (_outClips.length) console.log(`알림 안 나는 녹음 ${_outClips.length}클립의 음성 쉼은 세지 않음(${countLine(_outClips)} · assets/audio/clip-status.json)`);
  let r = scanLive(ledger, mani, idx);
  if (WRITE || ACK) {
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const key = (x) => x.clip + '|' + x.text;
    if (ACK) { const g = new Set(r.textGone.map(key)); ledger.keep = ledger.keep.filter((x) => !g.has(key(x))); for (const x of r.textGone) ledger.redo.push({ clip: x.clip, text: x.text, since: day }); }
    if (WRITE) {
      for (const x of r.fresh) ledger.keep.push({ clip: x.clip, text: x.text });
      const b = new Set(r.back.map(key)); ledger.redo = ledger.redo.filter((x) => !b.has(key(x))); for (const x of r.back) ledger.keep.push({ clip: x.clip, text: x.text });
    }
    ledger.keep.sort((a, b) => a.clip.localeCompare(b.clip) || a.text.localeCompare(b.text));
    ledger.about = '[KEEPGAP_TEXT_1031] 음성 쉼(keepGap · 소리 안쪽 쉼)이 붙은 문장 장부 — 손으로 고치지 않는다 · node scripts/audit/keepgap-text.mjs --write(새 표시 더하기 · 다시 받은 문장 되돌리기) · --ack(글이 바뀐 문장을 redo 로)';
    fs.writeFileSync(path.join(ROOT, LEDGER), JSON.stringify({ about: ledger.about, keep: ledger.keep, redo: ledger.redo }, null, 1) + '\n');
    console.log(`장부 씀 — keep ${ledger.keep.length} · redo ${ledger.redo.length}`);
    r = scanLive(ledger, mani, idx);
  }
  for (const x of r.textGone) console.log(`FAIL 음성 쉼 다시 받기 필요 · ${x.clip} «${short(x.text)}» — 글이 바뀌었다 · 그 PR 에서 --ack 로 redo 에 옮기고 [대본 공지]에 «음성 쉼 다시 받기 필요 · ${x.clip}»`);
  for (const x of r.flagGone) console.log(`FAIL ${x.clip} «${short(x.text)}» — 글은 그대로인데 창고 keepGap 표시가 빠졌다(조립기가 그 쉼을 깎는다 · sent-lib 옮기기 확인)`);
  for (const x of r.fresh) console.log(`FAIL 장부에 없는 keepGap — ${x.id} «${short(x.text)}» · node scripts/audit/keepgap-text.mjs --write`);
  for (const x of r.back) console.log(`알림 다시 받아 표시가 붙었다 — ${x.clip} «${short(x.text)}» · --write 로 keep 에 되돌린다`);
  if (ledger.redo.length) console.log(`알림 음성 쉼 다시 받기 대기 ${ledger.redo.length} — ${[...new Set(ledger.redo.map((x) => x.clip))].join(' · ')}`);
  /* 스스로 깨 보기 */
  let dead = 0;
  const _bad = new Set([...r.textGone, ...r.flagGone].map((x) => x.clip + '|' + x.text)), k0 = ledger.keep.find((x) => !_bad.has(x.clip + '|' + x.text) && !_isOut(x.clip));   // 깨 보기는 지금 멀쩡한 문장으로
  if (k0) {
    const m2 = JSON.parse(JSON.stringify(mani)); const c = m2.clips.find((c) => `${c.no}_${c.file}` === k0.clip); const s = c && c.sents.find((s) => s.text === k0.text); if (s) s.text += ' 고침';
    if (!scanLive(ledger, m2, idx).textGone.length) { dead++; console.log('FAIL 깨 보기 «keep 문장 글 바꾸기» — 빨강이 안 됐다'); }
    const i2 = JSON.parse(JSON.stringify(idx)); for (const e of Object.values(i2.slots)) if (e && e.text === k0.text) delete e.keepGap;
    if (!scanLive(ledger, mani, i2).flagGone.length) { dead++; console.log('FAIL 깨 보기 «표시 떼기» — 빨강이 안 됐다'); }
    if (!scanLive({ keep: ledger.keep.filter((x) => x !== k0), redo: ledger.redo }, mani, idx).fresh.length) { dead++; console.log('FAIL 깨 보기 «장부에서 한 줄 빼기» — 빨강이 안 됐다'); }
  } else { dead++; console.log('FAIL 장부 keep 에 멀쩡한 문장이 없다 — 이 검사가 볼 것이 없다'); }
  const n = r.textGone.length + r.flagGone.length + r.fresh.length + dead;
  if (n) { console.log(`✗ KEEPGAP_TEXT_1031 실패 ${n}건`); process.exit(1); }
  const _lk = ledger.keep.filter((x) => !_isOut(x.clip));
  console.log(`ok keepgap-text — 음성 쉼 문장 ${_lk.length}곳(클립 ${new Set(_lk.map((x) => x.clip)).size} · 안 나는 녹음 ${_outClips.length}클립 제외) 글 그대로 · 표시 그대로 · 다시 받기 대기 ${ledger.redo.length} · 깨 보기 3개 맞음`);
  process.exit(0);
}
