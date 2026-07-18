import Link from "next/link";
import { requireProductionContentAdmin } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { AssessmentScenarioStudio } from "@/components/admin/AssessmentScenarioStudio";

export const dynamic = "force-dynamic";

export default async function AdminAssessmentContentPage() {
  await requireProductionContentAdmin("/admin/content/assessment");

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.content}
        title="평가 과제 스튜디오"
        subtitle={
          <>
            과제 문서를 업로드해 역할연기·서류함 초안을 만들고, 기존 역량·1~5점 루브릭과
            행동지표를 연결한 뒤 게시합니다. 응시자 화면은{" "}
            <Link href="/assessment" className="text-accent hover:underline">
              /assessment
            </Link>
            에서 확인할 수 있습니다.
          </>
        }
        breadcrumb={[
          { label: "Framework Studio", href: "/admin/content" },
          { label: "평가 과제" },
        ]}
        links={[
          { href: "/admin/content", label: "Framework Studio →" },
          { href: "/admin/repository", label: "역량 리포지토리 →" },
        ]}
      />
      <AssessmentScenarioStudio />
    </div>
  );
}
