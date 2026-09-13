// 복사·저장이 «안 됐는데» 성공을 단언하지 않는지 본다  [COPY_TRUTH]
//   node scripts/audit/copy-truth.mjs
//
// ★왜 — mypage 는 계좌·코드·링크를 복사하는 버튼이 13곳이다. 그 전부가
//     `legacyCopy(t); ok();` 였고 legacyCopy 는 catch(e){} 로 실패를 삼켰다.
//     execCommand 가 false 를 돌려줘도 화면은 「복사됐어요」라고 했다.
//     QR 저장도 같았다 — 새 탭으로 떨어진 폴백에서도 「저장됐어요」가 떴다.
//     집 규칙(근거 없는 완료 단언 금지)에 정면으로 어긋나는 자리다.
//
// ★이 검사가 막는 것 — 앞으로 복사 버튼을 하나 더 달 때 옛 꼴을 복사해 붙이는 것.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
const bad = [];
const ok = [];

// ① legacyCopy 는 성공 여부를 돌려줘야 한다
if (/function legacyCopy\(t\)\{[\s\S]*?return !!okc;[\s\S]*?catch\(e\)\{ return false; \}/.test(body)) ok.push('legacyCopy 가 성공 여부를 돌려준다');
else bad.push('legacyCopy 가 성공 여부를 안 돌려준다 — 실패를 삼키면 「복사됐어요」가 거짓이 된다');

// ② 옛 꼴(성공을 단언하는 직접 호출)이 남아 있으면 안 된다
const old = (body.match(/legacyCopy\([A-Za-z_]+\);\s*[A-Za-z_]+\(\);/g) || []);
if (old.length === 0) ok.push('옛 꼴 `legacyCopy(x); ok();` 0곳');
else bad.push(`옛 꼴 ${old.length}곳 남음 — copyThen(text, ok) 을 쓸 것: ${old[0]}`);

// ③ copyThen 이 실패를 «말해야» 한다
if (/function copyThen\([\s\S]*?fail\(\)/.test(body) && /복사가 안 됐어요/.test(body)) ok.push('copyThen 이 실패를 알린다');
else bad.push('copyThen 이 실패 경로에서 아무 말도 하지 않는다');

// ④ 복사 버튼이 전부 copyThen 을 거치는가 — 「복사됐어요」 개수와 copyThen 호출 개수를 맞댄다
const says = (body.match(/복사됐어요/g) || []).length;
const uses = (body.match(/copyThen\(/g) || []).length - 1;   // 정의 1개 제외
if (uses >= says - 1) ok.push(`복사 성공 문구 ${says}곳 ↔ copyThen 호출 ${uses}곳`);
else bad.push(`「복사됐어요」 ${says}곳인데 copyThen 은 ${uses}곳뿐 — 어딘가 옛 경로가 남았다`);

// ⑤ QR: 새 탭 폴백에서 저장을 단언하지 않는가
if (/_qrDl[\s\S]{0,400}?return true;[\s\S]{0,400}?return false;/.test(body)) ok.push('_qrDl 이 «다운로드/새 탭»을 구분해 돌려준다');
else bad.push('_qrDl 이 폴백 여부를 안 돌려준다 — 새 탭에 띄우고도 「저장됐어요」가 뜬다');
if (/done\(_qrDl\(src,fname\)\)/.test(body) && /새 탭에 QR을 띄웠어요/.test(body)) ok.push('QR 폴백에서 저장을 단언하지 않는다');
else bad.push('QR done() 이 폴백을 구분하지 않는다');

// 자기반증 — 옛 꼴을 넣으면 반드시 걸려야 한다
{
  const probe = body + '\nlegacyCopy(zz); zzOk();\n';
  if (!(probe.match(/legacyCopy\([A-Za-z_]+\);\s*[A-Za-z_]+\(\);/g) || []).length) bad.push('자기반증 실패 — 옛 꼴을 넣어도 안 걸린다(검사가 헛것이다)');
}

for (const o of ok) console.log(`ok ${o}`);
for (const b of bad) console.error(`FAIL ${b}`);
console.log(`결과 — 통과 ${ok.length} · 실패 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
