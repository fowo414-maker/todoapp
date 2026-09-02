"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "대시보드", icon: "▦" },
  { href: "/todo", label: "할 일", icon: "☑" },
  { href: "/week", label: "주간 계획", icon: "▤" },
  { href: "/year", label: "1년 목표", icon: "◎" },
  { href: "/calendar", label: "캘린더", icon: "▥" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="shrink-0 border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="px-5 pt-5 pb-3">
        <span className="text-sm font-semibold tracking-tight text-ink">
          목표 연동 To-Do
        </span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-raised font-medium text-ink"
                  : "text-ink-soft hover:bg-raised hover:text-ink"
              }`}
            >
              <span aria-hidden className="text-ink-faint">
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Nav;
