@echo off
chcp 65001 >nul
cd /d D:\HR_IN_Solution

echo.
echo  HR_IN 자동 검증
echo  ─────────────────────────────
echo.

node scripts\verify.mjs %*
set EXIT=%ERRORLEVEL%

if %EXIT%==0 (
    echo.
    echo  검증 성공.
) else (
    echo.
    echo  검증 실패. --start 옵션으로 자동 수리/기동:
    echo    verify.cmd --start
)

exit /b %EXIT%
