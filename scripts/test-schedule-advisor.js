// 스케줄 AI 두뇌(판정 로직) 시뮬레이션 회귀 테스트
// 실행: node scripts/test-schedule-advisor.js  (모델 호출 없음 · 서버 판정 로직만 검증)
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'api', 'schedule-advisor.js'), 'utf8');
const tmp = path.join(require('os').tmpdir(), '_sa_test_' + Date.now() + '.js');
fs.writeFileSync(tmp, src + '\nmodule.exports._t = { decide, levelFor, monthBusyTier, weightedRatio, freeSlot, addDays, dayOfWeek, SLOT_BY_LABEL };\n');
fs.copyFileSync(path.join(__dirname, '..', 'api', '_ratelimit.js'), path.join(require('os').tmpdir(), '_ratelimit.js'));
const { _t } = require(tmp);

const T = '2026-06-11';
let fails = 0, n = 0;
function check(name, got, want) {
  n++;
  const ok = (typeof want === 'function') ? want(got) : String(got).indexOf(want) !== -1;
  if (!ok) { fails++; console.log('FAIL #' + n + ' ' + name + '\n  got: ' + String(got).slice(0, 170)); }
  else console.log('ok   #' + n + ' ' + name);
}
function ctx(c, cta) { c = c || {}; return { confirmed: c, confirmedDates: Object.keys(c), ctaGiven: !!cta }; }
const L1 = _t.levelFor({}, T, '예약'), L1s = _t.levelFor({}, T, '스케줄');
function ex(o) { return Object.assign({ intent: 'check', date: '', periodFrom: '', periodTo: '', weekendOnly: false, slot: '' }, o); }

// ── A. 기본 의도 ──
check('A1 무관 질문 → 전용 창구 안내', _t.decide(ex({ intent: 'other' }), {}, T, ctx(), '예약', L1), '전용 창구');
check('A2 전체 현황 질문 → 되묻기', _t.decide(ex({ intent: 'open' }), {}, T, ctx(), '예약', L1), '되물으세요');
check('A3 날짜 없는 check → 날짜 묻기', _t.decide(ex({}), {}, T, ctx(), '예약', L1), '말하지 않았습니다');
check('A4 과거 날짜', _t.decide(ex({ date: '2026-01-01' }), {}, T, ctx(), '예약', L1), '지났거나');
check('A5 오늘 날짜', _t.decide(ex({ date: '2026-06-11' }), {}, T, ctx(), '예약', L1), '지났거나');

// ── B. 시간 되묻기·확정 ──
check('B1 날짜만(L1 예약) → 시간 되묻기', _t.decide(ex({ date: '2027-10-09' }), {}, T, ctx(), '예약', L1), '어느 시간대로');
check('B2 날짜만(스케줄) → 바로 확정', _t.decide(ex({ date: '2027-10-09' }), {}, T, ctx(), '스케줄', L1s), '진행 가능한 일정으로 확인됨');
check('B3 날짜+슬롯 → 확정 + 짧은 CTA', _t.decide(ex({ date: '2027-10-09', slot: '15:40' }), {}, T, ctx(), '예약', L1), '상담 전에 이 일정을 확정');

// ── C. 마감·대안 ──
const tk = { '2027-10-09': ['09:00', '12:20', '15:40'], '2027-10-10': ['12:20'] };
check('C1 전부 마감 → 대안 1건', _t.decide(ex({ date: '2027-10-09' }), tk, T, ctx(), '예약', L1), '대안으로');
check('C2 지정 슬롯만 마감 → 사실 + 같은 날 다른 타임', _t.decide(ex({ date: '2027-10-10', slot: '12:20' }), tk, T, ctx(), '예약', L1), '이미 확정된 일정이 있습니다');
check('C3 주말 요청 전부 마감 → 대안도 주말', _t.decide(ex({ date: '2027-10-09', weekendOnly: true }), tk, T, ctx(), '예약', L1), function (s) { return /토요일|일요일/.test(s); });

// ── D. 한도(확정 기준)·신비주의 dedup·반복 방지 ──
const c3 = { '10-9': '09:00', '10-16': '09:00', '10-23': '09:00' };
check('D1 확정 3건 후 새 날짜 → 한도', _t.decide(ex({ date: '2027-12-25' }), {}, T, ctx(c3, true), '예약', L1), '정해져 있어요');
check('D2 확정 3건 후 같은 날 재질문 → dedup(한도 아님)', _t.decide(ex({ date: '2027-10-09' }), {}, T, ctx(c3, true), '예약', L1), '이미');
check('D3 같은 날 다른 타임 → 추가 확정 거부', _t.decide(ex({ date: '2027-10-09', slot: '12:20' }), {}, T, ctx({ '10-9': '09:00' }, true), '예약', L1), '디렉터가 함께 조율');
check('D4 같은 날 같은 타임 재확인 → 짧게 재확인', _t.decide(ex({ date: '2027-10-09', slot: '09:00' }), {}, T, ctx({ '10-9': '09:00' }, true), '예약', L1), '그대로');
check('D5 CTA 후 새 날짜 → CTA 반복 금지', _t.decide(ex({ date: '2027-11-13', slot: '12:20' }), {}, T, ctx({ '10-9': '09:00' }, true), '예약', L1), '반복하지 말고');
check('D6 CTA 후 희소성도 금지', _t.decide(ex({ date: '2027-11-13', slot: '12:20' }), {}, T, ctx({ '10-9': '09:00' }, true), '예약', L1), '희소성 멘트 금지');

