"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, Sun, BookOpen, ChevronRight } from "lucide-react";

const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SectionHeader({ icon, title, href, sub }: { icon: React.ReactNode; title: string; href: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {sub && <span className="text-xs text-gray-600">{sub}</span>}
      </div>
      <Link href={href} className="flex items-center gap-0.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
        Ver tudo <ChevronRight size={12} />
      </Link>
    </div>
  );
}

function Card({ label, value, sub, color = "text-white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`text-lg md:text-xl font-bold ${color} leading-tight`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const today = toYMD(now);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2,"0")}`;
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} de ${MONTHS_FULL[month - 1]}`;

  // Finance
  const [finance, setFinance] = useState<any[]>([]);
  // Clients
  const [clients, setClients] = useState<any[]>([]);
  // Todos
  const [todos, setTodos] = useState<any[]>([]);
  // Habits
  const [habits, setHabits] = useState<{ id: number; title: string; color: string; completed_today: number }[]>([]);
  // Studies
  const [studyMap, setStudyMap] = useState<Record<string, { done: number; planned: number }>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/finance?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/clients`).then(r => r.json()),
      fetch(`/api/todos?date=${today}`).then(r => r.json()),
      fetch(`/api/habit-logs?date=${today}`).then(r => r.json()),
      fetch(`/api/study-sessions?month=${monthStr}`).then(r => r.json()),
    ]).then(([fin, cli, tod, hab, stu]) => {
      setFinance(fin ?? []);
      setClients(cli ?? []);
      setTodos(tod ?? []);
      setHabits(hab ?? []);
      setStudyMap((stu as any)?.dateMap ?? {});
      setLoading(false);
    });
  }, []);

  // Finance metrics
  const totalEntrada = finance.reduce((s, e) => s + (Number(e.entrada) || 0), 0);
  const totalSaida = finance.reduce((s, e) => s + (Number(e.saida) || 0) + (Number(e.diario) || 0), 0);
  const saldo = totalEntrada - totalSaida;
  const diasPreenchidos = finance.filter(e => (e.entrada || 0) + (e.saida || 0) + (e.diario || 0) > 0).length;

  // Client metrics
  const ativos = clients.filter(c => c.status === 'ativo');
  const totalBudget = ativos.reduce((s, c) => s + (Number(c.monthly_budget) || 0), 0);
  const tarefasPendentes = clients.reduce((s, c) => s + (c.daily_tasks || []).filter((t: any) => !t.completed).length, 0);
  const statusCounts = { ativo: 0, pausado: 0, churn: 0, arquivado: 0 } as Record<string, number>;
  for (const c of clients) statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;

  // Todos metrics
  const todosTotal = todos.length;
  const todosDone = todos.filter((t: any) => t.completed).length;
  const todosPct = todosTotal > 0 ? Math.round((todosDone / todosTotal) * 100) : 0;

  // Habits metrics
  const habitsTotal = habits.length;
  const habitsDone = habits.filter(h => h.completed_today).length;
  const habitsPct = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;

  // Study metrics
  const sessionsDone = Object.values(studyMap).reduce((s, d) => s + (d.done || 0), 0);
  const daysStudied = Object.values(studyMap).filter(d => d.done > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-gray-600 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#161616]">
        <div className="px-3 md:px-6 py-5">
          <h1 className="text-xl font-bold text-white">{greeting}! 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
      </div>

      <div className="px-3 md:px-6 py-4 md:py-5 space-y-6">

        {/* Finanças */}
        <div>
          <SectionHeader
            icon={<DollarSign size={15} />}
            title="Finanças"
            href="/financas"
            sub={`— ${MONTHS_FULL[month - 1]}`}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Entradas" value={fmtBRL(totalEntrada)} color="text-green-400" />
            <Card label="Saídas" value={fmtBRL(totalSaida)} color="text-red-400" />
            <Card
              label="Saldo Líquido"
              value={fmtBRL(saldo)}
              color={saldo >= 0 ? "text-green-400" : "text-red-400"}
            />
            <Card label="Dias preenchidos" value={diasPreenchidos} sub={`de ${new Date(year, month, 0).getDate()} dias`} />
          </div>
        </div>

        {/* Tráfego */}
        <div>
          <SectionHeader
            icon={<TrendingUp size={15} />}
            title="Tráfego Pago"
            href="/trafego"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Clientes Ativos" value={ativos.length} sub={`de ${clients.length} total`} />
            <Card label="Orçamento Total" value={fmtBRL(totalBudget)} sub="clientes ativos" color="text-blue-400" />
            <Card label="Tarefas Pendentes" value={tarefasPendentes} color={tarefasPendentes > 0 ? "text-yellow-400" : "text-green-400"} />
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-500 text-xs mb-2">Por status</p>
              <div className="space-y-1">
                {[
                  { key: "ativo", label: "Ativo", color: "bg-green-500" },
                  { key: "pausado", label: "Pausado", color: "bg-yellow-500" },
                  { key: "churn", label: "Churn", color: "bg-red-500" },
                  { key: "arquivado", label: "Arquivado", color: "bg-gray-500" },
                ].filter(s => statusCounts[s.key] > 0).map(s => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                    <span className="text-xs text-gray-400 flex-1">{s.label}</span>
                    <span className="text-xs text-gray-300 font-medium">{statusCounts[s.key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meu Dia */}
        <div>
          <SectionHeader
            icon={<Sun size={15} />}
            title="Meu Dia"
            href="/meu-dia"
            sub="— Hoje"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-500 text-xs mb-1">To-Dos hoje</p>
              <p className="text-lg md:text-xl font-bold text-white leading-tight">
                {todosDone}<span className="text-gray-600 text-base font-normal">/{todosTotal}</span>
              </p>
              {todosTotal > 0 && (
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${todosPct}%` }} />
                </div>
              )}
              {todosTotal === 0 && <p className="text-xs text-gray-600 mt-0.5">Nenhuma tarefa</p>}
            </div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 md:p-4">
              <p className="text-gray-500 text-xs mb-1">Hábitos hoje</p>
              <p className="text-lg md:text-xl font-bold text-white leading-tight">
                {habitsDone}<span className="text-gray-600 text-base font-normal">/{habitsTotal}</span>
              </p>
              {habitsTotal > 0 && (
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${habitsPct}%` }} />
                </div>
              )}
              {habitsTotal === 0 && <p className="text-xs text-gray-600 mt-0.5">Nenhum hábito</p>}
            </div>
          </div>
        </div>

        {/* Estudos */}
        <div>
          <SectionHeader
            icon={<BookOpen size={15} />}
            title="Estudos"
            href="/estudos"
            sub={`— ${MONTHS_FULL[month - 1]}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <Card label="Sessões feitas" value={sessionsDone} sub={`em ${MONTHS_PT[month - 1]}`} color="text-blue-400" />
            <Card label="Dias estudados" value={daysStudied} sub={`de ${new Date(year, month, 0).getDate()} dias`} />
          </div>
        </div>

      </div>
    </div>
  );
}
