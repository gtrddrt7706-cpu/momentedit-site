/* ★★[DRESS_REFS 2026-10-23 코워크 설계 명세 «시착 준비(드레스 미리 고르기)» · 사장님 회의 10/23] 시착 드레스 목록 — 단 하나의 원천.
   공개 페이지(dress.html) · 고르기 화면(dress.html?pick=1) · 마이페이지 «시착 준비» 카드 · 관리자 상담 일정이 모두 이 파일을 읽는다.
   명세 전문: docs/handoff/설계명세_시착준비_1023.md

   ① [DRESS_LIVE] live 가 기능 스위치다. false 인 동안 운영 화면(홈 · 신청서 · 마이페이지)에는 새로 보이는 것이 하나도 없다.
      켜는 것은 사장님이 드레스 사진을 넣은 뒤다 — 켤 때 할 일(검사 dress-refs.mjs 가 live:true 일 때 셋 다 본다):
        ㄱ. 아래 표본(sample:true)을 지우고 실물을 넣는다   ㄴ. dress.html 의 noindex 줄을 지운다   ㄷ. sitemap.xml 에 /dress.html 을 넣는다
   ② [DRESS_PHOTO] 사진이 오면 assets/dress-refs/ 에 d01.webp · d01.jpg … 를 넣고 그 드레스의 img:'d01' 만 채우면 된다(코드 수정 없음).
      img 가 비어 있으면 그 라인의 그림(assets/dress-refs/lines/*.svg) + 이름 칸으로 보인다.
      ex = 누르면 넘겨 보는 사진(앞 · 뒤 · 디테일 · 캔들존 · 화이트존). 사진이 오기 전에는 t 가 그림 아래 이름표로 보인다 · 오면 img 만 더한다.
   ③ [DRESS_SAMPLE] 지금은 실물 목록이 없어 검토용 표본 6벌을 sample:true 로 넣었다. 이름은 «표본 01» 식 — 실물처럼 짓지 않는다.
      ★표본은 운영 주소(momentedit.kr)에서 절대 그려지지 않는다 — R.list() 가 뺀다(판정은 shared/preview-guard.js 의 PROD_HOSTS 와 같다 · 검사가 대조).
      실물이 들어오면 표본은 지운다.
   ④ [DRESS_RANK] 줄 세우는 규칙(명세 6장)은 R.rank 한 곳이다 — 고르기 화면과 검사(scripts/audit/dress-refs.mjs)가 같은 함수를 쓴다.
      화면에 점수를 보이지 않는다. 체형 · 키 · 몸무게는 묻지도 담지도 않는다(프리 사이즈).
   ⑤ [DRESS_WORDS] 고객 문구에 «추천 · 맞춤 · 담기 · 하트 · 커버 · 콤플렉스 · 피하세요 · 체형 · 골격 · 줄표»를 쓰지 않는다(검사가 본다).
      mood · pair 는 «명사로 끝나는 한 줄»로 쓴다 — 공개 페이지(합쇼체)와 고르기 화면(해요체)에 같은 글이 함께 나간다. */
