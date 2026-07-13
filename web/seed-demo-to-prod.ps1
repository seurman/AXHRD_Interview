# 배포된(Vercel) 운영 DB에 데모 시드를 넣는 스크립트
#
# vercel env pull 은 Postgres 연동 시 DATABASE_URL이 빈 문자열로 내려올 수 있어
# dotenv-cli 대신 vercel env run 으로 운영 env를 메모리에 로드해 실행한다.
#
# 사전 준비 (최초 1회):
#   npx vercel login
#   cd web && npx vercel link
#
# 실행:
#   cd D:\HR_IN_Solution\web
#   .\seed-demo-to-prod.ps1              # 테크노바 ARC 데모만
#   .\seed-demo-to-prod.ps1 -Full        # 통합 데모 시트 (개인·기관·쇼케이스 포함)

param(
  [switch]$Full
)

$ErrorActionPreference = "Stop"

if ($Full) {
  Write-Host "운영 DB — 통합 데모 시드 (npm run db:seed:demo)" -ForegroundColor Cyan
  npx vercel env run --environment=production -- npm run db:seed:demo
} else {
  Write-Host "운영 DB — 테크노바 ARC 조직진단 데모 시드" -ForegroundColor Cyan
  npx vercel env run --environment=production -- npx tsx prisma/seed/demo-arc-index.ts
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "시드 실패 — npx vercel login / vercel link 확인" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "완료." -ForegroundColor Green
Write-Host "  슈퍼어드민: /admin/diagnostic → 테크노바 (ARC 데모)" -ForegroundColor Gray
if ($Full) {
  Write-Host "  기관 데모: arc-demo-admin@demo.axhrd.local / Demo2026! → /org/diagnosis" -ForegroundColor Gray
}
