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
        title="역량평가 과제 만들기"
        subtitle={
          <>
            샘플 과제를 붙여넣으면 유사한 역할연기·서류함 초안을 생성합니다. 역량·1~5점
            루브릭을 연결한 뒤 게시하면{" "}
            <Link href="/assessment" className="text-accent hover:underline">
              /assessment
            </Link>
            에 노출됩니다.
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
