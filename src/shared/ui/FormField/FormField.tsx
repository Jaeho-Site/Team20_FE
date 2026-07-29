import { Input, type InputProps } from '../Input/Input';
import { useRenderProbe } from '../../lib/renderProbe';

// TanStack Form 필드 API의 구조적 부분집합 — 폼별 23개 제네릭을 끌고 오지 않기 위해
// 래퍼가 실제로 쓰는 형태만 선언한다 (any·단언 없이 구조적 타이핑으로 수용).
// errors는 Standard Schema(zod) 바인딩 시 이슈 객체({ message })가 온다.
export interface FormFieldWrapperProps {
  field: {
    name: string;
    state: {
      value: string;
      meta: {
        isValid: boolean;
        errors: Array<string | { message?: string } | undefined>;
        isTouched: boolean;
        isBlurred: boolean;
      };
    };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
  inputProps?: Partial<InputProps>;
}

export const FormFieldWrapper = ({ field, inputProps = {} }: FormFieldWrapperProps) => {
  useRenderProbe(`field:${field.name}`);
  const firstError = field.state.meta.errors.find((e) => e != null);
  const error = typeof firstError === 'string' ? firstError : firstError?.message;
  const isBlurred = field.state.meta.isBlurred;

  return (
    <Input
      id={field.name}
      name={field.name}
      value={field.state.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      error={error}
      touched={isBlurred}
      showError={isBlurred && error != null}
      {...inputProps}
    />
  );
};
