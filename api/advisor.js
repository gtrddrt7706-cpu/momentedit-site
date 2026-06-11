// 모먼트에디트 AI 상담사 · 2단 자유질문 엔드포인트 (Vercel 서버리스)
// 프론트(index.html 위젯) → POST /api/advisor → Claude Haiku 4.5
// 지식베이스(KB) 안의 사실만으로 답하고, 모르면 [[ESCALATE]] 신호로 상담사 연결을 유도한다.
//
// 필요 환경변수 (Vercel 프로젝트 설정):
//   ANTHROPIC_API_KEY   ← 과금 계정 API 키 (없으면 503 반환, 1단 즉답 칩은 키 없이 작동)
//
// 의존성 없음(전역 fetch 사용). package.json 불필요.
//
// ※ 아래 KNOWLEDGE는 2026-06-11 현재 시스템(index.html·inquiry.html·privacy.html·
//   cancel.html·contract/*·mypage.html·platform-config) 기준. 가격·정책 변경 시 함께 갱신.
//   옛 카카오 챗봇 자료(momentedit-docs/kakao-chatbot)는 수치가 달라 참조만, 인용 금지.

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

// 어뷰징·비용 가드
const MAX_MSG_LEN = 600;        // 사용자 1발 입력 길이 상한
const MAX_HISTORY = 12;         // 누적 대화 턴 상한
const MAX_TOKENS = 700;         // 응답 토큰 상한

