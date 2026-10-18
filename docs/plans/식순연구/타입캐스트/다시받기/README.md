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
| 1_우성.txt | 우성 | 121 | 58 |
| 2_진희.txt | 진희 | 2 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 121줄 · 58클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =09_entry-E,=13_narr-vow-in,=15_narr-ring-in,=16_narr-ring-out,=24_narr-bless-end,=26_narr-close,=127_narr-vow-in-b,=147_narr-candle-bow-others,=210_narr-song-end,=39_tribute-out,=211_narr-candle-out-ex2,=212_narr-candle-out-ex3,=213_narr-candle-out-ex4,=224_narr-candle-in-others-ex4,=208_narr-welcome-in-ex2,=214_narr-welcome-in-ex3,=215_narr-welcome-in-ex4,=225_narr-vow-out-ex2,=226_narr-vow-out-ex3,=227_narr-vow-out-ex4,=228_narr-thanks-in-ex2,=229_narr-thanks-in-ex3,=216_narr-ring-out-ex2,=217_narr-ring-out-ex3,=218_narr-declare-in-friend-ex2,=230_narr-declare-in-friend-ex3,=231_narr-declare-in-friend-ex4,=197_narr-declare-family-out-ex3,=198_narr-declare-family-out-ex4,=172_narr-bless-mid-ex2,=173_narr-bless-mid-ex3,=194_narr-bless-mid-ex4,=232_narr-bless-end-ex2,=206_narr-bless-end-ex3,=202_narr-song-ex2,=204_narr-song-ex3,=205_narr-song-ex4,=209_narr-song-ex5,=199_letter-each-ex4,=200_narr-letter-end-ex4,=233_letter-parent-ex2,=234_letter-parent-ex3,=235_letter-parent-ex4,=236_tribute-in-ex2,=237_tribute-in-ex4,=238_tribute-call-ex2,=239_tribute-call-ex4,=240_tribute-call-say-ex2,=241_tribute-call-say-ex3,=242_tribute-call-say-ex4,=184_tribute-out-ex4,=219_narr-close-ex2,=220_narr-close-ex3,=221_narr-close-ex4,=207_toast-toast-ex4,=203_narr-table-in-ex3,=222_narr-table-in-ex4,=223_narr-table-in-ex5
```

```
# 진희 — 2줄 · 1클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =47_end-2-goodbye
```

