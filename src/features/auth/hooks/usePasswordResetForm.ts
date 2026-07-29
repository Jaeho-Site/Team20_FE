import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  type PasswordResetFormData,
  passwordResetDefaults,
  passwordResetSchema,
} from '../model/passwordResetSchemas';
import { usePasswordResetMutation } from './usePasswordResetMutations';

export const usePasswordResetForm = (token: string) => {
  const resetMutation = usePasswordResetMutation();

  const form = useForm<PasswordResetFormData>({
    resolver: standardSchemaResolver(passwordResetSchema),
    defaultValues: { ...passwordResetDefaults },
    mode: 'all',
  });

  const handleSubmit = form.handleSubmit((value) => {
    resetMutation.mutate({
      rawToken: token,
      password: value.password,
    });
  });

  return {
    form,
    handleSubmit,
    resetMutation,
  };
};
