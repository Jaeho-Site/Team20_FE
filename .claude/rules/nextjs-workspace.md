---
paths:
  - "nextjs/**"
---

# nextjs/ 작업 규칙

이 디렉토리는 루트 Vite 앱을 Next.js(App Router)로 옮긴 **별도 워크스페이스**다. 루트와 독립된 `package.json`, `tsconfig.json`, `eslint.config.mjs`를 가진다.

## 먼저 확인할 것

- 루트 `eslint.config.js`는 `nextjs/**`를 **ignore한다.** 루트에서 `npm run lint`가 통과해도 여기 코드는 검사되지 않았다. 검증은 반드시 `cd nextjs && npm run ci`.
- `nextjs/node_modules`는 별도로 설치해야 한다 (`cd nextjs && npm install`).
- 빌드는 `next build --turbopack`이다. 루트의 vite 빌드 결과와 번들 수치를 직접 비교할 때는 **번들러가 다르다는 점을 명시**해야 한다. 같은 축으로 비교하려면 gzip된 초기 JS 전송량 등 번들러 중립 지표를 쓴다.

## 루트와의 중복

`nextjs/src/`의 features/entities/shared는 루트 `src/`와 대부분 같은 파일의 사본이다.

- 어느 쪽을 정본으로 삼을지 정하지 않은 채 양쪽을 고치지 않는다. 한쪽만 고쳤다면 **드리프트가 생겼다는 사실을 결과 보고에 적는다.**
- 중복 현황을 조사할 때는 `migration-differ` subagent에 위임한다(양쪽 파일을 다 읽으면 메인 컨텍스트가 넘친다).

## Next.js 고유 주의점

- `'use client'` 경계를 임의로 넓히지 않는다. 클라이언트 컴포넌트로 바꾸면 서버 렌더 이점이 사라지고, 이는 측정 대상 지표다.
- 라우팅은 파일 시스템 기반(`app/content/[id]/page.tsx`)이다. 루트의 TanStack Router와 개념이 다르므로 라우팅 비교 시 이 차이를 전제로 서술한다.
- 환경변수 접두사는 `NEXT_PUBLIC_`이다 (루트는 `VITE_`).

## 배포 자산

`Dockerfile`, `k8s/`, `scripts/*.ps1`, `k6-tests/`는 실제 배포·부하 테스트 자산이다.

- 배포 스크립트(`deploy.ps1`, `build-and-push.ps1`) 실행은 권한 설정에서 차단돼 있다. 내용을 읽고 분석하는 것은 가능하다.
- `k6-tests/`는 이미 존재하는 부하 측정 수단이다. 성능 비교 실험을 설계할 때 새로 만들기 전에 이것부터 재사용할지 검토한다.
