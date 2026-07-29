import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { RrAppRouter } from './rr/RrAppRouter';
import { ErrorBoundary } from '@/shared/ui';

// 실험 D의 B안 엔트리 — App.tsx와 동일한 프로바이더 트리에 라우터만 교체
export function RrApp() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <RrAppRouter />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
