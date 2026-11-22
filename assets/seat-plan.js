/* ★★[SEAT_PLAN_9 2026-11-22 사장님 «추천대로 적용» · «우리가 그린 그림이랑 다르잖아» · «디테일 챙겨»]
   캔들존 확정 배치 — 원형 테이블 9개(좌 4 · 우 5)를 맞붙여 구불구불 이은 두 묶음 · 35석(혼주 4석 포함) · 단상 없음.
   오프라인 디자인 방이 그린 시안(디자인 캔버스 «하객 좌석 배치 화면»)의 좌표를 그대로 옮겼다.
   좌석 편집기(mypage) · 하객 좌석표(seat.html 전체 · 내 자리만) · 하객 안내(guide.html 내 자리) · 관리자 프린트(admin.html)가
   이 한 파일로 같은 그림을 그린다 — 테이블 위치 · 자리 위치 · 번호 · 혼주석을 화면마다 따로 적지 않는다([COURSE_WIDE]).
   ★좌표 단위는 m · x = 버진로드 가운데 선에서의 거리(왼쪽 −) · y = 앞벽(신랑 신부 쪽)에서의 거리.
     테이블 지름 1.5m(이웃 테이블과 맞닿음) · 자리는 테이블 중심에서 1.08m · 버진로드 폭 1.2m.
   ★그림 크기는 CSS 변수 --m(1m 가 몇 px 인가) 하나로 정한다 — 화면마다 그 값만 다르다.
   ★옛 좌석표(6테이블 등)는 migrate 로 이 배치에 옮겨 그린다(이름 · 음료 · 의자 · 테이블 이름은 번호 순서대로 따라온다). */
