"use client";
import Link from "next/link";
import { useState } from "react";
import Loading from "@/components/ui/loading"; 
import ReactMarkdown from "react-markdown";

export default function OpdPage() {
  const [query, setQuery] = useState(""); // User's question
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim()) {
      setError("Please enter a question.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null); // Clear previous response

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/get-consultation?question=${query}`);
      const data = await res.json();
      if (data.status === "success") {
        setResponse(data.answer);
      } else {
        setError("Failed to fetch consultation.");
      }
    } catch (err) {
      setError("Error connecting to consultation service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      {loading ? (
        <Loading />) : (
          <>
          <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
        ← Back to Home
      </Link>

      <h1 className="text-4xl font-bold mb-4">Free Consultations for You!</h1>
      <p className="text-lg text-gray-300">Ask Dr.GPT anything and everything.</p>

      {/* Input Field for User Query */}
      <div className="mt-6 w-full max-w-lg flex flex-col items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your medical question..."
          className="w-full px-4 py-2 text-black rounded-md border border-gray-600 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white"
        >
          Get Answer
        </button>
        </div>
          </>
        )    
      }

      {loading && <Loading />}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {response && (
    <div className="mt-6 max-w-2xl bg-gray-800 p-6 rounded-md shadow-md">
      <h3 className="text-lg font-semibold mb-2">Initial Diagnosis:</h3>
      
      <div className="prose prose-invert max-h-64 overflow-y-auto whitespace-pre-wrap">
        <ReactMarkdown>{response}</ReactMarkdown>
      </div>
    </div>
  )}

    </div>
  );
}
