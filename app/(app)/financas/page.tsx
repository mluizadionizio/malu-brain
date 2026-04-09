"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Entry = {
  id?: number; year: number; month: number; day: number;
  entrada: number; saida: number; diario: number; saida_desc?: string; diario_desc?: string;
};

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

// Evaluate simple math expressions like "20+50" or "1089.17+905.48"
function evalExpr(str: string): number {
  const cleaned = str.replace(/,/g, ".").replace(/[^0-9+\-*/.]/g, "");
  if (!cleaned) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + cleaned + ')')();
    return typeof result === "number" && isFinite(result) ? result : 0;
  } catch {
    return parseFloat(cleaned) || 0;
  }
}

function saldoColor(saldo: number, maxSaldo: number): string {
  if (saldo <= 0) return "text-red-400";
  if (maxSaldo <= 0) return "text-white";
  const ratio = saldo / maxSaldo;
  if (ratio >= 0.6) return "text-green-400";
  if (ratio >= 0.3) return "text-yellow-400";
  return "text-orange-400";
}

// Editable number cell with expression support + auto-save on unmount
function EditableCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-current snapshot so the unmount cleanup can read latest values
  const stateRef = useRef({ draft: "", value, onChange });
  stateRef.current = { draft, value, onChange };

  function open() {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
    setTimeout(() => ref.current?.select(), 0);
  }

  function commit() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const n = evalExpr(draft);
    setEditing(false);
    if (n !== value) onChange(n);
  }

  function handleChange(text: string) {
    setDraft(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const n = evalExpr(text);
      if (n !== stateRef.current.value) stateRef.current.onChange(n);
    }, 600);
  }

  // Flush pending debounced save if component unmounts (e.g. sidebar navigation)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const { draft: d, value: v, onChange: cb } = stateRef.current;
        const n = evalExpr(d);
        if (n !== v) cb(n);
      }
    };
  }, []); // intentionally empty — only on unmount

  if (editing) {
    return (
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={e => handleChange(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="w-full bg-[#252525] border border-blue-500 rounded px-2 py-1 text-sm text-white outline-none text-right font-mono"
        placeholder="ex: 50+30"
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

// Cell with editable number + optional note popover + auto-save on unmount
function NoteableCell({ value, desc, label, placeholder, onChangeValue, onChangeDesc }: {
  value: number;
  desc: string;
  label: string;
  placeholder?: string;
  onChangeValue: (v: number) => void;
  onChangeDesc: (d: string) => void;
}) {
  const [editingValue, setEditingValue] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draft, setDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ draft: "", value, onChangeValue });
  stateRef.current = { draft, value, onChangeValue };

  function openValue() {
    setDraft(value === 0 ? "" : String(value));
    setEditingValue(true);
    setTimeout(() => ref.current?.select(), 0);
  }

  function commitValue() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const n = evalExpr(draft);
    setEditingValue(false);
    if (n !== value) onChangeValue(n);
  }

  function handleValueChange(text: string) {
    setDraft(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const n = evalExpr(text);
      if (n !== stateRef.current.value) stateRef.current.onChangeValue(n);
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const { draft: d, value: v, onChangeValue: cb } = stateRef.current;
        const n = evalExpr(d);
        if (n !== v) cb(n);
      }
    };
  }, []); // intentionally empty — only on unmount

  function openDesc() {
    setDescDraft(desc);
    setEditingDesc(true);
    setTimeout(() => descRef.current?.focus(), 0);
  }

  function commitDesc() {
    setEditingDesc(false);
    if (descDraft !== desc) onChangeDesc(descDraft);
  }

  return (
    <div className="flex items-center gap-1 group/cell">
      {editingValue ? (
        <input
          ref={ref}
          type="text"
          value={draft}
          onChange={e => handleValueChange(e.target.value)}
          onBlur={commitValue}
          onKeyDown={e => { if (e.key === "Enter") commitValue(); if (e.key === "Escape") setEditingValue(false); }}
          className="flex-1 bg-[#252525] border border-blue-500 rounded px-2 py-1 text-sm text-white outline-none text-right font-mono"
          placeholder="ex: 50+30"
        />
      ) : (
        <div
          onClick={openValue}
          className="flex-1 cursor-pointer hover:bg-white/5 rounded px-2 py-1 text-sm text-right text-gray-300 hover:text-white transition-colors"
        >
          {value === 0 ? <span className="text-gray-600">—</span> : fmt(value)}
        </div>
      )}

      <button
        onClick={openDesc}
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${desc ? "text-blue-400 opacity-100" : "text-gray-600 opacity-0 group-hover/cell:opacity-100"}`}
        title={desc || "Adicionar nota"}
      >
        <FileText size={11} />
      </button>

      {editingDesc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={commitDesc}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">{label}</p>
              <button onClick={commitDesc} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <textarea
              ref={descRef}
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") commitDesc(); }}
              rows={3}
              placeholder={placeholder ?? ""}
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 resize-none placeholder-gray-600"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={commitDesc} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
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
        saida_desc: r.saida_desc ?? "",
        diario_desc: r.diario_desc ?? "",
      })));
      setLoading(false);
    });
  }, [year, month]);

  const days = daysInMonth(year, month);
  const totalDays = Array.from({ length: days }, (_, i) => i + 1);

  function getEntry(day: number): Entry {
    return entries.find(e => e.day === day) ?? { year, month, day, entrada: 0, saida: 0, diario: 0, saida_desc: "", diario_desc: "" };
  }

  async function save(day: number, field: keyof Entry, value: number | string) {
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

  // Compute running saldo
  let runningBalance = carryover;
  const rows = totalDays.map(day => {
    const e = getEntry(day);
    runningBalance += e.entrada - e.saida - e.diario;
    return { day, entrada: e.entrada, saida: e.saida, diario: e.diario, saldo: runningBalance, saida_desc: e.saida_desc ?? "", diario_desc: e.diario_desc ?? "" };
  });

  const totalEntrada = rows.reduce((s, r) => s + r.entrada, 0);
  const totalSaida = rows.reduce((s, r) => s + r.saida, 0);
  const totalDiario = rows.reduce((s, r) => s + r.diario, 0);
  const saldoFinal = carryover + totalEntrada - totalSaida - totalDiario;
  const maxSaldo = Math.max(...rows.map(r => r.saldo), carryover);

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
        <div className="px-3 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white">Finanças</h1>
            <p className="text-xs md:text-sm text-gray-400">Controle de entradas e saídas</p>
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

      <div className="px-3 md:px-6 py-4 md:py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
            <p className="text-gray-400 text-xs mb-1">Entradas</p>
            <p className="text-base md:text-xl font-bold text-green-400">R$ {fmt(totalEntrada)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
            <p className="text-gray-400 text-xs mb-1">Saídas</p>
            <p className="text-base md:text-xl font-bold text-red-400">R$ {fmt(totalSaida)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
            <p className="text-gray-400 text-xs mb-1">Gastos Diários</p>
            <p className="text-base md:text-xl font-bold text-orange-400">R$ {fmt(totalDiario)}</p>
          </div>
          <div className={`bg-[#1a1a1a] border rounded-xl p-3 md:p-4 ${saldoFinal >= 0 ? "border-green-500/30" : "border-red-500/30"}`}>
            <p className="text-gray-400 text-xs mb-1">Saldo Líquido</p>
            <p className={`text-base md:text-xl font-bold ${saldoFinal >= 0 ? "text-green-400" : "text-red-400"}`}>
              R$ {fmtSaldo(saldoFinal)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <div className="min-w-[480px]">
          <div className="grid grid-cols-[44px_1fr_1fr_1fr_1fr] border-b border-white/10 bg-[#161616]">
            <div className="px-3 py-3 text-xs text-gray-500 font-medium">Dia</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Entrada</div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Saída <span className="text-gray-600 font-normal hidden sm:inline">+ nota</span></div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Diário <span className="text-gray-600 font-normal hidden sm:inline">+ nota</span></div>
            <div className="px-2 py-3 text-xs text-gray-500 font-medium text-right">Saldo</div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div>
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
                const saldoClass = hasData ? saldoColor(row.saldo, maxSaldo) : "text-gray-600/60";
                return (
                  <div
                    key={row.day}
                    className={`grid grid-cols-[44px_1fr_1fr_1fr_1fr] border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isWeekend ? "bg-white/[0.01]" : ""}`}
                  >
                    <div className={`px-3 py-1.5 text-sm font-medium flex items-center ${isWeekend ? "text-gray-500" : "text-gray-400"}`}>
                      {row.day}
                    </div>
                    <EditableCell value={row.entrada} onChange={v => save(row.day, "entrada", v)} />
                    <NoteableCell
                      value={row.saida}
                      desc={row.saida_desc}
                      label="Nota da saída"
                      placeholder="Ex: Aluguel 1500 + luz 200 + água 80"
                      onChangeValue={v => save(row.day, "saida", v)}
                      onChangeDesc={d => save(row.day, "saida_desc", d)}
                    />
                    <NoteableCell
                      value={row.diario}
                      desc={row.diario_desc}
                      label="Nota do diário"
                      placeholder="Ex: Ifood 35 + farmácia 22"
                      onChangeValue={v => save(row.day, "diario", v)}
                      onChangeDesc={d => save(row.day, "diario_desc", d)}
                    />
                    <div className={`px-2 py-1.5 text-sm text-right font-mono ${saldoClass}`}>
                      R$ {fmtSaldo(row.saldo)}
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-[44px_1fr_1fr_1fr_1fr] bg-[#161616] border-t border-white/10">
                <div className="px-3 py-3 text-xs text-gray-500 font-medium">Total</div>
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
      </div>
    </div>
  );
}
