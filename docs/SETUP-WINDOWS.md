# Windows 세팅 가이드 — D:\HR_IN_Solution

## 사전 요구사항

| 도구 | 용도 | 확인 |
|------|------|------|
| **Node.js 20+** | Next.js | `node -v` |
| **Docker Desktop** | PostgreSQL + IRT | Docker 실행 중 |
| **Chrome / Edge** | 음성 면접 (Web Speech) | 마이크 허용 |

선택: Python 3.12 (Docker 대신 IRT 로컬 실행 시)

---

## 1. 프로젝트 위치

모든 명령은 아래 루트 기준입니다.

```
D:\HR_IN_Solution
```

이전 경로(`CrossDevice\...\HR_IN_Solution`)는 사용하지 않습니다.

---

## 2. 최초 세팅 (한 번만)

**방법 A (권장)** — 실행 정책 변경 없이:

```cmd
D:\HR_IN_Solution\setup.cmd
```

탐색기에서 `setup.cmd` 더블클릭해도 됩니다.

**방법 B** — PowerShell:

```powershell
Set-Location D:\HR_IN_Solution
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

### "스크립트 실행이 이 시스템에서 사용되지 않도록 설정" 오류

`.ps1`을 직접 실행하면 Windows 기본 보안 정책에 막힐 수 있습니다.  
**`setup.cmd` / `dev.cmd`를 사용**하거나 `-ExecutionPolicy Bypass`를 붙이세요.

영구 허용(선택):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

스크립트가 하는 일:

1. `web\.env` 생성
2. `docker compose up` (postgres + irt-engine)
3. `npm install`
4. `prisma migrate` + `db:seed`

---

## 3. 매일 개발 서버

```cmd
D:\HR_IN_Solution\dev.cmd
```

브라우저: http://localhost:3000

---

## 4. 서비스 포트

| 서비스 | URL |
|--------|-----|
| **웹앱 (메인)** | http://localhost:3000 |
| IRT Engine | http://localhost:8000/api/v1/health |
| PostgreSQL | localhost:5432 |

DB 접속 정보:

- User: `hrin`
- Password: `hrin`
- Database: `hr_in_solution`

---

## 5. env 파일 위치

```
D:\HR_IN_Solution\web\.env    ← Next.js가 읽음 (필수)
D:\HR_IN_Solution\.env          ← 참조용 (동기화 권장)
```

API 키 예시:

```env
GEMINI_API_KEY="your-key"
DEEPSEEK_API_KEY="your-key"
```

키 없어도 mock 모드로 동작합니다.

---

## 6. 자주 쓰는 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 |
| `/interview/setup` | 면접 설정·시작 |
| `/dashboard` | 역량 트래킹 |
| `/profile` | 프로필 |

---

## 7. IRT health (8000) 안 될 때

면접 적응형 로직은 **IRT Engine (port 8000)** 이 필요합니다.

### 방법 A — 로컬 Python (권장, Docker 없이)

**새 터미널**을 열고:

```cmd
D:\HR_IN_Solution\start-irt.cmd
```

브라우저: http://localhost:8000/api/v1/health  
→ `{"status":"ok","service":"irt-engine",...}` 가 보이면 성공

### 방법 B — Docker 재빌드

```cmd
D:\HR_IN_Solution\fix-irt-docker.cmd
```

### 실행 순서 (정상)

| 터미널 | 명령 |
|--------|------|
| 1 | `start-irt.cmd` (IRT, 8000) |
| 2 | `dev.cmd` (웹, 3000) |

Docker는 **PostgreSQL만** 켜도 됩니다 (`infra.cmd`).

---

## 8. 문제 해결

### `DATABASE_URL` not found

```powershell
Copy-Item D:\HR_IN_Solution\.env.example D:\HR_IN_Solution\web\.env
```

### Docker 연결 실패

Docker Desktop 실행 후:

```powershell
Set-Location D:\HR_IN_Solution
.\scripts\infra.ps1
```

### Prisma migrate 재실행

```powershell
Set-Location D:\HR_IN_Solution\web
npx prisma migrate dev
npm run db:seed
```

### IRT Engine 연결 실패

```powershell
curl http://localhost:8000/api/v1/health
```

Docker IRT 컨테이너 확인:

```powershell
docker logs hr-in-irt
```

---

## 8. Cursor에서 열기

1. **File → Open Workspace from File**
2. `D:\HR_IN_Solution\HR_IN_Solution.code-workspace` 선택
3. 터미널에서 `.\scripts\dev.ps1`
