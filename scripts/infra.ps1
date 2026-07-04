# PostgreSQL + IRT Engine만 Docker로 실행
#   .\scripts\infra.ps1

Set-Location "D:\HR_IN_Solution"
docker compose up -d postgres irt-engine
docker compose ps
Write-Host "`nPostgreSQL: localhost:5432 (user: hrin / pass: hrin / db: hr_in_solution)"
Write-Host "IRT Engine: http://localhost:8000/api/v1/health"