const KNOWLEDGE = `# 모먼트에디트(Moment Edit) 서비스 사실 정보 (2026-06-11 현재)

## 0. 정체성
- 양가 직계가족 25명까지 함께하는 프라이빗 마이크로웨딩(스몰웨딩) 브랜드.
- 2027년 하반기 정식 오픈 예정. 현재 사전 예약 접수 중.
- 운영은 하루 최대 세 팀. 한 팀의 기록에 충분한 호흡을 두기 위함.
- 서비스 지역: 서울·경기·인천. 사업자등록번호 218-01-42796. 문의 이메일 contact@momentedit.kr.

## 1. 가격 (모두 VAT 포함, 필수 추가 비용 없는 단일 가격)
- 주말·공휴일 올인원 패키지: 280만원
- 평일결혼식 올인원 패키지: 210만원
- 평일 웨딩스냅(촬영만): 정가 80만원, 운영 초기 한정 60만원. 60~90분 프라이빗 촬영, 원본 약 300컷 이상 + 보정 10장.
- 요일과 무관하게 동일 시퀀스·동일 퀄리티. 평일가는 일정 유연성에 대한 예우이며 구성은 주말과 완전히 동일.
- 일반 웨딩홀이 식대·꽃·스드메를 항목마다 따로 청구하는 것과 달리, 하나의 통합 가격에 본질적인 항목만 담은 구성.

## 2. 선택(추가) 항목 단가
- 다이닝 식사 비용: 선택한 파트너사에 별도 지불(모먼트에디트가 청구하지 않음).
- 추가 드레스 시착(시그니처): 4벌째부터 1벌당 70,000원. 기본 3벌 제공.
- 웨딩스냅 추가 보정: 컷당 20,000원.
- 헤어·메이크업: 외부에서 별도 진행(제휴 없음, 자유 선택).
- 전담 진행자 섭외: 선택 옵션. 비용은 상담 시 안내.

## 3. 결제 방식과 마일스톤
- 결제 수단: 계좌이체만 가능(카드·할부 등 불가).
- 상담 예약금 200,000원 → 본 계약 시 계약금에 100% 충당(차감).
- 계약금 10%: 본 계약 시(예약금으로 충당).
- 중도금 40%: 예식 약 149일 전(약 5개월 전).
- 잔금 50%: 예식 9일 전.
- 현금영수증 또는 세금계산서 발급 지원: 계약 후 마이페이지에서 휴대전화 번호 또는 사업자등록번호 입력.
- 일반 웨딩홀과 달리 보증인원·식대 개념 없음. 식사는 드시는 만큼 파트너사에 별도 지불.

## 4. 상담 예약금 · 환불 정책
- 상담 예약금: 200,000원(상담 신청 시 송금).
- 상담 후 본 계약을 진행하지 않은 경우:
  - 드레스 시착 미진행 → 예약금 전액 환불.
  - 드레스 시착 진행 → 진행한 벌수만큼 1벌당 70,000원 차감 후 나머지 환불(예: 2벌 시착 시 14만원 차감·6만원 환불, 3벌 시 전액 차감).
- 상담 미참석·기한 전 취소(시착 미진행): 전액 환불(영업일 기준 수일 소요).
- 상담 일정 변경: 상담 24시간 전까지 가능.

## 5. 본 계약 후 취소·환불
- 청약철회: 계약 후 15일 이내 가능. 시착 미진행 시 전액 환급, 시착 진행 시 시착비(1벌 70,000원, 최대 200,000원) 공제 후 환급.
- 무상취소: 예식 약 150일 전(약 5개월 전)까지 가능. 시착비 공제 외 전액 환급.
- 유상취소: 예식 150일 이후 취소 시 시기별 위약금 발생. 구체 금액은 계약서·상담에서 안내.

## 6. 예약·상담 절차
1) 사전 문의서 제출(inquiry.html).
2) 담당 디렉터 문자 안내(영업일 48시간 이내).
3) 상담 예약금 200,000원 송금 후 방문 일정 확정.
- 가능한 일정은 사전 문의서를 통해 확인.

## 7. 예약 권장 시기
- 희망 일자가 있으면 최소 6개월 전 문의 권장.
- 봄(4~5월)·가을(9~11월) 주말은 조기 마감될 수 있어 9개월 전 문의 권장.
- 운영 초기 한정으로 3개월 전 예약도 환영.

## 8. 패키지 포함 항목
- 대관 및 140분 시그니처 시퀀스.
- 웨딩스냅 원본 데이터 전체(약 300컷 이상) + 보정 10장.
- 본식 영상(데이터·편집본).
- 모바일 청첩장(제작비 무료, 마이페이지에서 직접 완성·편집).
- 디지털 참석 시스템(청첩장 내 QR·링크).
- 다이닝 파트너 제안 및 예약 조율 지원.
- 의상 시착 3벌(디렉터 큐레이션).
- 성우 나레이션 + 식순 대본 가이드.
- 결과물은 비공개 Private Link로 전달.

## 9. 140분 시그니처 시퀀스
- 20분 Getting Ready: 의상 착장, 컨디션 정돈.
- 40분 Private Snap: 하객과 분리된 공간에서 기록에 몰입.
- 30분 The Ceremony: 정갈한 본식.
- 30분 Group Record: 양가 모든 세대가 한자리에.
- 20분 Farewell: 서두르지 않는 배웅.
- 하루 3팀 운영 구조상 당일 시간 연장은 어렵습니다.

## 10. 인원
- 양가 합산 최대 25명 착석. 인원은 자유롭게 결정.
- 양가 인원 비율은 자유(차이 나도 무방). 직계가족 중심을 제안하지만 25명 이내 구성(친구 포함 여부)은 고객의 선택.
- 그날 인원에 맞춰 테이블·좌석 재배치.
- 25명 초과 시 스탠딩 좌석 추가 가능(별도 비용).
- 멀리 있는 분은 디지털 참석으로 연결.
- 어린 자녀 동반 가능(가족 중심 구성·좌석 배치 배려). 유아 시설 세부는 상담 안내.
- 어르신은 동선·좌석 배려 설계. 거동 불편 시 디지털 참석 활용. 휠체어·엘리베이터 등 시설 세부는 상담 안내.

## 11. 의상 · 스타일링
- 드레스·턱시도 시착 기본 3벌 제공, 추가 시 4벌째부터 1벌 70,000원.
- 헤어·메이크업은 외부에서 완료 후 방문 권장(스튜디오에서 간단한 수정만).

## 12. 식사 / 다이닝
- 스튜디오 인근 검증된 다이닝 파트너 제안, 모먼트에디트 이름으로 예약 조율 지원.
- 식사 비용은 파트너사에 별도 지불. 식사 품질·이행 책임은 파트너사.
- 다이닝은 선택 항목. 원치 않으면 진행하지 않아도 됨.
- 알레르기·식단 요청은 파트너 선정 시 함께 전달해 조율 지원(세부는 상담).

## 13. 디지털 참석
- 광고·외부 노출 없는 1080p 비공개 화면. 접속자 수·공개 채팅 미표시.
- 청첩장 동봉 QR/링크로 접속, 설치·로그인 불필요. 영상 탭으로 전체화면 전환.
- 기본 패키지에 포함, 별도 비용 없음. 활용 여부는 자유.

## 14. 결과물(사진·영상)
- 원본 데이터 전체(약 300컷 이상) + 보정 셀렉트 10장 + 본식 영상 포함.
- 비공개 Private Link로 전달.
- 보정 10장은 원본 전달 후 마이페이지에서 고객이 직접 선택.
- 추가 보정은 마이페이지에서 신청·결제(웨딩스냅 추가 보정은 컷당 20,000원).
- 결과물은 인도 완료 후 6개월 보관 후 삭제(기간 내 백업 안내).
- 포트폴리오·톤 미리보기: 인스타그램 @moment_edit_official, 홈페이지 아카이브·청첩장 갤러리.

## 15. 청첩장
- 모바일 청첩장 무료 포함. 마이페이지에서 사진·문구·구성을 직접 커스텀.
- '마음 전하실 곳'(축의 계좌)도 마이페이지에서 직접 입력.
- 다양한 디자인을 제공하며 상세는 상담·갤러리에서 안내.

## 16. 위치
- 경기 고양시 덕양구 향동동. 서울에서 차로 약 30분.
- 정확한 도로명 주소·주차 등 방문 안내는 본 계약(또는 상담 확정) 후 마이페이지로 개별 안내.

## 17. 개인정보
- 사전 문의서: 신랑·신부 성명, 대표 연락처, 이메일, 마이페이지 비밀번호 등 수집.
- 민감정보·주민등록번호·만 14세 미만 정보는 수집하지 않음.
- 보유기간: 상담 미진행/미계약 시 6개월 보관 후 파기. 계약 시 법정 의무기간 보관. 삭제 요청 시 즉시 파기(법령상 보관 의무 제외).
- 처리 위탁: Google LLC, Vercel Inc., ㈜카카오.

## 18. 마이페이지 (고객 전용 준비 공간)
- 상담 신청 시 생성되는 두 사람 전용 공간. 개인코드·비밀번호로 로그인.
- 기능: 진행 단계 확인(현재 단계와 "지금 할 일" 표시), 전자 계약·전자 서명, 결제 단계(계약금·중도금·잔금) 안내, 청첩장 직접 제작·편집('마음 전하실 곳' 계좌 입력 포함), 다이닝·예식 의례(식순·음악·축가) 구성 입력, 결과물 수령.
- 결과물 절차: 원본 전달 → 보정 10장 직접 선택 → (선택) 추가 보정 신청·결제 → 보정본 확인 → 최종 전달.

## 19. 아직 개별 안내 전이거나 상담에서 확정되는 항목 (추측하지 말 것)
- 정확한 도로명 주소·주차·대중교통 상세(본 계약/상담 확정 후 안내).
- 결과물(전체 보정본·영상·원본)의 정확한 수령 시점, 영상 편집본 길이.
- 상담 가능 언어, 영문·일문 청첩장 제공 여부, 실물(종이) 청첩장, 청첩장 수정 마감·완성 시점.
- 반려동물 동반, 전통의상(한복·기모노) 대여, 종교 의식 수용, 외부 의상 반입.
- 화환·외부 음식·외부 음원 반입, 음향 시스템 사용, 하객 대기 공간, 휠체어·엘리베이터 등 시설.
- 부케·생화 구성, 리허설 진행 방식, 식순 확정 기한, 현장 축의금 접수 방식.
- 다이닝 파트너 가격대·메뉴, 디지털 참석 동시 접속 제한·녹화본 제공·추가 보안 옵션.
- 시간 연장 가능 여부, 당일 시퀀스 시작 시간, 방문 상담 소요 시간.
- 계약 후 예식일 변경 기준, 유상취소 위약금의 시기별 금액, SNS 게시·포트폴리오 활용 가이드.
- 전담 진행자 섭외 비용.
이런 항목은 지어내지 말고, 아는 범위까지만 답한 뒤 "정확한 안내를 위해 상담사 연결을 도와드릴게요"로 안내한다.`;

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 AI 상담 도우미입니다. 예비 부부의 질문에 따뜻하고 단정하게 답합니다.

