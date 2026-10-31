import { Props } from './plan';

export const sample: Props = {
  groom: '이서준', bride: '정하윤', wedding: '2027-05-22', met: '2019-03-13', bpm: 80,
  caps: {
    cover: 'A day to remember. A life to share.',
    first: ['서로를 알기 전의 우리', '각자의 작은 시작'],
    days: ['그리고, 당신을 만났습니다', '평범해서 더 소중했던 날들', '늘 곁에 있던 마음', '함께 지나온 계절'],
    today: ['그리고 오늘,', '이제, 같은 내일로'],
    credits: ['오늘 함께해 주신 여러분', 'Our story begins now'],
  },
  photos: [
    { src: 'photos/gallery-05.jpg', w: 600, h: 600, sec: 'first' },
    { src: 'photos/gallery-03.jpg', w: 600, h: 600, sec: 'first' },
    { src: 'photos/w07-1.jpg', w: 1200, h: 1500, sec: 'today' },
    { src: 'photos/hero.jpg', w: 1600, h: 900, sec: 'today' },
    { src: 'photos/c08-2.jpg', w: 1200, h: 1500, sec: 'today' },
    { src: 'photos/w10-1.jpg', w: 1200, h: 1500, sec: 'today' },
    { src: 'photos/w02-1.jpg', w: 1200, h: 1500, sec: 'days' },
    { src: 'photos/w04-2.jpg', w: 1200, h: 1500, sec: 'days' },
    { src: 'photos/snap.jpg', w: 1400, h: 700, sec: 'days' },
    { src: 'photos/c03-2.jpg', w: 1200, h: 1500, sec: 'days' },
    { src: 'photos/c05-1.jpg', w: 1200, h: 1500, sec: 'days' },
    { src: 'photos/about.jpg', w: 1400, h: 800, sec: 'days' },
    { src: 'photos/dining.jpg', w: 1400, h: 700, sec: 'days' },
  ],
};
