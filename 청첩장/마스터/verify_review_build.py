#!/usr/bin/env python3
"""검토용 빌드 검증.

build_all_16.py의 데이터/치환 로직을 그대로 재사용해, 현재 마스터로 16개
프리뷰를 재빌드한 뒤 커밋된 프리뷰와 바이트 단위로 대조한다. 동시에 raw
placeholder({{...}})와 OPTIONAL 마커 잔여를 검사한다.

사용:  python3 verify_review_build.py
종료코드: 0=정상, 1=불일치/잔여 발견
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent          # 청첩장/마스터
PREVIEW_DIR = HERE.parent / "프리뷰"

# build_all_16.py에서 빌드 루프 직전까지만 실행 → DATA·함수·CSS·캘린더 확보
# (HANDOFF_LIVE 이후는 절대경로 기반 빌드 루프라 import 시 실행하지 않는다)
src = (HERE / "build_all_16.py").read_text(encoding="utf-8")
ns: dict = {}
exec(src[: src.index("HANDOFF_LIVE")], ns)

DATA = ns["DATA"]
CUSTOM_INVITATION = ns["CUSTOM_INVITATION"]
CUSTOM_PULLQUOTE = ns["CUSTOM_PULLQUOTE"]
process_optional = ns["process_optional"]
replace_placeholders = ns["replace_placeholders"]
CSS = {
    "plain": ns["TEMP_CONTAINER_CSS"],
    "dark": ns["TEMP_CONTAINER_CSS_DARK"],
    "vermilion": ns["TEMP_CONTAINER_CSS_VERMILION"],
    "classic": ns["TEMP_CONTAINER_CSS_CLASSIC"],
}

# (design_id, 파일번호, has_pullquote, has_bio, 외각CSS) — build_all_16.py와 동일 정책
DESIGNS = [
    ("01-classic", "01", False, False, "classic"),
    ("02-editorial", "02", True, False, "plain"),
    ("03-letterpress", "03", False, False, "plain"),
    ("04-vermilion", "04", False, False, "vermilion"),
    ("05-botanical", "05", False, False, "plain"),
    ("06-hangeul", "06", False, False, "plain"),
    ("07-architect", "07", False, False, "plain"),
    ("08-noir", "08", False, True, "dark"),
]

OPTIONAL_KEEP = [
    "envelope", "groomParents", "brideParents", "groomAccount", "brideAccount",
    "groomFatherAccount", "groomMotherAccount", "brideFatherAccount", "brideMotherAccount",
]


def build(master_path: Path, outer: str, has_pq: bool, has_bio: bool) -> str:
    text = master_path.read_text(encoding="utf-8")
    text = process_optional(text, "invitationText", "replace", CUSTOM_INVITATION)
    if has_pq:
        text = process_optional(text, "pullQuote", "replace", CUSTOM_PULLQUOTE)
    for key in OPTIONAL_KEEP:
        text = process_optional(text, key, "keep")
    if has_bio:
        for key in ["groomBio", "brideBio"]:
            text = process_optional(text, key, "keep")
    text = replace_placeholders(text, DATA)
    text = text.replace("</head>", CSS[outer] + "</head>", 1)
    return text


def main() -> int:
    failures = []
    for design_id, num, has_pq, has_bio, outer in DESIGNS:
        for kind in ("live", "family"):
            master = HERE / f"{kind}-{num}.master"
            preview = PREVIEW_DIR / f"_review_{design_id}-{kind}.html"
            if not master.exists():
                failures.append(f"마스터 없음: {master.name}")
                continue
            if not preview.exists():
                failures.append(f"프리뷰 없음: {preview.name}")
                continue
            built = build(master, outer, has_pq, has_bio)
            leftover = sorted(set(re.findall(r"\{\{[A-Z0-9_]+\}\}", built)))
            if leftover:
                failures.append(f"raw placeholder {preview.name}: {leftover}")
            if "OPTIONAL:" in built:
                failures.append(f"OPTIONAL 마커 잔여: {preview.name}")
            if built != preview.read_text(encoding="utf-8"):
                failures.append(f"드리프트(프리뷰≠마스터, 재빌드 필요): {preview.name}")

    if failures:
        print("검증 실패:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("OK: 16개 프리뷰 모두 마스터와 일치 · raw placeholder/OPTIONAL 잔여 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
