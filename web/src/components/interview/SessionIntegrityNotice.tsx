/** 세션 리포트·코호트용 무결성 신호(채점과 무관) */
export function SessionIntegrityNotice({
  pasteDetected,
  tabSwitchCount,
}: {
  pasteDetected: boolean;
  tabSwitchCount: number;
}) {
  if (!pasteDetected && tabSwitchCount < 1) return null;

  return (
    <section className="rounded-xl border border-warning/35 bg-warning/8 p-4 text-sm">
      <p className="font-semibold text-warning">주의 신호 (채점에는 반영되지 않음)</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted">
        {pasteDetected && <li>답변 입력 중 붙여넣기가 감지되었습니다.</li>}
        {tabSwitchCount > 0 && (
          <li>면접 중 다른 탭/앱으로 이탈한 기록이 {tabSwitchCount}회 있습니다.</li>
        )}
      </ul>
    </section>
  );
}
