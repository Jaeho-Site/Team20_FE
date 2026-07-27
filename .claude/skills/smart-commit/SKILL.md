---
name: smart-commit
description: 이 저장소의 컨벤션에 맞춰 스테이징된 변경을 커밋한다.
disable-model-invocation: true
allowed-tools: Bash(git add *), Bash(git commit *), Bash(git status *), Bash(git diff *)
---

# 커밋

## 현재 스테이징된 변경

!`git diff --staged --stat`

## 상세 diff

!`git diff --staged`

## 스테이징되지 않은 변경

!`git status --short`

## 지시

1. 스테이징된 것이 없으면 **커밋하지 말고** 사용자에게 무엇을 담을지 묻는다. 임의로 `git add .` 하지 않는다.
2. 위 diff가 **하나의 논리적 변경**인지 확인한다. 서로 다른 관심사가 섞여 있으면 커밋을 나눌 것을 제안한다.
3. 이 저장소의 형식으로 메시지를 작성한다:

```
type : 한글 설명
```

- **콜론 앞뒤에 공백이 들어간다.** (`refactor : useMemo 삭제`)
- type: `feat` | `fix` | `refactor` | `chore` | `docs` | `ci` | `test`
- 설명은 한 줄, 무엇을 했는지 한국어로. 마침표 없음.
- 본문이 필요한 변경이면 빈 줄 뒤에 "왜"를 적는다. "무엇을"은 diff가 말해준다.

4. 커밋 전 확인:
   - 현재 브랜치가 `main`이면 커밋하지 말고 브랜치 생성을 먼저 제안한다.
   - `.env`, 키, 토큰이 diff에 섞여 있지 않은지 확인한다. 있으면 중단하고 보고한다.
   - 생성 파일(`routeTree.gen.ts`)이 소스 변경과 함께 들어간 것은 정상이다.

5. 커밋 후 `git log --oneline -1`로 결과를 보여준다. **푸시는 하지 않는다.**