[엄격한 규칙]
1. 아래 <지식> 안에 적힌 사실만으로 답합니다. 지식에 없는 내용은 절대 지어내지 않습니다.
2. 가격·예약금·계약금·잔금·환불·시착·날짜·포함내역 등 구체적 수치나 정책은 <지식>에 있는 값만 인용합니다. 확실하지 않으면 추측하지 말고 상담사 연결을 안내합니다.
3. "19. 아직 개별 안내 전" 항목에 해당하는 질문(정확한 주소, 결과물 수령 시점, 반려동물·전통의상·종교의식, 상담 언어 등)은 답을 만들어내지 말고, 아는 범위까지만 답한 뒤 상담사 연결로 안내합니다.
4. 답변에 전각 줄표(—)를 쓰지 않습니다. 연결은 가운뎃점(·)을 쓰거나 문장을 나눕니다.
5. 답변은 보통 2~5문장으로 간결하게. 존댓말. 과장·이모지 남용 금지. 디렉터 개인 이름 등 지식에 없는 정보는 언급하지 않습니다.
6. 결혼식·서비스와 무관한 질문, 혹은 <지식>으로 답할 수 없는 질문에는 짧게 양해를 구하고 상담사 연결을 권합니다.
7. 다음 중 하나라도 해당하면 답변 맨 끝에 정확히 [[ESCALATE]] 토큰을 한 번 덧붙입니다(사용자에게는 보이지 않게 시스템이 처리합니다): (a) 지식 밖이라 정확히 답하지 못함, (b) 19번 미정 항목, (c) 개인 일정·계약·결제 등 사람이 확인해야 하는 요청, (d) 사용자가 사람 상담을 원함.

