/**
 * npm run measure -- [--target=root|nextjs] [--label=<라벨>] [--routes=/,/location/1] [--runs=5] [--skip-build] [--notes=<특이사항>]
 *
 * 재실행 가능한 측정 스크립트. 이후 모든 실험(goals.md A~D)의 before/after는 이 스크립트로만 잰다.
 * - preview 서버 기동 (root: vite preview / nextjs: next build + next start — 정적 export 금지)
 * - Lighthouse CLI N회(기본 5) 실행 후 지표별 median 산출 (설정은 아래 LH_SETTINGS에 고정)
 * - Playwright로 이미지 네트워크 지표(이미지별 전송 bytes·협상 포맷·요청 수) + 전체 페이지 스크린샷
 * - 결과: docs/refactor/measurements/<커밋해시>/<라벨>/ (meta.json + summary.json + 라우트별 리포트)
 *
 * 브라우저는 Playwright chromium으로 고정(CHROME_PATH)해 시스템 Chrome 버전 차이를 배제한다.
 *
 * 비교 규칙: 측정이 라이브 백엔드에 의존하므로 before/after는 반드시 같은 세션에서 연속으로 잰다.
 * 다른 날 잰 수치를 교차 비교하지 않는다 (API 데이터·이미지가 달라져 코드 변경과 무관하게 움직인다).
 */
import { spawn, execSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  rmdirSync,
  renameSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 고정 측정 조건 (바꾸면 이전 측정과 비교 불가 — meta.json에 기록됨) ----
const LH_SETTINGS = {
  formFactor: 'mobile', // LH 기본 모바일 에뮬레이션 (Moto G Power 계열)
  throttlingMethod: 'simulate', // simulated slow 4G
  onlyCategories: 'performance',
  chromeFlags: '--headless=new',
};
const PW_VIEWPORT = { width: 412, height: 823 }; // LH 모바일 스크린 에뮬레이션과 동일
const PW_DEVICE_SCALE = 1.75;
const TARGETS = {
  root: {
    cwd: REPO,
    buildCmd: 'npm run build',
    serveCmd: 'npx vite preview --port 4173 --strictPort',
    base: 'http://localhost:4173',
  },
  nextjs: {
    cwd: join(REPO, 'nextjs'),
    buildCmd: 'npm run build',
    serveCmd: 'npx next start -p 3100',
    base: 'http://localhost:3100',
  },
};

// ---- 인자 ----
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);
const target = args.target || 'root';
if (!TARGETS[target]) fail(`알 수 없는 target: ${target} (root | nextjs)`);
const label = args.label || `${target}-baseline`;
const routes = (args.routes || '/').split(',').map((r) => (r.startsWith('/') ? r : `/${r}`));
const runs = Number(args.runs || 5);
if (!Number.isInteger(runs) || runs < 1) fail(`--runs가 1 이상의 정수가 아님: ${args.runs}`);
const t = TARGETS[target];

