"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Loading from "@/components/ui/loading"; 
import ReactMarkdown from "react-markdown";

export default function OpdPage() {
  const [query, setQuery] = useState(""); // User's question
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ query: string; response: string }[]>([]); // History of messages

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
      const res = await fetch(`${apiUrl}/api/get-consultation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query,
          history: history, 
        }),
      });


      const data = await res.json();
      if (data.status === "success") {
        setResponse(data.answer);
        setHistory((prevHistory) => [...prevHistory, { query, response: data.answer }]); // Add to history
      } else {
        setError("Failed to fetch consultation.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("Error fetching data: " + err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear the response when the query changes
    setResponse(null);
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-between p-4">
      <Link
        href="/"
        className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
      >
        ← Back to Home
      </Link>

      <div className="w-full max-w-2xl flex flex-col flex-grow bg-gray-800 p-4 rounded-md shadow-md overflow-y-auto" style={{ maxHeight: "calc(100vh - 150px)" }}>
        <h2 className="text-xl font-bold mb-4 text-center text-gray-300">Consultation Chat</h2>
        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item, index) => (
              <div key={index} className="flex flex-col">
                <div className="bg-blue-600 p-3 rounded-md self-end max-w-xs">
                  <p className="text-white">{item.query}</p>
                </div>
                <div className="bg-gray-700 p-3 rounded-md self-start max-w-xs mt-2">
                  <p className="text-gray-200">{item.response}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center">No conversation history yet. Start by asking a question!</p>
        )}
      </div>

      <div className="w-full max-w-2xl mt-4 fixed bottom-0 bg-gray-900 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your medical question..."
            className="flex-grow px-4 py-2 text-black rounded-md border border-gray-600 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white"
          >
            Send
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        {loading && (
          <div className="mt-4 text-center">
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
}
