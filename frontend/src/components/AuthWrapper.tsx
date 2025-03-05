"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    }
    
    checkSession();
  }, []);

  // Redirect if user is not authenticated
  useEffect(() => {
    if (authenticated === false) {
      router.push("/auth/login");
    }
  }, [authenticated, router]);

  if (authenticated === null) {
    return <div className="text-center mt-10 text-white">Loading...</div>;
  }

  return <>{children}</>;
}