function fail(msg) {
  console.error(`[measure] 실패: ${msg}`);
  // 미완성 출력 디렉토리를 남기면 재시도가 "이미 존재"로 막힌다 — summary가 없으면 정리
  try {
    if (!existsSync(join(outDir, 'summary.json'))) {
      rmSync(outDir, { recursive: true, force: true });
      rmdirSync(dirname(outDir)); // <sha>/가 비었으면 함께 제거 (비어있지 않으면 throw → 무시)
    }
  } catch {
    /* outDir 정의 전(TDZ) 또는 삭제 불가 — 무시 */
  }
  process.exit(1);
}
function sh(cmd, cwd = REPO) {
  return execSync(cmd, { cwd, encoding: 'utf8' }).trim();
}
function median(nums) {
  const s = [...nums].filter((n) => n != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function slug(route) {
  // ASCII만 허용 — 한글 경로가 cmd.exe(lighthouse --output-path)를 거치면 코드페이지에 따라 깨진다
  const s = route
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return s || 'root';
}

// ---- git 컨텍스트 ----
const commit = sh('git rev-parse HEAD');
const short = commit.slice(0, 7);
const branch = sh('git rev-parse --abbrev-ref HEAD');
const dirty = sh('git status --porcelain') !== '';
const outDir = join(REPO, 'docs', 'refactor', 'measurements', short, label);
if (existsSync(outDir))
  fail(`${outDir} 이미 존재. 같은 커밋·라벨 재측정이면 디렉토리를 지우고 다시 실행하라.`);
mkdirSync(outDir, { recursive: true });

// ---- nextjs 정적 export 가드 ----
if (target === 'nextjs') {
  const cfg = readFileSync(join(t.cwd, 'next.config.ts'), 'utf8');
  if (/output\s*:\s*['"]export['"]/.test(cfg))
    fail(
      "next.config.ts가 output: 'export'다. next/image 최적화가 죽은 상태라 측정 무효 — standalone/기본으로 되돌려라.",
    );
  if (!existsSync(join(t.cwd, 'node_modules')))
    fail('nextjs/node_modules 없음. cd nextjs && npm install 먼저.');
}

// ---- 빌드 ----
if (!args['skip-build']) {
  console.log(`[measure] build: ${t.buildCmd} (${target})`);
  execSync(t.buildCmd, { cwd: t.cwd, stdio: 'inherit' });
} else
  console.warn(
    '[measure] --skip-build: 기존 빌드 산출물 사용 — 다른 커밋의 dist일 수 있다 (meta.skipBuild로 기록). 정식 측정에서는 쓰지 말 것.',
  );

// ---- 서버 기동 ----
// 포트 선점 검사: 이미 응답하는 서버가 있으면 내 preview는 strictPort로 죽고
// 남의(다른 브랜치/빌드) 서버를 측정하게 된다 — 반드시 중단.
const portInUse = await fetch(t.base + '/').then(
  () => true,
  () => false,
);
if (portInUse)
  fail(`${t.base} 포트가 이미 사용 중 — 기존 서버를 종료하고 재실행하라 (남의 빌드 측정 방지).`);
console.log(`[measure] serve: ${t.serveCmd}`);
const server = spawn(t.serveCmd, { cwd: t.cwd, shell: true, stdio: 'ignore' });
let serverExited = false;
server.on('exit', () => {
  serverExited = true;
});
async function waitReady(url, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (serverExited) fail('서버 프로세스가 기동 중 종료됨 (포트 충돌 또는 빌드 산출물 부재).');
    try {
      const res = await fetch(url);
      if (res.ok) return;
      if (res.status >= 400)
        fail(`${url} → HTTP ${res.status} — 에러 응답을 측정하지 않도록 중단.`);
    } catch {
      /* 아직 안 뜸 */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`서버가 ${timeoutMs / 1000}s 내에 응답하지 않음: ${url}`);
}
function killServer() {
  if (server.pid == null) return;
  try {
    if (process.platform === 'win32')
      execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill('SIGTERM');
  } catch {
    /* 이미 종료 */
  }
}
process.on('exit', killServer);
process.on('SIGINT', () => process.exit(130));

// ---- Lighthouse ----
const chromePath = chromium.executablePath();
function runLighthouse(url, outBase) {
  const cmd = [
    'npx lighthouse',
    `"${url}"`,
    '--output=json --output=html',
    `--output-path="${outBase}"`,
    `--form-factor=${LH_SETTINGS.formFactor}`,
    `--throttling-method=${LH_SETTINGS.throttlingMethod}`,
    `--only-categories=${LH_SETTINGS.onlyCategories}`,
    `--chrome-flags=${LH_SETTINGS.chromeFlags}`,
    '--quiet',
  ].join(' ');
  execSync(cmd, { cwd: REPO, stdio: 'ignore', env: { ...process.env, CHROME_PATH: chromePath } });
  return JSON.parse(readFileSync(`${outBase}.report.json`, 'utf8'));
}
const METRIC_AUDITS = {
  lcpMs: 'largest-contentful-paint',
  fcpMs: 'first-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbtMs: 'total-blocking-time',
  speedIndexMs: 'speed-index',
  ttiMs: 'interactive',
  totalByteWeight: 'total-byte-weight',
};
function extract(lhr) {
  const m = { perfScore: lhr.categories?.performance?.score ?? null };
  for (const [k, audit] of Object.entries(METRIC_AUDITS))
    m[k] = lhr.audits?.[audit]?.numericValue ?? null;
  return m;
}

// ---- Playwright 이미지 네트워크 지표 ----
async function measureImages(url, routeDir) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: PW_VIEWPORT,
    deviceScaleFactor: PW_DEVICE_SCALE,
    isMobile: true,
  });
  const images = [];
  let failedImageRequests = 0;
  // 핸들러의 async 작업이 browser.close()와 경합하면 이미지가 비결정적으로 누락되거나
  // unhandledRejection으로 죽는다 — pending에 모아 close 전에 전부 기다린다.
  const pending = [];
  page.on('requestfinished', (req) => {
    if (req.resourceType() !== 'image') return;
    pending.push(
      (async () => {
        const resp = await req.response();
        const sizes = await req.sizes().catch(() => null);
        // Playwright는 크기를 모르면 -1을 반환한다 — 합산 오염 방지
        const body = sizes && sizes.responseBodySize >= 0 ? sizes.responseBodySize : null;
        const headers = sizes && sizes.responseHeadersSize >= 0 ? sizes.responseHeadersSize : 0;
        images.push({
          url: req.url(),
          status: resp?.status() ?? null,
          contentType: resp ? ((await resp.headerValue('content-type')) ?? null) : null,
          transferBytes: body != null ? body + headers : null,
          bodyBytes: body,
        });
      })().catch(() => {
        images.push({
          url: req.url(),
          status: null,
          contentType: null,
          transferBytes: null,
          bodyBytes: null,
          collectError: true,
        });
      }),
    );
  });
  page.on('requestfailed', (req) => {
    if (req.resourceType() === 'image') failedImageRequests++;
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1000); // lazy 이미지 잔여 로드 여유
  await page.screenshot({ path: join(routeDir, 'screenshot.png'), fullPage: true });
  await Promise.allSettled(pending);
  await browser.close();
  const byFormat = {};
  for (const img of images) {
    const f = (img.contentType || 'unknown').split(';')[0];
    byFormat[f] = (byFormat[f] || 0) + 1;
  }
  return {
    requestCount: images.length,
    failedImageRequests, // 깨진 이미지가 "bytes 감소 개선"으로 위장하는 것을 막는 지표
    totalTransferBytes: images.reduce((a, i) => a + (i.transferBytes || 0), 0),
    byFormat,
    images: images.sort((a, b) => (b.transferBytes || 0) - (a.transferBytes || 0)),
  };
}

// ---- 실행 ----
const startedAt = new Date().toISOString();
await waitReady(t.base + routes[0]);
const summary = { routes: {} };
for (const route of routes) {
  const url = t.base + route;
  const routeDir = join(outDir, slug(route));
  mkdirSync(routeDir, { recursive: true });
  console.log(`[measure] route ${route} — lighthouse x${runs}`);
  const runResults = [];
  for (let i = 1; i <= runs; i++) {
    if (serverExited) fail('측정 도중 서버 프로세스가 종료됨 — 이후 수치는 무효.');
    const base = join(routeDir, `run-${i}`);
    const lhr = runLighthouse(url, base);
    if (lhr.runtimeError)
      fail(`lighthouse runtimeError (${lhr.runtimeError.code}): ${lhr.runtimeError.message}`);
    const finalPath = new URL(lhr.finalDisplayedUrl || lhr.finalUrl || url).pathname;
    const redirected = finalPath !== route;
    if (redirected)
      console.warn(
        `  경고: ${route} 요청이 ${finalPath}로 이동해 측정됨 (리다이렉트) — summary에 기록`,
      );
    const r = { run: i, ...extract(lhr), finalPath, redirected };
    if (r.lcpMs == null) fail(`run ${i}: LCP 미산출 — 빈/에러 페이지 측정 방지 위해 중단.`);
    runResults.push({ ...r, lighthouseVersion: lhr.lighthouseVersion, fetchTime: lhr.fetchTime });
    console.log(`  run ${i}/${runs}: LCP ${Math.round(r.lcpMs)}ms, score ${r.perfScore}`);
  }
  const medians = {};
  for (const k of ['perfScore', ...Object.keys(METRIC_AUDITS)])
    medians[k] = median(runResults.map((r) => r[k]));
  // LCP 기준 median run의 HTML만 보존, 나머지 run 파일은 정리
  const byLcp = [...runResults].sort((a, b) => a.lcpMs - b.lcpMs);
  const medianRun = byLcp[Math.floor(byLcp.length / 2)].run;
  renameSync(
    join(routeDir, `run-${medianRun}.report.html`),
    join(routeDir, 'lighthouse-median.html'),
  );
  for (let i = 1; i <= runs; i++) {
    rmSync(join(routeDir, `run-${i}.report.json`), { force: true });
    rmSync(join(routeDir, `run-${i}.report.html`), { force: true });
  }
  console.log(`[measure] route ${route} — playwright 이미지 지표`);
  const imageStats = await measureImages(url, routeDir);
  writeFileSync(join(routeDir, 'images.json'), JSON.stringify(imageStats, null, 2));
  summary.routes[route] = {
    lighthouse: { medians, medianRunForHtml: medianRun, runs: runResults },
    images: {
      requestCount: imageStats.requestCount,
      failedImageRequests: imageStats.failedImageRequests,
      totalTransferBytes: imageStats.totalTransferBytes,
      byFormat: imageStats.byFormat,
    },
  };
}
killServer();

// ---- 기록 ----
const meta = {
  commit,
  commitShort: short,
  branch,
  dirty,
  label,
  target,
  routes,
  notes: args.notes || null,
  skipBuild: !!args['skip-build'],
  backendEnvVar: process.env.VITE_BACKEND_URL ?? null, // null이면 vite 기본값(k-spot.kro.kr) 또는 .env
  measuredAt: startedAt,
  finishedAt: new Date().toISOString(),
  node: process.version,
  lighthouse: {
    runsPerRoute: runs,
    ...LH_SETTINGS,
    version: summary.routes[routes[0]]?.lighthouse.runs[0]?.lighthouseVersion,
  },
  playwright: { viewport: PW_VIEWPORT, deviceScaleFactor: PW_DEVICE_SCALE, chromePath },
};
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n[measure] 완료 → ${outDir}`);
for (const [route, r] of Object.entries(summary.routes)) {
  const m = r.lighthouse.medians;
  console.log(
    `  ${route}: perf ${m.perfScore} · LCP ${Math.round(m.lcpMs)}ms · CLS ${m.cls?.toFixed(3)} · 이미지 ${r.images.requestCount}건 ${(r.images.totalTransferBytes / 1024).toFixed(1)}KB`,
  );
}
if (dirty) console.warn('[measure] 경고: 작업 트리가 dirty 상태로 측정됨 (meta.json에 기록)');
