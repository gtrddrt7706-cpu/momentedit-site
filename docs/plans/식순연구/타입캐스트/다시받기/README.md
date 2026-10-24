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
| 1_우성.txt | 우성 | 106 | 41 |
| 2_진희.txt | 진희 | 28 | 11 |
| 3_예슬.txt | 예슬 | 5 | 2 |
| 4_진한.txt | 진한 | 2 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 106줄 · 41클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =07_entry-C,=13_narr-vow-in,=19_narr-song,=20_narr-letter-end,=127_narr-vow-in-b,=130_narr-prevideo-in-ex4,=261_narr-prevideo-out,=76_toast-both-b,=111_bridge-b3-clap-thanks,=131_narr-table-in,=248_bridge-b12-tribute-calm,=148_narr-open-ex2,=149_narr-open-ex3,=150_narr-open-ex4,=251_narr-open-ex5,=257_narr-open-ex6,=152_narr-candle-in-mothers-ex3,=155_narr-candle-in-fathers-ex3,=211_narr-candle-out-ex2,=159_narr-candle-in-others-ex3,=132_narr-entry-bow-ex2,=161_narr-entry-bow-ex3,=208_narr-welcome-in-ex2,=214_narr-welcome-in-ex3,=165_narr-vow-in-ex4,=168_narr-vow-in-b-ex4,=226_narr-vow-out-ex3,=228_narr-thanks-in-ex2,=229_narr-thanks-in-ex3,=170_narr-ring-in-ex3,=217_narr-ring-out-ex3,=218_narr-declare-in-friend-ex2,=230_narr-declare-in-friend-ex3,=234_letter-parent-ex3,=254_narr-tribute-name-ex5,=237_tribute-in-ex4,=186_narr-close-bow-ex3,=219_narr-close-ex2,=203_narr-table-in-ex3,=56_narr-toast-out,=57_narr-declare-family-out
```

```
# 진희 — 28줄 · 11클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =01_guest-1-arrival,=02_guest-2-10min,=04_guest-4-1min,=45_end-1a-farewell,=110_end-1c-thanks-nomeal,=89_guest-4-1min-pre,=116_guest-ex2-2-10min,=118_guest-ex2-4-1min,=123_guest-ex4-1-arrival,=124_guest-ex4-2-10min,=126_guest-ex4-4-1min
```

```
# 예슬 — 5줄 · 2클립
node scripts/assemble-narration.mjs --in <예슬_받은폴더> \
  --clip =02_guest-2,=04_guest-4
```

```
# 진한 — 2줄 · 1클립
node scripts/assemble-narration.mjs --in <진한_받은폴더> \
  --clip =01_guest-1
```

