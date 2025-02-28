"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Record {
  id: number;
  type: string;
  name: string;
  description: string;
  date_added: string;
}

export default function ManagePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: "medicine", name: "", description: "" });
  const userId = "ashar534"; 

  useEffect(() => {
    fetchRecords();
  }, []);

  // Fetch stored medical records
  const fetchRecords = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/get-records/${userId}`);
      const data = await response.json();
      if (data.status === "success") {
        setRecords(data.records);
      } else {
        setError("Failed to fetch records.");
      }
    } catch (err) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log(JSON.stringify({ user_id: userId, ...formData }));
      const response = await fetch(`${apiUrl}/add-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        
        body: JSON.stringify({ user_id: userId, ...formData }),
        
      });
      

      const data = await response.json();
      if (data.status === "success") {
        setFormData({ type: "medicine", name: "", description: "" });
        fetchRecords(); // Refresh records
      } else {
        setError("Failed to log record.");
      }
    } catch (err) {
      setError("Error logging data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Back Button */}
      <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-4">Manage Your Medical Records</h1>

      {/* Form to Log Medicine or Reports */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-lg">
        <label className="block mb-2">Type:</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
        >
          <option value="medicine">Medicine</option>
          <option value="report">Report</option>
        </select>

        <label className="block mt-4 mb-2">Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
        />

        <label className="block mt-4 mb-2">Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
        />

        <button 
        onClick = {handleSubmit}
        type="submit" className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md w-full">
          {loading ? "Saving..." : "Save Record"}
        </button>
      </form>

      {/* Error Message */}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* Display Logged Records */}
      <div className="mt-8 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Your Records</h2>
        {loading ? (
          <p>Loading...</p>
        ) : records.length > 0 ? (
          <div className="grid gap-4">
            {records.map((record) => (
              <div key={record.id} className="bg-gray-800 p-4 rounded-md shadow-md">
                <h3 className="text-lg font-semibold">{record.name} ({record.type})</h3>
                <p className="text-gray-400">{record.description}</p>
                <p className="text-gray-500 text-sm">Added on: {new Date(record.date_added).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No records found.</p>
        )}
      </div>
    </div>
  );
}
