import { describe, it, expect } from 'vitest';
import { passwordResetRequestSchema, passwordResetSchema } from './passwordResetSchemas';

function messagesOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  if (result.success || !result.error) return {};
  const map: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    (map[key] ??= []).push(issue.message);
  }
  return map;
}

describe('passwordResetRequestSchema', () => {
  it('유효한 이메일을 통과시킨다', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('빈 이메일 → 필수 입력 메시지', () => {
    const msgs = messagesOf(passwordResetRequestSchema.safeParse({ email: '' }));
    expect(msgs['email']).toContain('이메일을 입력해주세요');
  });

  it('형식이 틀린 이메일 → 형식 메시지', () => {
    const msgs = messagesOf(passwordResetRequestSchema.safeParse({ email: 'nope' }));
    expect(msgs['email']).toContain('올바른 이메일 형식을 입력해주세요');
  });
});

describe('passwordResetSchema', () => {
  const valid = { password: 'password123', confirmPassword: 'password123' };

  it('유효한 입력을 통과시킨다', () => {
    expect(passwordResetSchema.safeParse(valid).success).toBe(true);
  });

  it('8자리 미만 비밀번호 → 길이 메시지', () => {
    const msgs = messagesOf(passwordResetSchema.safeParse({ ...valid, password: 'short7c' }));
    expect(msgs['password']).toContain('비밀번호는 8자리 이상이어야 합니다');
  });

  it('비밀번호 불일치 → confirmPassword 경로에 불일치 메시지', () => {
    const msgs = messagesOf(
      passwordResetSchema.safeParse({ ...valid, confirmPassword: 'other999' }),
    );
    expect(msgs['confirmPassword']).toContain('비밀번호가 일치하지 않습니다');
  });

  it('빈 비밀번호 확인 → 필수 입력 메시지', () => {
    const msgs = messagesOf(passwordResetSchema.safeParse({ ...valid, confirmPassword: '' }));
    expect(msgs['confirmPassword']).toContain('비밀번호 확인을 입력해주세요');
  });
});