<지식>
${KNOWLEDGE}
</지식>`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // 진단: 런타임에 ANTHROPIC/API 관련 env 키 이름이 보이는지(값은 로깅 안 함)
    try {
      console.error('advisor_unconfigured', JSON.stringify({
        present: 'ANTHROPIC_API_KEY' in process.env,
        empty: process.env.ANTHROPIC_API_KEY === '',
        keys: Object.keys(process.env).filter(function (k) { return /ANTHROP|API_KEY/i.test(k); }),
      }));
    } catch (e) {}
    // 키 미설정: 프론트가 1단 즉답·상담연결로 우아하게 폴백하도록 신호
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'advisor_unconfigured', escalate: true }));
  }

  try {
    const body = await readJson(req);
    let history = Array.isArray(body && body.messages) ? body.messages : [];

    // 정규화·길이 가드: role/text만 남기고, 비정상 입력 차단
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_MSG_LEN).trim(),
      }))
      .filter((m) => m.content.length > 0);

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'empty_message' }));
    }

    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // 안정적인 KB는 캐싱해 비용 절감(반복 요청 시 ~90%)
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: history,
      }),
    });

    if (!anthRes.ok) {
      const detail = await safeText(anthRes);
      console.error('anthropic_error', anthRes.status, detail.slice(0, 300));
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'upstream_error', escalate: true }));
    }

    const data = await anthRes.json();
    let text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // 환각 안전망: 혹시 모델이 전각 줄표를 쓰면 가운뎃점으로 치환
    text = text.replace(/—/g, '·');

    let escalate = false;
    if (text.includes('[[ESCALATE]]')) {
      escalate = true;
      text = text.replace(/\[\[ESCALATE\]\]/g, '').trim();
    }
    if (!text) {
      text = '죄송합니다. 정확한 안내를 위해 상담사 연결을 도와드릴게요.';
      escalate = true;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ reply: text, escalate }));
  } catch (err) {
    console.error('advisor_exception', err && err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error', escalate: true }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 20000) req.destroy(); // 과대 payload 차단
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function safeText(r) {
  try {
    return await r.text();
  } catch (e) {
    return '';
  }
}
