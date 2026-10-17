# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

★녹음할 것은 이 폴더가 전부입니다 — 한 번에 받을 때는 `0_전체_화자표기.txt`(이름이 붙어 목소리가 저절로 잡히고 같은 말은 한 번만) · 성우별로 받을 때는 1 ~ 4번 파일.
  `타입캐스트_N판` · `타입캐스트_3단계` 는 그때그때 만든 부분 목록이고, 그 가운데 아직 소리가 없는 줄은 모두 여기에 모입니다.
  폐지한 순간(케이크 커팅)의 줄은 없습니다 — 옛 초안에서도 나가지 않습니다(10/17).

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_우성.txt | 우성 | 130 | 43 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 130줄 · 43클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =148_narr-open-ex2,=149_narr-open-ex3,=150_narr-open-ex4,=151_narr-candle-in-mothers-ex2,=152_narr-candle-in-mothers-ex3,=153_narr-candle-in-mothers-ex4,=154_narr-candle-in-fathers-ex2,=155_narr-candle-in-fathers-ex3,=156_narr-candle-in-parents-ex2,=157_narr-candle-in-parents-ex3,=158_narr-candle-in-parents-ex4,=159_narr-candle-in-others-ex3,=160_narr-entry-bow-ex2,=161_narr-entry-bow-ex3,=162_narr-entry-bow-ex4,=163_narr-vow-in-ex2,=164_narr-vow-in-ex3,=165_narr-vow-in-ex4,=166_narr-vow-in-b-ex2,=167_narr-vow-in-b-ex3,=168_narr-vow-in-b-ex4,=169_narr-ring-in-ex2,=170_narr-ring-in-ex3,=171_narr-declare-family-out-ex2,=172_narr-bless-mid-ex2,=173_narr-bless-mid-ex3,=174_narr-free-in-speech-ex2,=175_narr-free-in-speech-ex3,=176_letter-each-ex2,=177_letter-each-ex3,=178_narr-letter-end-ex2,=179_narr-tribute-name-ex2,=180_narr-tribute-name-ex3,=181_narr-tribute-name-ex4,=182_tribute-in-ex3,=183_tribute-call-ex3,=184_tribute-out-ex4,=185_narr-close-bow-ex2,=186_narr-close-bow-ex3,=187_narr-close-bow-ex4,=188_toast-toast-ex2,=189_toast-toast-ex3,=190_narr-table-in-ex2
```

