import { AUTH_MESSAGES } from './messages';

// 검증은 각 폼 훅의 validators.onChange에 바인딩된 zod 스키마가 담당한다.
// 여기는 순수 표시 메타데이터만 남긴다.
export interface FieldConfig {
  name: string;
  label: string;
  type: string;
  placeholder: string;
}

export interface LoginFieldConfig extends FieldConfig {
  name: 'email' | 'password';
}

export interface SignupFieldConfig extends FieldConfig {
  name: 'email' | 'password' | 'confirmPassword' | 'nickname';
}

export interface PasswordResetFieldConfig extends FieldConfig {
  name: 'password' | 'confirmPassword';
}

export const LOGIN_FIELDS: LoginFieldConfig[] = [
  {
    name: 'email',
    label: AUTH_MESSAGES.FIELD_LABEL_EMAIL,
    type: 'email',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_EMAIL,
  },
  {
    name: 'password',
    label: AUTH_MESSAGES.FIELD_LABEL_PASSWORD,
    type: 'password',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_PASSWORD,
  },
];

export const SIGNUP_FIELDS: SignupFieldConfig[] = [
  {
    name: 'email',
    label: AUTH_MESSAGES.FIELD_LABEL_EMAIL,
    type: 'email',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_EMAIL,
  },
  {
    name: 'password',
    label: AUTH_MESSAGES.FIELD_LABEL_PASSWORD,
    type: 'password',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_PASSWORD_MIN,
  },
  {
    name: 'confirmPassword',
    label: AUTH_MESSAGES.FIELD_LABEL_CONFIRM_PASSWORD,
    type: 'password',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_CONFIRM_PASSWORD,
  },
  {
    name: 'nickname',
    label: AUTH_MESSAGES.FIELD_LABEL_NICKNAME,
    type: 'text',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_NICKNAME,
  },
];

export const PASSWORD_RESET_FIELDS: PasswordResetFieldConfig[] = [
  {
    name: 'password',
    label: AUTH_MESSAGES.FIELD_LABEL_NEW_PASSWORD,
    type: 'password',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_NEW_PASSWORD,
  },
  {
    name: 'confirmPassword',
    label: AUTH_MESSAGES.FIELD_LABEL_CONFIRM_PASSWORD,
    type: 'password',
    placeholder: AUTH_MESSAGES.FIELD_PLACEHOLDER_CONFIRM_PASSWORD,
  },
];
