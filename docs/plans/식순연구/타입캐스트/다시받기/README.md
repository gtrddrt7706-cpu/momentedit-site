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
| 1_우성.txt | 우성 | 129 | 58 |
| 2_진희.txt | 진희 | 45 | 21 |
| 3_예슬.txt | 예슬 | 11 | 8 |
| 4_진한.txt | 진한 | 10 | 8 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 129줄 · 58클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =11_narr-welcome-in,=13_narr-vow-in,=14_narr-vow-out,=20_narr-letter-end,=23_narr-bless-mid,=25_narr-bless-end-long,=26_narr-close,=91_narr-candle-in-mothers,=93_narr-candle-in-fathers,=94_narr-candle-in-others,=127_narr-vow-in-b,=137_narr-open,=27_letter-parent,=28_letter-each,=136_narr-declare-in-friend,=38_tribute-in,=39_tribute-out,=256_tribute-hug,=103_narr-free-in-speech,=111_bridge-b3-clap-thanks,=255_bridge-b9-declare-seat-end,=248_bridge-b12-tribute-calm,=263_bridge-b14-candle-name,=149_narr-open-ex3,=150_narr-open-ex4,=151_narr-candle-in-mothers-ex2,=152_narr-candle-in-mothers-ex3,=153_narr-candle-in-mothers-ex4,=154_narr-candle-in-fathers-ex2,=155_narr-candle-in-fathers-ex3,=191_narr-candle-in-fathers-ex4,=192_narr-candle-in-others-ex2,=159_narr-candle-in-others-ex3,=224_narr-candle-in-others-ex4,=215_narr-welcome-in-ex4,=163_narr-vow-in-ex2,=164_narr-vow-in-ex3,=165_narr-vow-in-ex4,=166_narr-vow-in-b-ex2,=167_narr-vow-in-b-ex3,=168_narr-vow-in-b-ex4,=228_narr-thanks-in-ex2,=169_narr-ring-in-ex2,=218_narr-declare-in-friend-ex2,=231_narr-declare-in-friend-ex4,=172_narr-bless-mid-ex2,=194_narr-bless-mid-ex4,=206_narr-bless-end-ex3,=235_letter-parent-ex4,=182_tribute-in-ex3,=239_tribute-call-ex4,=219_narr-close-ex2,=220_narr-close-ex3,=207_toast-toast-ex4,=222_narr-table-in-ex4,=223_narr-table-in-ex5,=62_narr-online-in,=262_narr-photo-free
```

```
# 진희 — 45줄 · 21클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =01_guest-1-arrival,=02_guest-2-10min,=03_guest-3-5min,=04_guest-4-1min,=85_narr-photo-send,=264_narr-photo-upload,=45_end-1a-farewell,=110_end-1c-thanks-nomeal,=47_end-2-goodbye,=48_online-3-welcome,=89_guest-4-1min-pre,=115_guest-ex2-1-arrival,=117_guest-ex2-3-5min,=118_guest-ex2-4-1min,=119_guest-ex3-1-arrival,=120_guest-ex3-2-10min,=122_guest-ex3-4-1min,=123_guest-ex4-1-arrival,=124_guest-ex4-2-10min,=125_guest-ex4-3-5min,=126_guest-ex4-4-1min
```

```
# 예슬 — 11줄 · 8클립
node scripts/assemble-narration.mjs --in <예슬_받은폴더> \
  --clip =02_guest-2,=04_guest-4,=18_entry-A,=19_entry-B,=20_entry-C,=21_entry-D,=22_entry-E,=23_entry-F
```
★18_entry-A · 19_entry-B · 20_entry-C · 21_entry-D · 22_entry-E · 23_entry-F 은 두 사람이 한 클립에 섞여 있습니다. 예슬 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 진한 — 10줄 · 8클립
node scripts/assemble-narration.mjs --in <진한_받은폴더> \
  --clip =01_guest-1,=03_guest-3,=18_entry-A,=19_entry-B,=20_entry-C,=21_entry-D,=22_entry-E,=23_entry-F
```
★18_entry-A · 19_entry-B · 20_entry-C · 21_entry-D · 22_entry-E · 23_entry-F 은 두 사람이 한 클립에 섞여 있습니다. 진한 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

