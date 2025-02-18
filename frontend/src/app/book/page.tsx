"use client";
import Link from "next/link";

export default function BookPage() {

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center relative">
      {/* Back to Home Button (Top) */}
      <Link href="/" className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
        ← Back to Home
      </Link>

      <h1 className="text-4xl font-bold mb-4">Book an Appointment</h1>
      <p className="text-lg text-gray-300">Easily schedule your next medical consultation with us.</p>

      <button className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white">
        Schedule Now
      </button>
    </div>
  );
}
