"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PIN = process.env.NEXT_PUBLIC_PIN_CODE ?? "1234";

export default function LoginPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleKey(digit: string) {
    if (value.length >= 6) return;
    const next = value + digit;
    setValue(next);
    if (next.length === PIN.length) {
      if (next === PIN) {
        localStorage.setItem("malu_auth", "ok");
        router.replace("/trafego");
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setShake(false); setValue(""); setError(false); }, 700);
      }
    }
  }

  function handleBackspace() {
    setValue(v => v.slice(0, -1));
    setError(false);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">malu brain</h1>
          <p className="text-gray-500 text-sm mt-1">Digite seu PIN para entrar</p>
        </div>

        {/* Dots */}
        <div className={`flex gap-4 ${shake ? "animate-shake" : ""}`}>
          {Array.from({ length: PIN.length }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < value.length
                  ? error ? "bg-red-500 border-red-500" : "bg-white border-white"
                  : "bg-transparent border-white/30"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-sm -mt-4">PIN incorreto</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
            k === "" ? <div key={i} /> : (
              <button
                key={i}
                onClick={() => k === "⌫" ? handleBackspace() : handleKey(k)}
                className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-white/10 text-white text-xl font-medium hover:bg-white/10 active:scale-95 transition-all"
              >
                {k}
              </button>
            )
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}
