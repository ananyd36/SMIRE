"use client";

import { useEffect, useState } from "react";

interface ApiResponse {
  message: string;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/data")
      .then((res) => res.json())
      .then((data: ApiResponse) => setData(data)) // 👈 Type assertion here
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Recruiter Assistant</h1>
      <p className="mt-4 text-lg">{data ? data.message : "Loading..."}</p>
    </div>
  );
}
