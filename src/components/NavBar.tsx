"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Upload" },
  { href: "/dashboard", label: "Executive Dashboard" },
  { href: "/tokens", label: "Build Stats" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header>
      <div className="h-[3px] w-full" style={{ background: "var(--accent)" }} />
      <div style={{ background: "var(--ink)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-md shrink-0" style={{ background: "var(--accent)" }}>
              <div className="absolute inset-[6px] rounded-sm" style={{ background: "var(--ink-contrast)" }} />
            </div>
            <div>
              <div
                className="font-semibold leading-tight text-sm sm:text-base"
                style={{ color: "var(--ink-contrast)" }}
              >
                Portfolio Risk Dashboard
              </div>
              <div className="text-xs leading-tight" style={{ color: "#9a9ea5" }}>
                Lending &amp; credit risk prototype
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "" : "hover:bg-white/10"
                  }`}
                  style={active ? { background: "var(--accent)", color: "var(--ink-contrast)" } : { color: "#d4d5d7" }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
