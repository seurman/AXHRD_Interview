@echo off
chcp 65001 >nul
title HR_IN IRT Engine (port 8000)
cd /d D:\HR_IN_Solution\services\irt-engine

echo === IRT Engine 로컬 실행 ===
echo URL: http://localhost:8000/api/v1/health
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Python 가상환경 생성...
    py -3 -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Python이 없습니다. https://python.org 에서 Python 3.12+ 설치 후 다시 실행하세요.
        echo        Windows Store "python" 단축키는 동작하지 않습니다. py -3 또는 Python 설치 시 "Add to PATH" 체크.
        pause
        exit /b 1
    )
)

echo [2/3] 패키지 설치...
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo [3/3] 서버 시작 (Ctrl+C 로 종료)...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
