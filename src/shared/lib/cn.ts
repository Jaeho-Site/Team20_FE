import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// _typography.css의 커스텀 @utility(text-heading-1, text-button-large 등)는 타이포그래피인데
// 기본 twMerge는 text-* 임의 값을 색상 그룹으로 분류한다 — 'text-[색상] text-button-large'를
// 병합하면 색상 클래스가 삭제된다(실측). font-size 그룹으로 등록해 오분류를 막는다.
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'heading-1',
            'heading-2',
            'heading-3',
            'heading-4',
            'heading-5',
            'heading-6',
            'body-large',
            'body',
            'body-small',
            'caption',
            'caption-bold',
            'button',
            'button-large',
            'link',
          ],
        },
      ],
    },
  },
});

/**
 * 클래스명을 조건부로 합치고 Tailwind CSS 클래스 충돌·중복을 제거하는 유틸리티 함수
 */
export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
