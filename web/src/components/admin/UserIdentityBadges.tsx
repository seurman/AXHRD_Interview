import { Badge } from "@/components/admin/Badge";
import { buildUserIdentityView } from "@/lib/admin/user-identity";

export function UserIdentityBadges({
  platformRole,
  orgRole,
  organizationId,
  organizationName,
  signupFlag,
}: {
  platformRole: string;
  orgRole: string;
  organizationId: string | null;
  organizationName?: string | null;
  signupFlag?: string | null;
}) {
  const view = buildUserIdentityView({
    platformRole,
    orgRole,
    organizationId,
    organization: organizationName ? { name: organizationName } : null,
    signupFlag,
  });

  return (
    <div className="flex min-w-[10rem] flex-col gap-1">
      <Badge tone={view.primaryTone}>{view.primaryLabel}</Badge>
      <div className="flex flex-col gap-0.5 text-xs text-muted">
        {view.orgName && (
          <span className="keep-one-line font-medium text-foreground">{view.orgName}</span>
        )}
        {view.orgRoleLabel && view.orgName && <span>{view.orgRoleLabel}</span>}
        {view.platformLabel && (
          <span className={view.segment === "platform" ? "text-gold" : ""}>
            플랫폼 · {view.platformLabel}
          </span>
        )}
        {!view.orgName && !view.platformLabel && view.segment === "personal" && (
          <span>소속·내부 권한 없음</span>
        )}
      </div>
    </div>
  );
}
