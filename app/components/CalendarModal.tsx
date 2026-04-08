"use client";

import { useEffect, useState } from "react";
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
  const [recurrence, setRecurrence] = useState("none");
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
      body: JSON.stringify({ title: title.trim(), date, time: time || null, client_id: clientId ? parseInt(clientId) : null, description: description.trim() || null, recurrence }),
    });
    onSave(await res.json());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
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
            <label className="block text-xs text-gray-400 mb-1">Repetir</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
              <option value="none">Nunca</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detalhes..."
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

export default function CalendarModal({ onClose, clients }: { onClose: () => void; clients: Client[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2,"0")}`;

  useEffect(() => {
    fetch(`/api/events?month=${monthKey}`).then((r) => r.json()).then(setEvents);
  }, [year, month]);

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161616] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Calendário</h2>
            <p className="text-xs text-gray-500 mt-0.5">Clique em um dia para adicionar evento</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-white min-w-[130px] text-center">{MONTHS_PT[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
            <button onClick={onClose} className="ml-2 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_PT.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 uppercase tracking-wider py-1.5">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="h-24 rounded-xl bg-[#111]" />;
              const ymd = toYMD(year, month, day);
              const dayEvents = eventsByDate[ymd] || [];
              const isToday = ymd === todayYMD;

              return (
                <div key={ymd} onClick={() => setModalDate(ymd)}
                  className={`h-24 rounded-xl border p-1.5 cursor-pointer flex flex-col transition-colors group
                    ${isToday ? "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10" : "border-white/[0.06] bg-[#1a1a1a] hover:border-white/20 hover:bg-[#1f1f1f]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${isToday ? "text-blue-400" : "text-gray-400"}`}>{day}</span>
                    <Plus size={10} className="opacity-0 group-hover:opacity-40 text-gray-400" />
                  </div>
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div key={ev.id} onClick={(e) => e.stopPropagation()}
                        className="group/ev flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 rounded px-1 py-0.5 transition-colors">
                        <span className="text-[10px] text-blue-300 truncate flex-1 leading-tight">
                          {ev.time ? `${ev.time} · ` : ""}{ev.title}{ev.client_name ? ` · ${ev.client_name}` : ""}
                        </span>
                        <button onClick={() => deleteEvent(ev.id)}
                          className="opacity-0 group-hover/ev:opacity-100 text-red-400 flex-shrink-0 transition-opacity">
                          <Trash2 size={9} />
                        </button>
                      </div>
                    ))}
                    {dayEvents.length > 2 && <p className="text-[10px] text-gray-500 px-0.5">+{dayEvents.length - 2} mais</p>}
                  </div>
                </div>
              );
            })}
          </div>
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
