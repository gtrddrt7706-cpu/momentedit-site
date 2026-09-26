/* ★★[SNAP_REFS 2026-09-26 사장님 회의 · «고르는 스냅 기획» SNAP_PICK_V2] 스냅 기획의 레퍼런스 목록 — 단 하나의 원천.
   부부 화면(mypage) · 관리자(admin) · 촬영 브리프(brief.html)가 모두 이 파일을 읽는다.
   ① 공간마다 «기본으로 담아요» 4장면 + 부부가 고를 수 있는 8장면 — 부부는 공간마다 최대 4장을 고른다(고른 순서 = 우선순위).
      25분 ÷ 장면당 약 3분 = 8장면(기본 4 + 고른 4). 사장님 결정 D5 · D6.
   ② 사진은 스튜디오가 모델과 직접 찍는다(D7). 찍기 전에는 img 가 비어 있어 장면 이름 타일로 보인다.
      찍은 뒤에는 assets/snap-refs/ 에 c01.webp · c01.jpg … 를 넣고 장면마다 img:'c01' 한 줄만 채우면 된다(코드 수정 없음).
      촬영 조건 · 규격은 docs/plans/스냅_레퍼런스_촬영목록표.md — 장면 번호와 이름은 그 표와 같아야 한다(scripts/audit/snap-plan.mjs 가 대조).
   ③ min(분)은 진행표(assets/sequence-modal.js «단독 스냅 촬영» 줄)의 사본이다 — 같은 검사가 대조한다.
      ★단독 스냅 60분(캔들존 25 · 이동 5 · 화이트존 25 · 입장 준비 5)은 사장님 확정이고 반영은 다른 세션이 맡았다(2026-09-26).
        그쪽이 진행표를 바꾸면 검사가 빨개져 이 숫자도 함께 바뀐다. 손으로 먼저 바꾸지 말 것 — 원천과 어긋난다.
   ④ needs = 그 장면에 필요한 준비물. 고르면 부부에게 그 자리에서 안내하고, 브리프에는 준비물 체크리스트로 들어간다(디테일 1).
      부케 = 협력 플로리스트 «소개»(BOUQUET_FLORIST) · 면사포 = 스튜디오 준비(index «Styling Collection»). */
(function (w) {
  var R = {
    v: 1,
    limits: { pick: 4, up: 3, link: 3 },
    arrive: 20,                       // 도착 · 착장 정돈(진행표 «신랑·신부 도착»)
    prep: 5,                          // 입장 준비
    move: 5,                          // 캔들존 → 화이트존 이동(하객과 마주치지 않게 캔들존을 비우는 시간)
    zones: [
      { key: 'candle', en: 'Ambient Candle', ko: '캔들존', min: 25,   /* [DAY_60 2026-09-26] 20 → 25 */ mood: '따뜻한 조도 · 눈빛',
        photo: '/assets/home/zone-candle.webp', photoJpg: '/assets/home/zone-candle.jpg',
        base: [
          { id: 'c01', name: '마주 보고 서기', frame: '전신' },
          { id: 'c02', name: '손과 반지', frame: '클로즈업' },
          { id: 'c03', name: '캔들 곁 눈맞춤', frame: '상반신' },
          { id: 'c04', name: '나란히 걸어 들어오기', frame: '전신 · 무빙' }
        ],
        pick: [
          { id: 'c05', name: '이마 맞대기', frame: '상반신' },
          { id: 'c06', name: '캔들 역광 실루엣', frame: '전신 · 역광' },
          { id: 'c07', name: '부케 들고 기대 서기', frame: '상반신', needs: ['부케'] },
          { id: 'c08', name: '면사포 아래 두 사람', frame: '상반신', needs: ['면사포'] },
          { id: 'c09', name: '편지 읽어 주기', frame: '상반신', needs: ['편지'] },
          { id: 'c10', name: '앉아서 기대기', frame: '전신 · 앉음' },
          { id: 'c11', name: '손잡은 뒷모습', frame: '전신 · 뒷모습' },
          { id: 'c12', name: '눈 감고 웃는 순간', frame: '상반신 · 캔디드' }
        ] },
      { key: 'white', en: 'Editorial White', ko: '화이트존', min: 25,   /* [DAY_60 2026-09-26] 20 → 25 */ mood: '여백 · 선',
        photo: '/assets/home/zone-white.webp', photoJpg: '/assets/home/zone-white.jpg',
        base: [
          { id: 'w01', name: '여백 있는 전신', frame: '전신 · 정면' },
          { id: 'w02', name: '드레스 라인 옆모습', frame: '전신 · 측면' },
          { id: 'w03', name: '나란히 앉기', frame: '전신 · 앉음' },
          { id: 'w04', name: '함께 웃는 순간', frame: '상반신 · 캔디드' }
        ],
        pick: [
          { id: 'w05', name: '면사포 날리기', frame: '전신 · 무빙', needs: ['면사포'] },
          { id: 'w06', name: '흑백 클로즈업', frame: '클로즈업 · 흑백' },
          { id: 'w07', name: '백허그', frame: '상반신' },
          { id: 'w08', name: '걸으며 무빙컷', frame: '전신 · 무빙' },
          { id: 'w09', name: '부케 클로즈업', frame: '클로즈업', needs: ['부케'] },
          { id: 'w10', name: '드레스 자락 펼치기', frame: '전신 · 부감' },
          { id: 'w11', name: '신부 단독', frame: '상반신' },
          { id: 'w12', name: '신랑 단독', frame: '상반신' }
        ] }
    ],
    /* 준비물 안내 — 부부 화면(고른 자리)과 브리프(체크리스트)가 같은 말을 한다 */
    needs: {
      '부케': { who: '두 분', say: '부케는 협력 플로리스트를 소개해 드려요 · 주문은 플로리스트와 직접 하시면 돼요' },
      '면사포': { who: '스튜디오', say: '면사포는 스튜디오에 준비돼 있어요' },
      '편지': { who: '두 분', say: '서로에게 쓴 편지를 가져와 주세요' }
    }
  };
  R.total = R.zones.reduce(function (a, z) { return a + z.min; }, 0) + R.move + R.prep;   // 단독 스냅 전체(분)
  R.scene = function (id) {   // 장면 번호 → {zone, s, base}
    for (var i = 0; i < R.zones.length; i++) {
      var z = R.zones[i], k;
      for (k = 0; k < z.base.length; k++) if (z.base[k].id === id) return { zone: z, s: z.base[k], base: true };
      for (k = 0; k < z.pick.length; k++) if (z.pick[k].id === id) return { zone: z, s: z.pick[k], base: false };
    }
    return null;
  };
  R.img = function (s, ext) { return (s && s.img) ? ('/assets/snap-refs/' + s.img + '.' + (ext || 'webp')) : ''; };
  w.SNAP_REFS = R;
})(typeof window !== 'undefined' ? window : globalThis);
