import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { searchString } from '@/shared/lib/searchParams';
import { useEmailVerification } from '@/features/auth';
import { EmailVerificationStatus } from '@/features/auth';

export const Route = createFileRoute('/auth/verified-email')({
  component: VerifyEmailPage,
  validateSearch: z.object({ token: searchString.catch('') }),
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const { status, message, goToLogin, goToHome } = useEmailVerification(token);

  return (
    <EmailVerificationStatus
      status={status}
      message={message}
      onGoToLogin={goToLogin}
      onGoToHome={goToHome}
    />
  );
}
