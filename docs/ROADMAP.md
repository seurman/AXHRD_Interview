# HR_IN Solution — 로드맵

## Phase 0 — MVP (현재) ✅

- [x] Monorepo 구조 (web + irt-engine)
- [x] Prisma DB 스키마
- [x] IRT 2PL FastAPI 엔진
- [x] 20문항 × 6역량 시드
- [x] 음성 면접 UI (Web Speech STT)
- [x] 실시간 LevelChip UI
- [x] 역량 대시보드 (Recharts)
- [x] Gemini/DeepSeek 연동 스텁 (API 키 없이 mock 동작)

## Phase 1 — 상용 알파 (4주)

- [x] 자체 JWT 회원가입/로그인 (NextAuth 대신 경량 구현)
- [x] 자소서 PDF/DOCX/DOC 파싱
- [x] 카카오/네이버 소셜 로그인
- [x] Gemini TTS/실시간 채점/질문 개인화 실연동 (MiniMax 대체, 비중국 벤더)
- [ ] DART API 회사 enrichment
- [ ] 토스페이먼츠 구독/회당 결제
- [x] 면접관 페르소나 — 사용자가 고르는 정적 3종 대신, IRT 추정 레벨 기반 적응형 압박 강도(GENTLE/NEUTRAL/TOUGH)로 구현 (`docs/STATUS.md` 참고)

## Phase 2 — B2B (8주)

- [ ] 기관 관리자 대시보드
- [ ] 커스텀 문항·루브릭
- [ ] IRT 문항 보정 파이프라인
- [ ] SSO (SAML/OIDC)
- [ ] 음성 90일 자동 삭제

## Phase 3 — 차별화 (12주)

- [ ] 영상 면접 + 비언어 피드백 (Yoodli식, 표정 특허 회피)
- [ ] JD URL 자동 파싱 (패스잇식)
- [ ] AI 역량검사(게임형) 대비 모드
- [ ] 모바일 PWA

## KPI

| 지표 | MVP 목표 | 6개월 |
|------|----------|-------|
| 세션 완료율 | 60% | 75% |
| API 비용/세션 | < $0.15 | < $0.10 |
| θ SE (종료 시) | < 0.35 | < 0.25 |
| NPS | — | 40+ |
