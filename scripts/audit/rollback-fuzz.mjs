/* ★[ROLLBACK_FUZZ 2026-08-18 사용자 지시 "개선점없을때 까지 반복 점검 다양한방법으로"]

   ── 왜 또 다른 방법인가
   지금까지 셋은 «길을 정해 놓고» 걸었다:
     ·journey-sim / rollback-roundtrip — 사람이 적은 걸음 순서
     ·stage-reach — 상태공간 BFS(축이 정해져 있다)
   둘 다 «내가 생각한 순서»만 본다. 실제 사고는 늘 생각 못 한 순서에서 났다
   (되돌린 뒤 고객이 먼저 눌렀다 · 취소했다가 되살렸다 · 되돌림을 두 번 연달아 했다).
   그래서 여기서는 **순서를 무작위로 섞는다.** 씨앗을 고정해 재현은 유지한다.

   ── 무엇을 재나 (도착지가 아니라 «불변식»)
   한 걸음마다 다음이 깨지지 않았는지 본다. 깨지면 그 씨앗·걸음번호를 찍는다.
     I1 단계는 항상 흐름 또는 예외 안의 라벨이다(정체불명 라벨 금지)
     I2 수납이 «확인»으로 살아 있으면 **계약총액이 남아 있다** — 금액 근거 소실 금지(KEEP_MONEY_BASIS)
     I3 결과물 흔적(원본링크·전달완료)은 예식/촬영완료보다 앞 단계에 남지 않는다
     I4 어느 상태에서도 **고객 화면(handleGetMyState)이 던지지 않는다**
     I5 어느 상태에서도 **관리자 상세·홈이 던지지 않는다**(관리자가 화면을 못 여는 것이 최악)
     I6 화면에 실릴 값에 undefined·NaN·[object Object] 가 섞이지 않는다
   ★관찰(경고)로만 세는 것: 환불완료 표시와 수납 «확인»이 함께 남는 조합.
     현재 제품이 그렇게 동작한다(사용자 판단 대기 · 조사 보고서에 올림) — 여기서 붉히면
     «늘 붉은 게이트»가 되어 아무도 안 본다. 대신 건수를 세어 눈에 남긴다.

   사용: node scripts/audit/rollback-fuzz.mjs [바퀴수] [걸음수]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo, kstAhead } from './_gasworld.mjs';

/* [KST_AHEAD] 날짜를 지금 기준 미래로 — 고정 리터럴이 과거가 되어 서버가 거절하던 것을 막는다(모듈 전역) */
const CONSULT_YMD = kstAhead(45), WEDDING_YMD = kstAhead(150);

const { G, world } = openWorld();
const REAL = G.setCustomerStage;

/* ★[FUZZ_LINK_STAGES] «결과물 링크를 받아도 되는 단계»는 제품이 정한다(admin.gs 의 허용 목록).
   여기 손으로 베끼면 목록이 늘 때 검사만 낡아 «제품이 허용한 일»을 사고로 붉힌다 —
   실제로 첫 판에서 그렇게 붉었다(제작중 원본 등록은 허용된 동작이다).
   그래서 원본 리터럴을 읽어 온다. 못 읽으면 던진다(못 잼은 통과가 아니다). */
function resultLinkStages() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = fs.readFileSync(path.resolve(here, '../../automation/admin/admin.gs'), 'utf8');
  const m = src.match(/if \(\[([^\]]*)\]\.indexOf\(stage\) === -1\) \{\s*\n\s*return \{ ok: false, error: '결과물 준비 단계가 아닙니다/);
  if (!m) throw new Error('FUZZ_LINK_STAGES: adminSetResultLinks 의 허용 단계 목록을 못 찾음');
  const list = (m[1].match(/'([^']*)'/g) || []).map((q) => q.slice(1, -1));
  if (!list.length) throw new Error('FUZZ_LINK_STAGES: 목록 파싱이 깨졌다');
  return list;
}
const LINK_OK = resultLinkStages();
const CODE = 'ME-TEST';
const ROUNDS = Number(process.argv[2] || 60);
const STEPS = Number(process.argv[3] || 26);

let fail = 0, warnRefund = 0, crashes = 0;
/* ★[FUZZ_COVER] «통과»가 «안 가 봤다»의 다른 이름이 되지 않게, 밟은 단계를 세어 함께 찍는다.
   무작위는 조용히 한 구석만 돌 수 있다 — 그때의 초록은 증거가 아니다. */
const cover = new Map();
const seen = new Map();                       // 같은 사고를 한 번만 적는다(씨앗만 다르고 원인은 하나)
const report = (key, msg) => { if (seen.has(key)) { seen.set(key, seen.get(key) + 1); return; } seen.set(key, 1); fail++; console.log('  ❌ ' + msg); };

/* 씨앗 고정 난수 — Math.random 을 쓰면 붉어진 판을 다시 못 만든다 */
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

let C = null, B = null;
function fresh(prod) {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: prod, 현재단계: '신청접수', 계약총액: (prod === '웨딩스냅' ? 1200000 : 2500000),
    동의기록: '{}', 처리이력: '' };
  B = { 개인코드: CODE, 상태: '시간선택완료', 선택날짜: CONSULT_YMD, 선택시간: '14:50',
    신랑이름: '희준', 신부이름: '미쿠', 이메일: 't@e.com', 토큰: 'tk' };
}
function act(fn) {
  const w = world(Object.assign({}, C), Object.assign({}, B));
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, e = '';
  try { r = fn(G); } catch (x) { e = String((x && x.stack) || x); }
  C = Object.assign({}, w.C); if (w.B) B = Object.assign({}, w.B);
  return { r, e };
}