(function (w) {
  var R = {
    v: 1,
    live: false,             // [DRESS_LIVE] 기능 스위치 — 켜는 것은 이번 범위가 아니다
    pick: 2,                 // 시착 기본 2벌 = 고르는 칸 Nº 01 · Nº 02
    changeUntilDays: 2,      // 바꾸기 마감 = 상담일 −2일 23:59(한국 시각) · 서버(consultation-booking.gs DRESS_PICK)도 같은 값
    fitNote: '',             // 프리 사이즈 맞추는 방식 한 줄 · 사장님 결정 전엔 빈 값 = 줄 숨김
    PROD_HOSTS: ['momentedit.kr', 'www.momentedit.kr'],   // shared/preview-guard.js 와 같아야 한다(검사가 대조)

    /* 라인(실루엣) 다섯 — fit 은 고르기 화면 «어떤 핏이 편하세요?» 답과 잇는 값(body 몸 선을 따라 · waist 허리만 잡고 아래는 여유 · loose 전체적으로 여유) */
    lines: [
      { key: 'slip', en: 'Slip', ko: '슬립', fit: 'body', svg: '/assets/dress-refs/lines/slip.svg',
        lead: '얇은 새틴이 몸을 따라 흐르는 라인입니다. 움직일 때 결이 살아나 가까이 담는 사진에 잘 어울립니다.',
        note: '몸의 선이 그대로 드러나 누드톤 심리스 속옷을 함께 준비하시면 좋습니다.' },
      { key: 'column', en: 'Column', ko: '컬럼', fit: 'body', svg: '/assets/dress-refs/lines/column.svg',
        lead: '위에서 아래로 곧게 떨어지는 라인입니다. 장식 없이 정돈된 인상이라 화이트존의 여백과 잘 어울립니다.',
        note: '앉고 걷는 품을 시착 때 함께 확인해 보세요.' },
      { key: 'aline', en: 'Light A-line', ko: '라이트 A라인', fit: 'waist', svg: '/assets/dress-refs/lines/aline.svg',
        lead: '허리에서 아래로 가볍게 퍼지는 라인입니다. 부피가 작아 가까운 거리에서도 움직임이 편합니다.',
        note: '허리 위치에 따라 인상이 달라져 두 벌을 견주어 보시기 좋습니다.' },
      { key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'loose', svg: '/assets/dress-refs/lines/empire.svg',
        lead: '가슴 바로 아래에서 허리선이 잡히고 아래로 자연스럽게 떨어지는 라인입니다.',
        note: '허리를 조이지 않아 오래 입어도 편합니다.' },
      { key: 'twopiece', en: 'Two-piece', ko: '투피스', fit: 'waist', svg: '/assets/dress-refs/lines/twopiece.svg',
        lead: '상의와 치마가 나뉜 구성입니다.',
        note: '위아래를 따로 맞출 수 있고, 볼레로나 재킷을 더하기 좋습니다.' }
    ],

    /* 길이 셋 — ko 는 공개 페이지 · 드레스 한 줄의 이름, q 는 고르기 화면 물음의 답 글 */
    lengths: [
      { key: 'ankle', ko: '발목', q: '발목까지', note: '걸을 때 신발 끝이 살짝 보이는 길이입니다.' },
      { key: 'calf', ko: '미디', q: '종아리', note: '종아리 길이로, 구두까지 보여 경쾌합니다.' },
      { key: 'knee', ko: '미니', q: '무릎 근처', note: '무릎 근처 길이로, 식사 자리나 두 번째 착장에 잘 어울립니다.' }
    ],

    /* 고르기 화면의 물음 셋(한 화면에 하나 · 모두 «건너뛰기» 가능) — 'unsure'(아직 몰라요) · 건너뛰기는 그 조건을 보지 않는다 */
    questions: [
      { key: 'len', step: '길이', q: '원하는 길이가 있으세요?',
        opts: [['ankle', '발목까지'], ['calf', '종아리'], ['knee', '무릎 근처'], ['unsure', '아직 몰라요']] },
      { key: 'fit', step: '핏', q: '어떤 핏이 편하세요?',
        opts: [['body', '몸 선을 따라'], ['waist', '허리만 잡고 아래는 여유'], ['loose', '전체적으로 여유'], ['unsure', '아직 몰라요']] },
      { key: 'pref', step: '편한 쪽', q: '이런 쪽이 편하신가요?', sub: '여러 개 · 고르지 않으셔도 돼요', multi: true,
        opts: [['low', '노출은 적게'], ['arms', '팔을 덮는 쪽']] }
    ],

    /* 드레스 — expo: 'deep'(깊은 V넥 · 로우백) / 'soft' · sleeve: 'none' / 'sleeve' / 'bolero'(sleeve · bolero 는 팔을 덮는 쪽)
       ★[DRESS_SAMPLE] 아래 여섯은 검토용 표본이다(sample:true) — 운영 주소에서는 그려지지 않는다 · 실물이 오면 지운다. */
    dresses: [
      { id: 'S01', name: '표본 01', line: 'slip', length: 'ankle', neck: '카울넥', fabric: '새틴', expo: 'deep', sleeve: 'none',
        mood: '움직일 때마다 결이 흐르는 가벼운 새틴', pair: '긴 베일 · 얇은 볼레로', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S02', name: '표본 02', line: 'column', length: 'ankle', neck: '보트넥', fabric: '크레이프', expo: 'soft', sleeve: 'none',
        mood: '장식 없이 곧게 떨어지는 단정한 선', pair: '짧은 베일 · 진주 귀걸이', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S03', name: '표본 03', line: 'aline', length: 'ankle', neck: 'V넥', fabric: '시폰', expo: 'soft', sleeve: 'sleeve',
        mood: '허리에서 가볍게 퍼지는 시폰 자락', pair: '긴 베일', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S04', name: '표본 04', line: 'empire', length: 'calf', neck: '스퀘어넥', fabric: '오간자', expo: 'soft', sleeve: 'bolero',
        mood: '가슴 아래로 편안하게 떨어지는 미디 길이', pair: '레이스 볼레로', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S05', name: '표본 05', line: 'twopiece', length: 'knee', neck: '라운드넥', fabric: '크레이프', expo: 'soft', sleeve: 'none',
        mood: '식사 자리까지 이어 입기 좋은 짧은 길이', pair: '짧은 베일 · 리본 헤어핀', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S06', name: '표본 06', line: 'slip', length: 'calf', neck: 'V넥 · 로우백', fabric: '새틴', expo: 'deep', sleeve: 'none',
        mood: '등선이 드러나는 로우백 미디', pair: '긴 베일 · 볼레로', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true }
    ]
  };

  /* [DRESS_SAMPLE] 운영 주소 판정 — preview-guard 가 먼저 떠 있으면 그 판정을, 없으면 같은 목록으로 */
  R.isProd = function () {
    try {
      var h = String((w.location && w.location.hostname) || '');
      if (w.ME_PREVIEW_GUARD && typeof w.ME_PREVIEW_GUARD.isProdHost === 'function') return !!w.ME_PREVIEW_GUARD.isProdHost(h);
      h = h.toLowerCase().replace(/\.$/, '');
      return R.PROD_HOSTS.indexOf(h) >= 0;
    } catch (e) { return true; }   // 모르면 운영으로 본다 — 표본이 새지 않는 쪽
  };
  /* 그려도 되는 드레스 — 운영 주소에서는 표본을 뺀다 */
  R.list = function () {
    var prod = R.isProd();
    return R.dresses.filter(function (d) { return !(prod && d.sample); });
  };
  R.dress = function (id) {
    var l = R.list();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  R.line = function (k) { for (var i = 0; i < R.lines.length; i++) if (R.lines[i].key === k) return R.lines[i]; return null; };
  R.lengthOf = function (k) { for (var i = 0; i < R.lengths.length; i++) if (R.lengths[i].key === k) return R.lengths[i]; return null; };
  R.img = function (d, ext) { return (d && d.img) ? ('/assets/dress-refs/' + d.img + '.' + (ext || 'webp')) : ''; };
  R.exImg = function (e, ext) { return (e && e.img) ? ('/assets/dress-refs/' + e.img + '.' + (ext || 'webp')) : ''; };
  R.svg = function (d) { var l = R.line(d && d.line); return l ? l.svg : ''; };
  /* ★[DRESS_SUM_ONE 2026-10-23 코워크 검토 1 · 명세 5장 «넥라인 · 소재 · 라인»을 바꿈] 칸 한 줄은 공개 · 고르기 모두 «라인 · 길이 · 소재» —
     첫 물음이 길이라 왜 아래로 갔는지 칸에서 보여야 한다. 넥라인은 자세히에만(라인 · 길이 · 소재 · 넥라인). */
  R.sumCell = function (d) {
    var l = R.line(d.line), g = R.lengthOf(d.length);
    return [l ? l.ko : '', g ? g.ko : '', d.fabric || ''].filter(Boolean).join(' · ');
  };
  R.sumDetail = function (d) {
    return [R.sumCell(d), d.neck || ''].filter(Boolean).join(' · ');
  };

  /* ★[DRESS_RANK] 줄 세우기(명세 6장) — 답 ans = { len, fit, pref[] }
     - 길이 답 = dress.length 일 때 맞음 · 핏 답 = 그 라인의 fit 일 때 맞음
     - «노출은 적게»(low)를 골랐으면 expo:'deep' 은 아래로 · «팔을 덮는 쪽»(arms)을 골랐으면 sleeve:'none' 은 아래로
     - 답한 조건을 모두 맞고 아래로 갈 까닭이 없으면 «답에 맞는 드레스»(원천 순서 그대로)
     - 나머지는 아래로 갈 까닭이 적은 순 → 맞은 수가 많은 순 → 원천 순서
     - 'unsure'(아직 몰라요) · 빈 값(건너뛰기)은 그 조건을 보지 않는다 · 답이 하나도 없으면 나누지 않는다(asked:false)
     돌려주는 것: { asked, match:[드레스], rest:[드레스], near } — near = 답했는데 맞는 것이 0벌(«가까운 순서로 놓았어요») */
  R.FITS = ['body', 'waist', 'loose'];
  R.PREFS = ['low', 'arms'];
  R.cleanAns = function (a) {
    a = a || {};
    var len = R.lengthOf(a.len) ? a.len : (a.len === 'unsure' ? 'unsure' : '');
    var fit = R.FITS.indexOf(a.fit) >= 0 ? a.fit : (a.fit === 'unsure' ? 'unsure' : '');
    var pref = [];
    (Array.isArray(a.pref) ? a.pref : []).forEach(function (p) { if (R.PREFS.indexOf(p) >= 0 && pref.indexOf(p) < 0) pref.push(p); });
    return { len: len, fit: fit, pref: pref };
  };
  R.rank = function (ans, list) {
    var a = R.cleanAns(ans);
    list = (list || R.list()).slice();
    var len = (a.len && a.len !== 'unsure') ? a.len : '';
    var fit = (a.fit && a.fit !== 'unsure') ? a.fit : '';
    var low = a.pref.indexOf('low') >= 0, arms = a.pref.indexOf('arms') >= 0;
    var asked = !!(len || fit || low || arms);
    if (!asked) return { asked: false, match: [], rest: list, near: false };
    var rows = list.map(function (d, i) {
      var l = R.line(d.line) || {}, need = 0, hit = 0, down = 0;
      if (len) { need++; if (d.length === len) hit++; }
      if (fit) { need++; if (l.fit === fit) hit++; }
      if (low && d.expo === 'deep') down++;
      if (arms && d.sleeve === 'none') down++;
      return { d: d, i: i, hit: hit, down: down, ok: hit === need && down === 0 };
    });
    var match = rows.filter(function (r) { return r.ok; }).map(function (r) { return r.d; });
    var rest = rows.filter(function (r) { return !r.ok; })
      .sort(function (x, y) { return (x.down - y.down) || (y.hit - x.hit) || (x.i - y.i); })
      .map(function (r) { return r.d; });
    return { asked: true, match: match, rest: rest, near: match.length === 0 };
  };

  /* [DRESS_UNTIL] 바꾸기 마감 — 상담일(YYYY-MM-DD) −changeUntilDays 일 23:59:59(한국 시각)의 시각(ms). 날짜를 못 읽으면 0 */
  R.until = function (ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    if (!m) return 0;
    return Date.UTC(+m[1], +m[2] - 1, +m[3] - R.changeUntilDays, 23 - 9, 59, 59);
  };
  R.closed = function (ymd, now) { var u = R.until(ymd); return !!u && (now || Date.now()) > u; };
  /* [DRESS_DUE_DATE 2026-10-23 코워크 검토 1] 바꾸기 마감 날 글 — «10월 23일(금)»(상담일 −changeUntilDays 일 · 요일은 계산 · [DATE_DOW]). 날짜를 못 읽으면 '' */
  R.untilText = function (ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    if (!m) return '';
    var t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - R.changeUntilDays));
    return (t.getUTCMonth() + 1) + '월 ' + t.getUTCDate() + '일(' + '일월화수목금토'.charAt(t.getUTCDay()) + ')';
  };

  w.DRESS_REFS = R;
})(typeof window !== 'undefined' ? window : globalThis);
