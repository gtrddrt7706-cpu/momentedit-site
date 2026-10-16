# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

★녹음할 것은 이 폴더가 전부입니다 — 한 번에 받을 때는 `0_전체_화자표기.txt`(이름이 붙어 목소리가 저절로 잡히고 같은 말은 한 번만) · 성우별로 받을 때는 1 ~ 4번 파일.
  `타입캐스트_N판` · `타입캐스트_3단계` 는 그때그때 만든 부분 목록이고, 그 가운데 아직 소리가 없는 줄은 모두 여기에 모입니다.
  폐지한 순간(케이크 커팅)의 줄은 없습니다 — 옛 초안은 지금 소리로 돕니다.

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_우성.txt | 우성 | 106 | 41 |
| 2_진희.txt | 진희 | 47 | 21 |
| 3_예슬.txt | 예슬 | 7 | 3 |
| 4_진한.txt | 진한 | 3 | 3 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 106줄 · 41클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =05_entry-A,=06_entry-B,=07_entry-C,=08_entry-D,=09_entry-E,=10_entry-F,=11_narr-welcome-in,=13_narr-vow-in,=14_narr-vow-out,=15_narr-ring-in,=19_narr-song,=108_narr-close-bow,=26_narr-close,=91_narr-candle-in-mothers,=92_narr-candle-in-parents,=93_narr-candle-in-fathers,=94_narr-candle-in-others,=95_narr-candle-out,=127_narr-vow-in-b,=132_narr-entry-bow,=133_narr-thanks-in,=137_narr-open,=138_narr-candle-bow,=139_narr-candle-bow-four,=140_narr-candle-out-formal,=144_narr-entry-arrive,=146_narr-candle-bow-fathers,=147_narr-candle-bow-others,=27_letter-parent,=28_letter-each,=141_narr-tribute-name,=142_narr-tribute-pair,=143_tribute-call,=145_tribute-call-say,=40_toast-toast,=103_narr-free-in-speech,=105_narr-free-fail,=107_toast-both-pour-b,=56_narr-toast-out,=57_narr-declare-family-out,=60_narr-photo-split
```

```
# 진희 — 47줄 · 21클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =01_guest-1-arrival,=02_guest-2-10min,=03_guest-3-5min,=04_guest-4-1min,=84_narr-photo-ask,=45_end-1a-farewell,=47_end-2-goodbye,=89_guest-4-1min-pre,=90_narr-prevideo-in,=115_guest-ex2-1-arrival,=116_guest-ex2-2-10min,=117_guest-ex2-3-5min,=118_guest-ex2-4-1min,=119_guest-ex3-1-arrival,=120_guest-ex3-2-10min,=122_guest-ex3-4-1min,=123_guest-ex4-1-arrival,=124_guest-ex4-2-10min,=125_guest-ex4-3-5min,=126_guest-ex4-4-1min,=128_narr-prevideo-in-ex2
```

```
# 예슬 — 7줄 · 3클립
node scripts/assemble-narration.mjs --in <예슬_받은폴더> \
  --clip =02_guest-2,=04_guest-4,=19_entry-B
```
★19_entry-B 은 두 사람이 한 클립에 섞여 있습니다. 예슬 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 진한 — 3줄 · 3클립
node scripts/assemble-narration.mjs --in <진한_받은폴더> \
  --clip =01_guest-1,=03_guest-3,=19_entry-B
```
★19_entry-B 은 두 사람이 한 클립에 섞여 있습니다. 진한 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

