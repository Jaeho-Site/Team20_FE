import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { type SignupFormData, signupDefaults, signupSchema } from '../model';
import { useSignupMutation } from './useAuthMutations';

export const useSignupForm = () => {
  const signupMutation = useSignupMutation();

  const form = useForm<SignupFormData>({
    resolver: standardSchemaResolver(signupSchema),
    defaultValues: { ...signupDefaults },
    mode: 'all',
  });

  const handleSubmit = form.handleSubmit((value) => {
    signupMutation.mutate({
      email: value.email,
      password: value.password,
      nickname: value.nickname,
    });
  });

  return {
    form,
    handleSubmit,
    signupMutation,
  };
};
