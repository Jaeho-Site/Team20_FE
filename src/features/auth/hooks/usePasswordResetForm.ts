import { useForm } from '@tanstack/react-form';
import { passwordResetDefaults, passwordResetSchema } from '../model/passwordResetSchemas';
import { usePasswordResetMutation } from './usePasswordResetMutations';

export const usePasswordResetForm = (token: string) => {
  const resetMutation = usePasswordResetMutation();

  const form = useForm({
    defaultValues: { ...passwordResetDefaults },
    validators: {
      onChange: passwordResetSchema,
      onBlur: passwordResetSchema,
    },
    onSubmit: ({ value }) => {
      resetMutation.mutate({
        rawToken: token,
        password: value.password,
      });
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    resetMutation,
  };
};
