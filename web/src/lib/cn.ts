/** 클라이언트용 간단 className 병합 (clsx 미사용) */
export function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}
