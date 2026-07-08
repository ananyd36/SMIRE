"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Record {
  id: number;
  type: string;
  name: string;
  description: string;
  date_added: string;
}

export default function ManagePage() {
  const [medicineRecords, setMedicineRecords] = useState<Record[]>([]);
  const [reportRecords, setReportRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: "medicine", name: "", description: "" });
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchRecords("medicine");
    fetchRecords("report");
  }, [userId]);

  const fetchRecords = async (recordType: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/get-records/${userId}?type=${recordType}`);
      const data = await response.json();

      if (data.status === "success") {
        if (recordType === "medicine") setMedicineRecords(data.records);
        else setReportRecords(data.records);
      } else {
        setError("Failed to fetch records.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError("Still loading your account, please try again in a moment.");
      return;
    }
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
        let reminderSent = false;
        if (reminderDate && reminderTime && user?.email) {
          const reminderResponse = await fetch(`${apiUrl}/api/add-to-calendar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider_name: formData.name,
              provider_contact: "",
              patient_name: user.user_metadata?.full_name || "Patient",
              patient_email: user.email,
              appointment_datetime: `${reminderDate}T${reminderTime}:00`,
              notes: formData.description,
            }),
          });
          const reminderData = await reminderResponse.json();
          reminderSent = reminderData.status === "success";
        }

        setFormData({ ...formData, name: "", description: "" });
        setReminderDate("");
        setReminderTime("");
        fetchRecords("medicine");
        if (reminderSent) alert("Medicine logged and reminder email sent!");
      } else {
        setError("Failed to log medicine record.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (type_id: number, type: string, name: string, description: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/delete-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, id: type_id, type, name, description }),
      });

      const data = await response.json();
      if (data.status === "success") {
        fetchRecords(type);
      } else {
        setError("Failed to delete record.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!userId) {
      setError("Still loading your account, please try again in a moment.");
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

      const response = await fetch(`${apiUrl}/api/upload-report`, {
        method: "POST",
        body: formDataObj,
      });

      const data = await response.json();
      if (data.status === "success") {
        setFormData({ ...formData, name: "", description: "" });
        setFile(null);
        fetchRecords("report");
        setError(null);
        alert("File Uploaded Successfully");
      } else {
        setError("Failed to upload report.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || !userId) return;

    setIsChatLoading(true);
    setChatResponse("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/get-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, query: chatQuery }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setChatResponse(data.response.response);
      } else {
        setChatResponse("Sorry, I couldn't find any insights related to your query.");
      }
    } catch (err: unknown) {
      setChatResponse(
        err instanceof Error
          ? "An error occurred while processing your request: " + err.message
          : "An unknown error occurred while processing your request.",
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <AppShell>
      <h1 className="mb-6 text-center text-3xl font-bold">Manage Your Medical Records</h1>

      {error && (
        <Alert variant="destructive" className="mx-auto mb-6 max-w-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="medicine" className="mx-auto max-w-2xl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medicine">Log Medicine</TabsTrigger>
          <TabsTrigger value="report">Upload Reports</TabsTrigger>
          <TabsTrigger value="insights">Chat with Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="medicine" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log Medication</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMedicineSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Medicine Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter medicine name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Details (dosage, frequency, etc)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Enter medicine details, dosage, and schedule"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Set a Reminder (optional)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      aria-label="Reminder date"
                    />
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      aria-label="Reminder time"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sends a calendar invite + email reminder to take this medicine.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Save Medicine Record"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Your Medicine Records</h2>
            {medicineRecords.length > 0 ? (
              <div className="grid gap-4">
                {medicineRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-6">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">{record.name}</h3>
                        <Badge variant="accent">💊 Medicine</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{record.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Added on: {new Date(record.date_added).toLocaleString()}
                      </p>
                      <Button
                        variant="destructive"
                        className="mt-4 w-full"
                        onClick={() => deleteRecord(record.id, "medicine", record.name, record.description)}
                      >
                        Delete Record
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No medicine records found. Start by adding a medicine.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Medical Report</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Report Title</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter report title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Report Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Enter details about this report"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Upload File</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Uploading..." : "Upload Report"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Your Report Records</h2>
            {reportRecords.length > 0 ? (
              <div className="grid gap-4">
                {reportRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-6">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">{record.name}</h3>
                        <Badge variant="accent">📄 Report</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{record.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Added on: {new Date(record.date_added).toLocaleString()}
                      </p>
                      <Button
                        variant="destructive"
                        className="mt-4 w-full"
                        onClick={() => deleteRecord(record.id, "report", record.name, record.description)}
                      >
                        Delete Record
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No report records found. Start by uploading a report.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ask for Medical Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 h-48 overflow-y-auto rounded-md bg-secondary p-4">
                {chatResponse ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{chatResponse}</ReactMarkdown>
                  </div>
                ) : isChatLoading ? (
                  <p className="text-muted-foreground">Analyzing your medical records...</p>
                ) : (
                  <p className="text-muted-foreground">Hi! How are you?</p>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <Input
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Ask about your health records..."
                />
                <Button type="submit" disabled={isChatLoading}>
                  {isChatLoading ? "..." : "Ask"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
