import { useLoginForm } from '../hooks/useLoginForm';
import { FormTitle, FormNavigation } from '@/shared/ui';
import { useRenderProbe } from '@/shared/lib/renderProbe';
import { RhfFieldRenderer, RhfSubmitButton } from './RhfFormControls';
import { LOGIN_FIELDS, AUTH_MESSAGES } from '../model';

export const LoginForm = () => {
  useRenderProbe('LoginForm');
  const { form, handleSubmit, loginMutation } = useLoginForm();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <FormTitle>{AUTH_MESSAGES.LOGIN_TITLE}</FormTitle>

        {loginMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium">{AUTH_MESSAGES.LOGIN_ERROR_TITLE}</p>
            <p className="mt-1">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : AUTH_MESSAGES.LOGIN_ERROR_DEFAULT}
            </p>
          </div>
        )}

        {LOGIN_FIELDS.map((fieldConfig) => (
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
          isPending={loginMutation.isPending}
          hasValues={(v) => Boolean(v.email && v.password)}
        >
          {AUTH_MESSAGES.LOGIN_BUTTON}
        </RhfSubmitButton>

        <FormNavigation
          leftLink={{ to: '/auth/forgot-password', text: AUTH_MESSAGES.FORGOT_PASSWORD_LINK }}
          rightText={AUTH_MESSAGES.NO_ACCOUNT_TEXT}
          rightLink={{ to: '/auth/signup', text: AUTH_MESSAGES.SIGNUP_LINK }}
        />
      </form>
    </div>
  );
};
