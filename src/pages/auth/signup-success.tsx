import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requireGuest } from '@/shared/lib/auth';
import { resendVerificationEmailApi } from '@/entities/auth';
import { EmailSentSuccess } from '@/shared/ui';

export const Route = createFileRoute('/auth/signup-success')({
  component: SignupSuccessPage,
  beforeLoad: requireGuest,
  validateSearch: z.object({ email: z.string().catch('') }),
});

function SignupSuccessPage() {
  const { email } = Route.useSearch();

  const handleResendEmail = async (email: string) => {
    await resendVerificationEmailApi({ email });
  };

  return (
    <EmailSentSuccess
      email={email}
      title="이메일 발송 완료!"
      onResend={handleResendEmail}
      showResendButton={true}
      resendButtonText="인증 메일 재전송"
    />
  );
}
