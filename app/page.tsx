"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import CalendarModal from "./components/CalendarModal";
import {
  Plus, ExternalLink, Trash2, X, Check,
  ChevronDown, ChevronUp, Pencil, Send,
} from "lucide-react";

type DailyTask = { id: number; title: string; completed: number };
type PriorityTask = { id: number; title: string };

type Client = {
  id: number;
  name: string;
  niche: string;
  platform: string;
  monthly_budget: number;
  status: string;
  meta_link: string;
  google_link: string;
  created_at: string;
  last_comment: string | null;
  last_comment_at: string | null;
  daily_tasks: DailyTask[];
  priority_tasks: PriorityTask[];
};

type Task = {
  id: number;
  client_id: number;
  title: string;
  type: string;
  completed: number;
  archived: number;
};

function commentAgeDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-500/20 text-green-400 border border-green-500/30",
  pausado: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  churn: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const PLATFORM_COLORS: Record<string, string> = {
  Meta: "bg-blue-500/20 text-blue-400",
  Google: "bg-orange-500/20 text-orange-400",
  Ambos: "bg-purple-500/20 text-purple-400",
};

const emptyForm = {
  name: "", niche: "", platform: "Meta",
  monthly_budget: "", status: "ativo", meta_link: "", google_link: "",
};

// Campo editável: só abre no clique do lápis
function InlineField({
  value, onSave, type = "text", placeholder = "", display,
}: {
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
  display?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="bg-[#252525] border border-blue-500 rounded px-2 py-0.5 text-sm text-white outline-none w-full min-w-[80px]"
      />
    );
  }

  return (
    <span className="flex items-center gap-1 group/f">
      <span className="truncate">{display ?? (value || <span className="text-gray-600">{placeholder}</span>)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
        className="opacity-0 group-hover/f:opacity-100 text-gray-500 hover:text-white flex-shrink-0 transition-opacity"
      >
        <Pencil size={11} />
      </button>
    </span>
  );
}

