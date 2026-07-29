import { http, HttpResponse } from 'msw';
import { location, content, popular, emptySearch, contentLocations } from './fixtures.mjs';

// 실험 C 측정용 MSW 핸들러. 픽스처는 fixtures.mjs 단일 소스 (빌드 타임 스텁과 공유).
// 호스트를 와일드카드로 매칭하므로 NEXT_PUBLIC_BACKEND_URL 값과 무관하게 동작한다.

const ok = <T>(data: T) => HttpResponse.json({ status: 200, message: 'OK', data });

export const handlers = [
  http.get('*/contents/popular', () => ok(popular())),
  http.get('*/contents/search', () => ok(emptySearch())),
  http.get('*/contents/:id/related-location', ({ params }) => ok(contentLocations(params.id))),
  http.get('*/contents/:id', ({ params }) => ok(content(Number(params.id)))),
  http.get('*/locations/:id', ({ params }) => ok(location(Number(params.id)))),
  http.get('*/location_review/location/:id', () => ok([])),
  http.get('*/users/status', () => HttpResponse.json({ message: 'unauthorized' }, { status: 401 })),
];
