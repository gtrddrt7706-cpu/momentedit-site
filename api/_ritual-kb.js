// 식순 AI 상담사 지식(KB) — ★ritual-data 공유 원천 v1에서 '생성'한다(수동 미러 금지).
//   문안·코스·분(分)은 /assets/ritual-data.js가 단일 원천 · 여기는 정의·유래·FAQ·정책 등 '왜' 층만 수기.
//   full: 임베드(계약 고객)용 · 상시 캐시 블록 — 토큰 캡 ≤20k(검증: scripts/check-ritual-mirror.js)
//   lite: 독립 열람(계약 전)용 축약판 — 콜드 단가 절감(기획 v3 §5)
const D = require('../assets/ritual-data.js');

// ── 생성 헬퍼 ──────────────────────────────────────────────
function courseLines(full) {
  const out = [];
  for (const key of Object.keys(D.COURSES)) {
    const c = D.COURSES[key];
    out.push(`- ${c.nm} 코스(${c.badge} · ${c.min}): ${c.one}. 흐름: ${c.flow.join(' → ')}. ${c.addable}`);
    if (full) {
      c.detail.forEach((d) => {
        out.push(`  · ${d.n}: ${d.how}${d.pick ? ' (선택지: ' + d.pick + ')' : ''}`);
      });
      out.push(`  · 어울리는 분: ${c.feel}`);
    }
  }
  return out.join('\n');
}

function narrLines() {
  const E = D.ENTRY, out = [];
  out.push('[입장 멘트 6종 · 나레이션 전문]');
  for (const k of Object.keys(E)) out.push(`- ${k}(${E[k].d}): "${E[k].nar}"`);
  out.push('※ 입장을 두 분 목소리(녹음)로 여는 옵션 있음 · 그 경우 위 문안의 1인칭 버전을 두 분이 녹음(D-7 업로드).');
  out.push('');
  out.push('[성혼 선언]');
  out.push(`- 낭독 주체 3종: 나레이션(기본) / 하객 다 함께 합송 / 가족 낭독. 사회자(MC) 옵션은 없음.`);
  out.push(`- 엄숙하게: "${D.DECLARE['1'].nar}"`);
  out.push(`- 따뜻하게: "${D.DECLARE['2'].nar}"`);
  out.push(`- 합송: "${D.DECLWHO.chorus.nar}" (준비: ${D.DECLWHO.chorus.prep})`);
  out.push(`- 가족 낭독: "${D.DECLWHO.family.nar}" (준비: ${D.DECLWHO.family.prep})`);
  out.push('');
  out.push('[편지 낭독 3방향]');
  for (const k of Object.keys(D.LETTER)) out.push(`- ${D.LETTER[k].d}: "${D.LETTER[k].nar}" (준비물: ${D.LETTER[k].prep})`);
  out.push(`- 편지 마무리 나레이션: "${D.NARR.letterEnd}"`);
  out.push('');
  out.push('[베일 다운]');
  for (const k of ['mother', 'father', 'close']) out.push(`- ${D.VEIL[k].d}: "${D.VEIL[k].nar}"`);
  out.push('- 생략도 가능. 유래: 일본 예식 표준 관례 · 한국에선 드물어 차별 포인트. 부모의 마지막 배웅이 담기는 순간.');
  out.push('');
  out.push('[링 워밍]');
  for (const k of Object.keys(D.RINGWARM)) out.push(`- ${D.RINGWARM[k].d}: "${D.RINGWARM[k].nar}"`);
  out.push('- 소규모(25명 안팎)라서 가능한 순서 · 반지 주머니가 손에서 손으로 돌며 축복을 담는다.');
  out.push('');
  out.push('[부모님 헌정]');
  out.push(`- 도입: "${D.TRIBUTE.nar}" · 마무리: "${D.TRIBUTE.end}"`);
  for (const k of Object.keys(D.TRIBUTE.modes)) out.push(`- ${D.TRIBUTE.modes[k].d}: ${D.TRIBUTE.modes[k].how}`);
  out.push('');
  out.push('[축배 · 케이크]');
  for (const k of Object.keys(D.TOAST)) out.push(`- ${D.TOAST[k].d}: "${D.TOAST[k].nar}"`);
  out.push('');
  out.push('[고정 순간 문안]');
  out.push(`- 첫인사 도입: "${D.NARR.welcome.nar}" · 마무리: "${D.NARR.welcome.end}"`);
  out.push(`- 혼인 서약 도입: "${D.NARR.vow.nar}" · 마무리: "${D.NARR.vow.end}" (울컥해서 잇기 어려우면 배우자가 대신 이어 읽는 옵션)`);
  out.push(`- 반지 교환: "${D.NARR.ring.nar}" · 마무리: "${D.NARR.ring.end}"`);
  out.push(`- 와인 세리머니: "${D.NARR.valleyWine}" / 케이크 커팅: "${D.NARR.valleyCake}"`);
  out.push(`- 축가 소개: "${D.NARR.song}"`);
  out.push(`- 부모님 덕담 도입(가족 코스 첫 순서): "${D.NARR.blessOpenFamily}" / (그 외 위치): "${D.NARR.blessMid}" · 마무리: "${D.NARR.blessEnd}" · 부모님이 부담스러우면 나레이션이 대독하는 옵션 있음`);
  out.push(`- 폐식·단체촬영: "${D.NARR.close}"`);
  out.push('');
  out.push('[하객 맞이 안내 4단계 문안]');
  D.GUEST.forEach((g) => out.push(`- ${g[0]}: "${g[1]}"`));
  out.push('※ 하객 맞이도 나레이션 대신 두 분 목소리 녹음으로 트는 옵션 있음(안내 대본 복사 → 더빙 사이트 → D-7 업로드).');
  return out.join('\n');
}

