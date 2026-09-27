# 하객 식사 답 [DINING_RSVP] — 켜는 날 처리방침 · 상담 답 초안 (2026-09-27)

> **이 파일은 켜는 PR 에서 그대로 옮겨 붙이는 초안이다. 지금 `privacy.html` 에는 넣지 않았다.**
> 까닭: 처리방침은 라이브이고 실제 동작과 같아야 한다(«책임질 수 없는 안심 금지»).
> 기능 스위치 `DINE_RSVP.from` 이 먼 날짜(`2099-12-31`)인 동안 식사 답은 받지 않으므로,
> 지금 처리방침에 이 항목을 적으면 «하지 않는 수집»을 공고하는 셈이 된다.
> `scripts/audit/dine-rsvp.mjs` 가 두 모드를 모두 잰다 — 꺼짐이면 처리방침 · 상담 답이 이 기능을 말하면 빨강,
> 켜짐이면 시행일 = `from` · `id="dine-rsvp"` 줄 · 상담 답 새 글이 없으면 빨강.

## 켜는 PR 에서 함께 바꿀 것 (한 커밋)

| 자리 | 바꾸는 것 |
|---|---|
| `automation/platform/89_dine_rsvp.gs` | `DINE_RSVP.from` = 시행일(`YYYY-MM-DD`) |
| `guide.html` | `var DR_FROM=` 같은 날(표본 날짜 문) |
| `shared/hydrate.js` | `var DR_FROM =` 같은 날(청첩장 표본 단추 글 날짜 문) |
| `privacy.html` | 아래 ①~⑤ |
| `assets/advisor-kb.js` | 아래 ⑥ |
| `scripts/audit/snap-plan.mjs` | 아래 ⑦ — 처리방침 시행일이 바뀌면 스냅 날짜 검사 두 줄이 깨진다 |

★GAS(`89_dine_rsvp.gs`)는 사장님이 붙이고 «새 버전»으로 재배포해야 스위치가 켜진다. 사이트 쪽만 바뀌고 GAS 가 옛 날짜면
화면은 여전히 닫혀 있다(서버가 `rsvp:false`) — 반대 순서(GAS 먼저)도 안전하다(처리방침 공고일에 맞춰 둘 다 바꾼다).

★공고 · 시행: 새 수집 항목(하객이 직접 입력하는 식사 참석 답)이 생긴다. 10조 본문은 «시행일 7일 전부터 공지»,
단서는 «정보주체의 권리에 불리하지 않은 변경은 공고와 동시에 시행»이다. 스냅 기획은 «선택 · 그 자리에서 따로 동의»라
단서로 공고일에 시행했다([SNAP_OPEN_NOW]). 식사 답도 하객이 «동의하고 보내기»로 그 자리에서 동의하지만,
**어느 조항으로 갈지는 사장님 결정**이다(아래 날짜 두 칸을 그 결정대로 채운다).

---

## ① 1조 «수집하는 개인정보 항목» — «나.» 표 아래에 «다.» 새로

`<p style="margin-top:12px">청첩장·하객 편지·디지털 참석 페이지에 포함되는 …` 문단 **바로 앞**에 넣는다.

```html
      <p style="margin-top:14px"><strong>다. 하객 안내 페이지 (하객이 직접 입력)</strong></p>
      <div class="spec-table">
        <div class="spec-row" id="dine-rsvp"><!-- [DINING_RSVP] 하객 안내 «자세히»(guide.html · /privacy.html#dine-rsvp)가 이 줄로 온다 — id 를 바꾸지 말 것 -->
          <span class="spec-key">식사 참석 답</span>
          <span class="spec-val">이름, 식사를 함께하는지, 함께 오는 인원 (연락처는 받지 않음 · 두 분이 하객께 직접 여쭤 마이페이지에 넣은 답 포함)</span>
        </div>
      </div>
```

## ② 2조 «수집·이용 목적» — 목록 끝에 한 줄

```html
        <li><strong>하객 식사 참석 답</strong> · 두 분의 식사(애프터 웨딩) 인원 준비, 두 분 마이페이지에 보여 드림, 두 분께 메일로 알림(하객 마감 뒤 바뀐 답 · 식당 마감 전날 인원)</li>
```

## ③ 3조 «보유 및 이용 기간» — «즉시 파기» 줄 앞에 한 줄

```html
        <div class="spec-row">
          <span class="spec-key">하객 식사 참석 답</span>
          <span class="spec-val">예식 후 <strong>30일 이내</strong> 파기 (하객 안내 페이지가 닫히는 날 · 예식일을 알 수 없으면 마지막 답 후 30일)</span>
        </div>
```

