"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Trash2, Menu } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  ConsultThread,
  loadThreads,
  saveThreads,
  createThread,
  deriveTitle,
} from "@/lib/threadStorage";

export default function OpdPage() {
  const [threads, setThreads] = useState<ConsultThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = loadThreads();
    if (stored.length === 0) {
      const starter = createThread();
      setThreads([starter]);
      setActiveThreadId(starter.id);
      saveThreads([starter]);
      return;
    }
    const mostRecent = [...stored].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    setThreads(stored);
    setActiveThreadId(mostRecent.id);
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  const persist = (next: ConsultThread[]) => {
    setThreads(next);
    saveThreads(next);
  };

  const handleNewChat = () => {
    const thread = createThread();
    persist([thread, ...threads]);
    setActiveThreadId(thread.id);
    setSidebarOpen(false);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setSidebarOpen(false);
  };

  const handleDeleteThread = (id: string) => {
    if (!window.confirm("Delete this conversation?")) return;
    const next = threads.filter((t) => t.id !== id);
    persist(next);
    if (activeThreadId === id) {
      setActiveThreadId(next[0]?.id ?? null);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim() || !activeThread) {
      if (!query.trim()) setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError(null);
    const askedQuery = query;
    setQuery("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/get-consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askedQuery,
          history: activeThread.messages,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        const isFirstMessage = activeThread.messages.length === 0;
        const updated: ConsultThread = {
          ...activeThread,
          title: isFirstMessage ? deriveTitle(askedQuery) : activeThread.title,
          updatedAt: Date.now(),
          messages: [...activeThread.messages, { query: askedQuery, response: data.answer }],
        };
        persist(threads.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        setError("Failed to fetch consultation.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex h-[75vh] gap-4">
        <aside
          className={cn(
            "w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border pr-3",
            sidebarOpen ? "flex fixed inset-y-0 left-0 z-30 bg-background p-4 sm:static sm:bg-transparent sm:p-0" : "hidden sm:flex",
          )}
        >
          <Button onClick={handleNewChat} className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
          <ul className="mt-2 flex flex-col gap-1">
            {threads
              .slice()
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((thread) => (
                <li key={thread.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => handleSelectThread(thread.id)}
                    className={cn(
                      "flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                      thread.id === activeThreadId && "bg-accent font-medium text-accent-foreground",
                    )}
                  >
                    {thread.title}
                  </button>
                  <button
                    onClick={() => handleDeleteThread(thread.id)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between sm:hidden">
            <Button variant="outline" size="sm" onClick={() => setSidebarOpen((v) => !v)}>
              <Menu className="mr-2 h-4 w-4" /> Threads
            </Button>
          </div>

          <Card className="flex flex-1 flex-col overflow-y-auto">
            <CardContent className="flex-1 space-y-4 py-4">
              {activeThread && activeThread.messages.length > 0 ? (
                activeThread.messages.map((item, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="self-end max-w-xs rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                      {item.query}
                    </div>
                    <div className="self-start max-w-xs rounded-lg bg-secondary px-4 py-2 text-secondary-foreground prose prose-sm">
                      <ReactMarkdown>{item.response}</ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No conversation yet. Start by asking a question!
                </p>
              )}
              {loading && <p className="text-sm text-muted-foreground">Thinking...</p>}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your medical question..."
            />
            <Button onClick={handleSubmit} disabled={loading}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