function minLines() {
  const b = D.MIN.base, dl = D.MIN.delta;
  return [
    `[소요 시간 · 화면 계산과 동일한 상수]`,
    `- 코스 기본: 담백 ${b.damback}분 · 미니멀 ${b.minimal}분 · 감동 ${b.gamdong}분 · 가족 ${b.family}분 · 축하 ${b.festive}분`,
    `- 옵션 증감: 밸리(와인/케이크) +${dl.valley}분 · 덕담 추가 +${dl.bless}분 · 링워밍 전체 하객 +${dl.ringwarmAll}분 · 축배+케이크 둘 다 +${dl.toastBoth}분 · 편지 양쪽(부모님+서로) +${dl.letterBoth}분 · 반지 빼면 ${dl.ringOff}분 · 베일 생략 ${dl.veilSkip}분 · 첫인사 더하기 +${D.MIN.XM.welcome}분 · 편지 더하기 +${D.MIN.XM.letter}분 · 축가 더하기 +${D.MIN.XM.song}분`,
    `- 본식은 약 25~30분이 기준. 30분을 넘으면 밀도가 흐려지는 신호라, 감동 순서를 2개 이내로 덜어내는 걸 권한다(연구 근거: 감동 이벤트 연속 배치 금지·peak-end). 물리적 시간 연장 가능 여부는 아직 확정 전 정책 → 디렉터 상담.`,
  ].join('\n');
}

