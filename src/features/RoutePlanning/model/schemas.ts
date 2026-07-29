import { z } from 'zod';
import { SAVE_ROUTE_MODAL } from './messages';

// 동선 저장 폼 스키마 — auth 폼과 같은 규약(실험 A): 검증 규칙·메시지의 단일 출처,
// defaults는 스키마 파일에 콜로케이트.
export const saveRouteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, SAVE_ROUTE_MODAL.VALIDATION.TITLE_REQUIRED)
    .max(SAVE_ROUTE_MODAL.LIMITS.TITLE_MAX_LENGTH),
  description: z.string().trim().max(SAVE_ROUTE_MODAL.LIMITS.DESCRIPTION_MAX_LENGTH),
});

export type SaveRouteFormData = z.infer<typeof saveRouteSchema>;

export const saveRouteDefaults: SaveRouteFormData = { title: '', description: '' };
