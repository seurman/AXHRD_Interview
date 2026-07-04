@echo off
chcp 65001 >nul
cd /d D:\HR_IN_Solution\web

echo === 자소서 파서 패키지 설치 (mammoth, pdf-parse, word-extractor) ===
call npm install mammoth pdf-parse word-extractor @types/pdf-parse

if exist node_modules\mammoth (
    echo [OK] mammoth 설치됨
) else (
    echo [ERROR] mammoth 설치 실패
    pause
    exit /b 1
)

echo.
echo 완료. dev 서버를 재시작하세요: npm run dev
pause
