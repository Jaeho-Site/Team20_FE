import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/shared/lib/auth';
import { searchString } from '@/shared/lib/searchParams';

/**
 * 실험 D의 B안 — React Router 7 배선 서브셋.
 *
 * 실제 화면 바디는 재사용하지 않는다: 하위 레이어 22개 파일이 @tanstack/react-router에
 * 결합돼 있어(Link/useNavigate) 재사용하면 전면 마이그레이션이 된다 (goals.md 금지, 06 문서 §4).
 * 비교 단위는 라우트 배선(가드·검색 파라미터 검증·params 추출)이며, 바디는 파라미터를
 * 렌더하는 스텁으로 대체해 동작 스팟체크를 가능하게 한다.
 */

const tokenSearch = z.object({ token: searchString.catch('') });
const itinerarySearch = z.object({ itineraryId: searchString.optional().catch(undefined) });

// RR에는 validateSearch가 없다 — 각 라우트가 useSearchParams를 직접 파싱해야 한다
function useValidatedSearch<T>(schema: z.ZodType<T>): T {
  const [searchParams] = useSearchParams();
  return schema.parse(Object.fromEntries(searchParams));
}

// RR에는 beforeLoad·컨텍스트 가드가 없다 — 렌더 트리 래퍼로 구현한다
function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.isLoggedIn) return <Navigate to="/auth/login" replace />;
  return children;
}

function StubPage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {detail && <p data-testid="detail">{detail}</p>}
      </div>
    </div>
  );
}

function VerifyEmailRedirect() {
  const { token } = useValidatedSearch(tokenSearch);
  return <Navigate to={`/auth/verified-email?token=${encodeURIComponent(token)}`} replace />;
}

function VerifiedEmailPage() {
  const { token } = useValidatedSearch(tokenSearch);
  return <StubPage title="이메일 인증 (스텁)" detail={`token=${token}`} />;
}

function ContentMapPage() {
  // RR의 useParams는 Record<string, string | undefined> — 추론이 없어 런타임 내로잉이 필요하다
  const { contentId } = useParams();
  const { itineraryId } = useValidatedSearch(itinerarySearch);
  if (!contentId) return <Navigate to="/" replace />;
  return (
    <StubPage
      title="콘텐츠 지도 (스텁)"
      detail={`contentId=${contentId} itineraryId=${itineraryId ?? '(없음)'}`}
    />
  );
}

const router = createBrowserRouter([
  { path: '/auth/login', element: <StubPage title="로그인 (스텁)" /> },
  {
    path: '/mypage',
    element: (
      <RequireAuth>
        <StubPage title="마이페이지 (스텁)" />
      </RequireAuth>
    ),
  },
  { path: '/verify-email', element: <VerifyEmailRedirect /> },
  { path: '/auth/verified-email', element: <VerifiedEmailPage /> },
  { path: '/content/:contentId/map', element: <ContentMapPage /> },
  { path: '*', element: <StubPage title="404 (스텁)" /> },
]);

export function RrAppRouter() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <StubPage title="로딩 중..." />;
  }

  return <RouterProvider router={router} />;
}
