"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";


export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (event : React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }, 
      },
    });

    if (error) {
        setMessage(error.message);
        return
    }
    if (data) {
      setMessage("User account created!");
    }

    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h2 className="text-2xl font-bold">Register</h2>
      {message && <span>{message}</span>}
      <form onSubmit={handleRegister} className="mt-4 flex flex-col space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="p-2 border rounded bg-gray-800 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="fullName"
          placeholder="Full Name"
          className="p-2 border rounded bg-gray-800 text-white"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 border rounded bg-gray-800 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 p-2 rounded">
          Sign Up
        </button>
        <span>Already have an account?  
        <Link href="/auth/login" className="text-blue-400 hover:underline">
         Log In
        </Link>
        </span>
      </form>
    </div>
  );
}