const POLICY = `[기한 · 준비물 · 정책]
- 식순 확정: 예식 2주 전(D-14)까지. D-14 이후에도 화면에서 수정·저장은 되지만, 나레이션 준비가 시작되므로 변경사항은 디렉터가 확인한 뒤 반영된다.
- D-14까지: 음악 2곡(편지 배경·폐식) 정하기 · 덕담 부탁 · 성혼 낭독 가족 부탁 · 베일 다운 하실 분께 말씀 · 축가 부탁.
- D-7까지: 서약문 · 편지 · 인사말 작성(화면에 적으면 대본에 담김) · 두 분 목소리 녹음 파일 업로드(mp3/m4a).
- D-3까지: 성장영상 링크(가로 mp4 · 3~4분 이내).
- 당일: 결혼반지 지참. 입장곡은 저희가 추천.
- 예식 형태: 하객 약 25명 안팎의 마이크로웨딩 · 140분 시그니처 시퀀스(준비 20분 → 단독 스냅 40분 → 본식 30분 → 단체 기록 30분 → 배웅 20분) 안에서 본식이 진행된다. 진행 안내는 성우 나레이션과 디렉터가 맡아 사회자 없이도 매끄럽다(나레이션은 진행 수단).
- 대본은 텍스트 복사·파일 저장으로 서로 공유 가능. 작성한 글은 기기에만 저장된다.

[실제로 없는 것 · 지어내면 안 되는 것]
- 편지 낭독의 대독 옵션은 없다(울컥 대비는 서약=배우자가 대신, 덕담=나레이션 대독만 존재). 편지가 걱정되면 짧게 쓰는 요령과 마무리 문장을 권한다.
- 사회자(MC) 진행 옵션은 없다. 진행 안내는 나레이션과 디렉터가 맡는다고 안내.
- 목록 밖 특별 연출(반려동물·샴페인타워·폐백 등)은 화면에서 고를 수 없고, 가능·불가를 단정하지 말고 디렉터와 상담 설계로 안내.

[경계 밖 → 다른 창구]
- 가격·결제·계약·환불·개인 일정 변경: 마이페이지 상담으로 안내.
- 당일 운영·리허설·지연 대응·시간 연장: 확정 전 정책 → 디렉터 상담으로 안내.

[자주 묻는 질문 응대 힌트]
- "안 하면 이상한가요?": 어떤 순간도 필수가 아니다 · 미니멀 코스처럼 약속만 남겨도 완성된 예식(담백함이 기본).
- "읽다가 울 것 같아요": 서약은 배우자가 이어 읽고, 덕담은 나레이션이 대독한다 · 편지는 한 사람 기준 1분 안팎(약 300자)이 가장 잘 전달된다.
- "부모님이 보수적이신데": 담백·가족 코스가 어른 하객에 편안하다 · 성혼 선언이 공식 하이라이트라 "제대로 된 예식"으로 느껴진다.
- 글 작성 공식: 구체적인 기억 하나 → 약속 → 앞으로의 우리.`;

// ── 조립 ──────────────────────────────────────────────────
const FULL = `[식순 만들기 화면 개요]
고객은 다섯 코스 중 하나를 고르고, 순간(스텝)을 하나씩 확인·조정한 뒤 대본을 완성한다.
스텝: 시작 → 코스 선택 → 순간 고르기 → (코스별 순간들: 하객 맞이·입장·베일 다운·첫인사·서약·링워밍·반지·성혼 선언·밸리·축배/케이크·축가·편지·헌정·덕담) → 글 적어두기 → 완성.
완성 화면에서 대본 복사·저장, 준비물 체크리스트 확인이 가능하다.

[코스 5종]
${courseLines(true)}

${narrLines()}

${minLines()}

${POLICY}`;

const LITE = `[식순 만들기 개요 · 시안 열람]
다섯 코스 중 하나를 고르고 순간을 조정해 예식 대본을 완성하는 화면이다. 하객 약 25명 안팎의 마이크로웨딩 · 본식 약 25~30분 · 진행 안내는 성우 나레이션과 디렉터가 맡는다(사회자 불필요).

[코스 5종]
${courseLines(false)}

${minLines()}

[응대 힌트]
- 어떤 순간도 필수가 아니다 · 약속만 남겨도 완성된 예식.
- 서약은 울컥하면 배우자가 대신 이어 읽는 옵션이 있다 · 편지 대독 옵션은 없다 · 사회자(MC) 옵션은 없다.
- 실제 계약 고객은 마이페이지에서 이 화면을 열면 두 분의 식순 기준으로 안내받는다.
- 가격·예약·일정 등 계약 관련 질문과 목록 밖 특별 연출은 상담 예약에서 확인하도록 안내.`;

module.exports = { full: FULL, lite: LITE };
