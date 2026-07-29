import { useForm } from '@tanstack/react-form';
import { loginDefaults, loginSchema } from '../model';
import { useLoginMutation } from './useAuthMutations';

export const useLoginForm = () => {
  const loginMutation = useLoginMutation();

  const form = useForm({
    defaultValues: { ...loginDefaults },
    // zod 스키마 직접 바인딩 (Standard Schema) — 이슈가 필드별로 자동 매핑된다.
    // onBlur: 입력 없이 focus→blur한 필드에도 필수 입력 에러를 띄우기 위해 필요 (리뷰 지적)
    validators: {
      onChange: loginSchema,
      onBlur: loginSchema,
    },
    onSubmit: ({ value }) => {
      loginMutation.mutate({
        email: value.email,
        password: value.password,
      });
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    loginMutation,
  };
};
