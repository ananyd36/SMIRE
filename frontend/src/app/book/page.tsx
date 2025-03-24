"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";  
import { supabase } from "@/lib/supabaseClient";
import Loading from "@/components/ui/loading"; // Import the Loading component

interface Doctor {
  name: string;
  workplace: string;
  contact: string;
  description: string;
}

export default function BookPage() {

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [booking, setBookingStatus] = useState(false);



  useEffect(() => {
    fetchDoctors();
    async function fetchUser() {
        const { data } = await supabase.auth.getUser();
        setUser(data.user); 
      }
      fetchUser();
    },  []);



  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/api/get-doctors?lat=${latitude}&lng=${longitude}`
        );
        const data = await response.json();

        if (data.status === "success") {
          setDoctors(data.doctors);
        } else {
          setError("Failed to fetch doctors.");
        }
      } catch (err) {
        setError("Error fetching data.");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleBookAppointment = async (doctor: Doctor) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/book-appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_name: doctor.name,
          doctor_contact: doctor.contact,
          patient_details: {
            name: user ? user.user_metadata?.full_name : "Anany",
            phone: user?.email,
          }
        })
      });
  
      const data = await response.json();
      console.log(data);
      if (data.status === 'success') {
        // Show booking initiated modal
        setBookingStatus(true);
      } else {
        console.log("Booking Failed")
        }
    } catch (err) {
      setError("Error initiating booking.");
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
          <h1 className="text-4xl font-bold mb-4 pt-8">Book an Appointment</h1>
          <p className="text-lg text-gray-300 pb-4">Easily schedule your next medical consultation with us.</p>
        </>
      )}

      <button
        onClick={fetchDoctors}
        className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white"
      >
        Fetch Nearby Doctors!
      </button>

      {loading ? (
        <Loading />
      ) : error ? (
        <p className="text-red-500 mt-4">{error}</p>
      ) : (
        <div className="prose prose-invert w-full flex flex-col items-center gap-y-6 px-4 pt-4 pb-16">
          {doctors.map((doctor, index) => (
            <div key={index} className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-4xl text-center">
              <h3 className="text-xl font-semibold">{doctor.name}</h3>
              <p className="text-gray-400">{doctor.workplace}</p>
              <p className="text-gray-300 mt-2">📞 {doctor.contact}</p>
              <p className="text-gray-400">{doctor.description}</p>
              <button
                onClick={() => handleBookAppointment(doctor)}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md"
              >
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
