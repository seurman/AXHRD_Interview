# 배포된(Vercel) 운영 DB에 데모 시드를 넣는 스크립트
#
# ⚠️ 로컬에서 vercel env run 을 써도 .env.local 이 DATABASE_URL 을 localhost 로
#    덮어써 운영 DB에 연결되지 않습니다. Vercel CLI는 운영 DATABASE_URL 도 노출하지 않습니다.
#
# ✅ 운영 DB 시드 방법 (권장):
#    슈퍼어드민 로그인 → /admin/diagnostic → Campaign 탭
#    · 「운영 ARC 데모」 — 테크노바 + 쇼케이스 조직진단 캠페인
#    · 「운영 통합 시연 시드」 — npm run db:seed:demo 와 동일 (전체 시연 데이터)
#
# 아래 CLI 명령은 로컬 DB 에만 적용됩니다 (운영 반영 안 됨).

param(
  [switch]$Full
)

$ErrorActionPreference = "Stop"

Write-Host "⚠️  이 스크립트는 로컬 DATABASE_URL(.env.local) 기준으로만 동작합니다." -ForegroundColor Yellow
Write-Host "    운영 반영: /admin/diagnostic → Campaign → 운영 ARC 데모 / 통합 시연 시드" -ForegroundColor Yellow
Write-Host ""

if ($Full) {
  Write-Host "로컬 DB — 통합 데모 시드 (npm run db:seed:demo)" -ForegroundColor Cyan
  npm run db:seed:demo
} else {
  Write-Host "로컬 DB — 테크노바 ARC 조직진단 데모 시드" -ForegroundColor Cyan
  npx tsx prisma/seed/demo-arc-index.ts
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "시드 실패" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "완료 (로컬)." -ForegroundColor Green
Write-Host "  슈퍼어드민: /admin/diagnostic → 테크노바 (ARC 데모)" -ForegroundColor Gray
if ($Full) {
  Write-Host "  기관 데모: arc-demo-admin@demo.axhrd.local / Demo2026! → /org/diagnosis" -ForegroundColor Gray
}
