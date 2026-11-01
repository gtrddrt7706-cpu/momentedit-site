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
| 1_진희.txt | 진희 | 102 | 28 |
| 2_우성.txt | 우성 | 1 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 진희 — 102줄 · 28클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =297_guest-w-arrival,=298_guest-w-arrival-guide,=314_guest-w-5m-online,=315_guest-w-1m,=316_guest-w-1m-online,=317_after-photo,=318_after-photo-guide,=319_after-photo-cafe,=320_after-photo-cafe-guide,=321_after-photo-resv-guide,=322_after-photo-resv,=323_after-photo-meal-guide,=324_after-photo-meal,=299_guest-w-10m-n10,=300_guest-w-10m-n10-mgr,=301_guest-w-10m-n10-mg,=302_guest-w-10m-n10-mr,=303_guest-w-10m-n10-m,=304_guest-w-10m-n15,=305_guest-w-10m-n15-mgr,=306_guest-w-10m-n15-mg,=307_guest-w-10m-n15-mr,=308_guest-w-10m-n15-m,=309_guest-w-10m-n20,=310_guest-w-10m-n20-mgr,=311_guest-w-10m-n20-mg,=312_guest-w-10m-n20-mr,=313_guest-w-10m-n20-m
```
★314_guest-w-5m-online 은 두 사람이 한 클립에 섞여 있습니다. 진희 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 우성 — 1줄 · 1클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =07_entry-C
```
★07_entry-C 은 두 사람이 한 클립에 섞여 있습니다. 우성 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

