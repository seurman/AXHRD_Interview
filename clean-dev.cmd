@echo off
chcp 65001 >nul
title HR_IN Clean Dev Cache
cd /d D:\HR_IN_Solution\web

echo === 포트 3000 dev 서버 종료 ===
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
  echo [INFO] PID %%a 종료
  taskkill /F /PID %%a >nul 2>&1
)

echo.
echo === Next.js 캐시 삭제 ===
if exist ".next" (
  rmdir /s /q ".next"
  echo [OK] .next 삭제됨
) else (
  echo [INFO] .next 없음
)

echo.
echo 이제 dev 서버를 시작하세요:
echo   cd D:\HR_IN_Solution
echo   .\dev.cmd
echo.
pause
