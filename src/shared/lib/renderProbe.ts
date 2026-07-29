// 실험 B(폼 라이브러리 비교)의 리렌더 계측 프로브.
// VITE_RENDER_PROBE=1 빌드에서만 window.__renderCounts에 렌더 횟수를 누적한다
// (scripts/count-renders.mjs가 읽는다). 평소 빌드에서는 아무 것도 하지 않는다.
declare global {
  interface Window {
    __renderCounts?: Record<string, number>;
  }
}

export function useRenderProbe(name: string) {
  if (import.meta.env.VITE_RENDER_PROBE !== '1') return;
  if (typeof window === 'undefined') return;
  window.__renderCounts ??= {};
  window.__renderCounts[name] = (window.__renderCounts[name] ?? 0) + 1;
}
