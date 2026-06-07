# clasp 배포 자동화 셋업 — "5개 파일 업로드" 끝내기

**목표:** `.gs` 수동 복붙·재배포 대신, 컴퓨터에서 명령 한 줄로 `repo → GAS` 반영.
**상태:** 스캐폴드 준비 완료(`.clasp.json`·`.claspignore`). 아래는 **너가 1회 실행**(구글 인증은 내가 못 함).
**대상 프로젝트:** R3n9Mr(플랫폼/상담/관리자). 레터시스템(AKfycbwW)은 별도 — 맨 아래 참고.

> ⚠️ **중요:** `clasp push`는 *로컬 파일로 GAS를 덮어쓰고, 로컬에 없는 GAS 파일은 삭제*해요.
> 그래서 **반드시 "pull 먼저 → 비교 → push" 순서**로. 아래 그대로 하면 안전해요.

---

## 0. 한 번만 — 설치
```bash
npm install -g @google/clasp     # clasp 설치
clasp login                      # 브라우저로 구글 로그인(이 GAS 소유 계정으로)
```

## 1. 진짜 파일 목록 먼저 확인 (안전 비교)
레포 폴더(`momentedit-site`)에서:
```bash
clasp pull        # GAS의 '현재 실제 코드'를 automation/ 로 내려받음(appsscript.json 포함)
git status        # 무엇이 바뀌는지(레포 vs GAS) 한눈에 비교
```
- `git status`에 **빨간 변경이 많으면** = 레포와 GAS가 갈라져 있던 것. 내용 확인 후, **레포 쪽이 정본이면 그 변경을 되돌리고**(git checkout) push로 진행, **GAS 쪽에 레포에 없는 파일이 새로 생겼으면** 그 파일을 레포에 보존(삭제 방지).
- `appsscript.json`이 새로 생기면 그대로 둠(원본 매니페스트 — 건드리지 말 것).

## 2. push 대상 확인 (삭제 사고 예방)
```bash
clasp status      # push될 파일 / 무시될 파일 목록
```
- **push 목록에 R3n9Mr 파일만**(consultation-booking, platform/*, admin/admin·Admin) 있는지 확인.
- `form-to-couple`·`guest-letter-*`·ScreenA/B/C가 목록에 **없어야** 정상(.claspignore가 제외).

## 3. 반영 + 배포
```bash
clasp push                       # repo → GAS 코드 반영
clasp deploy -i <배포ID> -d "vNN" # 같은 R3n9Mr 배포를 새 버전으로 (또는 GAS UI에서 '새 버전 배포')
```
- `<배포ID>` = `AKfycbyR3n9Mr...QgSBEQ` (지금 쓰는 그 배포). UI로 해도 됨(편함).
- 권한 창 뜨면 **허용**(특히 스프레드시트 — 청첩장 openById 때문).

이제부터 코드 바꾸면 **`clasp push` + 배포**만. 파일 복붙 없음.

---

## 참고
- **파일명 표기:** clasp는 폴더를 파일명에 반영해 GAS에 `platform/00_platform-config` 식으로 보일 수 있어요. **함수는 전역이라 실행엔 영향 없음**(이름만 정리되는 느낌). 처음 push 후 한 번만 확인.
- **레터시스템(AKfycbwW):** `form-to-couple`·`guest-letter-*`는 **다른 GAS 프로젝트**예요. 자동화하려면 그 프로젝트용 `.clasp.json`을 별 폴더에 따로 두면 돼요(그 프로젝트 scriptId 필요 — 알려주면 똑같이 스캐폴드해 드릴게요).
- **GitHub Action(선택):** 나중에 push를 자동화하려면 `clasp` 토큰(`~/.clasprc.json`)을 레포 Secret으로 넣고 Action에서 `clasp push` 실행하면 돼요. 가이드 추가 가능.
