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
  const [activeTab, setActiveTab] = useState("medicine");
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: "medicine", name: "", description: "" });
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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

  // Handle form submission for medicine
  const handleMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/add-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...formData, type: "medicine" }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setFormData({ ...formData, name: "", description: "" });
        fetchRecords(); // Refresh records
      } else {
        setError("Failed to log medicine record.");
      }
    } catch (err) {
      setError("Error logging data.");
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload for medical reports
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      formDataObj.append("user_id", userId);
      formDataObj.append("name", formData.name);
      formDataObj.append("description", formData.description);
      formDataObj.append("type", "report");

      const response = await fetch(`${apiUrl}/upload-report`, {
        method: "POST",
        body: formDataObj,
      });

      const data = await response.json();
      if (data.status === "success") {
        setFormData({ ...formData, name: "", description: "" });
        setFile(null);
        fetchRecords(); // Refresh records
      } else {
        setError("Failed to upload report.");
      }
    } catch (err) {
      setError("Error uploading report.");
    } finally {
      setLoading(false);
    }
  };

  // Handle chat query submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    
    setIsChatLoading(true);
    setChatResponse("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/get-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, query: chatQuery }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setChatResponse(data.response);
      } else {
        setChatResponse("Sorry, I couldn't find any insights related to your query.");
      }
    } catch (err) {
      setChatResponse("An error occurred while processing your request.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      {/* Back Button */}
      <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md">
        ← Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-6 mt-16">Manage Your Medical Records</h1>

      {/* Tabs */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("medicine")}
            className={`px-6 py-3 font-medium ${
              activeTab === "medicine"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Log Medicine
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-6 py-3 font-medium ${
              activeTab === "report"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Upload Reports
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`px-6 py-3 font-medium ${
              activeTab === "insights"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Chat with Reports
          </button>
        </div>
      </div>

      {activeTab === "medicine" && (
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* Medicine Form */}
          <form onSubmit={handleMedicineSubmit} className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Log Medication</h2>
            
            <label className="block mt-4 mb-2">Medicine Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter medicine name"
              className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
            />

            <label className="block mt-4 mb-2">Details (dosage, frequency, etc):</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Enter medicine details, dosage, and schedule"
              className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 h-24"
            />

            <button 
              type="submit" 
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md w-full"
            >
              {loading ? "Saving..." : "Save Medicine Record"}
            </button>
          </form>

          {/* Display Medicine Records */}
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Your Medicine Records</h2>
            {loading ? (
              <p>Loading...</p>
            ) : records.length > 0 ? (
              <div className="grid gap-4">
                {records
                  .filter(record => record.type === "medicine")
                  .map((record) => (
                    <div key={record.id} className="bg-gray-800 p-4 rounded-md shadow-md">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-semibold">
                          {record.name} 
                          <span className="ml-2 text-sm bg-gray-700 px-2 py-1 rounded">
                            💊 Medicine
                          </span>
                        </h3>
                      </div>
                      <p className="text-gray-300 mt-2">{record.description}</p>
                      <p className="text-gray-500 text-sm mt-2">Added on: {new Date(record.date_added).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400">No medicine records found. Start by adding a medicine.</p>
            )}
          </div>
        </div>
      )}

      {/* Report Upload Form */}
      {activeTab === "report" && (
        <div>
        <form onSubmit={handleReportSubmit} className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Medical Report</h2>
          
          <label className="block mb-2">Report Title:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Enter report title"
            className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
          />

          <label className="block mt-4 mb-2">Report Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Enter details about this report"
            className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 h-24"
          />

          <div className="mt-4">
            <label className="block mb-2">Upload File:</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 rounded-md bg-gray-700 border border-gray-600"
            />
            {file && (
              <p className="text-sm text-gray-400 mt-2">
                Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <button 
            type="submit" 
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md w-full"
          >
            {loading ? "Uploading..." : "Upload Report"}
          </button>
        </form>

        </div>
        
      )}

            {/* Report Upload Form */}
            {activeTab === "insights" && (
          <div className="w-full flex justify-center ">
          <div className="w-3/5 center bg-gray-800 p-6 rounded-md shadow-md mt-8">
            <h2 className="text-xl font-semibold mb-4">Ask for Medical Insights</h2>
            
              <div className="mb-4 bg-gray-700 rounded-md p-4 h-48 overflow-y-auto">
                {chatResponse ? (
                  <div className="text-white">{chatResponse}</div>
                ) : isChatLoading ? (
                  <div className="text-gray-400">Analyzing your medical records...</div>
                ) : (
                  <div className="text-gray-400">Hi! How are you?</div>
                )}
              </div>
            
            <form onSubmit={handleChatSubmit} className="flex">
              <input
                type="text"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask about your health records..."
                className="flex-grow p-2 rounded-l-md bg-gray-700 border border-gray-600"
              />
              <button 
                type="submit" 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-r-md"
                disabled={isChatLoading}
              >
                {isChatLoading ? "..." : "Ask"}
              </button>
            </form>
          </div>

          </div>

      )}

      {/* Error Message */}
      {error && <p className="text-red-500 mb-4">{error}</p>}




    </div>
  );
}