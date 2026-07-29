import { FormFieldWrapper, type FormFieldWrapperProps } from '@/shared/ui';

interface FormFieldRendererProps {
  field: FormFieldWrapperProps['field'];
  label: string;
  type: string;
  placeholder: string;
}

export const FormFieldRenderer = ({ field, label, type, placeholder }: FormFieldRendererProps) => {
  return (
    <FormFieldWrapper
      field={field}
      inputProps={{
        label,
        type,
        placeholder,
      }}
    />
  );
};
