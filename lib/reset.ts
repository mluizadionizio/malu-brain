// Brasília = UTC-3 (sem horário de verão desde 2019)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

function toBrasiliaDate(): Date {
  return new Date(Date.now() + BRASILIA_OFFSET_MS);
}

function formatBrasilia(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Retorna a string do cutoff de reset (8h hoje ou ontem se ainda não chegou)
export function getDailyCutoff(): string {
  const now = toBrasiliaDate();
  const cutoff = new Date(now);
  cutoff.setUTCHours(8, 0, 0, 0); // 8h no horário de Brasília

  if (now < cutoff) {
    cutoff.setUTCDate(cutoff.getUTCDate() - 1); // ainda não chegou 8h → usa ontem
  }

  return formatBrasilia(cutoff);
}

// Retorna o timestamp atual no horário de Brasília
export function nowBrasilia(): string {
  return formatBrasilia(toBrasiliaDate());
}
