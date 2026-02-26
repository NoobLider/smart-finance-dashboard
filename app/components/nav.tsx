"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PROTECTED_PREFIXES = ["/dashboard", "/transactions", "/upload", "/budgets", "/alerts", "/accounts", "/settings"];

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/upload", label: "Upload" },
  { href: "/budgets", label: "Budgets" },
  { href: "/alerts", label: "Alerts" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" },
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function Nav() {
  const pathname = usePathname();

  if (!pathname || !isProtectedPath(pathname)) {
    return null;
  }

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/dashboard" className="top-nav-logo">
          Smart Finance
        </Link>

        <nav className="top-nav-links" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link key={link.href} href={link.href} className={`top-nav-link ${isActive ? "active" : ""}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
