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
| 1_우성.txt | 우성 | 23 | 23 |
| 2_진희.txt | 진희 | 2 | 2 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 23줄 · 23클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =138_narr-candle-bow,=146_narr-candle-bow-fathers,=40_toast-toast,=267_narr-declare-in-friend-gdad,=271_narr-declare-in-friend-ex2-gdad,=275_narr-declare-in-friend-ex3-gdad,=279_narr-declare-in-friend-ex4-gdad,=283_bridge-b9-declare-seat-end-gdad,=268_narr-declare-in-friend-bdad,=272_narr-declare-in-friend-ex2-bdad,=276_narr-declare-in-friend-ex3-bdad,=280_narr-declare-in-friend-ex4-bdad,=284_bridge-b9-declare-seat-end-bdad,=269_narr-declare-in-friend-gmom,=273_narr-declare-in-friend-ex2-gmom,=277_narr-declare-in-friend-ex3-gmom,=281_narr-declare-in-friend-ex4-gmom,=285_bridge-b9-declare-seat-end-gmom,=270_narr-declare-in-friend-bmom,=274_narr-declare-in-friend-ex2-bmom,=278_narr-declare-in-friend-ex3-bmom,=282_narr-declare-in-friend-ex4-bmom,=286_bridge-b9-declare-seat-end-bmom
```
★138_narr-candle-bow · 146_narr-candle-bow-fathers · 40_toast-toast · 271_narr-declare-in-friend-ex2-gdad · 275_narr-declare-in-friend-ex3-gdad · 279_narr-declare-in-friend-ex4-gdad · 272_narr-declare-in-friend-ex2-bdad · 276_narr-declare-in-friend-ex3-bdad · 280_narr-declare-in-friend-ex4-bdad · 273_narr-declare-in-friend-ex2-gmom · 277_narr-declare-in-friend-ex3-gmom · 281_narr-declare-in-friend-ex4-gmom · 274_narr-declare-in-friend-ex2-bmom · 278_narr-declare-in-friend-ex3-bmom · 282_narr-declare-in-friend-ex4-bmom 은 두 사람이 한 클립에 섞여 있습니다. 우성 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 진희 — 2줄 · 2클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =48_online-3-welcome,=120_guest-ex3-2-10min
```
★120_guest-ex3-2-10min 은 두 사람이 한 클립에 섞여 있습니다. 진희 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

