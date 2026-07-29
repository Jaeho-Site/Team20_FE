import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FormFieldWrapper, type FormFieldWrapperProps } from './FormField';

const meta: Meta<typeof FormFieldWrapper> = {
  title: 'Components/FormField',
  component: FormFieldWrapper,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FormFieldWrapper>;

function makeMockField(params: {
  name: string;
  value: string;
  setValue: (v: string) => void;
  blurred: boolean;
  setBlurred: (b: boolean) => void;
  error?: string;
}): FormFieldWrapperProps['field'] {
  return {
    name: params.name,
    state: {
      value: params.value,
      meta: {
        isValid: !params.error,
        errors: params.error ? [{ message: params.error }] : [],
        isTouched: params.blurred,
        isBlurred: params.blurred,
      },
    },
    handleChange: params.setValue,
    handleBlur: () => params.setBlurred(true),
  };
}

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [blurred, setBlurred] = useState(false);

    const field = makeMockField({
      name: 'email',
      value,
      setValue,
      blurred,
      setBlurred,
      error: value.length === 0 ? '이메일을 입력해주세요' : undefined,
    });

    return (
      <div className="w-96">
        <FormFieldWrapper
          field={field}
          inputProps={{
            label: '이메일',
            type: 'email',
            placeholder: '이메일을 입력하세요',
          }}
        />
      </div>
    );
  },
};

export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState('invalid-email');
    const [blurred, setBlurred] = useState(true);

    const field = makeMockField({
      name: 'email',
      value,
      setValue,
      blurred,
      setBlurred,
      error: '올바른 이메일 형식을 입력해주세요',
    });

    return (
      <div className="w-96">
        <FormFieldWrapper
          field={field}
          inputProps={{
            label: '이메일',
            type: 'email',
            placeholder: '이메일을 입력하세요',
          }}
        />
      </div>
    );
  },
};

export const PasswordField: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [blurred, setBlurred] = useState(false);

    const field = makeMockField({
      name: 'password',
      value,
      setValue,
      blurred,
      setBlurred,
      error:
        value.length > 0 && value.length < 8 ? '비밀번호는 8자리 이상이어야 합니다' : undefined,
    });

    return (
      <div className="w-96">
        <FormFieldWrapper
          field={field}
          inputProps={{
            label: '비밀번호',
            type: 'password',
            placeholder: '비밀번호를 입력하세요 (8자리 이상)',
          }}
        />
      </div>
    );
  },
};

export const AllFieldTypes: Story = {
  render: () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [emailBlurred, setEmailBlurred] = useState(false);
    const [passwordBlurred, setPasswordBlurred] = useState(false);
    const [nicknameBlurred, setNicknameBlurred] = useState(false);

    const fields = [
      {
        name: 'email',
        value: email,
        setValue: setEmail,
        blurred: emailBlurred,
        setBlurred: setEmailBlurred,
        label: '이메일',
        type: 'email',
        placeholder: '이메일을 입력하세요',
        error:
          email.length > 0 && !email.includes('@')
            ? '올바른 이메일 형식을 입력해주세요'
            : undefined,
      },
      {
        name: 'password',
        value: password,
        setValue: setPassword,
        blurred: passwordBlurred,
        setBlurred: setPasswordBlurred,
        label: '비밀번호',
        type: 'password',
        placeholder: '비밀번호를 입력하세요 (8자리 이상)',
        error:
          password.length > 0 && password.length < 8
            ? '비밀번호는 8자리 이상이어야 합니다'
            : undefined,
      },
      {
        name: 'nickname',
        value: nickname,
        setValue: setNickname,
        blurred: nicknameBlurred,
        setBlurred: setNicknameBlurred,
        label: '닉네임',
        type: 'text',
        placeholder: '닉네임을 입력하세요 (2-20자)',
        error:
          nickname.length > 0 && nickname.length < 2
            ? '닉네임은 2자리 이상이어야 합니다'
            : undefined,
      },
    ];

    return (
      <div className="w-96 space-y-6">
        {fields.map((f) => (
          <FormFieldWrapper
            key={f.name}
            field={makeMockField(f)}
            inputProps={{
              label: f.label,
              type: f.type,
              placeholder: f.placeholder,
            }}
          />
        ))}
      </div>
    );
  },
};
