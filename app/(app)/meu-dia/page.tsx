"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Check } from "lucide-react";

const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

type Todo = { id: number; title: string; date: string; completed: number };
type HabitLog = {
  id: number; title: string; color: string;
  completed_today: number; streak: number;
  last_30: { date: string; completed: number }[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function MeuDiaPage() {
  const todayYMD = toYMD(new Date());
  const [date, setDate] = useState(todayYMD);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<HabitLog[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [habitForm, setHabitForm] = useState({ title: "", color: "#3b82f6" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/todos?date=${date}`).then(r => r.json()).then(setTodos);
    fetch(`/api/habit-logs?date=${date}`).then(r => r.json()).then(setHabits);
  }, [date]);

  async function addTodo() {
    const title = newTodo.trim();
    if (!title) return;
    setNewTodo("");
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date }),
    });
    const todo = await res.json();
    setTodos(prev => [...prev, todo]);
  }

  async function toggleTodo(todo: Todo) {
    const next = todo.completed ? 0 : 1;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: next } : t));
    await fetch(`/api/todos/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
  }

  async function deleteTodo(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
  }

  async function toggleHabit(habit: HabitLog) {
    const next = habit.completed_today ? 0 : 1;
    setHabits(prev => prev.map(h => h.id === habit.id
      ? { ...h, completed_today: next, streak: next ? h.streak + 1 : Math.max(0, h.streak - 1), last_30: h.last_30.map(d => d.date === date ? { ...d, completed: next } : d) }
      : h
    ));
    await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habit.id, date, completed: next }),
    });
    // Refresh to get accurate streak
    fetch(`/api/habit-logs?date=${date}`).then(r => r.json()).then(setHabits);
  }

  async function addHabit() {
    if (!habitForm.title.trim()) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(habitForm),
    });
    const habit = await res.json();
    setHabits(prev => [...prev, { ...habit, completed_today: 0, streak: 0, last_30: [] }]);
    setHabitForm({ title: "", color: "#3b82f6" });
    setShowHabitModal(false);
  }

  async function deleteHabit(id: number) {
    if (!confirm("Remover este hábito e todo o histórico?")) return;
    setHabits(prev => prev.filter(h => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  }

  const isToday = date === todayYMD;
  const completedTodos = todos.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <button onClick={() => setDate(todayYMD)} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                Hoje
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 grid grid-cols-[2fr_3fr] gap-6 h-[calc(100vh-73px)]">

        {/* === TO-DO PANEL === */}
        <div className="flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">To-Do</h2>
              {todos.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{completedTodos}/{todos.length} concluídas</p>
              )}
            </div>
            {todos.length > 0 && (
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completedTodos / todos.length) * 100}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {todos.length === 0 && (
              <p className="text-xs text-gray-600 text-center pt-8">Nenhuma tarefa ainda</p>
            )}
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 group transition-colors">
                <button onClick={() => toggleTodo(todo)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    todo.completed ? "bg-green-500 border-green-500" : "border-white/20 hover:border-white/40"
                  }`}>
                  {todo.completed && <Check size={11} className="text-white" />}
                </button>
                <span className={`flex-1 text-sm transition-all ${todo.completed ? "line-through text-gray-600" : "text-gray-200"}`}>
                  {todo.title}
                </span>
                <button onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add todo input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-gray-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                placeholder="Adicionar tarefa..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
              {newTodo && (
                <button onClick={addTodo} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* === HABITS PANEL === */}
        <div className="flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Hábitos</h2>
            <button onClick={() => setShowHabitModal(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors">
              <Plus size={12} /> Novo hábito
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {habits.length === 0 && (
              <p className="text-xs text-gray-600 text-center pt-8">Nenhum hábito cadastrado ainda</p>
            )}
            {habits.map(habit => (
              <div key={habit.id} className="space-y-2">
                <div className="flex items-center gap-3 group">
                  {/* Toggle */}
                  <button onClick={() => toggleHabit(habit)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                    style={{
                      borderColor: habit.completed_today ? habit.color : "rgba(255,255,255,0.2)",
                      backgroundColor: habit.completed_today ? habit.color + "33" : "transparent",
                    }}>
                    {habit.completed_today ? <Check size={14} style={{ color: habit.color }} /> : null}
                  </button>
                  <span className="flex-1 text-sm font-medium text-white">{habit.title}</span>
                  {habit.streak > 0 && (
                    <span className="text-xs text-orange-400 font-medium">🔥 {habit.streak}</span>
                  )}
                  <button onClick={() => deleteHabit(habit.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-1">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Heatmap 30 dias */}
                <div className="flex gap-1 ml-11 flex-wrap">
                  {habit.last_30.map((d, i) => (
                    <div
                      key={i}
                      title={d.date}
                      className="w-4 h-4 rounded-sm transition-colors"
                      style={{
                        backgroundColor: d.completed ? habit.color + "cc" : "rgba(255,255,255,0.05)",
                        outline: d.date === date ? `1px solid ${habit.color}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
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
                <input
                  autoFocus
                  type="text"
                  value={habitForm.title}
                  onChange={e => setHabitForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addHabit()}
                  placeholder="Ex: Academia, Leitura..."
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setHabitForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        outline: habitForm.color === c ? `2px solid white` : "none",
                        outlineOffset: "2px",
                      }}
                    />
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
