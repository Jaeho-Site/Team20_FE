import { z } from 'zod';

// TanStack Router는 검색 파라미터 값을 JSON으로 먼저 파싱한다 — ?token=123456 은 number로 온다.
// 백엔드 이메일 링크는 따옴표 인코딩 없이 생성되므로 숫자로만 이루어진 토큰이 number가 되는데,
// z.string()만 쓰면 catch 폴백으로 조용히 비워져 인증이 차단된다 (리뷰 실측). 문자열로 복원한다.
export const searchString = z.union([z.string(), z.number().transform(String)]);
