import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate, Easing, random, delayRender, continueRender } from 'remotion';
import { plan, Props, Seg, Photo, OVERLAP, FPS } from './plan';

// 모먼트에디트 브랜드 — 크림 종이 · 먹색 · 딥 버밀리언(로고 이중 선) · 골드는 장식 선만
const C = { paper: '#F5F1EA', paper2: '#EFE9DF', ink: '#1C1B19', sub: '#5A554C', seal: '#6B2A24', gold: '#B89A75', goldText: '#7A5F37', dark: '#12100E' };
const SERIF = "'Cormorant Garamond', 'Noto Serif KR', serif";
const KO = "'Noto Serif KR', 'Noto Serif CJK KR', serif";
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const src = (p: Photo) => (/^(https?:|data:)/.test(p.src) ? p.src : staticFile(p.src));

const fmt = (ymd?: string) => { const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}. ${m[2]}. ${m[3]}` : ''; };

function useFonts() {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 40px "Cormorant Garamond"', 'THE WEDDING OF 0123456789'),
      document.fonts.load('italic 400 40px "Cormorant Garamond"', 'Our story begins now'),
      document.fonts.load('500 40px "Noto Serif KR"', '이서준정하윤처음우리의날들오늘그리고당신을만났습니다'),
    ]).then(() => document.fonts.ready).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
}

// 필름 입자 — 프레임마다 씨앗을 바꿔 살짝 움직인다(튀지 않게 옅게)
const Grain: React.FC<{ o?: number }> = ({ o = 0.07 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 12;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: o, mixBlendMode: 'multiply' }}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

const Paper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, ${C.paper} 0%, ${C.paper} 55%, ${C.paper2} 100%)` }}>
    {children}
    <Grain o={0.06} />
  </AbsoluteFill>
);

// 로고와 같은 이중 헤어라인 틀
const Frame: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <AbsoluteFill style={{ opacity: o, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 56, border: `1.5px solid ${C.seal}` }} />
    <div style={{ position: 'absolute', inset: 66, border: `1px solid ${C.seal}`, opacity: 0.7 }} />
  </AbsoluteFill>
);

// 들어오고 나가는 공통 — 앞 장면과 OVERLAP 만큼 겹쳐 녹아든다
// 들어오는 장면만 녹아든다(나가는 장면은 그 아래 그대로) — 둘 다 옅어지면 가운데서 검게 꺼진다
function fadeIO(f: number, _dur: number, _inLen = OVERLAP) {
  return interpolate(f, [0, OVERLAP], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
}

const Open: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const flick = 0.05 + random(`fl${Math.floor(f / 2)}`) * 0.07;
  const o = interpolate(f, [dur - 6, dur + OVERLAP], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#000', opacity: o }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,236,205,${flick}) 0%, rgba(0,0,0,0) 60%)` }} />
      <Grain o={0.18} />
    </AbsoluteFill>
  );
};

