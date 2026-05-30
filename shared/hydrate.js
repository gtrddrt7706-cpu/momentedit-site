/*
 * Moment Edit · 청첩장 클라이언트 하이드레이션 엔진
 * ──────────────────────────────────────────────────────────────
 * 정적 빌드(Apps Script) 대신, 브라우저에서 ?e=eventId 로 시트 데이터를 받아
 * 템플릿의 {{PLACEHOLDER}} 와 OPTIONAL 마커를 채운다. (라이브 커버 · 가족 카드 공용)
 *
 * 사용법 — 각 템플릿 <head> 끝에 두 줄, <body>에 디자인 번호 표기:
 *   <script src="/shared/venue.js"></script>
 *   <script src="/shared/hydrate.js" defer></script>
 *   ...
 *   <body data-design="01">              ← 01~08
 * 그리고 흰 화면 방지용 CSS:
 *   body{opacity:0;transition:opacity .6s} body.couple-ready{opacity:1}
 *
 * 식장 정보는 고정(window.MOMENT_VENUE) — venue.js 한 곳에서 관리.
 * 데이터 출처는 Couples 시트(getCouple). 시트만 고치면 자동 반영된다.
 *
 * 본 변환 로직은 운영 검증된 가족 빌드 스크립트(FC_transformPlaceholders)를
 * 브라우저로 포팅한 것이다. 동작 동일성 유지가 원칙.
 */
