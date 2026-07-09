# IRT 엔진 설계

## 모델

**2-Parameter Logistic (2PL)**

```
P(u=1 | θ, a, b) = 1 / (1 + exp(-a(θ - b)))
```

- `θ` (theta): 응시자 역량 추정치 (-3 ~ +3)
- `b` (difficulty): 문항 난이도
- `a` (discrimination): 문항 변별도

## UX 레벨 ↔ IRT 난이도

| UX Level | b (difficulty) |
|----------|----------------|
| L1 | -2.0 |
| L2 | -1.0 |
| L3 | 0.0 |
| L4 | +1.0 |
| L5 | +2.0 |

## 적응 규칙

### θ 추정: EAP (Expected A Posteriori)

격자 적분 (-3.5 ~ +3.5, 141점)으로 사후 분포 계산.

### 다음 문항: Maximum Information

```
I(θ) = a² · P · (1-P)
```

현재 θ에서 정보량이 최대인 미출제 문항 선택. 목표 레벨 b와의 거리 penalty 적용.

### 레벨 UX (실시간 Chip)

| rubric_score | chip | level 변화 |
|--------------|------|------------|
| ≥ 0.75 | ♩ pass | +1 (max L5) |
| 0.55 ~ 0.74 | ♪ attempt | 유지 |
| < 0.55 | ♭ downgrade | -1 (min L1) |

### 종료 조건

- **COMPETENCY 모드(실사용)**: 최소 3문항, 최대 5문항 (역량당)
- **FULL 모드(현재 미사용)**: 최소 8문항, 최대 18문항
- 모든 측정 역량 SE ≤ 0.35 && 역량당 ≥ 2응답

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/health` | 헬스체크 |
| POST | `/api/v1/session/init` | 세션 초기화 + 첫 문항 |
| POST | `/api/v1/session/respond` | 응답 제출 + 적응 |
| POST | `/api/v1/session/summary` | 세션 요약 |

## 문항 보정 (Phase 2)

1. 파일럿 200+ 응답 수집
2. 각 문항 `(a, b)` MML 보정
3. DIF(집단간) 검사
4. `Question.discrimination`, `Question.difficulty` DB 업데이트

## Python 서비스 실행

```bash
cd services/irt-engine
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 테스트 예시

```bash
curl http://localhost:8000/api/v1/health
```