// 날짜 넘김 — 처음 만난 날에서 예식 날로 숫자가 한 자리씩 넘어간다(선택 입력)
const Odometer: React.FC<{ from?: string; to: string; start: number; size: number }> = ({ from, to, start, size }) => {
  const f = useCurrentFrame();
  const A = fmt(from || to), B = fmt(to);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', fontFamily: SERIF, fontSize: size, color: C.ink, letterSpacing: '0.08em', lineHeight: 1 }}>
      {B.split('').map((ch, i) => {
        const a = A[i] || ch;
        if (a === ch || !/\d/.test(ch)) return <span key={i} style={{ display: 'inline-block', minWidth: /\d/.test(ch) ? size * 0.52 : undefined, textAlign: 'center' }}>{ch}</span>;
        const p = interpolate(f, [start + i * 2.2, start + i * 2.2 + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
        return (
          <span key={i} style={{ display: 'inline-block', minWidth: size * 0.52, height: size * 1.05, overflow: 'hidden', position: 'relative', textAlign: 'center' }}>
            {/* 옛 숫자는 꼬리(9 · 3 의 내림)가 창에 남지 않게 더 멀리 올리고 흐리게 보낸다 */}
            <span style={{ position: 'absolute', left: 0, right: 0, top: -p * size * 1.6, opacity: 1 - Math.min(1, p * 1.4) }}>{a}</span>
            <span style={{ position: 'absolute', left: 0, right: 0, top: (1 - p) * size * 1.6, opacity: Math.min(1, p * 1.6) }}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};

const Cover: React.FC<{ s: Extract<Seg, { kind: 'cover' }>; p: Props }> = ({ s, p }) => {
  const f = useCurrentFrame();
  const o = fadeIO(f, s.dur, 18);
  const split = Math.round(s.dur * 0.46); // 앞 절반 = 글자 표지 · 뒤 = 사진 표지
  const aO = interpolate(f, [split - 8, split + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bO = interpolate(f, [split, split + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const up = (d: number) => interpolate(f, [d, d + 22], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const op = (d: number) => interpolate(f, [d, d + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const label = p.met ? (f < 34 ? 'FIRST MET' : 'OUR WEDDING DAY') : 'OUR WEDDING DAY';
  const lblO = p.met ? Math.min(op(6), interpolate(f, [28, 34, 40, 48], [1, 0, 0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) : op(20);
  const ph = s.photo;
  const pa = ph ? ph.w / ph.h : 0.8;
  const PH = 860, PW = Math.min(980, PH * pa);
  const zoom = interpolate(f, [split, s.dur + OVERLAP], [1.06, 1.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Paper>
        <Frame o={op(0)} />
        <AbsoluteFill style={{ opacity: aO, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: '0.42em', color: C.seal, opacity: op(4), transform: `translateY(${up(4)}px)`, marginBottom: 44 }}>THE WEDDING OF</div>
          <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 104, letterSpacing: '0.06em', color: C.ink, opacity: op(10), transform: `translateY(${up(10)}px)` }}>{p.groom}<span style={{ fontFamily: SERIF, fontWeight: 400, color: C.gold, margin: '0 0.42em', fontSize: 84 }}>&amp;</span>{p.bride}</div>
          <div style={{ width: 90, height: 1.5, background: C.seal, margin: '48px 0 40px', opacity: op(16) }} />
          <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.36em', color: C.goldText, opacity: lblO, marginBottom: 18 }}>{label}</div>
          <div style={{ opacity: op(14), transform: `translateY(${up(14)}px)` }}><Odometer from={p.met} to={p.wedding} start={34} size={58} /></div>
        </AbsoluteFill>
        {ph && (
          <AbsoluteFill style={{ opacity: bO }}>
            <div style={{ position: 'absolute', left: 150, top: (1080 - PH) / 2, width: PW, height: PH, overflow: 'hidden', boxShadow: '0 18px 50px rgba(28,27,25,0.16)' }}>
              <Img src={src(ph)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
            </div>
            <div style={{ position: 'absolute', left: 150 + PW + 90, right: 150, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: '0.42em', color: C.seal, marginBottom: 34 }}>THE WEDDING OF</div>
              <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 80, lineHeight: 1.25, color: C.ink, letterSpacing: '0.04em' }}>{p.groom}<br /><span style={{ fontFamily: SERIF, color: C.gold, fontSize: 64 }}>&amp;</span><br />{p.bride}</div>
              <div style={{ width: 70, height: 1.5, background: C.seal, margin: '40px 0 30px' }} />
              <div style={{ fontFamily: SERIF, fontSize: 42, letterSpacing: '0.1em', color: C.ink }}>{fmt(p.wedding)}</div>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 36, color: C.goldText, marginTop: 26 }}>{p.caps.cover}</div>
            </div>
          </AbsoluteFill>
        )}
      </Paper>
    </AbsoluteFill>
  );
};

const CH: Record<string, [string, string]> = { first: ['처음', 'The Beginning'], days: ['우리의 날들', 'Our Days'], today: ['오늘', 'Today'] };
const Card: React.FC<{ s: Extract<Seg, { kind: 'card' }> }> = ({ s }) => {
  const f = useCurrentFrame();
  const o = fadeIO(f, s.dur, 16);
  const op = (d: number) => interpolate(f, [d, d + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const ls = interpolate(f, [0, s.dur], [0.5, 0.42], { extrapolateRight: 'clamp' });
  const [ko, en] = CH[s.sec];
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Paper>
        <Frame />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontFamily: SERIF, fontSize: 28, letterSpacing: `${ls}em`, color: C.seal, opacity: op(2) }}>CHAPTER {String(s.no).padStart(2, '0')}</div>
          <div style={{ width: 1.5, height: 70, background: C.seal, margin: '34px 0', opacity: op(6) }} />
          <div style={{ fontFamily: KO, fontWeight: 500, fontSize: 84, letterSpacing: '0.08em', color: C.ink, opacity: op(8) }}>{ko}</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 34, color: C.goldText, marginTop: 20, opacity: op(14) }}>{en}</div>
        </AbsoluteFill>
      </Paper>
    </AbsoluteFill>
  );
};

// 매거진 펼침면 — 사진 방향 그대로(자르지 않는다) 한 줄에 모아 보이고, 여러 장이면 한 장씩 크게 이어 본다
// (사장님 11/01 «추천» · 장면 3~5초 · 사진 크게 — 사진 수와 전체 길이는 그대로)
type Rect = { x: number; y: number; w: number; h: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpR = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const FEAT_TOP = 132, FEAT_BOTTOM = 92; // 크게 볼 때 위(머리글 아래) · 아래 여백
function featRect(asp: number): Rect {
  const maxH = 1080 - FEAT_TOP - FEAT_BOTTOM, maxW = 1920 - 220;
  let h = maxH, w = h * asp;
  if (w > maxW) { w = maxW; h = w / asp; }
  return { x: (1920 - w) / 2, y: FEAT_TOP + (maxH - h) / 2, w, h };
}
const Spread: React.FC<{ s: Extract<Seg, { kind: 'spread' }>; p: Props }> = ({ s, p }) => {
  const f = useCurrentFrame();
  const o = fadeIO(f, s.dur, 16);
  const gap = 30, top = 136, bottom = 176, side = 130;
  const boxW = 1920 - side * 2, boxH = 1080 - top - bottom;
  const k = s.photos.length;
  const asp = s.photos.map((x) => x.w / x.h);
  const H = Math.min(boxH, (boxW - gap * (k - 1)) / asp.reduce((a, b) => a + b, 0));
  const widths = asp.map((a) => a * H);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (k - 1);
  const gy = top + (boxH - H) / 2;
  let gx = (1920 - totalW) / 2;
  const grid: Rect[] = widths.map((w) => { const r = { x: gx, y: gy, w, h: H }; gx += w + gap; return r; });
  // 시간 나눔 — 모아 보기(약 4할 · 최소 3초) 뒤 한 장씩(장마다 최소 2.2초 · 모자라면 모아 보기만)
  const total = s.dur + OVERLAP;
  const gridEnd = Math.max(90, Math.round(s.dur * 0.42));
  const flen = k >= 2 ? (total - gridEnd) / k : 0;
  const feat = k >= 2 && flen >= 66;
  const j = feat && f >= gridEnd ? Math.min(k - 1, Math.floor((f - gridEnd) / flen)) : -1; // 지금 크게 보는 사진
  const c0 = 18 + (k - 1) * 22; // 사진이 다 들어온 뒤 캡션
  const capIn = interpolate(f, [c0, c0 + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const capOut = feat ? interpolate(f, [gridEnd - 6, gridEnd + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const capY = interpolate(f, [c0, c0 + 22], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const warm = s.sec === 'first' ? 'sepia(0.22) saturate(0.86) contrast(0.98)' : 'none';
  const slide = interpolate(f, [s.dur - 4, s.dur + OVERLAP], [0, -40], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const order = s.photos.map((_, i) => i).sort((a, b) => (a === j ? 1 : 0) - (b === j ? 1 : 0)); // 크게 보는 사진을 맨 위에
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Paper>
        <div style={{ position: 'absolute', left: side, top: 62, fontFamily: SERIF, fontSize: 21, letterSpacing: '0.34em', color: C.goldText }}>THE WEDDING OF</div>
        <div style={{ position: 'absolute', right: side, top: 58, fontFamily: KO, fontSize: 20, letterSpacing: '0.16em', color: C.sub }}>{p.groom} · {p.bride}</div>
        <div style={{ position: 'absolute', left: side, right: side, top: 100, height: 1, background: C.gold, opacity: 0.55 }} />
        <div style={{ transform: `translateX(${slide}px)`, position: 'absolute', inset: 0 }}>
          {order.map((i) => {
            const ph = s.photos[i];
            const d = i * 22; // 한 장씩 차례로(0.7초 간격)
            let r = grid[i];
            let po = interpolate(f, [d, d + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
            let py = interpolate(f, [d, d + 22], [26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
            let z = interpolate(f, [0, total], [1.0, 1.045]);
            if (j >= 0) {
              const t0 = gridEnd + flen * i; // 이 사진이 크게 시작하는 때
              const fr = featRect(asp[i]);
              py = 0;
              if (i === 0) {
                // 첫 장 — 모아 보기 자리에서 크게 자란다
                const g = interpolate(f, [gridEnd, gridEnd + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
                r = lerpR(grid[0], fr, g);
                po = j === 0 || f < t0 + flen + 14 ? 1 : 0;
              } else if (i < j || (i === j - 1)) {
                po = f < gridEnd + flen * (i + 1) + 14 ? 1 : 0; r = fr; // 다음 장이 덮을 동안만 아래에 남는다
              } else if (i === j) {
                po = interpolate(f, [t0, t0 + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
                const sx = interpolate(f, [t0, t0 + 20], [44, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
                r = { ...fr, x: fr.x + sx };
              } else {
                // 아직 차례가 아닌 사진 — 모아 보기 자리에서 사라진다
                po = interpolate(f, [gridEnd, gridEnd + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              }
              z = interpolate(f, [t0, t0 + flen + 14], [1.0, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            }
            if (po <= 0) return null;
            return (
              <div key={i} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, overflow: 'hidden', opacity: po, transform: `translateY(${py}px)`, boxShadow: '0 14px 38px rgba(28,27,25,0.13)' }}>
                <Img src={src(ph)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: warm }} />
              </div>
            );
          })}
        </div>
        {s.cap && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 84, textAlign: 'center', fontFamily: KO, fontSize: 40, letterSpacing: '0.04em', color: C.ink, opacity: Math.min(capIn, capOut), transform: `translateY(${capY}px)` }}>{s.cap}</div>}
        <div style={{ position: 'absolute', right: side, bottom: 52, fontFamily: SERIF, fontSize: 22, letterSpacing: '0.2em', color: C.goldText }}>P. {String(s.folio).padStart(2, '0')}</div>
      </Paper>
    </AbsoluteFill>
  );
};

// 오늘 — 어두운 영화 화면 · 레터박스 · 느린 다가감 · 흑백 한 컷 · 세로 사진은 흐린 바탕 위에 자르지 않고
const Today: React.FC<{ s: Extract<Seg, { kind: 'today' }> }> = ({ s }) => {
  const f = useCurrentFrame();
  const o = fadeIO(f, s.dur, 18);
  const ph = s.photo, land = ph.w / ph.h > 1.15;
  const z = interpolate(f, [0, s.dur + OVERLAP], [1.0, 1.06]);
  const bar = 100;
  // 첫 컷 = 장 제목(종이 카드 대신 · 흑백 영화 위 가는 이탤릭 · 릴스 참고) → 제목이 걷힌 뒤 캡션
  const tIn = 8, tOut = 92;
  const tO = s.title ? interpolate(f, [tIn, tIn + 20, tOut - 18, tOut], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const c0 = s.title ? tOut + 4 : 20;
  const capO = interpolate(f, [c0, c0 + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const filt = s.bw ? 'grayscale(1) contrast(1.06)' : 'none';
  const h = 1080 - bar * 2, w = Math.min(1920, h * (ph.w / ph.h));
  return (
    <AbsoluteFill style={{ opacity: o, background: C.dark }}>
      {land ? (
        <Img src={src(ph)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: filt }} />
      ) : (
        <>
          <Img src={src(ph)} style={{ position: 'absolute', inset: -80, width: 'calc(100% + 160px)', height: 'calc(100% + 160px)', objectFit: 'cover', filter: `blur(46px) brightness(0.42) ${s.bw ? 'grayscale(1)' : ''}` }} />
          <div style={{ position: 'absolute', left: (1920 - w) / 2, top: bar, width: w, height: h, overflow: 'hidden' }}>
            <Img src={src(ph)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: filt }} />
          </div>
        </>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000' }} />
      {s.title && (
        <AbsoluteFill style={{ background: `rgba(10,9,8,${0.42 * tO})`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: tO }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: '0.46em', color: C.gold, marginBottom: 26 }}>CHAPTER {String(s.no).padStart(2, '0')}</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 104, color: '#F3EDE3', letterSpacing: '0.01em', lineHeight: 1 }}>Our wedding day</div>
          <div style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: '0.34em', color: '#E9E1D4', marginTop: 30 }}>{s.date}</div>
        </AbsoluteFill>
      )}
      {s.cap && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KO, fontSize: 36, letterSpacing: '0.06em', color: '#F2EDE4', opacity: capO }}>{s.cap}</div>}
      <Grain o={0.05} />
    </AbsoluteFill>
  );
};

// 크레딧 — 영화처럼 한 묶음씩 · 마지막 «Our story begins now» 뒤 암전(이어서 나레이션 «영상 받는 말»)
const Credits: React.FC<{ s: Extract<Seg, { kind: 'credits' }>; p: Props }> = ({ s, p }) => {
  const f = useCurrentFrame();
  const inO = interpolate(f, [0, OVERLAP], [0, 1], { extrapolateRight: 'clamp' });
  const D = s.dur;
  const groups: React.ReactNode[] = [
    (<><div style={lbl}>STARRING</div><div style={nm}>신랑 &nbsp;{p.groom}</div><div style={nm}>신부 &nbsp;{p.bride}</div></>),
    (<><div style={lbl}>WITH</div><div style={nm}>{p.caps.credits[0] || '오늘 함께해 주신 여러분'}</div></>),
    (<div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 50, color: '#EDE6DA' }}>Thank you for being here</div>),
  ];
  const finalAt = Math.round(D * 0.62);
  const span = finalAt / groups.length;
  const endO = interpolate(f, [D - 34, D - 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fin = interpolate(f, [finalAt, finalAt + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return (
    <AbsoluteFill style={{ background: '#0E0D0B', opacity: inO }}>
      {groups.map((g, i) => {
        const a = i * span;
        const go = interpolate(f, [a + 6, a + 24, a + span - 18, a + span - 2], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return <AbsoluteFill key={i} style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: go, gap: 18 }}>{g}</AbsoluteFill>;
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: Math.min(fin, endO) }}>
        <div style={{ width: 80, height: 1, background: C.gold, marginBottom: 40, opacity: 0.8 }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 92, color: '#F3EDE3', letterSpacing: '0.02em' }}>{p.caps.credits[1] || 'Our story begins now'}</div>
        <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: '0.4em', color: C.gold, marginTop: 40 }}>{fmt(p.wedding)}</div>
      </AbsoluteFill>
      <Grain o={0.08} />
    </AbsoluteFill>
  );
};
const lbl: React.CSSProperties = { fontFamily: SERIF, fontSize: 26, letterSpacing: '0.46em', color: C.gold, marginBottom: 16 };
const nm: React.CSSProperties = { fontFamily: KO, fontSize: 52, letterSpacing: '0.08em', color: '#F1EBE0', fontWeight: 400 };

export const Editorial: React.FC<Props> = (p) => {
  useFonts();
  const { segs } = plan(p);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {segs.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur + OVERLAP} layout="none">
          <AbsoluteFill>
            {s.kind === 'open' && <Open dur={s.dur} />}
            {s.kind === 'cover' && <Cover s={s} p={p} />}
            {s.kind === 'card' && <Card s={s} />}
            {s.kind === 'spread' && <Spread s={s} p={p} />}
            {s.kind === 'today' && <Today s={s} />}
            {s.kind === 'credits' && <Credits s={s} p={p} />}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
export { FPS };
