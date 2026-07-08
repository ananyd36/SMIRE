export interface ConsultMessage {
  query: string;
  response: string;
}

export interface ConsultThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ConsultMessage[];
}

const STORAGE_KEY = "smire.consult.threads";

export function loadThreads(): ConsultThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsultThread[]) : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ConsultThread[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

export function createThread(): ConsultThread {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function deriveTitle(firstQuery: string): string {
  const trimmed = firstQuery.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}
