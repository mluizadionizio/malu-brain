"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DOW_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type CalEvent = {
  id: number;
  title: string;
  date: string;
  time: string | null;
  client_name: string | null;
};

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(): Date[] {
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function WeeklyCalendarWidget() {
  const router = useRouter();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const todayYMD = toYMD(new Date());
  const days = getWeekDays();

  useEffect(() => {
    const months = [...new Set(days.map(d =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    ))];
    Promise.all(months.map(m =>
      fetch(`/api/events?month=${m}`).then(r => r.json())
    )).then(results => {
      const all: CalEvent[] = results.flat();
      const weekStart = toYMD(days[0]);
      const weekEnd = toYMD(days[6]);
      setEvents(all.filter(e => e.date >= weekStart && e.date <= weekEnd));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventsByDate: Record<string, CalEvent[]> = {};
  for (const e of events) {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  }

  return (
    <div
      className="grid grid-cols-7 gap-1 cursor-pointer"
      onClick={() => router.push("/calendario")}
      title="Abrir calendário completo"
    >
      {days.map(day => {
        const dateStr = toYMD(day);
        const isToday = dateStr === todayYMD;
        const dayEvents = eventsByDate[dateStr] ?? [];

        return (
          <div
            key={dateStr}
            className={`rounded-lg p-1.5 min-h-[72px] transition-all ${
              isToday
                ? "bg-blue-500/15 border border-blue-500/30"
                : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
            }`}
          >
            {/* Day header */}
            <div className="text-center">
              <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                {DOW_SHORT[day.getDay()]}
              </div>
              <div className={`text-sm font-bold leading-tight ${isToday ? "text-blue-400" : "text-gray-300"}`}>
                {day.getDate()}
              </div>
            </div>

            {/* Events */}
            <div className="mt-1 space-y-0.5">
              {dayEvents.slice(0, 2).map(e => (
                <div
                  key={e.id}
                  className="text-[9px] leading-tight text-gray-400 bg-white/[0.06] rounded px-1 py-0.5 truncate"
                  title={e.title}
                >
                  {e.time ? `${e.time.slice(0, 5)} ` : ""}
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-[9px] text-blue-400/70 px-1">
                  +{dayEvents.length - 2} mais
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
