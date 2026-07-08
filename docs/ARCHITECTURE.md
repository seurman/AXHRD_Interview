# HR_IN Solution — 시스템 아키텍처

## 개요

IRT(2PL) 기반 적응형 모의 면접 플랫폼. 실시간 저비용 AI(Gemini)와 세션 리포트(DeepSeek)를 분리해 비용을 최적화한다.

**플랫폼 레이어(제품 지도):** Salesforce식 전면 스택이 아니라 AX 시대용 얇은 4단 — Surfaces · Workflows · **Meaning(온톨로지)** · Intelligence + Trust.  
상세는 [`docs/AX-PLATFORM-LAYERS.md`](./AX-PLATFORM-LAYERS.md).

## 구성 요소

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 15)                                       │
│  · Web Speech API (STT, MVP)                                │
│  · 음표형 LevelChip UI                                      │
│  · Recharts 역량 대시보드                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Next.js API Routes                                         │
│  /api/interview/start | respond | tts                       │
│  /api/companies/enrich                                      │
└──────┬─────────────────────────────┬────────────────────────┘
       │                             │
       ▼                             ▼
┌──────────────┐              ┌──────────────┐
│ PostgreSQL   │              │ IRT Engine   │
│ (Prisma)     │              │ FastAPI      │
│              │              │ 2PL + CAT    │
└──────────────┘              └──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│ Gemini       │    │ DeepSeek     │
│ TTS+채점+개인화│    │ 리포트 only  │
└──────────────┘    └──────────────┘
```

## 데이터 흐름 — 면접 1문항

1. **질문 제시**: DB 문항 → Gemini TTS → 브라우저 재생
2. **답변**: Web Speech API → transcript
3. **채점**: Gemini 2.5 Flash-Lite 루브릭 (0~1)
4. **적응**: IRT Engine `/session/respond` → θ 업데이트, 다음 문항, ChipEvent
5. **UI**: LevelChip(♩♪♭) + CompetencyBar 실시간 갱신
6. **종료**: SE 수렴 또는 max 18문항 → DeepSeek 리포트 → CompetencySnapshot 저장

## DB 핵심 엔티티

| 모델 | 역할 |
|------|------|
| User / UserProfile | 개인정보, 경력, 희망 직무 |
| TargetCompany | 지원 회사 + 산업/규모 enrichment |
| Resume | 자소서 텍스트 |
| Question / Competency | IRT 보정 문항 풀 |
| InterviewSession | 차수별 세션, irtState JSON |
| ResponseRecord | 문항별 transcript + rubricScore |
| ChipEvent | 실시간 레벨 UI 이벤트 |
| CompetencySnapshot | 장기 θ 트래킹 |
| SessionReport | DeepSeek 생성 리포트 |

## irtState JSON 구조

```json
{
  "competencies": {
    "COMMUNICATION": {
      "competency": "COMMUNICATION",
      "theta": 0.42,
      "standard_error": 0.31,
      "current_level": 3,
      "response_count": 2
    }
  },
  "nextItemId": "PS-L3-001",
  "administeredIds": ["COMM-L2-001", "PS-L2-001"]
}
```

## API 비용 분리

| 단계 | API | 호출 빈도 |
|------|-----|-----------|
| TTS | Gemini 2.5 Flash Preview TTS | 문항당 1회 |
| 채점 · 질문 개인화 | Gemini 2.5 Flash-Lite | 문항당 1회 |
| STT | Web Speech (무료) | 문항당 1회 |
| 리포트 | DeepSeek V4 (deepseek-chat) | 세션당 1회 |

## 보안 · 개인정보 (Phase 2)

- 음성 녹음 90일 자동 삭제
- 자소서 암호화 at rest
- NextAuth / OAuth 연동

## 특허 회피 원칙

- IRT 수학(2PL, Fisher Information) — 공개 방법론
- 감정/표정/오디오 cue 기반 정렬 — **미사용**
- Multi-Armed Bandit delivery — **미사용**, CAT Maximum Information 사용
