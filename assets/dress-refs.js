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

    /* 라인(실루엣) 다섯 — fit 은 고르기 화면 «어떤 라인이 좋으세요?» 답과 잇는 값(body 몸 선을 따라 · waist 허리만 잡고 아래는 여유 · loose 전체적으로 여유)
       ★[DRESS_LINE_ONE 2026-10-23 코워크 검토 4] lead = 한 문장 · note = 행동이 필요한 «함께 볼 점»만(슬립 · 컬럼 둘 · 나머지는 빈 글 = 줄 없음)
       ★[DRESS_LINE_IN_DETAIL 2026-10-23 코워크 설계 명세 2] 공개 화면의 라인 안내는 고르기 화면 «자세히»로 옮겼다 — 그 드레스 라인의 lead + note(있는 라인만) */
    lines: [
      { key: 'slip', en: 'Slip', ko: '슬립', fit: 'body', svg: '/assets/dress-refs/lines/slip.svg',
        lead: '얇은 새틴이 몸을 따라 흐르는 라인입니다.',
        note: '누드톤 심리스 속옷을 함께 준비하시면 좋습니다.' },
      { key: 'column', en: 'Column', ko: '컬럼', fit: 'body', svg: '/assets/dress-refs/lines/column.svg',
        lead: '위에서 아래로 곧게 떨어지는 단정한 라인입니다.',
        note: '앉고 걷는 품을 시착 때 함께 확인해 보세요.' },
      { key: 'mermaid', en: 'Mermaid', ko: '머메이드', fit: 'body', svg: '/assets/dress-refs/lines/mermaid.svg',   // ★[DRESS_SAMPLE_V2 1024 코워크] 스타일 예시 01 의 라인 · 물음 2 «몸선을 따라 슬림하게»와 잇는다
        lead: '무릎 아래에서 부드럽게 퍼지는 라인입니다.',
        note: '' },
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
       ★[DRESS_Q_WORDS 2026-10-23 코워크 검토 4] 길이 답 = 칸 한 줄의 낱말 · 셋째 물음은 «노출 · 소매»를 묻는다(★[DRESS_FORM_1024] 지금 글은 아래 questions)
       ★[DRESS_Q_TRIM 2026-10-23 코워크 디자인 라운드 1 · 6] «아직 몰라요» 답을 뺐다 — «건너뛰기» · «질문 없이 바로 보기»와 같은 일이라 빠져나가는 길이 셋이었다.
         셋째 걸음 이름 «편한 쪽» → «노출 · 소매»(무엇을 묻는지 걸음 이름에서 보이게). 옛 저장본의 'unsure'는 cleanAns · 서버(DRESS_ANS)가 그대로 받아 조건을 보지 않는다
       figs = 핏 답 왼쪽의 작은 라인 그림(몸 선을 따라 = 슬립 · 허리만 잡고 아래는 여유 = 라이트 A라인 · 전체적으로 여유 = 엠파이어) */
    questions: [
      /* ★★[DRESS_FORM_1024 코워크 «상담 전 둘러보기» 완성도 · 사장님 «처음에 질문 몇 가지로 시작 · 폼 디자인도 신경 써서»] 물음 글 · 보기 글 · 그림(같은 크기 · 같은 시점)
         보기 수 · 필수 · 하나만 / 여럿은 그대로 · figs = 보기 그림(경로 또는 라인 key) · 그림이 없는 보기(특별한 선호는 없어요)는 낮은 칸 */
      { key: 'len', step: '길이', q: '어느 정도 길이가 마음에 드세요?',
        figs: { ankle: '/assets/dress-refs/q/len-ankle.svg', calf: '/assets/dress-refs/q/len-calf.svg', knee: '/assets/dress-refs/q/len-knee.svg' },
        opts: [['ankle', '발목까지'], ['calf', '종아리 정도'], ['knee', '무릎 근처']],
        tips: { ankle: '바닥에 끌리지 않아 걷고 앉기가 가벼워요. 당일 신을 굽과 비슷한 신발로 밑단 위치를 확인해 보세요.',
                calf: '클래식하면서 산뜻한 길이예요. 발끝과 슈즈가 보이니 신발도 함께 골라 보세요.',
                knee: '가장 가볍게 움직일 수 있어요. 베일이나 헤어 장식을 더하면 신부 분위기가 또렷해져요.' } },
      { key: 'fit', step: '라인', q: '어떤 라인이 마음에 드세요?',   // ★[DRESS_Q2_LINE 1024 코워크] 아직 입어 보지 않은 옷의 편안함을 묻지 않는다 — 종전 «어떤 핏이 편하세요?» · 걸음 이름 핏 → 라인
        figs: { body: 'slip', waist: 'aline', loose: 'empire' },
        opts: [['body', '몸선을 따라 슬림하게'], ['waist', '허리는 잡고 아래는 여유 있게'], ['loose', '전체적으로 여유 있게']],
        tips: { body: '장식보다 원단의 결이 먼저 보여요. 누드톤 심리스 속옷을 입고 입어 보면 판단이 쉬워요.',
                waist: '흔히 무난하다고 이야기하는 라인이에요. 허리선 위치를 옆모습으로 확인해 보세요.',   // [DRESS_WORDS] 코워크 글 «흔히 많은 체형에 무난하다고» — «체형»은 쓰지 않는 말이라 뺐다
                loose: '몸을 조이지 않아 하루 종일 편해요. 옆모습에서 원단이 떨어지는 모양을 봐 주세요.' } },
      /* ★[DRESS_Q_FIRST 2026-10-24 사장님 «드레스 질문을 먼저 의무적으로 묻고»] 셋째 물음도 답해야 다음 — «특별한 선호는 없어요»(none)와 나머지는 서로 해제 */
      { key: 'pref', step: '노출 · 소매', q: '노출과 소매는 어느 쪽이 좋으세요?', sub: '해당하는 것을 모두 골라 주세요.', multi: true, none: 'none',   // ★[DRESS_Q3_SUB] 여럿 고름 안내 한 줄
        figs: { low: '/assets/dress-refs/q/pref-low.svg', arms: '/assets/dress-refs/q/pref-arms.svg' },
        opts: [['low', '노출이 적은 스타일'], ['arms', '소매나 볼레로가 있는 스타일'], ['none', '특별한 선호는 없어요']],
        tips: { low: '덮는 디자인도 충분히 정갈해요. 팔을 들고 부케를 들어 보며 답답함이 없는지 확인해 주세요.',
                arms: '붙인 모습과 뗀 모습을 둘 다 입어 보면 두 장면을 미리 그려 볼 수 있어요.',
                none: '넥라인에 따라 인상이 꽤 달라져요. 두세 가지를 나란히 입어 보면 비교가 쉬워요.' } }
    ],

    /* ★★[DRESS_DETAIL_FIELDS 1024 코워크 «자세히 — 사장님이 채울 칸»] 드레스마다 더 적을 수 있는 칸(비어 있으면 그 줄은 화면에 아예 없다):
         intro   한 줄 소개(없으면 그 라인의 lead)
         design  «디자인» 한 줄(있으면 이 글 · 없으면 라인 · 허리선 · 기장 · 네크라인 · 소매 칸) · feel «소재 · 분위기» 문장(없으면 소재 · mood)
         waist   허리선(예: '자연 허리선') · 소매는 sleeve 값에서(none 없음 · sleeve 소매 있음 · bolero 볼레로) · 기장 · 네크라인 · 라인은 있는 칸에서
         tryOn   «입어 보며 확인해요» 줄들(예: ['팔을 들었을 때 여유', '앉았을 때 허리 품', '구두를 신은 실제 기장'])
         onsite  «현장에서 함께 볼 것» 줄들(볼레로 · 소품 · 조절 · 없으면 pair 를 « · »로 나눠 쓴다)
         related «함께 살펴볼 드레스» 1~2벌 — [{ id: 'S02', diff: '같은 기장 · 장식 없이 곧은 라인' }] (목록에 없는 id 는 건너뛴다)
       지금 표본 여섯은 있는 값만(라인 · 기장 · 네크라인 · 소매 · 소재 · 분위기 · 소품) — 사장님이 실물을 넣을 때 채운다 */
    /* 드레스 — expo: 'deep'(깊은 V넥 · 로우백) / 'soft' · sleeve: 'none' / 'sleeve' / 'bolero'(sleeve · bolero 는 «소매나 볼레로가 있는 드레스»)
       ★[DRESS_SAMPLE] 아래 여섯은 검토용 표본이다(sample:true) — 운영 주소에서는 그려지지 않는다 · 실물이 오면 지운다. */
    dresses: [
      /* ★★[DRESS_SAMPLE_V2 2026-10-24 코워크 · 사장님 «실제 유행하는 드레스 · 우리 컨셉에 맞게» · «실제 착장 사진은 빼자»] 스타일 예시 여섯(드레스폼 · 같은 스튜디오 빛 · 글자 없음).
         이름 «스타일 예시 0n · ○○»(실물처럼 상품명 짓지 않음) · 사진 img = 앞 · ex = 앞 · 뒤 · 디테일(캔들존 · 화이트존은 실제 촬영 사진이 올 때까지 뺀다) ·
         화면에 «스타일 예시 이미지»를 작게 표시(사장님 결정 · 실제 매장 드레스가 오면 바꾼다) · 근거 = 코워크 dress-research.md 1~6절 · youtube/SUMMARY.md
         물음 답 덮음: 길이 ankle 01 02 03 06 · calf 04 · knee 05 / 라인 body 01 03 · waist 02 04 05 · loose 06 / 노출 적음 02 04 05 06(03 만 deep) · 소매 · 볼레로 02 04 06 */
      { id: 'S01', name: '스타일 예시 01 · 모던 머메이드', line: 'mermaid', length: 'ankle', neck: '스트레이트(스트랩리스)', fabric: '미카도', expo: 'soft', sleeve: 'none',
        mood: '장식 없이 재단으로 세운 실루엣', pair: '탈부착 케이프 · 긴 베일', img: 'd01-front',
        intro: '장식 없이 재단과 원단으로 완성한 담백한 머메이드',
        design: '무릎 아래에서 부드럽게 퍼지는 머메이드 · 스트랩리스 직선 넥 · 짧은 트레인',
        feel: '탄탄한 미카도라 사진에서 실루엣이 또렷해요. 차분하고 단정한 인상이에요.',
        tryOn: ['걸을 때 보폭', '앉았을 때 무릎 아래 여유', '팔을 들 때 스트랩리스가 내려가지 않는지'],
        onsite: ['탈부착 케이프', '긴 베일'],
        ex: [{ t: '앞', img: 'd01-front' }, { t: '뒤', img: 'd01-back' }, { t: '디테일', img: 'd01-detail' }], sample: true },
      { id: 'S02', name: '스타일 예시 02 · 크레이프 A라인 · 케이프', line: 'aline', length: 'ankle', neck: '보트넥', fabric: '크레이프 · 오간자 케이프', expo: 'soft', sleeve: 'bolero',
        mood: '등 뒤로 떨어지는 오간자 케이프', pair: '케이프 길이 · 짧은 베일', img: 'd02-front',
        intro: '무광 크레이프 A라인에 얇은 오간자 케이프를 더한 단정한 드레스',
        design: '허리를 잡고 아래로 여유 있게 퍼지는 A라인 · 보트넥 · 등 뒤로 떨어지는 탈부착 케이프',
        feel: '무광이라 대부분의 조명에서 깔끔하게 나와요. 케이프를 떼면 더 가벼운 인상이에요.',
        tryOn: ['허리선이 몸의 어디에 오는지 옆모습', '케이프를 붙인 모습과 뗀 모습'],
        onsite: ['케이프 길이', '짧은 베일'],
        ex: [{ t: '앞', img: 'd02-front' }, { t: '뒤', img: 'd02-back' }, { t: '디테일', img: 'd02-detail' }], sample: true },
      { id: 'S03', name: '스타일 예시 03 · 새틴 슬립 · 백 리본', line: 'slip', length: 'ankle', neck: 'V넥(얇은 끈)', fabric: '새틴', expo: 'deep', sleeve: 'none',
        mood: '등이 트인 뒤판과 큰 새틴 리본', pair: '얇은 볼레로 · 긴 베일', img: 'd03-front',
        intro: '바이어스 새틴이 몸을 따라 흐르고, 등에 리본 하나로 포인트를 준 슬립',
        design: '몸을 따라 흐르는 슬림 라인 · 얇은 끈 V넥 · 등이 트인 뒤판과 큰 새틴 리본',
        feel: '은은한 광택이 있어요. 강한 플래시에서는 하얗게 날 수 있고, 접힌 자국이 잘 보이는 소재예요.',
        tryOn: ['누드톤 심리스 속옷으로 속옷 라인', '뒷모습 리본 위치', '앉았을 때 주름'],
        onsite: ['얇은 볼레로', '긴 베일'],
        ex: [{ t: '앞', img: 'd03-front' }, { t: '뒤', img: 'd03-back' }, { t: '디테일', img: 'd03-detail' }], sample: true },
      { id: 'S04', name: '스타일 예시 04 · 오간자 티렝스', line: 'aline', length: 'calf', neck: '스퀘어넥', fabric: '오간자', expo: 'soft', sleeve: 'sleeve',
        mood: '바스크 허리선과 작은 퍼프 소매', pair: '슈즈 · 짧은 베일 · 헤어 리본', img: 'd04-front',
        intro: '스퀘어넥과 바스크 허리선에 가벼운 오간자 치마를 더한 티렝스',
        design: '허리 아래로 V를 그리는 바스크 허리 · 한두 겹 오간자 치마 · 탈부착 작은 퍼프 소매',
        feel: '얇고 빳빳해 가볍게 볼륨이 살아요. 여섯 가운데 가장 로맨틱한 인상이에요.',
        tryOn: ['밑단이 다리 어디에서 끝나는지', '신발이 보이므로 슈즈와 함께', '소매를 붙인 모습과 뗀 모습'],
        onsite: ['슈즈', '짧은 베일', '헤어 리본'],
        ex: [{ t: '앞', img: 'd04-front' }, { t: '뒤', img: 'd04-back' }, { t: '디테일', img: 'd04-detail' }], sample: true },
      { id: 'S05', name: '스타일 예시 05 · 미니 · 오버스커트', line: 'aline', length: 'knee', neck: '라운드넥', fabric: '크레이프 · 오간자', expo: 'soft', sleeve: 'none',
        mood: '크레이프 미니에 두르는 롱 오버스커트', pair: '베일 · 굽 높이가 다른 슈즈 두 켤레', img: 'd05-front',
        intro: '깔끔한 크레이프 미니에 탈부착 롱 오버스커트를 두른 두 가지 모습',
        design: '무릎 위 미니 · 허리에 두르는 오간자 오버스커트(짧은 트레인)',
        feel: '본식은 길게, 2부와 스냅은 짧게. 한 벌로 분위기를 바꿔요.',
        tryOn: ['오버스커트를 뗀 길이에서 앉았을 때', '걸을 때 오버스커트 앞트임'],
        onsite: ['베일', '굽 높이가 다른 슈즈 두 켤레'],
        ex: [{ t: '앞', img: 'd05-front' }, { t: '뒤', img: 'd05-back' }, { t: '디테일', img: 'd05-detail' }], sample: true },
      { id: 'S06', name: '스타일 예시 06 · 시폰 엠파이어 긴소매', line: 'empire', length: 'ankle', neck: '하이넥', fabric: '시폰', expo: 'soft', sleeve: 'sleeve',
        mood: '비치는 비숍 소매와 겹겹 시폰', pair: '진주 귀걸이 · 짧은 베일', img: 'd06-front',
        intro: '가슴 아래 허리선에서 시폰이 흐르듯 떨어지는 하이넥 긴소매',
        design: '엠파이어 허리선 · 하이넥 · 비치는 비숍 소매 · 발목 길이',
        feel: '겹겹 시폰이 걸을 때 부드럽게 흔들려요. 노출이 적고 편안한 인상이에요.',
        tryOn: ['하이넥이 답답하지 않은지', '소매 끝 위치', '옆모습에서 원단이 떨어지는 모양'],
        onsite: ['진주 귀걸이', '짧은 베일'],
        ex: [{ t: '앞', img: 'd06-front' }, { t: '뒤', img: 'd06-back' }, { t: '디테일', img: 'd06-detail' }], sample: true }
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
  /* ★[DRESS_TIPS_1024 코워크 · 조사 7절] 결과 «내가 고른 스타일» 아래 고른 답마다 한 줄(최대 3줄 · 추천 · 맞춤 · 약속 말 · 몸 단정 없음) · «방문 전 준비» 네 줄 */
  R.PREP = ['누드톤 심리스 속옷과 끈 없는 브라', '당일과 비슷한 굽의 신발', '마음에 드는 이미지 두세 장', '입어 볼 때 앉기 · 팔 들기 · 걷기 한 번씩'];
  /* ★★[DRESS_ACC_1024 코워크 · 사장님 «함께 볼 소품 추가해» · «부케도 모형 부케 기본적으로 셋팅해 놓을 거니까 볼 수 있게»] 결과 «함께 보는 소품» 여섯 칸 — 이 목록 한 곳.
       ACC_ON = 덩어리 전체 스위치(실물 사진 오기 전 끄자 하시면 false 한 줄) · 칸마다 on(사장님 답에 따라 한 칸만 끄기) · 사진 480×480 스타일 예시(acc-*.webp).
       이름은 사이트 말 그대로(«면사포» · «기본 조화 부케»). 슈즈 글은 누가 준비하는지 말하지 않는다(사장님 확인 전). 부케 글 = 식순 BOUQUET · GOODS_STUDIO 와 같은 뜻 · 플로리스트 금액 없음 */
  R.ACC_ON = true;
  R.acc = [
    { id: 'veil-short', name: '짧은 면사포', img: 'acc-veil-short', on: true },
    { id: 'veil-long', name: '긴 면사포', img: 'acc-veil-long', on: true },
    { id: 'cape', name: '오간자 케이프', img: 'acc-cape', on: true },
    { id: 'bolero', name: '레이스 볼레로', img: 'acc-bolero', on: true },
    { id: 'shoes', name: '새틴 슈즈', img: 'acc-shoes', note: '드레스 길이에 맞춰 굽 높이를 함께 정해요', on: true },
    { id: 'bouquet', name: '기본 조화 부케', img: 'acc-bouquet', note: '기본 조화 부케는 저희가 준비해요 · 생화를 원하시면 별도 비용이에요', on: true }
  ];
  R.ACC_LEAD = '드레스 · 면사포 · 주얼리와 웨딩 소품은 스튜디오에 갖춰져 있어요.';
  R.accList = function () { return R.ACC_ON ? R.acc.filter(function (a) { return a && a.on && a.img; }) : []; };
  /* ★[DRESS_NAME_SPLIT 1024 코워크 GPT 2차] 이름 = 작은 보조 줄 «스타일 예시 0n» + 제목(«크레이프 A라인 · 케이프») — 실물 이름은 제목 하나 */
  R.nameParts = function (d) { var n = String((d && d.name) || ''), m = /^(스타일 예시 \d{2}) · (.+)$/.exec(n); return m ? { kick: m[1], title: m[2] } : { kick: '', title: n }; };
  R.SLEEVE_KO = { none: '없음', sleeve: '소매 있음', bolero: '볼레로' };   // [DRESS_DETAIL_FIELDS] 자세히 «디자인»의 소매 칸
  R.figSrc = function (v) { if (!v) return ''; if (String(v).charAt(0) === '/') return String(v); var l = R.line(v); return l ? l.svg : ''; };   // [DRESS_FORM_1024] 보기 그림 = 경로 또는 라인 key
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
  R.PREF_NONE = 'none';   // ★[DRESS_Q_FIRST] «특별한 선호는 없어요» — 줄 세우기는 보지 않는다 · 다른 보기와 함께 두지 않는다(함께 오면 none 을 뺀다)
  R.cleanAns = function (a) {
    a = a || {};
    var len = R.lengthOf(a.len) ? a.len : (a.len === 'unsure' ? 'unsure' : '');
    var fit = R.FITS.indexOf(a.fit) >= 0 ? a.fit : (a.fit === 'unsure' ? 'unsure' : '');
    var pref = [];
    (Array.isArray(a.pref) ? a.pref : []).forEach(function (p) { if ((R.PREFS.indexOf(p) >= 0 || p === R.PREF_NONE) && pref.indexOf(p) < 0) pref.push(p); });
    if (pref.length > 1 && pref.indexOf(R.PREF_NONE) >= 0) pref.splice(pref.indexOf(R.PREF_NONE), 1);
    return { len: len, fit: fit, pref: pref };
  };
  /* ★[DRESS_Q_FIRST 2026-10-24 사장님] 물음 셋을 다 답했나 — 길이 · 핏(«아직 몰라요»였던 옛 'unsure'는 답이 아니다) · 셋째 하나 이상(특별한 선호는 없어요 포함).
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
