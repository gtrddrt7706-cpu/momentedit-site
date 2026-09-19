// 혼주 편지에서 값이 큰 여덟 줄만 고친다 [PLETTER_TRIM]
//
//   node scripts/apply-parents-letter.mjs [--write]
//
// ★왜 — 2026-09-12 사장님 결정 ⑤ 「추천대로(일부만)」.
//   43_parents-letter 는 38문장 142초짜리 서면이다. 낭독물이 아니라 «우리가 양가 어른께 드리는 글»이라
//   성격이 다르다(parents.html 에서 읽고, 예식 당일에 나가지 않는다).
//   ★38문장을 다 손보지 «않는» 이유 — 이 글은 격식이 곧 내용이다. 많이 고칠수록
//     「업체가 보낸 사무적 공지」 쪽으로 미끄러진다. 값이 확실한 자리만 여덟 줄 고친다.
//   ★그래도 재녹음은 클립 하나 통째다(38문장). 「일부만」의 값은 녹음 절약이 아니라
//     «바꾸는 문장이 적을수록 격식이 안 흔들린다»는 데 있다. 그 점을 사장님께 분명히 말할 것.
//
// ★★[고친 여덟 줄과 근거]
//   ①「저희가 감히 다 알지 못합니다」 — 과공은 비례(非禮)다. 어른께 드리는 글에서 스스로를
//     지나치게 낮추면 오히려 거리가 생기고, 뒤에 이어지는 「가볍게 만들지 않겠다」는 다짐이 약해진다.
//     낮춤을 빼면 같은 뜻이 더 곧게 선다.
//   ②③「오신 모든 분과 눈을 맞추고」가 연속 두 문장에 그대로 두 번 나온다(10·11행).
//     서면이라 눈으로 읽는 글인데 같은 구절이 붙어 있으면 바로 걸린다. 뒤쪽을 바꾼다.
//   ④「마련」이 5회다. 이 글에서 제일 닳은 낱말이고, 다섯 번 나오면 «틀»이 보인다. 2회로 줄인다.
//   ⑤⑥「축하의 마음」 대목 — 어른이 가장 궁금해하실 자리인데 가장 에둘러 말한다.
//     「축하의 마음은 청첩장과 함께 정중히 안내드리고, 감사히 받습니다」를 두 번 읽어야 뜻이 잡힌다.
//     ★어른께 드리는 글에서 돈 이야기를 흐리면 «숨긴다»는 인상이 남는다. 곧게 쓰되 짧게 쓴다.
//   ⑦「형식이 달라도, 함께해 주신 모든 마음은 소중히 받습니다」 — 「마음」이 한 문장 건너 세 번이다.
//   ⑧착지 「…올립니다. / 모먼트에디트 올림.」 — 「올립니다」와 「올림」이 붙어 있다.
//     서명 바로 앞 문장이 서명과 같은 말을 하면 맺음이 두 번이 된다.
//
// ★[안 건드린 것] 「하나·둘·셋·넷」 네 꼭지의 «내용»과 순서. 어른이 궁금해하실 것을 정리한
//   뼈대라 그대로 둔다. 고친 것은 전부 «표현»이지 «약속»이 아니다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const F = ['scripts/build-dubbing-script.mjs', 'parents.html'];

/* 파일마다 마크업이 달라 통문장 매칭이 안 되는 자리가 있다(parents.html 은 <strong> 이 문장 중간에
   들어간다). 그래서 «파일별»로 적는다. 한쪽에만 있는 것은 want 를 1 로 둔다. */
