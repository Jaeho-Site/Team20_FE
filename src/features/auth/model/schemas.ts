import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식을 입력해주세요'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 8자리 이상이어야 합니다'),
});

export const signupSchema = z
  .object({
    email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식을 입력해주세요'),
    password: z
      .string()
      .min(1, '비밀번호를 입력해주세요')
      .min(8, '비밀번호는 8자리 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
    nickname: z
      .string()
      .min(1, '닉네임을 입력해주세요')
      .min(2, '닉네임은 2자리 이상이어야 합니다')
      .max(20, '닉네임은 20자리 이하여야 합니다'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// 폼 초기값 — 스키마와 같은 파일에 두고 타입을 스키마 추론 타입으로 검사한다.
// 필드가 추가되면 스키마와 여기 둘 다 컴파일 에러로 잡힌다 (단언 없는 단일 출처).
export const loginDefaults: LoginFormData = { email: '', password: '' };
export const signupDefaults: SignupFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  nickname: '',
};
