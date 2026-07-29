import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 서버 컴포넌트/generateMetadata의 axios 호출을 가로챈다 (instrumentation.ts에서 기동)
export const server = setupServer(...handlers);
