# HR_IN Solution — 최초 1회 세팅 (Docker IRT 불필요)
#   setup.cmd  또는  node scripts/verify.mjs --fix

$ErrorActionPreference = "Continue"
$Root = "D:\HR_IN_Solution"
Set-Location $Root

Write-Host "=== HR_IN Setup ===" -ForegroundColor Cyan

# env
if (-not (Test-Path "$Root\web\.env")) {
    Copy-Item "$Root\.env.example" "$Root\web\.env"
}

# npm + prisma via node verify --fix (no docker required for IRT)
Write-Host "`n--- 자동 검증 및 의존성 설치 ---" -ForegroundColor Cyan
node "$Root\scripts\verify.mjs" --fix
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] 일부 검증 실패 — verify.cmd --start 로 재시도" -ForegroundColor Yellow
}

# Docker postgres only (optional)
Write-Host "`n--- PostgreSQL (Docker, 선택) ---" -ForegroundColor Cyan
try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        docker compose up -d postgres
        Start-Sleep -Seconds 4
        Set-Location "$Root\web"
        npx prisma migrate dev --name init 2>$null
        npm run db:seed 2>$null
        Write-Host "[OK] PostgreSQL + DB seed" -ForegroundColor Green
    } else { throw "docker not running" }
} catch {
    Write-Host "[SKIP] Docker 미사용 — DB는 Docker Desktop 실행 후:" -ForegroundColor Yellow
    Write-Host "       cd web && npx prisma migrate dev && npm run db:seed" -ForegroundColor Gray
}

Write-Host "`n=== 완료 ===" -ForegroundColor Cyan
Write-Host "실행: start-all.cmd  (검증+IRT+웹 한번에)" -ForegroundColor White
Write-Host "검증: verify.cmd --start" -ForegroundColor White
Set-Location $Root
