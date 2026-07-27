#!/usr/bin/env node
/**
 * PreToolUse (Bash) — 팀 저장소(upstream)로 향하는 원격 작업을 결정론적으로 차단한다.
 * 이 저장소는 kakao-tech-campus-3rd-step3/Team20_FE의 fork이므로,
 * `gh pr create`는 기본적으로 부모(팀) 저장소를 base로 잡는다. 모든 원격 반영은
 * fork(Jaeho-Site/Team20_FE)로만 허용한다.
 *
 * 규약: exit 2 + stderr = 차단(피드백은 Claude에게 전달), exit 0 = 통과.
 */

const UPSTREAM_ORG = 'kakao-tech-campus-3rd-step3';
const FORK = 'Jaeho-Site/Team20_FE';

function block(why) {
  process.stderr.write(
    `차단됨: 팀 저장소(upstream) 보호 규칙 위반\n이유: ${why}\n모든 원격 반영은 fork(${FORK})로만 한다. gh pr 명령에는 --repo ${FORK} 를 명시할 것.\n`,
  );
  process.exit(2);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = JSON.parse(raw || '{}')?.tool_input?.command ?? '';
  } catch {
    cmd = raw; // 파싱 실패 시 원문 전체를 보수적으로 검사한다
  }
  if (!cmd) process.exit(0);

  // 1. 팀 저장소를 문자열로라도 가리키면 무조건 차단 (push URL, gh -R, gh api, remote add 전부 커버)
  if (cmd.toLowerCase().includes(UPSTREAM_ORG.toLowerCase())) {
    block(`명령이 팀 저장소 조직(${UPSTREAM_ORG})을 가리킨다. 읽기가 필요하면 사용자와 상의할 것.`);
  }

  // 2. upstream이라는 이름의 원격으로 push (원격이 나중에 추가되는 경우 대비)
  if (/\bgit\s+push\b[^|;&]*\bupstream\b/.test(cmd)) {
    block('git push upstream — upstream 원격으로는 push하지 않는다.');
  }

  // 3. PR 변형 명령은 --repo/-R로 fork를 명시했을 때만 통과
  //    (fork에서 gh pr create의 기본 base는 부모 저장소다)
  // gh 또는 gh.exe(전체 경로 호출 포함) 모두 매칭
  const pr = cmd.match(/\bgh(?:\.exe)?["']?\s+pr\s+(create|merge|close|edit|comment|review|ready|reopen|lock|unlock)\b/);
  if (pr) {
    const explicitFork = new RegExp(`(--repo|-R)[=\\s]+["']?${FORK.replace('/', '\\/')}\\b`, 'i');
    if (!explicitFork.test(cmd)) {
      block(`gh pr ${pr[1]} 에 --repo ${FORK} 가 없다. 명시하지 않으면 팀 저장소를 대상으로 할 수 있다.`);
    }
  }

  // 4. gh api 쓰기 요청(-X POST/PATCH/PUT/DELETE 또는 -f/-F 필드 = 암묵적 POST)은
  //    대상에 fork 소유자가 명시돼 있을 때만 통과
  if (/\bgh(?:\.exe)?["']?\s+api\b/.test(cmd)) {
    const mutating = /(-X|--method)[=\s]+["']?(POST|PATCH|PUT|DELETE)/i.test(cmd) || /\s(-[fF]|--field|--raw-field)[=\s]/.test(cmd);
    if (mutating && !/jaeho-site/i.test(cmd)) {
      block('gh api 쓰기 요청에 대상 저장소(Jaeho-Site/...)가 명시돼 있지 않다. {owner}는 부모 저장소로 풀릴 수 있다.');
    }
  }

  process.exit(0);
});
