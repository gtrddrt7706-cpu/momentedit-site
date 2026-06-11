// 모먼트에디트 AI 상담사 · 2단 자유질문 엔드포인트 (Vercel 서버리스)
// 프론트(index.html 위젯) → POST /api/advisor → Claude Haiku 4.5
// 지식베이스(KB) 안의 사실만으로 답하고, 모르면 [[ESCALATE]] 신호로 상담사 연결을 유도한다.
//
// 필요 환경변수 (Vercel 프로젝트 설정):
//   ANTHROPIC_API_KEY   ← 과금 계정 API 키 (없으면 503 반환, 1단 즉답 칩은 키 없이 작동)
//
// 의존성 없음(전역 fetch 사용). package.json 불필요.

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

// 어뷰징·비용 가드
const MAX_MSG_LEN = 600;        // 사용자 1발 입력 길이 상한
const MAX_HISTORY = 12;         // 누적 대화 턴 상한
const MAX_TOKENS = 700;         // 응답 토큰 상한

// KB는 프론트와 동일 출처를 서버에도 인라인(요청마다 캐싱되도록 안정 유지).
// index.html이 보내는 kb 텍스트를 신뢰하지 않고, 서버 측 사실만 사용한다.
const KNOWLEDGE = `# 모먼트에디트(Moment Edit) 서비스 사실 정보

## 정체성
- 양가 직계가족 25명까지 함께하는 프라이빗 마이크로웨딩(스몰웨딩) 브랜드.
- 2027년 하반기 정식 오픈 예정. 현재 사전 예약 접수 중. 운영은 하루 최대 세 팀.

## 가격 (VAT 포함, 필수 추가 비용 없음)
- 주말·공휴일 올인원 패키지: 280만원
- 평일결혼식 올인원 패키지: 210만원
- 평일 웨딩스냅만(촬영만): 운영 초기 한정 60만원 (정가 80만원)
- 요일과 무관하게 동일 시퀀스·동일 퀄리티. 평일가는 일정 유연성에 대한 예우일 뿐 구성은 동일.

## 패키지 포함 항목
- 대관 및 140분 시그니처 시퀀스
- 웨딩스냅: 원본 데이터 전체 + 보정 10장
- 본식 영상
- 모바일 청첩장 + 디지털 참석 시스템
- 다이닝 파트너 안내

## 선택(추가) 항목 가격
- 다이닝 식사 비용: 선택한 파트너사에 별도 지불(모먼트에디트 청구 아님)
- 추가 보정: 1컷당 20,000원
- 추가 드레스 시착: 4벌째부터 1벌당 70,000원 (기본 3벌 제공)
- 헤어·메이크업: 외부에서 별도 진행

## 인원
- 양가 합산 최대 25명 착석. 인원은 자유롭게 결정.
- 그날 인원에 맞춰 테이블·좌석 재배치.
- 25명 초과 시 스탠딩 좌석 추가 가능(별도 비용).
- 멀리 있는 분은 디지털 참석으로 연결.

## 140분 시그니처 시퀀스
- 20분 Getting Ready: 의상 착장, 컨디션 정돈
- 40분 Private Snap: 하객과 분리된 공간에서 기록에 몰입
- 30분 The Ceremony: 정갈한 본식
- 30분 Group Record: 양가 모든 세대가 한자리에
- 20분 Farewell: 서두르지 않는 배웅

## 식사 / 다이닝
- 스튜디오 인근 검증된 다이닝 파트너 제안, 모먼트에디트 이름으로 예약 조율 지원.
- 식사 비용은 파트너사에 별도 지불.

## 디지털 참석
- 광고·외부 노출 없는 1080p 비공개 화면. 접속자 수·공개 채팅 미표시.
- 청첩장 동봉 QR/링크로 접속, 설치·로그인 불필요. 영상 탭으로 전체화면 전환.

## 예약·상담 절차
1. 사전 문의서 제출
2. 담당 디렉터 문자 안내(영업일 48시간 이내)
3. 상담 예약금 200,000원 송금 후 방문 일정 확정
- 가능 일정은 사전 문의서로 확인.

## 예약금·환불·변경 정책
- 상담 예약금: 200,000원
- 본 계약 시 100% 차감.
- 본 계약 미진행 시 전액 환불.
- 단, 드레스 시착 진행 시 진행 벌수만큼(1벌당 70,000원) 차감 후 나머지 환불.
- 일정 변경: 상담 24시간 전까지 가능.
- 드레스 시착: 상담 당일 시착 동의 후 진행(기본 3벌).

## 예약 권장 시기
- 희망 일자 있으면 최소 6개월 전 문의 권장.
- 봄(4~5월)·가을(9~11월) 주말은 조기 마감 가능, 9개월 전 문의 권장.
- 운영 초기 한정 3개월 전 예약도 환영.`;

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 AI 상담 도우미입니다. 예비 부부의 질문에 따뜻하고 단정하게 답합니다.

[엄격한 규칙]
1. 아래 <지식> 안에 적힌 사실만으로 답합니다. 지식에 없는 내용은 절대 지어내지 않습니다.
2. 가격·예약금·환불·시착·날짜·포함내역 등 구체적 수치나 정책은 <지식>에 있는 값만 인용합니다. 확실하지 않으면 추측하지 말고 상담사 연결을 안내합니다.
3. 답변에 전각 줄표(—)를 쓰지 않습니다. 연결은 가운뎃점(·)을 쓰거나 문장을 나눕니다.
4. 답변은 보통 2~5문장으로 간결하게. 존댓말. 과장·이모지 남용 금지.
5. 결혼식·서비스와 무관한 질문, 혹은 <지식>으로 답할 수 없는 질문에는 짧게 양해를 구하고 상담사 연결을 권합니다.
6. 다음 중 하나라도 해당하면 답변 맨 끝에 정확히 [[ESCALATE]] 토큰을 한 번 덧붙입니다(사용자에게는 보이지 않게 시스템이 처리합니다): (a) 지식 밖이라 정확히 답하지 못함, (b) 개인 일정·계약·결제 등 사람이 확인해야 하는 요청, (c) 사용자가 사람 상담을 원함.

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
