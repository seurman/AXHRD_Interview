@echo off
chcp 65001 >nul
setlocal
cd /d D:\HR_IN_Solution 2>nul
if errorlevel 1 (
  echo [ERROR] D:\HR_IN_Solution 없음
  exit /b 1
)

echo === git remote / branch ===
git remote -v
git status -sb
git branch --show-current

echo.
echo === fetch master ===
git fetch origin master
if errorlevel 1 (
  echo [WARN] git fetch 실패 — GitHub raw 로 직접 다운로드합니다.
  goto :DOWNLOAD
)

echo.
echo === checkout docs from origin/master ===
git checkout origin/master -- docs/SOLUTION-MODULES.md docs/STATUS.md
if errorlevel 1 goto :DOWNLOAD

if exist "docs\SOLUTION-MODULES.md" (
  echo [OK] docs\SOLUTION-MODULES.md
  dir docs\SOLUTION-MODULES.md
  exit /b 0
)

:DOWNLOAD
echo.
echo === fallback: download from GitHub raw ===
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; ^
  "$dir='D:\HR_IN_Solution\docs'; ^
  "New-Item -ItemType Directory -Force -Path $dir | Out-Null; ^
  "$url='https://raw.githubusercontent.com/seurman/AXHRD_Interview/master/docs/SOLUTION-MODULES.md'; ^
  "$out=Join-Path $dir 'SOLUTION-MODULES.md'; ^
  "Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing; ^
  "Get-Item $out | Format-List FullName,Length,LastWriteTime"

if exist "docs\SOLUTION-MODULES.md" (
  echo [OK] downloaded docs\SOLUTION-MODULES.md
  exit /b 0
)

echo [ERROR] 동기화 실패
exit /b 1
