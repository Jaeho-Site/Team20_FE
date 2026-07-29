import { useSignupForm } from '../hooks/useSignupForm';
import { FormTitle, FormButton, FormNavigation } from '@/shared/ui';
import { FormFieldRenderer } from './FormFieldRenderer';
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
          <form.Field key={fieldConfig.name} name={fieldConfig.name}>
            {(field) => (
              <FormFieldRenderer
                field={field}
                label={fieldConfig.label}
                type={fieldConfig.type}
                placeholder={fieldConfig.placeholder}
              />
            )}
          </form.Field>
        ))}

        <form.Subscribe selector={(state) => [state.isValid, state.isSubmitting, state.values]}>
          {([isValid, isSubmitting, values]) => {
            const hasValues =
              values &&
              typeof values === 'object' &&
              'email' in values &&
              'password' in values &&
              'confirmPassword' in values &&
              'nickname' in values &&
              values.email &&
              values.password &&
              values.confirmPassword &&
              values.nickname;

            const isLoading = isSubmitting || signupMutation.isPending;
            const canSubmit = hasValues && isValid && !isLoading;

            return (
              <FormButton
                type="submit"
                variant={canSubmit ? 'primary' : 'disabled'}
                isLoading={isLoading as boolean}
                disabled={!canSubmit as boolean}
              >
                {AUTH_MESSAGES.SIGNUP_BUTTON}
              </FormButton>
            );
          }}
        </form.Subscribe>

        <FormNavigation
          rightText={AUTH_MESSAGES.HAVE_ACCOUNT_TEXT}
          rightLink={{ to: '/auth/login', text: AUTH_MESSAGES.LOGIN_LINK }}
        />
      </form>
    </div>
  );
};
