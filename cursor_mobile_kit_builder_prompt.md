# 문항관리/역량세팅 모바일 친화적 개편 — 커서용 스크립트

## 원인 진단 (코드 확인됨)

`InterviewKitWorkspace.tsx`가 문제의 핵심 — **4단 스튜디오 레이아웃**(역량
팔레트 | 문항뱅크 | 나의 인터뷰 킷 | 채점 루브릭)을 `grid-cols-1 ...
xl:grid-cols-[...]`로 짜놔서, `xl`(1280px) 밑에서는 4개 패널이 세로로
쌓이긴 하는데 **바깥 그리드 전체에 고정 높이**(`h-[clamp(560px,78vh,820px)]`,
`overflow-hidden`)가 걸려 있어서 4개 패널이 그 안에서 각자 내부 스크롤하는
"중첩 스크롤 상자"가 됨. 텍스트도 `text-[10px]` 등 데스크톱 스튜디오 기준이라
모바일에서 탭하기 어려움. 문항 순서 변경도 드래그(`MotionReorderList`)뿐이라
손가락으로는 부정확함. `GlobalCompetencyDictionaryPanel`은 `lg:grid-cols-[320px_1fr]`
+ 아코디언 구조라 상대적으로 양호 — 이번엔 손 안 대도 됨.

## 방향

데스크톱 4단 스튜디오는 그대로 유지(넓은 화면에서는 잘 작동함). **모바일
(`md` 미만)에서만** 같은 데이터/로직을 3단계 마법사(역량 선택 → 문항 고르기 →
순서/루브릭)로 다르게 렌더링. 새 API·데이터 구조 불필요 — 기존 props/콜백
그대로 재사용, 렌더링 분기만 추가.

## 1. `InterviewKitWorkspace.tsx` — 모바일 3단계 마법사

```tsx
const [mobileStep, setMobileStep] = useState<0 | 1 | 2>(0);
// 0: 역량 선택, 1: 문항 고르기, 2: 순서/루브릭
```

- `md:hidden` 블록으로 마법사 전용 렌더링 추가(데스크톱 4단 그리드는
  `hidden md:grid`로 감싸서 그대로 유지).
- **Step 0 (역량 선택)**: 기존 `PaletteCompetencyCard` 재사용하되 세로 전체폭
  리스트로, 탭 영역을 최소 44px로 키움. 역량 선택하면 자동으로 Step 1로 이동.
- **Step 1 (문항 고르기)**: 선택한 역량의 `BankQuestionCard` 목록(검색/레벨
  필터 그대로, 필터 pill 크기만 키움), 이미 킷에 담은 문항 개수를 상단에 크게
  표시. "다음" 버튼은 화면 하단 고정(sticky).
- **Step 2 (순서/루브릭)**: 선택된 문항 순서 조정(아래 2번) + 채점 루브릭
  체크박스(기존 로직 그대로, 세로 스택이라 모바일에 이미 적합) + 저장 버튼.
- 하단에 **항상 보이는 고정 바**(sticky, thumb 영역): "이전" / "다음 또는 저장"
  버튼 — 스크롤 위치와 무관하게 항상 접근 가능.
- 그리드 전체에 걸려있던 `WORKSPACE_HEIGHT` 클램프는 **마법사 모드에서는
  적용하지 않음** — 각 스텝이 자연스러운 페이지 스크롤을 쓰게 해서 중첩 스크롤
  문제를 없앰.

## 2. 순서 변경 — 드래그 대신(또는 병행) 위/아래 버튼

`KitQuestionRow`에 위/아래 화살표 버튼 추가(`ChevronUp`/`ChevronDown`,
`lucide-react` 이미 사용 중):
```tsx
function moveItem(ids: string[], index: number, dir: -1 | 1): string[] {
  const next = [...ids];
  const target = index + dir;
  if (target < 0 || target >= next.length) return ids;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
```
- 버튼 탭 시 `onReorderQuestions(code, moveItem(draft.selectedIds, index, dir))` 호출
  — 기존 콜백 그대로 재사용, 새 API 불필요.
