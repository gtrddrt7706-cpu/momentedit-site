# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)

`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.

★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이
  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.

파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.

| 파일 | 성우 | 줄 | 클립 |
|---|---|---|---|
| 1_우성.txt | 우성 | 37 | 18 |
| 2_예슬.txt | 예슬 | 9 | 4 |
| 3_진희.txt | 진희 | 7 | 2 |
| 4_진한.txt | 진한 | 5 | 4 |

## 받은 wav 를 되돌려 넣는 명령 (자동 생성 · 그대로 복사해 쓰세요)

```
# 우성 — 37줄 · 18클립
node scripts/assemble-narration.mjs --in <우성_받은폴더> \
  --clip =05_entry-A,=06_entry-B,=11_narr-welcome-in,=91_narr-candle-in-mothers,=92_narr-candle-in-parents,=93_narr-candle-in-fathers,=132_narr-entry-bow,=137_narr-open,=138_narr-candle-bow,=139_narr-candle-bow-four,=140_narr-candle-out-formal,=144_narr-entry-arrive,=27_letter-parent,=141_narr-tribute-name,=142_narr-tribute-pair,=143_tribute-call,=40_toast-toast,=131_narr-table-in
```

```
# 예슬 — 9줄 · 4클립
node scripts/assemble-narration.mjs --in <예슬_받은폴더> \
  --clip =02_guest-2,=04_guest-4,=18_entry-A,=20_entry-C
```
★18_entry-A · 20_entry-C 은 두 사람이 한 클립에 섞여 있습니다. 예슬 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

```
# 진희 — 7줄 · 2클립
node scripts/assemble-narration.mjs --in <진희_받은폴더> \
  --clip =122_guest-ex3-4-1min,=130_narr-prevideo-in-ex4
```

```
# 진한 — 5줄 · 4클립
node scripts/assemble-narration.mjs --in <진한_받은폴더> \
  --clip =01_guest-1,=03_guest-3,=18_entry-A,=20_entry-C
```
★18_entry-A · 20_entry-C 은 두 사람이 한 클립에 섞여 있습니다. 진한 것만으로는 조립되지 않으니 상대 성우 wav 를 같은 폴더에 함께 넣으세요.

