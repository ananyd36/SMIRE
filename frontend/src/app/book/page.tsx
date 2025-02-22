"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading"; // Import the Loading component

interface Doctor {
  name: string;
  workplace: string;
  contact: string;
  description : string;
}

export default function BookPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/get-doctors`);
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
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      {/* Back to Home Button */}
            {loading ? (
             <Loading />
            ) : (
                <>
      <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
        ← Back to Home
      </Link>

      <h1 className="text-4xl font-bold mb-4">Book an Appointment</h1>
      <p className="text-lg text-gray-300">Easily schedule your next medical consultation with us.</p>
      </>
        )    
      }

      {/* Show Loading Spinner */}
      {loading ? (
        <Loading />
        
      ) : error ? (
        <p className="text-red-500 mt-4">{error}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {doctors.map((doctor, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-md shadow-md">
              <h3 className="text-xl font-semibold">{doctor.name}</h3>
              <p className="text-gray-400">{doctor.workplace}</p>
              <p className="text-gray-300 mt-2">📞 {doctor.contact}</p>
              <p className="text-gray-400">{doctor.description}</p>
              <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md">
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
