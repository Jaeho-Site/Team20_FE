/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import TanStackRouterVite from '@tanstack/router-plugin/vite';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const apiProxy = (env: Record<string, string>) => ({
  '^/api': {
    target: env.VITE_BACKEND_URL || 'https://k-spot.kro.kr/api',
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      TanStackRouterVite({
        routesDirectory: './src/pages',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // 라이브러리별 gzip 기여분을 측정하기 위한 분리(docs/refactor/goals.md 실험 B·D).
          // @tanstack/store는 form과 router가 공유하므로 어느 한쪽에 귀속시키지 않는다.
          manualChunks(id: string) {
            const nid = id.replace(/\\/g, '/');
            if (!nid.includes('node_modules')) return undefined;
            if (
              nid.includes('@tanstack/react-query-devtools') ||
              nid.includes('@tanstack/query-devtools')
            )
              return 'tanstack-query-devtools';
            if (nid.includes('@tanstack/react-form') || nid.includes('@tanstack/form-core'))
              return 'tanstack-form';
            if (
              nid.includes('@tanstack/react-router') ||
              nid.includes('@tanstack/router-') ||
              nid.includes('@tanstack/history')
            )
              return 'tanstack-router';
            if (nid.includes('@tanstack/react-query') || nid.includes('@tanstack/query-'))
              return 'tanstack-query';
            if (nid.includes('@tanstack/react-store') || nid.includes('@tanstack/store'))
              return 'tanstack-store';
            if (nid.includes('node_modules/zod/')) return 'zod';
            if (nid.includes('node_modules/react-hook-form/') || nid.includes('@hookform/'))
              return 'react-hook-form';
            if (
              nid.includes('node_modules/react/') ||
              nid.includes('node_modules/react-dom/') ||
              nid.includes('node_modules/scheduler/')
            )
              return 'react-vendor';
            return 'vendor';
          },
        },
      },
    },
    server: {
      proxy: apiProxy(env),
    },
    // vite preview는 server.proxy를 쓰지 않는다 — npm run measure가 실제 콘텐츠·이미지를
    // 로드한 상태로 측정하려면 preview에도 같은 프록시가 필요하다.
    preview: {
      proxy: apiProxy(env),
    },
    test: {
      projects: [
        {
          // extends: true를 쓰면 TanStackRouterVite가 테스트 실행마다 routeTree.gen.ts를
          // 재기록하므로 필요한 플러그인(경로 별칭)만 명시한다.
          plugins: [tsconfigPaths()],
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: 'playwright',
              instances: [
                {
                  browser: 'chromium',
                },
              ],
            },
            setupFiles: ['.storybook/vitest.setup.ts'],
          },
        },
      ],
    },
  };
});
