/* ★★[DRESS_REFS 2026-10-23 코워크 설계 명세 «시착 준비(드레스 미리 고르기)» · 사장님 회의 10/23] 시착 드레스 목록 — 단 하나의 원천.
   고르기 화면(dress.html?pick=1 · 마이페이지 겹화면) · 마이페이지 «드레스 미리 보기» 카드 · 관리자 상담 일정이 모두 이 파일을 읽는다.
   명세 전문: docs/handoff/설계명세_시착준비_1023.md · 명세 2(신청 직후 마이페이지): docs/handoff/설계명세2_시착준비_신청직후_1023.md
   ★[DRESS_PUBLIC_OFF 2026-10-23 코워크 설계 명세 2 · 사장님 «마이페이지만»] 홈 링크와 공개 «의상과 소품» 화면은 걷었다 —
     dress.html 은 ?pick=1 이 아니면 마이페이지로 넘긴다 · noindex 는 늘 둔다 · sitemap 에 넣지 않는다(검사 dress-refs.mjs 가 본다)

   ① [DRESS_LIVE] live 가 기능 스위치다. false 인 동안 운영 화면(신청서 · 마이페이지)에는 새로 보이는 것이 하나도 없다.
      켜는 것은 사장님이 드레스 사진을 넣은 뒤다 — 켤 때 할 일(검사 dress-refs.mjs 가 live:true 일 때 둘 다 본다):
        ㄱ. 아래 표본(sample:true)을 지우고 실물을 넣는다
        ㄴ. ★[DRESS_LIVE_READY 2026-10-23 코워크 검토 4] 실물 4벌 이상 · 모두 사진(img) · 넘겨 보는 사진(ex)은 사진이 있는 장만 둔다.
            사진 없이 켜면 고르기 화면 칸이 라인 그림만 남는다(같은 라인끼리 같은 그림 · 미니 · 미디도 바닥 길이로 그려진다) · 0벌이면 목록이 통째로 빈다.
   ② [DRESS_PHOTO] 사진이 오면 assets/dress-refs/ 에 d01.webp · d01.jpg … 를 넣고 그 드레스의 img:'d01' 만 채우면 된다(코드 수정 없음).
      img 가 비어 있으면 그 라인의 그림(assets/dress-refs/lines/*.svg) + 이름 칸으로 보인다.
      ex = 누르면 넘겨 보는 사진(앞 · 뒤 · 디테일 · 캔들존 · 화이트존). 사진이 오기 전에는 t 가 그림 아래 이름표로 보인다 · 오면 img 만 더한다.
   ③ [DRESS_SAMPLE] 지금은 실물 목록이 없어 검토용 표본 6벌을 sample:true 로 넣었다. 이름은 «표본 01» 식 — 실물처럼 짓지 않는다.
      ★표본은 운영 주소(momentedit.kr)에서 그려지지 않는다 — R.list() 가 뺀다(판정은 shared/preview-guard.js 의 PROD_HOSTS 와 같다 · 검사가 대조).
      ★[DRESS_SAMPLE_PROD 2026-10-23 사장님 «지금뜨게해» · 선택지 «모든 고객에게 지금»] 예외 한 곳 — SAMPLES_ON_PROD:true 인 동안은 운영 주소에서도 표본을 그린다.
        고객이 표본을 고르면 그 id(S01 ~ S06)와 «표본 NN»이 스튜디오로 간다(사장님이 알고 고른 결과). 실물이 들어오면 표본을 지우고 SAMPLES_ON_PROD 를 false 로 —
        그때부터 켜기 조건(실물 4벌 · 모두 사진)을 검사가 다시 본다. 이 표식 없이 live 만 켜면 검사가 빨강이다.
      실물이 들어오면 표본은 지운다.
   ④ [DRESS_RANK] 줄 세우는 규칙(명세 6장)은 R.rank 한 곳이다 — 고르기 화면과 검사(scripts/audit/dress-refs.mjs)가 같은 함수를 쓴다.
      화면에 점수를 보이지 않는다. 체형 · 키 · 몸무게는 묻지도 담지도 않는다(프리 사이즈).
   ⑤ [DRESS_WORDS] 고객 문구에 «추천 · 맞춤 · 담기 · 하트 · 커버 · 콤플렉스 · 피하세요 · 체형 · 골격 · 줄표»를 쓰지 않는다(검사가 본다).
      mood · pair 는 «명사로 끝나는 한 줄»로 쓴다 — 문장 끝 어미가 없어 고르기 화면(해요체) · 관리자 화면 어디에 나가도 말투가 맞는다.
      ★[DRESS_MOOD_OWN 2026-10-23 명세 2] mood 는 그 드레스만의 말(소재 · 장식 · 등선)로 — 자세히에서 라인 설명(lines[].lead) 바로 아래에 나가 같은 말을 되풀이하면 두 번 읽힌다(검사가 5글자 넘게 겹치면 막는다). */
