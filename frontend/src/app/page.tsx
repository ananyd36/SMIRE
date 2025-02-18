"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ApiResponse {
  message: string;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error("API URL is missing. Please define NEXT_PUBLIC_API_URL.");
      return;
    }

    fetch(`${apiUrl}/api/data`)
      .then((res) => res.json())
      .then((data: ApiResponse) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="bg-black bg-home-img bg-cover bg-center min-h-screen">
      <nav className="bg-gray-800 text-white p-4 flex justify-between">
        <Link href="/" className="text-lg font-bold">
          Smedex AI Assistant
        </Link>
        <ul className="flex space-x-4">
          <li>
            <Link href="/about" className="hover:underline">About</Link>
          </li>
          <li>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </li>
        </ul>
      </nav>
      <main className="flex flex-col justify-center text-center max-w-5xl mx-auto min-h-screen">
        <div>
          <h1 className="text-4xl font-bold text-white">Smedex AI Assistant</h1>
          <address className="not-italic text-white mt-2">
            3800 SW 34 ST <br />
            Gainesville, Florida
          </address>
          <p className="text-white mt-2">Available 24x7</p>
          <Link href="tel:352256XXXX" className="hover:underline text-white">
            352-256-XXXX
          </Link>
          {data && <p className="text-white mt-4">{data.message}</p>}
        </div>
      </main>
    </div>
  );
}
