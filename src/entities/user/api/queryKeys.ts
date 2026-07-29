// 마이페이지(내 정보 + 내 일정 목록) 쿼리 키. 키 값('mypage')은 기존 인라인 리터럴과
// 동일하게 유지한다 — 값이 바뀌면 기존 invalidation과 어긋난다.
export const mypageKeys = {
  all: ['mypage'] as const,
} as const;