(function (w) {
  var R = {
    v: 1,
    live: true,              // [DRESS_LIVE] 기능 스위치 — ★2026-10-23 사장님 «지금뜨게해» · 모든 고객에게 켬(표본 6벌로 · 아래 SAMPLES_ON_PROD)
    SAMPLES_ON_PROD: true,   // [DRESS_SAMPLE_PROD 2026-10-23 사장님 «지금뜨게해» · «모든 고객에게 지금»] 운영 주소에서도 표본 6벌을 그린다 — 실물 사진이 오면 표본을 지우고 이 줄을 false 로(한 곳)
    pick: 2,                 // 시착 기본 2벌 = 고르는 칸 Nº 01 · Nº 02
    changeUntilDays: 2,      // ★[DRESS_NO_DEADLINE 2026-10-23 사장님 «마감 없이 늘 고르기 · 참고용»] 쓰지 않는다(마감이 없다) — 서버 DRESS_PICK.untilDays 와 같은 값으로만 남긴다 · R.dueLine 도 화면에서 쓰지 않는다
    fitNote: '',             // 프리 사이즈 맞추는 방식 한 줄 · ★[DRESS_FITNOTE_EMPTY 2026-10-23 코워크 회신 4 보충] 빈 값 그대로(줄 없음) — 맞추는 방법이 사이트 · 계약서 어디에도 없다 · 공개 화면을 걷어 지금은 그리는 곳도 없다([DRESS_PUBLIC_OFF])
    PROD_HOSTS: ['momentedit.kr', 'www.momentedit.kr'],   // shared/preview-guard.js 와 같아야 한다(검사가 대조)

    /* 라인(실루엣) 다섯 — fit 은 고르기 화면 «어떤 핏이 편하세요?» 답과 잇는 값(body 몸 선을 따라 · waist 허리만 잡고 아래는 여유 · loose 전체적으로 여유)
       ★[DRESS_LINE_ONE 2026-10-23 코워크 검토 4] lead = 한 문장 · note = 행동이 필요한 «함께 볼 점»만(슬립 · 컬럼 둘 · 나머지는 빈 글 = 줄 없음)
       ★[DRESS_LINE_IN_DETAIL 2026-10-23 코워크 설계 명세 2] 공개 화면의 라인 안내는 고르기 화면 «자세히»로 옮겼다 — 그 드레스 라인의 lead + note(있는 라인만) */
    lines: [
      { key: 'slip', en: 'Slip', ko: '슬립', fit: 'body', svg: '/assets/dress-refs/lines/slip.svg',
        lead: '얇은 새틴이 몸을 따라 흐르는 라인입니다.',
        note: '누드톤 심리스 속옷을 함께 준비하시면 좋습니다.' },
      { key: 'column', en: 'Column', ko: '컬럼', fit: 'body', svg: '/assets/dress-refs/lines/column.svg',
        lead: '위에서 아래로 곧게 떨어지는 단정한 라인입니다.',
        note: '앉고 걷는 품을 시착 때 함께 확인해 보세요.' },
      { key: 'aline', en: 'Light A-line', ko: '라이트 A라인', fit: 'waist', svg: '/assets/dress-refs/lines/aline.svg',
        lead: '허리에서 아래로 가볍게 퍼지는 라인입니다.',
        note: '' },
      { key: 'empire', en: 'Empire', ko: '엠파이어', fit: 'loose', svg: '/assets/dress-refs/lines/empire.svg',
        lead: '가슴 아래에서 허리선이 잡혀 조이지 않는 편안한 라인입니다.',
        note: '' },
      { key: 'twopiece', en: 'Two-piece', ko: '투피스', fit: 'waist', svg: '/assets/dress-refs/lines/twopiece.svg',
        lead: '상의와 치마가 나뉘어 볼레로나 재킷을 더하기 좋은 구성입니다.',
        note: '' }
    ],

    /* 길이 셋 — ko 는 드레스 한 줄의 이름, q 는 고르기 화면 물음의 답 글 · note 는 길이 설명(공개 화면을 걷어 지금은 그리는 곳이 없다 · 글은 남긴다 [DRESS_PUBLIC_OFF])
       ★[DRESS_LEN_WORDS 2026-10-23 코워크 검토 4] 답 글은 칸 한 줄의 «미디 · 미니»와 이어지게(«미디(종아리)» · «미니(무릎 근처)»).
       ★[DRESS_KNEE_SECOND 2026-10-23 코워크 회신 4 보충] 미니 = «두 번째 의상»은 쓰되 다이닝은 쓰지 않는다 — 대여가 2벌부터 추가 비용(신청서)이라 두 번째 의상이 있고,
       140분 진행 Farewell «편하게 환복하는 마무리» 뒤가 다이닝이라 대여 드레스를 입고 식당에 가지 않는다(검사가 옛 낱말 · 다이닝 낱말을 막는다)
       ★[DRESS_CALF_FRESH 2026-10-23 코워크 회신 5] 미디 «…구두까지 보여 산뜻합니다» — 이웃한 미니 «가볍고 경쾌해»와 같은 낱말을 두 번 쓰지 않는다 */
    lengths: [
      { key: 'ankle', ko: '발목', q: '발목까지', note: '걸을 때 신발 끝이 살짝 보이는 길이입니다.' },
      { key: 'calf', ko: '미디', q: '미디(종아리)', note: '종아리 길이로, 구두까지 보여 산뜻합니다.' },
      { key: 'knee', ko: '미니', q: '미니(무릎 근처)', note: '무릎 근처 길이로, 가볍고 경쾌해 두 번째 의상으로도 잘 어울립니다.' }
    ],

    /* 고르기 화면의 물음 셋(한 화면에 하나 · 모두 «건너뛰기» 가능) — 건너뛰기는 그 조건을 보지 않는다
       ★[DRESS_Q_WORDS 2026-10-23 코워크 검토 4] 길이 답 = 칸 한 줄의 낱말 · 셋째 물음 = «이런 드레스가 편하신가요?»(답도 «~드레스»)
       ★[DRESS_Q_TRIM 2026-10-23 코워크 디자인 라운드 1 · 6] «아직 몰라요» 답을 뺐다 — «건너뛰기» · «질문 없이 바로 보기»와 같은 일이라 빠져나가는 길이 셋이었다.
         셋째 걸음 이름 «편한 쪽» → «노출 · 소매»(무엇을 묻는지 걸음 이름에서 보이게). 옛 저장본의 'unsure'는 cleanAns · 서버(DRESS_ANS)가 그대로 받아 조건을 보지 않는다
       figs = 핏 답 왼쪽의 작은 라인 그림(몸 선을 따라 = 슬립 · 허리만 잡고 아래는 여유 = 라이트 A라인 · 전체적으로 여유 = 엠파이어) */
    questions: [
      { key: 'len', step: '길이', q: '원하는 길이가 있으세요?',
        opts: [['ankle', '발목까지'], ['calf', '미디(종아리)'], ['knee', '미니(무릎 근처)']] },
      { key: 'fit', step: '핏', q: '어떤 핏이 편하세요?', figs: { body: 'slip', waist: 'aline', loose: 'empire' },
        opts: [['body', '몸 선을 따라'], ['waist', '허리만 잡고 아래는 여유'], ['loose', '전체적으로 여유']] },
      /* ★[DRESS_Q_FIRST 2026-10-24 사장님 «드레스 질문을 먼저 의무적으로 묻고»] 셋째 물음도 답해야 다음 — 보기 끝 «특별히 없어요»(none · 다른 보기와 함께 고르지 않는다)로 답하기 쉽게 · 보조 글 «둘 다 골라도 돼요.» */
      { key: 'pref', step: '노출 · 소매', q: '이런 드레스가 편하신가요?', sub: '둘 다 골라도 돼요.', multi: true, none: 'none',   // ★[DRESS_Q3_SUB 2026-10-23 코워크 디자인 라운드 3 · 5] 끊긴 메모처럼 읽히던 «여러 개 · 고르지 않으셔도 돼요»
        opts: [['low', '노출이 적은 드레스'], ['arms', '소매나 볼레로가 있는 드레스'], ['none', '특별히 없어요']] }
    ],

    /* 드레스 — expo: 'deep'(깊은 V넥 · 로우백) / 'soft' · sleeve: 'none' / 'sleeve' / 'bolero'(sleeve · bolero 는 «소매나 볼레로가 있는 드레스»)
       ★[DRESS_SAMPLE] 아래 여섯은 검토용 표본이다(sample:true) — 운영 주소에서는 그려지지 않는다 · 실물이 오면 지운다. */
    dresses: [
      { id: 'S01', name: '표본 01', line: 'slip', length: 'ankle', neck: '카울넥', fabric: '새틴', expo: 'deep', sleeve: 'none',
        mood: '부드럽게 주름지는 카울넥', pair: '긴 베일 · 얇은 볼레로', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S02', name: '표본 02', line: 'column', length: 'ankle', neck: '보트넥', fabric: '크레이프', expo: 'soft', sleeve: 'none',
        mood: '장식 없이 매끈한 크레이프 결', pair: '짧은 베일 · 진주 귀걸이', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S03', name: '표본 03', line: 'aline', length: 'ankle', neck: 'V넥', fabric: '시폰', expo: 'soft', sleeve: 'sleeve',
        mood: '걸을 때 겹겹이 흔들리는 시폰 자락', pair: '긴 베일', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S04', name: '표본 04', line: 'empire', length: 'calf', neck: '스퀘어넥', fabric: '오간자', expo: 'soft', sleeve: 'bolero',
        mood: '오간자 결이 은은하게 비치는 미디 길이', pair: '레이스 볼레로', img: '',
        ex: [{ t: '앞' }, { t: '뒤' }, { t: '디테일' }, { t: '캔들존' }, { t: '화이트존' }], sample: true },
      { id: 'S05', name: '표본 05', line: 'twopiece', length: 'knee', neck: '라운드넥', fabric: '크레이프', expo: 'soft', sleeve: 'none',
        mood: '무릎 근처에서 가볍게 끝나는 짧은 치마', pair: '짧은 베일 · 리본 헤어핀', img: '',
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
  /* 그려도 되는 드레스 — 운영 주소에서는 표본을 뺀다(★[DRESS_SAMPLE_PROD] SAMPLES_ON_PROD 가 참인 동안만 예외) */
  R.list = function () {
    var prod = R.isProd() && R.SAMPLES_ON_PROD !== true;
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
  /* ★[DRESS_SLIDES 2026-10-23 코워크 검토 4] 자세히에서 넘겨 보는 사진 = 사진(img)이 있는 장만 · 하나도 없으면 대표 사진 한 장(없으면 라인 그림) —
     종전엔 사진이 오기 전 이름표(앞 · 뒤 · 디테일 …)만 있는 빈 장 다섯을 넘겼다 */
  R.slides = function (d) {
    var s = (d && Array.isArray(d.ex) ? d.ex : []).filter(function (e) { return e && e.img; }).map(function (e) { return { img: e.img, t: e.t || '' }; });
    return s.length ? s : [{ img: (d && d.img) || '', t: '' }];
  };
  /* ★[DRESS_SUM_ONE 2026-10-23 코워크 검토 1 · 명세 5장 «넥라인 · 소재 · 라인»을 바꿈] 칸 한 줄은 «라인 · 길이 · 소재» —
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
     - «노출이 적은 드레스»(low)를 골랐으면 expo:'deep' 은 아래로 · «소매나 볼레로가 있는 드레스»(arms)를 골랐으면 sleeve:'none' 은 아래로
     - 답한 조건을 모두 맞고 아래로 갈 까닭이 없으면 match(원천 순서 그대로) — 고르기 화면은 한 그리드 맨 앞에 두고 칸에 «답과 맞아요»([DRESS_ONE_GRID])
     - 나머지는 아래로 갈 까닭이 적은 순 → 맞은 수가 많은 순 → 원천 순서
     - 빈 값(건너뛰기) · 옛 저장본의 'unsure'(«아직 몰라요» · 라운드 1 에서 답을 뺐다 [DRESS_Q_TRIM])는 그 조건을 보지 않는다 · 답이 하나도 없으면 나누지 않는다(asked:false)
     돌려주는 것: { asked, match:[드레스], rest:[드레스], near } — near = 답했는데 맞는 것이 0벌(«가까운 순서로 놓았어요») */
  R.FITS = ['body', 'waist', 'loose'];
  R.PREFS = ['low', 'arms'];
  R.PREF_NONE = 'none';   // ★[DRESS_Q_FIRST] «특별히 없어요» — 줄 세우기는 보지 않는다 · 다른 보기와 함께 두지 않는다(함께 오면 none 을 뺀다)
  R.cleanAns = function (a) {
    a = a || {};
    var len = R.lengthOf(a.len) ? a.len : (a.len === 'unsure' ? 'unsure' : '');
    var fit = R.FITS.indexOf(a.fit) >= 0 ? a.fit : (a.fit === 'unsure' ? 'unsure' : '');
    var pref = [];
    (Array.isArray(a.pref) ? a.pref : []).forEach(function (p) { if ((R.PREFS.indexOf(p) >= 0 || p === R.PREF_NONE) && pref.indexOf(p) < 0) pref.push(p); });
    if (pref.length > 1 && pref.indexOf(R.PREF_NONE) >= 0) pref.splice(pref.indexOf(R.PREF_NONE), 1);
    return { len: len, fit: fit, pref: pref };
  };
  /* ★[DRESS_Q_FIRST 2026-10-24 사장님] 물음 셋을 다 답했나 — 길이 · 핏(«아직 몰라요»였던 옛 'unsure'는 답이 아니다) · 셋째 하나 이상(특별히 없어요 포함).
     loose = 저장본에서 왔고 셋째가 비었으면 답한 것으로 본다(옛 서버가 none 을 버린 판 · 옛 저장본) */
  R.answered = function (a, loose) {
    a = R.cleanAns(a);
    return !!(R.lengthOf(a.len) && R.FITS.indexOf(a.fit) >= 0 && (a.pref.length > 0 || loose));
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
  /* ★[DRESS_DUE_SAME 2026-10-23 코워크 디자인 라운드 2 · 8] 바꾸기 마감 한 줄 — 마이페이지 카드(1 · 2벌)와 고르기 완료 화면이 같은 말(한 곳).
     상담 날짜를 모르면 «상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.» */
  R.dueLine = function (ymd) {
    var u = R.untilText(ymd);
    return u ? '바꾸기는 ' + u + '까지 할 수 있어요.' : '상담 날짜가 정해지면 바꾸기 마감일을 알려 드릴게요.';
  };

  w.DRESS_REFS = R;
})(typeof window !== 'undefined' ? window : globalThis);
