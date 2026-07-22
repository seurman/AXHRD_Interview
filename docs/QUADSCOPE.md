# QuadScope

AXHRD product scorecard: **four scopes to see a person**.

| Scope | Meaning |
|-------|---------|
| **Judgment** | Define problems, analyze, choose |
| **Delivery** | Execute and own outcomes |
| **Relations** | Collaborate, persuade, partner |
| **Anchor** | Grow, adapt, hold integrity |

Jobs (menus): **Hire** · **Grow** · **Sense** · **Assess**

## Data

- Lexicon field: `scorecardScope` on each competency (`competency-lexicon.json` v3+)
- Source clusters (`clusterCode`: LEX_IRT_CORE …) kept for content ops
- Map fallback: `COMPETENCY_TO_QUADSCOPE` in `web/src/lib/quadscope/scopes.ts`

## UI surfaces

- Dashboard rollup · Lexicon panel (group by QuadScope) · Framework Studio badge
- Interview report / live CompetencyBar / AnswerFeedback / competency feedback
- Org kit palette · Candidate compare Scope column

Distinct from interview **answer craft** 6-axes (BEI delivery quality).
