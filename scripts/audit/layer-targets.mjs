#!/usr/bin/env node
/* ★★[LAYER_PLAN_1108 · 사장님 «식순 안 모든 나레이션 적용 · 저번처럼 빼먹으면 안 돼»] 층 대상 목록 — 사이트가 트는 나레이션 소리 전부
   대상 = assets/audio/narration/*.mp3 전부(쓰지 않는 클립까지) + 1층에 새로 생기는 클립(350 · 356 · 357)
   원천: _src 완전(문장 자리 다 있고 글 같음) → 창고에서 조립 / 그 밖 → 지금 mp3 를 한 번만(문장 경계 없음) / 예외 43(1차 그대로)
   쓰기: node scripts/audit/layer-targets.mjs [--write] → docs/plans/식순연구/층_대상목록_1108.tsv · .md · 종료 0 = 344(+새) 하나도 안 빠짐 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), P = (...a) => path.join(ROOT, ...a), req = createRequire(import.meta.url);
const NAR = P('assets/audio/narration'), LY = P('assets/audio/_src/_layers');
const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const rec = JSON.parse(fs.readFileSync(path.join(NAR, '_recorded.json'), 'utf8')).clips;
const idx = JSON.parse(fs.readFileSync(P('assets/audio/_src/_index.json'), 'utf8')).slots;
const RET = req(P('assets/ritual-cue.js')).RETIRED || {}, st = JSON.parse(fs.readFileSync(P('assets/audio/clip-status.json'), 'utf8')).clips || {};
const tsv = (f) => fs.readFileSync(path.join(LY, f), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const seats = {}; for (const r of tsv('쉼자리표_대본값_1108.tsv')) if (r[4] && r[4].trim()) seats[r[0]] = (seats[r[0]] || 0) + 1;
const phr = {}; for (const r of tsv('구절쉼자리표_1108.tsv')) phr[r[0]] = (phr[r[0]] || 0) + 1;
const roles = {}; for (const r of JSON.parse(fs.readFileSync(path.join(LY, '_roles.json'), 'utf8')).rows || []) { const k = String(r.id).split('#')[0]; roles[k] = (roles[k] || 0) + 1; }
const L1 = { '162_narr-entry-bow-ex4': '«신랑 신부,» A3', '60_narr-photo-split': '새 녹음 take1 «자리를 지켜 주세요.»', '160_narr-entry-bow': '#1636 새 원본(첫 문장)', '350_narr-welcome-in-face': '#1636 새 클립', '356_guest-w5-meal': '#1636 새 클립', '357_guest-w5-meal-online': '#1636 새 클립' };
const keys = [...new Set([...fs.readdirSync(NAR).filter((f) => f.endsWith('.mp3') && f !== 'parents-letter.mp3').map((f) => f.slice(0, -4)), '350_narr-welcome-in-face', '356_guest-w5-meal', '357_guest-w5-meal-online'])];
const rows = keys.map((k) => { const c = man.clips.find((x) => String(x.no).padStart(2, '0') + '_' + x.file === k), r = rec[k], isNew = !fs.existsSync(path.join(NAR, k + '.mp3'));
  const voice = (r && typeof r === 'object' && r.voice) || (c ? (man.voice || {})[String(c.role).split('|')[0]] : '') || '모름';
  let src = '없음'; if (c && !c.mix) { const ok = c.sents.map((s) => { const e = idx[k + '#' + s.i]; return e && fs.existsSync(P('assets/audio/_src', k, s.i + '.flac')) ? (e.text === s.text ? 2 : 1) : 0; }); src = ok.every((x) => x === 2) ? '있음' : (ok.some((x) => x) ? '일부·글다름' : '없음'); }
  const use = c && (RET[c.file] || (st['narration/' + k] && st['narration/' + k].s === 'retired')) ? '안 씀' : (c ? '씀' : '씀(대장 밖)');
  const ex = k === '43_parents-letter', from = ex ? '예외' : (isNew ? '#1636 원본' : (src === '있음' ? '_src' : 'mp3 한 번'));
  const n = c ? c.sents.length : ((r && (typeof r === 'object' ? r.text : r)) || '').split(/(?<=[.?!])\s+/).filter(Boolean).length;
  const one = from === 'mp3 한 번';
  const lay = ex ? Array(6).fill('제외 · 1차 그대로(대본 11/08 20:00)') : [
    L1[k] ? '적용 · ' + L1[k] : '그대로(바꿀 내용 없음)',
    '적용 · 0.97' + (one ? '(파일 통째 · 0.25초 넘는 쉼 그대로)' : ''),
    one ? '제외 · 문장 경계 없음 → 2층 0.97' : `적용 · 역할표 ${roles[k] || 0}문장(없는 문장 0.97)`,
    seats[k] ? `적용 · ${seats[k]}곳` : '그대로(표에 자리 없음)',
    phr[k] ? `적용 · ${phr[k]}곳` : '그대로(표에 자리 없음)',
    one ? '제외 · 문장 경계 없음' : (n > 1 ? '적용 · 튀는 문장만(조립 때 잼)' : '그대로(한 문장)')];
  return { k, voice, n, src, use, from, lay }; });
const cnt = (f) => rows.reduce((o, x) => (o[f(x)] = (o[f(x)] || 0) + 1, o), {});
const head = ['파일', '목소리', '문장 수', '_src', '쓰임', '원천', '1층', '2층', '3층', '4층', '5층', '6층'];
const line = (x) => [x.k + '.mp3', x.voice, x.n, x.src, x.use, x.from, ...x.lay];
const miss = Object.keys(seats).filter((k) => !keys.includes(k)).concat(Object.keys(phr).filter((k) => !keys.includes(k)));
const sum = `대상 ${rows.length} = 지금 mp3 ${rows.length - 3} + 1층 새 클립 3 · 원천 ${JSON.stringify(cnt((x) => x.from))} · 목소리 ${JSON.stringify(cnt((x) => x.voice))} · 쉼 표 자리 중 대상 밖 ${miss.length}`;
if (process.argv.includes('--write')) {
  fs.writeFileSync(P('docs/plans/식순연구/층_대상목록_1108.tsv'), [head, ...rows.map(line)].map((r) => r.join('\t')).join('\n') + '\n');
  fs.writeFileSync(P('docs/plans/식순연구/층_대상목록_1108.md'), `# 층 대상 목록 · LAYER_PLAN_1108

> 생성물 — \`node scripts/audit/layer-targets.mjs --write\` · 대상 = assets/audio/narration/*.mp3 전부(쓰지 않는 클립까지 · parents-letter.mp3 는 43 사본이라 43 과 한 줄) + 1층 새 클립(350 · 356 · 357)
> ${sum}
> 원천: «_src» = 창고 문장 원본에서 조립 · «mp3 한 번» = 창고가 없거나(대장 밖) 글이 바뀐 옛 자리라 지금 mp3 를 디코드해 한 번만 처리 · «예외» = 편지 43(1차 그대로)
> 대상 밖(대본이 정함): assets/audio/cast/ 25개 = 배역 예시 읽기(진한 · 예슬 등 · 당일 콘솔은 안 튼다) · assets/audio/tone/ 186개 = 어조 견본(실청 페이지 listen-abb5d829.html 에서만)

## 원천이 «mp3 한 번»인 클립
${rows.filter((x) => x.from === 'mp3 한 번').map((x) => `- ${x.k} · ${x.voice} · ${x.use} · _src ${x.src}`).join('\n')}

## 전체
| ${head.join(' | ')} |
|${head.map(() => '---').join('|')}|
${rows.map((x) => '| ' + line(x).join(' | ') + ' |').join('\n')}
`); }
console.log(`${miss.length ? 'FAIL' : 'ok  '} layer-targets — ${sum}${miss.length ? ' · 대상 밖: ' + miss.join(',') : ''}`);
process.exit(miss.length ? 1 : 0);
