export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
  ) {
    const { server } = await import('./mocks/node');
    // 측정 대상 API 외(Next 내부 요청 등)는 실제 네트워크로 통과시킨다
    server.listen({ onUnhandledRequest: 'bypass' });
    console.log('[msw] server-side API mocking enabled');
  }
}
