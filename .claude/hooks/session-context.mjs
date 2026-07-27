#!/usr/bin/env node
/**
 * SessionStart (matcher: compact) — 컴팩션으로 손실되기 쉬운 규칙을 컨텍스트에 재주입한다.
 * 여기에는 "잊으면 실제로 사고가 나는 것"만 넣는다. 나머지는 CLAUDE.md가 디스크에서 재주입된다.
 */
process.stdout.write(
  [
    '[프로젝트 재확인]',
    '- 목표는 "수치로 증명된 개선"이다. 리팩토링 결과는 before/after 수치와 함께 docs/refactor/*.md 에 기록한다.',
    '- node_modules 미설치 상태일 수 있다. 검증 명령 실행 전 npm install 여부를 확인할 것.',
    '- 단위 테스트 러너가 없다. 검증 수단은 `npm run ci` 와 `npm run test:e2e` 뿐이다.',
    '- 루트(Vite)와 nextjs/ 는 같은 화면의 중복 구현이다. 한쪽만 고치면 드리프트가 생기므로 어느 쪽을 고치는지 매번 명시할 것.',
    '- 커밋 메시지 형식: `type : 한글 설명` (콜론 앞뒤 공백). 커밋/푸시는 사용자가 요청할 때만.',
    '- 완료 보고에는 실행한 명령과 출력(증거)을 함께 낸다.',
  ].join('\n') + '\n',
);
