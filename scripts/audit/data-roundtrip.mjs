// [DATA_ROUNDTRIP 2026-08-15 점검 · 2026-08-15 코워크 적대검증(62_적대적점검.md)으로 전수화]
// 데이터 왕복 무손실 게이트 — 진짜 핸들러를 호출해서 본다.
//
// ★v1 은 「대표 하나」(guideinfo 한 트랙)만 지나가는 표본이었다. 코워크가 게이트를 초록인 채
//   제품을 깨는 돌연변이 넷(다른 트랙 절단·review 절단·되읽기 delete·동의기록 덮어쓰기)으로 뚫었다.
//   그래서 지금은: ①제작 저장 **전 트랙 전수**(ritual·dining·seat·guideinfo·snap·final + invitation)
//   [RT_ALLTRACK] ②각 저장 뒤 **되읽기(_prodLoad)에도** 값이 살아있는지 ③**동의기록 키 보존을
//   모든 저장 핸들러 + 설문 뒤에** [RT_CONSENT_ALL] ④설문 review **원문 전문 대조** [RT_REVIEW]
//   ⑤「컬럼 없는 세계」에서 저장이 조용히 사라지지 않고 **거부되는지**(_prodColsMissing 가드 시험 ·
//   _gasworld 의 WORLD_DROPCOL 옵션) [RT_DROPCOL]
// ★검사가 안 지나가는 길은 무방비다 — 트랙·핸들러를 새로 만들면 여기 목록에도 넣을 것.
// ★1차 작성의 교훈 유지: 임의 키가 버려지는 것은 트랙별 화이트리스트 정규화(의도된 보안).
//   프로브는 각 트랙의 **실제 필드**에 싣는다(ritual·dining·final·invitation 은 원문 저장이라 자유 키 허용).
import { openWorld } from './_gasworld.mjs';
const { G, world } = openWorld();
let bad = 0; const no = (m) => { console.log('✗ ' + m); bad++; }; const ok = (m) => console.log('ok ' + m);

const SEED_CONSENT = { 계약금확인: '2026-08-01', 결과물전달일: '' };
const w = world({ 현재단계: '제작중', 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처',
  계약총액: 3300000, 입금상태: '확인', 동의기록: JSON.stringify(SEED_CONSENT) });
const rowRef = G.findCustomerByCode('ME-TEST');
G.resolveSession = () => ({ ok: true, row: rowRef });
G.LockService = { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) };