// Select editável: só abre no clique do lápis
function InlineSelect({
  value, options, onSave, display,
}: {
  value: string;
  options: { label: string; value: string }[];
  onSave: (v: string) => void;
  display?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        className="bg-[#252525] border border-blue-500 rounded px-2 py-0.5 text-xs text-white outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <span className="flex items-center gap-1 group/f">
      {display ?? <span>{options.find((o) => o.value === value)?.label || value}</span>}
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="opacity-0 group-hover/f:opacity-100 text-gray-500 hover:text-white flex-shrink-0 transition-opacity"
      >
        <Pencil size={11} />
      </button>
    </span>
  );
}

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [clientTasks, setClientTasks] = useState<Record<number, Task[]>>({});
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState("diaria");
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [addingPriorityId, setAddingPriorityId] = useState<number | null>(null);
  const [newPriorityTitle, setNewPriorityTitle] = useState<Record<number, string>>({});
  const [clientComments, setClientComments] = useState<Record<number, { id: number; content: string; created_at: string }[]>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<"name" | "monthly_budget" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterPending, setFilterPending] = useState(false);
  const [todayEventsCount, setTodayEventsCount] = useState(0);

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    fetch(`/api/events?month=${month}`).then(r => r.json()).then((evs: any[]) => {
      setTodayEventsCount(evs.filter(e => e.date === todayYMD).length);
    });
  }, []);

  async function fetchClients() {
    const res = await fetch("/api/clients");
    setClients(await res.json());
  }

  async function fetchTasks(clientId: number) {
    const res = await fetch(`/api/tasks?client_id=${clientId}`);
    const tasks = await res.json();
    setClientTasks((prev) => ({ ...prev, [clientId]: tasks }));
  }

  async function fetchComments(clientId: number) {
    const res = await fetch(`/api/comments?client_id=${clientId}`);
    const comments = await res.json();
    setClientComments((prev) => ({ ...prev, [clientId]: comments }));
  }

  function toggleExpand(clientId: number) {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      fetchTasks(clientId);
      fetchComments(clientId);
    }
  }

  async function updateClient(id: number, field: string, value: string | number) {
    const client = clients.find((c) => c.id === id)!;
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...client, [field]: value }),
    });
    fetchClients();
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monthly_budget: parseFloat(form.monthly_budget) || 0 }),
    });
    const newClient = await res.json();
    // Auto-add default daily task
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: newClient.id, title: "Revisar grupo do cliente", type: "diaria" }),
    });
    setShowModal(false);
    setForm(emptyForm);
    fetchClients();
  }

  async function handleDeleteClient(id: number) {
    if (!confirm("Remover este cliente e todos os seus dados?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (expandedId === id) setExpandedId(null);
    fetchClients();
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    setClientTasks((prev) => ({
      ...prev,
      [task.client_id]: prev[task.client_id].map((t) =>
        t.id === task.id ? { ...t, completed: t.completed ? 0 : 1 } : t
      ),
    }));
    fetchClients();
  }

  // Arquiva tarefa prioritária direto na linha (check = done para sempre)
  async function archivePriorityTaskInRow(clientId: number, taskId: number) {
    // Optimistic: remove da lista de prioritárias
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, priority_tasks: c.priority_tasks.filter((t) => t.id !== taskId) }
          : c
      )
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
  }

  // Adiciona tarefa prioritária direto na linha
  async function addPriorityTaskInRow(clientId: number) {
    const title = newPriorityTitle[clientId]?.trim();
    if (!title) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, title, type: "prioritaria" }),
    });
    const saved = await res.json();
    setNewPriorityTitle((prev) => ({ ...prev, [clientId]: "" }));
    setAddingPriorityId(null);
    // Optimistic: adiciona à lista local
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, priority_tasks: [...c.priority_tasks, { id: saved.id, title: saved.title }] }
          : c
      )
    );
  }

  // Toggle de tarefa diária direto na linha (sem expandir)
  async function toggleDailyTaskInRow(clientId: number, taskId: number, currentCompleted: number) {
    const newCompleted = currentCompleted ? 0 : 1;
    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, daily_tasks: c.daily_tasks.map((t) => t.id === taskId ? { ...t, completed: newCompleted } : t) }
          : c
      )
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newCompleted }),
    });
  }

  async function addTask(clientId: number) {
    if (!newTaskTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, title: newTaskTitle, type: newTaskType }),
    });
    setNewTaskTitle("");
    fetchTasks(clientId);
    fetchClients();
  }

  async function deleteTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setClientTasks((prev) => ({
      ...prev,
      [task.client_id]: prev[task.client_id].filter((t) => t.id !== task.id),
    }));
    fetchClients();
  }

  async function addComment(clientId: number) {
    const content = newComment[clientId]?.trim();
    if (!content) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, content }),
    });
    const saved = await res.json();
    setNewComment((prev) => ({ ...prev, [clientId]: "" }));
    // Adiciona ao histórico local sem recarregar tudo
    setClientComments((prev) => ({
      ...prev,
      [clientId]: [saved, ...(prev[clientId] || [])],
    }));
    fetchClients(); // atualiza preview na tabela
  }

  async function deleteComment(clientId: number, commentId: number) {
    await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    setClientComments((prev) => ({
      ...prev,
      [clientId]: (prev[clientId] || []).filter((c) => c.id !== commentId),
    }));
    fetchClients();
  }

  function toggleSort(field: "name" | "monthly_budget" | "status") {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: "name" | "monthly_budget" | "status" }) {
    if (sortField !== field) return <span className="text-gray-700 ml-0.5">↕</span>;
    return <span className="text-blue-400 ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  let filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.niche || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    const matchPending = !filterPending || c.daily_tasks.some(t => !t.completed);
    return matchSearch && matchStatus && matchPending;
  });

  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      const av = sortField === "monthly_budget" ? (a.monthly_budget || 0) : (a[sortField] || "").toString().toLowerCase();
      const bv = sortField === "monthly_budget" ? (b.monthly_budget || 0) : (b[sortField] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function generateReport() {
    const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const ativos = clients.filter((c) => c.status === "ativo");
    const pausados = clients.filter((c) => c.status === "pausado");
    const churns = clients.filter((c) => c.status === "churn");

    const formatClient = (c: Client) => {
      const age = commentAgeDays(c.last_comment_at);
      const staleWarning = (age === null || age > 7) ? " ⚠ Sem anotação recente" : "";
      const comment = c.last_comment
        ? `${c.last_comment}${c.last_comment_at ? ` (${new Date(c.last_comment_at).toLocaleDateString("pt-BR")})` : ""}${staleWarning}`
        : "Sem anotações recentes. ⚠";
      return `• ${c.name}${c.niche ? ` [${c.niche}]` : ""}\n  ${comment}`;
    };

    let text = `RELATÓRIO DE CLIENTES — ${today}\n`;
    text += `${"─".repeat(45)}\n\n`;

    if (ativos.length > 0) {
      text += `✅ ATIVOS (${ativos.length})\n\n`;
      text += ativos.map(formatClient).join("\n\n");
      text += "\n\n";
    }
    if (pausados.length > 0) {
      text += `⏸ PAUSADOS (${pausados.length})\n\n`;
      text += pausados.map(formatClient).join("\n\n");
      text += "\n\n";
    }
    if (churns.length > 0) {
      text += `❌ CHURN (${churns.length})\n\n`;
      text += churns.map(formatClient).join("\n\n");
      text += "\n";
    }

    setReportText(text.trim());
    setShowReport(true);
    setCopied(false);
  }

  const totalAtivos = clients.filter((c) => c.status === "ativo").length;
  const totalBudget = clients.filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + (c.monthly_budget || 0), 0);
  const totalDailyTasks = clients.reduce((s, c) => s + c.daily_tasks.length, 0);
  const completedDailyTasks = clients.reduce((s, c) => s + c.daily_tasks.filter(t => t.completed).length, 0);
  const dailyProgress = totalDailyTasks > 0 ? Math.round((completedDailyTasks / totalDailyTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <style>{`@media print { body > * { display: none !important; } .print-report { display: block !important; position: fixed; top: 0; left: 0; width: 100%; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #000; background: #fff; padding: 24px; } }`}</style>
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Gestão de Clientes</h1>
            <p className="text-sm text-gray-400">Tráfego Pago</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendar(true)}
              className="relative flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Calendário
              {todayEventsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {todayEventsCount}
                </span>
              )}
            </button>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Gerar Relatório
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Novo Cliente
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Total de Clientes</p>
            <p className="text-2xl font-bold text-white">{clients.length}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Clientes Ativos</p>
            <p className="text-2xl font-bold text-green-400">{totalAtivos}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Budget Total (ativos)</p>
            <p className="text-2xl font-bold text-white">
              R$ {totalBudget.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Diárias de hoje</p>
            <p className="text-2xl font-bold text-white">{completedDailyTasks}<span className="text-sm text-gray-500">/{totalDailyTasks}</span></p>
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${dailyProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            type="text"
            placeholder="Buscar cliente ou nicho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="churn">Churn</option>
          </select>
          <button
            onClick={() => setFilterPending(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterPending ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            Só pendentes hoje
          </button>
        </div>

        {/* Header columns */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-[20px_160px_90px_78px_96px_78px_1fr_1fr_130px_52px] gap-3 px-4 pb-1 text-xs text-gray-500 uppercase tracking-wide">
            <div />
            <button onClick={() => toggleSort("name")} className="flex items-center text-left hover:text-gray-300 transition-colors">
              Cliente <SortIcon field="name" />
            </button>
            <div>Nicho</div>
            <div>Plataforma</div>
            <button onClick={() => toggleSort("monthly_budget")} className="flex items-center text-left hover:text-gray-300 transition-colors">
              Budget <SortIcon field="monthly_budget" />
            </button>
            <button onClick={() => toggleSort("status")} className="flex items-center text-left hover:text-gray-300 transition-colors">
              Status <SortIcon field="status" />
            </button>
            <div>Demandas diárias</div>
            <div>Prioritárias</div>
            <div>Último comentário</div>
            <div />
          </div>
        )}

        {/* Client List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">Nenhum cliente encontrado</p>
            <p className="text-sm">Clique em "Novo Cliente" para adicionar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const isOpen = expandedId === c.id;
              const tasks = clientTasks[c.id] || [];
              const dailyTasks = tasks.filter((t) => t.type === "diaria");
              const priorityTasks = tasks.filter((t) => t.type === "prioritaria" && !t.archived);
              const archivedTasks = tasks.filter((t) => t.type === "prioritaria" && t.archived);

              return (
                <div key={c.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
                  {/* Row */}
                  <div className="grid grid-cols-[20px_160px_90px_78px_96px_78px_1fr_1fr_130px_52px] gap-3 items-center px-4 py-3 group hover:bg-white/[0.02] transition-colors">
                    {/* Expand */}
                    <button
                      onClick={() => toggleExpand(c.id)}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {/* Name — clicável para abrir página do cliente */}
                    <div className="text-sm font-medium overflow-hidden">
                      <InlineField
                        value={c.name}
                        onSave={(v) => updateClient(c.id, "name", v)}
                        display={
                          <span className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                              const age = commentAgeDays(c.last_comment_at);
                              if (age === null || age > 14) return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Sem comentário há 14+ dias" />;
                              if (age > 7) return <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="Sem comentário há 7+ dias" />;
                              return null;
                            })()}
                            <Link href={`/clients/${c.id}`} className="hover:text-blue-400 transition-colors truncate" onClick={(e) => e.stopPropagation()}>
                              {c.name}
                            </Link>
                          </span>
                        }
                      />
                    </div>

                    {/* Niche */}
                    <div className="text-sm text-gray-400 overflow-hidden">
                      <InlineField
                        value={c.niche || ""}
                        onSave={(v) => updateClient(c.id, "niche", v)}
                        placeholder="—"
                      />
                    </div>

                    {/* Platform */}
                    <div className="overflow-hidden">
                      <InlineSelect
                        value={c.platform || "Meta"}
                        options={[
                          { label: "Meta", value: "Meta" },
                          { label: "Google", value: "Google" },
                          { label: "Ambos", value: "Ambos" },
                        ]}
                        onSave={(v) => updateClient(c.id, "platform", v)}
                        display={
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_COLORS[c.platform] || "bg-gray-700 text-gray-300"}`}>
                            {c.platform || "—"}
                          </span>
                        }
                      />
                    </div>

                    {/* Budget */}
                    <div className="text-sm text-gray-300 overflow-hidden">
                      <InlineField
                        value={c.monthly_budget ? c.monthly_budget.toString() : ""}
                        onSave={(v) => updateClient(c.id, "monthly_budget", parseFloat(v) || 0)}
                        type="number"
                        placeholder="—"
                        display={c.monthly_budget ? <span>R$ {c.monthly_budget.toLocaleString("pt-BR")}</span> : <span className="text-gray-600">—</span>}
                      />
                    </div>

                    {/* Status */}
                    <div className="overflow-hidden">
                      <InlineSelect
                        value={c.status}
                        options={[
                          { label: "ativo", value: "ativo" },
                          { label: "pausado", value: "pausado" },
                          { label: "churn", value: "churn" },
                        ]}
                        onSave={(v) => updateClient(c.id, "status", v)}
                        display={
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ""}`}>
                            {c.status}
                          </span>
                        }
                      />
                    </div>

                    {/* Daily tasks — checkboxes inline */}
                    <div className="overflow-hidden">
                      {c.daily_tasks.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {c.daily_tasks.map((t) => (
                            <button
                              key={t.id}
                              onClick={(e) => { e.stopPropagation(); toggleDailyTaskInRow(c.id, t.id, t.completed); }}
                              className="flex items-center gap-1.5 group/dt text-left w-full"
                            >
                              <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${t.completed ? "bg-blue-500 border-blue-500" : "border-blue-500/40 group-hover/dt:border-blue-400"}`}>
                                {t.completed ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg> : null}
                              </span>
                              <span className={`text-xs truncate max-w-[160px] ${t.completed ? "line-through text-gray-600" : "text-gray-300 group-hover/dt:text-white"}`}>
                                {t.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </div>

                    {/* Priority tasks */}
                    <div className="overflow-hidden">
                      {addingPriorityId === c.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={newPriorityTitle[c.id] || ""}
                            onChange={(e) => setNewPriorityTitle((p) => ({ ...p, [c.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { addPriorityTaskInRow(c.id); }
                              if (e.key === "Escape") { setAddingPriorityId(null); }
                            }}
                            placeholder="Demanda prioritária..."
                            className="flex-1 min-w-0 bg-[#111] border border-red-500/50 rounded px-2 py-1 text-xs text-white placeholder-gray-600 outline-none"
                          />
                          <button onClick={() => setAddingPriorityId(null)} className="text-gray-600 hover:text-white flex-shrink-0"><X size={12} /></button>
                          <button onClick={() => addPriorityTaskInRow(c.id)} className="text-red-400 hover:text-red-300 flex-shrink-0"><Check size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 group/pcol">
                          {c.priority_tasks.length > 0 ? (
                            <>
                              {c.priority_tasks.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={(e) => { e.stopPropagation(); archivePriorityTaskInRow(c.id, t.id); }}
                                  className="flex items-center gap-1.5 group/pt text-left w-full"
                                >
                                  <span className="w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors border-red-500/40 group-hover/pt:bg-red-500 group-hover/pt:border-red-500">
                                    <svg className="opacity-0 group-hover/pt:opacity-100" width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                  </span>
                                  <span className="text-xs truncate max-w-[140px] text-gray-300 group-hover/pt:text-white">{t.title}</span>
                                </button>
                              ))}
                              <button
                                onClick={(e) => { e.stopPropagation(); setAddingPriorityId(c.id); }}
                                className="opacity-0 group-hover/pcol:opacity-100 flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-all mt-0.5 w-fit"
                              >
                                <Plus size={11} /> adicionar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddingPriorityId(c.id); }}
                              className="opacity-0 group-hover/pcol:opacity-100 flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-all w-fit"
                            >
                              <Plus size={11} /> adicionar
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Last comment */}
                    <div className="overflow-hidden">
                      {commentingId === c.id ? (
                        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            value={newComment[c.id] || ""}
                            onChange={(e) => setNewComment((p) => ({ ...p, [c.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(c.id); setCommentingId(null); }
                              if (e.key === "Escape") { setCommentingId(null); }
                            }}
                            placeholder="Anotação... (Enter salva, Esc cancela)"
                            rows={3}
                            className="w-full bg-[#111] border border-blue-500/50 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none resize-none"
                          />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setCommentingId(null)} className="p-1 text-gray-600 hover:text-white"><X size={12} /></button>
                            <button onClick={() => { addComment(c.id); setCommentingId(null); }} className="p-1 text-blue-400 hover:text-blue-300"><Check size={12} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 group/comment">
                          <div className="flex-1 min-w-0">
                            {c.last_comment ? (
                              <>
                                <p className="text-xs text-gray-400 break-words line-clamp-2">{c.last_comment}</p>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {new Date(c.last_comment_at!).toLocaleDateString("pt-BR")}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs text-gray-600">—</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCommentingId(c.id); }}
                            className="flex-shrink-0 opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-all mt-0.5"
                            title="Adicionar comentário"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/clients/${c.id}`}
                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        title="Ver página completa"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <button
                        onClick={() => handleDeleteClient(c.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div className="border-t border-white/10 bg-[#161616] px-5 py-4 grid grid-cols-3 gap-6">
                      {/* Client info */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Informações</p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-xs text-gray-600">Meta Ads</span>
                            <div className="text-blue-400 mt-0.5">
                              <InlineField
                                value={c.meta_link || ""}
                                onSave={(v) => updateClient(c.id, "meta_link", v)}
                                placeholder="Adicionar link"
                                display={c.meta_link
                                  ? <a href={c.meta_link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 flex items-center gap-1 text-xs">
                                      Abrir Meta <ExternalLink size={11} />
                                    </a>
                                  : <span className="text-xs text-gray-600">Sem link</span>
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Google Ads</span>
                            <div className="text-orange-400 mt-0.5">
                              <InlineField
                                value={c.google_link || ""}
                                onSave={(v) => updateClient(c.id, "google_link", v)}
                                placeholder="Adicionar link"
                                display={c.google_link
                                  ? <a href={c.google_link} target="_blank" rel="noopener noreferrer" className="hover:text-orange-300 flex items-center gap-1 text-xs">
                                      Abrir Google <ExternalLink size={11} />
                                    </a>
                                  : <span className="text-xs text-gray-600">Sem link</span>
                                }
                              />
                            </div>
                          </div>
                          <Link href={`/clients/${c.id}`}
                            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors mt-2 w-fit">
                            Ver histórico completo <ExternalLink size={11} />
                          </Link>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Demandas</p>

                        {priorityTasks.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-red-400 mb-1.5">Prioritárias</p>
                            <div className="space-y-1.5">
                              {priorityTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 group/task">
                                  <button onClick={() => toggleTask(task)}
                                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${task.completed ? "bg-red-500 border-red-500" : "border-red-500/50 hover:border-red-400"}`}>
                                    {task.completed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                                  </button>
                                  <span className={`text-xs flex-1 ${task.completed ? "line-through text-gray-600" : "text-gray-300"}`}>{task.title}</span>
                                  <button onClick={() => deleteTask(task)} className="opacity-0 group-hover/task:opacity-100 text-gray-600 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dailyTasks.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-blue-400 mb-1.5">Diárias</p>
                            <div className="space-y-1.5">
                              {dailyTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 group/task">
                                  <button onClick={() => toggleTask(task)}
                                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${task.completed ? "bg-blue-500 border-blue-500" : "border-blue-500/50 hover:border-blue-400"}`}>
                                    {task.completed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                                  </button>
                                  <span className={`text-xs flex-1 ${task.completed ? "line-through text-gray-600" : "text-gray-300"}`}>{task.title}</span>
                                  <button onClick={() => deleteTask(task)} className="opacity-0 group-hover/task:opacity-100 text-gray-600 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {priorityTasks.length === 0 && dailyTasks.length === 0 && archivedTasks.length === 0 && (
                          <p className="text-xs text-gray-600 mb-3">Nenhuma demanda</p>
                        )}

                        {archivedTasks.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-600 mb-1.5">Arquivadas</p>
                            <div className="space-y-1">
                              {archivedTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 group/task opacity-50">
                                  <div className="w-4 h-4 rounded border border-gray-600 bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                  </div>
                                  <span className="text-xs flex-1 line-through text-gray-600">{task.title}</span>
                                  <button onClick={() => deleteTask(task)} className="opacity-0 group-hover/task:opacity-100 text-gray-700 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-1">
                          <input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addTask(c.id); }}
                            placeholder="Nova demanda..."
                            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500"
                          />
                          <select
                            value={newTaskType}
                            onChange={(e) => setNewTaskType(e.target.value)}
                            className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="diaria">Diária</option>
                            <option value="prioritaria">Prioritária</option>
                          </select>
                          <button onClick={() => addTask(c.id)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Comments history + add */}
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Histórico de Comentários</p>

                        {/* Add new */}
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={newComment[c.id] || ""}
                            onChange={(e) => setNewComment((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(c.id); } }}
                            placeholder="Nova anotação... (Enter para salvar)"
                            rows={2}
                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none"
                          />
                          <button
                            onClick={() => addComment(c.id)}
                            className="self-end flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Send size={12} /> Salvar
                          </button>
                        </div>

                        {/* History list */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(clientComments[c.id] || []).length === 0 && (
                            <p className="text-xs text-gray-600 text-center py-2">Nenhuma anotação ainda</p>
                          )}
                          {(clientComments[c.id] || []).map((cm) => (
                            <div key={cm.id} className="bg-[#111] border border-white/5 rounded-lg p-2.5 group/cm">
                              <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{cm.content}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-gray-600">
                                  {new Date(cm.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <button
                                  onClick={() => deleteComment(c.id, cm.id)}
                                  className="opacity-0 group-hover/cm:opacity-100 text-gray-700 hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarModal
          onClose={() => setShowCalendar(false)}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Relatório Geral</h2>
                <p className="text-xs text-gray-500 mt-0.5">Última situação de cada cliente</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reportText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                >
                  {copied ? <><Check size={14} /> Copiado!</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar tudo</>}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Exportar PDF
                </button>
                <button onClick={() => setShowReport(false)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={reportText}
              className="flex-1 min-h-[60vh] bg-transparent px-6 py-4 text-sm text-gray-300 font-mono resize-none outline-none overflow-y-auto leading-relaxed"
            />
            <div className="print-report hidden">{reportText}</div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Novo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nicho</label>
                  <input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="Ex: Estética, Clínica..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Plataforma</label>
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                    <option value="Meta">Meta</option>
                    <option value="Google">Google</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Budget Mensal (R$)</label>
                  <input type="number" value={form.monthly_budget} onChange={(e) => setForm({ ...form, monthly_budget: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="churn">Churn</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Link do Meta Ads</label>
                  <input value={form.meta_link} onChange={(e) => setForm({ ...form, meta_link: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="https://..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Link do Google Ads</label>
                  <input value={form.google_link} onChange={(e) => setForm({ ...form, google_link: e.target.value })}
                    className="w-full bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white rounded-lg py-2 text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Check size={15} /> Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
