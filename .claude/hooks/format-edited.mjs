#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write) — 방금 편집한 파일만 prettier로 포맷한다.
 * prettier가 설치돼 있지 않으면(=node_modules 미설치) 조용히 통과한다.
 * 항상 exit 0: 포맷 실패가 작업을 막아서는 안 된다.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.yml', '.yaml']);
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let filePath = '';
  try {
    filePath = JSON.parse(raw || '{}')?.tool_input?.file_path ?? '';
  } catch {
    process.exit(0);
  }
  if (!filePath || !EXT.has(path.extname(filePath).toLowerCase())) process.exit(0);
  if (!existsSync(filePath)) process.exit(0);

  // 파일이 속한 워크스페이스의 prettier를 우선 사용 (nextjs/는 자체 설정을 가진다)
  const candidates = [
    path.join(projectDir, 'nextjs', 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
    path.join(projectDir, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
  ];
  const inNextjs = path.resolve(filePath).replace(/\\/g, '/').includes('/nextjs/');
  const ordered = inNextjs ? candidates : [...candidates].reverse();
  const bin = ordered.find((p) => existsSync(p));
  if (!bin) process.exit(0); // 아직 npm install 전

  spawnSync(process.execPath, [bin, '--write', filePath], { stdio: 'ignore', timeout: 20000 });
  process.exit(0);
});
