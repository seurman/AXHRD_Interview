import { IconLoader } from "@/components/ui/icons";

/**
 * 면접 페이지는 서버에서 자소서 맞춤 질문(Gemini 호출)을 만든 뒤 렌더링되므로
 * 몇 초 걸릴 수 있다. 이 로딩 화면이 없으면 "시작" 버튼을 눌러도 화면이 그대로라
 * 사용자가 여러 번 누르게 되는 문제가 있었다 — 이동 즉시 이 화면이 보여야 한다.
 */
export default function InterviewLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card-luxe flex flex-col items-center gap-3 p-10 text-center">
        <IconLoader className="h-8 w-8 text-accent" />
        <p className="font-medium text-foreground">면접 준비 중입니다…</p>
        <p className="text-sm text-muted">자소서를 반영한 첫 질문을 만들고 있어요.</p>
      </div>
    </div>
  );
}