// ── E. 시기 검색 ──
check('E1 시기+주말(L1 예약) → 후보 + 시간 되묻기', _t.decide(ex({ periodFrom: '2027-10-01', periodTo: '2027-10-31', weekendOnly: true }), {}, T, ctx(), '예약', L1), '후보 날짜로 제안');
check('E2 시기+슬롯 → 바로 확정', _t.decide(ex({ periodFrom: '2027-10-01', periodTo: '2027-10-31', weekendOnly: true, slot: '15:40' }), {}, T, ctx(), '예약', L1), '진행 가능한 일정으로 확인됨');
check('E3 시기 전부 마감 → 없음 안내', _t.decide(ex({ periodFrom: '2027-10-08', periodTo: '2027-10-09', weekendOnly: true }), { '2027-10-09': ['09:00', '12:20', '15:40'] }, T, ctx(), '예약', L1), '찾지 못했습니다');
check('E4 시기 from 과거 → 내일 이후로 보정', _t.decide(ex({ periodFrom: '2026-01-01', periodTo: '2026-07-31', weekendOnly: true, slot: '09:00' }), {}, T, ctx(), '예약', L1), function (s) { return /6월|7월/.test(s); });

// ── F. 날짜 유틸 경계 ──
check('F1 연말 경계 addDays', _t.addDays('2026-12-31', 1), '2027-01-01');
check('F2 윤년 2028-02-28+1', _t.addDays('2028-02-28', 1), '2028-02-29');
check('F3 요일 2027-10-09=토', String(_t.dayOfWeek('2027-10-09')), '6');
check('F4 요일 2027-11-06=토', String(_t.dayOfWeek('2027-11-06')), '6');

// ── G. 단계 산정 ──
function fill(taken, yr, months, days, slots) {
  for (let d = yr + '-01-01', i = 0; i < 730; i++, d = _t.addDays(d, 1)) {
    const m = Number(d.slice(5, 7)), wd = _t.dayOfWeek(d);
    if (months.indexOf(m) !== -1 && days.indexOf(wd) !== -1) taken[d] = slots.slice();
  }
  return taken;
}
check('G1 빈 캘린더 = L1', String(_t.levelFor({}, T, '예약').n), '1');
check('G2 스케줄 페이지 +1단계', String(_t.levelFor({}, T, '스케줄').n), '2');
check('G3 성수기 주말 전체 마감 → L5+', String(_t.levelFor(fill({}, '2026', [4, 5, 9, 10, 11], [6, 0], ['09:00', '12:20', '15:40']), T, '예약').n), function (s) { return Number(s) >= 5; });
check('G4 스케줄 페이지 askSlot 항상 false', String(_t.levelFor({}, T, '스케줄').p.askSlot), 'false');

// ── H. confirmed 파싱(핸들러 정규식 재현) ──
function parse(history) {
  const confirmed = {}; let cta = false;
  history.forEach(function (m) {
    if (m.role !== 'assistant') return;
    if (/임시\s*고정|상담을?\s*신청|서둘러|먼저\s*닿는|많지\s*않/.test(m.content)) cta = true;
    if (/진행\s*가능|확인돼요|확인됩니다|가능해요/.test(m.content)) {
      const re = /(\d{1,2})월\s*(\d{1,2})일[\s\S]{0,40}?(오전\s*9시|오후\s*12시\s*20분|늦은\s*오후\s*3시\s*40분)/g; let g;
      while ((g = re.exec(m.content)) !== null) confirmed[Number(g[1]) + '-' + Number(g[2])] = _t.SLOT_BY_LABEL[g[3].replace(/\s+/g, ' ')];
    }
  });
  return { confirmed: confirmed, cta: cta };
}
let r = parse([{ role: 'assistant', content: '네, 27년 11월 6일 토요일 오전 9시 타임으로 진행 가능한 일정으로 확인돼요. 대면상담을 신청하시면 확정받으실 수 있어요.' }]);
check('H1 확정 + CTA 파싱', JSON.stringify(r), function () { return r.confirmed['11-6'] === '09:00' && r.cta === true; });
r = parse([{ role: 'assistant', content: '10월 9일(금요일)은 이미 진행이 확정된 일정이 있어 어렵습니다. 대안으로 10월 10일(토요일) 오전 9시 타임은 진행 가능한 일정으로 확인돼요.' }]);
check('H2 마감 날짜 미집계 · 대안만 집계', JSON.stringify(r.confirmed), function () { return !('10-9' in r.confirmed) && r.confirmed['10-10'] === '09:00'; });
r = parse([{ role: 'assistant', content: '말씀하신 오전 9시 타임은 이미 확정된 일정이 있어요. 10월 9일 금요일 오후 12시 20분 타임은 진행 가능한 일정으로 확인돼요.' }]);
check('H3 슬롯 마감 안내 시 열린 타임으로 집계', JSON.stringify(r.confirmed), function () { return r.confirmed['10-9'] === '12:20'; });
r = parse([{ role: 'assistant', content: '생각하고 계신 날짜나 시기를 알려주시면 확인해 드릴게요.' }]);
check('H4 안내문만 있으면 미집계', JSON.stringify(r.confirmed), '{}');

console.log('\n결과: ' + (n - fails) + '/' + n + ' 통과' + (fails ? ' · 실패 ' + fails + '건' : ''));
process.exit(fails ? 1 : 0);
