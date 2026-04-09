"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const YEARS = [2026, 2027, 2028];

type Entry = { id?: number; year: number; month: number; day: number; entrada: number; saida: number; diario: number };

function fmt(v: number) {
  if (v === 0) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSaldo(v: number) {
  const s = v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function EditableCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function open() {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
    setTimeout(() => ref.current?.select(), 0);
  }

  function commit() {
    const n = parseFloat(draft.replace(",", ".")) || 0;
    setEditing(false);
    if (n !== value) onChange(n);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="w-full bg-[#252525] border border-blue-500 rounded px-2 py-1 text-sm text-white outline-none text-right"
      />
    );
  }

  return (
    <div
      onClick={open}
      className="cursor-pointer hover:bg-white/5 rounded px-2 py-1 text-sm text-right text-gray-300 hover:text-white transition-colors"
    >
      {value === 0 ? <span className="text-gray-600">—</span> : fmt(value)}
    </div>
  );
}

export default function FinancasPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear() < 2026 ? 2026 : today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [carryover, setCarryover] = useState(0);

  useEffect(() => {
    setLoading(true);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    Promise.all([
      fetch(`/api/finance?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/finance?year=${prevYear}&month=${prevMonth}`).then(r => r.json()),
    ]).then(([current, prev]) => {
      const prevBalance = (prev as any[]).reduce((sum: number, e: any) =>
        sum + (Number(e.entrada) || 0) - (Number(e.saida) || 0) - (Number(e.diario) || 0), 0
      );
      setCarryover(prevBalance);
      setEntries(current.map((r: any) => ({
        ...r,
        entrada: Number(r.entrada) || 0,
        saida: Number(r.saida) || 0,
        diario: Number(r.diario) || 0,
      })));
      setLoading(false);
    });
  }, [year, month]);

  const days = daysInMonth(year, month);
  const totalDays = Array.from({ length: days }, (_, i) => i + 1);

  function getEntry(day: number): Entry {
    return entries.find(e => e.day === day) ?? { year, month, day, entrada: 0, saida: 0, diario: 0 };
  }

  async function save(day: number, field: "entrada" | "saida" | "diario", value: number) {
    const e = getEntry(day);
    const updated = { ...e, [field]: value };
    setEntries(prev => {
      const filtered = prev.filter(x => x.day !== day);
      return [...filtered, updated].sort((a, b) => a.day - b.day);
    });
    await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  // Compute running saldo starting from previous month's balance
  let runningBalance = carryover;
  const rows = totalDays.map(day => {
    const e = getEntry(day);
    runningBalance += e.entrada - e.saida - e.diario;
    return { day, entrada: e.entrada, saida: e.saida, diario: e.diario, saldo: runningBalance };
  });

  const totalEntrada = rows.reduce((s, r) => s + r.entrada, 0);
  const totalSaida = rows.reduce((s, r) => s + r.saida, 0);
  const totalDiario = rows.reduce((s, r) => s + r.diario, 0);
  const saldoFinal = totalEntrada - totalSaida - totalDiario;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Finanças</h1>
            <p className="text-sm text-gray-400">Controle de entradas e saídas</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-white min-w-[150px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Entradas</p>
            <p className="text-xl font-bold text-green-400">R$ {fmt(totalEntrada)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Saídas</p>
            <p className="text-xl font-bold text-red-400">R$ {fmt(totalSaida)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Gastos Diários</p>
            <p className="text-xl font-bold text-orange-400">R$ {fmt(totalDiario)}</p>
          </div>
          <div className={`bg-[#1a1a1a] border rounded-xl p-4 ${saldoFinal >= 0 ? "border-green-500/30" : "border-red-500/30"}`}>
            <p className="text-gray-400 text-xs mb-1">Saldo Líquido</p>
            <p className={`text-xl font-bold ${saldoFinal >= 0 ? "text-green-400" : "text-red-400"}`}>
              R$ {fmtSaldo(saldoFinal)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] border-b border-white/10 bg-[#161616]">
            <div className="px-4 py-3 text-xs text-gray-500 font-medium">Dia</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Entrada (R$)</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Saída (R$)</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Diário (R$)</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Saldo Acumulado</div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div>
              {/* Saldo anterior */}
              {carryover !== 0 && (
                <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] border-b border-white/5 bg-white/[0.02]">
                  <div className="px-4 py-2 text-xs text-gray-600 font-medium flex items-center col-span-4">
                    Saldo anterior
                  </div>
                  <div className={`px-2 py-2 text-sm text-right font-semibold ${carryover >= 0 ? "text-gray-400" : "text-red-400"}`}>
                    R$ {fmtSaldo(carryover)}
                  </div>
                </div>
              )}
              {rows.map(row => {
                const isWeekend = [0, 6].includes(new Date(year, month - 1, row.day).getDay());
                const hasData = row.entrada !== 0 || row.saida !== 0 || row.diario !== 0;
                return (
                  <div
                    key={row.day}
                    className={`grid grid-cols-[48px_1fr_1fr_1fr_1fr] border-b border-white/5 group hover:bg-white/[0.02] transition-colors ${isWeekend ? "bg-white/[0.01]" : ""}`}
                  >
                    <div className={`px-4 py-1.5 text-sm font-medium flex items-center ${isWeekend ? "text-gray-500" : "text-gray-400"}`}>
                      {row.day}
                    </div>
                    <EditableCell value={row.entrada} onChange={v => save(row.day, "entrada", v)} />
                    <EditableCell value={row.saida} onChange={v => save(row.day, "saida", v)} />
                    <EditableCell value={row.diario} onChange={v => save(row.day, "diario", v)} />
                    <div className={`px-2 py-1.5 text-sm text-right font-mono ${row.saldo < 0 ? "text-red-400" : hasData ? "text-white" : "text-gray-600"}`}>
                      {hasData ? `R$ ${fmtSaldo(row.saldo)}` : "—"}
                    </div>
                  </div>
                );
              })}

              {/* Totals row */}
              <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] bg-[#161616] border-t border-white/10">
                <div className="px-4 py-3 text-xs text-gray-500 font-medium">Total</div>
                <div className="px-2 py-3 text-sm text-right font-semibold text-green-400">{fmt(totalEntrada)}</div>
                <div className="px-2 py-3 text-sm text-right font-semibold text-red-400">{fmt(totalSaida)}</div>
                <div className="px-2 py-3 text-sm text-right font-semibold text-orange-400">{fmt(totalDiario)}</div>
                <div className={`px-2 py-3 text-sm text-right font-bold ${saldoFinal >= 0 ? "text-green-400" : "text-red-400"}`}>
                  R$ {fmtSaldo(saldoFinal)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
