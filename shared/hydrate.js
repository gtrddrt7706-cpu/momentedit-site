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
    groomName: '박지훈', brideName: '김서연',
    groomNameEn: 'Park Jihoon', brideNameEn: 'Kim Seoyeon',
    weddingDate: '2026-10-24', weddingTime: '14:00',
    groomParents: '박철수 · 이미경', brideParents: '김영호 · 최선영',
    groomAccount: '하나 222-456-789012', brideAccount: '우리 333-456-789012',
    vimeoId: '', vimeoHash: '',
    // 고객 선택 3종 (프리뷰 기본값) — 인사글 비움→기본, 부모표기 둘 다 표시
    invitationText: '', greetingShowParents: 'Y', envelopeShowParents: 'Y',
    // 부모 계좌 (프리뷰 샘플)
    groomFatherAccount: '국민 110-123-456789', groomMotherAccount: '신한 220-456-123789',
    brideFatherAccount: '농협 351-234-567890', brideMotherAccount: '카카오뱅크 3333-12-3456789',
    // 디자인 특수 (02 대표문구 · 08 자기소개)
    pullQuote: '', groomBio: '', brideBio: ''
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
  // 토글 값 해석 (Y/YES/예/1/표시 등 → true, 그 외/빈 값 → false)
  function truthy(v) { return /^(y|yes|true|1|on|표시|예|네)$/i.test(String(v || '').trim()); }
  // 고객 직접 작성 인사글(평문) → 문단 HTML (빈 줄=문단, 줄바꿈=<br>)
  function buildInvitation(text) {
    return String(text).trim().split(/\n\s*\n/).map(function (p) {
      return '<p>' + p.split('\n').map(function (l) { return escapeHtml(l.trim()); }).join('<br>') + '</p>';
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

  // 영문 이름 "Kim Minjun" → {full, first, upper, spaced}
  function transformEnName(fullName) {
    var trimmed = String(fullName || '').trim();
    var parts = trimmed.split(/\s+/);
    var first = parts.length >= 2 ? parts.slice(1).join('') : trimmed;
    return { full: trimmed, first: first, upper: first.toUpperCase(), spaced: splitName(first) };
  }
  function splitName(s) {
    if (s.length <= 1) return s;
    var mid = Math.ceil(s.length / 2);
    return s.slice(0, mid) + ' ' + s.slice(mid);
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

  // weddingDate('YYYY-MM-DD') → 날짜 8종 + 요일 3종 (KST 기준)
  function transformDate(weddingDate) {
    var d = new Date(weddingDate + 'T00:00:00+09:00');
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var idx = d.getDay();
    var monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var daysKor = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return {
      display: y + '. ' + m + '. ' + dd,
      monthDay: m + ' · ' + dd,
      monthEn: monthsEn[d.getMonth()] + ' ' + y,
      yearEn: yearToEnglish(y),
      fullDot: y + ' · ' + m + ' · ' + dd,
      monthSlash: m + ' / ' + y,
      monthKor: parseInt(m, 10) + '월',
      monthDayPeriod: m + '.' + dd,
      dayEn: daysEn[idx], dayEnShort: daysShort[idx], dayKor: daysKor[idx]
    };
  }

  // 시간 '14:00' → {display:'오후 2:00', kor:'오후 두 시'}
  function transformTime(weddingTime) {
    var s = String(weddingTime || '14:00').trim();
    var match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { display: s, kor: s };
    var hour24 = parseInt(match[1], 10), min = match[2];
    var period = hour24 >= 12 ? '오후' : '오전';
    var hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    var hourKor = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
    var kor;
    if (min === '00') kor = period + ' ' + hourKor[hour12] + ' 시';
    else if (min === '30') kor = period + ' ' + hourKor[hour12] + ' 시 반';
    else kor = period + ' ' + hourKor[hour12] + ' 시 ' + parseInt(min, 10) + '분';
    return { display: period + ' ' + hour12 + ':' + min, kor: kor };
  }

  // 캘린더 셀 HTML (디자인 01은 when-cal-cell, 그 외 date-cal-cell)
  function generateCalendarCells(weddingDate, designNum) {
    var d = new Date(weddingDate + 'T00:00:00+09:00');
    var year = d.getFullYear(), month = d.getMonth(), weddingDay = d.getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var cellCls, sunCls, hi;
    if (designNum === '01') { cellCls = 'when-cal-cell'; sunCls = 'when-cal-cell when-cal-cell-sun'; hi = ' when-cal-cell-today'; }
    else { cellCls = 'date-cal-cell'; sunCls = 'date-cal-cell sun'; hi = ' today'; }
    var html = '';
    for (var i = 0; i < firstDay; i++) html += '<div class="' + cellCls + ' empty" aria-hidden="true"></div>\n          ';
    for (var day = 1; day <= daysInMonth; day++) {
      var dow = (firstDay + day - 1) % 7;
      var cls = (dow === 0) ? sunCls : cellCls;
      if (day === weddingDay) cls += hi;
      html += '<div class="' + cls + '">' + day + '</div>\n          ';
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

    var hasGroomParents = !!(c.groomParents && String(c.groomParents).trim());
    var hasBrideParents = !!(c.brideParents && String(c.brideParents).trim());
    html = processOptional(html, 'groomParents', hasGroomParents);
    html = processOptional(html, 'brideParents', hasBrideParents);

    // ── 고객 선택 3종 ──────────────────────────────────────
    // ① 인사글: 직접 작성 시 교체, 비우면 디자인 기본 인사글 유지
    var customInv = String(c.invitationText || '').trim();
    if (customInv) {
      html = html.replace(/<!-- OPTIONAL:invitationText -->[\s\S]*?<!-- \/OPTIONAL:invitationText -->/g, buildInvitation(customInv));
    } else {
      html = processOptional(html, 'invitationText', true); // 기본 인사글 유지
    }
    // ② 인사글 밑 부모 표기 · ③ 계좌 부분 부모 표기 — 비우면 숨김
    html = processOptional(html, 'greetingParents', truthy(c.greetingShowParents));
    html = processOptional(html, 'envelopeParents', truthy(c.envelopeShowParents));

    // 디자인 02 전용 · 대표 문구(pullQuote): 직접 작성 시 교체, 비우면 기본 유지
    var customPQ = String(c.pullQuote || '').trim();
    if (customPQ) {
      html = html.replace(/<!-- OPTIONAL:pullQuote -->[\s\S]*?<!-- \/OPTIONAL:pullQuote -->/g, nl2br(customPQ));
    } else {
      html = processOptional(html, 'pullQuote', true);
    }
    // 디자인 08 전용 · 자기소개(BIO): 있으면 표시, 없으면 숨김
    html = processOptional(html, 'groomBio', !!String(c.groomBio || '').trim());
    html = processOptional(html, 'brideBio', !!String(c.brideBio || '').trim());

    var map = {
      GROOM_NAME: escapeHtml(c.groomName), BRIDE_NAME: escapeHtml(c.brideName),
      GROOM_BANK: escapeHtml(gAcct.bank), BRIDE_BANK: escapeHtml(bAcct.bank),
      GROOM_ACCOUNT: escapeHtml(gAcct.account), BRIDE_ACCOUNT: escapeHtml(bAcct.account),
      GROOM_ACCOUNT_RAW: gAcct.raw, BRIDE_ACCOUNT_RAW: bAcct.raw,
      GROOM_PARENTS: escapeHtml(c.groomParents || ''), BRIDE_PARENTS: escapeHtml(c.brideParents || ''),
      GROOM_FIRST_EN_UPPER: groomEn.upper, BRIDE_FIRST_EN_UPPER: brideEn.upper,
      GROOM_FIRST_EN: groomEn.first, BRIDE_FIRST_EN: brideEn.first,
      GROOM_FIRST_EN_SPACED: groomEn.spaced, BRIDE_FIRST_EN_SPACED: brideEn.spaced,
      GROOM_FULL_EN: groomEn.full, BRIDE_FULL_EN: brideEn.full,
      WEDDING_DATE_DISPLAY: date.display, WEDDING_MONTH_DAY_DISPLAY: date.monthDay,
      WEDDING_MONTH_EN: date.monthEn, WEDDING_YEAR_EN: date.yearEn,
      WEDDING_FULL_DATE_DOT: date.fullDot, WEDDING_MONTH_SLASH: date.monthSlash,
      WEDDING_MONTH_KOR: date.monthKor, WEDDING_MONTH_DAY_PERIOD: date.monthDayPeriod,
      WEDDING_DAY_EN: date.dayEn, WEDDING_DAY_EN_SHORT: date.dayEnShort, WEDDING_DAY_KOR: date.dayKor,
      WEDDING_TIME_DISPLAY: time.display, WEDDING_TIME_KOR: time.kor,
      VENUE_NAME_KO: escapeHtml(venue.nameKo || ''), VENUE_NAME_EN: escapeHtml(venue.nameEn || ''),
      VENUE_NAME_KO_URI: encodeURIComponent(venue.nameKo || ''),
      VENUE_ADDRESS: escapeHtml(venue.address || ''),
      VENUE_TRANSPORT: venue.transport || '', VENUE_PARKING: escapeHtml(venue.parking || ''),
      VENUE_MAP_IFRAME: venue.mapIframe || '',
      GROOM_BIO: nl2br(c.groomBio || ''), BRIDE_BIO: nl2br(c.brideBio || ''),
      GROOM_SIDE_LABEL: '신랑', BRIDE_SIDE_LABEL: '신부',
      EVENT_ID: escapeHtml(c.eventId || '')
    };

    // 부모 계좌: envelopeShowParents 토글 + 빈 칸 자동 숨김. 예금주는 혼주 이름에서.
    var showEnvP = truthy(c.envelopeShowParents);
    var gPar = splitParents(c.groomParents), bPar = splitParents(c.brideParents);
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

  function apply(couple) {
    try {
      var venue = window.MOMENT_VENUE || {};
      document.body.innerHTML = transform(document.body.innerHTML, couple, venue, designNum());
      if (couple.groomName && couple.brideName) document.title = couple.groomName + ' · ' + couple.brideName + ' — Moment Edit';
    } catch (e) { console.error('[hydrate]', e); }
  }

  function init() {
    var eventId = (new URLSearchParams(location.search).get('e') || '').trim();
    var failsafe = setTimeout(reveal, 5000);

    if (!eventId) { apply(SAMPLE); clearTimeout(failsafe); reveal(); return; }

    var cacheKey = 'me_couple_' + eventId;
    fetch(WEBHOOK + '?action=getCouple&eventId=' + encodeURIComponent(eventId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.couple) {
          data.couple.eventId = eventId;
          try { localStorage.setItem(cacheKey, JSON.stringify(data.couple)); } catch (_) {}
          apply(data.couple);
        } else {
          var cached = safeCache(cacheKey);
          apply(cached || SAMPLE);
        }
      })
      .catch(function () { apply(safeCache(cacheKey) || SAMPLE); })
      .then(function () { clearTimeout(failsafe); reveal(); });
  }

  function safeCache(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (_) { return null; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
