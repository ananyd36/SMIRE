"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NewsArticle {
  Title: string;
  Link: string;
  Snippet: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setNews(null);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/get-news`);
      const data = await response.json();
      if (data.status === "success") {
        setNews(data.articles);
      } else {
        setError("Failed to load news.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">Medical News and Blogs</h1>
        <p className="mt-2 text-muted-foreground">Get up to date with the latest news and blogs.</p>
        <Button className="mt-6" onClick={fetchNews} disabled={loading}>
          {loading ? "Fetching..." : "Get News!"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-auto mt-6 max-w-3xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mx-auto mt-8 max-w-3xl space-y-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}

        {!loading &&
          news?.map((article, index) => (
            <Card key={index}>
              <CardHeader>
                <a
                  href={article.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  <CardTitle className="text-base">{article.Title}</CardTitle>
                </a>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{article.Snippet}</CardContent>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
