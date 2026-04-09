"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, Check } from "lucide-react";

const DAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316","#64748b"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDayLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DAYS_FULL[dow]}, ${d} ${MONTHS_PT[m - 1]}`;
}
function buildMonthGrid(year: number, month: number, daysInMonth: number) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type Course = {
  id: number; title: string; color: string; total_modules: number | null;
  done_count: number;
};
type Session = {
  id: number; course_id: number; course_title: string; course_color: string;
  date: string; module_label: string | null; duration_minutes: number | null;
  status: "done" | "planned";
};
type MonthData = {
  dateMap: Record<string, { done: number; planned: number }>;
  daysInMonth: number; year: number; month: number;
};

export default function EstudosPage() {
  const todayYMD = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [courses, setCourses] = useState<Course[]>([]);
  const [daySessions, setDaySessions] = useState<Session[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [studyMonth, setStudyMonth] = useState(() => todayYMD.slice(0, 7));

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", color: "#3b82f6", total_modules: "" });
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ course_id: 0, module_label: "", duration_minutes: "", status: "done" as "done" | "planned" });

  const fetchCourses = useCallback(() => {
    fetch("/api/study-topics").then(r => r.json()).then((data: any[]) =>
      setCourses(data.map(c => ({ ...c, total_modules: c.total_modules ?? null, done_count: Number(c.done_count) || 0 })))
    );
  }, []);

  const fetchDaySessions = useCallback((date: string) => {
    fetch(`/api/study-sessions?date=${date}`).then(r => r.json()).then(setDaySessions);
  }, []);

  const fetchMonthData = useCallback((month: string) => {
    fetch(`/api/study-sessions?month=${month}`).then(r => r.json()).then(setMonthData);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { fetchDaySessions(selectedDate); }, [selectedDate, fetchDaySessions]);
  useEffect(() => { fetchMonthData(studyMonth); }, [studyMonth, fetchMonthData]);

  function refreshAll() {
    fetchCourses();
    fetchDaySessions(selectedDate);
    fetchMonthData(studyMonth);
  }

  // Month navigation
  function prevMonth() {
    const [y, m] = studyMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setStudyMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function nextMonth() {
    const [y, m] = studyMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setStudyMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  // Calendar day selection — if clicking day in different month, navigate month too
  function selectDay(ymd: string) {
    setSelectedDate(ymd);
    const month = ymd.slice(0, 7);
    if (month !== studyMonth) setStudyMonth(month);
  }

  // Course actions
  async function createCourse() {
    if (!courseForm.title.trim()) return;
    await fetch("/api/study-topics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: courseForm.title, color: courseForm.color, total_modules: courseForm.total_modules ? Number(courseForm.total_modules) : null }),
    });
    setCourseForm({ title: "", color: "#3b82f6", total_modules: "" });
    setShowCourseModal(false);
    fetchCourses();
  }

  async function saveEditCourse() {
    if (!editingCourse) return;
    await fetch(`/api/study-topics/${editingCourse.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingCourse.title, color: editingCourse.color, total_modules: editingCourse.total_modules ?? null }),
    });
    setEditingCourse(null);
    fetchCourses();
  }

  async function deleteEditingCourse() {
    if (!editingCourse) return;
    if (!confirm("Remover este curso e todo o histórico?")) return;
    await fetch(`/api/study-topics/${editingCourse.id}`, { method: "DELETE" });
    setEditingCourse(null);
    refreshAll();
  }

  // Session actions
  function openAddSession() {
    const firstCourse = courses[0];
    setSessionForm({ course_id: firstCourse?.id ?? 0, module_label: "", duration_minutes: "", status: selectedDate <= todayYMD ? "done" : "planned" });
    setShowSessionModal(true);
  }

  async function createSession() {
    if (!sessionForm.course_id) return;
    await fetch("/api/study-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: sessionForm.course_id,
        date: selectedDate,
        module_label: sessionForm.module_label.trim() || null,
        duration_minutes: sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : null,
        status: sessionForm.status,
      }),
    });
    setShowSessionModal(false);
    refreshAll();
  }

  async function markAsDone(session: Session) {
    await fetch(`/api/study-sessions/${session.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_label: session.module_label, duration_minutes: session.duration_minutes, status: "done" }),
    });
    refreshAll();
  }

  async function deleteSession(id: number) {
    await fetch(`/api/study-sessions/${id}`, { method: "DELETE" });
    refreshAll();
  }

  // Calendar rendering
  const [sm_y, sm_m] = studyMonth.split("-").map(Number);
  const monthGrid = monthData ? buildMonthGrid(sm_y, sm_m, monthData.daysInMonth) : [];

  function cellColor(ymd: string): string {
    const entry = monthData?.dateMap[ymd];
    if (!entry) return "rgba(255,255,255,0.03)";
    if (entry.done > 0) {
      if (entry.done >= 3) return "rgba(34,197,94,0.85)";
      if (entry.done >= 2) return "rgba(34,197,94,0.6)";
      return "rgba(34,197,94,0.35)";
    }
    return "rgba(99,102,241,0.25)"; // planned only
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="px-3 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Estudos</h1>
            <p className="text-sm text-gray-400">{formatDayLabel(todayYMD)}</p>
          </div>
          <button
            onClick={() => setShowCourseModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> Curso
          </button>
        </div>
      </div>

      <div className="px-3 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5">

        {/* Calendar + Day panel */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4 md:gap-5">

          {/* Calendário */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Calendário</h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
                <span className="text-xs text-gray-300 font-medium min-w-[100px] text-center">{MONTHS_FULL[sm_m - 1]} {sm_y}</span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS_SHORT.map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-gray-600 pb-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthGrid.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} className="h-9" />;
                  const key = `${studyMonth}-${String(day).padStart(2,"0")}`;
                  const isSelected = key === selectedDate;
                  const isToday = key === todayYMD;
                  const entry = monthData?.dateMap[key];
                  return (
                    <button
                      key={day}
                      onClick={() => selectDay(key)}
                      className="h-9 rounded-lg flex flex-col items-center justify-center transition-all relative"
                      style={{
                        backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : cellColor(key),
                        outline: isSelected ? "2px solid rgba(255,255,255,0.7)" : isToday ? "1px solid rgba(255,255,255,0.3)" : "none",
                        outlineOffset: "1px",
                      }}
                    >
                      <span className={`text-[11px] font-medium leading-none ${isSelected ? "text-white" : isToday ? "text-white/90" : entry?.done ? "text-white" : "text-gray-500"}`}>
                        {day}
                      </span>
                      {(entry?.done || entry?.planned) ? (
                        <span className={`text-[8px] leading-none mt-0.5 ${entry.done ? "text-green-300/70" : "text-indigo-300/70"}`}>
                          {entry.done > 0 ? `${entry.done}✓` : `${entry.planned}◷`}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(34,197,94,0.5)" }} />
                  <span className="text-[10px] text-gray-500">Estudou</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(99,102,241,0.3)" }} />
                  <span className="text-[10px] text-gray-500">Planejado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Painel do dia */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-white">{formatDayLabel(selectedDate)}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDate === todayYMD ? "Hoje" : selectedDate > todayYMD ? "Futuro" : "Passado"}
                  {daySessions.length > 0 && ` · ${daySessions.length} sessão${daySessions.length !== 1 ? "ões" : ""}`}
                </p>
              </div>
              {courses.length > 0 && (
                <button
                  onClick={openAddSession}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} /> Sessão
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {daySessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-gray-600">Nenhuma sessão neste dia</p>
                  {courses.length > 0 ? (
                    <button onClick={openAddSession} className="mt-2 text-xs text-blue-400 hover:text-blue-300">+ Adicionar sessão</button>
                  ) : (
                    <button onClick={() => setShowCourseModal(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">Crie um curso primeiro</button>
                  )}
                </div>
              ) : (
                daySessions.map(session => (
                  <div key={session.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 group">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: session.course_color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-200">{session.course_title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${session.status === "done" ? "bg-green-500/15 text-green-400" : "bg-indigo-500/15 text-indigo-400"}`}>
                          {session.status === "done" ? "✓ feita" : "◷ planejado"}
                        </span>
                      </div>
                      {session.module_label && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{session.module_label}</p>
                      )}
                      {session.duration_minutes && (
                        <p className="text-xs text-gray-600 mt-0.5">{session.duration_minutes} min</p>
                      )}
                      {session.status === "planned" && (
                        <button
                          onClick={() => markAsDone(session)}
                          className="mt-1.5 flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                        >
                          <Check size={11} /> Marcar como feita
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cursos */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Cursos</h2>
            <span className="text-xs text-gray-600">{courses.length} curso{courses.length !== 1 ? "s" : ""}</span>
          </div>
          {courses.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">Nenhum curso cadastrado</p>
          ) : (
            <div className="p-4 space-y-3">
              {courses.map(course => {
                const total = course.total_modules;
                const done = course.done_count;
                const pct = total && total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null;
                return (
                  <div key={course.id} className="flex items-center gap-3 group">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                    <span className="text-sm text-gray-200 w-28 md:w-40 truncate flex-shrink-0">{course.title}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      {pct !== null && (
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: course.color }} />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 w-20 text-right">
                      {pct !== null ? `${done}/${total} (${pct}%)` : `${done} sessões`}
                    </span>
                    <button
                      onClick={() => setEditingCourse({ ...course })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-gray-300 transition-all"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Curso */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-semibold">Novo Curso</p>
              <button onClick={() => setShowCourseModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                <input autoFocus type="text" value={courseForm.title}
                  onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && createCourse()}
                  placeholder="Ex: Meta Ads Avançado, Python..."
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Total de módulos <span className="text-gray-600">(opcional)</span></label>
                <input type="number" value={courseForm.total_modules} min="1"
                  onChange={e => setCourseForm(f => ({ ...f, total_modules: e.target.value }))}
                  placeholder="Ex: 12"
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                <p className="text-[11px] text-gray-600 mt-1">Se preenchido, mostra barra de progresso X/Y módulos</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setCourseForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ backgroundColor: c, outline: courseForm.color === c ? "2px solid white" : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCourseModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
                <button onClick={createCourse} disabled={!courseForm.title.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Curso */}
      {editingCourse && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-semibold">Editar Curso</p>
              <button onClick={() => setEditingCourse(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                <input autoFocus type="text" value={editingCourse.title}
                  onChange={e => setEditingCourse(c => c ? { ...c, title: e.target.value } : c)}
                  onKeyDown={e => e.key === "Enter" && saveEditCourse()}
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Total de módulos <span className="text-gray-600">(opcional)</span></label>
                <input type="number" min="1"
                  value={editingCourse.total_modules ?? ""}
                  onChange={e => setEditingCourse(c => c ? { ...c, total_modules: e.target.value ? Number(e.target.value) : null } : c)}
                  placeholder="Ex: 12"
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditingCourse(ec => ec ? { ...ec, color: c } : ec)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ backgroundColor: c, outline: editingCourse.color === c ? "2px solid white" : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={deleteEditingCourse} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                  <Trash2 size={14} className="inline mr-1.5" />Excluir
                </button>
                <div className="flex-1" />
                <button onClick={() => setEditingCourse(null)} className="px-4 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
                <button onClick={saveEditCourse} disabled={!editingCourse.title.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Sessão */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <p className="text-white font-semibold">Sessão — {formatDayLabel(selectedDate)}</p>
              <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Curso</label>
                <select
                  value={sessionForm.course_id}
                  onChange={e => setSessionForm(f => ({ ...f, course_id: Number(e.target.value) }))}
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Módulo / Aula <span className="text-gray-600">(opcional)</span></label>
                <input type="text" value={sessionForm.module_label}
                  onChange={e => setSessionForm(f => ({ ...f, module_label: e.target.value }))}
                  placeholder="Ex: Módulo 3 — Públicos Personalizados"
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duração (minutos) <span className="text-gray-600">(opcional)</span></label>
                <input type="number" value={sessionForm.duration_minutes} min="1"
                  onChange={e => setSessionForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  placeholder="Ex: 45"
                  className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Status</label>
                <div className="flex gap-2">
                  {(["done", "planned"] as const).map(s => (
                    <button key={s} onClick={() => setSessionForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                        sessionForm.status === s
                          ? s === "done" ? "bg-green-500/15 border-green-500/40 text-green-400" : "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                          : "bg-transparent border-white/10 text-gray-500"
                      }`}
                    >
                      {s === "done" ? "✓ Feita" : "◷ Planejada"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowSessionModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button>
                <button onClick={createSession} disabled={!sessionForm.course_id} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
