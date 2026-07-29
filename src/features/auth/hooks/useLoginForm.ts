import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { type LoginFormData, loginDefaults, loginSchema } from '../model';
import { useLoginMutation } from './useAuthMutations';

export const useLoginForm = () => {
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormData>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { ...loginDefaults },
    mode: 'all', // change + blur — A안(TanStack onChange+onBlur)과 동일 타이밍
  });

  const handleSubmit = form.handleSubmit((value) => {
    loginMutation.mutate({
      email: value.email,
      password: value.password,
    });
  });

  return {
    form,
    handleSubmit,
    loginMutation,
  };
};
