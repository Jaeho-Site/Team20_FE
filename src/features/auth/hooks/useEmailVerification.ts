import { useNavigate } from '@tanstack/react-router';
import { useEmailVerificationQuery } from '@/entities/auth';
import { AUTH_MESSAGES } from '../model/messages';
import axios from 'axios';

export type VerificationStatus = 'loading' | 'success' | 'error';

interface VerificationState {
  status: VerificationStatus;
  message: string;
}

interface UseEmailVerificationReturn extends VerificationState {
  goToLogin: () => void;
  goToHome: () => void;
}

const ERROR_MESSAGES = {
  400: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_INVALID_TOKEN,
  404: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_NOT_FOUND,
  409: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_ALREADY_VERIFIED,
  410: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_EXPIRED,
  default: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_DEFAULT,
} as const;

const getErrorMessage = (statusCode?: number, serverMessage?: string): string => {
  if (!statusCode) return ERROR_MESSAGES.default;

  const message = ERROR_MESSAGES[statusCode as keyof typeof ERROR_MESSAGES];
  return serverMessage || message || ERROR_MESSAGES.default;
};

const toState = (error: unknown): VerificationState => {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    // 이미 인증된 계정(409)은 사용자 입장에서 성공과 같다 — 기존 동작 유지
    if (statusCode === 409) {
      return { status: 'success', message: ERROR_MESSAGES[409] };
    }
    return { status: 'error', message: getErrorMessage(statusCode, error.response?.data?.message) };
  }
  if (error instanceof Error) {
    return { status: 'error', message: error.message || ERROR_MESSAGES.default };
  }
  return { status: 'error', message: ERROR_MESSAGES.default };
};

export const useEmailVerification = (token: string): UseEmailVerificationReturn => {
  const navigate = useNavigate();
  const query = useEmailVerificationQuery(token);

  const state: VerificationState = !token
    ? { status: 'error', message: AUTH_MESSAGES.EMAIL_VERIFICATION_ERROR_INVALID_TOKEN }
    : query.isPending
      ? { status: 'loading', message: '' }
      : query.isSuccess
        ? {
            status: 'success',
            message: query.data?.message || AUTH_MESSAGES.EMAIL_VERIFICATION_SUCCESS_DEFAULT,
          }
        : toState(query.error);

  const goToLogin = () => {
    navigate({ to: '/auth/login' });
  };
  const goToHome = () => {
    navigate({ to: '/' });
  };
  return {
    ...state,
    goToLogin,
    goToHome,
  };
};
