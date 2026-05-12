"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { TrendingUp, DollarSign, Calendar, Sun, BookOpen, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trafego", label: "Tráfego", icon: TrendingUp },
  { href: "/meu-dia", label: "Meu Dia", icon: Sun },
  { href: "/estudos", label: "Estudos", icon: BookOpen },
  { href: "/financas", label: "Finanças", icon: DollarSign },
  { href: "/calendario", label: "Calendário", icon: Calendar },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("malu_auth") !== "ok") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar — desktop only */}
      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent font-bold text-base tracking-tight">
            malu brain
          </span>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: active ? "rgba(59,130,246,0.1)" : "transparent",
                  borderLeft: active ? "2px solid #3b82f6" : "2px solid transparent",
                  paddingLeft: active ? "10px" : "12px",
                  color: active ? "var(--nav-active-text)" : "var(--nav-text)",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Icon size={16} style={{ color: active ? "#3b82f6" : undefined }} />
                {label === "Tráfego" ? "Tráfego Pago" : label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 space-y-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          <button
            onClick={() => { localStorage.removeItem("malu_auth"); router.replace("/login"); }}
            className="w-full text-xs transition-colors text-center"
            style={{ color: "var(--nav-text)" }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex z-50"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
        }}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
              style={{ color: active ? "#60a5fa" : "var(--nav-text)" }}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
