import { useForm } from '@tanstack/react-form';
import {
  passwordResetRequestDefaults,
  passwordResetRequestSchema,
} from '../model/passwordResetSchemas';
import { usePasswordResetRequestMutation } from './usePasswordResetMutations';

export const usePasswordResetRequestForm = () => {
  const resetRequestMutation = usePasswordResetRequestMutation();

  const form = useForm({
    defaultValues: { ...passwordResetRequestDefaults },
    validators: {
      onChange: passwordResetRequestSchema,
      onBlur: passwordResetRequestSchema,
    },
    onSubmit: ({ value }) => {
      resetRequestMutation.mutate({
        email: value.email,
      });
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    resetRequestMutation,
  };
};