const EDIT = [
  ['① 과공은 비례', null,
   '저희가 감히 다 알지 못합니다', '저희가 다 알 수는 없습니다', 2],
  ['②③ 같은 구절이 연속 두 문장에', null,
   '그날 혼주께서는 오신 모든 분과 눈을 맞추고 인사를 나누신 뒤, 서두르지 않고 배웅하시게 됩니다.',
   '그날 혼주께서는 한 분도 스쳐 보내지 않고, 서두르지 않게 배웅하시게 됩니다.', 2],
  ['④ 「마련」 줄임 (호흡)', null,
   '이야기를 나눌 수 있는 호흡을 마련합니다', '이야기를 나눌 수 있는 호흡을 둡니다', 2],
  /* ★★[TERM_DIGITAL] 소리는 「온라인 참석」, 화면은 「디지털 참석」이었다. 한 글에서 갈려 있었다.
     표준은 «디지털»이다 — S.digital · digitalAttendance · 청첩장 8장이 전부 그 말을 쓴다.
     소리 쪽을 화면에 맞춘다. 어른께 드리는 글에서 용어가 흔들리면 다른 것을 말하는 줄 안다. */
  ['⑨ 용어 드리프트 (셋)', 'scripts/build-dubbing-script.mjs',
   '외부에 공개되지 않는 온라인 참석 자리를 따로 마련해 드립니다',
   '외부에 공개되지 않는 디지털 참석 자리를 따로 마련해 드립니다', 1],
  ['⑤ 가장 궁금한 자리를 에둘렀다 (소리)', 'scripts/build-dubbing-script.mjs',
   '축하의 마음은 청첩장과 함께 정중히 안내드리고, 감사히 받습니다.',
   '축의는 여느 예식과 같습니다. 정중히 안내드리고 감사히 받습니다.', 1],
  /* 화면은 <strong> 이 문장 «중간»을 가른다 — 「축하의 마음은 <strong>청첩장과 …</strong>」.
     굵게 잡힌 범위를 그대로 살려 새 문장에 얹는다(굵게가 강조하는 것은 «어떻게 받는가»다). */
  ['⑤ 가장 궁금한 자리를 에둘렀다 (화면)', 'parents.html',
   '축하의 마음은 <strong>청첩장과 함께 정중히 안내드리고, 감사히 받습니다.</strong>',
   '축의는 여느 예식과 같습니다. <strong>정중히 안내드리고 감사히 받습니다.</strong>', 1],
  ['⑥ 뒤 문장도 곧게 (소리)', 'scripts/build-dubbing-script.mjs',
   '청첩장에 마음 전하실 곳을 함께 적어 드리며, 온라인 참석 자리에도 마음을 전하실 수 있는 길을 마련해 두었습니다.',
   '청첩장에 전하실 곳을 함께 적어 드리고, 디지털 참석 자리에도 같은 길을 열어 두었습니다.', 1],
  ['⑥ 뒤 문장도 곧게 (화면)', 'parents.html',
   '청첩장에 마음 전하실 곳을 함께 적어 드리며, 디지털 참석 자리에도 마음을 전하실 수 있는 길을 마련해 두었습니다.',
   '청첩장에 전하실 곳을 함께 적어 드리고, 디지털 참석 자리에도 같은 길을 열어 두었습니다.', 1],
  ['⑦ 「마음」이 한 문장 건너 세 번', null,
   '형식이 달라도, 함께해 주신 모든 마음은 소중히 받습니다.',
   '어느 쪽으로 전하시든 소중히 받습니다.', 2],
  /* ⑧ 은 «소리에만» 있다 — 화면은 서명 블록(sign-from + Moment Edit)이 그 자리를 맡는다.
     그 갈림은 설계다(생성기 주석에 근거가 적혀 있다). 화면을 따라 고치지 말 것. */
  ['⑧ 맺음이 두 번 (소리만)', 'scripts/build-dubbing-script.mjs',
   '두 분 어른께, 예식을 맡은 사람으로서 올립니다.',
   '두 분 어른께, 예식을 맡은 사람으로서 인사드립니다.', 1],
];

const src = new Map(F.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
let bad = 0;
for (const [why, only, from, , want] of EDIT) {
  const tgt = only ? [only] : F;
  const per = tgt.map((f) => [f, src.get(f).split(from).length - 1]);
  const tot = per.reduce((a, [, n]) => a + n, 0);
  console.log(`  ${tot === want ? '·' : '✗'} ${why.padEnd(28)} ${per.map(([f, n]) => `${f.split('/').pop()} ${n}`).join(' · ')}`);
  if (tot !== want) bad++;
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
const after = new Map(F.map((f) => {
  let s = src.get(f);
  for (const [, only, from, to] of EDIT) if (!only || only === f) s = s.split(from).join(to);
  return [f, s];
}));
/* ★자가검사 — 닳은 낱말이 정말 줄었는지 센다 */
/* ★[BODY_SLICE] 본문 추출을 정규식 하나로 하려다 소스 뒷부분까지 끌고 온 적이 있다.
   시작과 끝을 «문자열로» 잘라 낸다. 그래야 세는 대상이 편지 본문뿐이다. */
const gsrc = after.get('scripts/build-dubbing-script.mjs');
const b0 = gsrc.indexOf('안녕하십니까. 귀한 자녀분');
const b1 = gsrc.indexOf('모먼트에디트 올림.', b0);
const body = b0 >= 0 && b1 > b0 ? gsrc.slice(b0, b1) : '';
if (!body) { console.log('  ✗ 편지 본문을 못 잘랐다'); bad++; }
for (const [w, want] of [['마련', 3], ['감히', 0], ['온라인 참석', 0], ['마음', 6]]) {
  const n = body.split(w).length - 1;
  console.log(`  ${n <= want ? '·' : '✗'} 「${w}」 ${n}회 (목표 ${want} 이하)`);
  if (n > want) bad++;
}
if (bad) { console.log('\n목표에 못 미친다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
for (const [f, s] of after) fs.writeFileSync(path.join(ROOT, f), s);
console.log(`\n반영함 · ${EDIT.length}자리 · 생성기와 parents.html 을 함께 고쳤다`);
