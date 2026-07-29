export const locationQueryKeys = {
  all: ['location'] as const,
  detail: (id: string | number) => [...locationQueryKeys.all, 'detail', id] as const,
  details: (ids: (string | number)[]) => [...locationQueryKeys.all, 'details', ids] as const,
} as const;
