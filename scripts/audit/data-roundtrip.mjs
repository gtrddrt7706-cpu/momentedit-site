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
  seat:      () => ({ tables: [{ seats: [P('seat').slice(0, 24)], drinks: ['N'] }] }),   // 좌석명 24자 컷
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

console.log(bad ? `\n실패 ${bad}건` : '\n왕복 전부 무손실 (전 트랙 · 전 핸들러 동의기록 · review 원문 · 컬럼 가드)');
process.exit(bad ? 1 : 0);
