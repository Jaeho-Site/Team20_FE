#!/usr/bin/env node
/**
 * 상태줄 — 컨텍스트 사용률과 세션 비용을 상시 노출해 /clear·/compact 타이밍을 놓치지 않게 한다.
 * 로컬 실행이라 API 토큰을 소비하지 않는다.
 */
const C = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' };

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let d = {};
  try {
    d = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write('kspot-refactor');
    return;
  }

  const parts = [];
  const model = d?.model?.display_name;
  if (model) parts.push(`${C.cyan}${model}${C.reset}`);

  const dir = d?.workspace?.current_dir;
  if (dir) parts.push(`${C.dim}${String(dir).replace(/\\/g, '/').split('/').pop()}${C.reset}`);

  const pct = d?.context_window?.used_percentage;
  if (typeof pct === 'number') {
    const color = pct >= 90 ? C.red : pct >= 70 ? C.yellow : C.green;
    const filled = Math.round(Math.min(pct, 100) / 10);
    parts.push(`${color}ctx ${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${pct.toFixed(0)}%${C.reset}`);
  }

  const cost = d?.cost?.total_cost_usd;
  if (typeof cost === 'number') parts.push(`${C.dim}$${cost.toFixed(2)}${C.reset}`);

  const rl = d?.rate_limits?.five_hour?.used_percentage;
  if (typeof rl === 'number') {
    const color = rl >= 80 ? C.red : rl >= 50 ? C.yellow : C.dim;
    parts.push(`${color}5h ${rl.toFixed(0)}%${C.reset}`);
  }

  process.stdout.write(parts.join(`${C.dim} │ ${C.reset}`));
});
