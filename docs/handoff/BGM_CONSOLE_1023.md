# BGM 당일 콘솔 라운드 1 · 재기 표 [BGM_CONSOLE1_1023]

BGM 섹션 요청(10/23 · 대본 152 ~ 157 다시 녹음 32클립 main 08f495c #1367 뒤)대로, 당일 콘솔(`console.html` · `assets/ritual-cue.js`)의 음악 크기 · 낮춤 · 칸별 곡 길이를 한 번에 잰 결과다.
재는 법: 새 코스(open) 예시 넷 × 기본 칩 → `RitualCue.build(S, {mode:'console'})` · 클립 길이는 `assets/audio/narration/*.mp3` 실측 · 아래 표는 `node scripts/build-bgm-console-table.cjs` 가 만든다(`--check` 로 지금과 같은지 본다).

## 1. 요약

- **지금 콘솔의 음악은 «한 곡 반복»이다.** 배경음은 `<audio id="aBgm" loop>` 하나 · 디렉터가 고른 파일 하나가 예식 내내 돈다. 음악 칸(S1 ~ S10)마다 곡을 바꾸는 길은 없다(콘솔은 `BgmSlots` 를 읽지 않는다). 따로 도는 곡은 입장 곡(S3 · entry-scene · `S.mu`) 하나뿐이다.
  → 아래 «모자람 · 남음»은 지금 당일 소리가 끊긴다는 뜻이 아니다. **칸마다 곡을 고를 때(다음 단계) 그 곡이 몇 초 있어야 하는가**다.
- 크기만 큐마다 바뀐다 — 클립이 시작하면 0.4초에 그 큐 크기(`c.duck`)로 내리고, 클립(사람 구간이 있으면 그 끝)이 끝나면 1.2초에 걸쳐 −8(`duckMusic`)로 올린다.
- 곡 길이 가정(ref.sec)을 넘는 칸: **S7 부모님께 인사**(정석 · 가족 4분 25초 > 240초 · 25초 모자람) · **S8 뒤 단체 사진 8분 10초**(어느 칸에도 없다 · S8 은 120초 가정).
- 짧은 쉼에 음악이 오르내리는 자리: 프리셋마다 2 ~ 3곳(아래 3-2) — 버티는 값(holdMs)이 엔진에 없다.

## 2. 칸마다 판정(표는 맨 아래 «4. 표»)

| 칸 | 재 보니 | 판정 |
|---|---|---|
| S1 하객 맞이 | 시계로 나간다 — 01(문 열림 · 디렉터) → 02 @−10분 → 03 @−5분 → 04 @−1분 → 개식 137 @0(21.7초 + 박수 8초). 표의 «59초»는 클립 합일 뿐 칸은 «문 열림부터 개식 박수까지» | 문 열림이 30분 전이면 약 30분 30초 — ref 1500 ~ 1800 의 위 끝을 30초 넘는다. 곡은 반복이라 지금은 문제없다 · 곡을 고를 때 **30분 + 30초 이상** |
| S2 화촉 | 정석 · 기록 · 간결 1분 42초(151 14.1초 → 95 → 138 16.1초 · 구호 «…맞절!» 뒤 4초 쉼은 138 클립 안 [CANDLE_CALL_HOLD_1016] → 243) · 가족 2분 06초(263 이음말 6.0초 + 3초 사이 → 91 33.3초) | ref 240 안 · 넉넉하다. 가장 긴 판(어머님 예시 4 · 153 36.6초)이어도 약 2분 05초. ※ 요청 글의 «156»은 클립이 아니라 검토 번호(BASE_SWAP_1023 검토 156 · 화촉 기본 «담백하게»)였다 — 클립 156 은 parents-ex2(12.6초) |
| S3 입장 → 맞절 | 정석 2분 37초 · 기록 2분 54초 · 가족 2분 51초(입장 E 09 31.3초) · 간결 2분 30초 — 입장 클립 + 걷기 102초 + 받는 말 144 5.8초 + 1.25초 + 맞절(160 19.1초 · 간결 252 6.7초) + 12초 | 입장 곡은 문 열림 자리(H)를 «입장!» 끝에 맞추고 맞절 큐까지 같은 곡을 낮게 잇는다(`esdIn` · MATJEOL_SPLIT_1013). 맞절을 «잔잔하게 132(30.6초)»로 고르면 +11.5초 · «161(31.2초)»이면 +12초. **곡이 H 뒤로 약 140 ~ 160초 남아 있어야 맞절까지 끊기지 않는다** — 모자라면 곡이 끝나는 순간 배경음이 3초에 걸쳐 이어받는다(`src.onended → esdBedBack(3000)`) · 정적은 없다 |
| S4 감사 인사 ~ 덕담 | 정석 · 기록 3분 41초 · 가족 5분 35초(덕담 100초 포함) · 간결 2분 44초(감사 인사 없음 · 서약부터) | ref 420 안 |
| S5 축사 | 정석만 · 3분 23초(축사 186초 · 기본 «음악 없이» = −90) | ref 240 안 · «음악과 함께»를 고르면 낭독 아래 −20 |
| S6 편지 | 예시 넷에 없다(+ 로 담는 순간) | 재지 않음 |
| S7 부모님께 인사 | 정석 · 가족 4분 25초(인사 말 «길게» · live 160초) · 기록 · 간결 1분 56초(«말 없이» · 20초) | **정석 · 가족 25초 모자람** — 제안 1 |
| S8 닫는 인사 | 목례 · 박수까지 23초(기록은 축배 머무는 말 b13 40초 포함 1분 11초) · 그 뒤 **narr-close + 단체 사진 8분 10초**가 같은 `_close` 칸 | S8 신호 자체는 120 안. 단체 사진 8분은 어느 칸도 아니다 — 제안 2 |
| S9 축배 | 기록만 · 23초(toast-toast 10.7초 + «위하여» 10초 + 마무리 2.3초) | ref 60 ~ 90 · 남는다(신호 곡이라 괜찮다) · 3-4 참고 |
| S10 테이블 인사 | 기록만 · 9분 09초(131 7.2초 + 540초) | ref 1800 은 «30분 + 마지막 곡» — 엔진의 테이블 인사는 9분 · 그 뒤는 단체 사진(narr-close · S8 칸)으로 넘어간다. 제안 3 |

기록 예시는 칸 차례가 S8(목례) → S8(b13 축배 머무는 말) → S9 → S10 → S8(narr-close · 단체 사진)로 S8 이 둘로 갈린다 — 곡을 칸마다 바꿀 때 S8 을 «목례 신호»와 «사진»으로 나눠야 한다(제안 2 와 같은 일).

## 3. 2단계 — 고친 것 · 확인한 것

### 3-1. ref 메모 둘 바로잡음(`assets/bgm-slots.js` · 동작 변화 0) — 고침
- S8 `ref.clap` 108 `up`: «S8 이 힘 있게 시작한다» → **«목례 · 박수 뒤 힘 있게 시작»**(엔진 narr-close-bow live «두 분이 하객께 함께 목례 → 박수 → 음악 바뀜»과 같은 차례).
- S10 `ref.clap` 131(«큰 박수로 맞이해 주십시오» · 올라와도 좋다) **걷음** — 지금 131 글은 «… 테이블마다 찾아뵙고 감사의 인사를 드리겠습니다.»(대본 157 로 그 문장이 빠졌다).
- 검사 `scripts/audit/bgm-form.mjs` 0번의 기대를 «57 · 108»으로 · S8 새 글 · S10 박수 줄 없음까지 본다(옛 판으로 되돌리면 빨강 — 확인함).

### 3-2. 낮춤 모양에 이름 — 고침(이름만) + 버티기는 제안
- `PARAM.duck = { downMs: 400, holdMs: 0, upMs: 1200 }` — 콘솔 `duckTo` 가 이미 쓰던 `fadeDownMs 400` · `fadeUpMs 1200` 과 같은 값의 한 원천(`DUCK_ENV`) · 콘솔은 종전 이름(`fadeDownMs` · `fadeUpMs`)으로 그대로 읽는다 · **동작 변화 0**.
- `holdMs` 는 지금 0 이다 — 콘솔은 버티지 않는다. 사람 구간이 없는 클립이 끝나면 늘 −8 로 올리고, 다음 큐가 이어지면(chain) 사이 뒤에 다시 내린다. 음악이 내려가 있다가 3초 안에 다시 내려가는 자리(실측):

| 예시 | 자리 | 사이 |
|---|---|---|
| 넷 모두 | 입장 받는 말 144(−12) → 맞절 160 · 252(−12) — 입장 곡 위에서 | 1.25초 |
| 정석 · 가족 | 부모님께 인사 이름 141(−16) → 여는 말 38(−16) | 1초 |
| 기록 · 간결 | 부모님께 인사 142(−16) → 여는 말 38(−16) | 1초 |
| 가족 · 간결 | 개식 137(−16) → 식전 영상 여는 말 90(−16) | 3초 |

  (서약 맺는 말 14 → 선언 136 은 4.5초 사이라 올라가는 편이 자연스럽다고 보고 셈에서 뺐다.)
  → **제안 4**: `holdMs: 2500` — 다음 큐가 chain 이고 사이 ≤ holdMs 이면 올리지 않고 그 크기에서 버틴다(위 표의 1 ~ 3초 자리 전부 · 4.5초 자리는 그대로 오른다).

### 3-3. −20(duckRead) — 주석만
- 콘솔에는 전체 음량 막대(`#vol`) 하나뿐 · 낮춤 크기를 바꾸는 칸이 없다 → `duckRead` 에 «리허설 시작값 · 현장 PA 에서 귀로 다시 정한다» 주석만 붙였다. 칸은 **제안 5**.

### 3-4. 축배 S9 — 보고만(chain 에 가깝다)
- 기록: b13 «축배 머무는 말»(live 40초 · 디렉터 GO) → toast-toast 40(10.7초 · −8) → **클립이 끝나는 순간 사람 구간 «위하여»(live · 크기 0)로 자동으로 넘어가 1.2초에 걸쳐 0 dB 로 오른다** → 마무리 56 은 디렉터 GO.
- 즉 «신나는 곡 시작»(크기 0)은 두 분의 «위하여!» 뒤 디렉터 GO 가 아니라 **선창 클립 끝(위하여! 직전)** 이다. 한 곡 반복이라 «곡이 시작»이 아니라 «크게 오름»이다. → **제안 6**.

### 3-5. 입장 문 신호 — 보고만
- 콘솔은 입장 곡의 문 열림 자리(H · `S.mu.hook` · 멘트가 길면 hooks 중 뒤 자리)를 **«입장!» 멘트 끝 = 하이라이트 = 출발**에 맞춘다(`ES.plan` · 식순 화면과 같은 자리 · 음악이 멘트보다 10초 먼저 [ENTRY_BGM_1019]).
- **«문 열기 시작» 큐는 따로 없다** · **«문 여는 시간» 칸(기본 몇 초)도 없다**(entry-scene `SP` 에도, PARAM 에도 없음). 문을 언제 밀기 시작할지는 지금 디렉터 몫이다.
  → **제안 7**: `PARAM.entry.doorLeadSec`(예 3초) — 콘솔 진행 막대에 «문 열기 시작» 표시를 출발(«입장!» 끝)보다 그만큼 앞에 띄운다(소리는 그대로).

## 3-6. 제안(동작이 바뀐다 — GPT 더블체크 · 사장님 확인 뒤)

| # | 무엇을 | 왜 | 위험 |
|---|---|---|---|
| 1 | S7 `ref.sec` 240 → **270 ~ 300**(인사 말 «길게»일 때) | 정석 · 가족 4분 25초 | 메모 값 · 곡 고를 때만 영향 |
| 2 | 단체 사진(narr-close 뒤 8분)을 S8 과 나눈 칸으로(예 «S8 목례 신호 120초» + «사진 · 배경 480 ~ 600초») · 예식 뒤 사진(`_photo` · `_final` · `_goodbye` 약 10분)도 칸 없음 | 칸마다 곡을 바꿀 때 S8 120초 곡이 사진 도중 끝난다 | 칸 정의 변경 · bgm-form 검사 · 화면 글(BGM 섹션 몫) |
| 3 | S10 `ref.sec` 1800 → **600 + 마지막 곡**(테이블 인사 9분) 또는 «30분»의 뜻을 적기 | 엔진 테이블 인사는 540초 · 그 뒤는 단체 사진 | 메모 값 |
| 4 | `holdMs: 2500` — 사이 ≤ 2.5초로 이어지는 큐 사이에는 올리지 않는다 | 3-2 표의 자리(1 ~ 3초 사이 오르내림) | 콘솔 `duckTo` 가 다음 큐를 보고 올림을 건너뛴다 · 입장 곡(esdDuck)도 같은 규칙 |
| 5 | 콘솔 «리허설» 칸에 duckSpeech · duckMusic · duckRead 세 값(그 기기에만 저장) | −20 · −16 · −8 은 스튜디오 PA 에서 귀로 정할 값 | 새 칸 · 저장 자리 |
| 6 | 축배 «위하여» 크기 0 을 선창 클립 끝이 아니라 «위하여!» 뒤 디렉터 GO(또는 +1초)로 | 두 분 «위하여!» 목소리 위로 음악이 먼저 커진다 | toast live 의 duck · fire |
| 7 | `PARAM.entry.doorLeadSec` + 콘솔 «문 열기 시작» 표시 | 문 여는 데 걸리는 시간만큼 앞서 밀어야 «입장!» 끝에 문이 열려 있다 | 새 칸 · 표시만 |
| 8 | (큰 것) 콘솔이 음악 칸마다 곡을 바꾸기(`BgmSlots` 읽기 · 칸 경계 크로스페이드) | 지금은 한 곡 반복 — 칸 설계(S1 ~ S10)가 당일 소리에 아직 없다 | 콘솔 재생 구조 변경 · 곡 파일 · 다음 라운드 |

## 4. 표

<!-- TABLE:START · node scripts/build-bgm-console-table.cjs 가 만든다 · 손으로 고치지 않는다 -->

### 음악 칸마다 흐르는 시간 vs ref.sec

시간 = 클립 + live.est + 이어 나가는 큐 사이(gapMs · 없으면 2초) + post wait · GO = 디렉터가 «다음»을 누르는 횟수(반응 시간은 셈 밖 · 한 번에 1 ~ 3초).

| 칸 | ref.sec | 정석 | 기록 | 가족 | 간결 |
|---|---|---|---|---|---|
| S1 guest | 1500~1800 | 시계 창(문 열림 ~ 개식 @0) · 클립 + 박수 0분 59초 | 시계 창(문 열림 ~ 개식 @0) · 클립 + 박수 0분 59초 | 시계 창(문 열림 ~ 개식 @0) · 클립 + 박수 0분 54초 | 시계 창(문 열림 ~ 개식 @0) · 클립 + 박수 0분 54초 |
| S2 candle | 240 | 1분 42초 · GO 2 · 남음 138초 | 1분 42초 · GO 2 · 남음 138초 | 2분 06초 · GO 1 · 남음 114초 | 1분 42초 · GO 2 · 남음 138초 |
| S3 entry · matjeol | 입장 곡 | 2분 37초 · GO 2 | 2분 54초 · GO 2 | 2분 51초 · GO 2 | 2분 30초 · GO 2 |
| S4 welcome · vow · ring · declare · bless | 420 | 3분 41초 · GO 5 · 남음 199초 | 3분 41초 · GO 5 · 남음 199초 | 5분 35초 · GO 6 | 2분 44초 · GO 4 · 남음 256초 |
| S5 free | 240 | 3분 23초 · GO 1 | 없음 | 없음 | 없음 |
| S6 letter | 330 | 없음 | 없음 | 없음 | 없음 |
| S7 tribute | 240 | 4분 25초 · GO 4 · **모자람 25초** | 1분 56초 · GO 3 · 남음 124초 | 4분 25초 · GO 4 · **모자람 25초** | 1분 56초 · GO 3 · 남음 124초 |
| S8 _close | 120 | 0분 23초 · GO 1 · 남음 97초 | 1분 11초 · GO 2 · 남음 49초 | 0분 23초 · GO 1 · 남음 97초 | 0분 23초 · GO 1 · 남음 97초 |
| S9 toast | 60~90 | 없음 | 0분 23초 · GO 2 · 남음 37초 | 없음 | 없음 |
| S10 table | 1800 | 없음 | 9분 09초 · GO 0 · 남음 1251초 | 없음 | 없음 |
| S8 뒤 단체 사진(narr-close) | 칸 없음 | 8분 10초 · GO 1 | 8분 10초 · GO 1 | 8분 10초 · GO 1 | 8분 10초 · GO 1 |
| 칸 없음(식전 영상 · 축가 · 예식 뒤) | | 17분 56초 · prevideo · song · _photo · _final · _goodbye | 13분 45초 · prevideo · _photo · _final · _goodbye | 17분 59초 · prevideo · song · _photo · _final · _goodbye | 25분 48초 · prevideo · _photo · _final · _goodbye |

### 예시 칩에 따라 바뀌는 클립(같은 칸 · 길이가 다르다)

| 파일 | 초 |
|---|---|
| 05_entry-A | 16.9 |
| 06_entry-B | 33.7 |
| 07_entry-C | 22.0 |
| 08_entry-D | 29.6 |
| 09_entry-E | 31.3 |
| 10_entry-F | 14.3 |
| 91_narr-candle-in-mothers-ex2 | 33.3 |
| 92_narr-candle-in-parents | 16.9 |
| 93_narr-candle-in-fathers | 14.9 |
| 94_narr-candle-in-others | 12.4 |
| 108_narr-close-bow | 10.6 |
| 131_narr-table-in | 7.2 |
| 132_narr-entry-bow-ex2 | 30.6 |
| 138_narr-candle-bow | 16.1 |
| 139_narr-candle-bow-four | 11.9 |
| 146_narr-candle-bow-fathers | 16.1 |
| 147_narr-candle-bow-others | 15.0 |
| 151_narr-candle-in-mothers | 14.1 |
| 152_narr-candle-in-mothers-ex3 | 19.3 |
| 153_narr-candle-in-mothers-ex4 | 36.6 |
| 154_narr-candle-in-fathers-ex2 | 13.7 |
| 155_narr-candle-in-fathers-ex3 | 19.3 |
| 156_narr-candle-in-parents-ex2 | 12.6 |
| 157_narr-candle-in-parents-ex3 | 14.8 |
| 158_narr-candle-in-parents-ex4 | 25.5 |
| 159_narr-candle-in-others-ex3 | 19.8 |
| 160_narr-entry-bow | 19.1 |
| 161_narr-entry-bow-ex3 | 31.2 |
| 162_narr-entry-bow-ex4 | 29.0 |
| 185_narr-close-bow-ex2 | 13.9 |
| 186_narr-close-bow-ex3 | 20.9 |
| 187_narr-close-bow-ex4 | 15.7 |
| 190_narr-table-in-ex2 | 16.7 |
| 191_narr-candle-in-fathers-ex4 | 21.1 |
| 192_narr-candle-in-others-ex2 | 11.9 |
| 203_narr-table-in-ex3 | 15.1 |
| 222_narr-table-in-ex4 | 11.6 |
| 223_narr-table-in-ex5 | 10.2 |
| 224_narr-candle-in-others-ex4 | 14.3 |
| 252_narr-entry-bow-ex5 | 6.7 |
| 258_narr-entry-bow-ex6 | 18.2 |

### 정석(standard) · 큐 37

| # | 순간 k | slug | 번호 | 클립 초 | live.est | live 크기 | 큐 크기 | fire | 사이 | 칸 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | guest | guest-1-arrival | 01 | 9.2 |  |  | -16 | manual |  | S1 |
| 1 | guest | guest-2-10min | 02 | 9.5 |  |  | -16 | clock @-10분 |  | S1 |
| 2 | guest | guest-3-5min | 03 | 2.2 |  |  | -16 | clock @-5분 |  | S1 |
| 3 | guest | guest-4-1min-pre | 89 | 8.1 |  |  | -16 | clock @-1분 |  | S1 |
| 4 | guest | narr-open | 137 | 21.7 | 8 박수 | -8 | -16 | clock @0분 |  | S1 |
| 5 | prevideo | narr-prevideo-in | 90 | 3.4 | 180 | -90 | -16 | manual @0분 |  · 내림 1.5초 | - |
| 6 | prevideo | narr-prevideo-out | 261 | 3.7 |  |  | -16 | manual |  | - |
| 7 | candle | narr-candle-in-mothers | 151 | 14.1 | 45 | -8 | -8 | chain | 2초 | S2 |
| 8 | candle | narr-candle-out | 95 | 4.3 |  |  | -8 | manual |  | S2 |
| 9 | candle | narr-candle-bow | 138 | 16.1 | 15 | -8 | -8 | chain | 1.25초 | S2 |
| 10 | candle | bridge-b7-entry-ready | 243 | 3.9 |  |  | -8 | manual |  | S2 |
| 11 | entry | entry-A | 05 | 16.9 | 102 | 0 | -12 | manual |  | S3 |
| 12 | entry | narr-entry-arrive | 144 | 5.8 |  |  | -12 | manual |  | S3 |
| 13 | matjeol | narr-entry-bow | 160 | 19.1 | 12 | -12 | -12 | chain | 1.25초 | S3 |
| 14 | welcome | bridge-b8-face-guests | 244 | 4.2 |  |  | -8 | manual |  | S4 |
| 15 | welcome | narr-welcome-in | 11 | 4.7 | 46 | -16 | -16 | chain | 2초 | S4 |
| 16 | vow | narr-vow-in | 13 | 15.4 | 70 | -16 | -16 | manual |  | S4 |
| 17 | vow | narr-vow-out | 14 | 4.0 |  |  | -16 | manual |  | S4 |
| 18 | declare | narr-declare-in-friend | 136 | 5.2 | 45 | -16 | -16 | chain | 4.5초 | S4 |
| 19 | declare | narr-declare-family-out | 57 | 3.5 | 8 박수 | -8 | -16 | manual |  | S4 |
| 20 | declare | bridge-b3-clap-thanks | 111 | 2.4 |  |  | -8 | manual |  · 내림 1.5초 | S4 |
| 21 | declare | bridge-b9-declare-seat-end | 255 | 4.0 |  |  | -8 | chain | 2초 | S4 |
| 22 | free | narr-free-in-speech | 174 | 4.1 | 186 | -90 | -8 | chain | 2초 | S5 |
| 23 | free | bridge-b10-speech-clap | 246 | 3.1 | 8 박수 | -8 | -8 | manual |  | S5 |
| 24 | song | narr-song | 19 | 9.8 | 230 | -90 | -8 | manual |  · 내림 1.5초 | - |
| 25 | song | narr-song-end-friend | 250 | 3.5 | 8 박수 | -8 | -8 | manual |  | - |
| 26 | tribute | bridge-b12-tribute-calm | 248 | 5.5 |  |  | -8 | manual |  · 내림 1.5초 | S7 |
| 27 | tribute | narr-tribute-name | 141 | 8.3 |  |  | -16 | chain | 2초 | S7 |
| 28 | tribute | tribute-in | 38 | 4.1 | 160 | -16 | -16 | chain | 1초 | S7 |
| 29 | tribute | tribute-call-say | 145 | 3.9 | 15 | -12 | -12 | manual |  | S7 |
| 30 | tribute | tribute-hug | 256 | 4.2 | 35 | -12 | -12 | manual |  | S7 |
| 31 | tribute | tribute-out | 39 | 11.0 | 15 | -12 | -16 | manual |  | S7 |
| 32 | _close | narr-close-bow | 108 | 10.6 | 12 박수 | -8 | -12 | manual |  | S8 |
| 33 | _close | narr-close | 26 | 10.3 | 480 | -8 | -12 | manual |  · 내림 1.5초 | S8+ |
| 34 | _photo | end-1c-thanks-nomeal | 110 | 17.0 | 403 | -14 | -14 | manual |  | - |
| 35 | _final | narr-photo-free | 262 | 6.3 | 113 | -12 | -12 | manual |  | - |
| 36 | _goodbye | end-2-goodbye | 47 | 8.3 |  |  | -14 | manual |  · wait 90초 | - |

### 기록(record) · 큐 36

| # | 순간 k | slug | 번호 | 클립 초 | live.est | live 크기 | 큐 크기 | fire | 사이 | 칸 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | guest | guest-1-arrival | 01 | 9.2 |  |  | -16 | manual |  | S1 |
| 1 | guest | guest-2-10min | 02 | 9.5 |  |  | -16 | clock @-10분 |  | S1 |
| 2 | guest | guest-3-5min | 03 | 2.2 |  |  | -16 | clock @-5분 |  | S1 |
| 3 | guest | guest-4-1min-pre | 89 | 8.1 |  |  | -16 | clock @-1분 |  | S1 |
| 4 | guest | narr-open | 137 | 21.7 | 8 박수 | -8 | -16 | clock @0분 |  | S1 |
| 5 | prevideo | narr-prevideo-in | 90 | 3.4 | 180 | -90 | -16 | manual @0분 |  · 내림 1.5초 | - |
| 6 | prevideo | narr-prevideo-out | 261 | 3.7 |  |  | -16 | manual |  | - |
| 7 | candle | narr-candle-in-mothers | 151 | 14.1 | 45 | -8 | -8 | chain | 2초 | S2 |
| 8 | candle | narr-candle-out | 95 | 4.3 |  |  | -8 | manual |  | S2 |
| 9 | candle | narr-candle-bow | 138 | 16.1 | 15 | -8 | -8 | chain | 1.25초 | S2 |
| 10 | candle | bridge-b7-entry-ready | 243 | 3.9 |  |  | -8 | manual |  | S2 |
| 11 | entry | entry-B | 06 | 33.7 | 102 | 0 | -12 | manual |  | S3 |
| 12 | entry | narr-entry-arrive | 144 | 5.8 |  |  | -12 | manual |  | S3 |
| 13 | matjeol | narr-entry-bow | 160 | 19.1 | 12 | -12 | -12 | chain | 1.25초 | S3 |
| 14 | welcome | bridge-b8-face-guests | 244 | 4.2 |  |  | -8 | manual |  | S4 |
| 15 | welcome | narr-welcome-in | 11 | 4.7 | 46 | -16 | -16 | chain | 2초 | S4 |
| 16 | vow | narr-vow-in | 13 | 15.4 | 70 | -16 | -16 | manual |  | S4 |
| 17 | vow | narr-vow-out | 14 | 4.0 |  |  | -16 | manual |  | S4 |
| 18 | declare | narr-declare-in-friend | 136 | 5.2 | 45 | -16 | -16 | chain | 4.5초 | S4 |
| 19 | declare | narr-declare-family-out | 57 | 3.5 | 8 박수 | -8 | -16 | manual |  | S4 |
| 20 | declare | bridge-b3-clap-thanks | 111 | 2.4 |  |  | -8 | manual |  · 내림 1.5초 | S4 |
| 21 | declare | bridge-b9-declare-seat-end | 255 | 4.0 |  |  | -8 | chain | 2초 | S4 |
| 22 | tribute | narr-tribute-pair | 142 | 6.5 |  |  | -16 | chain | 2초 | S7 |
| 23 | tribute | tribute-in | 38 | 4.1 | 20 | -16 | -16 | chain | 1초 | S7 |
| 24 | tribute | tribute-call | 143 | 2.7 | 15 | -12 | -12 | manual |  | S7 |
| 25 | tribute | tribute-hug | 256 | 4.2 | 35 | -12 | -12 | manual |  | S7 |
| 26 | tribute | tribute-out | 39 | 11.0 | 15 | -12 | -16 | manual |  | S7 |
| 27 | _close | narr-close-bow | 187 | 15.7 | 12 박수 | -8 | -12 | manual |  | S8 |
| 28 | _close | bridge-b13-toast-stay | 249 | 3.4 | 40 | -8 | -8 | manual |  · 내림 1.5초 | S8 |
| 29 | toast | toast-toast | 40 | 10.7 | 10 | 0 | -8 | manual |  | S9 |
| 30 | toast | narr-toast-out | 56 | 2.3 |  |  | -8 | manual |  | S9 |
| 31 | table | narr-table-in | 131 | 7.2 | 540 | -12 | -12 | chain | 2초 | S10 |
| 32 | _close | narr-close | 26 | 10.3 | 480 | -8 | -12 | manual |  | S8+ |
| 33 | _photo | end-1c-thanks-nomeal | 110 | 17.0 | 403 | -14 | -14 | manual |  | - |
| 34 | _final | narr-photo-free | 262 | 6.3 | 113 | -12 | -12 | manual |  | - |
| 35 | _goodbye | end-2-goodbye | 47 | 8.3 |  |  | -14 | manual |  · wait 90초 | - |

### 가족(family) · 큐 36

| # | 순간 k | slug | 번호 | 클립 초 | live.est | live 크기 | 큐 크기 | fire | 사이 | 칸 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | guest | guest-1-arrival | 01 | 9.2 |  |  | -16 | manual |  | S1 |
| 1 | guest | guest-2-10min | 02 | 9.5 |  |  | -16 | clock @-10분 |  | S1 |
| 2 | guest | guest-3-5min | 03 | 2.2 |  |  | -16 | clock @-5분 |  | S1 |
| 3 | guest | guest-4-1min-pre | 89 | 8.1 |  |  | -16 | clock @-1분 |  | S1 |
| 4 | guest | narr-open | 148 | 25.1 |  |  | -16 | clock @0분 |  | S1 |
| 5 | prevideo | narr-prevideo-in | 90 | 3.4 | 180 | -90 | -16 | chain @0분 | 3초 | - |
| 6 | prevideo | narr-prevideo-out | 261 | 3.7 |  |  | -16 | manual |  | - |
| 7 | candle | bridge-b14-candle-name | 263 | 6.0 |  |  | -8 | chain | 3초 | S2 |
| 8 | candle | narr-candle-in-mothers | 91 | 33.3 | 45 | -8 | -8 | chain | 2초 | S2 |
| 9 | candle | narr-candle-out | 211 | 4.2 |  |  | -8 | manual |  | S2 |
| 10 | candle | narr-candle-bow | 138 | 16.1 | 15 | -8 | -8 | chain | 1.25초 | S2 |
| 11 | entry | entry-E | 09 | 31.3 | 102 | 0 | -12 | manual |  | S3 |
| 12 | entry | narr-entry-arrive | 144 | 5.8 |  |  | -12 | manual |  | S3 |
| 13 | matjeol | narr-entry-bow | 160 | 19.1 | 12 | -12 | -12 | chain | 1.25초 | S3 |
| 14 | welcome | bridge-b8-face-guests | 244 | 4.2 |  |  | -8 | manual |  | S4 |
| 15 | welcome | narr-welcome-in | 11 | 4.7 | 46 | -16 | -16 | chain | 2초 | S4 |
| 16 | vow | narr-vow-in | 13 | 15.4 | 70 | -16 | -16 | manual |  | S4 |
| 17 | vow | narr-vow-out | 14 | 4.0 |  |  | -16 | manual |  | S4 |
| 18 | declare | narr-declare-in-friend | 136 | 5.2 | 45 | -16 | -16 | chain | 4.5초 | S4 |
| 19 | declare | narr-declare-family-out | 57 | 3.5 | 8 박수 | -8 | -16 | manual |  | S4 |
| 20 | declare | bridge-b3-clap-thanks | 111 | 2.4 |  |  | -8 | manual |  · 내림 1.5초 | S4 |
| 21 | bless | narr-bless-mid | 172 | 7.3 | 100 | -16 | -16 | chain | 2초 | S4 |
| 22 | bless | narr-bless-end | 232 | 2.9 | 8 박수 | -8 | -16 | manual |  | S4 |
| 23 | song | narr-song | 19 | 9.8 | 230 | -90 | -8 | manual |  · 내림 1.5초 | - |
| 24 | song | narr-song-end-friend | 250 | 3.5 | 8 박수 | -8 | -8 | manual |  | - |
| 25 | tribute | bridge-b12-tribute-calm | 248 | 5.5 |  |  | -8 | manual |  · 내림 1.5초 | S7 |
| 26 | tribute | narr-tribute-name | 141 | 8.3 |  |  | -16 | chain | 2초 | S7 |
| 27 | tribute | tribute-in | 38 | 4.1 | 160 | -16 | -16 | chain | 1초 | S7 |
| 28 | tribute | tribute-call-say | 145 | 3.9 | 15 | -12 | -12 | manual |  | S7 |
| 29 | tribute | tribute-hug | 256 | 4.2 | 35 | -12 | -12 | manual |  | S7 |
| 30 | tribute | tribute-out | 39 | 11.0 | 15 | -12 | -16 | manual |  | S7 |
| 31 | _close | narr-close-bow | 108 | 10.6 | 12 박수 | -8 | -12 | manual |  | S8 |
| 32 | _close | narr-close | 26 | 10.3 | 480 | -8 | -12 | manual |  · 내림 1.5초 | S8+ |
| 33 | _photo | end-1c-thanks-nomeal | 110 | 17.0 | 403 | -14 | -14 | manual |  | - |
| 34 | _final | narr-photo-free | 262 | 6.3 | 113 | -12 | -12 | manual |  | - |
| 35 | _goodbye | end-2-goodbye | 47 | 8.3 |  |  | -14 | manual |  · wait 90초 | - |

### 간결(brief) · 큐 30

| # | 순간 k | slug | 번호 | 클립 초 | live.est | live 크기 | 큐 크기 | fire | 사이 | 칸 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | guest | guest-1-arrival | 01 | 9.2 |  |  | -16 | manual |  | S1 |
| 1 | guest | guest-2-10min | 02 | 9.5 |  |  | -16 | clock @-10분 |  | S1 |
| 2 | guest | guest-3-5min | 03 | 2.2 |  |  | -16 | clock @-5분 |  | S1 |
| 3 | guest | guest-4-1min-pre | 89 | 8.1 |  |  | -16 | clock @-1분 |  | S1 |
| 4 | guest | narr-open | 149 | 24.9 |  |  | -16 | clock @0분 |  | S1 |
| 5 | prevideo | narr-prevideo-in | 90 | 3.4 | 180 | -90 | -16 | chain @0분 | 3초 | - |
| 6 | prevideo | narr-prevideo-out | 261 | 3.7 |  |  | -16 | manual |  | - |
| 7 | candle | narr-candle-in-mothers | 151 | 14.1 | 45 | -8 | -8 | chain | 2초 | S2 |
| 8 | candle | narr-candle-out | 95 | 4.3 |  |  | -8 | manual |  | S2 |
| 9 | candle | narr-candle-bow | 138 | 16.1 | 15 | -8 | -8 | chain | 1.25초 | S2 |
| 10 | candle | bridge-b7-entry-ready | 243 | 3.9 |  |  | -8 | manual |  | S2 |
| 11 | entry | entry-C | 07 | 22.0 | 102 | 0 | -12 | manual |  | S3 |
| 12 | entry | narr-entry-arrive | 144 | 5.8 |  |  | -12 | manual |  | S3 |
| 13 | matjeol | narr-entry-bow | 252 | 6.7 | 12 | -12 | -12 | chain | 1.25초 | S3 |
| 14 | vow | narr-vow-in | 13 | 15.4 | 70 | -16 | -16 | manual |  | S4 |
| 15 | vow | narr-vow-out | 14 | 4.0 |  |  | -16 | manual |  | S4 |
| 16 | declare | narr-declare-in-friend | 136 | 5.2 | 45 | -16 | -16 | chain | 4.5초 | S4 |
| 17 | declare | narr-declare-family-out | 57 | 3.5 | 8 박수 | -8 | -16 | manual |  | S4 |
| 18 | declare | bridge-b3-clap-thanks | 111 | 2.4 |  |  | -8 | manual |  · 내림 1.5초 | S4 |
| 19 | declare | bridge-b9-declare-seat-end | 255 | 4.0 |  |  | -8 | chain | 2초 | S4 |
| 20 | tribute | narr-tribute-pair | 142 | 6.5 |  |  | -16 | chain | 2초 | S7 |
| 21 | tribute | tribute-in | 38 | 4.1 | 20 | -16 | -16 | chain | 1초 | S7 |
| 22 | tribute | tribute-call | 143 | 2.7 | 15 | -12 | -12 | manual |  | S7 |
| 23 | tribute | tribute-hug | 256 | 4.2 | 35 | -12 | -12 | manual |  | S7 |
| 24 | tribute | tribute-out | 39 | 11.0 | 15 | -12 | -16 | manual |  | S7 |
| 25 | _close | narr-close-bow | 108 | 10.6 | 12 박수 | -8 | -12 | manual |  | S8 |
| 26 | _close | narr-close | 26 | 10.3 | 480 | -8 | -12 | manual |  · 내림 1.5초 | S8+ |
| 27 | _photo | end-1c-thanks-nomeal | 110 | 17.0 | 403 | -14 | -14 | manual |  | - |
| 28 | _final | narr-photo-free | 262 | 6.3 | 833 | -12 | -12 | manual |  | - |
| 29 | _goodbye | end-2-goodbye | 47 | 8.3 |  |  | -14 | manual |  · wait 90초 | - |

<!-- TABLE:END -->
