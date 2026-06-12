/** ============================ 88 · 애프터 웨딩 장소 데이터 품질 도구 (카카오 지역검색) ============================
 * 목적: 다이닝/애프터 웨딩 추천의 데이터 층을 "지도에 등록된 실업체" 기준으로 검증·확장한다.
 *   ① auditDineDb()    — 사이트 DINE_DB 전체를 카카오 지도에서 1:1 대조 → 'AW_장소검증' 시트
 *                         (미발견 = 폐업·상호변경 의심 → 사이트 리스트에서 정리 검토)
 *   ② collectDinePool() — 스튜디오 반경 7km를 업종 키워드로 훑어 후보 풀 수집 → 'AW_장소후보' 시트
 *                         (검토 칸에 O 표시한 곳을 알려주면 사이트 DINE_DB로 승격)
 * 준비: 스크립트 속성에 KAKAO_REST_KEY 등록(프로젝트 설정 → 스크립트 속성). Vercel과 같은 키 사용 가능.
 * 비용: 무료(카카오 일 10만 건 쿼터 · 본 도구는 회당 수십~백여 건).
 */
var AW_STUDIO = { x: '126.8929', y: '37.6079' };   // 향동 스튜디오(사이트 지도와 동일 좌표)

/** [설정 우회] 스크립트 속성 화면 없이 키 저장 — 아래 key 값에 카카오 REST API 키를 붙여넣고 이 함수를 1회 실행.
 *  저장 후엔 key 값을 다시 '여기에...'로 되돌려도 됨(속성은 유지됨). */
function aw_setKey() {
  var key = '여기에_REST_API_키_붙여넣기';
  if (!key || key.indexOf('여기에') === 0) throw new Error('함수 안의 key 값에 카카오 REST API 키를 붙여넣은 뒤 다시 실행해 주세요.');
  PropertiesService.getScriptProperties().setProperty('KAKAO_REST_KEY', key.trim());
  Logger.log('KAKAO_REST_KEY 저장 완료 ✓ 이제 auditDineDb → collectDinePool 순서로 실행하세요.');
}

