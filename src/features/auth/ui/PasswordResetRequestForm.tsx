import { usePasswordResetRequestForm } from '../hooks/usePasswordResetRequestForm';
import { FormTitle, FormNavigation } from '@/shared/ui';
import { RhfFieldRenderer, RhfSubmitButton } from './RhfFormControls';
import { AUTH_MESSAGES } from '../model';

export const PasswordResetRequestForm = () => {
  const { form, handleSubmit, resetRequestMutation } = usePasswordResetRequestForm();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <FormTitle>{AUTH_MESSAGES.PASSWORD_RESET_REQUEST_TITLE}</FormTitle>
        </div>

        {resetRequestMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium">{AUTH_MESSAGES.PASSWORD_RESET_REQUEST_SUCCESS}</p>
          </div>
        )}

        {resetRequestMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium">{AUTH_MESSAGES.PASSWORD_RESET_REQUEST_ERROR_TITLE}</p>
            <p className="mt-1">
              {resetRequestMutation.error instanceof Error
                ? resetRequestMutation.error.message
                : AUTH_MESSAGES.PASSWORD_RESET_REQUEST_ERROR_DEFAULT}
            </p>
          </div>
        )}

        <RhfFieldRenderer
          control={form.control}
          name="email"
          label={AUTH_MESSAGES.FIELD_LABEL_EMAIL}
          type="email"
          placeholder={AUTH_MESSAGES.FIELD_PLACEHOLDER_EMAIL}
        />

        <RhfSubmitButton
          control={form.control}
          isPending={resetRequestMutation.isPending}
          hasValues={(v) => Boolean(v.email)}
        >
          {AUTH_MESSAGES.PASSWORD_RESET_REQUEST_BUTTON}
        </RhfSubmitButton>

        <FormNavigation
          rightText={AUTH_MESSAGES.HAVE_ACCOUNT_TEXT}
          rightLink={{ to: '/auth/login', text: AUTH_MESSAGES.LOGIN_LINK }}
        />
      </form>
    </div>
  );
};
