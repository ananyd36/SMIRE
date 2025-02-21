"use client";
import { useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading"; // Import Loading Component


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
      const response = await fetch(`${apiUrl}/get-news`);
      const data = await response.json();
      if (data.status === "success") {
        const parsedArticles = data.articles;
        setNews(parsedArticles);
      } else {
        setError("Failed to load news.");
      }
    } catch (err) {
      setError("Error fetching news.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      {loading ? (
        <Loading />
      ) : (
        <>
        <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
        ← Back to Home
      </Link>

      <h1 className="text-4xl font-bold mb-4">Medical News and Blogs!</h1>
      <p className="text-lg text-gray-300">Get up to date with the latest news and blogs.</p>

      <button 
        onClick={fetchNews} 
        className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white"
      >
        {loading ? "Fetching..." : "Get News!"}
      </button>
        </>
      )
    }
      
            
      {loading && <Loading />}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {news && news.length > 0 && (
        <div className="mt-6 bg-gray-800 p-4 rounded-lg w-full max-w-4xl">
          <h2 className="text-2xl font-semibold mb-4">Latest News</h2>
          <ul className="space-y-4">
            {news?.map((article, index) => (
              <li key={index} className="bg-gray-700 p-4 rounded-md shadow-md">
                <a href={article.Link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-blue-400 hover:underline">
                  {article.Title}
                </a>
                <p className="text-gray-300 mt-2">{article.Snippet}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
