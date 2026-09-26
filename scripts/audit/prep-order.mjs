// «예식 준비» 카드의 행 순서 [PREP_ORDER_0926 2026-09-26 사장님 지시]
//   사장님 원문: «위에서부터 청첩장, 좌석·음료, 애프터웨딩, 식순, 단체사진 순으로 하자»
//   순서는 mypage.html productionDashHtml 의 _prepRows 배열 하나가 정한다(그 순서대로 이어 붙인다).
//   식순 아래 접힘 두 줄(준비 목록 _ritPrepFold · 부케 _bouquetFold)은 식순에 딸린 것이라 식순 바로 뒤에 있어야 한다.
//   [CF_ORDER_0926] 예식 확인서(prodConfirmHtml)의 줄도 같은 순서로 붙어야 한다(좌석 배치는 좌석 · 음료 바로 뒤).
//   ★[SERVED_OURS] 배열을 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let my = '';
try { my = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'); } catch (e) { console.log('━━ prep-order — mypage.html 이 없습니다 · 재지 못했습니다'); process.exit(2); }
const a = my.indexOf('  var _prepRows=[');
if (a < 0) { console.log('━━ prep-order — _prepRows 배열을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const b = my.indexOf('\n  ];', a);
const blk = my.slice(a, b);
const want = [["row('청첩장'", '청첩장'], ["row('좌석 · 음료'", '좌석 · 음료'], ["row('애프터 웨딩'", '애프터 웨딩'], ["row('식순'", '식순'],
  ['_ritPrepFold(', '식순 준비 목록(식순에 딸림)'], ['_bouquetFold(', '부케(식순에 딸림)'], ["'단체 사진'", '단체 사진']];
const pos = want.map(([k, n]) => [blk.indexOf(k), n]);
const bad = [];
pos.forEach(([p, n]) => { if (p < 0) bad.push(`«${n}» 행을 배열에서 못 찾았다`); });
for (let i = 1; i < pos.length; i++) if (pos[i][0] >= 0 && pos[i - 1][0] >= 0 && pos[i][0] < pos[i - 1][0]) bad.push(`«${pos[i][1]}» 가 «${pos[i - 1][1]}» 보다 앞에 있다`);
// [CF_ORDER_0926] 예식 확인서(prodConfirmHtml)도 같은 순서로 줄을 붙인다 — 카드만 바꾸면 채울 때와 훑어볼 때 순서가 달라진다
const ca = my.indexOf('function prodConfirmHtml('), cb = ca < 0 ? -1 : my.indexOf('\nfunction ', ca + 10);
if (ca < 0 || cb < 0) { console.log('━━ prep-order — prodConfirmHtml 을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
const cblk = my.slice(ca, cb);
const cwant = [["L+=line('청첩장'", '확인서 청첩장'], ["L+=line('좌석 · 음료'", '확인서 좌석 · 음료'], ["L+=line('좌석 배치'", '확인서 좌석 배치'], ["L+=line('애프터 웨딩'", '확인서 애프터 웨딩'], ["L+=line('식순'", '확인서 식순'], ["L+=line('단체 사진'", '확인서 단체 사진']];
const cpos = cwant.map(([k, n]) => [cblk.indexOf(k), n, cblk.split(k).length - 1]);
cpos.forEach(([p, n, c]) => { if (p < 0) bad.push(`«${n}» 줄을 못 찾았다`); else if (c !== 1) bad.push(`«${n}» 줄이 ${c}번 붙는다(한 번이어야 한다)`); });
for (let i = 1; i < cpos.length; i++) if (cpos[i][0] >= 0 && cpos[i - 1][0] >= 0 && cpos[i][0] < cpos[i - 1][0]) bad.push(`«${cpos[i][1]}» 가 «${cpos[i - 1][1]}» 보다 앞에 붙는다`);
if (bad.length) { console.log('━━ prep-order — 빨강 ' + bad.length + '건'); bad.forEach((x) => console.log('   · ' + x)); process.exit(1); }
console.log('━━ prep-order OK — 청첩장 › 좌석 · 음료 › 애프터 웨딩 › 식순(+준비 목록 · 부케) › 단체 사진 · 예식 확인서도 같은 순서');
process.exit(0);
