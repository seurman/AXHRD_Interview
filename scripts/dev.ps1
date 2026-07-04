# HR_IN Dev Server
$Root = "D:\HR_IN_Solution"

Write-Host "=== HR_IN Dev Server ===" -ForegroundColor Cyan
Write-Host ""

function Stop-PortListener {
    param([int]$Port)
    $killed = $false
    $lines = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    foreach ($line in $lines) {
        if ($line -match '\s(\d+)$') {
            $procId = [int]$Matches[1]
            if ($procId -gt 0 -and $procId -ne $PID) {
                Write-Host "[INFO] 포트 $Port 점유 (PID $procId) — 이전 dev 서버 종료" -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                $killed = $true
            }
        }
    }
    return $killed
}

# IRT health check
$irtOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $irtOk = $true }
} catch {}

if (-not $irtOk) {
    Write-Host "[WARN] IRT Engine (8000) 이 실행 중이 아닙니다." -ForegroundColor Yellow
    Write-Host "       면접 기능을 쓰려면 다른 터미널에서:" -ForegroundColor Yellow
    Write-Host "       D:\HR_IN_Solution\start-irt.cmd" -ForegroundColor White
    Write-Host ""
    $start = Read-Host "지금 IRT를 새 창에서 시작할까요? (Y/n)"
    if ($start -ne "n" -and $start -ne "N") {
        Start-Process cmd -ArgumentList "/c", "D:\HR_IN_Solution\start-irt.cmd"
        Write-Host "[INFO] IRT 시작 대기 중 (5초)..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

Set-Location $Root
try {
    $pg = docker ps --filter "name=hr-in-postgres" --format "{{.Names}}" 2>$null
    if (-not $pg) {
        Write-Host "[INFO] PostgreSQL 시작 중..." -ForegroundColor Yellow
        docker compose up -d postgres
    }
} catch {
    Write-Host "[WARN] Docker 미사용 — DB 없으면 대시보드/면접 저장 불가" -ForegroundColor Yellow
}

Set-Location "$Root\web"
if (-not (Test-Path ".env")) {
    Copy-Item "$Root\.env.example" ".env"
}

$hadStaleServer = Stop-PortListener -Port 3000
if ($hadStaleServer) {
    Start-Sleep -Seconds 2
}

# 손상된 .next 캐시 → Internal Server Error (CLEAN=1 또는 이전 서버가 3000 점유 중이었을 때)
if (($env:CLEAN -eq "1" -or $hadStaleServer) -and (Test-Path ".next")) {
    Write-Host "[INFO] .next 캐시 삭제 (깨끗한 재시작)..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
}

Write-Host ""
Write-Host "Web: http://localhost:3000" -ForegroundColor Green
npm run dev
