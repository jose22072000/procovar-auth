"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

const TABS = [
  { href: "/dashboard/settings", labelKey: "settings", icon: "lucide:settings" },
  { href: "/dashboard/permissions", labelKey: "permissions", icon: "lucide:shield-check" },
  { href: "/dashboard/users", labelKey: "users", icon: "lucide:users" },
  { href: "/dashboard/organizations", labelKey: "organizations", icon: "lucide:building-2" },
] as const;

export function AdminSubnav() {
  const pathname = usePathname();
  const t = useTranslations();
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors " +
                (active
                  ? "border-[#0A2252] text-[#0A2252] dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")
              }
            >
              <Icon icon={tab.icon} className="size-4" aria-hidden />
              {t(`dashboard.subnav.${tab.labelKey}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
