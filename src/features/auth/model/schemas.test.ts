import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './schemas';

// 실험 A(zod × TanStack Form 결합)의 회귀 기준선: 스키마가 내는 필드별 메시지가
// 폼 배선 방식과 무관하게 유지되어야 한다 (docs/refactor/00-analysis.md P2-1).

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

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'password123' };

  it('유효한 입력을 통과시킨다', () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it('빈 이메일 → 필수 입력 메시지', () => {
    const msgs = messagesOf(loginSchema.safeParse({ ...valid, email: '' }));
    expect(msgs['email']).toContain('이메일을 입력해주세요');
  });

  it('형식이 틀린 이메일 → 형식 메시지', () => {
    const msgs = messagesOf(loginSchema.safeParse({ ...valid, email: 'not-an-email' }));
    expect(msgs['email']).toContain('올바른 이메일 형식을 입력해주세요');
  });

  it('빈 비밀번호 → 필수 입력 메시지', () => {
    const msgs = messagesOf(loginSchema.safeParse({ ...valid, password: '' }));
    expect(msgs['password']).toContain('비밀번호를 입력해주세요');
  });

  it('8자리 미만 비밀번호 → 길이 메시지', () => {
    const msgs = messagesOf(loginSchema.safeParse({ ...valid, password: 'short7c' }));
    expect(msgs['password']).toContain('비밀번호는 8자리 이상이어야 합니다');
  });
});

describe('signupSchema', () => {
  const valid = {
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    nickname: '테스터',
  };

  it('유효한 입력을 통과시킨다', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it('비밀번호 불일치 → confirmPassword 경로에 불일치 메시지', () => {
    const msgs = messagesOf(signupSchema.safeParse({ ...valid, confirmPassword: 'different99' }));
    expect(msgs['confirmPassword']).toContain('비밀번호가 일치하지 않습니다');
  });

  it('빈 비밀번호 확인 → 필수 입력 메시지', () => {
    const msgs = messagesOf(signupSchema.safeParse({ ...valid, confirmPassword: '' }));
    expect(msgs['confirmPassword']).toContain('비밀번호 확인을 입력해주세요');
  });

  it('1자리 닉네임 → 2자리 이상 메시지', () => {
    const msgs = messagesOf(signupSchema.safeParse({ ...valid, nickname: '가' }));
    expect(msgs['nickname']).toContain('닉네임은 2자리 이상이어야 합니다');
  });

  it('21자리 닉네임 → 20자리 이하 메시지', () => {
    const msgs = messagesOf(signupSchema.safeParse({ ...valid, nickname: '가'.repeat(21) }));
    expect(msgs['nickname']).toContain('닉네임은 20자리 이하여야 합니다');
  });

  it('경계값: 2자리·20자리 닉네임과 8자리 비밀번호는 통과한다', () => {
    expect(
      signupSchema.safeParse({
        ...valid,
        password: '8chars!!',
        confirmPassword: '8chars!!',
        nickname: '가나',
      }).success,
    ).toBe(true);
    expect(signupSchema.safeParse({ ...valid, nickname: '가'.repeat(20) }).success).toBe(true);
  });
});