(function () {
  'use strict';

  var WEBHOOK = 'https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec';

  // 프리뷰(직접 접속·?e 없음)용 샘플 — 디자인 확인용 더미
  var SAMPLE = {
    groomName: '이서준', brideName: '정하윤',
    groomNameEn: 'Lee Seo Jun', brideNameEn: 'Jeong Ha Yoon',
    weddingDate: '2026-10-24', weddingTime: '14:00',
    groomParents: '이재환 · 최미경', brideParents: '정영석 · 박윤희',
    groomAccount: '하나 222-456-789012', brideAccount: '우리 333-456-789012',
    vimeoId: '', vimeoHash: '',
    // 고객 선택 3종 (프리뷰 기본값) — 인사글 비움→기본, 부모표기 둘 다 표시
    invitationText: '', greetingShowParents: 'Y', envelopeShowParents: 'Y', digitalAttendance: 'Y',
    groomChildTitle: '장남', brideChildTitle: '차녀',
    // 부모 계좌 (프리뷰 샘플)
    groomFatherAccount: '국민 110-123-456789', groomMotherAccount: '신한 220-456-123789',
    brideFatherAccount: '농협 351-234-567890', brideMotherAccount: '카카오뱅크 3333-12-3456789',
    // 디자인 특수 (02 대표문구 · 08 자기소개)
    // 08 한마디는 비워 기본 문구(다짐·마음 형식, DEFAULT_*_BIO)가 프리뷰에 나오게 — 폼 안내와 일치
    // dig* = 온라인 전용 오버라이드(비우면 오프/공통 값 상속). 프리뷰는 비워 기본 유지.
    pullQuote: '', groomBio: '', brideBio: '',
    digPullQuote: '', digGroomBio: '', digBrideBio: ''
  };

  // ─── 유틸 ───────────────────────────────────────────────
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function replaceAll(str, find, rep) { return str.split(find).join(rep); }
  // 셀 안 줄바꿈(Alt+Enter) → <br> (HTML 이스케이프 후 변환)
  function nl2br(s) { return escapeHtml(s).replace(/\r?\n/g, '<br>'); }
  function bankLabel(bank) {
    bank = String(bank || '').trim();
    if (!bank) return '';
    return /(은행|뱅크)$/.test(bank) ? bank : bank + '은행';
  }
  // 기본 노출형 토글: 명시적으로 N/아니오일 때만 숨김 — 빈 칸·미지정·Y는 모두 노출
  function showUnlessNo(v) { return !/^(n|no|false|0|off|미표시|아니오|숨김|제외)$/i.test(String(v || '').trim()); }
  // 고객 직접 작성 인사글(평문) → 문단 HTML (빈 줄=문단, 줄바꿈=<br>)
  // 직접 작성 인사말 → 문단/줄 처리. *별표*로 감싼 부분은 강조(.em, 전 디자인 공통)로 변환.
  function buildInvitation(text) {
    function emph(s) { return s.replace(/\*([^*\n]+)\*/g, '<span class="em">$1</span>'); }
    return String(text).trim().split(/\n\s*\n/).map(function (p) {
      return '<p>' + p.split('\n').map(function (l) { return emph(escapeHtml(l.trim())); }).join('<br>') + '</p>';
    }).join('');
  }
  // 계좌 셀 "국민 110-123-456789" → {bank, account, raw}. 비면 null.
  function parseAccount(cell) {
    cell = String(cell || '').trim();
    if (!cell) return null;
    var sp = cell.split(/\s+/);
    var bank = sp.shift();
    var account = sp.join(' ');
    if (!account) { account = bank; bank = ''; } // 계좌만 적은 경우
    return { bank: bankLabel(bank), account: account, raw: account.replace(/\D/g, '') };
  }
  // 혼주 문자열 "박철수 · 이미경" → {father:'박철수', mother:'이미경'}
  function splitParents(s) {
    var p = String(s || '').split(/[·,/]|\s및\s/).map(function (x) { return x.trim(); }).filter(Boolean);
    return { father: p[0] || '', mother: p[1] || '' };
  }
  // 본인 계좌: 신 시트(한 칸 "은행 번호") + 구 시트(은행 분리) 모두 호환
  function coupleAccount(bankField, accountCell) {
    bankField = String(bankField || '').trim();
    if (bankField) {
      var acc = String(accountCell || '').trim();
      return { bank: bankLabel(bankField), account: acc, raw: acc.replace(/\D/g, '') };
    }
    return parseAccount(accountCell) || { bank: '', account: '', raw: '' };
  }

  // 첫 글자만 대문자: "HOON"/"hoon" → "Hoon"
  function cap(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''; }
  // 영문 이름 → {full, first, upper, spaced}
  //  입력 "Park Ji Hoon"(성 + 이름음절 띄어쓰기) →
  //    full "Park Jihoon" · first "Jihoon" · upper "JIHOON" · spaced "Ji Hoon"
  //  입력 "Park Jihoon"(이름 한 단어) → spaced도 "Jihoon"(안 깨짐)
  function transformEnName(fullName) {
    var parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    var surname = parts.length >= 2 ? parts[0] : '';
    var firstWords = parts.length >= 2 ? parts.slice(1) : parts;   // 성 제외한 이름 음절들
    var first = cap(firstWords.join(''));                          // "Jihoon"
    return {
      full: (surname ? cap(surname) + ' ' : '') + first,          // "Park Jihoon"
      first: first,
      upper: first.toUpperCase(),                                 // "JIHOON"
      spaced: firstWords.map(cap).join(' ')                       // "Ji Hoon"
    };
  }

  function yearToEnglish(year) {
    var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    var teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    var thousand = Math.floor(year / 1000), remainder = year % 1000;
    var hundred = Math.floor(remainder / 100), last2 = remainder % 100, result = '';
    if (thousand > 0) result += ones[thousand] + ' Thousand';
    if (hundred > 0) result += (result ? ' ' : '') + ones[hundred] + ' Hundred';
    if (last2 > 0) {
      if (result) result += ' ';
      if (last2 < 10) result += ones[last2];
      else if (last2 < 20) result += teens[last2 - 10];
      else { var t = Math.floor(last2 / 10), o = last2 % 10; result += tens[t] + (o > 0 ? '-' + ones[o] : ''); }
    }
    return result;
  }

  // 일(日) → 사한자(이십사). 1~31.
  function sinoDay(n) {
    var o = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    var t = ['', '십', '이십', '삼십'];
    if (n < 10) return o[n];
    if (n <= 39) return t[Math.floor(n / 10)] + o[n % 10];
    return String(n);
  }
  // 연도 → 로마숫자 (2026 → MMXXVI)
  function roman(num) {
    var map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    var r = '';
    for (var i = 0; i < map.length; i++) { while (num >= map[i][0]) { r += map[i][1]; num -= map[i][0]; } }
    return r;
  }

  // weddingDate('YYYY-MM-DD') → 날짜 전 형식 (KST 기준)
  function transformDate(weddingDate) {
    var p = String(weddingDate).split('-');
    var y = +p[0], mn = +p[1], dn = +p[2];
    var idx = new Date(y, mn - 1, dn).getDay();
    var m = String(mn).padStart(2, '0'), dd = String(dn).padStart(2, '0');
    var monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var daysKor = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var monthsHan = ['', '일월', '이월', '삼월', '사월', '오월', '유월', '칠월', '팔월', '구월', '시월', '십일월', '십이월'];
    return {
      y: y, m: m, dd: dd,
      display: y + '. ' + m + '. ' + dd, dateKor: y + '년 ' + mn + '월 ' + dn + '일',
      compact: '' + y + m + dd, spaced: y + ' ' + m + ' ' + dd,
      monthDay: m + ' · ' + dd, monthDayDot: m + '. ' + dd, monthDayPeriod: m + '.' + dd,
      monthEn: monthsEn[mn - 1] + ' ' + y, monthEnShort: monthsShort[mn - 1], monthNameEn: monthsEn[mn - 1],
      monthNum: '' + mn, monthNumPad: m, monthKor: mn + '월', monthDisplay: y + '년 ' + mn + '월',
      monthHan: monthsHan[mn], monthSlash: m + ' / ' + y, fullDot: y + ' · ' + m + ' · ' + dd,
      dayOfMonth: '' + dn, dayOfMonthPad: dd,
      dayEn: daysEn[idx], dayEnShort: daysShort[idx], dayKor: daysKor[idx], dayHan: sinoDay(dn) + '일',
      year: '' + y, yearEn: yearToEnglish(y), yearRoman: roman(y)
    };
  }

  // 시간 '14:00' → {display:'오후 2:00', kor:'오후 두 시'}
  function transformTime(weddingTime) {
    var s = String(weddingTime || '14:00').trim();
    var match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { display: s, kor: s, korFull: s, time24: s };
    var hour24 = parseInt(match[1], 10), min = match[2];
    var period = hour24 >= 12 ? '오후' : '오전';
    var hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    var hourKor = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
    var kor;
    if (min === '00') kor = period + ' ' + hourKor[hour12] + ' 시';
    else if (min === '30') kor = period + ' ' + hourKor[hour12] + ' 시 반';
    else kor = period + ' ' + hourKor[hour12] + ' 시 ' + parseInt(min, 10) + '분';
    var time24 = String(hour24).padStart(2, '0') + ':' + min;
    return { display: period + ' ' + hour12 + ':' + min, kor: kor, korFull: kor, time24: time24 };
  }

  // 캘린더 셀 HTML (디자인 01은 when-cal-cell, 그 외 date-cal-cell)
  function generateCalendarCells(weddingDate, designNum) {
    var p = String(weddingDate).split('-');
    var year = +p[0], month = (+p[1]) - 1, weddingDay = +p[2];
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var base = (designNum === '01' || designNum === '05') ? 'when-cal-cell' : 'date-cal-cell';
    var cellCls = base, sunCls = base + ' sun';
    var html = '';
    for (var i = 0; i < firstDay; i++) html += '<div class="' + cellCls + ' empty" aria-hidden="true"></div>\n          ';
    for (var day = 1; day <= daysInMonth; day++) {
      var dow = (firstDay + day - 1) % 7;
      var cls = (dow === 0) ? sunCls : cellCls;
      if (day === weddingDay) html += '<div class="' + cls + ' marked"><span>' + day + '</span></div>\n          ';
      else html += '<div class="' + cls + '">' + day + '</div>\n          ';
    }
    return html.trim();
  }

  // OPTIONAL 마커: 값 있으면 마커만 제거, 없으면 블록 통째 제거
  function processOptional(html, key, hasValue) {
    if (hasValue) {
      return html
        .split('<!-- OPTIONAL:' + key + ' -->').join('')
        .split('<!-- /OPTIONAL:' + key + ' -->').join('');
    }
    var re = new RegExp('[ \\t]*<!-- OPTIONAL:' + key + ' -->[\\s\\S]*?<!-- /OPTIONAL:' + key + ' -->\\n?', 'g');
    return html.replace(re, '');
  }

  // ─── 핵심 변환: 템플릿 HTML 문자열 → 채워진 HTML ───────────
  function transform(html, c, venue, designNum) {
    var groomEn = transformEnName(c.groomNameEn);
    var brideEn = transformEnName(c.brideNameEn);
    var date = transformDate(c.weddingDate);
    var time = transformTime(c.weddingTime);
    var gAcct = coupleAccount(c.groomBank, c.groomAccount);
    var bAcct = coupleAccount(c.brideBank, c.brideAccount);
    // 측 라벨: 부모 계좌가 함께 표시되면 "신랑측/신부측"(여러 명), 본인만이면 "신랑/신부". 측별 독립 판단.
    var showEnvP = showUnlessNo(c.envelopeShowParents);
    var gHasPar = showEnvP && !!(String(c.groomFatherAccount || '').trim() || String(c.groomMotherAccount || '').trim());
    var bHasPar = showEnvP && !!(String(c.brideFatherAccount || '').trim() || String(c.brideMotherAccount || '').trim());

    var hasGroomParents = !!(c.groomParents && String(c.groomParents).trim());
    var hasBrideParents = !!(c.brideParents && String(c.brideParents).trim());
    var showGreetPar = showUnlessNo(c.greetingShowParents);
    // 인사글 자녀소개 부모(greetingShowParents) — 결선 시 greeting* 마커로 분리됨
    html = processOptional(html, 'greetingGroomParents', showGreetPar && hasGroomParents);
    html = processOptional(html, 'greetingBrideParents', showGreetPar && hasBrideParents);
    // 계좌 영역 부모 이름 라벨(envelopeShowParents · 부모 계좌와 묶음)
    html = processOptional(html, 'groomParents', showEnvP && hasGroomParents);
    html = processOptional(html, 'brideParents', showEnvP && hasBrideParents);

    // 자녀 호칭 OPTIONAL — 모든 디자인 일관 처리:
    //   · 명시적 "호칭 생략 (이름만 표시)" 선택 → 호칭 통째 제거 (모든 디자인)
    //   · 빈 값(미선택) → 04는 마커로 통째 제거(폴백 어색 방지), 다른 디자인은 placeholder 폴백 "아들/딸"
    //   · 일반 호칭 ("장남" 등) → 그대로 표시
    var OMIT_TITLE = '호칭 생략 (이름만 표시)';
    var isGroomOmit = String(c.groomChildTitle || '').trim() === OMIT_TITLE;
    var isBrideOmit = String(c.brideChildTitle || '').trim() === OMIT_TITLE;
    var hasGroomTitle = !isGroomOmit && !!String(c.groomChildTitle || '').trim();
    var hasBrideTitle = !isBrideOmit && !!String(c.brideChildTitle || '').trim();
    html = processOptional(html, 'groomChildTitle', hasGroomTitle);
    html = processOptional(html, 'brideChildTitle', hasBrideTitle);

    // 디지털 참석(선택제): 명시적으로 N/아니오일 때만 숨김 — 빈 칸·미지정·Y는 모두 노출(기본 ON)
    html = processOptional(html, 'digitalAttendance', showUnlessNo(c.digitalAttendance));

    // 계좌 섹션: 측별 토글은 해당 측에 보여줄 계좌가 1개라도 있을 때만 노출
    //   · pageShowAcct: 이 페이지(오프/온)에서 표시 허용됐는지 — 폼 "계좌 표시 위치" 체크 결과
    //   · gShowItem: pageShowAcct AND (본인 계좌 있음 OR 부모 표시 ON & 부모 계좌 있음)
    //   · envelope 섹션 전체: 양쪽 다 보여줄 게 없으면 제거 → 빈 섹션·빈 토글 노출 방지
    //   ※ '/i-family/' = 오프라인 → accountFamily, '/i/' = 온라인 → accountOnline
    var famPage = location.pathname.indexOf('/i-family/') !== -1;
    var pageShowAcct = (String((famPage ? c.accountFamily : c.accountOnline) || '').trim().toUpperCase() === 'Y');
    var gShowItem = pageShowAcct && (!!gAcct.account || gHasPar);
    var bShowItem = pageShowAcct && (!!bAcct.account || bHasPar);

    // ?debug=1 시 모든 결정값을 콘솔에 출력 — 운영 진단용. 사용자에 영향 없음.
    try {
      if (new URLSearchParams(location.search).get('debug') === '1') {
        console.group('🔧 Moment Edit · Hydrate Debug');
        console.log('eventId           :', c.eventId);
        console.log('designNum         :', designNum, '/ famPage =', famPage);
        console.log('accountOnline     :', JSON.stringify(c.accountOnline), '/ accountFamily:', JSON.stringify(c.accountFamily), '→ pageShowAcct =', pageShowAcct);
        console.log('— 영문 이름 분리(transformEnName) —');
        console.log('groomNameEn raw   :', JSON.stringify(c.groomNameEn), '→ {full:', JSON.stringify(transformEnName(c.groomNameEn).full), ', first:', JSON.stringify(transformEnName(c.groomNameEn).first), ', spaced:', JSON.stringify(transformEnName(c.groomNameEn).spaced), '}');
        console.log('brideNameEn raw   :', JSON.stringify(c.brideNameEn), '→ {full:', JSON.stringify(transformEnName(c.brideNameEn).full), ', first:', JSON.stringify(transformEnName(c.brideNameEn).first), ', spaced:', JSON.stringify(transformEnName(c.brideNameEn).spaced), '}');
        console.log('— 섹션 토글 —');
        console.log('digitalAttendance :', JSON.stringify(c.digitalAttendance), '→', showUnlessNo(c.digitalAttendance) ? '✅ Nº IV 표시' : '❌ Nº IV 제거');
        console.log('greetingShowParents:', JSON.stringify(c.greetingShowParents), '→ showGreetPar =', showGreetPar);
        console.log('envelopeShowParents:', JSON.stringify(c.envelopeShowParents), '→ showEnvP =', showEnvP);
        console.log('— 신랑 계좌 —');
        console.log('groomBank/Account :', JSON.stringify(c.groomBank), '/', JSON.stringify(c.groomAccount), '→ gAcct.account =', JSON.stringify(gAcct.account));
        console.log('groomFatherAccount:', JSON.stringify(c.groomFatherAccount));
        console.log('groomMotherAccount:', JSON.stringify(c.groomMotherAccount));
        console.log('gHasPar           :', gHasPar, '/ gShowItem =', gShowItem, '→', gShowItem ? '✅ 신랑 토글 표시' : '❌ 신랑 토글 제거');
        console.log('— 신부 계좌 —');
        console.log('brideBank/Account :', JSON.stringify(c.brideBank), '/', JSON.stringify(c.brideAccount), '→ bAcct.account =', JSON.stringify(bAcct.account));
        console.log('brideFatherAccount:', JSON.stringify(c.brideFatherAccount));
        console.log('brideMotherAccount:', JSON.stringify(c.brideMotherAccount));
        console.log('bHasPar           :', bHasPar, '/ bShowItem =', bShowItem, '→', bShowItem ? '✅ 신부 토글 표시' : '❌ 신부 토글 제거');
        console.log('— 결론 —');
        console.log('envelope 섹션     :', (gShowItem || bShowItem) ? '✅ Nº V 표시' : '❌ Nº V 제거');
        console.groupEnd();
      }
    } catch (_) {}

    html = processOptional(html, 'envelope', gShowItem || bShowItem);
    html = processOptional(html, 'groomEnvItem', gShowItem);
    html = processOptional(html, 'brideEnvItem', bShowItem);
    html = processOptional(html, 'groomAccount', !!gAcct.account);
    html = processOptional(html, 'brideAccount', !!bAcct.account);

    // ── 고객 선택 3종 ──────────────────────────────────────
    // ① 인사글: 직접 작성 시 교체, 비우면 디자인 기본 인사글 유지.
    //    온라인(/i/)은 digInvitationText로 따로 작성 가능 — 비우면 오프라인/공통 invitationText를 그대로 이어받음.
    //    famPage 는 위 envelope 처리 블록에서 선언됨.
    var customInv = String((famPage ? c.invitationText : (c.digInvitationText || c.invitationText)) || '').trim();
    if (customInv) {
      html = html.replace(/<!-- OPTIONAL:invitationText -->[\s\S]*?<!-- \/OPTIONAL:invitationText -->/g, buildInvitation(customInv));
    } else {
      html = processOptional(html, 'invitationText', true); // 기본 인사글 유지
    }
    // (부모 표기 토글은 위 greeting*/envelope 부모 처리에서 분리 제어)

    // 디자인 02 전용 · 대표 문구(pullQuote): 직접 작성 시 교체, 비우면 기본 유지.
    //   온라인(/i/)은 digPullQuote로 따로 작성 가능 — 비우면 오프/공통 pullQuote를 그대로 상속.
    var customPQ = String((famPage ? c.pullQuote : (c.digPullQuote || c.pullQuote)) || '').trim();
    if (customPQ) {
      html = html.replace(/<!-- OPTIONAL:pullQuote -->[\s\S]*?<!-- \/OPTIONAL:pullQuote -->/g, nl2br(customPQ));
    } else {
      html = processOptional(html, 'pullQuote', true);
    }
    // 디자인 08 전용 · 자기소개(BIO): 직접 작성 시 그 글, 비우면 디자인 기본 소개(02 대표문구와 동일 정책)
    var DEFAULT_GROOM_BIO = '특별하지 않은 하루도, 함께라 충분합니다.';
    var DEFAULT_BRIDE_BIO = '사랑한다는 말보다, 더 오래 곁에 있겠습니다.';
    html = processOptional(html, 'groomBio', true);
    html = processOptional(html, 'brideBio', true);

    var map = {
      GROOM_NAME: escapeHtml(c.groomName), BRIDE_NAME: escapeHtml(c.brideName),
      GROOM_BANK: escapeHtml(gAcct.bank), BRIDE_BANK: escapeHtml(bAcct.bank),
      GROOM_ACCOUNT: escapeHtml(gAcct.account), BRIDE_ACCOUNT: escapeHtml(bAcct.account),
      GROOM_ACCOUNT_RAW: gAcct.raw, BRIDE_ACCOUNT_RAW: bAcct.raw,
      GROOM_PARENTS: escapeHtml(c.groomParents || ''), BRIDE_PARENTS: escapeHtml(c.brideParents || ''),
      // 자녀 호칭(형제 순서) — 비우면 기본 "아들"/"딸"
      // "호칭 생략" 선택 시 placeholder 빈 문자열 (OPTIONAL 마커가 통째 제거). 빈 값(미선택)은 폴백 "아들/딸".
      GROOM_CHILD_TITLE: escapeHtml(isGroomOmit ? '' : (String(c.groomChildTitle || '').trim() || '아들')),
      BRIDE_CHILD_TITLE: escapeHtml(isBrideOmit ? '' : (String(c.brideChildTitle || '').trim() || '딸')),
      GROOM_FIRST_EN_UPPER: groomEn.upper, BRIDE_FIRST_EN_UPPER: brideEn.upper,
      GROOM_FIRST_EN: groomEn.first, BRIDE_FIRST_EN: brideEn.first,
      GROOM_FIRST_EN_SPACED: groomEn.spaced, BRIDE_FIRST_EN_SPACED: brideEn.spaced,
      GROOM_FULL_EN: groomEn.full, BRIDE_FULL_EN: brideEn.full,
      WEDDING_DATE_DISPLAY: date.display, WEDDING_DATE_KOR: date.dateKor,
      WEDDING_DATE_COMPACT: date.compact, WEDDING_DATE_SPACED: date.spaced,
      WEDDING_MONTH_DAY_DISPLAY: date.monthDay, WEDDING_MONTH_DAY_DOT: date.monthDayDot, WEDDING_MONTH_DAY_PERIOD: date.monthDayPeriod,
      WEDDING_MONTH_EN: date.monthEn, WEDDING_MONTH_EN_SHORT: date.monthEnShort, WEDDING_MONTH_NAME_EN: date.monthNameEn,
      WEDDING_MONTH_NUM: date.monthNum, WEDDING_MONTH_NUM_PAD: date.monthNumPad,
      WEDDING_MONTH_KOR: date.monthKor, WEDDING_MONTH_DISPLAY: date.monthDisplay, WEDDING_MONTH_HAN: date.monthHan,
      WEDDING_MONTH_SLASH: date.monthSlash, WEDDING_FULL_DATE_DOT: date.fullDot,
      WEDDING_DAY_OF_MONTH: date.dayOfMonth, WEDDING_DAY_OF_MONTH_PAD: date.dayOfMonthPad,
      WEDDING_DAY_EN: date.dayEn, WEDDING_DAY_EN_SHORT: date.dayEnShort, WEDDING_DAY_KOR: date.dayKor, WEDDING_DAY_HAN: date.dayHan,
      WEDDING_YEAR: date.year, WEDDING_YEAR_EN: date.yearEn, WEDDING_YEAR_ROMAN: date.yearRoman,
      WEDDING_TIME_DISPLAY: time.display, WEDDING_TIME_KOR: time.kor, WEDDING_TIME_KOR_FULL: time.korFull, WEDDING_TIME_24H: time.time24,
      WEDDING_ISO_DATETIME: date.y + '-' + date.m + '-' + date.dd + 'T' + time.time24 + ':00+09:00',
      VENUE_NAME_KO: escapeHtml(venue.nameKo || ''), VENUE_NAME_EN: escapeHtml(venue.nameEn || ''),
      VENUE_NAME_KO_URI: encodeURIComponent(venue.nameKo || ''),
      VENUE_ADDRESS: escapeHtml(venue.address || ''),
      VENUE_TRANSPORT: venue.transport || '', VENUE_PARKING: escapeHtml(venue.parking || ''),
      VENUE_MAP_IFRAME: venue.mapIframe || '',
      GROOM_BIO: nl2br(String((famPage ? c.groomBio : (c.digGroomBio || c.groomBio)) || '').trim() || DEFAULT_GROOM_BIO),
      BRIDE_BIO: nl2br(String((famPage ? c.brideBio : (c.digBrideBio || c.brideBio)) || '').trim() || DEFAULT_BRIDE_BIO),
      GROOM_SIDE_LABEL: gHasPar ? '신랑측' : '신랑', BRIDE_SIDE_LABEL: bHasPar ? '신부측' : '신부',
      EVENT_ID: escapeHtml(c.eventId || '')
    };

    // 부모 계좌: envelopeShowParents 토글 + 빈 칸 자동 숨김. 예금주는 혼주 이름에서.
    var gPar = splitParents(c.groomParents), bPar = splitParents(c.brideParents);
    // 지도 미설정(사업장 계약 전 등) → 빈 iframe 대신 안내 placeholder (#5)
    if (!String(venue.mapIframe || '').trim()) {
      html = html.replace(/<iframe[^>]*\{\{VENUE_MAP_IFRAME\}\}[\s\S]*?<\/iframe>/g,
        '<div class="venue-map-pending" style="display:flex;align-items:center;justify-content:center;min-height:200px;height:100%;background:#f3f1ec;color:#9a8f7f;font-size:13px;letter-spacing:.02em;text-align:center;line-height:1.9">장소는 본 계약 후<br>안내드립니다</div>');
    }
    [['groomFatherAccount', 'GROOM_FATHER', gPar.father, c.groomFatherAccount],
     ['groomMotherAccount', 'GROOM_MOTHER', gPar.mother, c.groomMotherAccount],
     ['brideFatherAccount', 'BRIDE_FATHER', bPar.father, c.brideFatherAccount],
     ['brideMotherAccount', 'BRIDE_MOTHER', bPar.mother, c.brideMotherAccount]
    ].forEach(function (x) {
      var cell = String(x[3] || '').trim();
      html = processOptional(html, x[0], showEnvP && !!cell);
      var a = parseAccount(cell) || { bank: '', account: '', raw: '' };
      map[x[1] + '_NAME'] = escapeHtml(x[2] || '');
      map[x[1] + '_BANK'] = escapeHtml(a.bank);
      map[x[1] + '_ACCOUNT'] = escapeHtml(a.account);
      map[x[1] + '_ACCOUNT_RAW'] = a.raw;
    });

    for (var k in map) html = replaceAll(html, '{{' + k + '}}', map[k]);
    html = replaceAll(html, '{{CALENDAR_CELLS_HTML}}', generateCalendarCells(c.weddingDate, designNum));
    return html;
  }

  // ─── 메인 ───────────────────────────────────────────────
  function reveal() { document.body.classList.add('couple-ready'); }
  function designNum() { return (document.body.getAttribute('data-design') || '00').trim(); }

  // innerHTML 교체로 죽은 본문 스크립트 재실행 (결선 시 <script type="me/inert">로 표시됨)
  // 초기 파싱 땐 안 돌고, 채우기 끝난 최종 DOM에서 딱 1회 실행 → 인터랙션 보존
  function runInertScripts() {
    var list = document.body.querySelectorAll('script[type="me/inert"]');
    for (var i = 0; i < list.length; i++) {
      var old = list[i], s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        if (old.attributes[j].name !== 'type') s.setAttribute(old.attributes[j].name, old.attributes[j].value);
      }
      s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    }
  }

  function apply(couple) {
    try {
      var venue = window.MOMENT_VENUE || {};
      document.body.innerHTML = transform(document.body.innerHTML, couple, venue, designNum());
      if (couple.groomName && couple.brideName) document.title = couple.groomName + ' ♥ ' + couple.brideName + '의 결혼식에 초대합니다 | Moment Edit';
      runInertScripts();
      applyTitles(couple, designNum());
    } catch (e) { console.error('[hydrate]', e); }
  }

  // 인사말 섹션 제목 교체 — 커스텀 있을 때만 텍스트 교체(폰트·스타일 유지). 가족/디지털 디자인 따로.
  // 온라인(/i/)은 dig 우선, 비면 오프라인(fam) 상속 → 비면 디자인 기본. (인사말·대표문구·한마디와 동일 정책)
  function applyTitles(c, dn) {
    var fam = location.pathname.indexOf('/i-family/') !== -1;
    var pick = function (fk, dk) { return String((fam ? c[fk] : (c[dk] || c[fk])) || '').trim(); };
    var title = pick('famInvTitle', 'digInvTitle');
    var subko = pick('famInvSubKo', 'digInvSubKo');
    if (title) { var t = document.getElementById('sec-01-title') || document.querySelector('.inv-title'); if (t) t.textContent = title; }
    // 부제(큰 제목 아래 작은 줄) — 03=영문 'Cordially Invited' 자리, 04/07/08=한글 부제. 그 외 디자인은 부제 없음.
    var SUB = { '03': '.inv-title-sub', '04': '.sec-title-ko', '07': '.inv-title-ko', '08': '.sec-title-ko' };
    if (subko && SUB[dn]) { var k = document.querySelector(SUB[dn]); if (k) k.textContent = subko; }
  }

  function preconnectWebhook() {
    try {
      ['https://script.google.com', 'https://script.googleusercontent.com'].forEach(function (h) {
        if (document.querySelector('link[rel="preconnect"][href="' + h + '"]')) return;
        var l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; l.crossOrigin = '';
        document.head.appendChild(l);
      });
    } catch (_) {}
  }

  function init() {
    preconnectWebhook();
    var _p = new URLSearchParams(location.search);
    var eventId = (_p.get('e') || '').trim();
    var forceFresh = _p.get('fresh') === '1';   // ?e=...&fresh=1 → 캐시(클라+서버) 전부 무시(편집 중 확인용)
    var failsafe = setTimeout(reveal, 5000);

    if (!eventId) { apply(SAMPLE); clearTimeout(failsafe); reveal(); return; }

    var cacheKey = 'me_couple_' + eventId;
    // 캐시 우선: 같은 부부(eventId)는 재방문·다른 디자인도 즉시 렌더(체감 속도↑).
    // 그 뒤 백그라운드로 시트 최신값을 캐시에 갱신(다음 로드에 반영).
    var cached = forceFresh ? null : safeCache(cacheKey);
    var rendered = false;
    if (cached) {
      cached.eventId = eventId;
      apply(cached); clearTimeout(failsafe); reveal(); rendered = true;
    }

    fetch(WEBHOOK + '?action=getCouple&eventId=' + encodeURIComponent(eventId) + (forceFresh ? '&fresh=1' : ''))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.couple) {
          data.couple.eventId = eventId;
          var fresh = JSON.stringify(data.couple);
          // 재제출로 데이터가 바뀐 경우(이전 캐시 ≠ 최신 응답)에만 재렌더 → 깜빡임 없이 항상 최신 반영
          var prev = null;
          try { prev = localStorage.getItem(cacheKey); } catch (_) {}
          try { localStorage.setItem(cacheKey, fresh); } catch (_) {}
          if (!rendered || prev !== fresh) apply(data.couple);
        } else if (!rendered) {
          apply(SAMPLE);
        }
      })
      .catch(function () { if (!rendered) apply(safeCache(cacheKey) || SAMPLE); })
      .then(function () { if (!rendered) { clearTimeout(failsafe); reveal(); } });
  }

  function safeCache(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (_) { return null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
