"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/day", label: "일일" },
  { href: "/week", label: "주간" },
  { href: "/year", label: "1년 목표" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-1">
        <span className="font-semibold mr-4">목표 연동 To-Do</span>
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export default Nav;
