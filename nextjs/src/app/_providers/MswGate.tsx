'use client';

const enabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

let workerReady = false;
let workerPromise: Promise<void> | null = null;

function startWorker(): Promise<void> {
  workerPromise ??= import('@/mocks/browser')
    .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
    .then(() => {
      workerReady = true;
    });
  return workerPromise;
}

/**
 * 측정 모드에서 첫 클라이언트 fetch(React Query·AuthProvider)가 worker 기동보다
 * 먼저 나가는 race를 막는다. 하이드레이션 중 suspend는 서버 HTML을 그대로 유지하므로
 * SSR 렌더 결과(측정 대상)를 해치지 않는다. 플래그가 꺼져 있으면 아무것도 하지 않는다.
 */
export function MswGate({ children }: { children: React.ReactNode }) {
  if (enabled && typeof window !== 'undefined' && !workerReady) {
    throw startWorker();
  }
  return children;
}
