# Git 사용 가이드

## 초기 설정 (1회)

```powershell
cd D:\HR_IN_Solution
git config user.name "Your Name"
git config user.email "you@example.com"
```

## 일상 워크플로

```powershell
git status              # 변경 확인
git add .               # 스테이징
git commit -m "설명"    # 커밋
git push -u origin master   # 원격 저장 (GitHub 등 연결 후)
```

## 브랜치 (기능 개발)

```powershell
git checkout -b feature/my-change
# ... 작업 ...
git commit -am "feat: 설명"
git checkout master
git merge feature/my-change
```

## 주의

- `.env` / `web/.env`는 **커밋하지 않음** (.gitignore 적용)
- `node_modules/`, `.next/`도 제외됨
- DB 마이그레이션(`web/prisma/migrations/`)은 **커밋함**

## 원격 저장소 연결 (GitHub 예시)

```powershell
git remote add origin https://github.com/YOUR_USER/HR_IN_Solution.git
git push -u origin master
```
