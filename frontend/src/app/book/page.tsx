"use client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Clinic {
  Name: string;
  Location: string;
  Link: string;
  Description: string;
}

interface Doctor {
  name: string;
  workplace: string;
  contact: string;
  description: string;
}

interface Provider {
  name: string;
  contact: string;
}

export default function BookPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [errorClinics, setErrorClinics] = useState<string | null>(null);
  const [errorDoctors, setErrorDoctors] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchClinics = async () => {
    setLoadingClinics(true);
    setErrorClinics(null);
    if (!navigator.geolocation) {
      setErrorClinics("Geolocation is not supported by your browser.");
      setLoadingClinics(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const response = await fetch(`${apiUrl}/api/get-clinics?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (data.status === "success") {
            setClinics(data.clinics);
          } else {
            setErrorClinics("Failed to load clinics.");
          }
        } catch (err: unknown) {
          setErrorClinics(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
        } finally {
          setLoadingClinics(false);
        }
      },
      () => {
        setErrorClinics("Unable to retrieve your location.");
        setLoadingClinics(false);
      },
    );
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    setErrorDoctors(null);
    if (!navigator.geolocation) {
      setErrorDoctors("Geolocation is not supported by your browser.");
      setLoadingDoctors(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const response = await fetch(`${apiUrl}/api/get-doctors?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (data.status === "success") {
            setDoctors(data.doctors);
          } else {
            setErrorDoctors("Failed to fetch doctors.");
          }
        } catch (err: unknown) {
          setErrorDoctors(err instanceof Error ? "Error fetching data: " + err.message : "An unknown error occurred.");
        } finally {
          setLoadingDoctors(false);
        }
      },
      () => {
        setErrorDoctors("Unable to retrieve your location.");
        setLoadingDoctors(false);
      },
    );
  };

  const openCalendarDialog = (provider: Provider) => {
    setSelectedProvider(provider);
    setDate("");
    setTime("");
    setNotes("");
    setSubmitMessage(null);
  };

  const handleAddToCalendar = async () => {
    if (!selectedProvider || !date || !time || !user?.email) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/add-to-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_name: selectedProvider.name,
          provider_contact: selectedProvider.contact,
          patient_name: user.user_metadata?.full_name || "Patient",
          patient_email: user.email,
          appointment_datetime: `${date}T${time}:00`,
          notes,
        }),
      });

      const data = await response.json();
      if (data.status === "success") {
        setSubmitMessage("Reminder sent to your email — remember to call ahead to confirm.");
      } else {
        setSubmitMessage(data.message || "Failed to send reminder.");
      }
    } catch (err: unknown) {
      setSubmitMessage(err instanceof Error ? "Error: " + err.message : "An unknown error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">Find & Book Clinics/Doctors</h1>
        <p className="mt-2 text-muted-foreground">
          Find nearby clinics and doctors, then add a reminder to your calendar.
        </p>
      </div>

      <Tabs defaultValue="clinics" className="mx-auto mt-8 max-w-5xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clinics">Clinics</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
        </TabsList>

        <TabsContent value="clinics">
          <div className="text-center">
            <Button onClick={fetchClinics} disabled={loadingClinics}>
              {loadingClinics ? "Searching..." : "Fetch Nearby Clinics!"}
            </Button>
          </div>

          {errorClinics && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{errorClinics}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingClinics &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}

            {!loadingClinics &&
              clinics.map((clinic, index) => (
                <Card key={index}>
                  <CardHeader>
                    <a
                      href={clinic.Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      <CardTitle className="text-base">{clinic.Name}</CardTitle>
                    </a>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="text-muted-foreground">{clinic.Location}</p>
                    <p>{clinic.Description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => openCalendarDialog({ name: clinic.Name, contact: clinic.Location })}
                    >
                      Add to Calendar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="doctors">
          <div className="text-center">
            <Button onClick={fetchDoctors} disabled={loadingDoctors}>
              {loadingDoctors ? "Searching..." : "Fetch Nearby Doctors!"}
            </Button>
          </div>

          {errorDoctors && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{errorDoctors}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingDoctors &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}

            {!loadingDoctors &&
              doctors.map((doctor, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{doctor.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doctor.workplace}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>📞 {doctor.contact}</p>
                    <p className="text-muted-foreground">{doctor.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => openCalendarDialog({ name: doctor.name, contact: doctor.contact })}
                    >
                      Add to Calendar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              This sends you a calendar reminder and confirmation email for{" "}
              {selectedProvider?.name} — it does not book the appointment with them
              directly. Call ahead to confirm the slot.
            </DialogDescription>
          </DialogHeader>

          {submitMessage ? (
            <p className="text-sm">{submitMessage}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want to remember" />
              </div>
              <Button
                className="w-full"
                onClick={handleAddToCalendar}
                disabled={submitting || !date || !time}
              >
                {submitting ? "Sending..." : "Send Reminder"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
