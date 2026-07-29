import { describe, it, expect } from 'vitest';
import { cn } from './cn';

// 리뷰가 잡은 회귀 고정: 기본 twMerge는 커스텀 타이포 유틸을 색상 그룹으로 오분류해
// 'text-[색상] text-button-large' 병합 시 색상 클래스를 지운다 (ContentOverviewActionButtons의
// 히어로 CTA 텍스트 색이 사라지는 실결함).
describe('cn', () => {
  it('커스텀 타이포 유틸이 색상 클래스를 지우지 않는다', () => {
    expect(cn('text-[--color-text-inverse]', 'text-button-large')).toBe(
      'text-[--color-text-inverse] text-button-large',
    );
    expect(cn('text-foreground', 'text-heading-2')).toBe('text-foreground text-heading-2');
  });

  it('진짜 폰트 사이즈 충돌은 뒤가 이긴다', () => {
    expect(cn('text-sm', 'text-button-large')).toBe('text-button-large');
  });

  it('tailwind 충돌 병합은 유지된다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
