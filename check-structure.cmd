@echo off
chcp 65001 >nul
echo.
echo === HR_IN Solution 폴더 구조 확인 ===
echo.

set "ROOT=D:\HR_IN_Solution"
echo [경로] %ROOT%
echo.

if not exist "%ROOT%" (
    echo [ERROR] %ROOT% 폴더 자체가 없습니다.
    goto :end
)

echo --- 루트 내용 ---
dir /b "%ROOT%"
echo.

if exist "%ROOT%\web\package.json" (
    echo [OK] web 폴더 있음 ^(Next.js 앱^)
    echo       실행: cd /d %ROOT%\web ^&^& npm run dev
) else (
    echo [ERROR] web 폴더 없음!
    echo.
    echo  Next.js 앱은 반드시  %ROOT%\web  에 있어야 합니다.
    echo  scripts, setup.cmd 만 복사한 경우 전체 프로젝트를 다시 복사하세요.
    echo.
    echo  필요한 폴더:
    echo    web\                  ^(필수^)
    echo    services\irt-engine\  ^(IRT^)
    echo    seed\
    echo    scripts\
)

if exist "%ROOT%\services\irt-engine\app\main.py" (
    echo [OK] services\irt-engine 있음
) else (
    echo [WARN] services\irt-engine 없음
)

echo.
echo --- D: 드라이브에서 HR_IN 이름 검색 ---
dir /b /ad D:\ 2>nul | findstr /i HR
echo.

:end
pause