- 데스크톱에서도 드래그 핸들 옆에 이 버튼을 같이 두면(접근성 대체 수단 겸)
  모바일 전용 분기 로직을 따로 안 만들어도 되니 더 가벼움 — **드래그를
  없애는 게 아니라 버튼을 추가하는 방향** 추천.

## 3. 터치 타깃/폰트 크기

모바일 마법사 모드 한정으로 `text-[10px]`/`text-xs` 라벨을 최소 `text-sm`으로,
버튼/체크박스 탭 영역을 `min-h-11`(44px) 이상으로. 데스크톱 스튜디오 쪽 크기는
그대로 유지(좁은 스튜디오에 맞춰 의도적으로 작게 되어 있는 것이므로).

## 4. 앞으로 만들 CMS 페이지에도 같은 원칙 적용

지난 배치(`cursor_content_cms_prompt.md`)에서 설계한 문항뱅크/설문 빌더 CRUD를
실제 구현할 때, 처음부터 "모바일은 단계별 폼, 데스크톱은 목록+편집 병렬 뷰"
원칙으로 만들 것 — 나중에 리트로핏하는 것보다 지금 반영하는 게 훨씬 가벼움.
이번 스크립트에서 새로 만들 필요는 없고, 원칙만 `docs/STATUS.md`에 남겨서
다음 배치가 참고하게.

## 원칙

- 새 API/데이터 구조 없음 — 기존 props/콜백 재사용, 렌더링 분기만 추가.
- 데스크톱 4단 스튜디오는 그대로 유지 — 모바일 전용 대체 뷰만 추가.
- 드래그 리오더는 제거하지 않고 위/아래 버튼을 "추가"하는 방향(접근성 대체
  수단 겸 모바일 친화).
- `GlobalCompetencyDictionaryPanel`은 이미 양호 — 이번엔 손 안 댐.
- 스키마 변경 없음 — 마이그레이션 불필요.
- 작업 끝나면 실제 모바일 폭(375px 기준)에서 스크린샷/직접 조작으로 확인,
  `npm run build` 확인, `docs/STATUS.md`에 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_mobile_kit_builder_prompt.md)에 정리된 대로 InterviewKitWorkspace.tsx를
모바일 친화적으로 개편해줘.

핵심 원칙:
1. 데스크톱 4단 스튜디오 레이아웃(현재 xl:grid-cols-[...])은 그대로 두고,
   md 미만에서만 3단계 마법사(역량 선택 → 문항 고르기 → 순서/루브릭)로 다르게
   렌더링해줘. 새 API/데이터 구조는 필요 없고 기존 props/콜백 재사용해.
2. 마법사 모드에서는 바깥 그리드에 걸려있는 WORKSPACE_HEIGHT 고정 높이 클램프를
   적용하지 마 — 자연스러운 페이지 스크롤 쓰게 해줘(지금은 중첩 스크롤이 문제야).
3. 문항 순서 변경에 위/아래 화살표 버튼을 추가해줘(드래그는 유지, 버튼은
   추가) — onReorderQuestions 콜백 그대로 재사용.
4. 마법사 모드의 텍스트/탭 영역은 최소 text-sm / 44px 이상으로 키워줘. 데스크톱
   스튜디오 쪽 크기는 그대로 둬.
5. GlobalCompetencyDictionaryPanel은 이미 괜찮으니 손대지 마.
6. 다음에 만들 CMS 페이지(문항뱅크/설문 빌더)에도 "모바일은 단계별, 데스크톱은
   병렬 뷰" 원칙을 적용한다는 메모를 docs/STATUS.md에 남겨줘.

스키마 변경 없어서 마이그레이션 불필요. 모바일 폭(375px)에서 직접 확인하고
npm run build 확인 후 docs/STATUS.md에 정리해줘.
```
