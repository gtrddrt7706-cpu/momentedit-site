/** ============================ 88 · 애프터 웨딩 장소 데이터 품질 도구 (카카오 지역검색) ============================
 * 목적: 다이닝/애프터 웨딩 추천의 데이터 층을 "지도에 등록된 실업체" 기준으로 검증·확장한다.
 *   ① auditDineDb()    — 사이트 DINE_DB(현 50곳)를 카카오 지도에서 1:1 대조 → 'AW_장소검증' 시트
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
  '산이화 한정식', '모담 라피아노 삼송', '화정가든 보리굴비',
  '능원숯불갈비 용두동본점', '강강술래 늘봄농원점', '갈비도락 서오릉점',
  '한우만 서오릉점', '왕릉일가', '더담청송',
  '원당쇠고기국밥', '곤지암할매소머리국밥 도내점', '보광족발',
  '쿠우쿠우 삼송원흥점', '앤드테라스 내유점', '포레스트피크닉카페',
  '메종드테라스', '나인블럭 FARM 고양', '경성빵공장 서오릉점',
  '리비토 향동', '연화수 한정식', '원당골',
  '김명주뜰안채밥상 원당점', '한짝 원흥점', '착한우리한우정육식당',
  '곰작골가마솥곰탕', '명동칼국수 고양원흥점', '가장맛있는족발 삼송점',
  '민쿡다시마', '디오름', '신디스 삼송',
  '37.5 고양삼송점', '소란 원흥', '라플란드 원흥점',
  '서오릉카페', '덕승재 상암본점', '창고43 상암점',
  '송추가마골 은평2호점', '아내의휴일', '만포면옥 본점',
  '봉화설렁탕', '소담촌 화정점', '하루노호시 행신점',
  '미송샤브샤브 화정점', '효교 향동', '어수지락 연신내직영점',
  '애슐리퀸즈 롯데몰은평점', '덕암 연잎밥',
];

/** ① 기존 리스트 전수 검증 — GAS 편집기에서 실행(약 1분) */
function auditDineDb() {
  var rows = [], found = 0, fuzzy = 0, missing = 0;
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
    if (best && exact) found++; else if (best) fuzzy++; else missing++;
    rows.push([name, best ? best.place_name : '', status, best ? Number(best.distance) : '', best ? best.phone : '',
               best ? (best.road_address_name || best.address_name) : '', best ? best.place_url : '', _awNow_()]);
    Utilities.sleep(120);
  }
  var sh = _awSheet_('AW_장소검증', ['사이트 상호', '지도 매칭 상호', '판정', '거리(m)', '전화', '주소', '지도URL', '확인일']);
  if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('검증 완료 — 일치 ' + found + ' · 유사 ' + fuzzy + ' · 미발견 ' + missing + ' (AW_장소검증 시트)');
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
