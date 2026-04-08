"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";

type CalendarEvent = {
  id: number;
  client_id: number | null;
  client_name: string | null;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
};

type Client = { id: number; name: string };

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function AddEventModal({ date, clients, onClose, onSave }: {
  date: string;
  clients: Client[];
  onClose: () => void;
  onSave: (e: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [y, m, d] = date.split("-").map(Number);
  const display = `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), date, time: time || null, client_id: clientId ? parseInt(clientId) : null, description: description.trim() || null }),
    });
    onSave(await res.json());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Novo Evento</p>
            <p className="text-white font-semibold">{display}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Título *</label>
            <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Reunião com cliente"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                <option value="">— Nenhum —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes..."
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2,"0")}`;

  useEffect(() => { fetchEvents(); }, [year, month]);
  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.map((c: any) => ({ id: c.id, name: c.name }))));
  }, []);

  async function fetchEvents() {
    const res = await fetch(`/api/events?month=${monthKey}`);
    setEvents(await res.json());
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }

  async function deleteEvent(id: number) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  const cells = buildGrid(year, month);
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Calendário</h1>
            <p className="text-sm text-gray-400">Eventos e compromissos</p>
          </div>
          <Link href="/" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            ← Clientes
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white">{MONTHS_PT[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_PT.map((d) => (
            <div key={d} className="text-center text-xs text-gray-500 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="h-32 rounded-xl bg-[#111]" />;
            const ymd = toYMD(year, month, day);
            const dayEvents = eventsByDate[ymd] || [];
            const isToday = ymd === todayYMD;

            return (
              <div key={ymd} onClick={() => setModalDate(ymd)}
                className={`h-32 rounded-xl border p-2 cursor-pointer flex flex-col transition-colors group
                  ${isToday ? "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10" : "border-white/[0.06] bg-[#1a1a1a] hover:border-white/20 hover:bg-[#1f1f1f]"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-semibold ${isToday ? "text-blue-400" : "text-gray-400"}`}>{day}</span>
                  <Plus size={11} className="opacity-0 group-hover:opacity-40 text-gray-400" />
                </div>
                <div className="flex-1 overflow-hidden space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} onClick={(e) => e.stopPropagation()}
                      className="group/ev flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 rounded px-1.5 py-0.5 transition-colors">
                      <span className="text-[10px] text-blue-300 truncate flex-1 leading-tight">
                        {ev.time ? `${ev.time} · ` : ""}{ev.title}{ev.client_name ? ` · ${ev.client_name}` : ""}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)}
                        className="opacity-0 group-hover/ev:opacity-100 text-red-400 hover:text-red-300 flex-shrink-0 transition-opacity">
                        <Trash2 size={9} />
                      </button>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalDate && (
        <AddEventModal
          date={modalDate}
          clients={clients}
          onClose={() => setModalDate(null)}
          onSave={(ev) => { setEvents((prev) => [...prev, ev]); setModalDate(null); }}
        />
      )}
    </div>
  );
}
