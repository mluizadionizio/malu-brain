"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { TrendingUp, DollarSign, Calendar } from "lucide-react";

const NAV = [
  { href: "/trafego", label: "Tráfego Pago", icon: TrendingUp },
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
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#161616] border-r border-white/10 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-white font-bold text-base tracking-tight">malu brain</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {label}
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
