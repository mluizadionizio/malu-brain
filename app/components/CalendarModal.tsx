"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Pencil, Clock, User, AlignLeft, RefreshCw } from "lucide-react";

type CalendarEvent = {
  id: number;
  client_id: number | null;
  client_name: string | null;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  recurrence?: string;
};

type Client = { id: number; name: string };
type ViewMode = "month" | "3day" | "day";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DAYS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

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

function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

function addDays(ymd: string, n: number) {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
}

// --- Event form (create/edit) ---
function EventFormModal({ event, date, clients, onClose, onSave, onDelete }: {
  event?: CalendarEvent;
  date?: string;
  clients: Client[];
  onClose: () => void;
  onSave: (e: CalendarEvent) => void;
  onDelete?: (id: number) => void;
}) {
  const isEdit = !!event;
  const [title, setTitle] = useState(event?.title ?? "");
  const [clientId, setClientId] = useState(String(event?.client_id ?? ""));
  const [time, setTime] = useState(event?.time ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [recurrence, setRecurrence] = useState(event?.recurrence ?? "none");
  const [saving, setSaving] = useState(false);

  const displayDate = fmtDate(event?.date ?? date ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    if (isEdit) {
      const res = await fetch(`/api/events/${event!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          time: time || null,
          client_id: clientId ? parseInt(clientId) : null,
          description: description.trim() || null,
          recurrence,
        }),
      });
      onSave(await res.json());
    } else {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), date, time: time || null,
          client_id: clientId ? parseInt(clientId) : null,
          description: description.trim() || null,
          recurrence,
        }),
      });
      onSave(await res.json());
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!event || !onDelete) return;
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    onDelete(event.id);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{isEdit ? "Editar Evento" : "Novo Evento"}</p>
            <p className="text-white font-semibold">{displayDate}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Título *</label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Ex: Reunião com cliente"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Horário</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cliente</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                <option value="">— Nenhum —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Repetir</label>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
              <option value="none">Nunca</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Detalhes..."
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex items-center justify-between pt-1">
            {isEdit && onDelete ? (
              <button type="button" onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={saving || !title.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Event chip (shared) ---
function EventChip({ ev, onClick }: { ev: CalendarEvent; onClick: () => void }) {
  const label = [ev.client_name, ev.title].filter(Boolean).join(" · ");
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      className="w-full text-left flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 rounded px-1 py-0.5 transition-colors group/ev">
      <span className="text-[10px] text-blue-300 truncate flex-1 leading-tight">
        {ev.time ? `${ev.time} · ` : ""}{label}
      </span>
      <Pencil size={8} className="opacity-0 group-hover/ev:opacity-60 text-blue-300 flex-shrink-0" />
    </button>
  );
}

// --- Month view ---
function MonthView({ year, month, events, todayYMD, onDayClick, onEventClick }: {
  year: number; month: number;
  events: Record<string, CalendarEvent[]>;
  todayYMD: string;
  onDayClick: (ymd: string) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const cells = buildGrid(year, month);
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-7 mb-1">
        {DAYS_PT.map(d => <div key={d} className="text-center text-xs text-gray-500 uppercase tracking-wider py-1.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="h-24 rounded-xl bg-[#111]" />;
          const ymd = toYMD(year, month, day);
          const dayEvents = events[ymd] || [];
          const isToday = ymd === todayYMD;
          return (
            <div key={ymd} onClick={() => onDayClick(ymd)}
              className={`h-24 rounded-xl border p-1.5 cursor-pointer flex flex-col transition-colors group
                ${isToday ? "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10" : "border-white/[0.06] bg-[#1a1a1a] hover:border-white/20 hover:bg-[#1f1f1f]"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isToday ? "text-blue-400" : "text-gray-400"}`}>{day}</span>
                <Plus size={10} className="opacity-0 group-hover:opacity-40 text-gray-400" />
              </div>
              <div className="flex-1 overflow-hidden space-y-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <EventChip key={ev.id} ev={ev} onClick={() => onEventClick(ev)} />
                ))}
                {dayEvents.length > 2 && <p className="text-[10px] text-gray-500 px-0.5">+{dayEvents.length - 2} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Day / 3-day view ---
function DayView({ dates, events, todayYMD, onAddClick, onEventClick }: {
  dates: string[];
  events: Record<string, CalendarEvent[]>;
  todayYMD: string;
  onAddClick: (ymd: string) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className={`grid gap-3 h-full`} style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}>
        {dates.map(ymd => {
          const [y, m, d] = ymd.split("-").map(Number);
          const dow = new Date(y, m - 1, d).getDay();
          const isToday = ymd === todayYMD;
          const dayEvents = (events[ymd] || []).slice().sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

          return (
            <div key={ymd} className={`flex flex-col rounded-xl border ${isToday ? "border-blue-500/40 bg-blue-500/5" : "border-white/[0.06] bg-[#1a1a1a]"}`}>
              {/* Day header */}
              <div className={`px-4 py-3 border-b ${isToday ? "border-blue-500/20" : "border-white/5"} flex items-center justify-between`}>
                <div>
                  <p className={`text-xs font-medium ${isToday ? "text-blue-400" : "text-gray-500"}`}>{DAYS_FULL[dow]}</p>
                  <p className={`text-xl font-bold ${isToday ? "text-blue-300" : "text-white"}`}>{d}</p>
                </div>
                <button onClick={() => onAddClick(ymd)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              {/* Events */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {dayEvents.length === 0 && (
                  <p className="text-xs text-gray-600 text-center pt-4">Nenhum evento</p>
                )}
                {dayEvents.map(ev => {
                  const label = [ev.client_name, ev.title].filter(Boolean).join(" · ");
                  return (
                    <button key={ev.id} onClick={() => onEventClick(ev)}
                      className="w-full text-left bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg px-3 py-2.5 transition-colors group/ev">
                      {ev.client_name && <p className="text-xs text-blue-400 font-medium truncate">{ev.client_name}</p>}
                      <p className="text-sm text-white font-medium truncate">{ev.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {ev.time && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10} />{ev.time}</span>}
                        {ev.recurrence && ev.recurrence !== "none" && <span className="flex items-center gap-1 text-xs text-gray-500"><RefreshCw size={9} />{ev.recurrence === "weekly" ? "Semanal" : "Mensal"}</span>}
                      </div>
                      {ev.description && <p className="text-xs text-gray-500 mt-1 truncate">{ev.description}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main component ---
export default function CalendarModal({ onClose, clients, mode = "modal" }: {
  onClose?: () => void;
  clients: Client[];
  mode?: "modal" | "page";
}) {
  const today = new Date();
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [focusDate, setFocusDate] = useState(todayYMD); // for day/3day views
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // modal states
  const [addDate, setAddDate] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2,"0")}`;

  useEffect(() => {
    fetch(`/api/events?month=${monthKey}`).then(r => r.json()).then(setEvents);
  }, [year, month]);

  // Also fetch adjacent months when in day/3day view near month boundary
  useEffect(() => {
    if (viewMode === "month") return;
    const [fy, fm] = focusDate.split("-").map(Number);
    const key = `${fy}-${String(fm).padStart(2,"0")}`;
    if (key !== monthKey) {
      setYear(fy);
      setMonth(fm - 1);
    }
  }, [focusDate, viewMode]);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  function prevPeriod() {
    if (viewMode === "month") prevMonth();
    else setFocusDate(d => addDays(d, viewMode === "day" ? -1 : -3));
  }
  function nextPeriod() {
    if (viewMode === "month") nextMonth();
    else setFocusDate(d => addDays(d, viewMode === "day" ? 1 : 3));
  }

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  function periodLabel() {
    if (viewMode === "month") return `${MONTHS_PT[month]} ${year}`;
    if (viewMode === "day") return fmtDate(focusDate);
    const d2 = addDays(focusDate, 2);
    return `${fmtDate(focusDate)} – ${fmtDate(d2)}`;
  }

  function getDates(): string[] {
    if (viewMode === "day") return [focusDate];
    return [focusDate, addDays(focusDate, 1), addDays(focusDate, 2)];
  }

  function handleDayClick(ymd: string) {
    setAddDate(ymd);
  }

  function handleEventSaved(ev: CalendarEvent) {
    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== ev.id);
      return [...filtered, ev];
    });
    setAddDate(null);
    setEditEvent(null);
  }

  function handleEventDeleted(id: number) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setEditEvent(null);
  }

  const inner = (
    <div className={`bg-[#161616] border border-white/10 rounded-2xl flex flex-col shadow-2xl ${mode === "page" ? "w-full h-full" : "w-full max-w-5xl max-h-[90vh]"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={prevPeriod} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-white min-w-[180px] text-center">{periodLabel()}</span>
          <button onClick={nextPeriod} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
          <button onClick={() => { setFocusDate(todayYMD); setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">Hoje</button>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
            {(["month","3day","day"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => { setViewMode(v); if (v !== "month") setFocusDate(todayYMD); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === v ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}>
                {v === "month" ? "Mês" : v === "3day" ? "3 dias" : "Dia"}
              </button>
            ))}
          </div>
          {mode === "modal" && (
            <button onClick={onClose} className="ml-1 p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
          )}
        </div>
      </div>

      {/* Body */}
      {viewMode === "month" ? (
        <MonthView
          year={year} month={month}
          events={eventsByDate} todayYMD={todayYMD}
          onDayClick={handleDayClick}
          onEventClick={setEditEvent}
        />
      ) : (
        <DayView
          dates={getDates()}
          events={eventsByDate} todayYMD={todayYMD}
          onAddClick={handleDayClick}
          onEventClick={setEditEvent}
        />
      )}

      {/* Add event modal */}
      {addDate && (
        <EventFormModal
          date={addDate}
          clients={clients}
          onClose={() => setAddDate(null)}
          onSave={handleEventSaved}
        />
      )}

      {/* Edit event modal */}
      {editEvent && (
        <EventFormModal
          event={editEvent}
          clients={clients}
          onClose={() => setEditEvent(null)}
          onSave={handleEventSaved}
          onDelete={handleEventDeleted}
        />
      )}
    </div>
  );

  if (mode === "page") return inner;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {inner}
    </div>
  );
}
