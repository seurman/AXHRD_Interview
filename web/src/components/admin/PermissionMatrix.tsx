"use client";

import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import {
  CAPABILITY_REGISTRY,
  CATEGORY_LABEL,
  ROLE_CAPABILITY_MATRIX,
  PLATFORM_ROLE_ROWS,
  type CapabilityCategory,
  type CapabilityId,
  type PlatformRoleKey,
} from "@/lib/platform/capabilities";

const CATEGORY_ORDER: CapabilityCategory[] = [
  "product",
  "tenant",
  "platform_content",
  "platform_sales",
  "platform_ops",
];

export function PermissionMatrix() {
  const [selectedRole, setSelectedRole] = useState<PlatformRoleKey>("SUPERADMIN");

  const capsForRole = useMemo(
    () => new Set(ROLE_CAPABILITY_MATRIX[selectedRole]),
    [selectedRole]
  );

  const roleMeta = PLATFORM_ROLE_ROWS.find((r) => r.key === selectedRole);

  const byCategory = useMemo(() => {
    const map = new Map<CapabilityCategory, CapabilityId[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const id of Object.keys(CAPABILITY_REGISTRY) as CapabilityId[]) {
      const def = CAPABILITY_REGISTRY[id];
      map.get(def.category)?.push(id);
    }
    return map;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="space-y-1 rounded-xl border border-card-border bg-card p-2">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted">
          역할 (Role)
        </p>
        {PLATFORM_ROLE_ROWS.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => setSelectedRole(role.key)}
            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
              selectedRole === role.key
                ? "bg-primary/10 font-medium text-foreground"
                : "text-muted hover:bg-primary/5"
            }`}
          >
            {role.labelKo}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {roleMeta && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">{roleMeta.labelKo}</h2>
            <p className="mt-1 text-sm text-muted">
              Greenhouse: <span className="text-foreground">{roleMeta.greenhouseAnalog}</span>
              {" · "}
              HireVue: <span className="text-foreground">{roleMeta.hirevueAnalog}</span>
            </p>
          </div>
        )}

        {CATEGORY_ORDER.map((category) => {
          const ids = byCategory.get(category) ?? [];
          const label = CATEGORY_LABEL[category];
          return (
            <section key={category} className="rounded-xl border border-card-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">{label.ko}</h3>
              <p className="mb-4 text-xs text-muted">
                Permission stripes — 모듈별 페이지 lazy-load
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ids.map((id) => {
                  const def = CAPABILITY_REGISTRY[id];
                  const on = capsForRole.has(id);
                  return (
                    <li
                      key={id}
                      className={`flex gap-3 rounded-lg border px-3 py-3 text-sm ${
                        on ? "border-primary/30 bg-primary/5" : "border-card-border opacity-60"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          on ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted"
                        }`}
                      >
                        {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{def.labelKo}</p>
                        <p className="text-xs text-muted">{def.descriptionKo}</p>
                        {def.href && (
                          <p className="mt-1 font-mono text-[10px] text-muted">{def.href}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <div className="rounded-xl border border-dashed border-card-border px-4 py-3 text-xs text-muted">
          <p>
            <strong className="text-foreground">모듈형 로딩:</strong> 각 capability는 독립
            <code className="mx-1">app/**/page.tsx</code> 라우트입니다. 네비게이션은{" "}
            <code>buildNavigationForUser()</code>가 capability 집합으로 필터링하며, 페이지 가드는
            동일 capability로 보호합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
