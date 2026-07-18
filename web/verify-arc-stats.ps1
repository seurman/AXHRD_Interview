# ARC Index stats (LPA / HLM-lite / open-text themes / prescription) verification script
# Run: cd D:\HR_IN_Solution\web ; .\verify-arc-stats.ps1

Write-Host "1) Type check (tsc --noEmit)" -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "Type errors found - see output above" -ForegroundColor Red; exit 1 }
Write-Host "Type check passed" -ForegroundColor Green

Write-Host ""
Write-Host "2) Unit tests" -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { Write-Host "Tests failed - see output above" -ForegroundColor Red; exit 1 }
Write-Host "Tests passed" -ForegroundColor Green

Write-Host ""
Write-Host "3) Build (includes lint, final pre-deploy check)" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed - see output above" -ForegroundColor Red; exit 1 }
Write-Host "Build passed" -ForegroundColor Green

Write-Host ""
Write-Host "All checks passed." -ForegroundColor Green
Write-Host "Review 'git status' and 'git diff' before staging only the intended files." -ForegroundColor Yellow
