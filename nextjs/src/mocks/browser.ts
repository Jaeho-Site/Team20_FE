import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// 클라이언트(React Query) fetch를 가로챈다 (MswGate에서 기동)
export const worker = setupWorker(...handlers);
