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
| 1_진희.txt | 진희 | 19 | 7 |
| 2_우성.txt | 우성 | 10 | 5 |
| 3_예슬.txt | 예슬 | 2 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 진희 — 19줄 · 7클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =02_guest-2-10min,=90_narr-prevideo-in,=118_guest-ex2-4-1min,=120_guest-ex3-2-10min,=122_guest-ex3-4-1min,=124_guest-ex4-2-10min,=126_guest-ex4-4-1min
```

```
# 우성 — 10줄 · 5클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =144_narr-entry-arrive,=256_tribute-hug,=255_bridge-b9-declare-seat-end,=219_narr-close-ex2,=220_narr-close-ex3
```

```
# 예슬 — 2줄 · 1클립
node scripts/assemble-narration.mjs --in <예슬_받은폴더> \
  --clip =02_guest-2
```

