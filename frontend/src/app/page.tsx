"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import ParticleBackground from "@/components/ui/particle-background";
import AnimatedText from "@/components/ui/animated-text";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OFFERINGS = [
  {
    title: "Find & Book Clinics/Doctors",
    description: "Locate trusted clinics and doctors near you, and add a calendar reminder.",
    href: "/book",
  },
  {
    title: "Medical News & Updates",
    description: "Stay informed with the latest health and medical updates.",
    href: "/news",
  },
  {
    title: "Consultation Services",
    description: "Get consultation medical support.",
    href: "/consult",
  },
  {
    title: "Manage Your Health",
    description: "Log your prescriptions and chat with your reports.",
    href: "/manage",
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || query.trim() === "") return;

    setLoading(true);
    setResponse(null);
    setShowModal(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/get-consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, history: [] }),
      });
      const data = await res.json();
      setResponse(data.status === "success" ? data.answer : "Failed to fetch consultation.");
    } catch (err: unknown) {
      setResponse(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <section className="relative flex flex-col items-center justify-center gap-6 rounded-xl border border-border bg-card py-20 text-center overflow-hidden">
        <ParticleBackground />
        <h1 className="relative text-5xl font-bold text-foreground sm:text-6xl">SMIRE AI</h1>
        <div className="relative">
          <AnimatedText />
        </div>

        <div className="relative w-full max-w-lg px-4">
          <Input
            type="text"
            placeholder="Ask any medical inquiry..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSubmit}
          />
        </div>

        <Link href="/book" className="relative">
          <Button size="lg" className="rounded-full px-8 text-base">
            Get Started
          </Button>
        </Link>
      </section>

      <section className="py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">What We Offer</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERINGS.map((item) => (
            <Card key={item.href} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={item.href} className="text-sm font-medium text-primary hover:underline">
                  Learn More →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-muted-foreground">
        <p className="text-sm">© {new Date().getFullYear()} SMIRE AI. Your trusted medical assistant.</p>
      </footer>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consultation Response</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            response && (
              <div className="prose prose-sm max-h-64 max-w-none overflow-y-auto whitespace-pre-wrap">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
