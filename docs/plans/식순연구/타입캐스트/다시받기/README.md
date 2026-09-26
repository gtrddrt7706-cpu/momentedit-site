# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_우성.txt | 우성 | 144 | 71 |
| 2_이겸.txt | 이겸 | 56 | 13 |
| 3_서진.txt | 서진 | 42 | 12 |
| 4_진희.txt | 진희 | 37 | 12 |
| 5_권일.txt | 권일 | 18 | 1 |
| 6_주하.txt | 주하 | 17 | 1 |
| 7_정숙.txt | 정숙 | 5 | 1 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 144줄 · 71클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =05_entry-A,=06_entry-B,=07_entry-C,=08_entry-D,=09_entry-E,=10_entry-F,=11_narr-welcome-in,=13_narr-vow-in,=14_narr-vow-out,=15_narr-ring-in,=16_narr-ring-out,=20_narr-letter-end,=21_narr-declare-family-intro,=22_narr-bless-open,=23_narr-bless-mid,=24_narr-bless-end,=25_narr-bless-end-long,=108_narr-close-bow,=26_narr-close,=91_narr-candle-in-mothers,=92_narr-candle-in-parents,=93_narr-candle-in-fathers,=94_narr-candle-in-others,=95_narr-candle-out,=27_letter-parent,=28_letter-each,=29_letter-both,=30_declare-1-solemn,=31_declare-2-warm,=32_declare-family,=38_tribute-in,=39_tribute-out,=40_toast-toast,=41_toast-cake,=42_toast-both,=76_toast-both-b,=96_declare-clap-a,=97_declare-clap-b,=98_toast-pour-mix,=99_toast-pour-family,=100_narr-free-in-video,=101_narr-free-in-stage,=102_narr-free-in-gift,=103_narr-free-in-speech,=104_narr-free-out-clap,=105_narr-free-fail,=106_tribute-bow-groom,=107_toast-both-pour-b,=44_end-0-photo,=87_narr-toast-none,=52_narr-entry-out,=80_narr-entry-out-C,=81_narr-entry-out-D,=82_narr-entry-out-E,=83_narr-entry-out-F,=56_narr-toast-out,=77_narr-cake-out,=58_narr-free-in,=59_narr-free-out,=60_narr-photo-split,=61_narr-round-open,=62_narr-online-in,=63_narr-final-warn,=64_narr-final-call,=65_narr-photo-out,=69_fx-vshape,=70_fx-clink,=71_fx-wave,=73_fx-lean,=75_fx-selfie,=109_fx-free
```

```
# 이겸 — 56줄 · 13클립
node scripts/assemble-narration.mjs --in <이겸_받은폴더> \
  --clip =01_guest-1,=03_guest-3,=18_entry-A,=19_entry-B,=20_entry-C,=21_entry-D,=22_entry-E,=23_entry-F,=06_welcome-groom,=08_vow-groom,=24_vow-both-1,=11_letter-each,=14_tribute
```
★18_entry-A · 19_entry-B · 20_entry-C · 21_entry-D · 22_entry-E · 23_entry-F 은 두 사람이 한 클립에 섞여 있습니다. 이겸 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 서진 — 42줄 · 12클립
node scripts/assemble-narration.mjs --in <서진_받은폴더> \
  --clip =02_guest-2,=04_guest-4,=18_entry-A,=19_entry-B,=20_entry-C,=21_entry-D,=22_entry-E,=23_entry-F,=07_welcome-bride,=09_vow-bride,=25_vow-both-2,=10_letter-parent
```
★18_entry-A · 19_entry-B · 20_entry-C · 21_entry-D · 22_entry-E · 23_entry-F 은 두 사람이 한 클립에 섞여 있습니다. 서진 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 진희 — 37줄 · 12클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =01_guest-1-arrival,=02_guest-2-10min,=03_guest-3-5min,=04_guest-4-1min,=84_narr-photo-ask,=85_narr-photo-send,=45_end-1a-farewell,=47_end-2-goodbye,=48_online-3-welcome,=88_guide-meal,=89_guest-4-1min-pre,=90_narr-prevideo-in
```

```
# 권일 — 18줄 · 1클립
node scripts/assemble-narration.mjs --in <권일_받은폴더> \
  --clip =12_bless-father
```

```
# 주하 — 17줄 · 1클립
node scripts/assemble-narration.mjs --in <주하_받은폴더> \
  --clip =13_bless-mother
```

```
# 정숙 — 5줄 · 1클립
node scripts/assemble-narration.mjs --in <정숙_받은폴더> \
  --clip =27_tribute-reply
```

