// 일정(itinerary) 뮤테이션 결과 메시지 — 토스트를 띄우는 뮤테이션 훅(api/queryfn.ts)이
// 소유한다. 상위 feature(RoutePlanning)는 여기서 가져다 쓴다 (역방향 import 금지).
export const ITINERARY_MESSAGES = {
  SAVE_FAILED: '동선 저장에 실패했습니다. 다시 시도해주세요.',
  UPDATE_FAILED: '동선 수정에 실패했습니다. 다시 시도해주세요.',
  DELETE_FAILED: '동선 삭제에 실패했습니다. 다시 시도해주세요.',
  DELETE_SUCCESS: '동선이 삭제되었습니다.',
} as const;
