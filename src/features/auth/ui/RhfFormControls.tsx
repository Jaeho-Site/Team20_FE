import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import type { DeepPartialSkipArrayKey } from 'react-hook-form';
import { FormButton } from '@/shared/ui';
import { FormFieldRenderer } from './FormFieldRenderer';

// RHF 필드 상태를 공용 표시 계층(FormFieldWrapper)의 구조적 타입으로 변환한다.
// A안(TanStack)과 같은 Input·에러 표시·blur 게이트를 공유해 비교 조건을 동일하게 유지.
interface RhfFieldRendererProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type: string;
  placeholder: string;
}

export function RhfFieldRenderer<T extends FieldValues>({
  control,
  name,
  label,
  type,
  placeholder,
}: RhfFieldRendererProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldRenderer
          field={{
            name: field.name,
            state: {
              value: String(field.value ?? ''),
              meta: {
                isValid: !fieldState.invalid,
                errors: fieldState.error?.message ? [{ message: fieldState.error.message }] : [],
                isTouched: fieldState.isTouched,
                // RHF isTouched는 blur 시점에 설정된다 — A안의 isBlurred와 동일 의미
                isBlurred: fieldState.isTouched,
              },
            },
            handleChange: field.onChange,
            handleBlur: field.onBlur,
          }}
          label={label}
          type={type}
          placeholder={placeholder}
        />
      )}
    />
  );
}

// A안의 form.Subscribe에 대응하는 RHF 관용구(useFormState + useWatch) —
// 구독을 버튼 컴포넌트로 격리해 폼 루트 리렌더를 막는 조건도 동일하게 맞춘다.
interface RhfSubmitButtonProps<T extends FieldValues> {
  control: Control<T>;
  isPending: boolean;
  hasValues: (values: DeepPartialSkipArrayKey<T>) => boolean;
  children: React.ReactNode;
}

export function RhfSubmitButton<T extends FieldValues>({
  control,
  isPending,
  hasValues,
  children,
}: RhfSubmitButtonProps<T>) {
  const { isValid, isSubmitting } = useFormState({ control });
  const values = useWatch({ control });
  const isLoading = isSubmitting || isPending;
  const canSubmit = hasValues(values) && isValid && !isLoading;

  return (
    <FormButton
      type="submit"
      variant={canSubmit ? 'primary' : 'disabled'}
      isLoading={isLoading}
      disabled={!canSubmit}
    >
      {children}
    </FormButton>
  );
}
