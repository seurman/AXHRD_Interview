@echo off
chcp 65001 >nul
cd /d D:\HR_IN_Solution\web

echo.
echo  === Prisma Client 생성 ===
echo.

REM dev 서버(3000)가 켜져 있으면 query_engine DLL 잠금 → EPERM
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo  [WARN] 포트 3000 사용 중 PID %%a — dev 서버를 종료합니다.
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)

if exist node_modules\.prisma (
    echo  [INFO] .prisma 캐시 삭제...
    rmdir /s /q node_modules\.prisma
)

call npm.cmd run db:generate
if errorlevel 1 (
    echo.
    echo  [ERROR] prisma generate 실패
    echo  dev.cmd 창을 모두 닫고 다시 실행하세요.
    pause
    exit /b 1
)

echo.
echo  [OK] Prisma Client 생성 완료
echo  다음: D:\HR_IN_Solution\dev.cmd
echo.
pause