function _awKey_() {
  var k = PropertiesService.getScriptProperties().getProperty('KAKAO_REST_KEY');
  if (!k) throw new Error('스크립트 속성에 KAKAO_REST_KEY를 먼저 등록해 주세요. (프로젝트 설정 → 스크립트 속성)');
  return k;
}
function _awSearch_(query, radius, page) {
  var u = 'https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(query)
    + '&x=' + AW_STUDIO.x + '&y=' + AW_STUDIO.y + '&radius=' + (radius || 7000)
    + '&sort=distance&size=15&page=' + (page || 1);
  var r = UrlFetchApp.fetch(u, { headers: { Authorization: 'KakaoAK ' + _awKey_() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  try { return JSON.parse(r.getContentText()); } catch (e) { return null; }
}
function _awSheet_(name, headers) {
  var ss = SpreadsheetApp.getActive(); var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}
function _awNow_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'); }
function _awNorm_(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

var AW_DB_NAMES = [
  '너른마당', '잔치연', '목향 강매동',
  '산이화 한정식', '모담 라피아노 삼송직영점', '화정가든 보리굴비',
  '능원숯불갈비', '강강술래 늘봄농원점', '갈비도락 서오릉점',
  '한우만', '왕릉일가', '더담청송',
  '원당쇠고기국밥', '쿠우쿠우 삼송원흥점', '포레스트피크닉',
  '메종드테라스', '경성빵공장 서오릉점', '리비토 향동',
  '연화수 한정식', '원당골추어탕', '김명주뜰안채밥상',
  '착한우리한우정육식당', '곰작골나주곰탕 메리그라운드향동점', '명동칼국수 고양원흥점',
  '가장맛있는족발 고양삼송점', '디오름', '신디스 삼송',
  '37.5 고양삼송점', '라플란드 원흥점', '서오릉카페',
  '덕승재 상암동본점', '창고43 상암점', '송추가마골 은평2호점',
  '아내의휴일', '만포면옥 본점', '소담촌 화정역점',
  '하루노호시 행신점', '효교 향동점', '어수지락 연신내직영점',
  '애슐리퀸즈 롯데몰은평점', '청담한식 서오릉본점', '복옥정 서오릉본점',
  '선운산풍천장어 서오능본점', '유평리백숙집 향동점', '시골마루장작구이 서오릉점',
  '대성포갈비 향동점', '은성곰탕', '본가전주옥 향동데시앙점',
  '편백가원 향동점', '소담촌 구산직영점', '다린족발 본점',
  '장충동도도왕족발보쌈', '봄봄한식뷔페 향동점', '향궁',
  '팜스활어횟집', '더프롬나드', '아타라카페',
  '뱅센숲', '산다화',
];

/** ① 기존 리스트 전수 검증 — GAS 편집기에서 실행(약 1분) */
function auditDineDb() {
  var r = _awRunAudit_();
  Logger.log('검증 완료 — 일치 ' + r.found + ' · 유사 ' + r.fuzzy + ' · 미발견 ' + r.missing + ' (AW_장소검증 시트)');
}

/** 검증 코어 — 시트 기록 + 집계 반환(수동·월간 트리거 공용) */
function _awRunAudit_() {
  var rows = [], found = 0, fuzzy = 0, missing = 0, missNames = [], fuzzyNames = [];
  for (var i = 0; i < AW_DB_NAMES.length; i++) {
    var name = AW_DB_NAMES[i];
    var j = _awSearch_(name, 15000, 1);   // 검증은 반경 넉넉히(지점 표기 차이 흡수)
    var docs = (j && j.documents) || [];
    var best = null, exact = false;
    for (var k = 0; k < docs.length; k++) {
      var d = docs[k];
      if (_awNorm_(d.place_name) === _awNorm_(name)) { best = d; exact = true; break; }
      if (!best && (_awNorm_(d.place_name).indexOf(_awNorm_(name).slice(0, 4)) === 0 || _awNorm_(name).indexOf(_awNorm_(d.place_name).slice(0, 4)) === 0)) best = d;
    }
    var status = best ? (exact ? '일치' : '유사(확인 필요)') : '미발견(폐업·상호변경 의심)';
    if (best && exact) found++; else if (best) { fuzzy++; fuzzyNames.push(name); } else { missing++; missNames.push(name); }
    rows.push([name, best ? best.place_name : '', status, best ? Number(best.distance) : '', best ? best.phone : '',
               best ? (best.road_address_name || best.address_name) : '', best ? best.place_url : '', _awNow_()]);
    Utilities.sleep(120);
  }
  var sh = _awSheet_('AW_장소검증', ['사이트 상호', '지도 매칭 상호', '판정', '거리(m)', '전화', '주소', '지도URL', '확인일']);
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { found: found, fuzzy: fuzzy, missing: missing, missNames: missNames, fuzzyNames: fuzzyNames, total: AW_DB_NAMES.length };
}

/** ①-자동 · 월간 자동 검증 — 트리거가 매월 1회 호출. 미발견(폐업·상호변경 의심)이 생기면 관리자에게 SMS 알림.
 *  ※ '검증·알림'은 100% 자동이지만, 고객 노출 리스트(DINE_DB)의 실제 수정·배포는 사람이 확인 후 진행(오탐 1건이 좋은 식당을 지우는 사고 방지). */
function awMonthlyAudit() {
  var r;
  try { r = _awRunAudit_(); }
  catch (e) { try { _awNotifyAdmin_('[모먼트] 다이닝 월간검증 실패: ' + e); } catch (e2) {} return; }
  Logger.log('월간 검증 — 일치 ' + r.found + ' · 유사 ' + r.fuzzy + ' · 미발견 ' + r.missing);
  if (r.missing > 0) {
    var head = r.missNames.slice(0, 4).join(', ') + (r.missNames.length > 4 ? ' 외 ' + (r.missNames.length - 4) + '곳' : '');
    _awNotifyAdmin_('[모먼트] 다이닝 월간검증: 폐업·상호변경 의심 ' + r.missing + '곳 발견(' + head + '). AW_장소검증 시트 확인 후 리스트 정리를 요청해 주세요.');
  }
}

/** 월간 검증 트리거 등록 — 1회만 실행(매월 1일 오전 9시). 이미 있으면 중복 생성 안 함. */
function setupAwAudit() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'awMonthlyAudit'; });
  if (has) { Logger.log('awMonthlyAudit 트리거 이미 등록됨 — 건너뜀'); return; }
  ScriptApp.newTrigger('awMonthlyAudit').timeBased().onMonthDay(1).atHour(9).create();
  Logger.log('월간 자동 검증 트리거 등록 완료 ✓ (매월 1일 09시 · 미발견 발생 시 관리자 SMS)');
}

/** 관리자 알림 — 95_notify의 솔라피 발송 재사용(설정 있으면 SMS, 없으면 로그만). 88을 독립 동작시키기 위해 try로 감쌈. */
function _awNotifyAdmin_(text) {
  try {
    var cfg = _nfProps();
    if (cfg && cfg.key && cfg.secret && cfg.sender && cfg.adminPhone) {
      _solapiSend(cfg, { to: cfg.adminPhone, from: cfg.sender, text: text });
      Logger.log('[aw] 관리자 SMS 발송: ' + text); return;
    }
  } catch (e) { Logger.log('[aw] SMS 발송 경로 없음(' + e + ')'); }
  Logger.log('[aw] (알림 미발송 · 설정 누락) ' + text);
}

/** ② 후보 풀 대량 수집 — 반경 7km 업종 스윕(약 2~3분) */
var AW_SWEEP = ['한정식','한식','한우','갈비','곰탕','국밥','샤브샤브','칼국수','족발','보쌈','중식당','일식','초밥','파스타','해물탕','생선구이','뷔페','브런치','베이커리카페','카페','키즈카페','수제맥주','와인바','전통찻집'];
function collectDinePool() {
  var seen = {}, rows = [];
  var known = {}; AW_DB_NAMES.forEach(function (n) { known[_awNorm_(n)] = true; });
  for (var i = 0; i < AW_SWEEP.length; i++) {
    for (var page = 1; page <= 3; page++) {
      var j = _awSearch_(AW_SWEEP[i], 7000, page);
      var docs = (j && j.documents) || [];
      for (var k = 0; k < docs.length; k++) {
        var d = docs[k];
        if (seen[d.id]) continue; seen[d.id] = true;
        if (known[_awNorm_(d.place_name)]) continue;   // 이미 사이트 리스트에 있는 곳 제외
        rows.push([d.place_name, String(d.category_name || '').split('>').pop().trim(), Number(d.distance),
                   d.phone || '', d.road_address_name || d.address_name || '', d.place_url || '', AW_SWEEP[i], _awNow_(), '']);
      }
      if (!j || j.meta && j.meta.is_end) break;
      Utilities.sleep(120);
    }
  }
  rows.sort(function (a, b) { return a[2] - b[2]; });
  var sh = _awSheet_('AW_장소후보', ['상호', '카테고리', '거리(m)', '전화', '주소', '지도URL', '검색 키워드', '수집일', '검토(O 표시 → 사이트 승격)']);
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('후보 수집 완료 — ' + rows.length + '곳 (AW_장소후보 시트 · 거리순)');
}

/** ②-심화 · 최대 수집 — 반경 7km를 3×3 격자로 쪼개 셀마다 스윕한다.
 *  카카오 키워드 검색은 쿼리당 45건이 상한 → 한 점에서 한 번 쏘면 멀리 있는 곳이 잘린다.
 *  지역을 격자로 나눠 셀별로 쏘면 같은 키워드라도 훨씬 더 많은 실업체가 걸린다(보통 기본 수집의 2~3배).
 *  실행 약 3~5분. 6분 한도에 닿기 전 자동 종료(부분 결과라도 시트에 저장). */
var AW_GRID = { cells: 3, span: 0.045, cellRadius: 3500, pages: 2 };   // 3×3 · ±0.045°(약 ±5km) · 셀당 3.5km · 페이지 2
function collectDinePoolDeep() {
  var t0 = Date.now(), LIMIT = 5 * 60 * 1000;   // 5분 안전 한도(GAS 6분 제한)
  var seen = {}, rows = [], stopped = false;
  var known = {}; AW_DB_NAMES.forEach(function (n) { known[_awNorm_(n)] = true; });
  var n = AW_GRID.cells, half = (n - 1) / 2;
  for (var gy = 0; gy < n && !stopped; gy++) {
    for (var gx = 0; gx < n && !stopped; gx++) {
      var cx = (Number(AW_STUDIO.x) + (gx - half) * (AW_GRID.span / half || AW_GRID.span)).toFixed(6);
      var cy = (Number(AW_STUDIO.y) + (gy - half) * (AW_GRID.span / half || AW_GRID.span)).toFixed(6);
      for (var i = 0; i < AW_SWEEP.length && !stopped; i++) {
        for (var page = 1; page <= AW_GRID.pages; page++) {
          if (Date.now() - t0 > LIMIT) { stopped = true; break; }
          var j = _awSearchAt_(AW_SWEEP[i], cx, cy, AW_GRID.cellRadius, page);
          var docs = (j && j.documents) || [];
          for (var k = 0; k < docs.length; k++) {
            var d = docs[k];
            if (seen[d.id]) continue; seen[d.id] = true;
            if (known[_awNorm_(d.place_name)]) continue;
            rows.push([d.place_name, String(d.category_name || '').split('>').pop().trim(), _awDist_(d),
                       d.phone || '', d.road_address_name || d.address_name || '', d.place_url || '', AW_SWEEP[i], _awNow_(), '']);
          }
          if (!j || (j.meta && j.meta.is_end)) break;
          Utilities.sleep(90);
        }
      }
    }
  }
  rows.sort(function (a, b) { return a[2] - b[2]; });
  var sh = _awSheet_('AW_장소후보', ['상호', '카테고리', '거리(m)', '전화', '주소', '지도URL', '검색 키워드', '수집일', '검토(O 표시 → 사이트 승격)']);
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('심화 수집 완료 — ' + rows.length + '곳' + (stopped ? ' (시간한도 도달·부분 저장)' : '') + ' (AW_장소후보 시트 · 거리순)');
}
/** 임의 좌표 기준 검색(격자 셀용) */
function _awSearchAt_(query, x, y, radius, page) {
  var u = 'https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(query)
    + '&x=' + x + '&y=' + y + '&radius=' + (radius || 3500) + '&sort=distance&size=15&page=' + (page || 1);
  var r = UrlFetchApp.fetch(u, { headers: { Authorization: 'KakaoAK ' + _awKey_() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  try { return JSON.parse(r.getContentText()); } catch (e) { return null; }
}
/** 스튜디오 기준 직선거리(m) — 셀 검색은 distance가 셀 중심 기준이라, 정렬용으로 스튜디오 기준 재계산 */
function _awDist_(d) {
  var R = 6371000, toRad = Math.PI / 180;
  var dLat = (Number(d.y) - Number(AW_STUDIO.y)) * toRad, dLng = (Number(d.x) - Number(AW_STUDIO.x)) * toRad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Number(AW_STUDIO.y) * toRad) * Math.cos(Number(d.y) * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