근거(실제 동작): `89_dine_rsvp.gs dineRsvpDaily` 가 매일 19시 — 예식일 + `GUIDE_EXPIRE_DAYS`(30)가 지난 고객의 줄 전부,
예식일을 모르면 마지막 답 + 30일, 고객이 없어진 줄도 지운다(`automation/tests/dine-rsvp.test.js` 11a).
★트리거가 걸려 있어야 이 문장이 참이다 — 켜기 전에 사장님이 `70_journey` 파일의 `setupAllTriggers` 를 한 번 돌린다.

## ④ 머리 «개정 시행일자» (213행 근처)

```html
  <div class="hero-meta">개정 시행일자 · {시행일 YYYY.MM.DD} (공고 {공고일 YYYY.MM.DD})</div>
```

## ⑤ 10조 «처리방침의 변경» 표

```html
        <div class="spec-row">
          <span class="spec-key">개정 공고일자</span>
          <span class="spec-val">{공고일 YYYY년 M월 D일}</span>
        </div>
        <div class="spec-row">
          <span class="spec-key">시행일자</span>
          <span class="spec-val">{시행일 YYYY년 M월 D일} (하객 안내 페이지 식사 참석 답 항목 추가 · 하객이 동의하고 보낸 경우에만 수집){10조 단서로 공고일 시행이면: · 10조 단서에 따라 공고와 동시에 시행} · 직전 개정 2026년 9월 26일 (스냅 기획 항목 추가 · 선택 동의를 받은 경우에만 수집, 촬영 사진작가 위탁 추가) · 그 전 개정 2026년 7월 12일 (문자·알림톡·AI 상담·카드결제 위탁사 추가)</span>
        </div>
```

★«직전 개정 2026년 9월 26일 (스냅 기획 …)» 줄은 스냅 검사(⑦)가 날짜를 읽는 새 자리다 — 글을 바꾸지 말 것.

## ⑥ `assets/advisor-kb.js` — `'invite-rsvp'` 답 (escalate:true 그대로)

```js
        { id: 'invite-rsvp', label: '참석 여부(RSVP)를 받을 수 있나요?', answer: '참석 안내는 모바일 청첩장과 디지털 참석으로 도와드립니다. 예식 뒤 하객분들과 식사 자리가 있으면 하객 안내 페이지에서 식사를 함께하실지 답을 받아, 두 분이 마이페이지에서 인원을 보실 수 있습니다. 예식 참석 회신은 상담에서 안내드립니다.', escalate: true },
```

## ⑦ `scripts/audit/snap-plan.mjs` — 스냅 날짜 검사를 «스냅 줄 날짜»로

지금 두 줄이 처리방침 **머리 시행일**을 본다. 식사 답 개정으로 머리 시행일이 바뀌면 둘 다 빨강이 된다.
`SNAP_V2.from` 은 바꾸지 않는다(스냅은 이미 9/26 부터 열려 있다). 스냅 날짜는 이력의 스냅 줄 날짜와 대조한다.

```js
// 58행 — 종전: 머리 «개정 시행일자» 와 대조
const snapHist = priv.match(/(?:직전 개정|시행일자<\/span>\s*<span class="spec-val">)\s*(\d{4})년 (\d{1,2})월 (\d{1,2})일 \(스냅 기획 항목 추가/);
t(!!fr && !!snapHist && +snapHist[1] === +fr[1] && +snapHist[2] === +fr[2] && +snapHist[3] === +fr[3],
  `새 기획 여는 날(SNAP_V2.from) = 처리방침 이력의 스냅 개정일(${snapHist ? snapHist.slice(1, 4).join('.') : '못 읽음'})`);
// 59행(위탁 줄 «2026년 9월 26일부터»)은 그대로 둔다 — 이미 스냅 줄 날짜를 본다
// 173~174행 [SNAP_OPEN_NOW] «시행일 = 공고일» — 머리 날짜가 식사 답 개정이 되므로, 스냅 이력 줄의 «10조 단서에 따라 공고와 동시에 시행» 문장이
//   스냅 개정(9/26)에 붙어 있는지로 바꾼다(식사 답을 7일 공지로 가면 머리 공고일 ≠ 시행일이 정상이다).
```

## 켜는 PR 확인 순서

1. `node scripts/audit/dine-rsvp.mjs` — «스위치 켜짐(날짜)» · 시행일 = from · `id="dine-rsvp"` · 상담 답 새 글
2. `node scripts/audit/snap-plan.mjs` — ⑦ 을 고친 뒤 초록
3. `node automation/tests/dine-rsvp.test.js` · `node scripts/audit/dine-rsvp-sim.mjs`
4. `sh automation/tests/merge-guard.sh`
5. 사장님 — GAS `89_dine_rsvp` 붙이기(날짜만 바뀜) → 배포 관리 «새 버전» → `99_deployCheck` 파일의 `deployStampCheck` → 관리자 페이지 한 번 열기
