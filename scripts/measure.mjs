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
 */
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, rmSync, renameSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
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
const t = TARGETS[target];

function fail(msg) {
  console.error(`[measure] 실패: ${msg}`);
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
  return route === '/' ? 'root' : route.replace(/^\//, '').replace(/[^a-zA-Z0-9가-힣]+/g, '-');
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
} else console.log('[measure] --skip-build: 기존 빌드 산출물 사용');

// ---- 서버 기동 ----
console.log(`[measure] serve: ${t.serveCmd}`);
const server = spawn(t.serveCmd, { cwd: t.cwd, shell: true, stdio: 'ignore' });
async function waitReady(url, timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
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
  page.on('requestfinished', async (req) => {
    if (req.resourceType() !== 'image') return;
    const resp = await req.response();
    const sizes = await req.sizes().catch(() => null);
    images.push({
      url: req.url(),
      status: resp?.status() ?? null,
      contentType: resp ? ((await resp.headerValue('content-type')) ?? null) : null,
      transferBytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : null,
      bodyBytes: sizes?.responseBodySize ?? null,
    });
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(1000); // lazy 이미지 잔여 로드 여유
  await page.screenshot({ path: join(routeDir, 'screenshot.png'), fullPage: true });
  await browser.close();
  const byFormat = {};
  for (const img of images) {
    const f = (img.contentType || 'unknown').split(';')[0];
    byFormat[f] = (byFormat[f] || 0) + 1;
  }
  return {
    requestCount: images.length,
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
    const base = join(routeDir, `run-${i}`);
    const lhr = runLighthouse(url, base);
    runResults.push({
      run: i,
      ...extract(lhr),
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
    });
    console.log(
      `  run ${i}/${runs}: LCP ${Math.round(runResults.at(-1).lcpMs)}ms, score ${runResults.at(-1).perfScore}`,
    );
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
