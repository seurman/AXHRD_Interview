import { RouteLoadingSkeleton } from "@/components/layout/RouteLoadingSkeleton";

/** 메뉴 이동 시 헤더는 유지하고 콘텐츠만 즉시 스켈레톤 표시 */
export default function RootLoading() {
  return <RouteLoadingSkeleton />;
}
