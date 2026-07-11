import { isBusinessAdminUser, isDemoAdminUser } from "@/lib/auth/platform-ops";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

type Props = {
  user: { email: string; platformRole?: string };
};

/** Salesforce-style internal role banner — 시연·매뉴얼 모드 표시 */
export function InternalRoleBanner({ user }: Props) {
  if (hasSuperadminAccess(user)) return null;

  if (isBusinessAdminUser(user)) {
    return (
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-foreground">
        <strong>비즈니스 어드민</strong> — 전 모듈을 조회·체험할 수 있습니다. 플랫폼 설정·권한·구독 변경은
        불가합니다.
      </div>
    );
  }

  if (isDemoAdminUser(user)) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-foreground">
        <strong>데모 어드민</strong> — 영업·고객 시연용입니다. 데모 샌드박스와 제품 체험에 집중하세요.
      </div>
    );
  }

  return null;
}
