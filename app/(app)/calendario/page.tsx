"use client";

import { useEffect, useState } from "react";
import CalendarModal from "../../components/CalendarModal";

type Client = { id: number; name: string };

export default function CalendarioPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then((data: any[]) =>
      setClients(data.map(c => ({ id: c.id, name: c.name })))
    );
  }, []);

  return (
    <div className="h-screen p-4">
      <CalendarModal mode="page" clients={clients} />
    </div>
  );
}
