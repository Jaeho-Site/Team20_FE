#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write|NotebookEdit) — 보호 대상 파일의 편집을 결정론적으로 차단한다.
 * CLAUDE.md의 "편집 금지" 문장은 요청일 뿐이고, 보장은 이 스크립트가 한다.
 *
 * 규약: stdin으로 이벤트 JSON 수신 → exit 2 + stderr = 차단(피드백은 Claude에게 전달), exit 0 = 통과.
 */

const PROTECTED = [
  { re: /(^|[\\/])\.env($|\.)/i, why: '자격증명 파일. 값이 필요하면 사용자에게 요청할 것.' },
  { re: /(^|[\\/])\.cert[\\/]/i, why: '인증서 디렉토리.' },
  { re: /package-lock\.json$/i, why: 'lockfile은 npm 명령으로만 갱신한다 (npm install / npm ls).' },
  { re: /\.gen\.ts$/i, why: '생성 파일. 소스(라우트 정의)를 고치고 재생성할 것.' },
  { re: /routeTree\.gen\.ts$/i, why: 'TanStack Router 생성물. 직접 편집 금지.' },
  { re: /(^|[\\/])__pycache__[\\/]/i, why: '파이썬 빌드 산출물.' },
  { re: /(^|[\\/])reference[\\/]/i, why: '사용자의 학습 노트. 리팩토링 작업이 건드릴 대상이 아니다.' },
  { re: /(^|[\\/])(dist|storybook-static|coverage|playwright-report|test-results)[\\/]/i, why: '빌드 산출물.' },
  { re: /(^|[\\/])\.next[\\/]/i, why: 'Next.js 빌드 산출물.' },
  { re: /(^|[\\/])node_modules[\\/]/i, why: '의존성 디렉토리. 패치가 필요하면 사용자와 상의할 것.' },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let filePath = '';
  try {
    const input = JSON.parse(raw || '{}');
    filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? '';
  } catch {
    // JSON이 깨져도(예: 이스케이프되지 않은 Windows 경로) 무조건 통과시키지는 않는다.
    // 원문에서 경로 문자열만 직접 뽑아 검사한다. 못 뽑으면 통과(훅 하나가 모든 편집을 막으면 안 된다).
    const m = raw.match(/"(?:file_path|notebook_path)"\s*:\s*"(.*?)"\s*[,}]/s);
    filePath = m ? m[1] : '';
  }
  if (!filePath) process.exit(0);

  const normalized = String(filePath).replace(/\\/g, '/');
  for (const { re, why } of PROTECTED) {
    if (re.test(normalized)) {
      process.stderr.write(`차단됨: ${filePath}\n이유: ${why}\n다른 방법을 찾거나 사용자에게 확인할 것.\n`);
      process.exit(2);
    }
  }
  process.exit(0);
});
