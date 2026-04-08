"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

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
};

type Task = {
  id: number;
  client_id: number;
  title: string;
  type: string;
  completed: number;
  archived: number;
  created_at: string;
};

type Comment = {
  id: number;
  client_id: number;
  content: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-500/20 text-green-400 border border-green-500/30",
  pausado: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  churn: "bg-red-500/20 text-red-400 border border-red-500/30",
};

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newTask, setNewTask] = useState({ title: "", type: "diaria" });
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  async function fetchAll() {
    setLoading(true);
    const [clientRes, tasksRes, commentsRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/tasks?client_id=${id}`),
      fetch(`/api/comments?client_id=${id}`),
    ]);
    const clientData = await clientRes.json();
    if (clientRes.status === 404) {
      router.push("/");
      return;
    }
    setClient(clientData);
    setTasks(await tasksRes.json());
    setComments(await commentsRes.json());
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, ...newTask }),
    });
    setNewTask({ title: "", type: "diaria" });
    fetchAll();
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: t.completed ? 0 : 1 } : t))
    );
  }

  async function deleteTask(taskId: number) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, content: newComment }),
    });
    setNewComment("");
    fetchAll();
  }

  async function deleteComment(commentId: number) {
    await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const priorityTasks = tasks.filter((t) => t.type === "prioritaria" && !t.archived);
  const archivedTasks = tasks.filter((t) => t.type === "prioritaria" && t.archived);
  const dailyTasks = tasks.filter((t) => t.type === "diaria");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <RefreshCw size={20} className="text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors w-fit"
          >
            <ArrowLeft size={15} /> Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{client.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_COLORS[client.status] || ""
                }`}
              >
                {client.status}
              </span>
            </div>
            <div className="flex gap-3 text-sm text-gray-400">
              {client.meta_link && (
                <a
                  href={client.meta_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  Meta Ads <ExternalLink size={13} />
                </a>
              )}
              {client.google_link && (
                <a
                  href={client.google_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                >
                  Google Ads <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-6 mt-2 text-sm text-gray-500">
            {client.niche && <span>Nicho: {client.niche}</span>}
            {client.platform && <span>Plataforma: {client.platform}</span>}
            {client.monthly_budget > 0 && (
              <span>
                Budget: R$ {client.monthly_budget.toLocaleString("pt-BR")}
                /mês
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 gap-6">
        {/* Tarefas */}
        <div className="space-y-5">
          {/* Prioritárias */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-red-400" />
              <h2 className="font-semibold text-white text-sm">
                Demandas Prioritárias
              </h2>
              <span className="ml-auto text-xs text-gray-500">
                {priorityTasks.filter((t) => !t.completed).length} pendentes
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {priorityTasks.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-3">
                  Nenhuma demanda prioritária
                </p>
              )}
              {priorityTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 group"
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.completed
                        ? "bg-red-500 border-red-500"
                        : "border-red-500/50 hover:border-red-400"
                    }`}
                  >
                    {task.completed ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      task.completed ? "line-through text-gray-600" : "text-gray-200"
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Arquivadas */}
          {archivedTasks.length > 0 && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 opacity-60">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-gray-500 text-sm">Arquivadas</h2>
                <span className="text-xs text-gray-600">{archivedTasks.length}</span>
              </div>
              <div className="space-y-2">
                {archivedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 group">
                    <div className="w-4 h-4 rounded border border-gray-600 bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm flex-1 line-through text-gray-600">{task.title}</span>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diárias */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw size={16} className="text-blue-400" />
              <h2 className="font-semibold text-white text-sm">
                Demandas Diárias
              </h2>
              <span className="ml-auto text-xs text-gray-500">
                {dailyTasks.filter((t) => !t.completed).length} pendentes
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {dailyTasks.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-3">
                  Nenhuma demanda diária
                </p>
              )}
              {dailyTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 group">
                  <button
                    onClick={() => toggleTask(task)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.completed
                        ? "bg-blue-500 border-blue-500"
                        : "border-blue-500/50 hover:border-blue-400"
                    }`}
                  >
                    {task.completed ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                  <span
                    className={`text-sm flex-1 ${
                      task.completed ? "line-through text-gray-600" : "text-gray-200"
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Task */}
          <form
            onSubmit={addTask}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4"
          >
            <p className="text-xs text-gray-400 mb-3 font-medium">
              Nova Demanda
            </p>
            <div className="flex gap-2 mb-2">
              <input
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Descreva a demanda..."
                className="flex-1 bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newTask.type}
                onChange={(e) =>
                  setNewTask({ ...newTask, type: e.target.value })
                }
                className="bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="diaria">Diária</option>
                <option value="prioritaria">Prioritária</option>
              </select>
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </form>
        </div>

        {/* Comentários / Histórico */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white text-sm">
              Histórico & Comentários
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {comments.length} anotações
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[500px]">
            {comments.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-8">
                Nenhuma anotação ainda
              </p>
            )}
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-[#252525] border border-white/5 rounded-lg p-3 group"
              >
                <p className="text-sm text-gray-200 whitespace-pre-wrap">
                  {c.content}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">
                    {formatDate(c.created_at)}
                  </span>
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={addComment}
            className="p-4 border-t border-white/10"
          >
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addComment(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Escreva uma anotação... (Enter para enviar)"
                rows={2}
                className="flex-1 bg-[#252525] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none"
              />
              <button
                type="submit"
                className="self-end p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
