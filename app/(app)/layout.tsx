"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { TrendingUp, DollarSign, Calendar, Sun, BookOpen, LayoutDashboard } from "lucide-react";

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
    <div className="flex min-h-screen bg-[#0f0f0f]">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#0c0c14] border-r border-white/[0.08] flex-col">
        <div className="px-5 py-5 border-b border-white/[0.08]">
          <span className="bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent font-bold text-base tracking-tight">malu brain</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-blue-500/15 to-transparent border-l-2 border-blue-500 text-white pl-[10px]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} className={active ? "text-blue-400" : ""} />
                {label === "Tráfego" ? "Tráfego Pago" : label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <button
            onClick={() => { localStorage.removeItem("malu_auth"); router.replace("/login"); }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0c14] border-t border-white/[0.08] flex z-50 safe-area-inset-bottom">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                active ? "text-blue-400" : "text-gray-500"
              }`}
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
