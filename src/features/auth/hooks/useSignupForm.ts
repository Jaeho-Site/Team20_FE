import { useForm } from '@tanstack/react-form';
import { signupDefaults, signupSchema } from '../model';
import { useSignupMutation } from './useAuthMutations';

export const useSignupForm = () => {
  const signupMutation = useSignupMutation();

  const form = useForm({
    defaultValues: { ...signupDefaults },
    validators: {
      onChange: signupSchema,
      onBlur: signupSchema,
    },
    onSubmit: ({ value }) => {
      signupMutation.mutate({
        email: value.email,
        password: value.password,
        nickname: value.nickname,
      });
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    signupMutation,
  };
};
