@echo off
chcp 65001 >nul
cd /d D:\HR_IN_Solution

echo === Docker IRT 재빌드 ===
docker compose build irt-engine
if errorlevel 1 (
    echo.
    echo [WARN] Docker 빌드 실패. 대신 start-irt.cmd 로 로컬 실행하세요.
    pause
    exit /b 1
)

docker compose up -d irt-engine
timeout /t 3 /nobreak >nul

echo.
echo === 상태 확인 ===
docker ps --filter "name=hr-in-irt"
echo.
echo health: http://localhost:8000/api/v1/health
curl -s http://localhost:8000/api/v1/health 2>nul || echo curl 실패 - 브라우저에서 직접 확인하세요
echo.
pause