/* ── 무작위로 뽑을 «걸음» 목록. 관리자·고객·되돌림을 한 주머니에 섞는다 ── */
function moves(prod) {
  const isSnap = prod === '웨딩스냅';
  const flow = G.STAGE_FLOW[prod];
  const targets = flow.concat(G.STAGE_EXCEPTIONS);
  const base = [
    ['고객 일정 선택', (g) => g.handleSubmitSchedule({ token: 'tk', dateKey: CONSULT_YMD, time: '14:50' })],
    ['예약 승인', (g) => g.adminApprove(CODE)],
    ['시착 동의 보내기', (g) => g.adminOpenFittingConsent(CODE)],
    ['고객 시착 서명', (g) => g.handleSignFittingConsent({ token: 'tk', signature: 'data:image/png;base64,AAA', agree: true })],
    ['시착 벌수 기록', (g) => g.adminSetFittingCount(CODE, 2)],
    ['상담완료 처리', (g) => g.adminMarkConsultDone(CODE)],
    ['고객 계약정보 입력', (g) => g.handleRequestContract({ token: 'tk', info: {
      weddingDate: WEDDING_YMD, weddingTime: '12:20', groomBirth: '1990-01-01', brideBirth: '1991-02-02',
      groomAddr: '서울시 어딘가 1', brideAddr: '서울시 어딘가 2', consent: true } })],
    /* [SEND_TIME_REQ] 시그니처는 예식 시간 없이 발송할 수 없다 — 인자를 빼면 이 걸음이 늘 실패한다 */
    ['계약서 발송', (g) => g.adminSendContract(CODE, 'https://momentedit.kr/contract/v1-1.html', 2500000, WEDDING_YMD, '12:20')],
    ['고객 계약 서명', (g) => g.handleSignContract({ token: 'tk', signature: 'data:image/png;base64,AAA', agree: true })],
    ['고객 입금 신고', (g) => g.handlePaymentSignal({ token: 'tk', payerName: '정희준' })],
    ['관리자 입금 확인', (g) => g.adminConfirmPayment(CODE)],
    ['고객 제작 저장', (g) => g.handleSaveProductionTrack({ token: 'tk', track: 'ritual', ritualDraft: { S: { course: 'A' } }, done: false })],
    ['예식·촬영완료', (g) => g.adminMarkEventDone(CODE)],
    ['원본 링크 등록', (g) => g.adminSetResultLinks(CODE, { 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 영상: 'https://vimeo.com/1' })],
    ['고객 사진 선택', (g) => g.handleSubmitResultSelection({ token: 'tk', picks: [{ id: 'ID0000000001', name: 'a.jpg' }] })],
    ['보정 착수', (g) => g.adminStartRetouch(CODE)],
    ['보정본 등록', (g) => g.adminSetResultLinks(CODE, { 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 보정본: 'https://drive.google.com/drive/folders/BBBBBBBBBBBB', 영상: 'https://vimeo.com/1' })],
    ['고객 보정본 컨펌', (g) => g.handleConfirmRetouch({ token: 'tk' })],
    ['결과물 전달', (g) => g.adminMarkDelivered(CODE, true)],
    ['환불 완료 표시', (g) => g.adminMarkRefunded(CODE)],
    ['환불 표시 취소', (g) => g.adminUndoRefunded(CODE, '오처리')],
  ].filter(([n]) => !(isSnap && (n.indexOf('시착') === 0 || n === '상담완료 처리' || n === '고객 제작 저장' || n === '고객 계약정보 입력')));
  /* 되돌림·수납취소는 «인자가 무작위» — 어떤 목적지로든, 어떤 마일스톤이든 */
  const rand = [
    (rd) => { const t = targets[Math.floor(rd() * targets.length)]; return ['강제변경→' + t, (g) => g.adminForceStage(CODE, t, '퍼즈')]; },
    (rd) => { const ms = ['계약금', '중도금', '잔금', '전체'][Math.floor(rd() * 4)]; return ['확인취소:' + ms, (g) => g.adminUndoConfirmPayment(CODE, ms, '퍼즈')]; },
  ];
  return { base, rand, flow };
}

