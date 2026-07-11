"use client";

import { NavDropdownMenu } from "./NavDropdownMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { GUEST_PRODUCT_HREFS } from "@/lib/platform/nav-registry";

export function GuestProductMenu() {
  const { dict } = useI18n();
  const c = dict.common;
  const gp = c.guestProducts;

  return (
    <NavDropdownMenu
      title={c.nav.products}
      links={GUEST_PRODUCT_HREFS.map((item) => ({
        href: item.href,
        label: gp[item.labelKey],
      }))}
    />
  );
}