(function(w){
  // 테이블 중심 — 행(row)은 그 쪽 열의 위에서부터 순번(좌 0 ~ 3 = 1 ~ 4번 · 우 0 ~ 4 = 5 ~ 9번)
  var TBL = {
    L: [ [-2.15, 4.90], [-2.95, 6.17], [-2.15, 7.44], [-2.95, 8.71] ],
    R: [ [ 2.15, 4.90], [ 2.95, 6.17], [ 2.15, 7.44], [ 2.95, 8.71], [ 1.95, 9.85] ]
  };
  // 자리 — 테이블마다 12시에서 시계 방향 순 · f = 혼주석(맨 앞 테이블 통로 쪽 두 자리)
  var SEAT = {
    L: [
      [ [-1.31, 4.22, 1], [-1.11, 5.18], [-1.76, 5.91], [-3.06, 4.32], [-2.20, 3.82, 1] ],
      [ [-3.34, 5.16], [-3.79, 6.85], [-3.99, 5.89] ],
      [ [-1.43, 6.64], [-1.08, 7.55], [-1.61, 8.38] ],
      [ [-1.99, 9.20], [-2.78, 9.78], [-3.71, 9.47], [-4.02, 8.54], [-3.34, 7.70] ]
    ],
    R: [
      [ [ 2.88, 4.10], [ 1.21, 5.44], [ 1.17, 4.46, 1], [ 1.92, 3.84, 1] ],
      [ [ 3.34, 5.16], [ 3.99, 5.89], [ 3.79, 6.85], [ 1.87, 6.22] ],
      [ [ 3.23, 7.49], [ 1.28, 8.08], [ 1.14, 7.05] ],
      [ [ 3.86, 8.13], [ 3.96, 9.10], [ 3.23, 9.75] ],
      [ [ 2.79, 10.53], [ 1.90, 10.93], [ 1.04, 10.43], [ 0.94, 9.46], [ 1.72, 8.79] ]
    ]
  };
  var Y0 = 3.42, MAP_W = 9.3, MAP_H = 7.86;   // 그림 상자(m) — 맨 위 자리(3.82) · 맨 아래 자리(10.93) · 양 끝 자리(±4.02)에 알약 반폭 여유
  function sd(t){ return String((t && t.side) || 'L') === 'R' ? 'R' : 'L'; }
  function rows(tables){   // 배열 순서 → 각 테이블의 (쪽, 행)
    var li = 0, ri = 0;
    return (tables || []).map(function(t){ var s = sd(t); return { s: s, r: (s === 'R') ? ri++ : li++ }; });
  }
  function px(x, y){ return 'left:calc(50% + ' + x.toFixed(2) + ' * var(--m));top:calc(' + (y - Y0).toFixed(2) + ' * var(--m))'; }
  var P = {
    SEATS: 35, FAMILY: 4,
    COUNTS: { L: [5, 3, 3, 5], R: [4, 4, 3, 3, 5] },
    isFamily: function(s, row, n, i){
      var a = (SEAT[s === 'R' ? 'R' : 'L'] || [])[row];
      return !!(a && a.length === n && a[i] && a[i][2]);
    },
    // 표시 번호 — 좌측 위에서부터 1 ~ 4, 이어서 우측 5 ~ 9 (확정 기록 · 서버 검색 _seatRowNum 과 한 벌)
    numbers: function(tables){
      var num = {}, nn = 1;
      (tables || []).forEach(function(t, i){ if(sd(t) === 'L') num[i] = nn++; });
      (tables || []).forEach(function(t, i){ if(sd(t) === 'R') num[i] = nn++; });
      return num;
    },
    fresh: function(){
      var out = [], k = 0;
      ['L', 'R'].forEach(function(s){
        P.COUNTS[s].forEach(function(c){
          var seats = [], drinks = []; for(var j = 0; j < c; j++){ seats.push(''); drinks.push(''); }
          k++; out.push({ name: '테이블 ' + k, side: s, seats: seats, drinks: drinks });
        });
      });
      return out;
    },
    // 확정 배치 모양인가 — 배열 순서가 좌 4 · 우 5(좌가 먼저)이고 행마다 자리 수가 같다
    fits: function(tables){
      var a = (tables || []).map(function(t){ return sd(t) + ((t && t.seats) || []).length; }).join();
      return a === 'L5,L3,L3,L5,R4,R4,R3,R3,R5';
    },
    migrate: function(tables){
      if(P.fits(tables)) return tables;
      var old = tables || [], num = P.numbers(old), order = old.map(function(t, i){ return i; });
      order.sort(function(a, b){ return (num[a] || 0) - (num[b] || 0); });
      var nu = P.fresh(), spill = [];
      function put(dst, j, e){ dst.seats[j] = e.n; dst.drinks[j] = e.d; if(e.c){ dst.chair = dst.chair || dst.seats.map(function(){ return ''; }); dst.chair[j] = e.c; } }
      order.forEach(function(oi, k){
        var t = old[oi] || {}, dst = nu[k], s = t.seats || [], d = t.drinks || [], c = t.chair || [];
        var nm = String(t.name || '').trim();
        if(dst && nm && !/^테이블\s*\d+$/.test(nm)) dst.name = nm;
        for(var j = 0; j < s.length; j++){
          if(!String(s[j] || '').trim()) continue;
          var e = { n: s[j], d: d[j] || '', c: c[j] || '' }, free = dst ? dst.seats.indexOf('') : -1;
          if(free >= 0) put(dst, free, e); else spill.push(e);
        }
      });
      spill.forEach(function(e){ for(var k = 0; k < nu.length; k++){ var f = nu[k].seats.indexOf(''); if(f >= 0){ put(nu[k], f, e); return; } } });
      return nu;
    },
    /* 배치도 HTML — 각 화면은 «테이블 안에 넣을 것»(o.table) · «자리 하나에 넣을 것»(o.seat)만 준다.
       o.table(t, i, no, row) → 원 안 html · o.seat(t, i, si, fam, row) → 자리 html('' 이면 그리지 않음)
       o.cls(t, i) → 테이블 원에 더할 class · o.attr(t, i) → 더할 속성 · o.aisle(false) → 버진로드 글자 없이 · o.sides ['좌측', '우측'] → 그림 안 좌 · 우 이름표 · 그림 상자 폭 · 높이는 --m 으로 정해진다. */
    mapHtml: function(tables, o){
      o = o || {}; tables = tables || [];
      var rw = rows(tables), num = P.numbers(tables), T = '', S = '';
      tables.forEach(function(t, i){
        var s = rw[i].s, r = rw[i].r, c = (TBL[s] || [])[r]; if(!c) return;
        var seats = (t && t.seats) || [], geo = (SEAT[s] || [])[r] || [];
        T += '<div class="smap-t' + (o.cls ? (' ' + (o.cls(t, i) || '')) : '') + '"' + (o.attr ? (' ' + (o.attr(t, i) || '')) : '') + ' style="' + px(c[0], c[1]) + '">' + (o.table ? o.table(t, i, num[i], r) : num[i]) + '</div>';
        for(var j = 0; j < seats.length; j++){
          var g = geo[j]; if(!g || geo.length !== seats.length){   // 자리 수가 확정과 다르면 반 칸 회전으로 둘러 그린다(옛 데이터 방어)
            var off = 180 / (seats.length || 1), a = (-90 + off + j * (360 / (seats.length || 1))) * Math.PI / 180;
            g = [c[0] + Math.cos(a) * 1.08, c[1] + Math.sin(a) * 1.08, 0];
          }
          var h = o.seat ? o.seat(t, i, j, !!g[2], r) : ''; if(!h) continue;
          S += '<div class="smap-s" style="' + px(g[0], g[1]) + '">' + h + '</div>';
        }
      });
      var sides = o.sides ? ('<div class="smap-side" style="' + px(-3.7, 3.58) + '">' + o.sides[0] + '</div><div class="smap-side" style="' + px(3.7, 3.58) + '">' + o.sides[1] + '</div>') : '';   // 좌 · 우 이름표 — 그림과 함께 밀리게 그림 안(바깥 위 모서리)에 둔다
      return '<div class="smap">' + sides + '<div class="smap-aisle" aria-hidden="true">' + (o.aisle === false ? '' : '<span>버진로드</span>') + '</div>' + T + S + '</div>';
    }
  };
  /* 공용 뼈대 CSS — 위치와 크기(--m)만 · 알약 · 글자 모양은 각 화면의 제 class 가 정한다 */
  try {
    var css = '.smap{position:relative;margin:0 auto;width:calc(' + MAP_W + ' * var(--m));height:calc(' + MAP_H + ' * var(--m));flex:none}'
      + '.smap-aisle{position:absolute;top:0;bottom:0;left:calc(50% - .6 * var(--m));width:calc(1.2 * var(--m));box-sizing:border-box;border:1px dashed #DDD8D1;border-radius:calc(.6 * var(--m));background:rgba(184,154,117,.07)}'
      + '.smap-aisle span{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);writing-mode:vertical-rl;font-size:10px;letter-spacing:.45em;color:#8C7350;white-space:nowrap}'
      + '.smap-t{position:absolute;width:calc(1.5 * var(--m));height:calc(1.5 * var(--m));transform:translate(-50%,-50%);box-sizing:border-box;border-radius:50%;background:#FFFFFF;border:1.5px solid #C9AE8E;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;z-index:1}'
      + '.smap-s{position:absolute;transform:translate(-50%,-50%);z-index:2}'
      + '.smap-side{position:absolute;transform:translate(-50%,-50%);font-size:10.5px;letter-spacing:.08em;color:#9A7B4F;white-space:nowrap;z-index:1}'
      + '.smap-side i{font-style:normal;color:#A49D8E;margin:0 2px}'
      + '.smap-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}'
      + '.smap-scroll::-webkit-scrollbar{display:none}';
    P.CSS = css;   // 인쇄 문서(admin 좌석표 프린트)처럼 이 페이지 밖에서 그릴 때 함께 싣는다
    var st = document.createElement('style'); st.setAttribute('data-seat-plan', ''); st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}
  w.ME_SEAT_PLAN = P;
})(window);
