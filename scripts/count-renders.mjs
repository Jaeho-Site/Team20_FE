/**
 * 실험 B 지표: 입력 시 리렌더 횟수. node scripts/count-renders.mjs [--skip-build]
 *
 * VITE_RENDER_PROBE=1로 프로덕션 빌드(StrictMode 이중 렌더 없음) 후 preview를 띄우고,
 * /auth/login에서 email 10타 + password 10타를 입력한 뒤 globalThis.__renderCounts를 읽는다.
 * A안/B안 모두 같은 프로브(FormFieldWrapper + LoginForm 루트)를 지나므로 공정 비교다.
 */
import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:4173';
const EMAIL_KEYS = 'a@test.com'; // 10타
const PASSWORD_KEYS = 'password12'; // 10타

const args = process.argv.slice(2);
if (!args.includes('--skip-build')) {
  console.log('[renders] vite build (VITE_RENDER_PROBE=1)...');
  execSync('npm run build', {
    cwd: REPO,
    stdio: 'ignore',
    env: { ...process.env, VITE_RENDER_PROBE: '1' },
  });
}

const portInUse = await fetch(BASE + '/').then(
  () => true,
  () => false,
);
if (portInUse) {
  console.error(`[renders] 실패: ${BASE} 포트가 이미 사용 중`);
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
  console.error('[renders] 실패: preview 서버가 뜨지 않음');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE + '/auth/login', { waitUntil: 'networkidle', timeout: 30_000 });

const baseline = await page.evaluate(() => ({ ...(globalThis.__renderCounts ?? {}) }));
await page.locator('#email').pressSequentially(EMAIL_KEYS, { delay: 50 });
await page.locator('#password').pressSequentially(PASSWORD_KEYS, { delay: 50 });
await page.waitForTimeout(300);
const after = await page.evaluate(() => ({ ...(globalThis.__renderCounts ?? {}) }));
await browser.close();
killServer();

const delta = {};
for (const key of new Set([...Object.keys(baseline), ...Object.keys(after)])) {
  delta[key] = (after[key] ?? 0) - (baseline[key] ?? 0);
}
console.log(`[renders] 키입력 ${EMAIL_KEYS.length + PASSWORD_KEYS.length}타 동안의 렌더 증가분:`);
console.log(JSON.stringify({ baseline, after, delta }, null, 2));
if (Object.keys(after).length === 0)
  console.error(
    '[renders] 경고: __renderCounts 비어 있음 — VITE_RENDER_PROBE=1 빌드가 맞는지 확인',
  );
