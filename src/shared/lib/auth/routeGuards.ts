import { redirect } from '@tanstack/react-router';

// FSD 참고(검토에서 보고됨): 리다이렉트 경로가 shared에 있는 것은 엄밀히는 pages의 지식이다.
// 다만 "비로그인 사용자를 어디로 보내는가"는 인증 정책으로 보고 auth 슬라이스에 유지한다.
// shared/lib/auth의 레이어 위반 정리(P4-1)와 함께 재배치를 재검토할 것.

// 라우터 컨텍스트 중 가드가 필요로 하는 부분만 구조적으로 선언한다
interface GuardContext {
  context: {
    auth: {
      isLoggedIn: boolean;
    };
  };
}

/** 로그인 필요 라우트 — 비로그인 시 로그인 페이지로 */
export const requireAuth = ({ context }: GuardContext) => {
  if (!context.auth.isLoggedIn) {
    throw redirect({ to: '/auth/login' });
  }
};

/** 비로그인 전용 라우트(로그인·가입 등) — 로그인 상태면 마이페이지로 */
export const requireGuest = ({ context }: GuardContext) => {
  if (context.auth.isLoggedIn) {
    throw redirect({ to: '/mypage' });
  }
};
