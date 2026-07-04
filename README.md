# HR_IN Solution

> **프로젝트 루트:** `D:\HR_IN_Solution`

IRT(문항 반응 이론) 기반 **Adaptive Learning** 모의 면접 플랫폼.

## 빠른 실행 (Windows)

### 한 번에 (검증 + IRT + 웹) — **권장**

```cmd
D:\HR_IN_Solution\start-all.cmd
```

### 검증만

```cmd
D:\HR_IN_Solution\verify.cmd
D:\HR_IN_Solution\verify.cmd --start
```

`--start`: IRT·DB 없으면 **자동으로 켜고** 다시 검증 (Docker IRT 불필요, Python 로컬 사용)

---

### 최초 1회

**방법 A (권장)** — 탐색기에서 `D:\HR_IN_Solution\setup.cmd` 더블클릭  
또는 cmd/PowerShell:

```cmd
D:\HR_IN_Solution\setup.cmd
```

**방법 B** — PowerShell 실행 정책 우회:

```powershell
Set-Location D:\HR_IN_Solution
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

> `.\scripts\setup.ps1` 직접 실행 시 "스크립트 실행이 금지" 오류가 나면 위 방법을 사용하세요.

### 매일 개발

```cmd
D:\HR_IN_Solution\dev.cmd
```

→ 브라우저: **http://localhost:3000**

---

## 실행 위치 정리

| 무엇을 | 어디서 | 명령 |
|--------|--------|------|
| **전체 세팅 (1회)** | `D:\HR_IN_Solution` | `.\scripts\setup.ps1` |
| **웹앱 실행** | `D:\HR_IN_Solution` | `.\scripts\dev.ps1` |
| **DB+IRT만** | `D:\HR_IN_Solution` | `.\scripts\infra.ps1` |
| **수동 웹 실행** | `D:\HR_IN_Solution\web` | `npm run dev` |
| **IRT 단독 (Python)** | `D:\HR_IN_Solution\services\irt-engine` | `uvicorn app.main:app --reload --port 8000` |

---

## 프로젝트 구조

```
D:\HR_IN_Solution\
├── scripts/              setup.ps1 · dev.ps1 · infra.ps1
├── docs/                 아키텍처 · IRT · 로드맵
├── services/irt-engine/  Python FastAPI — IRT 2PL
├── web/                  Next.js 15 — 프론트 + API
├── seed/                 문항 시드
├── docker-compose.yml
├── .env                  루트 참조용
└── web/.env              Next.js가 실제로 읽는 env
```

---

## 환경 변수

- 템플릿: `D:\HR_IN_Solution\.env.example`
- **Next.js는 `web\.env`만 로드**합니다. API 키는 `web\.env`에 넣으세요.

```powershell
Copy-Item D:\HR_IN_Solution\.env.example D:\HR_IN_Solution\web\.env
# web\.env 편집 (GEMINI_API_KEY, DEEPSEEK_API_KEY 등)
```

---

## 수동 실행 (스크립트 없이)

```powershell
# 1) 인프라
Set-Location D:\HR_IN_Solution
docker compose up -d postgres irt-engine

# 2) 웹 (최초 1회)
Set-Location D:\HR_IN_Solution\web
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

---

## Cursor / VS Code

워크스페이스 파일 열기:

```
D:\HR_IN_Solution\HR_IN_Solution.code-workspace
```

터미널 기본 경로가 `D:\HR_IN_Solution`으로 설정됩니다.

---

## API 비용 전략

| 용도 | API |
|------|-----|
| TTS · 실시간 채점 · 질문 개인화 | Gemini 2.5 Flash-Lite / Flash-Preview-TTS |
| 세션 리포트 · 역량 피드백 | DeepSeek |
| STT (MVP) | Web Speech API (브라우저) |

> 중국계 벤더(MiniMax) 대신 Gemini로 통일 — PIPA 국외이전 이슈 회피, 단일 API 키로 TTS·채점·개인화 관리.

## 문서

- [Windows 세팅 상세](docs/SETUP-WINDOWS.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [IRT 엔진](docs/IRT.md)
- [로드맵](docs/ROADMAP.md)
