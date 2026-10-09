#!/usr/bin/env node
/* ★[PUB_RULES_ONLY 2026-10-09 점검] 공개 저장소에는 규칙만 — 지운 설명 문장이 되살아나지 않게 «해시»로 지킨다.
   종전에는 merge-guard 의 nochk 줄이 지운 문장을 그대로 다시 싣고 있었다(지키려던 문장을 지키는 줄이 공개했다).
   여기에는 문장 대신 길이 · 앞뒤 글자 번호 · sha256 앞 16자만 둔다. 문장 원문은 비공개 docs(기획 부록 B19)에 둔다.
   이 검사는 «앞으로 다시 싣지 않기»만 지킨다(지난 기록은 바꾸지 않는다).
   [PUB_RULES_WIDE 2026-10-09 라운드 3] 저장소 전체의 글 파일(gs · html · md · json · sh · js · mjs · txt · yml)을 본다 — 설명은 어디에나 적힐 수 있다.
   시험 입력으로 일부러 쓰는 자리만 ALLOW 에 «파일 → 해시 앞 6자»로 연다.
   새로 막을 문장이 생기면: node -e 로 {len, a, z, h} 를 만들어 PHRASES 에 더한다(원문을 이 파일 · 커밋에 적지 않는다).
   종료: 0 통과 · 1 빨강 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.chdir(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));   // 어디서 불러도 저장소 뿌리에서 센다

const PHRASES = [
  { len: 7, a: 61, z: 40, h: 'a6fdbdf77e43bacc' },
  { len: 17, a: 44277, z: 45796, h: '7ea562a5165b2049' },
  { len: 15, a: 50715, z: 44036, h: 'cbfc7f70d86e486f' },
  { len: 14, a: 51333, z: 51064, h: 'f3968d06ad5fc6e4' },
];
// 시험 입력으로 일부러 쓰는 자리(파일 → 해시 앞 6자) — 여기 말고는 어디서도 안 된다
const ALLOW = { 'scripts/audit/err-log-safe.mjs': ['a6fdbd'] };
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { if (f === '.git' || f === 'node_modules') continue; const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(gs|html|md|json|sh|js|mjs|txt|ya?ml)$/.test(f) && st.size < 8e6 && p !== path.join('scripts', 'audit', 'pub-rules.mjs')) files.push(p); } })('.');

const bad = [];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const P of PHRASES) {
    for (let i = s.indexOf(String.fromCharCode(P.a)); i !== -1 && i + P.len <= s.length; i = s.indexOf(String.fromCharCode(P.a), i + 1)) {
      if (s.charCodeAt(i + P.len - 1) !== P.z) continue;
      if (crypto.createHash('sha256').update(s.slice(i, i + P.len), 'utf8').digest('hex').slice(0, 16) === P.h && (ALLOW[f.split(path.sep).join('/')] || []).indexOf(P.h.slice(0, 6)) === -1) {
        bad.push(`${f}:${s.slice(0, i).split('\n').length} — 지운 설명 문장이 되살아났다(해시 ${P.h.slice(0, 6)})`);
      }
    }
  }
}
if (bad.length) { console.log('━━ pub-rules — 빨강 ' + bad.length + '건 [PUB_RULES_ONLY]'); for (const b of bad) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ pub-rules — 통과 · 문장 ' + PHRASES.length + '개 · 파일 ' + files.length + '개 [PUB_RULES_ONLY]');
