@echo off
chcp 65001 >nul
cd /d D:\HR_IN_Solution

echo.
echo  ========================================
echo   HR_IN — 검증 + 서비스 자동 시작
echo  ========================================
echo.

REM 1) 검증 + IRT/DB 자동 기동 + venv/npm 수리
node scripts\verify.mjs --start --fix
if errorlevel 1 (
    echo.
    echo  [WARN] 일부 검증 실패 — IRT는 start-irt.cmd 로 별도 실행 가능
    echo         DB/웹은 계속 진행합니다.
)

echo.
echo  웹 서버 시작...
echo  URL: http://localhost:3000
echo  IRT: http://localhost:8000/api/v1/health
echo.

cd web
npm run dev
