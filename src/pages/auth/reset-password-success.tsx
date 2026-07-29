import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requestPasswordResetApi } from '@/entities/auth';
import { EmailSentSuccess } from '@/shared/ui';

export const Route = createFileRoute('/auth/reset-password-success')({
  component: ResetPasswordSuccessPage,
  validateSearch: z.object({ email: z.string().catch('') }),
});

function ResetPasswordSuccessPage() {
  const { email } = Route.useSearch();

  const handleResendEmail = async (email: string) => {
    await requestPasswordResetApi({ email });
  };

  return (
    <EmailSentSuccess
      email={email}
      title="비밀번호 재설정 메일 발송 완료!"
      onResend={handleResendEmail}
      showResendButton={true}
      resendButtonText="재설정 메일 재전송"
    />
  );
}
