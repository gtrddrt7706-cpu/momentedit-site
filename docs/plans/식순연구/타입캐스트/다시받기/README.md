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
| 1_우성.txt | 우성 | 51 | 22 |
| 2_진희.txt | 진희 | 2 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 51줄 · 22클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =09_entry-E,=13_narr-vow-in,=15_narr-ring-in,=16_narr-ring-out,=24_narr-bless-end,=26_narr-close,=127_narr-vow-in-b,=39_tribute-out,=208_narr-welcome-in-ex2,=197_narr-declare-family-out-ex3,=198_narr-declare-family-out-ex4,=172_narr-bless-mid-ex2,=173_narr-bless-mid-ex3,=206_narr-bless-end-ex3,=202_narr-song-ex2,=204_narr-song-ex3,=205_narr-song-ex4,=199_letter-each-ex4,=200_narr-letter-end-ex4,=184_tribute-out-ex4,=207_toast-toast-ex4,=203_narr-table-in-ex3
```

```
# 진희 — 2줄 · 1클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =47_end-2-goodbye
```