/* JSON 문자열 안에선 따옴표·줄바꿈이 \" \n 으로 이스케이프된다 — 원문·이스케이프 둘 다로 찾는다(1차에서 9건 오탐) */
const hit = (hay, needle) => hay.indexOf(needle) > -1 || hay.indexOf(needle.replace(/"/g, '\\"').replace(/\n/g, '\\n')) > -1;
const consentAlive = (where) => {
  let c = {}; try { c = JSON.parse(w.C['동의기록'] || '{}'); } catch (e) {}
  (c.계약금확인 === SEED_CONSENT.계약금확인)
    ? ok(`  동의기록 보존 (${where})`) : no(`동의기록 유실 @${where}: ` + String(w.C['동의기록']).slice(0, 80));
};

/* ── ① 제작 저장 전 트랙 전수 [RT_ALLTRACK] — 프로브는 8자 절단·부분 유실이 걸리게 길고 특수문자 포함 ── */
const P = (t) => `대조★${t}·"인용"中문-0815검증`;   // 15자+ · 따옴표·유니코드
const TRACKS = {
  ritual:    () => ({ note: P('ritual') }),                                        // 원문 저장(12k 캡)
  dining:    () => ({ note: P('dining') }),                                        // 원문 저장
  /* [SEAT_DRINK_SAVE] 음료 프로브가 'N' 하나뿐이던 시절, 저장 화이트리스트가 옛 코드(N·A·J)에 멈춰
     C(샴페인)·R(레드와인)을 조용히 지우는 사고를 이 게이트가 초록인 채로 통과시켰다(2026-08-16 발견).
     ★쓰는 코드를 전부 태울 것 — 하나만 태우면 나머지가 사라져도 초록이다. */
  seat:      () => ({ tables: [{ seats: [P('seat').slice(0, 24), '나', '다', '아기'], drinks: ['C', 'R', 'N', 'K'] }] }),   // 좌석명 24자 컷 · K=[KID_SEAT] 유아(물)
  guideinfo: () => ({ seatMode: 'mine', reserveTime: '17:30 · 홀 A', reserveName: P('gi').slice(0, 30), photo: ['가족 <전체>', '친구"들"'] }),
  snap:      () => ({ mustPeople: P('snap') }),                                    // 120자 컷 필드
  final:     () => ({ headcount: '20', drink: '스파클링', note: P('final') }),      // fdr 패스스루
};
for (const [t, mk] of Object.entries(TRACKS)) {
  const draft = mk(); const probe = JSON.stringify(draft).slice(1, 20);   // 트랙 고유 문자열 조각
  const needle = (t === 'seat') ? P('seat').slice(0, 24) : (t === 'guideinfo') ? P('gi').slice(0, 30) : P(t);
  const r = G.handleSaveProductionTrack({ token: 't', track: t, draft });
  if (!r || !r.ok) { no(`${t} 저장 실패: ` + JSON.stringify(r).slice(0, 100)); continue; }
  const cellStr = String(w.C['제작_' + t] || '');
  hit(cellStr, needle)
    ? ok(`① ${t} 셀 왕복 무손실`) : no(`① ${t} 셀에 프로브 없음: ` + cellStr.slice(0, 100));
  let back = ''; try { back = JSON.stringify(G._prodLoad(rowRef) || {}); } catch (e) { back = 'ERR ' + e.message; }
  hit(back, needle)
    ? ok(`  ${t} 되읽기(_prodLoad) 동일`) : no(`① ${t} 되읽기에 프로브 없음 [RT_ALLTRACK]`);
  consentAlive('save:' + t);
  void probe;
}

/* ── ①-a 자리별 음료 코드 왕복 [SEAT_DRINK_SAVE] — 이름만 보던 검사에 '음료 코드'를 더한다.
   좌석은 이름과 음료가 평행 배열이라, 이름이 살아 돌아와도 음료만 통째로 빠질 수 있다(실제로 그랬다). ── */
{
  let cell = {}; try { cell = JSON.parse(String(w.C['제작_seat'] || '{}')); } catch (e) {}
  const got = ((((cell.tables || [])[0]) || {}).drinks || []).join(',');
  (got === 'C,R,N,K') ? ok('①-a 자리별 음료 C·R·N·K 전부 셀에 남음 [SEAT_DRINK_SAVE][KID_SEAT]') : no(`①-a 자리별 음료 유실: '${got}' (기대 C,R,N,K) [SEAT_DRINK_SAVE]`);
  let back = {}; try { back = G._prodLoad(rowRef) || {}; } catch (e) {}
  const bg = (((((back.seatDraft || {}).tables || [])[0]) || {}).drinks || []).join(',');
  (bg === 'C,R,N,K') ? ok('  되읽기(_prodLoad)에도 음료 넷 다 살아있다') : no(`①-a 되읽기 음료 유실: '${bg}' [SEAT_DRINK_SAVE]`);
}

/* ── ①-b 청첩장(별도 핸들러) — 원문 저장 ── */
{
  const r = G.handleSaveInvitationDraft({ token: 't', draft: { note: P('invitation'), groomKo: '김희준' } });
  if (!r || !r.ok) no('invitation 저장 실패: ' + JSON.stringify(r).slice(0, 100));
  else {
    hit(String(w.C['제작_invitation'] || ''), P('invitation'))
      ? ok('①-b invitation 셀 왕복 무손실') : no('①-b invitation 셀에 프로브 없음');
    hit(JSON.stringify(G._prodLoad(rowRef) || {}), P('invitation'))
      ? ok('  invitation 되읽기 동일') : no('①-b invitation 되읽기에 프로브 없음 [RT_ALLTRACK]');
    consentAlive('save:invitation');
  }
}

/* ── ② 설문 — answers + review **원문 전문** 왕복 · 동의기록 보존 [RT_REVIEW][RT_CONSENT_ALL] ── */
{
  w.C['현재단계'] = '결과물전달'; w.C['결과물상태'] = '전달완료';
  const REVIEW = '후기 "인용" · 줄\n바꿈 · 여덟 자를 훌쩍 넘는 원문 대조용 본문입니다 中文héj';
  const r = G.handleSubmitSurvey({ token: 't', answers: { overall: 'very', recommend: 'yes', pace: 'good' }, review: REVIEW, reviewPublic: 'Y' });
  if (!r || !r.ok) no('② 설문 제출 실패: ' + JSON.stringify(r).slice(0, 100));
  else {
    let sv = {}; try { sv = JSON.parse(w.C['설문응답'] || '{}'); } catch (e) {}
    ((sv.answers ? sv.answers.overall : sv.overall) === 'very') ? ok('② 설문 답 셀 기록') : no('② 설문 답 셀 불일치');
    (sv.review === REVIEW || hit(String(w.C['설문응답'] || ''), REVIEW))
      ? ok('② review 원문 전문 왕복 무손실 [RT_REVIEW]') : no('② review 원문이 잘리거나 유실 [RT_REVIEW]: ' + String(sv.review).slice(0, 80));
    consentAlive('submitSurvey');
    try {
      const flat = JSON.stringify(G.adminDetail('ME-TEST'));
      (flat.indexOf('very') > -1 || flat.indexOf('매우') > -1) ? ok('  adminDetail 되읽음(관리자 연동)') : no('② adminDetail 에 설문이 안 보임');
    } catch (e) { console.log('  · adminDetail 호출 못 함(월드 한계): ' + String(e).slice(0, 60)); }
  }
}

/* ── ③ 컬럼 없는 세계 — 저장이 조용히 사라지지 않고 **거부**되는가 [RT_DROPCOL]
      addProdTrackColumns 주석이 못 박은 최악의 사고(무증상 유실)를 제품 가드(_prodColsMissing)가 막는지 시험 ── */
{
  const w2 = world({ 현재단계: '제작중', 상품타입: '시그니처', 동의기록: '{}' }, null, { dropHeaders: G._prodCols() });
  const row2 = G.findCustomerByCode('ME-TEST');
  G.resolveSession = () => ({ ok: true, row: row2 });
  const r = G.handleSaveProductionTrack({ token: 't', track: 'ritual', draft: { note: '유실되면 안 되는 글' } });
  (r && r.ok === false)
    ? ok('③ 컬럼 없는 세계: 저장 거부(무증상 유실 차단) [RT_DROPCOL] · ' + String(r.error || '').slice(0, 30))
    : no('③ 컬럼 없는 세계인데 저장이 ok 를 돌려줌(무증상 유실!) [RT_DROPCOL]: ' + JSON.stringify(r).slice(0, 80));
  (w2.C['제작_ritual'] === undefined || w2.C['제작_ritual'] === '')
    ? ok('  셀도 비어 있음(부분 기록 없음)') : no('③ 컬럼 없는 세계에 부분 기록: ' + String(w2.C['제작_ritual']).slice(0, 60));
}

/* ── ④ 컷 제출(결과물 선택) — 상한 안 무손실 · 초과는 거부 [RT_PICKS]
      2바퀴 실버그 7-1 회귀 가드: 종전 8000자 slice 는 한 항목 약 49자라 164개부터 조용히 잘렸다
      (ok:true · 선택수는 자른 뒤 계산 · 꼬리 ID 반토막). 이 블록이 있는 한 그 절단은 다시 못 들어온다. ── */
{
  const w3 = world({ 현재단계: '결과물전달', 개인코드: 'ME-TEST', 원본링크: 'https://drive.google.com/x',
    결과물상태: '', 동의기록: JSON.stringify(SEED_CONSENT) });
  const row3 = G.findCustomerByCode('ME-TEST');
  G.resolveSession = () => ({ ok: true, row: row3 });
  const wRef = w3;   // consentAlive 는 바깥 w 를 본다 — 이 블록에선 w3 를 직접 검사
  const mkPicks = (n) => Array.from({ length: n }, (_, i) =>
    ({ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz' + String(100000 + i), name: 'DSC_' + (1000 + i) + '.jpg' }));
  const r200 = G.handleSubmitResultSelection({ token: 't', picks: mkPicks(200) });
  const cell = String(wRef.C['선택사진'] || '');
  (r200 && r200.ok && r200['선택수'] === 200)
    ? ok('④ 200컷 제출 ok · 선택수 200') : no('④ 200컷 제출 실패/선택수 불일치 [RT_PICKS]: ' + JSON.stringify(r200).slice(0, 90));
  (cell.indexOf('(1AbCdEfGhIjKlMnOpQrStUvWxYz100199)') > -1)
    ? ok('  200번째 ID 끝까지 보존(꼬리 반토막 없음)') : no('④ 마지막 컷 ID 유실(무증상 절단!) [RT_PICKS]: …' + cell.slice(-45));
  { let c3 = {}; try { c3 = JSON.parse(wRef.C['동의기록'] || '{}'); } catch (e) {}
    (c3.계약금확인 === SEED_CONSENT.계약금확인) ? ok('  동의기록 보존 (submitResultSelection)') : no('동의기록 유실 @submitResultSelection'); }
  const r401 = G.handleSubmitResultSelection({ token: 't', picks: mkPicks(401) });
  (r401 && r401.ok === false)
    ? ok('④ 401컷 = 거부(자르지 않음)') : no('④ 401컷이 ok — 조용한 손실 재발 [RT_PICKS]: ' + JSON.stringify(r401).slice(0, 90));
  (Number(wRef.C['선택수']) === 200)
    ? ok('  거부 후 셀 불변(선택수 200 유지)') : no('④ 거부인데 셀이 변함(부분 기록): ' + wRef.C['선택수']);
  /* [PICK_CAP_PAIR] 3바퀴 9-3 회귀 — 「400개 상한」은 파일명이 길어도 400장이어야 한다.
     종전 손계산(20,000자)은 이름 12자일 때만 400을 채웠다(28자면 300에서 막다른 길). */
  for (const nameLen of [12, 28, 45, 80]) {
    wRef.C['결과물상태'] = '';
    const big = Array.from({ length: 400 }, (_, i) =>
      ({ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz' + String(100000 + i), name: 'x'.repeat(Math.max(1, nameLen - 4)) + '.jpg' }));
    const rr = G.handleSubmitResultSelection({ token: 't', picks: big });
    (rr && rr.ok && rr['선택수'] === 400)
      ? ok(`④ 파일명 ${nameLen}자 × 400장 통과 [PICK_CAP_PAIR]`)
      : no(`④ 파일명 ${nameLen}자에서 400장이 막힘(상한 짝 어긋남) [PICK_CAP_PAIR]: ` + JSON.stringify(rr).slice(0, 90));
  }
  /* [PICK_SEP_ONE] 4바퀴 11-2 회귀 — 이름에 구분자(공백·중점·전각쉼표)가 있어도 장수가 안 부푼다.
     전엔 한 항목이 여러 토큰으로 갈려 선택수가 늘었고, 그 수가 추가보정 견적 기본값(컷당 2만원)을
     만든다 — 유실이 아니라 **수와 돈이 틀리는** 버그였다(100장 → 103). */
  for (const nm of ['DSC 0123.jpg', '봄·여름_0123.jpg', '김희준 이미쿠 본식3 0123.jpg', '가을，겨울_0123.jpg']) {
    wRef.C['결과물상태'] = '';
    const list = Array.from({ length: 100 }, (_, i) =>
      ({ id: '1AbCdEfGh' + String(100000 + i), name: nm.replace('0123', String(1000 + i)) }));
    const rn = G.handleSubmitResultSelection({ token: 't', picks: list });
    (rn && rn['선택수'] === 100)
      ? ok(`④ 이름 "${nm.slice(0, 12)}…" 100장 = 선택수 100 [PICK_SEP_ONE]`)
      : no(`④ 이름에 구분자가 있어 장수가 부풂(견적 기본값이 위로 틀림) [PICK_SEP_ONE]: 선택수 ${rn && rn['선택수']}`);
  }
  (String(wRef.C['선택사진'] || '').indexOf('(') > -1 && !/(^|, )[^(),]+(,|$)/.test(String(wRef.C['선택사진'] || '')))
    ? ok('  ID 없는 조각이 섞이지 않음') : no('④ 선택사진에 ID 없는 조각이 남음 [PICK_SEP_ONE]');
  wRef.C['결과물상태'] = '';
  G.handleSubmitResultSelection({ token: 't', picks: mkPicks(200) });   // 뒤 검사를 위해 상태 되돌림
  const rq = G.handleRequestExtraRetouch({ token: 't', qty: 12 });
  (rq && rq.ok && rq.qty === 12)
    ? ok('④ 추가 보정 12컷 신청 = 수량 그대로') : no('④ 추가 보정 수량 왜곡 [RT_PICKS]: ' + JSON.stringify(rq).slice(0, 80));
  const rq501 = G.handleRequestExtraRetouch({ token: 't', qty: 501 });
  (rq501 && rq501.ok === false)
    ? ok('④ 추가 보정 501컷 = 거부(수량 무언 절단 금지)') : no('④ 501컷 신청이 ok — 수량이 조용히 잘림 [RT_PICKS]: ' + JSON.stringify(rq501).slice(0, 80));
}

/* ── ⑤ 예약 시트 왕복 [WORLD_BOOKING] — 3바퀴 9-2 회귀 가드.
      전엔 모의 세계가 Customers 헤더 하나를 두 시트에 다 줘서, 예약 시트 쓰기가 통째로
      사라져도 검사는 초록이었다. 환불계좌는 '돈이 흘러갈 주소'라 여기서 못 잡으면 안 된다. ── */
{
  const w4 = world({ 현재단계: '취소', 개인코드: 'ME-TEST', 동의기록: '{}' },
    { 개인코드: 'ME-TEST', 상태: '취소', 환불계좌: '' });
  const row4 = G.findCustomerByCode('ME-TEST');
  G.resolveSession = () => ({ ok: true, row: row4 });
  const ACCT = '국민 123456-78-901234 김희준';
  const r = G.handleSaveRefundAccount({ token: 't', acct: ACCT });
  (r && r.ok) ? ok('⑤ 환불계좌 저장 ok') : no('⑤ 환불계좌 저장 실패: ' + JSON.stringify(r).slice(0, 90));
  (w4.B && w4.B['환불계좌'] === ACCT)
    ? ok('  예약 시트에 원문 그대로 [WORLD_BOOKING]')
    : no('⑤ 예약 시트에 안 써짐(무증상 유실!) [WORLD_BOOKING]: ' + JSON.stringify(w4.B && w4.B['환불계좌']));
  (w4.writes().some((e) => e.t === 'writeB' && e.h === '환불계좌'))
    ? ok('  쓰기 이벤트가 예약 시트로 갔다') : no('⑤ 예약 시트 쓰기 이벤트 없음 [WORLD_BOOKING]');
}

console.log(bad ? `\n실패 ${bad}건` : '\n왕복 전부 무손실 (전 트랙 · 전 핸들러 동의기록 · review 원문 · 컬럼 가드 · 컷 제출 · 예약 시트)');
process.exit(bad ? 1 : 0);
