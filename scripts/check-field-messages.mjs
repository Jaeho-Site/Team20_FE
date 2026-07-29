/**
 * 실험 A 지표 4: "zod 필드별 메시지가 UI에 실제 표시되는가"
 * node scripts/check-field-messages.mjs [--skip-build]
 *
 * vite build + preview를 띄우고 Playwright로 auth 폼 6개 필드 케이스에 잘못된 값을
 * 입력한 뒤, zod 스키마의 필드별 메시지가 화면에 보이는지 / 제네릭 메시지
 * ('입력값을 확인해주세요')가 보이는지를 검사한다. 검증은 클라이언트 사이드라 백엔드 불필요.
 */
import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:4173';
const GENERIC = '입력값을 확인해주세요';

const CASES = [
  {
    route: '/auth/login',
    field: 'email',
    value: 'bad',
    expected: '올바른 이메일 형식을 입력해주세요',
  },
  {
    route: '/auth/login',
    field: 'password',
    value: 'short7c',
    expected: '비밀번호는 8자리 이상이어야 합니다',
  },
  {
    route: '/auth/signup',
    field: 'nickname',
    value: '가',
    expected: '닉네임은 2자리 이상이어야 합니다',
  },
  {
    route: '/auth/signup',
    field: 'confirmPassword',
    value: 'different99',
    pre: [{ field: 'password', value: 'password123' }],
    expected: '비밀번호가 일치하지 않습니다',
  },
  {
    route: '/auth/forgot-password',
    field: 'email',
    value: 'bad',
    expected: '올바른 이메일 형식을 입력해주세요',
  },
  {
    route: '/auth/reset-password?token=testtoken',
    field: 'password',
    value: 'short7c',
    expected: '비밀번호는 8자리 이상이어야 합니다',
  },
  {
    // 입력 없이 focus→blur — onBlur 검증이 없으면 필수 입력 에러가 안 뜨는 경로 (리뷰 지적)
    route: '/auth/login',
    field: 'email',
    value: '',
    expected: '이메일을 입력해주세요',
  },
];

const args = process.argv.slice(2);
if (!args.includes('--skip-build')) {
  console.log('[check] vite build...');
  execSync('npm run build', { cwd: REPO, stdio: 'ignore' });
}

const portInUse = await fetch(BASE + '/').then(
  () => true,
  () => false,
);
if (portInUse) {
  console.error(`[check] 실패: ${BASE} 포트가 이미 사용 중`);
  process.exit(1);
}
const server = spawn('npx vite preview --port 4173 --strictPort', {
  cwd: REPO,
  shell: true,
  stdio: 'ignore',
});
function killServer() {
  try {
    if (process.platform === 'win32')
      execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill('SIGTERM');
  } catch {
    /* 이미 종료 */
  }
}
process.on('exit', killServer);

const until = Date.now() + 60_000;
let up = false;
while (!up && Date.now() < until) {
  up = await fetch(BASE + '/').then(
    (r) => r.ok,
    () => false,
  );
  if (!up) await new Promise((r) => setTimeout(r, 500));
}
if (!up) {
  console.error('[check] 실패: preview 서버가 뜨지 않음');
  process.exit(1);
}

const browser = await chromium.launch();
const results = [];
for (const c of CASES) {
  const page = await browser.newPage();
  await page.goto(BASE + c.route, { waitUntil: 'networkidle', timeout: 30_000 });
  for (const p of c.pre ?? []) {
    await page.fill(`#${p.field}`, p.value);
  }
  await page.fill(`#${c.field}`, c.value);
  await page.locator('body').click({ position: { x: 5, y: 5 } }); // blur
  await page.waitForTimeout(600);
  const fieldMessageVisible = await page
    .getByText(c.expected)
    .first()
    .isVisible()
    .catch(() => false);
  const genericVisible = await page
    .getByText(GENERIC)
    .first()
    .isVisible()
    .catch(() => false);
  results.push({
    route: c.route,
    field: c.field,
    expected: c.expected,
    fieldMessageVisible,
    genericVisible,
  });
  console.log(
    `  ${c.route} #${c.field}: 필드 메시지 ${fieldMessageVisible ? '표시됨 ✓' : '안 보임 ✗'}${genericVisible ? ' (제네릭 메시지도 표시)' : ''}`,
  );
  await page.close();
}
await browser.close();
killServer();

const shown = results.filter((r) => r.fieldMessageVisible).length;
console.log(`\n[check] 필드별 메시지 표시: ${shown}/${results.length}`);
console.log(JSON.stringify(results, null, 2));
