/**
 * 실험 C 측정용 빌드 타임 API 스텁. node scripts/mock-api-server.mjs [port] [corsOrigin]
 *
 * next build의 정적 프리렌더(홈 등)는 빌드 워커에서 서버 fetch를 실행하는데, 그 시점에는
 * instrumentation의 msw/node가 동작하지 않는다. 이 스텁이 같은 픽스처를 실제 HTTP로 서빙해
 * 빌드를 통과시킨다. 런타임에는 MSW(서버: instrumentation, 브라우저: worker)가 먼저 가로채므로
 * 이 서버는 빌드 타임 + MSW 미적중(bypass) 요청의 안전망이다.
 */
import { createServer } from 'node:http';
import {
  location,
  content,
  popular,
  emptySearch,
  contentLocations,
} from '../nextjs/src/mocks/fixtures.mjs';

const PORT = Number(process.argv[2] || 3999);
const CORS_ORIGIN = process.argv[3] || 'http://localhost:3100';

const ok = (data) => JSON.stringify({ status: 200, message: 'OK', data });

createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://127.0.0.1:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  res.setHeader('Content-Type', 'application/json');
  let m;
  let body;
  if (pathname === '/contents/popular') body = ok(popular());
  else if (pathname === '/contents/search') body = ok(emptySearch());
  else if ((m = pathname.match(/^\/contents\/(\d+)\/related-location$/)))
    body = ok(contentLocations(m[1]));
  else if ((m = pathname.match(/^\/contents\/(\d+)$/))) body = ok(content(Number(m[1])));
  else if ((m = pathname.match(/^\/locations\/(\d+)$/))) body = ok(location(Number(m[1])));
  else if (pathname.startsWith('/location_review/')) body = ok([]);
  else if (pathname === '/users/status') {
    res.statusCode = 401;
    body = JSON.stringify({ message: 'unauthorized' });
  } else {
    res.statusCode = 404;
    body = JSON.stringify({ message: `no mock for ${pathname}` });
  }
  console.log(`[mock-api] ${res.statusCode || 200} ${req.method} ${pathname}`);
  res.end(body);
}).listen(PORT, () => console.log(`[mock-api] listening on :${PORT}`));
