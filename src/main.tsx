import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RrApp } from '@/app/RrApp.tsx';

// 실험 D의 B안 브랜치 — TanStack 라우터 앱(App) 대신 React Router 서브셋을 마운트
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RrApp />
  </StrictMode>,
);
