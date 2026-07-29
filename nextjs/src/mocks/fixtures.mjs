// 실험 C(next/image vs img) 측정용 고정 픽스처 — 단일 소스.
// 소비자 2곳: ① MSW 핸들러(handlers.ts, 런타임 서버/브라우저) ② scripts/mock-api-server.mjs
// (빌드 타임 정적 프리렌더용 HTTP 스텁 — instrumentation의 msw/node는 빌드 워커에서 안 돈다).
// 이미지 URL은 public/mock-assets/의 로컬 실파일. 측정 비교 가능성을 위해 응답을 바꾸지 말 것.

export const POSTERS = {
  1: '/mock-assets/k-drama-squidgame-horizontal.jpg',
  2: '/mock-assets/squidgame-spotdetail2.jpg',
  3: '/mock-assets/squidgame-spotdetail3.png',
  4: '/mock-assets/squidgame-spotdetail4.png',
};

export const location = (id) => ({
  locationId: id,
  name: `오징어게임 촬영지 ${id} (mock)`,
  address: '서울특별시 중구 세종대로 110',
  latitude: 37.5662952,
  longitude: 126.9779451,
  description: '실험 C 측정용 고정 목데이터. 백엔드 다운과 무관하게 항상 같은 화면을 만든다.',
  locationImage: '/mock-assets/squidgame-spotdetail.jpg',
  imageUrl: ['/mock-assets/squidgame-spotdetail.jpg'],
  relatedContents: [
    { contentId: 2, title: '오징어 게임 (mock)', category: 'DRAMA' },
    { contentId: 3, title: '킹덤 (mock)', category: 'DRAMA' },
    { contentId: 4, title: '기생충 (mock)', category: 'MOVIE' },
  ],
  quickFacts: [
    { label: '운영시간', value: '10:00 - 18:00' },
    { label: '입장료', value: '무료' },
  ],
});

export const content = (id) => ({
  contentId: id,
  category: 'DRAMA',
  title: `오징어 게임 ${id} (mock)`,
  releaseDate: '2021-09-17',
  posterImageUrl: POSTERS[id] ?? POSTERS[1],
  posterImageUrlVertical: '/mock-assets/squidgame-spotdetail.jpg',
  artists: [{ artistId: 1, name: '이정재' }],
});

export const popular = () => ({
  items: [1, 2, 3, 4].map((id) => ({
    contentId: id,
    category: id === 4 ? 'MOVIE' : 'DRAMA',
    title: `인기 콘텐츠 ${id} (mock)`,
    posterImageUrl: POSTERS[id],
  })),
  pagination: { currentPage: 1, totalPages: 1, totalItems: 4 },
});

export const emptySearch = () => ({
  items: [],
  pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
});

export const contentLocations = (contentId) => [
  { contentId: Number(contentId), locationId: 1, sceneDescription: '달고나 게임 장면 (mock)' },
];