/* ── 불변식 ── */
const paid = (v) => { const x = String(v || '').trim(); return x === '확인' || x === '완료신호'; };
function invariants(prod, flow, seed, step, name) {
  const tag = `씨앗 ${seed} · ${step}걸음 «${name}»`;
  const st = String(C.현재단계 || '').trim();
  cover.set(st || '(빔)', (cover.get(st || '(빔)') || 0) + 1);

  if (st && flow.indexOf(st) === -1 && G.STAGE_EXCEPTIONS.indexOf(st) === -1)
    report('I1:' + st, `I1 정체불명 단계 라벨 «${st}» — ${tag}`);

  const anyPaid = String(C.입금상태 || '').trim() === '확인' || String(C.중도금상태 || '').trim() === '확인' || String(C.잔금상태 || '').trim() === '확인';
  if (anyPaid && !(Number(String(C.계약총액 || '').replace(/[^0-9]/g, '')) > 0))
    report('I2', `I2 수납 «확인»이 살아 있는데 계약총액이 비었다(금액 근거 소실) — ${tag}`);

  /* I3 — «결과물 흔적이 제품이 허용하지 않는 자리에 남아 있는가».
     기준은 위 LINK_OK(제품 허용 목록)다. 그보다 앞이면 되돌림이 안 치운 것이다. */
  const si = flow.indexOf(st);
  const firstOk = Math.min.apply(null, LINK_OK.map((x) => flow.indexOf(x)).filter((i) => i >= 0));
  if (si >= 0 && si < firstOk) {
    if (String(C.원본링크 || '').trim()) report('I3:원본', `I3 ${st} 인데 원본링크가 남았다(허용 시작 ${flow[firstOk]}) — ${tag}`);
    if (String(C.결과물상태 || '').trim() === '전달완료') report('I3:전달', `I3 ${st} 인데 결과물상태=전달완료 — ${tag}`);
  }

  const my = act((g) => g.handleGetMyState({ token: 'tk' }));
  if (my.e) { crashes++; report('I4:' + my.e.split('\n')[0], `I4 고객 화면이 던졌다 — ${tag}\n       ${my.e.split('\n')[0]}`); }
  const det = act((g) => g.adminDetail(CODE));
  if (det.e) { crashes++; report('I5d:' + det.e.split('\n')[0], `I5 관리자 상세가 던졌다 — ${tag}\n       ${det.e.split('\n')[0]}`); }
  const home = act((g) => g.adminHome());
  if (home.e) { crashes++; report('I5h:' + home.e.split('\n')[0], `I5 관리자 홈이 던졌다 — ${tag}\n       ${home.e.split('\n')[0]}`); }

  const blob = JSON.stringify([my.r, det.r]);
  const dirty = (blob.match(/undefined|\bNaN\b|\[object Object\]/g) || [])[0];
  if (dirty) report('I6:' + dirty, `I6 화면 값에 «${dirty}» 가 섞였다 — ${tag}`);

  let rec = {}; try { rec = JSON.parse(C.동의기록 || '{}'); } catch {}
  if (rec.환불완료 && anyPaid) warnRefund++;
}

/* ── 돌린다 ── */
for (const prod of ['시그니처', '웨딩스냅']) {
  console.log(`\n═══ ${prod} — 무작위 ${ROUNDS}바퀴 × ${STEPS}걸음 ═══`);
  const { base, rand, flow } = moves(prod);
  for (let seed = 1; seed <= ROUNDS; seed++) {
    const rd = rng(seed * 7919 + prod.length);
    fresh(prod);
    for (let i = 1; i <= STEPS; i++) {
      /* 5걸음에 1번꼴로 되돌림/수납취소를 끼운다 — 실무 빈도보다 훨씬 잦게(악조건) */
      const useRand = rd() < 0.22;
      const [name, fn] = useRand ? rand[Math.floor(rd() * rand.length)](rd) : base[Math.floor(rd() * base.length)];
      const r = act(fn);
      if (r.e) { crashes++; report('행위:' + name + ':' + r.e.split('\n')[0], `걸음 «${name}» 이 던졌다 — 씨앗 ${seed} · ${i}걸음\n       ${r.e.split('\n')[0]}`); }
      invariants(prod, flow, seed, i, name);
    }
  }
  console.log(`  ${ROUNDS * STEPS} 걸음 · 불변식 ${ROUNDS * STEPS * 6} 회 확인`);
  const missed = flow.concat(G.STAGE_EXCEPTIONS).filter((st) => !cover.has(st));
  console.log('  밟은 단계: ' + [...cover].sort((a, b) => b[1] - a[1]).map(([k, n]) => k + '×' + n).join(' · '));
  if (missed.length) { fail++; console.log('  ❌ 한 번도 못 밟은 단계: ' + missed.join('·') + ' — 바퀴/걸음을 늘리거나 걸음 목록을 보강할 것'); }
  cover.clear();
}

console.log(`\n[관찰] 환불완료 표시 + 수납 «확인» 동시 존재: ${warnRefund}회 (사용자 판단 대기 항목 · 여기서는 붉히지 않음)`);
if (seen.size) { console.log('[중복 집계] ' + [...seen].map(([k, n]) => k.split(':')[0] + '×' + n).join(' · ')); }
console.log(`\n결과 — ${fail ? '서로 다른 사고 ' + fail + '종 · 던짐 ' + crashes + '회' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
