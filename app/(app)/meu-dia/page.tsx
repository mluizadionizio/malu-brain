"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Check } from "lucide-react";

const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(ymd: string, n: number) {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toYMD(d);
}
function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DAYS_FULL[dow]}, ${d} ${MONTHS_PT[m - 1]} ${y}`;
}
function toMonthKey(ymd: string) { return ymd.slice(0, 7); }

type Todo = { id: number; title: string; date: string; completed: number };
type HabitDay = { id: number; title: string; color: string; completed_today: number; streak: number; last_30: { date: string; completed: number }[] };
type MonthData = { habits: { id: number; title: string; color: string }[]; logMap: Record<string, Record<number, number>>; daysInMonth: number; year: number; month: number };

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#64748b"];

export default function MeuDiaPage() {
  const todayYMD = toYMD(new Date());
  const [date, setDate] = useState(todayYMD);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habitDay, setHabitDay] = useState<HabitDay[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [habitMonth, setHabitMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [habitForm, setHabitForm] = useState({ title: "", color: "#3b82f6" });
  const [newTodo, setNewTodo] = useState("");

  // Fetch todos for selected date
  useEffect(() => {
    fetch(`/api/todos?date=${date}`).then(r => r.json()).then(setTodos);
    fetch(`/api/habit-logs?date=${date}`).then(r => r.json()).then(setHabitDay);
  }, [date]);

  // Fetch month calendar data
  useEffect(() => {
    fetch(`/api/habit-logs?month=${habitMonth}`).then(r => r.json()).then(setMonthData);
  }, [habitMonth]);

  async function addTodo() {
    const title = newTodo.trim();
    if (!title) return;
    setNewTodo("");
    const res = await fetch("/api/todos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date }),
    });
    const newItem = await res.json();
    setTodos(prev => [...prev, newItem]);
  }

  async function toggleTodo(todo: Todo) {
    const next = todo.completed ? 0 : 1;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: next } : t));
    await fetch(`/api/todos/${todo.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
  }

  async function deleteTodo(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  async function toggleHabit(habit: HabitDay) {
    const next = habit.completed_today ? 0 : 1;
    setHabitDay(prev => prev.map(h => h.id === habit.id ? { ...h, completed_today: next } : h));
    await fetch("/api/habit-logs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habit.id, date, completed: next }),
    });
    // Refresh both day and month data
    fetch(`/api/habit-logs?date=${date}`).then(r => r.json()).then(setHabitDay);
    fetch(`/api/habit-logs?month=${habitMonth}`).then(r => r.json()).then(setMonthData);
  }

  async function addHabit() {
    if (!habitForm.title.trim()) return;
    await fetch("/api/habits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(habitForm),
    });
    setHabitForm({ title: "", color: "#3b82f6" });
    setShowHabitModal(false);
    fetch(`/api/habit-logs?date=${date}`).then(r => r.json()).then(setHabitDay);
    fetch(`/api/habit-logs?month=${habitMonth}`).then(r => r.json()).then(setMonthData);
  }

  async function deleteHabit(id: number) {
    if (!confirm("Remover este hábito e todo o histórico?")) return;
    setHabitDay(prev => prev.filter(h => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    fetch(`/api/habit-logs?month=${habitMonth}`).then(r => r.json()).then(setMonthData);
  }

  const isToday = date === todayYMD;
  const completedTodos = todos.filter(t => !!t.completed).length;

  // Month calendar helpers
  function prevHabitMonth() {
    const [y, m] = habitMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setHabitMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function nextHabitMonth() {
    const [y, m] = habitMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setHabitMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  function buildMonthGrid(year: number, month: number, daysInMonth: number) {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const [hm_y, hm_m] = habitMonth.split("-").map(Number);
  const monthGrid = monthData ? buildMonthGrid(hm_y, hm_m, monthData.daysInMonth) : [];

  // Completion % per habit for the month
  function habitMonthPct(habitId: number) {
    if (!monthData) return 0;
    let done = 0;
    for (let d = 1; d <= monthData.daysInMonth; d++) {
      const key = `${habitMonth}-${String(d).padStart(2,"0")}`;
      if (monthData.logMap[key]?.[habitId]) done++;
    }
    return Math.round((done / monthData.daysInMonth) * 100);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="px-6 py-4 flex items-center gap-3">
          <button onClick={() => setDate(d => addDays(d, -1))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{isToday ? "Meu Dia" : formatDate(date)}</h1>
            <p className="text-sm text-gray-400">{isToday ? formatDate(date) : ""}</p>
          </div>
          <button onClick={() => setDate(d => addDays(d, 1))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setDate(todayYMD)} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">Hoje</button>
          )}
        </div>
      </div>

      <div className="px-6 py-6 grid grid-cols-[2fr_3fr] gap-6" style={{ minHeight: "calc(100vh - 73px)" }}>

        {/* === TO-DO === */}
        <div className="flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">To-Do</h2>
              {todos.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{completedTodos}/{todos.length} concluídas</p>}
            </div>
            {todos.length > 0 && (
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completedTodos / todos.length) * 100}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {todos.length === 0 && <p className="text-xs text-gray-600 text-center pt-8">Nenhuma tarefa ainda</p>}
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 group transition-colors">
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    todo.completed ? "bg-green-500 border-green-500" : "border-white/20 hover:border-white/40"
                  }`}
                >
                  {!!todo.completed && <Check size={11} className="text-white" />}
                </button>
                <span className={`flex-1 text-sm transition-all ${todo.completed ? "line-through text-gray-600" : "text-gray-200"}`}>
                  {todo.title}
                </span>
                <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                placeholder="Adicionar tarefa..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
              {newTodo && (
                <button onClick={addTodo} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Adicionar</button>
              )}
            </div>
          </div>
        </div>

        {/* === HÁBITOS === */}
        <div className="flex flex-col gap-4">

          {/* Today's habit toggles */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Hábitos de hoje</h2>
              <button onClick={() => setShowHabitModal(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors">
                <Plus size={12} /> Novo
              </button>
            </div>
            <div className="p-4">
              {habitDay.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Nenhum hábito cadastrado</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {habitDay.map(habit => (
                    <button
                      key={habit.id}
                      onClick={() => toggleHabit(habit)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium"
                      style={{
                        borderColor: habit.completed_today ? habit.color : "rgba(255,255,255,0.1)",
                        backgroundColor: habit.completed_today ? habit.color + "22" : "transparent",
                        color: habit.completed_today ? habit.color : "#9ca3af",
                      }}
                    >
                      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: habit.completed_today ? habit.color : "rgba(255,255,255,0.2)", backgroundColor: habit.completed_today ? habit.color + "44" : "transparent" }}>
                        {!!habit.completed_today && <Check size={9} style={{ color: habit.color }} />}
                      </span>
                      {habit.title}
                      {habit.streak > 0 && <span className="text-xs opacity-70">🔥{habit.streak}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly calendar view */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex-1">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Calendário do mês</h2>
              <div className="flex items-center gap-2">
                <button onClick={prevHabitMonth} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
                <span className="text-xs text-gray-300 font-medium min-w-[100px] text-center">{MONTHS_FULL[hm_m - 1]} {hm_y}</span>
                <button onClick={nextHabitMonth} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>

            {!monthData || monthData.habits.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">Nenhum hábito cadastrado</p>
            ) : (
              <div className="p-4 space-y-5 overflow-y-auto" style={{ maxHeight: "420px" }}>
                {monthData.habits.map(habit => {
                  const pct = habitMonthPct(habit.id);
                  return (
                    <div key={habit.id}>
                      {/* Habit header */}
                      <div className="flex items-center justify-between mb-2 group">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                          <span className="text-xs font-medium text-white">{habit.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: habit.color }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                          <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Day-of-week headers */}
                      <div className="grid grid-cols-7 gap-px mb-px">
                        {DAYS_SHORT.map((d, i) => (
                          <div key={i} className="text-center text-[10px] text-gray-600 pb-1">{d}</div>
                        ))}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-px">
                        {monthGrid.map((day, idx) => {
                          if (day === null) return <div key={`e-${idx}`} className="aspect-square" />;
                          const key = `${habitMonth}-${String(day).padStart(2,"0")}`;
                          const done = monthData.logMap[key]?.[habit.id];
                          const isSelected = key === date;
                          const isTodayCell = key === todayYMD;
                          return (
                            <button
                              key={day}
                              onClick={() => setDate(key)}
                              className="aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium transition-all relative"
                              style={{
                                backgroundColor: done ? habit.color + "cc" : "rgba(255,255,255,0.04)",
                                color: done ? "#fff" : "#6b7280",
                                outline: isSelected ? `1.5px solid ${habit.color}` : isTodayCell ? "1px solid rgba(255,255,255,0.2)" : "none",
                                outlineOffset: "1px",
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Habit Modal */}
      {showHabitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-semibold">Novo Hábito</p>
              <button onClick={() => setShowHabitModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                <input autoFocus type="text" value={habitForm.title}
                  onChange={e => setHabitForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addHabit()}
                  placeholder="Ex: Academia, Leitura..."
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setHabitForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ backgroundColor: c, outline: habitForm.color === c ? "2px solid white" : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowHabitModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
                <button onClick={addHabit} disabled={!habitForm.title.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
