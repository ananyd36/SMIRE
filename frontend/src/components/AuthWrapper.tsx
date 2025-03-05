"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    };

    getSession();
  }, []);

  if (authenticated === null) {
    return <div className="text-center mt-10 text-white">Loading...</div>; // Show loader while checking session
  }

  if (!authenticated) {
    router.push("/auth/login"); // Redirect to login if not authenticated
    return null;
  }

  return <>{children}</>;
}
