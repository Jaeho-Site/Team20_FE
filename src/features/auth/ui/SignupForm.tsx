import { useSignupForm } from '../hooks/useSignupForm';
import { FormTitle, FormNavigation } from '@/shared/ui';
import { RhfFieldRenderer, RhfSubmitButton } from './RhfFormControls';
import { SIGNUP_FIELDS, AUTH_MESSAGES } from '../model';

export const SignupForm = () => {
  const { form, handleSubmit, signupMutation } = useSignupForm();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <FormTitle>{AUTH_MESSAGES.SIGNUP_TITLE}</FormTitle>

        {signupMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium">{AUTH_MESSAGES.SIGNUP_ERROR_TITLE}</p>
            <p className="mt-1">
              {signupMutation.error instanceof Error
                ? signupMutation.error.message
                : AUTH_MESSAGES.SIGNUP_ERROR_DEFAULT}
            </p>
          </div>
        )}

        {SIGNUP_FIELDS.map((fieldConfig) => (
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
          isPending={signupMutation.isPending}
          hasValues={(v) => Boolean(v.email && v.password && v.confirmPassword && v.nickname)}
        >
          {AUTH_MESSAGES.SIGNUP_BUTTON}
        </RhfSubmitButton>

        <FormNavigation
          rightText={AUTH_MESSAGES.HAVE_ACCOUNT_TEXT}
          rightLink={{ to: '/auth/login', text: AUTH_MESSAGES.LOGIN_LINK }}
        />
      </form>
    </div>
  );
};
