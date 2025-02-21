"use client";
import Link from "next/link";
import { useState } from "react";






interface Locations {
 Name: string;
 Location: string;
 Link: string;
 Description  :string;
}





export default function FindPage() {
   const [info, setInfo] = useState<Locations[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);


 const fetchClinics = async () => {
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
       const response = await fetch(`${apiUrl}/get-clinics?lat=${latitude}&lng=${longitude}`);
       const data = await response.json();
        if (data.status === "success") {
         setInfo(data.clinics);
         console.log(data.clinics)
       } else {
         setError("Failed to load clinics.");
       }
     } catch (err) {
       setError("Error fetching clinics.");
     } finally {
       setLoading(false);
     }
   }, () => {
     setError("Unable to retrieve your location.");
     setLoading(false);
   });
 };


 return (
   <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
     <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
       ← Back to Home
     </Link>


     <h1 className="text-4xl font-bold mb-4">Locate Trusted Clinics & Doctors!</h1>
     <p className="text-lg text-gray-300">Quickly locate trusted medical facilities near you.</p>


     <button
       onClick={fetchClinics}
       className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white"
     >
       {loading ? "Searching..." : "Find Now!"}
     </button>


     {error && <p className="text-red-500 mt-4">{error}</p>}


     {info.length > 0 && (
       <div className="mt-8 w-full max-w-4xl">
         <h2 className="text-2xl font-semibold mb-4">Nearby Clinics & Doctors</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
           {info.map((clinic, index) => (
             <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-md">
               {/* <img src={clinic.Image} alt={clinic.Name} className="w-full h-40 object-cover rounded-md" /> */}
               <a href={clinic.Link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-blue-400 hover:underline">
                  {clinic.Name}
                </a>
               <p className="text-gray-400 mt-1">{clinic.Location}</p>
               <p className="text-gray-300 mt-2">{clinic.Description}</p>
             </div>
           ))}
         </div>
       </div>
     )}
   </div>
 );
}
