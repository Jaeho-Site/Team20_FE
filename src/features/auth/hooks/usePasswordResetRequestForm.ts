import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  type PasswordResetRequestFormData,
  passwordResetRequestDefaults,
  passwordResetRequestSchema,
} from '../model/passwordResetSchemas';
import { usePasswordResetRequestMutation } from './usePasswordResetMutations';

export const usePasswordResetRequestForm = () => {
  const resetRequestMutation = usePasswordResetRequestMutation();

  const form = useForm<PasswordResetRequestFormData>({
    resolver: standardSchemaResolver(passwordResetRequestSchema),
    defaultValues: { ...passwordResetRequestDefaults },
    mode: 'all',
  });

  const handleSubmit = form.handleSubmit((value) => {
    resetRequestMutation.mutate({
      email: value.email,
    });
  });

  return {
    form,
    handleSubmit,
    resetRequestMutation,
  };
};
