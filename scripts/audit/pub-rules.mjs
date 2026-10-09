#!/usr/bin/env node
/* ★[PUB_RULES_ONLY 2026-10-09 점검] 공개 저장소에는 규칙만 — 지운 설명 문장이 되살아나지 않게 «해시»로 지킨다.
   종전에는 merge-guard 의 nochk 줄이 지운 문장을 그대로 다시 싣고 있었다(지키려던 문장을 지키는 줄이 공개했다).
   여기에는 문장 대신 길이 · 앞뒤 글자 번호 · sha256 앞 16자만 둔다. 문장 원문은 비공개 docs(기획 부록 B19)에만 있다.
   새로 막을 문장이 생기면: node -e 로 {len, a, z, h} 를 만들어 PHRASES 에 더한다(원문을 이 파일 · 커밋에 적지 않는다).
   종료: 0 통과 · 1 빨강 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PHRASES = [
  { len: 7, a: 61, z: 40, h: 'a6fdbdf77e43bacc' },
  { len: 17, a: 44277, z: 45796, h: '7ea562a5165b2049' },
  { len: 15, a: 50715, z: 44036, h: 'cbfc7f70d86e486f' },
  { len: 14, a: 51333, z: 51064, h: 'f3968d06ad5fc6e4' },
];
// 설명 · 기록이 사는 공개 면 — 시험 입력(scripts/audit 의 시험 값)은 일부러 뺀다
const files = ['CLAUDE.md', 'deploy-marks.json', 'automation/tests/merge-guard.sh'];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(gs|html)$/.test(f)) files.push(p); } })('automation');

const bad = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const P of PHRASES) {
    for (let i = s.indexOf(String.fromCharCode(P.a)); i !== -1 && i + P.len <= s.length; i = s.indexOf(String.fromCharCode(P.a), i + 1)) {
      if (s.charCodeAt(i + P.len - 1) !== P.z) continue;
      if (crypto.createHash('sha256').update(s.slice(i, i + P.len), 'utf8').digest('hex').slice(0, 16) === P.h) {
        bad.push(`${f}:${s.slice(0, i).split('\n').length} — 지운 설명 문장이 되살아났다(해시 ${P.h.slice(0, 6)})`);
      }
    }
  }
}
if (bad.length) { console.log('━━ pub-rules — 빨강 ' + bad.length + '건 [PUB_RULES_ONLY]'); for (const b of bad) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ pub-rules — 통과 · 문장 ' + PHRASES.length + '개 · 파일 ' + files.length + '개 [PUB_RULES_ONLY]');
