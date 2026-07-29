import { usePasswordResetForm } from '../hooks/usePasswordResetForm';
import { FormTitle, FormNavigation } from '@/shared/ui';
import { RhfFieldRenderer, RhfSubmitButton } from './RhfFormControls';
import { PASSWORD_RESET_FIELDS, AUTH_MESSAGES } from '../model';

interface PasswordResetFormProps {
  token: string;
}

export const PasswordResetForm = ({ token }: PasswordResetFormProps) => {
  const { form, handleSubmit, resetMutation } = usePasswordResetForm(token);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  // 성공 시 성공 메시지만 표시
  if (resetMutation.isSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-12">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {AUTH_MESSAGES.PASSWORD_RESET_SUCCESS_TITLE}
        </h2>
        <p className="text-gray-600 mb-2">{AUTH_MESSAGES.PASSWORD_RESET_SUCCESS_MESSAGE}</p>
        <p className="text-sm text-gray-500">{AUTH_MESSAGES.PASSWORD_RESET_SUCCESS_REDIRECT}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <FormTitle>{AUTH_MESSAGES.PASSWORD_RESET_TITLE}</FormTitle>
        </div>

        {resetMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium">{AUTH_MESSAGES.PASSWORD_RESET_ERROR_TITLE}</p>
            <p className="mt-1">
              {resetMutation.error instanceof Error
                ? resetMutation.error.message
                : AUTH_MESSAGES.PASSWORD_RESET_ERROR_DEFAULT}
            </p>
          </div>
        )}

        {PASSWORD_RESET_FIELDS.map((fieldConfig) => (
          <RhfFieldRenderer
            key={fieldConfig.name}
            control={form.control}
            name={fieldConfig.name}
            label={fieldConfig.label}
            type={fieldConfig.type}
            placeholder={fieldConfig.placeholder}
          />
        ))}

        <RhfSubmitButton
          control={form.control}
          isPending={resetMutation.isPending}
          hasValues={(v) => Boolean(v.password && v.confirmPassword)}
        >
          {AUTH_MESSAGES.PASSWORD_RESET_BUTTON}
        </RhfSubmitButton>

        <FormNavigation
          rightText={AUTH_MESSAGES.HAVE_ACCOUNT_TEXT}
          rightLink={{ to: '/auth/login', text: AUTH_MESSAGES.LOGIN_LINK }}
        />
      </form>
    </div>
  );
};
